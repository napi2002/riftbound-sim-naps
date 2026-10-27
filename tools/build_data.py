"""Filter raw Riftcodex JSON into src/cards.json. Usage: python3 tools/build_data.py raw.json src/cards.json"""
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
cards=[r for _,r in by.values()]
cards.sort(key=lambda r:r['name'])
json.dump(cards,open(sys.argv[2],'w'),separators=(',',':'),ensure_ascii=False)
print(len(cards))
