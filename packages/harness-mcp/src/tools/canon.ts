import { readFileSync } from 'fs';
import { join } from 'path';
import { findMonorepoRoot } from '../utils.js';

export interface CanonRules {
  css?: string;
  voice?: string;
  code?: string;
  templates?: string;
  claude?: string;
}

/**
 * Get Canon rules from .claude/rules/*.md files
 */
export function getCanonRules(category?: 'css' | 'voice' | 'code' | 'templates' | 'all'): CanonRules {
  const root = findMonorepoRoot();
  const rulesDir = join(root, '.claude', 'rules');
  const rules: CanonRules = {};

  const ruleFiles = {
    css: 'css-canon.md',
    voice: 'voice-canon.md',
    code: 'sveltekit-conventions.md',
    templates: 'template-deployment-patterns.md',
    claude: '../CLAUDE.md'
  };

  try {
    if (!category || category === 'all') {
      // Return all rules
      for (const [key, file] of Object.entries(ruleFiles)) {
        try {
          const filePath = join(rulesDir, file);
          rules[key as keyof CanonRules] = readFileSync(filePath, 'utf-8');
        } catch (err) {
          // Skip missing files
        }
      }
    } else {
      // Return specific category
      const file = ruleFiles[category];
      if (file) {
        const filePath = join(rulesDir, file);
        rules[category] = readFileSync(filePath, 'utf-8');
      }
    }

    return rules;
  } catch (error: any) {
    throw new Error(`Failed to read canon rules: ${error.message}`);
  }
}

/**
 * Get a quick reference summary for common patterns
 */
export function getQuickReference(): string {
  return `# CREATE SOMETHING Quick Reference

## Monorepo Structure
- Root: /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo
- Packages: packages/[pkg]/ (space, io, agency, ltd, components, etc.)
- Common pattern: packages/[pkg]/src/lib/ for shared code
- Types often in: packages/[pkg]/src/lib/types/ (directory, not .ts file)

## CSS Canon
- **Tailwind for structure, Canon for aesthetics**
- Use \`var(--color-*)\` tokens, not hardcoded colors
- Use \`var(--space-*)\` for spacing (golden ratio)
- Motion: \`var(--duration-micro)\` 200ms for most interactions

## Voice Canon
- **Clarity over cleverness**
- Lead with outcomes, not philosophy
- Every claim must be measurable
- "155 scripts → 13" not "significant improvements"

## Code Conventions
- Routes: \`src/routes/[path]/+page.svelte\`
- API: \`src/routes/api/[endpoint]/+server.ts\`
- Always use \`platform?.env.DB\` for D1 access
- Use \`json()\` for API responses, \`error()\` for errors

## TypeScript Verification
- In monorepo: Use \`pnpm --filter=@create-something/[pkg] exec tsc --noEmit\`
- NOT: \`tsc\` alone (won't find dependencies)
- Package names have hyphens: @create-something/canon, not @createsomething/components

## Deployment
- Pages: \`pnpm build && wrangler pages deploy\`
- Workers: \`pnpm deploy\`
- Check project names in PROJECT_NAME_REFERENCE.md

For full details, use get_canon_rules({ category: 'css' | 'voice' | 'code' })
`;
}
