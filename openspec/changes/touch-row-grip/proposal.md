# The row's grip takes touch selection

## Why

`task-row-context-menu` (active) gave every pointer the row's actions menu through a touch hold, and its hold already arms on every device. Selection on a phone meanwhile has only one entry point — the Select button in the list header — so choosing rows means hunting for a header button instead of a gesture. And a slow long press on the row hands the text to the browser's word selection while the press arms, so the gesture can mean something the app never decided. One place must own choosing rows, and it must not be the row body that already owns tap, hold-for-menu and drag.

## What Changes

- **The row's grip takes selection on touch.** A marker at the row's right edge (shown only where a coarse pointer is the primary one) becomes the touch gesture for choosing rows: a tap ticks it (or unticks it, entering and leaving Select mode with the usual haptic), a hold does the same without moving, and any movement drags — the grip is `touch-action: none` and `user-select: none`, so it never scrolls and never selects words. A drag on the grip lifts at once, carrying the ticked selection when the pressed row is ticked.
- **The row body's press stays what it is.** Tap opens, holding still arms the hold and releases into the actions menu, movement after the hold drags — and never ticks, because the grip owns that. A held row is now unselectable on touch screens (the inline editor and other fields in a row still select their text), so a long press can only mean what the app decided.
- **The selection box is drawn by the app.** A styled `.row-tick` box fills the same 20 px control slot as the completion circle at the same size on every device, instead of taking whatever size and offset the browser gave the native control.

No new menu items, no new shortcuts, no server or sync change: selection stays device state.

## Capabilities

### Modified Capabilities

- `bulk-actions`: touch selection lives on the row's grip (tap, hold, immediate drag); the row body's press never ticks; a held row does not hand its text to the browser's word selection; the selection box fills the row's control slot as a styled box so its alignment is identical on every device.

## Impact

- Web app: `web/src/app/TaskRow.tsx` (the `RowGrip` component, coarse pointers only, and the `onGripDown` / `onGripClick` props, plus the `.row-tick` box), `web/src/app/task-list/ListRow.tsx` (the `grip` and `gripTap` entries of the stable `RowActions`), `web/src/app/task-list/useListBindings.ts` (the grip's tap: tick and enter Select mode with one haptic), `web/src/app/task-list/useListDrag.ts` (`startDrag`'s grip mode and `onHold`), `web/src/app/TaskListView.tsx` (the grip's hold selects through `holdSelect`), `web/src/app/selection.ts` (`holdSelect`), `web/src/lib/dnd.ts` (grip mode in `beginDrag`), `web/src/index.css` (`.row-tick`, coarse-pointer `user-select: none` on rows with form controls exempt).
- Tests: `web/src/lib/dnd.test.ts` (the grip's three gestures; the body's hold unchanged), `web/src/app/taskRow.test.tsx` (the grip renders only on coarse pointers), `web/src/app/task-row-contextmenu.test.tsx` (a phone's hold opens the menu and never ticks).
- Docs: one sentence each in `docs/work-from-the-list.md` and `docs/keyboard.md`, a CHANGELOG entry, and the regenerated keyboard table and help bundle.
- Out of scope: grip on compact rows, draggability changes, any server, API or sync change.
