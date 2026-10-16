# Journey cards and GO coverage

Search results combine walking and transit in one stack, ordered strictly by estimated destination arrival. Transit totals include access walking, waiting, transfers, riding and final walking. Walking is estimated geometrically until pedestrian directions are available. Selecting a card loads its pedestrian paths and steps; verified final-walk duration updates the card's total and order. The walking-only card loads its own complete path. Predictions refresh independently of walking requests, with a ten-minute pedestrian cache and concurrent request deduplication.

Each dropdown includes boarding stop codes, headsigns, alighting stops, walking directions and up to three later departures for each boarding stop/service. Later departures do not imply their connections have been checked. A selected journey's pedestrian paths must load and pass boarding-buffer and distance checks before Start is enabled. Search still supports at most one transit transfer and first boarding within 90 minutes; it is not a complete regional journey-planning engine. Direction uses an explicit cardinal headsign when available, otherwise the destination headsign.

Saved → Saved routes stores a name and both endpoints on the device. Tapping a saved route immediately plans again for the current time, rather than replaying an old timetable. Rename, remove and undo removal are supported. Guests retain these routes on the device. Signed-in accounts now sync named routes to D1, with an explicit option to import guest routes; see accounts-notifications.md.

## GO timetable

Official source: https://www.metrolinx.com/en/about-us/open-data

Imported feed version: 20261005110625. Coverage: October 5–November 27, 2026. Brampton Transit's existing snapshot still ends November 1, 2026. The catalogue records separate GO coverage. GO bus and rail trips share the direct/one-transfer planner with Brampton Transit; all GO identifiers are prefixed to prevent collisions. Separate scheduled arrival/departure times preserve rail dwell time. The regional dataset does not expand the planner's transfer limit.

To refresh, download the official GO GTFS ZIP, then run `python scripts/import-go.py path/to/GO-GTFS.zip`. The importer replaces GO entries without removing Brampton services. It expects the official feed's `calendar_dates.txt`. Check its printed coverage and run `npm run test:journeys` after importing. Update the test's representative date when moving to a new service period. Never commit provider keys or local runtime files.

Contains information licensed under the [Open Government Licence – Ontario – Metrolinx](https://assets.metrolinx.com/image/upload/v1663237565/Documents/Metrolinx/Open-Government-Licence-Ontario-Metrolinx.pdf).

Data used in this product or service is provided with the permission of Metrolinx. Metrolinx makes no representations or warranties of any kind, express or implied, with respect to the Data and assumes no responsibility for the accuracy or currency of the data used in this product or service.

## Optional GO live feed

Metrolinx requires a separate access key: https://api.openmetrolinx.com/OpenDataAPI/Help

Set `GO_API_KEY` as a server secret (local development uses the ignored `.dev.vars`; hosted deployments need their own secret). Do not prefix it with `NEXT_PUBLIC_` or put it in client code. The adapter requests GTFS protobuf TripUpdates, VehiclePosition and Alerts. Each agency's feed and entity timestamp is checked separately; one fresh agency cannot make another agency's old predictions live. An unavailable GO feed falls back to explicitly scheduled GO times. Without a GO key, no requests are sent to the GO live API. Live GO matching still needs a real key and live end-to-end validation; only decoding/namespace/freshness behavior has been tested locally. Brampton live predictions remain independent.

## Validation

`npm run test:routing`, `npm run test:walking`, `npm run test:journeys`, TypeScript checking and the production build. The journey checks include real GO bus/train data, Bramalea GO → Union Station GO routing, combined walking/transit ordering, separate rail arrival/departure times, saved-route validation, namespacing and stale-feed isolation. Device-local persistence, immediate saved-route search and walking-card instructions/path are also checked in the browser. Phone hardware and production deployment are separate checks.
