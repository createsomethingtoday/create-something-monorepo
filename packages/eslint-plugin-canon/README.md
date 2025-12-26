# @create-something/eslint-plugin-canon

ESLint plugin for enforcing CREATE SOMETHING Canon design tokens at build time.

## Philosophy

**Build-time constraints, not runtime discovery.**

Inspired by NanoLang's shadow tests: constraints should be intrinsic to the syntax, not external audits. Canon violations should fail the build, not be discovered later.

**Single Source of Truth**: Token values and descriptions are loaded from `packages/components/src/lib/styles/canon.json`, ensuring consistency with the actual Canon implementation.

## Installation

```bash
pnpm add -D @create-something/eslint-plugin-canon eslint svelte-eslint-parser
```

## Configuration

### Flat Config (ESLint 9+)

```javascript
// eslint.config.js
import canonPlugin from '@create-something/eslint-plugin-canon';
import svelteParser from 'svelte-eslint-parser';

export default [
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser
		},
		plugins: {
			canon: canonPlugin
		},
		rules: {
			'canon/no-tailwind-design-utils': 'error',
			'canon/prefer-canon-tokens': 'warn'
		}
	},
	{
		files: ['**/*.{js,ts,jsx,tsx}'],
		plugins: {
			canon: canonPlugin
		},
		rules: {
			'canon/no-tailwind-design-utils': 'error',
			'canon/prefer-canon-tokens': 'warn'
		}
	}
];
```

### Legacy Config (.eslintrc)

```json
{
	"parser": "svelte-eslint-parser",
	"plugins": ["@create-something/canon"],
	"rules": {
		"@create-something/canon/no-tailwind-design-utils": "error",
		"@create-something/canon/prefer-canon-tokens": "warn"
	}
}
```

### Using Presets

```javascript
import canonPlugin from '@create-something/eslint-plugin-canon';

export default [
	{
		...canonPlugin.configs.recommended // or .strict
	}
];
```

## Rules

### `no-tailwind-design-utils`

Disallows Tailwind design utilities in favor of Canon tokens.

**Principle**: "Tailwind for structure, Canon for aesthetics."

#### ❌ Violations

```svelte
<!-- Hardcoded colors -->
<div class="bg-white/10 text-white/60 border-white/20">

<!-- Border radius -->
<button class="rounded-lg">

<!-- Typography -->
<p class="text-sm text-gray-400">

<!-- Shadows -->
<div class="shadow-md">
```

#### ✅ Correct

```svelte
<!-- Structure: Tailwind | Design: Canon -->
<div class="flex items-center gap-4 card">
	<p class="caption">{text}</p>
</div>

<style>
	.card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
	}
	.caption {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}
</style>
```

### `prefer-canon-tokens`

Suggests Canon tokens for hardcoded CSS values.

#### ❌ Violations

```svelte
<style>
	.element {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		font-size: 0.875rem;
	}
</style>
```

#### ✅ Correct

```svelte
<style>
	.element {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
	}
</style>
```

## Opt-Out Mechanisms

### Per-File Disable

```javascript
/* eslint-disable canon/no-tailwind-design-utils */
```

### Experimental Routes Policy

Per css-canon.md, experiments can drift during development:

```javascript
// eslint.config.js
export default [
	{
		files: ['**/routes/experiments/**/*.svelte'],
		rules: {
			'canon/no-tailwind-design-utils': 'off',
			'canon/prefer-canon-tokens': 'warn' // Still suggest, don't block
		}
	}
];
```

**Before merging to production**, violations must be fixed.

### Configuration Options

```javascript
{
	rules: {
		'canon/no-tailwind-design-utils': ['error', {
			ignorePatterns: ['experiments/**', 'prototypes/**']
		}]
	}
}
```

## Integration with Build

### Package.json Scripts

```json
{
	"scripts": {
		"lint": "eslint .",
		"check": "pnpm lint && svelte-check",
		"build": "pnpm check && vite build"
	}
}
```

### CI/CD

```yaml
# .github/workflows/ci.yml
- name: Lint
  run: pnpm lint
```

Build failures include Canon token suggestions:

```
error  Replace Tailwind 'bg-white/10' with Canon token 'var(--color-bg-surface)' (#111111). Use in <style> block, not class attribute  canon/no-tailwind-design-utils

✖ 1 problem (1 error, 0 warnings)
```

## Allowed Tailwind Utilities

Layout/structure utilities are allowed:

- **Flexbox**: `flex`, `items-center`, `justify-between`, etc.
- **Grid**: `grid`, `grid-cols-3`, `gap-4`, etc.
- **Position**: `relative`, `absolute`, `fixed`, etc.
- **Sizing**: `w-full`, `h-screen`, `max-w-prose`, etc.
- **Spacing**: `p-4`, `m-2`, `gap-6`, etc.
- **Overflow**: `overflow-hidden`, `overflow-auto`, etc.

See css-canon.md for the complete list.

## Canon Token Reference

| Tailwind | Canon Token | Value |
|----------|-------------|-------|
| `bg-black` | `var(--color-bg-pure)` | #000000 |
| `bg-white/10` | `var(--color-bg-surface)` | #111111 |
| `text-white` | `var(--color-fg-primary)` | #ffffff |
| `text-white/60` | `var(--color-fg-tertiary)` | rgba(255,255,255,0.6) |
| `border-white/10` | `var(--color-border-default)` | rgba(255,255,255,0.1) |
| `rounded-lg` | `var(--radius-lg)` | 12px |
| `shadow-md` | `var(--shadow-md)` | ... |
| `text-sm` | `var(--text-body-sm)` | 0.875rem |

Full reference: [css-canon.md](../../.claude/rules/css-canon.md)

## Subtractive Triad Reflection

This plugin embodies all three levels:

1. **DRY** (Implementation) - Reuse Canon tokens, don't duplicate design values
2. **Rams** (Artifact) - Only utilities that earn their existence (structure over decoration)
3. **Heidegger** (System) - Build process enforces coherence across all properties

When Canon violations fail the build, the tool recedes. You no longer think about "am I using the right token?"—the system tells you.

**Zuhandenheit**: The linter disappears when you follow Canon. **Vorhandenheit**: The linter appears when you violate it.

## Related Tools

- `/audit-canon` skill - Manual Canon compliance audit
- `canon.json` - Machine-readable token definitions
- `css-canon.md` - Human-readable Canon documentation

## License

MIT
