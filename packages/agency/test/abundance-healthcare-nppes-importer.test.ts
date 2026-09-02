import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';

const importerPath = resolve(process.cwd(), '../../scripts/sync-nppes-family-np.py');

test('NPPES dissemination dates are normalized before nationwide ingestion', () => {
	const program = String.raw`
import importlib.util
import json
import sys

spec = importlib.util.spec_from_file_location("sync_nppes_family_np", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

row = {
    "NPI": "1234567890",
    "Entity Type Code": "1",
    "Provider First Name": "JANE",
    "Provider Last Name (Legal Name)": "DOE",
    "Provider Enumeration Date": "01/15/2010",
    "Last Update Date": "09/02/2026",
    "Certification Date": "08/31/2026",
    "Healthcare Provider Taxonomy Code_1": "363LF0000X",
    "Healthcare Provider Primary Taxonomy Switch_1": "Y",
}
provider, removal = module.provider_from_row(row, "2026-09-02T00:00:00Z")
row["NPI Deactivation Date"] = "09/01/2026"
row["NPI Reactivation Date"] = "08/01/2026"
redeactivated, _ = module.provider_from_row(row, "2026-09-02T00:00:00Z")
row["NPI Reactivation Date"] = "09/02/2026"
reactivated, _ = module.provider_from_row(row, "2026-09-02T00:00:00Z")

import zipfile
member = zipfile.ZipInfo("npidata.csv", date_time=(2026, 8, 31, 3, 6, 0))
print(json.dumps({
    "provider": provider,
    "removal": removal,
    "redeactivated_status": redeactivated["status"],
    "reactivated_status": reactivated["status"],
    "source_published_at": module.zip_member_published_at(member),
}))
`;
	const output = execFileSync('python3', ['-c', program, importerPath], {
		encoding: 'utf8'
	});
	const result = JSON.parse(output);

	assert.equal(result.removal, null);
	assert.equal(result.provider.enumeration_date, '2010-01-15');
	assert.equal(result.provider.last_updated_date, '2026-09-02');
	assert.equal(result.provider.certification_date, '2026-08-31');
	assert.equal(result.redeactivated_status, 'deactivated');
	assert.equal(result.reactivated_status, 'active');
	assert.equal(result.source_published_at, '2026-08-31T03:06:00Z');
});
