# Combobox semantic relationship check

Status: initial investigation brief; see README.md for confirmed R29 findings and completed R31 repair. No source fix is authorized by this note alone; the existing user-authorized whole-system implementation scope permits a narrow repair after the current independent review releases source.

Current source leaves DOM focus on the text input while ArrowDown changes a visual option highlight. It has no aria-activedescendant or option IDs. Its listbox ID is generated with crypto.randomUUID during setup, so the actual hydrated aria-controls relationship also needs verification rather than an inferred failure. The fixture's visible Destination heading is outside the input and not explicitly associated with it.

Technical reference: [W3C APG Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), read2026-11-13. For an input-focused listbox, aria-activedescendant identifies the currently active option; the input needs a name distinct from its value, and aria-controls identifies the popup. The popup's suggested selection can be explored without immediately changing the committed input value. This note paraphrases those requirements; it does not certify screen-reader speech.

If confirmed, acceptance for a narrow repair:

- The mounted input exposes the highlighted option by an ID that resolves within its actual listbox as the user navigates, filters and clears the list.
- The hydrated input's controls target equals the actual open popup ID, with independent IDs for repeated component instances.
- Escape or a committed choice removes the active-descendant relationship when the popup is removed; chosen value and callback remain correct.
- The local Destination fixture has a descriptive accessible name. Any added naming prop is optional and compatible with existing consumers.
- Existing forced-colors target/selected-check distinction, ordinary light/dark geometry, keyboard Enter/Escape and local no-provider boundary remain intact.

Use a failing mounted regression before changes, actual DOM/AX readback after hydration, and fresh independent Sol retest. Do not claim actual assistive-technology speech, Windows OS behavior, production authentication, or a full accessibility certification. Preserve historical R29 findings and exact-source evidence.
