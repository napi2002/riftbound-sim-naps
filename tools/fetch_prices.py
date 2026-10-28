"""Card price snapshot from riftbound.gg (TCGplayer market price, USD). For each card name, the cheapest
non-promo printing: normal price if listed, else foil. Usage: python3 tools/fetch_prices.py [dotgg.json] out.json"""
import json, re, sys, urllib.request, datetime
if len(sys.argv) > 2:
    data = json.load(open(sys.argv[1]))
else:
    req = urllib.request.Request('https://api.dotgg.gg/cgfw/getcards?game=riftbound', headers={'User-Agent': 'Mozilla/5.0 rift-table'})
    data = json.load(urllib.request.urlopen(req, timeout=120))
norm = lambda n: re.sub(r'[^a-z0-9]', '', n.lower())
f = lambda v: float(v) if v not in (None, '') and float(v) > 0 else None
best = {}
for d in data:
    if d.get('promo') == '1': continue
    name = re.sub(r'\s*\([^)]*\)\s*$', '', d['name']).strip()
    p = f(d.get('price')) or f(d.get('foilPrice'))
    if p is None: continue
    k = norm(name)
    if k not in best or p < best[k][1]: best[k] = (name, p, d['id'])
out = {'source': 'api.dotgg.gg getcards (TCGplayer market price, USD)', 'date': datetime.date.today().isoformat(),
       'prices': {v[0]: round(v[1], 2) for v in sorted(best.values())}}
json.dump(out, open(sys.argv[-1], 'w'), indent=0)
print(len(out['prices']), 'priced cards ->', sys.argv[-1])
