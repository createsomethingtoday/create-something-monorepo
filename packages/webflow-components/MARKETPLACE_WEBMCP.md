# Marketplace WebMCP contract

The marketplace registers `search_templates`, `list_categories_and_styles`,
`get_template`, `update_page_filters`, and `get_page_state`. The detail hero also
registers these tools, so agents can inspect a listing without returning to search.

Search validates taxonomy against the catalog and defaults to strict matching.
With `strict: false`, broader matches appear under `suggestions` when the API
relaxes the query; they never appear as exact `items`. `get_template` uses an
exact slug lookup. It exposes public description, explicitly labelled page and
feature lists, and source update time. Missing details mean unknown. Buyer signal
labels share the grid's implementation and identify the rolling 30-day window;
listing update time does not imply analytics freshness.

Page actions accept subcategory, scope, explicit page, and strict matching in
addition to the existing filters. A successful filter action waits for matching
results to commit. Loading, error, and superseded results must not be described
as successful filtering. `get_page_state` suppresses stale cards and pagination
until results are ready, and includes a result revision. Explicit page URLs use
Previous/Next controls; ordinary browsing continues to use infinite scroll.
Browser Back and reload preserve the requested page and filters.

On pages without a filter-aware grid, the action returns `navigation_required`
and a complete `next_url` under `/templates/all`. Open that URL and rediscover
tools. Route-owned category and scope constraints remain explicitly reported.

Release verification requires the search Worker deployment, scoped marketplace
library share, Designer library update, and site publish. A bundle or library
share alone is not production proof. Verify native tool calls against rendered
cards on `/templates`, `/templates/all`, a category, and an exact detail page,
including zero matches, invalid taxonomy, pagination, Back, and reload.
