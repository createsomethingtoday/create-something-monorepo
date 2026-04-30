---
title: "The Analyzer MCP: A Policy-Grounded Review Architecture"
subtitle: "How CREATE SOMETHING turned Webflow template review into a multi-surface MCP system"
authors: ["CREATE SOMETHING"]
category: "Case Study"
abstract: "This paper documents how the Webflow Site Analyzer MCP was created, why a plain crawler or checklist app was insufficient, and what system architects can reuse from the design. The core problem was not only extraction. Webflow template review spans multiple truth surfaces: published pages, Designer-only metadata, and external review policy that can change outside the codebase. The analyzer solves this by treating review as a governed MCP system. URLs and Designer state form the Database layer, browser-backed extraction and queued review execution form the Automation layer, and policy ingestion, manual-review boundaries, observability, and script evolution form the Judgment layer. The result is not just an analyzer. It is a review architecture that can explain what it checked, what it could not check, which policy version it used, and how its automation should improve without collapsing governance into a prompt."
keywords: ["MCP", "Webflow", "Review Architecture", "Three-Tier Framework", "Policy as Artifact", "Observability", "System Design"]
publishedAt: "2026-04-13"
readingTime: 16
difficulty: "intermediate"
published: true
---

## Release Thesis

The Analyzer MCP turns Webflow template review from a loose inspection task into a governed review architecture.

The practical change is that published-site evidence, Designer-only metadata, and external review policy now move through one MCP surface with explicit provenance, queued execution, manual-review boundaries, and versioned improvement loops.

This matters because the reusable pattern is not "build a crawler." The pattern is: identify each authority surface, model evidence separately, attach policy as an artifact, and make the final review explain what it checked, what it could not check, and which judgment boundary still belongs to a human.

## Evidence Snapshot

| Claim | Evidence | Status | Reusable Artifact |
|-------|----------|--------|-------------------|
| Template review needs more than a page crawl | Review depends on published pages, Designer state, and current Webflow policy | Validated by implementation | Multi-surface evidence model |
| Policy must be traceable | Guidelines and rubric are fetched, normalized, timestamped, hashed, and converted into `policyVersion` | Implemented | Policy snapshot contract |
| Browser-backed review must be operated like production work | Review jobs have phases, queue limits, bounded concurrency, status, and result payloads | Implemented | Queued review job model |
| Automation should admit its limits | Review rows can remain `manual` when payloads do not justify a defensible automated claim | Implemented | Manual-boundary checklist state |
| Extraction should improve without hiding drift | Script versions collect feedback, compare changes, and promote tested improvements | Implemented pattern | Versioned extraction loop |

## What This Improves

The analyzer gives operators a review artifact they can defend.

Instead of asking an agent to "look at the site" and trusting the summary, the system can point to specific evidence surfaces, a policy version, execution phases, and unresolved manual checks. That changes the review from an opinion into an auditable artifact.

## Evaluation Surface

The current validation surface is architectural and operational:

- published-site extraction for runtime metadata, structure, accessibility signals, image behavior, and crawlability
- Designer metadata extraction for pages, components, style selectors, interactions, CMS collections, assets, and breakpoints
- policy ingestion from public guideline and rubric pages
- queued review execution with phase-level status
- observability around duration, cost, browser sessions, provider health, and item counts

This paper does not claim that every review row is fully automated. The point is narrower and stronger: the system can distinguish automated pass/fail evidence from manual judgment boundaries.

## Next Decision

The next operating decision is whether the Analyzer MCP should become the canonical review architecture for Webflow template and app review lanes, with each new reviewer tool required to declare its Database, Automation, and Judgment surfaces before promotion.

## Executive Thesis

The analyzer MCP exists because template review is not a single inspection problem.

It is a coordination problem across three changing surfaces:

- the **published site**, where runtime behavior, metadata, accessibility issues, and public SEO signals live
- the **Webflow Designer**, where pages, components, style selectors, CMS collections, and breakpoints are visible
- the **review policy itself**, which lives outside the codebase and changes when Webflow updates its submission guidelines or grading rubric

A crawler can inspect pages. A browser bot can click around Designer. A prompt can summarize policy. None of those, by themselves, creates a durable review system.

The analyzer MCP was created to unify those surfaces into one governed tool surface that other agents and operators can use repeatably.

## The Problem It Solves

Manual template review does not scale linearly because the reviewer is forced to join evidence across incompatible contexts.

Consider a simple question:

**"Is this template ready to submit?"**

That answer depends on checks that sit in different places:

- SEO title formulas and alt text are visible on the published site.
- Unused components, page inventory, and class naming patterns depend on Designer metadata.
- Some requirements are explicit pass/fail rules; others remain manual judgment calls.
- The policy source is not static. It lives on Webflow's public guideline and rubric pages.

Without a unifying system, review drift appears in predictable ways:

- one reviewer checks the homepage thoroughly and skim-checks the rest
- another reviewer checks Designer hygiene but misses runtime metadata failures
- an agent overclaims confidence because it only saw the published surface
- a policy change lands upstream and nobody can prove which rule set was used for a given review

The analyzer MCP solves this by turning review into a system with explicit control boundaries, not a loose pile of scripts.

## Why CREATE SOMETHING Built It as an MCP

The design choice was not "browser automation or MCP."

Browser automation is part of the implementation. MCP is the delivery and control surface.

That matters for four reasons:

1. **Portability**
   The review capability should be callable from Codex-first workflows today without being trapped inside one bespoke UI.

2. **Trust boundary clarity**
   MCP makes the review surface explicit: which tools exist, what they accept, and what they return.

3. **Tier separation**
   Review data, execution logic, and policy can be modeled separately instead of being collapsed into one giant agent prompt.

4. **Governed evolution**
   The system can observe failures, version its extraction logic, and improve its automation without pretending policy no longer matters.

This is the broader CREATE SOMETHING point in concrete form:

The valuable work was not scaffolding a server. The valuable work was deciding **what kind of MCP to build**, **which boundaries to respect**, and **how to attach judgment to automation without hiding it**.

## How the Analyzer MCP Was Created

The creation process followed a system design sequence, not a feature checklist.

### 1. Identify the real source surfaces

The first move was to stop treating "the website" as one thing.

The analyzer distinguishes between:

- **published pages** as runtime truth
- **preview/Designer context** as authoring truth
- **external review policy** as governance truth

That decomposition is what made the rest of the system possible.

### 2. Codify browser-backed extraction flows

Two core automation paths were made explicit.

**Flow A: page extraction**

- open a browser session
- detect whether the URL is a Webflow preview
- if preview, enter `#site-iframe-next`
- run extraction scripts inside the iframe, not the Designer chrome

This is how page-level tools such as touchpoint analysis, SEO extraction, structure extraction, image analysis, and performance checks stay grounded in the actual page being reviewed.

**Flow B: Designer metadata extraction**

- open the preview URL
- navigate the Designer interface in a fixed sequence
- collect pages, style selectors, components, interactions, CMS collections, assets, and breakpoints

The important insight is not that browser automation clicks panels. The insight is that the Designer path was **codified as a repeatable review primitive** instead of remaining hidden reviewer muscle memory.

### 3. Treat policy as an artifact, not prose in a prompt

The analyzer fetches and normalizes the canonical Webflow submission guidelines and grading rubric from their live public pages.

It records:

- source URL
- fetch timestamp
- content hash
- a derived `policyVersion`

This is a decisive architectural move.

It means a review can say more than "the agent used the latest rules." It can say:

- **which policy source was used**
- **when it was fetched**
- **which normalized sections and rubric rows informed the review**

That turns review policy into a traceable system input.

### 4. Build a unified review pipeline

The analyzer does not stop at individual tools. It assembles them into a review workflow:

1. run a published-site precheck
2. extract and score Designer metadata
3. derive seed URLs from the Designer page list
4. crawl the published site with those seeds
5. normalize all findings into unified checklist rows
6. summarize which checks passed, failed, were partial, or remain manual

This matters because it turns a set of tools into a review system.

The output is not "some SEO data" plus "some component data." The output is a review artifact with operational shape.

### 5. Add queueing, progress, and bounded concurrency

Review work is expensive and browser-backed. That means orchestration matters.

The analyzer includes queued template-review jobs with:

- bounded concurrency
- queue capacity limits
- explicit phases such as `precheck`, `designer`, `published`, and `normalizing`
- persisted job status and final result payloads

This makes the system usable in production conditions rather than only in ad hoc local debugging.

### 6. Make improvement part of the architecture

Extraction scripts are versioned.

Feedback can be recorded against a specific script version. The analyzer then:

- identifies recurring issue patterns
- detects problematic domains
- proposes modifications
- compares versions
- promotes improved versions through testing to active use

That is the difference between an analyzer and a living automation surface.

## The Three-Tier Mapping

The analyzer is a concrete example of CREATE SOMETHING's Three-Tier Framework.

| Tier | In the analyzer MCP | Why it matters |
|------|---------------------|----------------|
| **Database** | Published URLs, preview URLs, Designer metadata, policy snapshots, review artifacts | Review has to start from what actually exists |
| **Automation** | Browser sessions, extraction scripts, queued jobs, unified review execution | Review becomes runnable, not aspirational |
| **Judgment** | Policy ingestion, manual-review boundaries, feedback, version comparison, promotion decisions | The system can explain what should happen and how it should improve |

For system architects, this is the reusable lesson:

If your review system cannot point to its Database, Automation, and Judgment layers separately, it will become hard to debug and impossible to govern.

## The Review System, Explained

The review system has four architectural moves worth isolating.

### A. Multi-surface evidence, one report

The analyzer combines two kinds of evidence that are usually reviewed separately:

- **Designer evidence**: structure, inventory, naming, component usage, breakpoints
- **published-site evidence**: metadata, heading hierarchy, alt text, 404 behavior, video controls, image loading behavior

The report then normalizes both into one checklist.

That is what makes the output useful to a reviewer and to another agent.

### B. Manual is a first-class state

A weak review system either hides uncertainty or floods operators with caveats.

The analyzer does neither.

Some rows remain intentionally manual because the current payloads do not support a defensible automated claim. Examples include:

- explicit unused animation cleanup
- variable naming and reuse
- class stack depth
- contrast and transition-quality checks in some runs

This is good architecture.

A review system gains trust when it can say:

- **pass** when it has sufficient evidence
- **fail** when it has sufficient evidence
- **manual** when the evidence boundary is real

### C. Policy versioning is part of the review result

Because policy is ingested and hashed, the review system can maintain alignment between external rule changes and internal automation.

That prevents a common failure mode:

the team thinks it automated "the rubric," but what it actually automated was a screenshot of the rubric from months ago.

### D. Observability is operational, not decorative

The analyzer records metrics such as:

- analysis duration
- estimated browser cost
- item counts
- provider health
- session metrics
- queued review status
- browser minutes per review

This changes the architectural conversation.

Instead of only asking "Did the review finish?" operators can ask:

- Was it healthy?
- Was it expensive?
- Which provider degraded?
- Which phase failed?
- Which script version produced the result?

That is how a review system becomes governable.

## What Makes This More Than a Site Analyzer

The term "site analyzer" is technically true and strategically incomplete.

The distinguishing value is the **review architecture**:

- the system knows how to gather evidence from multiple surfaces
- it ties that evidence to a normalized policy artifact
- it reports manual boundaries explicitly
- it queues and tracks execution like a production workflow
- it can improve its automation through versioned feedback loops

A conventional analyzer answers:

**"What is on this page?"**

This system is designed to answer:

**"What should happen in this review, what evidence supports that answer, and where does human judgment still belong?"**

That is a different class of system.

## Design Insights for System Architects

### 1. Do not collapse all truth into one crawl

If the workflow spans multiple authority surfaces, model those surfaces directly.

Published pages and authoring systems are not interchangeable.

### 2. Policy should be fetched, normalized, and versioned

If external policy matters, treat it like data with provenance.

Do not bury it in prompt text and call that governance.

### 3. "Manual" is part of the contract

A credible automation system needs an explicit state for checks it cannot yet justify.

Anything else is theater.

### 4. Review orchestration is part of the product

Queueing, progress, bounded concurrency, and resumable results are not secondary implementation details.

They are what separate a demo from an operating system for review.

### 5. Self-improvement belongs under guardrails

Version registries, feedback loops, and proposal generation are valuable, but only when they remain subordinate to explicit policy and operator visibility.

Autonomy without legibility is just harder-to-debug drift.

## How to Apply This Pattern Outside Webflow

The pattern generalizes beyond template review.

Use it whenever a workflow has:

- multiple truth surfaces
- changing external policy
- partially automatable checks
- expensive execution paths
- a need for explainable review artifacts

Examples:

- security review across source code, runtime config, and compliance policy
- procurement review across vendor documents, ERP state, and approval policy
- content review across CMS state, published rendering, and brand/legal guidance

The system pattern stays the same:

1. identify the surfaces
2. model them as separate evidence sources
3. ingest policy with provenance
4. normalize findings into one review artifact
5. keep manual states explicit
6. attach observability and versioned improvement loops

## Conclusion

The analyzer MCP was created to solve a very practical problem: Webflow review needed a system, not just more scripts.

Its deeper value is architectural.

It demonstrates that a useful MCP is often not the one that exposes the most raw tools. It is the one that:

- understands the real boundaries of the workflow
- converts policy into an auditable input
- turns multi-surface evidence into an operational artifact
- leaves room for human judgment where automation is not yet defensible

That is the CREATE SOMETHING alignment in its most concrete form.

The moat was not "we can call a browser from MCP."

The moat was designing a review system that can explain itself, evolve carefully, and remain portable as the surrounding agent ecosystem changes.
