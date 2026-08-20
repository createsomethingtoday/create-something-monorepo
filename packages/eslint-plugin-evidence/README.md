# @create-something/eslint-plugin-evidence

First-party ESLint rules for code-evidence policy. This package is separate from
Canon: Canon governs visual-token use, while evidence rules govern source-level
claims about contracts and parsing boundaries.

## Rules

### `evidence/no-unknown-bridge-assertion`

Rejects `value as unknown as Target`. The intermediate `unknown` discards the
source contract before asserting the target contract. Parse the external value
or adapt it at the owned boundary instead.

The rule is warning-only in the initial pilot. It is deliberately limited to
the double-assertion pattern and does not reject ordinary `unknown` parameters,
runtime type guards, dictionary contracts, or single type assertions.

## Consumer configuration

```js
import parser from '@typescript-eslint/parser';
import evidence from '@create-something/eslint-plugin-evidence';

export default [{
  files: ['src/**/*.ts'],
  languageOptions: { parser },
  plugins: { evidence },
  rules: { 'evidence/no-unknown-bridge-assertion': 'warn' }
}];
```

Every rule must include valid and invalid `RuleTester` fixtures before it can be
added to a consumer preset.
