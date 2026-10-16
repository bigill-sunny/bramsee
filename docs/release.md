# Bramsee release steps

## What is ready locally

The app includes a web app manifest, 192px/512px icons, a maskable icon, Apple touch icon and a production-only service worker. Profile contains browser-dependent installation help and a user-controlled update button. Updating is disabled during an active journey or sharing session. Installing does not enable background GPS or background sharing.

The worker saves only the generic offline screen and its branding assets. It never caches API responses, personalized app HTML, authentication pages, shared journey pages, transit timetables, map tiles or walking requests. Offline navigation shows a connection screen rather than a working route planner. An open app immediately marks live information unavailable when the browser reports it is offline. Other failures still rely on feed freshness and error handling. `navigator.onLine` is a hint, not proof that the server is reachable.

Service workers stay disabled in the development server to avoid interference with hot reload. Validate using `npm run build` then `npm start -- --port 4174`. Open the printed loopback address, wait for the app to load, then open Profile. It should say the offline connection screen is ready. Installation support varies by browser. The in-app preview may not offer installation; test the HTTPS site in a normal phone browser.

Run `npm run test:pwa` for manifest/icon and simulated service-worker cache tests. These do not replace browser offline testing or real-device installation tests.

## Next release steps

1. **Choose the first deployment audience and host.** This project uses Cloudflare Workers/D1 with Bramsee email/password sessions. Choose a host with compatible server APIs and enough CPU for scrypt. The private Sites gate remains separate from Bramsee login; copying the frontend alone will not provide accounts or sharing.
2. **Configure production services.** Set `ORS_API_KEY` as a server secret. Configure `GO_API_KEY` for GO live feeds and validate it with real services; otherwise GO times remain scheduled. Never upload `.dev.vars`, `.env*`, `.wrangler` or `.sites-runtime`. Apply the existing database schema/migrations on the chosen host before testing favourites or sharing.
3. **Verify feed coverage and renew timetables.** Brampton's snapshot ends November 1, 2026; GO's ends November 27, 2026. A repeatable import and coverage check are needed for ongoing use. The planner currently permits at most one transfer and first boarding within 90 minutes. Test late-night service, cancellations, different stop directions, tight connections and mixed GO/Brampton journeys.
4. **Deploy an HTTPS preview.** Check app HTML, manifest, icon URLs, `/sw.js`, `/offline.html`, server secrets, database binding, authentication and API errors on the actual deployment. Keep `/sw.js` revalidated rather than assigning it an immutable long cache lifetime. Keep manifest `id`, `start_url` and `scope` stable for app upgrades. Bump the worker cache version when changing its precached offline assets.
5. **Test on Android and iPhone outdoors.** Test install, standalone launch, GPS accuracy/permissions, walking overlays, loss/recovery of internet, offline reload and app updates during a trip. Check text scaling, screen-reader labels and each colour scheme. Device-local saved routes and colours belong to the site's origin: local development data will not automatically transfer to the hosted URL.
6. **Complete sharing and account validation.** The private beta requires the recipient to have site access. A public loved-one link needs access controls, expiry/revocation, retention and a deployment that supports the intended audience. Verify authorization across two different accounts. Saved routes now sync to signed-in accounts. Configure a verified sender and validate verification/password-reset delivery before public registration. See search-and-email.md. See accounts-notifications.md.
7. **Prepare the repository and demo.** Include setup instructions, data sources/licences, known limits and a five-minute before/after demo. Measure completion time and missed/incorrect route guidance with real users rather than claiming unmeasured accuracy. Publish only the sanitized source and required assets.

## Production smoke test

- Open Profile and confirm offline support is ready, without starting GPS or sharing.
- Search two public stops. Confirm live versus scheduled labels, total-time ordering and the walking card.
- Put the browser offline: open-app warnings should appear, and reloading the app should show the generic offline screen. No cached account or journey information should appear there.
- Reconnect and retry. Confirm fresh feed timestamps and new predictions before trusting a countdown.
- Install in a supported normal browser, launch the installed app and repeat the journey test.
- Release a changed worker to the preview: confirm the update waits and that reloading requires the user's action. Finish active trips and stop sharing before updating.

Reference: [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) and [service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
## Checks completed locally

The production build registered its worker successfully in the browser. A waiting update appeared in Profile and activated after choosing Update and reload. After stopping only the separate production test server, reloading the controlled page displayed Bramsee’s cached offline screen. This also caught and fixed a host redirect issue: precached responses are normalized before storage so a redirect from offline.html to /offline cannot break the fallback. The browser check and automated regression both passed. Physical phone installation and HTTPS deployment remain untested.
