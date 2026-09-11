#!/usr/bin/env python3
"""Resumable, deduplicated Census address-range backfill of a pinned registry snapshot.

Only public registered practice addresses are sent to Census, with opaque IDs.
No personal/home-location inference, city centroids, or paid geocoding fallback.
"""
import argparse
import csv
import hashlib
import io
import json
import math
import os
from pathlib import Path
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone

CENSUS = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch'
API = '/api/abundance/healthcare-providers/geocodes'


def api_request(base, token, params=None, body=None):
    url = base + API + ('?' + urllib.parse.urlencode(params) if params else '')
    data = json.dumps(body, separators=(',', ':')).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                payload = json.load(response)
            if not payload.get('success'):
                raise RuntimeError('Geocode API rejected the batch')
            return payload['data']
        except urllib.error.HTTPError as error:
            if error.code not in (429, 502, 503, 504) or attempt == 4:
                raise RuntimeError(f'Geocode API HTTP {error.code}; checkpoint retained') from None
        except (urllib.error.URLError, TimeoutError):
            if attempt == 4:
                raise RuntimeError('Geocode API unavailable; checkpoint retained') from None
        time.sleep(min(2 ** attempt, 16))


def address_identity(record, period):
    fields = [' '.join(str(record.get(k) or '').upper().split()) for k in (
        'practice_address_1', 'practice_city', 'practice_state', 'practice_postal_code', 'practice_country')]
    fields[3] = fields[3][:5]
    fields[4] = fields[4] or 'US'
    key = hashlib.sha256(json.dumps([period, fields], separators=(',', ':')).encode()).hexdigest()
    return key, fields


def parse_census(text, expected):
    results = {}
    fetched_at = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    for row in csv.reader(io.StringIO(text)):
        if not row:
            continue
        if len(row) < 3 or row[0] not in expected or row[0] in results:
            raise ValueError('Unexpected, duplicate or malformed Census row; checkpoint unchanged')
        result = {'status': 'unmatched', 'fetched_at': fetched_at}
        if row[2] not in ('Match', 'No_Match', 'Tie'):
            raise ValueError('Unknown Census match status; checkpoint unchanged')
        if row[2] == 'Match' and (len(row) < 6 or row[3] not in ('Exact', 'Non_Exact')):
            raise ValueError('Malformed Census match; checkpoint unchanged')
        if row[2] == 'Match' and row[3] == 'Exact':
            longitude, latitude = map(float, row[5].split(','))
            if not math.isfinite(latitude) or not math.isfinite(longitude) or abs(latitude) > 90 or abs(longitude) > 180 or not row[4]:
                raise ValueError('Invalid Census coordinates; checkpoint unchanged')
            result.update(status='matched', latitude=latitude, longitude=longitude, matched_address=row[4])
        result['census_match_status'] = row[2]
        result['census_match_type'] = row[3] if len(row) > 3 else None
        results[row[0]] = result
    if set(results) != set(expected):
        raise ValueError('Incomplete Census batch; checkpoint unchanged')
    return results


def census_request(addresses):
    output = io.StringIO()
    writer = csv.writer(output)
    for key, fields in addresses:
        writer.writerow([key, *fields[:4]])
    boundary = 'npg-' + uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="benchmark"\r\n\r\nPublic_AR_Current\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="addressFile"; filename="addresses.csv"\r\nContent-Type: text/csv\r\n\r\n'
            + output.getvalue() + f'\r\n--{boundary}--\r\n').encode()
    req = urllib.request.Request(CENSUS, data=body, headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
    with urllib.request.urlopen(req, timeout=120) as response:
        text = response.read().decode('utf-8-sig')
    return parse_census(text, {key for key, _ in addresses})


def run(args):
    token = os.environ.get('AGENCY_INTERNAL_API_KEY', '').strip()
    if not token:
        raise RuntimeError('AGENCY_INTERNAL_API_KEY required')
    base = args.agency_base_url.rstrip('/')
    Path(args.checkpoint).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(args.checkpoint)
    db.executescript('''
    CREATE TABLE IF NOT EXISTS jobs(run_id TEXT PRIMARY KEY,base TEXT,period TEXT,cursor TEXT,total INTEGER,exported INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS addresses(key TEXT PRIMARY KEY,fields TEXT NOT NULL,result TEXT);
    CREATE TABLE IF NOT EXISTS providers(run_id TEXT,npi TEXT,hash TEXT,key TEXT,uploaded INTEGER DEFAULT 0,PRIMARY KEY(run_id,npi));
    CREATE INDEX IF NOT EXISTS providers_pending ON providers(run_id,uploaded,npi);
    CREATE INDEX IF NOT EXISTS providers_address ON providers(run_id,key);
    ''')
    db.execute('INSERT OR IGNORE INTO jobs(run_id,base,period,cursor) VALUES(?,?,?,?)',
               (args.run_id, base, datetime.now(timezone.utc).strftime('%Y-%m'), ''))
    job = db.execute('SELECT base,period,cursor,total,exported FROM jobs WHERE run_id=?', (args.run_id,)).fetchone()
    if job[0] != base:
        raise RuntimeError('Checkpoint belongs to another Agency endpoint')
    db.commit()
    while not job[4]:
        page = api_request(base, token, params={'run_id': args.run_id, 'cursor': job[2]})
        if page['run_id'] != args.run_id or (job[3] is not None and page['total'] != job[3]):
            raise RuntimeError('Pinned snapshot changed; checkpoint retained')
        with db:
            for record in page['records']:
                key, fields = address_identity(record, job[1])
                if len(record.get('source_payload_hash') or '') != 64:
                    raise RuntimeError('Source hash missing; checkpoint retained')
                unsupported = fields[4] != 'US' or not all(fields[:3])
                result = json.dumps({'status': 'unmatched', 'fetched_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'), 'reason': 'unsupported_or_incomplete_address'}) if unsupported else None
                db.execute('INSERT OR IGNORE INTO addresses VALUES(?,?,?)', (key, json.dumps(fields), result))
                db.execute('INSERT OR IGNORE INTO providers(run_id,npi,hash,key) VALUES(?,?,?,?)', (args.run_id, record['npi'], record['source_payload_hash'], key))
            db.execute('UPDATE jobs SET cursor=?,total=?,exported=? WHERE run_id=?', (page['next_cursor'] or '', page['total'], int(page['next_cursor'] is None), args.run_id))
        job = db.execute('SELECT base,period,cursor,total,exported FROM jobs WHERE run_id=?', (args.run_id,)).fetchone()
        print(json.dumps({'phase': 'source', 'providers': db.execute('SELECT count(*) FROM providers WHERE run_id=?', (args.run_id,)).fetchone()[0], 'expected': job[3]}), flush=True)
    count = db.execute('SELECT count(*) FROM providers WHERE run_id=?', (args.run_id,)).fetchone()[0]
    if count != job[3]:
        raise RuntimeError('Incomplete source enumeration; refusing backfill')
    while True:
        pending = db.execute('SELECT a.key,a.fields FROM addresses a WHERE a.result IS NULL AND EXISTS(SELECT 1 FROM providers p WHERE p.run_id=? AND p.key=a.key) ORDER BY a.key LIMIT ?', (args.run_id, args.batch_size)).fetchall()
        if not pending:
            break
        results = census_request([(key, json.loads(fields)) for key, fields in pending])
        with db:
            db.executemany('UPDATE addresses SET result=? WHERE key=?', [(json.dumps(result), key) for key, result in results.items()])
        print(json.dumps({'phase': 'census', 'unique_addresses': len(results), 'matched': sum(r['status'] == 'matched' for r in results.values())}), flush=True)
    allowed = {'status', 'latitude', 'longitude', 'matched_address', 'fetched_at'}
    while True:
        rows = db.execute('SELECT p.npi,p.hash,a.result FROM providers p JOIN addresses a ON a.key=p.key WHERE p.run_id=? AND p.uploaded=0 ORDER BY p.npi LIMIT 500', (args.run_id,)).fetchall()
        if not rows:
            break
        results = [{'npi': npi, 'source_payload_hash': digest, **{k: v for k, v in json.loads(result).items() if k in allowed}} for npi, digest, result in rows]
        receipt = api_request(base, token, body={'run_id': args.run_id, 'results': results})
        if receipt['imported'] != len(rows):
            raise RuntimeError('Incomplete upload receipt; retry checkpoint')
        with db:
            db.executemany('UPDATE providers SET uploaded=1 WHERE run_id=? AND npi=?', [(args.run_id, npi) for npi, _, _ in rows])
        print(json.dumps({'phase': 'upload', **receipt}), flush=True)
    summary = db.execute("SELECT count(*),count(DISTINCT p.key),sum(json_extract(a.result,'$.status')='matched'),sum(p.uploaded) FROM providers p JOIN addresses a ON a.key=p.key WHERE p.run_id=?", (args.run_id,)).fetchone()
    print(json.dumps({'phase': 'complete', 'run_id': args.run_id, 'providers': summary[0], 'unique_addresses': summary[1], 'matched_providers': summary[2], 'unresolved_providers': summary[0] - summary[2], 'uploaded': summary[3], 'precision': 'address_range_interpolated', 'checkpoint': args.checkpoint}), flush=True)
    db.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--checkpoint', required=True)
    parser.add_argument('--agency-base-url', default='https://createsomething.agency')
    parser.add_argument('--batch-size', type=int, default=1000, choices=range(1, 10001), metavar='1..10000')
    try:
        run(parser.parse_args())
    except Exception as error:
        print(json.dumps({'phase': 'failed', 'error_type': type(error).__name__, 'detail': str(error) if isinstance(error, (ValueError, RuntimeError)) else 'Upstream request failed; retry the checkpoint.', 'checkpoint_retained': True}), flush=True)
        raise SystemExit(1)
