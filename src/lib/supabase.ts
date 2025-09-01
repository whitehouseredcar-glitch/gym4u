import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  id_number: string;
  avatar_url?: string;
  role: 'user' | 'trainer' | 'admin';
  referral_code: string;
  referred_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MembershipPackage {
  id: string;
  type: 'monthly' | '3-month' | '6-month';
  price: number;
  credits: number;
  validity_days: number;
  is_active: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  package_id: string;
  frequency: number;
  credits_remaining: number;
  expires_at: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  package_id: string;
  amount: number;
  frequency: number;
  status: 'pending' | 'approved' | 'cancelled';
  expires_at: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface Room {
  id: string;
  name: string;
  lesson_type: 'pilates' | 'personal-training-a' | 'personal-training-b' | 'kick-boxing' | 'free-gym';
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface Lesson {
  id: string;
  room_id: string;
  trainer_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  month: number;
  year: number;
  is_active: boolean;
  created_at: string;
  room?: Room;
  trainer?: Profile;
  current_bookings?: number;
}

export interface Booking {
  id: string;
  user_id: string;
  lesson_id: string;
  booking_date: string;
  qr_code: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  checked_in_at?: string;
  checked_out_at?: string;
  created_at: string;
  lesson?: Lesson;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  reward_credits: number;
  status: 'pending' | 'completed';
  created_at: string;
  referred_profile?: Profile;
}