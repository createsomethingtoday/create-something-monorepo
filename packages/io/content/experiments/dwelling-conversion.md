---
slug: "dwelling-conversion"
category: "Experiment"
title: "Dwelling as Conversion"
subtitle: "From Assessment to Progressive Erasure"
description: "Documenting the evolution from interactive assessment to scroll-driven TextRevelation—two modes of dwelling that transform conversion into experience."
meta: "December 2025 · SvelteKit + Cloudflare · Heidegger, Rams"
publishedAt: "2025-12-15"
published: true
---

```
╔═══════════════════════════════════════════════════════════════════╗
║   DWELLING AS CONVERSION: EVOLUTION                               ║
║                                                                   ║
║   Phase 1: Active Dwelling          Phase 2: Contemplative       ║
║   ┌─────────────────────────┐       ┌───────────────────────────┐ ║
║   │ Q1: Accumulating?       │       │ "We help businesses..."   │ ║
║   │ Q2: Would remove?       │  ──►  │         ↓ scroll          │ ║
║   │ Q3: What's stopping?    │       │ "We remove what obscures" │ ║
║   └─────────────────────────┘       └───────────────────────────┘ ║
║                                                                   ║
║   User reflects on questions        User observes erasure         ║
║   Insight from their answers        Message distills through      ║
║                                     subtraction                   ║
║                                                                   ║
║   Both achieve Zuhandenheit: the tool recedes                     ║
╚═══════════════════════════════════════════════════════════════════╝
```

## Evolution


This experiment documents two approaches to the same insight:conversion is dwelling continued.
				Phase 1 used interactive assessment—questions that invited reflection. Phase 2 uses progressive erasure—a
				scroll-driven animation where the medium embodies the message. Both achieve Zuhandenheit through different
				modes of engagement.


## The Problem: Conversion as Interruption


The data told a clear story. Of 174 visitors to the agency homepage, only 21 clicked through to the
				contact page (5.6%). Of those, only 3 submitted the form. Meanwhile, experiments on .space and .io
				held attention—users explored, scrolled, engaged.


The pattern was revealing: users who arrived at .agency from experiments didn't convert—they navigated
				to .ltd seeking philosophical grounding. They wanted tounderstandbefore they bought.
				The sales page interrupted their dwelling.


## Heideggerian Diagnosis: Vorhandenheit


In Heidegger's terms, the agency homepage waspresent-at-hand(Vorhandenheit)—it announced
				itself as a sales mechanism rather than receding into transparent use. The visitor became aware of
				being sold to. The tool became conspicuous.


The experiments on .space embody the opposite:ready-to-hand(Zuhandenheit). Users explore
				the Threshold Dwelling visualization, test the Motion Ontology tools, run the Triad Audit—and in
				doing so, they're already experiencing what CREATE SOMETHING builds. The tool recedes; insight emerges.


The agency homepage broke this pattern. Instead of continuing the dwelling experience, it demanded
				a mode switch: stop exploring, start deciding. The result? Users bounced to .ltd for more
				exploration rather than converting.


## Phase 1: Assessment as Active Dwelling


Our first insight: the fix wasn't better copy—it was recognizing thatconversion is dwelling continued.
				Instead of asking users to switch from exploration to transaction, we built an interactive assessment
				that applies the Subtractive Triad to the visitor's own business. The user reflects; insight emerges from their answers.


The three questions mirror the three levels of the Subtractive Triad. Q1 identifieswhatis accumulating (implementation, artifact, or system-level). Q2 applies Rams' test: "What would you
				remove if there were no consequences?" Q3 connects back to the whole: "What's stopping you?"


## Implementation: The Hermeneutic Circle in Code


The assessment is itself an application of the Subtractive Triad. We adapted patterns from the
				experiment runtime components on .space, applying DRY at the implementation level.


Each question's options encode domain knowledge. The recommendation isn't random—it emerges from
				the intersection of what's accumulating (the problem domain) and what's blocking removal (the
				intervention type).


## Phase 1 Insight: Dwelling Through Questions


The crucial insight behind the assessment was that asking questionsisdwelling. When a user answers "What are
				you accumulating?" they're not being interrogated—they're being invited to reflect. The assessment
				becomes a mirror, and in that mirror, the user sees their own situation more clearly.


This is why the assessment works where static copy failed. Static copytellsthe user
				what they should want. The assessmentaskswhat they're experiencing. The difference is
				the difference between Vorhandenheit (object to be convinced) and Zuhandenheit (tool for
				self-understanding).


The assessment components (AssessmentRuntime,AssessmentStep,InsightReveal)
				remain in the codebase for potential future use—particularly for visitors who enter via specific service pages
				and want a deeper engagement. But for the homepage, we discovered something even more aligned with our philosophy.


## Phase 1 Analytics


The assessment implementation tracked timing and conversion without interrupting the experience:


This allowed us to measure not justifusers converted, buthowthey dwelt. Which
				questions took longest? Which answers correlated with conversion? The assessment generated data
				for refinement.


## Phase 2: Progressive Erasure


While building the assessment, we realized something: we wereaskingusers about subtraction
				when we couldshowthem. The most CREATE SOMETHING way to tell the subtraction story is
				through text that subtracts itself.


The TextRevelation component implements this in five phases:


## Implementation: Words as Data


The key insight was treating words as data with akeepproperty:


Each word calculates its own strike and fade progress based on scroll position. Words markedkeep: falseget a strikethrough that grows from left to right, then fade out entirely.
				The kept words remain, growing bolder as the message distills.


## From Asking to Showing


The evolution from assessment to TextRevelation represents a deeper understanding of the principle:


The assessmentaskedabout subtraction. The TextRevelationdemonstratesit.
				The medium becomes the message—not as decoration but as meaning. Understanding comes through
				observation, not interrogation.


## The Meta-Application


There's a recursive elegance here. The Subtractive Triad was developed to guide our work. Now it's
				being used as thecontentof a conversion tool. The framework that helps us build things
				is the same framework that helps prospective clients understand what they need.


This is what it means for the hermeneutic circle to complete: the philosophy (.ltd) informs the
				research (.io), which validates the practice (.space), which applies to service delivery (.agency),
				which tests and evolves the philosophy.


## Conclusion: The Journey of Subtraction


The evolution from assessment to TextRevelation is itself an application of the Subtractive Triad.
				We started with a full assessment—three questions, recommendation engine, analytics schema.
				We ended with a single scroll experience thatshowswhat we do bydoingit.


Both approaches achieve Zuhandenheit. The assessment invites active reflection—users think about
				their own situation. The TextRevelation invites contemplative observation—users witness subtraction
				in action. Both cause the conversion mechanism to recede; both reveal something static copy never could.


The lesson: "Less, but better" applies not just to artifacts, but to how we communicate.
				Sometimes asking is the right mode. Sometimes showing is. The hermeneutic circle completes when
				we let research inform implementation, implementation inform refinement, and refinement deepen research.

