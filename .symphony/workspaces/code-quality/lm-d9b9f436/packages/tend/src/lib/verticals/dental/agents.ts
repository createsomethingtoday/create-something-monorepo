/**
 * Dental Practice Agents
 * 
 * Reasoning-capable agents that handle complex analysis and drafting.
 * These operate in the middle layer — slower, smarter, human-supervised.
 */

import { defineAgent } from '../../sdk/agent';
import type { DentalDataItem } from './types';

// =============================================================================
// MISSED CALL ANALYZER
// =============================================================================

export const missedCallAnalyzer = defineAgent({
	name: 'missed-call-analyzer',
	description: 'Analyze unconverted calls to identify opportunities and suggest follow-up',

	trigger: (item) => {
		const meta = item.metadata as any;
		return (
			item.sourceType === 'phone' &&
			meta.direction === 'inbound' &&
			!meta.converted &&
			meta.duration_seconds >= 30
		);
	},

	tools: [
		'read_call_transcript',
		'get_patient_history',
		'check_schedule_availability',
		'search_similar_calls',
	],

	task: `Analyze this unconverted call and determine:

1. **Call Intent**: What was the caller trying to accomplish?
2. **Failure Point**: Why didn't the call result in an appointment?
   - Scheduling conflict?
   - Price concern?
   - Insurance question?
   - Just information gathering?
   - Staff handling issue?
3. **Patient Status**: Is this an existing patient or new patient opportunity?
4. **Callback Priority**: Should we call back? (high/medium/low/none)
5. **Suggested Script**: If callback recommended, draft a brief talking point.
6. **Schedule Suggestion**: If scheduling was the issue, suggest 2-3 available slots.

Be concise. Focus on actionable insights.`,

	output: {
		requiresApproval: false, // Analysis doesn't need approval
		actions: ['flag_for_callback', 'add_to_callback_list', 'update_patient_notes'],
	},
});

// =============================================================================
// TREATMENT PLAN PREP
// =============================================================================

export const treatmentPlanPrep = defineAgent({
	name: 'treatment-plan-prep',
	description: 'Prepare treatment presentation materials before patient arrives',

	trigger: (item) => {
		const meta = item.metadata as any;
		return (
			item.sourceType === 'pms' &&
			meta.procedure_codes?.length > 0 &&
			meta.estimated_production > 500
		);
	},

	tools: [
		'get_patient_record',
		'get_patient_images',
		'check_insurance_coverage',
		'get_treatment_history',
		'calculate_patient_portion',
	],

	task: `Prepare a treatment presentation summary for this patient:

1. **Patient Context**:
   - Previous treatment history (what have we done before?)
   - Outstanding treatment plans (what's pending?)
   - Payment history (how do they typically pay?)

2. **Insurance Analysis**:
   - Current coverage and remaining benefits
   - What percentage is covered for each procedure?
   - Patient portion estimate
   - Any waiting periods or limitations?

3. **Financial Options**:
   - Total patient portion
   - If over $500, suggest payment plan options
   - CareCredit eligibility if applicable

4. **Talking Points**:
   - Why is this treatment needed? (in patient-friendly language)
   - What happens if we wait?
   - Expected timeline and appointments needed

5. **Clinical Notes for Provider**:
   - Any relevant imaging findings
   - Medical history considerations
   - Previous concerns or preferences

Format as a brief, scannable summary the front desk can reference.`,

	output: {
		requiresApproval: false,
		actions: ['attach_to_appointment', 'flag_for_review'],
	},
});

// =============================================================================
// INSURANCE APPEAL DRAFTER
// =============================================================================

export const insuranceAppealDrafter = defineAgent({
	name: 'insurance-appeal-drafter',
	description: 'Draft appeal letters for denied insurance claims',

	trigger: (item) => {
		const meta = item.metadata as any;
		return (
			item.sourceType === 'claims' &&
			meta.status === 'denied' &&
			meta.billed_amount > 100
		);
	},

	tools: [
		'get_claim_details',
		'get_patient_record',
		'get_treatment_notes',
		'get_imaging_reports',
		'search_appeal_templates',
		'get_payer_policies',
	],

	task: `Draft an insurance appeal letter for this denied claim:

1. **Denial Analysis**:
   - What was the stated denial reason?
   - Is this a valid denial or an error?
   - What documentation might be missing?

2. **Appeal Strategy**:
   - What's our strongest argument?
   - What clinical documentation supports medical necessity?
   - Are there applicable CDT code alternatives?

3. **Draft Appeal Letter**:
   Write a professional appeal letter including:
   - Patient and claim identifiers
   - Original service date and codes
   - Clear statement of why we're appealing
   - Clinical justification with specific documentation references
   - Request for reconsideration

4. **Supporting Documents Needed**:
   - List specific attachments to include
   - Note any missing documentation we need to obtain

5. **Appeal Deadline**:
   - When must this be submitted?
   - Flag if urgent

Keep the letter concise but thorough. Use dental terminology appropriately.`,

	output: {
		requiresApproval: true, // Appeals need human review before sending
		actions: ['submit_appeal', 'attach_documents', 'schedule_followup'],
	},
});

// =============================================================================
// SCHEDULE OPTIMIZER
// =============================================================================

export const scheduleOptimizer = defineAgent({
	name: 'schedule-optimizer',
	description: 'Fill schedule gaps by identifying and prioritizing outreach candidates',

	trigger: (item) => {
		// Triggered by schedule gap detection or daily morning run
		return false; // Manual trigger only
	},

	tools: [
		'get_schedule_gaps',
		'get_recall_due_list',
		'get_pending_treatment_plans',
		'get_patient_contact_preferences',
		'check_schedule_availability',
	],

	task: `Analyze schedule gaps and recommend patients to contact:

1. **Gap Analysis**:
   - When are the gaps? (date, time, duration, operatory)
   - What types of procedures fit each gap?

2. **Candidate Prioritization**:
   For each gap, rank potential patients to contact:
   
   Priority factors:
   - Recall overdue (hygiene patients)
   - Pending treatment plans (restorative patients)
   - Patient production history
   - Likelihood to schedule (past no-show rate)
   - Insurance year-end (December urgency)
   
3. **Outreach List**:
   Create a prioritized list with:
   - Patient name and phone
   - Why they're being contacted
   - Suggested procedure/time slot
   - Best contact method
   - Brief script/talking point

4. **Automation Suggestions**:
   - Which patients should get automated texts vs. personal calls?
   - Any patterns in gaps (e.g., always slow on Tuesdays)?

Limit to top 10-15 patients to avoid overwhelming the front desk.`,

	output: {
		requiresApproval: true, // Outreach list needs approval
		actions: ['create_call_list', 'send_batch_texts', 'update_recall_attempts'],
	},
});

// =============================================================================
// REVIEW RESPONSE DRAFTER
// =============================================================================

export const reviewResponseDrafter = defineAgent({
	name: 'review-response-drafter',
	description: 'Draft professional responses to patient reviews',

	trigger: (item) => {
		const meta = item.metadata as any;
		return item.sourceType === 'reviews' && meta.response_status === 'pending';
	},

	tools: [
		'get_review_details',
		'get_patient_history',
		'search_past_responses',
		'get_practice_policies',
	],

	task: `Draft a response to this patient review:

1. **Review Analysis**:
   - What's the core sentiment? (positive/neutral/negative)
   - What specific feedback did they give?
   - Can we identify the patient? (for context, not to mention)

2. **Response Strategy**:
   For positive reviews:
   - Thank specifically for what they mentioned
   - Reinforce the positive experience
   - Brief and warm
   
   For negative reviews:
   - Acknowledge their concern without being defensive
   - Don't discuss specific treatment (HIPAA)
   - Invite them to contact us directly
   - Professional but empathetic tone

3. **Draft Response**:
   - Keep under 100 words for positives
   - Keep under 150 words for negatives
   - Never mention specific treatments or conditions
   - Sign with practice name, not individual

4. **Internal Notes**:
   - Any follow-up needed internally?
   - Should we reach out privately?
   - Pattern to address (if recurring complaint)?

Maintain the practice's professional voice. Never argue or get defensive.`,

	output: {
		requiresApproval: true, // All public responses need approval
		actions: ['post_response', 'flag_for_followup', 'add_internal_note'],
	},
});

// =============================================================================
// NEW PATIENT INTAKE SCORER
// =============================================================================

export const newPatientIntakeScorer = defineAgent({
	name: 'new-patient-intake-scorer',
	description: 'Score and route new patient inquiries',

	trigger: (item) => {
		const meta = item.metadata as any;
		return (
			item.sourceType === 'phone' &&
			!meta.patient_id && // No existing patient record
			meta.direction === 'inbound'
		);
	},

	tools: [
		'read_call_transcript',
		'check_insurance_eligibility',
		'check_schedule_availability',
		'get_referral_source',
	],

	task: `Evaluate this new patient inquiry and recommend next steps:

1. **Lead Quality Score** (1-10):
   Factors:
   - Insurance type (PPO > HMO > Medicaid > None)
   - Procedure interest (implants/cosmetic > emergency > cleaning)
   - Urgency level
   - Referral source quality
   - Geographic proximity (if mentioned)

2. **Caller Profile**:
   - What are they looking for?
   - Any specific concerns or requirements?
   - Insurance mentioned?
   - Urgency level?

3. **Recommended Action**:
   - Priority level (VIP callback / standard callback / automated follow-up)
   - Best time slots to offer
   - Which provider would be best fit?
   - Any prep needed before appointment?

4. **Notes for Front Desk**:
   - Key talking points for callback
   - Questions to ask
   - Potential objections and responses

Focus on converting high-quality leads quickly.`,

	output: {
		requiresApproval: false,
		actions: ['assign_lead_score', 'add_to_callback_queue', 'send_new_patient_packet'],
	},
});

// =============================================================================
// COLLECTIONS ANALYZER
// =============================================================================

export const collectionsAnalyzer = defineAgent({
	name: 'collections-analyzer',
	description: 'Analyze aging receivables and recommend collection strategies',

	trigger: (item) => {
		// Triggered weekly or on demand
		return false; // Manual trigger only
	},

	tools: [
		'get_ar_aging_report',
		'get_patient_payment_history',
		'get_insurance_status',
		'check_patient_contact_info',
	],

	task: `Analyze accounts receivable and recommend collection actions:

1. **AR Overview**:
   - Total outstanding by age bucket (current, 30, 60, 90+)
   - Breakdown by insurance vs. patient portion
   - Trends vs. last month

2. **Priority Accounts**:
   For accounts over $200 and 30+ days:
   - Patient name and balance
   - Age of oldest charge
   - Payment history (good payer vs. chronic)
   - Insurance portion vs. patient portion
   - Last contact attempt
   
3. **Recommended Actions**:
   Categorize accounts:
   - **Call immediately**: Large balance, historically good payer
   - **Payment plan offer**: Large balance, may need flexibility
   - **Final notice**: Multiple attempts, no response
   - **Write-off candidate**: Uncollectable, document why
   - **Insurance follow-up**: Insurance portion outstanding
   
4. **Scripts/Templates**:
   For top 5 priority accounts, draft brief talking points or message templates.

5. **Process Improvements**:
   Any patterns suggesting we should change our billing process?

Focus on collectability and patient relationship preservation.`,

	output: {
		requiresApproval: true,
		actions: ['create_collection_tasks', 'send_statements', 'flag_for_writeoff'],
	},
});

// =============================================================================
// EXPORT ALL
// =============================================================================

export const dentalAgents = [
	missedCallAnalyzer,
	treatmentPlanPrep,
	insuranceAppealDrafter,
	scheduleOptimizer,
	reviewResponseDrafter,
	newPatientIntakeScorer,
	collectionsAnalyzer,
];
