# Agent Economy Trial 2

Use Node's built-in test runner. Do not add dependencies. Keep changes inside
the assigned subject directory and touch only the files authorized by the
assigned task.

## Task A: debugging

Fix `parseRetryAfter(value, nowMs)` in `src/retry-after.mjs`. Do not edit tests.

- Non-string or empty input returns `null`.
- Surrounding whitespace is ignored.
- A decimal-seconds form is valid only when it is ASCII digits (`0` or a
  non-negative whole number). It returns milliseconds only when that result is
  a finite safe integer. Signs and decimal points are invalid.
- Otherwise, a valid HTTP date returns `max(0, parsedDate - nowMs)`.
- An invalid date returns `null`.
- `nowMs` must be a finite number; otherwise throw `TypeError`.

First reproduce the existing failure with
`node --test test/retry-after.test.mjs`, make the smallest fix, and rerun that
same command. A solo full-suite worker should also run `npm test` after all
three tasks are complete.

## Task B: test authoring

Create `test/canonical-tool-name.test.mjs` for the existing public function in
`src/canonical-tool-name.mjs`. Do not edit production code or other tests.

The tests must establish all of this behavior:

- non-string input throws `TypeError`
- empty or whitespace-only input throws `RangeError`
- surrounding whitespace is trimmed
- ASCII letters are lowercased
- runs of spaces, underscores, and hyphens collapse to one hyphen
- digits are accepted after the first character
- a leading digit is rejected with `RangeError`
- punctuation such as `/` is rejected with `RangeError`
- exactly 48 output characters are accepted; 49 are rejected

Run the authored test directly and then run `npm test`.

## Task C: small implementation slice

Implement `evaluateApprovalGate(input)` in `src/approval-gate.mjs`. Do not edit
tests. The input must be an object with:

- `autonomy`: `auto_allow`, `approval_required`, `manual_only`, or `blocked`
- `evidenceComplete`, `approved`, and `toolDeclared`: booleans

Invalid input throws `TypeError`. The function is pure and returns exactly one
of these shapes:

- `{ disposition: 'stop', reason: 'BLOCKED', canInvoke: false }`
- `{ disposition: 'stop', reason: 'MISSING_EVIDENCE', canInvoke: false }`
- `{ disposition: 'wait', reason: 'MANUAL_EXECUTION', canInvoke: false }`
- `{ disposition: 'wait', reason: 'APPROVAL_REQUIRED', canInvoke: false }`
- `{ disposition: 'stop', reason: 'MISSING_TOOL', canInvoke: false }`
- `{ disposition: 'pass', reason: 'READY', canInvoke: true }`

Apply rules in this precedence order: invalid input, `blocked`, missing
evidence, `manual_only`, unapproved `approval_required`, missing tool, ready.

Use a red/green loop with `node --test test/approval-gate.test.mjs` and make the
smallest complete implementation. A solo full-suite worker should also run
`npm test` after all three tasks are complete.
