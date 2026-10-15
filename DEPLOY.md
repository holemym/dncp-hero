# Deploy · דפוס העיר החדשה (for the chat that has Vercel)

**What:** repo `holemym/dncp-hero`, branch `main`. A static folder, no build step. Everything in it is client-facing and already clean (no comments, minified, noindex).
**Never edit it by hand:** it is generated from `holemym/clauderoom` → `dncp/hero/build.py` (sources in `dncp/site` and `dncp/pitch`). Fix there, rebuild, push.

## Routes
| URL | What |
|---|---|
| `/` | the hero alone (four-passes press), for quick sharing |
| `/home/` | the full homepage (`/home` redirects to `/home/`, needed for relative assets) |
| `/home-vprint/` | the homepage with the order planner and the file check (`/home-vprint` redirects to `/home-vprint/`) |
| `/befund` · `/en/befund` | Befund deck, Hebrew · English (10 slides) |
| `/vorschlag` · `/en/vorschlag` | the offer ("הצעה"), Hebrew · English (9 slides: packages A/B/C, monthly Google tiers, extras) |
`vercel.json` carries the redirect, the rewrites and `X-Robots-Tag: noindex, nofollow` on every path; `robots.txt` disallows all; `.vercelignore` keeps `*.md` and the licensed stock originals (`img/DTS_*`) out of the deployment.

## First deploy
1. Vercel → team **dvisionh** → Add New → Project → import `holemym/dncp-hero`.
2. Framework Preset **Other** · Build Command empty · Output Directory `.` · Root Directory default.
3. Deploy. Optional: Settings → Domains → rename to e.g. `dncp-hero.vercel.app`.
Or from a CLI with the repo cloned: `npx vercel deploy --prod --yes --scope dvisionh` in the repo root.
This repo holds only the deploy, so keeping it git-connected is fine (unlike clauderoom: never connect clauderoom to a Vercel project).

## Check after every deploy
- `curl -sI <url>/ | grep -i x-robots-tag` → `noindex, nofollow`
- `<url>/`, `<url>/home`, `<url>/home-vprint`, `<url>/befund`, `<url>/en/befund`, `<url>/vorschlag`, `<url>/en/vorschlag` → 200; `/home` → 307 to `/home/`
- `<url>/README.md` and `<url>/img/DTS_MISC_1_(NICK_FANCHER)_Nick_Fancher_Photos_ID10481.jpg` → 404
- In a browser: the press runs on scroll at `/`; the logos show at `/home/`; a deck opens on slide 1 and the EN switch keeps the slide.

## Then
Fill the links in `dncp/docs/OUTREACH.he.md` with the production URL (`{demo}` = `<url>/home/`, `{befund}` = `<url>/befund`) and log the URL in `dncp/HUB.md` and the BOARD row.
