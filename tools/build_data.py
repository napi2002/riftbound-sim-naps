"""Filter raw Riftcodex JSON into src/cards.json, adding cards Riftcodex lacks (e.g. Radiance) and real equipment
Might bonuses from riftbound.gg. Usage: python3 tools/build_data.py raw.json src/cards.json [dotgg.json]"""
import json, re, sys
raw=json.load(open(sys.argv[1]))
by={}
for i in raw:
    c=i['classification']
    if c['type'] in ('Rune','Token') or c.get('supertype')=='Token': continue
    name=re.sub(r'\s*\([^)]*\)\s*$','',i['name']).strip()
    m=i.get('metadata') or {}
    clean = not (m.get('alternate_art') or m.get('overnumbered') or m.get('signature'))
    t=i.get('text') or {}
    rec={'name':name,'id':i['riftbound_id'],'energy':i['attributes'].get('energy'),'might':i['attributes'].get('might'),
         'power':i['attributes'].get('power'),'type':c['type'],'supertype':c.get('supertype'),'domain':c.get('domain') or [],
         'rich':t.get('rich') or '','plain':t.get('plain') or '','tags':i.get('tags') or [],
         'meta':{k:m.get(k) for k in ('alternate_art','overnumbered','signature')},
         'img':(i.get('media') or {}).get('image_url'),'orientation':i.get('orientation')}
    if name not in by or (clean and not by[name][0]): by[name]=(clean,rec)
# riftbound.gg: add missing cards (newer sets) and the real Might bonus of equipment
dotgg = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else []
norm = lambda n: re.sub(r'[^a-z0-9]', '', n.lower())
have = {norm(n) for n in by}
bonus = {}
for d in dotgg:
    name = re.sub(r'\s*\([^)]*\)\s*$', '', d['name']).strip()
    if d.get('mightBonus') not in (None, ''):
        bonus.setdefault(norm(name), int(d['mightBonus']))
    t = (d.get('type') or [None])[0]
    if not t or t in ('Rune', 'Token') or d.get('supertype') == 'Token' or d.get('promo') == '1':
        continue
    if not re.match(r'^[A-Z]+-\d+$', d['id']) or norm(name) in have:
        continue
    have.add(norm(name))
    num = lambda v: int(v) if v not in (None, '') else None
    rich = d.get('effect') or ''
    by[name] = (True, {'name': name, 'id': d['id'].lower(), 'energy': num(d.get('cost')), 'might': num(d.get('might')), 'power': num(d.get('power')),
        'type': t, 'supertype': d.get('supertype') or None, 'domain': d.get('color') or [], 'rich': rich, 'plain': re.sub(r'<[^>]+>', ' ', rich),
        'tags': d.get('tags') or [], 'meta': {'source': 'riftbound.gg', 'set': d.get('set_name')}, 'img': d.get('image'),
        'orientation': 'landscape' if t == 'Battlefield' else 'portrait'})
for _, r in by.values():
    if r['type'] == 'Gear' and norm(r['name']) in bonus:
        r['mightBonus'] = bonus[norm(r['name'])]
cards=[r for _,r in by.values()]
cards.sort(key=lambda r:r['name'])
json.dump(cards,open(sys.argv[2],'w'),separators=(',',':'),ensure_ascii=False)
print(len(cards))
