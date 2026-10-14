// Instrument contract specifications. These are real conventions (not preview
// data) and are shared by the UI and, in later milestones, the analysis engine.

export type Timeframe = 'M15' | 'M30' | 'H1' | 'H4'

export const TIMEFRAMES: { id: Timeframe; label: string; minutes: number }[] = [
  { id: 'M15', label: '15m', minutes: 15 },
  { id: 'M30', label: '30m', minutes: 30 },
  { id: 'H1', label: '1h', minutes: 60 },
  { id: 'H4', label: '4h', minutes: 240 },
]

export interface Instrument {
  symbol: string // provider symbol, e.g. "EUR/USD"
  base: string
  quote: string
  /** Size of one pip in price units (0.0001, or 0.01 for JPY quotes). */
  pipSize: number
  /** Smallest quoted increment (fractional pip). */
  tickSize: number
  /** Decimal places to display. */
  digits: number
  /** Units per standard lot, used by the educational position-size calculator. */
  contractSize: number
  enabledByDefault: boolean
}

const fx = (base: string, quote: string): Instrument => {
  const jpy = quote === 'JPY'
  return {
    symbol: `${base}/${quote}`,
    base,
    quote,
    pipSize: jpy ? 0.01 : 0.0001,
    tickSize: jpy ? 0.001 : 0.00001,
    digits: jpy ? 3 : 5,
    contractSize: 100_000,
    enabledByDefault: true,
  }
}

export const INSTRUMENTS: Instrument[] = [
  fx('EUR', 'USD'),
  fx('GBP', 'USD'),
  fx('USD', 'JPY'),
  fx('USD', 'CAD'),
  fx('AUD', 'USD'),
  fx('USD', 'CHF'),
  fx('NZD', 'USD'),
  fx('EUR', 'JPY'),
  // Future: XAU/USD needs its own spec — pipSize 0.1, tickSize 0.01, digits 2,
  // contractSize 100 (oz). Add here once a data feed for metals is confirmed.
]

export const getInstrument = (symbol: string) =>
  INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0]
