import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Referral } from '../lib/supabase';
import { 
  Copy, 
  Share2, 
  Gift, 
  Users, 
  Star,
  CheckCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ReferralWithProfile extends Referral {
  referred_profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function ReferralSystem() {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<ReferralWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchReferrals();
    }
  }, [profile]);

  const fetchReferrals = async () => {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred_profile:profiles!referred_id(
            first_name,
            last_name,
            email
          )
        `)
        .eq('referrer_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast.error('Σφάλμα φόρτωσης παραπομπών');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = async () => {
    if (profile?.referral_code) {
      await navigator.clipboard.writeText(profile.referral_code);
      toast.success('Κωδικός παραπομπής αντιγράφηκε!');
    }
  };

  const shareReferralLink = async () => {
    const referralLink = `${window.location.origin}/register?ref=${profile?.referral_code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ελάτε στο FreeGym!',
          text: `Χρησιμοποιήστε τον κωδικό μου ${profile?.referral_code} και κερδίστε 5 δωρεάν πιστώσεις!`,
          url: referralLink,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Σύνδεσμος παραπομπής αντιγράφηκε!');
    }
  };

  const completedReferrals = referrals.filter(r => r.status === 'completed');
  const pendingReferrals = referrals.filter(r => r.status === 'pending');
  const totalRewardCredits = completedReferrals.reduce((sum, r) => sum + r.reward_credits, 0);

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
        <h1 className="text-3xl font-bold text-gray-900">Σύστημα Παραπομπών</h1>
        <p className="text-gray-600 mt-2">
          Προσκαλέστε φίλους και κερδίστε δωρεάν πιστώσεις
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Συνολικές Παραπομπές</p>
              <p className="text-2xl font-bold text-gray-900">{referrals.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ολοκληρωμένες</p>
              <p className="text-2xl font-bold text-gray-900">{completedReferrals.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Πιστώσεις Ανταμοιβής</p>
              <p className="text-2xl font-bold text-gray-900">{totalRewardCredits}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Referral Code Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ο Κωδικός σας</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-blue-700 mb-2">Ο κωδικός παραπομπής σας</p>
            <div className="text-2xl font-bold text-blue-900 mb-4 font-mono">
              {profile?.referral_code}
            </div>
            
            <div className="flex space-x-3 justify-center">
              <button
                onClick={copyReferralCode}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Copy className="h-4 w-4" />
                <span>Αντιγραφή</span>
              </button>
              
              <button
                onClick={shareReferralLink}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Share2 className="h-4 w-4" />
                <span>Μοιρασμός</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Πώς λειτουργεί</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <Share2 className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Μοιραστείτε</p>
            <p className="text-xs text-gray-600 mt-1">Στείλτε τον κωδικό σε φίλους</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Εγγραφή</p>
            <p className="text-xs text-gray-600 mt-1">Ο φίλος εγγράφεται με τον κωδικό</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Αγορά</p>
            <p className="text-xs text-gray-600 mt-1">Ο φίλος αγοράζει συνδρομή</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <Gift className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Ανταμοιβή</p>
            <p className="text-xs text-gray-600 mt-1">Και οι δύο παίρνετε 5 πιστώσεις</p>
          </div>
        </div>
      </div>

      {/* Referral History */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ιστορικό Παραπομπών</h3>
        
        {referrals.length > 0 ? (
          <div className="space-y-3">
            {referrals.map((referral) => (
              <div key={referral.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {referral.referred_profile.first_name} {referral.referred_profile.last_name}
                    </h4>
                    <p className="text-sm text-gray-600">{referral.referred_profile.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(referral.created_at).toLocaleDateString('el-GR')}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className={`flex items-center space-x-2 ${
                      referral.status === 'completed' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {referral.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                      <span className="text-sm font-medium">
                        {referral.status === 'completed' ? 'Ολοκληρώθηκε' : 'Εκκρεμής'}
                      </span>
                    </div>
                    {referral.status === 'completed' && (
                      <p className="text-sm text-gray-600 mt-1">
                        +{referral.reward_credits} πιστώσεις
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Δεν έχετε παραπομπές ακόμα</p>
            <p className="text-sm text-gray-500 mt-2">
              Μοιραστείτε τον κωδικό σας και κερδίστε πιστώσεις!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}