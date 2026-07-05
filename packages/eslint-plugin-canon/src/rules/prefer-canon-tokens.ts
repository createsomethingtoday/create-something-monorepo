/**
 * ESLint rule: prefer-canon-tokens
 *
 * Detects hardcoded CSS values in <style> blocks and suggests Canon tokens.
 *
 * Patterns detected:
 * - Hardcoded hex colors (#000000, #ffffff, #1a1a1a, etc.)
 * - Hardcoded rgba values (rgba(255, 255, 255, 0.8), etc.)
 * - Hardcoded border-radius (6px, 8px, 12px, etc.)
 * - Hardcoded shadows
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import { findCanonCssValueReplacement } from '@create-something/canon/lint-contract';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://createsomething.ltd/docs/canon/rules/${name}`
);

export default createRule({
  name: 'prefer-canon-tokens',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer Canon CSS custom properties over hardcoded values'
    },
    messages: {
      preferCanonToken: 'Use Canon token {{canon}} instead of hardcoded value {{value}}'
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    ]
  },
  defaultOptions: [{ ignorePatterns: [] }],
  create(context) {
    const options = context.options[0] || {};
    const ignorePatterns = options.ignorePatterns || [];

    const filename = context.getFilename();
    const shouldIgnore = ignorePatterns.some((pattern: string) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filename);
    });

    if (shouldIgnore) {
      return {};
    }

    /**
     * Check if a CSS value should use a Canon token
     */
    function checkCSSValue(node: any, property: string, value: string) {
      const trimmedValue = value.trim();
      const canonToken = findCanonCssValueReplacement(property, trimmedValue);

      if (canonToken) {
        context.report({
          node,
          messageId: 'preferCanonToken',
          data: {
            canon: canonToken,
            value: trimmedValue
          }
        });
      }
    }

    return {
      // Handle inline styles in Svelte
      SvelteAttribute(node: any) {
        if (node.key?.name === 'style') {
          // Parse inline style string
          // This is a simplified check - full CSS parsing would be more robust
          if (node.value && node.value.length > 0) {
            for (const val of node.value) {
              if (val.type === 'SvelteText') {
                const styleStr = val.data;
                // Simple regex to extract property: value pairs
                const matches = styleStr.matchAll(/([a-z-]+)\s*:\s*([^;]+)/gi);
                for (const match of matches) {
                  const [, property, value] = match;
                  checkCSSValue(node, property, value);
                }
              }
            }
          }
        }
      },

      // Handle style objects in JSX
      JSXAttribute(node: any) {
        if (node.name?.name === 'style' && node.value?.type === 'JSXExpressionContainer') {
          const expr = node.value.expression;
          if (expr.type === 'ObjectExpression') {
            for (const prop of expr.properties) {
              if (prop.type === 'Property') {
                const key = prop.key.name || prop.key.value;
                const val = prop.value;
                if (val.type === 'Literal' && typeof val.value === 'string') {
                  checkCSSValue(node, key, val.value);
                }
              }
            }
          }
        }
      }
    };
  }
});
