import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BellRing,
  Camera,
  CandlestickChart,
  FlaskConical,
  Radar,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { Logo } from '@/components/ui'

export const Route = createFileRoute('/')({
  component: Home,
})

const PIPELINE = [
  { n: '01', t: 'Fetch closed candles', d: 'Real OHLC data from a licensed feed. Stale or incomplete data is rejected before analysis starts.' },
  { n: '02', t: 'Compute indicators', d: 'EMA 20/50/200, RSI 14, MACD, ATR 14 — deterministic maths with automated tests.' },
  { n: '03', t: 'Read structure', d: 'Confirmed swings, BOS, CHoCH, liquidity sweeps, support/resistance and retests.' },
  { n: '04', t: 'Score the setup', d: 'Six weighted factors → 0–100 quality points. Default minimum is 80.' },
  { n: '05', t: 'Check the strategy', d: 'Only strategies with 100+ out-of-sample trades and positive expectancy are marked VERIFIED.' },
  { n: '06', t: 'Alert your phone', d: 'A scheduled scanner runs every 5 minutes on the server and sends Telegram alerts — browser closed or not.' },
]

const FEATURES = [
  { icon: Radar, t: 'Manual market scan', d: 'Tap SCAN MARKET on any pair and timeframe. You get a signal only if every check passes — otherwise NO VALID SETUP and the reasons why.' },
  { icon: CandlestickChart, t: 'Exact levels', d: 'Entry, stop-loss and three take-profits placed from structure and ATR, respecting JPY pip conventions and tick sizes.' },
  { icon: Camera, t: 'Screenshot analysis', d: 'Upload a chart from your gallery. Vision reads trend and zones; precise prices are always re-checked against real data.' },
  { icon: FlaskConical, t: 'Honest performance', d: 'Walk-forward backtests kept separate from live tracking. Ambiguous intrabar fills are scored conservatively.' },
  { icon: BellRing, t: 'Telegram delivery', d: 'New signals, entry triggers, TP/SL hits, expiries and scanner outages — de-duplicated and logged.' },
  { icon: ShieldCheck, t: 'Signal-only by design', d: 'No broker connection, no MT5 orders, no keys in the browser. You stay in control of every trade.' },
]

function TelegramMock() {
  return (
    <div className="relative mx-auto w-full max-w-[300px] rounded-[2rem] border border-ink-700 bg-ink-900 p-3 shadow-[0_30px_80px_-20px_rgb(34_211_238/0.25)]">
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-ink-700" />
      <div className="flex items-center gap-2 border-b border-ink-800 px-2 pb-2.5">
        <img src="/icon.svg" alt="" className="h-7 w-7" />
        <div>
          <div className="text-xs font-semibold text-ink-100">ForexSignal AI Pro</div>
          <div className="text-[10px] text-ink-400">bot</div>
        </div>
      </div>
      <div className="num mt-3 rounded-2xl rounded-tl-sm bg-ink-800 p-3 text-[11px] leading-relaxed text-ink-300">
        <div className="font-semibold text-ink-100">FOREXSIGNAL AI PRO — NEW SIGNAL</div>
        <div className="mt-2">Pair: EUR/USD</div>
        <div>Direction: <span className="text-bull">BUY</span></div>
        <div>Entry: 1.08520</div>
        <div>Stop Loss: <span className="text-bear">1.08220</span></div>
        <div>Take Profit 1: <span className="text-bull">1.08970</span></div>
        <div>Take Profit 2: <span className="text-bull">1.09120</span></div>
        <div>Take Profit 3: <span className="text-bull">1.09420</span></div>
        <div className="mt-2">Risk/Reward to TP1: 1:1.5</div>
        <div>Technical Score: 87/100</div>
        <div>Timeframe: H1</div>
        <div>Strategy: VERIFIED</div>
        <div className="mt-2 text-right text-[9px] text-ink-400">14:05</div>
      </div>
      <p className="mt-2 px-1 text-center text-[10px] text-ink-400">Example message format — illustrative numbers, not a live signal.</p>
    </div>
  )
}

function Home() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-ink-700/60 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link to="/help" className="hidden px-3 py-2 text-sm text-ink-300 hover:text-ink-100 sm:block">Setup guide</Link>
            <Link to="/dashboard" className="rounded-lg bg-signal-cyan px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-cyan-300">
              Open dashboard
            </Link>
          </nav>
        </div>
      </header>

      <section className="grid-bg relative overflow-hidden border-b border-ink-700/60">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-ink-950/40 to-ink-950" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr]">
          <div className="rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/30 bg-signal-cyan/5 px-3 py-1 text-xs text-signal-cyan">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-cyan pulse-dot" /> 8 majors · M15 to H4 · scanned every 5 minutes
            </span>
            <h1 className="mt-6 text-[2.4rem] font-semibold leading-[1.05] tracking-tight text-ink-100 sm:text-6xl">
              Forex signals you can <span className="text-signal-cyan">audit</span>, delivered to your phone.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg">
              ForexSignal AI Pro analyses real candle data with deterministic rules, publishes a signal only when every quality and safety check passes, and proves its track record with stored evidence — never invented win rates.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/scan" className="inline-flex items-center gap-2 rounded-lg bg-signal-cyan px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-cyan-300">
                <Radar size={17} /> Scan the market
              </Link>
              <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-ink-600 px-5 py-3 text-sm font-medium text-ink-100 hover:border-ink-400">
                View dashboard <ArrowRight size={16} />
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-ink-700/70 pt-6">
              <div><dt className="label">Min score</dt><dd className="num mt-1 text-xl text-ink-100">80<span className="text-ink-400">/100</span></dd></div>
              <div><dt className="label">Min R:R</dt><dd className="num mt-1 text-xl text-ink-100">1:1.5</dd></div>
              <div><dt className="label">Verified at</dt><dd className="num mt-1 text-xl text-ink-100">100+ <span className="text-sm text-ink-400">OOS</span></dd></div>
            </dl>
          </div>
          <TelegramMock />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="label text-signal-cyan">How a signal is made</div>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Six gates between raw candles and your phone.</h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-ink-700/70 bg-ink-700/70 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((p) => (
            <li key={p.n} className="bg-ink-900 p-5">
              <div className="num text-xs text-signal-cyan">{p.n}</div>
              <div className="mt-2 font-medium text-ink-100">{p.t}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{p.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-ink-700/60 bg-ink-900/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-ink-700/60 bg-ink-900 p-5">
              <Icon size={20} className="text-signal-cyan" />
              <div className="mt-3 font-medium text-ink-100">{t}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 rounded-2xl border border-ink-700/70 bg-gradient-to-br from-ink-900 to-ink-850 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Smartphone className="text-signal-cyan" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Built for Android first.</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              Install it to your home screen from Chrome, link Telegram in two taps, and let the server-side scanner do the watching. No Windows PC, MetaTrader terminal or VPS needed.
            </p>
          </div>
          <div className="rounded-xl border border-warn/30 bg-warn/5 p-5 text-sm leading-relaxed text-ink-300">
            <div className="label !text-warn">Risk notice</div>
            <p className="mt-2">
              Trading Forex carries a high risk of loss. Quality scores measure how many rules a setup satisfies, not the probability it wins. Past results — backtested or live — do not guarantee future performance.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-700/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-ink-400">
          <Logo compact />
          <span>Signal-only analysis platform. Not financial advice. Never places trades.</span>
        </div>
      </footer>
    </div>
  )
}
