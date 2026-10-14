import { createFileRoute, Link } from '@tanstack/react-router'
import { ImageUp, ScanSearch, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PageHeader, Panel, SetupRequired } from '@/components/ui'

export const Route = createFileRoute('/_app/screenshot')({
  component: ScreenshotPage,
})

const MAX_MB = 8

const WILL_READ = [
  'Instrument and timeframe, when visible on the chart',
  'Visible candlestick structure and trend direction',
  'Approximate support and resistance zones',
  'Readable price-axis levels and common indicators',
  'A plain-language explanation of any potential Buy or Sell setup',
]

function ScreenshotPage() {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  const pick = (f: File | undefined) => {
    setAttempted(false)
    setError(null)
    if (!f) return
    if (!f.type.startsWith('image/')) return setError('Please choose an image file (PNG, JPG or WebP).')
    if (f.size > MAX_MB * 1024 * 1024) return setError(`Image is larger than ${MAX_MB} MB. Crop or compress it and try again.`)
    if (url) URL.revokeObjectURL(url)
    setFile(f)
    setUrl(URL.createObjectURL(f))
  }

  return (
    <>
      <PageHeader
        title="Screenshot analysis"
        subtitle="Upload a chart from your gallery for a visual read of structure and zones. Exact entry, SL and TP are always re-checked against real market data."
        right={<SetupRequired />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel bodyClass="p-0">
          {!url ? (
            <button
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }}
              className="grid-bg flex min-h-[340px] w-full flex-col items-center justify-center gap-3 rounded-xl p-8 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-signal-cyan/40 bg-signal-cyan/10">
                <ImageUp className="text-signal-cyan" />
              </span>
              <span className="text-base font-medium text-ink-100">Choose a chart screenshot</span>
              <span className="max-w-xs text-sm text-ink-400">Tap to open your gallery. PNG, JPG or WebP up to {MAX_MB} MB. Include the price axis and pair name for best results.</span>
            </button>
          ) : (
            <div>
              <img src={url} alt="Uploaded chart" className="max-h-[520px] w-full rounded-t-xl bg-ink-950 object-contain" />
              <div className="flex flex-wrap items-center gap-2 border-t border-ink-800 p-3">
                <span className="num mr-auto truncate text-xs text-ink-400">{file?.name} · {((file?.size ?? 0) / 1024).toFixed(0)} KB</span>
                <button onClick={() => { setFile(null); setUrl(null); setAttempted(false) }} className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2 text-sm text-ink-300">
                  <Trash2 size={15} /> Remove
                </button>
                <button onClick={() => setAttempted(true)} className="flex items-center gap-1.5 rounded-lg bg-signal-cyan px-4 py-2 text-sm font-semibold text-ink-950">
                  <ScanSearch size={15} /> Analyse chart
                </button>
              </div>
            </div>
          )}
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {error && <p className="border-t border-ink-800 px-4 py-3 text-sm text-bear">{error}</p>}
        </Panel>

        <div className="space-y-5">
          {attempted && (
            <Panel title="Analysis" right={<SetupRequired />} className="rise">
              <p className="text-sm leading-relaxed text-ink-300">
                The vision analysis service isn't connected yet, so no analysis was performed on this image. Nothing has been inferred from it.
              </p>
              <Link to="/help" className="mt-3 inline-block text-sm text-signal-cyan hover:underline">How to enable screenshot analysis →</Link>
            </Panel>
          )}
          <Panel title="What the analysis reads">
            <ul className="space-y-2 text-sm text-ink-300">
              {WILL_READ.map((w) => <li key={w} className="flex gap-2"><span className="text-signal-cyan">›</span>{w}</li>)}
            </ul>
          </Panel>
          <Panel title="Ground rules">
            <ul className="space-y-2 text-xs leading-relaxed text-ink-400">
              <li>Unclear or cropped charts get a request for a clearer image — never a guess.</li>
              <li>No invisible candles or precise prices are invented from a screenshot.</li>
              <li>Any potential setup is validated against live candles before it can become a signal.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
