# File and feature naming

Use names that explain **what a file does**, not when it was created or which visual tweak it contains.

## Rules

- Use lowercase kebab-case for folders and files: `streak-garden.js`, `photo-picker.css`.
- Use `.js` for JavaScript, `.css` for styles, `.sql` for database changes, and `.md` for documentation.
- Prefer one feature or responsibility per file.
- Keep browser runtime code separate from Node.js build scripts.
- Name tests after the behaviour or feature: `notes-photo-sharing.test.js`.
- Avoid vague names such as `helpers.js`, `misc.js`, `new.js`, `final.js`, `fix2.js`.
- Do not put dates, version numbers or temporary status words in source filenames.
- Keep external contracts stable: PWA manifest, service worker, Capacitor config, workflow files, Supabase function directories and migration filenames.

## Current names: keep for now

| Current file | Why it remains |
| --- | --- |
| `app.js` | Loaded directly by the app shell and checked by existing tests; split behind a compatibility entry point later |
| `style.css` | Main stylesheet and build asset |
| `polish.css` | Loaded by HTML and copied by the build; consolidate after auditing selector ownership |
| `sw.js` | Browser service-worker entry point; its path is registered by the app |
| `bear-hugs-progression.js` | Feature script with matching stylesheet and test expectations |
| `supabase-config.js` | Generated into the build output; it is not a committed source file |

## Preferred feature names

- `photo-gallery.js` / `photo-gallery.css`
- `notes-chat.js` / `notes-chat.css`
- `music-player.js` / `music-player.css`
- `friends.js` / `friends.css`
- `notifications.js` / `notifications.css`
- `profile-settings.js` / `profile-settings.css`
- `streak-garden.js` / `streak-garden.css`
- `bearfriend.js` / `bearfriend.css`

Names above are conventions for future modules; they do not imply those files exist yet.
