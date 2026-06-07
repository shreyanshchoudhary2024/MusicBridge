# MusicBridge 🎵

> Transfer your Spotify library to Apple Music or YouTube Music — free, open source, no account needed.

## What it does

- Transfers playlists, liked songs from Spotify → Apple Music / YouTube Music
- **ISRC-first matching** — songs matched by universal ID before fuzzy search
- **Conflict resolution UI** — unmatched tracks shown, never silently dropped
- **Transfer report** with CSV export
- Results cached in localStorage — no backend, no database, $0 cost

## Competitors vs MusicBridge

| Feature | Soundiiz | TuneMyMusic | MusicBridge |
|---|---|---|---|
| Price | $4.99/mo | $4/mo | **Free** |
| Playlist limit | 1 free | Limited | **Unlimited** |
| Open source | ❌ | ❌ | ✅ |
| ISRC matching | ❌ | ❌ | ✅ |

## Tech stack

React 18 + TypeScript · Tailwind CSS v4 · Vite · Spotify Web API (PKCE) · localStorage

## Getting started

### 1. Clone & install
```bash
git clone https://github.com/yourusername/musicbridge.git
cd musicbridge
npm install
```

### 2. Create a Spotify app
1. Go to https://developer.spotify.com/dashboard
2. Create an app
3. Add `http://localhost:5173/callback` to Redirect URIs
4. Copy your Client ID

### 3. Configure env
```bash
cp .env.example .env
# Edit .env and paste your Client ID
```

### 4. Run
```bash
npm run dev
# Open http://localhost:5173
```

## Deploy free on Vercel
```bash
npx vercel
```
Add env vars in Vercel dashboard. Update Spotify redirect URI to your Vercel URL.

## Project structure
```
src/
├── types/         # TypeScript interfaces
├── lib/
│   ├── spotify.ts     # OAuth PKCE + API calls
│   ├── matcher.ts     # ISRC-first matching engine
│   └── storage.ts     # localStorage persistence
└── pages/
    ├── LandingPage.tsx
    ├── CallbackPage.tsx
    └── DashboardPage.tsx
```

## Roadmap
- [x] v0.1 — Spotify auth, playlist fetch, matching engine, results UI
- [ ] v0.2 — Apple Music MusicKit JS (actual track push)
- [ ] v0.3 — YouTube Music (unofficial API)
- [ ] v0.4 — Manual conflict resolution (pick from candidates)
- [ ] v0.5 — Sync mode

## License
MIT
