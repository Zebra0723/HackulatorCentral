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

### Concept film

`public/media/hackulator-from-within.mp4` is the supplied ad (*Hackulator From Within*: 1080×1920, 22 seconds, H.264 with AAC audio, about 19 MB), served exactly as provided with no re-encoding. The poster (`public/media/hackulator-concept-poster.{webp,jpg}`) is a frame taken from it at 18 seconds. To replace the film, swap the file and update `conceptFilm` in `src/config/site.ts`; the stage takes its aspect ratio from the `width` and `height` there.

The player keeps the film's own aspect ratio (`object-fit: contain`) and shows the poster first. The video element only exists once the stage is at least half on screen. It autoplays muted and inline only when reduced motion and data saver are both off; otherwise it waits for Play. It pauses when scrolled away and stays paused if the visitor paused it. Sound stays off until the visitor turns it on. If the file fails to load, the poster is shown with a short notice.

### Orders and enquiries

`contact.email` in `src/config/site.ts` is set to **hackulator@dailyos.uk**. The build summary has two buttons:

- **Send order by email** opens the visitor's email app with an order request (subject "Hackulator order request") containing the full build summary. It's disabled until the build is complete (for example, an icon has been chosen).
- **Enquire about this build** does the same with the subject "Hackulator build enquiry".

Nothing is sent from the site itself and there's no backend. The message only goes when the visitor presses send in their own email app. Because the base price isn't set, the order email asks Hackulator to confirm the total and availability before any payment.

## Pricing tests

`npm test` runs 33 tests: 19 for pricing and transitions, 4 for the Snake logic, and 10 component tests for the configurator and film stage. Last run: **33 passed, 0 failed**.

Required cases (`src/lib/pricing.test.ts`):

| Case | Expected | Result |
| --- | --- | --- |
| Base only | £0.00 extras, base price "to be confirmed" | ✅ |
| Classics only | £5.00 | ✅ |
| Name + icon | £7.00, no bundle discount | ✅ |
| The Gamer + Custom UI + name + icon | £22.00 | ✅ |
| Name or icon in gold | +£0.50 each | ✅ |
| The Hacker + name + icon | £27.00, no game/UI duplicates | ✅ |
| Game already in a selected pack | not charged twice | ✅ |
| Switching tiers | cover extras kept, overlapping software removed | ✅ |

Extra coverage includes: game IDs are deduplicated; the Arcade Pack can't be selected; base games can't be added, removed or charged; The Hacker (£20) ignores a separate Custom UI charge, while The Gamer (£10) doesn't include Custom UI; colours and Custom UI choices survive tier switches and appear in the summary; the order email goes to hackulator@dailyos.uk; the all-games suggestion appears at or above £10 of separate games and never switches the build automatically; invalid cover names are flagged. Component tests drive the real configurator UI through the same transitions.

## Verification performed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: all clean.
- Production build checked in headless Chromium at 1440, 768 and 390 px wide. No horizontal page scroll and no console errors.
- Keyboard: the skip link is the first tab stop. Radio groups work with arrow keys. The mobile menu and enquiry dialogs move focus into the dialog, close with Escape and return focus to the button that opened them.
- Reduced motion: no autoplay, and no video is downloaded until Play is pressed.
- The film player was exercised with a temporary sample clip (removed afterwards): poster first, muted inline autoplay, offscreen pause, a manual pause staying paused, sound toggle, and fallback to the poster on a failed load.

## Unresolved content inputs

These are deliberately left unset or provisional. Nothing has been invented in their place.

1. **Official dark logo adaptation**: not supplied. `public/brand/hackulator-logo-dark.*` is a **provisional** derivative, made by recolouring the near-black outlines and wordmark to warm white; colours and shapes are otherwise unchanged. Replace it with the official file.
2. **Base Hackulator price**: unknown. The site shows "Base price to be confirmed" and only ever an extras subtotal; order emails ask Hackulator to confirm the total.
3. **Business name, stock/availability and fulfilment terms**: unset in `src/config/site.ts`.
4. **Arcade Pack third title**: shown as "Third game to be announced". The pack can't be chosen.
5. **Single-game availability**: the five named extra titles can each be chosen at £2.50. Confirm this is intended before launch.
6. **Install/update/reinstall terms for individually bought games**: shown as "Terms to be confirmed".
7. **Cover name length and marking method**: the site uses a provisional 14-character limit and says the marking method is still being worked out.
8. **Film soundtrack**: the ad's audio is published as supplied. Confirm the music is licensed for use on the website.

## Deployment

Not deployed. The output is fully static, so it suits Vercel; importing the repository there needs no extra configuration. Do not deploy, or connect any form or email backend, without the project owner's explicit approval.

## Legal and content notes

- Independent project. Not affiliated with, endorsed or sponsored by Casio. Casio and fx-83GT appear only to describe compatibility.
- Games marked "-style" are described as original works inspired by a genre. Block Blast and Space Invaders are listed by their real names at the owner's request; the footer notes they are trademarks of their respective owners. Confirm you have the rights to use those names (and to ship those games) before selling them.
- The concept film shows the original calculator and its branding as the base for the modification.
- The site collects no personal data. Order and enquiry emails are written and sent by the visitor from their own email app; the optional cover name only leaves their device if they send it.
