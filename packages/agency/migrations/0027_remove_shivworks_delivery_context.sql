-- Preservation gate: the ShivWorks context still exists in production and its
-- removal has no recorded owning approval. Keep this historical migration name
-- as a non-destructive no-op so later Agency migrations can proceed normally.
-- Any future removal must use a new explicitly approved migration with backup,
-- replacement readback, and rollback evidence tracked in CRE-1317.
SELECT 1;
