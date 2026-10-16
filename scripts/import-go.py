"""Merge an official GO GTFS ZIP into the local catalogue. Re-runnable; no credentials.
Usage: python scripts/import-go.py path/to/GO-GTFS.zip
Source: https://www.metrolinx.com/en/about-us/open-data
Contains information licensed under the Open Government Licence - Ontario - Metrolinx.
"""
import csv, hashlib, io, json, sys, zipfile
from collections import defaultdict
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'public' / 'data'
archive = zipfile.ZipFile(sys.argv[1])
def rows(name):
    if name not in archive.namelist(): return []
    return csv.DictReader(io.TextIOWrapper(archive.open(name), encoding='utf-8-sig'))
def save(path, data):
    path.write_text(json.dumps(data, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')
def seconds(value):
    h, m, s = map(int, value.split(':'))
    return h*3600+m*60+s
def service(value): return 'GO-'+hashlib.sha256(value.encode()).hexdigest()[:16]

catalog = json.loads((root/'catalog.json').read_text(encoding='utf-8-sig'))
stops = {r['stop_id']: {'id':'GO:'+r['stop_id'], 'code':r.get('stop_code') or r['stop_id'], 'name':r['stop_name'], 'lat':float(r['stop_lat']), 'lon':float(r['stop_lon'])} for r in rows('stops.txt') if r.get('stop_lat') and r.get('stop_lon') and r.get('location_type','0') in ('','0')}
routes = {r['route_id']:r for r in rows('routes.txt') if r['route_type'] in ('2','3')}
trips = {}
for r in rows('trips.txt'):
    if r['route_id'] not in routes: continue
    route = routes[r['route_id']]
    trips[r['trip_id']] = {'id':'GO:'+r['trip_id'], 'route':'GO:'+r['route_id'], 'headsign':r.get('trip_headsign') or route['route_long_name'], 'service':service(r['service_id']), 'agency':'GO', 'mode':'train' if route['route_type']=='2' else 'bus', 'number':'GO '+(route['route_short_name'] or r['route_id']), 'stops':[]}
for r in rows('stop_times.txt'):
    trip = trips.get(r['trip_id'])
    if trip is None or r['stop_id'] not in stops: continue
    value = r.get('departure_time') or r.get('arrival_time')
    if not value: continue
    trip['stops'].append(['GO:'+r['stop_id'], seconds(value), int(r['stop_sequence']), int(r.get('pickup_type') or 0), int(r.get('drop_off_type') or 0), seconds(r.get('arrival_time') or value)])
services = defaultdict(list)
for t in trips.values():
    t['stops'].sort(key=lambda s:s[2])
    if len(t['stops']) > 1: services[t['service']].append(t)
# The official feed uses calendar_dates, including its dated exceptions.
dates = defaultdict(set)
for r in rows('calendar_dates.txt'):
    key = service(r['service_id'])
    if key not in services: continue
    if r['exception_type']=='1': dates[r['date']].add(key)
    else: dates[r['date']].discard(key)
if not dates: raise ValueError('No GO service dates found; catalogue unchanged')
catalog['stops'] = [s for s in catalog['stops'] if not s['id'].startswith('GO:')] + list(stops.values())
catalog['routes'] = {k:v for k,v in catalog['routes'].items() if not k.startswith('GO:')}
catalog['routes'].update({'GO:'+key:{'id':'GO:'+key, 'name':r['route_long_name'], 'number':r['route_short_name']} for key,r in routes.items()})
for date, values in list(catalog['calendar'].items()): catalog['calendar'][date] = [v for v in values if not v.startswith('GO-')]
for date, values in dates.items(): catalog['calendar'][date] = catalog['calendar'].get(date,[]) + sorted(values)
catalog['goCoverage'] = {'from':min(dates), 'until':max(dates), 'source':'https://www.metrolinx.com/en/about-us/open-data', 'realtime':False}
for key, values in services.items(): save(root/(key+'.json'), values)
save(root/'catalog.json', catalog)
print(json.dumps({'stops':len(stops), 'trips':len(trips), 'services':len(services), 'coverage':catalog['goCoverage']}))
