export type ArtifactKind =
	| 'profile_snapshot'
	| 'consent_receipt'
	| 'upload'
	| 'handoff_packet'
	| 'tool_action';

export interface ChatArtifact {
	id: string;
	kind: ArtifactKind;
	title: string;
	summary: string;
	createdAt: string;
	status: 'ready' | 'pending' | 'blocked';
	source: string;
	href?: string;
}
