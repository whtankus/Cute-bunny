# CSS selector audit

## Scope and method
The legacy `style.css` and `polish.css` layers were scanned for repeated selector strings. Before extraction, the scan found **1,652 selector entries that appeared more than once** across the two files. This is a selector-instance count, not a count of confirmed defects: the app deliberately layers theme, responsive, state, and interaction overrides.

## Highest-frequency repeated selectors
| Selector | Occurrences |
|---|---:|
| `.home-note-memory .chat-bubble-wrap` | 26 |
| `.chat-page .chat-bubble-wrap` | 24 |
| `.streak-garden-page .sg-game-compact .sg-petal-card` | 24 |
| `.streak-garden-page .sg-game-compact .sg-petal-board` | 23 |
| `.chat-bubble-wrap>.chat-bubble` | 22 |
| `.friend-profile-follow` | 22 |
| `#content` | 21 |
| `.auth-card.profile-card .profile-settings-panel` | 18 |
| `.chat-page .chat-bubble-wrap>.chat-bubble` | 17 |
| `.app #nav button` | 16 |
| `.friend-profile-bio` | 16 |
| `body.notes-page-active .app>header` | 16 |
| `.streak-garden-page .sg-game-compact` | 16 |
| `#app .now-playing-panel` | 16 |
| `.friend-profile-avatar-wrap` | 16 |

## Changes made
- Moved 3,810 feature-scoped rules into sixteen feature stylesheets: 3,248 base rules from `style.css` and 562 polish/override rules from `polish.css`. The `base-*.css` files load immediately after the legacy base stylesheet; the feature override files load after legacy polish, preserving the two cascade layers.
- Kept mixed-scope and shared layout selectors in the legacy stylesheet.
- Preserved the relative order of rules within each extracted feature stylesheet and retained their enclosing media/supports conditions.
- Added each stylesheet to the HTML shell, preview build copy list, and service-worker precache.

## Follow-up required
The repeated selectors above must be reviewed against theme, breakpoint, and interaction states before consolidation. They were not blindly deleted: many are intentional cascade overrides. Browser visual regression coverage is required before changing their precedence.
