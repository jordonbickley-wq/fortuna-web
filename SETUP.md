# Fortuna — one-time setup, then leave it running

This site is built to run unattended. Once the two values below are set,
nothing needs your attention: no results to publish, no payments to
approve, no orders to fulfil.

## The only two things you must fill in

Open `config/site.json` and set:

1. **`donation.promptPayNumber`** — your PromptPay phone number or ID.
   Also set `donation.promptPayName` (or leave `""` to hide it).

2. **`contact.lineUrl`** — your LINE link, e.g.
   `https://line.me/R/ti/p/@yourlineid`
   (LINE app → your profile → share → copy link)

Also make sure these two images exist in `public/`:
- `promptpay-qr.png` — your PromptPay QR
- `line-contact-qr.png` — your LINE add-friend QR

That's it. Push and forget.

## What runs itself

| Feature | How it stays current |
|---|---|
| Dream readings (117 symbols) | Static dictionary |
| ขูดหาเลข rub-to-reveal | Random each time |
| Daily tarot card | Recalculated per person per day |
| Tarot spreads | Random draw |
| ฤกษ์มงคล auspicious dates | Calculated from the calendar |
| Today's colour / moon phase | Calculated from the date |
| Draw countdown | Calculated from the 1st/16th |
| Plate / phone / name / zodiac / amulet | Calculated |
| Prayers | Static, traditional |
| Temples | Static, real Google Maps links |
| Trending symbols | Builds itself from real usage |
| Visit counter | Counts itself |
| Donations | Arrive in your bank; nothing to approve |

## What was deliberately removed

These would have quietly broken without you:

- **Lottery result checker.** Republishing prize numbers nobody keeps
  current is worse than not showing them. It now links to the official
  GLO site instead.
- **Dream journal auto-checking.** With no published results there is
  nothing to check against, so the journal is honestly presented as a
  personal record and tells people to check the official results.
- **Shop orders.** No order pipeline to babysit — the buttons open LINE
  so you can handle anything personally, or ignore it.

## Turning things back on

In `config/site.json`:
- `"unattendedMode": false` restores the built-in result checker,
  journal hit-tracking and shop ordering (all need manual upkeep, and
  `ADMIN_PASSWORD` set in Railway).
- `"donationMode": false` restores the paid unlock system.

Both systems are still in the code, just switched off.
