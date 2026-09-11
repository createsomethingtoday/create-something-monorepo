-- Preserve geocodes for every retained provider snapshot.
CREATE TABLE abundance_healthcare_geocodes_versioned (
 provider_npi TEXT NOT NULL,
 source_payload_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('matched','unmatched')),
 latitude REAL, longitude REAL, unit_x REAL, unit_y REAL, unit_z REAL,
 matched_address TEXT,
 source TEXT NOT NULL DEFAULT 'us_census_public_ar_current',
 precision TEXT NOT NULL DEFAULT 'address_range_interpolated',
 fetched_at TEXT NOT NULL,
 PRIMARY KEY(provider_npi, source_payload_hash),
 CHECK(status != 'matched' OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND unit_x IS NOT NULL AND unit_y IS NOT NULL AND unit_z IS NOT NULL))
);
INSERT INTO abundance_healthcare_geocodes_versioned SELECT * FROM abundance_healthcare_geocodes;
DROP TABLE abundance_healthcare_geocodes;
ALTER TABLE abundance_healthcare_geocodes_versioned RENAME TO abundance_healthcare_geocodes;
CREATE INDEX idx_abundance_geocodes_location ON abundance_healthcare_geocodes(status, latitude, longitude);
