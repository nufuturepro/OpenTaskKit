// The root no-motion presentation (OpenSpec change task-menu-refinement,
// "Motion preference"): one module-level snapshot of the account's motion
// preference, so a path that only overrode it — display mode's
// useRootPresentation cleanup — can restore it again. Its own module with no
// imports: displayHooks is shared with the public list page, which must not
// pull the local database in.
let motionOff = false

/** Applies the motion preference to a document root: `data-motion="none"` while off, removed while on, and remembers it. */
export function applyMotion(off: boolean, doc: Document = document): void {
  motionOff = off
  if (off) doc.documentElement.setAttribute('data-motion', 'none')
  else doc.documentElement.removeAttribute('data-motion')
}

/** Re-applies the last known preference — after display mode's override ends, say. */
export function syncRootMotion(doc: Document = document): void {
  if (motionOff) doc.documentElement.setAttribute('data-motion', 'none')
  else doc.documentElement.removeAttribute('data-motion')
}
