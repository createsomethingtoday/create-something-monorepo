# GiGi presentation work

Read `DESIGN_FOUNDATION.md` before changing shared UI. The user-selected product
foundation is Astryx, adapted locally for this HTML/ESM Tauri renderer.

- `web/foundation.css` owns design primitives, theme roles and compatibility aliases.
- Use those roles in feature CSS; do not add another root palette or arbitrary scale.
- Preserve `studio`, `paper`, `midnight` preference IDs and user chat overrides.
- Keep record meaning, source consent, approval and receipt behavior intact.
- Exercise the synthetic foundation browser harness and directly view changed
  surfaces. Native minimum is 880×620. Chromium fixtures do not prove WebKit or
  signed/notarized installer acceptance.
