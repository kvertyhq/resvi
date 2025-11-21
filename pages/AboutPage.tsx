import React from 'react';
import { useSettings } from '../context/SettingsContext';

const AboutPage: React.FC = () => {
    const { settings } = useSettings();

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section
                className="relative bg-cover bg-center h-[50vh] flex items-center justify-center text-white"
                style={{ backgroundImage: "url('https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg')" }}
            >
                <div className="absolute inset-0 bg-black opacity-60"></div>
                <div className="relative z-10 text-center px-4">
                    <h1 className="text-5xl md:text-6xl font-serif tracking-wider mb-4">About Us</h1>
                    <p className="text-xl md:text-2xl font-light tracking-wide text-gray-200">Passion on a Plate</p>
                </div>
            </section>

            {/* Content Section 1: Philosophy */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 container mx-auto">
                <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="md:w-1/2 space-y-6">
                        <h2 className="text-3xl font-serif font-bold text-brand-dark-gray">Our Philosophy</h2>
                        <div className="w-20 h-1 bg-brand-gold"></div>
                        <p className="text-gray-600 leading-relaxed text-lg">
                            Good food means good mood. The health benefits of eating Daniel Sushi are surprisingly great as it meets the daily nutrition requirements and fulfills the sudden hunger for complete comfort food that you can have.
                        </p>
                        <p className="text-gray-600 leading-relaxed text-lg">
                            We believe in using only the freshest ingredients to create dishes that not only taste amazing but also make you feel good.
                        </p>
                    </div>
                    <div className="md:w-1/2">
                        <div className="relative h-80 w-full rounded-lg overflow-hidden shadow-xl">
                            <img
                                src="https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/689.jpg"
                                alt="Sushi Preparation"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Content Section 2: Steak Experience */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row-reverse items-center gap-12">
                        <div className="md:w-1/2 space-y-6">
                            <h2 className="text-3xl font-serif font-bold text-brand-dark-gray">The Steak Experience</h2>
                            <div className="w-20 h-1 bg-brand-gold"></div>
                            <p className="text-gray-600 leading-relaxed text-lg">
                                Steak Feast - Not your typical steak food. Our highly trained chefs and the high quality meat will convince even the most demanding steak lovers. Try with steamed rice for great taste.
                            </p>
                            <p className="text-gray-600 leading-relaxed text-lg">
                                Every cut is carefully selected and prepared to perfection, ensuring a dining experience that is both memorable and satisfying.
                            </p>
                        </div>
                        <div className="md:w-1/2">
                            <div className="relative h-80 w-full rounded-lg overflow-hidden shadow-xl">
                                <img
                                    src="https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/694.jpg"
                                    alt="Steak Dish"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

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
