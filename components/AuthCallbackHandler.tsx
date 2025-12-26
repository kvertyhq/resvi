import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const AuthCallbackHandler: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const { hash, pathname } = location;

        // Helper to parse query-like string
        const parseParams = (str: string) => new URLSearchParams(str.replace(/^#|\//g, ''));

        let params = new URLSearchParams();
        if (hash) {
            params = parseParams(hash);
        }
        // In HashRouter, Supabase's #access_token=... becomes the pathname like "/access_token=..."
        // We need to check pathname if it looks like params
        if (pathname && (pathname.includes('error=') || pathname.includes('access_token='))) {
            params = parseParams(pathname);
        }

        const error = params.get('error');
        const error_description = params.get('error_description');
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const type = params.get('type');

        if (error) {
            console.error('Auth Callback Error:', error, error_description);
            // Redirect to login with error
            navigate('/admin/login', {
                state: {
                    error: error_description?.replace(/\+/g, ' ') || 'Authentication failed. Please try again.'
                },
                replace: true
            });
            return;
        }

        if (access_token && refresh_token) {
            // Manually set session since HashRouter might confuse Supabase's auto-detection
            supabase.auth.setSession({
                access_token,
                refresh_token,
            }).then(({ data, error }) => {
                if (error) {
                    console.error('Error setting session:', error);
                    navigate('/admin/login', {
                        state: { error: 'Failed to establish session from link.' },
                        replace: true
                    });
                } else {
                    // Session established, now redirect
                    if (type === 'recovery' || type === 'invite') {
                        navigate('/admin/reset-password', { replace: true });
                    } else {
                        navigate('/admin/dashboard', { replace: true });
                    }
                }
            });
            return;
        }
    }, [location, navigate]);

    return null;
};

export default AuthCallbackHandler;
