# Automatic timetable refresh

The GitHub Actions workflow **Refresh transit timetables** runs daily at 10:17 UTC (06:17 in Toronto during daylight saving, 05:17 in winter). GitHub may delay scheduled runs; this is not an exact-time service. A Run workflow button supports manual retries. GitHub can disable schedules in inactive public repositories; periodically check Actions and the last successful deployment.

## Enable publishing once

1. In Cloudflare, create an API token using its **Edit Cloudflare Workers** permission template. Name it Bramsee timetable publishing and restrict account access to the account that owns Bramsee. Do not use a Global API Key. Avoid granting access to unrelated accounts/zones. This deployment uses workers.dev, no custom-domain DNS changes and no database migrations. If the template offers resource-specific Workers access, scope to bramsee. See the official guide below for current permission controls.
2. Copy the token directly into GitHub → bigill-sunny/bramsee → Settings → Secrets and variables → Actions → New repository secret. Name it **CLOUDFLARE_API_TOKEN**. Never put its value in chat, repository files or an ordinary repository variable. The account ID is already included in the workflow and is not a secret.
3. In GitHub → Actions, open **Refresh transit timetables** and choose **Run workflow** on main. Enable Actions if GitHub asks. The workflow requests contents-write permission to commit validated data. Branch protection or organization policy may require approving that access or adjusting this to a PR workflow; do not bypass protection blindly.
4. Check that every step, including **Check hosted coverage matches this build**, succeeds. This first remote run is required before calling the unattended pipeline verified.
5. Enable GitHub Actions failure notifications for this repository/account. A missing/expired token, upstream failure, seven-day coverage warning or failed routing test produces a failed run. Fix the problem and use Run workflow to retry. The old hosted dataset remains unless deployment succeeds. If a deploy succeeds but the subsequent hosted hash check fails, inspect the deployment rather than assuming rollback occurred.

The deployment token is independent of ORS_API_KEY, BREVO_API_KEY and GO_API_KEY. Those runtime secrets remain in Cloudflare; they are not needed in GitHub. Revoke/rotate only this automation token when replacing it. A token's permissions may include reading or replacing Worker code/settings; limit repository write access accordingly.

Official setup: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/ . Repository secrets page: https://github.com/bigill-sunny/bramsee/settings/secrets/actions . Workflow: https://github.com/bigill-sunny/bramsee/actions/workflows/refresh-timetables.yml .

## Pipeline

The Python standard-library importer downloads Brampton's official ArcGIS item and GO's official Metrolinx archive. Both are processed in staging. It checks agency/timezone, ZIP limits, required tables, stop coordinates, trip/stop references, sequence/time ordering, boarding restrictions, calendar weekdays/exceptions and current coverage with at least seven days remaining. It rejects a large stop-count drop or regressed coverage versus the current dataset. Unsupported frequency-based or request-only schedules fail for manual review rather than being guessed.

The planner has direct and one-transfer routing and is not a full GTFS implementation. This importer deliberately fails on unsupported time/boarding data. A validator cannot prove upstream schedules are correct or that service is actually operating. Brampton/GO live feeds retain their independent freshness checks; a scheduled GO timetable refresh does not enable GO real-time predictions.

Timetable filenames include content hashes, so a changed service never reuses an old cache filename. The app fetches the small catalogue without browser caching, checks for a new catalogue every fifteen minutes while visible and when returning to the page, and defers adoption during an active journey. Hash-keyed schedule caching remains in place. Old inactive pages may need a reload if they reference a removed service file; the existing timetable load error tells them to refresh. An active trip keeps its already-loaded itinerary.

After staging, Node checks every referenced service file and sampled current BT/GO journeys. The workflow applies data only to its disposable build checkout, runs regression tests/type checking/build, commits public/data changes, then deploys the validated build. Failures before deployment do not overwrite the hosted data. The scheduled job deploys even if no files changed, so retrying a failed deploy does not depend on a new upstream feed. Source and published deployment can differ after a failed deploy; the final hosted feed-hash check detects that mismatch. No automated account migration or user-data modification occurs.

The original October 16 late-night scenario is retained in tests/fixtures/brampton-20261016.json, sourced from the earlier Brampton CC BY 4.0 snapshot. This fixed fixture keeps testing the reported route-26/route-1 failure after the current feed moves into another service period. Separate smoke checks use dates from the current GO calendar rather than a hardcoded historic day.

## Local maintenance

Use Python 3.12+ with timezone data and Node 24. The desktop environment may require its bundled Python executable. A fresh output directory is required:

```
python scripts/refresh-timetables.py --output .sites-runtime/new-timetables
node --experimental-strip-types scripts/check-timetables.mjs .sites-runtime/new-timetables
```

Optional --brampton and --go arguments use previously downloaded official ZIPs. --apply validates both feeds, copies generated files, replaces catalog.json last, and removes only obsolete files referenced by the old catalogue inside this checkout's public/data directory. It never extracts arbitrary ZIP paths or touches sources/, database records, provider keys or local accounts. Run tests/build before deploying any local refresh. A valid data snapshot does not eliminate the need to monitor future expiry.

```
python -m unittest discover -s tests -p test_timetable_import.py
npm run test:routing
npm run test:journeys
```

Roll back a bad data release by restoring public/data from a known-good Git commit in a clean checkout and deploying that build, provided the restored timetable still covers the intended dates. Do not restore or overwrite live database files.
