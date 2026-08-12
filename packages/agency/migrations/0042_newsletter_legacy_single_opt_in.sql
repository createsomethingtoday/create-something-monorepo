-- Record the operator-reviewed legacy signup evidence for the five external
-- subscribers approved for the CRE-1713 re-engagement campaign. The original
-- form explicitly offered CREATE SOMETHING email updates and immediately sent
-- a welcome message. This does not claim or fabricate double-opt-in evidence.
-- The general newsletter audience remains double-opt-in only; Agency's
-- re-engagement selector recognizes this distinct, campaign-specific lane.

UPDATE newsletter_subscribers
SET consent_requested_at = COALESCE(consent_requested_at, subscribed_at),
    consent_confirmed_at = NULL,
    consent_method = 'single_opt_in',
    consent_evidence = 'legacy_signup_form',
    audience_classification = 'confirmed_subscriber'
WHERE (
    (id = 1 AND subscribed_at = '2025-11-17 02:23:40')
    OR (id = 13 AND subscribed_at = '2025-11-26 14:54:18')
    OR (id = 16 AND subscribed_at = '2025-11-27 05:22:51')
    OR (id = 19 AND subscribed_at = '2025-11-29 09:10:51')
    OR (id = 22 AND subscribed_at = '2025-12-03 14:23:54')
  )
  AND source IS NULL
  AND confirmed_at = '2025-12-23 04:35:59'
  AND active = 1
  AND status = 'active'
  AND unsubscribed_at IS NULL
  AND consent_confirmed_at IS NULL
  AND COALESCE(consent_method, '') = ''
  AND COALESCE(consent_evidence, '') = ''
  AND audience_classification = 'legacy_or_unknown';
