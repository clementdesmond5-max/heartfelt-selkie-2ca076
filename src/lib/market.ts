// Live market data. Candles come from the Yahoo Finance chart API on the
// server (no API key required) and are trimmed to CLOSED candles only, so the
// engine never evaluates a bar that is still forming. The browser calls the
// server functions below; it never talks to the provider directly.

import { createServerFn } from '@tanstack/react-start'
import { analyze, HIGHER_TF, type Analysis, type EngineTimeframe } from '../engine/analyze'
import { ema, last, type Candle } from '../engine/indicators'
import { findInstrument, getInstrument, isTimeframe, isValidProviderSymbol, type Timeframe } from './instruments'

export const MARKET_PROVIDER = 'Yahoo Finance'

/** Provider interval + lookback per timeframe. H4 is aggregated from 1h bars (Yahoo has no 4h interval). */
const FEED: Record<EngineTimeframe, { interval: string; range: string; aggregate?: number }> = {
  M15: { interval: '15m', range: '30d' },
  M30: { interval: '30m', range: '30d' },
  H1: { interval: '60m', range: '6mo' },
  H4: { interval: '60m', range: '1y', aggregate: 4 },
  D1: { interval: '1d', range: '2y' },
  W1: { interval: '1wk', range: '10y' },
}
const TF_SEC: Record<EngineTimeframe, number> = { M15: 900, M30: 1800, H1: 3600, H4: 14400, D1: 86400, W1: 604800 }

// Short-lived per-instance cache to stay polite with the provider. Not persistence.
const cache = new Map<string, { at: number; candles: Candle[] }>()
const CACHE_MS = 45_000

async function fetchYahoo(provider: string, interval: string, range: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(provider)}?interval=${interval}&range=${range}&includePrePost=false`
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (ForexSignal AI Pro)', Accept: 'application/json' } })
      if (res.status === 404) throw new Error(`Unknown symbol ${provider}`)
      if (!res.ok) throw new Error(`Market data provider returned ${res.status}`)
      const json = (await res.json()) as any
      const r = json?.chart?.result?.[0]
      if (!r) throw new Error(json?.chart?.error?.description ?? 'Empty response from market data provider')
      const t: number[] = r.timestamp ?? []
      const q = r.indicators?.quote?.[0] ?? {}
      const out: Candle[] = []
      for (let i = 0; i < t.length; i++) {
        const [o, h, l, c] = [q.open?.[i], q.high?.[i], q.low?.[i], q.close?.[i]]
        if ([o, h, l, c].some((x) => x == null || !Number.isFinite(x))) continue
        out.push({ time: t[i], open: o, high: Math.max(h, o, c), low: Math.min(l, o, c), close: c })
      }
      return out
    } catch (e) {
      lastErr = e
      if (e instanceof Error && e.message.startsWith('Unknown symbol')) break
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Market data unavailable')
}

/** Buckets bars into fixed UTC windows (dedupes the provider's live tick) and drops any window that has not closed yet. */
function toClosed(bars: Candle[], tf: EngineTimeframe, nowSec: number): Candle[] {
  const step = TF_SEC[tf]
  const intraday = step < 86400
  const map = new Map<number, Candle>()
  for (const b of bars) {
    const key = intraday ? Math.floor(b.time / step) * step : b.time
    const cur = map.get(key)
    if (!cur) map.set(key, { ...b, time: key })
    else {
      cur.high = Math.max(cur.high, b.high)
      cur.low = Math.min(cur.low, b.low)
      cur.close = b.close
    }
  }
  return [...map.values()].sort((a, b) => a.time - b.time).filter((c) => c.time + step <= nowSec)
}

export async function getClosedCandles(provider: string, tf: EngineTimeframe): Promise<Candle[]> {
  const key = `${provider}:${tf}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.candles
  const f = FEED[tf]
  const raw = await fetchYahoo(provider, f.interval, f.range)
  // Daily/weekly bars carry the session open time; trust them but drop the still-open last bar.
  const candles = toClosed(raw, tf, Math.floor(Date.now() / 1000))
  cache.set(key, { at: Date.now(), candles })
  return candles
}

function resolveSymbol(symbol: unknown) {
  if (typeof symbol !== 'string' || !(findInstrument(symbol) || isValidProviderSymbol(symbol))) throw new Error('Unknown instrument')
  return getInstrument(symbol)
}

// ── Server functions ────────────────────────────────────────────────────────

export interface LiveScan {
  analysis: Analysis | null
  candles: Candle[]
  fetchedAt: string
  provider: string
  providerNote?: string
}

export const scanMarket = createServerFn({ method: 'GET' })
  .validator((d: { symbol: string; timeframe: Timeframe; minScore?: number }) => {
    if (!isTimeframe(d?.timeframe)) throw new Error('Unknown timeframe')
    resolveSymbol(d.symbol)
    // The 80-point floor is enforced here too; users may raise it, never lower it.
    const minScore = Math.min(100, Math.max(80, Math.round(Number(d.minScore) || 80)))
    return { symbol: d.symbol, timeframe: d.timeframe, minScore }
  })
  .handler(async ({ data }): Promise<LiveScan> => {
    const inst = resolveSymbol(data.symbol)
    const htfTf = HIGHER_TF[data.timeframe]
    const [candles, htfCandles] = await Promise.all([
      getClosedCandles(inst.provider, data.timeframe),
      getClosedCandles(inst.provider, htfTf).catch(() => null),
    ])
    const analysis = analyze(candles, {
      instrument: inst,
      timeframe: data.timeframe,
      minScore: data.minScore,
      now: Date.now(),
      htfCandles,
      htfTimeframe: htfTf,
    })
    return {
      analysis,
      candles: candles.slice(-300),
      fetchedAt: new Date().toISOString(),
      provider: MARKET_PROVIDER,
      providerNote: inst.providerNote,
    }
  })

export interface Quote {
  symbol: string
  price: number
  changePct: number
  bias: 'BUY' | 'SELL' | 'NEUTRAL'
  asOf: string
  spark: number[]
}

export const getQuotes = createServerFn({ method: 'GET' })
  .validator((d: { symbols: string[] }) => {
    if (!Array.isArray(d?.symbols)) throw new Error('symbols must be an array')
    return { symbols: d.symbols.filter((s) => typeof s === 'string').slice(0, 40) }
  })
  .handler(async ({ data }) => {
    const out = await Promise.all(
      data.symbols.map(async (symbol): Promise<Quote | null> => {
        try {
          const inst = resolveSymbol(symbol)
          const c = await getClosedCandles(inst.provider, 'H1')
          if (c.length < 60) return null
          const closes = c.map((x) => x.close)
          const now = closes[closes.length - 1]
          const prev = closes[Math.max(0, closes.length - 25)]
          const e20 = last(ema(closes, 20))!
          const e50 = last(ema(closes, 50))!
          return {
            symbol: inst.symbol,
            price: now,
            changePct: ((now - prev) / prev) * 100,
            bias: e20 > e50 && now > e50 ? 'BUY' : e20 < e50 && now < e50 ? 'SELL' : 'NEUTRAL',
            asOf: new Date((c[c.length - 1].time + 3600) * 1000).toISOString(),
            spark: closes.slice(-48),
          }
        } catch {
          return null
        }
      }),
    )
    return { quotes: out.filter((q): q is Quote => q !== null), fetchedAt: new Date().toISOString() }
  })
