# Deploy Bramsee to your Cloudflare account

The application uses the `bramsee` Worker and the `DB` binding to `bramsee-db`.
The database ID in vite.config.ts identifies the owner's database; it is not a secret.

From the project folder, run:

1. `npx wrangler login` and approve access in your own browser.
2. `npm run deploy:cloudflare` to build, apply outstanding migrations to the hosted database, and deploy. Review the migration prompt before accepting. Back up an existing populated database before schema changes.
3. `npx wrangler secret put ORS_API_KEY --config dist/server/wrangler.json` and enter your existing walking key at the hidden prompt. Never paste it into GitHub or chat.
4. Open the workers.dev address printed by deployment. Test routing and accounts there; local accounts/data are not copied online.

This route deploys directly from your computer and does not require the dashboard's Git import wizard. It does not automatically configure future GitHub builds. Configure those separately with build command `npm run build` and deploy command `npm run deploy:cloudflare` (which currently rebuilds).

Leave GO_API_KEY unset for scheduled GO service only. Verify the five-minute alert schedule in the deployed Worker's Triggers settings. Confirm account login CPU usage fits your chosen plan. Complete email verification/recovery and sharing access checks before a public launch. Deploying directly does not apply the private Sites access gate; use Cloudflare Access for a restricted team preview.