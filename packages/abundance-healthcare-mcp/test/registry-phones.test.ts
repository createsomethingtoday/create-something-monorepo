import test from 'node:test';
import assert from 'node:assert/strict';
import { readRegistryPhones } from '../src/registry-phones.js';

test('approved individual registry phone evidence keeps the role and excludes addresses and other records', async () => {
  const npi = '1234567890';
  const result = await readRegistryPhones(npi, async (url) => {
    assert.equal(String(url), 'https://npiregistry.cms.hhs.gov/api/?version=2.1&number=1234567890');
    return Response.json({
      results: [
        { number: '1234567891', enumeration_type: 'NPI-1' },
        {
          number: npi,
          enumeration_type: 'NPI-1',
          basic: { last_updated: '2026-01-01' },
          addresses: [
            {
              address_purpose: 'MAILING',
              address_1: 'Private fixture',
              telephone_number: '202-555-0100'
            },
            { address_purpose: 'LOCATION', fax_number: '202-555-0101' }
          ],
          practiceLocations: [{ telephone_number: '202-555-0102' }]
        }
      ]
    });
  });
  assert.deepEqual(result, {
    status: 'available',
    provider_updated_at: '2026-01-01',
    phones: [
      { number: '202-555-0100', role: 'mailing' },
      { number: '202-555-0101', role: 'practice fax' },
      { number: '202-555-0102', role: 'practice' }
    ]
  });
  await assert.rejects(
    readRegistryPhones(npi, async () => Response.json({ results: [] })),
    /matching individual/
  );
});
