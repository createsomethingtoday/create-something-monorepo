-- Persist application-specific signup admission without changing existing proof or invitations.
-- GiGi mailbox proof creates an Identity only; application access stays application-owned.
ALTER TABLE enrollment_challenges ADD COLUMN application TEXT CHECK(application IS NULL OR application='gigi');
