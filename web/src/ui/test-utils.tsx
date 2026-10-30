// Helpers for interaction tests of the shared UI (files opt in with
// `// @vitest-environment happy-dom`): render into a real DOM, fire keys.
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

export interface Rendered {
  container: HTMLElement
  rerender: (ui: ReactNode) => Promise<void>
  unmount: () => Promise<void>
}

/** Every root this module still holds, released by its own unmount or the hook below. */
const mounted: { root: Root; container: HTMLElement }[] = []

export async function render(ui: ReactNode): Promise<Rendered> {
  const container = document.createElement('div')
  document.body.append(container)
  let root: Root | null = null
  await act(async () => {
    root = createRoot(container)
    root.render(ui)
  })
  const entry = { root: root!, container }
  mounted.push(entry)
  const release = () => {
    const i = mounted.indexOf(entry)
    if (i >= 0) mounted.splice(i, 1)
  }
  return {
    container,
    rerender: (next) => act(async () => root!.render(next)),
    unmount: async () => {
      release()
      await act(async () => root!.unmount())
      container.remove()
    },
  }
}

/**
 * Unmount whatever this file's tests rendered (OpenSpec web-lint-and-test-hygiene):
 * a root left mounted keeps its useLiveQuery subscriptions alive, and Dexie's
 * liveQuery re-query timer (setTimeout(doQuery, 0)) can then fire after the DOM
 * environment is torn down, where the emission's React dispatch reads a window
 * that no longer exists - the unhandled "ReferenceError: window is not defined"
 * that fails CI from statsTime.test.tsx. A test's own unmount() releases its
 * entry first, so nothing unmounts twice.
 */
afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    // Best effort: a test's own afterEach may have run first and cleared
    // document.body.innerHTML (127 files do), which leaves React removing a
    // portal node that is already gone ("Failed to execute 'removeChild'").
    // The unmount still closes the liveQuery subscriptions on the way - effect
    // destroys run in React's deletion walk - so the teardown race stays closed;
    // the throw is only about a node this file's cleanup already deleted.
    try {
      await act(async () => root.unmount())
    } catch {
      /* the body was cleared before we got here; the root is gone regardless */
    }
    container.remove()
  }
})

export async function key(target: Element | Document, k: string, init: KeyboardEventInit = {}) {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }))
  })
}

export async function click(el: Element) {
  await act(async () => (el as HTMLElement).click())
}

export async function type(input: HTMLInputElement, text: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

export const flush = (ms = 0) => act(() => new Promise<void>((r) => setTimeout(r, ms)))

/**
 * Answer fetch for the requests a test expects: `answer` returns the JSON body
 * for a method and path, or undefined for any other request, which falls through
 * to the setup's stub and fails the test (no test reaches the network). Undo with
 * vi.unstubAllGlobals().
 */
export function mockFetch(answer: (method: string, path: string, init?: RequestInit) => unknown): void {
  const fallback = globalThis.fetch
  const stub = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method ?? 'GET'
    const body = answer(method, new URL(url, 'http://test.invalid').pathname, init)
    if (body === undefined) return fallback(input, init)
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
  // Through vi.stubGlobal so vi.unstubAllGlobals() restores the setup's stub.
  vi.stubGlobal('fetch', stub)
}

/** A project's "Public" badge reads its public links (ProjectHeader); none here. */
export const noPublicLinks = (method: string, path: string): unknown =>
  method === 'GET' && path.endsWith('/public-links') ? { links: [] } : undefined

/**
 * Wait until `ok` holds, flushing React and timers between tries, and fail with
 * `what` after `timeout` ms of wall-clock time. Use it instead of a fixed sleep
 * before an assertion: a loaded machine (parallel workers) only makes it slower.
 */
export async function waitFor(ok: () => boolean | Promise<boolean>, what = 'condition', timeout = 10_000): Promise<void> {
  // performance.now(): tests that fake Date (vi.setSystemTime) still time out.
  const end = performance.now() + timeout
  while (!(await ok())) {
    if (performance.now() > end) throw new Error(`waitFor: ${what} did not hold within ${timeout} ms`)
    await flush(10)
  }
}

/** Text as a screen reader reads it (assistive-tech-semantics): aria-hidden parts left out, visually hidden text kept. */
export function spokenText(el: Element): string {
  const copy = el.cloneNode(true) as Element
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove())
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Text as it is shown: visually hidden (sr-only) parts left out. */
export function visibleText(el: Element): string {
  const copy = el.cloneNode(true) as Element
  copy.querySelectorAll('.sr-only').forEach((n) => n.remove())
  return copy.textContent ?? ''
}
