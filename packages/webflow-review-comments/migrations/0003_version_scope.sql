-- Each review program (templates, apps) calls with its own reviewer key. A key
-- may carry a scope; the thread a scoped key opens keeps that scope, and other
-- scoped keys cannot read or change it. Unscoped callers (the creator surface)
-- reach every thread, as before.
--
-- Threads that exist before this migration get no scope, and a scoped key
-- cannot reach them. No deployed database holds rows yet. If one ever does,
-- set `scope` on its rows for each review program before the keys get a scope.
ALTER TABLE review_versions ADD COLUMN scope TEXT;
