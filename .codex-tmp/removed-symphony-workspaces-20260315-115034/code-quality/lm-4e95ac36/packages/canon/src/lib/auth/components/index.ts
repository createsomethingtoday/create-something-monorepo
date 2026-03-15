/**
 * Auth Components
 *
 * Reusable Svelte authentication components for CREATE SOMETHING properties.
 * All components use Canon tokens for styling and emit analytics events.
 *
 * Canon: One identity, many manifestations. The components disappear; only the action remains.
 *
 * @packageDocumentation
 */

// Store
export {
	createAuthStore,
	getAuthStore,
	type AuthState,
	type AuthStoreConfig,
	type LoginCredentials,
	type SignupCredentials,
	type MagicLinkRequest,
} from './AuthStore.js';

// Components
export { default as AccountPage } from './AccountPage.svelte';
export { default as LoginForm } from './LoginForm.svelte';
export { default as SignupForm } from './SignupForm.svelte';
export { default as MagicLinkForm } from './MagicLinkForm.svelte';
export { default as UserMenu } from './UserMenu.svelte';
export { default as ProtectedRoute } from './ProtectedRoute.svelte';
