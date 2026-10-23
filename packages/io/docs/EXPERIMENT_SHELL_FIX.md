# Concrete experiment shell correction

The public shell policy previously matched only the dynamic experiment template. All 17 concrete experiment pages now share the Canon research palette, navigation and type. Nested experiment endpoints, auth, account and transaction surfaces remain excluded. Simulations, research content and semantic data colors are preserved.

The Living Arena GPU page replaces undefined `--color-accent` / `--color-accent-rgb` brand references with defined neutral performance tokens; the badge is dark text on a light neutral surface. Agent count and simulation seed inputs have accessible names.

## Validation

- New regression reproduced the missing shell before implementation.
- Route inventory regression includes all 17 concrete pages and the dynamic template; nested endpoints and private surfaces are excluded.
- `.io check`: passes, Svelte reports zero errors and warnings.
- `.io build`: passes (existing bundle-size and Browserslist notices).
- 51 browser cases: 17 routes at 390, 768 and 1440 pixels, reduced-motion preference. All return 200, opt into the shell, have no horizontal overflow, broken images or page errors. Machine evidence: `evidence/experiment-shell-layout.json`.
- Local AI-native filtering uses its existing empty fallback because local D1 lacks `fnji_products`; this does not verify its production data workflow.

Independent interaction review and final release receipts follow after completion.

Worktree disposition: preserved at `property-images`, branch `codex/experiment-research-shell` until release verification.
