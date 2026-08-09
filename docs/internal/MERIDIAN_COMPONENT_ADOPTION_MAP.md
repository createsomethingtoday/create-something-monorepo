# Meridian component adoption map

## Purpose

The four licensed Meridian template purchases establish the public visual system
for `createsomething.agency`, `createsomething.io`, `createsomething.ltd`, and
`createsomething.space`. This document is the implementation inventory for
CRE-1647: every selected template pattern has an owned, native counterpart and
is used on a public property.

The system uses the licensed visual language, its warm palette, editorial type
scale, spatial rhythm, navigation, footer, card treatments, and section
composition. It does not ship Webflow's generated runtime, third-party template
copy, placeholder pricing, stock people, unverified client results, or demo
testimonials.

## Pattern inventory

| Licensed pattern                              | Native Canon implementation                                                     | Public use                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Image-led hero and directional CTA            | `PerformanceCampaignOpening` with the editorial expression                      | All four homepages                                                             |
| Statistics row                                | `MeridianMetrics`                                                               | `.agency` scoreboard                                                           |
| Image/content split                           | `MeridianFeatureSplit` with a court/operating-artifact field                    | `.io` and `.ltd`                                                               |
| Service card grid                             | `MeridianCardGrid` `service` variant                                            | `.space` workbench roster; `.agency` delivery path                             |
| Pricing/offer card                            | `MeridianCardGrid` `offer` variant                                              | `.agency` fixed-first-scope path; no invented prices                           |
| Case-study card                               | `MeridianCardGrid` `case` variant                                               | `.agency` client-owned Playbook and `.space` live-route entry                  |
| Blog/article card                             | `MeridianCardGrid` `article` variant                                            | `.io` research index and `.ltd` operating pattern                              |
| Team/profile card                             | `MeridianCardGrid` `profile` variant                                            | `.ltd` masters and sources                                                     |
| Testimonial rail                              | `MeridianEvidenceCarousel`                                                      | `.agency` verifiable field reports, control records, and ownership evidence    |
| FAQ accordion                                 | `MeridianAccordion` using native `details` semantics                            | `.agency` Playbook questions                                                   |
| Newsletter/form treatment                     | Editorial footer newsletter styling and existing verified signup flow           | `.io` research digest; `.ltd` canon letter                                     |
| Desktop service dropdown and mobile hierarchy | `Navigation` child links and full mobile disclosure                             | `.agency` Practice menu; shared navigation language across all four properties |
| Closing CTA and layered footer directory      | Editorial footer callout, identity masthead, directory, and social/legal region | All four properties                                                            |

## Typography system

| Role                | Face                                                                         | Use                                                                                   |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Editorial display   | `CS Editorial` (the licensed Gambarino-derived local face)                   | Home hero, section statements, proof headlines, and footer masthead; regular 400 only |
| Interface and prose | `Geist Variable` (self-hosted via `@fontsource-variable/geist`, SIL OFL-1.1) | Navigation, CTA, body, card copy, forms, and documentation surfaces                   |
| Operating record    | `IBM Plex Mono`                                                              | Eyebrows, receipts, states, routes, and proof metadata only                           |

The editorial face is never synthesized into a fake weight or style. Geist supplies
the actual 300–900 interface range, so the design keeps its intended hierarchy at
desktop and 390px without a remote Google Fonts request.

## Property roles

- `.agency`: embeds with operators to map, build, and hand back a client-owned
  Playbook. The court language is literal here: offense moves approved work;
  defense protects decisions, proof, and recovery.
- `.io`: turns experiments, papers, and field notes into evidence that can be
  carried into the next decision.
- `.ltd`: holds the canon, standards, and source material for controlled
  delegation.
- `.space`: tests tools and runtime behavior before a pattern moves into
  research, policy, or delivery.

## Content boundary

The component system is intentionally exhaustive while the content stays true.
When a template pattern expects a testimonial, profile, price, or image, the
native public surface substitutes a real source, an existing property artifact,
or a neutral operating signal. No component creates an unsupported commercial
claim.

## Verification contract

The source test `licensed-editorial-rollout.test.ts` confirms the licensed
palette, self-hosted font assignment, no-Webflow-runtime boundary, and each
property role. CRE-1647 extends that test to confirm component inventory and
property adoption. Browser review must cover desktop and 390px mobile navigation,
accordion semantics, evidence carousel controls, and closing footer geometry.
