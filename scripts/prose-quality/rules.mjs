import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  discoverActivePublicCopyFiles,
  discoverPublicCopyFiles,
  PUBLIC_COPY_RULES
} from '../../packages/agency/scripts/check-public-copy.mjs';

export const prosePolicy = JSON.parse(
  readFileSync(
    new URL('../../docs/policies/v1/policy.prose-quality.v1.json', import.meta.url),
    'utf8'
  )
);

export const stePolicy = JSON.parse(
  readFileSync(
    new URL(
      '../../docs/policies/v1/policy.simplified-technical-english.v1.json',
      import.meta.url
    ),
    'utf8'
  )
);

export const deterministicRules = prosePolicy.deterministic_rules.map((rule) => ({
  ...rule,
  pattern: new RegExp(rule.pattern, rule.flags)
}));

export const contextualRules = prosePolicy.contextual_rules.map((rule) => ({
  ...rule,
  pattern: new RegExp(rule.pattern, rule.flags)
}));

export const agencyOverlayRules = PUBLIC_COPY_RULES.map((rule) => ({
  id: `agency/${rule.id}`,
  pattern: rule.pattern,
  severity: 'error',
  suggestion: `Replace with "${rule.replacement}".`
}));

export const agencyOverlayFiles = new Set(
  discoverPublicCopyFiles().map((file) => path.resolve(file))
);

export const agencyActiveFiles = new Set(
  discoverActivePublicCopyFiles().map((file) => path.resolve(file))
);

export const reviewRules = Object.fromEntries(
  prosePolicy.judgment_signals.rules.map(({ key, ...rule }) => [key, rule])
);

export const controlledOwnedTermsByPrefix = Object.fromEntries(
  Object.entries(prosePolicy.controlled_owned_terms_by_prefix).map(([prefix, terms]) => [
    prefix,
    new Set(terms)
  ])
);

export const supportedProseExtensions = new Set(prosePolicy.automatic_scope.extensions);

export const autoExcludedPrefixes = prosePolicy.automatic_scope.excluded_prefixes;
