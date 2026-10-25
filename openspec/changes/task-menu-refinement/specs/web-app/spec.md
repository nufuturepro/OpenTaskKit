# Spec Delta

## ADDED Requirements

### Requirement: Entrance motion
Menus, popovers, pickers and dialogs SHALL enter with one short animation — a fade with a 4 px rise and a 0.98 scale — lasting no more than `--duration-ui` (120 ms) under the calm easing. The phone sheet SHALL keep its slide-up entrance. There SHALL be no exit animation: an overlay that closes SHALL be gone at once so the effect of the chosen action is visible immediately. Under the system's reduced-motion setting and under the root no-motion presentation (the Motion preference and display mode) the entrance SHALL be instant. Focus, keyboard order and the overlay stack SHALL be unaffected by the animation: an overlay is operable from its first frame.

#### Scenario: Menu opens smoothly
- **WHEN** the user opens a task's actions menu with the pointer
- **THEN** the panel fades in and rises a few pixels over about 120 ms, and its first item has focus throughout

#### Scenario: Dialogs match menus
- **WHEN** a confirmation dialog opens from 640 px up
- **THEN** it enters with the same fade and rise the menus use, while the phone sheet keeps its existing slide

#### Scenario: Off means instant
- **WHEN** Motion is off (or display mode sets the no-motion presentation)
- **THEN** the overlay appears with no movement, scale or fade

#### Scenario: Reduced motion
- **WHEN** the system requests reduced motion and a menu opens
- **THEN** the entrance runs as an instant change with no movement or scaling
