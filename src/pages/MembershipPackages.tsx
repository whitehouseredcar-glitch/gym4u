import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, MembershipPackage, Membership, Payment } from '../lib/supabase';
import { 
  Star, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  CreditCard,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export function MembershipPackages() {
  const { profile } = useAuth();
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [pendingPayment, setPendingPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchMembershipData();
    }
  }, [profile]);

  const fetchMembershipData = async () => {
    try {
      // Fetch available packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('membership_packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (packagesError) throw packagesError;
      setPackages(packagesData || []);

      // Fetch current membership
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('status', 'active')
        .single();

      setMembership(membershipData);

      // Fetch pending payment
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('status', 'pending')
        .single();

      setPendingPayment(paymentData);

    } catch (error) {
      console.error('Error fetching membership data:', error);
      toast.error('Σφάλμα φόρτωσης δεδομένων');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePackage = async (packageData: MembershipPackage, frequency: number) => {
    if (membership) {
      toast.error('Έχετε ήδη ενεργή συνδρομή');
      return;
    }

    if (pendingPayment) {
      toast.error('Έχετε εκκρεμή πληρωμή');
      return;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours to complete payment

      const { error } = await supabase
        .from('payments')
        .insert({
          user_id: profile?.id,
          package_id: packageData.id,
          amount: packageData.price,
          frequency: frequency,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      toast.success('Αίτημα πληρωμής δημιουργήθηκε! Περιμένετε έγκριση από διαχειριστή.');
      fetchMembershipData(); // Refresh data
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Σφάλμα δημιουργίας πληρωμής');
    }
  };

  const getPackageTypeName = (type: string) => {
    const types: Record<string, string> = {
      'monthly': 'Μηνιαία',
      '3-month': '3 Μήνες',
      '6-month': '6 Μήνες',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Πακέτα Συνδρομής</h1>
        <p className="text-gray-600 mt-2">
          Επιλέξτε το πακέτο που σας ταιριάζει καλύτερα
        </p>
      </div>

      {/* Current Membership Status */}
      {membership && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Ενεργή Συνδρομή</h3>
              <p className="text-sm text-green-700 mt-1">
                {membership.credits_remaining} πιστώσεις • 
                Λήξη: {new Date(membership.expires_at).toLocaleDateString('el-GR')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Payment Status */}
      {pendingPayment && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900">Εκκρεμής Πληρωμή</h3>
              <p className="text-sm text-amber-700 mt-1">
                €{pendingPayment.amount} • 
                Λήξη αιτήματος: {new Date(pendingPayment.expires_at).toLocaleDateString('el-GR')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Packages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const isPopular = pkg.type === '3-month';
          
          return (
            <div key={pkg.id} className={`relative bg-white rounded-xl shadow-sm border-2 transition-all hover:shadow-lg ${
              isPopular ? 'border-blue-500' : 'border-gray-200'
            }`}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Δημοφιλές
                  </span>
                </div>
              )}
              
              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {getPackageTypeName(pkg.type)}
                  </h3>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    €{pkg.price}
                  </div>
                  <p className="text-sm text-gray-600">
                    {pkg.validity_days} ημέρες
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-3">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-gray-700">{pkg.credits} πιστώσεις</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span className="text-gray-700">Όλα τα μαθήματα</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">Ευέλικτες ώρες</span>
                  </div>
                </div>

                {/* Frequency Options */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Επιλέξτε συχνότητα πληρωμής:</p>
                  {[1, 2, 3].map((freq) => (
                    <button
                      key={freq}
                      onClick={() => handlePurchasePackage(pkg, freq)}
                      disabled={!!membership || !!pendingPayment}
                      className={`w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                        isPopular ? 'hover:border-blue-300' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {freq === 1 ? 'Εφάπαξ' : freq === 2 ? '2 δόσεις' : '3 δόσεις'}
                        </span>
                        <span className="text-gray-600">
                          €{(pkg.price / freq).toFixed(2)} / δόση
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Πώς λειτουργεί</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <span className="font-bold text-blue-600">1</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Επιλέξτε Πακέτο</p>
            <p className="text-xs text-gray-600 mt-1">Διαλέξτε το πακέτο που σας ταιριάζει</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <span className="font-bold text-blue-600">2</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Υποβολή Αιτήματος</p>
            <p className="text-xs text-gray-600 mt-1">Το αίτημά σας στέλνεται για έγκριση</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <span className="font-bold text-blue-600">3</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Έγκριση Πληρωμής</p>
            <p className="text-xs text-gray-600 mt-1">Διαχειριστής εγκρίνει την πληρωμή</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <span className="font-bold text-blue-600">4</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Ενεργοποίηση</p>
            <p className="text-xs text-gray-600 mt-1">Η συνδρομή σας ενεργοποιείται</p>
          </div>
        </div>
      </div>
    </div>
  );
}