export type ProspectWorkspaceCandidate = {
	client: {
		slug: string;
		display_name: string | null;
		status: 'initialized' | 'active' | 'paused' | 'sunset' | 'disabled';
		required_toolkits: string[];
	};
	lane: {
		slug: string;
		display_name: string;
		hub_url: string;
		status: 'initialized' | 'active' | 'paused' | 'sunset' | 'disabled';
		toolkit_profile: string[];
		allowed_tool_prefixes: string[];
	};
		prospect_claim: {
			state: 'claimable' | 'claimed_by_you' | 'claimed_by_other';
			can_claim_now: boolean;
			authorized_via: 'owner_email' | 'claim_emails' | 'claim_email_domains';
			requires_repair: boolean;
			blocked_reason:
				| 'identity_seed_conflict'
				| 'manual_override_conflict'
				| 'prospect_unavailable'
				| 'already_claimed'
				| 'inconsistent_claim_state'
				| null;
			blocked_message: string | null;
			service_tier: string;
	};
	toolkit_accounts: {
		id: string;
		toolkit: string;
		account_slug: string;
		display_label: string | null;
		composio_user_id: string;
		auth_config_id: string | null;
		connected_account_id: string | null;
		connection_status: string;
		connected: boolean;
		status: 'active' | 'disabled' | 'revoked';
			sync_enabled: boolean;
			last_checked_at: string | null;
			connected_at: string | null;
			verification_state: 'live' | 'stale' | 'refresh_failed';
			verification_message: string | null;
			metadata: Record<string, unknown>;
			created_at: string;
			updated_at: string;
	}[];
	issuance_state: {
		ready: false;
		blocked_reason: 'prospect_not_ready';
		message: string;
	};
	graduation_readiness?: {
		ready: boolean;
		blocked_reason: string | null;
		blocked_message: string;
		account_id: string | null;
		tenant_id: string | null;
		checks: {
			managed_bearer_allowed: boolean;
			org_membership_active: boolean;
			service_entitled: boolean;
			policy_accepted: boolean;
			contract_active: boolean;
			billing_active: boolean;
		};
		snapshot: {
			service_tier: string;
			managed_bearer_allowed: boolean;
			org_membership_active: boolean;
			service_entitled: boolean;
			policy_accepted: boolean;
			contract_active: boolean;
			billing_active: boolean;
		} | null;
	} | null;
};
