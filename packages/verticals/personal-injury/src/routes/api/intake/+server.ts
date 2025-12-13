/**
 * PI Intake API Endpoint
 *
 * Receives personal injury intake form submissions.
 * 1. Runs case screening logic
 * 2. Stores to D1 database (pi_intakes)
 * 3. Triggers WORKWAY webhook → Clio (if qualified)
 * 4. Triggers Slack alert (if hot lead)
 *
 * WORKWAY Workflows:
 * - "pi-intake-to-clio": Creates Clio contact + PI matter
 * - "urgent-case-alert": Slack notification for hot leads
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { siteConfig } from '$lib/config/site';
import type { InjurySeverity } from '$lib/config/site';

interface PIIntakeSubmission {
	// Contact
	name: string;
	email: string;
	phone: string;
	bestTimeToCall?: 'morning' | 'afternoon' | 'evening' | 'anytime';

	// Accident
	accidentType: string;
	accidentDate: string;
	accidentLocation?: string;
	accidentDescription?: string;

	// Fault
	atFaultParty: 'yes' | 'no' | 'unsure';
	policeReportFiled?: boolean;

	// Injuries
	injurySeverity: InjurySeverity;
	injuryDescription?: string;
	receivedTreatment?: boolean;
	ongoingTreatment?: boolean;
}

interface ScreeningResult {
	score: number;
	result: 'qualified' | 'review' | 'declined';
	isHotLead: boolean;
	reasons: string[];
	breakdown: {
		atFaultScore: number;
		severityScore: number;
		accidentTypeScore: number;
		statuteScore: number;
	};
}

/**
 * Case Screening Logic
 *
 * Scoring breakdown:
 * - At-fault party: 0-25 points
 * - Injury severity: 0-35 points
 * - Accident type: 0-20 points
 * - Statute of limitations: 0-20 points
 *
 * Results:
 * - >= 70: Qualified
 * - 40-69: Review
 * - < 40: Declined
 *
 * Hot lead triggers:
 * - Severity >= severe
 * - Accident type in [truck-accident, wrongful-death]
 */
function screenCase(intake: PIIntakeSubmission): ScreeningResult {
	const reasons: string[] = [];
	let atFaultScore = 0;
	let severityScore = 0;
	let accidentTypeScore = 0;
	let statuteScore = 0;

	// At-fault party scoring
	if (intake.atFaultParty === 'yes') {
		atFaultScore = 25;
		reasons.push('+25: Clear at-fault party identified');
	} else if (intake.atFaultParty === 'unsure') {
		atFaultScore = 15;
		reasons.push('+15: Liability unclear - needs investigation');
	} else {
		atFaultScore = 0;
		reasons.push('+0: Client at fault - limited recovery potential');
	}

	// Injury severity scoring
	const severityScores: Record<InjurySeverity, number> = {
		minor: 5,
		moderate: 15,
		serious: 25,
		severe: 32,
		catastrophic: 35
	};
	severityScore = severityScores[intake.injurySeverity] || 0;
	reasons.push(`+${severityScore}: ${intake.injurySeverity} injuries`);

	// Accident type scoring
	const highValueTypes = ['truck-accident', 'wrongful-death', 'medical-malpractice'];
	const mediumValueTypes = ['car-accident', 'motorcycle-accident'];

	if (highValueTypes.includes(intake.accidentType)) {
		accidentTypeScore = 20;
		reasons.push('+20: High-value case type');
	} else if (mediumValueTypes.includes(intake.accidentType)) {
		accidentTypeScore = 15;
		reasons.push('+15: Standard case type');
	} else {
		accidentTypeScore = 10;
		reasons.push('+10: Other case type');
	}

	// Statute of limitations check
	const accidentDate = new Date(intake.accidentDate);
	const now = new Date();
	const daysSinceAccident = Math.floor((now.getTime() - accidentDate.getTime()) / (1000 * 60 * 60 * 24));
	const yearsSinceAccident = daysSinceAccident / 365;

	if (yearsSinceAccident < 1) {
		statuteScore = 20;
		reasons.push('+20: Recent accident - well within statute');
	} else if (yearsSinceAccident < 2) {
		statuteScore = 15;
		reasons.push('+15: Within typical statute window');
	} else if (yearsSinceAccident < 3) {
		statuteScore = 5;
		reasons.push('+5: Approaching statute - urgent evaluation needed');
	} else {
		statuteScore = 0;
		reasons.push('+0: May be past statute of limitations');
	}

	// Calculate total score
	const totalScore = atFaultScore + severityScore + accidentTypeScore + statuteScore;

	// Determine result
	let result: 'qualified' | 'review' | 'declined';
	if (totalScore >= 70) {
		result = 'qualified';
	} else if (totalScore >= 40) {
		result = 'review';
	} else {
		result = 'declined';
	}

	// Hot lead detection
	const hotLeadSeverities: InjurySeverity[] = ['severe', 'catastrophic'];
	const hotLeadTypes = ['truck-accident', 'wrongful-death'];
	const isHotLead =
		hotLeadSeverities.includes(intake.injurySeverity) ||
		hotLeadTypes.includes(intake.accidentType);

	return {
		score: totalScore,
		result,
		isHotLead,
		reasons,
		breakdown: {
			atFaultScore,
			severityScore,
			accidentTypeScore,
			statuteScore
		}
	};
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body: PIIntakeSubmission = await request.json();

		// Validate required fields
		if (!body.name || body.name.trim().length < 2) {
			throw error(400, 'Name is required');
		}

		if (!body.email || !body.email.includes('@')) {
			throw error(400, 'Valid email is required');
		}

		if (!body.phone) {
			throw error(400, 'Phone number is required');
		}

		if (!body.accidentType) {
			throw error(400, 'Accident type is required');
		}

		if (!body.accidentDate) {
			throw error(400, 'Accident date is required');
		}

		if (!body.atFaultParty) {
			throw error(400, 'Fault information is required');
		}

		if (!body.injurySeverity) {
			throw error(400, 'Injury severity is required');
		}

		const timestamp = new Date().toISOString();

		// 1. Run case screening
		const screening = screenCase(body);
		console.log('[PI Intake] Screening result:', {
			score: screening.score,
			result: screening.result,
			isHotLead: screening.isHotLead
		});

		let intakeId: number | null = null;

		// 2. Store to D1 database (pi_intakes)
		if (platform?.env?.DB) {
			try {
				const result = await platform.env.DB.prepare(`
					INSERT INTO pi_intakes (
						name, email, phone, best_time_to_call,
						accident_type, accident_date, accident_location, accident_description,
						at_fault_party, police_report_filed,
						injury_severity, injury_description, received_treatment, ongoing_treatment,
						screening_score, screening_result, is_hot_lead, screening_reasons,
						status, created_at
					)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`)
					.bind(
						body.name.trim(),
						body.email.trim().toLowerCase(),
						body.phone.trim(),
						body.bestTimeToCall || 'anytime',
						body.accidentType,
						body.accidentDate,
						body.accidentLocation?.trim() || null,
						body.accidentDescription?.trim() || null,
						body.atFaultParty,
						body.policeReportFiled ? 1 : 0,
						body.injurySeverity,
						body.injuryDescription?.trim() || null,
						body.receivedTreatment ? 1 : 0,
						body.ongoingTreatment ? 1 : 0,
						screening.score,
						screening.result,
						screening.isHotLead ? 1 : 0,
						JSON.stringify(screening.reasons),
						screening.result === 'qualified' ? 'qualified' : 'screening',
						timestamp
					)
					.run();

				intakeId = result.meta?.last_row_id ?? null;

				// Store screening log
				await platform.env.DB.prepare(`
					INSERT INTO screening_log (
						intake_id, at_fault_score, severity_score, accident_type_score, statute_score,
						total_score, result, is_hot_lead, reasons, created_at
					)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`)
					.bind(
						intakeId,
						screening.breakdown.atFaultScore,
						screening.breakdown.severityScore,
						screening.breakdown.accidentTypeScore,
						screening.breakdown.statuteScore,
						screening.score,
						screening.result,
						screening.isHotLead ? 1 : 0,
						JSON.stringify(screening.reasons),
						timestamp
					)
					.run();

				console.log('[PI Intake] Stored to D1', { intakeId, email: body.email });
			} catch (dbError) {
				console.error('[PI Intake] D1 error:', dbError);
				// Continue without D1 - don't fail the submission
			}
		}

		// 3. Trigger WORKWAY webhook → Clio (if qualified)
		if (screening.result === 'qualified') {
			const webhookUrl = siteConfig.workflows?.clioIntakeWebhook;

			if (webhookUrl && webhookUrl.trim() !== '') {
				try {
					const workflowPayload = {
						contact: {
							name: body.name.trim(),
							email: body.email.trim().toLowerCase(),
							phone: body.phone.trim()
						},
						matter: {
							practice_area: 'Personal Injury',
							case_type: body.accidentType,
							description: `Accident: ${body.accidentType}\nDate: ${body.accidentDate}\nSeverity: ${body.injurySeverity}\n\n${body.accidentDescription || ''}`,
							screening_score: screening.score,
							is_hot_lead: screening.isHotLead
						},
						source: siteConfig.url,
						timestamp
					};

					const webhookResponse = await fetch(webhookUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'User-Agent': 'CREATE-SOMETHING-PI-Template/1.0'
						},
						body: JSON.stringify(workflowPayload)
					});

					// Log workflow result
					if (platform?.env?.DB && intakeId) {
						await platform.env.DB.prepare(`
							INSERT INTO workflow_logs (
								intake_id, workflow_name, status, request_payload, response_payload, triggered_at, completed_at
							)
							VALUES (?, ?, ?, ?, ?, ?, ?)
						`)
							.bind(
								intakeId,
								'pi-intake-to-clio',
								webhookResponse.ok ? 'success' : 'failed',
								JSON.stringify(workflowPayload),
								await webhookResponse.text(),
								timestamp,
								new Date().toISOString()
							)
							.run();
					}

					console.log('[PI Intake] WORKWAY Clio webhook triggered:', webhookResponse.ok);
				} catch (webhookError) {
					console.error('[PI Intake] WORKWAY Clio webhook error:', webhookError);
				}
			}
		}

		// 4. Trigger Slack alert (if hot lead)
		if (screening.isHotLead) {
			const slackWebhook = siteConfig.workflows?.slackUrgentChannel;

			if (slackWebhook && slackWebhook.trim() !== '') {
				try {
					const slackPayload = {
						text: `🔥 *HOT LEAD* - ${body.name}`,
						blocks: [
							{
								type: 'section',
								text: {
									type: 'mrkdwn',
									text: `*🔥 HOT LEAD - Urgent Case*\n\n*Name:* ${body.name}\n*Phone:* ${body.phone}\n*Email:* ${body.email}\n\n*Accident:* ${body.accidentType}\n*Date:* ${body.accidentDate}\n*Severity:* ${body.injurySeverity.toUpperCase()}\n\n*Screening Score:* ${screening.score}/100`
								}
							},
							{
								type: 'actions',
								elements: [
									{
										type: 'button',
										text: { type: 'plain_text', text: `Call ${body.phone}` },
										url: `tel:${body.phone.replace(/[^0-9+]/g, '')}`
									}
								]
							}
						]
					};

					await fetch(slackWebhook, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(slackPayload)
					});

					// Log workflow
					if (platform?.env?.DB && intakeId) {
						await platform.env.DB.prepare(`
							INSERT INTO workflow_logs (intake_id, workflow_name, status, request_payload, triggered_at)
							VALUES (?, ?, ?, ?, ?)
						`)
							.bind(
								intakeId,
								'urgent-case-alert',
								'success',
								JSON.stringify(slackPayload),
								timestamp
							)
							.run();
					}

					console.log('[PI Intake] Slack hot lead alert sent');
				} catch (slackError) {
					console.error('[PI Intake] Slack alert error:', slackError);
				}
			}
		}

		return json({
			success: true,
			message: screening.result === 'qualified'
				? 'Thank you! Your case qualifies for a free review. We will contact you within 24 hours—often much sooner for urgent cases.'
				: 'Thank you for reaching out. An attorney will review your case and contact you within 24 hours.',
			intakeId,
			screening: {
				result: screening.result,
				isHotLead: screening.isHotLead
			}
		});
	} catch (err) {
		console.error('[PI Intake Error]', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Submission failed. Please try again or call us directly.');
	}
};
