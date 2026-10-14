import { createFileRoute, Link } from '@tanstack/react-router'
import { Radar } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CandleChart, ChartLegend } from '@/components/CandleChart'
import { SignalCard } from '@/components/SignalCard'
import {
  DirectionTag,
  IntegrationPill,
  PageHeader,
  Panel,
  PreviewBadge,
  Select,
  SetupRequired,
  Sparkline,
  Stat,
} from '@/components/ui'
import {
  getPreviewCandles,
  getPreviewQuotes,
  getPreviewSignals,
  INTEGRATIONS,
  PREVIEW_AS_OF,
  runPreviewScan,
} from '@/lib/fixtures'
import { cn, fmtPrice, fmtTime } from '@/lib/format'
import { INSTRUMENTS, TIMEFRAMES, type Timeframe } from '@/lib/instruments'
import { useSettings } from '@/lib/settings'

export const Route = createFileRoute('/_app/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { settings } = useSettings()
  const [symbol, setSymbol] = useState('EUR/USD')
  const [tf, setTf] = useState<Timeframe>('H1')
  const quotes = useMemo(getPreviewQuotes, [])
  const signals = useMemo(getPreviewSignals, [])
  const candles = useMemo(() => getPreviewCandles(symbol, tf), [symbol, tf])
  const analysis = useMemo(() => runPreviewScan(symbol, tf, settings.minScore), [symbol, tf, settings.minScore])
  const active = signals.filter((s) => s.state === 'PENDING' || s.state === 'TRIGGERED')
  const tz = settings.timezone

  return (
    <>
      <PageHeader
        title="Market dashboard"
        subtitle={<>Overview of monitored pairs, latest qualified signals and system health. Sample data as of {fmtTime(PREVIEW_AS_OF, tz)}.</>}
        right={
          <Link to="/scan" className="inline-flex items-center gap-2 rounded-lg bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-cyan-300">
            <Radar size={16} /> SCAN MARKET
          </Link>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-ink-300">
        <PreviewBadge className="mt-0.5 shrink-0" />
        <p>
          Prices, candles and signals on this screen are sample data for exploring the interface. Live data appears once the market-data feed is connected — see <Link to="/help" className="text-signal-cyan underline">Help & setup</Link>.
        </p>
      </div>

      {/* Market overview */}
      <div className="-mx-4 mb-5 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 xl:grid-cols-8">
        {quotes.map((q) => (
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
          title={<span className="flex items-center gap-2">{symbol} · {tf} <PreviewBadge /></span>}
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
          <CandleChart candles={candles} symbol={symbol} levels={analysis.levels} height={360} />
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-ink-800 px-2 pt-3 sm:grid-cols-5 sm:px-0">
            <Stat label="Bias" value={<DirectionTag dir={analysis.bias} />} />
            <Stat label="RSI 14" value={analysis.indicators.rsi14.toFixed(1)} />
            <Stat label="ATR 14" value={fmtPrice(symbol, analysis.indicators.atr14)} />
            <Stat label="Score" value={`${analysis.score}/100`} />
            <Stat label="Setup" value={<span className={analysis.qualified ? 'text-bull' : 'text-ink-400'}>{analysis.qualified ? 'Qualified' : 'None'}</span>} />
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
        <h2 className="text-lg font-semibold">Active signals <span className="num text-ink-400">({active.length})</span></h2>
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
