# Grappling Dex app

The iOS and Android version of the Grappling Dex, built with Expo (SDK 58), Expo Router and TypeScript. Log what you train after class; each move climbs from Seen to Drilled, Hit and Mastered.

## Try it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. In this folder, run:

   ```bash
   npm install
   npx expo start
   ```

3. Scan the QR code with your phone's camera (iOS) or with Expo Go (Android). Your phone and computer need to be on the same Wi-Fi.

## Commands

| Command | What it does |
| --- | --- |
| `npm test` | Runs the stage-rule tests (`src/lib/progress.test.ts`) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Expo's ESLint config |
| `npx expo start --web` | Browser preview (progress saved in browser storage) |
| `npm run sprites` | Imports position images from `../sprites/originals/` (made with `../sprites/PROMPTS.md`) into the app and web dex |
| `npm run catalog` | Regenerates `src/data/catalog.json` from the web dex |
| `npm run privacy-page` | Rebuilds `../docs/privacy.html` from `src/data/privacy.ts` |
| `npx eas-cli@latest build --profile production` | Store builds (profiles in `eas.json`) |

## Layout

| Path | What's there |
| --- | --- |
| `src/app/` | Screens (Expo Router): Dex and Progress tabs, `entry/[id]`, the `log` sheet |
| `src/data/catalog.json` | 39 positions, 119 techniques, 36 combos. Generated from the web dex with `npm run catalog`; edit the lists in `../grappling-dex.html`, not this file |
| `src/data/catalog.ts` | Catalog types and helpers: related moves, combos, scorecards, gaps |
| `src/lib/progress.ts` | Stage rules, pure TypeScript, shared with the tests |
| `src/lib/db.ts` | On-device SQLite storage (phones); `db.web.ts` is the browser-preview version |
| `src/lib/store.tsx` | React context that loads progress and handles logging |
| `src/lib/backup.ts` | Back up to a JSON file through the share sheet, and restore from a picked file |
| `assets/` | App icon, Android icon layers, splash and favicon |
| `../docs/` | Hosted privacy policy and the store listing copy |

## Not built yet

The skill map, account sign-in and sync (planned: Supabase), the post-training reminder, combo sets and "Next up".

The app now uses `expo-sharing` and `expo-document-picker` for backups. Both are in Expo Go, so Expo Go still works for testing.
