# Proposal

## Why

The task actions menu — the one right-click opens at the pointer, the keyboard opens with `.`, and the Selection bar raises — has four problems found together on a live instance: **"Pick a date…" does nothing** (and the same latent bug silently kills "Move to project…" / "Assign…" review from a right-click: the menu's hosts render it conditionally, so closing the menu unmounts the component whose state holds the dialog that was about to open); the menu is **tall enough to scroll on a 1080p screen**, with the Priority group alone taking four rows (~160 px) to say "1, 2, 3, 4"; the date picker opens as a **centred modal popup detached from the menu** rather than beside it; and overlays **appear with an instant opacity flip** — no entrance motion anywhere, and no way for a user who dislikes motion to turn it off short of the system setting (the `data-motion="none"` hook exists but only display mode sets it).

## What Changes

- **A menu's dialog survives the menu closing.** The hosts of the Actions menu (right-click, `.` on the cursor, the Selection bar) keep it mounted until everything it opened — the review dialog, a confirmation — is also closed, through an `onAllClosed` callback. Fixes pick-a-date and the right-click move/assign review, which are one bug.
- **The date picker shows alongside the menu, not as a popup.** A new panel item kind in the shared `ActionMenu`: choosing "Pick a date…" keeps the menu items visible and extends the same overlay with a calendar column beside them (a phrase input on top, inline month grid below). Escape steps back to the items before closing the menu; picking a day reschedules every targeted task, shows the Undo toast and closes. Below 640 px, and when the viewport is too narrow for both columns, the calendar replaces the items inside the standard bottom sheet. The modal date `Dialog` is removed.
- **Priority is one row of numbers.** The four "Priority N" rows become a single compact row of four buttons showing only `1 2 3 4` in the p1–p4 colours, each with the accessible name "Priority N" (type-ahead and the group keyboard model unchanged), the shared priority shown checked. Cuts the menu by three rows.
- **Entrance motion for every overlay**, with a switch to turn it off: menus, popovers, pickers and dialogs enter with a short fade and a 4 px rise over `--duration-ui` (120 ms) under the existing `--ease-calm`; the phone sheet keeps its slide. A new **synced** preference `motion` (`''` default = on, `none` = off) in Settings → Appearance sets `data-motion="none"` on the root, which the existing CSS already makes fully instant; the system reduced-motion setting keeps working independently.

Out of scope: exit animations (menus unmount at once, so there is nothing to animate), the completion sequence, list reflow, haptics and toast motion (all `motion-v2`), the date quick-picks (Today/Tomorrow/Next week/No date stay rows), command-palette priority entries, a per-device motion override, and any new shortcut, route, API, dependency or environment variable. No server change beyond one additive `user_prefs` schema line; nothing **BREAKING**.

Advances ROADMAP.md's "Design refresh" (one menu language everywhere, `labels-and-menus`) and the appearance-preferences work; this is the pointer-and-polish half of the task-row menu work.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `action-menus`: "Every action menu uses the shared menu behaviour" allows one compact row of related single-purpose choices (the priorities) where every button keeps its accessible name, keyboard place and checked state; a new requirement "Date picker alongside the menu" defines the calendar panel that extends the menu's own overlay, its Escape order, its narrow-screen fallback, and that a dialog opened from a menu outlives the menu closing.
- `appearance-preferences`: a new "Motion preference" requirement — additive, synced, offline, default on, applied at once as the root no-motion attribute; Settings → Appearance offers the switch.
- `web-app`: a new "Entrance motion" requirement (entrance timing per overlay kind, instant under reduced motion and under the preference) next to "Consistent overlay behaviour".

## Impact

- Web app: `web/src/app/menus/ActionMenu.tsx` (panel item kind, compact row layout, entrance class), `web/src/ui/Menu.tsx` (compact item rendering), `web/src/app/bulk/BulkActions.tsx` (priority group, date panel, `onAllClosed`, modal date dialog removed), `web/src/app/TaskListView.tsx` and `web/src/app/bulk/useBulkList.tsx` (hosts stay mounted until all closed), `web/src/index.css` (entrance keyframes), `web/src/lib/appearance.ts`, `web/src/app/AppearanceProvider.tsx`, `web/src/app/AppearanceSection.tsx`, `web/src/app/display/displayHooks.ts` (restore the preference instead of removing the attribute), `web/src/lib/settingsCopy.ts` and `web/src/app/settingsIndex.ts` (the switch's copy and index entry).
- Data: additive `user_prefs.motion` (`''` | `none`) in `internal/sync/ops.go` `Schema`, `web/src/lib/types.ts` and `USER_PREFS_DEFAULTS` in `web/src/lib/ops.ts`; not a content field.
- Tests: new `web/src/app/datePanel.test.tsx` (panel beside the menu, Escape order, pick applies to every id) and `web/src/app/motionPref.test.tsx`; updates to `bulk.test.tsx`, `task-row-contextmenu.test.tsx`, `appearance.test.ts` and the settings section/index tests; one schema case in `internal/sync/userprefs_test.go`.
- i18n: the switch's label and sentence (new strings in all six catalogs); "Pick a date", "Priority {p}" and the date panel's words already exist.
- Docs: `docs/settings-app.md` (the switch), one sentence in `docs/work-from-the-list.md` (the calendar beside the menu); CHANGELOG.
- Bundle and container: no dependency; about 1 KB of CSS and a few hundred bytes of JS. Server binary unchanged beyond the schema entry.
