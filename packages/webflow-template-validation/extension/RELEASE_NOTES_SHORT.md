# Webflow Way Validator v1.3.7

## Changes/Fixes

- Stats panel shows breakpoint-bound and name-matched mode lists when variable-mode evidence is mixed, instead of a name-based result.
- Reads each class's real type (global, combo, tag, element, descendant) and origin (site or library) from the Designer instead of guessing from names. Falls back to the previous behavior on older Designer runtimes.
- Reads width, min-width, and max-width at every bounded breakpoint so responsive layout can be checked.
- Reports which variable modes are bound to a breakpoint instead of guessing from mode names.
- Reports library, code, and read-only components.
- Skips nesting analysis for read-only (library) components instead of failing on them.

## Worker pairing

The matching Worker update excludes library-imported classes and components from naming checks, adds two warnings (`styles.element-scoped`, `styles.fixed-width-overflow`), adds info notes when code or library components are present, and uses breakpoint bindings to identify responsive variable modes. No new check blocks submission.
