# Departure times, addresses and account emails

## Search

In the trip form, select Leave later and choose a date/time. Times are interpreted in America/Toronto, irrespective of the device timezone. Searches load the service calendar for that date. Future results are scheduled, not live predictions. Totals and walking alternatives are calculated from the chosen departure. Start tracking is disabled for a future itinerary; switch back to Leave now and search before travelling. Dates without timetable coverage are rejected. Saved routes reset to Leave now and search immediately once their timetable loads.

Enter an address or place in either field, then choose Search addresses & places. Select the desired result. Local stop matches and map pins remain available. The server calls openrouteservice Geocoding using the existing private ORS_API_KEY; no extra key is exposed to the browser. Searches are restricted to southern Ontario, with a Brampton focus. Results depend on upstream address coverage: a street/area match is labelled explicitly and is not a verified house entrance. Confirm the map pin; use a map pin instead if the result is imprecise. Address queries are sent to openrouteservice only when the user presses the search button, with private/no-store API responses. The endpoint applies an isolate-local request allowance, not a global account quota; add host-level controls for larger usage.

## Email setup

Verification and reset pages are implemented, but delivery requires a sender service. This build supports Resend's HTTPS email API. A workers.dev hostname alone is not a sender domain you control. Verify a domain you own with the provider before enabling general delivery. Resend's testing sender is restricted and is not suitable for all users. Do not invent a sender address or store provider keys in GitHub.

Configure these on the deployed Worker:

- RESEND_API_KEY: secret, entered using `npx wrangler secret put RESEND_API_KEY --config dist/server/wrangler.json`.
- EMAIL_FROM: a sender on your verified domain, set as a Worker variable or secret.
- APP_ORIGIN: `https://bramsee.bigill.workers.dev` (or your canonical app origin after a domain change).

The UI checks delivery configuration and disables email actions with an explanation until all three values are present. That check cannot prove sender verification or actual deliverability. Test delivery using your own account after configuring the provider. Requests do not return tokens. The fixed APP_ORIGIN prevents generating account links from an attacker-controlled request host. Links carry tokens in URL fragments; the action page removes them from the address bar after loading, and only an explicit form submission consumes them. Reloading that page requires reopening the email link.

Profile shows verification status and a Send verification email button. Registration does not send automatically. Existing accounts remain able to sign in while unverified; verification status is not an authorization gate. Forgot password appears in the sign-in form. Reset links expire after 30 minutes, verification links after 24 hours. Only SHA-256 token digests are stored. Tokens are single-use, purpose-specific and replaced when another link is requested. Resetting changes the password and revokes all sessions atomically. Forgot-password responses do not reveal whether an address is registered; a provider delivery failure is intentionally not disclosed there. No automatic sign-in occurs after resetting.

The migration `0002_account_email.sql` adds email_verified and account_tokens. `npm run deploy:cloudflare` applies outstanding Wrangler migrations before deploying. Back up the hosted database before migration. No production migration or deployment was performed while developing these changes.

## Validation

`npm run test:departure` checks Toronto timezone handling, winter offset, nonexistent DST times, and selected-date timetable loading/routing. Existing routing and account unit tests remain applicable.

`BRAMSEE_TEST_URL=http://127.0.0.1:4174 npm run test:email:integration` (set the environment variable using your shell's syntax) requires a local Worker on port 4174 with the isolated `.sites-runtime/account-test-state` D1 database and all three migrations applied. It creates disposable test accounts and seeds hashed tokens only into that isolated local database. Tests verify expiry, purpose restrictions, verification persistence, concurrent single-use password resets, old-session revocation and old/new password login. It sends no emails. Never use a production URL or the normal app database for this test.

References: https://giscience.github.io/openrouteservice/api-reference/endpoints/geocoder/ and https://resend.com/docs/api-reference/emails/send-email.
