# Routing changes and verification

## Run the checks

From the project folder, run `npm run test:routing`, then `npm run build`.
Run `npm run dev` and open http://127.0.0.1:5173/ to inspect the interface.

## Fixed

- Trip instances carry service date and GTFS time origin; schedules include overlapping previous and next service days. GTFS noon-minus-twelve timing covers daylight-saving transitions.
- Service files reload hourly and are cached by service identifier. Timetable fetch failures remain visible.
- Dated realtime updates join by trip and service date. Undated updates attach to the closest scheduled instance. Freshness applies to cancellations as well as predictions.
- Downstream times carry preceding delays until NO_DATA resets them; signed delay-only events are decoded.
- All stops within the configured estimated walking distance are considered, without a ten-stop cutoff.
- One-transfer itineraries can walk between different stops, up to the smaller of 400 metres or the user's walking preference. Walking time and a three-minute boarding buffer are included.
- Results retain distinct route/headsign alternatives, and refresh while planning as feed and clock change.
- Nearby countdowns remain available when full planning fails; a bus that appears uncatchable gets a warning. Walking directions remain available through an external link.
- Manual trip guidance includes boarding, riding, alighting and walking to a connection. It does not automatically detect when to get off.

## Regression scenario

16 October 2026, 00:30 America/Toronto. Origin: Clockwork Dr e/of Brisdale Dr, stop 4332. Destination: Downtown Terminal Zum Queen Stop, stop 4020. Walking preference: 1,000 metres per end.

The stored timetable now yields both route 4 → 1 and route 26 → 1 alternatives. Tests use the real timetable and synthetic realtime fixtures. This is an area/time reproduction: the exact original GPS location and historical realtime feed were not captured.

## Remaining boundaries

Walking distances are straight-line distance × 1.35, not pedestrian-network routes. Transfer paths, crossings and accessibility are not verified; the UI says so. This planner searches direct and one-transfer Brampton Transit journeys, first boarding within 90 minutes, transfers with a three-minute buffer and at most an hour of subsequent waiting. It cannot claim to find the globally fastest or safest route. No GO routing or automatic rerouting during an active journey is provided. The bundled timetable ends November 1, 2026 and needs replacement before then. Field validation against actual departures is still required.
