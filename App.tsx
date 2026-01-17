import { HashRouter, Routes, Route } from 'react-router-dom';
import React, { useEffect } from 'react';
// Context
import { OrderProvider } from './context/OrderContext';
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { AdminProvider } from './context/AdminContext';

// Pages
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import OrderPage from './pages/OrderPage';
import BookingPage from './pages/BookingPage';
import MenuPage from './pages/MenuPage';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';

// Admin Pages
import LoginPage from './pages/admin/LoginPage';
import AdminLayout from './components/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import MenuManagementPage from './pages/admin/MenuManagementPage';
import OrderManagementPage from './pages/admin/OrderManagementPage';
import BookingManagementPage from './pages/admin/BookingManagementPage';
import SettingsPage from './pages/admin/SettingsPage';
import ForgotPasswordPage from './pages/admin/ForgotPasswordPage';
import ResetPasswordPage from './pages/admin/ResetPasswordPage';
import StaffManagementPage from './pages/admin/StaffManagementPage';
import CustomerManagementPage from './pages/admin/CustomerManagementPage';
import ContactMessagesPage from './pages/admin/ContactMessagesPage';
import SMSCreditsPage from './pages/admin/SMSCreditsPage';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import { Navigate } from 'react-router-dom';

// POS Pages
import POSLayout from './components/pos/POSLayout';
import POSTablesPage from './pages/pos/POSTablesPage';
import POSOrderPage from './pages/pos/POSOrderPage';
import POSLoginPage from './pages/pos/POSLoginPage';
import POSWalkInPage from './pages/pos/POSWalkInPage';
import CustomerMenuPage from './pages/CustomerMenuPage';
import POSMyOrdersPage from './pages/pos/POSMyOrdersPage';
import KDSPage from './pages/pos/KDSPage';
import POSPaymentPage from './pages/pos/POSPaymentPage';
import POSCallHistoryPage from './pages/pos/POSCallHistoryPage';
import POSHistoryPage from './pages/pos/POSHistoryPage';
import { POSProvider, usePOS } from './context/POSContext';
import { OfflineProvider } from './context/OfflineContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import AuthCallbackHandler from './components/AuthCallbackHandler';
import GoogleAnalyticsTracker from './components/GoogleAnalyticsTracker';

const RequirePOSAuth = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = usePOS();
  if (loading) return <div>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/pos/login" replace />;
};

function App() {
  const { settings } = useSettings();
  useEffect(() => {
    document.title = settings?.name || 'Restaurant';
  }, [settings]);
  return (
    <HashRouter>
      <AuthCallbackHandler />
      <AdminProvider>
        <OrderProvider>
          <SettingsProvider>
            <GoogleAnalyticsTracker />
            <POSProvider>
              <OfflineProvider>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={
                    <div className="flex flex-col min-h-screen">
                      <Header />
                      <main className="flex-grow">
                        <HomePage />
                      </main>
                      <Footer />
                    </div>
                  } />
                  <Route path="/contact" element={
                    <div className="flex flex-col min-h-screen">
                      <Header />
                      <main className="flex-grow">
                        <ContactPage />
                      </main>
                      <Footer />
                    </div>
                  } />
                  <Route path="/about" element={
                    <div className="flex flex-col min-h-screen">
                      <Header />
                      <main className="flex-grow">
                        <AboutPage />
                      </main>
                      <Footer />
                    </div>
                  } />
                  <Route path="/order" element={
                    <div className="flex flex-col min-h-screen">
                      <Header />
                      <main className="flex-grow">
                        <OrderPage />
                      </main>
                      <Footer />
                    </div>
                  } />
                  <Route path="/booking" element={
                    <div className="flex flex-col min-h-screen">
                      <Header />
                      <main className="flex-grow">
                        <BookingPage />
                      </main>
                      <Footer />
                    </div>
                  } />
                  <Route path="/menu" element={
                    <div className="flex flex-col min-h-screen">
                      <Header />
                      <main className="flex-grow">
                        <MenuPage />
                      </main>
                      <Footer />
                    </div>
                  } />
                  <Route path="/terms" element={
                    <div className="flex flex-col min-h-screen">
                      <Header />
                      <main className="flex-grow">
                        <TermsPage />
                      </main>
                      <Footer />
                    </div>
                  } />

                  {/* Admin Routes */}
                  <Route path="/admin/login" element={<LoginPage />} />
                  <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="menu" element={<MenuManagementPage />} />
                    <Route path="orders" element={<OrderManagementPage />} />
                    <Route path="bookings" element={<BookingManagementPage />} />
                    <Route path="customers" element={<CustomerManagementPage />} />
                    <Route path="staff" element={<StaffManagementPage />} />
                    <Route path="messages" element={<ContactMessagesPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="credits" element={<SMSCreditsPage />} />
                    <Route path="super" element={<SuperAdminDashboard />} />
                  </Route>

                  {/* POS Routes - Wrapped in POSProvider */}
                  <Route path="/pos/login" element={<POSLoginPage />} />

                  <Route path="/pos" element={
                    <RequirePOSAuth>
                      <POSLayout />
                    </RequirePOSAuth>
                  }>
                    <Route index element={<POSTablesPage />} />
                    <Route path="walk-in" element={<POSWalkInPage />} />
                    <Route path="my-orders" element={<POSMyOrdersPage />} />
                    <Route path="kds" element={<KDSPage />} />
                    <Route path="calls" element={<POSCallHistoryPage />} />
                    <Route path="history" element={<POSHistoryPage />} />
                    <Route path="order/:tableId" element={<POSOrderPage />} />
                    <Route path="payment/:orderId" element={<POSPaymentPage />} />
                  </Route>

                  {/* Public Customer Routes */}
                  <Route path="/menu/:tableId" element={<CustomerMenuPage />} />

                  {/* Catch all - redirects to home for unknown routes (fixes Supabase hash routing issues) */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </OfflineProvider>
            </POSProvider>
          </SettingsProvider>
        </OrderProvider>
      </AdminProvider>
    </HashRouter>
  );
};

export default App;