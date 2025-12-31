-- AI Agent Demo Data
-- Seeds a demo member with booking history for demonstrating AI suggestions
--
-- Demo scenario: "Sarah Demo" is a regular player who:
-- - Usually books Tuesday and Thursday evenings (6 PM)
-- - Prefers Grandview Court 1
-- - Has been a member for 2 weeks with consistent patterns
--
-- When this member visits the widget, their preferred time slots
-- will be automatically highlighted.

-- Create demo member with AI preferences
INSERT OR REPLACE INTO members (
    id,
    facility_id,
    email,
    name,
    phone,
    membership_type,
    max_active_reservations,
    credits_balance,
    no_show_count,
    total_bookings,
    status,
    preferences,
    created_at,
    updated_at
) VALUES (
    'mbr_demo_sarah',
    'fac_thestack',
    'sarah.demo@clearway.test',
    'Sarah Demo',
    '+1-555-0199',
    'member',
    5,
    0,
    0,
    8,
    'active',
    json_object(
        'preferred_courts', json_array('crt_grandview1'),
        'preferred_times', json_array('18:00'),
        'notification_sms', true,
        'notification_email', true,
        'ai_personalization', true,
        'timeWeights', json_object(
            '18', 1.0,
            '17', 0.6,
            '19', 0.5,
            '8', 0.3
        ),
        'courtWeights', json_object(
            'crt_grandview1', 1.0,
            'crt_grandview2', 0.7,
            'crt_oakridge1', 0.3
        ),
        'dayWeights', json_object(
            '2', 1.0,
            '4', 0.9,
            '6', 0.4
        )
    ),
    datetime('now', '-14 days'),
    datetime('now')
);

-- Create booking history for Sarah (past 2 weeks)
-- Pattern: Tuesday and Thursday at 6 PM, mostly Grandview Court 1

-- Week 1: Tuesday
INSERT OR IGNORE INTO reservations (
    id, facility_id, court_id, member_id,
    start_time, end_time, duration_minutes,
    booking_type, status, payment_status,
    booking_source, created_at, updated_at
) VALUES (
    'rsv_demo_001',
    'fac_thestack',
    'crt_grandview1',
    'mbr_demo_sarah',
    datetime('now', '-12 days', '+18 hours'),
    datetime('now', '-12 days', '+19 hours'),
    60,
    'standard',
    'completed',
    'paid',
    'web',
    datetime('now', '-13 days'),
    datetime('now', '-12 days')
);

-- Week 1: Thursday
INSERT OR IGNORE INTO reservations (
    id, facility_id, court_id, member_id,
    start_time, end_time, duration_minutes,
    booking_type, status, payment_status,
    booking_source, created_at, updated_at
) VALUES (
    'rsv_demo_002',
    'fac_thestack',
    'crt_grandview1',
    'mbr_demo_sarah',
    datetime('now', '-10 days', '+18 hours'),
    datetime('now', '-10 days', '+19 hours'),
    60,
    'standard',
    'completed',
    'paid',
    'web',
    datetime('now', '-11 days'),
    datetime('now', '-10 days')
);

-- Week 2: Tuesday (tried Grandview Court 2)
INSERT OR IGNORE INTO reservations (
    id, facility_id, court_id, member_id,
    start_time, end_time, duration_minutes,
    booking_type, status, payment_status,
    booking_source, created_at, updated_at
) VALUES (
    'rsv_demo_003',
    'fac_thestack',
    'crt_grandview2',
    'mbr_demo_sarah',
    datetime('now', '-5 days', '+18 hours'),
    datetime('now', '-5 days', '+19 hours'),
    60,
    'standard',
    'completed',
    'paid',
    'web',
    datetime('now', '-6 days'),
    datetime('now', '-5 days')
);

-- Week 2: Thursday (back to Court 1)
INSERT OR IGNORE INTO reservations (
    id, facility_id, court_id, member_id,
    start_time, end_time, duration_minutes,
    booking_type, status, payment_status,
    booking_source, created_at, updated_at
) VALUES (
    'rsv_demo_004',
    'fac_thestack',
    'crt_grandview1',
    'mbr_demo_sarah',
    datetime('now', '-3 days', '+18 hours'),
    datetime('now', '-3 days', '+19 hours'),
    60,
    'standard',
    'completed',
    'paid',
    'web',
    datetime('now', '-4 days'),
    datetime('now', '-3 days')
);

-- Week 2: Saturday morning (occasional weekend)
INSERT OR IGNORE INTO reservations (
    id, facility_id, court_id, member_id,
    start_time, end_time, duration_minutes,
    booking_type, status, payment_status,
    booking_source, created_at, updated_at
) VALUES (
    'rsv_demo_005',
    'fac_thestack',
    'crt_grandview1',
    'mbr_demo_sarah',
    datetime('now', '-1 days', '+8 hours'),
    datetime('now', '-1 days', '+9 hours'),
    60,
    'standard',
    'completed',
    'paid',
    'web',
    datetime('now', '-2 days'),
    datetime('now', '-1 days')
);

-- Additional bookings to strengthen pattern
INSERT OR IGNORE INTO reservations (
    id, facility_id, court_id, member_id,
    start_time, end_time, duration_minutes,
    booking_type, status, payment_status,
    booking_source, created_at, updated_at
) VALUES (
    'rsv_demo_006',
    'fac_thestack',
    'crt_grandview1',
    'mbr_demo_sarah',
    datetime('now', '-19 days', '+18 hours'),
    datetime('now', '-19 days', '+19 hours'),
    60,
    'standard',
    'completed',
    'paid',
    'web',
    datetime('now', '-20 days'),
    datetime('now', '-19 days')
);

INSERT OR IGNORE INTO reservations (
    id, facility_id, court_id, member_id,
    start_time, end_time, duration_minutes,
    booking_type, status, payment_status,
    booking_source, created_at, updated_at
) VALUES (
    'rsv_demo_007',
    'fac_thestack',
    'crt_grandview1',
    'mbr_demo_sarah',
    datetime('now', '-17 days', '+18 hours'),
    datetime('now', '-17 days', '+19 hours'),
    60,
    'standard',
    'completed',
    'paid',
    'web',
    datetime('now', '-18 days'),
    datetime('now', '-17 days')
);

-- One booking at different time (5 PM) to show secondary preference
INSERT OR IGNORE INTO reservations (
    id, facility_id, court_id, member_id,
    start_time, end_time, duration_minutes,
    booking_type, status, payment_status,
    booking_source, created_at, updated_at
) VALUES (
    'rsv_demo_008',
    'fac_thestack',
    'crt_grandview1',
    'mbr_demo_sarah',
    datetime('now', '-24 days', '+17 hours'),
    datetime('now', '-24 days', '+18 hours'),
    60,
    'standard',
    'completed',
    'paid',
    'web',
    datetime('now', '-25 days'),
    datetime('now', '-24 days')
);

-- ============================================================================
-- Second demo member: "Mike Demo" - new user, no history
-- Shows the "new_user" fallback suggestion behavior
-- ============================================================================

INSERT OR REPLACE INTO members (
    id,
    facility_id,
    email,
    name,
    phone,
    membership_type,
    max_active_reservations,
    credits_balance,
    no_show_count,
    total_bookings,
    status,
    preferences,
    created_at,
    updated_at
) VALUES (
    'mbr_demo_mike',
    'fac_thestack',
    'mike.demo@clearway.test',
    'Mike Demo',
    '+1-555-0198',
    'guest',
    3,
    0,
    0,
    0,
    'active',
    json_object(
        'ai_personalization', true
    ),
    datetime('now'),
    datetime('now')
);

-- ============================================================================
-- Third demo member: "Alex Demo" - AI personalization disabled
-- Shows privacy control working (no suggestions)
-- ============================================================================

INSERT OR REPLACE INTO members (
    id,
    facility_id,
    email,
    name,
    phone,
    membership_type,
    max_active_reservations,
    credits_balance,
    no_show_count,
    total_bookings,
    status,
    preferences,
    created_at,
    updated_at
) VALUES (
    'mbr_demo_alex',
    'fac_thestack',
    'alex.demo@clearway.test',
    'Alex Demo',
    '+1-555-0197',
    'member',
    5,
    0,
    0,
    5,
    'active',
    json_object(
        'ai_personalization', false,
        'notification_sms', false,
        'notification_email', true
    ),
    datetime('now', '-7 days'),
    datetime('now')
);

-- Alex has booking history but AI is disabled
INSERT OR IGNORE INTO reservations (
    id, facility_id, court_id, member_id,
    start_time, end_time, duration_minutes,
    booking_type, status, payment_status,
    booking_source, created_at, updated_at
) VALUES (
    'rsv_demo_alex_001',
    'fac_thestack',
    'crt_oakridge1',
    'mbr_demo_alex',
    datetime('now', '-5 days', '+10 hours'),
    datetime('now', '-5 days', '+11 hours'),
    60,
    'standard',
    'completed',
    'paid',
    'web',
    datetime('now', '-6 days'),
    datetime('now', '-5 days')
);
