import { createFileRoute } from '@tanstack/react-router'
import { Check, Loader2, Radar, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CandleChart, ChartLegend } from '@/components/CandleChart'
import { LevelsTable, ScoreBreakdown } from '@/components/SignalCard'
import { DirectionTag, LiveBadge, PageHeader, Panel, Select, Stat, StrategyPill } from '@/components/ui'
import type { Analysis } from '@/engine/analyze'
import { cn, fmtPrice, fmtTime } from '@/lib/format'
import { INSTRUMENTS, TIMEFRAMES, type Timeframe } from '@/lib/instruments'
import { MARKET_PROVIDER, scanMarket, type LiveScan } from '@/lib/market'
import { useSettings } from '@/lib/settings'

export const Route = createFileRoute('/_app/scan')({
  component: ScanPage,
})

const STEPS = [
  'Retrieve market candles',
  'Verify candles are complete & recent',
  'Calculate EMA, RSI, ATR',
  'Determine trend & structure',
  'Locate support & resistance',
  'Identify setup & entry zone',
  'Calculate stop-loss & targets',
  'Run quality & safety checks',
]

function ScanPage() {
  const { settings } = useSettings()
  const [symbol, setSymbol] = useState('EUR/USD')
  const [tf, setTf] = useState<Timeframe>('H1')
  const [step, setStep] = useState(-1)
  const [result, setResult] = useState<LiveScan | null>(null)
  const [pending, setPending] = useState<LiveScan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const run = useRef(0)
  const scanning = step >= 0 && (step < STEPS.length || !pending) && !error

  useEffect(() => () => clearInterval(timer.current), [])
  useEffect(() => {
    if (step < STEPS.length || !pending) return
    clearInterval(timer.current)
    setResult(pending)
  }, [step, pending])

  const reset = () => {
    run.current++
    clearInterval(timer.current)
    setResult(null)
    setPending(null)
    setError(null)
    setStep(-1)
  }

  const scan = () => {
    reset()
    const id = run.current
    setStep(0)
    // Step animation runs alongside the real request; the result shows once both finish.
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length)), 180)
    scanMarket({ data: { symbol, timeframe: tf, minScore: settings.minScore } })
      .then((r) => id === run.current && setPending(r))
      .catch((e: unknown) => {
        if (id !== run.current) return
        clearInterval(timer.current)
        setError(e instanceof Error ? e.message : 'Market data unavailable')
      })
  }

  // ── Sweep of all monitored pairs (on demand, a few requests at a time) ──
  const [sweep, setSweep] = useState<Analysis[]>([])
  const [sweepTf, setSweepTf] = useState<Timeframe>('H1')
  const [sweeping, setSweeping] = useState(false)
  const [sweepAt, setSweepAt] = useState<string | null>(null)
  const runSweep = async () => {
    setSweeping(true)
    setSweep([])
    const pairs = settings.pairs.length ? settings.pairs : INSTRUMENTS.filter((i) => i.enabledByDefault).map((i) => i.symbol)
    const out: Analysis[] = []
    for (let i = 0; i < pairs.length; i += 4) {
      const batch = await Promise.all(
        pairs.slice(i, i + 4).map((p) =>
          scanMarket({ data: { symbol: p, timeframe: sweepTf, minScore: settings.minScore } }).then((r) => r.analysis).catch(() => null),
        ),
      )
      out.push(...batch.filter((a): a is Analysis => !!a))
      setSweep([...out])
    }
    setSweepAt(new Date().toISOString())
    setSweeping(false)
  }

  return (
    <>
      <PageHeader
        title="Manual scanner"
        subtitle="Runs the same rule set as the automatic scanner. A signal appears only when every quality and safety check passes."
        right={<LiveBadge />}
      />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Panel title="Scan parameters">
          <div className="space-y-4">
            <Select label="Instrument" value={symbol} onChange={(v) => { setSymbol(v); reset() }} options={INSTRUMENTS.map((i) => ({ value: i.symbol, label: i.symbol }))} />
            <div>
              <span className="label">Timeframe</span>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {TIMEFRAMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTf(t.id); reset() }}
                    className={cn('num rounded-lg border py-2.5 text-sm', tf === t.id ? 'border-signal-cyan bg-signal-cyan/10 text-signal-cyan' : 'border-ink-700 text-ink-300')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-xs text-ink-400">
              <span>Minimum quality</span>
              <span className="num text-ink-100">{settings.minScore}/100</span>
            </div>
            <button
              onClick={scan}
              disabled={scanning}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-signal-cyan py-3.5 text-sm font-bold tracking-wider text-ink-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {scanning ? <Loader2 size={18} className="animate-spin" /> : <Radar size={18} />}
              {scanning ? 'SCANNING…' : 'SCAN MARKET'}
            </button>
          </div>

          {step >= 0 && (
            <ol className="mt-5 space-y-2 border-t border-ink-800 pt-4">
              {STEPS.map((s, i) => (
                <li key={s} className={cn('flex items-center gap-2.5 text-xs', i < step ? 'text-ink-300' : i === step ? 'text-signal-cyan' : 'text-ink-600')}>
                  {i < step ? <Check size={14} className="text-bull" /> : i === step ? <Loader2 size={14} className="animate-spin" /> : <span className="h-3.5 w-3.5 rounded-full border border-ink-700" />}
                  {s}
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <div className="min-w-0 space-y-5">
          {!result && !scanning && !error && (
            <div className="panel grid-bg flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <Radar size={36} className="text-ink-600" />
              <p className="mt-3 max-w-sm text-sm text-ink-400">Choose an instrument and timeframe, then tap <span className="font-semibold text-ink-100">SCAN MARKET</span>.</p>
            </div>
          )}
          {error && (
            <div className="panel border-bear/40 p-5">
              <div className="text-sm font-bold tracking-widest text-bear">SCAN FAILED</div>
              <p className="mt-2 text-sm text-ink-300">Live candles could not be loaded ({error}). No signal is produced without fresh data — try again in a moment.</p>
            </div>
          )}
          {scanning && (
            <div className="panel flex min-h-[320px] items-center justify-center">
              <Loader2 size={32} className="animate-spin text-signal-cyan" />
            </div>
          )}
          {result && !result.analysis && (
            <div className="panel p-5 text-sm text-ink-400">No closed candles were returned for {symbol} on {tf}.</div>
          )}
          {result?.analysis && <ScanResultView live={result} r={result.analysis} timeZone={settings.timezone} />}
        </div>
      </div>

      <Panel
        className="mt-8"
        title="All monitored pairs"
        right={
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(['M30', 'H1', 'H4'] as Timeframe[]).map((t) => (
                <button key={t} disabled={sweeping} onClick={() => setSweepTf(t)} className={cn('num rounded px-2 py-1 text-xs', sweepTf === t ? 'bg-signal-cyan/15 text-signal-cyan' : 'text-ink-400 hover:text-ink-100')}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={runSweep} disabled={sweeping} className="inline-flex items-center gap-1.5 rounded-lg border border-signal-cyan/50 px-3 py-1.5 text-xs font-semibold text-signal-cyan hover:bg-signal-cyan/10 disabled:opacity-60">
              {sweeping ? <Loader2 size={13} className="animate-spin" /> : <Radar size={13} />}
              {sweeping ? `Scanning ${sweep.length}/${settings.pairs.length || '…'}` : 'Scan all'}
            </button>
          </div>
        }
        bodyClass="p-0"
      >
        {sweep.length === 0 && !sweeping ? (
          <p className="p-6 text-center text-sm text-ink-400">Tap <span className="font-semibold text-ink-100">Scan all</span> to run the live rule set across every pair enabled in Settings.</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="label border-b border-ink-800 text-left">
                <th className="px-4 py-2.5 font-medium">Pair</th>
                <th className="px-2 py-2.5 font-medium">TF</th>
                <th className="px-2 py-2.5 font-medium">Trend (V1)</th>
                <th className="px-2 py-2.5 font-medium">RSI</th>
                <th className="px-2 py-2.5 text-right font-medium">Score</th>
                <th className="px-4 py-2.5 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {sweep.map((r) => (
                <tr key={r.symbol + r.timeframe} className="border-b border-ink-800/60 last:border-0">
                  <td className="num px-4 py-2 text-ink-100">{r.symbol}</td>
                  <td className="num px-2 py-2 text-ink-400">{r.timeframe}</td>
                  <td className="px-2 py-2"><DirectionTag dir={r.v1.direction} /></td>
                  <td className="num px-2 py-2 text-ink-300">{r.indicators.rsi14?.toFixed(0) ?? '—'}</td>
                  <td className="num px-2 py-2 text-right text-ink-100">{r.score}</td>
                  <td className="px-4 py-2 text-right text-xs">
                    {r.decision !== 'NO_TRADE' ? <span className="font-semibold text-bull">QUALIFIED {r.decision}</span> : <span className="text-ink-400">No valid setup</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sweepAt && <p className="border-t border-ink-800 px-4 py-2 text-[11px] text-ink-400">Live {MARKET_PROVIDER} candles · scanned {fmtTime(sweepAt, settings.timezone)}</p>}
        </div>
        )}
      </Panel>
    </>
  )
}

function ScanResultView({ live, r, timeZone }: { live: LiveScan; r: Analysis; timeZone: string }) {
  const qualified = r.decision !== 'NO_TRADE'
  const px = (v: number | null) => (v == null ? '—' : fmtPrice(r.symbol, v))
  return (
    <div className="rise space-y-5">
      {qualified && r.levels ? (
        <div className="panel border-bull/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest text-bull">SETUP QUALIFIED</span>
              <DirectionTag dir={r.levels.direction} size="lg" />
              <span className="num text-sm text-ink-300">{r.symbol} · {r.timeframe}</span>
            </div>
            <StrategyPill status={r.strategyStatus} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">{r.explanation}</p>
          {r.strategyStatus !== 'VERIFIED' && (
            <p className="mt-2 text-xs text-warn">
              Technical conditions pass, but {r.strategy} has not completed out-of-sample validation — this would not be sent as a verified alert.
            </p>
          )}
        </div>
      ) : (
        <div className="panel border-ink-600 p-5">
          <div className="text-lg font-bold tracking-widest text-ink-100">NO VALID SETUP</div>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">{r.explanation} Nothing is published — waiting for better conditions is part of the strategy.</p>
        </div>
      )}

      <Panel title={`${r.symbol} · ${r.timeframe}`} right={<ChartLegend />} bodyClass="p-2 sm:p-4">
        <CandleChart candles={live.candles} symbol={r.symbol} levels={r.levels} height={320} />
        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-ink-800 px-2 pt-3 sm:grid-cols-4 sm:px-0">
          <Stat label="Last close" value={px(r.lastClose)} />
          <Stat label="EMA 20" value={px(r.indicators.ema20)} />
          <Stat label="EMA 200" value={px(r.indicators.ema200)} />
          <Stat label="Last closed candle" value={<span className="text-sm">{fmtTime(r.dataAsOf, timeZone)}</span>} hint={`${r.candlesUsed} candles · fetched ${fmtTime(live.fetchedAt, timeZone)}`} />
        </div>
        <p className="mt-3 px-2 text-[11px] text-ink-400 sm:px-0">
          Source: {live.provider}, closed candles only. {live.providerNote}
        </p>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Quality & safety checks">
          <ul className="space-y-2.5">
            {r.checks.map((c) => (
              <li key={c.id} className="flex gap-2.5">
                {c.pass ? <Check size={16} className="mt-0.5 shrink-0 text-bull" /> : <X size={16} className="mt-0.5 shrink-0 text-bear" />}
                <div>
                  <div className={cn('text-sm', c.pass ? 'text-ink-100' : 'text-bear')}>{c.label}</div>
                  <div className="num text-[11px] text-ink-400">{c.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="space-y-5">
          <Panel title="Score" right={<span className="num text-lg font-semibold text-signal-cyan">{r.score}/100</span>}>
            <ScoreBreakdown components={r.components} />
            <p className="mt-3 text-[11px] text-ink-400">Quality points, not a probability of winning.</p>
          </Panel>
          {r.levels && (
            <Panel title="Levels">
              <LevelsTable s={{ symbol: r.symbol, ...r.levels }} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
