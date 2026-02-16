import { useSettings } from '@/context/SettingsContext';
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';



const MenuIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
    </svg>
);

const CloseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinkClasses = "text-gray-300 hover:text-white transition duration-300 uppercase tracking-wider text-sm";
    const activeLinkClasses = "text-white";

    const NavLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => (
        <>
            <NavLink to="/" onClick={onLinkClick} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`} end>Home</NavLink>
            <NavLink to="/about" onClick={onLinkClick} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>About Us</NavLink>
            <NavLink to="/contact" onClick={onLinkClick} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>Contact Us</NavLink>
            <NavLink to="/order" onClick={onLinkClick} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>Order Online</NavLink>
            {settings?.bookings_enabled !== false && (
                <NavLink to="/booking" onClick={onLinkClick} className="px-5 py-2 border border-white text-white hover:bg-white hover:text-brand-dark transition duration-300 uppercase tracking-wider text-sm">Book a Table</NavLink>
            )}
        </>
    );
    const { settings } = useSettings();

    return (
        <header className="bg-brand-dark-gray text-white shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex-shrink-0">
                        <NavLink to="/" onClick={() => setIsMenuOpen(false)} className="text-xl font-serif tracking-widest">
                            {settings?.logo_url ? (
                                <img src={settings.logo_url} alt={settings.name || 'Restaurant Logo'} className="h-12 w-auto object-contain" />
                            ) : (
                                settings?.name
                            )}
                        </NavLink>
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                        <NavLinks />
                    </div>

                    <div className="md:hidden flex items-center">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white" aria-label="Toggle menu">
                            {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                        </button>
                    </div>
                </div>
            </div>

            {isMenuOpen && (
                <div className="md:hidden bg-brand-dark-gray">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col items-center">
                        <NavLinks onLinkClick={() => setIsMenuOpen(false)} />
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
