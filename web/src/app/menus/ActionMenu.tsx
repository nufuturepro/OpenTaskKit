// Action menus described as data (OpenSpec change labels-and-menus, design D1–D2).
// One component renders every object menu (views, labels, sections, projects) so
// order, icons, disabled reasons and confirmations cannot drift apart. A picker item
// swaps the items for a Combobox inside the same overlay; a confirm item closes the
// menu and opens a confirmation dialog.
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName, Menu } from '../../ui'
import { Tooltip, useWide, type CompactSpec } from '../../ui'
import { MenuCloseContext, MenuGroup, MenuItem, MenuSeparator } from '../../ui'
import { ComboboxPanel } from '../../ui'
import type { ComboboxConfig } from '../../ui'
import { ConfirmDialog } from '../../ui'
import { t } from '../../lib/i18n'

interface ItemBase {
  id: string
  label: string
  icon?: IconName
  /** Keyboard hint shown right-aligned ("F2", "Alt+↑"). */
  shortcut?: string
  /** Disabled items keep their place and say why (spec: "Disabled items say why"). */
  disabled?: boolean
  reason?: string
  tone?: 'danger'
  /** Render as a compact glyph button in a `layout: 'row'` group (the priority digits). */
  compact?: CompactSpec
}

export interface ConfirmSpec {
  title: string
  /** What will happen, in the user's terms; computed when the dialog opens. */
  body: ReactNode | (() => ReactNode | Promise<ReactNode>)
  /** The action verb ("Delete label", "Merge"). */
  confirmLabel: string
  tone?: 'danger' | 'default'
  onConfirm: () => unknown
}

/** A picker step: a Combobox over the valid targets; picking may lead to a confirmation. */
export interface PickerSpec<T> extends Omit<ComboboxConfig<T>, 'onPick' | 'onClose'> {
  /** Field label and step title ("Move to", "Merge into"). */
  title: string
  placeholder?: string
  emptyText?: string
  renderLeading?: (item: T) => ReactNode
  /** Returns a confirmation to show, or nothing to apply at once. */
  onPick: (item: T) => ConfirmSpec | void | Promise<ConfirmSpec | void>
}

export type ActionItem =
  | (ItemBase & { kind: 'action'; onSelect: () => unknown })
  | (ItemBase & { kind: 'check'; checked: boolean; onSelect: () => unknown })
  // The picker's item type is erased here; each hook builds it with a concrete T.
  // `any`: a menu mixes pickers of different item types.
  | (ItemBase & { kind: 'picker'; picker: PickerSpec<any> })
  | (ItemBase & { kind: 'confirm'; confirm: ConfirmSpec })
  // A step swaps the items for its own content in the same overlay (the icon picker,
  // a colour palette); `done` closes the menu, `back` returns to the items.
  | (ItemBase & { kind: 'step'; step: StepSpec })
  // A panel extends the same overlay *beside* the items (the date calendar) from
  // 640 px up, and fills it under the back header on a phone (task-menu-refinement
  // "Date picker alongside the menu"); `close` closes the whole menu.
  | (ItemBase & { kind: 'panel'; panel: PanelSpec })

export interface PanelSpec {
  title: string
  /** The panel content; `close` closes the menu entirely (a picked date applies and closes). */
  render: (close: () => void) => ReactNode
}

export interface StepSpec {
  title: string
  render: (done: () => void, back: () => void) => ReactNode
  /** The same choice as a Combobox picker, for the command palette. */
  // `any`: a menu mixes pickers of different item types.
  palette?: PickerSpec<any>
}

export interface ActionGroup {
  label?: string
  /** One flex row of compact items instead of stacked rows (the priority strip). */
  layout?: 'row'
  items: ActionItem[]
}

/** Danger items always come last: a group of them is moved after every other group. */
export function orderGroups(groups: ActionGroup[]): ActionGroup[] {
  const visible = groups.map((g) => ({ ...g, items: g.items })).filter((g) => g.items.length > 0)
  const safe = visible.map((g) => ({ ...g, items: g.items.filter((i) => i.tone !== 'danger') })).filter((g) => g.items.length > 0)
  const danger = visible.flatMap((g) => g.items.filter((i) => i.tone === 'danger'))
  return danger.length ? [...safe, { items: danger }] : safe
}

/** Keeps a MenuItem from closing the menu (picker steps and confirmations close it themselves). */
function NoClose({ children }: { children: ReactNode }) {
  return <MenuCloseContext.Provider value={() => {}}>{children}</MenuCloseContext.Provider>
}

function Items({ groups, onPicker, onStep, onConfirm, onPanel }: {
  groups: ActionGroup[]
  // `any`: a menu mixes pickers of different item types.
  onPicker: (p: PickerSpec<any>) => void
  onStep: (s: StepSpec) => void
  onConfirm: (c: ConfirmSpec) => void
  onPanel: (panel: PanelSpec, label: string) => void
}) {
  const close = useContext(MenuCloseContext)
  const renderItem = (item: ActionItem) => {
    const common = {
      label: item.label, icon: item.icon, shortcut: item.shortcut, disabled: item.disabled,
      description: item.disabled ? item.reason : undefined, danger: item.tone === 'danger', compact: item.compact,
    }
    switch (item.kind) {
      case 'action':
        return <MenuItem key={item.id} {...common} onSelect={() => void item.onSelect()} />
      case 'check':
        return <MenuItem key={item.id} {...common} checked={item.checked} onSelect={() => void item.onSelect()} />
      case 'picker':
        return <NoClose key={item.id}><MenuItem {...common} label={`${item.label}…`} onSelect={() => onPicker(item.picker)} /></NoClose>
      case 'confirm':
        return <NoClose key={item.id}><MenuItem {...common} label={`${item.label}…`} onSelect={() => { close?.(); onConfirm(item.confirm) }} /></NoClose>
      case 'step':
        return <NoClose key={item.id}><MenuItem {...common} label={`${item.label}…`} onSelect={() => onStep(item.step)} /></NoClose>
      case 'panel':
        // Label as given (it carries its own ellipsis); NoClose because the
        // panel opens inside this overlay and Escape, not the item, leaves it.
        return <NoClose key={item.id}><MenuItem {...common} onSelect={() => onPanel(item.panel, item.label)} /></NoClose>
    }
  }
  return (
    <>
      {orderGroups(groups).map((g, gi) => (
        <div key={gi}>
          {gi > 0 && <MenuSeparator />}
          <MenuGroup label={g.label}>
            {g.layout === 'row'
              // A strip of compact items (the priorities): one line instead of one row each.
              ? <div className="flex items-center gap-1 px-1.5 pb-1">{g.items.map(renderItem)}</div>
              : g.items.map(renderItem)}
          </MenuGroup>
        </div>
      ))}
    </>
  )
}

// `any`: a menu mixes pickers of different item types.
function PickerStep({ picker, onBack, onDone, onConfirm }: { picker: PickerSpec<any>; onBack: () => void; onDone: () => void; onConfirm: (c: ConfirmSpec) => void }) {
  const { title, placeholder, emptyText, renderLeading, onPick, ...cfg } = picker
  return (
    <div className="space-y-1 p-1" data-picker-step>
      <div className="flex items-center gap-1">
        <Tooltip label={t('Back')} shortcut="Esc">
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm touch-target px-1.5 py-1" aria-label={t('Back')} onClick={onBack}>
            <Icon name="arrow-left" />
          </button>
        </Tooltip>
        <span className="text-meta font-semibold text-muted">{title}</span>
      </div>
      <ComboboxPanel {...cfg} label={title} placeholder={placeholder} emptyText={emptyText} renderLeading={renderLeading}
        onPick={async (item) => {
          const next = await onPick(item)
          // A multiple picker (bulk labels) stays open for more picks.
          if (!cfg.multiple || next) onDone()
          if (next) onConfirm(next)
        }} />
    </div>
  )
}

function StepFrame({ step, onBack, onDone }: { step: StepSpec; onBack: () => void; onDone: () => void }) {
  return (
    <div className="space-y-1 p-1" data-menu-step>
      <PanelHead title={step.title} onBack={onBack} />
      {step.render(onDone, onBack)}
    </div>
  )
}

/** The title row of a step or a panel: back to the items, Escape hinted. */
function PanelHead({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <Tooltip label={t('Back')} shortcut="Esc">
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm touch-target px-1.5 py-1" aria-label={t('Back')} onClick={onBack}>
          <Icon name="arrow-left" />
        </button>
      </Tooltip>
      <span className="text-meta font-semibold text-muted">{title}</span>
    </div>
  )
}

/** A panel below 640 px: it replaces the items in the sheet, with the back header. */
function PanelFrame({ spec, onBack, onClose }: { spec: PanelSpec; onBack: () => void; onClose: () => void }) {
  return (
    <div className="space-y-1 p-1" data-menu-panel>
      <PanelHead title={spec.title} onBack={onBack} />
      {spec.render(onClose)}
    </div>
  )
}

/** The confirmation of a destructive or impactful action, with its consequence computed on open. */
/** A confirm item's dialog, its body computed when it opens (also used by the command palette). */
export function Confirmation({ spec, onClose }: { spec: ConfirmSpec; onClose: () => void }) {
  const [body, setBody] = useState<ReactNode>(() => (typeof spec.body === 'function' ? null : spec.body))
  useEffect(() => {
    if (typeof spec.body !== 'function') return
    let live = true
    void Promise.resolve((spec.body as () => ReactNode | Promise<ReactNode>)()).then((b) => { if (live) setBody(b) })
    return () => { live = false }
  }, [spec])
  return (
    <ConfirmDialog title={spec.title} consequence={body ?? '…'} confirmLabel={spec.confirmLabel} tone={spec.tone ?? 'danger'}
      onConfirm={spec.onConfirm} onCancel={onClose} />
  )
}

/**
 * Renders a menu from groups. `picker` (with `open`) starts directly in that
 * picker step, as the project menu's `m` shortcut does.
 */
export function ActionMenu({ label, title, groups, header, trigger, triggerClassName, triggerProps, align = 'end', width = 'sm:w-64', open: openProp, onOpenChange, startPicker }: {
  label: string
  /** Content above the first group (the project colour swatches). */
  header?: ReactNode
  title?: string
  groups: ActionGroup[]
  trigger?: ReactNode
  triggerClassName?: string
  /** Extra attributes on the trigger button (`aria-current`, the right-click pointer position). */
  triggerProps?: React.ComponentProps<typeof Menu>['triggerProps']
  align?: 'start' | 'end'
  width?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Id of a picker item to open straight into (keyboard shortcut). */
  startPicker?: string | null
}) {
  const [ownOpen, setOwnOpen] = useState(false)
  const open = openProp ?? ownOpen
  // `any`: a menu mixes pickers of different item types.
  const [picker, setPicker] = useState<PickerSpec<any> | null>(null)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const [step, setStep] = useState<StepSpec | null>(null)
  const [panel, setPanel] = useState<PanelSpec | null>(null)
  const wide = useWide()
  // Focus goes back to the item that opened the panel once it closes (back or Escape),
  // found by its label: on a phone the items unmounted while the panel filled the sheet.
  const panelLabel = useRef<string | null>(null)
  const restoreFocus = useRef(false)
  useEffect(() => {
    if (!restoreFocus.current || panel) return
    restoreFocus.current = false
    const label = panelLabel.current
    panelLabel.current = null
    if (!label) return
    const escaped = label.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    document.querySelector<HTMLElement>(`[data-menu-label="${escaped}"]`)?.focus()
  }, [panel])
  const openPanel = (spec: PanelSpec, label: string) => { panelLabel.current = label; setPanel(spec) }
  /** Step back from the panel to the items, returning focus to the item that opened it. */
  const clearPanel = () => { if (!panel) return; restoreFocus.current = true; setPanel(null) }
  /** An item or a pick inside the panel: close everything at once. */
  const closeAll = () => {
    setPicker(null)
    setStep(null)
    setPanel(null)
    panelLabel.current = null
    restoreFocus.current = false
    setOpen(false)
  }
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setOwnOpen(v)
    onOpenChange?.(v)
  }
  // A shortcut can open the menu straight into one picker step.
  useEffect(() => {
    if (!open || !startPicker) return
    const item = groups.flatMap((g) => g.items).find((i) => i.kind === 'picker' && i.id === startPicker && !i.disabled)
    if (item && item.kind === 'picker') setPicker(item.picker)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the menu opens with a requested picker; groups is rebuilt every render
  }, [open, startPicker])
  const current = picker
  const panelOpen = panel !== null
  const items = (
    <MenuCloseContext.Provider value={closeAll}>
      {header}{header && <MenuSeparator />}
      <Items groups={groups} onPicker={setPicker} onStep={setStep} onConfirm={setConfirm} onPanel={openPanel} />
    </MenuCloseContext.Provider>
  )
  return (
    <>
      <Menu label={label} title={title} kind={current || step || panelOpen ? 'dialog' : 'menu'} align={align}
        // Beside the items the overlay grows to fit both columns; the sheet ignores it.
        width={panelOpen && wide ? 'sm:w-fit' : width} className="p-1"
        trigger={trigger ?? <Icon name="ellipsis" />}
        triggerClassName={triggerClassName ?? 'ui-btn ui-btn--ghost ui-btn--sm touch-target px-1.5 py-0.5 text-faint'}
        triggerProps={triggerProps}
        open={open}
        onOpenChange={(v) => {
          // The first Escape (or outside tap) in a picker step or panel goes back to the items.
          if (!v && (current || step || panel)) { setPicker(null); setStep(null); clearPanel(); return }
          setPicker(null)
          setStep(null)
          setPanel(null)
          setOpen(v)
        }}>
        {current
          ? <PickerStep picker={current} onBack={() => setPicker(null)} onDone={() => { setPicker(null); setOpen(false) }} onConfirm={setConfirm} />
          : step
            ? <StepFrame step={step} onBack={() => setStep(null)} onDone={() => { setStep(null); setOpen(false) }} />
            : panel && !wide
              ? <PanelFrame spec={panel} onBack={clearPanel} onClose={closeAll} />
              : panel
                ? (
                  // The panel extends the menu's own overlay beside the items (D2).
                  <div className="sm:flex" data-menu-extended>
                    <div className={`${width} shrink-0`}>{items}</div>
                    <div className="w-72 shrink-0 border-l border-default p-1 pl-2" data-menu-panel>
                      <PanelHead title={panel.title} onBack={clearPanel} />
                      {panel.render(closeAll)}
                    </div>
                  </div>
                )
                : items}
      </Menu>
      {confirm && <Confirmation spec={confirm} onClose={() => setConfirm(null)} />}
    </>
  )
}

/**
 * A confirmation outside a menu (row shortcuts, banners): `ask(spec)` shows the
 * dialog; `element` must be rendered.
 */
export function useConfirm(): { element: ReactNode; ask: (spec: ConfirmSpec) => void } {
  const [spec, setSpec] = useState<ConfirmSpec | null>(null)
  return { element: spec ? <Confirmation spec={spec} onClose={() => setSpec(null)} /> : null, ask: setSpec }
}
