# Tasks

## 1. The grip

- [x] 1.1 `RowGrip` in `web/src/app/TaskRow.tsx`: right edge of the row, rendered only where a coarse pointer is primary, `touch-action: none`, `user-select: none`, a 44 px target and `aria-pressed`; wired through the `onGripDown` / `onGripClick` props
- [x] 1.2 The `grip` / `gripTap` entries of the stable `RowActions` in `web/src/app/task-list/ListRow.tsx`, handled in `useListBindings.ts`: a tap ticks (or unticks) and enters Select mode with one haptic pulse, a hold does the same through the drag
- [x] 1.3 Grip mode in `beginDrag` (`web/src/lib/dnd.ts`): movement lifts at once without waiting for the hold, a held release never opens the menu; `startDrag(e, task, grip)` in `useListDrag.ts` passes it and wires `onHold` (through `holdSelect` in `selection.ts`) to the grip only

## 2. The row stays the menu's, and the box is ours

- [x] 2.1 The row body's hold keeps its single meaning (it never ticked in this distribution): tap opens, hold arms and releases into the menu, movement after the hold drags — the grip, not the body, is what selects
- [x] 2.2 Stop a held row from selecting words: coarse-pointer `user-select: none` on `li[data-task-id]` in `web/src/index.css`, with form controls inside a row exempt so the inline editor still selects its text
- [x] 2.3 Draw the selection box ourselves: the `.row-tick` rule (appearance none, 20 px, 4 px radius, accent fill and tick when checked) so it fills the same slot as the completion circle on every device

## 3. Tests

- [x] 3.1 `web/src/lib/dnd.test.ts`: the grip's tap, hold and immediate drag; the body's hold still arms and opens the menu
- [x] 3.2 `web/src/app/taskRow.test.tsx`: the grip renders only where a coarse pointer is primary
- [x] 3.3 `web/src/app/bulk/bulk.test.tsx`: a grip tap and a grip hold tick and show the bar with one haptic; the row body's hold opens the menu and never ticks
- [x] 3.4 `npm run typecheck`, `eslint` and `TZ=UTC npx vitest run` pass
- [x] 3.5 `web/src/lib/dnd.test.ts` + `web/src/app/bulk/bulk.test.tsx`: a hold that becomes a drag gives its tick back once at the lift (grip only, the row body untouched); a still release keeps it; Escape after a hold gives it back — and the component stays inside `max-lines-per-function` through the module-scope `undoGripHold`

## 4. Spec, docs and delivery

- [x] 4.1 This change's delta (`bulk-actions`) written against the current spec; strict OpenSpec validation passes
- [x] 4.2 Docs: one sentence each in `docs/work-from-the-list.md` and `docs/keyboard.md`; CHANGELOG entry; `make docs-check` passes
- [x] 4.3 Full gates: typecheck, lint, tests (TZ=UTC), openspec validate, i18n check — and CI green on `c6891b3f` (web tests, all three visual shards with the regenerated baselines, layout, server, a11y, checks)
