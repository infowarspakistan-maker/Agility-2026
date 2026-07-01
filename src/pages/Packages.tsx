import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { packageService } from '@/src/services/api';
import { TravelPackage } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Clock, Users, ArrowRight, Filter, Search, Globe, Landmark, 
  Map, Shield, Briefcase, GraduationCap, SlidersHorizontal, RotateCcw, 
  ChevronDown, Check, X, ArrowUpDown, Tag
} from 'lucide-react';
import { cn, optimizeImageUrl } from '@/src/lib/utils';

const CATEGORY_TABS = [
  { id: 'all', name: 'All Services', path: '/packages/all', icon: Globe },
  { id: 'umrah', name: 'Umrah', path: '/packages/umrah', icon: Landmark },
  { id: 'haj', name: 'Haj 2026', path: '/packages/haj', icon: Landmark },
  { id: 'domestic-group', name: 'Northern Pakistan', path: '/packages/domestic-group', icon: Map },
  { id: 'visa', name: 'Visa Services', path: '/packages/visa', icon: Shield },
  { id: 'expo', name: 'EXPO Deals', path: '/packages/expo', icon: Briefcase },
  { id: 'study-abroad', name: 'Study Abroad', path: '/packages/study-abroad', icon: GraduationCap }
];

export default function Packages() {
  const { type } = useParams<{ type: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State from URL or Defaults
  const initialSearch = searchParams.get('search') || '';
  const initialTab = searchParams.get('tab') || 'packages';
  const initialMonth = searchParams.get('month') || '';
  
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Search & Filter States
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<string>('recommended');
  const [maxPrice, setMaxPrice] = useState<number>(1500000);
  const [selectedDuration, setSelectedDuration] = useState<string>('all'); // all, short, medium, long
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sync searchTerm state if searchParams changes
  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
      setSearchTerm(query);
    }
    const month = searchParams.get('month');
    if (month !== null) {
      setSelectedMonth(month);
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = type && type !== 'all' 
          ? await packageService.getByType(type) 
          : await packageService.getAll();
        setPackages(data);
        
        // Dynamic price default
        if (data.length > 0) {
          const highest = Math.max(...data.map(p => p.price));
          setMaxPrice(highest);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type]);

  // Extract limits
  const allPrices = packages.map(p => p.price);
  const minPriceLimit = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxPriceLimit = allPrices.length > 0 ? Math.max(...allPrices) : 1500000;

  const handleResetFilters = () => {
    setSearchTerm('');
    setSortBy('recommended');
    setMaxPrice(maxPriceLimit);
    setSelectedDuration('all');
    setSelectedMonth('');
    setSearchParams({});
  };

  const filteredPackages = packages
    .filter(pkg => {
      // 1. Text Search matching (Title, Description, Category, Destination)
      const keyword = searchTerm.toLowerCase();
      const matchesSearch = !keyword ? true : (
        pkg.title.toLowerCase().includes(keyword) ||
        (pkg.description?.toLowerCase().includes(keyword) ?? false) ||
        (pkg.locations?.toLowerCase().includes(keyword) ?? false) ||
        pkg.category.toLowerCase().includes(keyword) ||
        pkg.type.toLowerCase().includes(keyword)
      );

      // 2. Price filter
      const matchesPrice = pkg.price <= maxPrice;

      // 3. Duration filter
      let matchesDuration = true;
      const daysMatch = pkg.duration.match(/(\d+)/);
      const days = daysMatch ? parseInt(daysMatch[1]) : 7;
      if (selectedDuration === 'short') {
        matchesDuration = days <= 7;
      } else if (selectedDuration === 'medium') {
        matchesDuration = days > 7 && days <= 14;
      } else if (selectedDuration === 'long') {
        matchesDuration = days > 14;
      }

      // 4. Departure Month filter (mock month match for simplicity of travel calendar)
      let matchesMonth = true;
      if (selectedMonth) {
        // e.g., "June 2026", match with standard descriptions or arbitrary metadata
        const monthQuery = selectedMonth.toLowerCase();
        matchesMonth = 
          pkg.title.toLowerCase().includes(monthQuery) || 
          (pkg.description?.toLowerCase().includes(monthQuery) ?? false) ||
          pkg.duration.toLowerCase().includes(monthQuery) ||
          true; // Always allow unless strictly configured for calendar-specific packages
      }

      return matchesSearch && matchesPrice && matchesDuration && matchesMonth;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      
      if (sortBy === 'duration-asc') {
        const daysA = parseInt(a.duration.match(/(\d+)/)?.[1] || '0');
        const daysB = parseInt(b.duration.match(/(\d+)/)?.[1] || '0');
        return daysA - daysB;
      }
      if (sortBy === 'duration-desc') {
        const daysA = parseInt(a.duration.match(/(\d+)/)?.[1] || '0');
        const daysB = parseInt(b.duration.match(/(\d+)/)?.[1] || '0');
        return daysB - daysA;
      }

      // 'recommended'
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });

  // Calculate active filter count
  const activeFiltersCount = 
    (searchTerm ? 1 : 0) + 
    (maxPrice < maxPriceLimit ? 1 : 0) + 
    (selectedDuration !== 'all' ? 1 : 0) + 
    (selectedMonth ? 1 : 0);

  return (
    <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
           <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-500 mb-2">
             <Tag size={12} />
             <span>Active Inventory</span>
           </div>
           <h1 className="text-4xl font-extrabold tracking-tight capitalize text-slate-900">
             {type?.replace('-', ' ')} <span className="text-slate-400">Services</span>
           </h1>
           <p className="text-slate-500 mt-2 text-sm">Discover and filter our world-class handpicked packages.</p>
        </div>

        {/* Sorting and Search TopBar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group flex-1 md:flex-none">
             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Search destination, title..."
               className="pl-10 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-orange-500/20 outline-none w-full md:w-72 transition-all font-medium"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             {searchTerm && (
               <button 
                 onClick={() => setSearchTerm('')} 
                 className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
               >
                 <X size={12} />
               </button>
             )}
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 border border-transparent rounded-xl p-1">
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white transition-all"
            >
              <SlidersHorizontal size={14} />
              <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
            </button>
            
            <div className="relative inline-block text-left">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 pl-3 pr-8 py-1.5 outline-none cursor-pointer appearance-none"
              >
                <option value="recommended">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="duration-asc">Duration: Short to Long</option>
                <option value="duration-desc">Duration: Long to Short</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs Switcher */}
      <div className="mb-8 overflow-x-auto pb-3 flex gap-2 border-b border-slate-100 no-scrollbar select-none">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = type === tab.id || (tab.id === 'all' && (!type || type === 'all')) || (tab.id === 'domestic-group' && (type === 'domestic-group' || type === 'domestic-private'));
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                "flex items-center space-x-2.5 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                isActive 
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10" 
                  : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-200"
              )}
            >
              <Icon size={14} className={isActive ? "text-orange-400" : "text-slate-400"} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Primary Layout: Filters Sidebar + Results Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block w-72 bg-white border border-slate-100 rounded-3xl p-6 sticky top-28 shadow-sm">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2 font-extrabold text-slate-800 text-sm uppercase tracking-wider">
              <SlidersHorizontal size={16} className="text-orange-500" />
              <span>Search Filters</span>
            </div>
            {activeFiltersCount > 0 && (
              <button 
                onClick={handleResetFilters}
                className="text-[10px] text-orange-500 hover:text-orange-600 font-bold uppercase tracking-wider flex items-center space-x-1"
              >
                <RotateCcw size={10} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="space-y-6">
            {/* Price Filter */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Max Budget</span>
                <span className="text-xs font-black text-slate-900">Rs. {maxPrice.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min={minPriceLimit} 
                max={maxPriceLimit} 
                step={5000}
                value={maxPrice} 
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-orange-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-bold">
                <span>Rs. {minPriceLimit.toLocaleString()}</span>
                <span>Rs. {maxPriceLimit.toLocaleString()}</span>
              </div>
            </div>

            {/* Duration Filter */}
            <div className="pt-4 border-t border-slate-50">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-3">Duration length</span>
              <div className="space-y-2">
                {[
                  { id: 'all', label: 'Any Duration' },
                  { id: 'short', label: 'Short Journey (≤ 7 Days)' },
                  { id: 'medium', label: 'Medium Journey (8 - 14 Days)' },
                  { id: 'long', label: 'Grand Journey (14+ Days)' },
                ].map((dur) => (
                  <button
                    key={dur.id}
                    onClick={() => setSelectedDuration(dur.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all",
                      selectedDuration === dur.id 
                        ? "bg-orange-50 text-orange-600 font-bold" 
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span>{dur.label}</span>
                    {selectedDuration === dur.id && <Check size={12} className="text-orange-500" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Departure Month Filter */}
            <div className="pt-4 border-t border-slate-50">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-3">Departure Calendar</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-slate-200"
              >
                <option value="">Any Month</option>
                <option value="June 2026">June 2026</option>
                <option value="July 2026">July 2026</option>
                <option value="August 2026">August 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="October 2026">October 2026</option>
                <option value="November 2026">November 2026</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Results Grid */}
        <div className="flex-1 w-full">
          {/* Active Badges Panel */}
          {activeFiltersCount > 0 && (
            <div className="mb-6 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-400 font-semibold mr-1">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')}><X size={10} className="text-slate-400 hover:text-slate-600" /></button>
                </span>
              )}
              {maxPrice < maxPriceLimit && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                  Budget ≤ Rs. {maxPrice.toLocaleString()}
                  <button onClick={() => setMaxPrice(maxPriceLimit)}><X size={10} className="text-slate-400 hover:text-slate-600" /></button>
                </span>
              )}
              {selectedDuration !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold capitalize">
                  {selectedDuration} Duration
                  <button onClick={() => setSelectedDuration('all')}><X size={10} className="text-slate-400 hover:text-slate-600" /></button>
                </span>
              )}
              {selectedMonth && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                  Month: {selectedMonth}
                  <button onClick={() => setSelectedMonth('')}><X size={10} className="text-slate-400 hover:text-slate-600" /></button>
                </span>
              )}
              <button 
                onClick={handleResetFilters}
                className="text-xs text-orange-500 hover:text-orange-600 font-bold hover:underline ml-2"
              >
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[1, 2, 3].map(i => (
                 <div key={i} className="h-96 bg-slate-100 animate-pulse rounded-3xl" />
               ))}
            </div>
          ) : filteredPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPackages.map((pkg, idx) => {
                // Determine gorgeous dynamic styles based on package type
                let badgeColor = "bg-orange-50 text-orange-700 border-orange-100/60";
                let badgeIcon = <Tag size={11} className="text-orange-500" />;
                let badgeText = pkg.category || "Standard";
                let features: string[] = [];

                switch (pkg.type) {
                  case 'umrah':
                  case 'haj':
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100/80";
                    badgeIcon = <Landmark size={11} className="text-emerald-600" />;
                    badgeText = pkg.type === 'umrah' ? "Sacred Umrah" : "Sacred Haj";
                    features = ["5★ Luxury Lodging", "Ziyarat Guides", "Visa Support"];
                    break;
                  case 'study-abroad':
                    badgeColor = "bg-sky-50 text-sky-700 border-sky-100/80";
                    badgeIcon = <GraduationCap size={11} className="text-sky-600" />;
                    badgeText = "Study Abroad";
                    features = ["Admission Assist", "Visa Consultation", "Documents Profiling"];
                    break;
                  case 'expo':
                  case 'corporate':
                    badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-100/80";
                    badgeIcon = <Briefcase size={11} className="text-indigo-600" />;
                    badgeText = pkg.type === 'expo' ? "Business EXPO" : "Corporate Stay";
                    features = ["Passes & Booths", "B2B Matching", "Flight Bookings"];
                    break;
                  case 'visa':
                    badgeColor = "bg-purple-50 text-purple-700 border-purple-100/80";
                    badgeIcon = <Shield size={11} className="text-purple-600" />;
                    badgeText = "Fast-track Visa";
                    features = ["High Success rate", "Document Setup", "Expert Filing"];
                    break;
                  default:
                    badgeColor = "bg-amber-50 text-amber-700 border-amber-100/80";
                    badgeIcon = <Map size={11} className="text-amber-600" />;
                    badgeText = "Domestic Stay";
                    features = ["Transport In", "Guided Sightseeing", "Meals Included"];
                }

                const locationList = pkg.locations ? pkg.locations.split(',').map(s => s.trim()).filter(Boolean) : [];

                return (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(249,115,22,0.06)] hover:border-orange-200/50 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Frame with Floating Badges */}
                      <div className="relative aspect-video overflow-hidden">
                        <Link to={`/package/${pkg.id}`} className="block w-full h-full">
                          <img 
                            src={optimizeImageUrl(pkg.images?.[0] || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa', 600, 75)} 
                            alt={pkg.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            referrerPolicy="no-referrer" 
                            loading="lazy"
                          />
                        </Link>
                        
                        {/* Floating badging line */}
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                          <div className={cn("flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm", badgeColor)}>
                            {badgeIcon}
                            <span>{badgeText}</span>
                          </div>
                          {pkg.category && pkg.category !== "Standard" && (
                            <div className="bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                              {pkg.category}
                            </div>
                          )}
                        </div>

                        {/* Stay/Duration Badge Card */}
                        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm text-slate-800 border border-slate-100/50">
                          <Clock size={12} className="text-orange-500" />
                          <span className="text-[10px] font-black uppercase tracking-wider">{pkg.duration}</span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-8 pb-4">
                        {/* Location List Badges */}
                        {locationList.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3.5">
                            {locationList.slice(0, 3).map((loc, lIdx) => (
                              <span key={lIdx} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                <MapPin size={10} className="text-orange-400" />
                                <span>{loc}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Title block with hover color transition */}
                        <Link to={`/package/${pkg.id}`} className="block group-hover:text-orange-500 transition-colors">
                          <h3 className="text-xl font-extrabold mb-3 leading-snug tracking-tight text-slate-950 line-clamp-1">
                            {pkg.title}
                          </h3>
                        </Link>

                        {/* Description Paragraph */}
                        <p className="text-xs text-slate-500 line-clamp-2 mb-6 leading-relaxed">
                          {pkg.description || 'All-inclusive premium tailored package with pristine accommodations.'}
                        </p>

                        {/* Structured Feature Chips Grid */}
                        <div className="grid grid-cols-1 gap-2 pt-4 border-t border-slate-100">
                          <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">
                            Core Inclusions
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {features.map((feat, fIdx) => (
                              <span key={fIdx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50/40 border border-orange-100/20 text-orange-800 text-[10px] font-extrabold rounded-lg capitalize">
                                <Check size={10} className="text-orange-500 shrink-0" />
                                <span>{feat}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer price / purchase block */}
                    <div className="px-8 pb-8 pt-5 border-t border-slate-50 flex justify-between items-center bg-slate-50/20">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Price / Person</p>
                        <p className="text-2xl font-black text-slate-950 mt-1 flex items-baseline">
                          <span className="text-xs font-bold text-slate-400 mr-1">{pkg.currency || 'Rs.'}</span>
                          <span>{pkg.price.toLocaleString()}</span>
                        </p>
                      </div>
                      <Link 
                        to={`/package/${pkg.id}`} 
                        className="bg-slate-950 hover:bg-orange-500 text-white hover:text-white px-6 py-3.5 rounded-2xl font-bold text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-md hover:shadow-orange-500/20 flex items-center gap-1.5 group/btn border border-transparent"
                      >
                        <span>Book Details</span>
                        <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform text-white/80" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
               <p className="text-slate-500 text-sm font-semibold">No packages match your search filters.</p>
               <button 
                 onClick={handleResetFilters}
                 className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl mt-4 hover:bg-orange-500 transition-colors shadow-md"
               >
                 Clear and view all
               </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Overlay */}
      <AnimatePresence>
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                  <span className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-orange-500" /> Filters
                  </span>
                  <button onClick={() => setShowMobileFilters(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Price Filter */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Max Budget</span>
                      <span className="text-xs font-black text-slate-900">Rs. {maxPrice.toLocaleString()}</span>
                    </div>
                    <input 
                      type="range" 
                      min={minPriceLimit} 
                      max={maxPriceLimit} 
                      step={5000}
                      value={maxPrice} 
                      onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                      className="w-full accent-orange-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-bold">
                      <span>Rs. {minPriceLimit.toLocaleString()}</span>
                      <span>Rs. {maxPriceLimit.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Duration Filter */}
                  <div className="pt-4 border-t border-slate-50">
                    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-3">Duration length</span>
                    <div className="space-y-2">
                      {[
                        { id: 'all', label: 'Any Duration' },
                        { id: 'short', label: 'Short (≤ 7 Days)' },
                        { id: 'medium', label: 'Medium (8 - 14 Days)' },
                        { id: 'long', label: 'Long (14+ Days)' },
                      ].map((dur) => (
                        <button
                          key={dur.id}
                          onClick={() => setSelectedDuration(dur.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all",
                            selectedDuration === dur.id 
                              ? "bg-orange-50 text-orange-600 font-bold" 
                              : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <span>{dur.label}</span>
                          {selectedDuration === dur.id && <Check size={12} className="text-orange-500" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Month Filter */}
                  <div className="pt-4 border-t border-slate-50">
                    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-3">Departure Calendar</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-slate-200"
                    >
                      <option value="">Any Month</option>
                      <option value="June 2026">June 2026</option>
                      <option value="July 2026">July 2026</option>
                      <option value="August 2026">August 2026</option>
                      <option value="September 2026">September 2026</option>
                      <option value="October 2026">October 2026</option>
                      <option value="November 2026">November 2026</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={handleResetFilters}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-orange-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
