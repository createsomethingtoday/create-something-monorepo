---
title: "The Cumulative State Anti-Pattern"
subtitle: "When current-state fields masquerade as lifetime achievement"
authors: ["Micah Johnson"]
category: "Methodology"
abstract: >-
  A template creator delisted published templates to maintain quality standards,
  and the system revoked established-creator privileges because a current-state
  field was treated as lifetime achievement. This paper names the cumulative
  state anti-pattern, shows how ambiguous field semantics create invisible user
  punishment, and proposes naming rules that separate current, historical, and
  eligibility state.
keywords: ["State Semantics", "Data Modeling", "Webflow", "Eligibility", "Anti-Pattern", "Field Naming"]
publishedAt: "2025-01-08"
readingTime: 8
difficulty: "intermediate"
published: true
---


## Abstract
A template creator delisted several of their published templates to maintain quality standards.
				The system responded by revoking their "established creator" privileges—blocking new submissions.
				The bug wasn't in the logic; it was in thesemantics. A field named "Templates Published"
				tracked current state, not cumulative achievement. This paper examines how ambiguous field
				naming creates invisible bugs, proposes a naming convention that prevents them, and reflects
				on the Heideggerian notion that tools should recede into use—not punish users for using them correctly.




## I. The Incident
Izhaan, a prolific Webflow template creator, noticed something wrong. After delisting
					several templates that no longer matched their quality standards, they could no longer
					submit new templates. The system reported they had "an active review in progress"—but
					they didn't.
// The error message:
"You already have an active review in progress.
Please wait for the review to complete before
submitting another template."
The creator had done nothing wrong. They had curated their portfolio—a responsible
					action that benefits the marketplace. Yet the system punished them for it.


## II. The Investigation
The validation system determined "established creator" status using a simple check:
The fieldpublishedTemplatescame from Airtable:#️⃣👛Templates Published.
					The assumption was clear: this counts how many templates a creator has ever published.
					With 10+ published templates, Izhaan should qualify as established.
But querying the API revealed the truth:
4 + 6 = 10. Izhaan had published 10 templates. But after delisting 6,
					thepublishedTemplatesfield showed only 4—thecurrentlypublished count.
"Templates Published" sounds cumulative. It reads as achievement, history, record.
						But it trackedcurrent state—a live count that decrements when templates
						are removed. The name lied.


## III. The Arithmetic of Ambiguity
The system calculated "active reviews" using this formula:
With the correct semantics:
The formula was correct. But the "established creator" check wasn't accounting for
					the semantic mismatch:
// Bug: uses current count, not cumulative achievement
// Fix: include delisted to recover true achievement


## IV. The Anti-Pattern Defined
TheCumulative State Anti-Patternoccurs when:
The pattern is insidious because it works correctly until it doesn't. For creators
					who never delist, the bug never manifests. The field appears to work. Only when
					a user exercises a legitimate action does the semantic mismatch surface.
"Users" table includes soft-deleted records. Count queries return wrong totals
							depending on whether filters are applied.
"OrderStatus" stores current state but business needs order history.
							Overwrites destroy audit trail.
Denormalized count field drifts from reality due to edge cases
							in increment/decrement logic.
Field meaning lives in tribal knowledge, not schema. New developers
							make incorrect assumptions.


## V. The Fix
The immediate fix was surgical—one line:
// Before: current state only
// After: cumulative achievement
But this is a patch, not a cure. The underlying issue—ambiguous field semantics—remains
					in the database schema. A proper fix would involve:
Or, introduce a new field:Templates Ever Published(cumulative) distinct
					fromTemplates Currently Published(current state).


## VI. Tools That Punish
Heidegger distinguishes between tools that areready-to-hand(zuhanden)—receding
					into transparent use—and tools that becomepresent-at-hand(vorhanden)—forcing
					themselves into conscious attention through breakdown.
Izhaan's experience was worse than breakdown—it wasbetrayal. The system
					didn't just fail; it punished a correct action. Delisting low-quality templates
					is responsible curation. The tool should have supported this. Instead, it revoked
					privileges earned through legitimate achievement.
"The infrastructure disappears; only the work remains." When infrastructure
						punishes users for using it correctly, it has violated its fundamental purpose.
						Tools exist to enable, not to entrap.
The fix restores the tool to its proper mode: invisible, supportive, enabling.
					Established creators remain established regardless of how they curate their portfolios.
					The system recedes; the creative work continues.


## VII. Prevention: Naming Conventions
The anti-pattern can be prevented through explicit naming conventions:
Beyond naming, document the semantics explicitly:


## VIII. Conclusion
The Cumulative State Anti-Pattern is a naming problem that manifests as a logic bug.
					When field names imply cumulative semantics but track current state, business logic
					built on those fields will eventually betray users who exercise legitimate state transitions.
The fix for Izhaan was simple: include delisted templates in the achievement calculation.
					The lesson is broader:name fields for their semantics, not their content.
					"Templates Published" tells you what's stored. "Templates Currently Published" tells you
					how it behaves.
In database design, the difference between "published" and "currently published" is the
					difference between a system that supports its users and one that punishes them for success.

> "The difference between the right word and the almost right word is the difference
						between lightning and a lightning bug."


## Appendix: The Complete Fix


## References
