import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { CookieConsentProvider } from './context/CookieConsentContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsentBanner from './components/CookieConsentBanner';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import LogoutPage from './pages/LogoutPage';
import RegisterPage from './pages/RegisterPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import PublicDashboardPage from './pages/PublicDashboardPage';
import ManageMFAPage from './pages/ManageMFAPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CaseloadPage from './pages/CaseloadPage';
import ResidentDetailPage from './pages/ResidentDetailPage';
import DonorsPage from './pages/DonorsPage';
import DonorDetailPage from './pages/DonorDetailPage';
import DonorSelfPage from './pages/DonorSelfPage';
import ReportsPage from './pages/ReportsPage';
import SocialMediaPage from './pages/SocialMediaPage';
import PartnersPage from './pages/PartnersPage';

export default function App() {
  return (
    <CookieConsentProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
              }}
            >
              <Header />
              <main style={{ flex: 1 }}>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/impact" element={<PublicDashboardPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/logout" element={<LogoutPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/cookie-policy" element={<CookiePolicyPage />} />

                  {/* Authenticated */}
                  <Route
                    path="/account/mfa"
                    element={
                      <ProtectedRoute>
                        <ManageMFAPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Donor */}
                  <Route
                    path="/donor/history"
                    element={
                      <ProtectedRoute roles={['Donor', 'Admin']}>
                        <DonorSelfPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute roles={['Admin']}>
                        <AdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/donors"
                    element={
                      <ProtectedRoute roles={['Admin']}>
                        <DonorsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/donors/:id"
                    element={
                      <ProtectedRoute roles={['Admin']}>
                        <DonorDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/residents"
                    element={
                      <ProtectedRoute roles={['Admin']}>
                        <CaseloadPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/residents/:id"
                    element={
                      <ProtectedRoute roles={['Admin']}>
                        <ResidentDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <ProtectedRoute roles={['Admin']}>
                        <ReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/social-media"
                    element={
                      <ProtectedRoute roles={['Admin']}>
                        <SocialMediaPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/partners"
                    element={
                      <ProtectedRoute roles={['Admin']}>
                        <PartnersPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
              <Footer />
              <CookieConsentBanner />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </CookieConsentProvider>
  );
}
