# Fortuna — Dream & Lucky Number Website

Website version: LINE Login accounts + a one-off "Draw Pass" purchase via
Omise PromptPay, built on the same dream-matching engine as the LINE bot.

## 🚀 Runs live today, without LINE or Omise

You don't need LINE Login or Omise credentials to deploy this and have a
real, working website right now:

- Every visitor gets an anonymous **guest identity** automatically (a signed
  cookie, no login required) — dream reading, personal numbers, and all
  five modules (plate, phone, zodiac, name, amulet) work immediately.
- The "Sign in with LINE" button automatically detects that no real LINE
  Login channel is configured and shows **"Sign in with LINE (soon)"**
  instead of a broken login flow — clicking it shows a friendly notice
  rather than erroring out against LINE's servers with placeholder
  credentials.
- The Draw Pass unlock button detects that Omise isn't configured and shows
  **"launching soon"** instead of attempting a real charge.
- Everything is config-driven: the moment you add real values to `.env`
  (`OMISE_SECRET_KEY`, etc.) and `config/site.json` (`lineLogin.channelId`)
  and redeploy, real LINE sign-in and real payments switch on automatically
  — **no code changes needed** to go from "soft launch" to "fully live."

### Deploying right now (no LINE/Omise needed yet)

1. `npm install`
2. Push this folder to a GitHub repo
3. Create a free account on **Railway** or **Render**, connect the repo
4. Set the one required env var: `SESSION_SECRET` (any long random string —
   this signs the guest/login cookies, so don't skip it even in soft-launch
   mode)
5. Deploy — you'll get a real `https://your-app.up.railway.app`-style URL
   you can share and use today

Leave `LINE_LOGIN_CHANNEL_SECRET`, `OMISE_PUBLIC_KEY`, and `OMISE_SECRET_KEY`
unset or as their placeholder values for now — the site runs fully in
guest/soft-launch mode until you add real ones later.

**One real limitation to know about**: if someone uses the site as a guest,
then later signs in with real LINE Login once that's live, their guest
identity (personal number history, any unlocked Draw Pass) does **not**
carry over to their LINE identity — they start fresh. Worth adding a
migration step before this matters at real scale (flagged in code comments
at `server.js`'s `/auth/line/callback` route).

## ⚠️ Two things to verify before launch (untested against live APIs)

I built the LINE Login OAuth flow (`lib/lineAuth.js`) and the Omise PromptPay
integration (`lib/omiseClient.js`) against each provider's documented API
shape, but **neither has been exercised against real credentials** — this
sandbox has no network access to actually call LINE's or Omise's live APIs.
Both are marked with comments at the exact spots most likely to need
adjustment:

- `lib/lineAuth.js` — the OAuth token exchange and profile fetch. Field
  names should match current LINE Login docs, but verify once you have a
  real Login channel.
- `lib/omiseClient.js` — PromptPay charge creation, and specifically the
  path to the QR code image (`charge.source.scannable_code.image.download_uri`)
  — this is the part most likely to have shifted; check it against Omise's
  dashboard/docs with test keys before relying on it.

Also inherited from the LINE bot: **`config/dream-dictionary.json` still has
placeholder `EXAMPLE-##` lucky numbers** — see that project's README for why,
same issue applies here.

## How it fits together

- `lib/dreamMatcher.js`, `lib/personalNumber.js`, `lib/drawDates.js` — same
  engine as the LINE bot, copied in unchanged.
- `lib/lineAuth.js` — LINE Login OAuth (sign-in, not the Messaging API).
- `lib/omiseClient.js` — creates a PromptPay charge for the one-off Draw
  Pass, and checks a charge's status.
- `lib/store.js` — local JSON-file storage: users, dream submissions, and
  entitlements (who has paid to unlock which draw cycle).
- `server.js` — routes for auth, the dream API (paywalled), purchase, and
  the Omise webhook.
- `public/` — the frontend: dream input, result card, paywall + QR code
  purchase flow, matching the visual mockup's design tokens.

## Setup

1. **LINE Login channel**: in the LINE Developers console, create a
   **LINE Login** channel (separate from the Messaging API channel the bot
   uses). Get the Channel ID and Channel Secret.
2. **Omise account**: sign up at omise.co with your ID card + bank passbook
   (individual accounts are supported). Grab your test API keys first
   (`pkey_test_...` / `skey_test_...`) from the dashboard.
3. Copy `.env.example` to `.env` and fill in:
   - `LINE_LOGIN_CHANNEL_SECRET`
   - `OMISE_PUBLIC_KEY`, `OMISE_SECRET_KEY`
   - `SESSION_SECRET` (any long random string)
4. In `config/site.json`, set `lineLogin.channelId` and update
   `lineLogin.redirectUri` to match your deployed domain
   (`https://your-domain.com/auth/line/callback`).
5. In the LINE Login channel settings, add that same callback URL to the
   list of allowed callback URLs.
6. In the Omise dashboard, set your webhook URL to
   `https://your-domain.com/webhook/omise`.
7. `npm install && npm start`

## The pricing model, and why it's built this way

- **Free**: dream matching + personal daily number, always available, no
  login required for the reading itself (login is asked for to save/unlock).
- **Draw Pass (one-off, ~29 THB)**: unlocks premium lucky numbers for the
  *current* draw cycle only — resets each 1st/16th. Paid via PromptPay QR,
  since that's the default payment habit for small purchases in Thailand,
  and it doesn't require a saved card.
- **Subscription**: intentionally not built in this version. True recurring
  billing needs card tokenization (PromptPay doesn't support consumer
  auto-debit the way subscriptions need), which is a smaller addressable
  slice of users. Add it later once the one-off flow proves people convert.

## Hardening added in this pass

- **XSS fix**: the plate/phone/name mini-panels echo user input back into
  the page. `public/app.js` now escapes that text (`escapeHtml`) before
  inserting it via `innerHTML` — without this, someone typing HTML/script
  into those fields could have it execute in other users' browsers reading
  shared results. Worth double-checking any *new* spot that reflects
  user text back into the page follows the same pattern.
- **Rate limiting** (`lib/rateLimiter.js`): a simple in-memory per-IP
  limiter (20 requests/minute) applied to every POST endpoint, including
  the payment-creation route. Fine for a single server instance; swap for
  a shared store (Redis) if this ever runs load-balanced across multiple
  instances.
- **Input length caps**: dream text, plate, phone, and name inputs are all
  capped at 200 characters server-side.
- **`app.set('trust proxy', 1)`**: needed for the rate limiter to see real
  client IPs once deployed behind Railway/Render's reverse proxy, rather
  than rate-limiting everyone as if they were the proxy.

## Content expansion in this pass

- Zodiac readings are now per-animal (3 readings each, 12 animals) instead
  of one generic pool of 4 — still worth growing further before launch.
- Amulet matches now include both a summary and a practical tip.
- Moon phase (previously only in the demo) is now computed server-side
  (`lib/moonPhase.js`) and included in `/api/today`.

## The four newer modules

Added on top of the dream-reading module, all free (not gated behind the
Draw Pass, since they're algorithmic rather than curated-content-driven):

- **License plate / phone number scoring** (`lib/numerology.js`,
  `digitsToScores`) — deterministic scoring from the digits in the input.
  This is an illustrative scoring model built for this project, not sourced
  from a specific named numerology tradition — labeled as such in code
  comments. Same input always gives the same output.
- **Name numerology** (`nameToPowerNumber`) — uses the real, documented
  Pythagorean letter-to-number system for Latin letters. Falls back to
  char-code reduction for Thai script or other characters, which is a
  reasonable approximation but not a proper Thai-script numerology system —
  worth revisiting with a real method if Thai-name input becomes common.
- **Zodiac daily reading** and **Amulet match** — content lives in
  `config/numerology-content.json`. Ships with a handful of starter
  readings/matches; expand this file with more variety before launch so
  repeat users don't see the same few readings too often.

## What's intentionally NOT built yet

- Subscription/recurring billing (see above)
- Refund handling
- Rate limiting on any of the API routes (someone could spam them)
- Admin dashboard (data's all in `db.json` — inspect directly or query lowdb)
- A proper Thai-script numerology method for names (see above)
