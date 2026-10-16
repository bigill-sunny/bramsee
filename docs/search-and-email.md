# Departure times, addresses and account emails

## Search

In the trip form, select Leave later and choose a date/time. Times are interpreted in America/Toronto, irrespective of the device timezone. Searches load the service calendar for that date. Future results are scheduled, not live predictions. Totals and walking alternatives are calculated from the chosen departure. Start tracking is disabled for a future itinerary; switch back to Leave now and search before travelling. Dates without timetable coverage are rejected. Saved routes reset to Leave now and search immediately once their timetable loads.

Enter an address or place in either field, then choose Search addresses & places. Select the desired result. Local stop matches and map pins remain available. The server calls openrouteservice Geocoding using the existing private ORS_API_KEY; no extra key is exposed to the browser. Searches are restricted to southern Ontario, with a Brampton focus. Results depend on upstream address coverage: a street/area match is labelled explicitly and is not a verified house entrance. Confirm the map pin; use a map pin instead if the result is imprecise. Address queries are sent to openrouteservice only when the user presses the search button, with private/no-store API responses. The endpoint applies an isolate-local request allowance, not a global account quota; add host-level controls for larger usage.

## Email setup

Verification and reset pages support Brevo and Resend through their HTTPS APIs. A workers.dev hostname is not a sender domain you control. You can keep that website address while using Brevo's Free plan for the prototype. Brevo documents 300 emails per day, sender verification using a code emailed to your inbox, and temporary sender-address replacement for free email addresses. This is a prototype option, not a free domain owned by you or a guarantee of delivery. Brevo may require account/transactional-sending activation. Test actual delivery and spam placement; a verified custom domain is the longer-term route. Resend remains available with a verified domain you own.

### Free prototype setup (Brevo)

1. Create a free account at https://www.brevo.com/ and complete its account confirmation. Do not choose a paid plan for this setup.
2. In Settings → Senders, Domains, IPs → Senders, add a sender named Bramsee with an email inbox you control. Enter the verification code Brevo emails to that inbox. A Gmail address can use Brevo's documented replacement mechanism; the visible sender domain may differ. Do not invent or enter your own t-sender-sib.com address.
3. Enable transactional sending if the account requires activation, then create a Brevo API key in the API-key settings (not an SMTP password). Keep it private.
4. Run npm run deploy:cloudflare from Bramsee's local folder to deploy the new provider support. This includes any outstanding account-email migration from the preceding feature update.
5. Double-click **Set Brevo Email.cmd**. Supply the verified sender email, retain the app origin https://bramsee.bigill.workers.dev, and paste the API key at its hidden prompt. The helper uploads the four settings through stdin to Cloudflare; it does not save the key to a project file, alter ORS_API_KEY, or send emails.
6. Refresh Bramsee, sign into your own account and request a verification email. Open it and explicitly confirm verification. Reload Bramsee to see the updated status.
7. Test Forgot password using your own account. The old password and sessions should stop working after you submit the new password. Neither the helper nor configuration checks prove delivery; check the provider dashboard if mail does not arrive.

The helper configures production only. For optional local testing, set the same four fields in your ignored .dev.vars and restart development; never commit that file.

Production fields:

- EMAIL_PROVIDER: brevo (explicitly selects the transport; defaults to Resend unless only a Brevo key is configured).
- BREVO_API_KEY: private Brevo API key.
- EMAIL_FROM: the sender email verified in Brevo; optionally Name <email> when configuring manually.
- APP_ORIGIN: https://bramsee.bigill.workers.dev (your fixed canonical app origin).

For Resend use EMAIL_PROVIDER=resend and RESEND_API_KEY instead, with EMAIL_FROM on a verified sender domain. Both keys may coexist; the explicit selector wins. No provider keys are returned by the configuration endpoint or put in browser code.

The UI checks delivery configuration and disables email actions with an explanation until the selected provider key, valid sender and HTTPS app origin are present. That check cannot prove sender verification or actual deliverability. Test delivery using your own account after configuring the provider. Requests do not return tokens. The fixed APP_ORIGIN prevents generating account links from an attacker-controlled request host. Links carry tokens in URL fragments; the action page removes them from the address bar after loading, and only an explicit form submission consumes them. Reloading that page requires reopening the email link.

Profile shows verification status and a Send verification email button. Registration does not send automatically. Existing accounts remain able to sign in while unverified; verification status is not an authorization gate. Forgot password appears in the sign-in form. Reset links expire after 30 minutes, verification links after 24 hours. Only SHA-256 token digests are stored. Tokens are single-use, purpose-specific and replaced when another link is requested. Resetting changes the password and revokes all sessions atomically. Forgot-password responses do not reveal whether an address is registered; a provider delivery failure is intentionally not disclosed there. No automatic sign-in occurs after resetting.

The migration `0002_account_email.sql` adds email_verified and account_tokens. `npm run deploy:cloudflare` applies outstanding Wrangler migrations before deploying. Back up the hosted database before migration. On October 16, 2026, the hosted database was backed up privately, migration 0002 was applied successfully, and the search/email-provider update was deployed. Delivery remains disabled until the owner configures a verified sender and provider key. A prior Cloudflare authorization error (7403) did not recur during the successful retry.

## Validation

`npm run test:departure` checks Toronto timezone handling, winter offset, nonexistent DST times, and selected-date timetable loading/routing. Existing routing and account unit tests remain applicable. npm run test:mail exercises both provider transports with fake keys and mocked fetch calls; it checks request payloads, header selection, invalid settings and sanitized errors without sending mail.

`BRAMSEE_TEST_URL=http://127.0.0.1:4174 npm run test:email:integration` (set the environment variable using your shell's syntax) requires a local Worker on port 4174 with the isolated `.sites-runtime/account-test-state` D1 database and all three migrations applied. It creates disposable test accounts and seeds hashed tokens only into that isolated local database. Tests verify expiry, purpose restrictions, verification persistence, concurrent single-use password resets, old-session revocation and old/new password login. It sends no emails. Never use a production URL or the normal app database for this test.

References: https://giscience.github.io/openrouteservice/api-reference/endpoints/geocoder/ ; https://resend.com/docs/api-reference/emails/send-email ; https://developers.brevo.com/reference/send-transac-email ; https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders ; https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email .
