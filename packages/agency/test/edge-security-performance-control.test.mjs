import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function read(relativePath) {
	return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('Control offers an approval-gated edge security and performance module', () => {
	const contract = read('../content/sales/control-commercial-interface-spec.yaml');
	const buyerBrief = read('../content/sales/control-buyer-brief-ops-revops.md');
	const servicesRoute = read('../src/routes/services/+page.svelte');

	assert.match(contract, /edge_security_performance_control:/);
	assert.match(contract, /public_name: "Edge Security & Performance Control"/);
	assert.match(contract, /waf_policy_and_managed_rules/);
	assert.match(contract, /rate_limit_policy/);
	assert.match(contract, /cache_analytics_review/);
	assert.match(contract, /approved_change_with_rollback/);
	assert.match(contract, /super_bot_fight_mode: "not_blanket_default"/);
	assert.match(contract, /mirage: "not_offered_deprecated"/);
	assert.match(contract, /cloudflare_plan_and_add_on_charges/);

	assert.match(buyerBrief, /WAF and bot policy/);
	assert.match(buyerBrief, /approved change plan and rollback/i);
	assert.match(servicesRoute, /Does Control include WAF\?/);
	assert.match(servicesRoute, /not a twenty-four-seven security operations center/i);
});

test('the .agency hardening guide keeps agent discovery available and turns WAF on from evidence', () => {
	const guide = read('../../../docs/guides/CLOUDFLARE_BOT_ACCESS_HARDENING.md');

	assert.match(guide, /2026-08-12 Pro baseline/);
	assert.match(guide, /0 custom\s+rules, 0 rate limiting rules, and 0 managed rules/i);
	assert.match(guide, /do not use Super Bot Fight Mode as a blanket default/i);
	assert.match(guide, /Mirage is deprecated and is not a delivery item/i);
	assert.match(guide, /Security Events and Cache Analytics/i);
	assert.match(guide, /approved change plan and rollback/i);
});
