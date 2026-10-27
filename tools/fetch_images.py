"""Download and shrink card images for every card in the built-in decks into src/img/.
Usage: python3 tools/fetch_images.py   (needs Pillow and node; skips images already present)"""
import io, json, pathlib, re, subprocess, urllib.request
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'src' / 'img'
out.mkdir(exist_ok=True)
cards = {c['name']: c for c in json.loads((root / 'src' / 'cards.json').read_text())}
names = json.loads(subprocess.check_output(['node', str(root / 'tools' / 'deck_cards.js')]))
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
for name in names:
    dest = out / (norm(name) + '.webp')
    url = cards[name].get('img')
    if dest.exists() or not url:
        continue
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 rift-table'})
    im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert('RGB')
    im.thumbnail((420, 420) if im.width > im.height else (300, 420))
    im.save(dest, 'WEBP', quality=72)
    print(dest.name, dest.stat().st_size // 1024, 'KB')
print(len(names), 'cards,', sum(f.stat().st_size for f in out.glob('*.webp')) // 1024, 'KB total')
