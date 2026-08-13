# Meridian component adoption map

## Purpose

The four licensed Meridian template purchases establish the public visual system
for `createsomething.agency`, `createsomething.io`, `createsomething.ltd`, and
`createsomething.space`. This document is the implementation inventory for
CRE-1647 and CRE-1719: every selected template pattern has an owned, native
counterpart. Each property adopts only the patterns that clarify its current
decision; a common licensed reference does not require a uniform shell.

The system uses the licensed visual language, its warm palette, editorial type
scale, spatial rhythm, navigation, footer, card treatments, and section
composition. It does not ship Webflow's generated runtime, third-party template
copy, placeholder pricing, stock people, unverified client results, or demo
testimonials.

## Pattern inventory

| Licensed pattern                              | Native Canon implementation                                                     | Public use                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Image-led hero and directional CTA            | `PerformanceCampaignOpening` with a property expression                          | Editorial on `.agency`, `.io`, and `.space`; court/Playbook performance on `.ltd` |
| Statistics row                                | `MeridianMetrics`                                                               | `.agency` scoreboard                                                           |
| Image/content split                           | `MeridianFeatureSplit` with a court/operating-artifact field                    | `.io` research and evidence opening                                            |
| Service card grid                             | `MeridianCardGrid` `service` variant                                            | Available when a property needs a discrete delivery collection; `.space`'s current home instead keeps its live routes in one `PerformanceCardGrid` collection |
| Pricing/offer card                            | `MeridianCardGrid` `offer` variant                                              | `.agency` fixed-first-scope path; no invented prices                           |
| Case-study card                               | `MeridianCardGrid` `case` variant                                               | `.agency` client-owned Playbook and `.space` live-route entry                  |
| Blog/article card                             | `MeridianCardGrid` `article` variant                                            | `.io` research index; `.ltd` uses its own `PerformanceCardGrid` operator library |
| Team/profile card                             | `MeridianCardGrid` `profile` variant                                            | Available to `.ltd` source routes when a profile is the right proof, not forced onto its home |
| Testimonial rail                              | `MeridianEvidenceCarousel`                                                      | `.agency` verifiable field reports, control records, and ownership evidence    |
| FAQ accordion                                 | `MeridianAccordion` using native `details` semantics                            | `.agency` Playbook questions                                                   |
| Newsletter/form treatment                     | Editorial footer styling and existing verified signup flow                      | `.io` research digest; `.ltd` uses route-owned `NewsletterSignup` operator notes |
| Desktop service dropdown and mobile hierarchy | `Navigation` child links and full mobile disclosure                             | `.agency` Practice menu; shared navigation language across all four properties |
| Split playbook / resource callout              | `MeridianOfferPanel` with a property-specific signal → decision → proof artifact | Editorial footer on `.agency`, `.io`, and `.space`; `.ltd` keeps its own court/Playbook funnel |
| Closing CTA and layered footer directory       | `MeridianOfferPanel`, identity masthead, directory, and social/legal region       | Editorial footers on `.agency`, `.io`, and `.space`; `.ltd` has a route-owned performance continuation |

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
  delegation through a court/Playbook operator-library expression, distinct
  from the editorial Meridian casing.
- `.space`: tests tools and runtime behavior before a pattern moves into
  research, policy, or delivery.

## Content boundary

The component inventory is complete while adoption remains property-specific.
When a template pattern expects a testimonial, profile, price, or image, the
native public surface uses a real source, an existing property artifact, or a
neutral operating signal only when that pattern clarifies the property decision.
No component creates an unsupported commercial claim.

## Verification contract

The source test `licensed-editorial-rollout.test.ts` confirms the licensed
palette, self-hosted font assignment, no-Webflow-runtime boundary, and each
property role. CRE-1647 and CRE-1719 extend that test to confirm the component
inventory, editorial adoption on `.agency`, `.io`, and `.space`, and `.ltd`'s
intentional court/Playbook replacement. Browser review must cover desktop and
390px mobile navigation, accordion semantics, evidence carousel controls, and
the appropriate closing footer or route continuation.
