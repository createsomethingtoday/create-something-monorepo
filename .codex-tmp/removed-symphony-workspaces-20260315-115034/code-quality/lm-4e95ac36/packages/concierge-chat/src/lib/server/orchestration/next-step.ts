import type { ConciergeThread } from '$chat/thread-store';

export interface NextStepRecommendation {
	label: string;
	description: string;
	intent: 'confirm_fields' | 'upload_documents' | 'reconnect_tool' | 'wait_for_review';
	blocked: boolean;
	policyRef: string;
}

export function determineNextStep(thread: ConciergeThread): NextStepRecommendation {
	if (thread.turn.stage === 'handoff_ready') {
		return {
			label: 'Wait for operator review',
			description:
				'The workflow has already escalated. The next user-visible action is an update from the human review queue.',
			intent: 'wait_for_review',
			blocked: true,
			policyRef: thread.turn.policyRef
		};
	}

	if (thread.turn.stage === 'awaiting_tool_auth') {
		return {
			label: 'Reconnect blocked tool',
			description:
				'A required downstream system lost auth. Route the user through reconnect before making another tool call.',
			intent: 'reconnect_tool',
			blocked: true,
			policyRef: thread.turn.policyRef
		};
	}

	if (thread.turn.stage === 'awaiting_upload') {
		return {
			label: 'Upload documents and confirm details',
			description:
				'Enough has been inferred to keep the chat natural, but matching remains blocked until consent and supporting documents are captured.',
			intent: 'upload_documents',
			blocked: true,
			policyRef: thread.turn.policyRef
		};
	}

	return {
		label: 'Confirm profile details',
		description: 'Ask for the minimum explicit confirmations needed to continue safely.',
		intent: 'confirm_fields',
		blocked: false,
		policyRef: thread.turn.policyRef
	};
}
