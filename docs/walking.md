# Walking directions setup

1. Double-click `Set Walking Key.cmd` in the project root. Paste your openrouteservice Directions V2 key into the hidden prompt, then press Enter.
2. The helper saves ORS_API_KEY into `.dev.vars`, preserving other local variables. This is a plaintext local secret file, ignored by Git; never share it or include it in source archives.
3. Restart the development server (`npm run dev`). If the old server is still running, stop it in its own terminal first. The existing launcher will reuse a running server, so reopening the launcher alone is not a restart.
4. Visit http://127.0.0.1:5173/api/walk. `configured: true` means a key is loaded; it does not prove provider acceptance.
5. Select an origin and destination in Bramsee and click Get walking directions. Inspect the blue paths and expandable instructions. A successful route confirms the provider accepts the key.

For online hosting, set ORS_API_KEY as a server runtime secret using the host's secret management. Never use a NEXT_PUBLIC_ or VITE_ prefix and never put the key in hosting.json or client code. The current Worker reads the binding from `cloudflare:workers`.

## Scope and privacy

The POST endpoint accepts Brampton-area coordinates only, rejects cross-origin browser requests and large/invalid bodies, and never returns provider error bodies or credentials. Requesting directions sends only walking endpoint coordinates to openrouteservice. The UI explains this before the user clicks. It does not continuously send GPS or call walking directions on the bus refresh timer.

An in-memory ten-minute cache reuses walks and deduplicates concurrent requests. A per-isolate allowance of 30 calls/minute and 1,500/day leaves room below the Standard provider limits. This counter is best effort, resets on restart and is not shared across deployed isolates: a public deployment needs persistent quota enforcement and abuse protection before opening it to broad traffic. Provider account limits remain authoritative.

The interface shows pedestrian geometry, distance, duration, instructions and required attribution. The selected journey is checked against walking limits and boarding/transfer times; warnings block starting a journey that fails the check. Other journey cards still use estimates, and the planner does not yet search additional candidates using network walking times. Paths depend on map data; crossings and accessibility need field verification. During an active trip a walking check is informational, not automatic turn-by-turn navigation or rerouting.

Run `node --experimental-strip-types tests/walking.test.mjs` for offline provider-fixture tests. A real authenticated provider request and phone field test are still required after local key entry.
