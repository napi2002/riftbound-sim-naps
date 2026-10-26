# Riftbound Sim: Rift Table

`riftable.html` is a single self-contained file for playing Riftbound (Riot's League of Legends TCG) against an AI on your phone. Open it in a mobile browser. Card effects resolve automatically. The only network requests are for Google Fonts.

- `tools/fetch_cards.py` downloads the Riftcodex pool and `tools/build_data.py` filters it into `src/cards.json`.
- `src/engine.js` holds the rules-text parser, game rules, decks and AI. `src/ui.js` and `src/style.css` hold the mobile UI.
- `python3 tools/build.py` assembles `riftable.html`.
- `node test/sim.js 30` plays 30 headless AI-vs-AI games using the built file and prints a coverage report for each deck.
