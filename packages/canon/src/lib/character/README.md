# Canon character

Canon is a squat charcoal felt companion with a dimensional soft cuboid head,
short cream-tipped antenna and useful notebook. Its digital expression is woven
into the face: filled vertical oval eyes, contained dark pupils and a small
pixel smile. Keep that material identity. Circular eyes, the flat face, glass,
glow, stone and metal are outside this direction. A nose is not required.

## Public component and asset ownership

```svelte
<script lang="ts">
  import { CanonCompanion } from '@create-something/canon/character';
</script>

<CanonCompanion size={96} headSrc="/images/canon/head-r42.webp" />
<p>Canon / choose a next step.</p>
```

`CanonCompanion` is the sole compact character renderer. `size` accepts 24, 32, 48, 64
or 96; the default is 96. Only 96 renders the approved static r42 head. Smaller
sizes render plain `Canon` text. A missing, empty or failed `headSrc` also uses
text. A failed instance does not hide another instance's image.

The head is decorative (`aria-hidden`, empty image alt). Applications supply
the meaningful adjacent state, evidence and controls. There is no expression
prop, automatic blinking, timer, busy animation or completion celebration.

The package does **not** install or copy artwork into the consumer's public
directory. Serve the unchanged approved r42 export from an application-owned
URL and pass it explicitly. Canon's own local guide uses
`/canon-next/approved-v1/head-r42.webp`; this is a guide URL, not a portable
default. Loading the component without artwork remains useful textual identity.

The narrow entrypoint also exports `CanonCompanionProps`,
`CanonCompanionSize`, `CANON_CHARACTER_ASSET_METADATA`, and the semantic
`expressions`, `expressionCopy`, `samplePreparationText`, `CanonExpression`
contract. Metadata records filenames, dimensions, backgrounds and accepted
framing. It is not an asset installer or a permission grant. The public export
policy classifies this as a brand surface outside agent-default UI primitives.

## Task opening composition

`CanonTaskOpening` shares the responsive scene opening used by the public
properties. Pass `art: CanonTaskArt` (`src`, `mediumSrc`, `mobileSrc`, `width`,
`height`), a `scene` key, a concept `caption`, and the HTML `children` snippet.
The consumer owns its scene registry and served URLs; Canon imports no property
registry or route content.

The section owns its CSS background and three matching responsive preloads.
The reserved task area uses the supplied width/height ratio so the complete
scene stays visible, without a cover crop. Desktop art reaches the hero's right
edge; at medium and mobile sizes, real HTML copy precedes a fully reserved
background area. Copy, headings and actions remain native HTML in every mode.
All three sources must share the supplied composition ratio.

The markup retains `canon-task-opening-*` classes and `data-canon-task={scene}`
for consumer integration. Property-specific root, grid and proof-layout resets
belong in the thin property adapter or owning application CSS. The caption
always identifies concept illustration; scene art does not establish runtime
execution or approval. `CanonTaskOpeningProps` and `CanonTaskArt` are exported
through the same `@create-something/canon/character` entrypoint.

## Approved assets and display limits

| Family | Approved export | Supported use |
| --- | --- | --- |
| r41 body | `body-r41.webp`, 783×856 | Opaque black-background still; reviewed at roughly 370/200px figure heights |
| r42 head | `head-r42.webp`, 264×264 | Transparent static head in a 96px frame, on black or explicit light surfaces |
| r45 gestures | `gestures-r45.webp`, 1200×800 | Opaque black-background 3×2 sheet; at most 200px per captioned cell |

The head's original 1254×1254 source has alpha-above-8 bounds 179,131 through
1066,1042. The renderer retains those source coordinates and fits the complete
head and antenna into 96×96px, with about 93.5px visible width. The encoded
264px source supplies 2× density for the roughly 132px positioned image.
Do not substitute encoded pixel dimensions into the framing coordinates.

r41 and r45 include black backdrops; they are not arbitrary-background cutouts.
r42's larger-source edge fringe remains a limit beyond its accepted 96px use.
Larger heads, full-body transparent assets or animated expressions require new
artwork and direct review at their intended sizes. No source pixels, alpha or
color are retouched by this renderer. Preserve original r41/r42/r45 artwork.

## Gestures and truthful state

The sheet reads left-to-right, top-to-bottom: Welcome, Attention, Focus,
Review, Pause, Handback. Focus looks down at the notebook; Review supports a
sheet. Pause raises a gentle palm; Handback offers the notebook in both hands.
These are six editorial stills, not animation frames or runtime state proof.

The owning application supplies truthful words and explicit controls. Focus
does not prove execution; Review does not grant approval; Pause does not claim
a repair; Handback does not assert success. `/next/character` changes local text
and selection only. It never runs a live tool or claims an external receipt.
The same r42 still accompanies every state. Before hydration, the sample
controls are disabled; artwork and guidance remain readable without JavaScript.

## Provenance and retirement

Built-in image generation supplied the original studies. The approved local
family is r41 body, r42 head and r45 gestures, with intended-size review and
artwork acceptance recorded in the earlier Cook evidence. Approved environment
scenes are separate. A concept still is not software proof or publishing
authority.

Rejected `CanonFace` SVG code, selectable earlier `TactileStudy` heads and
active r34/r38 comparison galleries have been retired. Git history preserves
their source; do not reintroduce them as compact or no-WebGL fallbacks.
Tracked earlier prototype PNGs were removed from Canon's public static tree.
Preserved untracked evidence is not approved shipping artwork; deployment
staging must exclude it. Functional tests, rendered perception and release
readiness remain separate gates.
