/**
 * API Client Exports
 *
 * Centralized API clients for CREATE SOMETHING services.
 */

export {
	identityClient,
	getIdentityErrorMessage,
	isAuthError,
	isValidationError,
	type IdentityErrorResponse,
	type TokenResponse,
	type IdentityUser,
	type AuthResponse,
	type CrossDomainResponse,
	type IdentityResult,
	type LoginRequest,
	type SignupRequest,
	type MagicLoginRequest,
	type MagicSignupRequest,
	type VerifyMagicLinkRequest,
	type CrossDomainRequest,
	type CrossDomainExchangeRequest,
	type RefreshTokenRequest
} from './identity-client.js';
