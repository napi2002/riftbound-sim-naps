"""Download the full Riftcodex card pool. Usage: python3 tools/fetch_cards.py raw.json"""
import json, urllib.request, sys
out=sys.argv[1]
items=[]
def get(n):
    with urllib.request.urlopen(urllib.request.Request(f"https://api.riftcodex.com/cards?dir=1&page={n}&size=100",headers={"User-Agent":"Mozilla/5.0 rift-table"})) as r: return json.load(r)
d=get(1); items+=d['items']
for n in range(2,d['pages']+1): items+=get(n)['items']
json.dump(items,open(out,'w'))
print(len(items))
