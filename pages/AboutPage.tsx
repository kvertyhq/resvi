import React from 'react';
import { useSettings } from '../context/SettingsContext';

const AboutPage: React.FC = () => {
    const { settings } = useSettings();

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section
                className="relative bg-cover bg-center h-[50vh] flex items-center justify-center text-white"
                style={{ backgroundImage: `url('${settings?.website_settings?.about_image_url || "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg"}')` }}
            >
                <div className="absolute inset-0 bg-black opacity-60"></div>
                <div className="relative z-10 text-center px-4 flex flex-col items-center">
                    <h1 className="text-5xl md:text-6xl font-serif tracking-wider mb-4">About Us</h1>
                    <p className="text-xl md:text-2xl font-light tracking-wide text-gray-200">
                        {settings?.website_settings?.about_subtitle || "Passion on a Plate"}
                    </p>
                    <div className="w-12 h-px bg-brand-gold mt-4"></div>
                </div>
            </section>

            {/* Dynamic Content Sections */}
            {(settings?.website_settings?.about_sections || []).map((section: any, index: number) => (
                <section key={index} className={`py-20 px-4 sm:px-6 lg:px-8 ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <div className="container mx-auto">
                        <div className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12`}>
                            <div className="md:w-1/2 space-y-6">
                                <h2 className="text-3xl font-serif font-bold text-brand-dark-gray">{section.title}</h2>
                                <div className="w-20 h-1 bg-brand-gold"></div>
                                <div className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                                    {section.content}
                                </div>
                            </div>
                            <div className="md:w-1/2">
                                <div className="relative h-80 w-full rounded-lg overflow-hidden shadow-xl">
                                    <img
                                        src={section.image_url}
                                        alt={section.title}
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            ))}

            {/* Logo Section */}
            {settings?.logo_url && (
                <section className="py-20 px-4 text-center bg-white">
                    <div className="max-w-4xl mx-auto">
                        <img
                            src={settings.logo_url}
                            alt={settings.name || "Restaurant Logo"}
                            className="h-40 w-auto object-contain mx-auto mb-8 opacity-80 hover:opacity-100 transition-opacity duration-300"
                        />
                        <p className="text-gray-400 italic font-serif text-xl">"Where tradition meets modern taste"</p>
                    </div>
                </section>
            )}
        </div>
    );
};

export default AboutPage;
