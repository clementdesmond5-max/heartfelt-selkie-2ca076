import { createFileRoute } from '@tanstack/react-router'
import { FlaskConical, LineChart } from 'lucide-react'
import { useMemo } from 'react'
import { PageHeader, Panel, Stat, StrategyPill } from '@/components/ui'
import { getStrategyQualifications, STRATEGIES } from '@/lib/fixtures'

export const Route = createFileRoute('/_app/performance')({
  component: PerformancePage,
})

const RULES = [
  'At least 100 completed out-of-sample signals per strategy and timeframe',
  'Positive expectancy after modelled spread and commission',
  'Chronological walk-forward: selection data never overlaps validation data',
  'No look-ahead — each decision uses only candles closed at that time',
  'Win rate ≥ 60% is reported only once the sample threshold is met',
  'Revalidated as new signals close; strategies that fail are SUSPENDED',
]

const dash = (v: number | null, f: (n: number) => string) => (v == null ? '—' : f(v))

function PerformancePage() {
  const rows = useMemo(getStrategyQualifications, [])

  return (
    <>
      <PageHeader
        title="Performance"
        subtitle="All statistics are calculated from stored evidence. Live signal tracking and simulated backtests are kept strictly separate."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={<span className="flex items-center gap-2"><LineChart size={14} /> Live signal tracking</span>}>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Issued" value="0" />
            <Stat label="Closed" value="0" />
            <Stat label="Win rate" value="—" />
            <Stat label="Avg R realised" value="—" />
            <Stat label="Expectancy" value="—" hint="after costs" />
            <Stat label="Max drawdown" value="—" />
          </div>
          <p className="mt-4 rounded-lg border border-ink-700/70 bg-ink-850 p-3 text-xs leading-relaxed text-ink-400">
            No live signals have closed yet. Results by instrument, timeframe and strategy appear here as the automatic scanner publishes and resolves signals.
          </p>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><FlaskConical size={14} /> Simulated backtests</span>}>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Runs" value="0" />
            <Stat label="OOS trades" value="0" />
            <Stat label="Profit factor" value="—" />
          </div>
          <p className="mt-4 rounded-lg border border-ink-700/70 bg-ink-850 p-3 text-xs leading-relaxed text-ink-400">
            Backtests run on historical candles from the market-data feed. Simulated results are labelled as such and never mixed with live tracking.
          </p>
        </Panel>
      </div>

      <Panel className="mt-5" title="Strategy qualification" bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="label border-b border-ink-800 text-left">
                <th className="px-4 py-3 font-medium">Strategy</th>
                <th className="px-2 py-3 font-medium">TF</th>
                <th className="px-2 py-3 font-medium">OOS evidence</th>
                <th className="px-2 py-3 text-right font-medium">Win rate</th>
                <th className="px-2 py-3 text-right font-medium">Expectancy</th>
                <th className="px-2 py-3 text-right font-medium">PF</th>
                <th className="px-2 py-3 text-right font-medium">Max DD</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.strategy + r.timeframe} className="border-b border-ink-800/60 last:border-0">
                  <td className="px-4 py-2.5 text-ink-100">{r.strategy}</td>
                  <td className="num px-2 py-2.5 text-ink-400">{r.timeframe}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-800">
                        <div className="h-full bg-signal-blue" style={{ width: `${Math.min(100, (r.oosClosed / r.oosRequired) * 100)}%` }} />
                      </div>
                      <span className="num text-xs text-ink-400">{r.oosClosed}/{r.oosRequired}</span>
                    </div>
                  </td>
                  <td className="num px-2 py-2.5 text-right">{dash(r.winRate, (n) => `${n.toFixed(1)}%`)}</td>
                  <td className="num px-2 py-2.5 text-right">{dash(r.expectancyR, (n) => `${n.toFixed(2)}R`)}</td>
                  <td className="num px-2 py-2.5 text-right">{dash(r.profitFactor, (n) => n.toFixed(2))}</td>
                  <td className="num px-2 py-2.5 text-right">{dash(r.maxDrawdownR, (n) => `${n.toFixed(1)}R`)}</td>
                  <td className="px-4 py-2.5 text-right"><StrategyPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Qualification rules">
          <ul className="space-y-2 text-sm text-ink-300">
            {RULES.map((r) => (
              <li key={r} className="flex gap-2"><span className="text-signal-cyan">›</span>{r}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ink-400">
            The 60–80% win-rate band is a research target, not a promise. Strategies stay UNVERIFIED — and their signals are never sent as verified alerts — until the evidence supports them.
          </p>
        </Panel>
        <Panel title="Strategies">
          <ul className="space-y-3">
            {STRATEGIES.map((s) => (
              <li key={s.id}>
                <div className="text-sm font-medium text-ink-100">{s.name}</div>
                <div className="text-xs leading-relaxed text-ink-400">{s.summary}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
