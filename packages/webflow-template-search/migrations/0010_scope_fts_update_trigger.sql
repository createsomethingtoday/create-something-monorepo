DROP TRIGGER IF EXISTS template_documents_au;

CREATE TRIGGER template_documents_au
AFTER UPDATE OF
  id,
  name,
  description_short,
  description_long_text,
  category_groups_text,
  child_categories_text,
  styles_text,
  tags_text
ON template_documents
WHEN old.id IS NOT new.id
  OR old.name IS NOT new.name
  OR old.description_short IS NOT new.description_short
  OR old.description_long_text IS NOT new.description_long_text
  OR old.category_groups_text IS NOT new.category_groups_text
  OR old.child_categories_text IS NOT new.child_categories_text
  OR old.styles_text IS NOT new.styles_text
  OR old.tags_text IS NOT new.tags_text
BEGIN
  DELETE FROM template_documents_fts WHERE template_document_id = old.id;
  INSERT INTO template_documents_fts (
    template_document_id,
    name,
    description_short,
    description_long_text,
    category_groups_text,
    child_categories_text,
    styles_text,
    tags_text
  ) VALUES (
    new.id,
    new.name,
    new.description_short,
    new.description_long_text,
    new.category_groups_text,
    new.child_categories_text,
    new.styles_text,
    new.tags_text
  );
END;
