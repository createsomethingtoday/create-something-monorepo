# Canon leaf metadata ownership — R25

Actual `/canon`, `/canon/foundations/colors` and `/canon/foundations/typography` each rendered two meta descriptions: the layout fallback and the leaf SEO component. The title had already been deduplicated by Svelte; this was a description ownership defect.

The only application edit removes the redundant `<svelte:head>` block from `packages/ltd/src/routes/canon/+layout.svelte`. Both existing leaf routes supply SEO; no fallback is needed for a third route. The shared SEO reactivity repair is separately recorded in `../seo-navigation-r24/REPORT.md`.

`browser-regression.mjs`, `phase.json`, `before.json` and `after.json` preserve the actual Ego regression. Before: all three routes failed the one-description requirement. After: all three have one authoritative description matching og:description, the intended title and canonical URL. No mock head DOM or source-string assertion substitutes for this browser check.

Functional: bounded browser pass. Perceptual: not applicable to invisible head tags; no visible layout change. Release: unapproved/local only. Independent combined acceptance is recorded separately. Parent space12 remains open for the wider Cook task.
