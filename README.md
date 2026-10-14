# ForexSignal AI Pro

A mobile-first, signal-only Forex analysis platform. It is designed to scan eight major pairs (EUR/USD, GBP/USD, USD/JPY, USD/CAD, AUD/USD, USD/CHF, NZD/USD, EUR/JPY) on 15m–4h timeframes, publish a signal only when every quality and safety rule passes, track outcomes from real candle data, and deliver alerts to Telegram on your Android phone. It never places trades or connects to a broker.

## Current status

The full product surface is live and clickable: homepage, dashboard, manual scanner, screenshot upload, signals, history, performance, settings and help. Screens currently run on **clearly labelled preview data** (`src/lib/fixtures.ts`) and every integration shows **SETUP REQUIRED** until it is connected. The roadmap in [PLAN.md](./PLAN.md) covers the analysis engine, database, market-data feed, auth, scheduled scanner, Telegram delivery, lifecycle tracking, backtesting and vision analysis.

## Tech

- TanStack Start (React 19, TypeScript, file-based routing) on Netlify
- Tailwind CSS 4, IBM Plex Sans/Mono
- TradingView Lightweight Charts for candlesticks
- Planned: Netlify Functions + Scheduled Functions, Netlify Database (Postgres), Twelve Data, Telegram Bot API, Netlify AI Gateway for vision

## Run locally

```bash
pnpm install
netlify dev        # or: pnpm dev
```

## Credentials you will need

See `.env.example`. Set values in Netlify → Project configuration → Environment variables — never in frontend code.

| Variable | Purpose |
|---|---|
| `TWELVE_DATA_API_KEY` | Real OHLC candles (free tier: 8 req/min, 800/day) |
| `TELEGRAM_BOT_TOKEN` | Bot created with @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Verifies Telegram webhook calls |
| `SCANNER_SECRET` | Protects manual/admin scan endpoints |

The database is provisioned automatically by Netlify; vision analysis uses Netlify AI Gateway (no key).

## Android setup

1. Open the site in Chrome → ⋮ → **Add to Home screen**.
2. Once the bot token is configured: Settings → **Link Telegram** → press Start in Telegram.
3. Tap **Send test**, close the app, and confirm the alert arrives.

## Roadmap

See [PLAN.md](./PLAN.md). Next up: the deterministic analysis engine with a full test suite, then the database and live market-data feed.

> Trading Forex carries a high risk of loss. Quality scores are rule points, not win probabilities.
