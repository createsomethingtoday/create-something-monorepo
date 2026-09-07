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
row["Entity Type Code"] = "2"
organization, organization_removal = module.provider_from_row(row, "2026-09-02T00:00:00Z")
row["Entity Type Code"] = "1"
row["NPI Deactivation Date"] = "09/01/2026"
row["NPI Reactivation Date"] = "08/01/2026"
redeactivated, _ = module.provider_from_row(row, "2026-09-02T00:00:00Z")
row["NPI Reactivation Date"] = "09/02/2026"
reactivated, _ = module.provider_from_row(row, "2026-09-02T00:00:00Z")

import zipfile
member = zipfile.ZipInfo("npidata.csv", date_time=(2026, 8, 31, 3, 6, 0))
weekly_urls = [
    "https://download.cms.gov/nppes/NPPES_Data_Dissemination_080326_080926_Weekly_V2.zip",
    "https://download.cms.gov/nppes/NPPES_Data_Dissemination_081026_081626_Weekly_V2.zip",
    "https://download.cms.gov/nppes/NPPES_Data_Dissemination_081726_082326_Weekly_V2.zip",
]
filtered_weeklies = module.filter_weeklies_after_full_snapshot(weekly_urls, [{
    "source_kind": "monthly_full",
    "source_published_at": "2026-08-10T03:06:00Z",
}])
cross_year_weeklies = module.sort_weekly_urls([
    "https://download.cms.gov/nppes/NPPES_Data_Dissemination_010427_011027_Weekly_V2.zip",
    "https://download.cms.gov/nppes/NPPES_Data_Dissemination_122126_122726_Weekly_V2.zip",
])
print(json.dumps({
	"request_user_agent": module.REQUEST_USER_AGENT,
    "provider": provider,
    "removal": removal,
    "redeactivated_status": redeactivated["status"],
    "reactivated_status": reactivated["status"],
    "source_published_at": module.zip_member_published_at(member),
    "organization": organization,
    "organization_removal": organization_removal,
    "filtered_weeklies": filtered_weeklies,
    "cross_year_weeklies": cross_year_weeklies,
}))
`;
	const output = execFileSync('python3', ['-c', program, importerPath], {
		encoding: 'utf8'
	});
	const result = JSON.parse(output);

	assert.equal(result.request_user_agent, 'CREATE-SOMETHING-NPPES-Sync/1.0');
	assert.equal(result.removal, null);
	assert.equal(result.provider.enumeration_date, '2010-01-15');
	assert.equal(result.provider.last_updated_date, '2026-09-02');
	assert.equal(result.provider.certification_date, '2026-08-31');
	assert.equal(result.redeactivated_status, 'deactivated');
	assert.equal(result.reactivated_status, 'active');
	assert.equal(result.source_published_at, '2026-08-31T03:06:00Z');
	assert.equal(result.organization, null);
	assert.equal(result.organization_removal, '1234567890');
	assert.deepEqual(result.filtered_weeklies, [
		'https://download.cms.gov/nppes/NPPES_Data_Dissemination_081026_081626_Weekly_V2.zip',
		'https://download.cms.gov/nppes/NPPES_Data_Dissemination_081726_082326_Weekly_V2.zip'
	]);
	assert.match(result.cross_year_weeklies[0], /122126_122726/);
	assert.match(result.cross_year_weeklies[1], /010427_011027/);
});
