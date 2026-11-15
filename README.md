# Aurum Exchange — Telegram Mini App

Crypto ↔ fiat exchange storefront for Telegram. Static site, no build step.

## Run locally

```bash
python -m http.server 5173
```

Open http://localhost:5173 (use the browser's mobile view).

## Configure

Everything client-specific lives in `js/config.js`:

| Field | What it does |
|---|---|
| `brand.name` | Name in the header and page title |
| `operator` | Operator's Telegram username (without `@`) — orders go there |
| `marginPercent` | Service fee on top of market rate |
| `minOrderUsd` | Minimum order in USD equivalent |
| `crypto`, `fiat` | Currencies, networks, payment methods, banks |

Texts for all 8 languages are in `js/i18n.js`. Translations other than EN/RU should be proofread by a native speaker.

## Connect to a bot

1. Host the folder on any HTTPS hosting (GitHub Pages, Vercel, Netlify, Cloudflare Pages).
2. In @BotFather: `/mybots` → your bot → **Bot Settings → Menu Button** → paste the HTTPS URL.
   Optionally `/newapp` to get a direct `t.me/<bot>/<app>` link.
3. Open the bot in Telegram and tap the menu button.

## How an order reaches the operator

"Send to operator" copies the order text to the clipboard and opens `t.me/<operator>?text=<order>`.
If a Telegram client does not pre-fill the text, the user pastes it — it is already copied.
For automatic delivery to an operators' group, a small bot backend is needed (next stage).
