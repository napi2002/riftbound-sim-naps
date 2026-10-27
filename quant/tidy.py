"""Parse every raw meta snapshot in quant/data/raw into tidy CSVs (stdlib only).

Outputs (in quant/data/tidy/):
  deck_week.csv    one row per (snapshot, archetype)
  matchup_week.csv one row per (snapshot, deck, opponent) as listed by the snapshot
  card_week.csv    one row per (snapshot, deck, card): copies and inclusion weight (for H5)

Archetype slugs are mapped to engine deck ids with SLUG_TO_ENGINE. Unmapped archetypes get
engine_id 'other' and are counted in the printed summary. If the same snapshot_id was
fetched more than once, only the first fetch is kept.

Usage: python3 quant/tidy.py [--data-dir quant/data]
"""
import argparse, csv, datetime, glob, json, os

HERE = os.path.dirname(os.path.abspath(__file__))

# dotgg archetype slug -> engine deck id (RT.DECKS[].id / RT.real(id)). Source: the slugs behind
# the REAL table embedded in src/engine.js (REAL_DATE 2026-10-27, snapshot 2720).
# Note 'unl-191-master-yi' is a different Master Yi legend and is NOT the engine's masteryi deck.
SLUG_TO_ENGINE = {
    'ven-155-kennen': 'kennen', 'unl-199-leblanc': 'leblanc', 'unl-183-rengar': 'rengar',
    'sfd-195-irelia': 'irelia', 'ven-139-akali': 'akali', 'ven-149-jayce': 'jayce',
    'ogs-019-master-yi': 'masteryi', 'sfd-197-azir': 'azir', 'unl-193-vex': 'vex',
    'sfd-187-reksai': 'reksai', 'rad-173-riven': 'riven', 'rad-153-evelynn': 'evelynn',
    'rad-143-mordekaiser': 'mordekaiser', 'rad-145-orianna': 'orianna', 'rad-151-seraphine': 'seraphine',
}


def iso(t):
    return datetime.datetime.fromtimestamp(int(t), datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ') if t else ''


def fetched_at_from_name(path):
    # 20261027T090657Z_metasnapshot.json -> 2026-10-27T09:06:57Z
    s = os.path.basename(path).split('_')[0]
    d = datetime.datetime.strptime(s, '%Y%m%dT%H%M%SZ')
    return d.strftime('%Y-%m-%dT%H:%M:%SZ')


def write(path, cols, rows):
    with open(path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data-dir', default=os.path.join(HERE, 'data'))
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.data_dir, 'raw', '*_metasnapshot.json')))
    out = os.path.join(a.data_dir, 'tidy')
    os.makedirs(out, exist_ok=True)
    decks, mus, cards, seen = [], [], [], set()
    dup = 0
    for fp in files:
        m = json.load(open(fp))
        sid = m.get('snapshot_id')
        if sid in seen:
            dup += 1
            continue
        seen.add(sid)
        s = m.get('sample') or {}
        base = {'snapshot_id': sid, 'fetched_at': fetched_at_from_name(fp), 'generated_at': iso(m.get('generated_at')),
                'window_from': iso(s.get('from')), 'window_to': iso(s.get('to')),
                'window_from_unix': s.get('from'), 'window_to_unix': s.get('to'), 'set_code': m.get('set_code')}
        unm_n = unm_k = tot_n = 0
        for arc in m.get('archetypes') or []:
            slug = arc.get('slug')
            eid = SLUG_TO_ENGINE.get(slug, 'other')
            n = arc.get('winrate_n') or 0
            tot_n += n
            if eid == 'other':
                unm_k += 1
                unm_n += n
            decks.append(dict(base, deck=slug, engine_id=eid, name=arc.get('name'), winrate=arc.get('winrate'), n=n,
                              share=arc.get('share'), share_delta=arc.get('share_delta'), decks=arc.get('decks'),
                              tier=arc.get('tier'), top8_rate=arc.get('top8_rate'), cut_rate=arc.get('cut_rate')))
            for mu in arc.get('matchups') or []:
                opp = mu.get('vs_slug')
                mus.append({'snapshot_id': sid, 'fetched_at': base['fetched_at'], 'deck': slug,
                            'engine_id': eid, 'opp': opp, 'opp_engine_id': SLUG_TO_ENGINE.get(opp, 'other'),
                            'winrate': mu.get('winrate'), 'n': mu.get('n')})
            for c in arc.get('cards') or []:
                cards.append({'snapshot_id': sid, 'deck': slug, 'engine_id': eid, 'card_id': c.get('id'),
                              'card_name': c.get('name'), 'in_deck': c.get('in_deck'), 'weight': c.get('weight')})
        print('snapshot %s (%s..%s): %d archetypes, %d mapped, %d -> other (%d of %d game-results, %.1f%%)' % (
            sid, base['window_from'][:10], base['window_to'][:10], len(m.get('archetypes') or []),
            len(m.get('archetypes') or []) - unm_k, unm_k, unm_n, tot_n, 100.0 * unm_n / max(tot_n, 1)))
    dcols = ['snapshot_id', 'fetched_at', 'generated_at', 'window_from', 'window_to', 'window_from_unix', 'window_to_unix',
             'set_code', 'deck', 'engine_id', 'name', 'winrate', 'n', 'share', 'share_delta', 'decks', 'tier', 'top8_rate', 'cut_rate']
    write(os.path.join(out, 'deck_week.csv'), dcols, decks)
    write(os.path.join(out, 'matchup_week.csv'),
          ['snapshot_id', 'fetched_at', 'deck', 'engine_id', 'opp', 'opp_engine_id', 'winrate', 'n'], mus)
    write(os.path.join(out, 'card_week.csv'),
          ['snapshot_id', 'deck', 'engine_id', 'card_id', 'card_name', 'in_deck', 'weight'], cards)
    print('%d raw files, %d snapshots (%d duplicate snapshot_ids skipped): %d deck rows, %d matchup rows, %d card rows -> %s'
          % (len(files), len(seen), dup, len(decks), len(mus), len(cards), out))


if __name__ == '__main__':
    main()
