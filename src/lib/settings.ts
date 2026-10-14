import { useEffect, useState } from 'react'
import { INSTRUMENTS, type Timeframe } from './instruments'

// User preferences. Stored in localStorage for now; a later milestone moves
// them to the user's profile in the database so the scanner can read them.

export const MIN_QUALITY_FLOOR = 80
export const SCANNER_INTERVALS = [5, 10, 15, 30, 60] as const

export interface Settings {
  pairs: string[]
  timeframes: Timeframe[]
  scannerIntervalMin: (typeof SCANNER_INTERVALS)[number]
  minScore: number
  alerts: {
    newSignal: boolean
    entryTriggered: boolean
    targets: boolean
    stopLoss: boolean
    expiredInvalidated: boolean
    scannerHealth: boolean
  }
  sessions: { sydney: boolean; tokyo: boolean; london: boolean; newYork: boolean }
  timezone: string
  riskPct: number
  accountSize: number
}

export const DEFAULT_SETTINGS: Settings = {
  pairs: INSTRUMENTS.filter((i) => i.enabledByDefault).map((i) => i.symbol),
  timeframes: ['M30', 'H1', 'H4'],
  scannerIntervalMin: 5,
  minScore: MIN_QUALITY_FLOOR,
  alerts: {
    newSignal: true,
    entryTriggered: true,
    targets: true,
    stopLoss: true,
    expiredInvalidated: false,
    scannerHealth: true,
  },
  sessions: { sydney: false, tokyo: true, london: true, newYork: true },
  timezone: 'UTC',
  riskPct: 1,
  accountSize: 10000,
}

const KEY = 'fxsp.settings.v1'

/** Clamp anything that could bypass safety rules (e.g. a score below the floor). */
export function sanitize(s: Settings): Settings {
  return {
    ...s,
    minScore: Math.min(100, Math.max(MIN_QUALITY_FLOOR, Math.round(s.minScore))),
    riskPct: Math.min(5, Math.max(0.1, s.riskPct)),
    pairs: s.pairs.filter((p) => INSTRUMENTS.some((i) => i.symbol === p)),
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setSettings(sanitize({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }))
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true)
  }, [])

  const save = (next: Settings) => {
    const clean = sanitize(next)
    setSettings(clean)
    localStorage.setItem(KEY, JSON.stringify(clean))
  }

  return { settings, save, loaded }
}
