import { createFileRoute } from '@tanstack/react-router'
import { Check, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader, Panel, Select, SetupRequired } from '@/components/ui'
import { cn, fmtPrice } from '@/lib/format'
import { getInstrument, INSTRUMENTS, TIMEFRAMES, type Timeframe } from '@/lib/instruments'
import { DEFAULT_SETTINGS, MIN_QUALITY_FLOOR, SCANNER_INTERVALS, useSettings, type Settings } from '@/lib/settings'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

const TIMEZONES = ['UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo', 'Asia/Singapore', 'Asia/Kolkata', 'Africa/Lagos', 'Africa/Johannesburg', 'Australia/Sydney']

const ALERTS: { key: keyof Settings['alerts']; label: string }[] = [
  { key: 'newSignal', label: 'New qualified signals' },
  { key: 'entryTriggered', label: 'Entry triggered' },
  { key: 'targets', label: 'Take-profit reached' },
  { key: 'stopLoss', label: 'Stop-loss reached' },
  { key: 'expiredInvalidated', label: 'Expired or invalidated setups' },
  { key: 'scannerHealth', label: 'Scanner outages & stale feeds' },
]

const SESSIONS: { key: keyof Settings['sessions']; label: string; hours: string }[] = [
  { key: 'sydney', label: 'Sydney', hours: '21:00–06:00' },
  { key: 'tokyo', label: 'Tokyo', hours: '00:00–09:00' },
  { key: 'london', label: 'London', hours: '07:00–16:00' },
  { key: 'newYork', label: 'New York', hours: '12:00–21:00' },
]

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 py-2 text-left">
      <span>
        <span className="block text-sm text-ink-100">{label}</span>
        {hint && <span className="num block text-[11px] text-ink-400">{hint}</span>}
      </span>
      <span role="switch" aria-checked={on} className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', on ? 'bg-signal-cyan' : 'bg-ink-700')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform', on ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </span>
    </button>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('num rounded-lg border px-3 py-2 text-sm transition-colors', on ? 'border-signal-cyan bg-signal-cyan/10 text-signal-cyan' : 'border-ink-700 text-ink-400')}
    >
      {children}
    </button>
  )
}

function SettingsPage() {
  const { settings, save, loaded } = useSettings()
  const [draft, setDraft] = useState<Settings>(settings)
  const [saved, setSaved] = useState(false)
  useEffect(() => { if (loaded) setDraft(settings) }, [loaded, settings])

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setDraft((d) => ({ ...d, [k]: v })); setSaved(false) }
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  // Educational position-size calculator.
  const [calcPair, setCalcPair] = useState('EUR/USD')
  const [stopPips, setStopPips] = useState(20)
  const inst = getInstrument(calcPair)
  const riskAmount = (draft.accountSize * draft.riskPct) / 100
  // Pip value per standard lot in account currency (USD). Exact for xxx/USD; approximated for others at a reference rate.
  const refRate: Record<string, number> = { 'USD/JPY': 149.2, 'EUR/JPY': 149.2, 'USD/CAD': 1.374, 'USD/CHF': 0.884 }
  const pipValuePerLot = inst.quote === 'USD' ? inst.pipSize * inst.contractSize : (inst.pipSize * inst.contractSize) / (refRate[calcPair] ?? 1)
  const lots = stopPips > 0 ? riskAmount / (stopPips * pipValuePerLot) : 0

  const submit = () => {
    save(draft)
    setSaved(true)
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Choose what the scanner watches and how you're alerted. Safety and data-validity checks can't be switched off."
        right={
          <button onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-cyan-300">
            {saved ? <><Check size={16} /> Saved</> : 'Save settings'}
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Telegram alerts" right={<SetupRequired />} className="lg:col-span-2">
          <div className="grid gap-5 md:grid-cols-[1fr_280px]">
            <ol className="space-y-3 text-sm text-ink-300">
              <li className="flex gap-3"><span className="num text-signal-cyan">1</span>Tap <b className="text-ink-100">Link Telegram</b> to open the ForexSignal AI Pro bot with a one-time code.</li>
              <li className="flex gap-3"><span className="num text-signal-cyan">2</span>Press <b className="text-ink-100">Start</b> in Telegram. The bot confirms your chat is linked.</li>
              <li className="flex gap-3"><span className="num text-signal-cyan">3</span>Tap <b className="text-ink-100">Send test</b>, close this site, and watch the alert land on your phone.</li>
            </ol>
            <div className="space-y-2">
              <button disabled className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] py-3 text-sm font-semibold text-white opacity-40">
                <Send size={16} /> Link Telegram
              </button>
              <button disabled className="w-full rounded-lg border border-ink-700 py-3 text-sm text-ink-300 opacity-40">Send test message</button>
              <p className="text-[11px] leading-relaxed text-ink-400">Available once the bot token is configured on the server. Chat status: <span className="text-ink-300">not linked</span>.</p>
            </div>
          </div>
        </Panel>

        <Panel title="Pairs to monitor">
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map((i) => (
              <Chip key={i.symbol} on={draft.pairs.includes(i.symbol)} onClick={() => set('pairs', toggleIn(draft.pairs, i.symbol))}>{i.symbol}</Chip>
            ))}
          </div>
          <div className="label mt-5">Timeframes</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TIMEFRAMES.map((t) => (
              <Chip key={t.id} on={draft.timeframes.includes(t.id)} onClick={() => set('timeframes', toggleIn<Timeframe>(draft.timeframes, t.id))}>{t.label}</Chip>
            ))}
          </div>
        </Panel>

        <Panel title="Scanner & quality">
          <Select
            label="Scanner interval"
            value={String(draft.scannerIntervalMin)}
            onChange={(v) => set('scannerIntervalMin', Number(v) as Settings['scannerIntervalMin'])}
            options={SCANNER_INTERVALS.map((m) => ({ value: String(m), label: `Every ${m} minutes` }))}
          />
          <div className="mt-5">
            <div className="flex justify-between">
              <span className="label">Minimum quality score</span>
              <span className="num text-sm text-signal-cyan">{draft.minScore}/100</span>
            </div>
            <input
              type="range"
              min={MIN_QUALITY_FLOOR}
              max={100}
              value={draft.minScore}
              onChange={(e) => set('minScore', Number(e.target.value))}
              className="mt-3 w-full accent-[#22d3ee]"
            />
            <p className="mt-1 text-[11px] text-ink-400">Can be raised above {MIN_QUALITY_FLOOR}, never lowered below it.</p>
          </div>
        </Panel>

        <Panel title="Alert types">
          <div className="divide-y divide-ink-800">
            {ALERTS.map((a) => (
              <Toggle key={a.key} label={a.label} on={draft.alerts[a.key]} onChange={(v) => set('alerts', { ...draft.alerts, [a.key]: v })} />
            ))}
          </div>
        </Panel>

        <Panel title="Trading sessions (UTC)">
          <div className="divide-y divide-ink-800">
            {SESSIONS.map((s) => (
              <Toggle key={s.key} label={s.label} hint={s.hours} on={draft.sessions[s.key]} onChange={(v) => set('sessions', { ...draft.sessions, [s.key]: v })} />
            ))}
          </div>
          <div className="mt-4">
            <Select label="Display timezone" value={draft.timezone} onChange={(v) => set('timezone', v)} options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
          </div>
        </Panel>

        <Panel title="Position-size calculator (educational)" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-4">
            <label className="block">
              <span className="label">Account size (USD)</span>
              <input type="number" min={0} value={draft.accountSize} onChange={(e) => set('accountSize', Number(e.target.value))} className="num mt-1.5 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm outline-none focus:border-signal-cyan" />
            </label>
            <label className="block">
              <span className="label">Default risk %</span>
              <input type="number" min={0.1} max={5} step={0.1} value={draft.riskPct} onChange={(e) => set('riskPct', Number(e.target.value))} className="num mt-1.5 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm outline-none focus:border-signal-cyan" />
            </label>
            <Select label="Pair" value={calcPair} onChange={setCalcPair} options={INSTRUMENTS.map((i) => ({ value: i.symbol, label: i.symbol }))} />
            <label className="block">
              <span className="label">Stop distance (pips)</span>
              <input type="number" min={1} value={stopPips} onChange={(e) => setStopPips(Number(e.target.value))} className="num mt-1.5 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm outline-none focus:border-signal-cyan" />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 rounded-lg border border-ink-700/70 bg-ink-850 p-4">
            <div><div className="label">Risk amount</div><div className="num mt-1 text-lg">${riskAmount.toFixed(2)}</div></div>
            <div><div className="label">Pip size</div><div className="num mt-1 text-lg">{fmtPrice(calcPair, inst.pipSize)}</div></div>
            <div><div className="label">Position size</div><div className="num mt-1 text-lg text-signal-cyan">{lots.toFixed(2)} lots</div></div>
          </div>
          <p className="mt-2 text-[11px] text-ink-400">For learning only. Non-USD-quoted pairs use a reference conversion rate. Confirm sizing with your broker — this platform never places trades.</p>
        </Panel>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={() => { setDraft(DEFAULT_SETTINGS); setSaved(false) }} className="rounded-lg border border-ink-700 px-4 py-2.5 text-sm text-ink-300">Reset to defaults</button>
        <button onClick={submit} className="rounded-lg bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-ink-950">{saved ? 'Saved' : 'Save settings'}</button>
      </div>
    </>
  )
}
