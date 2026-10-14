import type { ReactNode } from 'react'
import { cn } from '@/lib/format'
import type { IntegrationState, SignalState, StrategyStatus } from '@/lib/fixtures'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/icon.svg" alt="" className="h-8 w-8" />
      {!compact && (
        <span className="leading-none">
          <span className="block text-[15px] font-semibold tracking-tight text-ink-100">
            ForexSignal <span className="text-signal-cyan">AI Pro</span>
          </span>
          <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-ink-400">
            Signal-only · no trading
          </span>
        </span>
      )}
    </span>
  )
}

export function PreviewBadge({ className }: { className?: string }) {
  return (
    <span
      title="Sample data for previewing the interface. Not live market data."
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn',
        className,
      )}
    >
      Preview data
    </span>
  )
}

export function SetupRequired({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warn" /> Setup required
    </span>
  )
}

export function IntegrationPill({ state }: { state: IntegrationState }) {
  if (state === 'SETUP_REQUIRED') return <SetupRequired />
  const ok = state === 'CONNECTED'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        ok ? 'border-bull/40 bg-bull/10 text-bull' : 'border-bear/40 bg-bear/10 text-bear',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full pulse-dot', ok ? 'bg-bull' : 'bg-bear')} />
      {ok ? 'Connected' : 'Error'}
    </span>
  )
}

export function StrategyPill({ status }: { status: StrategyStatus }) {
  const cls =
    status === 'VERIFIED'
      ? 'border-bull/40 text-bull bg-bull/10'
      : status === 'SUSPENDED'
        ? 'border-bear/40 text-bear bg-bear/10'
        : 'border-ink-600 text-ink-300 bg-ink-800'
  return (
    <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', cls)}>
      {status}
    </span>
  )
}

const STATE_STYLE: Record<SignalState, string> = {
  PENDING: 'text-signal-cyan border-signal-cyan/40 bg-signal-cyan/10',
  TRIGGERED: 'text-signal-blue border-signal-blue/40 bg-signal-blue/10',
  TP1: 'text-bull border-bull/40 bg-bull/10',
  TP2: 'text-bull border-bull/40 bg-bull/10',
  TP3: 'text-bull border-bull/40 bg-bull/10',
  SL: 'text-bear border-bear/40 bg-bear/10',
  INVALIDATED: 'text-ink-300 border-ink-600 bg-ink-800',
  EXPIRED: 'text-ink-300 border-ink-600 bg-ink-800',
  UNRESOLVED: 'text-warn border-warn/40 bg-warn/10',
}
const STATE_LABEL: Record<SignalState, string> = {
  PENDING: 'Pending',
  TRIGGERED: 'Triggered',
  TP1: 'TP1 reached',
  TP2: 'TP2 reached',
  TP3: 'TP3 reached',
  SL: 'Stop-loss',
  INVALIDATED: 'Invalidated',
  EXPIRED: 'Expired',
  UNRESOLVED: 'Unresolved',
}
export function StatePill({ state }: { state: SignalState }) {
  return (
    <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', STATE_STYLE[state])}>
      {STATE_LABEL[state]}
    </span>
  )
}

export function DirectionTag({ dir, size = 'sm' }: { dir: 'BUY' | 'SELL' | 'NEUTRAL'; size?: 'sm' | 'lg' }) {
  const cls =
    dir === 'BUY' ? 'bg-bull/15 text-bull' : dir === 'SELL' ? 'bg-bear/15 text-bear' : 'bg-ink-800 text-ink-300'
  return (
    <span
      className={cn(
        'num rounded font-semibold',
        size === 'lg' ? 'px-2.5 py-1 text-sm' : 'px-1.5 py-0.5 text-[11px]',
        cls,
      )}
    >
      {dir}
    </span>
  )
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink-100 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Panel({
  title,
  right,
  children,
  className,
  bodyClass,
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  bodyClass?: string
}) {
  return (
    <section className={cn('panel', className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-ink-700/70 px-4 py-3">
          <h2 className="label !text-ink-300">{title}</h2>
          {right}
        </header>
      )}
      <div className={cn('p-4', bodyClass)}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="num mt-1 text-lg font-medium text-ink-100">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-400">{hint}</div>}
    </div>
  )
}

export function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 28 - 1}`)
    .join(' ')
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polyline points={pts} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className={up ? 'stroke-bull' : 'stroke-bear'} />
    </svg>
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="num mt-1.5 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm text-ink-100 outline-none focus:border-signal-cyan"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
