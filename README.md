# Grappling Dex

A collectible dex for Brazilian jiu-jitsu. Log what you train, and each technique climbs from **Seen** to **Drilled**, **Hit** and **Mastered**. Position scorecards show where your game has gaps, such as a missing escape from bottom mount.

## What's here

| File | What it is |
| --- | --- |
| `grappling-dex.html` | The Grappling Dex page: the dex, the skill map, the session log and position scorecards. |
| `technique-library.md` | The BJJ Technique Library doc the dex was built from: techniques by position, leg locks, escapes, classic chains and a technique index. |

## How progress works

- **Seen:** logged once (taught, drilled or hit).
- **Drilled:** drilled in 2 sessions.
- **Hit:** landed once in live rolling.
- **Mastered:** 5 live hits across 3 sessions.

You can also set a starting stage for moves you already know. Positions are scored by how many of their attacks, passes, escapes and ways in you have at Hit or better.

## Running it

The live version runs as a Claude artifact, which saves progress to your Claude account. Opened as a plain file in a browser, it works the same but saves progress in that browser only. It loads [d3](https://d3js.org/) and Google Fonts from their CDNs.

## Data

Techniques, positions and chains are defined as arrays near the top of the script in `grappling-dex.html` (`HUBS`, `HUB_LINKS`, `TECHS`, `CHAINS`). Add a technique by adding a row to `TECHS`.

The technique content is a starting reference written from general BJJ knowledge. Names, variations and leg lock rules differ between gyms and rulesets.
