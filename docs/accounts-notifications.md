# Accounts, photos and service notifications

## Use the features

Open Profile → Create account. Enter a name, email and password of 15–128 characters. Sign in later using the same email/password. These are Bramsee accounts, separate from the previous ChatGPT sign-in. Email verification and forgotten-password recovery are not implemented in this beta; do not launch public registration until those flows and hosting limits have been addressed.

Signed-in users can add/change a profile photo. The browser centre-crops and re-encodes it as a 256px JPEG, removing embedded metadata. The server accepts only bounded JPEG/PNG uploads with valid image headers and dimensions no greater than 512px. Photos are stored in D1, not a public directory. The photo endpoint returns only the current account's image with private/no-store and nosniff headers. Uploading SVG is rejected. Larger-scale image storage can later move to an object store.

Named saved routes and favourite stops now use the account database. Guest routes stay local. Saved → Import routes saved as a guest explicitly copies device routes into the signed-in account. Route caches use account-specific keys, and writes include the intended account ID to reject requests queued across an account switch. Local storage remains a convenience cache; the database is the cross-device source. Old ChatGPT account data is not automatically assigned to a new email account.

## Notification behaviour

- The bell lights up when there are unread notices detected in the last 14 days.
- Opening the list marks each notice read once at least 35% of its card is visible. Unseen cards farther down the list remain unread.
- Guests keep read state only in React memory. Reloading resets it; it is never saved in guest local/session storage.
- Signed-in read receipts are saved in D1, separately for each account and notice revision. A failed receipt write displays a message and may leave the notice unread on a later visit.
- A notice's content/period fingerprint identifies its revision. Changed content creates a new unread notification; repeated observations do not reset read status.
- The list filters by detection time within 14 days. Older unchanged notices retain deduplication records while still observed, so they do not reappear as new merely because two weeks passed. Records no longer observed are pruned after 90 days.

Collection uses official GTFS-Realtime alerts. The browser checks once per minute; the shared collector limits upstream refreshes to once per minute per agency. The Worker also exports a scheduled collector with a five-minute cron configured in Vite's Cloudflare configuration. Verify that the chosen deployment platform actually supports and enables that scheduled event; some wrapper hosting services may only dispatch HTTP requests. Until the schedule is active, collection is opportunistic when people open the app. Monitor `notice_sources.success/status` after deployment. The APIs report disconnected/unavailable feeds instead of claiming all service is normal.

**History cannot be backfilled automatically:** these live feeds do not guarantee a complete fourteen-day publication archive. Bramsee stores changes it observes from monitoring start; the UI labels them “Detected”, not “Published”. Notices that appear and disappear between collection runs can still be missed. A guaranteed historical archive requires an additional authoritative source or provider agreement.

## Connect GO alerts securely

1. Register for the free [Metrolinx API](https://api.openmetrolinx.com/OpenDataAPI/Help) using its official registration page.
2. Run **Set GO Key.cmd** from the project folder. It prompts with hidden input and writes `GO_API_KEY` into the ignored local `.dev.vars`, preserving other keys.
3. Restart the local development server. Open Service updates and confirm GO Transit shows a successful check.
4. Separately set `GO_API_KEY` as a server secret on the eventual production host, then validate real GO alerts/trip IDs there. Local `.dev.vars` does not configure the production host. Do not paste keys into chat, commit them or prefix them with `NEXT_PUBLIC_`.

GO notices and live predictions remain disconnected until a valid key is supplied. Brampton collection works independently. Static scheduled GO journeys continue working.

## Database and hosting

The new schema is in `drizzle/0001_silent_vanisher.sql`. It adds accounts, hashed sessions, login throttle counters, service notices/read receipts/source state and saved routes. This migration was applied to the existing local `.wrangler/state` database without deleting existing profiles or journeys. Apply it once to an existing installation. A fresh installation needs `0000_perpetual_greymalkin.sql` first, followed by `0001_silent_vanisher.sql`.

Build first. For an empty local database, execute each migration in order using the bundled Wrangler CLI:

```powershell
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_perpetual_greymalkin.sql
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0001_silent_vanisher.sql
```

Production needs its own D1 binding and migrations. Do not upload local database files. Backup the hosted database before migrations. The current setup is for Cloudflare Workers with `nodejs_compat`; the same app is not a static-only deployment. Password hashing uses native scrypt with OWASP's N=32768, r=8, p=3 configuration (approximately 32 MiB per hash). Local Worker hashing measured around 150–220ms per request. Configure and verify sufficient CPU/memory limits and edge rate limiting on the selected host; a restrictive free-tier CPU budget may reject legitimate logins. Do not lower the hash work factor just to fit a deployment limit.

Sessions use cryptographically random tokens whose SHA-256 hashes are stored in D1. Cookies are HttpOnly/SameSite=Lax, with a Secure `__Host-` cookie on HTTPS. Local HTTP loopback uses a separate unprefixed cookie. Logout revokes the current session. State-changing account endpoints check same-origin requests and bound body sizes. Database-backed attempt limits cover email and trusted Cloudflare client IP; network/edge rate limiting and account recovery remain necessary before a public launch. Sessions expire after 30 days.

## Tests

`npm run test:accounts` tests password hashing, cookie rules, notice versions/window/read semantics, upload constraints and bounded request bodies. `npm run test:accounts:integration` requires `BRAMSEE_TEST_URL` pointing at a loopback Worker using an **isolated disposable database**, not the normal app database. It registers disposable accounts, uploads the public logo as a photo, checks account isolation, saves routes/stops, checks read receipts and throttling, then logs out. Fixtures include clearly labelled test notices and must never be loaded into the normal app or a hosted database.

The full integration suite passed in the real local production Worker/D1 runtime. Brampton's actual alert source is checked separately by the normal app. GO live validation remains pending its key. Physical phone and hosted deployment checks remain pending.

References: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Cloudflare crypto support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/).
