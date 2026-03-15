/**
 * Icon System Types
 *
 * Philosophy: Each icon must earn its existence.
 * No decorative icons - only functional.
 *
 * Grid: 24x24 viewBox, 2px stroke, round caps/joins
 */

/**
 * Icon categories - each serves a distinct purpose
 */
export type IconCategory = 'navigation' | 'actions' | 'status' | 'objects';

/**
 * Navigation icons - wayfinding and movement
 */
export type NavigationIcon =
	| 'home'
	| 'arrow-left'
	| 'arrow-right'
	| 'arrow-up'
	| 'arrow-down'
	| 'chevron-left'
	| 'chevron-right'
	| 'chevron-down'
	| 'external-link'
	| 'menu'
	| 'close';

/**
 * Action icons - user interactions
 */
export type ActionIcon =
	| 'search'
	| 'edit'
	| 'copy'
	| 'download'
	| 'upload'
	| 'share'
	| 'plus'
	| 'minus'
	| 'check'
	| 'refresh'
	| 'trash';

/**
 * Status icons - feedback and state
 */
export type StatusIcon =
	| 'success'
	| 'error'
	| 'warning'
	| 'info'
	| 'loading';

/**
 * Object icons - entities and concepts
 */
export type ObjectIcon =
	| 'document'
	| 'folder'
	| 'user'
	| 'users'
	| 'settings'
	| 'mail'
	| 'calendar'
	| 'clock';

/**
 * All icon names
 */
export type IconName = NavigationIcon | ActionIcon | StatusIcon | ObjectIcon;

/**
 * Icon size variants - maps to pixel values
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Size value mapping
 */
export const ICON_SIZES: Record<IconSize, number> = {
	xs: 12,
	sm: 16,
	md: 20,
	lg: 24,
	xl: 32
} as const;
