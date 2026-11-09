# Cute Bunny ♡

A mobile-friendly shared scrapbook. The hosted app uses Supabase Auth, PostgreSQL, and private Supabase Storage. The Java/MySQL prototype is preserved separately in the local backup and is not part of the Pages deployment.

## Supabase setup

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/schema.sql`.
3. In **Project Settings → API**, copy the Project URL and the publishable key (or legacy anon key) into `supabase-config.js`.
4. In **Authentication → URL Configuration**, add your future GitHub Pages URL to the allowed redirect URLs.
5. New users register with an email, username, display name, and password. After deploying `supabase/functions/username-login`, users can sign in with either username or email plus password. The function resolves usernames privately on the server; never expose the service-role key in frontend code.
6. In Supabase Edge Functions, deploy the `username-login` function and turn off JWT verification for this function because it is called before login. Supabase provides the URL, anon key, and service-role key to Edge Functions as environment variables.
7. Host the project root with GitHub Pages. In repository Settings → Pages, choose the main branch and root folder.

The publishable/anon key is intended for the browser. Never put a `service_role` key in frontend files. Database access is protected by Row Level Security, and the media bucket is private. Follow permissions allow friends to see each other's memories; users can delete only their own memories.

## Features

- Email registration with username-or-email sign-in
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

The workflow follows GitHub's Pages artifact deployment flow. The Supabase publishable key is designed for frontend use; access must remain protected by the Row Level Security policies in `supabase/schema.sql`.


