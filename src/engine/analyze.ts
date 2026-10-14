// V1 + V2 confluence engine. Pure and framework-free: the same code runs in the
// browser, in the API functions and in the scheduled scanner / backtester.
//
// V1 — Trend engine:      EMA 20/50/200 stack, close vs EMA 200, MACD(12,26,9) vs signal.
// V2 — Momentum/structure: RSI 14 vs 50, Supertrend(10, 3), confirmed break of structure.
// Filters: ADX 14 trend strength, ATR 14 volatility band, extension, stop sanity, spread.
//
// Every decision at bar i uses only candles closed at or before i (no look-ahead).

import { adx, atr, ema, macd, median, rsi, supertrend, type Candle } from './indicators'
import { isForexMarketOpen, tfMinutes, type Instrument, type Timeframe } from '../lib/instruments'

export type Direction = 'BUY' | 'SELL'
export type Bias = Direction | 'NEUTRAL'
export type Decision = Direction | 'NO_TRADE'
export type StrategyStatus = 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED'
/** Internal-only timeframe used as the higher timeframe of D1. */
export type EngineTimeframe = Timeframe | 'W1'

export const STRATEGY_NAME = 'V1 + V2 Confluence'
export const MIN_HISTORY = 260
export const BOS_LOOKBACK = 30
export const SWING_N = 2
export const ADX_MIN = 20
export const MAX_EXTENSION_ATR = 2
export const STOP_MIN_ATR = 1
export const STOP_MAX_ATR = 3.5
export const TARGETS_R = [1.5, 2.5, 4] as const

export const engineMinutes = (tf: EngineTimeframe) => (tf === 'W1' ? 10080 : tfMinutes(tf))

export const HIGHER_TF: Record<Timeframe, EngineTimeframe> = {
  M15: 'H1',
  M30: 'H4',
  H1: 'H4',
  H4: 'D1',
  D1: 'W1',
}

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
  trend: 'Trend alignment (V1)',
  structure: 'Market structure (V2)',
  supportResistance: 'Room to next level',
  momentum: 'Momentum',
  multiTimeframe: 'Higher timeframe',
  risk: 'ADX, volatility & spread',
}

export interface Check {
  id: string
  label: string
  pass: boolean
  detail: string
}

export type Vote = 'bull' | 'bear' | 'mixed'
export interface Condition {
  id: string
  label: string
  vote: Vote
  detail: string
}
export interface EngineReport {
  name: string
  direction: Bias
  conditions: Condition[]
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

export interface Analysis {
  symbol: string
  timeframe: Timeframe
  decision: Decision
  /** Close time of the last closed candle used. */
  dataAsOf: string
  setupCandleTime: number
  candlesUsed: number
  lastClose: number
  v1: EngineReport
  v2: EngineReport
  higherTimeframe: { timeframe: EngineTimeframe; direction: Bias; partial: Bias } | null
  indicators: {
    ema20: number | null
    ema50: number | null
    ema200: number | null
    macd: number | null
    macdSignal: number | null
    macdHist: number | null
    rsi14: number | null
    adx14: number | null
    plusDI: number | null
    minusDI: number | null
    atr14: number | null
    supertrend: number | null
    supertrendDir: Bias
  }
  structure: {
    lastBos: { direction: Direction; level: number; time: number; barsAgo: number } | null
    sequence: string
    swingHigh: number | null
    swingLow: number | null
  }
  score: number
  components: ScoreComponents
  checks: Check[]
  levels: Levels | null
  riskReward: { tp1: number; tp2: number; tp3: number } | null
  strategy: string
  strategyStatus: StrategyStatus
  explanation: string
  reasons: string[]
}

// ── Series pre-computation (causal indicators over the full history) ────────

interface Swing {
  index: number
  confirmIndex: number
  price: number
  kind: 'H' | 'L'
}
interface Bos {
  direction: Direction
  level: number
}

export interface Series {
  candles: Candle[]
  e20: (number | null)[]
  e50: (number | null)[]
  e200: (number | null)[]
  macd: ReturnType<typeof macd>
  rsi: (number | null)[]
  atr: (number | null)[]
  adx: ReturnType<typeof adx>
  st: ReturnType<typeof supertrend>
  swings: Swing[]
  bos: (Bos | null)[]
}

export function computeSeries(candles: Candle[]): Series {
  const closes = candles.map((c) => c.close)
  const swings = findSwings(candles, SWING_N)
  return {
    candles,
    e20: ema(closes, 20),
    e50: ema(closes, 50),
    e200: ema(closes, 200),
    macd: macd(closes, 12, 26, 9),
    rsi: rsi(closes, 14),
    atr: atr(candles, 14),
    adx: adx(candles, 14),
    st: supertrend(candles, 10, 3),
    swings,
    bos: findBreaks(candles, swings),
  }
}

/** N-bar fractal swings. A swing at j is only known once bar j+N has closed. */
function findSwings(c: Candle[], n: number): Swing[] {
  const out: Swing[] = []
  for (let j = n; j < c.length - n; j++) {
    let isH = true
    let isL = true
    for (let k = 1; k <= n; k++) {
      if (!(c[j].high > c[j - k].high && c[j].high >= c[j + k].high)) isH = false
      if (!(c[j].low < c[j - k].low && c[j].low <= c[j + k].low)) isL = false
    }
    if (isH) out.push({ index: j, confirmIndex: j + n, price: c[j].high, kind: 'H' })
    if (isL) out.push({ index: j, confirmIndex: j + n, price: c[j].low, kind: 'L' })
  }
  return out.sort((a, b) => a.confirmIndex - b.confirmIndex)
}

/** Break of structure: a candle CLOSE beyond the latest confirmed, still-unbroken swing. */
function findBreaks(c: Candle[], swings: Swing[]): (Bos | null)[] {
  const out: (Bos | null)[] = new Array(c.length).fill(null)
  let p = 0
  let hi: { level: number; broken: boolean } | null = null
  let lo: { level: number; broken: boolean } | null = null
  for (let k = 0; k < c.length; k++) {
    while (p < swings.length && swings[p].confirmIndex <= k) {
      const s = swings[p++]
      if (s.kind === 'H') hi = { level: s.price, broken: false }
      else lo = { level: s.price, broken: false }
    }
    if (hi && !hi.broken && c[k].close > hi.level) {
      hi.broken = true
      out[k] = { direction: 'BUY', level: hi.level }
    } else if (lo && !lo.broken && c[k].close < lo.level) {
      lo.broken = true
      out[k] = { direction: 'SELL', level: lo.level }
    }
  }
  return out
}

/** Swings confirmed at or before bar i, most recent last. */
function knownSwings(s: Series, i: number, kind: 'H' | 'L', max = 12): Swing[] {
  const res: Swing[] = []
  for (let k = s.swings.length - 1; k >= 0 && res.length < max; k--) {
    const sw = s.swings[k]
    if (sw.confirmIndex > i || sw.kind !== kind) continue
    res.unshift(sw)
  }
  return res
}

// ── Engines ─────────────────────────────────────────────────────────────────

const v = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? null : x)
const voteOf = (bull: boolean, bear: boolean): Vote => (bull ? 'bull' : bear ? 'bear' : 'mixed')
const dirOf = (conds: Condition[]): Bias =>
  conds.every((c) => c.vote === 'bull') ? 'BUY' : conds.every((c) => c.vote === 'bear') ? 'SELL' : 'NEUTRAL'

export function runV1(s: Series, i: number, fmt: (n: number) => string = String): EngineReport {
  const close = s.candles[i]?.close
  const e20 = v(s.e20[i])
  const e50 = v(s.e50[i])
  const e200 = v(s.e200[i])
  const m = v(s.macd.line[i])
  const sig = v(s.macd.signal[i])
  const ok = e20 != null && e50 != null && e200 != null
  const conditions: Condition[] = [
    {
      id: 'stack',
      label: 'EMA 20 / 50 / 200 stack',
      vote: ok ? voteOf(e20! > e50! && e50! > e200!, e20! < e50! && e50! < e200!) : 'mixed',
      detail: ok ? `${fmt(e20!)} / ${fmt(e50!)} / ${fmt(e200!)}` : 'Not enough history for EMA 200',
    },
    {
      id: 'close200',
      label: 'Close vs EMA 200',
      vote: ok ? voteOf(close > e200!, close < e200!) : 'mixed',
      detail: ok ? `Close ${fmt(close)} ${close > e200! ? 'above' : 'below'} EMA 200` : '—',
    },
    {
      id: 'macd',
      label: 'MACD (12,26,9) vs signal',
      vote: m != null && sig != null ? voteOf(m > sig, m < sig) : 'mixed',
      detail: m != null && sig != null ? `MACD ${m > sig ? 'above' : 'below'} signal (hist ${(m - sig).toPrecision(3)})` : '—',
    },
  ]
  return { name: 'V1 · Trend engine', direction: dirOf(conditions), conditions }
}

function lastBos(s: Series, i: number) {
  for (let k = i; k >= Math.max(0, i - BOS_LOOKBACK); k--) {
    const b = s.bos[k]
    if (b) return { ...b, index: k }
  }
  return null
}

export function runV2(s: Series, i: number, fmt: (n: number) => string = String): EngineReport {
  const r = v(s.rsi[i])
  const st = s.st.dir[i]
  const close = s.candles[i]?.close
  const b = lastBos(s, i)
  const holds = b ? (b.direction === 'BUY' ? close > b.level : close < b.level) : false
  const conditions: Condition[] = [
    {
      id: 'rsi',
      label: 'RSI 14 vs 50',
      vote: r != null ? voteOf(r > 50, r < 50) : 'mixed',
      detail: r != null ? `RSI ${r.toFixed(1)}` : '—',
    },
    {
      id: 'supertrend',
      label: 'Supertrend (10, 3)',
      vote: st == null ? 'mixed' : st === 1 ? 'bull' : 'bear',
      detail: st == null ? '—' : `${st === 1 ? 'Bullish' : 'Bearish'} · line ${fmt(s.st.line[i]!)}`,
    },
    {
      id: 'bos',
      label: 'Confirmed break of structure',
      vote: b && holds ? (b.direction === 'BUY' ? 'bull' : 'bear') : 'mixed',
      detail: b
        ? `${b.direction === 'BUY' ? 'Bullish' : 'Bearish'} BOS ${i - b.index} bar(s) ago at ${fmt(b.level)}${holds ? '' : ' — price back inside the broken level'}`
        : `No candle close beyond a confirmed swing in the last ${BOS_LOOKBACK} bars`,
    },
  ]
  return { name: 'V2 · Momentum & structure engine', direction: dirOf(conditions), conditions }
}

// ── Evaluation ──────────────────────────────────────────────────────────────

export interface EvaluateOptions {
  instrument: Instrument
  timeframe: Timeframe
  minScore?: number
  /** Wall-clock for freshness / market-open checks. Omit in backtests. */
  now?: number
  htf?: { series: Series; timeframe: EngineTimeframe } | null
  strategyStatus?: StrategyStatus
}

function htfIndex(htf: Series, htfTf: EngineTimeframe, closeTimeSec: number) {
  const len = engineMinutes(htfTf) * 60
  const c = htf.candles
  let lo = 0
  let hi = c.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (c[mid].time + len <= closeTimeSec) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return ans
}

export function evaluateAt(s: Series, i: number, o: EvaluateOptions): Analysis {
  const inst = o.instrument
  const minScore = o.minScore ?? 80
  const tfSec = tfMinutes(o.timeframe) * 60
  const c = s.candles
  const bar = c[i]
  const close = bar.close
  const round = (p: number) => Number((Math.round(p / inst.tickSize) * inst.tickSize).toFixed(inst.digits))
  const fmt = (n: number) => n.toFixed(inst.digits)
  const a = v(s.atr[i])
  const e20 = v(s.e20[i])

  const v1 = runV1(s, i, fmt)
  const v2 = runV2(s, i, fmt)
  const aligned = v1.direction !== 'NEUTRAL' && v1.direction === v2.direction
  const dir: Direction | null = v1.direction !== 'NEUTRAL' ? v1.direction : v2.direction !== 'NEUTRAL' ? v2.direction : null
  const up = dir === 'BUY'
  const sgn = up ? 1 : -1

  // Higher timeframe V1 bias, using only HTF candles closed by this bar's close.
  let higherTimeframe: Analysis['higherTimeframe'] = null
  if (o.htf) {
    const h = htfIndex(o.htf.series, o.htf.timeframe, bar.time + tfSec)
    if (h >= 0) {
      const r = runV1(o.htf.series, h)
      const he20 = v(o.htf.series.e20[h])
      const he50 = v(o.htf.series.e50[h])
      const partial: Bias = he20 == null || he50 == null ? 'NEUTRAL' : he20 > he50 ? 'BUY' : he20 < he50 ? 'SELL' : 'NEUTRAL'
      higherTimeframe = { timeframe: o.htf.timeframe, direction: r.direction, partial }
    }
  }

  // Structure context.
  const highs = knownSwings(s, i, 'H')
  const lows = knownSwings(s, i, 'L')
  const sh = highs.at(-1)?.price ?? null
  const sl0 = lows.at(-1)?.price ?? null
  const hh = highs.length >= 2 && highs.at(-1)!.price > highs.at(-2)!.price
  const hl = lows.length >= 2 && lows.at(-1)!.price > lows.at(-2)!.price
  const lh = highs.length >= 2 && highs.at(-1)!.price < highs.at(-2)!.price
  const ll = lows.length >= 2 && lows.at(-1)!.price < lows.at(-2)!.price
  const sequence = `${hh ? 'HH' : lh ? 'LH' : '—'} / ${hl ? 'HL' : ll ? 'LL' : '—'}`
  const bos = lastBos(s, i)

  // Levels: market entry at the last closed price, stop beyond structure + ATR buffer + spread.
  const spread = inst.spreadPips > 0 ? inst.spreadPips * inst.pipSize : close * 0.0002
  let levels: Levels | null = null
  let stopAtr = 0
  if (dir && a) {
    const minStop = close - sgn * STOP_MIN_ATR * a
    const swing = (up ? lows : highs)
      .slice()
      .reverse()
      .find((sw) => (up ? sw.price < close : sw.price > close) && i - sw.index <= 60)
    const structStop = swing ? swing.price - sgn * 0.3 * a : close - sgn * 1.5 * a
    const raw = up ? Math.min(structStop, minStop) : Math.max(structStop, minStop)
    const sl = round(raw - sgn * spread)
    const entry = round(close)
    const R = Math.abs(entry - sl)
    stopAtr = R / a
    levels = {
      direction: dir,
      entryType: 'MARKET',
      entry,
      sl,
      tp1: round(entry + sgn * TARGETS_R[0] * R),
      tp2: round(entry + sgn * TARGETS_R[1] * R),
      tp3: round(entry + sgn * TARGETS_R[2] * R),
    }
  }
  const R = levels ? Math.abs(levels.entry - levels.sl) : 0

  // ── Score (quality points 20/20/15/15/15/15 — never a probability) ──
  const vote = up ? 'bull' : 'bear'
  const v1c = Object.fromEntries(v1.conditions.map((x) => [x.id, x.vote === vote]))
  const v2c = Object.fromEntries(v2.conditions.map((x) => [x.id, x.vote === vote]))
  const trend = !dir ? 0 : (v1c.stack ? 10 : 0) + (v1c.close200 ? 5 : 0) + (v1c.macd ? 5 : 0)

  const seqHits = !dir ? 0 : up ? +hh + +hl : +lh + +ll
  const structure = !dir ? 0 : (v2c.bos ? 12 : 0) + (seqHits === 2 ? 8 : seqHits === 1 ? 4 : 0)

  let roomR: number | null = null
  if (levels) {
    const opp = (up ? highs : lows).filter((sw) => (up ? sw.price > levels!.entry : sw.price < levels!.entry))
    if (opp.length) {
      const nearest = up ? Math.min(...opp.map((x) => x.price)) : Math.max(...opp.map((x) => x.price))
      roomR = Math.abs(nearest - levels.entry) / R
    }
  }
  const supportResistance = !levels ? 0 : roomR == null || roomR >= 2.5 ? 15 : roomR >= 1.5 ? 10 : roomR >= 1 ? 5 : 0

  const r14 = v(s.rsi[i])
  const hist = v(s.macd.hist[i])
  const histPrev = v(s.macd.hist[i - 1])
  const rsiSide = r14 != null && (up ? r14 > 50 : r14 < 50)
  const rsiRoom = r14 != null && (up ? r14 <= 70 : r14 >= 30)
  const histAligned = hist != null && (up ? hist > 0 : hist < 0)
  const histExpanding = histAligned && histPrev != null && Math.abs(hist!) > Math.abs(histPrev)
  const momentum = !dir ? 0 : (rsiSide ? 5 : 0) + (rsiRoom ? 5 : 0) + (histExpanding ? 5 : histAligned ? 3 : 0)

  const htfOpp = !!dir && !!higherTimeframe && higherTimeframe.direction !== 'NEUTRAL' && higherTimeframe.direction !== dir
  const multiTimeframe =
    !dir || !higherTimeframe
      ? 0
      : higherTimeframe.direction === dir
        ? 15
        : htfOpp
          ? 0
          : higherTimeframe.partial === dir
            ? 8
            : 4

  const adxV = v(s.adx.adx[i])
  const atrHist = s.atr.slice(Math.max(0, i - 99), i + 1).filter((x): x is number => x != null)
  const atrRatio = a ? a / (median(atrHist) || a) : 0
  const spreadShare = R > 0 ? spread / R : 1
  const risk = !dir
    ? 0
    : (adxV != null && adxV >= 25 ? 5 : adxV != null && adxV >= ADX_MIN ? 3 : 0) +
      (atrRatio >= 0.7 && atrRatio <= 1.8 ? 5 : atrRatio >= 0.5 && atrRatio <= 2.5 ? 3 : 0) +
      (spreadShare < 0.1 ? 5 : spreadShare < 0.2 ? 2 : 0)

  const components: ScoreComponents = { trend, structure, supportResistance, momentum, multiTimeframe, risk }
  const score = Object.values(components).reduce((x, y) => x + y, 0)

  // ── Gates ──
  const closeTime = bar.time + tfSec
  let freshPass = true
  let freshDetail = 'Historical evaluation'
  if (o.now != null) {
    const ageMin = (o.now / 1000 - closeTime) / 60
    const limitMin = Math.max(2 * tfMinutes(o.timeframe), 90)
    const marketOpen = inst.alwaysOpen ? true : inst.category === 'Forex' ? isForexMarketOpen(new Date(o.now)) : true
    freshPass = marketOpen && ageMin <= limitMin
    freshDetail = !marketOpen
      ? 'Market is closed — no new setups until it reopens'
      : ageMin <= limitMin
        ? `Last closed candle ${Math.max(0, Math.round(ageMin))} min ago`
        : `Last closed candle ${Math.round(ageMin)} min ago (limit ${limitMin}) — market closed or feed stale`
  }
  const extension = a && e20 != null ? Math.abs(close - e20) / a : Infinity
  const checks: Check[] = [
    { id: 'history', label: `At least ${MIN_HISTORY} closed candles`, pass: i + 1 >= MIN_HISTORY, detail: `${i + 1} closed candles available` },
    { id: 'fresh', label: 'Market open & data fresh', pass: freshPass, detail: freshDetail },
    { id: 'v1', label: 'V1 trend engine confirms', pass: v1.direction !== 'NEUTRAL', detail: v1.direction === 'NEUTRAL' ? 'Trend conditions mixed' : `V1 ${v1.direction}` },
    { id: 'v2', label: 'V2 momentum & structure confirms', pass: v2.direction !== 'NEUTRAL', detail: v2.direction === 'NEUTRAL' ? 'Momentum / structure conditions mixed' : `V2 ${v2.direction}` },
    { id: 'aligned', label: 'V1 and V2 agree', pass: aligned, detail: `V1 ${v1.direction} · V2 ${v2.direction}` },
    {
      id: 'htf',
      label: 'Higher timeframe not opposing',
      pass: !htfOpp,
      detail: higherTimeframe ? `${higherTimeframe.timeframe} V1 ${higherTimeframe.direction}` : 'Higher timeframe unavailable',
    },
    { id: 'adx', label: `ADX 14 ≥ ${ADX_MIN} (trend strength)`, pass: adxV != null && adxV >= ADX_MIN, detail: adxV != null ? `ADX ${adxV.toFixed(1)}` : '—' },
    { id: 'volatility', label: 'Volatility within normal band', pass: atrRatio >= 0.5 && atrRatio <= 2.5, detail: a ? `ATR 14 ${fmt(a)} = ${atrRatio.toFixed(2)}× its 100-bar median` : '—' },
    { id: 'extension', label: `Price within ${MAX_EXTENSION_ATR} ATR of EMA 20`, pass: extension <= MAX_EXTENSION_ATR, detail: Number.isFinite(extension) ? `${extension.toFixed(2)} ATR from EMA 20` : '—' },
    {
      id: 'stop',
      label: `Stop ${STOP_MIN_ATR}–${STOP_MAX_ATR} ATR beyond structure`,
      pass: !!levels && stopAtr >= STOP_MIN_ATR * 0.95 && stopAtr <= STOP_MAX_ATR,
      detail: levels ? `${(R / inst.pipSize).toFixed(1)} ${inst.unit} = ${stopAtr.toFixed(2)} ATR` : '—',
    },
    { id: 'spread', label: 'Spread < 20% of stop distance', pass: !!levels && spreadShare < 0.2, detail: levels ? `${(spread / inst.pipSize).toFixed(1)} ${inst.unit} modelled spread (${(spreadShare * 100).toFixed(1)}%)` : '—' },
    { id: 'rr', label: 'TP1 ≥ 1:1.5 reward-to-risk', pass: !!levels, detail: levels ? `TP1 ${TARGETS_R[0]}R · TP2 ${TARGETS_R[1]}R · TP3 ${TARGETS_R[2]}R` : '—' },
    { id: 'score', label: `Quality score ≥ ${minScore}`, pass: score >= minScore, detail: `${score}/100 quality points` },
  ]
  const qualified = checks.every((x) => x.pass)
  const decision: Decision = qualified && dir ? dir : 'NO_TRADE'

  const reasons: string[] = []
  if (dir) {
    for (const x of [...v1.conditions, ...v2.conditions]) if (x.vote === vote) reasons.push(`${x.label}: ${x.detail}`)
    if (adxV != null) reasons.push(`ADX ${adxV.toFixed(1)} — ${adxV >= 25 ? 'strong' : adxV >= ADX_MIN ? 'adequate' : 'weak'} trend`)
    if (higherTimeframe) reasons.push(`${higherTimeframe.timeframe} trend engine ${higherTimeframe.direction}`)
    if (roomR != null) reasons.push(`Nearest opposing swing ${roomR.toFixed(1)}R away`)
  }
  const failed = checks.filter((x) => !x.pass)
  const explanation =
    decision !== 'NO_TRADE'
      ? `${decision}: V1 and V2 both confirm on ${o.timeframe}. ${v1.conditions.map((x) => x.detail).join('; ')}. ${v2.conditions.map((x) => x.detail).join('; ')}. Stop sits beyond the last swing ${up ? 'low' : 'high'} with an ATR buffer and spread.`
      : `NO TRADE. ${failed.slice(0, 3).map((x) => `${x.label} — ${x.detail}`).join('; ')}.`

  return {
    symbol: inst.symbol,
    timeframe: o.timeframe,
    decision,
    dataAsOf: new Date(closeTime * 1000).toISOString(),
    setupCandleTime: bar.time,
    candlesUsed: i + 1,
    lastClose: close,
    v1,
    v2,
    higherTimeframe,
    indicators: {
      ema20: e20,
      ema50: v(s.e50[i]),
      ema200: v(s.e200[i]),
      macd: v(s.macd.line[i]),
      macdSignal: v(s.macd.signal[i]),
      macdHist: hist,
      rsi14: r14,
      adx14: adxV,
      plusDI: v(s.adx.plusDI[i]),
      minusDI: v(s.adx.minusDI[i]),
      atr14: a,
      supertrend: v(s.st.line[i]),
      supertrendDir: s.st.dir[i] === 1 ? 'BUY' : s.st.dir[i] === -1 ? 'SELL' : 'NEUTRAL',
    },
    structure: {
      lastBos: bos ? { direction: bos.direction, level: bos.level, time: c[bos.index].time, barsAgo: i - bos.index } : null,
      sequence,
      swingHigh: sh,
      swingLow: sl0,
    },
    score,
    components,
    checks,
    levels: decision !== 'NO_TRADE' ? levels : null,
    riskReward: decision !== 'NO_TRADE' && levels ? { tp1: TARGETS_R[0], tp2: TARGETS_R[1], tp3: TARGETS_R[2] } : null,
    strategy: STRATEGY_NAME,
    strategyStatus: o.strategyStatus ?? 'UNVERIFIED',
    explanation,
    reasons,
  }
}

/** Analyse the latest closed candle. Returns null when there are no candles at all. */
export function analyze(candles: Candle[], o: EvaluateOptions & { htfCandles?: Candle[] | null; htfTimeframe?: EngineTimeframe }) {
  if (!candles.length) return null
  const s = computeSeries(candles)
  const htf = o.htfCandles?.length && o.htfTimeframe ? { series: computeSeries(o.htfCandles), timeframe: o.htfTimeframe } : null
  return evaluateAt(s, candles.length - 1, { ...o, htf })
}
