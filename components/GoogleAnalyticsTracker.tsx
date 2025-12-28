import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

declare global {
    interface Window {
        dataLayer: any[];
        gtag: (...args: any[]) => void;
    }
}

const GoogleAnalyticsTracker: React.FC = () => {
    const { settings, loading } = useSettings();
    const location = useLocation();

    useEffect(() => {
        if (loading || !settings?.google_analytics_id) return;

        const measurementId = settings.google_analytics_id;

        // Check if script is already present
        if (document.getElementById('ga-script')) return;

        // Inject script
        const script = document.createElement('script');
        script.id = 'ga-script';
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        document.head.appendChild(script);

        // Initialize dataLayer and gtag
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', measurementId);

    }, [settings, loading]);

    useEffect(() => {
        if (loading || !settings?.google_analytics_id) return;

        // Track page view on route change
        if (window.gtag) {
            window.gtag('config', settings.google_analytics_id, {
                page_path: location.pathname + location.search,
            });
        }
    }, [location, settings, loading]);

    return null; // This component does not render anything
};

export default GoogleAnalyticsTracker;
