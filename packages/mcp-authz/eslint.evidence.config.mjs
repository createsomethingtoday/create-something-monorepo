import parser from '@typescript-eslint/parser';
import evidence from '@create-something/eslint-plugin-evidence';

export default [{
  files: ['**/src/**/*.{ts,tsx,mts,cts}'],
  ignores: ['dist/**', 'test/**'],
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  },
  plugins: { evidence },
  rules: {
    'evidence/no-unknown-bridge-assertion': 'warn'
  }
}];
