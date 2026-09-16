# Same shape. Different rule.

Two small functions have the same structure but permit different states.
Ground 0.4.3 reported 84.2% similarity and 100.0% structural similarity for
these fixtures on September 8, 2026. A direct behavior check returned opposite
answers for the same inputs.

This is a deliberately small teaching example, not a benchmark or a claim
about the frequency of false positives. Ground blocks a duplicate claim made
before comparison through its own claim command. After comparison, it offers
a duplicate candidate; that is not proof that two business rules should merge.

## Run it

From this directory, with Node.js and npm installed:

```bash
bash run.sh
```

The script downloads the public `@createsomething/ground-mcp@0.4.3` package,
uses an isolated temporary registry, checks that an unchecked claim is blocked,
compares the files, and asserts the behavior of both functions. It removes only
its own temporary directory on exit. Evidence IDs vary between runs.

- [draft.ts](./draft.ts) permits draft items.
- [published.ts](./published.ts) permits published items.
- [receipt.txt](./receipt.txt) contains the observed output.
- [comparison.png](./comparison.png) presents the example for X.

The caller and intended business rule still need human review before refactoring.

[Try Ground in the public workshop](https://createsomething.space/projects/ground).
