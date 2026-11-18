# Explicit connector compatibility repair

Fresh independent stable-family review found that the new solid IntegrationFlow ignored explicit showConnectors and animateFlow. Parent restored one shared content snippet for solid and opt-in glass modes, retaining default static arrows and one visible name per service. The source no longer has an unreachable duplicate glass branch. Svelte instance IDs replace random connector IDs.

The rendered SSR regression failed one of four tests before the repair. Actual browser viewing then found the horizontal gradient path did not paint: its object bounding box has zero height. Gradient and optional glass blur now use explicit userSpaceOnUse coordinates; three tests failed before that geometry fix. Seven focused tests pass after both fixes. Solid connectors do not use the decorative glass blur. Mobile rotation has sufficient vertical margin; desktop paths align with icon centers.

Actual six-width DOM reads preserve two requested connectors/two requested motion nodes, named services and no overflow. Reduced-motion emulation hides both moving dots. Parent directly viewed the final aligned390/1440 captures and painted390; earlier solid320/1440 captures demonstrate missing lines and are not final visual acceptance. Default flow remains static; this is an illustrative fixture, not execution evidence.

Fresh independent Sol retest is in progress. Full integration package/check/build remains pending these changes. Functional: focused pass; product: parent viewed pass; release: unapproved. No commit, push, deployment or external operation. Worktree preserved at t3/canon-design-system-redesign.
