# Forced-colors selected and keyboard-target cues — R27

R26 independently found selected Tabs and the keyboard-highlighted Combobox option became visually indistinguishable after OS palette substitution. The selected option's checkmark remained present; it did not indicate the separate keyboard target.

Before: `before.json` records eight failed actual-paint checks at390/1440 in forced light/dark, with screenshots. Tabs had no painted selected border; Combobox had no keyboard-target outline. Local selections continued to work. The initial run selected Draft in the bound default tabs and History in pills; its claim is selected-paint failure, not two successful History selections.

Repair: scoped `@media(forced-colors:active)` only in Tabs.svelte and Combobox.svelte. Default/underline selection adds a CanvasText pseudo-element border; pills use an inset CanvasText border. Focus uses Highlight. Combobox keyboard highlight has an inset2px Highlight outline independently of the committed check. No forced-color-adjust opt-out, APIs, scripts or markup changed.

After: settled `after.json` records all16 cases without overflow; all8 forced-color paint checks pass. Native End selects History in both tablists; Enter commits the highlighted Canada. Parent directly viewed default/pills selection and option target in light/dark captures. Underline shares the repaired mechanism but is not in this route fixture, so that variant awaits independent diagnostic coverage.

Evidence timing limit: `after-unsettled.json` preserves an earlier run with three transient geometry/overflow readings. It was replaced after readiness, font readiness and repeated stable geometry checks; no CSS layout repair was made for that artifact. Early before normal1440 option widths were also unsettled, so exact before/after geometry parity is not claimed. Final normal cases have no overflow; all controls retain76px option or>=44px tab heights. This matrix varies OS forced-color scheme, not the fixture's explicit light/dark appearance control. Independent review owns that additional normal-theme check.

Functional: bounded local browser pass. Perceptual: builder pass for exercised forced-color states, pending fresh independent acceptance. Release: unapproved/local-only. Chromium emulation is not Windows OS or assistive-technology certification. Browser regression and screenshots are durable evidence; no implementation-mirroring unit test was added for CSS paint. Parent space12 remains open for the wider Cook pass.
