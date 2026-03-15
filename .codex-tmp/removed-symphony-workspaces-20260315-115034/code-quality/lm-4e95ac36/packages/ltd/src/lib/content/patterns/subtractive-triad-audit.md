---
title: "Subtractive Triad Audit"
subtitle: "Three questions at three levels. DRY asks about implementation.
			Rams asks about the artifact. Heidegger asks about the whole."
category: "Pattern"
published: true
publishedAt: "2025-01-08"
---



> "Weniger, aber besser."



## Definition
TheSubtractive Triad Auditis a systematic framework for
				evaluating any creation through three lenses, each operating at a different
				level of abstraction. It transforms "should I remove this?" from intuition
				into method.

The triad applies the same principle—subtractive revelation—at three scales:
				implementation (code), artifact (product), and system (ecosystem). Each level
				has its master: DRY eliminates duplication, Rams eliminates excess, Heidegger
				eliminates disconnection.

The power is in the sequence. You must ask the questions in order: DRY before
				Rams before Heidegger. Why? Because you can't evaluate an artifact's essence
				if it's cluttered with duplicates. You can't evaluate systemic fit if the
				artifact itself is unclear.

"Creation is the discipline of removing what obscures."


> "Creation is the discipline of removing what obscures."



## The Three Levels
Don't Repeat Yourself

Question:"Have I built this before?"

Action:Unify. Find the abstraction that eliminates
					duplication without premature generalization.

✓ Extract shared functions and components

✓ Consolidate configuration

✓ Single source of truth for each concept

Weniger, aber besser

Question:"Does this earn its existence?"

Action:Remove. If something doesn't serve an essential
					function, it shouldn't exist.

✓ Every feature must justify itself

✓ Decoration is guilt until proven innocent

✓ Fewer, better elements

The Hermeneutic Circle

Question:"Does this serve the whole?"

Action:Reconnect. Every part must serve the system,
					and the system must give meaning to each part.

✓ Parts reference each other coherently

✓ Nothing is orphaned or purposeless

✓ The whole is revealed through its parts



## When to Apply
- • Reviewing any significant creation
- • Code review or design critique
- • Deciding what to remove
- • System architecture decisions
- • Onboarding new work to existing systems

- • Always DRY before Rams
- • Always Rams before Heidegger
- • Never skip levels
- • Iterate if changes at one level affect others



## Audit Example: Component Library
Level 1: DRY

Are there other button-like components? Does PrimaryButton duplicate
						SecondaryButton logic? Can we unify into one Button with variants?

→ Unify: One Button component with variant prop

Level 2: Rams

Does every prop earn its existence? Is the "loading" state needed,
						or is it decoration? What about the icon slot?

→ Remove: Drop unused size="xl" variant

Level 3: Heidegger

Does Button connect to the design system's purpose? Does it reference
						typography tokens? Does it enable the product vision?

→ Reconnect: Derive from semantic color tokens



## Reference: WORKWAY SDK Audit


## Related Patterns
The triad guides each reduction cycle. Apply, reduce, repeat.

The third level of the triad—ensuring parts serve the whole.



