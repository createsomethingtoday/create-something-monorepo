import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://createsomething.agency/policies/evidence-lint/${name}`
);

type TypeAssertion = TSESTree.TSAsExpression | TSESTree.TSTypeAssertion;

function isTypeAssertion(node: TSESTree.Node): node is TypeAssertion {
  return node.type === AST_NODE_TYPES.TSAsExpression || node.type === AST_NODE_TYPES.TSTypeAssertion;
}

function assertsUnknown(node: TypeAssertion): boolean {
  return node.typeAnnotation.type === AST_NODE_TYPES.TSUnknownKeyword;
}

/**
 * Disallow `value as unknown as Target`: it erases the source contract before
 * asserting the target contract. Parse or adapt the value at its owned boundary.
 */
export default createRule({
  name: 'no-unknown-bridge-assertion',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow type assertions that pass through unknown before asserting a target contract.'
    },
    schema: [],
    messages: {
      unknownBridge:
        'This assertion passes through `unknown` before claiming a target contract. Parse or adapt the value at its owned boundary instead.'
    }
  },
  defaultOptions: [],
  create(context) {
    const inspect = (node: TypeAssertion) => {
      if (!isTypeAssertion(node.expression) || !assertsUnknown(node.expression)) return;
      context.report({ node, messageId: 'unknownBridge' });
    };

    return {
      TSAsExpression: inspect,
      TSTypeAssertion: inspect
    };
  }
});
