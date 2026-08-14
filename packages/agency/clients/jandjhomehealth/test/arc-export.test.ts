import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppReviewArcDocument } from '@create-something/arc/model';
import { renderArcJsonExport, renderArcPdfExport, renderArcWebExport } from '../src/lib/server/arc-export';

const receipt = {
  id: 'arc-receipt-test', arcId: 'app-review-governance', revision: 1,
  action: 'seed' as const, actor: 'test', status: 'recorded' as const,
  evidence: 'Test evidence.', createdAt: '2026-08-14T12:00:00.000Z'
};

test('Arc exports retain route, revision, and receipt identity', () => {
  const document = createAppReviewArcDocument('2026-08-14T12:00:00.000Z');
  const web = renderArcWebExport(document, 'app-review-governance-playbook', receipt);
  const json = renderArcJsonExport(document, 'app-review-governance-runbook', receipt);
  const pdf = new TextDecoder().decode(renderArcPdfExport(document, 'app-review-governance-arc', receipt));

  assert.match(web, /<!doctype html>/);
  assert.match(web, /data-receipt-id="arc-receipt-test"/);
  assert.doesNotMatch(web, /<script|stylesheet/);
  assert.equal(json.identity.revision, 1);
  assert.equal(json.identity.routeId, 'app-review-governance-runbook');
  assert.equal(json.identity.receiptId, receipt.id);
  assert.match(pdf, /^%PDF-1\.4/);
  assert.match(pdf, /arc-receipt-test/);
  assert.match(pdf, /%%EOF$/);
});
