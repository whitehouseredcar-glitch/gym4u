import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { UserDashboard } from './pages/UserDashboard';
import { TrainerDashboard } from './pages/TrainerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { BookingCalendar } from './pages/BookingCalendar';
import { QRCodes } from './pages/QRCodes';
import { MembershipPackages } from './pages/MembershipPackages';
import { ReferralSystem } from './pages/ReferralSystem';
import { UserProfile } from './pages/UserProfile';
import { useAuth } from './contexts/AuthContext';

function DashboardRouter() {
  const { profile } = useAuth();
  
  if (!profile) return null;
  
  if (profile.role === 'user') return <UserDashboard />;
  if (profile.role === 'trainer') return <TrainerDashboard />;
  if (profile.role === 'admin') return <AdminDashboard />;
  
  return <UserDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <DashboardRouter />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/bookings" element={
              <ProtectedRoute roles={['user']}>
                <Layout>
                  <BookingCalendar />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/qr-codes" element={
              <ProtectedRoute roles={['user']}>
                <Layout>
                  <QRCodes />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/membership" element={
              <ProtectedRoute roles={['user']}>
                <Layout>
                  <MembershipPackages />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/referral" element={
              <ProtectedRoute roles={['user']}>
                <Layout>
                  <ReferralSystem />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout>
                  <UserProfile />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;