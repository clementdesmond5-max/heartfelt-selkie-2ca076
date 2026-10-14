import { getInstrument } from './instruments'

export const fmtPrice = (symbol: string, price: number) =>
  price.toFixed(getInstrument(symbol).digits)

export const toPips = (symbol: string, distance: number) =>
  Math.abs(distance) / getInstrument(symbol).pipSize

export const fmtPips = (symbol: string, distance: number) =>
  `${toPips(symbol, distance).toFixed(1)} pips`

export const fmtRR = (rr: number) => `1:${rr.toFixed(rr % 1 === 0 ? 1 : 2).replace(/0$/, '')}`

export function fmtTime(iso: string, timeZone?: string) {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function fmtAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export const cn = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(' ')
