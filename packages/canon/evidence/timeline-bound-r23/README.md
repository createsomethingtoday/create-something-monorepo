# Timeline duration boundary

Fresh R22 independent browser review reproduced an invalid add callback: a real double-click on the track after zooming out to80% emitted frame73 for totalFrames60. The same scenario now has a mounted component regression in TimelineEditor.test.ts; before.log fails with actual73 vs expected60.

The add path now clamps its projected frame to the same0..totalFrames range already used by scrubbing and moving keyframes. All4 TimelineEditor tests pass in after.log. Parent repeated the actual diagnostic mount and real double-click through Ego space12: after.json emits exactly one add at60, and after.png was directly viewed. This diagnostic uses the real Vite-served component and browser input but is not a production motion-studio integration.

Functional correctness: builder scoped pass; fresh independent acceptance pending. Perceptual/product quality: actual diagnostic viewed, geometry unchanged by the one-line boundary fix. Release readiness: unapproved. R22 package/check/build evidence predates this narrow fix; the affected test passes on current source. Earlier R22 report and before evidence remain unchanged.
