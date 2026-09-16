-- Cached address-range geocodes. A source hash mismatch invalidates the match.
CREATE TABLE IF NOT EXISTS abundance_healthcare_geocodes (
 provider_npi TEXT PRIMARY KEY,
 source_payload_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('matched','unmatched')),
 latitude REAL, longitude REAL, unit_x REAL, unit_y REAL, unit_z REAL,
 matched_address TEXT,
 source TEXT NOT NULL DEFAULT 'us_census_public_ar_current',
 precision TEXT NOT NULL DEFAULT 'address_range_interpolated',
 fetched_at TEXT NOT NULL,
 CHECK(status != 'matched' OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND unit_x IS NOT NULL AND unit_y IS NOT NULL AND unit_z IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_abundance_geocodes_location ON abundance_healthcare_geocodes(status, latitude, longitude);
