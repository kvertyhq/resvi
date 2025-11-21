import React from 'react';
import { useSettings } from '../context/SettingsContext';

const AboutPage: React.FC = () => {
    const { settings } = useSettings();

    return (
        <div className="bg-white py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl font-serif font-bold text-brand-dark-gray mb-8">About Us</h1>

                <div className="prose prose-lg mx-auto text-gray-600 space-y-6">
                    <p>
                        Good food means good mood. The health benefits of eating Daniel Sushi are surprisingly great as it meets the daily nutrition requirements and fulfills the sudden hunger for complete comfort food that you can have.
                    </p>
                    <p>
                        Steak Feast - Not your typical steak food. Our highly trained chefs and the high quality meat will convince even the most demanding steak lovers. Try with steamed rice for great taste.
                    </p>
                </div>

                {settings?.logo_url && (
                    <div className="mt-16 flex justify-center">
                        <img
                            src={settings.logo_url}
                            alt={settings.name || "Restaurant Logo"}
                            className="h-32 w-auto object-contain"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AboutPage;
