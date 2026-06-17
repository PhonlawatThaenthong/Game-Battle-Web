# ⚔️ Battle Hub — Group 3

Head-to-head preference picker. Two items show side by side, you pick the one you like more, the winner advances. Repeat single-elimination style until one champion remains.

Three battle modes share the same engine:

| Mode | Page | Items | Media source |
|------|------|-------|--------------|
| ⚔️ Anime Battle | `anime-battle.html` | Anime titles | Jikan (MyAnimeList) cover art + YouTube trailer |
| 🎮 Game Battle | `game-battle.html` | Video games | YouTube trailer |
| 🎵 Song Battle | `song-battle.html` | Songs | iTunes cover art + YouTube music video |

UI is Thai (`lang="th"`).

## Run

Pure static HTML/CSS/JS — no build, no dependencies. Serve the folder over HTTP (needed for `fetch` and Web Crypto):

```bash
# any static server, e.g.
python -m http.server 8000
```

Open `http://localhost:8000/hub.html` — the landing page that links to each battle.

Opening files via `file://` will break external API calls; use a server.

## Structure

```
hub.html            landing page, links to the 3 battles
index.html          anime battle (alias / entry)
anime-battle.html   loads js/anime-data.js
game-battle.html    loads js/game-data.js
song-battle.html    loads js/song-data.js
css/style.css       shared battle-screen styles
js/
  anime-data.js     anime list (GAME_ID/GAME_LABEL + ANIME[])
  game-data.js      game list
  song-data.js      song list
  game.js           core engine: bracket, image/trailer fetch, YouTube player
  ui.js             panel rendering + animations
  dashboard.js      win/championship history (localStorage)
  settings.js       trailer volume + UI prefs
  auth.js           admin gate (SHA-256) for managing API keys
```

Each battle page loads one `*-data.js` (the item list) plus the shared scripts. The data file defines `GAME_ID`, `GAME_LABEL`, `GAME_SUB`, `ITEM_TYPE`, and the `ANIME[]` array (named `ANIME` in every mode for engine reuse).

## How it works

- **Bracket** — items shuffled, fought pairwise; winner of each pick advances round by round until a champion (`js/game.js`).
- **Media** — covers fetched on demand from Jikan (anime) / iTunes (songs) and cached. Trailers/MVs pulled from the YouTube Data API and played via the IFrame Player.
- **YouTube key rotation** — `js/game.js` ships default API keys and rotates across them; extra keys can be added via the admin panel and stored in `localStorage`.
- **History** — wins and championships per item persisted in `localStorage` (`<GAME_ID>_history`, `<GAME_ID>_meta`) and shown on the dashboard.
- **Admin** — `js/auth.js` gates the API-key manager behind a SHA-256 password check.

## Add / edit items

Edit the relevant `js/*-data.js` and add to the `ANIME` array:

```js
{ title:"Item Name", jp:"subtitle / artist / JP title", genre:"TAG · TAG" }
```

`title` is used for the cover/trailer lookup; `jp` and `genre` are display only.

## Notes

- External APIs (Jikan, iTunes, YouTube) need internet; rate limits apply (Jikan is throttled to ~600ms between calls in code).
- Bundled YouTube keys are quota-limited and shared — add your own in the admin panel for heavy use.
