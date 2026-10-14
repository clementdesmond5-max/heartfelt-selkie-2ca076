import { Clock, Info } from 'lucide-react'
import { useState } from 'react'
import { SCORE_LABELS, SCORE_MAX, type ScoreComponents, type Signal } from '@/lib/fixtures'
import { cn, fmtPips, fmtPrice, fmtTime } from '@/lib/format'
import { DirectionTag, PreviewBadge, StatePill, StrategyPill } from './ui'

export function ScoreBreakdown({ components }: { components: ScoreComponents }) {
  return (
    <ul className="space-y-2">
      {(Object.keys(SCORE_MAX) as (keyof ScoreComponents)[]).map((k) => {
        const v = components[k]
        const max = SCORE_MAX[k]
        return (
          <li key={k}>
            <div className="flex justify-between text-xs">
              <span className="text-ink-300">{SCORE_LABELS[k]}</span>
              <span className="num text-ink-100">
                {v}<span className="text-ink-400">/{max}</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-800">
              <div
                className={cn('h-full rounded-full', v === max ? 'bg-signal-cyan' : v > 0 ? 'bg-signal-blue' : 'bg-transparent')}
                style={{ width: `${(v / max) * 100}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function LevelsTable({ s }: { s: Pick<Signal, 'symbol' | 'entry' | 'sl' | 'tp1' | 'tp2' | 'tp3' | 'entryType'> }) {
  const R = Math.abs(s.entry - s.sl)
  const rows = [
    { k: `Entry · ${s.entryType === 'LIMIT' ? 'limit' : 'market'}`, v: s.entry, c: 'text-ink-100', rr: '' },
    { k: 'Stop loss', v: s.sl, c: 'text-bear', rr: fmtPips(s.symbol, R) },
    { k: 'Take profit 1', v: s.tp1, c: 'text-bull', rr: `1:${(Math.abs(s.tp1 - s.entry) / R).toFixed(1)}` },
    { k: 'Take profit 2', v: s.tp2, c: 'text-bull', rr: `1:${(Math.abs(s.tp2 - s.entry) / R).toFixed(1)}` },
    { k: 'Take profit 3', v: s.tp3, c: 'text-bull', rr: `1:${(Math.abs(s.tp3 - s.entry) / R).toFixed(1)}` },
  ]
  return (
    <dl className="divide-y divide-ink-800 text-sm">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center justify-between py-1.5">
          <dt className="text-ink-400">{r.k}</dt>
          <dd className="flex items-baseline gap-3">
            <span className="num text-[11px] text-ink-400">{r.rr}</span>
            <span className={cn('num font-medium', r.c)}>{fmtPrice(s.symbol, r.v)}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function SignalCard({ s, timeZone }: { s: Signal; timeZone?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="panel rise overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="num text-base font-semibold text-ink-100">{s.symbol}</h3>
            <DirectionTag dir={s.direction} />
            <span className="num rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-ink-300">{s.timeframe}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatePill state={s.state} />
            <StrategyPill status={s.strategyStatus} />
            <PreviewBadge />
          </div>
        </div>
        <div className="text-right">
          <div className="num text-2xl font-semibold leading-none text-signal-cyan">{s.score}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-400">quality pts</div>
        </div>
      </div>

      <div className="px-4 py-3">
        <LevelsTable s={s} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-800 px-4 py-2.5 text-[11px] text-ink-400">
        <span className="flex items-center gap-1"><Clock size={12} /> {fmtTime(s.createdAt, timeZone)}</span>
        <span>Expires {fmtTime(s.expiresAt, timeZone)}</span>
        <span>Data {fmtTime(s.dataAsOf, timeZone)}</span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto flex items-center gap-1 text-signal-cyan hover:underline"
        >
          <Info size={12} /> {open ? 'Hide' : 'Why this signal'}
        </button>
      </div>

      {open && (
        <div className="grid gap-4 border-t border-ink-800 bg-ink-850/60 px-4 py-4 sm:grid-cols-2">
          <div>
            <div className="label mb-1.5">{s.strategy}</div>
            <p className="text-sm leading-relaxed text-ink-300">{s.explanation}</p>
            <ul className="mt-3 space-y-1 text-xs text-ink-400">
              {s.factors.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-signal-cyan">›</span>{f}</li>
              ))}
            </ul>
            {s.events.length > 1 && (
              <ol className="mt-4 space-y-1.5 border-l border-ink-700 pl-3 text-xs">
                {s.events.map((e, i) => (
                  <li key={i} className="text-ink-400">
                    <span className="num text-ink-300">{fmtTime(e.at, timeZone)}</span> — {e.note}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div>
            <ScoreBreakdown components={s.components} />
            <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
              {s.score}/100 means {s.score} quality points from the rules above — not a {s.score}% chance of winning.
            </p>
          </div>
        </div>
      )}
    </article>
  )
}
