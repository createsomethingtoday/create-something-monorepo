WITH owners AS (
  SELECT workspace_id, MIN(user_id) AS owner_user_id
  FROM ANALYTICS.WEBFLOW.DIM_WORKSPACE_ROLE_MAP WHERE is_owner = TRUE GROUP BY workspace_id
)
SELECT o.client_id, o.application_id, o.name AS app_name, o.owner_type, o.owner_workspace_id, o.owner_user_id AS app_owner_user_id,
       ow.owner_user_id AS ws_owner_user_id, u.email AS ws_owner_email, u.is_deleted AS ws_owner_deleted, w.name AS workspace_name
FROM ANALYTICS.WEBFLOW.OAUTH_APPLICATIONS o
LEFT JOIN owners ow ON ow.workspace_id = o.owner_workspace_id
LEFT JOIN ANALYTICS.WEBFLOW.DIM_USERS u ON u.user_id = ow.owner_user_id
LEFT JOIN ANALYTICS.WEBFLOW.DIM_WORKSPACE w ON w.workspace_id = o.owner_workspace_id
WHERE o.client_id IS NOT NULL
