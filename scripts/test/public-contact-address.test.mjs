import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const oldContact = /\b(?!support@)[\w.+-]+@createsomething\.(?:io|agency|ltd|space)\b/g;
function walk(dir) {
  return readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]
  );
}
test('public property UI has one first-party contact destination', () => {
  for (const property of ['agency', 'io', 'ltd', 'space']) {
    for (const file of walk(`packages/${property}/src`).filter(
      (p) => p.endsWith('.svelte') && !p.includes('/admin/')
    )) {
      assert.deepEqual(
        [...read(file).matchAll(oldContact)].map((m) => m[0]),
        [],
        file
      );
    }
  }
  for (const file of [
    'packages/canon/src/lib/newsletter/UnsubscribePage.svelte',
    'packages/canon/src/lib/domains/agency/Terminal.svelte',
    'packages/space/static/webinar-templates/zero-to-cloudflare/README.md'
  ]) {
    assert.doesNotMatch(read(file), oldContact, file);
    assert.match(read(file), /support@createsomething\.io/, file);
  }
});
test('shared legal defaults use the public-only contact constant', () => {
  assert.match(
    read('packages/canon/src/lib/utils/public-contact.ts'),
    /PUBLIC_CONTACT_EMAIL = 'support@createsomething\.io'/
  );
  for (const component of ['PrivacyPolicyContent', 'TermsOfServiceContent'])
    assert.match(
      read(`packages/canon/src/lib/components/${component}.svelte`),
      /contactEmail = PUBLIC_CONTACT_EMAIL/
    );
});
test('both membership FAQs retain the full cancellation promise with the corrected contact', () => {
  const answer =
    'Cancel before your next renewal by emailing support@createsomething.io to stop future membership charges. Support continues through your paid period while we hand over your code and documentation, document open work, and plan the transition. If you need more help afterward, we’ll agree on the scope and price before extending support. Separately scoped projects follow their agreed terms.';
  for (const file of [
    'packages/agency/src/routes/+page.svelte',
    'packages/agency/src/lib/components/MembershipOffer.svelte'
  ])
    assert.ok(read(file).includes(answer), file);
});

test('public trust cards change contact presentation without mutating source routing', async () => {
  const { PUBLIC_MCP_TRUST_CARDS, PUBLIC_AGENT_TRUST_CARDS } =
    await import('../../packages/io/src/lib/config/publicTrustCatalog.ts');
  const { PUBLIC_TRUST_CATALOG } =
    await import('../../packages/io/src/lib/config/publicTrustCatalog.generated.ts');
  const source = [...PUBLIC_TRUST_CATALOG.mcp, ...PUBLIC_TRUST_CATALOG.agents];
  const presented = [...PUBLIC_MCP_TRUST_CARDS, ...PUBLIC_AGENT_TRUST_CARDS];
  source.forEach((card, i) => {
    assert.deepEqual(presented[i], {
      ...card,
      escalation: card.escalation.replace(
        /[\w.+-]+@createsomething\.(?:io|agency|ltd|space)\b/g,
        'support@createsomething.io'
      )
    });
  });
  assert.ok(source.some((card) => card.escalation === 'security@createsomething.io'));
});
