import { createFileRoute } from '@tanstack/react-router'
import { Check, Loader2, Radar, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CandleChart, ChartLegend } from '@/components/CandleChart'
import { LevelsTable, ScoreBreakdown } from '@/components/SignalCard'
import { DirectionTag, PageHeader, Panel, PreviewBadge, Select, Stat, StrategyPill } from '@/components/ui'
import { getPreviewCandles, runPreviewScan, type ScanResult } from '@/lib/fixtures'
import { cn, fmtPrice, fmtTime } from '@/lib/format'
import { INSTRUMENTS, TIMEFRAMES, type Timeframe } from '@/lib/instruments'
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
  const [result, setResult] = useState<ScanResult | null>(null)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const scanning = step >= 0 && step < STEPS.length

  useEffect(() => () => clearInterval(timer.current), [])
  useEffect(() => {
    if (step !== STEPS.length) return
    clearInterval(timer.current)
    setResult(runPreviewScan(symbol, tf, settings.minScore))
  }, [step, symbol, tf, settings.minScore])

  const reset = () => {
    clearInterval(timer.current)
    setResult(null)
    setStep(-1)
  }

  const scan = () => {
    setResult(null)
    setStep(0)
    clearInterval(timer.current)
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length)), 180)
  }

  const sweep = useMemo(
    () =>
      INSTRUMENTS.flatMap((i) =>
        (['M30', 'H1', 'H4'] as Timeframe[]).map((t) => runPreviewScan(i.symbol, t, settings.minScore)),
      ),
    [settings.minScore],
  )

  return (
    <>
      <PageHeader
        title="Manual scanner"
        subtitle="Runs the same rule set as the automatic scanner. A signal appears only when every quality and safety check passes."
        right={<PreviewBadge />}
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
          {!result && !scanning && (
            <div className="panel grid-bg flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <Radar size={36} className="text-ink-600" />
              <p className="mt-3 max-w-sm text-sm text-ink-400">Choose an instrument and timeframe, then tap <span className="font-semibold text-ink-100">SCAN MARKET</span>.</p>
            </div>
          )}
          {scanning && (
            <div className="panel flex min-h-[320px] items-center justify-center">
              <Loader2 size={32} className="animate-spin text-signal-cyan" />
            </div>
          )}
          {result && <ScanResultView r={result} timeZone={settings.timezone} />}
        </div>
      </div>

      <Panel className="mt-8" title={<span className="flex items-center gap-2">All pairs at a glance <PreviewBadge /></span>} bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="label border-b border-ink-800 text-left">
                <th className="px-4 py-2.5 font-medium">Pair</th>
                <th className="px-2 py-2.5 font-medium">TF</th>
                <th className="px-2 py-2.5 font-medium">Bias</th>
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
                  <td className="px-2 py-2"><DirectionTag dir={r.bias} /></td>
                  <td className="num px-2 py-2 text-ink-300">{r.indicators.rsi14.toFixed(0)}</td>
                  <td className="num px-2 py-2 text-right text-ink-100">{r.score}</td>
                  <td className="px-4 py-2 text-right text-xs">
                    {r.qualified ? <span className="font-semibold text-bull">QUALIFIED</span> : <span className="text-ink-400">No valid setup</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

function ScanResultView({ r, timeZone }: { r: ScanResult; timeZone: string }) {
  const candles = getPreviewCandles(r.symbol, r.timeframe)
  return (
    <div className="rise space-y-5">
      {r.qualified && r.levels ? (
        <div className="panel border-bull/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest text-bull">SETUP QUALIFIED</span>
              <DirectionTag dir={r.levels.direction} size="lg" />
              <span className="num text-sm text-ink-300">{r.symbol} · {r.timeframe}</span>
            </div>
            <div className="flex items-center gap-2"><StrategyPill status={r.strategyStatus} /><PreviewBadge /></div>
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
        <CandleChart candles={candles} symbol={r.symbol} levels={r.levels} height={320} />
        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-ink-800 px-2 pt-3 sm:grid-cols-4 sm:px-0">
          <Stat label="EMA 20" value={fmtPrice(r.symbol, r.indicators.ema20)} />
          <Stat label="EMA 50" value={fmtPrice(r.symbol, r.indicators.ema50)} />
          <Stat label="EMA 200" value={fmtPrice(r.symbol, r.indicators.ema200)} />
          <Stat label="Data as of" value={<span className="text-sm">{fmtTime(r.dataAsOf, timeZone)}</span>} hint={`${r.candlesUsed} candles`} />
        </div>
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
