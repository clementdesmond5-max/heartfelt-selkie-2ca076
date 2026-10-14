import { useEffect, useRef } from 'react'
import type { Candle } from '@/engine/indicators'
import { ema } from '@/engine/indicators'
import type { Levels } from '@/lib/fixtures'
import { getInstrument } from '@/lib/instruments'

/** TradingView Lightweight Charts candlestick view with EMA overlays and optional signal levels. */
export function CandleChart({
  candles,
  symbol,
  levels,
  height = 340,
}: {
  candles: Candle[]
  symbol: string
  levels?: Levels | null
  height?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}
    import('lightweight-charts').then(({ createChart, CandlestickSeries, LineSeries, LineStyle, CrosshairMode }) => {
      if (disposed || !ref.current) return
      const inst = getInstrument(symbol)
      const chart = createChart(ref.current, {
        height,
        autoSize: true,
        layout: {
          background: { color: 'transparent' },
          textColor: '#7d8a9c',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11,
          attributionLogo: false,
        },
        grid: { vertLines: { color: '#1a2330' }, horzLines: { color: '#1a2330' } },
        rightPriceScale: { borderColor: '#243041' },
        timeScale: { borderColor: '#243041', timeVisible: true, secondsVisible: false },
        crosshair: { mode: CrosshairMode.Normal },
      })
      const fmt = { type: 'price' as const, precision: inst.digits, minMove: inst.tickSize }
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#2dd4a0',
        downColor: '#f2556b',
        borderVisible: false,
        wickUpColor: '#2dd4a0',
        wickDownColor: '#f2556b',
        priceFormat: fmt,
      })
      series.setData(candles.map((c) => ({ ...c, time: c.time as never })))

      const closes = candles.map((c) => c.close)
      for (const [period, color] of [[20, '#22d3ee'], [50, '#3b82f6'], [200, '#a78bfa']] as const) {
        const line = chart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          priceFormat: fmt,
        })
        const vals = ema(closes, period)
        line.setData(
          candles.flatMap((c, i) => (vals[i] == null ? [] : [{ time: c.time as never, value: vals[i]! }])),
        )
      }

      if (levels) {
        const add = (price: number, color: string, title: string, dashed = true) =>
          series.createPriceLine({
            price,
            color,
            lineWidth: 1,
            lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
            axisLabelVisible: true,
            title,
          })
        add(levels.entry, '#e3e9f1', 'Entry', false)
        add(levels.sl, '#f2556b', 'SL')
        add(levels.tp1, '#2dd4a0', 'TP1')
        add(levels.tp2, '#2dd4a0', 'TP2')
        add(levels.tp3, '#2dd4a0', 'TP3')
      }

      chart.timeScale().setVisibleLogicalRange({ from: candles.length - 90, to: candles.length + 4 })
      cleanup = () => chart.remove()
    })
    return () => {
      disposed = true
      cleanup()
    }
  }, [candles, symbol, levels, height])

  return <div ref={ref} style={{ height }} className="w-full" />
}

export function ChartLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-400">
      <span className="flex items-center gap-1.5"><i className="h-0.5 w-3 bg-[#22d3ee]" />EMA 20</span>
      <span className="flex items-center gap-1.5"><i className="h-0.5 w-3 bg-[#3b82f6]" />EMA 50</span>
      <span className="flex items-center gap-1.5"><i className="h-0.5 w-3 bg-[#a78bfa]" />EMA 200</span>
    </div>
  )
}
