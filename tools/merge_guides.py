"""Merge researched deck guides (one JSON per deck) into src/guides.json and check card names against the deck lists.
Usage: python3 tools/merge_guides.py <folder with <deckId>.json files>"""
import json, pathlib, re, subprocess, sys
root = pathlib.Path(__file__).resolve().parent.parent
folder = pathlib.Path(sys.argv[1])
decks = json.loads(subprocess.check_output(['node', '-e', "const RT=require('./src/engine.js');const o={};RT.DECKS.forEach(d=>o[d.id]=d.list.map(x=>x[1]).concat([d.legend,d.champion]));console.log(JSON.stringify(o))"], cwd=root))
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
out, problems = {}, []
for f in sorted(folder.glob('*.json')):
    if f.stem not in decks: continue
    g = json.loads(f.read_text())
    names = {norm(n) for n in decks[f.stem]}
    named = [h.split(' - ')[0] for h in g.get('holdFor', [])] + list(g.get('mulligan', {}).get('keep', [])) + list(g.get('mulligan', {}).get('toss', []))
    ai = g.get('ai', {})
    named += list(ai.get('priority', {}).keys()) + list(ai.get('holdForShowdown', [])) + list(ai.get('mulliganKeep', []))
    for n in named:
        if norm(n) not in names: problems.append(f'{f.stem}: "{n}" is not in the deck list')
    for m in g.get('matchups', []):
        if m.get('vs') not in decks: problems.append(f'{f.stem}: matchup vs unknown deck "{m.get("vs")}"')
    out[f.stem] = g
(root / 'src' / 'guides.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(len(out), 'guides merged:', ', '.join(out))
print('\n'.join(problems) or 'all card names match the deck lists')
