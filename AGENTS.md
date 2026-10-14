# AGENTS.md

ForexSignal AI Pro — a signal-only Forex analysis platform (TanStack Start on Netlify). **Read `PLAN.md` first and continue from the next unchecked milestone.**

## Architecture

| Layer | Technology |
|---|---|
| Framework | TanStack Start, React 19, TanStack Router (file-based) |
| Styling | Tailwind CSS 4 with theme tokens in `src/styles.css` (`ink-*`, `signal-cyan`, `bull`, `bear`, `warn`) |
| Charts | `lightweight-charts` v5, loaded via dynamic import in `CandleChart` (client-only) |
| Build/deploy | Vite 7 + `@netlify/vite-plugin-tanstack-start` |

## Key files

```
src/
  lib/
    instruments.ts   # REAL contract specs (pip/tick size, digits). Add XAU/USD here.
    indicators.ts    # REAL pure EMA / RSI (Wilder) / ATR (Wilder) maths
    fixtures.ts      # ALL preview data: seeded sample candles, preview scan, sample signals,
                     # strategy qualifications (all UNVERIFIED, no stats), integration states
    settings.ts      # user prefs (localStorage for now) + sanitize() enforcing safety floors
    format.ts        # price/pip/time formatting, cn()
  components/
    AppShell.tsx     # sidebar (desktop) + bottom nav (mobile) + market clock
    ui.tsx           # Panel, Stat, pills (PreviewBadge, SetupRequired, StatePill…), Select
    CandleChart.tsx  # candles + EMA overlays + entry/SL/TP price lines
    SignalCard.tsx   # signal card, LevelsTable, ScoreBreakdown
  routes/
    index.tsx        # marketing homepage (no app shell)
    _app.tsx         # pathless layout → AppShell
    _app.{dashboard,scan,screenshot,signals,history,performance,settings,help}.tsx
```

## Non-negotiable product rules

- Never fabricate live prices, signals, AI analysis or performance. Anything sample must show `<PreviewBadge />`; anything unconnected must show `<SetupRequired />`.
- Performance stats render "—" until computed from stored evidence. Strategies stay UNVERIFIED until ≥100 out-of-sample signals and positive expectancy after costs.
- Score = quality points (20/20/15/15/15/15), never a win probability. Min score floor is 80 (`MIN_QUALITY_FLOOR`) — users may raise, never lower.
- Signals are immutable once published; status changes are appended as events.
- Secrets live only in server-side env vars (see `.env.example`). No `VITE_` secrets.
- Signal-only: never integrate order placement.

## Conventions

- `@/` alias → `src/`. Components PascalCase, utils camelCase.
- Use `.num` class for all prices/numbers (tabular mono).
- Format prices with `fmtPrice(symbol, price)` so JPY pairs get 3 decimals.
- Times: pass `settings.timezone` to `fmtTime` (default `UTC` keeps SSR/CSR in sync).
- When replacing preview data, swap the `fixtures.ts` export for a real API call and remove the PreviewBadge on that screen.
- Persistence: use Netlify Database (Drizzle, `db/schema.ts`) unless the owner chooses Supabase (open decision in PLAN.md M3).
