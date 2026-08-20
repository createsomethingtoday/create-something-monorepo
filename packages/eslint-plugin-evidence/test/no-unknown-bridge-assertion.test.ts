import { describe, it } from 'node:test';

import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import rule from '../src/rules/no-unknown-bridge-assertion.js';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  }
});

tester.run('no-unknown-bridge-assertion', rule, {
  valid: [
    'const user = input as User;',
    'const raw = input as unknown;',
    'const user = parseUser(input);',
    'const user = (<User>input);'
  ],
  invalid: [
    {
      code: 'const user = input as unknown as User;',
      errors: [{ messageId: 'unknownBridge' }]
    },
    {
      code: 'const user = (<unknown>input) as User;',
      errors: [{ messageId: 'unknownBridge' }]
    }
  ]
});
