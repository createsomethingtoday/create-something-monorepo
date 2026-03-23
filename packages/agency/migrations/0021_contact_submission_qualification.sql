ALTER TABLE contact_submissions ADD COLUMN role TEXT;
ALTER TABLE contact_submissions ADD COLUMN primary_workflow TEXT;
ALTER TABLE contact_submissions ADD COLUMN current_stack TEXT;
ALTER TABLE contact_submissions ADD COLUMN workflow_lane TEXT;
ALTER TABLE contact_submissions ADD COLUMN risk_level TEXT;
ALTER TABLE contact_submissions ADD COLUMN desired_next_step TEXT;
ALTER TABLE contact_submissions ADD COLUMN recommended_next_step TEXT;
ALTER TABLE contact_submissions ADD COLUMN timeline TEXT;
