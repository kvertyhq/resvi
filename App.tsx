import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
// Context
import { OrderProvider } from './context/OrderContext';
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { AdminProvider } from './context/AdminContext';
import { MenuProvider } from './context/MenuContext';


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
import ReceiptSettingsPage from './pages/admin/ReceiptSettingsPage';
import ForgotPasswordPage from './pages/admin/ForgotPasswordPage';
import ResetPasswordPage from './pages/admin/ResetPasswordPage';
import StaffManagementPage from './pages/admin/StaffManagementPage';
import CustomerManagementPage from './pages/admin/CustomerManagementPage';
import ContactMessagesPage from './pages/admin/ContactMessagesPage';
import SMSCreditsPage from './pages/admin/SMSCreditsPage';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import { Navigate } from 'react-router-dom';
import StationManagementPage from './pages/admin/StationManagementPage'; // Correctly placed import

// POS Pages
import POSLayout from './components/pos/POSLayout';
import POSTablesPage from './pages/pos/POSTablesPage';
import POSOrderPage from './pages/pos/POSOrderPage';
import POSLoginPage from './pages/pos/POSLoginPage';
import POSWalkInPage from './pages/pos/POSWalkInPage';
import CustomerMenuPage from './pages/CustomerMenuPage';
import POSMyOrdersPage from './pages/pos/POSMyOrdersPage';
import PublicReceiptPage from './pages/public/PublicReceiptPage';
import KDSPage from './pages/pos/KDSPage';
import POSPaymentPage from './pages/pos/POSPaymentPage';
import POSCallHistoryPage from './pages/pos/POSCallHistoryPage';
import POSHistoryPage from './pages/pos/POSHistoryPage';
import POSPhoneOrderSetupPage from './pages/pos/POSPhoneOrderSetupPage';
import POSReportsPage from './pages/pos/POSReportsPage';
import POSReportPrintPage from './pages/pos/POSReportPrintPage';
import POSPrintLocalPage from './pages/pos/POSPrintLocalPage';
import { POSProvider, usePOS } from './context/POSContext';
import { OfflineProvider } from './context/OfflineContext';
import { SipProvider } from './context/SipContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import AuthCallbackHandler from './components/AuthCallbackHandler';
import GoogleAnalyticsTracker from './components/GoogleAnalyticsTracker';
import { useAlert } from './context/AlertContext';

const RequirePOSAuth = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = usePOS();
  if (loading) return <div>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/pos/login" replace />;
};

const SplashScreen = ({ logo, loading }: { logo?: string, loading: boolean }) => (
  <div className="fixed inset-0 bg-white dark:bg-black flex flex-col items-center justify-center z-[9999]">
    <div className="w-32 h-32 mb-8 animate-fade-in flex items-center justify-center">
      {logo ? (
        <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
      ) : (
        <div className="w-16 h-16 border-4 border-[var(--theme-color)] border-t-transparent rounded-full animate-spin" />
      )}
    </div>
    <div className="flex flex-col items-center gap-2">
      <div className="text-gray-900 dark:text-white font-black text-2xl uppercase tracking-widest animate-pulse">
        {import.meta.env.VITE_APP_MODE === 'pos' ? 'POS System' : 'Loading'}
      </div>
      <div className="h-1 w-48 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-[var(--theme-color)] animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
      </div>
    </div>
    <style>{`
      @keyframes loading {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(250%); }
      }
    `}</style>
  </div>
);

const RedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = usePOS();
  const { loading: settingsLoading } = useSettings();

  useEffect(() => {
    // Only redirect if at the root path and settings have loaded
    if (!settingsLoading && location.pathname === '/') {
      const mode = import.meta.env.VITE_APP_MODE;
      if (mode === 'pos') {
        navigate(isAuthenticated ? '/pos' : '/pos/login', { replace: true });
      } else if (mode === 'admin') {
        navigate('/admin/login', { replace: true });
      }
    }
  }, [navigate, location.pathname, isAuthenticated, settingsLoading]);
  return null;
};

function App() {
  const { settings, loading } = useSettings();
  const { showPrompt, showAlert } = useAlert();

  useEffect(() => {
    const setupCloseIntercept = async () => {
      // @ts-ignore
      if (window.__TAURI_INTERNALS__) {
        try {
          const appWindow = getCurrentWindow();
          const unlisten = await appWindow.onCloseRequested(async (event) => {
            event.preventDefault();
            
            const pwd = await showPrompt('System Authorization', 'Enter System Password to close the application:', 'warning', 'password');
            const systemPassword = import.meta.env.VITE_SYSTEM_PASSWORD || '1234';
            
            if (pwd === systemPassword) {
              await appWindow.destroy();
            } else if (pwd !== null) {
              showAlert('Access Denied', 'Incorrect password. App will stay open.', 'error');
            }
          });
          return unlisten;
        } catch (err) {
          console.error("Failed to setup close intercept:", err);
        }
      }
      return undefined;
    };

    let unlistenFn: (() => void) | undefined;
    setupCloseIntercept().then(fn => { if (fn) unlistenFn = fn; });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  useEffect(() => {
    if (settings?.name) {
      document.title = settings.name;
    }
  }, [settings]);

  if (loading) {
    return <SplashScreen logo={settings?.logo_url} loading={loading} />;
  }

  return (
    <HashRouter>
      <AuthCallbackHandler />
      <AdminProvider>
        <MenuProvider>
          <OrderProvider>

          <GoogleAnalyticsTracker />
          <POSProvider>
            <SipProvider>
              <OfflineProvider>
                <RedirectHandler />
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={
                    import.meta.env.VITE_APP_MODE ? (
                      <SplashScreen logo={settings?.logo_url} loading={true} />
                    ) : (
                      <div className="flex flex-col min-h-screen">
                        <Header />
                        <main className="flex-grow">
                          <HomePage />
                        </main>
                        <Footer />
                      </div>
                    )
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
                    <Route path="settings/receipts" element={<ReceiptSettingsPage />} />
                    <Route path="stations" element={<StationManagementPage />} />
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
                    <Route path="phone-setup" element={<POSPhoneOrderSetupPage />} />
                    <Route path="my-orders" element={<POSMyOrdersPage />} />
                    <Route path="kds" element={<KDSPage />} />
                    <Route path="calls" element={<POSCallHistoryPage />} />
                    <Route path="history" element={<POSHistoryPage />} />
                    <Route path="reports" element={<POSReportsPage />} />
                    <Route path="order/:tableId" element={<POSOrderPage />} />
                    <Route path="payment/:orderId" element={<POSPaymentPage />} />
                  </Route>

                  {/* Standalone POS Routes (No Layout) */}
                  <Route path="/pos/print-report" element={
                    <RequirePOSAuth>
                      <POSReportPrintPage />
                    </RequirePOSAuth>
                  } />
                  <Route path="/pos/print-local" element={
                    <RequirePOSAuth>
                      <POSPrintLocalPage />
                    </RequirePOSAuth>
                  } />

                  {/* Public Customer Routes */}
                  <Route path="/menu/:tableId" element={<CustomerMenuPage />} />
                  <Route path="/r/:orderId" element={<PublicReceiptPage />} />

                  {/* Catch all - redirects to home for unknown routes (fixes Supabase hash routing issues) */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </OfflineProvider>
            </SipProvider>
          </POSProvider>
          </OrderProvider>
        </MenuProvider>
      </AdminProvider>
    </HashRouter>
  );
};

export default App;