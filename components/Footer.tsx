
import React from 'react';
import { useSettings } from '@/context/SettingsContext';
import { formatOpeningHours } from '@/utils/formatOpeningHours';


import { Instagram, Facebook, Twitter, Youtube, Music } from 'lucide-react';
// Note: Lucide might not have a dedicated TikTok icon in all versions, using Music as a fallback if needed,
// but check for 'Tiktok' first. If it fails, 'Music' is a common fallback.
// Some versions use 'Tiktok' (capital T then lowercase).


const Footer: React.FC = () => {
    const { settings } = useSettings();
    console.log(settings)
    return (
        <footer className="bg-brand-dark text-gray-400 font-sans">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {/* Address */}
                    <div>
                        <h3 className="text-white text-lg font-serif tracking-wider mb-4">Address</h3>
                        <p>{settings?.address_line1}</p>
                        <p>{settings?.address_line2}</p>
                    </div>

                    {/* Reservations */}
                    <div>
                        <h3 className="text-white text-lg font-serif tracking-wider mb-4">Reservations</h3>
                        {settings?.phone && (
                            <p>
                                <a href={`tel:${settings.phone}`} className="hover:text-white transition-colors">{settings.phone}</a>
                            </p>
                        )}
                        {settings?.email && (
                            <p>
                                <a href={`mailto:${settings.email}`} className="hover:text-white transition-colors">{settings.email}</a>
                            </p>
                        )}
                    </div>

                    {/* Opening Hours */}
                    <div>
                        <h3 className="text-white text-lg font-serif tracking-wider mb-4">Opening Hours</h3>
                        {settings?.opening_hours ? (
                            formatOpeningHours(settings.opening_hours).map((line, index) => (
                                <p key={index}>{line}</p>
                            ))
                        ) : (
                            <>
                                <p>Mon - Sat: 10am - 11pm</p>
                                <p>Sunday: Closed</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-black py-4">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-sm">
                    <p>&copy; {settings?.name} - All rights reserved</p>
                    <div className="flex space-x-4 mt-4 sm:mt-0">
                        {settings?.instagram_url && (
                            <a href={settings.instagram_url} className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                                <Instagram className="w-5 h-5" />
                            </a>
                        )}
                        {settings?.facebook_url && (
                            <a href={settings.facebook_url} className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                                <Facebook className="w-5 h-5" />
                            </a>
                        )}
                        {settings?.twitter_url && (
                            <a href={settings.twitter_url} className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                                <Twitter className="w-5 h-5" />
                            </a>
                        )}
                        {settings?.youtube_url && (
                            <a href={settings.youtube_url} className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                                <Youtube className="w-5 h-5" />
                            </a>
                        )}
                        {settings?.tiktok_url && (
                            <a href={settings.tiktok_url} className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                                <Music className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
