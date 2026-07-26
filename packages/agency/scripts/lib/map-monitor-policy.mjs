export const MAP_MONITOR_POLICY = Object.freeze({
	schemaVersion: 1,
	owner: {
		name: 'Micah Johnson',
		linearIssue: 'CRE-1289',
		escalation: 'CREATE SOMETHING operator'
	},
	cadenceMinutes: 15,
	slos: {
		availability: {
			target: 0.999,
			windowDays: 30,
			definition: 'Production /map returns 200 and renders the public canvas at desktop and mobile viewports.'
		},
		bookingContextConsistency: {
			target: 1,
			windowDays: 30,
			definition: 'Visible session, readiness, and score match the booking URL after starter load, edit, restore, and reset.'
		},
		mappingAgentBoundary: {
			target: 1,
			windowDays: 30,
			definition: 'Credential-free GET remains non-mutating and malformed POST is rejected before an agent or D1 write.'
		}
	},
	synthetic: {
		label: 'map-production-synthetic',
		customerDataAllowed: false,
		agentMutationAllowed: false,
		bookingSubmissionAllowed: false,
		receiptRetentionDays: 30
	},
	alert: {
		consecutiveFailures: 2,
		route: 'GitHub Actions failed scheduled run, then CRE-1289 operator escalation',
		severity: 'SEV-2 when booking context mismatches; SEV-3 for a single availability failure'
	}
});

export function evaluateMapSyntheticReceipts(receipts) {
	const failures = receipts.flatMap((receipt) =>
		(receipt.checks ?? [])
			.filter((check) => !check.ok)
			.map((check) => ({ viewport: receipt.viewport, id: check.id, detail: check.detail ?? null }))
	);
	const ok = receipts.length > 0 && receipts.every((receipt) => receipt.ok) && failures.length === 0;
	return {
		schema_version: 1,
		evaluated_at: new Date().toISOString(),
		ok,
		policy: MAP_MONITOR_POLICY,
		receipts,
		failures,
		alert: ok
			? null
			: {
				owner: MAP_MONITOR_POLICY.owner.name,
				linear_issue: MAP_MONITOR_POLICY.owner.linearIssue,
				summary: failures.length
					? `Map synthetic failures: ${failures.map((failure) => failure.id).join(', ')}`
					: 'Map synthetic produced no passing receipt',
				customer_data_affected: false,
				route: MAP_MONITOR_POLICY.alert.route
			}
	};
}
