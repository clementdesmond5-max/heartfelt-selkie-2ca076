// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW FIXTURES — the single place where sample data lives.
//
// Everything exported from this module is clearly labelled "Preview" in the UI.
// It exists so the product surface can be explored before the market-data
// feed, database and scheduled scanner are connected (see PLAN.md). Later
// milestones replace these exports with real API calls; no other module
// should fabricate prices, signals or performance numbers.
// ─────────────────────────────────────────────────────────────────────────────

import { atr, ema, last, rsi, type Candle } from './indicators'
import { getInstrument, INSTRUMENTS, TIMEFRAMES, type Timeframe } from './instruments'

/** Fixed anchor so preview candles are identical on server and client. Friday 20:00 UTC. */
export const PREVIEW_AS_OF = '2026-10-09T20:00:00Z'
const ANCHOR = Date.parse(PREVIEW_AS_OF) / 1000

// ── Sample candle generator (seeded, deterministic) ─────────────────────────

const BASE: Record<string, { price: number; drift: number }> = {
  'EUR/USD': { price: 1.0852, drift: 0.00006 },
  'GBP/USD': { price: 1.271, drift: 0.00004 },
  'USD/JPY': { price: 149.2, drift: -0.00007 },
  'USD/CAD': { price: 1.374, drift: 0 },
  'AUD/USD': { price: 0.662, drift: -0.00001 },
  'USD/CHF': { price: 0.884, drift: 0.00001 },
  'NZD/USD': { price: 0.605, drift: 0 },
  'EUR/JPY': { price: 161.9, drift: -0.00005 },
}
const VOL: Record<Timeframe, number> = { M15: 0.00032, M30: 0.00045, H1: 0.00065, H4: 0.0013 }

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const cache = new Map<string, Candle[]>()

export function getPreviewCandles(symbol: string, tf: Timeframe, count = 260): Candle[] {
  const key = `${symbol}:${tf}:${count}`
  const hit = cache.get(key)
  if (hit) return hit
  const inst = getInstrument(symbol)
  const { price, drift } = BASE[symbol] ?? { price: 1, drift: 0 }
  const vol = VOL[tf]
  const step = TIMEFRAMES.find((t) => t.id === tf)!.minutes * 60
  const rand = rng(hash(key))
  const round = (p: number) => Math.round(p / inst.tickSize) * inst.tickSize
  const tfDrift = drift * (vol / VOL.H1)

  // Walk backwards from the anchor so the latest close lands near the base price.
  const closes: number[] = [price]
  for (let i = 1; i < count; i++) {
    const shock = (rand() - 0.5) * 2 * vol + Math.sin(i / 17) * vol * 0.35
    closes.unshift(closes[0] / (1 + tfDrift + shock))
  }
  const out: Candle[] = closes.map((close, i) => {
    const open = i === 0 ? close * (1 - (rand() - 0.5) * vol) : closes[i - 1]
    const wick = vol * close
    return {
      time: ANCHOR - (count - i) * step,
      open: round(open),
      close: round(close),
      high: round(Math.max(open, close) + rand() * wick * 0.8),
      low: round(Math.min(open, close) - rand() * wick * 0.8),
    }
  })
  cache.set(key, out)
  return out
}

export interface Quote {
  symbol: string
  price: number
  changePct: number
  bias: 'BUY' | 'SELL' | 'NEUTRAL'
  asOf: string
  spark: number[]
}

export function getPreviewQuotes(): Quote[] {
  return INSTRUMENTS.map((i) => {
    const c = getPreviewCandles(i.symbol, 'H1')
    const closes = c.map((x) => x.close)
    const now = closes[closes.length - 1]
    const prev = closes[closes.length - 25]
    return {
      symbol: i.symbol,
      price: now,
      changePct: ((now - prev) / prev) * 100,
      bias: trendBias(closes),
      asOf: new Date(c[c.length - 1].time * 1000 + 3600_000).toISOString(),
      spark: closes.slice(-48),
    }
  })
}

function trendBias(closes: number[]): Quote['bias'] {
  const e20 = last(ema(closes, 20))!
  const e50 = last(ema(closes, 50))!
  const c = closes[closes.length - 1]
  if (e20 > e50 && c > e50) return 'BUY'
  if (e20 < e50 && c < e50) return 'SELL'
  return 'NEUTRAL'
}

// ── Preview scan (sample candles, simplified rule set) ──────────────────────

export type Direction = 'BUY' | 'SELL'
export type StrategyStatus = 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED'

export interface ScoreComponents {
  trend: number // /20
  structure: number // /20
  supportResistance: number // /15
  momentum: number // /15
  multiTimeframe: number // /15
  risk: number // /15
}
export const SCORE_MAX: Record<keyof ScoreComponents, number> = {
  trend: 20,
  structure: 20,
  supportResistance: 15,
  momentum: 15,
  multiTimeframe: 15,
  risk: 15,
}
export const SCORE_LABELS: Record<keyof ScoreComponents, string> = {
  trend: 'Trend alignment',
  structure: 'Market structure',
  supportResistance: 'Support / resistance',
  momentum: 'Momentum',
  multiTimeframe: 'Multi-timeframe',
  risk: 'Volatility, spread & risk',
}

export interface Check {
  id: string
  label: string
  pass: boolean
  detail: string
}

export interface Levels {
  direction: Direction
  entryType: 'MARKET' | 'LIMIT'
  entry: number
  sl: number
  tp1: number
  tp2: number
  tp3: number
}

export interface ScanResult {
  symbol: string
  timeframe: Timeframe
  dataAsOf: string
  candlesUsed: number
  bias: Quote['bias']
  indicators: { ema20: number; ema50: number; ema200: number; rsi14: number; atr14: number }
  score: number
  components: ScoreComponents
  checks: Check[]
  qualified: boolean
  levels: Levels | null
  strategy: string
  strategyStatus: StrategyStatus
  explanation: string
}

/** Modelled typical spread in pips until the feed provides bid/ask. */
export const MODELLED_SPREAD_PIPS: Record<string, number> = {
  'EUR/USD': 0.8, 'GBP/USD': 1.1, 'USD/JPY': 0.9, 'USD/CAD': 1.4,
  'AUD/USD': 1.0, 'USD/CHF': 1.3, 'NZD/USD': 1.5, 'EUR/JPY': 1.6,
}

const higherTf: Record<Timeframe, Timeframe> = { M15: 'H1', M30: 'H1', H1: 'H4', H4: 'H4' }

export function runPreviewScan(symbol: string, tf: Timeframe, minScore = 80): ScanResult {
  const inst = getInstrument(symbol)
  const candles = getPreviewCandles(symbol, tf)
  const closes = candles.map((c) => c.close)
  const close = closes[closes.length - 1]
  const e20 = last(ema(closes, 20))!
  const e50 = last(ema(closes, 50))!
  const e200 = last(ema(closes, 200))!
  const r = last(rsi(closes, 14))!
  const a = last(atr(candles, 14))!
  const bias = trendBias(closes)
  const dir: Direction | null = bias === 'NEUTRAL' ? null : bias
  const up = dir === 'BUY'
  const sgn = up ? 1 : -1

  // Trend: full EMA stack vs. partial.
  const stack = up ? e20 > e50 && e50 > e200 : e20 < e50 && e50 < e200
  const partial = up ? e20 > e50 : e20 < e50
  const trend = !dir ? 0 : stack ? 20 : partial ? 10 : 0

  // Structure: last 20 bars vs prior 20 — HH/HL for buys, LH/LL for sells.
  const hi = (s: Candle[]) => Math.max(...s.map((c) => c.high))
  const lo = (s: Candle[]) => Math.min(...s.map((c) => c.low))
  const recent = candles.slice(-20)
  const prior = candles.slice(-40, -20)
  const hh = hi(recent) > hi(prior)
  const hl = lo(recent) > lo(prior)
  const lh = hi(recent) < hi(prior)
  const ll = lo(recent) < lo(prior)
  const structHits = !dir ? 0 : up ? +hh + +hl : +lh + +ll
  const structure = structHits === 2 ? 20 : structHits === 1 ? 10 : 0
  const contradictory = !!dir && (up ? ll && !hh : hh && !ll)

  // S/R: pullback proximity to dynamic support/resistance (EMA20).
  const distAtr = Math.abs(close - e20) / a
  const supportResistance = !dir ? 0 : distAtr < 0.8 ? 15 : distAtr < 1.6 ? 8 : 0

  // Momentum: RSI in the trend-continuation band without being stretched.
  const inBand = up ? r >= 50 && r <= 68 : r <= 50 && r >= 32
  const nearBand = up ? r >= 45 && r <= 74 : r <= 55 && r >= 26
  const momentum = !dir ? 0 : inBand ? 15 : nearBand ? 7 : 0
  const momentumConflict = !!dir && (up ? r < 40 : r > 60)

  // Multi-timeframe: same bias on the higher timeframe.
  const htfBias = trendBias(getPreviewCandles(symbol, higherTf[tf]).map((c) => c.close))
  const multiTimeframe = !dir ? 0 : htfBias === bias ? 15 : htfBias === 'NEUTRAL' ? 6 : 0

  // Levels: limit at EMA20 when stretched, else market; SL beyond the 10-bar swing.
  const round = (p: number) => Math.round(p / inst.tickSize) * inst.tickSize
  const spread = MODELLED_SPREAD_PIPS[symbol] * inst.pipSize
  let levels: Levels | null = null
  if (dir) {
    const limit = distAtr > 0.5
    const entry = round(limit ? e20 + sgn * 0.1 * a : close)
    const swing = up ? lo(candles.slice(-10)) : hi(candles.slice(-10))
    const atrStop = entry - sgn * 1.2 * a
    const sl = round((up ? Math.min(swing, atrStop) : Math.max(swing, atrStop)) - sgn * spread)
    const R = Math.abs(entry - sl)
    levels = {
      direction: dir,
      entryType: limit ? 'LIMIT' : 'MARKET',
      entry,
      sl,
      tp1: round(entry + sgn * 1.5 * R),
      tp2: round(entry + sgn * 2.5 * R),
      tp3: round(entry + sgn * 3.5 * R),
    }
  }
  const atrPips = a / inst.pipSize
  const volOk = atrPips >= 3 && atrPips <= (tf === 'H4' ? 80 : 45)
  const riskPips = levels ? Math.abs(levels.entry - levels.sl) / inst.pipSize : 0
  const spreadShare = levels ? MODELLED_SPREAD_PIPS[symbol] / riskPips : 1
  const entryFar = levels ? Math.abs(levels.entry - close) / a > 1.5 : false
  const risk = !levels ? 0 : (volOk ? 8 : 0) + (spreadShare < 0.1 ? 7 : spreadShare < 0.2 ? 3 : 0)

  const components = { trend, structure, supportResistance, momentum, multiTimeframe, risk }
  const score = Object.values(components).reduce((x, y) => x + y, 0)

  const checks: Check[] = [
    { id: 'data', label: 'Candle data complete & fresh', pass: true, detail: `${candles.length} closed candles (preview sample set)` },
    { id: 'history', label: 'Enough history for EMA 200', pass: candles.length >= 210, detail: `${candles.length} ≥ 210 required` },
    { id: 'market', label: 'Forex market open', pass: isForexMarketOpen(new Date(PREVIEW_AS_OF)), detail: 'Checked against the data timestamp' },
    { id: 'bias', label: 'Clear directional bias', pass: !!dir, detail: dir ? `${bias} — EMA20 ${up ? 'above' : 'below'} EMA50` : 'EMA20 and EMA50 are tangled' },
    { id: 'structure', label: 'Structure not contradictory', pass: !!dir && !contradictory, detail: dir ? `${up ? (hh ? 'HH' : 'no HH') + ' / ' + (hl ? 'HL' : 'no HL') : (lh ? 'LH' : 'no LH') + ' / ' + (ll ? 'LL' : 'no LL')} over last 20 bars` : 'No bias to confirm' },
    { id: 'momentum', label: 'Indicators not in strong conflict', pass: !!dir && !momentumConflict, detail: `RSI 14 at ${r.toFixed(1)}` },
    { id: 'volatility', label: 'Volatility within limits', pass: volOk, detail: `ATR 14 = ${atrPips.toFixed(1)} pips` },
    { id: 'entry', label: 'Entry close to current price', pass: !!levels && !entryFar, detail: levels ? `${(Math.abs(levels.entry - close) / a).toFixed(2)} ATR from last close` : '—' },
    { id: 'spread', label: 'Spread < 20% of stop distance', pass: !!levels && spreadShare < 0.2, detail: levels ? `${MODELLED_SPREAD_PIPS[symbol]} pip modelled spread vs ${riskPips.toFixed(1)} pip stop` : '—' },
    { id: 'rr', label: 'Reward-to-risk ≥ 1:1.5 to TP1', pass: !!levels, detail: levels ? 'TP1 placed at 1.5R, TP2 2.5R, TP3 3.5R' : '—' },
    { id: 'score', label: `Quality score ≥ ${minScore}`, pass: score >= minScore, detail: `${score}/100 quality points` },
  ]
  const qualified = checks.every((c) => c.pass)
  const failed = checks.filter((c) => !c.pass)

  return {
    symbol,
    timeframe: tf,
    dataAsOf: new Date(candles[candles.length - 1].time * 1000).toISOString(),
    candlesUsed: candles.length,
    bias,
    indicators: { ema20: e20, ema50: e50, ema200: e200, rsi14: r, atr14: a },
    score,
    components,
    checks,
    qualified,
    levels: qualified ? levels : null,
    strategy: 'EMA Trend Pullback',
    strategyStatus: 'UNVERIFIED',
    explanation: qualified
      ? `${bias} continuation: EMA stack ${stack ? 'fully' : 'partly'} aligned, price ${distAtr.toFixed(2)} ATR from EMA20, RSI ${r.toFixed(0)} and ${higherTf[tf]} bias ${htfBias}. Stop sits beyond the 10-bar swing plus spread.`
      : `No valid setup. ${failed.map((f) => f.label.toLowerCase()).slice(0, 3).join('; ')} failed.`,
  }
}

/** Retail FX trades Sun 21:00 UTC → Fri 21:00 UTC (approximation, ignores DST shifts and holidays). */
export function isForexMarketOpen(d: Date) {
  const day = d.getUTCDay()
  const h = d.getUTCHours()
  if (day === 6) return false
  if (day === 5 && h >= 21) return false
  if (day === 0 && h < 21) return false
  return true
}

// ── Preview signals & history ───────────────────────────────────────────────

export type SignalState =
  | 'PENDING' | 'TRIGGERED' | 'TP1' | 'TP2' | 'TP3' | 'SL' | 'INVALIDATED' | 'EXPIRED' | 'UNRESOLVED'

export interface Signal extends Levels {
  id: string
  symbol: string
  timeframe: Timeframe
  score: number
  components: ScoreComponents
  strategy: string
  strategyStatus: StrategyStatus
  explanation: string
  factors: string[]
  createdAt: string
  expiresAt: string
  dataAsOf: string
  state: SignalState
  events: { at: string; state: SignalState; note: string }[]
}

const iso = (offsetMin: number) => new Date(Date.parse(PREVIEW_AS_OF) + offsetMin * 60_000).toISOString()

function mk(
  id: string, symbol: string, timeframe: Timeframe, direction: Direction, entry: number, riskPips: number,
  createdMin: number, state: SignalState, score: number, components: ScoreComponents, strategy: string,
  explanation: string, factors: string[], events: Signal['events'] = [],
): Signal {
  const inst = getInstrument(symbol)
  const s = direction === 'BUY' ? 1 : -1
  const R = riskPips * inst.pipSize
  const round = (p: number) => Number((Math.round(p / inst.tickSize) * inst.tickSize).toFixed(inst.digits))
  const tfMin = TIMEFRAMES.find((t) => t.id === timeframe)!.minutes
  return {
    id, symbol, timeframe, direction, entryType: 'LIMIT', entry,
    sl: round(entry - s * R), tp1: round(entry + s * 1.5 * R), tp2: round(entry + s * 2.5 * R), tp3: round(entry + s * 3.5 * R),
    score, components, strategy, strategyStatus: 'UNVERIFIED', explanation, factors,
    createdAt: iso(createdMin), expiresAt: iso(createdMin + tfMin * 6), dataAsOf: iso(createdMin - 1),
    state, events: [{ at: iso(createdMin), state: 'PENDING', note: 'Signal published' }, ...events],
  }
}

export function getPreviewSignals(): Signal[] {
  const live: Signal[] = []
  for (const [sym, tf] of [['EUR/USD', 'H1'], ['USD/JPY', 'H1'], ['GBP/USD', 'H4'], ['EUR/JPY', 'M30']] as const) {
    const r = runPreviewScan(sym, tf, 80)
    if (!r.qualified || !r.levels) continue
    const tfMin = TIMEFRAMES.find((t) => t.id === tf)!.minutes
    live.push({
      ...r.levels, id: `pv-${sym}-${tf}`, symbol: sym, timeframe: tf, score: r.score, components: r.components,
      strategy: r.strategy, strategyStatus: r.strategyStatus, explanation: r.explanation,
      factors: r.checks.filter((c) => c.pass).slice(3, 7).map((c) => c.detail),
      createdAt: iso(-4), expiresAt: iso(tfMin * 6 - 4), dataAsOf: r.dataAsOf, state: 'PENDING',
      events: [{ at: iso(-4), state: 'PENDING', note: 'Signal published' }],
    })
  }
  const full = { trend: 20, structure: 20, supportResistance: 15, momentum: 15, multiTimeframe: 15, risk: 15 }
  return [
    ...live,
    mk('pv-h1', 'AUD/USD', 'H1', 'SELL', 0.66412, 18, -190, 'TRIGGERED', 84, { ...full, momentum: 7, multiTimeframe: 12, structure: 20 }, 'BOS Breakout & Retest',
      'Bearish BOS below 0.6650, retest of the broken level held with a rejection wick.', ['BOS confirmed on close', 'Retest within 0.3 ATR', 'H4 bias SELL'],
      [{ at: iso(-150), state: 'TRIGGERED', note: 'Limit entry filled at 0.66412' }]),
    mk('pv-h2', 'USD/CAD', 'M30', 'BUY', 1.37105, 14, -620, 'TP2', 86, { ...full, supportResistance: 8, momentum: 13 }, 'EMA Trend Pullback',
      'Pullback to EMA20 inside a rising EMA stack, RSI reset to 52.', ['EMA 20/50/200 stacked', 'HH/HL over 20 bars', 'RSI 52'],
      [{ at: iso(-590), state: 'TRIGGERED', note: 'Entry filled' }, { at: iso(-470), state: 'TP1', note: 'TP1 hit — high 1.37315' }, { at: iso(-330), state: 'TP2', note: 'TP2 hit — high 1.37455' }]),
    mk('pv-h3', 'GBP/USD', 'H1', 'SELL', 1.27455, 22, -1500, 'SL', 81, { ...full, multiTimeframe: 6, risk: 10, structure: 20, trend: 20, momentum: 10 }, 'Liquidity Sweep Reversal',
      'Sweep of the Asian high followed by bearish CHoCH on M15.', ['Equal highs swept', 'CHoCH confirmed', 'RSI bearish divergence'],
      [{ at: iso(-1440), state: 'TRIGGERED', note: 'Entry filled' }, { at: iso(-1310), state: 'SL', note: 'Stop-loss hit — high 1.27685' }]),
    mk('pv-h4', 'NZD/USD', 'H4', 'BUY', 0.60215, 35, -2900, 'EXPIRED', 82, { ...full, momentum: 7, risk: 10 }, 'EMA Trend Pullback',
      'Limit at EMA20 was never reached before expiry.', ['EMA stack aligned', 'H4 HH/HL'], [{ at: iso(-1460), state: 'EXPIRED', note: 'Expired untriggered after 6 bars' }]),
    mk('pv-h5', 'USD/CHF', 'M15', 'SELL', 0.88512, 9, -3100, 'UNRESOLVED', 83, { ...full, supportResistance: 8, risk: 10 }, 'BOS Breakout & Retest',
      'Entry and TP1 and SL all inside one M15 bar — order of fills cannot be proven.', ['BOS on close', 'Retest held'],
      [{ at: iso(-3085), state: 'TRIGGERED', note: 'Entry filled' }, { at: iso(-3085), state: 'UNRESOLVED', note: 'TP1 and SL both inside the same candle — scored as a loss conservatively' }]),
    mk('pv-h6', 'EUR/JPY', 'H1', 'BUY', 161.42, 25, -4300, 'INVALIDATED', 80, { ...full, momentum: 7, multiTimeframe: 8, supportResistance: 15, structure: 20, trend: 20, risk: 10 }, 'EMA Trend Pullback',
      'Bearish CHoCH printed before the limit filled — setup cancelled.', ['EMA stack aligned'],
      [{ at: iso(-4140), state: 'INVALIDATED', note: 'Structure flipped before entry' }]),
  ]
}

// ── Strategy qualification ──────────────────────────────────────────────────

export interface StrategyQualification {
  strategy: string
  timeframe: Timeframe
  status: StrategyStatus
  oosClosed: number
  oosRequired: number
  winRate: number | null
  expectancyR: number | null
  profitFactor: number | null
  maxDrawdownR: number | null
  lastValidated: string | null
}

export const STRATEGIES = [
  { id: 'trend-pullback', name: 'EMA Trend Pullback', summary: 'Continuation entries at EMA20 inside an aligned 20/50/200 stack with RSI reset.' },
  { id: 'bos-retest', name: 'BOS Breakout & Retest', summary: 'Confirmed break of structure on close, entry on the first retest of the broken level.' },
  { id: 'sweep-reversal', name: 'Liquidity Sweep Reversal', summary: 'Sweep of equal highs/lows followed by a lower-timeframe CHoCH.' },
]

/** No backtests have been run yet, so every strategy is honestly UNVERIFIED with no stats. */
export function getStrategyQualifications(): StrategyQualification[] {
  return STRATEGIES.flatMap((s) =>
    TIMEFRAMES.map((t) => ({
      strategy: s.name, timeframe: t.id, status: 'UNVERIFIED' as const, oosClosed: 0, oosRequired: 100,
      winRate: null, expectancyR: null, profitFactor: null, maxDrawdownR: null, lastValidated: null,
    })),
  )
}

// ── Integrations ────────────────────────────────────────────────────────────

export type IntegrationState = 'SETUP_REQUIRED' | 'CONNECTED' | 'ERROR'
export interface Integration {
  id: string
  name: string
  purpose: string
  state: IntegrationState
  envVars: string[]
}

/** Nothing is connected yet — the real status endpoint arrives with the backend milestones. */
export const INTEGRATIONS: Integration[] = [
  { id: 'market', name: 'Market data (Twelve Data)', purpose: 'Real OHLC candles for scans and signal tracking', state: 'SETUP_REQUIRED', envVars: ['TWELVE_DATA_API_KEY'] },
  { id: 'db', name: 'Database', purpose: 'Signals, status events, scan logs, backtests', state: 'SETUP_REQUIRED', envVars: ['Provisioned automatically on Netlify'] },
  { id: 'scheduler', name: 'Automatic scanner', purpose: 'Scheduled function, every 5 minutes', state: 'SETUP_REQUIRED', envVars: ['SCANNER_SECRET'] },
  { id: 'telegram', name: 'Telegram bot', purpose: 'Phone alerts while the site is closed', state: 'SETUP_REQUIRED', envVars: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET'] },
  { id: 'vision', name: 'Vision analysis', purpose: 'Screenshot chart reading', state: 'SETUP_REQUIRED', envVars: ['Netlify AI Gateway (no key needed)'] },
  { id: 'news', name: 'Economic calendar', purpose: 'Optional high-impact news filter', state: 'SETUP_REQUIRED', envVars: ['Not configured — filter disabled'] },
]
