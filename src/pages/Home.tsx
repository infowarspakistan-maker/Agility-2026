import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Calendar, Users, ArrowRight, Shield, Star, CheckCircle2, Plane, Landmark, Compass, ShieldCheck, Map, Briefcase, GraduationCap, ChevronLeft, ChevronRight, HelpCircle, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn, optimizeImageUrl } from '@/src/lib/utils';
import { useState, useEffect } from 'react';
import { packageService } from '@/src/services/api';
import { TravelPackage, HeroSlide } from '@/src/types';
import { db } from '@/src/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/src/components/layout/ToastContext';
import Testimonials from '@/src/components/Testimonials';

const CATEGORIES = [
  { 
    id: 'umrah', 
    title: 'Umrah', 
    icon: Landmark, 
    color: 'bg-emerald-500', 
    gradient: 'from-emerald-600 via-emerald-800 to-slate-900',
    img: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80', 
    href: '/packages/umrah' 
  },
  { 
    id: 'haj', 
    title: 'Haj 2026', 
    icon: Landmark, 
    color: 'bg-amber-500', 
    gradient: 'from-amber-500 via-amber-700 to-slate-900',
    img: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80', 
    href: '/packages/haj' 
  },
  { 
    id: 'domestic', 
    title: 'Northern Pakistan', 
    icon: Compass, 
    color: 'bg-sky-500', 
    gradient: 'from-sky-500 via-sky-700 to-slate-900',
    img: 'https://images.unsplash.com/photo-1541845157-a6d2d100c931?auto=format&fit=crop&w=800&q=80', 
    href: '/packages/domestic-group' 
  },
  { 
    id: 'visas', 
    title: 'Visa Services', 
    icon: ShieldCheck, 
    color: 'bg-orange-500', 
    gradient: 'from-orange-500 via-orange-700 to-slate-900',
    img: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=800&q=80', 
    href: '/packages/visa' 
  },
  { 
    id: 'expo', 
    title: 'Global EXPO Deals', 
    icon: Briefcase, 
    color: 'bg-purple-600', 
    gradient: 'from-purple-600 via-indigo-900 to-slate-900',
    img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80', 
    href: '/packages/expo' 
  },
  { 
    id: 'study-abroad', 
    title: 'Study Abroad Services', 
    icon: GraduationCap, 
    color: 'bg-rose-500', 
    gradient: 'from-rose-500 via-rose-700 to-slate-900',
    img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80', 
    href: '/packages/study-abroad' 
  },
  { 
    id: 'faq', 
    title: 'FAQ & Requirements', 
    icon: HelpCircle, 
    color: 'bg-slate-500', 
    gradient: 'from-slate-600 via-slate-800 to-slate-900',
    img: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80', 
    href: '/faq' 
  },
  { 
    id: 'contact', 
    title: 'Contact Us', 
    icon: FileText, 
    color: 'bg-teal-500', 
    gradient: 'from-teal-600 via-teal-800 to-slate-900',
    img: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&fit=crop&w=800&q=80', 
    href: '/contact' 
  },
];

const HERO_SLIDES = [
  {
    tagline: 'Sacred Pilgrimage & Devotion',
    title: 'Spiritual Journeys & Sacred Guides',
    description: 'Premium custom Umrah & Haj 2026/2027 packages. Tailored itineraries, luxury lodging located in the immediate courtyard of the Holy Harams, and expert religious guidance.',
    image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=75&w=1200&auto=format&fit=crop',
    actionText: 'Explore Sacred Packages',
    href: '/packages/umrah'
  },
  {
    tagline: 'Global Business Expansion',
    title: 'EXPO Sponsorship, Booths & Passes',
    description: 'Unlock premier business engagement. Book corporate exhibition booths, secure elite delegate passes, B2B matchmaking invitations, and get fast-track visa processing with all-inclusive flight tickets.',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=75&w=1200&auto=format&fit=crop',
    actionText: 'Book EXPO Packages',
    href: '/packages/expo'
  },
  {
    tagline: 'World-Class European Education',
    title: 'Study Abroad: Finland & Estonia 2027',
    description: 'Admission assistance for prestigious Graduate & Masters programs for Summer, Winter, and Autumn 2027 intakes. Seamless university admission support, documentation profiling, and high-success study visa coaching.',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=75&w=1200&auto=format&fit=crop',
    actionText: 'Explore Study Abroad',
    href: '/packages/study-abroad'
  }
];

export default function Home() {
  const { t } = useTranslation();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('packages');
  const [featuredPackages, setFeaturedPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Interactive Search States
  const [destinationInput, setDestinationInput] = useState('');
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const [showPassengerSelect, setShowPassengerSelect] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [passengersCount, setPassengersCount] = useState(2);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [dbSlides, setDbSlides] = useState<HeroSlide[]>([]);
  const [allPackages, setAllPackages] = useState<TravelPackage[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const q = collection(db, 'slides');
    const unsubscribe = onSnapshot(q, (snap) => {
      const slideList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HeroSlide[];
      setDbSlides(slideList.sort((a, b) => (a.order || 0) - (b.order || 0)));
    }, (error) => {
      console.error("Failed to load slides from firebase, falling back to static", error);
    });
    return () => unsubscribe();
  }, []);

  const activeSlides = dbSlides.length > 0 ? dbSlides : HERO_SLIDES;

  useEffect(() => {
    if (activeSlides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  const handlePrevSlide = () => {
    if (activeSlides.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleNextSlide = () => {
    if (activeSlides.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  };

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const data = await packageService.getFeatured();
        setFeaturedPackages(data.slice(0, 3));
        
        const allData = await packageService.getAll();
        setAllPackages(allData);
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
            {activeSlides.length > 0 && (
              <motion.img 
                key={currentSlide}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1 }}
                src={optimizeImageUrl(activeSlides[currentSlide]?.image, 1600, 80)} 
                alt={activeSlides[currentSlide]?.title || "Spiritual and Tour Package Cover"}
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
                fetchPriority="high"
              />
            )}
          </AnimatePresence>
        </div>

        <div className="relative z-20 max-w-7xl mx-auto px-4 w-full text-center">
          <AnimatePresence mode="wait">
            {activeSlides.length > 0 && (
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center mb-8"
              >
                <span className="inline-block px-4 py-1.5 bg-orange-500 text-white text-[10px] font-black tracking-[0.2em] uppercase rounded-full mb-6 shadow-lg shadow-orange-500/25">
                  {activeSlides[currentSlide]?.tagline}
                </span>
                <h1 className="text-4xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[0.95] tracking-tight max-w-5xl">
                  {activeSlides[currentSlide]?.title}
                </h1>
                <p className="text-sm md:text-lg lg:text-xl text-white/90 mb-8 max-w-3xl mx-auto font-medium leading-relaxed">
                  {activeSlides[currentSlide]?.description}
                </p>
                
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link 
                    to={activeSlides[currentSlide]?.href || '/packages/all'}
                    className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all flex items-center gap-2 group shadow-lg shadow-orange-500/25"
                  >
                    <span>{activeSlides[currentSlide]?.actionText}</span>
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
            )}
          </AnimatePresence>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto glass-card rounded-2xl p-2 md:p-4 border-white/30 backdrop-blur-md relative z-40">
            <div className="flex bg-white/10 rounded-xl overflow-hidden mb-4 p-1">
              {['Packages', 'Visas', 'Hotels'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab.toLowerCase());
                    // Pre-fill or clear search query based on selection
                    if (tab === 'Visas') {
                      setDestinationInput('Visa');
                    } else {
                      setDestinationInput('');
                    }
                  }}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                    activeTab === tab.toLowerCase() ? "bg-white text-slate-900 shadow-sm" : "text-white hover:bg-white/10"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center relative">
              {/* Destination Search Column */}
              <div className="bg-white/20 hover:bg-white/25 focus-within:bg-white/25 rounded-xl p-3 flex items-center space-x-3 text-left relative transition-all">
                <MapPin className="text-orange-400 w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/60 font-bold uppercase">Destination / Keyword</p>
                  <input 
                    type="text"
                    className="bg-transparent text-white border-none outline-none text-sm placeholder:text-white/40 w-full font-medium" 
                    placeholder={activeTab === 'packages' ? "Where to go?" : activeTab === 'visas' ? "Enter visa country" : "Search luxury stays"} 
                    value={destinationInput}
                    onChange={(e) => {
                      setDestinationInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                </div>
              </div>

              {/* Departure Month Selector Column */}
              <div className="bg-white/20 hover:bg-white/25 rounded-xl p-3 flex items-center space-x-3 text-left relative cursor-pointer transition-all">
                <Calendar className="text-orange-400 w-5 h-5 flex-shrink-0" />
                <button 
                  onClick={() => {
                    setShowMonthSelect(!showMonthSelect);
                    setShowPassengerSelect(false);
                    setShowSuggestions(false);
                  }}
                  className="text-left w-full focus:outline-none"
                >
                  <p className="text-[10px] text-white/60 font-bold uppercase">Departure</p>
                  <p className="text-white text-sm font-semibold truncate">
                    {selectedMonth || 'Select Month'}
                  </p>
                </button>

                {/* Month Selector Dropdown */}
                {showMonthSelect && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 text-slate-800 space-y-1">
                    <p className="text-[9px] font-bold uppercase text-slate-400 px-3 py-1 border-b border-slate-100">Available Calendar Months</p>
                    {['Any Month', 'June 2026', 'July 2026', 'August 2026', 'September 2026', 'October 2026'].map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedMonth(m === 'Any Month' ? '' : m);
                          setShowMonthSelect(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Passengers Count Selector Column */}
              <div className="bg-white/20 hover:bg-white/25 rounded-xl p-3 flex items-center space-x-3 text-left relative cursor-pointer transition-all">
                <Users className="text-orange-400 w-5 h-5 flex-shrink-0" />
                <button 
                  onClick={() => {
                    setShowPassengerSelect(!showPassengerSelect);
                    setShowMonthSelect(false);
                    setShowSuggestions(false);
                  }}
                  className="text-left w-full focus:outline-none"
                >
                  <p className="text-[10px] text-white/60 font-bold uppercase">Passengers</p>
                  <p className="text-white text-sm font-semibold">
                    {passengersCount} {passengersCount === 1 ? 'Person' : 'People'}
                  </p>
                </button>

                {/* Passengers count selector dropdown */}
                {showPassengerSelect && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-3 z-50 text-slate-800">
                    <p className="text-[9px] font-bold uppercase text-slate-400 mb-2 border-b border-slate-100 pb-1">Select Passengers</p>
                    <div className="flex items-center justify-between">
                      <button 
                        disabled={passengersCount <= 1}
                        onClick={() => setPassengersCount(p => Math.max(1, p - 1))}
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center font-bold hover:bg-slate-50 disabled:opacity-50 text-sm"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-sm">{passengersCount}</span>
                      <button 
                        disabled={passengersCount >= 10}
                        onClick={() => setPassengersCount(p => Math.min(10, p + 1))}
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center font-bold hover:bg-slate-50 disabled:opacity-50 text-sm"
                      >
                        +
                      </button>
                    </div>
                    <button 
                      onClick={() => setShowPassengerSelect(false)}
                      className="w-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg mt-3 hover:bg-orange-500 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Search Button */}
              <button 
                onClick={() => {
                  setShowSuggestions(false);
                  setShowMonthSelect(false);
                  setShowPassengerSelect(false);
                  navigate(`/packages/all?search=${encodeURIComponent(destinationInput)}&month=${encodeURIComponent(selectedMonth)}&passengers=${passengersCount}&tab=${activeTab}`);
                }}
                className="h-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center space-x-2 py-4 shadow-lg transition-all cursor-pointer"
              >
                <Search size={20} />
                <span>Search</span>
              </button>
            </div>

            {/* Real-time Search Suggestions List */}
            {showSuggestions && destinationInput.trim().length > 0 && (
              <div className="absolute left-2 right-2 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 text-slate-800 text-left">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matching live packages ({activeTab})</span>
                  <button 
                    onClick={() => setShowSuggestions(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Close
                  </button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                  {allPackages
                    .filter(pkg => {
                      const matchStr = destinationInput.toLowerCase();
                      const basicMatch = 
                        pkg.title.toLowerCase().includes(matchStr) ||
                        (pkg.locations?.toLowerCase().includes(matchStr) ?? false) ||
                        pkg.category.toLowerCase().includes(matchStr);
                      
                      if (activeTab === 'visas') {
                        return basicMatch && (pkg.type === 'visa' || pkg.category.toLowerCase().includes('visa'));
                      }
                      if (activeTab === 'hotels') {
                        return basicMatch && (pkg.description?.toLowerCase().includes('hotel') || pkg.description?.toLowerCase().includes('stay') || pkg.description?.toLowerCase().includes('resort'));
                      }
                      return basicMatch;
                    })
                    .slice(0, 5)
                    .map((pkg) => (
                      <div 
                        key={pkg.id}
                        onClick={() => {
                          setShowSuggestions(false);
                          navigate(`/package/${pkg.id}`);
                        }}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100"
                      >
                        <img 
                          src={optimizeImageUrl(pkg.images?.[0] || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa', 100, 70)} 
                          alt={pkg.title} 
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[8px] bg-slate-900 text-white font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                              {pkg.category}
                            </span>
                            <span className="text-[9px] text-orange-500 font-bold uppercase tracking-wider">
                              {pkg.duration}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 truncate">{pkg.title}</h4>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Base Price</p>
                          <p className="text-xs font-black text-slate-900">Rs. {pkg.price.toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  }
                  {allPackages.filter(pkg => {
                    const matchStr = destinationInput.toLowerCase();
                    const basicMatch = 
                      pkg.title.toLowerCase().includes(matchStr) ||
                      (pkg.locations?.toLowerCase().includes(matchStr) ?? false) ||
                      pkg.category.toLowerCase().includes(matchStr);
                    
                    if (activeTab === 'visas') {
                      return basicMatch && (pkg.type === 'visa' || pkg.category.toLowerCase().includes('visa'));
                    }
                    if (activeTab === 'hotels') {
                      return basicMatch && (pkg.description?.toLowerCase().includes('hotel') || pkg.description?.toLowerCase().includes('stay') || pkg.description?.toLowerCase().includes('resort'));
                    }
                    return basicMatch;
                  }).length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-400 font-semibold">
                      No matching services found. Click 'Search' to view all available.
                    </div>
                  )}
                </div>
              </div>
            )}
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
          {activeSlides.map((_, idx) => (
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
            {CATEGORIES.map((cat, idx) => {
              const hasError = imageErrors[cat.id];
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(cat.href)}
                  className={cn(
                    "group relative overflow-hidden rounded-[2rem] h-80 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br",
                    cat.gradient
                  )}
                >
                  {!hasError && (
                    <img 
                      src={optimizeImageUrl(cat.img, 600, 75)} 
                      onError={() => setImageErrors(prev => ({ ...prev, [cat.id]: true }))}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      referrerPolicy="no-referrer" 
                      alt={cat.title}
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent group-hover:via-slate-950/20 transition-all duration-300" />
                  
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className={cn("inline-flex p-3.5 rounded-2xl text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300", cat.color)}>
                      <cat.icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white leading-tight group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1.5">
                      <span>{cat.title}</span>
                      <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-orange-400 shrink-0" />
                    </h3>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Redesigned Section: Umrah & Sacred Journeys */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div>
              <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/10">
                Spiritual Pilgimage
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 tracking-tight">Umrah & Haj <span className="text-emerald-600 font-serif italic">Exclusive Registry</span></h2>
              <p className="text-slate-500 text-sm mt-2 max-w-xl font-medium leading-relaxed">
                Elite custom lodging options located in the immediate courtyard of the Holy Harams, professional guiding escorts, and hassle-free transit logistics.
              </p>
            </div>
            <Link 
              id="view-all-umrah-link" 
              to="/packages/umrah" 
              className="px-6 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg flex items-center gap-2 group"
            >
              <span>Explore Pilgrimages</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {allPackages.filter(p => ['umrah', 'haj'].includes(p.type)).slice(0, 3).map((pkg, idx) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => navigate(`/package/${pkg.id}`)}
                className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-100/30 group hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-64 overflow-hidden">
                    <img src={optimizeImageUrl(pkg.images?.[0] || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa', 600, 75)} alt={pkg.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" loading="lazy" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-white/95 backdrop-blur-sm text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm border border-emerald-500/10">
                        {pkg.category} Package
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-8">
                    <div className="flex items-center text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">
                      <Calendar size={13} className="mr-1.5 text-emerald-500" />
                      <span>{pkg.duration} Pilgrimage Stay</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 line-clamp-1">{pkg.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-semibold line-clamp-2 mb-6">{pkg.description}</p>
                    
                    <div className="space-y-2 bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                      {pkg.itinerary?.slice(0, 2).map((item, i) => (
                        <div key={i} className="flex items-start text-[11px] text-emerald-800 font-bold leading-none gap-2">
                          <CheckCircle2 size={12} className="shrink-0 mt-0.5 text-emerald-500" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="p-8 pt-0 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Dynamic Fare</span>
                    <p className="text-2xl font-black text-slate-900">{pkg.currency} {pkg.price.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl transition-all shadow-sm">
                    <ArrowRight size={18} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Redesigned Section: Study Abroad Pathways */}
      <section className="py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-orange-500/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* Left Info Column */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <span className="px-4 py-1.5 bg-orange-500/10 text-orange-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-500/20">
                  Global Education Registry
                </span>
                <h2 className="text-4xl md:text-5xl font-bold mt-4 tracking-tight leading-none text-white">Study Abroad & Admission</h2>
                <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">
                  Join hundreds of successful international scholars. We navigate document translation, public university placement criteria, blocking accounts setup, and high-success student visa counseling.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { title: 'Public University Mapping', desc: 'Secure tuition-free studies in Germany, UK, and Europe.' },
                  { title: 'Blocked Bank Accounts Support', desc: 'Step-by-step assistance setting up Fintiba/Expatrio profiles.' },
                  { title: 'Immersive Visa Mock Rounds', desc: 'Tailored profiling and visa interviewer prep sessions.' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3.5 bg-white/5 border border-white/10 p-4.5 rounded-2xl">
                    <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase">{item.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-tight">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link 
                id="study-abroad-consult-btn"
                to="/packages/study-abroad" 
                className="inline-flex px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all"
              >
                Book Pathway Counseling
              </Link>
            </div>

            {/* Right Packages Cards Column */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
              {allPackages.filter(p => p.type === 'study-abroad').slice(0, 2).map((pkg, idx) => (
                <div 
                  key={pkg.id}
                  onClick={() => navigate(`/package/${pkg.id}`)}
                  className="bg-white/5 border border-white/10 hover:border-orange-500/30 rounded-[2rem] p-8 flex flex-col justify-between cursor-pointer transition-all hover:bg-white/[0.08] relative group"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                      <GraduationCap size={24} />
                    </div>
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block">{pkg.category} Counselor</span>
                    <h3 className="text-lg font-bold text-white line-clamp-2 leading-snug">{pkg.title}</h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-3">{pkg.description}</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center group-hover:border-orange-500/20">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Retainer Rate</span>
                      <span className="text-lg font-black text-white">{pkg.currency} {pkg.price.toLocaleString()}</span>
                    </div>
                    <button className="p-2.5 bg-orange-500 text-white rounded-[10px] group-hover:translate-x-1.5 transition-all">
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Redesigned Section: EXPO Dynamic Passes & B2B Matchmaking */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div>
              <span className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/10">
                Business & Trade Summits
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 tracking-tight leading-none text-slate-900">EXPO Passes & Trade Shows</h2>
              <p className="text-slate-500 text-sm mt-2 max-w-xl font-semibold leading-relaxed">
                Seamless corporate delegate registrations, fast-track pavilion badge allocation, elite networking, and executive transport support.
              </p>
            </div>
            <Link 
              id="view-all-expo-deals"
              to="/packages/expo" 
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg flex items-center gap-2 group"
            >
              <span>Explore EXPO Deals</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allPackages.filter(p => p.type === 'expo').slice(0, 3).map((pkg, idx) => (
              <div 
                key={pkg.id}
                onClick={() => navigate(`/package/${pkg.id}`)}
                className="bg-slate-50 border border-slate-100 hover:border-amber-500/20 rounded-[2.5rem] p-8 flex flex-col justify-between cursor-pointer hover:bg-white hover:shadow-xl hover:shadow-amber-500/5 transition-all group"
              >
                <div className="space-y-5">
                  <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-900 shadow-sm">
                    <img src={optimizeImageUrl(pkg.images?.[0] || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab', 600, 75)} alt={pkg.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" loading="lazy" />
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-500 text-white font-mono text-[9px] font-black uppercase rounded-md leading-none shadow-md">
                      {pkg.category.toUpperCase()}
                    </span>
                  </div>
                  
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">{pkg.duration} Business Passes</span>
                  <h3 className="text-lg font-bold text-slate-800 line-clamp-1 leading-snug">{pkg.title}</h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed line-clamp-3">{pkg.description}</p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200/50 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Deal Package</span>
                    <span className="text-lg font-black text-slate-900">{pkg.currency} {pkg.price.toLocaleString()}</span>
                  </div>
                  <button className="p-2.5 bg-slate-900 hover:bg-amber-500 text-white rounded-[10px] group-hover:translate-x-1 transition-all">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Redesigned Section: Interactive Visa Checkers & Services Portal */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative">
          
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/10">
              E-Visa Hub Core
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 tracking-tight leading-none text-slate-900">Visa Processing Hub</h2>
            <p className="text-slate-500 text-sm mt-3 max-w-xl mx-auto font-semibold leading-relaxed">
              Skip third-party agencies' delays. Check core documentation requirements immediately and start secure e-visa processing.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            
            {/* Country selectors */}
            <div className="lg:col-span-4 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-6">Select Destination Country</h3>
                
                <div className="space-y-2.5">
                  {[
                    { country: 'Saudi Arabia E-visa', time: '3-4 Days', success: '99%', id: 'sa' },
                    { country: 'Dubai (UAE) Entry visa', time: '2 Days', success: '100%', id: 'uae' },
                    { country: 'Schengen Consultation Package', time: '14 Days', success: '95%', id: 'sch' },
                    { country: 'United Kingdom Partner Visa', time: '30 Days', success: '97%', id: 'uk' }
                  ].map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        toast.success(`Active documentation rules loaded for ${item.country}!`);
                      }}
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:border-blue-500/20 hover:bg-slate-50/50 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.country}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-bold">Processing: {item.time}</p>
                      </div>
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg leading-none">{item.success} Rate</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col gap-2">
                <button 
                  onClick={() => navigate('/packages/visa')}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest text-center shadow-lg transition-all"
                >
                  Create Visa Submission
                </button>
              </div>
            </div>

            {/* Document Checklist Panel */}
            <div className="lg:col-span-8 bg-slate-900 rounded-[2.5rem] text-white p-10 flex flex-col justify-between border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div>
                <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-8">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                      <ShieldCheck size={20} className="text-blue-500" />
                      <span>Document Quality Validator Checklist</span>
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Check core variables before dispatching profile packages.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { label: 'Scanned Passport Copy', detail: 'Primary scan page (PDF format), min validity 6 months.' },
                    { label: 'Dynamic Bank Statements', detail: 'Digitally verified local balances with custom banking stamps.' },
                    { label: 'Color Passport Photographs', detail: 'Pure off-white background with direct posture, modern styling.' },
                    { label: 'Employment Verification Letter', detail: 'Signed company certificate with structural seal.' }
                  ].map((doc, idx) => (
                    <div key={idx} className="flex gap-3 bg-white/5 border border-white/10 p-5 rounded-2xl">
                      <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl h-fit">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase">{doc.label}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">{doc.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <HelpCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    Need instant custom counselor mapping advice? Start a real-time live support request session or call directly to configure.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    const el = document.getElementById('support-chat-fab-toggle');
                    if (el) {
                      el.click();
                      toast.info("Opening dynamic live consultant agent room...");
                    } else {
                      toast.error("Live consultants are currently offline, check support portals!");
                    }
                  }}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                >
                  Message Agency Desk
                </button>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Featured Packages (Now: General Trending Adventures) */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
             <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Hand-Picked</span>
             <h2 className="text-4xl font-bold mt-2">More Trending Packages</h2>
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
                     <img src={optimizeImageUrl(pkg.images[0], 600, 75)} alt={pkg.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" loading="lazy" />
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
                <img src={optimizeImageUrl("https://images.unsplash.com/photo-1544027993-37dbfe43562a", 800, 75)} alt="Agility Travels - Trusted Travel Partner Group" className="w-full h-full object-cover" loading="lazy" />
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
      <Testimonials />

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
