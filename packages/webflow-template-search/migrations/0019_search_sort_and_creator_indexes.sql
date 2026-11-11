-- Sorted searches and creator pages read the whole table (CRE-2401).
--
-- Every sort in sortClause (src/search.ts) orders by COALESCE(...) expressions, so the plain
-- column indexes from 0001 cannot serve it: each sorted page scanned all rows and sorted them
-- in a temp B-tree. These two indexes repeat the newest and popular ORDER BY term for term, so
-- a sorted page is an index walk that stops at LIMIT.
--
-- The creator filter matches a slug OR a normalized profile URL. The slug has an index and
-- the URL expression did not, so the OR forced a scan. With both indexed, a creator query
-- reads only that creator's rows.
--
-- An index expression must match the query expression exactly. test/search-indexes.test.ts
-- fails when they drift apart.
CREATE INDEX IF NOT EXISTS idx_template_documents_sort_newest
  ON template_documents (COALESCE(published_date, '') DESC, COALESCE(popularity_score, 0) DESC, id ASC);

CREATE INDEX IF NOT EXISTS idx_template_documents_sort_popular
  ON template_documents (COALESCE(popularity_score, 0) DESC, COALESCE(cumulative_purchases, 0) DESC, COALESCE(unique_viewers, 0) DESC, COALESCE(published_date, '') DESC, id ASC);

CREATE INDEX IF NOT EXISTS idx_template_documents_creator_profile_url_key
  ON template_documents (lower(rtrim(creator_profile_url, '/')));
