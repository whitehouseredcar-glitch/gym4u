import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Calendar, 
  QrCode, 
  CreditCard, 
  Users, 
  User, 
  LogOut,
  Dumbbell 
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!profile) {
    return <div>{children}</div>;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getNavigationItems = () => {
    const baseItems = [
      { href: '/dashboard', icon: Home, label: 'Dashboard' },
      { href: '/profile', icon: User, label: 'Προφίλ' },
    ];

    if (profile.role === 'user') {
      return [
        ...baseItems,
        { href: '/bookings', icon: Calendar, label: 'Κρατήσεις' },
        { href: '/qr-codes', icon: QrCode, label: 'QR Codes' },
        { href: '/membership', icon: CreditCard, label: 'Συνδρομή' },
        { href: '/referral', icon: Users, label: 'Παραπομπές' },
      ];
    }

    if (profile.role === 'trainer') {
      return [
        ...baseItems,
        { href: '/schedule', icon: Calendar, label: 'Πρόγραμμα' },
      ];
    }

    if (profile.role === 'admin') {
      return [
        ...baseItems,
        { href: '/admin/payments', icon: CreditCard, label: 'Πληρωμές' },
        { href: '/admin/users', icon: Users, label: 'Χρήστες' },
      ];
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Dumbbell className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">FreeGym</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {profile.first_name} {profile.last_name}
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {profile.role === 'user' ? 'Μέλος' : 
                 profile.role === 'trainer' ? 'Προπονητής' : 'Διαχειριστής'}
              </span>
              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm h-[calc(100vh-4rem)] border-r border-gray-200">
          <div className="p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}