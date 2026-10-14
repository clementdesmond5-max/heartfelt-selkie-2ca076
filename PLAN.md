# ForexSignal AI Pro — Product Roadmap

ForexSignal AI Pro is a signal-only Forex analysis platform: it scans real candle data on a schedule, publishes setups only when every quality and safety rule passes, tracks outcomes honestly, and pushes alerts to Telegram. It never places trades.

Each milestone is a self-contained piece of work that leaves the product deployable.

## ✅ Milestone 1 — Product surface (done)

Branded, mobile-first UI for every core screen, running on clearly labelled preview data from `src/lib/fixtures.ts`:

- Homepage, dashboard (market overview, candlestick chart with EMA 20/50/200, active signals, scanner and integration status)
- Manual scanner with SCAN MARKET, step-by-step pipeline, quality/safety checklist, score breakdown and NO VALID SETUP outcome
- Screenshot upload page (gallery picker, validation; analysis shows SETUP REQUIRED)
- Signals (active / completed / expired), signal history with filters, performance & strategy qualification (empty until evidence exists)
- Settings (pairs, timeframes, interval, min score ≥ 80, alert types, sessions, timezone, position-size calculator) stored locally
- Help & setup with credential instructions; PWA manifest
- Real instrument specs (`src/lib/instruments.ts`) and core EMA/RSI/ATR maths (`src/lib/indicators.ts`)

## Milestone 2 — Analysis engine + tests

- Move the engine to `src/engine/` as pure, framework-free modules shared by UI and functions
- Indicators: EMA, RSI 14, MACD, ATR 14 (already started), divergence
- Structure: confirmed swings (N-bar fractal, closed candles only), HH/HL/LH/LL, BOS, CHoCH, liquidity sweeps, S/R clustering, breakout-and-retest
- Strategies: EMA Trend Pullback, BOS Breakout & Retest, Liquidity Sweep Reversal
- Scoring (20/20/15/15/15/15) and level builder: tick rounding, JPY pip conventions, SL beyond structure + ATR buffer + spread, TP1 ≥ 1.5R, ordered targets, direction sanity
- Safety filters: stale/missing data, insufficient history, market closed, volatility limits, contradictory structure, entry distance, spread share, indicator conflict
- Vitest suite with fixed reference datasets for every indicator and rule

## Milestone 3 — Database & market data

- **Decision to confirm:** Netlify Database (managed Postgres, provisioned automatically, Drizzle ORM) is the default since it ships with the hosting; Supabase can be used instead if preferred
- Schema + migrations: profiles, notification_preferences, monitored_instruments, strategy_configs, scan_logs, signals (immutable), signal_events, notification_deliveries, backtest_runs, strategy_validations
- Twelve Data client: closed-candle fetching, completeness/recency checks, request budgeting (8/min, 800/day), caching, retry with backoff
- `/api/scan` endpoint for manual scans (auth + rate limit), replacing `runPreviewScan`
- Dashboard quotes and charts switch to real data; remove preview fixtures screen by screen

## Milestone 4 — Authentication & per-user settings

- Login / registration (Netlify Identity, or Supabase Auth if chosen in M3)
- Settings persisted to the profile; server-side enforcement of the 80-point floor
- Row-level access: users only read their own preferences and deliveries; signals readable by all signed-in users; admin-only routes

## Milestone 5 — Automatic scanner

- Netlify Scheduled Function every 5 minutes (supported; 30 s execution limit) that enqueues a background function for the heavy scan
- Processes only newly closed candles per pair/timeframe, honouring the free-tier request budget (fewer pairs/TFs per tick if needed)
- Duplicate prevention via unique key (pair, TF, strategy, direction, setup candle)
- Scan logs, last successful run, error tracking, stale-feed detection

## Milestone 6 — Telegram delivery

- Bot webhook with secret verification; one-time link codes from Settings; test message
- Messages for new signal, entry triggered, TP1/2/3, SL, expiry, invalidation, scanner outage
- Delivery log with idempotency keys; retry on transient errors

## Milestone 7 — Signal lifecycle tracking

- Scheduled tracker resolving pending → triggered → TP/SL/expired/invalidated from real candles
- Same-candle TP/SL ambiguity marked UNRESOLVED and scored as a loss
- Append-only `signal_events`; signals never edited after publication

## Milestone 8 — Backtesting & strategy qualification

- Walk-forward backtester (no look-ahead, modelled spread + commission), selection vs. out-of-sample split
- Metrics: win rate, expectancy, profit factor, max drawdown, realised R
- VERIFIED only with ≥ 100 OOS signals per strategy/TF and positive expectancy; periodic revalidation and auto-SUSPEND
- Performance page fed from stored evidence; backtests and live tracking kept separate

## Milestone 9 — Screenshot analysis

- Vision model via Netlify AI Gateway with a structured response (instrument, TF, trend, zones, readable levels, clarity flag)
- "Request a clearer image" path; any setup re-validated against live candles before becoming a signal

## Milestone 10 — Hardening & launch

- Service worker for offline shell; economic calendar filter if a reliable source is configured
- End-to-end verification checklist (real candles fetched, indicators correct, invalid setups rejected, scheduled runs logged, signals persisted, Telegram received with site closed, secrets server-side only)
- Deployment checklist in README
