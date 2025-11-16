import React from 'react';
import { NavLink } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section 
        className="relative bg-cover bg-center h-[75vh] flex items-center justify-center text-white"
        style={{ backgroundImage: "url('https://picsum.photos/1920/1080?grayscale&blur=2')" }}
      >
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-serif tracking-wider">Taste Unique Food</h1>
            <p className="mt-4 text-lg md:text-xl text-gray-300">Delicious food since 2005</p>
            <NavLink 
                to="menu" 
                className="mt-8 inline-block bg-brand-gold text-white px-8 py-3 font-semibold tracking-wider hover:bg-yellow-700 transition duration-300"
            >
                Read more
            </NavLink>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <span className="text-9xl md:text-[20rem] font-bold text-white tracking-widest">450x750</span>
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
                    bgImageUrl="https://picsum.photos/600/400?grayscale&random=1"
                />
                <FeatureCard 
                    title="DELIVERY" 
                    subtitle="Home delivery or take away food" 
                    linkTo="order"
                    bgImageUrl="https://picsum.photos/600/400?grayscale&random=2"
                />
                <FeatureCard 
                    title="INSIDE KVERTY" 
                    subtitle="View the Gallery" 
                    linkTo="about"
                    bgImageUrl="https://picsum.photos/600/400?grayscale&random=3"
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
        <NavLink to={linkTo} className="group relative block h-64 bg-cover bg-center text-white p-8" style={{backgroundImage: `url('${bgImageUrl}')`}}>
            <div className="absolute inset-0 bg-black opacity-60 group-hover:opacity-70 transition-opacity duration-300"></div>
             <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <span className="text-9xl font-bold text-white tracking-widest">600</span>
            </div>
            <div className="relative z-10 text-center flex flex-col items-center justify-center h-full">
                <h3 className="text-2xl font-serif tracking-wider">{title}</h3>
                <p className="mt-2 text-gray-300">{subtitle}</p>
            </div>
        </NavLink>
    );
}

export default HomePage;