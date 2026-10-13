# Hackulator website

Website, build configurator, private order tracking and owner control room for **Hackulator**, an independent prototype project that puts a custom board and colour display inside an ordinary Casio scientific calculator.

> **Status: working locally, not deployed.** No payments are taken. The site sends two kinds of email, both only once email is set up (`RESEND_API_KEY`): a copy of each new order request to the owner, and the weekly mailing-list email, which goes out only when the owner presses Send. Nobody gets an automatic email for signing up, joining the waitlist or ordering. Hackulator itself is still in development, and nothing on the site presents it as a finished product.

---

## What's included

1. **Interactive virtual Hackulator** (Games section). A real calculator front (cut from the supplied ad) with clickable keys and keyboard support. It starts as a working calculator, using a proper parser rather than `eval`. The public demo sequence **HOME 2 0 4 8 OK** (shown under “Discover what's inside”) opens the launcher with playable **Snake, 2048 and Tetris**, all original code. Pause, restart, menu and back-to-calculator all work. It pauses when scrolled away or when the tab is hidden, and there's no sound.
   - **Game demos:** READY/GO intro, particles, floating points, light screen shake, and best scores kept in this browser only.
     - Snake glides smoothly, wraps through walls, speeds up as you eat and has timed golden apples worth 3.
     - In 2048, tiles slide, merges pop and new tiles grow in.
     - Tetris has fair 7-piece bags, a ghost piece, hard drop (= / EXE), a short lock delay, a 3-piece next queue, line-clear flashes and level-ups.
     - On phones, swipe or tap the screen, and hold the arrow buttons to repeat.
   - Every screen preview carries a clear yellow **“Simple mockup”** tag and notice: the real Hackulator screen will look much nicer than the web mockup.
2. **Live Build Yours preview.** FRONT / COVER / SCREEN views. Front shows your games on the launcher. Cover shows the name and icon in your colours inside the printable area. Screen shows your Custom UI: accent, light/dark, welcome text, tiles/list layout and font, all part of the one £5 option. Anyone can use it to try builds and see the costs. They can also save on this device, download a summary, share a link (option IDs only, never the cover name or welcome text) and ask a question. **Order requests need a waitlist ID** (see below).
3. **Follow Your Build.** Private tracking pages at `/track/<secret token>` showing:
   - stage
   - updates
   - recorded milestones
   - photos
   - payments
   - an estimate, only if you set one

   Internal notes, emails and other customers' data never appear. Order numbers alone give no access.
4. **Waitlist** (homepage section 05, plus a chip in the hero).
   - Shows live "X of N spots left" with a spot grid; there are 10 spots by default.
   - People join with their name, email, an optional dream build and a consent tick.
   - Joining is free with no obligation to buy; it only reserves a place in the manufacturing queue.
   - Each person gets a **waitlist ID** (like `HK-7KQ2-MX4P`) when they join. It's shown once with a Copy button and remembered in that browser, and it's needed to send an order request.
     - The server rejects orders with a missing, wrong or withdrawn ID. Lower case and missing dashes are accepted.
     - Joining again with the same email never reveals the ID. The person is told to use their original ID or email you.
   - **Check my spot** (`/my-spot`): type a waitlist ID to see your first name, queue number, status and your own order requests. It never shows the email or notes, the ID is filled in from this browser, and lookups are rate-limited.
   - An optional, unticked box on the form also signs people up for the weekly email.
5. **The Weekly Drop mailing list.** A lime sign-up section near the bottom of the homepage takes an email, an optional first name and a required consent tick.
   - Every email has a one-click unsubscribe link (and the `List-Unsubscribe` header mail apps use). Unsubscribed people are never emailed.
   - Nothing is emailed automatically. When the list is full or closed, the form becomes an email link.
6. **Owner control room** at `/admin`. Type the owner code on the calculator to open it; every action is checked on the server:
   - dashboard
   - orders and the tracking editor
   - enquiries
   - catalogue
   - **waitlist**: change the number of spots, open or close it, add, edit, reorder, withdraw or remove people, and email everyone holding a spot
     - See each person's waitlist ID and issue a **New ID**, which stops the old one working (send the new one to them yourself).
     - Order requests in **Enquiries** show the waitlist ID and name they were sent with.
   - **mailing list**: a drag-and-drop **email builder** for The Weekly Drop, with a live desktop/phone preview of exactly what people get:
     - **⚡ Quick Drop** (opens first): pick a vibe (theme plus Hype, Update or Spotlight style), type a headline and up to 4 "what's new" items with optional photos, then press **Build my email**. The preview updates live as you type, and the subject and preview text are written for you.
     - **edit on the email itself**: click a headline, title or banner text in the preview and type; Enter saves, Esc cancels
     - **drop a photo** onto any picture in the preview (or onto a Quick Drop photo box) to upload and swap it in
     - **12 blocks**: Hero, Picture, Feature (picture beside text), Cards (2 or 3 in a row), Big numbers, Spots left (live waitlist counter), Banner (huge text), Text, Quote, Button, Call to action and Divider
     - **6 themes**: Midnight Lime, Arcade, Sunset, Ocean, Paper and Lime Pop
     - **6 templates**: Introducing the Hackulator, Launch promo, Game spotlight, Big announcement, Spots almost gone and Weekly update
     - click anything in the preview to edit it; drag, duplicate or delete blocks; undo/redo; autosaves as a draft
     - ready-made pictures (product shots, the concept film with a play button, Snake/2048/Tetris art, cover colours) or **upload your own** (JPEG/PNG/GIF up to 3 MB, publicly viewable so mail apps can load them)
     - **bold**, links, bullets and `{name}` in text; quick links to the waitlist, Build Yours, the demo and more
     - **Send a test to me**, then **Send to N subscribers**; past issues you can reuse, a "due!" reminder after 7 days, and the subscriber list
   - **site settings**: where order request emails go (with a **Send a test email** button), the announcement bar, the hero status pill, the stage, base price, availability and fulfilment text on the status card, and switching online order requests on or off
   - devices and service records
   - software releases
   - build sheets
   - data backup

The game and pack catalogue lives in the database and drives the configurator, previews, pricing, summaries and server-side order pricing. Accepted orders keep a snapshot of their configuration and prices.

## Run it locally

Needs Node.js 20.9+ (tested on 22) and npm.

```bash
npm install
npm run dev   # http://localhost:3000  ·  type 07232015 on the calculator to open the control room
```

Without `DATABASE_URL`, development uses a **local demo database** (embedded Postgres in `./.data/`, this computer only). The control room shows a yellow “Local demo mode” banner.

Other commands:

```bash
npm run build && npm run start   # production build / serve
npm run lint                     # ESLint
npm run typecheck                # TypeScript
npm test                         # all automated tests
npm run db:schema                # writes db/schema.sql (the app also applies it automatically)
```

## Going live (needs your approval first; nothing has been deployed)

The site needs a Postgres database for enquiries, tracking and the control room. The recommended option is a free **Neon** database through Vercel:

1. In Vercel, open your project → **Storage** → **Create Database** → **Neon (Postgres)**, and connect it to the project. Vercel adds `DATABASE_URL` for you. Any Postgres 14+ connection string works too: put it in **Settings → Environment Variables** as `DATABASE_URL`.
2. Deploy. Tables are created automatically on first request (or run `db/schema.sql` yourself).
3. Type **07232015** on the calculator on the homepage. It signs you straight into the control room.

If `DATABASE_URL` is missing in production, the public site still works. Online requests then say they aren't switched on (the email link remains), and `/admin` explains that no database is connected. Nothing falls back to browser storage or pretends to work.

**Missing setup values:** just `DATABASE_URL`. See `.env.example`.

### Order request emails (optional)

Every new order request is saved in **Enquiries** and also emailed to you. Questions aren't emailed.

1. Sign up free at [resend.com](https://resend.com) and create an API key (**API Keys → Create**).
2. In Vercel → **Settings → Environment Variables**, add `RESEND_API_KEY` with that key, then redeploy.
3. In the control room → **Site settings → Order request emails**, enter your email and press **Send a test email**.

Until you add your own domain in Resend, it can only send to the address you signed up to Resend with, so use that one. The weekly email also needs that domain: in Resend, add and verify your domain (e.g. dailyos.uk), then set `EMAIL_FROM` in Vercel (e.g. `Hackulator <drop@dailyos.uk>`). Until then, test emails to yourself work but **Send to subscribers** stays switched off. Resend's free plan allows 100 emails a day and 3,000 a month. The email includes the customer's name, email, waitlist ID, note and full build. Reply to it to answer them directly. If sending fails, the order is still saved and the failure appears in **Recent changes**.

## Owner sign-in (calculator code)

There are no accounts or passwords. Typing **0 7 2 3 2 0 1 5** on the virtual calculator signs you into the control room for 7 days (**Sign out** ends it).

The code is checked on the server. Wrong guesses are limited to 8 per address and 100 site-wide every 15 minutes.

**This was a deliberate choice by the owner.** The code is written in the site's code (`src/lib/hackos/os.ts`) and in this README, so it is **not secret**: anyone who reads them can open the control room and see waitlist and order details. To make it stronger, change `ADMIN_SHORTCUT_SEQUENCE` in `src/lib/hackos/os.ts` to a longer number and redeploy.

The owner code is separate from the public demo sequence (HOME 2 0 4 8 OK) and from any customer's device PIN.

## How to update a customer's tracking (plain English)

1. Go to `/admin` and sign in.
2. Open **Orders** and tap the order (or accept a request from **Enquiries** with **Accept as order**).
3. Use the **Update tracking** card:
   1. **Stage**: pick the new stage from the list.
   2. **Money received now**: type what you actually received (e.g. `5.00`) and how. A new build can't move to Building until at least £5 has been received. The deposit counts towards the total.
   3. Tick **calculator received** when the customer's calculator arrives.
   4. **Update for the customer**: what they'll read.
   5. **Private note**: only you ever see this.
   6. **Progress photos**: in the card below; upload or remove.
   7. **Estimated ready date**: set it or press Clear. It's always shown as an estimate.
   8. Check **“The customer will see”** (or open **Preview: what the customer sees**).
   9. Press **Save update**. The customer's page shows it immediately; no code or redeploy needed.
4. To send the link: **Private tracking link → Copy link**, then paste it to the customer yourself (nothing is emailed). **New link** replaces it; **Turn off** disables it.
5. Wrong stage? Pick the right one and save. The history keeps both, and **Hide from customer** removes a mistaken entry from their page (it stays in your audit log).

Delivered orders drop out of the active queue. **Archive** them when you're done; they stay under **All history**. Unpaid balances appear under **Balance owed**. Orders with payments can't be deleted, and test records can be deleted only by typing `DELETE ORD-0001`.

## Where things live

| What | Where |
| --- | --- |
| Prices for passes, cover and Custom UI; colour, icon and UI options; default catalogue | `src/config/offer.ts` |
| Contact email and other business details | `src/config/site.ts` |
| Pricing engine, share links, input sanitising | `src/lib/pricing.ts` |
| Calculator parser, games, launcher (shared screen software) | `src/lib/hackos/` |
| Real calculator photo, key map, shared screen renderer | `public/media/hackulator-front.webp`, `src/components/device/` |
| Homepage scroll story (reveals, ticker, word-by-word statement, progress bar) | `src/components/scroll/ScrollFx.tsx`, end of `src/app/globals.css` |
| Configurator and live preview | `src/components/Configurator.tsx`, `src/components/build/` |
| Database, auth, orders, catalogue, devices, order emails (`notify.ts`) | `src/lib/server/` |
| API routes | `src/app/api/` (public: `enquiries`, `track/…/photos`; everything else under `admin/`) |
| Control room pages | `src/app/admin/` |
| Customer tracking page | `src/app/track/[token]/` |
| Schema / env template | `db/schema.sql`, `.env.example` |

## Privacy and security notes

- Every admin page and API checks the session **on the server**. Writes also require a same-origin request (CSRF protection), and sessions use an httpOnly, SameSite=strict cookie.
- Tracking tokens are 192-bit random values; they can be regenerated or turned off. `/admin`, `/track` and `/api` are excluded from search (`robots.txt`, `noindex` headers) and served with `no-store`.
- Photos are stored privately in the database (JPEG/PNG/WebP, checked by file content, up to 4 MB). They're only served through the admin session or that order's valid tracking token.
- Prices are recalculated on the server from the live catalogue for every request and order. Whatever the browser sends is ignored.
- Customer-visible updates and private notes are stored separately; the tracking page reads only the visible ones.
- Enquiries collect only a name, an email and an optional message. Share links carry option IDs only.
- **Backup:** Control room → Home → **Download backup** (JSON of all records; excludes sessions and photo files).
- Website admin access is not part of any customer software pass. No business data or credentials are ever sent to customer devices.
- **Offline calculator boundary:** device records are maintained by hand; there is no live sync with the calculator's own Order Manager. A future import/export would build on the backup format (`exportAll` in `src/lib/server/devices.ts`).

## Tests

`npm test` runs **103 tests** in 8 files, all passing:

- **Pricing (25):** every required example, plus no double charges, tier switching keeping cover choices, the Arcade Pack's third game staying “to be announced”, gold surcharges, share links never carrying personal text, and sanitising untrusted input.
- **Calculator, games and OS (40):** 17 parser + 14 game + 9 OS tests covering:
  - the arithmetic parser with no `eval`, and the demo unlock
  - Snake: wrapping through walls, ending only on self-collision, speeding up, golden apples
  - 2048: merging and tracked slides for the animations
  - Tetris: line clears, the 7-piece bag, hard drop and lock delay
  - the OS: READY/GO, = as hard drop only in Tetris, swipe/tap, best scores, pause / restart / return, and the 07232015 control-room shortcut
- **Backend on a real in-memory Postgres (18):**
  - owner-code sign-in, rejecting wrong codes and rate-limiting guesses
  - server-side pricing of enquiries
  - orders need a valid, active waitlist ID (missing, wrong, replaced and withdrawn IDs are refused); questions don't
  - the £5 deposit rule (including deposit and stage in one save), with covered software jobs exempt
  - internal notes never shown; revoked and invalid links show nothing; the order number alone gives no access
  - delivered orders leave the queue but stay in history; paid orders can't be deleted
  - photos checked by content and isolated per order
  - catalogue edits propagate without changing accepted orders
  - covered service work can't be charged
  - the export contains no secrets
  - waitlist: each join gets an ID (never re-shown for an existing email), fills in order, refuses when full or closed, no duplicate emails, reordering, withdrawing frees a spot, owner edits
  - site settings are validated, trimmed and fall back to defaults
  - "Check my spot" shows only the holder's own spot and requests, never the email or notes
  - mailing list: consent required, no duplicates, one-click unsubscribe, re-subscribing, batches with each person's own unsubscribe link and name, unsubscribed people skipped, failed batches counted, tokens left out of backups, and email picture uploads (email-safe formats only, random ids, size limit)
  - order requests are emailed to the owner with the waitlist ID and build; a missing key or a failed send is logged and never loses the request; questions aren't emailed
- **Email builder (8):** escaping and safe links only, bullets and paragraphs, every template in every theme (personalised, numbered, always with an unsubscribe link), every block type, editor-only preview tags (blocks, in-place text, picture drop targets), the honest introduction template, Quick Drop in all three styles, and cleaning untrusted content (including upgrading old drafts).
- **Components (12):** 10 configurator tests covering flows, honest “not submitted” messaging, real submission with the saved waitlist ID and questions without one, plus 2 film stage tests.

Also run against the production build in Chromium: an end-to-end walkthrough of all four features on desktop and phone sizes, plus unauthenticated-access checks (401/307/403), privacy headers, keyboard and touch use, reduced motion, and no horizontal scrolling. The results are in the commit/PR notes.

## Still needed from you

1. **A database** (`DATABASE_URL`) before going live.
2. **Base price**, stock/availability, business name and fulfilment terms (`src/config/site.ts`); the site shows “to be confirmed” until then.
3. **Official dark logo** (a provisional derivative is in use).
4. **Arcade Pack third game** (still “to be announced”).
5. **Rights to names and music:** Tetris, Flappy Bird, Block Blast and Space Invaders are other companies' trademarks, and the ad's soundtrack needs a licence for web use. Confirm both before launch.
6. **A higher-resolution front photo** would make the virtual calculator sharper; the current one is cut from the ad.
