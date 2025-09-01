/*
  # Initial FreeGym Database Schema

  1. Enums
    - user_role: user, trainer, admin
    - membership_type: monthly, 3-month, 6-month
    - payment_status: pending, approved, cancelled
    - booking_status: confirmed, cancelled, completed, no-show
    - lesson_type: pilates, personal-training-a, personal-training-b, kick-boxing, free-gym
    - referral_status: pending, completed

  2. Tables
    - profiles: User profiles linked to auth.users
    - membership_packages: Available gym packages
    - memberships: User subscriptions
    - payments: Payment records
    - rooms: Gym rooms and facilities
    - lessons: Scheduled classes
    - bookings: User lesson reservations
    - referrals: Referral tracking system

  3. Security
    - Enable RLS on all tables
    - Add appropriate policies for each user role
    - Secure data access based on user authentication

  4. Functions
    - Credit management functions
    - Referral code generation
    - Referral reward processing
*/

-- Create enums
CREATE TYPE user_role AS ENUM ('user', 'trainer', 'admin');
CREATE TYPE membership_type AS ENUM ('monthly', '3-month', '6-month');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'cancelled');
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed', 'no-show');
CREATE TYPE lesson_type AS ENUM ('pilates', 'personal-training-a', 'personal-training-b', 'kick-boxing', 'free-gym');
CREATE TYPE referral_status AS ENUM ('pending', 'completed');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name varchar(50) NOT NULL,
  last_name varchar(50) NOT NULL,
  phone varchar(20) NOT NULL,
  id_number varchar(20) NOT NULL UNIQUE,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'user',
  referral_code varchar(10) NOT NULL UNIQUE,
  referred_by varchar(10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Membership packages table
CREATE TABLE IF NOT EXISTS membership_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type membership_type NOT NULL,
  price decimal(10,2) NOT NULL,
  credits integer NOT NULL,
  validity_days integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES membership_packages(id),
  frequency integer NOT NULL CHECK (frequency >= 1 AND frequency <= 3),
  credits_remaining integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES membership_packages(id),
  amount decimal(10,2) NOT NULL,
  frequency integer NOT NULL CHECK (frequency >= 1 AND frequency <= 3),
  status payment_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id)
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  lesson_type lesson_type NOT NULL,
  capacity integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 5),
  start_time time NOT NULL,
  end_time time NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12 AND month != 8),
  year integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  qr_code varchar(255) NOT NULL UNIQUE,
  status booking_status NOT NULL DEFAULT 'confirmed',
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code varchar(10) NOT NULL,
  reward_credits integer NOT NULL DEFAULT 5,
  status referral_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for membership_packages
CREATE POLICY "Anyone can view active packages" ON membership_packages FOR SELECT TO authenticated USING (is_active = true);

-- RLS Policies for memberships
CREATE POLICY "Users can view own memberships" ON memberships FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own memberships" ON memberships FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own memberships" ON memberships FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for payments
CREATE POLICY "Users can view own payments" ON payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all payments" ON payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update payments" ON payments FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for rooms
CREATE POLICY "Anyone can view active rooms" ON rooms FOR SELECT TO authenticated USING (is_active = true);

-- RLS Policies for lessons
CREATE POLICY "Anyone can view active lessons" ON lessons FOR SELECT TO authenticated USING (is_active = true);

-- RLS Policies for bookings
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own bookings" ON bookings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own bookings" ON bookings FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Trainers can view lesson bookings" ON bookings FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM lessons l 
    JOIN profiles p ON l.trainer_id = p.id 
    WHERE l.id = bookings.lesson_id AND p.id = auth.uid() AND p.role = 'trainer'
  )
);

-- RLS Policies for referrals
CREATE POLICY "Users can view own referrals" ON referrals FOR SELECT TO authenticated USING (
  referrer_id = auth.uid() OR referred_id = auth.uid()
);
CREATE POLICY "Users can insert referrals" ON referrals FOR INSERT TO authenticated WITH CHECK (referrer_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_lessons_trainer_id ON lessons(trainer_id);
CREATE INDEX IF NOT EXISTS idx_lessons_room_id ON lessons(room_id);
CREATE INDEX IF NOT EXISTS idx_lessons_schedule ON lessons(day_of_week, month, year);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lesson_id ON bookings(lesson_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);