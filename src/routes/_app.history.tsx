import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { DirectionTag, PageHeader, Panel, PreviewBadge, Select, StatePill } from '@/components/ui'
import { getPreviewSignals, type SignalState } from '@/lib/fixtures'
import { fmtPrice, fmtTime } from '@/lib/format'
import { INSTRUMENTS, TIMEFRAMES } from '@/lib/instruments'
import { useSettings } from '@/lib/settings'

export const Route = createFileRoute('/_app/history')({
  component: HistoryPage,
})

const STATES: SignalState[] = ['PENDING', 'TRIGGERED', 'TP1', 'TP2', 'TP3', 'SL', 'INVALIDATED', 'EXPIRED', 'UNRESOLVED']

function HistoryPage() {
  const { settings } = useSettings()
  const all = useMemo(getPreviewSignals, [])
  const [pair, setPair] = useState('all')
  const [tf, setTf] = useState('all')
  const [state, setState] = useState('all')

  const rows = all
    .filter((s) => (pair === 'all' || s.symbol === pair) && (tf === 'all' || s.timeframe === tf) && (state === 'all' || s.state === state))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <>
      <PageHeader
        title="Signal history"
        subtitle="The complete, append-only record of issued live signals. Backtest trades never appear here."
        right={<PreviewBadge />}
      />
      <div className="mb-4 grid grid-cols-3 gap-3 sm:max-w-xl">
        <Select label="Pair" value={pair} onChange={setPair} options={[{ value: 'all', label: 'All' }, ...INSTRUMENTS.map((i) => ({ value: i.symbol, label: i.symbol }))]} />
        <Select label="Timeframe" value={tf} onChange={setTf} options={[{ value: 'all', label: 'All' }, ...TIMEFRAMES.map((t) => ({ value: t.id, label: t.id }))]} />
        <Select label="Status" value={state} onChange={setState} options={[{ value: 'all', label: 'All' }, ...STATES.map((s) => ({ value: s, label: s }))]} />
      </div>
      <Panel bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="label border-b border-ink-800 text-left">
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-2 py-3 font-medium">Pair</th>
                <th className="px-2 py-3 font-medium">Side</th>
                <th className="px-2 py-3 font-medium">TF</th>
                <th className="px-2 py-3 text-right font-medium">Entry</th>
                <th className="px-2 py-3 text-right font-medium">SL</th>
                <th className="px-2 py-3 text-right font-medium">TP1</th>
                <th className="px-2 py-3 text-right font-medium">Score</th>
                <th className="px-2 py-3 font-medium">Strategy</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850">
                  <td className="num px-4 py-2.5 text-xs text-ink-400">{fmtTime(s.createdAt, settings.timezone)}</td>
                  <td className="num px-2 py-2.5 text-ink-100">{s.symbol}</td>
                  <td className="px-2 py-2.5"><DirectionTag dir={s.direction} /></td>
                  <td className="num px-2 py-2.5 text-ink-400">{s.timeframe}</td>
                  <td className="num px-2 py-2.5 text-right">{fmtPrice(s.symbol, s.entry)}</td>
                  <td className="num px-2 py-2.5 text-right text-bear">{fmtPrice(s.symbol, s.sl)}</td>
                  <td className="num px-2 py-2.5 text-right text-bull">{fmtPrice(s.symbol, s.tp1)}</td>
                  <td className="num px-2 py-2.5 text-right">{s.score}</td>
                  <td className="px-2 py-2.5 text-xs text-ink-400">{s.strategy}</td>
                  <td className="px-4 py-2.5 text-right"><StatePill state={s.state} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-ink-400">No signals match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="mt-3 text-xs text-ink-400">
        When TP and SL fall inside the same candle and the order cannot be proven, the signal is marked Unresolved and counted as a loss.
      </p>
    </>
  )
}
