# Spec Delta

## MODIFIED Requirements

### Requirement: Every action menu uses the shared menu behaviour
The view, label, section and project menus SHALL each be a design-system menu, with its keyboard navigation, item anatomy and overlay behaviour, so a user who learns one menu can operate them all. Each menu item SHALL show an icon and a label of at most four words; no action menu SHALL contain a native select. One exception to the icon-and-row anatomy: a group of mutually exclusive, single-purpose choices of one kind (the four priorities) MAY render as one compact row of buttons showing only their number, where every button keeps an accessible name that names its choice and contains the visible number, its place in the menu's keyboard model and type-ahead, and its checked state when the choice already applies.

#### Scenario: View menu layout
- **WHEN** the user opens the menu of a saved view
- **THEN** the items appear in groups (rename; pinned and start view; move up and move down; delete), each with an icon, and "Delete view" is last, separated and in the danger colour

#### Scenario: Disabled with reason
- **WHEN** the user opens the menu of the first section of a project
- **THEN** "Move up" is shown disabled and its description says it is already first

#### Scenario: Screen reader announcement
- **WHEN** a screen reader user opens a label menu
- **THEN** the panel is announced as a menu named after the label, and each item as a menu item with its checked or disabled state

#### Scenario: Priority is one row of numbers
- **WHEN** the user opens a task's actions menu
- **THEN** the Priority group is a single row of four buttons reading 1, 2, 3 and 4, each announced as "Priority N", reachable by arrow keys and by typing "pri", with the priority every targeted task already has shown checked

## ADDED Requirements

### Requirement: Date picker alongside the menu
"Pick a date…" SHALL open the calendar inside the menu's own overlay as a panel beside the menu items — not a separate popup — with the items still visible and operable on wide screens; below 640 px the panel SHALL replace the items inside the standard bottom sheet with a back control. The panel SHALL offer the phrase input (typed dates parse as they do everywhere) and the month grid. Escape SHALL close the panel first, returning focus to the item that opened it, and close the menu only on the second press. Choosing a date SHALL reschedule every task the menu targets as one undoable batch, show the Undo toast and close the panel and the menu. The picker reads and writes local data only, so it behaves the same offline.

#### Scenario: Panel beside the menu
- **WHEN** the user right-clicks a task and chooses "Pick a date…" on a desktop
- **THEN** the calendar appears attached to the right of the visible menu items in one overlay, with no scrim and no centred dialog

#### Scenario: Pick applies to the whole target
- **WHEN** three tasks are ticked, the menu is open on them and the user picks Friday in the panel
- **THEN** all three are due on Friday as one batch with one Undo toast, and the panel and menu close

#### Scenario: Escape steps back before closing
- **WHEN** the date panel is open and the user presses Escape once
- **THEN** the panel closes, focus returns to "Pick a date…" in the still-open menu, and a second Escape closes the menu

#### Scenario: Narrow screen uses the sheet
- **WHEN** the user opens "Pick a date…" on a 390 px screen
- **THEN** the calendar fills the bottom sheet with a back control, and choosing a day applies and dismisses the sheet

#### Scenario: Typed phrase
- **WHEN** the user types "tomorrow" in the panel's input and presses Enter
- **THEN** the targeted tasks are due tomorrow and the panel closes

### Requirement: A dialog opened from a menu outlives the menu
When an action closes the menu but opens a dialog or review step (the move or assign review, a confirmation), that surface SHALL still appear: the menu's host keeps the menu component mounted until both the menu and every surface it opened are closed. This SHALL hold for every host — the Selection bar, the `.` cursor menu and the right-click menu. No selection, cursor or pointer state SHALL be changed by the dialog opening or closing.

#### Scenario: Right-click move shows its review
- **WHEN** the user right-clicks a task, chooses "Move to project…", picks a project and the menu closes
- **THEN** the review dialog for that move appears, and applying it moves the task; cancelling moves nothing

#### Scenario: Cursor menu review
- **WHEN** the user presses `.` on a task, picks a move target and the menu closes
- **THEN** the review dialog appears exactly as it does from the Selection bar

#### Scenario: Nothing left behind
- **WHEN** the review dialog opened from a right-click is closed
- **THEN** the menu's host state is cleared, no overlay remains, and the next right-click opens the menu fresh at the new pointer position
