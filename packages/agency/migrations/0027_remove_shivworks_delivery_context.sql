-- ShivWorks now owns its separate instance and is off-boarded from CREATE SOMETHING delivery surfaces.
DELETE FROM canon_workflow_contexts
WHERE context_id = 'shivworks-network-handoff';
