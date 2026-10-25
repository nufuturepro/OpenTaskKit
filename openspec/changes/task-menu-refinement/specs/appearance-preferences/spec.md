# Spec Delta

## ADDED Requirements

### Requirement: Motion preference
Each user SHALL have a motion preference stored and synced like mode and theme as an additive `user_prefs` field: `''` (default, motion on) or `none` (motion off). A client SHALL treat an unknown value as on and keep the stored value unchanged. With motion off the app SHALL apply the root no-motion presentation so every entrance, transition and animation is instant; with motion on (the default) the system's reduced-motion setting SHALL still be honoured independently. Settings → Appearance SHALL offer the switch, and it SHALL apply at once, offline, on every device of that user after sync.

#### Scenario: Turn motion off
- **WHEN** the user switches Motion off in Settings → Appearance
- **THEN** the switch writes one `user_prefs.motion` op, the attribute applies at once, and the next menu or dialog opens with no movement

#### Scenario: Follows the account
- **WHEN** a user turns Motion off on a laptop and later opens the app on a phone
- **THEN** the phone shows no overlay motion too, without setting anything again

#### Scenario: Default and unknown value
- **WHEN** an account that never set the preference opens the app, or a device receives a motion value it does not know
- **THEN** motion is on, exactly as before this change, and no op is written

#### Scenario: System reduced motion still wins
- **WHEN** motion is on and the operating system requests reduced motion
- **THEN** movement and scaling animations stay instant while colour and opacity may still fade

#### Scenario: Export and import
- **WHEN** a user who turned Motion off exports their data and imports it into a new account
- **THEN** the export carries the preference and the new account starts with motion off
