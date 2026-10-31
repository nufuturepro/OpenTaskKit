import { gripTrace } from './gripTrace'
import { t } from './i18n'
// Pointer-based drag and drop (OpenSpec `board-view`, design D6): native pointer
// events, no library, works with mouse, pen and touch. A mouse or pen drag starts
// after a few pixels of movement; touch arms after a short long-press so a plain
// swipe still scrolls the board — moving after the hold lifts the drag, releasing
// still opens the row's actions menu (task-row-context-menu "Touch: hold and
// release"). A press on the row's grip skips the wait, because a grip never
// scrolls: movement lifts the drag at once and the hold itself selects
// (bulk-actions on touch — the grip owns selection on a touch screen) — and a hold
// that becomes a drag gives that tick back, so a move never leaves selection behind.
// A ghost label follows the pointer, the element
// under it carrying `data-drop-target` is the target and gets `data-drop-active`
// for styling. The primitive knows nothing about tasks: callers decide what a drop
// means (board-view moves a task to a section; `manual-ordering` will add
// within-list placement through `onMove`).

export interface DragOptions {
  /** Text of the ghost that follows the pointer. */
  label: string
  /** Called on every move once lifted with the target key under the pointer (null: none). */
  onMove?: (target: string | null, x: number, y: number) => void
  /** Called once on release over a target (never for a cancelled drag). */
  onDrop: (target: string, x: number, y: number) => void
  /** Called when the drag lifts (after the threshold or long-press). */
  onStart?: () => void
  /** Called after a drop or a cancel; the drag is over. */
  onEnd?: () => void
  /**
   * Touch only: the hold elapsed without the press moving (true) and ended without
   * becoming a drag (false, from cleanup) — the pressed element's held feedback.
   */
  onHoldChange?: (held: boolean) => void
  /** Touch only: a hold completed and the finger lifted without moving: open the row's menu here (task-row-context-menu). Never for a grip press: the grip's hold selects, and its release falls through to its own click. */
  onHoldRelease?: (x: number, y: number) => void
  /**
   * Touch: the hold itself means something (bulk-actions on touch — a long press on
   * the row's grip selects it, the grip owning selection on a touch screen). Called
   * when the hold elapses instead of lifting; the drag lifts only if the finger then
   * moves, and a release without moving swallows the click.
   */
  onHold?: () => void
  /**
   * The hold ticked a row that was not ticked before, and the press has since become
   * a drag: give that tick back at once (bulk-actions on touch — a hold selects, a
   * hold that drags moves; only a release that never moved keeps the tick).
   */
  onHoldUndo?: () => void
  /**
   * The press began on the row's grip, not its body. A grip never scrolls (its own
   * `touch-action: none`), so any movement past the threshold lifts the drag without
   * waiting for the hold; the hold still means select, and a release without either
   * falls through to the grip's own click (a tap ticks the row).
   */
  grip?: boolean
  /**
   * Also resolve `data-task-drop` targets (OpenSpec change ux-feedback-2, D4: a
   * task dropped on a sidebar project, the Inbox or a label), reported as
   * `drop:<value>` and preferred over a `data-drop-target` on the same element.
   */
  taskDrops?: boolean
}

/** Pixels a mouse or pen must travel before a press becomes a drag. */
export const DRAG_THRESHOLD = 5
/** Milliseconds a touch must rest before it becomes a drag. */
export const TOUCH_HOLD_MS = 350

const ACTIVE = 'data-drop-active'

/** The drop target key at a point: the nearest ancestor with `data-drop-target` (or `data-task-drop`, as `drop:<value>`). */
export function dropTargetAt(x: number, y: number, doc: Document = document, taskDrops = false): string | null {
  const el = doc.elementFromPoint?.(x, y)
  if (!(el instanceof Element)) return null
  const task = taskDrops ? el.closest('[data-task-drop]') : null
  if (task) return `drop:${task.getAttribute('data-task-drop')}`
  const hit = el.closest('[data-drop-target]')
  return hit ? hit.getAttribute('data-drop-target') : null
}

/** The key an element answers to: its `data-drop-target`, or `drop:` and its `data-task-drop`. */
const keysOf = (el: Element) => [el.getAttribute('data-drop-target'), el.hasAttribute('data-task-drop') ? `drop:${el.getAttribute('data-task-drop')}` : null]

function markActive(key: string | null): void {
  for (const el of document.querySelectorAll(`[${ACTIVE}]`)) {
    if (key === null || !keysOf(el).includes(key)) el.removeAttribute(ACTIVE)
  }
  if (key === null) return
  for (const el of document.querySelectorAll('[data-drop-target], [data-task-drop]')) {
    if (keysOf(el).includes(key)) el.setAttribute(ACTIVE, '')
  }
}

function makeGhost(label: string): HTMLElement {
  const g = document.createElement('div')
  g.textContent = label || t('Untitled')
  g.setAttribute('aria-hidden', 'true')
  g.setAttribute('data-drag-ghost', '')
  g.className = 'pointer-events-none fixed left-0 top-0 z-50 max-w-60 truncate rounded-md border border-accent bg-surface px-2 py-1 text-sm shadow-lg'
  document.body.appendChild(g)
  return g
}

/** Swallow the click that follows a drop (or a held release), so it never also opens the task. */
export function swallowNextClick(): void {
  const stop = (e: Event) => {
    e.stopPropagation()
    e.preventDefault()
  }
  window.addEventListener('click', stop, { capture: true, once: true })
  setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
}

/**
 * Start tracking a press from an element's onPointerDown. Only the primary button
 * of a mouse starts a drag; presses on buttons inside the element (the completion
 * circle) still work because nothing happens until the pointer moves or holds.
 * Returns a cancel function.
 */
export function beginDrag(e: { pointerId: number; pointerType: string; button: number; clientX: number; clientY: number }, opts: DragOptions): () => void {
  if (e.pointerType === 'mouse' && e.button !== 0) return () => undefined
  gripTrace('down', `${e.pointerType}${opts.grip ? ' grip' : ''}`)
  const startX = e.clientX
  const startY = e.clientY
  let lifted = false
  let held = false
  let ghost: HTMLElement | null = null
  let target: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let holdFired = false
  let holdUndone = false
  // The grip's hold selected a row; the moment the press becomes a drag (or is
  // abandoned) that tick is given back, so a drag never leaves selection behind.
  const undoHold = () => {
    // One decision, so the trace can say which reason stopped it.
    const undo = opts.grip && holdFired && !holdUndone ? opts.onHoldUndo : undefined
    gripTrace('undoHold', undo ? 'give-tick-back' : `skip:${!opts.grip ? 'not-grip' : !holdFired ? 'hold-never-fired' : holdUndone ? 'already' : 'no-handler'}`)
    if (!undo) return
    holdUndone = true
    undo()
  }

  const lift = () => {
    if (lifted) return
    lifted = true
    // The press is a drag now, so the pending hold dies with the wait: a finger that
    // moved before the hold elapsed must never tick the row (the Android trace had the
    // hold firing after the lift and leaving "1 selected" behind).
    clearTimeout(timer)
    gripTrace('lift', `holdFired=${holdFired ? 1 : 0}`)
    undoHold()
    // The held tint hands over to the drag's own feedback.
    if (held) {
      held = false
      opts.onHoldChange?.(false)
    }
    ghost = makeGhost(opts.label)
    document.body.style.userSelect = 'none'
    opts.onStart?.()
  }
  const place = (x: number, y: number) => {
    if (ghost) ghost.style.transform = `translate(${x + 12}px, ${y + 8}px)`
    const next = dropTargetAt(x, y, document, opts.taskDrops)
    if (next !== target) {
      target = next
      markActive(target)
    }
    opts.onMove?.(target, x, y)
  }
  const cleanup = () => {
    clearTimeout(timer)
    if (held) {
      held = false
      opts.onHoldChange?.(false)
    }
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('keydown', key, true)
    window.removeEventListener('touchmove', blockScroll)
    ghost?.remove()
    markActive(null)
    document.body.style.userSelect = ''
  }
  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId) return
    if (!lifted) {
      const far = Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_THRESHOLD
      if (e.pointerType === 'touch' && !opts.grip) {
        // Moving before the hold elapses is a scroll, not a drag; after it, the drag.
        if (!far) return
        if (!held) {
          cancel()
          return
        }
      } else if (!far) return
      // A grip lifts on the first far move: it never scrolls and never waits (bulk-actions on touch).
      lift()
    }
    ev.preventDefault()
    place(ev.clientX, ev.clientY)
  }
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId) return
    const wasLifted = lifted
    const heldStill = held
    gripTrace('up', `lifted=${wasLifted ? 1 : 0} held=${heldStill ? 1 : 0}`)
    const at = wasLifted ? dropTargetAt(ev.clientX, ev.clientY, document, opts.taskDrops) ?? target : null
    cleanup()
    if (!wasLifted) {
      // A touch held still and released is a long press: the row's actions menu at
      // the finger (task-row-context-menu "Touch: hold and release") — not a tap,
      // and nothing was dropped.
      if (heldStill && e.pointerType === 'touch') {
        swallowNextClick()
        // A grip press is never the menu's: its hold selected, and this release is
        // swallowed so the grip's own click cannot untick what the hold ticked.
        if (!opts.grip) opts.onHoldRelease?.(ev.clientX, ev.clientY)
      }
      return
    }
    swallowNextClick()
    if (at !== null) opts.onDrop(at, ev.clientX, ev.clientY)
    opts.onEnd?.()
  }
  const cancel = () => {
    const wasLifted = lifted
    gripTrace('cancel', `lifted=${wasLifted ? 1 : 0}`)
    undoHold()
    cleanup()
    if (wasLifted) opts.onEnd?.()
  }
  const key = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return
    ev.stopPropagation()
    cancel()
  }
  // While a touch drag is lifted the page must not scroll under the finger.
  const blockScroll = (ev: TouchEvent) => {
    if (lifted) ev.preventDefault()
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
  window.addEventListener('keydown', key, true)
  window.addEventListener('touchmove', blockScroll, { passive: false })
  if (e.pointerType === 'touch') {
    // The hold arms the drag instead of lifting it: moving afterwards drags,
    // releasing still opens the row's menu, so neither gesture steals the other.
    timer = setTimeout(() => {
      holdFired = true
      gripTrace('hold', 'fired')
      held = true
      opts.onHoldChange?.(true)
      // The hold itself means select — only ever wired from the row's grip.
      opts.onHold?.()
    }, TOUCH_HOLD_MS)
  }
  return cancel
}
