"""Assemble riftable.html from src/. Usage: python3 tools/build.py"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src'
cards = json.loads((src / 'cards.json').read_text())
data = json.dumps(cards, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
html = (src / 'template.html').read_text()
for key, val in (('/*STYLE*/', (src / 'style.css').read_text()), ('/*ENGINE*/', (src / 'engine.js').read_text()),
                 ('/*UI*/', (src / 'ui.js').read_text()), ('/*CARDS*/', data)):
    html = html.replace(key, val, 1)
(root / 'riftable.html').write_text(html)
print('riftable.html', len(html.encode()) // 1024, 'KB,', len(cards), 'cards')
