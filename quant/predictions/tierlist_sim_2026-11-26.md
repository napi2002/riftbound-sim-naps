# Simulated tier list, Nov 27 2026 (post-ban decks, AI level 8)

Every deck against every other deck: 23 current tournament lists (Nov 23 2026 ban list applied), 40 games per matchup with seats mirrored and shared seeds, 10,120 games, AI level 8.

Since the first tier list (Nov 26):
- Azir: the legend's Sand Soldiers get Weaponmaster, and the bot keeps 1 energy for the legend.
- Ezreal: the bot uses Pack of Wonders (Treasure Trove loop, replaying units with strong play effects).
- Counter spells are judged by what the spell does.
- Cards the bot never played and now plays:
  - Rampage: best friendly/enemy pair, with the Body power for +2.
  - Switcheroo: swaps Might in a showdown when that flips the fight.
  - Call to Glory: recognised as a +3 trick, often free by spending a buff.
  - Twilight Shroud: protects an attacker while the opponent has mana up.
  - Imperial Decree: in fights where the enemy loses more.
  - Poro Snax: cracked when low on cards.
  - Hunker Down: now simulated.

Tested one at a time (deck vs field, 440 games, same seeds, on vs off), Imperial Decree, Twilight Shroud and Poro Snax are neutral. Rampage and Switcheroo decks moved up the most. A rerun with the same seeds moves decks with no card changes by up to about 5 points, so differences that small are noise.

Tiers by average win rate vs the whole field: S 65%+, A 55-65%, B 45-55%, C 38-45%, D under 38%. Real win rates are riftbound.gg's 14 days to 2026-11-15, which is before the bans.

| Tier | Deck | Sim WR | 95% CI | Real WR (pre-ban) | Real matches |
|---|---|---|---|---|---|
| S | volibear | 79.1% | 76.3-81.6% | 36% | 151 |
| S | settkingpin | 74.2% | 71.2-77.0% | 52% | 309 |
| S | evelynn | 74.0% | 71.0-76.8% | 38% | 394 |
| S | rengar | 71.1% | 68.1-74.0% | 49% | 1390 |
| S | fiora | 68.6% | 65.5-71.6% | 45% | 159 |
| A | leblanc | 62.3% | 59.0-65.4% | 46% | 707 |
| A | masteryi | 62.0% | 58.8-65.2% | 51% | 1135 |
| A | sett | 59.9% | 56.6-63.1% | 52% | 309 |
| A | vex | 57.5% | 54.2-60.7% | 50% | 864 |
| A | nasus | 55.2% | 51.9-58.5% | 42% | 195 |
| B | kaisa | 53.3% | 50.0-56.6% | 52% | 4914 |
| B | mordekaiser | 48.8% | 45.5-52.1% | 34% | 262 |
| B | kennen | 45.9% | 42.6-49.2% | 55% | 3704 |
| C | reksai | 44.3% | 41.1-47.6% | 53% | 1002 |
| C | azir | 42.0% | 38.8-45.3% | 45% | 493 |
| C | riven | 40.6% | 37.4-43.8% | 58% | 6437 |
| C | orianna | 39.0% | 35.8-42.2% | 36% | 268 |
| D | irelia | 33.6% | 30.6-36.8% | 45% | 827 |
| D | ornn | 33.6% | 30.6-36.8% | 43% | 500 |
| D | seraphine | 30.8% | 27.8-33.9% | 37% | 137 |
| D | jayce | 26.9% | 24.1-30.0% | 56% | 986 |
| D | ezreal | 25.0% | 22.3-28.0% | 40% | 139 |
| D | akali | 22.2% | 19.5-25.0% | 41% | 733 |

Known bias (quant/results/ai_eval_2026-11.md): the sim overrates unit-heavy decks and underrates tempo and spell decks, so rank agreement with real results is weak.
