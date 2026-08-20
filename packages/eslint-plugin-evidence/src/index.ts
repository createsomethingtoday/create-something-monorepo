import noUnknownBridgeAssertion from './rules/no-unknown-bridge-assertion.js';

const plugin = {
  meta: {
    name: '@create-something/eslint-plugin-evidence',
    version: '0.1.0'
  },
  rules: {
    'no-unknown-bridge-assertion': noUnknownBridgeAssertion
  },
  configs: {
    recommended: {
      rules: {
        'evidence/no-unknown-bridge-assertion': 'warn'
      }
    }
  }
};

export default plugin;
