-- Court Reserve Database Schema Update
-- Add Stripe Checkout Session ID to reservations
--
-- Migration: 0002_add_checkout_session
-- Created: 2024-12-30

-- Add checkout session ID column to reservations
ALTER TABLE reservations ADD COLUMN stripe_checkout_session_id TEXT;

-- Add index for checkout session lookups (webhook handling)
CREATE INDEX idx_reservations_checkout ON reservations(stripe_checkout_session_id);
