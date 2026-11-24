# Store listing: Grappling Dex 1.0

Copy for App Store Connect and the Google Play Console. The character limits are the stores' own.

## Names and links

| Field | Value |
| --- | --- |
| App name (30) | Grappling Dex |
| iOS subtitle (30) | BJJ training log & move dex |
| Play short description (80) | Log your BJJ training and level up 100+ moves from Seen to Mastered. |
| Bundle ID / package | `com.chnk137.grappledex` |
| Category | Sports (Apple: Sports, with Health & Fitness second) |
| Privacy policy URL | https://chnk137.github.io/grappling_dex/privacy.html (GitHub Pages, built from `docs/privacy.html`). Backup copy: https://gist.github.com/chnk137/374df88cb4aa57b0351366f54c96ed66 |
| Support URL | https://github.com/chnk137/grappling_dex/issues |
| Price | Free, no in-app purchases |

## Description

Grappling Dex turns your Brazilian jiu-jitsu training into a collection you fill in, one move at a time.

After class, log what you worked on in a few taps: what you were taught, what you drilled and what you landed in live rolling. Every move climbs through four stages, from Seen to Drilled, then Hit and finally Mastered, so you can see at a glance which techniques actually work for you under resistance.

• 119 techniques across 39 positions, including newer guards like shin-to-shin, K-guard and waiter, with leg locks broken out by entry
• Every move links to the positions it works from, the moves it chains into, and related techniques
• Log where each move came from, so a triangle from closed guard counts for closed guard, not every position it can start from
• A scorecard for each position: what you can attack, pass, escape and sweep from there
• "Gaps in your game" points to positions where you spend time but can't yet do anything
• Fast logging made for right after training, with your recent moves one tap away
• Works with no signal. Your progress stays on your phone, with backups you control
• No account, no ads, no tracking

## Keywords (iOS, 100 characters)

```
bjj,jiu jitsu,grappling,jiujitsu,training log,martial arts,submission,guard,no gi,wrestling,journal
```

## What's new (1.0)

First release.

## Age rating

No objectionable content in any category. Apple: 4+. Google (IARC questionnaire): Everyone.

## Privacy answers

- **Apple App Privacy:** "Data Not Collected".
- **Google Data safety:** no data collected and no data shared. Data is not encrypted in transit because none is sent. Users can delete their data by removing sessions or deleting the app.
- **Encryption export:** the app uses no non-exempt encryption (`ITSAppUsesNonExemptEncryption` is set to false in `app.json`).

## Screenshots to take

Required sizes: iPhone 6.9" (1320 × 2868) and Android phone (1080 × 1920 or larger), at least 2 and up to 8 each. Log a few real sessions first so the screens aren't empty.

1. The Dex list with stages filled in. Caption: "Every move, from Seen to Mastered"
2. A move entry (for example Triangle) with its stage, next step and positions. Caption: "Know exactly what's next"
3. The log sheet with three moves picked. Caption: "Log class in 20 seconds"
4. A position scorecard (for example Closed guard). Caption: "See your game from every position"
5. The Progress tab with gaps. Caption: "Find the holes in your game"

## Before submitting

- [ ] Apple Developer Program and Google Play Console accounts approved
- [x] Privacy policy live on GitHub Pages, and the repo's issues page is public for support
- [ ] After any change to `app/src/data/privacy.ts`, run `npm run privacy-page` and push, so the hosted copy matches the app
- [ ] Tested on a real iPhone and Android phone, including Back up and Restore
- [ ] Screenshots taken
- [ ] Google closed test: 12 testers opted in for 14 days
