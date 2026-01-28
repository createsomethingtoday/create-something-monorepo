/**
 * Canon Icon System
 *
 * Philosophy: Each icon must earn its existence.
 * 35 functional icons across 4 categories.
 *
 * Grid: 24x24 viewBox, 2px stroke, round caps/joins
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { Icon } from '@create-something/canon/icons';
 * </script>
 *
 * <Icon name="home" size="md" />
 * <Icon name="search" size={24} color="var(--color-fg-muted)" />
 * <Icon name="success" label="Success indicator" />
 * ```
 */

// Component
export { default as Icon } from './Icon.svelte';

// Types
export type {
	IconName,
	IconSize,
	IconCategory,
	NavigationIcon,
	ActionIcon,
	StatusIcon,
	ObjectIcon
} from './types.js';

export { ICON_SIZES } from './types.js';

// Paths (for advanced usage)
export { ICON_PATHS, getIconPath, isValidIconName } from './paths.js';
