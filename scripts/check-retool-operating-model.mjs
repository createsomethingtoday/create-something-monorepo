#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve('config/retool/operating-model.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const requiredFields = [
  'source',
  'marked_slots',
  'cursor',
  'timestamp',
  'device_id',
  'battery',
  'suggested_review_lane',
  'blocked_actions'
];

const requiredBlockedActions = [
  'expand_into_config',
  'mutate_client_metadata',
  'create_client_work',
  'change_code_or_production',
  'rotate_or_write_secrets',
  'change_permissions'
];

const requiredForbiddenFields = [
  'client_name',
  'task_text',
  'business_context',
  'secret',
  'approval_note',
  'permission_change',
  'code_change'
];

const failures = [];

function requireEqual(label, actual, expected) {
  if (actual !== expected) failures.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

function requireArrayContains(label, actual, expected) {
  if (!Array.isArray(actual)) {
    failures.push(`${label}: expected array`);
    return;
  }
  for (const value of expected) {
    if (!actual.includes(value)) failures.push(`${label}: missing ${value}`);
  }
}

requireEqual('source.import_path', manifest.source?.import_path, '/ink/operator-event');
requireEqual('source.event_type', manifest.source?.event_type, 'offline_decision_garden');
requireEqual('boundaries.human_approval_required', manifest.boundaries?.human_approval_required, true);
requireEqual('boundaries.autonomous_expansion_allowed', manifest.boundaries?.autonomous_expansion_allowed, false);
requireEqual('boundaries.firmware_stores_sensitive_text', manifest.boundaries?.firmware_stores_sensitive_text, false);
requireArrayContains('review_packet.fields', manifest.review_packet?.fields, requiredFields);
requireArrayContains('review_packet.blocked_actions', manifest.review_packet?.blocked_actions, requiredBlockedActions);
requireArrayContains('boundaries.forbidden_packet_fields', manifest.boundaries?.forbidden_packet_fields, requiredForbiddenFields);

const localState = manifest.boundaries?.firmware_allowed_local_state ?? [];
requireArrayContains('boundaries.firmware_allowed_local_state', localState, [
  'decision_garden_marked_slot_count',
  'decision_garden_cursor'
]);

if (failures.length > 0) {
  console.error(`Retool operating model check failed for ${manifestPath}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Retool operating model check passed: ${manifestPath}`);
