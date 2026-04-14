import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-brand-500/5 border border-white hover:border-brand-200 hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-gradient-to-br from-brand-100 to-teal-50 rounded-full blur-2xl opacity-50 group-hover:bg-brand-200 transition-colors duration-500"></div>
    <div className="relative">
      <div className="h-14 w-14 bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
        <Icon className="h-7 w-7 text-brand-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">{title}</h3>
      <p className="text-gray-600 leading-relaxed font-medium">{desc}</p>
    </div>
  </div>
);

const Landing = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32 lg:pt-36 lg:pb-40">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-300 rounded-full blur-[120px] opacity-20 translate-x-1/3 -translate-y-1/4 mix-blend-multiply" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-300 rounded-full blur-[100px] opacity-20 -translate-x-1/3 translate-y-1/3 mix-blend-multiply" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/60 backdrop-blur-md text-brand-700 font-bold mb-10 border border-brand-100 shadow-sm hover:shadow-md transition-shadow">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
            </span>
            Real-time workers available near you
          </div>
          
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-gray-900 tracking-tighter mb-8 leading-tight">
            Find Top Workers, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-teal-500 to-brand-400 drop-shadow-sm">
              Instantly.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
            ServEase connects you with highly-rated professionals near your location. Powered by real-time tracking and a fast AI recommendation engine.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-5">
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-500/25 transition-all hover:scale-105 hover:-translate-y-1 flex items-center justify-center gap-2 group">
              Hire a Worker
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 hover:border-gray-300 rounded-2xl font-bold text-lg shadow-sm hover:shadow transition-all flex items-center justify-center">
              Become a Worker
            </Link>
          </div>

          <div className="mt-14 flex items-center justify-center gap-8 text-sm font-semibold text-gray-500">
             <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-brand-500"/> No hidden fees</div>
             <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-brand-500"/> Verified Profiles</div>
             <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-brand-500"/> Instant Booking</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 relative z-10 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">Why choose <span className="text-brand-600">ServEase</span>?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">Experience seamless hiring with our state-of-the-art platform designed for unparalleled speed and reliability.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <FeatureCard 
              icon={MapPin} 
              title="Real-Time Tracking" 
              desc="See worker locations on a live interactive map and find the closest professional to you instantly."
            />
            <FeatureCard 
              icon={Zap} 
              title="AI Recommendations" 
              desc="Our MongoDB $geoNear engine calculates the perfect match based on exact distance, price, and top ratings."
            />
            <FeatureCard 
              icon={ShieldCheck} 
              title="Verified Quality" 
              desc="All workers are vetted and reviewed by the community. You only get the best service, guaranteed."
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
