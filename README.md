# Cute Bunny

<p align="center">
  <img src="bunny-app-icon-192.png" width="112" alt="Cute Bunny app icon">
</p>

<p align="center">
  <strong>A cozy shared scrapbook for photos, music, notes, and little everyday moments.</strong>
</p>

Cute Bunny is a mobile-friendly social scrapbook designed around a small circle of friends. Create a personal profile, connect with friends, share memories, keep a streak, and revisit the moments that matter — all in a soft, playful interface that can also be installed on a phone like an app.

---

## What you can do

| Area | What it offers |
| --- | --- |
| **Home** | A shared memory feed for the latest photos, songs, and notes from you and the people you follow. |
| **Photos** | A dedicated photo garden with natural image proportions, a full-screen preview, and photo saving for friends' posts. |
| **Music** | Share audio, play songs from the music section, and use the persistent mini-player/music island while moving around the app. |
| **Notes** | A private-feeling, chat-style space for short messages and shared thoughts. |
| **Friends** | Discover profiles, search by username, follow or unfollow, and see friend activity. |
| **Profiles** | Personalise your display name, username, bio, mascot, profile appearance, and themes. |
| **Streak Garden** | Keep track of daily visits with timezone-aware streaks and a garden-inspired progress view. |
| **Notifications** | View activity updates and manage supported notification preferences. |

### Interaction and experience

- Responsive layouts designed for phones and desktop screens.
- Light and dark appearance modes.
- Double-tap reactions on supported memory cards and long-press interaction menus.
- Owner-only memory deletion, with an undo window for supported swipe-to-delete actions.
- Friend-aware memory access and live presence while members are connected.
- Photo source caching and preloading to make the photo garden feel faster on repeat visits.
- Installable Progressive Web App (PWA) experience with app icons, a standalone display mode, and a service worker for the app shell.

---

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, and vanilla JavaScript |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| File storage | Private Supabase Storage bucket |
| Live updates | Supabase Realtime |
| Username sign-in helper | Supabase Edge Function |
| Hosting and deployment | GitHub Pages with GitHub Actions |
| Installable app support | Web App Manifest and Service Worker |

The GitHub Pages deployment is a static website. The browser connects to Supabase for authentication, database operations, file storage, and realtime features.

---

## Project structure

```text
.
├── .github/
│   └── workflows/
│       └── deploy-pages.yml       # GitHub Pages deployment workflow
├── app.js                         # Application logic and interactions
├── index.html                     # App structure and entry point
├── style.css                      # Responsive UI and themes
├── manifest.webmanifest            # Installable PWA metadata
├── sw.js                           # App-shell caching and offline fallback
├── bunny-app-icon-192.png          # PWA icon
├── bunny-app-icon-512.png          # Large PWA icon
├── apple-touch-icon.png            # iOS home-screen icon
├── scripts/
│   └── build-preview.js            # Local production-preview builder
└── supabase/
    ├── schema.sql                  # Initial database and storage setup
    ├── feature-upgrades.sql        # Feature upgrade SQL
    ├── migrations/                 # Ordered database migrations
    └── functions/
        └── username-login/         # Username-to-email login helper
```

---

## Set up Supabase

A Supabase project is required for sign-in, profiles, memories, friends, notifications, and media storage.

1. Create a project in [Supabase](https://supabase.com/).
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Run `supabase/feature-upgrades.sql` once.
4. Apply every SQL file in `supabase/migrations/` in filename order. The migration files are timestamped; keep that order when applying them to an existing project.
5. Deploy the username login Edge Function with JWT verification disabled for the pre-session login exchange:

   ```bash
   supabase functions deploy username-login --no-verify-jwt
   ```

6. In **Authentication → URL Configuration**, configure your deployed GitHub Pages URL as the Site URL and add the URL (and any required auth callback paths) to the allowed redirect URLs.

The older `supabase/login-streak.sql` file is retained for compatibility with earlier setups. Do not run it on top of the timestamped migrations unless you are deliberately following a legacy upgrade path.

### Frontend Supabase configuration

The app expects a `supabase-config.js` file at the project root. Create it locally with your Supabase project URL and publishable key (or legacy anon key):

```js
window.CUTE_BUNNY_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
};
```

The publishable/anon key is intended to be used in browser applications. **Never put a Supabase `service_role` key or other privileged secret in frontend code.**

Email registration uses Supabase Auth. Username-or-email sign-in is supported through the Edge Function. Supabase Auth still requires a real email address for account registration; email-free signup is not supported.

---

## Run locally

You need Node.js and a browser with internet access.

1. Complete the Supabase setup above and create `supabase-config.js`.
2. Install no dependencies for the basic syntax check; the project uses browser-native JavaScript and loads Supabase JS v2 from jsDelivr.
3. Run the project checks:

   ```bash
   npm run check
   ```

4. To create a local preview build:

   ```bash
   npm run build
   ```

   The build writes the static preview to `dist/` and reads the Supabase URL and publishable key from `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` environment variables.

5. Serve the project over HTTP rather than relying on opening `index.html` directly. For example:

   ```bash
   python -m http.server 8000
   ```

   Then open `http://localhost:8000`.

---

## Deploy to GitHub Pages

The repository includes an automated workflow at `.github/workflows/deploy-pages.yml`. It runs on pushes to `main` and can also be started manually from the Actions tab.

1. Push the project to the repository's `main` branch.
2. In **Settings → Secrets and variables → Actions**, add these repository secrets:
   - `SUPABASE_URL` — your Supabase project URL.
   - `SUPABASE_PUBLISHABLE_KEY` — your Supabase publishable key or legacy anon key.
3. In **Settings → Pages**, set the publishing source to **GitHub Actions**.
4. Confirm the Site URL and allowed redirect URLs in Supabase Authentication settings.
5. Push a commit to `main`, or run **Actions → Deploy Cute Bunny to GitHub Pages → Run workflow**.
6. When the workflow succeeds, open its deployment environment URL or visit **Settings → Pages** for the published address.

The workflow creates `supabase-config.js` during deployment from the repository secrets. The generated configuration is included in the Pages artifact; the local configuration file does not need to be committed.

---

## Security and data access

- Row Level Security (RLS) policies protect database records.
- Members can create memories as themselves and delete only their own memories.
- Memory visibility follows the app's friend/follow relationship rules.
- Media is stored in a private Supabase Storage bucket and access is governed by storage policies.
- Notification preferences are stored separately from public profile information.
- Keep Supabase migrations and policies in sync with the deployed application.
- Never commit passwords, service-role keys, private access tokens, or other privileged credentials.

Supabase's free-plan quotas and inactivity policies can change. Check the current Supabase plan limits and keep independent backups of important data and media.

---

## Contributing

Changes should preserve existing authentication, friend permissions, storage policies, and mobile interactions. Before opening a pull request or publishing a change:

1. Run `npm run check`.
2. Test the affected feature on both a narrow mobile viewport and a desktop viewport.
3. Verify that signed-in users can access only the memories and actions permitted by the database policies.
4. Test the relevant GitHub Actions workflow before considering a change deployed.

---

<p align="center">
  Made for sharing the little things. ♡
</p>
