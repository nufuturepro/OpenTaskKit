// @vitest-environment happy-dom
// The date picker as a panel beside the actions menu (task-menu-refinement
// "Date picker alongside the menu", task 2.4): same overlay as the items,
// Escape order, a pick rescheduling every id, and the narrow sheet variant.
import 'fake-indexeddb/auto'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, useDatabase } from '../lib/db'
import { setDateTime } from '../lib/dates'
import { createTask, resetDeviceId } from '../lib/ops'
import { flush, key, render, type } from '../ui/test-utils'
import { PanelHost } from './PanelHost'
import { TaskListView } from './TaskListView'
import { hideBulkToast } from './bulk/toastStore'
import { UndoToast } from './bulk/UndoToast'

let n = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
  useDatabase(`date-panel-${Date.now()}-${n++}`)
  resetDeviceId()
  setDateTime({ date_format: 'day-month', time_format: '24h', week_start: 'mon' }, { order: 'MD', hour12: true, weekStart: 1 })
})
const mounted: { unmount: () => Promise<void> }[] = []
afterEach(async () => {
  for (const r of mounted.splice(0)) await r.unmount()
  vi.useRealTimers()
  hideBulkToast()
  document.body.innerHTML = ''
})

async function waitFor(ok: () => boolean, ms = 2000) {
  for (let t = 0; t < ms && !ok(); t += 20) await flush(20)
  expect(ok()).toBe(true)
}

async function inbox(...titles: string[]) {
  const ids: string[] = []
  for (const t of titles) ids.push(await createTask({ title: t }))
  const r = await render(<><TaskListView route={{ view: 'inbox' }} /><PanelHost /><UndoToast /></>)
  mounted.push(r)
  await waitFor(() => document.body.textContent!.includes(titles[titles.length - 1]))
  return { ids }
}

const menuItems = () => [...document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]')] as HTMLElement[]

/** Tick `n` rows and open the Actions menu with the keyboard (`.`). */
async function openActions(n: number) {
  await key(document.body, 'j')
  await key(document.body, 'x')
  for (let i = 1; i < n; i++) await key(document.body, 'ArrowDown', { shiftKey: true })
  await key(document.body, '.')
  await waitFor(() => menuItems().length > 0)
}

async function openPanel() {
  await act(async () => { menuItems().find((m) => m.textContent?.startsWith('Pick a date'))?.click() })
  await waitFor(() => !!document.querySelector('[data-date-panel]'))
}

describe('the date panel beside the menu (D2)', () => {
  it('extends the overlay while the items stay visible; a day reschedules every task in one batch with Undo', async () => {
    const { ids } = await inbox('One', 'Two')
    await openActions(2)
    await openPanel()
    expect(document.querySelector('[data-menu-extended]')).toBeTruthy()
    expect(menuItems().some((m) => m.textContent?.startsWith('Complete'))).toBe(true)
    await db.outbox.clear()
    await act(async () => { (document.querySelector('[data-date-panel] [data-date="2026-10-20"]') as HTMLButtonElement).click() })
    await waitFor(() => !!document.querySelector('[data-bulk-toast]'))
    expect(document.querySelector('[data-overlay-root]')).toBeNull()
    expect(new Set((await db.outbox.toArray()).map((o) => o.ts)).size).toBe(1)
    for (const id of ids) expect((await db.tasks.get(id))!.due).toEqual({ date: '2026-10-20' })
  })

  it('a phrase typed in the panel commits on Enter and closes everything', async () => {
    const { ids } = await inbox('One')
    await openActions(1)
    await openPanel()
    const input = document.querySelector<HTMLInputElement>('[data-date-panel] input')!
    await type(input, 'tomorrow')
    await key(input, 'Enter')
    await waitFor(() => !!document.querySelector('[data-bulk-toast]'))
    expect((await db.tasks.get(ids[0]))!.due).toEqual({ date: '2026-10-15' })
    expect(document.querySelector('[data-overlay-root]')).toBeNull()
  })

  it('the first Escape steps back to the items and focuses the item that opened the panel; the second closes the menu', async () => {
    await inbox('One', 'Two')
    await openActions(2)
    await openPanel()
    await key(document, 'Escape')
    await waitFor(() => !document.querySelector('[data-date-panel]'))
    expect(document.querySelector('[data-menu-extended]')).toBeNull()
    expect(menuItems().length).toBeGreaterThan(0)
    expect(document.activeElement?.getAttribute('data-menu-label')).toBe('Pick a date…')
    await key(document, 'Escape')
    await waitFor(() => !document.querySelector('[data-overlay-root]'))
    expect(menuItems().length).toBe(0)
  })

  it('below 640 px the panel fills the bottom sheet instead of extending it, with the back header', async () => {
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia
    try {
      await inbox('One', 'Two')
      await openActions(2)
      await act(async () => { menuItems().find((m) => m.textContent?.startsWith('Pick a date'))?.click() })
      await waitFor(() => !!document.querySelector('[data-menu-panel]'))
      expect(document.querySelector('[data-menu-extended]')).toBeNull()
      expect(menuItems().length).toBe(0)
      // The sheet keeps its own title row; the panel's head gives the way back.
      await act(async () => { (document.querySelector('[data-menu-panel] [aria-label="Back"]') as HTMLButtonElement).click() })
      await waitFor(() => menuItems().length > 0)
      expect(document.querySelector('[data-date-panel]')).toBeNull()
    } finally {
      window.matchMedia = original
    }
  })
})
