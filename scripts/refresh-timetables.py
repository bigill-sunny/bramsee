"""Download official GTFS into staging, validate both agencies, then optionally apply.

Python standard library only. Never runs a deployment or changes account data.
"""
import argparse
import csv
import hashlib
import io
import json
import math
import re
import shutil
import tempfile
import urllib.request
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'BT': {'url': 'https://www.arcgis.com/sharing/rest/content/items/a355aabd5a8c490186bdce559c9c75fb/data', 'page': 'https://geohub.brampton.ca/pages/brampton-transit'},
    'GO': {'url': 'https://assets.metrolinx.com/raw/upload/Documents/Metrolinx/Open%20Data/GO-GTFS.zip', 'page': 'https://www.gotransit.com/en/partner-with-us/software-developers'},
}


def encoded(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False).encode('utf-8')


def day(value):
    return datetime.strptime(value, '%Y%m%d').date()


def seconds(value):
    if not re.fullmatch(r'\d{1,2}:\d{2}:\d{2}', value):
        raise ValueError('Missing or unsupported stop time: ' + repr(value))
    h, m, s = map(int, value.split(':'))
    if h > 71 or m > 59 or s > 59:
        raise ValueError('Stop time outside supported range')
    return h * 3600 + m * 60 + s


def download(url, path):
    req = urllib.request.Request(url, headers={'User-Agent': 'Bramsee-Timetable-Refresh/1.0'})
    with urllib.request.urlopen(req, timeout=60) as response, path.open('wb') as target:
        if not response.url.startswith('https://'):
            raise ValueError('Insecure timetable redirect')
        size = 0
        while chunk := response.read(1024 * 1024):
            size += len(chunk)
            if size > 100 * 1024 * 1024:
                raise ValueError('Timetable archive exceeds 100 MiB')
            target.write(chunk)


def convert(path, agency, today):
    prefix = 'GO:' if agency == 'GO' else ''
    with zipfile.ZipFile(path) as archive:
        files = archive.infolist()
        if len(files) > 100 or sum(f.file_size for f in files) > 700 * 1024 * 1024:
            raise ValueError('Timetable archive expands beyond supported limits')
        if len(set(f.filename for f in files)) != len(files):
            raise ValueError('Duplicate archive filenames')
        def rows(name, required=False):
            if name not in archive.namelist():
                if required:
                    raise ValueError('Missing GTFS table: ' + name)
                return []
            return csv.DictReader(io.TextIOWrapper(archive.open(name), encoding='utf-8-sig', newline=''))

        agencies = list(rows('agency.txt', True))
        expected = 'GO Transit' if agency == 'GO' else 'Brampton Transit'
        if not any(expected.lower() in r.get('agency_name', '').lower() for r in agencies):
            raise ValueError('Unexpected agency in ' + agency + ' archive')
        if any(r.get('agency_timezone') not in ('America/Toronto', 'America/New_York') for r in agencies):
            raise ValueError('Unsupported GTFS timezone')
        if list(rows('frequencies.txt')):
            raise ValueError('Frequency-based schedules require a different importer')
        stops = {}
        for r in rows('stops.txt', True):
            if r.get('location_type', '0') not in ('', '0'):
                continue
            lat, lon = float(r['stop_lat']), float(r['stop_lon'])
            if not (math.isfinite(lat) and math.isfinite(lon) and 40 <= lat <= 50 and -90 <= lon <= -70):
                raise ValueError('Invalid or unexpected stop coordinates')
            key = prefix + r['stop_id']
            if key in stops:
                raise ValueError('Duplicate stop ID')
            stops[key] = {'id': key, 'code': r.get('stop_code') or r['stop_id'], 'name': r['stop_name'], 'lat': lat, 'lon': lon}
        routes = {}
        modes = {}
        for r in rows('routes.txt', True):
            if r['route_type'] not in ('2', '3'):
                continue
            key = prefix + r['route_id']
            routes[key] = {'id': key, 'name': r.get('route_long_name') or r['route_short_name'], 'number': r.get('route_short_name') or r['route_id']}
            modes[key] = 'train' if r['route_type'] == '2' else 'bus'
        trips = {}
        by_service = defaultdict(list)
        for r in rows('trips.txt', True):
            route = prefix + r['route_id']
            if route not in routes:
                continue
            key = prefix + r['trip_id']
            if key in trips:
                raise ValueError('Duplicate trip ID')
            trips[key] = {'id': key, 'route': route, 'headsign': r.get('trip_headsign') or routes[route]['name'], 'service': r['service_id'], 'agency': 'GO' if agency == 'GO' else 'BT', 'mode': modes[route], 'number': ('GO ' if agency == 'GO' else '') + routes[route]['number'], 'stops': []}
        for r in rows('stop_times.txt', True):
            trip = trips.get(prefix + r['trip_id'])
            if trip is None:
                continue
            stop = prefix + r['stop_id']
            if stop not in stops:
                raise ValueError('Trip references an unknown boarding stop')
            departure = seconds(r.get('departure_time') or r.get('arrival_time') or '')
            arrival = seconds(r.get('arrival_time') or r.get('departure_time') or '')
            if arrival > departure:
                raise ValueError('Arrival follows departure at a stop')
            pickup, dropoff = int(r.get('pickup_type') or 0), int(r.get('drop_off_type') or 0)
            if pickup not in (0, 1) or dropoff not in (0, 1):
                raise ValueError('Request-only boarding is not supported by this planner')
            trip['stops'].append([stop, departure, int(r['stop_sequence']), pickup, dropoff, arrival])
        for trip in trips.values():
            trip['stops'].sort(key=lambda s: s[2])
            if len(trip['stops']) < 2:
                raise ValueError('Trip has fewer than two timed stops')
            for previous, current in zip(trip['stops'], trip['stops'][1:]):
                if current[2] <= previous[2] or current[5] < previous[1]:
                    raise ValueError('Non-monotonic trip stop sequence/times')
            by_service[trip['service']].append(trip)
        dates = defaultdict(set)
        for r in rows('calendar.txt'):
            start, end = day(r['start_date']), day(r['end_date'])
            if (end-start).days not in range(0, 731):
                raise ValueError('Invalid calendar range')
            for offset in range((end-start).days+1):
                d = start + timedelta(days=offset)
                if r.get(('monday','tuesday','wednesday','thursday','friday','saturday','sunday')[d.weekday()]) == '1':
                    dates[d.strftime('%Y%m%d')].add(r['service_id'])
        for r in rows('calendar_dates.txt'):
            day(r['date'])
            if r['exception_type'] == '1':
                dates[r['date']].add(r['service_id'])
            elif r['exception_type'] == '2':
                dates[r['date']].discard(r['service_id'])
            else:
                raise ValueError('Invalid calendar exception')
        dates = {d: values for d, values in dates.items() if values}
        if not dates or any(not values.issubset(by_service) for values in dates.values()):
            raise ValueError('Calendar references missing trips')
        end = day(max(dates))
        if today.strftime('%Y%m%d') not in dates or (end-today).days < 7:
            raise ValueError(agency + ' feed does not cover today and at least seven more days')
        if any(abs((day(d)-today).days) > 730 for d in dates):
            raise ValueError('Implausible service date')
        files = {}
        aliases = {}
        for service, values in sorted(by_service.items()):
            stable_service = agency + '-' + hashlib.sha256(service.encode()).hexdigest()[:16]
            for trip in values:
                trip['service'] = stable_service
            values.sort(key=lambda t: t['id'])
            data = encoded(values)
            key = agency + '-' + hashlib.sha256(data).hexdigest()[:24]
            files[key + '.json'] = data
            aliases[service] = key
        calendar = {d: sorted(aliases[s] for s in values) for d, values in sorted(dates.items())}
        coverage = {'from': min(dates), 'until': max(dates), 'source': SOURCES[agency]['page'], 'realtime': False}
        return {'stops': list(stops.values()), 'routes': routes, 'calendar': calendar, 'files': files, 'coverage': coverage, 'trips': len(trips), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def refresh(archives, output, today, baseline=None):
    feeds = {a: convert(archives[a], a, today) for a in SOURCES}
    for agency, feed in feeds.items():
        minimum = 1000 if agency == 'BT' else 300
        if len(feed['stops']) < minimum or feed['trips'] < 1000:
            raise ValueError(agency + ' feed unexpectedly small')
        if baseline:
            old_stops = sum(s['id'].startswith('GO:') == (agency == 'GO') for s in baseline['stops'])
            if len(feed['stops']) < old_stops * .65:
                raise ValueError(agency + ' stop count dropped more than 35%; manual review required')
            old_end = (baseline.get('coverage', {}).get(agency, {}) or baseline.get('goCoverage', {}) if agency == 'GO' else baseline.get('coverage', {}).get('BT', {})).get('until')
            if not old_end and agency == 'BT':
                old_end = baseline.get('validUntil', '').replace('-', '')
            if old_end and feed['coverage']['until'] < old_end:
                raise ValueError(agency + ' timetable coverage regressed')
    calendar = defaultdict(list)
    for feed in feeds.values():
        for d, keys in feed['calendar'].items():
            calendar[d].extend(keys)
    catalog = {
        'stops': sorted([s for f in feeds.values() for s in f['stops']], key=lambda s: s['id']),
        'routes': {k:v for f in feeds.values() for k,v in f['routes'].items()},
        'calendar': {d: sorted(keys) for d, keys in sorted(calendar.items())},
        'validUntil': day(feeds['BT']['coverage']['until']).isoformat(),
        'source': SOURCES['BT']['page'],
        'goCoverage': feeds['GO']['coverage'],
        'coverage': {a: f['coverage'] for a,f in feeds.items()},
        'feedHashes': {a:f['sha256'] for a,f in feeds.items()},
    }
    files = {name: data for f in feeds.values() for name,data in f['files'].items()}
    # Build completely in a sibling staging folder before making output visible.
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise ValueError('Output directory must be new; refusing to overwrite an existing dataset')
    with tempfile.TemporaryDirectory(dir=output.parent) as temp:
        stage = Path(temp) / 'data'
        stage.mkdir()
        for name,data in files.items():
            if len(data) > 24 * 1024 * 1024:
                raise ValueError('A timetable exceeds the static asset size limit')
            (stage/name).write_bytes(data)
        (stage/'catalog.json').write_bytes(encoded(catalog))
        stage.rename(output)
    return {a:{'stops':len(f['stops']), 'trips':f['trips'], 'services':len(f['files']), **f['coverage']} for a,f in feeds.items()}


def apply(output, target):
    # Only the known public timetable directory can be updated; never touch synced sources.
    target = target.resolve()
    if target != (ROOT/'public/data').resolve():
        raise ValueError('Apply target must be this checkout public/data directory')
    catalog = json.loads((output/'catalog.json').read_text('utf-8'))
    names = {key+'.json' for keys in catalog['calendar'].values() for key in keys}
    if any(not re.fullmatch(r'(BT|GO)-[a-f0-9]{24}\.json', n) for n in names):
        raise ValueError('Invalid generated timetable filename')
    old = json.loads((target/'catalog.json').read_text('utf-8-sig'))
    old_names = {key+'.json' for keys in old['calendar'].values() for key in keys}
    # Validate/copy schedules before replacing the catalogue, then remove only previously referenced files.
    for name in names:
        if not (output/name).is_file():
            raise ValueError('Missing generated timetable')
    for name in names:
        shutil.copyfile(output/name, target/name)
    temp = target/'catalog.pending'
    temp.write_bytes((output/'catalog.json').read_bytes())
    temp.replace(target/'catalog.json')
    for name in old_names-names:
        path = (target/name).resolve()
        if path.parent != target or not re.fullmatch(r'[A-Za-z0-9_-]+\.json', name):
            raise ValueError('Unsafe obsolete timetable path')
        path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--brampton', type=Path)
    parser.add_argument('--go', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    today = datetime.now(ZoneInfo('America/Toronto')).date()
    runtime = ROOT/'.sites-runtime'
    runtime.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=runtime) as tmp:
        archives = {}
        for agency, provided in [('BT', args.brampton), ('GO', args.go)]:
            archives[agency] = provided or Path(tmp)/(agency+'.zip')
            if not provided:
                download(SOURCES[agency]['url'], archives[agency])
        baseline = json.loads((ROOT/'public/data/catalog.json').read_text('utf-8-sig'))
        report = refresh(archives, args.output.resolve(), today, baseline)
        if args.apply:
            apply(args.output.resolve(), ROOT/'public/data')
        print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
