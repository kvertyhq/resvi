import React from 'react';

const TermsPage: React.FC = () => {
    return (
        <div className="bg-white text-brand-dark-gray font-sans min-h-screen">
            {/* Banner Section */}
            <section className="bg-brand-mid-gray text-white py-16 text-center">
                <div className="flex items-center justify-center space-x-2 my-4">
                    <span className="block h-px w-8 bg-brand-gold/50"></span>
                    <span className="block h-1.5 w-1.5 border border-brand-gold/50"></span>
                    <span className="block h-px w-8 bg-brand-gold/50"></span>
                </div>
                <h1 className="text-5xl font-serif">Terms and Conditions</h1>
                <p className="mt-2 text-gray-400">Please read our policies carefully</p>
            </section>

            {/* Content Section */}
            <section className="py-12 md:py-20 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                    <div className="bg-white p-8 md:p-12 shadow-lg rounded-sm space-y-8">

                        <div>
                            <h2 className="text-2xl font-serif text-brand-dark mb-4">1. Booking Policy</h2>
                            <p className="text-gray-600 leading-relaxed">
                                All bookings are subject to availability. We reserve the right to cancel or modify bookings where it appears that a customer has engaged in fraudulent or inappropriate activity or under other circumstances where it appears that the reservations contain or resulted from a mistake or error.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-serif text-brand-dark mb-4">2. Cancellation Policy</h2>
                            <p className="text-gray-600 leading-relaxed">
                                We respectfully ask that you give us at least 24 hours notice if you need to cancel your reservation. Cancellations made with less than 24 hours notice may be subject to a cancellation fee.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-serif text-brand-dark mb-4">3. Arrival Time</h2>
                            <p className="text-gray-600 leading-relaxed">
                                Please arrive on time for your reservation. We will hold your table for 15 minutes past your reservation time. If you are running late, please call us to let us know.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-serif text-brand-dark mb-4">4. Dietary Requirements</h2>
                            <p className="text-gray-600 leading-relaxed">
                                Please inform us of any allergies or dietary requirements at the time of booking. While we take every precaution, we cannot guarantee that our dishes are completely free from allergens due to the nature of our kitchen environment.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-serif text-brand-dark mb-4">5. Groups</h2>
                            <p className="text-gray-600 leading-relaxed">
                                For groups of 8 or more, a deposit may be required to secure the booking. A discretionary service charge may be added to the final bill for large groups.
                            </p>
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
};

export default TermsPage;
