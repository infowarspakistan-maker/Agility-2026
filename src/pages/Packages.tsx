import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { packageService } from '@/src/services/api';
import { TravelPackage } from '@/src/types';
import { motion } from 'motion/react';
import { MapPin, Clock, Users, ArrowRight, Filter, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function Packages() {
  const { type } = useParams<{ type: string }>();
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = type && type !== 'all' 
          ? await packageService.getByType(type) 
          : await packageService.getAll();
        setPackages(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type]);

  const filteredPackages = packages.filter(pkg => 
    pkg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pkg.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h1 className="text-4xl font-bold capitalize">
             {type?.replace('-', ' ')} <span className="text-slate-400">Packages</span>
           </h1>
           <p className="text-slate-500 mt-2">Discover our hand-picked selection of journeys.</p>
        </div>

        <div className="flex gap-4">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search packages..."
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 outline-none w-full md:w-64 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <button className="flex items-center space-x-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all">
             <Filter size={16} />
             <span>Filter</span>
           </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {[1, 2, 3].map(i => (
             <div key={i} className="h-96 bg-slate-100 animate-pulse rounded-3xl" />
           ))}
        </div>
      ) : filteredPackages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPackages.map((pkg, idx) => (
             <motion.div
               key={pkg.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.05 }}
               className="group bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
             >
                <div className="relative h-56 overflow-hidden">
                   <img 
                     src={pkg.images[0] || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa'} 
                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                     referrerPolicy="no-referrer" 
                   />
                   <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-900">
                     {pkg.category}
                   </div>
                </div>
                <div className="p-6">
                   <div className="flex items-center text-[10px] uppercase font-bold tracking-widest text-orange-500 mb-2">
                     <Clock size={12} className="mr-1" />
                     {pkg.duration}
                   </div>
                   <h3 className="text-xl font-bold mb-4 line-clamp-1">{pkg.title}</h3>
                   <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Price per person</p>
                        <p className="text-xl font-bold text-slate-900 leading-none mt-1">Rs. {pkg.price.toLocaleString()}</p>
                      </div>
                      <Link 
                        to={`/package/${pkg.id}`} 
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-500 transition-colors shadow-lg shadow-slate-900/10"
                      >
                        Book Now
                      </Link>
                   </div>
                </div>
             </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-3xl">
           <p className="text-slate-500">No packages found for this category.</p>
           <button 
             onClick={() => setSearchTerm('')}
             className="text-orange-500 font-bold mt-4"
           >
             Clear search
           </button>
        </div>
      )}
    </div>
  );
}
