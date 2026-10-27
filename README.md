# Riftbound Sim: Rift Table

`riftable.html` is a single self-contained file for playing Riftbound (Riot's League of Legends TCG) against an AI on your phone. Open it in a mobile browser. Card effects resolve automatically. Card images for the five decks are embedded in the file, so the only network requests are for Google Fonts. Card images are © Riot Games.

- `tools/fetch_cards.py` downloads the Riftcodex pool and `tools/fetch_dotgg.py` downloads riftbound.gg's list (which has the Radiance set and real equipment Might bonuses). `tools/build_data.py raw.json src/cards.json dotgg.json` merges them into `src/cards.json`.
- `tools/fetch_images.py` downloads the card images for the built-in decks, shrinks them and saves them as WebP files in `src/img/`, which the build embeds.
- `src/engine.js` holds the rules-text parser, game rules, decks and AI. `src/ui.js` and `src/style.css` hold the mobile UI.
- `python3 tools/build.py` assembles `riftable.html`.
- `node test/bench.js` measures the AI against a random player, a rush player and itself.
- `node test/battlefields.js` sets up each battlefield used by the decks and checks that its effect happens.
- `node test/sim.js 60` plays 60 headless AI-vs-AI games using the built file and prints a coverage report for each deck.
