import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2, Radar } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CandleChart, ChartLegend } from '@/components/CandleChart'
import { SignalCard } from '@/components/SignalCard'
import {
  DirectionTag,
  IntegrationPill,
  LiveBadge,
  PageHeader,
  Panel,
  PreviewBadge,
  Select,
  SetupRequired,
  Sparkline,
  Stat,
} from '@/components/ui'
import { getPreviewSignals, INTEGRATIONS } from '@/lib/fixtures'
import { cn, fmtPrice, fmtTime } from '@/lib/format'
import { INSTRUMENTS, TIMEFRAMES, type Timeframe } from '@/lib/instruments'
import { getQuotes, MARKET_PROVIDER, scanMarket, type LiveScan, type Quote } from '@/lib/market'
import { useSettings } from '@/lib/settings'

const REFRESH_MS = 60_000

export const Route = createFileRoute('/_app/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { settings } = useSettings()
  const [symbol, setSymbol] = useState('EUR/USD')
  const [tf, setTf] = useState<Timeframe>('H1')
  const signals = useMemo(getPreviewSignals, [])
  const [quotes, setQuotes] = useState<Quote[] | null>(null)
  const [quotesAt, setQuotesAt] = useState<string | null>(null)
  const [live, setLive] = useState<LiveScan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pairsKey = settings.pairs.join(',')

  // Live quotes, refreshed every minute while the page is open.
  useEffect(() => {
    let alive = true
    const load = () =>
      getQuotes({ data: { symbols: settings.pairs } })
        .then((r) => { if (alive) { setQuotes(r.quotes); setQuotesAt(r.fetchedAt) } })
        .catch(() => alive && setQuotes((q) => q ?? []))
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => { alive = false; clearInterval(t) }
  }, [pairsKey])

  // Live candles + engine analysis for the selected market.
  useEffect(() => {
    let alive = true
    setLive(null)
    setError(null)
    const load = () =>
      scanMarket({ data: { symbol, timeframe: tf, minScore: settings.minScore } })
        .then((r) => { if (alive) { setLive(r); setError(null) } })
        .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Market data unavailable'))
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => { alive = false; clearInterval(t) }
  }, [symbol, tf, settings.minScore])

  const analysis = live?.analysis ?? null
  const qualified = !!analysis && analysis.decision !== 'NO_TRADE'
  const active = signals.filter((s) => s.state === 'PENDING' || s.state === 'TRIGGERED')
  const tz = settings.timezone

  return (
    <>
      <PageHeader
        title="Market dashboard"
        subtitle={<>Live overview of monitored markets from {MARKET_PROVIDER}{quotesAt ? <> · updated {fmtTime(quotesAt, tz)}</> : null}. Refreshes every minute.</>}
        right={
          <Link to="/scan" className="inline-flex items-center gap-2 rounded-lg bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-cyan-300">
            <Radar size={16} /> SCAN MARKET
          </Link>
        }
      />

      {/* Market overview */}
      <div className="-mx-4 mb-5 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 xl:grid-cols-8">
        {quotes === null && (
          <div className="panel col-span-full flex items-center gap-2 p-4 text-sm text-ink-400"><Loader2 size={16} className="animate-spin" /> Loading live prices…</div>
        )}
        {quotes?.length === 0 && (
          <div className="panel col-span-full p-4 text-sm text-ink-400">Live prices are temporarily unavailable. Retrying every minute.</div>
        )}
        {quotes?.map((q) => (
          <button
            key={q.symbol}
            onClick={() => setSymbol(q.symbol)}
            className={cn(
              'panel min-w-[150px] snap-start p-3 text-left transition-colors hover:border-ink-600 sm:min-w-0',
              q.symbol === symbol && '!border-signal-cyan/60 bg-signal-cyan/5',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="num text-xs font-medium text-ink-300">{q.symbol}</span>
              <DirectionTag dir={q.bias} />
            </div>
            <div className="num mt-1.5 text-base font-medium text-ink-100">{fmtPrice(q.symbol, q.price)}</div>
            <div className={cn('num text-[11px]', q.changePct >= 0 ? 'text-bull' : 'text-bear')}>
              {q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}% 24h
            </div>
            <Sparkline data={q.spark} up={q.changePct >= 0} />
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Panel
          title={<span className="flex items-center gap-2">{symbol} · {tf} <LiveBadge /></span>}
          right={
            <div className="flex gap-1">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTf(t.id)}
                  className={cn('num rounded px-2 py-1 text-xs', tf === t.id ? 'bg-signal-cyan/15 text-signal-cyan' : 'text-ink-400 hover:text-ink-100')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          }
          bodyClass="p-2 sm:p-4"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 sm:px-0">
            <ChartLegend />
            <div className="w-36 sm:hidden">
              <Select label="" value={symbol} onChange={setSymbol} options={INSTRUMENTS.map((i) => ({ value: i.symbol, label: i.symbol }))} />
            </div>
          </div>
          {error && !live ? (
            <div className="flex h-[360px] items-center justify-center p-6 text-center text-sm text-ink-400">Live candles could not be loaded ({error}). Retrying every minute.</div>
          ) : !live ? (
            <div className="flex h-[360px] items-center justify-center"><Loader2 size={28} className="animate-spin text-signal-cyan" /></div>
          ) : (
            <CandleChart candles={live.candles} symbol={symbol} levels={analysis?.levels} height={360} />
          )}
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-ink-800 px-2 pt-3 sm:grid-cols-5 sm:px-0">
            <Stat label="Trend (V1)" value={analysis ? <DirectionTag dir={analysis.v1.direction} /> : '—'} />
            <Stat label="RSI 14" value={analysis?.indicators.rsi14?.toFixed(1) ?? '—'} />
            <Stat label="ATR 14" value={analysis?.indicators.atr14 != null ? fmtPrice(symbol, analysis.indicators.atr14) : '—'} />
            <Stat label="Score" value={analysis ? `${analysis.score}/100` : '—'} />
            <Stat
              label="Setup"
              value={<span className={qualified ? 'text-bull' : 'text-ink-400'}>{analysis ? (qualified ? `Qualified ${analysis.decision}` : 'None') : '—'}</span>}
              hint={analysis ? `Last closed candle ${fmtTime(analysis.dataAsOf, tz)}` : undefined}
            />
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Automatic scanner" right={<SetupRequired />}>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Interval" value={`${settings.scannerIntervalMin} min`} />
              <Stat label="Last scan" value="—" hint="Not yet scheduled" />
              <Stat label="Pairs × TFs" value={`${settings.pairs.length} × ${settings.timeframes.length}`} />
              <Stat label="Errors (24h)" value="—" />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-400">
              The server-side scanner runs on a Netlify Scheduled Function once the market-data key is configured. It keeps working when this page and your phone are closed.
            </p>
          </Panel>

          <Panel title="Integrations">
            <ul className="space-y-3">
              {INTEGRATIONS.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-ink-100">{i.name}</div>
                    <div className="text-xs text-ink-400">{i.purpose}</div>
                  </div>
                  <IntegrationPill state={i.state} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">Active signals <span className="num text-ink-400">({active.length})</span> <PreviewBadge /></h2>
        <Link to="/signals" className="text-sm text-signal-cyan hover:underline">All signals →</Link>
      </div>
      {active.length === 0 ? (
        <div className="panel mt-3 p-8 text-center text-sm text-ink-400">No active signals. The scanner only publishes setups that pass every check.</div>
      ) : (
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((s) => <SignalCard key={s.id} s={s} timeZone={tz} />)}
        </div>
      )}
    </>
  )
}
