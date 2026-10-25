// @vitest-environment happy-dom
// Motion preference (OpenSpec change task-menu-refinement, appearance-preferences
// "Motion preference"): a synced additive preference applied at once as the root
// no-motion presentation, flipping an open app when an op arrives, and restored
// when display mode's own override ends. Also the entrance motion's CSS contract.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readAppearance } from '../lib/appearance'
import { db } from '../lib/db'
import { applyOps, resetDeviceId } from '../lib/ops'
import { applyMotion } from '../lib/rootMotion'
import { click, render, waitFor } from '../ui/test-utils'
import css from '../index.css?raw'
import { AppearanceProvider } from './AppearanceProvider'
import { AppearanceSection } from './AppearanceSection'
import { useRootPresentation } from './display/displayHooks'

const root = () => document.documentElement

beforeEach(async () => {
  await db.delete()
  await db.open()
  resetDeviceId()
  root().removeAttribute('data-motion')
  applyMotion(false)
})
afterEach(() => { document.body.innerHTML = ''; root().removeAttribute('data-motion'); applyMotion(false) })

/** A display leaving must restore the account preference (task 4.3). */
function DisplayHost({ motion }: { motion: 'normal' | 'none' }) {
  useRootPresentation({ contrast: 'normal', motion })
  return <p>display</p>
}

describe('the preference', () => {
  it('reads none as off, an unknown value as on, and never rewrites the stored value', async () => {
    expect(readAppearance(null).motion).toBe('on')
    expect(readAppearance({ motion: 'none' } as never).motion).toBe('off')
    expect(readAppearance({ motion: 'sometimes' } as never).motion).toBe('on')
    await applyOps([{ id: 'm0', entity: 'user_prefs', entityId: 'me', field: 'motion', value: 'sometimes', ts: Date.now(), device: 'tablet' }] as never)
    expect((await db.userPrefs.get('me'))?.motion).toBe('sometimes')
    expect(await db.outbox.count()).toBe(0)
  })
})

describe('Settings to Appearance', () => {
  it('the switch writes one user_prefs.motion op each way and applies the root attribute at once', async () => {
    const r = await render(<AppearanceProvider><AppearanceSection /></AppearanceProvider>)
    const sw = document.querySelector<HTMLButtonElement>('#appearance-motion-switch')!
    expect(sw.getAttribute('aria-checked')).toBe('true')
    await click(sw)
    await waitFor(() => root().getAttribute('data-motion') === 'none', 'data-motion applied')
    expect((await db.outbox.toArray()).map((o) => `${o.field}=${o.value}`)).toEqual(['motion=none'])
    await click(sw)
    await waitFor(() => !root().hasAttribute('data-motion'), 'data-motion removed again')
    expect((await db.outbox.toArray()).map((o) => `${o.field}=${o.value}`)).toEqual(['motion=none', 'motion='])
    await r.unmount()
  })

  it('an incoming motion op flips the open app without a reload and without a local write', async () => {
    const r = await render(<AppearanceProvider><AppearanceSection /></AppearanceProvider>)
    expect(root().hasAttribute('data-motion')).toBe(false)
    await applyOps([{ id: 'm1', entity: 'user_prefs', entityId: 'me', field: 'motion', value: 'none', ts: Date.now() + 1000, device: 'tablet' }] as never)
    await waitFor(() => root().getAttribute('data-motion') === 'none', 'the synced motion applied')
    expect(await db.outbox.count()).toBe(0)
    await r.unmount()
  })
})

describe('display mode', () => {
  it('its no-motion override ends at the account preference: removed while on, kept while off', async () => {
    const a = await render(<DisplayHost motion="none" />)
    expect(root().getAttribute('data-motion')).toBe('none')
    await a.unmount()
    expect(root().hasAttribute('data-motion')).toBe(false)
    // The account has motion off: display leaving still leaves the root instant.
    applyMotion(true)
    const b = await render(<DisplayHost motion="none" />)
    await b.unmount()
    expect(root().getAttribute('data-motion')).toBe('none')
  })
})

describe('entrance motion', () => {
  it('a menu overlay mounts with the entrance class', async () => {
    const { ActionMenu } = await import('./menus/ActionMenu')
    const r = await render(<ActionMenu label="Menu for thing" groups={[{ items: [{ kind: 'action', id: 'do', label: 'Do thing', onSelect: () => {} }] }]} />)
    await click(r.container.querySelector('button')!)
    await waitFor(() => !!document.querySelector('[data-overlay-root]'), 'the menu opened')
    expect(document.querySelector('[data-overlay-root]')!.className).toContain('overlay-in')
    await r.unmount()
  })

  it('the stylesheet keeps it instant under no motion and under reduced motion', () => {
    expect(css).toContain('@keyframes overlay-in { from { opacity: 0; transform: translateY(4px) scale(0.98); }')
    expect(css).toContain('.overlay-in { animation: overlay-in var(--duration-ui) var(--ease-calm, ease-out) both; }')
    expect(css).toContain('@media (min-width: 640px) { .dialog-card-in { animation: overlay-in var(--duration-ui) var(--ease-calm, ease-out) both; } }')
    // The no-motion block zeroes every animation on the page…
    const fromNone = css.indexOf(':root[data-motion="none"] *')
    const noMotion = css.slice(fromNone, css.indexOf('scroll-behavior: auto !important;', fromNone))
    expect(noMotion).toContain('animation-duration: 0s !important')
    // …and reduced motion runs them in 0.01 ms.
    const fromReduce = css.indexOf('@media (prefers-reduced-motion: reduce) {')
    const reduced = css.slice(fromReduce, css.indexOf('scroll-behavior: auto !important;', fromReduce))
    expect(reduced).toContain('animation-duration: 0.01ms !important')
  })
})
