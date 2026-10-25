# Tasks

## 1. Hosts keep the menu mounted (the dead-dialog fix)

- [x] 1.1 Add `onAllClosed?: () => void` to `BulkActionsMenu` in `web/src/app/bulk/BulkActions.tsx`, called from an effect whenever `!open && !dating && !review` becomes true; verify `npm run typecheck` passes and `npm test -- bulk` is unchanged
- [x] 1.2 In `useListUi` (`web/src/app/TaskListView.tsx`) split `ctxMenu` into an entry cleared only by `onAllClosed` (an `open` flag flips on `onOpenChange`), and wire the `.`-cursor menu the same way; verify `npm test -- taskListView` passes
- [x] 1.3 Do the same in `web/src/app/bulk/useBulkList.tsx` for the filter, saved-view and method lists; verify `npm test -- filterView savedViewView methodList` passes
- [x] 1.4 Verify by test that the bug is fixed: right-click → "Move to project…" → pick a target → the `BulkReview` review dialog appears (this fails before 1.2); add it to `web/src/app/task-row-contextmenu.test.tsx`

## 2. Date picker alongside the menu

- [x] 2.1 Add `kind: 'panel'` + `PanelSpec { title, render(close) }` to the `ActionItem` union in `web/src/app/menus/ActionMenu.tsx`, wrapped in `NoClose`, with `panel` state: wide = items column + `w-72` panel column in one overlay, narrow (sheet) = panel replaces the items with the back header; verify `npm run typecheck` passes
- [x] 2.2 Escape order: first Escape clears `panel` and returns focus to the item that opened it, second closes the menu (extend the existing picker-step guard); verify `npm test -- ActionMenu` covers it
- [x] 2.3 Replace the modal date `Dialog` in `BulkActionsMenu`: "Pick a date…" becomes a panel whose content is a phrase input (commit on Enter/blur via `parseDateInput`) over the inline `CalendarGrid`; a pick runs `runBulk(ids, {kind:'due', pick})` and closes everything; delete `dating`/`Dialog`/`DateField` imports from `BulkActions.tsx`; verify `npm run typecheck` passes
- [x] 2.4 Tests in a new `web/src/app/datePanel.test.tsx`: panel opens with the menu items still visible; pick a day → due set on every id + Undo toast; typed phrase commits; Escape back then Escape close; narrow viewport shows the sheet variant; verify `npm test -- datePanel` passes

## 3. Priority as one row of numbers

- [x] 3.1 Add `layout?: 'row'` to `ActionGroup` and render row groups as a flex strip in `web/src/app/menus/ActionMenu.tsx`; verify `npm run typecheck` passes
- [x] 3.2 Add `compact?: boolean` to `MenuItem` in `web/src/ui/Menu.tsx`: no icon column, centred digit, checked = accent fill, `aria-label` carrying the full name over the visible digit; verify `npm test -- ui` and the axe check in `bulk.test.tsx` pass
- [x] 3.3 Map the Priority group in `bulkMenuGroups` to four compact items with `checked` = the shared priority, drop the badge shortcuts; verify `npm test -- bulk` passes with the new anatomy (one row, four buttons, accessible names "Priority 1"–"4", type-ahead "pri" still lands)
- [ ] 3.4 Confirm the menu no longer scrolls at 1080p: the browser E2E in task 5 measures the panel height before/after

## 4. Entrance motion + synced preference

- [x] 4.1 Add `@keyframes overlay-in` and the `.overlay-in` class to `web/src/index.css` (fade + 4 px rise + 0.98 scale, `--duration-ui`, `--ease-calm`); apply it in `Popover.tsx` once `pos` is set and to the `Dialog` card from 640 px (sheet keeps `dialog-sheet-up`); verify the reduced-motion rule still neutralises it (existing `data-motion`/media CSS, no change needed) and `npm test -- dialog` passes
- [x] 4.2 Server: add `motion` (`kString`) to `Schema["user_prefs"]` in `internal/sync/ops.go` with a comment naming this change; add `motion: ''` to `UserPrefs` (`web/src/lib/types.ts`) and `USER_PREFS_DEFAULTS` (`web/src/lib/ops.ts`); verify `go test ./internal/sync/...` passes
- [x] 4.3 `web/src/lib/appearance.ts`: `motion` on `Appearance`, `readAppearance` mapping anything but `none` to on, `setAppearance('motion', …)`, `applyAppearance` setting/removing `data-motion="none"` plus the cached `syncRootMotion()`; point `useRootPresentation` (`web/src/app/display/displayHooks.ts`) cleanup at it; verify `npm test -- appearance displayScreen publicList` passes
- [x] 4.4 The switch: `SettingRow` in `web/src/app/AppearanceSection.tsx` (`id="appearance-motion"`), copy in `web/src/lib/settingsCopy.ts`, index entry in `web/src/app/settingsIndex.ts`; verify `npm test -- settingsSections settingsIndex` passes
- [x] 4.5 Test `web/src/app/motionPref.test.tsx`: choosing off queues `user_prefs.motion=none` and sets the root attribute at once; an incoming op flips an open app without reload; leaving display mode restores the preference; verify `npm test -- motionPref` passes
- [x] 4.6 New strings extracted (`node scripts/i18n/extract.mjs` or the repo's i18n script) and translated in de, es, fr, it, pt; verify the i18n check passes

## 5. Spec, docs and verification

- [x] 5.1 Write the deltas under `openspec/changes/task-menu-refinement/specs/` (action-menus MODIFIED + 2 ADDED, appearance-preferences ADDED, web-app ADDED) and the note in `openspec/changes/motion-v2/design.md` D5
- [ ] 5.2 Docs: `docs/settings-you.md` (the Motion switch in Appearance) and one sentence in `docs/work-from-the-list.md` (the calendar beside the menu); verify `make docs-check` passes
- [ ] 5.3 Add an Unreleased entry to `CHANGELOG.md`; verify `make repo-check` passes
- [ ] 5.4 Full gate: `npm test` and `npm run build` in `web/`, `go test ./...`, `make check`, `openspec validate --all --strict`
- [ ] 5.5 Fresh local instance in a real browser: right-click → date panel beside the menu → pick a day → rescheduled + Undo; priority row is one line of digits; menu fits 1080p without scrolling; entrance animation visible; switch off → instant; reduced-motion emulation → instant
