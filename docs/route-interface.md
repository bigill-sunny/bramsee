# Route cards and mobile sheet

Journey alternatives use stacked cards with route badges, departure prediction or scheduled time, direction/headsign, boarding stop, total time, estimated walking and arrival time. Journey details expand on demand. Three cards render initially; Show all displays up to eight available options.

Later buses use the same boarding stop, route and headsign, and remain labelled separately from full itineraries. Their transfer connections have not been checked. Scheduled departures never use live countdown styling. The selected full journey is preserved across feed replanning while the same itinerary remains available. If it is no longer available, the planner selects the first available option.

At widths up to 760 pixels the map remains behind a three-position bottom sheet. Tap the handle to expand or return to half height. Drag the handle up/down to move one position. Keyboard users can focus Resize trip panel and use Arrow Up/Down, Home (collapsed) or End (expanded). The sheet body scrolls independently; the handle has a 49-pixel touch target. The map view accounts for the space covered by the sheet. Route overview and Follow my location collapse the sheet. Desktop retains the side panel.

There is no drag animation loop, background routing service or new dependency. The existing feed refresh interval is unchanged. Expensive route/departure calculations are memoized rather than repeated for every countdown tick. This is a browser preview implementation; physical phone testing and online latency checks are still required before claiming mobile deployment readiness.
