import { Link, Outlet } from '@tanstack/react-router'
import {
  Activity,
  BarChart3,
  Bell,
  Camera,
  CircleHelp,
  History,
  LayoutDashboard,
  Radar,
  Settings,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Logo } from './ui'
import { isForexMarketOpen } from '@/lib/fixtures'
import { cn } from '@/lib/format'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
  { to: '/scan', label: 'Scan', icon: Radar, mobile: true },
  { to: '/screenshot', label: 'Screenshot', icon: Camera, mobile: false },
  { to: '/signals', label: 'Signals', icon: Activity, mobile: true },
  { to: '/history', label: 'History', icon: History, mobile: false },
  { to: '/performance', label: 'Performance', icon: BarChart3, mobile: true },
  { to: '/settings', label: 'Settings', icon: Settings, mobile: true },
  { to: '/help', label: 'Help & setup', icon: CircleHelp, mobile: false },
] as const

function MarketClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  if (!now) return <span className="h-4 w-28" />
  const open = isForexMarketOpen(now)
  return (
    <span className="flex items-center gap-2 text-xs text-ink-400">
      <span className={cn('h-1.5 w-1.5 rounded-full', open ? 'bg-bull pulse-dot' : 'bg-ink-600')} />
      <span>FX market {open ? 'open' : 'closed'}</span>
      <span className="num text-ink-300">
        {now.toISOString().slice(11, 16)} UTC
      </span>
    </span>
  )
}

export function AppShell() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-ink-700/70 bg-ink-900 px-3 py-5 lg:flex">
        <Link to="/" className="px-2">
          <Logo />
        </Link>
        <nav className="mt-8 flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
              activeProps={{ className: '!bg-signal-cyan/10 !text-signal-cyan' }}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-lg border border-ink-700/70 bg-ink-850 p-3 text-xs leading-relaxed text-ink-400">
          <Bell size={14} className="mb-1.5 text-signal-cyan" />
          Signals are analysis, not advice. This platform never places trades or connects to a broker.
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-ink-700/70 bg-ink-950/85 px-4 backdrop-blur lg:px-8">
          <Link to="/" className="lg:hidden">
            <Logo compact />
          </Link>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-4">
            <MarketClock />
            <Link to="/help" className="text-ink-400 hover:text-ink-100 lg:hidden" aria-label="Help">
              <CircleHelp size={19} />
            </Link>
            <Link to="/screenshot" className="text-ink-400 hover:text-ink-100 lg:hidden" aria-label="Screenshot scan">
              <Camera size={19} />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 lg:px-8 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-ink-700/70 bg-ink-900/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.filter((n) => n.mobile).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-ink-400"
            activeProps={{ className: '!text-signal-cyan' }}
          >
            <Icon size={20} strokeWidth={1.8} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
