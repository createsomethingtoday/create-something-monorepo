import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateRegistryTravel } from '../src/index.ts';
test('travel tool pins export to the saved report and never includes a credential', async () => {
  const result = await estimateRegistryTravel(
    {
      npis: ['1000000001'],
      clinics: [{ id: 'albany', address: '12 Main St, Albany, NY' }],
      max_minutes: 45,
      clinic_match: 'any'
    },
    {
      agencyApiKey: 'secret',
      fetchFn: async (url, init) => {
        assert.equal(new URL(String(url)).pathname, '/api/abundance/healthcare-providers/travel');
        assert.equal(init?.method, 'POST');
        assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer secret');
        return Response.json({
          success: true,
          data: {
            id: 'abtravel_12345678-1234-1234-1234-123456789012',
            results: [{ npi: '1000000001', match: 'within_limit' }]
          }
        });
      }
    }
  );
  assert.equal(
    new URL(result.csv_download_url).searchParams.get('id'),
    'abtravel_12345678-1234-1234-1234-123456789012'
  );
  assert.equal(JSON.stringify(result).includes('secret'), false);
});
