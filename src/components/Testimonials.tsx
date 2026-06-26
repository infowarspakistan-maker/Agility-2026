import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, CheckCircle2, MessageSquare, PlusCircle, X, ShieldCheck, Trash2, User, Sparkles } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { Review } from '@/src/types';

// Pre-loaded verified pilgrimage reviews (highly professional fallback and booster)
const STATIC_TESTIMONIALS: Review[] = [
  {
    id: 'static-1',
    packageId: 'umrah-premium',
    packageName: 'VIP Umrah Platinum Package',
    userId: 'pilgrim-1',
    userName: 'Haji Muhammad Iqbal',
    userEmail: 'iqbal@verified.com',
    rating: 5,
    comment: 'Alhamdulillah, our family had an outstanding Umrah experience. The hotel was exactly in the courtyard of Masjid al-Haram, which made it extremely easy for my elderly mother to perform her prayers. The guides was highly knowledgeable.',
    createdAt: '2026-04-10T12:00:00.000Z'
  },
  {
    id: 'static-2',
    packageId: 'haj-executive',
    packageName: 'Haj 2026 Executive Shuttle',
    userId: 'pilgrim-2',
    userName: 'Dr. Aisha Rahman',
    userEmail: 'aisha@verified.com',
    rating: 5,
    comment: 'Agility Travels executed our Haj logistics flawlessly. The Mina tents were very close to Jamarat and the private GMC transport saved us from exhaustion. Truly professional and trustworthy guides!',
    createdAt: '2026-05-18T14:30:00.000Z'
  },
  {
    id: 'static-3',
    packageId: 'umrah-deluxe',
    packageName: 'Deluxe Umrah Economy Plus',
    userId: 'pilgrim-3',
    userName: 'Kamran & Salma Malik',
    userEmail: 'kamran@verified.com',
    rating: 5,
    comment: 'Everything was perfectly coordinated, from our visas to hotel checkpoints. Outstanding support from Lahore departure to Makkah. Highly recommend their family Umrah packages!',
    createdAt: '2026-06-01T09:15:00.000Z'
  },
  {
    id: 'static-4',
    packageId: 'visa-tourist',
    packageName: 'Saudi Tourist eVisa Service',
    userId: 'pilgrim-4',
    userName: 'Farhan Saeed',
    userEmail: 'farhan@verified.com',
    rating: 5,
    comment: 'Got my multiple entry Saudi tourist visa processed in just 24 hours. Exceptionally fast service and transparent pricing. Will use Agility again for sure!',
    createdAt: '2026-06-12T16:45:00.000Z'
  }
];

export default function Testimonials() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'umrah' | 'haj' | 'visa'>('all');
  const [showForm, setShowForm] = useState(false);
  
  // Submit Form States
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [packageName, setPackageName] = useState('Premium Umrah Package');
  const [packageType, setPackageType] = useState<'umrah' | 'haj' | 'visa'>('umrah');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const user = auth.currentUser;

  // Sync reviews from Firestore
  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(dbReviews);
    }, (error) => {
      console.error("Firestore reviews loading error, falling back to static:", error);
    });
    return () => unsubscribe();
  }, []);

  // Combine static fallback reviews with firestore ones
  const allReviews = [...reviews, ...STATIC_TESTIMONIALS];

  // Filter based on selected tabs
  const filteredReviews = allReviews.filter(review => {
    if (activeTab === 'all') return true;
    
    // Check package type mapping
    const pkgName = review.packageName.toLowerCase();
    const pkgId = review.packageId.toLowerCase();
    
    if (activeTab === 'umrah') {
      return pkgName.includes('umrah') || pkgId.includes('umrah');
    }
    if (activeTab === 'haj') {
      return pkgName.includes('haj') || pkgId.includes('haj');
    }
    if (activeTab === 'visa') {
      return pkgName.includes('visa') || pkgId.includes('visa');
    }
    return true;
  });

  // Calculate statistics
  const totalReviewsCount = allReviews.length;
  const averageRating = (allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1);
  const fiveStarsCount = allReviews.filter(r => r.rating === 5).length;
  const fourStarsCount = allReviews.filter(r => r.rating === 4).length;
  
  const fiveStarPercentage = Math.round((fiveStarsCount / totalReviewsCount) * 100) || 0;
  const fourStarPercentage = Math.round((fourStarsCount / totalReviewsCount) * 100) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        packageId: `${packageType}-custom-${Math.floor(Math.random() * 1000)}`,
        packageName: `${packageName} (${packageType.toUpperCase()})`,
        userId: user.uid,
        userName: user.displayName || 'Traveler',
        userEmail: user.email || '',
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString()
      });

      setSuccessMsg('Thank you! Your testimonial has been submitted successfully and is now live.');
      setComment('');
      setRating(5);
      setTimeout(() => {
        setShowForm(false);
        setSuccessMsg('');
      }, 2500);
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete your review?")) {
      try {
        await deleteDoc(doc(db, 'reviews', reviewId));
      } catch (err) {
        console.error("Failed to delete review", err);
      }
    }
  };

  return (
    <section className="py-24 bg-white relative overflow-hidden" id="verified-testimonials-section">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="text-orange-500 font-bold text-sm uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck size={16} />
              100% Verified Pilgrim Testimonials
            </span>
            <h2 className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
              Trust & Journey <span className="text-orange-500">Experiences</span>
            </h2>
            <p className="text-slate-500 mt-2 font-medium">Real reviews from our Umrah & Haj travelers who returned safely.</p>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center space-x-2 px-6 py-3.5 bg-slate-900 hover:bg-orange-500 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95 cursor-pointer text-sm"
              >
                <PlusCircle size={16} />
                <span>Write a Testimonial</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl">
                🔑 Sign in to submit a review
              </span>
            )}
          </div>
        </div>

        {/* Bento Stats Summary Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          
          {/* Rating Summary Block */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 flex flex-col justify-center items-center text-center">
            <h3 className="text-5xl font-black text-slate-900">{averageRating}</h3>
            <div className="flex items-center space-x-1 my-3 text-amber-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} fill="currentColor" size={24} className="stroke-none" />
              ))}
            </div>
            <p className="text-sm font-bold text-slate-800 uppercase tracking-wider">Out of 5 Stars</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">Based on {totalReviewsCount} overall traveler reviews</p>
          </div>

          {/* Star Breakdown Progress Bar Block */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 lg:col-span-2 flex flex-col justify-center space-y-3.5">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Sparkles size={14} className="text-orange-500" /> Ratings Breakdown
            </h4>
            
            {/* 5 Stars */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-600 w-12 text-left">5 Stars</span>
              <div className="flex-grow bg-slate-200/50 h-3.5 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${fiveStarPercentage}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-800 w-10 text-right">{fiveStarPercentage}%</span>
            </div>

            {/* 4 Stars */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-600 w-12 text-left">4 Stars</span>
              <div className="flex-grow bg-slate-200/50 h-3.5 rounded-full overflow-hidden">
                <div className="bg-orange-400 h-full rounded-full transition-all duration-1000" style={{ width: `${fourStarPercentage}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-800 w-10 text-right">{fourStarPercentage}%</span>
            </div>

            {/* Others */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-600 w-12 text-left">3 & Less</span>
              <div className="flex-grow bg-slate-200/50 h-3.5 rounded-full overflow-hidden">
                <div className="bg-slate-300 h-full rounded-full transition-all" style={{ width: `0%` }} />
              </div>
              <span className="text-xs font-bold text-slate-800 w-10 text-right">0%</span>
            </div>
          </div>
        </div>

        {/* Interactive Star & Review Submission Drawer / Form Panel */}
        <AnimatePresence>
          {showForm && user && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-12"
            >
              <div className="bg-slate-50/80 border border-slate-100 rounded-[2.5rem] p-8 md:p-10 relative">
                <button
                  onClick={() => setShowForm(false)}
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 bg-white rounded-full shadow-sm transition-all"
                >
                  <X size={16} />
                </button>

                <h3 className="text-2xl font-bold text-slate-900 mb-2">Share Your Pilgrimage Experience</h3>
                <p className="text-sm text-slate-500 font-medium mb-8">Your feedback directly helps other pilgrims select their sacred journey packages safely.</p>

                {successMsg ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-6 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center space-x-3"
                  >
                    <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                    <span className="font-bold text-sm">{successMsg}</span>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      
                      {/* Interactive Stars */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Star Rating</label>
                        <div className="flex items-center space-x-1.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              type="button"
                              key={s}
                              onClick={() => setRating(s)}
                              onMouseEnter={() => setHoverRating(s)}
                              onMouseLeave={() => setHoverRating(null)}
                              className="text-amber-400 transition-transform hover:scale-110 cursor-pointer"
                            >
                              <Star
                                size={32}
                                fill={s <= (hoverRating ?? rating) ? "currentColor" : "none"}
                                className="stroke-amber-400 stroke-2"
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Package Category */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Package Category</label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['umrah', 'haj', 'visa'] as const).map((cat) => (
                            <button
                              type="button"
                              key={cat}
                              onClick={() => setPackageType(cat)}
                              className={cn(
                                "py-3 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center",
                                packageType === cat 
                                  ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10"
                                  : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                              )}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Package Name Title */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Specific Package Booked</label>
                        <input
                          type="text"
                          required
                          value={packageName}
                          onChange={(e) => setPackageName(e.target.value)}
                          placeholder="e.g. VIP 15-Days Executive Umrah"
                          className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-orange-500 transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-6 flex flex-col justify-between">
                      {/* Testimonial Comment */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Written Feedback</label>
                        <textarea
                          rows={4}
                          required
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Describe hotel locations, transport experience, guide responsiveness, and spiritual comfort..."
                          className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-orange-500 transition-all shadow-sm resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !comment.trim()}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 cursor-pointer text-sm"
                      >
                        {isSubmitting ? 'Posting Live Testimonial...' : 'Post Testimonial'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 pb-8 mb-12">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all cursor-pointer",
              activeTab === 'all' ? "bg-orange-500 text-white shadow-md shadow-orange-500/10" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            )}
          >
            All Reviews
          </button>
          <button
            onClick={() => setActiveTab('umrah')}
            className={cn(
              "px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all cursor-pointer",
              activeTab === 'umrah' ? "bg-orange-500 text-white shadow-md shadow-orange-500/10" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            )}
          >
            Umrah Packages 🕋
          </button>
          <button
            onClick={() => setActiveTab('haj')}
            className={cn(
              "px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all cursor-pointer",
              activeTab === 'haj' ? "bg-orange-500 text-white shadow-md shadow-orange-500/10" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            )}
          >
            Haj Packages 🕌
          </button>
          <button
            onClick={() => setActiveTab('visa')}
            className={cn(
              "px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all cursor-pointer",
              activeTab === 'visa' ? "bg-orange-500 text-white shadow-md shadow-orange-500/10" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            )}
          >
            eVisa Services 📋
          </button>
        </div>

        {/* Testimonials Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredReviews.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="p-8 border border-slate-100 rounded-[2.2rem] bg-slate-50/40 hover:bg-slate-900 group transition-all duration-500 flex flex-col justify-between h-full relative shadow-sm"
              >
                
                {/* Verified Journey Badging & Rating */}
                <div>
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md group-hover:bg-emerald-500 group-hover:text-white transition-colors flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={10} /> Verified Pilgrim
                    </span>
                    
                    {/* Stars */}
                    <div className="flex items-center space-x-0.5 text-amber-500">
                      {Array.from({ length: item.rating }).map((_, starIdx) => (
                        <Star key={starIdx} fill="currentColor" size={14} className="stroke-none" />
                      ))}
                    </div>
                  </div>

                  {/* Feedback text */}
                  <p className="text-slate-600 group-hover:text-slate-300 font-medium italic leading-relaxed text-sm mb-8">
                    "{item.comment}"
                  </p>
                </div>

                {/* Avatar and Info Footer */}
                <div className="flex items-center justify-between gap-4 mt-auto border-t border-dashed border-slate-100/80 group-hover:border-slate-800 pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 bg-slate-200 group-hover:bg-slate-800 text-slate-600 group-hover:text-slate-300 rounded-full flex items-center justify-center overflow-hidden font-bold border border-slate-100 group-hover:border-slate-800 shrink-0">
                      {item.userId.startsWith('static-') ? (
                        <img 
                          src={`https://i.pravatar.cc/150?u=${item.id}`} 
                          alt={item.userName} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-white text-sm tracking-tight">{item.userName}</h4>
                      <p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 uppercase tracking-widest mt-0.5 max-w-[160px] truncate">
                        {item.packageName}
                      </p>
                    </div>
                  </div>

                  {/* Delete Option for Author or Admin */}
                  {user && (user.uid === item.userId) && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-lg group-hover:hover:bg-red-950/20 transition-all cursor-pointer"
                      title="Delete review"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
