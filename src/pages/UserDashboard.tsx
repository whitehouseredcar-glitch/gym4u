import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  QrCode, 
  CreditCard, 
  Users, 
  Clock,
  TrendingUp,
  Star,
  Gift
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  credits: number;
  membership_expires: string;
  total_bookings: number;
  monthly_bookings: number;
  total_referrals: number;
}

interface RecentBooking {
  id: string;
  booking_date: string;
  status: string;
  lesson: {
    start_time: string;
    end_time: string;
    room: {
      name: string;
      lesson_type: string;
    };
  };
}

export function UserDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    try {
      // Fetch user stats
      const { data: statsData, error: statsError } = await supabase
        .from('user_dashboard_stats')
        .select('*')
        .eq('id', profile?.id)
        .single();

      if (statsError) throw statsError;
      setStats(statsData);

      // Fetch recent bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          status,
          lesson:lessons(
            start_time,
            end_time,
            room:rooms(
              name,
              lesson_type
            )
          )
        `)
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (bookingsError) throw bookingsError;
      setRecentBookings(bookingsData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Σφάλμα φόρτωσης δεδομένων');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Νέα Κράτηση',
      description: 'Κλείστε μάθημα',
      icon: Calendar,
      href: '/bookings',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'QR Codes',
      description: 'Check-in/Check-out',
      icon: QrCode,
      href: '/qr-codes',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Συνδρομή',
      description: 'Διαχείριση πακέτου',
      icon: CreditCard,
      href: '/membership',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'Παραπομπές',
      description: 'Κερδίστε πιστώσεις',
      icon: Users,
      href: '/referral',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ];

  const membershipStatus = stats?.membership_expires ? 
    new Date(stats.membership_expires) > new Date() ? 'active' : 'expired' : 'none';

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Καλώς ήρθατε, {profile?.first_name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Διαχειριστείτε τις κρατήσεις σας και την συνδρομή σας
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Συνολικές Κρατήσεις</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_bookings || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Μηνιαίες Κρατήσεις</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.monthly_bookings || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Πιστώσεις</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.credits || 0}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Παραπομπές</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_referrals || 0}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Gift className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Γρήγορες Ενέργειες</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className={`${action.color} text-white p-6 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg`}
            >
              <div className="flex items-center space-x-3">
                <action.icon className="h-8 w-8" />
                <div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Membership Status */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Κατάσταση Συνδρομής</h3>
        {membershipStatus === 'active' ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Ενεργή Συνδρομή</p>
                <p className="text-sm text-gray-600">
                  Λήγει στις {new Date(stats?.membership_expires || '').toLocaleDateString('el-GR')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{stats?.credits}</p>
              <p className="text-sm text-gray-600">πιστώσεις</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">Δεν έχετε ενεργή συνδρομή</p>
            <Link
              to="/membership"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Αγορά Πακέτου
            </Link>
          </div>
        )}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Πρόσφατες Κρατήσεις</h3>
        {recentBookings.length > 0 ? (
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {booking.lesson.room.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(booking.booking_date).toLocaleDateString('el-GR')} • 
                    {booking.lesson.start_time} - {booking.lesson.end_time}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status === 'confirmed' ? 'Επιβεβαιωμένη' :
                   booking.status === 'completed' ? 'Ολοκληρωμένη' :
                   booking.status === 'cancelled' ? 'Ακυρωμένη' : booking.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Δεν έχετε κρατήσεις ακόμα</p>
            <Link
              to="/bookings"
              className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
            >
              Κλείστε το πρώτο σας μάθημα
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}