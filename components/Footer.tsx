
import React from 'react';
import { useSettings } from '@/context/SettingsContext';

const TwitterIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>
);
const InstagramIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.024.06 1.378.06 3.808s-.012 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.024.048-1.378.06-3.808.06s-2.784-.013-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.378-.06-3.808s.012-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.345 2.525c.636-.247 1.363-.416 2.427-.465C9.795 2.013 10.148 2 12.315 2zm-1.161 14.545a4.344 4.344 0 100-8.688 4.344 4.344 0 000 8.688zM12 15.318a3.318 3.318 0 110-6.636 3.318 3.318 0 010 6.636z" clipRule="evenodd"></path><path d="M16.949 7.426a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z"></path></svg>
);
const GlobeIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.093l-1.34.23a.75.75 0 00-.55 1.05l.348.666a.75.75 0 001.05.55l.318-.179v.214a.75.75 0 00.75.75h.383a.75.75 0 00.75-.75v-.214l.318.18a.75.75 0 001.05-.55l.348-.667a.75.75 0 00-.55-1.05l-1.34-.23A.75.75 0 0012.75 6zM9.25 10.895a.75.75 0 00-1.05-.55l-1.34.23a.75.75 0 00-.55 1.05l.348.666a.75.75 0 001.05.55l.318-.18v.214a.75.75 0 00.75.75h.383a.75.75 0 00.75-.75v-.214l.318.18a.75.75 0 001.05-.55l.348-.667a.75.75 0 00-.55-1.05l-1.34-.23z" clipRule="evenodd"></path></svg>
);


const Footer: React.FC = () => {
    const { settings } = useSettings();
    console.log(settings)
    return (
        <footer className="bg-brand-dark text-gray-400 font-sans">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
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
                        <p>Mon - Sat: 10am - 11pm</p>
                        <p>Sunday: Closed</p>
                    </div>

                    {/* Keep in touch */}
                    <div>
                        <h3 className="text-white text-lg font-serif tracking-wider mb-4">Keep in touch</h3>
                        <div className="flex">
                            <input type="email" placeholder="Your email" className="bg-brand-dark-gray border-none px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-gold w-full" />
                            <button className="bg-brand-gold text-white px-4 py-2 hover:bg-yellow-700 transition duration-300">&#62;</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-black py-4">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-sm">
                    <p>&copy; {settings?.name} - All rights reserved</p>
                    <div className="flex space-x-4 mt-4 sm:mt-0">
                        <a href="#" className="hover:text-white"><TwitterIcon /></a>
                        <a href="#" className="hover:text-white"><InstagramIcon /></a>
                        <a href="#" className="hover:text-white"><GlobeIcon /></a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
