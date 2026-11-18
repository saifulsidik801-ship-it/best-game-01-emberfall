# best-game-01-emberfall

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/saifulsidik801-ship-it/best-game-01-emberfall/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/saifulsidik801-ship-it/best-game-01-emberfall/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**EMBERFALL: Relight the Dawn** — your lantern is your weapon *and* your fuel: every beam drains oil, and only kills, braziers and shards give it back, so you must spend light to make light across 5 dark realms to gather 5 Ember Shards and relight the Great Beacon.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/index.html` + ES modules under `game/src/`, all art procedural canvas, all music and SFX synthesized live with WebAudio.

## How to play

- **Goal:** collect 5 Ember Shards (one per realm), then light the Great Beacon. Lose if your HP — or your light — runs out in the dark.
- **Move:** WASD / arrows. **Aim:** mouse. **Beam:** hold left mouse / Space — it drains oil. **Chest:** E. **Almanac:** J. **Pause:** P. **Mute:** M.
- **The loop:** explore the dark → beam shadow creatures (kills refund oil) → light 3 braziers per realm (each refunds oil + embers) → the boss gate opens → defeat the realm boss → claim the Shard → choose 1 of 3 relics → spend embers on lantern upgrades → next realm.

## What's inside

- **5 realms** with distinct palettes, decor, enemy mixes, twists and bosses: Ashen Moor (Chapel Warden), Glasswood (Prism Stag), Sunken Choir (Choir Mother), Ember Peaks (Cinder Tyrant), The Hollow (Hollow King).
- **Light puzzles:** braziers that only ignite under a sustained beam; shadow pools that drain HP while your beam is off; darkness you cannot see — or survive — without light.
- **Progression:** 5 lantern upgrade tracks × 5 ranks (range, oil, damage, speed, regen), **12 passive relics**, embers as currency.
- **3 difficulties** (Ember / Kindled / Ashen) + **Endless mode** after victory, with realm cycling and scaling.
- **Almanac / bestiary** (10 entries with lore + weaknesses), **10 feats** that pay embers, **run history** and **autosave** (continue a run after reload).
- **Procedural music:** a different scale per realm, generated live; full HUD with exact HP/oil/embers/score/shard numbers, boss bars, toasts and realm intros.

## Structure

- `game/index.html` + `game/src/` — 22 original ES modules: `config`, `random`, `audio`, `input`, `save`, `relics`, `realms`, `world`, `entities`, `combat`, `puzzle`, `boss`, `upgrades`, `bestiary`, `feats`, `particles`, `render`, `hud`, `screens`, `shots`, `state`, `main`.
- `main.ts` — Node 22 entry program; copies `game/` + `screenshots/` to `/output` and writes `dossier.json` via `vendor/makefun-game.ts` (kit copy, unchanged).
- `screenshots/` — 4 real renders of the game's own code (title, gameplay, workshop, win).

---

<sub>Entered on [make.fun](https://make.fun/?ref=59gqp20q&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
