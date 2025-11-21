import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { formatOpeningHours } from '../utils/formatOpeningHours';

const ReservationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H7.5A2.25 2.25 0 005.25 6v10.5A2.25 2.25 0 007.5 18.75h9A2.25 2.25 0 0018.75 16.5V6A2.25 2.25 0 0016.5 3.75z" />
  </svg>
);
const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const DecorativeElement = () => (
  <div className="flex items-center justify-center space-x-2 my-4">
    <span className="block h-px w-8 bg-brand-gold/50"></span>
    <span className="block h-1.5 w-1.5 border border-brand-gold/50"></span>
    <span className="block h-px w-8 bg-brand-gold/50"></span>
  </div>
);


const ContactPage: React.FC = () => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    humanCheck: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.humanCheck !== '4') {
      alert('Incorrect answer to the human check question.');
      return;
    }
    console.log('Form submitted:', formData);
    alert('Thank you for your message! We will be in touch soon.');
    setFormData({
      name: '',
      email: '',
      message: '',
      humanCheck: '',
    });
  };

  return (
    <div className="bg-white text-brand-dark-gray">
      {/* Banner Section */}
      <section className="bg-brand-dark-gray text-white pt-20 pb-32 text-center relative">
        <DecorativeElement />
        <h1 className="text-5xl md:text-6xl font-serif">Contact Us</h1>
        <p className="mt-4 text-gray-400 font-sans tracking-wider">Per consequat adolescens ex cu nibh commune</p>
        {/* Jagged Edge */}
        <div className="absolute bottom-0 left-0 w-full h-4 bg-repeat-x" style={{
          backgroundImage: "linear-gradient(135deg, white 25%, transparent 25%), linear-gradient(225deg, white 25%, transparent 25%)",
          backgroundPosition: "0 0",
          backgroundSize: "8px 8px"
        }}></div>
      </section>

      {/* Info Cards */}
      <section className="bg-brand-light-gray pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto -mt-20 relative z-10">
            <InfoCard
              icon={<ReservationIcon />}
              title="Reservations"
              lines={[`${settings?.phone || ''} - ${settings?.email || ''}`, "- Or use the online form -"]}
            />
            <InfoCard
              icon={<LocationIcon />}
              title="Address"
              lines={[`${settings?.address_line1 || ''}, ${settings?.address_line2 || ''}`, "- Get Directions -"]}
            />
            <InfoCard
              icon={<ClockIcon />}
              title="Opening Hours"
              lines={(() => {
                if (!settings?.opening_hours) return ["MON to FRI 9am-6pm | SAT 9am-2pm", "- Sunday Closed -"];
                return formatOpeningHours(settings.opening_hours);
              })()}
            />
          </div>
        </div>
      </section>

      {/* Form and Map Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Form */}
            <div>
              <h2 className="text-3xl font-serif mb-2">Drop Us a Line</h2>
              <div className="w-20 h-px bg-brand-gold mb-8"></div>
              <form className="space-y-6 font-sans" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea id="message" name="message" rows={5} value={formData.message} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold"></textarea>
                </div>
                <div className="flex items-center space-x-4">
                  <label htmlFor="human-check" className="whitespace-nowrap text-sm text-gray-700">Are you human? 3 + 1 =</label>
                  <input type="text" id="human-check" name="humanCheck" value={formData.humanCheck} onChange={handleChange} required className="w-24 px-4 py-3 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold" />
                </div>
                <div>
                  <button type="submit" className="bg-brand-gold text-white px-8 py-3 font-semibold tracking-wider hover:opacity-90 transition-opacity duration-300 uppercase text-sm">
                    Submit
                  </button>
                </div>
              </form>
            </div>
            {/* Map */}
            <div className="h-full min-h-[400px] mt-10 lg:mt-0">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '400px' }}
                loading="lazy"
                allowFullScreen
                src="https://maps.google.com/maps?q=24+South+Street,+Yeovil+BA20+1NN,+England&t=&z=13&ie=UTF8&iwloc=&output=embed"
                title="Google Map"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  lines: string[];
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, title, lines }) => (
  <div className="bg-white p-8 text-center shadow-xl border border-gray-100">
    <div className="flex justify-center mb-6">{icon}</div>
    <h3 className="text-xl font-bold font-serif mb-4 uppercase tracking-wider">{title}</h3>
    {lines.map((line, index) => (
      <p key={index} className={`text-brand-mid-gray text-sm ${index > 0 ? 'mt-2' : ''}`}>{line}</p>
    ))}
  </div>
);


export default ContactPage;
