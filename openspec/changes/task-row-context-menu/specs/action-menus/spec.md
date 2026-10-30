# Spec Delta

## ADDED Requirements

### Requirement: Open a task's action menu with a right-click
A right-click on a task row (a list row, a board card, a timeline row, or a row of the filter, saved-view and method lists) SHALL open that row's actions menu — the same menu the keyboard opens, with the same items, pickers, review step and Undo — positioned at the pointer, and SHALL suppress the browser's own context menu over the row. The menu's target SHALL be every ticked task when the right-clicked row is ticked, otherwise only the right-clicked row's task, and a right-click SHALL NOT change the current selection. The browser's menu SHALL be left alone over a link, a text field or editable text inside the row, and over a non-collapsed selection of the row's text, so native actions — open in a new tab, copy link address, paste, spellcheck, copy — keep working there. A `contextmenu` raised by touch SHALL be suppressed but SHALL NOT open the menu: the touch hold owns that gesture, so one press never opens the menu from two places. While a row drag is lifted, the right-click SHALL do nothing and the drag SHALL proceed. On a viewport below 640 px the menu SHALL appear as the standard bottom sheet, ignoring the pointer position.

#### Scenario: Right-click a single task
- **WHEN** the user right-clicks an unticked row in Today
- **THEN** the Actions menu opens next to the pointer with "Actions for 1 task", the browser menu does not appear, and the row's selection state is unchanged

#### Scenario: Right-click a ticked row acts on the selection
- **WHEN** three rows are ticked and the user right-clicks one of them
- **THEN** the menu opens for all three tasks ("Actions for 3 tasks"), exactly as the Selection bar's menu would

#### Scenario: Right-click a row outside the selection
- **WHEN** two rows are ticked and the user right-clicks a third, unticked row
- **THEN** the menu opens for that row's task only, and the two ticked rows stay ticked

#### Scenario: A link keeps the browser's menu
- **WHEN** the user right-clicks the origin chip (an external link) inside a row
- **THEN** no app menu opens and the browser's own menu appears, offering "Open link in new tab" and "Copy link address"

#### Scenario: The inline title editor keeps the browser's menu
- **WHEN** the user right-clicks inside a row whose title is being edited in place
- **THEN** no app menu opens and the field's native menu (paste, spelling suggestions) appears

#### Scenario: Selected text can still be copied with a right-click
- **WHEN** the user selects part of a row's title and right-clicks the selection
- **THEN** no app menu opens and the browser's menu offers "Copy"

#### Scenario: A touch long press never doubles up
- **WHEN** Chrome on Android raises `contextmenu` during a long press on a row
- **THEN** the browser menu is suppressed, no app menu opens from that event, and the long press's own owner decides what happens — the row's actions menu through the hold, never a browser menu

#### Scenario: A lifted drag wins
- **WHEN** the user long-presses a row to drag it and the context gesture fires before release
- **THEN** no menu opens and the drop completes on release as it does today

#### Scenario: Escape closes without residue
- **WHEN** the right-click menu is open and the user presses Escape
- **THEN** the menu closes, focus returns to the page, and the next right-click opens it again at the new pointer position

### Requirement: Open a task's action menu with a touch hold
On a touch pointer, holding a task row still for the hold interval (350 ms) SHALL arm the gesture — the row shows held feedback while the hold counts — and releasing without moving SHALL open the same actions menu at the finger: the same items, pickers, review step and Undo, and the same ticked-selection rule as the right-click, without changing the current selection. Moving before the hold completes SHALL be a scroll and SHALL NOT open anything; moving after it SHALL start the row's drag exactly as it does today, with no menu, and the held feedback SHALL end where the drag's own feedback begins. The gesture SHALL work on every row that answers a right-click, a press shorter than the hold SHALL keep the row's ordinary tap behaviour, and the browser's own context menu SHALL NOT appear over the row.

#### Scenario: Hold still and lift — the menu opens at the finger
- **WHEN** the user presses a row in a list on a touch screen, holds still past the hold interval and lifts without moving
- **THEN** the row's actions menu opens anchored where the finger was, acting on the ticked selection when the row is ticked and on the row's task otherwise, and the row's held feedback is cleared

#### Scenario: Hold and then move drags instead
- **WHEN** the user presses a row, holds past the interval and then moves the finger
- **THEN** the drag lifts with its usual feedback, no menu opens, and releasing completes the drop as it does today

#### Scenario: A move before the hold is a scroll
- **WHEN** the user presses a row and moves further than the drag threshold before the hold interval elapses
- **THEN** the hold ends without feedback and without a menu, and the page scrolls under the finger

#### Scenario: A short press is still a tap
- **WHEN** the user taps a row and releases before the hold interval elapses
- **THEN** the row behaves exactly as it does today (the tap opens or selects it), with no menu
