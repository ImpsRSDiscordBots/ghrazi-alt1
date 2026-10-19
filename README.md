# Ghrazi Rotation — Alt1 app

Shows the rotation of the Ghrazi Blood Knight you tank, with the current step marked.
Light version: no hints. It follows the knights' lines in your RuneScape chatbox.
Built on the RuneScape Wiki rotation and in-game observations; no Jagex plugin API.

## Files
| File | What it does |
| --- | --- |
| `index.html` | The app window (layout + styles) |
| `app.js` | Reads the chatbox through Alt1 and draws the window |
| `rotation.js` | Rotation data and fight tracking (no Alt1 code) |
| `chat.js` | Turns a chat line into "which knight said what" |
| `appconfig.json` | Tells Alt1 the app's name, size and permission |
| `icon.png` | App icon |
| `tests.js` | `node tests.js` — 26 checks using real chat lines |

## Hosting (unlinked URL)
Upload the folder (without `tests.js` and this README if you like) to a path nobody
guesses, for example `https://impsrsdiscordbots.github.io/ghrazi-alt1/`.
Install link for friends (open it while Alt1 is running):

```
alt1://addapp/https://impsrsdiscordbots.github.io/ghrazi-alt1/appconfig.json
```
Anyone with the link can install it, so share it only in your own group.

## In game
- Chat **timestamps on**, and the chat with the knights' lines visible (Public/All).
- In Alt1 allow the app to **view the screen** (pixel permission).
- Pick **Vasily tank** or **Karmina tank**. The tracker starts by itself on Karmina's
  "Just give in. Join us." when someone walks up.
- Phase 3 has no chat line: press **P3**, then **I stay below** or **I'm at the heart**.
  Below, the first special shows which knight is still fighting.
- Phases 2, 4 and 5 switch by themselves on the knights' lines. The P-buttons are for
  correcting it by hand.

## If something doesn't work
- **"Alt1 chatbox library did not load"**: the two `<script>` lines at the bottom of
  `index.html` load Skillbert's `@alt1/base` and `@alt1/chatbox` from unpkg. If the
  file names in those packages differ, point the URLs at the right files (or host
  them next to the app).
- **Lines not picked up**: test with the box at the bottom of the window — paste a line
  from your chat. If that works but Alt1 doesn't, the chatbox reader isn't reading the
  knights' colours; that needs a tweak in `app.js` (reader colours).
