import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { SignalCard } from '@/components/SignalCard'
import { PageHeader, PreviewBadge } from '@/components/ui'
import { getPreviewSignals, type SignalState } from '@/lib/fixtures'
import { cn } from '@/lib/format'
import { useSettings } from '@/lib/settings'

export const Route = createFileRoute('/_app/signals')({
  component: SignalsPage,
})

const TABS: { id: string; label: string; states: SignalState[] }[] = [
  { id: 'active', label: 'Active', states: ['PENDING', 'TRIGGERED'] },
  { id: 'completed', label: 'Completed', states: ['TP1', 'TP2', 'TP3', 'SL', 'UNRESOLVED'] },
  { id: 'expired', label: 'Expired & invalidated', states: ['EXPIRED', 'INVALIDATED'] },
]

function SignalsPage() {
  const { settings } = useSettings()
  const [tab, setTab] = useState('active')
  const all = useMemo(getPreviewSignals, [])
  const states = TABS.find((t) => t.id === tab)!.states
  const list = all.filter((s) => states.includes(s.state))

  return (
    <>
      <PageHeader
        title="Signals"
        subtitle="Every published signal keeps its original prices and timestamps. Status changes are recorded as events, never edits."
        right={<PreviewBadge />}
      />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-ink-700/70 bg-ink-900 p-1">
        {TABS.map((t) => {
          const n = all.filter((s) => t.states.includes(s.state)).length
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'whitespace-nowrap rounded-md px-3.5 py-2 text-sm transition-colors',
                tab === t.id ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:text-ink-100',
              )}
            >
              {t.label} <span className="num ml-1 text-ink-400">{n}</span>
            </button>
          )
        })}
      </div>
      {list.length === 0 ? (
        <div className="panel p-10 text-center text-sm text-ink-400">Nothing here yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => <SignalCard key={s.id} s={s} timeZone={settings.timezone} />)}
        </div>
      )}
    </>
  )
}
