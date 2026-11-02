"""Restore rules text that Riftcodex drops (e.g. the '+N Might / when I ...' half of Equipment) from riftbound.gg.
A card is patched only when riftbound.gg's text starts with ours and is materially longer, so nothing is rewritten,
only completed. Usage: python3 tools/fix_card_text.py dotgg.json src/cards.json"""
import json, re, sys
dot, path = json.load(open(sys.argv[1])), sys.argv[2]
cards = json.load(open(path))
norm = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())
plain = lambda s: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s or '')).strip()
bare = lambda s: norm(re.sub(r'\([^)]*\)', '', plain(s)))
best = {}
for d in dot:
    if d.get('promo') == '1' or not d.get('effect'): continue
    k = norm(re.sub(r'\s*\([^)]*\)\s*$', '', d['name']))
    if k not in best or len(d['effect']) > len(best[k]): best[k] = d['effect']
fixed = []
for c in cards:
    t = best.get(norm(c['name']))
    if not t: continue
    ours, theirs = bare(c['rich'] or c['plain']), bare(t)
    if len(theirs) > len(ours) + 15 and theirs.startswith(ours[:max(1, len(ours) - 3)]):
        rich = t if t.lstrip().startswith('<p>') else '<p>' + t + '</p>'
        c['rich'], c['plain'] = rich, plain(rich)
        fixed.append(c['name'])
json.dump(cards, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(fixed), 'cards completed:', ', '.join(fixed))
