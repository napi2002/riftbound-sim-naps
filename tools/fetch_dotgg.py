"""Download riftbound.gg's card list (has the newest set, Radiance, and real equipment Might bonuses).
Usage: python3 tools/fetch_dotgg.py dotgg.json"""
import json, sys, urllib.request
req = urllib.request.Request('https://api.dotgg.gg/cgfw/getcards?game=riftbound', headers={'User-Agent': 'Mozilla/5.0 rift-table'})
data = json.load(urllib.request.urlopen(req, timeout=120))
json.dump(data, open(sys.argv[1], 'w'))
print(len(data), 'cards')
