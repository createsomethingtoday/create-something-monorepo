# V1 infrastructure invalidation

V1 is retained as fail-closed evidence and must not be resumed.

Its first scheduled invocation emitted `thread.started`, then the service
rejected `gpt-5.6-terra` because pinned Codex CLI `0.142.5` was too old. The
receipt contains zero tokens, no commands, no diff, and no final response.
Verification and comparison correctly reject the incomplete 1/8 receipt set.

The operator approved a clean v2 experiment pinned to the already-installed,
ChatGPT-authenticated Codex CLI `0.146.0-alpha.3.1`. V2 preserves the task,
evaluator, metrics, source, instruction artifacts, model settings, fixture
isolation, repetitions, and randomization seed. The v1 receipt is not retried
or included in v2 results.
