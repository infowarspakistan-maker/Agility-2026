import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Calendar, Users, ArrowRight, Shield, Star, CheckCircle2, Plane, Landmark, Compass, ShieldCheck, Map, Briefcase, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { useState, useEffect } from 'react';
import { packageService } from '@/src/services/api';
import { TravelPackage } from '@/src/types';

const CATEGORIES = [
  { id: 'umrah', title: 'Umrah', icon: Landmark, color: 'bg-emerald-500', img: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80', href: '/packages/umrah' },
  { id: 'haj', title: 'Haj 2026', icon: Landmark, color: 'bg-amber-500', img: 'https://images.unsplash.com/photo-1542640244-7e672d6cef21?auto=format&fit=crop&w=800&q=80', href: '/packages/haj' },
  { id: 'domestic', title: 'Northern Pakistan', icon: Compass, color: 'bg-sky-500', img: 'https://images.unsplash.com/photo-1581442111558-86d4e08c8e1e?auto=format&fit=crop&w=800&q=80', href: '/packages/domestic-group' },
  { id: 'visas', title: 'Visa Services', icon: Shield, color: 'bg-orange-500', img: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=800&q=80', href: '/packages/visa' },
  { id: 'expo', title: 'Global EXPO Deals', icon: Briefcase, color: 'bg-purple-600', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80', href: '/packages/expo' },
  { id: 'study-abroad', title: 'Study Abroad Services', icon: GraduationCap, color: 'bg-rose-500', img: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80', href: '/packages/study-abroad' },
];

const HERO_SLIDES = [
  {
    tagline: 'Experience the Extraordinary',
    title: 'Spiritual Journeys & Sacred Guides',
    description: 'Premium custom Umrah & Haj 2026 packages. Tailored itineraries, luxury lodging close to Haram, and expert religious guidance.',
    image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070&auto=format&fit=crop',
    actionText: 'Explore Umrah Packages',
    href: '/packages/umrah'
  },
  {
    tagline: 'Global Pathways & Careers',
    title: 'Study Abroad Services & Pathway Support',
    description: 'Complete assistance for admission in top international universities, blocked bank accounts setup, documentation profiling, and high-success visa coaching.',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop',
    actionText: 'Explore Study Abroad',
    href: '/packages/study-abroad'
  },
  {
    tagline: 'Premier Business Engagement',
    title: 'EXPO Passes & Corporate Sponsorship',
    description: 'Secure premium delegate cards, B2B matchmaking invitations, prestigious pavilion access, and seamless corporate travel arrangements for trade exhibitions.',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop',
    actionText: 'Explore EXPO Deals',
    href: '/packages/expo'
  }
];

export default function Home() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('packages');
  const [featuredPackages, setFeaturedPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const data = await packageService.getFeatured();
        setFeaturedPackages(data.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch featured packages:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden py-24 md:py-32">
        {/* Slide Carousel Backgrounds */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-slate-950/60 z-10" />
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1 }}
              src={HERO_SLIDES[currentSlide].image} 
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
        </div>

        <div className="relative z-20 max-w-7xl mx-auto px-4 w-full text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center mb-8"
            >
              <span className="inline-block px-4 py-1.5 bg-orange-500 text-white text-[10px] font-black tracking-[0.2em] uppercase rounded-full mb-6 shadow-lg shadow-orange-500/25">
                {HERO_SLIDES[currentSlide].tagline}
              </span>
              <h1 className="text-4xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[0.95] tracking-tight max-w-5xl">
                {HERO_SLIDES[currentSlide].title}
              </h1>
              <p className="text-sm md:text-lg lg:text-xl text-white/90 mb-8 max-w-3xl mx-auto font-medium leading-relaxed">
                {HERO_SLIDES[currentSlide].description}
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center">
                <Link 
                  to={HERO_SLIDES[currentSlide].href}
                  className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all flex items-center gap-2 group shadow-lg shadow-orange-500/25"
                >
                  <span>{HERO_SLIDES[currentSlide].actionText}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/packages/all"
                  className="px-8 py-3.5 bg-white/15 hover:bg-white/25 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all border border-white/20 hover:border-white/45 backdrop-blur-sm"
                >
                  View All Services
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto glass-card rounded-2xl p-2 md:p-4 border-white/30 backdrop-blur-md">
            <div className="flex bg-white/10 rounded-xl overflow-hidden mb-4 p-1">
              {['Packages', 'Visas', 'Hotels'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                    activeTab === tab.toLowerCase() ? "bg-white text-slate-900 shadow-sm" : "text-white hover:bg-white/10"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div className="bg-white/20 rounded-xl p-3 flex items-center space-x-3 text-left">
                <MapPin className="text-orange-400 w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/60 font-bold uppercase">Destination</p>
                  <input className="bg-transparent text-white border-none outline-none text-sm placeholder:text-white/40 w-full" placeholder="Where to go?" />
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-3 flex items-center space-x-3 text-left">
                <Calendar className="text-orange-400 w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/60 font-bold uppercase">Departure</p>
                  <button className="text-white text-sm">Select Date</button>
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-3 flex items-center space-x-3 text-left">
                <Users className="text-orange-400 w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/60 font-bold uppercase">Passengers</p>
                  <button className="text-white text-sm">2 People</button>
                </div>
              </div>
              <button 
                onClick={() => navigate('/packages/all')}
                className="h-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center space-x-2 py-4 shadow-lg transition-all"
              >
                <Search size={20} />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>

        {/* Slide navigation controls */}
        <button 
          onClick={handlePrevSlide}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/20 hover:bg-black/40 text-white border border-white/10 hover:border-white/30 transition-all group backdrop-blur-sm"
          aria-label="Previous Slide"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <button 
          onClick={handleNextSlide}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/20 hover:bg-black/40 text-white border border-white/10 hover:border-white/30 transition-all group backdrop-blur-sm"
          aria-label="Next Slide"
        >
          <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Slide Indicators/Bullets */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                currentSlide === idx ? "w-6 bg-orange-500" : "w-1.5 bg-white/40 hover:bg-white/75"
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Our Services</span>
              <h2 className="text-4xl font-bold mt-2">Explore Our <span className="text-slate-400 italic">Specialties</span></h2>
            </div>
            <Link to="/packages/all" className="hidden md:flex items-center text-sm font-bold text-slate-600 hover:text-orange-500 transition-all border-b-2 border-slate-200 pb-1">
              View All Services <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORIES.map((cat, idx) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => navigate(cat.href)}
                className="group relative overflow-hidden rounded-3xl h-80 cursor-pointer"
              >
                <img src={cat.img} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className={cn("inline-flex p-3 rounded-2xl text-white mb-4 shadow-lg", cat.color)}>
                    <cat.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white leading-tight">{cat.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Packages */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
             <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Hand-Picked</span>
             <h2 className="text-4xl font-bold mt-2">Trending Packages</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-slate-100 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {featuredPackages.map((pkg, idx) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl shadow-slate-100/50 group"
                >
                  <div className="relative h-64 overflow-hidden">
                     <img src={pkg.images[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                     <div className="absolute top-4 left-4">
                       <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-bold rounded-full uppercase tracking-wider">{pkg.category}</span>
                     </div>
                     <div className="absolute top-4 right-4 bg-orange-500 text-white p-2 rounded-full shadow-lg">
                       <Star size={16} fill="white" />
                     </div>
                  </div>
                  <div className="p-8">
                     <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                       <MapPin size={14} className="mr-1 text-orange-500" />
                       {pkg.duration} Trip
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 mb-6 line-clamp-1">{pkg.title}</h3>
                     <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Starting from</p>
                          <p className="text-2xl font-bold text-slate-900">{pkg.currency} {pkg.price.toLocaleString()}</p>
                        </div>
                        <Link to={`/package/${pkg.id}`} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-orange-500 transition-colors shadow-lg">
                          <ArrowRight size={20} />
                        </Link>
                     </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust & Reliability */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
           <Map className="w-full h-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Why Agility?</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mt-4 leading-tight">Your Trusted Travel <br /> <span className="text-orange-500">Partner Since 2018</span></h2>
              <p className="text-slate-400 mt-6 text-lg leading-relaxed">
                We combine local expertise with global standards to deliver seamless travel experiences. Whether it's a spiritual pilgrimage to Makkah or a mountaineering expedition in Gilgit, we handle the details so you can focus on the journey.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mt-12">
                 <div className="space-y-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                       <ShieldCheck className="text-orange-400 w-6 h-6" />
                    </div>
                    <h4 className="text-white font-bold">Secure Booking</h4>
                    <p className="text-sm text-slate-500">End-to-end encrypted payments and verified hotel allotments.</p>
                 </div>
                 <div className="space-y-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                       <Plane className="text-orange-400 w-6 h-6" />
                    </div>
                    <h4 className="text-white font-bold">Real-time Updates</h4>
                    <p className="text-sm text-slate-500">Instant notifications for flight status and travel advisories.</p>
                 </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl h-[500px]">
                <img src="https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=1200&q=80" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-10 -right-10 bg-orange-500 w-64 p-8 rounded-3xl shadow-2xl z-20">
                <p className="text-4xl font-bold text-white mb-2">10k+</p>
                <p className="text-white/80 font-medium text-sm">Happy travelers across Pakistan and beyond.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
             <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Testimonials</span>
             <h2 className="text-4xl font-bold mt-2">What Our Clients <span className="text-slate-400 italic">Say</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-10 border border-slate-100 rounded-[2.5rem] bg-slate-50 relative group hover:bg-slate-900 transition-all duration-500">
                <div className="absolute top-8 right-8 text-orange-500 group-hover:text-orange-400">
                  <Star fill="currentColor" size={20} />
                </div>
                <p className="text-slate-600 group-hover:text-slate-400 italic leading-relaxed mb-8">
                  "Agility Travels made our Umrah trip incredibly smooth. From the visa process to the hotel locations, everything was perfectly managed. Highy recommended!"
                </p>
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${i}`} className="w-full h-full object-cover" />
                   </div>
                   <div>
                      <h4 className="font-bold group-hover:text-white">Ahmad Raza</h4>
                      <p className="text-xs text-slate-400">Umrah Package 2025</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
           <div className="bg-orange-500 rounded-[3rem] px-10 py-16 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-4xl font-bold text-white mb-4">Get the latest travel deals</h2>
                <p className="text-white/80 mb-8">Subscribe to our newsletter for exclusive offers, Haj 2026 updates, and tourism news from Pakistan.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                   <input className="flex-grow bg-white/20 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder:text-white/60 outline-none focus:bg-white/30 transition-all" placeholder="Enter your email address" />
                   <button className="bg-white text-orange-600 font-bold px-10 py-4 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-xl">
                     Subscribe Now
                   </button>
                </div>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}
