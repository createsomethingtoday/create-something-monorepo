# Active editorial footer contrast repair

The final text-reflow builder screenshot exposed the current .ltd property label disappearing against the dark footer. Parent reproduced the actual source in Ego at1440 in both owning palettes. The earlier `.footer-editorial .footer-link.active` rule had greater specificity than the new general link rule, retaining an inverted editorial color.

`browser-regression.mjs` fails before the repair: active text contrast1.112:1 on dark and1.065:1 on light. `before.json` and screenshots retain the failure. Parent added only the active selector to the final semantic ink rule. The same regression passes afterward:16.867:1 dark and14.281:1 light. Active class and exact destination are retained; neither palette has root overflow. Both after screenshots were directly viewed.

The script checks actual computed foreground against the nearest opaque ancestor surface, after finite transitions finish and neutralizing hover/focus. It tests the default active property state, not all footer interaction states or every mode. No external link was followed. Independent R19 will retest source and consumer integration. This is local functional/visual repair evidence, not publishing approval.
