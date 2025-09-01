/*
  # Database Views and Sample Lessons

  1. Views
    - user_dashboard_stats: User statistics for dashboard
    - trainer_schedule: Trainer's lesson schedule
    - admin_revenue_stats: Revenue statistics for admins

  2. Sample Lessons
    - Weekly recurring lessons for different room types
    - January 2025 schedule
*/

-- Create user dashboard stats view
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  COALESCE(m.credits_remaining, 0) as credits,
  m.expires_at as membership_expires,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as monthly_bookings,
  COUNT(r.id) as total_referrals
FROM profiles p 
LEFT JOIN memberships m ON p.id = m.user_id AND m.status = 'active'
LEFT JOIN bookings b ON p.id = b.user_id AND b.status != 'cancelled'
LEFT JOIN referrals r ON p.id = r.referrer_id
WHERE p.role = 'user'
GROUP BY p.id, p.first_name, p.last_name, m.credits_remaining, m.expires_at;

-- Create trainer schedule view
CREATE OR REPLACE VIEW trainer_schedule AS
SELECT 
  l.id as lesson_id,
  l.day_of_week,
  l.start_time,
  l.end_time,
  l.month,
  l.year,
  r.name as room_name,
  r.lesson_type,
  r.capacity,
  p.first_name as trainer_first_name,
  p.last_name as trainer_last_name,
  COUNT(b.id) as current_bookings
FROM lessons l
JOIN rooms r ON l.room_id = r.id
LEFT JOIN profiles p ON l.trainer_id = p.id
LEFT JOIN bookings b ON l.id = b.lesson_id AND b.status = 'confirmed'
WHERE l.is_active = true
GROUP BY l.id, l.day_of_week, l.start_time, l.end_time, l.month, l.year, 
         r.name, r.lesson_type, r.capacity, p.first_name, p.last_name;

-- Create admin revenue stats view
CREATE OR REPLACE VIEW admin_revenue_stats AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_payments,
  SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_revenue,
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_revenue,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM payments
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Insert sample lessons for January 2025
INSERT INTO lessons (id, room_id, trainer_id, day_of_week, start_time, end_time, month, year) VALUES
-- Pilates Studio (Monday-Friday, 9:00-10:00 and 18:00-19:00)
('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, 1, '09:00', '10:00', 1, 2025),
('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, 1, '18:00', '19:00', 1, 2025),
('33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, 2, '09:00', '10:00', 1, 2025),
('44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, 2, '18:00', '19:00', 1, 2025),
('55555555-5555-5555-5555-555555555555', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, 3, '09:00', '10:00', 1, 2025),
('66666666-6666-6666-6666-666666666666', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, 3, '18:00', '19:00', 1, 2025),
('77777777-7777-7777-7777-777777777777', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, 4, '09:00', '10:00', 1, 2025),
('88888888-8888-8888-8888-888888888888', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, 4, '18:00', '19:00', 1, 2025),
('99999999-9999-9999-9999-999999999999', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, 5, '09:00', '10:00', 1, 2025),
('aaaaaaaa-1111-2222-3333-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, 5, '18:00', '19:00', 1, 2025),

-- Personal Training Room A (Monday-Friday, multiple slots)
('bbbbbbbb-1111-2222-3333-bbbbbbbbbbbb', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', null, 1, '10:00', '11:00', 1, 2025),
('cccccccc-1111-2222-3333-cccccccccccc', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', null, 2, '10:00', '11:00', 1, 2025),
('dddddddd-1111-2222-3333-dddddddddddd', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', null, 3, '10:00', '11:00', 1, 2025),
('eeeeeeee-1111-2222-3333-eeeeeeeeeeee', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', null, 4, '10:00', '11:00', 1, 2025),
('ffffffff-1111-2222-3333-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', null, 5, '10:00', '11:00', 1, 2025),

-- Kick Boxing Arena (Monday, Wednesday, Friday, 19:00-20:00)
('gggggggg-1111-2222-3333-gggggggggggg', 'ffffffff-ffff-ffff-ffff-ffffffffffff', null, 1, '19:00', '20:00', 1, 2025),
('hhhhhhhh-1111-2222-3333-hhhhhhhhhhhh', 'ffffffff-ffff-ffff-ffff-ffffffffffff', null, 3, '19:00', '20:00', 1, 2025),
('iiiiiiii-1111-2222-3333-iiiiiiiiiiii', 'ffffffff-ffff-ffff-ffff-ffffffffffff', null, 5, '19:00', '20:00', 1, 2025);