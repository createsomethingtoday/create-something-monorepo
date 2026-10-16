---
title: 'A Fresh Index Can Still Carry Old Facts'
subtitle: 'What a small Atlas/Substrate retrieval experiment can—and cannot—prove'
authors: ['CREATE SOMETHING']
category: 'Research'
abstract: 'A local index helps an agent find relevant evidence without loading an entire workspace. In a synthetic workshop with seven modules and twenty frozen questions, Atlas selected the expected passage nineteen times. Exact citation and response-budget checks passed. Tests also confirmed that refreshing a projection preserves the age of its source facts and does not claim live verification. The remaining retrieval miss shows why readers still need to inspect the source.'
keywords: ['Atlas', 'Substrate', 'Context Retrieval', 'Evidence', 'Agent Engineering']
publishedAt: '2026-10-16'
readingTime: 7
difficulty: 'intermediate'
published: true
---

Give an agent a way to find the relevant passage, then make it check what that passage can prove. A freshly rebuilt index tells you that local documents were processed. It does not tell you that their underlying facts were checked today.

Consider a workshop inventory observed on October 1. On October 15, an agent rebuilds its search index and retrieves an ownership note. The search result can be accurate, correctly cited, and newly generated while the ownership information is still two weeks old. If the owner changed yesterday, refreshing the index will not discover it.

We built a small experiment around that distinction. It asks whether selective retrieval can return useful, inspectable context within a fixed response budget. It also tests whether refresh and failure states remain honest.

![Synthetic source facts observed October 1 feed a local index rebuilt October 15; the cited passage still needs inspection.](/research/selective-context/article-diagram.svg)

## Find a passage before loading the workspace

Putting all available documentation into context is a reasonable starting point for a small project. It becomes harder to inspect as the project grows. The agent receives relevant facts alongside old decisions, unrelated workflows, and instructions that do not apply to the current task.

Atlas is the workspace map in this system. Substrate holds records and evidence. The local context tool searches a Markdown projection of that material. It uses lexical ranking: words in the question are compared with words in the passages, with extra weight for headings. It makes no model call.

### Which code this experiment exercises

The harness imports `searchContext` directly from `packages/database-layer/scripts/atlas-context.mjs`, the repository implementation behind the local Atlas context CLI. It does not contain a separate demonstration search engine.

The twenty questions run against a temporary copy of the synthetic corpus with `refresh: 'off'`. They exercise the implementation's lexical ranking, passage extraction, citations, byte limits, and source-age reporting. They do not query production Atlas or Substrate services, read the real workspace inventory, or test an authenticated integration.

The recovery checks separately invoke existing tests of the same retrieval and refresh modules. Those tests use disposable inputs and a fixture renderer, not the full production topology-generation pipeline. The implementation was replayed locally onto upstream main for this review; that does not establish a deployed release.

A result contains an excerpt, its exact source lines, a stable module identity, and freshness metadata. The agent can read the excerpt and follow the citation to the source. The result is orientation evidence; it cannot authorize an action.

## What we froze before testing

We wrote a fictional workshop with seven modules and twenty-one sections. It covers record ownership, delivery planning, component dependencies, operation boundaries, acceptance checkpoints, source age, and evidence discovery. Every name and record is synthetic.

We then wrote twenty questions with an expected module and heading. Corpus and question hashes were frozen before the first scoring run. We did not change the retriever, corpus, or questions after seeing the results.

The questions were written after the existing implementation, frozen before its first scored run, and never used to tune it. The same author created the corpus, questions, and expected answers, so this is a same-author holdout from tuning. It is not an independently authored or blinded evaluation. The stored hashes check that the inputs are unchanged; they are not an independent timestamp or preregistration service.

Before scoring, we required at least 90% correct top-module selection. Citations had to be exact, responses had to respect their byte caps, and freshness and authority fields had to remain honest. Synthetic recovery controls also had to pass. We also measured exact-passage selection, which is a stricter check than finding the right module.

Each question ran with response caps of 2,000, 4,000, and 12,000 UTF-8 bytes. Ranking was scored at 12,000 bytes. Smaller budgets tested the output contract, not an assumption that the same passages would fit. A fixed clock of October 15 and source dates of October 1 made source-age assertions reproducible.

## Nineteen questions found the expected passage

The recorded run used Node 22.21.1 on macOS arm64. An earlier run on Node 26.11.0 produced the same retrieval counts and control outcomes; both receipts are retained.

| Check | Observed result |
| --- | ---: |
| Expected module ranked first | 19 / 20 |
| Expected passage ranked first | 19 / 20 |
| Expected passage anywhere in the top five | 19 / 20 |
| Returned citation excerpts matched source lines | 193 / 193 |
| Responses stayed within their configured byte caps | 60 / 60 |
| Responses retained stale-source and no-live-verification signals | 60 / 60 |
| Selected synthetic recovery and boundary tests | 7 / 7 |

At the default 12,000-byte cap, full serialized responses ranged from 1,876 to 4,021 bytes. This measures the response envelope, including metadata. It is not a token-saving estimate, an answer-quality score, or a speed comparison.

The 193 citation checks include repeated passages across budgets. They are contract checks, not 193 independent observations of retrieval quality.

### The miss matters more than a rounded percentage

The failed question was: “Can a retrieved passage authorize deployment?”

Its expected answer lived under **Decision ownership**: a search hit cannot grant permission. The retriever instead ranked **Production approval** first. That passage discussed operator approval for deployment, but it did not directly answer the question about the authority of retrieved text. The intended passage was absent from the top five.

This is a useful lexical-search limit. Related vocabulary can produce a plausible passage without finding the distinction the reader needs. Exact citations prove where the excerpt came from. They do not prove that it answers the question.

The implementation matches exact lowercase word tokens and does not apply stemming or semantic similarity. In this question, “deployment” matches the approval passage; the intended passage instead says “deploy” and “permission.” That vocabulary mismatch explains the observed ranking without showing that the returned passage answers the question.

We kept this failure unchanged. A future retrieval improvement should use a new held-out set; repeatedly tuning this set would turn it into training material.

## Refresh the projection without rewriting the facts

The recovery checks exercise the real retrieval and refresh code against disposable synthetic roots. They distinguish three questions:

| Question | Evidence to inspect |
| --- | --- |
| Does the projection match its local inputs? | Projection consistency and refresh status |
| When were the source facts observed? | Oldest source snapshot and source age |
| Were the upstream facts checked live? | Separate live-verification evidence |

After a synthetic input changed, the tool first reported a stale projection during its short debounce window, then rebuilt it. The new projection contained the changed text. Its old source date remained old, and `liveVerified` remained `false`.

Concurrent-reader tests checked that only one refresh published while other readers could receive an explicitly marked last-good snapshot. Their citations continued to resolve to the exact immutable files they had read.

A failed renderer retained the last-good result and reported failure. A corrupt parsed index fell back to source parsing. Additional checks covered unknown dates, missing modules, oversized passages, a renderer timeout, changing inputs during rendering, and an unavailable cache. These checks support the stated fallback behavior under those fixtures; they do not establish behavior under every filesystem failure or workload.

The crucial rule is simple: a successful local refresh can improve projection consistency without improving source freshness. Upstream observation is a separate job.

## Reproduce the result

The [recorded result](/research/selective-context/results.json), [questions](/research/selective-context/queries.json), and [frozen input hashes](/research/selective-context/freeze.json) are public-safe companion files for this study. The [reproduction guide](/research/selective-context/README.md) lists all seven corpus files and the selected controls.

From a checkout containing this article, use Node 22.21.1 and run:

```sh
node packages/io/static/research/selective-context/run.mjs --output /tmp/selective-context-results.json
```

The runner needs no package installation, credentials, network, or paid model. It creates and removes a temporary synthetic workspace. It verifies the frozen input hashes before scoring and prints the full result. Exit zero means the declared gates passed; it does not mean every question succeeded. A failing gate returns a nonzero exit code and preserves the result when an output path is supplied.

The receipt records implementation hashes as well as input hashes. Compare those before interpreting a reproduction. Runtime timestamps can differ without changing the fixture clock or expected source age.

## What to carry into another system

Selective context is useful when the next reader can inspect what was selected. Return the source identity, exact excerpt, date of observation, and explicit gaps alongside the answer candidate. Keep permission to act outside the retrieved text.

For a tiny corpus, reading every file may still be simpler. This study does not compare whole-corpus prompting, semantic retrieval, model answer quality, or operational outcomes. It makes no CTX performance claim. CTX history search was unavailable during preparation because its local generation failed verification, and no repair or comparison was attempted.

The next useful test is a new question set written by another reader, including paraphrases, conflicting sources, and questions the corpus cannot answer. That would test whether the current 19-of-20 result survives beyond the vocabulary of its author. For now, the result supports cited retrieval and honest refresh behavior in these fixtures. Workspace understanding and current facts still need their own evidence.
