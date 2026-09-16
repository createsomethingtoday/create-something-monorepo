# Test the checker before trusting the result

Before you trust an automated check, give it a mistake you already know is there.

We did that with Ground, our code analysis tool. A small trial covered 11 cases: duplicates, unused exports, imports, malformed files, and the checks that belong to the compiler. The published 0.4.0 release passed seven and failed four.

One failure was especially useful. Two files exported a function with the same name. Another file imported only one of them. Ground treated the matching name as evidence that the other export was used too.

The name matched. The dependency did not.

Other cases showed malformed source being accepted as usable evidence. A tool can finish without having enough information to support its answer.

## Make the expected failure explicit

For the import case, the expectation was simple: preserve the export that has a consumer, and report the unused one. For malformed source, the check had to report incomplete analysis or an error. An empty result was not acceptable.

Ground 0.4.1 now checks syntax completeness and resolves import usage to the target module. The [release and trial notes](https://github.com/createsomethingtoday/create-something-monorepo/blob/ground-v0.4.1/docs/guides/GROUND_SEEDED_TRIAL.md) describe the cases and the limits.

The useful lesson travels beyond code analysis. A check needs a known failure it can recognize. Otherwise, a green result may tell you only that the check ran.

## Try it on one workflow

Choose a small check that your team relies on before making a change. Work in an isolated copy, then:

1. Write down the expected result before running the checker.
2. Introduce one known fault. Break an import, remove a required field, or provide incomplete input.
3. Run the same command or tool that the real workflow uses.
4. Confirm that it reports the fault. Keep the input, result, version, and date together.
5. Restore the valid case and confirm that it passes.

This is related to mutation testing: deliberately change working code and see whether the tests notice. [Stryker’s introduction](https://stryker-mutator.io/docs/) explains that approach. Our trial uses a small, declared set of cases rather than automatically generating mutations.

If the faulty case passes, improve the check before giving it more authority. If the valid case fails, investigate that too. A checker that blocks everything is not a useful checker.

## What the trial establishes

The trial identified specific defects and gave us concrete cases to preserve through release testing. It does not establish that Ground catches every defect, understands every framework, or can decide what code to delete.

We authored the fixture during the implementation work. It is a repeatable regression trial, not an independent blind evaluation. Compiler and API-contract checks also remain separate from Ground’s native analysis.

That is enough to make the next decision better: keep the checker’s claims as narrow as the evidence behind them.

[Use the Proof Surface template →](https://createsomething.io/papers/proof-surface?utm_source=newsletter&utm_medium=email&utm_campaign=2026-09-08-test-the-checker&utm_content=primary-cta)

— CREATE SOMETHING
