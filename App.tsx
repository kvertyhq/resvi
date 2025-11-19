import { HashRouter, Routes, Route } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from 'react';
// Context
import { OrderProvider } from './context/OrderContext';

// Pages
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import OrderPage from './pages/OrderPage';
import BookingPage from './pages/BookingPage';
import MenuPage from './pages/MenuPage';
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { AdminProvider } from './context/AdminContext';

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
import { Navigate } from 'react-router-dom';

// Components
import Header from './components/Header';
import Footer from './components/Footer';

// Placeholder pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="h-[50vh] flex items-center justify-center bg-gray-100">
    <h1 className="text-4xl font-serif text-brand-dark-gray">{title}</h1>
  </div>
);

const App: React.FC = () => {
  const { settings } = useSettings();
  useEffect(() => {
    document.title = settings?.name;
  }, [settings]);
  return (
    <HashRouter>
      <AdminProvider>
        <OrderProvider>
          <SettingsProvider>
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
                    <PlaceholderPage title="About Us" />
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
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </SettingsProvider>
        </OrderProvider>
      </AdminProvider>
    </HashRouter>
  );
};

export default App;