import csv
import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from datetime import date
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('refresh', ROOT/'scripts/refresh-timetables.py')
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)


def table(headers, values):
    text = io.StringIO()
    writer = csv.writer(text)
    writer.writerow(headers)
    writer.writerows(values)
    return text.getvalue()


def feed(path, replacements=None):
    tables = {
        'agency.txt': table(['agency_name','agency_timezone'], [['Brampton Transit','America/New_York']]),
        'stops.txt': table(['stop_id','stop_code','stop_name','stop_lat','stop_lon'], [['A','1','Start',43.7,-79.8],['B','2','End',43.71,-79.8]]),
        'routes.txt': table(['route_id','route_type','route_short_name','route_long_name'], [['1','3','1','Test route']]),
        'trips.txt': table(['trip_id','route_id','service_id','trip_headsign'], [['T','1','weekday','Northbound']]),
        'stop_times.txt': table(['trip_id','stop_id','stop_sequence','arrival_time','departure_time'], [['T','A','1','24:30:00','24:31:00'],['T','B','2','24:45:00','24:45:00']]),
        'calendar.txt': table(['service_id','monday','tuesday','wednesday','thursday','friday','saturday','sunday','start_date','end_date'], [['weekday',1,1,1,1,1,0,0,'20261001','20261130']]),
        'calendar_dates.txt': table(['service_id','date','exception_type'], [['weekday','20261017',1],['weekday','20261019',2]]),
    }
    tables.update(replacements or {})
    with zipfile.ZipFile(path, 'w') as archive:
        for name, text in tables.items():
            archive.writestr(name, text)


class TimetableTests(unittest.TestCase):
    def setUp(self):
        runtime = ROOT/'.sites-runtime'
        runtime.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=runtime)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.zip = self.root/'feed.zip'
        feed(self.zip)

    def test_regular_calendar_exceptions_and_after_midnight(self):
        result = refresh.convert(self.zip, 'BT', date(2026,10,16))
        self.assertIn('20261017', result['calendar'])
        self.assertNotIn('20261019', result['calendar'])
        data = json.loads(next(iter(result['files'].values())))
        self.assertEqual(data[0]['stops'][0][1], 88260)
        self.assertEqual(data[0]['stops'][0][5], 88200)
        self.assertEqual(data[0]['id'], 'T')
        self.assertTrue(all(name.startswith('BT-') for name in result['files']))

    def test_stable_content_names_change_when_schedule_changes(self):
        first = refresh.convert(self.zip, 'BT', date(2026,10,16))
        second = refresh.convert(self.zip, 'BT', date(2026,10,16))
        self.assertEqual(first['files'], second['files'])
        feed(self.zip, {'stop_times.txt': table(['trip_id','stop_id','stop_sequence','arrival_time','departure_time'], [['T','A',1,'24:32:00','24:32:00'],['T','B',2,'24:45:00','24:45:00']])})
        self.assertNotEqual(first['files'].keys(), refresh.convert(self.zip, 'BT', date(2026,10,16))['files'].keys())

    def test_expired_and_nearly_expired_feeds_rejected(self):
        for today in [date(2026,12,1), date(2026,11,27)]:
            with self.assertRaises(ValueError):
                refresh.convert(self.zip, 'BT', today)

    def test_bad_agency_and_times_rejected(self):
        for replacement in [
            {'agency.txt': table(['agency_name','agency_timezone'], [['Other city','America/Toronto']])},
            {'stop_times.txt': table(['trip_id','stop_id','stop_sequence','arrival_time','departure_time'], [['T','A',1,'10:00:00','10:00:00'],['T','B',2,'09:00:00','09:00:00']])},
            {'stop_times.txt': table(['trip_id','stop_id','stop_sequence','arrival_time','departure_time'], [['T','A',1,'',''],['T','B',2,'09:00:00','09:00:00']])},
        ]:
            feed(self.zip, replacement)
            with self.assertRaises(ValueError):
                refresh.convert(self.zip, 'BT', date(2026,10,16))

    def test_one_bad_feed_never_writes_output(self):
        output = self.root/'output'
        with patch.object(refresh, 'convert', side_effect=[{}, ValueError('GO download invalid')]):
            with self.assertRaises(ValueError):
                refresh.refresh({'BT': self.zip, 'GO':self.zip}, output, date(2026,10,16))
        self.assertFalse(output.exists())

    def test_apply_refuses_other_directories(self):
        with self.assertRaises(ValueError):
            refresh.apply(self.root, self.root/'not-public-data')


if __name__ == '__main__':
    unittest.main()
