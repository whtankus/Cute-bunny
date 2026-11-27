# Stability and architecture refactor

## Completed
- [x] Extract shared DOM helpers, Supabase client construction, media optimization and the injected API facade.
- [x] Extract Notes message rendering, composer, typing, presence transitions, delivery and read-receipt logic into `src/features/notes/notes.js`.
- [x] Extract Photos feed pagination, media hydration and lightbox functions into `src/features/photos/photos.js`.
- [x] Extract Home, Photos, Music and Friends page renderers from the legacy `render()` coordinator.
- [x] Extract Music player/source/playback functions into `src/features/music/music.js`.
- [x] Extract Friends search, row and profile activity functions into `src/features/friends/friends.js`.
- [x] Extract Notifications loading, grouping, read-state and visibility functions into `src/features/notifications/notifications.js`.
- [x] Extract Profile editor, preview and save functions into `src/features/profile/profile.js`.
- [x] Extract Streak Garden state, quests, rewards and rendering functions into `src/features/streak/streak.js`.
- [x] Split 562 feature-scoped rules from `polish.css` into eight feature stylesheets under `src/styles/features/`.
- [x] Audit repeated selectors in the legacy CSS layers and document high-frequency overrides in `docs/CSS-AUDIT.md`.
- [x] Wire feature scripts and stylesheets into HTML, preview builds, syntax checks, project structure checks and service-worker precache.
- [x] Add architecture tests for module loading order and feature stylesheet wiring.

## Remaining validation and cleanup
- [ ] Run the complete GitHub browser regression suite against the latest PR head.
- [ ] Run a configured Android Gradle build, install the APK on an emulator/device, and test upgrade/install behavior.
- [ ] Consolidate duplicate CSS selectors only after visual regression comparison; preserve deliberate theme, responsive and state overrides.
- [ ] Continue the second-stage migration from classic-script shared lexical state to explicit dependency injection and feature-owned state.
- [ ] Move Bearfriend and gesture modules into the feature tree when their native and offline asset references are updated.

## Validation commands
- `npm run check`
- `npm test`
- `npm run build` with repository Supabase build variables
- GitHub Pages preview workflow
- Browser regression across Home, Photos, Notes, Music, Friends, Notifications, Profile and Streak Garden
- Android APK build, install and upgrade check

## Constraints
No feature redesign during structural-only changes. No database schema or API contract changes. Do not remove legacy assets until HTML, build, workflow, service-worker, test and native packaging references are updated.
