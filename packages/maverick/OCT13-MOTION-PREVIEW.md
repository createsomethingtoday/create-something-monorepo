# Maverick X visual and motion Preview — CRE-2262

Review direction for October 15, not production approval. Builds on 31a5dc150578e5606b4e5fd8117a60bad2bb94b2 and preserves the approved information structure and qualified factual copy.

## Delivered

Light paper/sage surfaces, deep green type, larger sentence-case Barlow headings, more open spacing and framed industry imagery replace the dark video-led composition. An original SVG contour material study provides atmospheric light, slow form rotation and bounded mouse response. It does not depict a scientific molecule or result. Existing licensed imagery and video are reused.

Technology includes keyboard-operated industry image selection with finite image entrances. The mineral gallery has direct selection, previous/next wrapping and animated specimen entrances. Sections enter once on intersection; content remains visible without JavaScript. No scroll locking or perpetual JavaScript render loop.

One control pauses ambient animation, video and image entrances. The session preference persists on reload. Reduced-motion changes take effect immediately; reduced-motion visits do not load video. Offscreen/background video and offscreen material animation stop. Observers and listeners clean up on navigation.

## Two polish passes

1. Reviewed desktop and mobile captures across marketing pages. Removed decorative captions behind editorial text, added the controlled industry sequence, and replaced mineral transitions with an interruptible shared image action. The pause test waits for the browser's paused animation frame before comparing transforms.
2. Reviewed Technology at 1440 and 390 pixels with the new sequence and visible keyboard focus. Added pause persistence and immediate image-transition settlement, and hid the nonfunctional control when JavaScript is unavailable. Extended QA to cover reload persistence and interruption.

## Validation

Svelte check: zero errors/warnings. Production build passes. Contact routing: all three tests pass. Existing navigation QA passes at 1440/1101/1024/768/390/320; browser/contact QA at 1440/1024/768/390; outline/image/form-error QA at 1440/768/390/320. Requests are mocked; no real inquiry or email is sent.

Motion QA covers actual computed movement, paused transform stability, keyboard resume, offscreen video suspension, repeated client navigation, carousel selection, dynamic reduced motion, no-JavaScript content, image controls, reload persistence and pause during image transition at 1440/768/390/320.

Local first full motion run measured cumulative layout shift 0–0.021 with no observed tasks over 50 ms. This is a synthetic local check, not field performance certification. Build reports the existing stale Browserslist database advisory.

## Release boundary

Only deploy the existing maverick-x Pages project to branch preview using its package build and Wrangler runner. Current authenticated release profile is gigi-release-20261010; default belongs to a different account. Record exact commit and immutable deployment receipt after publishing. Preserve production and shared data. Rollback baseline: 31a5dc150578e5606b4e5fd8117a60bad2bb94b2, previous Preview a1e37174-af1b-4a12-976c-d0ef49833595.

Final palette/copy, approved photos/bios/logos/news, chemistry detail and HubSpot/form decisions remain pending. Existing inquiry behavior is preserved and does not claim delivery when confirmation fails. No production promotion or Slack post.

Worktree disposition: retained at codex/maverick-oct12-preview until client review. Linear CLI key is absent in this executor; parent may attach this evidence to CRE-2262.
