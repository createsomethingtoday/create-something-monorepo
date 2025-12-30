-- Phase 6.3: The Stack Facility Setup
-- Creates facility and courts for The Stack Indoor Pickleball

-- Create The Stack facility
INSERT INTO facilities (
  id,
  name,
  slug,
  timezone,
  status,
  opening_time,
  closing_time,
  slot_duration_minutes,
  advance_booking_days,
  cancellation_hours,
  cancellation_fee_cents,
  no_show_penalty_credits,
  email,
  phone,
  address,
  config
) VALUES (
  'fac_thestack',
  'The Stack Indoor Pickleball',
  'thestack',
  'America/Los_Angeles',
  'active',
  '06:00',
  '22:00',
  60,
  14,
  24,
  1000,
  1,
  'hello@thestackpickleball.com',
  '+1-555-0123',
  'Multiple locations across the region',
  '{}'
);

-- Create courts for each location

-- Grandview Park Tennis Center (2 courts)
INSERT INTO courts (
  id, facility_id, name, court_type, surface_type, is_active, sort_order, price_per_slot_cents, peak_price_cents
) VALUES
  ('crt_grandview1', 'fac_thestack', 'Grandview Court 1', 'pickleball', 'Sport Court', 1, 1, 4000, 5000),
  ('crt_grandview2', 'fac_thestack', 'Grandview Court 2', 'pickleball', 'Sport Court', 1, 2, 4000, 5000);

-- Oakridge Sports Complex (2 courts)
INSERT INTO courts (
  id, facility_id, name, court_type, surface_type, is_active, sort_order, price_per_slot_cents, peak_price_cents
) VALUES
  ('crt_oakridge1', 'fac_thestack', 'Oakridge Court 1', 'pickleball', 'Hardwood', 1, 3, 4000, 5000),
  ('crt_oakridge2', 'fac_thestack', 'Oakridge Court 2', 'pickleball', 'Hardwood', 1, 4, 4000, 5000);

-- Riverview Tennis Academy (2 courts)
INSERT INTO courts (
  id, facility_id, name, court_type, surface_type, is_active, sort_order, price_per_slot_cents, peak_price_cents
) VALUES
  ('crt_riverview1', 'fac_thestack', 'Riverview Court 1', 'pickleball', 'Rubberized', 1, 5, 4000, 5000),
  ('crt_riverview2', 'fac_thestack', 'Riverview Court 2', 'pickleball', 'Rubberized', 1, 6, 4000, 5000);

-- Pinecrest Court Club (2 courts)
INSERT INTO courts (
  id, facility_id, name, court_type, surface_type, is_active, sort_order, price_per_slot_cents, peak_price_cents
) VALUES
  ('crt_pinecrest1', 'fac_thestack', 'Pinecrest Court 1', 'pickleball', 'Sport Court', 1, 7, 4000, 5000),
  ('crt_pinecrest2', 'fac_thestack', 'Pinecrest Court 2', 'pickleball', 'Sport Court', 1, 8, 4000, 5000);

-- Pricing explanation:
-- Base price: $40/hour (4000 cents)
-- Peak price: $50/hour (5000 cents) - applies weekdays 5-8pm
-- Peak pricing is calculated in the availability API based on time slot
