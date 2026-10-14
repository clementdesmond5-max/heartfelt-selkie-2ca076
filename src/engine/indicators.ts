// Core indicator maths. Pure, deterministic functions over closed candles,
// shared by the browser (chart overlays) and the Netlify Functions (engine).

export interface Candle {
  time: number // unix seconds, candle open time
  open: number
  high: number
  low: number
  close: number
}

/** Exponential moving average, seeded with the SMA of the first `period` values. */
export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null)
  if (values.length < period) return out
  const k = 2 / (period + 1)
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  out[period - 1] = prev
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

/** Wilder's RSI. */
export function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null)
  if (closes.length <= period) return out
  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gain += d
    else loss -= d
  }
  gain /= period
  loss /= period
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss)
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    gain = (gain * (period - 1) + Math.max(d, 0)) / period
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss)
  }
  return out
}

/** Wilder's Average True Range. */
export function atr(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null)
  if (candles.length <= period) return out
  const tr = candles.map((c, i) =>
    i === 0
      ? c.high - c.low
      : Math.max(
          c.high - c.low,
          Math.abs(c.high - candles[i - 1].close),
          Math.abs(c.low - candles[i - 1].close),
        ),
  )
  let prev = tr.slice(1, period + 1).reduce((a, b) => a + b, 0) / period
  out[period] = prev
  for (let i = period + 1; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period
    out[i] = prev
  }
  return out
}

export const last = <T,>(arr: (T | null)[]): T | null => {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i]
  return null
}

/** MACD (fast EMA − slow EMA) with an EMA signal line, all seeded with SMAs. */
export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const f = ema(closes, fast)
  const s = ema(closes, slow)
  const line: (number | null)[] = closes.map((_, i) => (f[i] != null && s[i] != null ? f[i]! - s[i]! : null))
  const start = line.findIndex((v) => v != null)
  const sig: (number | null)[] = new Array(closes.length).fill(null)
  if (start >= 0) {
    const tail = ema(line.slice(start) as number[], signal)
    tail.forEach((v, j) => (sig[start + j] = v))
  }
  const hist = line.map((v, i) => (v != null && sig[i] != null ? v - sig[i]! : null))
  return { line, signal: sig, hist }
}

/** Wilder's ADX with +DI / −DI. */
export function adx(candles: Candle[], period = 14) {
  const n = candles.length
  const adxOut: (number | null)[] = new Array(n).fill(null)
  const pdiOut: (number | null)[] = new Array(n).fill(null)
  const mdiOut: (number | null)[] = new Array(n).fill(null)
  if (n <= period * 2) return { adx: adxOut, plusDI: pdiOut, minusDI: mdiOut }
  const tr: number[] = [0]
  const pdm: number[] = [0]
  const mdm: number[] = [0]
  for (let i = 1; i < n; i++) {
    const c = candles[i]
    const p = candles[i - 1]
    const up = c.high - p.high
    const down = p.low - c.low
    pdm.push(up > down && up > 0 ? up : 0)
    mdm.push(down > up && down > 0 ? down : 0)
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)))
  }
  let sTr = 0
  let sP = 0
  let sM = 0
  for (let i = 1; i <= period; i++) {
    sTr += tr[i]
    sP += pdm[i]
    sM += mdm[i]
  }
  const dx: number[] = []
  for (let i = period; i < n; i++) {
    if (i > period) {
      sTr = sTr - sTr / period + tr[i]
      sP = sP - sP / period + pdm[i]
      sM = sM - sM / period + mdm[i]
    }
    const pdi = sTr === 0 ? 0 : (100 * sP) / sTr
    const mdi = sTr === 0 ? 0 : (100 * sM) / sTr
    pdiOut[i] = pdi
    mdiOut[i] = mdi
    dx.push(pdi + mdi === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / (pdi + mdi))
  }
  // First ADX = mean of the first `period` DX values, then Wilder smoothing.
  let prev = dx.slice(0, period).reduce((a, b) => a + b, 0) / period
  adxOut[period * 2 - 1] = prev
  for (let j = period; j < dx.length; j++) {
    prev = (prev * (period - 1) + dx[j]) / period
    adxOut[period + j] = prev
  }
  return { adx: adxOut, plusDI: pdiOut, minusDI: mdiOut }
}

/** Supertrend on hl2 ± multiplier × ATR (Wilder). dir: 1 bullish, −1 bearish. */
export function supertrend(candles: Candle[], period = 10, multiplier = 3) {
  const n = candles.length
  const a = atr(candles, period)
  const line: (number | null)[] = new Array(n).fill(null)
  const dir: (1 | -1 | null)[] = new Array(n).fill(null)
  let upper = 0
  let lower = 0
  let d: 1 | -1 = 1
  for (let i = 0; i < n; i++) {
    if (a[i] == null) continue
    const c = candles[i]
    const hl2 = (c.high + c.low) / 2
    const bu = hl2 + multiplier * a[i]!
    const bl = hl2 - multiplier * a[i]!
    if (i === 0 || line[i - 1] == null) {
      upper = bu
      lower = bl
      d = c.close >= hl2 ? 1 : -1
    } else {
      const pc = candles[i - 1].close
      upper = bu < upper || pc > upper ? bu : upper
      lower = bl > lower || pc < lower ? bl : lower
      if (d === -1 && c.close > upper) d = 1
      else if (d === 1 && c.close < lower) d = -1
    }
    dir[i] = d
    line[i] = d === 1 ? lower : upper
  }
  return { line, dir }
}

export function median(values: number[]) {
  if (!values.length) return 0
  const s = [...values].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
