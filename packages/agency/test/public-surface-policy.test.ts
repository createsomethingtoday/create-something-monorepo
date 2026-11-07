import assert from 'node:assert/strict';
import test from 'node:test';
import { marketingPagePortfolio } from '../src/lib/data/marketingPages';
import { AGENCY_WEBFLOW_PORTFOLIO_PATHS, isAgencyWebflowPortfolioPath } from '../src/lib/atlas/surface-policy';
import { usesAgencyMeasuredPublicSurface, usesAgencyOperatorPalette } from '../src/lib/data/publicSurfacePolicy';

test('every current portfolio page owns the operator palette, including workflow details', () => {
  for (const entry of marketingPagePortfolio) {
    assert.equal(usesAgencyOperatorPalette(entry.path), entry.decision !== 'archive', entry.path);
  }
});

test('utility, private, archive and unknown paths fail closed', () => {
  for (const path of ['/account', '/admin/security', '/dashboard', '/login/unknown', '/logout', '/auth/callback', '/mcp-access/tools', '/delivery/abundance', '/prospects', '/prospects/secret', '/map/workspace/123', '/map/workspace/123/handoff/456', '/map/share/123', '/map/subscribe', '/dify', '/dify/unknown', '/workflows/unknown', '/products/unknown', '/unknown']) {
    assert.equal(usesAgencyOperatorPalette(path), false, path);
  }
});

test('customer sign-in explicitly owns the current Agency palette', () => {
  for (const path of ['/login', '/login/', '/login?redirect=/dashboard', '/login?error=expired']) {
    assert.equal(usesAgencyOperatorPalette(path), true, path);
  }
});

test('approved Map entry and public supporting pages retain explicit ownership', () => {
  for (const path of ['/map/workspace', '/support-brief', '/support-brief/?source=agent', '/privacy', '/terms', '/ai-workflow-control', '/ai-workflow-recovery', '/marketplace-review-automation', '/stack/?source=test', '/practice#practice-workbench', '/arcs', '/arc/example', '/arc/app-review-governance', '/experiments', '/experiments/example', '/experiments/release_2026', '/experiments/CaseStudy']) {
    assert.equal(usesAgencyOperatorPalette(path), true, path);
  }
});

test('measured public brand follows the current portfolio while preserving separately owned compositions', () => {
  for (const entry of marketingPagePortfolio) {
    assert.equal(
      usesAgencyMeasuredPublicSurface(entry.path),
      entry.decision !== 'archive' && !isAgencyWebflowPortfolioPath(entry.path),
      entry.path
    );
  }
});

test('measured public brand explicitly includes supporting pages and public catalog routes', () => {
  for (const path of [
    '/privacy', '/terms', '/support-brief', '/ai-workflow-control', '/ai-workflow-recovery',
    '/marketplace-review-automation', '/arcs', '/arc/app-review-governance', '/arc/example',
    '/experiments', '/experiments/example'
  ]) {
    assert.equal(usesAgencyMeasuredPublicSurface(path), true, path);
  }
});

test('measured ownership normalizes query, hash and trailing slashes consistently', () => {
  for (const path of ['/?source=brand', '/services/', '/services///?source=brand#scope', '/products#products', '/privacy/?source=brand', '/arc/example/#details']) {
    assert.equal(usesAgencyMeasuredPublicSurface(path), true, path);
  }
});

test('operator-only, private, utility, archived and unknown pages never acquire measured public chrome', () => {
  for (const path of [
    '/login', '/login/', '/login?redirect=/services', '/login/unknown',
    '/account', '/admin/security', '/dashboard', '/logout', '/auth/callback', '/mcp-access/tools',
    '/delivery/abundance', '/prospects', '/prospects/secret', '/client/example', '/clients/example',
    '/workspace', '/workspace/example', '/api/arcs', '/api/partners/half-dozen/clients/example/init',
    '/map/workspace', '/map/workspace/?source=brand', '/map/workspace/123',
    '/map/workspace/123/handoff/456', '/map/share/123', '/map/subscribe',
    '/dify', '/dify/agent-eval-gates', '/unknown', '/services/unknown', '/products/unknown',
    '/workflows/unknown', '/arc', '/arc/example/nested', '/arcs/example', '/experiments/example/nested'
  ]) {
    assert.equal(usesAgencyMeasuredPublicSurface(path), false, path);
  }
  // These remain approved palette owners despite not owning the public brand.
  assert.equal(usesAgencyOperatorPalette('/login'), true);
  assert.equal(usesAgencyOperatorPalette('/map/workspace'), true);
});

test('all Webflow portfolio compositions retain their independent visual ownership', () => {
  for (const path of AGENCY_WEBFLOW_PORTFOLIO_PATHS) {
    assert.equal(usesAgencyMeasuredPublicSurface(path), false, path);
    assert.equal(usesAgencyMeasuredPublicSurface(`${path}/?source=brand#proof`), false, path);
    assert.equal(usesAgencyOperatorPalette(path), true, path);
  }
});
