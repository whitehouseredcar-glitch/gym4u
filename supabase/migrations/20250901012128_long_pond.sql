/*
  # Sample Data for FreeGym Application

  1. Membership Packages
    - Monthly, 3-month, and 6-month packages with different credits and pricing

  2. Rooms
    - Pilates Studio, Personal Training rooms, Kick Boxing Arena

  3. Lessons
    - Sample scheduled lessons for different room types

  4. Functions
    - Credit management and referral functions
*/

-- Insert membership packages
INSERT INTO membership_packages (id, type, price, credits, validity_days, is_active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'monthly', 50.00, 12, 30, true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '3-month', 135.00, 36, 90, true),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '6-month', 240.00, 72, 180, true);

-- Insert rooms
INSERT INTO rooms (id, name, lesson_type, capacity, is_active) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Pilates Studio', 'pilates', 4, true),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Personal Training Room A', 'personal-training-a', 6, true),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Personal Training Room B', 'personal-training-b', 6, true),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'Kick Boxing Arena', 'kick-boxing', 12, true),
('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'Free Gym Area', 'free-gym', 20, true);

-- Create credit management functions
CREATE OR REPLACE FUNCTION increment_credits(p_user_id UUID, increment_amount INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE memberships 
  SET credits_remaining = credits_remaining + increment_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND status = 'active'
  RETURNING credits_remaining INTO new_credits;
  
  RETURN COALESCE(new_credits, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_credits(p_user_id UUID, decrement_amount INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE memberships 
  SET credits_remaining = credits_remaining - decrement_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND status = 'active' AND credits_remaining >= decrement_amount
  RETURNING credits_remaining INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate referral code function
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'REF';
  i INTEGER;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Check if code already exists
  WHILE EXISTS(SELECT 1 FROM profiles WHERE referral_code = result) LOOP
    result := 'REF';
    FOR i IN 1..7 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Process referral reward function
CREATE OR REPLACE FUNCTION process_referral_reward(referrer_id UUID, referred_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add 5 credits to both users
  PERFORM increment_credits(referrer_id, 5);
  PERFORM increment_credits(referred_id, 5);
  
  -- Mark referral as completed
  UPDATE referrals 
  SET status = 'completed'
  WHERE referrer_id = process_referral_reward.referrer_id 
    AND referred_id = process_referral_reward.referred_id;
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate QR code string
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;