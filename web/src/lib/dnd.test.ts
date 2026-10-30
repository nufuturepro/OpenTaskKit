// @vitest-environment happy-dom
// The long-press gestures (OpenSpec change task-row-context-menu, "Touch: hold and
// release"): a hold without movement arms the drag — a release then opens the row's
// menu at the finger, a move then lifts the drag; a move before the hold is a scroll,
// never a drag — except on the row's grip, which never scrolls: it drags on movement
// alone and its hold selects instead (bulk-actions on touch, touch-row-grip). A drag
// also swallows the click it would otherwise leave behind.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { beginDrag, TOUCH_HOLD_MS } from './dnd'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

const press = { pointerId: 9, pointerType: 'touch', button: 0, clientX: 50, clientY: 50 }
const move = (x: number, y = 50) => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 9, pointerType: 'touch', clientX: x, clientY: y }))
const up = (x: number, y = 50) => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, pointerType: 'touch', clientX: x, clientY: y }))
function spies() {
  return { onStart: vi.fn(), onDrop: vi.fn(), onEnd: vi.fn(), onHold: vi.fn() }
}

describe('touch: hold and drag', () => {
  it('a hold arms the drag: a move after it lifts, a release without moving opens the row menu', () => {
    const s = spies()
    const onHoldRelease = vi.fn()
    beginDrag(press, { label: 'Task', onStart: s.onStart, onDrop: s.onDrop, onEnd: s.onEnd, onHoldRelease })
    vi.advanceTimersByTime(TOUCH_HOLD_MS + 10)
    // Armed, not lifted: no ghost and no drop yet (task-row-context-menu).
    expect(s.onStart).not.toHaveBeenCalled()
    expect(document.querySelector('[data-drag-ghost]')).toBeNull()
    expect(onHoldRelease).not.toHaveBeenCalled()
    move(120)
    expect(s.onStart).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-drag-ghost]')).toBeTruthy()
    up(120)
    expect(s.onEnd).toHaveBeenCalledTimes(1)
    expect(onHoldRelease).not.toHaveBeenCalled()

    // The other half of the gesture: hold, then lift the finger where it rests.
    const held = spies()
    const release = vi.fn()
    beginDrag(press, { label: 'Task', onStart: held.onStart, onDrop: held.onDrop, onEnd: held.onEnd, onHoldRelease: release })
    vi.advanceTimersByTime(TOUCH_HOLD_MS + 10)
    up(50, 50)
    expect(held.onStart).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalledWith(50, 50)
  })

  it('a scroll that began before the hold is never a drag', () => {
    const s = spies()
    beginDrag(press, { label: 'Task', onStart: s.onStart, onDrop: s.onDrop, onEnd: s.onEnd })
    move(70)
    vi.advanceTimersByTime(TOUCH_HOLD_MS + 10)
    up(130)
    expect(s.onStart).not.toHaveBeenCalled()
    expect(document.querySelector('[data-drag-ghost]')).toBeNull()
  })
})

describe('the grip (bulk-actions on touch, touch-row-grip)', () => {
  it('movement alone drags: a grip never waits for the hold and never scrolls', () => {
    const s = spies()
    beginDrag(press, { label: 'Task', grip: true, ...s })
    move(60) // well before TOUCH_HOLD_MS
    expect(s.onStart).toHaveBeenCalledTimes(1)
    expect(s.onHold).not.toHaveBeenCalled()
    expect(document.querySelector('[data-drag-ghost]')).toBeTruthy()
    up(60)
    expect(s.onEnd).toHaveBeenCalledTimes(1)
  })

  it('a grip hold selects, its release swallows the click and never opens the menu', () => {
    const s = spies()
    const release = vi.fn()
    beginDrag(press, { label: 'Task', grip: true, onHoldRelease: release, ...s })
    vi.advanceTimersByTime(TOUCH_HOLD_MS + 10)
    expect(s.onHold).toHaveBeenCalledTimes(1)
    expect(s.onStart).not.toHaveBeenCalled()
    up(50, 50)
    expect(release).not.toHaveBeenCalled()
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    window.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
  })

  it("a plain tap on the grip lifts nothing, so the button's own click ticks", () => {
    const s = spies()
    const release = vi.fn()
    beginDrag(press, { label: 'Task', grip: true, onHoldRelease: release, ...s })
    up(50, 50)
    expect(s.onStart).not.toHaveBeenCalled()
    expect(s.onHold).not.toHaveBeenCalled()
    expect(release).not.toHaveBeenCalled()
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    window.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
  })

  it('a hold that becomes a drag gives its tick back — once, and only for a grip', () => {
    const undo = vi.fn()
    const s = spies()
    beginDrag(press, { label: 'Task', grip: true, onHoldUndo: undo, ...s })
    vi.advanceTimersByTime(TOUCH_HOLD_MS + 10)
    expect(s.onHold).toHaveBeenCalledTimes(1)
    expect(undo).not.toHaveBeenCalled()
    move(120) // the press becomes a drag
    expect(undo).toHaveBeenCalledTimes(1)
    up(120)
    expect(undo).toHaveBeenCalledTimes(1) // not again on release

    // A held release that never moves keeps the tick: selection is the still gesture.
    const still = vi.fn()
    const s2 = spies()
    beginDrag(press, { label: 'Task', grip: true, onHoldUndo: still, ...s2 })
    vi.advanceTimersByTime(TOUCH_HOLD_MS + 10)
    up(50, 50)
    expect(still).not.toHaveBeenCalled()

    // Abandoning after the hold gives the tick back too.
    const abandoned = vi.fn()
    const s3 = spies()
    beginDrag(press, { label: 'Task', grip: true, onHoldUndo: abandoned, ...s3 })
    vi.advanceTimersByTime(TOUCH_HOLD_MS + 10)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(abandoned).toHaveBeenCalledTimes(1)

    // The row body never selects, so its drag gives nothing back.
    const body = vi.fn()
    const s4 = spies()
    beginDrag(press, { label: 'Task', onHoldUndo: body, ...s4 })
    vi.advanceTimersByTime(TOUCH_HOLD_MS + 10)
    move(120)
    expect(body).not.toHaveBeenCalled()
    up(120)
    expect(s4.onEnd).toHaveBeenCalledTimes(1)
  })
})

describe('the click after a drag', () => {
  it('a mouse drag that drops swallows the next click, so the row under it does not open', () => {
    const s = spies()
    const li = document.createElement('li')
    const opened = vi.fn()
    li.addEventListener('click', opened)
    document.body.appendChild(li)
    beginDrag({ pointerId: 9, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50 }, { label: 'Task', onStart: s.onStart, onDrop: s.onDrop, onEnd: s.onEnd })
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 9, pointerType: 'mouse', clientX: 50, clientY: 140 }))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, pointerType: 'mouse', clientX: 50, clientY: 140 }))
    expect(s.onStart).toHaveBeenCalledTimes(1)
    li.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(opened).not.toHaveBeenCalled()
  })

  it('the ring leaves a target with only data-drop-target when the drag ends', () => {
    const s = spies()
    const row = document.createElement('li')
    row.setAttribute('data-drop-target', 'project:shared')
    document.body.appendChild(row)
    const at = vi.spyOn(document, 'elementFromPoint').mockReturnValue(row)
    beginDrag({ pointerId: 9, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50 }, { label: 'Task', onStart: s.onStart, onDrop: s.onDrop, onEnd: s.onEnd, taskDrops: true })
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 9, pointerType: 'mouse', clientX: 50, clientY: 140 }))
    expect(row.hasAttribute('data-drop-active')).toBe(true)
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, pointerType: 'mouse', clientX: 50, clientY: 140 }))
    expect(row.hasAttribute('data-drop-active')).toBe(false)
    at.mockRestore()
    row.remove()
  })
})
