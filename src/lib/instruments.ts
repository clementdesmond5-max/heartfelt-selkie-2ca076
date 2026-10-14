// Instrument contract specifications and the market catalogue. These are real
// conventions (not preview data) shared by the UI, the Netlify Functions and
// the analysis engine. `provider` is the Yahoo Finance symbol used for data.

export type Timeframe = 'M15' | 'M30' | 'H1' | 'H4' | 'D1'

export const TIMEFRAMES: { id: Timeframe; label: string; minutes: number }[] = [
  { id: 'M15', label: '15m', minutes: 15 },
  { id: 'M30', label: '30m', minutes: 30 },
  { id: 'H1', label: '1h', minutes: 60 },
  { id: 'H4', label: '4h', minutes: 240 },
  { id: 'D1', label: '1D', minutes: 1440 },
]

export const tfMinutes = (tf: Timeframe) => TIMEFRAMES.find((t) => t.id === tf)!.minutes
export const isTimeframe = (v: unknown): v is Timeframe => TIMEFRAMES.some((t) => t.id === v)

export type MarketCategory = 'Forex' | 'Metals' | 'Energy' | 'Indices' | 'Crypto' | 'Other'
export const CATEGORIES: MarketCategory[] = ['Forex', 'Metals', 'Energy', 'Indices', 'Crypto', 'Other']

export interface Instrument {
  /** Display / storage id, e.g. "EUR/USD", "XAU/USD", "US30". Custom markets use the provider symbol. */
  symbol: string
  name: string
  category: MarketCategory
  /** Yahoo Finance symbol, e.g. "EURUSD=X", "GC=F", "^DJI", "BTC-USD". */
  provider: string
  /** Note about what the feed actually delivers (e.g. futures used as a spot proxy). */
  providerNote?: string
  base: string
  quote: string
  /** Size of one pip / point in price units. */
  pipSize: number
  /** Smallest quoted increment. */
  tickSize: number
  /** Decimal places to display. */
  digits: number
  /** Units per standard lot, used by the educational position-size calculator. */
  contractSize: number
  /** Modelled typical spread in pips/points — the free feed has no bid/ask. */
  spreadPips: number
  /** "pips" for FX, "pts" for everything else. */
  unit: 'pips' | 'pts'
  /** Trades around the clock, every day (crypto). */
  alwaysOpen?: boolean
  enabledByDefault: boolean
}

const fx = (base: string, quote: string, spreadPips: number, enabledByDefault = false): Instrument => {
  const jpy = quote === 'JPY'
  return {
    symbol: `${base}/${quote}`,
    name: `${base} / ${quote}`,
    category: 'Forex',
    provider: `${base}${quote}=X`,
    base,
    quote,
    pipSize: jpy ? 0.01 : 0.0001,
    tickSize: jpy ? 0.001 : 0.00001,
    digits: jpy ? 3 : 5,
    contractSize: 100_000,
    spreadPips,
    unit: 'pips',
    enabledByDefault,
  }
}

const mk = (
  category: MarketCategory,
  symbol: string,
  name: string,
  provider: string,
  digits: number,
  pipSize: number,
  spreadPips: number,
  opts: Partial<Instrument> = {},
): Instrument => ({
  symbol,
  name,
  category,
  provider,
  base: symbol.split('/')[0],
  quote: symbol.includes('/') ? symbol.split('/')[1] : 'USD',
  pipSize,
  tickSize: 10 ** -digits,
  digits,
  contractSize: 1,
  spreadPips,
  unit: 'pts',
  enabledByDefault: false,
  ...opts,
})

const FUT = 'Yahoo Finance has no spot quote for this market; the front-month futures contract is used as the price source.'

export const INSTRUMENTS: Instrument[] = [
  // Forex — majors
  fx('EUR', 'USD', 0.8, true),
  fx('GBP', 'USD', 1.1, true),
  fx('USD', 'JPY', 0.9, true),
  fx('USD', 'CAD', 1.4, true),
  fx('AUD', 'USD', 1.0, true),
  fx('USD', 'CHF', 1.3, true),
  fx('NZD', 'USD', 1.5),
  // Forex — crosses
  fx('EUR', 'JPY', 1.6, true),
  fx('GBP', 'JPY', 2.2, true),
  fx('GBP', 'AUD', 2.5),
  fx('AUD', 'JPY', 1.8),
  fx('EUR', 'GBP', 1.2),
  fx('EUR', 'AUD', 2.0),
  fx('EUR', 'CHF', 1.6),
  fx('EUR', 'CAD', 2.2),
  fx('GBP', 'CHF', 2.6),
  fx('GBP', 'CAD', 2.8),
  fx('CAD', 'JPY', 2.0),
  fx('CHF', 'JPY', 2.2),
  fx('NZD', 'JPY', 2.2),
  fx('AUD', 'CAD', 2.0),
  fx('AUD', 'NZD', 2.2),
  fx('USD', 'SGD', 2.5),
  fx('USD', 'ZAR', 90),
  fx('USD', 'MXN', 40),
  // Metals
  mk('Metals', 'XAU/USD', 'Gold', 'GC=F', 2, 0.1, 3, { contractSize: 100, enabledByDefault: true, providerNote: FUT }),
  mk('Metals', 'XAG/USD', 'Silver', 'SI=F', 3, 0.01, 3, { contractSize: 5000, enabledByDefault: true, providerNote: FUT }),
  mk('Metals', 'XPT/USD', 'Platinum', 'PL=F', 2, 0.1, 10, { contractSize: 50, providerNote: FUT }),
  mk('Metals', 'COPPER', 'Copper', 'HG=F', 4, 0.001, 3, { contractSize: 25000, providerNote: FUT }),
  // Energy
  mk('Energy', 'WTI', 'WTI Crude Oil', 'CL=F', 2, 0.01, 3, { contractSize: 1000, enabledByDefault: true, providerNote: FUT }),
  mk('Energy', 'BRENT', 'Brent Crude Oil', 'BZ=F', 2, 0.01, 4, { contractSize: 1000, providerNote: FUT }),
  mk('Energy', 'NATGAS', 'Natural Gas', 'NG=F', 3, 0.001, 5, { contractSize: 10000, providerNote: FUT }),
  // Indices (cash index values)
  mk('Indices', 'US30', 'Dow Jones 30', '^DJI', 2, 1, 2, { enabledByDefault: true }),
  mk('Indices', 'NAS100', 'Nasdaq 100', '^NDX', 2, 1, 1.5, { enabledByDefault: true }),
  mk('Indices', 'SPX500', 'S&P 500', '^GSPC', 2, 0.1, 5, { enabledByDefault: true }),
  mk('Indices', 'US2000', 'Russell 2000', '^RUT', 2, 0.1, 3),
  mk('Indices', 'GER40', 'DAX 40', '^GDAXI', 2, 1, 1.5, { enabledByDefault: true }),
  mk('Indices', 'UK100', 'FTSE 100', '^FTSE', 2, 1, 1),
  mk('Indices', 'FRA40', 'CAC 40', '^FCHI', 2, 1, 1.5),
  mk('Indices', 'EU50', 'Euro Stoxx 50', '^STOXX50E', 2, 1, 2),
  mk('Indices', 'JP225', 'Nikkei 225', '^N225', 2, 1, 8),
  mk('Indices', 'HK50', 'Hang Seng', '^HSI', 2, 1, 6),
  mk('Indices', 'AUS200', 'ASX 200', '^AXJO', 2, 1, 2),
  // Crypto (24/7)
  mk('Crypto', 'BTC/USD', 'Bitcoin', 'BTC-USD', 2, 1, 30, { alwaysOpen: true, enabledByDefault: true }),
  mk('Crypto', 'ETH/USD', 'Ethereum', 'ETH-USD', 2, 0.1, 15, { alwaysOpen: true, enabledByDefault: true }),
  mk('Crypto', 'SOL/USD', 'Solana', 'SOL-USD', 3, 0.01, 8, { alwaysOpen: true }),
  mk('Crypto', 'XRP/USD', 'XRP', 'XRP-USD', 5, 0.0001, 8, { alwaysOpen: true }),
  mk('Crypto', 'BNB/USD', 'BNB', 'BNB-USD', 2, 0.1, 5, { alwaysOpen: true }),
  mk('Crypto', 'ADA/USD', 'Cardano', 'ADA-USD', 5, 0.0001, 8, { alwaysOpen: true }),
  mk('Crypto', 'DOGE/USD', 'Dogecoin', 'DOGE-USD', 6, 0.00001, 8, { alwaysOpen: true }),
  mk('Crypto', 'LTC/USD', 'Litecoin', 'LTC-USD', 2, 0.01, 8, { alwaysOpen: true }),
]

/** Custom markets discovered through the provider search (client-side registry). */
const custom = new Map<string, Instrument>()

const PROVIDER_SYMBOL = /^[A-Z0-9^=.\-]{1,24}$/i
export const isValidProviderSymbol = (s: string) => PROVIDER_SYMBOL.test(s)

/** Builds a spec for a market that is not in the curated catalogue, using the feed's price precision. */
export function customInstrument(provider: string, name = provider, digits = 2, alwaysOpen = false): Instrument {
  const d = Math.max(0, Math.min(8, Math.round(digits)))
  return {
    symbol: provider.toUpperCase(),
    name,
    category: 'Other',
    provider: provider.toUpperCase(),
    base: provider.toUpperCase(),
    quote: '',
    pipSize: 10 ** -Math.max(0, d - 1),
    tickSize: 10 ** -d,
    digits: d,
    contractSize: 1,
    spreadPips: 0,
    unit: 'pts',
    alwaysOpen,
    enabledByDefault: false,
  }
}

export function registerInstrument(inst: Instrument) {
  if (!INSTRUMENTS.some((i) => i.symbol === inst.symbol)) custom.set(inst.symbol, inst)
}

export const findInstrument = (symbol: string): Instrument | undefined =>
  INSTRUMENTS.find((i) => i.symbol === symbol || i.provider === symbol) ?? custom.get(symbol)

export const getInstrument = (symbol: string): Instrument =>
  findInstrument(symbol) ?? (isValidProviderSymbol(symbol) ? customInstrument(symbol) : INSTRUMENTS[0])

/** Retail FX trades Sun 21:00 UTC → Fri 21:00 UTC (approximation, ignores DST shifts and holidays). */
export function isForexMarketOpen(d: Date) {
  const day = d.getUTCDay()
  const h = d.getUTCHours()
  if (day === 6) return false
  if (day === 5 && h >= 21) return false
  if (day === 0 && h < 21) return false
  return true
}
