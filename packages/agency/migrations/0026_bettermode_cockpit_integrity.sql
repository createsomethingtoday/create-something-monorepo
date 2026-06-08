-- Bettermode community cockpit integrity repairs.
--
-- Keep active SLA due dates anchored to first_seen_at instead of allowing
-- scheduled sweeps to slide them forward. Terminal rows should not carry due
-- dates, and terminal next actions should remain "no action" guidance.
-- Also backfill older pending queue rows that predate community_work_items.

UPDATE community_work_items
SET due_at = COALESCE(
      CASE urgency
        WHEN 'high' THEN strftime('%Y-%m-%dT%H:%M:%fZ', first_seen_at, '+4 hours')
        WHEN 'medium' THEN strftime('%Y-%m-%dT%H:%M:%fZ', first_seen_at, '+24 hours')
        ELSE strftime('%Y-%m-%dT%H:%M:%fZ', first_seen_at, '+72 hours')
      END,
      due_at
    )
WHERE platform = 'bettermode'
  AND status IN ('new', 'draft_ready', 'escalated', 'follow_up_due', 'triaged');

UPDATE community_work_items
SET due_at = NULL,
    next_action = CASE status
      WHEN 'sent' THEN 'No action needed unless the creator replies again.'
      WHEN 'externally_resolved' THEN 'No action needed unless the creator replies again.'
      ELSE 'No drafting action needed.'
    END
WHERE platform = 'bettermode'
  AND status IN ('sent', 'externally_resolved', 'skipped');

INSERT INTO community_work_items (
  id,
  platform,
  source_id,
  source_url,
  title,
  lane,
  status,
  priority,
  urgency,
  next_action,
  due_at,
  author_id,
  author_name,
  author_email,
  signal_id,
  queue_id,
  draft_status,
  first_seen_at,
  last_seen_at,
  last_activity_at,
  last_drafted_at,
  last_sent_at,
  escalation_reason,
  metadata
)
SELECT
  'cwi_backfill_' || lower(hex(randomblob(16))),
  s.platform,
  s.source_id,
  s.source_url,
  NULLIF(substr(replace(replace(s.content, char(10), ' '), char(13), ' '), 1, 160), ''),
  'support_question',
  'draft_ready',
  6,
  'medium',
  'Review the drafted BetterMode reply in the admin block, then send, regenerate, or dismiss.',
  COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', q.created_at, '+24 hours'), q.created_at),
  CASE WHEN json_valid(s.metadata) THEN json_extract(s.metadata, '$.author_member_id') ELSE NULL END,
  CASE WHEN json_valid(s.metadata) THEN json_extract(s.metadata, '$.author_name') ELSE NULL END,
  CASE WHEN json_valid(s.metadata) THEN json_extract(s.metadata, '$.author_email') ELSE NULL END,
  s.id,
  q.id,
  q.status,
  COALESCE(q.created_at, s.detected_at, CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP,
  s.detected_at,
  q.created_at,
  q.sent_at,
  NULL,
  '{"source":"pending_queue_backfill"}'
FROM community_queue q
JOIN community_signals s ON s.id = q.signal_id
LEFT JOIN community_work_items w
  ON w.platform = s.platform AND w.source_id = s.source_id
WHERE q.platform = 'bettermode'
  AND s.platform = 'bettermode'
  AND q.status IN ('pending', 'approved')
  AND w.id IS NULL;
