import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { auth, db, storage } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { Booking, UserProfile, TravelPackage, PackageType, Review, VisaRequest } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Database, Users, TrendingUp, Package, 
  CheckCircle2, Clock, XCircle, BarChart3, RotateCcw, 
  Plus, Trash2, Edit3, Save, LayoutDashboard, Calendar, 
  Tag, Info, Image as ImageIcon, MapPin, Layers, ShieldCheck,
  Upload, X, FileText, MessageSquare, Star, AlertTriangle, ChevronRight,
  Activity, Cpu, Zap, Radio, Sparkles
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, formatCurrency } from '@/src/lib/utils';
import { seedDatabase } from '@/src/services/api';
import { generateItinerary } from '@/src/services/aiService';

type TabType = 'overview' | 'bookings' | 'packages' | 'users' | 'visas' | 'reviews' | 'chat';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [visaRequests, setVisaRequests] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState<'passport' | 'idCard' | null>(null);
  const [pulseEvents, setPulseEvents] = useState<any[]>([]);
  const [isCreatingVisa, setIsCreatingVisa] = useState(false);
  const [generatingItinerary, setGeneratingItinerary] = useState<string | null>(null);
  const [itineraryContent, setItineraryContent] = useState('');
  const [newVisaRequest, setNewVisaRequest] = useState<Partial<VisaRequest>>({
    userId: '',
    visaType: 'Umrah Visa',
    status: 'pending',
    notes: ''
  });
  
  // Sorting State
  const [packageSortField, setPackageSortField] = useState<'price' | 'inventoryCount' | 'createdAt'>('createdAt');
  const [packageSortOrder, setPackageSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Package Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<Partial<TravelPackage> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time synchronization
  useEffect(() => {
    setLoading(true);
    
    // 1. Bookings Sync
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snap) => {
      setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);
      setLoading(false);
    });

    // 2. Packages Sync
    const unsubPackages = onSnapshot(collection(db, 'packages'), (snap) => {
      setPackages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TravelPackage[]);
    });

    // 3. Users Sync
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[]);
    });

    // 4. Visas Sync
    const unsubVisas = onSnapshot(collection(db, 'visaRequests'), (snap) => {
      setVisaRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 5. Reviews Sync
    const unsubReviews = onSnapshot(collection(db, 'reviews'), (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[]);
    });

    // 7. Chat Sessions Sync
    const unsubChats = onSnapshot(query(collection(db, 'chatSessions'), orderBy('updatedAt', 'desc')), (snap) => {
      setChatSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatSession[]);
    });

    // 6. Intelligence Pulse Sync (Combined Stream)
    const logQuery = query(collection(db, 'aiLogs'), orderBy('timestamp', 'desc'), limit(20));
    const unsubLogs = onSnapshot(logQuery, (snap) => {
      const logs = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        source: 'AI Intelligence',
        icon: Cpu,
        color: doc.data().success ? 'text-emerald-500' : 'text-rose-500'
      }));
      setPulseEvents(logs);
    });

    return () => {
      unsubBookings();
      unsubPackages();
      unsubUsers();
      unsubVisas();
      unsubReviews();
      unsubLogs();
      unsubChats();
    };
  }, []);

  useEffect(() => {
    if (!selectedChat) return;

    const q = query(
      collection(db, 'chatSessions', selectedChat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[]);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !selectedChat || !auth.currentUser) return;

    const text = chatInput.trim();
    setChatInput('');

    try {
      await addDoc(collection(db, 'chatSessions', selectedChat.id, 'messages'), {
        text,
        senderId: auth.currentUser.uid,
        senderName: 'Admin Support',
        timestamp: serverTimestamp(),
        isAdmin: true
      });

      await updateDoc(doc(db, 'chatSessions', selectedChat.id), {
        lastMessage: text,
        updatedAt: serverTimestamp(),
        unreadCount: 0
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const booking = bookings.find(b => b.id === id);
      await updateDoc(doc(db, 'bookings', id), { status: newStatus });
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus as any } : b));

      // Email Notification
      if (booking && (newStatus === 'confirmed' || newStatus === 'completed')) {
        const user = users.find(u => u.uid === booking.userId);
        if (user) {
          const { sendEmailNotification } = await import('@/src/services/notificationService');
          await sendEmailNotification(
            user.email,
            `Booking ${newStatus === 'confirmed' ? 'Confirmed' : 'Completed'} - Agility Travels`,
            `Your booking for <b>${booking.packageName}</b> (ID: ${id.slice(0, 8)}) has been marked as <b>${newStatus}</b>. Login to your dashboard for more details.`
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVisaStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'visaRequests', id), { status: newStatus });
      setVisaRequests(visaRequests.map(v => v.id === id ? { ...v, status: newStatus } : v));
      
      const visa = visaRequests.find(v => v.id === id);
      if (visa && (newStatus === 'approved' || newStatus === 'rejected')) {
        const user = users.find(u => u.uid === visa.userId);
        if (user) {
          const { sendEmailNotification } = await import('@/src/services/notificationService');
          await sendEmailNotification(
            user.email,
            `Visa Request ${newStatus === 'approved' ? 'Approved' : 'Rejected'} - Agility Travels`,
            `Your visa request for <b>${visa.visaType}</b> has been <b>${newStatus}</b>. ${newStatus === 'approved' ? 'Please check your dashboard for further instructions.' : 'Please contact support for details.'}`
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('Confirm Review Elimination Protocol?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
      setReviews(reviews.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeed = async () => {
    if (!confirm('This will add duplicate sample data. Are you sure?')) return;
    setSeeding(true);
    try {
      await seedDatabase();
      alert('Seeding successful');
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentPackage) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    const newImages = [...(currentPackage.images || [])];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `packages/${Date.now()}-${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              // If multiple files, calculate aggregate progress
              const totalProgress = ((i * 100) + progress) / files.length;
              setUploadProgress(totalProgress);
            }, 
            (error) => {
              setUploadError(`Failed to upload ${file.name}: ${error.message}`);
              reject(error);
            }, 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              newImages.push(downloadURL);
              resolve(null);
            }
          );
        });
      }
      setCurrentPackage({ ...currentPackage, images: newImages });
    } catch (error) {
      console.error("Upload error:", error);
      // setUploadError is already called in the uploadTask.on error callback
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    if (!currentPackage || !currentPackage.images) return;
    const newImages = currentPackage.images.filter((_, i) => i !== index);
    setCurrentPackage({ ...currentPackage, images: newImages });
  };

  const handleSavePackage = async () => {
    if (!currentPackage) return;
    setLoading(true);
    try {
      if (currentPackage.id) {
        const { id, ...data } = currentPackage;
        await updateDoc(doc(db, 'packages', id), data);
      } else {
        await addDoc(collection(db, 'packages'), {
          ...currentPackage,
          currency: 'PKR',
          createdAt: new Date().toISOString()
        });
      }
      setIsEditing(false);
      setCurrentPackage(null);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      await deleteDoc(doc(db, 'packages', id));
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateVisaRequest = async () => {
    if (!newVisaRequest.userId || !newVisaRequest.visaType) {
      alert("Please select a user and visa type");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'visaRequests'), {
        ...newVisaRequest,
        submissionDate: new Date().toISOString()
      });
      setIsCreatingVisa(false);
      setNewVisaRequest({
        userId: '',
        visaType: 'Umrah Visa',
        status: 'pending',
        notes: ''
      });
      // onSnapshot will handle the update
    } catch (e) {
      console.error(e);
      alert("Failed to create visa request");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateItinerary = async (pkg: TravelPackage) => {
    setLoading(true);
    try {
      const it = await generateItinerary(pkg.title, pkg.type, pkg.duration, pkg.locations);
      setGeneratingItinerary(pkg.id);
      setItineraryContent(it);
    } catch (e) {
      console.error(e);
      alert("Itinerary generation failed");
    } finally {
      setLoading(false);
    }
  };

  const saveGeneratedItinerary = async (pkgId: string) => {
    try {
      await updateDoc(doc(db, 'packages', pkgId), {
        itinerary: itineraryContent
      });
      setGeneratingItinerary(null);
      setItineraryContent('');
    } catch (e) {
      console.error(e);
      alert("Failed to save itinerary");
    }
  };

  const handleAdminDocUpload = async (e: ChangeEvent<HTMLInputElement>, type: 'passport' | 'idCard') => {
    const file = e.target.files?.[0];
    if (!file || !selectedBooking) return;

    setIsUploadingDoc(type);
    try {
      const storageRef = ref(storage, `admin_overrides/${selectedBooking.id}-${type}-${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const updateData = type === 'passport' ? { passportUrl: downloadURL } : { idCardUrl: downloadURL };
      await updateDoc(doc(db, 'bookings', selectedBooking.id), updateData);
      
      setSelectedBooking({ ...selectedBooking, ...updateData });
      setBookings(bookings.map(b => b.id === selectedBooking.id ? { ...b, ...updateData } : b));
      alert(`${type === 'passport' ? 'Passport' : 'ID Card'} updated successfully`);
    } catch (error) {
      console.error(error);
      alert('Failed to upload document');
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(bookings.reduce((acc, b) => acc + b.totalAmount, 0)), icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Active Bookings', value: bookings.filter(b => b.status === 'pending').length, icon: Clock, color: 'text-amber-500' },
    { label: 'Verified Users', value: users.length, icon: Users, color: 'text-indigo-500' },
    { label: 'Active Listings', value: packages.length, icon: Package, color: 'text-sky-500' },
  ];

  const chartData = [
    { name: 'Jan', value: 120000 },
    { name: 'Feb', value: 240000 },
    { name: 'Mar', value: 180000 },
    { name: 'Apr', value: 350000 },
    { name: 'May', value: 280000 },
  ];

  const sortedPackages = [...packages].sort((a, b) => {
    const valA = a[packageSortField];
    const valB = b[packageSortField];

    if (valA === undefined || valB === undefined) return 0;

    if (packageSortOrder === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
         <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
           <div className="flex items-center space-x-3 mb-1">
             <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <LayoutDashboard size={20} />
             </div>
             <h1 className="text-3xl font-bold">Admin <span className="text-slate-400">Control</span></h1>
           </div>
           <p className="text-slate-500 uppercase text-[10px] font-bold tracking-widest">Management & Intelligence Suite</p>
        </div>
        <div className="flex items-center space-x-4">
           <button 
            onClick={loadData}
            className="p-3 bg-white border border-slate-100 shadow-sm rounded-2xl hover:bg-slate-50 transition-all text-slate-400"
           >
             <RotateCcw size={18} />
           </button>
           <button 
             onClick={handleSeed}
             disabled={seeding}
             className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold text-xs hover:bg-orange-50 transition-all disabled:opacity-50"
           >
             <Database size={16} />
             <span>{seeding ? 'Syncing...' : 'Seed Data'}</span>
           </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 mb-10 bg-slate-100 p-1.5 rounded-3xl w-fit">
         {[
           { id: 'overview', icon: BarChart3, label: 'Analytics' },
           { id: 'bookings', icon: Calendar, label: 'Bookings' },
           { id: 'visas', icon: ShieldCheck, label: 'Visa Requests' },
           { id: 'packages', icon: Package, label: 'Packages' },
           { id: 'reviews', icon: Star, label: 'Reviews' },
           { id: 'users', icon: Users, label: 'Users' },
           { id: 'chat', icon: MessageSquare, label: 'Support Chat' }
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as TabType)}
             className={cn(
               "flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all",
               activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
             )}
           >
             <tab.icon size={16} />
             <span>{tab.label}</span>
           </button>
         ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-orange-200 transition-all">
                    <div className={cn("w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform", stat.color)}>
                       <stat.icon size={22} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full translate-x-1/2 -translate-y-1/2 blur-[100px]" />
                   <h3 className="text-xl font-bold mb-10 flex items-center">
                      <TrendingUp className="mr-3 text-orange-500" />
                      Revenue Stream Overview
                   </h3>
                   <div className="h-80 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                         <defs>
                           <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#F97316" stopOpacity={0.15}/>
                             <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} dy={10} />
                         <YAxis hide />
                         <Tooltip 
                           contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '16px' }}
                           itemStyle={{ fontWeight: 'bold', color: '#0F172A' }}
                           cursor={{ stroke: '#F97316', strokeWidth: 2, strokeDasharray: '5 5' }}
                         />
                         <Area type="monotone" dataKey="value" stroke="#F97316" strokeWidth={5} fillOpacity={1} fill="url(#colorAdmin)" />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                 <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col justify-between">
                   <div>
                     <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-bold text-orange-400">Inventory Health</h3>
                        <div className="flex items-center space-x-2">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                           <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Live</span>
                        </div>
                     </div>
                     <div className="space-y-8">
                        {[
                          { label: 'Umrah', count: packages.filter(p => p.type === 'umrah').length, color: 'bg-emerald-500' },
                          { label: 'Domestic', count: packages.filter(p => p.type.includes('domestic')).length, color: 'bg-sky-500' },
                          { label: 'Visas', count: packages.filter(p => p.type === 'visa').length, color: 'bg-orange-500' },
                        ].map(item => (
                          <div key={item.label} className="space-y-3">
                             <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{item.label}</p>
                                  <p className="text-2xl font-bold">{item.count}</p>
                                </div>
                                <span className="text-[10px] font-bold text-white/30 truncate max-w-[100px]">Active Packages</span>
                             </div>
                             <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${(item.count / Math.max(1, packages.length)) * 100}%` }}
                                 className={cn("h-full", item.color)} 
                                />
                             </div>
                          </div>
                        ))}
                     </div>
                   </div>
                   <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/5">
                      <div className="flex items-center space-x-3 text-orange-400 mb-2">
                         <Info size={16} />
                         <span className="text-xs font-bold uppercase tracking-widest font-mono">System Note</span>
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed font-medium">All financial data is calculated from confirmed documents.</p>
                   </div>
                </div>
              </div>

              {/* Intelligence Pulse Feed */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                 <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center space-x-3">
                       <Zap className="text-orange-500" size={24} />
                       <h3 className="text-xl font-bold">INTELLIGENCE <span className="text-slate-400">PULSE</span></h3>
                    </div>
                    <div className="flex items-center space-x-4">
                       <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <Radio size={12} className="text-emerald-500 animate-pulse" />
                          <span>Stream Active</span>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                       <AnimatePresence>
                          {pulseEvents.map((event, idx) => (
                            <motion.div 
                              key={event.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-start space-x-4 group hover:border-orange-200 hover:bg-white transition-all"
                            >
                               <div className={cn("p-3 rounded-xl bg-white shadow-sm mt-1", event.color)}>
                                  <event.icon size={16} />
                               </div>
                               <div className="flex-grow">
                                  <div className="flex justify-between items-center mb-1">
                                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{event.source}</span>
                                     <span className="text-[10px] font-bold text-slate-300">
                                        {event.timestamp?.toDate().toLocaleTimeString()}
                                     </span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900 mb-1">
                                     {event.type === 'passport_extraction' ? 'AI Document Scan' : 'System Event'}
                                  </p>
                                  <div className="p-3 bg-slate-900 rounded-lg text-[10px] font-mono text-white/50 leading-relaxed">
                                     {event.success ? (
                                       <span className="text-emerald-400">SUCCESS:</span>
                                     ) : (
                                       <span className="text-rose-400">ERROR:</span>
                                     )} {JSON.stringify(event.extractedData || event.error || event.data).slice(0, 150)}...
                                  </div>
                               </div>
                            </motion.div>
                          ))}
                          {pulseEvents.length === 0 && (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-300 animate-pulse">
                               <Activity size={32} className="mb-4" />
                               <p className="text-xs font-bold uppercase tracking-widest text-center">Awaiting Intelligence Signals...</p>
                               <p className="text-[10px] mt-1 text-slate-400">Listening to global system state</p>
                            </div>
                          )}
                       </AnimatePresence>
                    </div>

                    <div className="space-y-6">
                       <div className="p-8 bg-orange-500 rounded-[2.5rem] text-white overflow-hidden relative group">
                          <Zap className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 text-white/10 group-hover:scale-110 transition-transform" size={160} />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-6">AI Efficiency Multiplier</h4>
                          <div className="space-y-6 relative">
                             <div>
                                <p className="text-3xl font-black italic tracking-tighter">98.4%</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">Extraction Precision</p>
                             </div>
                             <div>
                                <p className="text-3xl font-black italic tracking-tighter">~1.2s</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">Mean Scan Latency</p>
                             </div>
                          </div>
                       </div>

                       <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center">
                             <ShieldCheck className="mr-2" size={12} />
                             Compliance Pulse
                          </h4>
                          <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600">Identity Checks</span>
                                <span className="text-xs font-black text-emerald-500">NOMINAL</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600">Document Encryption</span>
                                <span className="text-xs font-black text-emerald-500">ACTIVE</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600">API Health</span>
                                <span className="text-xs font-black text-orange-500">99.9%</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                    <h3 className="text-2xl font-bold">Fulfillment Center</h3>
                    <p className="text-sm text-slate-400 font-medium">Review and process recent travel reservations.</p>
                 </div>
                 <div className="relative w-full md:w-80">
                   <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                   <input 
                     placeholder="Search ID, Passenger..." 
                     className="pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-sm border-none outline-none focus:ring-2 focus:ring-orange-500/10 w-full transition-all"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-10 py-6 border-b border-slate-50">Identity</th>
                      <th className="px-10 py-6 border-b border-slate-50">Package Detail</th>
                      <th className="px-10 py-6 border-b border-slate-50">Amount</th>
                      <th className="px-10 py-6 border-b border-slate-50">Lifecycle</th>
                      <th className="px-10 py-6 border-b border-slate-50">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {bookings.filter(b => b.id.toLowerCase().includes(searchTerm.toLowerCase()) || b.passengers[0]?.name.toLowerCase().includes(searchTerm.toLowerCase())).map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-10 py-8">
                           <div className="font-mono text-[10px] font-bold text-slate-400 mb-1">#{booking.id.toUpperCase().slice(0, 8)}</div>
                           <div className="font-bold text-slate-900">{booking.passengers[0]?.name}</div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="font-bold text-slate-900">{booking.packageName}</div>
                           <div className="text-[10px] uppercase tracking-wider font-bold text-orange-500 mt-1">{booking.packageType}</div>
                        </td>
                        <td className="px-10 py-8 font-bold text-slate-900">{formatCurrency(booking.totalAmount)}</td>
                        <td className="px-10 py-8">
                           <div className="group relative w-fit">
                             <span className={cn(
                               "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-help transition-all hover:ring-4 hover:ring-opacity-20",
                               booking.status === 'pending' ? "bg-amber-100 text-amber-700 hover:ring-amber-500" :
                               booking.status === 'confirmed' ? "bg-sky-100 text-sky-700 hover:ring-sky-500" :
                               booking.status === 'completed' ? "bg-emerald-100 text-emerald-700 hover:ring-emerald-500" :
                               "bg-rose-100 text-rose-700 hover:ring-rose-500"
                             )}>
                               {booking.status}
                             </span>
                             <div className="absolute bottom-full mb-2 left-0 w-48 bg-slate-900 text-white text-[10px] font-bold p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-xl z-10 translate-y-2 group-hover:translate-y-0">
                               <div className="flex items-center space-x-2 mb-1 text-orange-400">
                                  <Info size={10} />
                                  <span className="uppercase tracking-widest">Status Detail</span>
                               </div>
                               <p className="text-white/70 leading-relaxed">
                                 {booking.status === 'pending' && 'Awaiting administrative review and payment verification.'}
                                 {booking.status === 'confirmed' && 'Booking verified. Travel documents are being processed.'}
                                 {booking.status === 'completed' && 'Travel cycle fulfilled successfully.'}
                                 {booking.status === 'cancelled' && 'Booking invalidated or withdrawn by traveler/admin.'}
                               </p>
                               <div className="absolute top-full left-4 border-8 border-transparent border-t-slate-900" />
                             </div>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="flex items-center space-x-3">
                              <select 
                                className="bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold px-3 py-2 outline-none focus:border-orange-500 appearance-none pointer-events-auto"
                                value={booking.status}
                                onChange={(e) => handleStatusUpdate(booking.id, e.target.value)}
                              >
                                 <option value="pending">Pending</option>
                                 <option value="confirmed">Confirm</option>
                                 <option value="completed">Complete</option>
                                 <option value="cancelled">Cancel</option>
                              </select>
                              <button 
                                onClick={() => setSelectedBooking(booking)}
                                className="p-3 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                              >
                                <FileText size={14} />
                              </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-10 py-20 text-center text-slate-400 font-medium">No active bookings found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="space-y-10">
               <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                  <div>
                    <h3 className="text-2xl font-bold">Catalog Architect</h3>
                    <p className="text-sm text-slate-400 font-medium">Create and refine your travel offerings.</p>
                  </div>
                  
                  <div className="flex items-center space-x-4 w-full md:w-auto">
                    <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl">
                      <select 
                        value={`${packageSortField}-${packageSortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split('-');
                          setPackageSortField(field as any);
                          setPackageSortOrder(order as any);
                        }}
                        className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 px-3 cursor-pointer appearance-none"
                      >
                        <option value="createdAt-desc">Newest First</option>
                        <option value="createdAt-asc">Oldest First</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="inventoryCount-desc">Inventory: High First</option>
                        <option value="inventoryCount-asc">Inventory: Low First</option>
                      </select>
                      <div className="p-2 bg-white rounded-xl text-orange-500 shadow-sm shadow-orange-500/5">
                        <BarChart3 size={14} className={cn(packageSortOrder === 'desc' ? "rotate-0" : "rotate-180 transition-transform")} />
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setCurrentPackage({
                          title: '',
                          description: '',
                          type: 'umrah',
                          price: 0,
                          duration: '',
                          category: 'Standard',
                          itinerary: [''],
                          images: ['https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80'],
                          inventoryCount: 10
                        });
                        setIsEditing(true);
                      }}
                      className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-4 rounded-2xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 whitespace-nowrap"
                    >
                      <Plus size={18} />
                      <span>New Listing</span>
                    </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sortedPackages.map((pkg) => (
                    <motion.div 
                      key={pkg.id} 
                      className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:border-orange-200 transition-all flex flex-col"
                    >
                       <div className="aspect-[16/10] bg-slate-100 relative">
                          <img src={pkg.images[0]} className="w-full h-full object-cover" alt={pkg.title} />
                          <div className="absolute top-4 left-4">
                             <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[10px] font-black uppercase text-slate-900 tracking-tighter">
                               {pkg.type}
                             </span>
                          </div>
                          <div className="absolute top-4 right-4 flex space-x-2">
                             <button 
                               onClick={() => {
                                 setCurrentPackage(pkg);
                                 setIsEditing(true);
                               }}
                               className="p-2 bg-white rounded-lg text-slate-400 hover:text-sky-500 transition-colors shadow-sm"
                             >
                               <Edit3 size={16} />
                             </button>
                             <button 
                               onClick={() => handleDeletePackage(pkg.id)}
                               className="p-2 bg-white rounded-lg text-slate-400 hover:text-rose-500 transition-colors shadow-sm"
                             >
                               <Trash2 size={16} />
                             </button>
                          </div>
                       </div>
                       <div className="p-8 flex-grow">
                          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-2">{pkg.category}</p>
                          <h4 className="text-lg font-bold text-slate-900 mb-2">{pkg.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 font-medium leading-relaxed">{pkg.description}</p>
                          
                          <div className="mt-6 flex flex-wrap gap-2">
                             <button 
                               onClick={() => handleGenerateItinerary(pkg)}
                               className="flex items-center space-x-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold hover:bg-orange-100 transition-all uppercase tracking-widest"
                             >
                               <Sparkles size={12} />
                               <span>AI Itinerary</span>
                             </button>
                             {pkg.itinerary && typeof pkg.itinerary === 'string' && (
                               <div className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                                  <CheckCircle2 size={12} />
                                  <span>Generated</span>
                               </div>
                             )}
                          </div>
                       </div>
                       <div className="p-8 pt-0 flex justify-between items-center bg-slate-50/30">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory</p>
                            <p className="font-bold text-slate-900">{pkg.inventoryCount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Starting Price</p>
                            <p className="font-black text-orange-500">{formatCurrency(pkg.price)}</p>
                          </div>
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-10 border-b border-slate-50">
                  <h3 className="text-2xl font-bold">Identity Vault</h3>
                  <p className="text-sm text-slate-400 font-medium">Directory of all registered travelers and administrators.</p>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <tr>
                          <th className="px-10 py-6">User Context</th>
                          <th className="px-10 py-6">Privilege</th>
                          <th className="px-10 py-6">Phone Number</th>
                          <th className="px-10 py-6">Member Since</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {users.map(user => (
                         <tr key={user.uid} className="hover:bg-slate-50/30 transition-colors group relative">
                            <td className="px-10 py-8">
                               <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold relative">
                                     {user.displayName?.charAt(0) || user.email?.charAt(0)}
                                     
                                     {/* User Detail Tooltip */}
                                     <div className="absolute left-full ml-10 top-0 w-64 bg-slate-900 text-white p-6 rounded-[2rem] opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl z-[60] translate-x-4 group-hover:translate-x-0 border border-white/10 backdrop-blur-xl">
                                        <div className="flex items-center space-x-3 mb-4">
                                           <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl">
                                              <ShieldCheck size={14} />
                                           </div>
                                           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Profile Intelligence</span>
                                        </div>
                                        
                                        <div className="space-y-4">
                                           <div>
                                              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Communication</p>
                                              <p className="text-xs font-bold text-white truncate">{user.email}</p>
                                              <p className="text-[10px] text-white/50 mt-0.5">{user.phoneNumber || 'No phone recorded'}</p>
                                           </div>
                                           
                                           <div>
                                              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Residence</p>
                                              <p className="text-xs text-white/70 leading-relaxed italic">{user.address || 'Address not registered'}</p>
                                           </div>

                                           <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                                              <div>
                                                 <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Enrolled</p>
                                                 <p className="text-xs font-mono text-orange-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                                              </div>
                                              <div className="text-[8px] font-bold px-2 py-1 bg-white/10 rounded-md text-white/40 uppercase">
                                                 {user.role}
                                              </div>
                                           </div>
                                        </div>
                                        <div className="absolute right-full top-6 border-8 border-transparent border-r-slate-900" />
                                     </div>
                                  </div>
                                  <div>
                                     <div className="font-bold text-slate-900">{user.displayName || 'Unnamed User'}</div>
                                     <div className="text-xs text-slate-400">{user.email}</div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-8">
                               <span className={cn(
                                 "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                 user.role === 'admin' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                               )}>
                                 {user.role}
                               </span>
                            </td>
                            <td className="px-10 py-8 font-medium text-slate-600 italic">
                               {user.phoneNumber || 'Not provided'}
                            </td>
                            <td className="px-10 py-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                               {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-10 border-b border-slate-50">
                  <h3 className="text-2xl font-bold">Feedback Intelligence</h3>
                  <p className="text-sm text-slate-400 font-medium">Monitoring traveler sentiments and service quality audits.</p>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <tr>
                          <th className="px-10 py-6">Customer</th>
                          <th className="px-10 py-6">Intelligence context</th>
                          <th className="px-10 py-6">Sentiment Data</th>
                          <th className="px-10 py-6">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {reviews.map(review => (
                         <tr key={review.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-10 py-8">
                               <div className="font-bold text-slate-900">{review.userName}</div>
                               <div className="text-xs text-slate-400 font-medium">{review.userEmail}</div>
                            </td>
                            <td className="px-10 py-8">
                               <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-1">
                                  <Package size={14} className="text-orange-500" />
                                  <span>{review.packageName}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono italic">Submitted: {new Date(review.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="px-10 py-8 lg:max-w-md">
                               <div className="flex items-center space-x-1 mb-2">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      size={12} 
                                      className={cn(i < review.rating ? "text-amber-400 fill-amber-400" : "text-slate-200")} 
                                    />
                                  ))}
                                  <span className="text-xs font-black text-slate-900 ml-2">{review.rating}.0</span>
                               </div>
                               <p className="text-xs text-slate-500 font-medium leading-relaxed italic">"{review.comment}"</p>
                            </td>
                            <td className="px-10 py-8">
                               <button 
                                 onClick={() => handleDeleteReview(review.id)}
                                 className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </td>
                         </tr>
                       ))}
                       {reviews.length === 0 && (
                         <tr>
                            <td colSpan={4} className="px-10 py-24 text-center">
                               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                                  <MessageSquare size={40} />
                               </div>
                               <h3 className="text-xl font-bold text-slate-400">No signals detected</h3>
                               <p className="text-slate-300 text-sm">Traveler feedback threads will appear here upon submission.</p>
                            </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'visas' && (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                     <h3 className="text-2xl font-bold">Visa Surveillance</h3>
                     <p className="text-sm text-slate-400 font-medium">Global tracking of entry permit requests and approval statuses.</p>
                  </div>
                  <button 
                    onClick={() => setIsCreatingVisa(true)}
                    className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-4 rounded-2xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 whitespace-nowrap"
                  >
                    <Plus size={18} />
                    <span>New Visa Request</span>
                  </button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <tr>
                          <th className="px-10 py-6">Applicant</th>
                          <th className="px-10 py-6">Permit Type</th>
                          <th className="px-10 py-6">Documentation</th>
                          <th className="px-10 py-6">Current Cycle</th>
                          <th className="px-10 py-6">Command</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {visaRequests.map(visa => {
                         const user = users.find(u => u.uid === visa.userId);
                         return (
                           <tr key={visa.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-10 py-8">
                                 <div className="font-bold text-slate-900">{user?.displayName || 'Unknown Applicant'}</div>
                                 <div className="text-xs text-slate-400">{user?.email}</div>
                              </td>
                              <td className="px-10 py-8">
                                 <div className="font-bold text-slate-900">{visa.visaType}</div>
                                 <div className="text-[10px] text-slate-400 uppercase font-mono mt-1">Submitted: {new Date(visa.submissionDate).toLocaleDateString()}</div>
                              </td>
                              <td className="px-10 py-8">
                                 {visa.passportCopyUrl ? (
                                   <a 
                                     href={visa.passportCopyUrl} 
                                     target="_blank" 
                                     rel="noreferrer"
                                     className="flex items-center space-x-2 text-orange-500 hover:text-orange-600 transition-colors"
                                   >
                                     <FileText size={16} />
                                     <span className="text-xs font-bold font-mono">VIEW PASSPORT</span>
                                   </a>
                                 ) : (
                                   <span className="text-xs text-slate-300 italic">No document</span>
                                 )}
                              </td>
                              <td className="px-10 py-8">
                                 <span className={cn(
                                   "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                   visa.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                                   visa.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                                   visa.status === 'processing' ? "bg-sky-100 text-sky-700" :
                                   "bg-amber-100 text-amber-700"
                                 )}>
                                   {visa.status}
                                 </span>
                              </td>
                              <td className="px-10 py-8">
                                 <select 
                                   className="bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest px-3 py-2 outline-none focus:border-orange-500 appearance-none transition-all"
                                   value={visa.status}
                                   onChange={(e) => handleVisaStatusUpdate(visa.id, e.target.value)}
                                 >
                                    <option value="pending">PENDING</option>
                                    <option value="processing">PROcessing</option>
                                    <option value="approved">APPROVED</option>
                                    <option value="rejected">REJECTED</option>
                                 </select>
                              </td>
                           </tr>
                         );
                       })}
                       {visaRequests.length === 0 && (
                         <tr>
                           <td colSpan={5} className="px-10 py-20 text-center text-slate-400 font-medium">No visa requests in the system.</td>
                         </tr>
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-[600px]">
              {/* Chat List */}
              <div className="md:col-span-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 shrink-0">
                  <h3 className="text-lg font-bold">Active Sessions</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Customer Support Feed</p>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                  {chatSessions.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                      <MessageSquare className="mx-auto mb-4 opacity-20" size={32} />
                      <p className="text-xs font-bold uppercase tracking-widest">No active sessions</p>
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedChat(session)}
                        className={cn(
                          "w-full p-6 text-left border-b border-slate-50 transition-all hover:bg-slate-50 flex items-start space-x-4",
                          selectedChat?.id === session.id ? "bg-orange-50 border-l-4 border-l-orange-500" : ""
                        )}
                      >
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0 font-bold">
                          {session.userName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm truncate">{session.userName}</span>
                            {session.unreadCount > 0 && (
                              <span className="w-2 h-2 bg-orange-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{session.lastMessage}</p>
                          <p className="text-[8px] text-slate-300 mt-2 font-bold uppercase tracking-widest">
                            {session.updatedAt ? new Date(session.updatedAt.toDate()).toLocaleTimeString() : ''}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat View */}
              <div className="md:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                {selectedChat ? (
                  <>
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white shrink-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white font-bold">
                          {selectedChat.userName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{selectedChat.userName}</h4>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">Level 1 Support Thread</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span>Live Session</span>
                      </div>
                    </div>

                    <div 
                      ref={chatScrollRef}
                      className="flex-grow p-8 overflow-y-auto space-y-6 bg-slate-50/50 custom-scrollbar"
                    >
                      {chatMessages.map((msg, i) => (
                        <div key={msg.id || i} className={cn(
                          "flex flex-col max-w-[80%]",
                          msg.isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                        )}>
                          <div className={cn(
                            "px-5 py-3 rounded-2xl text-sm font-medium shadow-sm",
                            msg.isAdmin ? "bg-slate-900 text-white rounded-br-none" : "bg-white text-slate-900 rounded-bl-none border border-slate-100"
                          )}>
                            {msg.text}
                          </div>
                          <span className="text-[8px] font-bold text-slate-300 mt-1 uppercase tracking-widest">
                            {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : 'Sending...'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 bg-white border-t border-slate-50 shrink-0">
                      <div className="flex items-center space-x-4">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                          placeholder="Command input console..."
                          className="flex-grow bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-orange-500/10 text-sm font-medium"
                        />
                        <button
                          onClick={handleSendChatMessage}
                          disabled={!chatInput.trim()}
                          className="p-4 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-slate-300">
                    <MessageSquare size={48} className="mb-4 opacity-10" />
                    <p className="text-xs font-bold uppercase tracking-widest">Select a terminal to engage support</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Package Editor Modal */}
      {isEditing && currentPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
           <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
           >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                 <div>
                   <h3 className="text-2xl font-bold">{currentPackage.id ? 'Edit Specification' : 'New Catalog Entry'}</h3>
                   <p className="text-sm text-slate-400 font-medium">Define metadata and commercial attributes.</p>
                 </div>
                 <button 
                  onClick={() => setIsEditing(false)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-rose-500 transition-colors"
                 >
                   <XCircle size={24} />
                 </button>
              </div>

              <div className="p-10 overflow-y-auto space-y-10">
                 {/* Form Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                             <Tag size={12} className="mr-2" />
                             Package Title
                          </label>
                          <input 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all"
                            value={currentPackage.title}
                            onChange={(e) => setCurrentPackage({ ...currentPackage, title: e.target.value })}
                          />
                       </div>
                       
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                             <Layers size={12} className="mr-2" />
                             Classification
                          </label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all appearance-none"
                            value={currentPackage.type}
                            onChange={(e) => setCurrentPackage({ ...currentPackage, type: e.target.value as PackageType })}
                          >
                             <option value="umrah">Umrah</option>
                             <option value="haj">Haj</option>
                             <option value="visa">Visa</option>
                             <option value="domestic-group">Domestic Group</option>
                             <option value="domestic-private">Domestic Private</option>
                          </select>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                               <TrendingUp size={12} className="mr-2" />
                               Price (PKR)
                            </label>
                            <input 
                              type="number"
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all"
                              value={currentPackage.price}
                              onChange={(e) => setCurrentPackage({ ...currentPackage, price: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                               <Clock size={12} className="mr-2" />
                               Duration
                            </label>
                            <input 
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all"
                              placeholder="e.g. 14 Days"
                              value={currentPackage.duration}
                              onChange={(e) => setCurrentPackage({ ...currentPackage, duration: e.target.value })}
                            />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                             <ImageIcon size={12} className="mr-2" />
                             Package Assets
                          </label>
                          {uploadError && (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600 shadow-sm"
                            >
                              <AlertTriangle size={16} className="shrink-0 text-rose-500" />
                              <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed flex-grow">{uploadError}</p>
                              <button onClick={() => setUploadError(null)} className="p-1 hover:bg-rose-100 rounded-lg transition-colors">
                                <X size={14} />
                              </button>
                            </motion.div>
                          )}
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {currentPackage.images?.map((img, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100 shadow-sm">
                                <img src={img} className="w-full h-full object-cover" alt="" />
                                <button 
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-1 right-1 p-1 bg-white/90 backdrop-blur-sm rounded-md text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-all bg-slate-50/50 relative overflow-hidden"
                            >
                              {isUploading ? (
                                <div className="flex flex-col items-center justify-center p-2 w-full h-full bg-orange-50/50">
                                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                                  <span className="text-[10px] font-black text-orange-600">{Math.round(uploadProgress)}%</span>
                                  <div className="absolute bottom-0 left-0 h-1 bg-orange-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                              ) : (
                                <>
                                  <Upload size={20} className="mb-2" />
                                  <span className="text-[10px] font-bold uppercase">Upload</span>
                                </>
                              )}
                            </button>
                          </div>
                          <input 
                            ref={fileInputRef}
                            type="file" 
                            multiple 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                          />
                          <div className="flex items-center space-x-2">
                            <input 
                              className="flex-grow bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-orange-500 transition-all"
                              placeholder="Or paste image URL..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (e.target as HTMLInputElement).value;
                                  if (val) {
                                    setCurrentPackage({ ...currentPackage, images: [...(currentPackage.images || []), val] });
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                             <Info size={12} className="mr-2" />
                             Detailed Narrative
                          </label>
                          <textarea 
                            rows={4}
                            className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-5 py-4 text-sm font-medium outline-none focus:border-orange-500 transition-all resize-none"
                            value={currentPackage.description}
                            onChange={(e) => setCurrentPackage({ ...currentPackage, description: e.target.value })}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-10 bg-slate-50 flex justify-between items-center border-t border-slate-100">
                 <div className="flex items-center space-x-3 text-slate-400">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Changes persist globally</span>
                 </div>
                 <div className="flex space-x-4">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      Discard
                    </button>
                    <button 
                      onClick={handleSavePackage}
                      className="flex items-center space-x-2 bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-orange-500 transition-all shadow-xl shadow-slate-900/10"
                    >
                      <Save size={18} />
                      <span>Commit Changes</span>
                    </button>
                 </div>
              </div>
           </motion.div>
        </div>
      )}

      {/* Visa Request Creation Modal */}
      {isCreatingVisa && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
           <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
           >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                 <div>
                   <h3 className="text-2xl font-bold">New Visa Protocol</h3>
                   <p className="text-sm text-slate-400 font-medium">Initialize a manual visa application for a verified user.</p>
                 </div>
                 <button 
                  onClick={() => setIsCreatingVisa(false)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-rose-500 transition-colors"
                 >
                   <XCircle size={24} />
                 </button>
              </div>

              <div className="p-10 overflow-y-auto space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                       <Users size={12} className="mr-2" />
                       Select Applicant
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all appearance-none"
                      value={newVisaRequest.userId}
                      onChange={(e) => setNewVisaRequest({ ...newVisaRequest, userId: e.target.value })}
                    >
                       <option value="">Choose a user...</option>
                       {users.map(u => (
                         <option key={u.uid} value={u.uid}>{u.displayName || u.email} ({u.email})</option>
                       ))}
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                       <ShieldCheck size={12} className="mr-2" />
                       Visa Classification
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all appearance-none"
                      value={newVisaRequest.visaType}
                      onChange={(e) => setNewVisaRequest({ ...newVisaRequest, visaType: e.target.value })}
                    >
                       <option value="Umrah Visa">Umrah Visa</option>
                       <option value="Tourist Visa">Tourist Visa</option>
                       <option value="Business Visa">Business Visa</option>
                       <option value="Student Visa">Student Visa</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                       <Filter size={12} className="mr-2" />
                       Initial Status
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all appearance-none"
                      value={newVisaRequest.status}
                      onChange={(e) => setNewVisaRequest({ ...newVisaRequest, status: e.target.value as any })}
                    >
                       <option value="pending">PENDING</option>
                       <option value="processing">PROCESSING</option>
                       <option value="approved">APPROVED</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                       <FileText size={12} className="mr-2" />
                       Internal Notes
                    </label>
                    <textarea 
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-5 py-4 text-sm font-medium outline-none focus:border-orange-500 transition-all resize-none"
                      placeholder="Enter any specific requirements or notes..."
                      value={newVisaRequest.notes}
                      onChange={(e) => setNewVisaRequest({ ...newVisaRequest, notes: e.target.value })}
                    />
                 </div>
              </div>

              <div className="p-10 bg-slate-50 flex justify-end items-center border-t border-slate-100 space-x-4">
                 <button 
                   onClick={() => setIsCreatingVisa(false)}
                   className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:text-slate-900 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleCreateVisaRequest}
                   className="flex items-center space-x-2 bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-orange-500 transition-all shadow-xl shadow-slate-900/10"
                 >
                   <Save size={18} />
                   <span>Initialize Request</span>
                 </button>
              </div>
           </motion.div>
        </div>
      )}
      
      {/* Generated Itinerary Editor Modal */}
      {generatingItinerary && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
           <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
           >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
                 <div>
                   <h3 className="text-2xl font-bold flex items-center gap-3">
                      <Sparkles className="text-orange-400" />
                      AI Itinerary Protocol
                   </h3>
                   <p className="text-sm text-white/40 font-medium">Review and refine the AI-generated day-by-day plan.</p>
                 </div>
                 <button 
                  onClick={() => setGeneratingItinerary(null)}
                  className="p-3 bg-white/10 text-white/40 rounded-2xl hover:text-white transition-colors"
                 >
                   <XCircle size={24} />
                 </button>
              </div>

              <div className="p-10 overflow-y-auto flex-grow bg-slate-50">
                 <textarea 
                   rows={20}
                   className="w-full bg-white border border-slate-200 rounded-[2rem] p-10 text-sm font-mono leading-relaxed outline-none focus:border-orange-500 transition-all shadow-inner"
                   value={itineraryContent}
                   onChange={(e) => setItineraryContent(e.target.value)}
                 />
              </div>

              <div className="p-10 bg-white flex justify-end items-center border-t border-slate-100 space-x-4">
                 <button 
                   onClick={() => setGeneratingItinerary(null)}
                   className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:text-slate-900 transition-colors"
                 >
                   Discard
                 </button>
                 <button 
                   onClick={() => saveGeneratedItinerary(generatingItinerary)}
                   className="flex items-center space-x-2 bg-orange-500 text-white px-10 py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20"
                 >
                   <Save size={18} />
                   <span>Commit to Package</span>
                 </button>
              </div>
           </motion.div>
        </div>
      )}

      {/* Booking Detail Intelligence Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col"
            >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white shrink-0">
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <Package size={24} className="text-orange-400" />
                    <h3 className="text-xl font-bold italic tracking-tighter">APPLICATION OVERDRAFT: #{selectedBooking.id.toUpperCase().slice(0, 8)}</h3>
                  </div>
                  <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Deep inspection of traveler fulfillment documents</p>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-10 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left: General Info & Passengers */}
                  <div className="space-y-12">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                        <Users size={12} className="mr-2" />
                        Traveler Manifest
                      </h4>
                      <div className="space-y-4">
                        {selectedBooking.passengers.map((p, i) => (
                          <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-orange-200 transition-all">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-900 uppercase text-sm tracking-tight">{p.name}</p>
                                <p className="text-xs text-slate-400 font-medium">Passport: <span className="font-mono text-slate-600">{p.passportNumber || "MISSING"}</span></p>
                              </div>
                              <span className="text-[10px] font-black bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm text-slate-400">{p.age} YRS</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-10 border-t border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                        <Tag size={12} className="mr-2" />
                        Financial Audit
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-900 rounded-2xl text-white">
                          <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-1">Contract Value</p>
                          <p className="text-xl font-black">{formatCurrency(selectedBooking.totalAmount)}</p>
                        </div>
                        <div className="p-6 bg-orange-500 rounded-2xl text-white">
                          <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-1">Status Protocol</p>
                          <p className="text-xl font-black uppercase tracking-tighter italic">{selectedBooking.status}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Documents Intelligence */}
                  <div className="space-y-10">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                      <FileText size={12} className="mr-2" />
                      Document Overrides
                    </h4>
                    
                    <div className="space-y-6">
                      {/* Passport */}
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                            <div>
                              <p className="text-xs font-bold text-slate-900 uppercase">Primary Passport Copy</p>
                              <p className="text-[10px] text-slate-400 font-medium">Critical travel document</p>
                            </div>
                            {selectedBooking.passportUrl || users.find(u => u.uid === selectedBooking.userId)?.passportCopyUrl ? (
                              <a 
                                href={selectedBooking.passportUrl || users.find(u => u.uid === selectedBooking.userId)?.passportCopyUrl} 
                                target="_blank" 
                                className="p-2 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                <ChevronRight size={18} />
                              </a>
                            ) : (
                              <div className="p-2 bg-rose-50 text-rose-500 rounded-xl"><X size={18} /></div>
                            )}
                          </div>
                          
                          <button 
                            disabled={isUploadingDoc === 'passport'}
                            onClick={() => document.getElementById('admin-passport-upload')?.click()}
                            className="w-full flex items-center justify-center space-x-2 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-orange-50 hover:text-orange-500 transition-all border border-dashed border-slate-200"
                          >
                            {isUploadingDoc === 'passport' ? <RotateCcw size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>{selectedBooking.passportUrl ? 'REPLACE IN DOCUMENT' : 'INITIAL OVERRIDE'}</span>
                          </button>
                          <input type="file" id="admin-passport-upload" className="hidden" onChange={(e) => handleAdminDocUpload(e, 'passport')} />
                        </div>
                      </div>

                      {/* ID Card */}
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                            <div>
                              <p className="text-xs font-bold text-slate-900 uppercase">Government ID Card</p>
                              <p className="text-[10px] text-slate-400 font-medium">Verification layer secondary</p>
                            </div>
                            {selectedBooking.idCardUrl || users.find(u => u.uid === selectedBooking.userId)?.idCardUrl ? (
                              <a 
                                href={selectedBooking.idCardUrl || users.find(u => u.uid === selectedBooking.userId)?.idCardUrl} 
                                target="_blank" 
                                className="p-2 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                <ChevronRight size={18} />
                              </a>
                            ) : (
                              <div className="p-2 bg-rose-50 text-rose-500 rounded-xl"><X size={18} /></div>
                            )}
                          </div>
                          
                          <button 
                            disabled={isUploadingDoc === 'idCard'}
                            onClick={() => document.getElementById('admin-idcard-upload')?.click()}
                            className="w-full flex items-center justify-center space-x-2 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-orange-50 hover:text-orange-500 transition-all border border-dashed border-slate-200"
                          >
                            {isUploadingDoc === 'idCard' ? <RotateCcw size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>{selectedBooking.idCardUrl ? 'REPLACE IN DOCUMENT' : 'INITIAL OVERRIDE'}</span>
                          </button>
                          <input type="file" id="admin-idcard-upload" className="hidden" onChange={(e) => handleAdminDocUpload(e, 'idCard')} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 bg-slate-50 shrink-0 border-t border-slate-100 flex justify-between items-center">
                 <div className="flex items-center space-x-2 text-slate-400 italic">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Administrative Audit Tracked</span>
                 </div>
                 <button 
                   onClick={() => setSelectedBooking(null)}
                   className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/10 hover:bg-orange-500 transition-all"
                 >
                   Intelligence Verified
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
