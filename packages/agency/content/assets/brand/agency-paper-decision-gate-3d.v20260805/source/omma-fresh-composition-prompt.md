# Omma fresh-composition prompt — Services Decision Line

Build a new standalone interactive 3D hero scene for CREATE SOMETHING
`.agency` `/services`. Begin from a blank scene. Do not revise or inherit the
current macro camera, safety-orange lighting, chromatic aberration, vignette,
or existing framing solver.

The scene must explain one workflow boundary through physical paper alone:

1. A compact, precisely registered source stack.
2. A scored working packet with visibly layered edges and one controlled fold.
3. A single held sheet that visibly meets a near-black decision rail.
4. One muted review-gold authority tab exactly at the stop/contact point.

The three states must be legible together in one settled frame as
source → working material → held decision. This is an engineered operating
artifact, not stationery, a desk scene, an abstract sculpture, or a product
beauty shot.

## Fixed production composition masks

Treat these masks as geometry constraints before choosing a camera:

- Desktop reference: 1440 × 1000 page viewport. The scene fills the hero below
  a 72px navigation bar.
- Keep the left 46% of the hero completely quiet for live HTML eyebrow,
  headline, lede, and two actions. No paper, rail, shadow, light bloom, fog,
  reflection, or accent may enter this lane.
- Keep the bottom 18% of the hero quiet for a full-width live HTML proof rail.
  No object or hard shadow may cross it.
- Fit the complete paper sequence within x=52–94% and y=15–76% of the desktop
  hero. Preserve negative space on all four sides of that object field.
- Mobile reference: 390 × 844. Keep the upper 52% completely quiet for live
  copy and actions, and the bottom 14% quiet for live proof. Reframe the same
  object identity inside the band between them; do not merely scale the
  desktop camera until the object is tiny.
- Implement named `desktop` and `mobile` camera rigs selected from the actual
  container aspect ratio. Test both production masks before declaring the
  composition complete.

## Camera and visual language

Use an elevated three-quarter survey camera, not macro. Start around a
30–36° vertical FOV (roughly a 45–55mm full-frame equivalent) with a 32–38°
downward pitch, then solve distance from the complete cluster bounds. All
three states, the rail, and the gold contact must be visible simultaneously.
Do not crop a source stack or stop rail to manufacture drama.

Translate high-performance product engineering and aerospace instrumentation
into a restrained CREATE SOMETHING Paper scene without copying Nike, NASA, or
any third-party trade dress:

- warm optic-white or very light neutral paper;
- convincing thickness, laminated cut edges, restrained fiber, and shallow
  score/fold relief that survives close desktop viewing;
- one precise near-black powder-coated or machined rail;
- one muted review-gold tab, large enough to read but never glowing;
- coherent neutral instrument field `#0e1113` or a warm optic-white studio
  field—choose one field, never a split light/dark gradient;
- controlled large-source lighting, soft crisp contact shadows, restrained
  cool fill, and no colored bloom.

Do not use macro optics, depth of field, fog as fake depth of field, chromatic
aberration, vignette, red or safety-orange light, pulsing emissive accents,
lens distortion, auto-rotation, camera cycling, or animated meaning. Optional
pointer parallax must stay under 0.6° and may not move any object into a
protected mask.

## Runtime and delivery contract

Deliver a SvelteKit-safe component plus modular Three.js source. Use the local
`three` package—no CDN or iframe. Expose `desktop` and `mobile` settled camera
states and a static `spread` prop only if the settled value is deterministic.
Use one WebGL context, a capped DPR of 1.5 desktop / 1.25 mobile, seeded
procedural texture generation (never bare `Math.random()`), and explicit
`pause`, `resume`, `resize`, context-loss, and `dispose` behavior. Do not add a
device-orientation listener. `prefers-reduced-motion` must render a meaningful
settled state or allow the host to use an owned static poster.

Do not put text, letters, numbers, logos, watermarks, interface chrome, hands,
people, water, glass, stationery accessories, collage, random scraps, or
crumpled paper in the pixels. All copy, labels, controls, and proof remain
authored HTML outside the scene.

Before calling the result complete, show untouched screenshots of the actual
scene at 1440 × 928 hero space and 390 × 772 hero space with the protected
masks visibly overlaid for review. If either mask is crossed, repair the camera
or object placement before proposing material or post-process embellishment.
