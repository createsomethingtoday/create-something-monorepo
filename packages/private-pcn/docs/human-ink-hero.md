# Human Ink homepage hero

CRE-2048. The approved anonymous-hand illustration replaces only the homepage's
knowledge-flow diagram. Headline, creator CTA, network preview, navigation and
commercial copy retain their existing roles.

## Playback contract

One silent 14-second play when at least 35% of the artwork is visible and the page
is active. The final composition is present in server-rendered HTML before any
JavaScript or video loads. The control is available at the top of the artwork.
No loop. Completion restores the poster and offers Replay. Explicit Pause stays
paused; leaving view or hiding the page suspends playback and resumes it only
when the environment permits. The media URL is attached lazily, so offscreen and
reduced-motion visits do not download video until eligible or explicitly played.

Reduced motion defaults to the poster with manual Play. Enabling the preference
while playing stops motion. Autoplay rejection leaves manual Play; media errors
retain the poster. JavaScript failure leaves the image and description intact.
Dimensions are reserved at 960 × 1080. The video is silent decorative motion;
the accompanying image describes its meaning. No authentication, media access,
commerce flags, database schema or private Stream delivery changes.

## Artwork and ownership

Original Human Ink illustrations were generated with the built-in image tool,
reviewed and approved by the owner in September 2026. Third-party tattoo-flash
screenshots informed mark-making only; their images are not included. Hands are
anonymous; useful notebooks and lesson cards express make → collect → share.
The local Graphite Motion plugin carries the reusable visual contract.

Editable Draw source: https://draw.createsomething.agency/animate?project=0dbb19b2-4fda-40ce-8298-e67225c2638e

Seven reusable raster assets, 16 image/path/text layers. Independent wrist pivots,
a separate lifted page, two registered giving-hand poses, native path reveals and
curved card trajectories. This is 2D layer animation, not a skeletal hand rig.
The final hold begins at 10.5 seconds; it is not a seamless loop.

Runtime assets:

- `/media/hero/human-ink-v2.mp4`: H.264, no audio, 960 × 1080, 24 fps, 14 seconds,
  about 2.1 MB; full decode verified.
- `/media/hero/human-ink-v2.webp`: final-frame poster, encoded at quality 90 from
  the approved exported frame. Used both before playback and after completion.

The authoring project, original assets, generation prompt set and previous
studies remain in the task's local artifact directory. They are not deployed as
public runtime dependencies. No conversion improvement is claimed without data.

## Verification and rollback

`pnpm check && pnpm test && pnpm build` in this package. Playback tests cover
once-only autoplay, reduced-motion opt-in, environmental vs explicit pause,
rejected autoplay, late playback events and failed media. Browser acceptance
covers real MP4 playback, pause/replay, desktop/mobile, no-JS and reduced motion.

Production target: Worker `cs-private-pcn`, CREATE SOMETHING account
`9645bd52e640b8a4f40a3a55ff1dd75a`. Prior version at implementation start:
`da76b1bd-f830-45d5-8b5a-cf2ddf6cab6a`. Record the immediate prior version again
before release; use Wrangler rollback to that version if this release fails.
No database rollback is needed. Release receipts belong in CRE-2048.
