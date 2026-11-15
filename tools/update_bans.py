"""Refresh the tournament ban flags in src/cards.json from riftbound.gg's card list (banned == '1').
Usage: python3 tools/update_bans.py dotgg.json src/cards.json"""
import json, re, sys
dot, path = json.load(open(sys.argv[1])), sys.argv[2]
norm = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())
banned = {norm(re.sub(r'\s*\([^)]*\)\s*$', '', d['name'])) for d in dot if str(d.get('banned')) == '1'}
cards = json.load(open(path))
added, removed = [], []
for c in cards:
    b = norm(c['name']) in banned
    if b and not c.get('banned'): added.append(c['name'])
    if not b and c.get('banned'): removed.append(c['name'])
    if b: c['banned'] = True
    else: c.pop('banned', None)
json.dump(cards, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
print('banned now:', len([c for c in cards if c.get('banned')]), '| newly banned:', ', '.join(added) or '-', '| unbanned:', ', '.join(removed) or '-')
