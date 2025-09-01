import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PendingPayment {
  id: string;
  amount: number;
  frequency: number;
  created_at: string;
  expires_at: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  package: {
    type: string;
    credits: number;
  };
}

interface RevenueStats {
  month: string;
  total_payments: number;
  approved_revenue: number;
  pending_revenue: number;
  pending_count: number;
}

export function AdminDashboard() {
  const { profile } = useAuth();
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchAdminData();
    }
  }, [profile]);

  const fetchAdminData = async () => {
    try {
      // Fetch pending payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          frequency,
          created_at,
          expires_at,
          user:profiles(first_name, last_name, email),
          package:membership_packages(type, credits)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPendingPayments(paymentsData || []);

      // Fetch revenue stats
      const { data: statsData, error: statsError } = await supabase
        .from('admin_revenue_stats')
        .select('*')
        .limit(6);

      if (statsError) throw statsError;
      setRevenueStats(statsData || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Σφάλμα φόρτωσης δεδομένων');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (paymentId: string, action: 'approved' | 'cancelled') => {
    try {
      const updateData = {
        status: action,
        ...(action === 'approved' && {
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        }),
      };

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      // If approved, create/update membership
      if (action === 'approved') {
        const payment = pendingPayments.find(p => p.id === paymentId);
        if (payment) {
          // Create membership
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + (payment.frequency * 30));

          const { error: membershipError } = await supabase
            .from('memberships')
            .upsert({
              user_id: payment.user.id,
              package_id: payment.package.id,
              frequency: payment.frequency,
              credits_remaining: payment.package.credits,
              expires_at: expiresAt.toISOString(),
              status: 'active',
            });

          if (membershipError) throw membershipError;
        }
      }

      toast.success(action === 'approved' ? 'Πληρωμή εγκρίθηκε' : 'Πληρωμή απορρίφθηκε');
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Σφάλμα ενημέρωσης πληρωμής');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentMonthStats = revenueStats[0];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Πίνακας Διαχείρισης
        </h1>
        <p className="text-gray-600 mt-2">
          Διαχειριστείτε πληρωμές, χρήστες και στατιστικά
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Μηνιαία Έσοδα</p>
              <p className="text-2xl font-bold text-gray-900">
                €{currentMonthStats?.approved_revenue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Εκκρεμείς Πληρωμές</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMonthStats?.pending_count || 0}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Εκκρεμή Ποσά</p>
              <p className="text-2xl font-bold text-gray-900">
                €{currentMonthStats?.pending_revenue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Συνολικές Πληρωμές</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMonthStats?.total_payments || 0}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payments */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Εκκρεμείς Πληρωμές</h2>
        
        {pendingPayments.length > 0 ? (
          <div className="space-y-4">
            {pendingPayments.map((payment) => (
              <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {payment.user.first_name} {payment.user.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{payment.user.email}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Πακέτο {payment.package.type}
                        </p>
                        <p className="text-sm text-gray-600">
                          {payment.package.credits} πιστώσεις • €{payment.amount}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Δημιουργήθηκε: {new Date(payment.created_at).toLocaleDateString('el-GR')} • 
                      Λήγει: {new Date(payment.expires_at).toLocaleDateString('el-GR')}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handlePaymentAction(payment.id, 'approved')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Έγκριση</span>
                    </button>
                    <button
                      onClick={() => handlePaymentAction(payment.id, 'cancelled')}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Απόρριψη</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Δεν υπάρχουν εκκρεμείς πληρωμές</p>
          </div>
        )}
      </div>
    </div>
  );
}