// Bulk selection for the lists built on useListKeys (the Filter view and saved
// views; bulk-edit tasks 1.2 and 2.4): the selection, the bar, the cursor menu
// and the row props, in one hook.
import { useMemo, useState, type ReactNode } from 'react'
import type { Task } from '../../lib/types'
import { useSelection, type SelectionApi } from '../selection'
import { BulkActionsMenu, SelectionBar } from './BulkActions'
import { t } from '../../lib/i18n'

export interface BulkList {
  selection: SelectionApi
  /** Ticked ids in list order. */
  ticked: string[]
  /** Task ids in list order (each once). */
  order: string[]
  openActions: (picker?: string | null) => void
  /** The bar and, with nothing ticked, the cursor task's menu. */
  render: (cursor: string | null) => ReactNode
  rowProps: (id: string) => { ticked: boolean; showCheckbox: boolean; onTick: (range: boolean) => void; onContextMenu: (e: React.MouseEvent) => void }
}

export function useBulkList(tasks: readonly Task[]): BulkList {
  const order = useMemo(() => [...new Set(tasks.map((task) => task.id))], [tasks])
  const selection = useSelection(order, () => false)
  const ticked = useMemo(() => order.filter((id) => selection.ticked.has(id)), [order, selection.ticked])
  const [open, setOpen] = useState(false)
  /** Keeps the cursor menu mounted while a review it opened is on screen (task-menu-refinement D1). */
  const [hold, setHold] = useState(false)
  const [picker, setPicker] = useState<string | null>(null)
  /** Right-click (task-row-context-menu): the actions menu at the pointer. `open` flips on close; `onAllClosed` clears the entry. */
  const [ctxMenu, setCtxMenu] = useState<{ ids: string[]; x: number; y: number; open: boolean } | null>(null)
  const onOpenChange = (v: boolean) => { setOpen(v); if (!v) { setPicker(null); setHold(true) } }
  const release = () => { setOpen(false); setHold(false); setPicker(null) }
  return {
    selection, ticked, order,
    openActions: (p = null) => { setPicker(p); setOpen(true) },
    render: (cursor) => (
      <>
        <SelectionBar ids={ticked} onClear={selection.clear} menuOpen={open && ticked.length > 0} onMenuOpenChange={onOpenChange} startPicker={picker} />
        {(open || hold) && ticked.length === 0 && cursor && (
          <BulkActionsMenu ids={[cursor]} open={open} onOpenChange={onOpenChange} onAllClosed={release}
            startPicker={picker} trigger={<span className="sr-only">{t('Actions')}</span>} triggerClassName="sr-only" />
        )}
        {ctxMenu && (
          <BulkActionsMenu ids={ctxMenu.ids} open={ctxMenu.open}
            onOpenChange={(v) => { if (!v) setCtxMenu((cur) => (cur ? { ...cur, open: false } : cur)) }}
            onAllClosed={() => setCtxMenu(null)}
            trigger={<span className="sr-only" />}
            triggerProps={{ style: { position: 'fixed', left: ctxMenu.x, top: ctxMenu.y } }}
            triggerClassName="sr-only" />
        )}
      </>
    ),
    rowProps: (id) => ({
      ticked: selection.ticked.has(id), showCheckbox: selection.ticked.size > 0,
      onTick: (range) => { if (range) selection.extendTo(id); else selection.toggle(id) },
      onContextMenu: (e) => {
        e.preventDefault()
        setCtxMenu({ ids: selection.ticked.has(id) ? ticked : [id], x: e.clientX, y: e.clientY, open: true })
      },
    }),
  }
}
