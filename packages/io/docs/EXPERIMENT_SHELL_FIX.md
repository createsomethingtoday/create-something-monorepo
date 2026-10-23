# Concrete experiment shell correction

The public shell policy previously matched only the dynamic experiment template. All 17 concrete experiment pages now share the Canon research palette, navigation and type. Nested experiment endpoints, auth, account and transaction surfaces remain excluded. Simulations, research content and semantic data colors are preserved.

The original SVG Living Arena also resolves its local legacy brand accent to a neutral foreground, restoring its clipped-gradient title without altering semantic data colors.

The Living Arena GPU page replaces undefined `--color-accent` / `--color-accent-rgb` brand references with defined neutral performance tokens; the badge is dark text on a light neutral surface. Agent count and simulation seed inputs have accessible names.

## Validation

- New regression reproduced the missing shell before implementation.
- Route inventory regression includes all 17 concrete pages and the dynamic template; nested endpoints and private surfaces are excluded.
- `.io check`: passes, Svelte reports zero errors and warnings.
- `.io build`: passes (existing bundle-size and Browserslist notices).
- 51 browser cases: 17 routes at 390, 768 and 1440 pixels, reduced-motion preference. All return 200, opt into the shell, have no horizontal overflow, broken images or page errors. Machine evidence: `evidence/experiment-shell-layout.json`.
- Local AI-native filtering uses its existing empty fallback because local D1 lacks `fnji_products`; this does not verify its production data workflow.

## Independent Sol 6.1 review

Reviewed runtime source at `558ce741f879aff6acd1d2855ec005d12b93175c`; no simulation handlers, initialization, state or destruction logic changed. Native Chrome WebGPU initialized context, simulation and telemetry and started successfully, including restarts after count and seed changes. Keyboard count adjustment and Apply produced 10,000 agents; seed changed from 123 to 456; LIVE switched to PAUSED; scenario 2 selected; focus outline remained visible at 3 pixels. This verifies the existing LIVE control's scenario-cycle pause, not a newly added GPU renderer pause.

With `navigator.gpu` absent, the unsupported fallback appears, GPU controls are hidden and the original SVG experiment link remains usable. On route-away, experiment-owned 100 ms and FPS intervals are removed; only baseline layout intervals remain. No page errors or overflow at 390/1440. Semantic status colors remain intact. Native GPU testing represents this Chrome/macOS host, not every GPU/driver/browser combination. No synthetic GPU mock was used to claim hardware support.

Final production receipts are maintained in the PR closeout.

Worktree disposition: preserved at `property-images`, branch `codex/experiment-research-shell` until release verification.
