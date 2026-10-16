# Profile appearance and sharing

Open the profile button, then choose Bright, Dark, Pink cutesy, Metal, Sporty, Cool or Warm under Appearance. The choice applies immediately and is stored in this browser as `bramsee-theme`. It is not yet synced to other devices. Invalid stored values fall back to Bright; blocked storage leaves the current visit usable and displays a message. Changing a theme does not alter GPS, sharing, saved stops or route preferences.

All palette normal-text pairings are checked for 4.5:1 contrast with `npm run test:themes`. Map tiles remain the original map provider's style. GPS blue and warning colours retain their meaning in every theme. Check the full interface on real devices as well as the palette tests.

Journey sharing appears in the same profile panel: signed-in users can start sharing, copy the journey link and stop sharing. Starting prompts for location through the existing browser flow. Merely opening the profile or changing themes never starts sharing. The existing authenticated API and ownership checks are unchanged. Recipients still need access to the private beta. Users who only want local GPS following do not need to share their journey.
