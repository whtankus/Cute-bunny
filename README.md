# Cute Bunny ♡

A mobile-friendly shared scrapbook. The hosted app uses Supabase Auth, PostgreSQL, and private Supabase Storage. The Spring Boot/MySQL prototype under `backend/` is separate and is not used by the Pages deployment.

## Supabase setup

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/schema.sql`.
3. In **Project Settings → API**, copy the Project URL and the publishable key (or legacy anon key) into `supabase-config.js`.
4. In **Authentication → URL Configuration**, add your future GitHub Pages URL to the allowed redirect URLs.
5. Users register with a real email, username, display name, and password. Deploy `supabase/functions/username-login` with JWT verification disabled for the pre-session credential exchange; users can then sign in with username or email and password. Email-free signup is not supported by Supabase Auth. Apply the timestamped SQL migrations in `supabase/migrations/` in filename order after the feature upgrade. These migrations install server-side streak persistence, private notification preferences, required indexes, and the final permission restrictions.
6. Host the project root with GitHub Pages. In repository Settings → Pages, choose the main branch and root folder.

The publishable/anon key is intended for the browser. Never put a `service_role` key in frontend files. Database access is protected by Row Level Security and column-level grants. Profile discovery exposes only public profile fields; notification preferences are stored in a separate private table. The media bucket is private. Follow permissions allow friends to see each other's memories; users can delete only their own memories.

## Features

- Email registration with username-or-email password sign-in
- Profiles, themes, mascots, username search, follow/unfollow
- Shared notes, photos, and audio files
- Private photo/audio storage with friend-aware access
- Personal light/dark mode and responsive layouts

## Free-plan note

Supabase's free plan has a 500 MB database quota and can pause projects after low activity. Keep backups of important media. Free service limits can change.

## Local preview

The page loads Supabase JS from jsDelivr, so use a browser with internet access. Set `supabase-config.js` first, then serve the project over HTTP or use GitHub Pages. Opening the file directly works only if the browser permits the CDN script and Supabase network requests.
## Publish the app with GitHub Pages

The included workflow publishes only the static website files. It creates `supabase-config.js` during deployment from GitHub Actions secrets; your local placeholder config remains unchanged.

1. Create a GitHub repository. For free GitHub Pages on GitHub Free, make it public. Do not commit passwords, database URLs, or service-role keys.
2. Push the **contents of this `cute-bunny` folder** to the repository's `main` branch, including `.github/workflows/deploy-pages.yml`.
3. In the repository, open **Settings → Secrets and variables → Actions → New repository secret**. Add:
   - `SUPABASE_URL`: your Supabase project's URL.
   - `SUPABASE_PUBLISHABLE_KEY`: the project's publishable key (or legacy anon key). Never use `service_role`.
4. Open **Settings → Pages**, set **Source** to **GitHub Actions**.
5. In Supabase **Authentication → URL Configuration**, set the GitHub Pages URL as the Site URL and add it to the allowed redirect URLs.
6. Push a commit or run **Actions → Deploy Cute Bunny to GitHub Pages → Run workflow**. The deployed link appears in the workflow run and in **Settings → Pages**.

The workflow follows GitHub's Pages artifact deployment flow and runs a JavaScript syntax check before deployment. The Supabase publishable key is designed for frontend use; access must remain protected by the Row Level Security policies and the ordered migrations.


## Phone full-screen use

The site fills the phone viewport and includes a standalone app manifest. In your phone browser, use **Add to Home Screen** (or **Install app**) to open Cute Bunny without the usual browser tabs and address bar.

## Feature upgrade migration

To enable username changes, persistent notification history, buddy activity pings, and notification preferences, run `supabase/feature-upgrades.sql` once in **Supabase → SQL Editor**. Then apply every file in `supabase/migrations/` in filename order. These migrations are additive and preserve existing profiles, memories, follows, notifications, and media. The older `supabase/login-streak.sql` is retained only as a compatibility script; do not run it when the timestamped migrations have already been applied.

The hosted site currently uses the Supabase JavaScript client. The Spring Boot/MySQL code under `backend/` is a separate prototype and is not used by GitHub Pages.

## Recent interaction improvements

- Music playback uses one audio player that stays mounted while pages change.
- Shared memory cards have stable colors for the two scrapbook owners.
- Long-press, right-click, and keyboard context menus offer copy, download, multi-select, and owner-only delete actions.
- Right-swipe reveals deletion; completing the swipe starts a short Undo window before anything is removed.
- Friends see live presence while the app is open. Buddy taps can send a rate-limited notification to a mutual friend.
- Photos, songs, and notes create notification history entries for followers after the feature migration is installed.
