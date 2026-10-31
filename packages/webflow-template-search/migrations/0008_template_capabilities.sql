-- Template capability data sourced from the Webflow Templates CMS collection.
-- features_json: JSON array of feature names from the CMS `features`
-- multi-reference (closed ~20-item vocabulary, e.g. "Ecommerce", "Memberships").
-- The has_*/is_* switches mirror the CMS capability toggles.
ALTER TABLE template_documents ADD COLUMN features_json TEXT;
ALTER TABLE template_documents ADD COLUMN has_cms INTEGER;
ALTER TABLE template_documents ADD COLUMN has_ecommerce INTEGER;
ALTER TABLE template_documents ADD COLUMN has_membership INTEGER;
ALTER TABLE template_documents ADD COLUMN has_multiple_layouts INTEGER;
ALTER TABLE template_documents ADD COLUMN is_ui_kit INTEGER;
