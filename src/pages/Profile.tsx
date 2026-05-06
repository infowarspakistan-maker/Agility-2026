import { useState, useEffect, ChangeEvent } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { Booking, UserProfile, VisaRequest } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Phone, MapPin, Package, LogOut, ChevronRight, 
  Clock, CheckCircle2, ShieldCheck, FileText, Users, Edit3, 
  Save, X, Upload, Globe, XCircle, Info, AlertTriangle, Loader2
} from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/src/lib/firebase';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = process.env.VITE_STRIPE_PUBLISHABLE_KEY ? loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY) : null;

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [visaRequests, setVisaRequests] = useState<VisaRequest[]>([]);
  const [isUploadingPassport, setIsUploadingPassport] = useState(false);
  const [isUploadingID, setIsUploadingID] = useState(false);
  const [isRequestingVisa, setIsRequestingVisa] = useState(false);
  const [visaType, setVisaType] = useState('Umrah Visa');
  const [isEditing, setIsEditing] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: '',
    phoneNumber: '',
    address: ''
  });
  const [saving, setSaving] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Handle payment success redirect
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        const bookingId = urlParams.get('bookingId');

        if (paymentStatus === 'success' && bookingId) {
          const bookingRef = doc(db, 'bookings', bookingId);
          await updateDoc(bookingRef, {
            paymentStatus: 'paid',
            status: 'confirmed'
          });
          // Remove query params
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          // Force admin role if it's the specific email
          if (auth.currentUser.email === 'almalikaewan@gmail.com' && data.role !== 'admin') {
            data.role = 'admin';
            updateDoc(userRef, { role: 'admin' }).catch(console.error);
          }
          setProfile(data);
          setEditForm({
            displayName: data.displayName || '',
            phoneNumber: data.phoneNumber || '',
            address: data.address || ''
          });
        }

        const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', auth.currentUser.uid));
        const bookingsSnap = await getDocs(bookingsQuery);
        setBookings(bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);

        const visasQuery = query(collection(db, 'visaRequests'), where('userId', '==', auth.currentUser.uid));
        const visasSnap = await getDocs(visasQuery);
        setVisaRequests(visasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VisaRequest[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handlePayment = async (booking: Booking) => {
    setPaying(booking.id);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: booking.totalAmount,
          packageName: booking.packageName,
          bookingId: booking.id,
          userEmail: auth.currentUser?.email
        }),
      });

      const session = await response.json();
      if (session.error) throw new Error(session.error);

      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: session.id,
        });
        if (error) throw error;
      } else {
        // Fallback for missing stripe key in dev
        alert("Stripe is not configured. Simulating success...");
        window.location.href = `${window.location.origin}/profile?payment=success&bookingId=${booking.id}`;
      }
    } catch (error) {
      console.error(error);
      alert('Payment failed to initialize');
    } finally {
      setPaying(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser || !profile) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, editForm);
      setProfile({ ...profile, ...editForm });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
    } catch (e) {
      console.error(e);
      alert('Failed to send verification email. Please try again later.');
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const handlePassportUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploadingPassport(true);
    try {
      const storageRef = ref(storage, `passports/${auth.currentUser.uid}-${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { passportCopyUrl: downloadURL });
      
      setProfile(prev => prev ? { ...prev, passportCopyUrl: downloadURL } : null);
    } catch (error) {
      console.error(error);
      alert('Failed to upload passport');
    } finally {
      setIsUploadingPassport(false);
    }
  };

  const handleIDCardUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploadingID(true);
    try {
      const storageRef = ref(storage, `id_cards/${auth.currentUser.uid}-${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { idCardUrl: downloadURL });
      
      setProfile(prev => prev ? { ...prev, idCardUrl: downloadURL } : null);
    } catch (error) {
      console.error(error);
      alert('Failed to upload ID card');
    } finally {
      setIsUploadingID(false);
    }
  };

  const handleSubmitVisaRequest = async () => {
    if (!auth.currentUser || !profile?.passportCopyUrl) {
      alert('Please upload your passport first');
      return;
    }

    setSaving(true);
    try {
      const visaData = {
        userId: auth.currentUser.uid,
        visaType,
        status: 'pending',
        passportCopyUrl: profile.passportCopyUrl,
        submissionDate: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'visaRequests'), visaData);
      setVisaRequests([{ id: docRef.id, ...visaData } as VisaRequest, ...visaRequests]);
      setIsRequestingVisa(false);
    } catch (e) {
      console.error(e);
      alert('Failed to submit visa request');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="pt-32 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  );
  
  if (!auth.currentUser) return (
    <div className="pt-40 text-center">
      <h2 className="text-2xl font-bold mb-4">Please log in to view your profile</h2>
      <button onClick={() => navigate('/login')} className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold">Sign In</button>
    </div>
  );

  return (
    <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
      {/* Verification Banner */}
      {!auth.currentUser?.emailVerified && !verificationSent && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 p-6 bg-orange-50 border border-orange-100 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="flex items-center space-x-5 relative z-10">
            <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Email Verification Pending</h3>
              <p className="text-slate-500 text-sm font-medium">Unlock full platform privileges by verifying your primary communication channel.</p>
            </div>
          </div>
          <button 
            onClick={handleSendVerification}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-tight hover:bg-orange-500 transition-all shadow-xl shadow-slate-900/10 relative z-10 whitespace-nowrap"
          >
            Send Verification Link
          </button>
        </motion.div>
      )}

      {verificationSent && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-10 p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] flex items-center space-x-5"
        >
          <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Verification Link Transmitted</h3>
            <p className="text-slate-500 text-sm font-medium">Please check your inbox (and spam folder) to complete the authentication cycle.</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar: Profile Info */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-6">
                 <div className="w-20 h-20 rounded-[1.5rem] bg-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/20 text-white">
                    <User size={40} />
                 </div>
                 {!isEditing ? (
                   <button 
                    onClick={() => setIsEditing(true)}
                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-orange-50 hover:text-orange-500 transition-all opacity-0 group-hover:opacity-100"
                   >
                     <Edit3 size={16} />
                   </button>
                 ) : (
                   <div className="flex space-x-2">
                     <button onClick={() => setIsEditing(false)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all">
                        <X size={16} />
                     </button>
                     <button 
                      onClick={handleSaveProfile} 
                      disabled={saving}
                      className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                     >
                        <Save size={16} />
                     </button>
                   </div>
                 )}
               </div>

               <AnimatePresence mode="wait">
                 {!isEditing ? (
                   <motion.div
                    key="view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                   >
                     <h2 className="text-3xl font-bold text-slate-900 mb-1">{profile?.displayName || 'Traveler'}</h2>
                     <div className="flex items-center space-x-2 mb-8">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                          profile?.role === 'admin' ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                        )}>
                          {profile?.role || 'Guest'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Active Intelligence</span>
                     </div>
                     
                     <div className="space-y-6">
                       <div className="flex items-center space-x-4 text-slate-500">
                          <div className="p-2 bg-slate-50 rounded-lg"><Mail size={16} className="text-slate-400" /></div>
                          <span className="text-sm font-medium">{profile?.email}</span>
                       </div>
                       <div className="flex items-center space-x-4 text-slate-500">
                          <div className="p-2 bg-slate-50 rounded-lg"><Phone size={16} className="text-slate-400" /></div>
                          <span className="text-sm font-medium">{profile?.phoneNumber || 'No phone added'}</span>
                       </div>
                       <div className="flex items-center space-x-4 text-slate-500">
                          <div className="p-2 bg-slate-50 rounded-lg"><MapPin size={16} className="text-slate-400" /></div>
                          <span className="text-sm font-medium truncate">{profile?.address || 'Lahore, Pakistan'}</span>
                       </div>
                     </div>
                   </motion.div>
                 ) : (
                   <motion.div
                    key="edit"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                   >
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Display Name</label>
                       <input 
                         type="text" 
                         value={editForm.displayName}
                         onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                         className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                       <input 
                         type="text" 
                         value={editForm.phoneNumber}
                         onChange={e => setEditForm({...editForm, phoneNumber: e.target.value})}
                         className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Address</label>
                       <input 
                         type="text" 
                         value={editForm.address}
                         onChange={e => setEditForm({...editForm, address: e.target.value})}
                         className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20"
                       />
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>

               <button 
                 onClick={handleLogout}
                 className="w-full mt-10 flex items-center justify-center space-x-2 py-4 bg-slate-50 text-slate-400 font-bold rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all border border-transparent hover:border-rose-100"
               >
                 <LogOut size={18} />
                 <span>Sign Out</span>
               </button>
             </div>
           </div>

           {/* Admin Entry Point */}
           {profile?.role === 'admin' && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-orange-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-orange-500/20"
             >
                <div className="flex items-center space-x-3 mb-4">
                  <ShieldCheck size={24} />
                  <h3 className="text-xl font-bold">System Admin</h3>
                </div>
                <p className="text-white/80 text-sm mb-6 leading-relaxed">You have high-level access to manage packages, bookings, and user records.</p>
                <button 
                  onClick={() => navigate('/admin')}
                  className="w-full py-4 bg-white text-orange-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-50 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Enter Control Center</span>
                  <ChevronRight size={16} />
                </button>
             </motion.div>
           )}

           {/* Quick Actions */}
           <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full translate-y-1/2 translate-x-1/2 blur-2xl" />
              <h3 className="text-lg font-bold mb-6 text-orange-400 relative z-10">Quick Actions</h3>
               <div className="space-y-4 relative z-10">
                  <div className="relative">
                     <button 
                       disabled={isUploadingPassport}
                       onClick={() => document.getElementById('passport-upload')?.click()}
                       className="w-full flex justify-between items-center p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group disabled:opacity-50"
                     >
                        <div className="flex items-center space-x-3">
                           <FileText size={18} className="text-orange-400" />
                           <span className="text-sm font-medium">{profile?.passportCopyUrl ? 'Update Passport' : 'Upload Passport'}</span>
                        </div>
                        {isUploadingPassport ? (
                          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : profile?.passportCopyUrl ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <Upload size={16} className="text-white/20 group-hover:text-white" />
                        )}
                     </button>
                     <input 
                       id="passport-upload" 
                       type="file" 
                       className="hidden" 
                       accept="image/*,.pdf" 
                       onChange={handlePassportUpload} 
                     />
                  </div>
                  <div className="relative">
                     <button 
                       disabled={isUploadingID}
                       onClick={() => document.getElementById('id-upload')?.click()}
                       className="w-full flex justify-between items-center p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group disabled:opacity-50"
                     >
                        <div className="flex items-center space-x-3">
                           <FileText size={18} className="text-orange-400" />
                           <span className="text-sm font-medium">{profile?.idCardUrl ? 'Update ID Card' : 'Upload ID Card'}</span>
                        </div>
                        {isUploadingID ? (
                          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : profile?.idCardUrl ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <Upload size={16} className="text-white/20 group-hover:text-white" />
                        )}
                     </button>
                     <input 
                       id="id-upload" 
                       type="file" 
                       className="hidden" 
                       accept="image/*,.pdf" 
                       onChange={handleIDCardUpload} 
                     />
                  </div>
                  <button 
                    onClick={() => setIsRequestingVisa(true)}
                    className="w-full flex justify-between items-center p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                  >
                     <div className="flex items-center space-x-3">
                        <ShieldCheck size={18} className="text-orange-400" />
                        <span className="text-sm font-medium">New Visa Request</span>
                     </div>
                     <ChevronRight size={16} className="text-white/20 group-hover:text-white" />
                  </button>
               </div>
           </div>
        </div>

            {/* Main Content: Bookings & Visas */}
        <div className="lg:col-span-8 space-y-12">
           <div>
             <div className="mb-12 flex justify-between items-end">
               <div>
                 <h2 className="text-4xl font-black mb-2 text-slate-900">Manage <span className="text-orange-500">Bookings</span></h2>
                 <p className="text-slate-400 font-medium tracking-tight">Track your upcoming and past journeys with Agility.</p>
               </div>
               <div className="hidden md:block">
                 <div className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span>Live Status Sync</span>
                 </div>
               </div>
             </div>

             {bookings.length > 0 ? (
               <div className="grid grid-cols-1 gap-6">
                  {bookings.map((booking, idx) => (
                     <motion.div
                       key={booking.id}
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: idx * 0.1 }}
                       className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500"
                     >
                        <div className="flex items-center space-x-6">
                           <div className={cn(
                             "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500",
                             booking.status === 'pending' ? "bg-amber-100 text-amber-600" :
                             booking.status === 'confirmed' ? "bg-sky-100 text-sky-600" :
                             "bg-emerald-100 text-emerald-600"
                           )}>
                              <Package size={32} />
                           </div>
                           <div>
                              <div className="flex items-center space-x-3 mb-1">
                                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID: #{booking.id.slice(0, 8).toUpperCase()}</p>
                                 <span className={cn(
                                   "px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                   booking.status === 'pending' ? "bg-amber-100 text-amber-700" :
                                   booking.status === 'confirmed' ? "bg-sky-100 text-sky-700" :
                                   "bg-emerald-100 text-emerald-700"
                                 )}>
                                   {booking.status}
                                 </span>
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900 group-hover:text-orange-500 transition-colors tracking-tight">{booking.packageName}</h3>
                              <div className="flex items-center space-x-6 mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                 <span className="flex items-center">
                                    <Clock size={14} className="mr-2 text-slate-300" />
                                    {new Date(booking.bookingDate).toLocaleDateString()}
                                 </span>
                                 <span className="flex items-center">
                                    <Users size={14} className="mr-2 text-slate-300" />
                                    {booking.passengers.length} Travelers
                                 </span>
                              </div>
                           </div>
                        </div>

                        <div className="text-left md:text-right flex flex-col items-start md:items-end">
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Fulfilled</p>
                           <p className="text-3xl font-black text-slate-900 mb-4">{formatCurrency(booking.totalAmount)}</p>
                           {booking.paymentStatus !== 'paid' && (
                             <button 
                               onClick={() => handlePayment(booking)}
                               disabled={paying === booking.id}
                               className="w-full md:w-auto px-6 py-3 bg-orange-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 mb-4"
                             >
                               {paying === booking.id ? (
                                 <><Loader2 size={14} className="animate-spin" /><span>Processing...</span></>
                               ) : (
                                 <><ShieldCheck size={14} /><span>Secure Pay Now</span></>
                               )}
                             </button>
                           )}
                           {booking.paymentStatus === 'paid' && (
                             <div className="flex items-center space-x-2 text-emerald-500 bg-emerald-50 px-4 py-2 rounded-xl mb-4 font-bold text-[10px] uppercase tracking-widest">
                                <CheckCircle2 size={14} />
                                <span>Payment Verified</span>
                             </div>
                           )}
                           <button className="mt-4 text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                              <span>Intelligence View</span>
                              <ChevronRight size={14} />
                           </button>
                        </div>
                     </motion.div>
                  ))}
               </div>
             ) : (
               <div className="py-24 text-center bg-slate-50/50 rounded-[3.5rem] border border-dashed border-slate-200">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200 shadow-sm">
                     <Package size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-400 mb-3 tracking-tight">No active bookings detected</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mb-12 font-medium">Initialize your travel cycle by exploring our hand-picked domestic and international packages.</p>
                  <button 
                    onClick={() => navigate('/')}
                    className="px-12 py-5 bg-orange-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/40 hover:bg-orange-600 transition-all hover:-translate-y-1 active:translate-y-0"
                  >
                    Discover Packages
                  </button>
               </div>
             )}
           </div>

           {/* Visa Requests Section */}
           <div className="pt-12 border-t border-slate-100">
              <div className="mb-10">
                <h2 className="text-3xl font-black mb-2 text-slate-900">Visa <span className="text-orange-500">Intelligence</span></h2>
                <p className="text-slate-400 font-medium">Track your entry permit status and documentation.</p>
              </div>

              {visaRequests.length > 0 ? (
                <div className="space-y-4">
                  {visaRequests.map((visa) => (
                    <div key={visa.id} className="bg-slate-50 p-6 rounded-3xl flex items-center justify-between border border-slate-100">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-orange-500">
                          <Globe size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{visa.visaType}</h4>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{new Date(visa.submissionDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          visa.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                          visa.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {visa.status}
                        </span>
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50/50 rounded-3xl p-10 text-center border-2 border-dashed border-slate-200">
                   <p className="text-sm font-bold text-slate-300">No active visa threads found.</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Visa Request Modal */}
      <AnimatePresence>
        {isRequestingVisa && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
             >
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                   <h3 className="text-xl font-bold">New Visa Request</h3>
                   <button onClick={() => setIsRequestingVisa(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400">
                      <X size={20} />
                   </button>
                </div>
                <div className="p-8 space-y-6">
                   {!profile?.passportCopyUrl && (
                     <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold leading-relaxed border border-rose-100 flex items-center space-x-3">
                        <XCircle size={16} className="shrink-0" />
                        <span>Please upload your passport copy first.</span>
                     </div>
                   )}
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Visa Category</label>
                      <select 
                        value={visaType}
                        onChange={e => setVisaType(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none"
                      >
                         <option>Umrah Visa</option>
                         <option>Haj Visa</option>
                         <option>Schengen Tourist</option>
                         <option>UK Standard Visitor</option>
                         <option>USA B1/B2</option>
                      </select>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center space-x-3 text-slate-400 mb-2">
                        <Info size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Protocol</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed italic">Your submitted passport copy will be used for this application. Approval processing usually takes 5-10 business days.</p>
                   </div>
                </div>
                <div className="p-8 bg-slate-50 flex justify-end">
                   <button 
                    disabled={saving || !profile?.passportCopyUrl}
                    onClick={handleSubmitVisaRequest}
                    className="px-10 py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50"
                   >
                     {saving ? 'Transmitting...' : 'Submit Request'}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
