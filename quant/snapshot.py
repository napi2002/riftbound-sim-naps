"""Save the current dotgg Riftbound meta snapshot unchanged, so we build a weekly history.

The endpoint is a 30-day rolling window that is overwritten upstream, so every fetch is
kept as its own raw file and never overwritten. One line per fetch goes into the manifest.

Usage: python3 quant/snapshot.py [--out-dir quant/data] [--getdecks-rq '{"page":1}']
Stdlib only.
"""
import argparse, csv, datetime, hashlib, json, os, sys, urllib.parse, urllib.request

UA = {'User-Agent': 'Mozilla/5.0 rift-table'}
META_URL = 'https://api.dotgg.gg/cgfw/getmetasnapshot?game=riftbound'
DECKS_URL = 'https://api.dotgg.gg/cgfw/getdecks?game=riftbound&rq='
HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST_COLS = ['fetched_at', 'file', 'sha256', 'snapshot_id', 'generated_at',
                 'sample_from', 'sample_to', 'matches', 'decks', 'events', 'window', 'set_code', 'bytes']


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def write_new(path, data):
    # 'xb' fails if the file exists: raw files are never overwritten.
    with open(path, 'xb') as f:
        f.write(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out-dir', default=os.path.join(HERE, 'data'))
    ap.add_argument('--getdecks-rq', default=None,
                    help='optional JSON query for getdecks; saved raw next to the snapshot (not in the manifest)')
    a = ap.parse_args()
    raw_dir = os.path.join(a.out_dir, 'raw')
    os.makedirs(raw_dir, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone.utc)
    ts = now.strftime('%Y%m%dT%H%M%SZ')

    body = fetch(META_URL)
    meta = json.loads(body)  # validate it parses; the bytes are saved unchanged
    if not isinstance(meta, dict) or 'archetypes' not in meta:
        sys.exit('unexpected response: no archetypes key')
    name = ts + '_metasnapshot.json'
    write_new(os.path.join(raw_dir, name), body)

    s = meta.get('sample') or {}
    row = {
        'fetched_at': now.isoformat(timespec='seconds'), 'file': 'raw/' + name,
        'sha256': hashlib.sha256(body).hexdigest(), 'snapshot_id': meta.get('snapshot_id'),
        'generated_at': meta.get('generated_at'), 'sample_from': s.get('from'), 'sample_to': s.get('to'),
        'matches': s.get('matches'), 'decks': s.get('decks'), 'events': s.get('events'),
        'window': meta.get('window'), 'set_code': meta.get('set_code'), 'bytes': len(body),
    }
    man = os.path.join(a.out_dir, 'manifest.csv')
    new = not os.path.exists(man)
    with open(man, 'a', newline='') as f:
        w = csv.DictWriter(f, fieldnames=MANIFEST_COLS)
        if new:
            w.writeheader()
        w.writerow(row)

    if a.getdecks_rq:
        rq = json.loads(a.getdecks_rq)
        d = fetch(DECKS_URL + urllib.parse.quote(json.dumps(rq)))
        write_new(os.path.join(raw_dir, ts + '_getdecks.json'), d)

    fmt = lambda t: datetime.datetime.fromtimestamp(int(t), datetime.timezone.utc).strftime('%Y-%m-%d') if t else '?'
    print('saved %s  snapshot_id=%s  window %s..%s  matches=%s  archetypes=%d' % (
        row['file'], row['snapshot_id'], fmt(row['sample_from']), fmt(row['sample_to']),
        row['matches'], len(meta['archetypes'])))


if __name__ == '__main__':
    main()
