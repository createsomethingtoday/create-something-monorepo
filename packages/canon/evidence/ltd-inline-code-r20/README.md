# LTD inline code repair

The actual before regression failed all four 320px guide cases: colors359, typography333, theming362 and get-started341px root width. A single owning-layout rule now permits long inline code names to wrap anywhere; preformatted code is excluded. No text, padding, font or root overflow behavior was changed.

The same browser regression passes all24 route/width cases after repair (320,390,768,1024,1025,1440). Exact inline and preformatted text arrays match before/after on every affected route. All six narrow pre blocks retain internal horizontal overflow with `overflow-x:auto` and `white-space:pre`. Parent directly viewed narrow colors and get-started captures; the paths remain readable across lines.

The first after attempt encountered ERR_CONNECTION_REFUSED because the reviewer-owned LTD server had ended. Parent restarted the same worktree's LTDdev at5194 (execsession29095), then reran the regression. This was runtime recovery, not another source repair. Ego space12 was reused.

Functional correctness: builder scoped pass on actual local runtime. Perceptual/product quality: builder scoped pass after direct inspection, independent acceptance pending. Release readiness: unapproved. Relevant compile/check and independent Sol readback follow the combined local repair checkpoint; no production action.
