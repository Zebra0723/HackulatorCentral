# Hackulator website

Landing page and build configurator for **Hackulator**, an independent prototype project that puts a custom board and colour display inside a Casio fx-83GT CW+ 2nd Edition body.

> **Status: design-complete local build, not deployed.** The site takes no orders or payments and sends no data anywhere. Hackulator itself is a prototype in development. Nothing on the site presents it as a finished product.

## Stack

- Next.js 16 (App Router, fully static output) · React 19 · TypeScript
- Plain CSS (`src/app/globals.css`) and a system font stack, with no bundled proprietary fonts
- Vitest + Testing Library for unit and component tests
- No WebGL and no third-party runtime scripts

## Commands

Requires Node.js 20.9+ (tested on Node 22) and npm.

```bash
npm install          # install dependencies
npm run dev          # local dev server on http://localhost:3000
npm run build        # production build
npm run start        # serve the production build on http://localhost:3000
npm run lint         # ESLint
npm run typecheck    # TypeScript, no emit
npm test             # run all tests once
npm run test:watch   # tests in watch mode
```

## Where things live

| What | File |
| --- | --- |
| Prices, games, packs, passes, cover icons (single source of truth, integer pence) | `src/config/offer.ts` |
| Business/contact details, base price, availability, film path (unset = honest "not yet" state) | `src/config/site.ts` |
| Pricing engine, configurator state transitions, build summary text | `src/lib/pricing.ts` |
| Page sections | `src/app/page.tsx` |
| Configurator UI | `src/components/Configurator.tsx` |
| Concept film player | `src/components/FilmStage.tsx` |
| Snake web demo (logic / UI) | `src/lib/snake.ts`, `src/components/SnakeDemo.tsx` |
| Brand assets | `public/brand/`, `public/media/`, `src/app/icon.png` |
| Asset derivation script | `scripts/prepare-brand-assets.py` |

### Adding the concept film

1. Copy `hackulator_concept_ad.mp4` to `public/media/hackulator_concept_ad.mp4`. Use H.264 (or H.264 plus a VP9/AV1 version) with `+faststart`.
2. In `src/config/site.ts`, set `conceptFilm.src` to `"/media/hackulator_concept_ad.mp4"`.
3. Optional: replace `public/media/hackulator-concept-poster.{webp,jpg}` with a real 1080×1350 frame from the film.

The player keeps the 4:5 frame (`object-fit: contain`) and shows the poster first. The video element only exists once the stage is at least half on screen. It autoplays muted and inline only when reduced motion and data saver are both off; otherwise it waits for Play. It pauses when scrolled away and stays paused if the visitor paused it. Sound stays off until the visitor turns it on. If the file fails to load, the poster is shown with a short notice.

### Enabling enquiries

Set `contact.email` in `src/config/site.ts`. The enquiry dialog will then offer an "Open email" link with the build summary prefilled; nothing is sent until the visitor sends it from their own email app. With no email set, the dialog states plainly that no enquiry has been sent. There is no backend.

## Pricing tests

`npm test` runs 27 tests: 16 for pricing and transitions, 4 for the Snake logic, and 7 component tests for the configurator and film stage. Last run: **27 passed, 0 failed**.

Required cases (`src/lib/pricing.test.ts`):

| Case | Expected | Result |
| --- | --- | --- |
| Base only | £0.00 extras, base price "to be confirmed" | ✅ |
| Classics only | £5.00 | ✅ |
| Name + icon | £7.00, no bundle discount | ✅ |
| Games Forever + Custom UI + name + icon | £22.00 | ✅ |
| Software Forever + name + icon | £27.00, no game/UI duplicates | ✅ |
| Game already in a selected pack | not charged twice | ✅ |
| Switching tiers | cover extras kept, overlapping software removed | ✅ |

Extra coverage includes: game IDs are deduplicated; the Arcade Pack can't be selected; base games can't be added, removed or charged; the £20 pass ignores a separate Custom UI charge, while the £10 pass doesn't include Custom UI; the all-games suggestion appears at or above £10 of separate games and never switches the build automatically; invalid cover names are flagged. Component tests drive the real configurator UI through the same transitions.

## Verification performed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: all clean.
- Production build checked in headless Chromium at 1440, 768 and 390 px wide. No horizontal page scroll and no console errors.
- Keyboard: the skip link is the first tab stop. Radio groups work with arrow keys. The mobile menu and enquiry dialogs move focus into the dialog, close with Escape and return focus to the button that opened them.
- Reduced motion: no autoplay, and no video is downloaded until Play is pressed.
- The film player was exercised with a temporary sample clip (removed afterwards): poster first, muted inline autoplay, offscreen pause, a manual pause staying paused, sound toggle, and fallback to the poster on a failed load.

## Unresolved content inputs

These are deliberately left unset or provisional. Nothing has been invented in their place.

1. **Concept film** `hackulator_concept_ad.mp4`: not supplied yet. The stage shows the poster and "Concept film coming soon".
2. **Official dark logo adaptation**: not supplied. `public/brand/hackulator-logo-dark.*` is a **provisional** derivative, made by recolouring the near-black outlines and wordmark to warm white; colours and shapes are otherwise unchanged. Replace it with the official file.
3. **Film poster**: provisional, the dark logo on black. Replace it with a real film frame.
4. **Base Hackulator price**: unknown. The site shows "Base price to be confirmed" and only ever an extras subtotal.
5. **Business name, contact email, stock/availability and fulfilment terms**: all unset in `src/config/site.ts`.
6. **Arcade Pack third title**: shown as "Third game to be announced". The pack can't be selected.
7. **Single-game availability**: the five named extra titles (including the two confirmed Arcade titles) can be chosen individually at £2.50. Confirm this is intended before launch.
8. **Install/update/reinstall terms for individually bought games**: shown as "Terms to be confirmed".
9. **Cover name length and marking method**: the site uses a provisional 14-character limit and says the marking method is still being worked out. Custom artwork uploads are shown as unavailable.

## Deployment

Not deployed. The output is fully static, so it suits Vercel; importing the repository there needs no extra configuration. Do not deploy, or connect any form or email backend, without the project owner's explicit approval.

## Legal and content notes

- Independent project. Not affiliated with, endorsed or sponsored by Casio. Casio and fx-83GT appear only to describe compatibility.
- Games marked "-style" are described as original works inspired by a genre. No third-party game artwork or code is used.
- The site collects no personal data. The optional cover name is never transmitted, and the hint suggests a nickname works just as well.
