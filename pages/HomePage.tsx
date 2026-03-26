import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FileText } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const HomePage: React.FC = () => {
    const { settings } = useSettings();
    const [menuPdfUrl, setMenuPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('restaurant_settings')
                .select('menu_pdf_url, is_menu_pdf_visible')
                .eq('id', import.meta.env.VITE_RESTAURANT_ID)
                .single();

            if (data && data.menu_pdf_url && data.is_menu_pdf_visible !== false) {
                setMenuPdfUrl(data.menu_pdf_url);
            }
        };
        fetchSettings();
    }, []);

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section
                className="relative bg-cover bg-center h-[75vh] flex items-center justify-center text-white"
                style={{ backgroundImage: `url('${settings?.website_settings?.cover_page_url || settings?.cover_page_url || "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/734.jpg"}')` }}
            >
                <div className="absolute inset-0 bg-black opacity-60"></div>
                <div className="relative z-10 text-center">
                    <h1 className="text-5xl md:text-7xl font-serif tracking-wider">Fuel Your Mood. Feed Your Cravings.</h1>
                    <p className="mt-4 text-lg md:text-xl text-gray-300">Indulge in mood-boosting sushi and expertly prepared steaks—made with high-quality ingredients and chef precision.</p>
                    <div className="mt-8 flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4">
                        <NavLink
                            to="order"
                            className="bg-brand-button text-white px-8 py-3 font-semibold tracking-wider hover:opacity-90 transition duration-300"
                        >
                            Order Now
                        </NavLink>
                        {menuPdfUrl && (
                            <a
                                href={menuPdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/30 text-white px-8 py-3 font-semibold tracking-wider hover:bg-white/20 transition duration-300"
                            >
                                <FileText className="mr-2 h-5 w-5" />
                                Download Menu
                            </a>
                        )}
                    </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none overflow-hidden">
                    <span className="text-9xl md:text-[20rem] font-bold text-white tracking-widest uppercase">
                        {settings?.website_settings?.watermark_text || settings?.watermark_text || "Daniel Sushi"}
                    </span>
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-white">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3">
                        <FeatureCard
                            title="OUR MENU"
                            subtitle="View Our Specialities"
                            linkTo="menu"
                            bgImageUrl={settings?.website_settings?.menu_image_url || settings?.menu_image_url || "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/689.jpg"}
                        />
                        <FeatureCard
                            title="DELIVERY"
                            subtitle="Home delivery or take away food"
                            linkTo="order"
                            bgImageUrl={settings?.website_settings?.delivery_image_url || settings?.delivery_image_url || "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/694.jpg"}
                        />
                        <FeatureCard
                            title="INSIDE"
                            subtitle="Our Story"
                            linkTo="about"
                            bgImageUrl={settings?.website_settings?.inside_story_image_url || settings?.inside_story_image_url || "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg"}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

interface FeatureCardProps {
    title: string;
    subtitle: string;
    linkTo: string;
    bgImageUrl: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, subtitle, linkTo, bgImageUrl }) => {
    return (
        <NavLink to={linkTo} className="group relative block h-64 bg-cover bg-center text-white p-8" style={{ backgroundImage: `url('${bgImageUrl}')` }}>
            <div className="absolute inset-0 bg-black opacity-60 group-hover:opacity-70 transition-opacity duration-300"></div>
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <span className="text-9xl font-bold text-white tracking-widest"></span>
            </div>
            <div className="relative z-10 text-center flex flex-col items-center justify-center h-full">
                <h3 className="text-2xl font-serif tracking-wider">{title}</h3>
                <p className="mt-2 text-gray-300">{subtitle}</p>
            </div>
        </NavLink>
    );
}

export default HomePage;