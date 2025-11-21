
import React from 'react';
import { useSettings } from '@/context/SettingsContext';
import { formatOpeningHours } from '@/utils/formatOpeningHours';


import { Instagram, Facebook } from 'lucide-react';


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
                        <p>{settings?.phone}</p>
                        <p>{settings?.email}</p>
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
                        <a href="https://www.instagram.com/danielsushi.steak.seafood/" className="hover:text-white" target="_blank"><Instagram className="w-5 h-5" /></a>
                        <a href="https://www.facebook.com/danielsushiyeovil/" className="hover:text-white" target="_blank"><Facebook className="w-5 h-5" /></a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
