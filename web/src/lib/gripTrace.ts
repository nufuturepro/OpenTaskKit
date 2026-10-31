// Temporary instrumentation for the touch grip gesture (bulk-actions on touch,
// touch-row-grip). Every step of a press — press, hold, lift, the undo's decision,
// the provider clearing the tick, the grip's own tap — is recorded here so a device
// that misbehaves can report its gesture in one screenshot instead of a description.
// Nothing spec'd: drop this file and its call sites once the gesture is settled.
//
// The buffer is always recorded (a gesture is a handful of writes) and kept in
// localStorage, so it survives a reload. `?trace=grip` shows the panel (and keeps it
// shown), `?trace=off` hides it.

/** One step of the gesture; `t` is the wall clock in ms, shown relative to the buffer's first entry. */
interface Entry { t: number; event: string; detail: string }

const KEY = 'ot.grip.trace'
const ON = 'ot.grip.trace.on'
const LIMIT = 60
const LINES = 22

const entries: Entry[] = []
let overlay: HTMLDivElement | null = null
let started = false

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null // storage denied (private mode): the trace stays in memory only
  }
}

/** Reads `?trace=grip` / `?trace=off` once, on the first step of a gesture. */
function readMode(): void {
  if (started) return
  started = true
  try {
    const mode = new URLSearchParams(typeof location === 'undefined' ? '' : location.search).get('trace')
    if (mode === 'grip') store()?.setItem(ON, '1')
    else if (mode === 'off') store()?.removeItem(ON)
  } catch {
    /* no URL to read: the panel keeps its stored state */
  }
  try {
    const raw = store()?.getItem(KEY)
    if (raw) entries.push(...(JSON.parse(raw) as Entry[]))
    while (entries.length > LIMIT) entries.shift()
  } catch {
    /* unreadable buffer: start empty */
  }
}

function paint(): void {
  if (store()?.getItem(ON) !== '1' || typeof document === 'undefined') return
  if (!overlay || !overlay.isConnected) {
    if (!document.body) return
    overlay = document.createElement('div')
    overlay.setAttribute('data-grip-trace', '')
    overlay.setAttribute('aria-hidden', 'true') // a debug panel; assistive tech skips it
    overlay.style.cssText =
      'position:fixed;left:6px;top:64px;z-index:9999;max-width:96vw;pointer-events:none;' +
      'background:var(--ot-surface);color:var(--ot-text);border:1px solid var(--ot-border);' +
      'border-radius:6px;padding:4px 6px;font:10px/1.45 ui-monospace,SFMono-Regular,monospace;white-space:pre'
    document.body.append(overlay)
  }
  const from = entries[0]?.t ?? 0
  const lines = entries.slice(-LINES).map((e) => `+${e.t - from}ms ${e.event} ${e.detail}`.trimEnd())
  overlay.textContent = `grip trace — ${entries.length} events (?trace=off)\n${lines.join('\n')}`
}

/** Record one step of the gesture: `gripTrace('lift', 'holdFired=1')`. */
export function gripTrace(event: string, detail = ''): void {
  readMode()
  entries.push({ t: Date.now(), event, detail })
  while (entries.length > LIMIT) entries.shift()
  try {
    store()?.setItem(KEY, JSON.stringify(entries))
  } catch {
    /* quota: the in-memory buffer still holds it */
  }
  paint()
}
