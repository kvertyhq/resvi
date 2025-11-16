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
      <OrderProvider>
        <SettingsProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="about" element={<PlaceholderPage title="About Us" />} />
                <Route path="order" element={<OrderPage />} />
                <Route path="booking" element={<BookingPage />} />
                <Route path="menu" element={<MenuPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </SettingsProvider>
      </OrderProvider>
    </HashRouter>
  );
};

export default App;