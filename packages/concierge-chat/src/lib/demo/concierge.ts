import { createThreadStore, type ConciergeThread } from '$chat/thread-store';

export const seedThreads: ConciergeThread[] = [
	{
		id: 'demo-intake',
		title: 'Travel Nurse Intake',
		subtitle: 'Progressive profile capture without a 20-question form',
		userName: 'Carmen Ruiz',
		updatedAt: '2026-03-09T16:42:00.000Z',
		status: 'awaiting_user',
		pendingAction: 'Confirm two inferred fields and upload a resume.',
		badges: ['AI-native concierge', 'Needs consent'],
		messages: [
			{
				id: 'm1',
				role: 'assistant',
				author: 'Concierge',
				body:
					"Tell me what kind of contract you want and I'll build your profile while we talk. No intake form first.",
				createdAt: '2026-03-09T16:30:00.000Z'
			},
			{
				id: 'm2',
				role: 'user',
				author: 'Carmen Ruiz',
				body:
					"I'm an ICU nurse in Austin looking for a 13-week travel contract starting in April. Nights are best and weekends are fine too.",
				createdAt: '2026-03-09T16:31:00.000Z'
			},
			{
				id: 'm3',
				role: 'assistant',
				author: 'Concierge',
				body:
					'Pulled that into your profile. I have ICU, night shift, April start, and travel contract length. Do you hold a compact license?',
				createdAt: '2026-03-09T16:33:00.000Z'
			},
			{
				id: 'm4',
				role: 'user',
				author: 'Carmen Ruiz',
				body:
					'Yes. Compact license is active and my BLS and ACLS are both current. I can stay within Texas or nearby states.',
				createdAt: '2026-03-09T16:35:00.000Z'
			},
			{
				id: 'm5',
				role: 'assistant',
				author: 'Concierge',
				body:
					"I've got enough to shortlist roles, but I still need resume upload, background-check consent, and a quick confirmation on preferred location before I trigger matching.",
				createdAt: '2026-03-09T16:42:00.000Z',
				evidence: ['profile_snapshot_1', 'tool_action_1']
			}
		],
		widgets: [
			{
				id: 'widget-profile-progress',
				type: 'profile_progress',
				title: 'Profile Progress',
				placement: 'rail',
				priority: 10,
				data: {
					completion: 72,
					confirmedCount: 3,
					inferredCount: 2,
					missingFields: ['Preferred location', 'Background-check consent', 'Resume upload'],
					nextPrompt: 'Confirm the last two profile assumptions and attach credentials to unlock matching.'
				}
			},
			{
				id: 'widget-field-confirmation',
				type: 'field_confirmation',
				title: 'Confirm inferred details',
				placement: 'inline',
				priority: 20,
				data: {
					description:
						'These are strong inferences from the conversation, but they still need an explicit yes before the system submits them to matching.',
					fields: [
						{
							key: 'preferred_shift',
							label: 'Preferred shift',
							value: 'Nights, weekends okay',
							status: 'inferred',
							confidence: 0.92,
							fieldClass: 'preference',
							note: 'Derived from the first intake message.'
						},
						{
							key: 'preferred_region',
							label: 'Preferred location',
							value: 'Texas and nearby states',
							status: 'inferred',
							confidence: 0.81,
							fieldClass: 'preference',
							note: 'Needs a tighter radius before matching.'
						}
					],
					confirmLabel: 'Looks right',
					rejectLabel: 'Need edits'
				}
			},
			{
				id: 'widget-document-upload',
				type: 'document_upload',
				title: 'Upload credential packet',
				placement: 'inline',
				priority: 30,
				data: {
					description:
						'Matching is blocked until the resume and compact license image are attached to the thread.',
					documents: [
						{
							key: 'resume_pdf',
							title: 'Resume PDF',
							acceptedTypes: ['PDF'],
							accept: '.pdf,application/pdf',
							status: 'needed'
						},
						{
							key: 'compact_license_image',
							title: 'Compact license image',
							acceptedTypes: ['PNG', 'JPG'],
							accept: '.png,.jpg,.jpeg,image/png,image/jpeg',
							status: 'needed'
						}
					],
					status: 'needed',
					uploadLabel: 'Upload documents'
				}
			},
			{
				id: 'widget-consent',
				type: 'consent',
				title: 'Authorize background-check workflow',
				placement: 'inline',
				priority: 40,
				data: {
					body:
						'Before CREATE SOMETHING can write your profile into the staffing workflow, we need explicit consent for background-check and compliance screening.',
					policyReference: 'policy.progressive-profile-governance.v1',
					status: 'needed',
					confirmLabel: 'I consent'
				}
			},
			{
				id: 'widget-tool-reconnect',
				type: 'tool_reconnect',
				title: 'Reconnect credentialing portal',
				placement: 'rail',
				priority: 50,
				data: {
					toolName: 'Credentialing Hub',
					reason: 'The most recent license verification call returned REQUIRES_AUTH.',
					status: 'required',
					connectHref: '/settings',
					reconnectLabel: 'Reconnect tool'
				}
			}
		],
		profile: {
			completion: 72,
			confirmedCount: 3,
			inferredCount: 2,
			candidateCount: 2,
			missingRequired: ['Preferred location', 'Background-check consent', 'Resume upload'],
			blockers: [
				'Resume upload required before role matching.',
				'Credentialing Hub needs reconnect for live license verification.'
			],
			fields: [
				{
					key: 'full_name',
					label: 'Full name',
					value: 'Carmen Ruiz',
					status: 'confirmed',
					confidence: 0.99,
					fieldClass: 'identity',
					sourceMessageIds: ['m2'],
					sourceArtifactIds: [],
					updatedAt: '2026-03-09T16:31:00.000Z',
					confirmedBy: 'user'
				},
				{
					key: 'specialty',
					label: 'Specialty',
					value: 'ICU nurse',
					status: 'confirmed',
					confidence: 0.97,
					fieldClass: 'regulated',
					sourceMessageIds: ['m2'],
					sourceArtifactIds: [],
					updatedAt: '2026-03-09T16:31:00.000Z',
					confirmedBy: 'user'
				},
				{
					key: 'compact_license',
					label: 'Compact license',
					value: 'Active',
					status: 'confirmed',
					confidence: 0.93,
					fieldClass: 'credential',
					sourceMessageIds: ['m4'],
					sourceArtifactIds: [],
					updatedAt: '2026-03-09T16:35:00.000Z',
					confirmedBy: 'user'
				},
				{
					key: 'preferred_shift',
					label: 'Preferred shift',
					value: 'Nights, weekends okay',
					status: 'inferred',
					confidence: 0.92,
					fieldClass: 'preference',
					sourceMessageIds: ['m2'],
					sourceArtifactIds: [],
					updatedAt: '2026-03-09T16:31:00.000Z',
					note: 'Eligible to prefill but not yet explicitly confirmed.'
				},
				{
					key: 'contract_start',
					label: 'Contract start',
					value: 'April 2026',
					status: 'inferred',
					confidence: 0.84,
					fieldClass: 'preference',
					sourceMessageIds: ['m2'],
					sourceArtifactIds: [],
					updatedAt: '2026-03-09T16:31:00.000Z',
					note: 'Month captured, exact date still open.'
				},
					{
						key: 'preferred_region',
						label: 'Preferred location',
						value: 'Texas and nearby states',
						status: 'candidate',
						confidence: 0.68,
					fieldClass: 'preference',
					sourceMessageIds: ['m4'],
					sourceArtifactIds: [],
					updatedAt: '2026-03-09T16:35:00.000Z',
					note: 'Needs a tighter radius for matching.'
				},
				{
					key: 'background_check_consent',
					label: 'Background-check consent',
					value: 'Pending',
					status: 'candidate',
					confidence: 0.3,
					fieldClass: 'consent',
					sourceMessageIds: [],
					sourceArtifactIds: [],
					updatedAt: '2026-03-09T16:42:00.000Z',
					note: 'Explicit user confirmation required.'
				}
			]
		},
		artifacts: [
			{
				id: 'profile_snapshot_1',
				kind: 'profile_snapshot',
				title: 'Profile snapshot v3',
				summary: 'Structured intake state after the third assistant turn.',
				createdAt: '2026-03-09T16:42:00.000Z',
				status: 'ready',
				source: 'progressive profiler'
			},
			{
				id: 'tool_action_1',
				kind: 'tool_action',
				title: 'License verification',
				summary: 'Credentialing Hub call blocked pending reconnect.',
				createdAt: '2026-03-09T16:41:00.000Z',
				status: 'blocked',
				source: 'cs-mcp-hub-remote'
			}
		],
		turn: {
			stage: 'awaiting_upload',
			summary:
				'The concierge has enough information to avoid more interrogation, but it is still missing consent and supporting documents.',
			blockers: [
				'Upload credential packet.',
				'Confirm preferred region.',
				'Reconnect Credentialing Hub.'
			],
			nextActionLabel: 'Finish profile and unlock matching',
			policyRef: 'policy.progressive-profile-governance.v1'
		},
		connectedTools: [
			{
				name: 'Credentialing Hub',
				status: 'action_required',
				note: 'Reconnect required before the next verification call.',
				actionHref: buildControlPlaneBridgeHref('mcp-access', {
					threadId: 'demo-intake',
					tool: 'credentialing-hub'
				})
			},
			{
				name: 'Staffing CRM',
				status: 'connected',
				note: 'Ready for writeback after consent.'
			},
			{
				name: 'SMS Alerts',
				status: 'connected',
				note: 'Candidate can receive shortlist updates.'
			}
		]
	},
	{
		id: 'license-review',
		title: 'License Review Escalation',
		subtitle: 'Conflict detected between self-reported and portal values',
		userName: 'Jalen Brooks',
		updatedAt: '2026-03-09T14:12:00.000Z',
		status: 'handoff_ready',
		pendingAction: 'Human review required before external write.',
		badges: ['Escalated', 'Human handoff'],
		messages: [
			{
				id: 'hm1',
				role: 'user',
				author: 'Jalen Brooks',
				body:
					'My California license should be valid through September, but the portal is showing a mismatch on the renewal date.',
				createdAt: '2026-03-09T13:55:00.000Z'
			},
			{
				id: 'hm2',
				role: 'assistant',
				author: 'Concierge',
				body:
					"I found conflicting evidence between the uploaded license image and the credentialing portal. I'm packaging the thread for a human reviewer now.",
				createdAt: '2026-03-09T14:02:00.000Z'
			},
			{
				id: 'hm3',
				role: 'assistant',
				author: 'Concierge',
				body:
					'The handoff includes the evidence trail, current blockers, and the fields that must not be written until an operator clears the conflict.',
				createdAt: '2026-03-09T14:12:00.000Z'
			}
		],
		widgets: [
			{
				id: 'widget-handoff',
				type: 'handoff',
				title: 'Human review queued',
				placement: 'inline',
				priority: 10,
				data: {
					kind: 'escalation',
					tone: 'danger',
					statusLabel: 'Review queued',
					queueName: 'Nurse credentialing review',
					eta: '12 minutes',
					reasonCodes: ['conflicting_evidence', 'regulated_field', 'external_write_blocked'],
					summary: 'A recruiter will compare the uploaded image with portal records before any downstream write occurs.',
					actionLabel: 'Open handoff packet'
				}
			},
			{
				id: 'widget-profile-progress-handoff',
				type: 'profile_progress',
				title: 'Profile Progress',
				placement: 'rail',
				priority: 20,
				data: {
					completion: 94,
					confirmedCount: 5,
					inferredCount: 0,
					missingFields: ['License renewal conflict resolution'],
					nextPrompt: 'Awaiting operator review before submission.'
				}
			}
		],
		profile: {
			completion: 94,
			confirmedCount: 5,
			inferredCount: 0,
			candidateCount: 1,
			missingRequired: ['License renewal conflict resolution'],
			blockers: ['Human review required for regulated credential field.'],
			fields: [
				{
					key: 'full_name',
					label: 'Full name',
					value: 'Jalen Brooks',
					status: 'confirmed',
					confidence: 0.99,
					fieldClass: 'identity',
					sourceMessageIds: ['hm1'],
					sourceArtifactIds: ['upload_1'],
					updatedAt: '2026-03-09T13:55:00.000Z',
					confirmedBy: 'user'
				},
					{
						key: 'license_state',
						label: 'License state',
						value: 'California',
					status: 'confirmed',
					confidence: 0.97,
					fieldClass: 'regulated',
					sourceMessageIds: ['hm1'],
					sourceArtifactIds: ['upload_1'],
						updatedAt: '2026-03-09T13:55:00.000Z',
						confirmedBy: 'user'
					},
					{
						key: 'specialty',
						label: 'Specialty',
						value: 'ER / ICU float pool',
						status: 'confirmed',
						confidence: 0.95,
						fieldClass: 'regulated',
						sourceMessageIds: ['hm1'],
						sourceArtifactIds: ['upload_1'],
						updatedAt: '2026-03-09T13:55:00.000Z',
						confirmedBy: 'user'
					},
					{
						key: 'license_number',
						label: 'License number',
						value: 'CA-RN ending 4821',
						status: 'confirmed',
						confidence: 0.96,
						fieldClass: 'external_write_key',
						sourceMessageIds: ['hm1'],
						sourceArtifactIds: ['upload_1'],
						updatedAt: '2026-03-09T13:55:00.000Z',
						confirmedBy: 'user'
					},
					{
						key: 'primary_phone',
						label: 'Primary phone',
						value: '(555) 014-4821',
						status: 'confirmed',
						confidence: 0.91,
						fieldClass: 'contact',
						sourceMessageIds: ['hm1'],
						sourceArtifactIds: [],
						updatedAt: '2026-03-09T13:55:00.000Z',
						confirmedBy: 'user'
					},
					{
						key: 'license_renewal_date',
						label: 'License renewal date',
					value: 'Conflict detected',
					status: 'candidate',
					confidence: 0.52,
					fieldClass: 'regulated',
					sourceMessageIds: ['hm1'],
					sourceArtifactIds: ['upload_1'],
					updatedAt: '2026-03-09T14:02:00.000Z',
					note: 'User statement and credentialing portal disagree.'
				}
			]
		},
		artifacts: [
			{
				id: 'upload_1',
				kind: 'upload',
				title: 'California license image',
				summary: 'Uploaded from mobile during the thread.',
				createdAt: '2026-03-09T13:58:00.000Z',
				status: 'ready',
				source: 'user upload'
			},
			{
				id: 'handoff_packet_1',
				kind: 'handoff_packet',
				title: 'Credentialing handoff packet',
				summary: 'Escalation packet for operator review.',
				createdAt: '2026-03-09T14:12:00.000Z',
				status: 'ready',
				source: 'handoff engine'
			}
		],
		turn: {
			stage: 'handoff_ready',
			summary: 'The workflow is blocked on a regulated field conflict and has been queued for human review.',
			blockers: ['Do not write license data until reviewed.'],
			nextActionLabel: 'Wait for operator review',
			policyRef: 'policy.progressive-profile-governance.v1'
		},
		connectedTools: [
			{
				name: 'Credentialing Hub',
				status: 'connected',
				note: 'Connected, but writeback is paused by policy.'
			},
			{
				name: 'Recruiter Queue',
				status: 'queued',
				note: 'Escalation packet delivered to operator workspace.'
			}
		],
		handoff: {
			kind: 'escalation',
			queueName: 'Nurse credentialing review',
			eta: '12 minutes',
			reasonCodes: ['conflicting_evidence', 'regulated_field', 'external_write_blocked'],
			summary:
				'Compare the user-uploaded license image with portal metadata and resolve the renewal date conflict.',
			operatorBrief:
				'Do not push to staffing CRM until the renewal date is manually verified. User is waiting in chat.',
			pendingTasks: [
				'Resolve license renewal date mismatch.',
				'Send update into thread once review is complete.',
				'Release CRM writeback hold.'
			]
		}
	}
];

export const conciergeDemoStore = createThreadStore(seedThreads);

export const conciergeSettings = {
	notifications: [
		'Thread updates via SMS are enabled.',
		'Escalation notifications go to email and in-app inbox.',
		'Quiet hours begin at 10:00 PM local time.'
	],
	guardrails: [
		'Inferred profile fields remain visibly distinct until confirmed.',
		'External writes are blocked until consent and sensitive-field confirmation are satisfied.',
		'Credential reconnects are routed through CREATE SOMETHING control-plane UX, not raw provider screens.'
	],
	controlPlaneLinks: [
		{ label: 'Open .agency dashboard', href: buildControlPlaneBridgeHref('dashboard') },
		{ label: 'Open .agency MCP access', href: buildControlPlaneBridgeHref('mcp-access') },
		{ label: 'Open .agency security posture', href: buildControlPlaneBridgeHref('security') }
	]
};

export function listSeedThreads() {
	return conciergeDemoStore.list();
}

export function getSeedThread(threadId: string) {
	return conciergeDemoStore.get(threadId);
}

export function getLatestSeedThread() {
	return conciergeDemoStore.latest();
}
import { buildControlPlaneBridgeHref } from '$lib/control-plane';
