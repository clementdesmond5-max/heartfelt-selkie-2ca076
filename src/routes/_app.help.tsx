import { createFileRoute } from '@tanstack/react-router'
import { IntegrationPill, PageHeader, Panel } from '@/components/ui'
import { INTEGRATIONS } from '@/lib/fixtures'

export const Route = createFileRoute('/_app/help')({
  component: HelpPage,
})

const ANDROID = [
  'Open the site in Chrome on your Android phone.',
  'Tap the ⋮ menu → "Add to Home screen" → Install.',
  'Open Telegram, then go to Settings in the app and tap "Link Telegram".',
  'Send a test message, close the app, and confirm it arrives.',
]

const FAQ = [
  { q: 'Does it place trades for me?', a: 'No. ForexSignal AI Pro is signal-only. It never connects to a broker, MT5 or any trading account.' },
  { q: 'What does a score of 85 mean?', a: '85 quality points out of 100 from six transparent rule groups. It is not an 85% chance of winning.' },
  { q: 'Why do I see "NO VALID SETUP" so often?', a: 'Most market conditions do not meet every check. Publishing fewer, cleaner setups is the point.' },
  { q: 'What does UNVERIFIED mean?', a: 'The strategy has fewer than 100 completed out-of-sample signals or does not yet show positive expectancy after costs. Its signals are never sent as verified alerts.' },
  { q: 'Do alerts work with the site closed?', a: 'Yes, once connected — scanning and Telegram delivery run on Netlify\'s servers on a schedule, independent of your phone or browser.' },
  { q: 'Is economic news filtered?', a: 'Only when a reliable economic-calendar source is configured. Until then the news filter is off and the app says so.' },
]

function HelpPage() {
  return (
    <>
      <PageHeader title="Help & setup" subtitle="What's connected, what still needs credentials, and how to get alerts on your Android phone." />

      <Panel title="Integration status" bodyClass="p-0">
        <ul className="divide-y divide-ink-800">
          {INTEGRATIONS.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink-100">{i.name}</div>
                <div className="text-xs text-ink-400">{i.purpose}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {i.envVars.map((v) => (
                    <code key={v} className="num rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-ink-300">{v}</code>
                  ))}
                </div>
              </div>
              <IntegrationPill state={i.state} />
            </li>
          ))}
        </ul>
      </Panel>
      <p className="mt-2 text-xs text-ink-400">
        Credentials are set as environment variables in the Netlify dashboard (Project configuration → Environment variables). They stay on the server and are never sent to your browser.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Market data">
          <p className="text-sm text-ink-300">
            Live candles come from Yahoo Finance on the server — no key is needed. Only closed candles are analysed; the bar that is still forming is ignored.
          </p>
          <p className="mt-3 text-xs text-ink-400">Metals and energy use the front-month futures contract as the price source, and spreads are modelled because the free feed has no bid/ask.</p>
        </Panel>
        <Panel title="Create the Telegram bot">
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-ink-300">
            <li>In Telegram, message <b className="text-ink-100">@BotFather</b> and send <code className="num">/newbot</code>.</li>
            <li>Copy the token it gives you.</li>
            <li>Add it as <code className="num text-signal-cyan">TELEGRAM_BOT_TOKEN</code> in Netlify, plus a random <code className="num text-signal-cyan">TELEGRAM_WEBHOOK_SECRET</code>.</li>
          </ol>
        </Panel>
        <Panel title="Install on Android">
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-ink-300">
            {ANDROID.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </Panel>
        <Panel title="FAQ">
          <div className="space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-lg border border-ink-800 px-3 py-2">
                <summary className="cursor-pointer list-none text-sm text-ink-100 group-open:text-signal-cyan">{f.q}</summary>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-400">{f.a}</p>
              </details>
            ))}
          </div>
        </Panel>
      </div>
    </>
  )
}
