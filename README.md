# The Diary Of Pearl Bipin

A personal, public, append-only diary that reads like an open physical book. Written once, never edited.

Live at **https://thediaryofpearlbipin.vercel.app**

## How to write

1. Open **https://thediaryofpearlbipin.vercel.app/write.html**
2. First visit only: paste a GitHub fine-grained token
   - Create it at https://github.com/settings/personal-access-tokens/new
   - Repository: `pearlbipin/TheDiaryOfPearlBipin`
   - Contents: **Read and write**
   - No expiration
3. Type your entry. Click **Write in diary**. Done.
   - Ctrl+Enter submits.
   - Vercel redeploys in ~20 seconds.

## How to erase

The write page (`/write.html`) has a "Manage entries" section. Click Erase on any entry, confirm, done. The words are gone; the page number remains.

## Files

- `index.html` — the book
- `write.html` — the pen (sole writer only)
- `entry.html` — per-entry SEO page (`/entry/<id>`)
- `data/entries.json` — source of truth (append-only)
- `scripts/build.js` — generates sitemap / RSS / `llms.txt` / per-entry `.txt` on deploy
- `vercel.json` — build + rewrite config

## Machine-readable outputs (regenerated on every deploy)

- `/sitemap.xml`
- `/rss.xml`
- `/llms.txt`
- `/entries/<id>.txt` — plain-text per-entry views for LLM / researcher extraction
- `/data/entries.json` — raw source of truth

## URLs

- Book: `/`
- Write: `/write.html`
- Per entry: `/entry/<id>`
- Plain text: `/entries/<id>.txt`
