import { useState, useEffect, ChangeEvent } from 'react';
import Markdown from 'react-markdown';
import { auth, db } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { Booking, UserProfile, VisaRequest } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Phone, MapPin, Package, LogOut, ChevronRight, 
  Clock, CheckCircle2, ShieldCheck, FileText, Users, Edit3, 
  Save, X, Upload, Globe, XCircle, Info, AlertTriangle, Loader2,
  Sparkles, Compass, Utensils, Baby, Accessibility, Printer, Heart
} from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/src/lib/firebase';
import { authorizeGoogleSheets, exportPersonalItinerarySheet } from '@/src/services/googleSheetsService';
import { useToast } from '@/src/components/layout/ToastContext';

export default function Profile() {
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [visaRequests, setVisaRequests] = useState<VisaRequest[]>([]);
  const [isUploadingPassport, setIsUploadingPassport] = useState(false);
  const [isUploadingID, setIsUploadingID] = useState(false);
  const [isUploadingEducationDegree, setIsUploadingEducationDegree] = useState(false);
  const [isRequestingVisa, setIsRequestingVisa] = useState(false);
  const [visaType, setVisaType] = useState('Umrah Visa');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    phoneNumber: '',
    address: ''
  });
  const [saving, setSaving] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [exportingBookingId, setExportingBookingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // AI Personalized Itinerary States
  const [selectedBookingForItinerary, setSelectedBookingForItinerary] = useState<Booking | null>(null);
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);
  const [activeItinerary, setActiveItinerary] = useState('');
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [itineraryPreferences, setItineraryPreferences] = useState({
    pace: 'Balanced',
    interest: 'Sightseeing & Landmarks',
    dietary: 'Halal Only',
    travelingWithKids: false,
    travelingWithElderly: false,
    extraNotes: ''
  });

  useEffect(() => {
    if (itineraryLoading) {
      const interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % 4);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [itineraryLoading]);

  const loadingMessages = [
    "Analyzing booking details & travel duration...",
    "Consulting local attractions and optimizing sequence...",
    "Mapping dietary criteria and mobility parameters...",
    "Structuring premium markdown daily timeline..."
  ];

  const loadSavedItinerary = async (bookingId: string) => {
    try {
      const docRef = doc(db, 'personalizedItineraries', bookingId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveItinerary(data.text || '');
        if (data.preferences) {
          setItineraryPreferences({
            pace: data.preferences.pace || 'Balanced',
            interest: data.preferences.interest || 'Sightseeing & Landmarks',
            dietary: data.preferences.dietary || 'Halal Only',
            travelingWithKids: data.preferences.travelingWithKids || false,
            travelingWithElderly: data.preferences.travelingWithElderly || false,
            extraNotes: data.preferences.extraNotes || ''
          });
        }
      } else {
        setActiveItinerary('');
      }
    } catch (err) {
      console.error("Failed to load saved itinerary:", err);
    }
  };

  const handleOpenItineraryModule = async (booking: Booking) => {
    setSelectedBookingForItinerary(booking);
    setItineraryModalOpen(true);
    setItineraryLoading(true);
    
    let defaultInterest = "Sightseeing & Landmarks";
    if (booking.packageType === 'umrah' || booking.packageType === 'haj') {
      defaultInterest = "Spiritual & Pilgrimage Focus";
    } else if (booking.packageType === 'study-abroad') {
      defaultInterest = "Academic & Study Preparation";
    } else if (booking.packageType === 'expo' || booking.packageType === 'corporate') {
      defaultInterest = "Corporate & Business Networking";
    }
    
    setItineraryPreferences({
      pace: 'Balanced',
      interest: defaultInterest,
      dietary: 'Halal Only',
      travelingWithKids: false,
      travelingWithElderly: false,
      extraNotes: ''
    });

    await loadSavedItinerary(booking.id);
    setItineraryLoading(false);
  };

  const handleGeneratePersonalizedItinerary = async () => {
    if (!selectedBookingForItinerary) return;
    setItineraryLoading(true);
    try {
      const response = await fetch('/api/ai/generate-personalized-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageName: selectedBookingForItinerary.packageName,
          packageType: selectedBookingForItinerary.packageType,
          duration: selectedBookingForItinerary.preferredStartDate && selectedBookingForItinerary.preferredEndDate
            ? "Custom Scheduled Dates" 
            : "Planned Duration",
          startDate: selectedBookingForItinerary.preferredStartDate,
          endDate: selectedBookingForItinerary.preferredEndDate,
          passengers: selectedBookingForItinerary.passengers,
          pace: itineraryPreferences.pace,
          interest: itineraryPreferences.interest,
          dietary: itineraryPreferences.dietary,
          travelingWithKids: itineraryPreferences.travelingWithKids,
          travelingWithElderly: itineraryPreferences.travelingWithElderly,
          extraNotes: itineraryPreferences.extraNotes
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate personalized itinerary");
      }

      const data = await response.json();
      if (data.success && data.text) {
        setActiveItinerary(data.text);
        
        const docRef = doc(db, 'personalizedItineraries', selectedBookingForItinerary.id);
        await setDoc(docRef, {
          text: data.text,
          updatedAt: new Date().toISOString(),
          preferences: itineraryPreferences,
          bookingId: selectedBookingForItinerary.id,
          userId: auth.currentUser?.uid
        });
        
        toast.success("AI Itinerary successfully generated and saved durably!");
      } else {
        toast.error("Generation failed. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate itinerary");
    } finally {
      setItineraryLoading(false);
    }
  };

  const handlePrintItinerary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedBookingForItinerary?.packageName} - AI Itinerary</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            h1, h2, h3 { color: #f97316; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: bold; }
            h1 { font-size: 2em; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.2em; }
            p { margin-bottom: 1em; }
            ul, ol { margin-left: 20px; margin-bottom: 1em; list-style-type: disc; }
            li { margin-bottom: 0.5em; }
          </style>
        </head>
        <body>
          <h1>Personalized AI Travel Itinerary</h1>
          <p><strong>Package Name:</strong> ${selectedBookingForItinerary?.packageName}</p>
          <p><strong>Duration:</strong> ${selectedBookingForItinerary?.preferredStartDate ? `${selectedBookingForItinerary.preferredStartDate} to ${selectedBookingForItinerary.preferredEndDate}` : 'Scheduled Duration'}</p>
          <p><strong>Pace:</strong> ${itineraryPreferences.pace} | <strong>Interest:</strong> ${itineraryPreferences.interest}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <div>${activeItinerary.replace(/\n/g, '<br/>')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  useEffect(() => {
    async function load() {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
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

  // handlePayment removed

  const handleSaveProfile = async () => {
    if (!auth.currentUser || !profile) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, editForm);
      setProfile({ ...profile, ...editForm });
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
      toast.info('Verification email sent! Please check your inbox.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to send verification email. Please try again later.');
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const handleExportItineraryToSheets = async (booking: Booking) => {
    setExportingBookingId(booking.id);
    try {
      let pkgDetail: any = null;
      if (booking.packageId) {
        const pkgDoc = await getDoc(doc(db, 'packages', booking.packageId));
        if (pkgDoc.exists()) {
          pkgDetail = pkgDoc.data();
        }
      }

      const token = await authorizeGoogleSheets();
      const spreadsheetUrl = await exportPersonalItinerarySheet(
        token,
        booking,
        booking.passengers || [],
        pkgDetail
      );
      toast.success("Itinerary successfully exported to Google Sheets!", 0, {
        label: "Open Sheet ↗",
        onClick: () => {
          window.open(spreadsheetUrl, '_blank');
        },
        url: spreadsheetUrl
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to export itinerary. Please ensure authorization wasn't closed.");
    } finally {
      setExportingBookingId(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Only data part
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const uploadFileToBackend = async (file: File): Promise<string> => {
    const base64 = await fileToBase64(file);
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        base64,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server upload returned status ${response.status}`);
    }

    const json = await response.json();
    if (!json.success || !json.url) {
      throw new Error(json.error || "Failed to upload to server");
    }

    return json.url;
  };

  const handlePassportUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploadingPassport(true);
    try {
      let downloadURL = '';
      try {
        const storageRef = ref(storage, `clients/${auth.currentUser.uid}/documents/passport-${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, file);
        downloadURL = await getDownloadURL(snapshot.ref);
      } catch (storageError) {
        console.warn("Firebase Storage failed, trying server-side upload fallback:", storageError);
        downloadURL = await uploadFileToBackend(file);
      }
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { passportCopyUrl: downloadURL });
      
      setProfile(prev => prev ? { ...prev, passportCopyUrl: downloadURL } : null);
      toast.success('Passport uploaded successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload passport');
    } finally {
      setIsUploadingPassport(false);
    }
  };

  const handleIDCardUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploadingID(true);
    try {
      let downloadURL = '';
      try {
        const storageRef = ref(storage, `clients/${auth.currentUser.uid}/documents/idcard-${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, file);
        downloadURL = await getDownloadURL(snapshot.ref);
      } catch (storageError) {
        console.warn("Firebase Storage failed, trying server-side upload fallback:", storageError);
        downloadURL = await uploadFileToBackend(file);
      }
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { idCardUrl: downloadURL });
      
      setProfile(prev => prev ? { ...prev, idCardUrl: downloadURL } : null);
      toast.success('ID card uploaded successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload ID card');
    } finally {
      setIsUploadingID(false);
    }
  };

  const handleEducationDegreeUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploadingEducationDegree(true);
    try {
      let downloadURL = '';
      try {
        const storageRef = ref(storage, `clients/${auth.currentUser.uid}/documents/education_degree-${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, file);
        downloadURL = await getDownloadURL(snapshot.ref);
      } catch (storageError) {
        console.warn("Firebase Storage failed, trying server-side upload fallback:", storageError);
        downloadURL = await uploadFileToBackend(file);
      }
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { educationDegreeUrl: downloadURL });
      
      setProfile(prev => prev ? { ...prev, educationDegreeUrl: downloadURL } : null);
      toast.success('Education degree uploaded successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload education degree');
    } finally {
      setIsUploadingEducationDegree(false);
    }
  };

  const handleSubmitVisaRequest = async () => {
    if (!auth.currentUser || !profile?.passportCopyUrl) {
      toast.error('Please upload your passport scanned copy first');
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
      toast.success('Visa request submitted successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to submit visa request');
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
                  <div className="relative space-y-2">
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
                     {profile?.passportCopyUrl && (
                       <a 
                         href={profile.passportCopyUrl} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center space-x-2 text-[10px] text-orange-400 font-bold uppercase tracking-widest pl-4 hover:text-white transition-colors"
                       >
                         <Globe size={12} />
                         <span>View Passport Protocol</span>
                       </a>
                     )}
                     <input 
                       id="passport-upload" 
                       type="file" 
                       className="hidden" 
                       accept="image/*,.pdf" 
                       onChange={handlePassportUpload} 
                     />
                  </div>
                  <div className="relative space-y-2">
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
                     {profile?.idCardUrl && (
                       <a 
                         href={profile.idCardUrl} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center space-x-2 text-[10px] text-orange-400 font-bold uppercase tracking-widest pl-4 hover:text-white transition-colors"
                       >
                         <Globe size={12} />
                         <span>View Identification Node</span>
                       </a>
                     )}
                     <input 
                       id="id-upload" 
                       type="file" 
                       className="hidden" 
                       accept="image/*,.pdf" 
                       onChange={handleIDCardUpload} 
                     />
                  </div>
                  <div className="relative space-y-2">
                     <button 
                       disabled={isUploadingEducationDegree}
                       onClick={() => document.getElementById('education-upload')?.click()}
                       className="w-full flex justify-between items-center p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group disabled:opacity-50"
                     >
                        <div className="flex items-center space-x-3">
                           <FileText size={18} className="text-orange-400" />
                           <span className="text-sm font-medium">{profile?.educationDegreeUrl ? 'Update Education Degree' : 'Upload Education Degree'}</span>
                        </div>
                        {isUploadingEducationDegree ? (
                          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : profile?.educationDegreeUrl ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <Upload size={16} className="text-white/20 group-hover:text-white" />
                        )}
                     </button>
                     {profile?.educationDegreeUrl && (
                       <a 
                         href={profile.educationDegreeUrl} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center space-x-2 text-[10px] text-orange-400 font-bold uppercase tracking-widest pl-4 hover:text-white transition-colors"
                       >
                         <Globe size={12} />
                         <span>View Education Degree</span>
                       </a>
                     )}
                     <input 
                       id="education-upload" 
                       type="file" 
                       className="hidden" 
                       accept="image/*,.pdf" 
                       onChange={handleEducationDegreeUpload} 
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
                                    {booking.passengers.length} {booking.packageType === 'study-abroad' ? 'Students' : (booking.packageType === 'corporate' || booking.packageType === 'expo') ? 'Delegates' : 'Travelers'}
                                 </span>
                              </div>
                           </div>
                        </div>

                        <div className="text-left md:text-right flex flex-col items-start md:items-end">
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Fulfilled</p>
                           <p className="text-3xl font-black text-slate-900">{formatCurrency(booking.totalAmount)}</p>
                           <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
                              <button 
                                onClick={() => handleExportItineraryToSheets(booking)}
                                disabled={exportingBookingId === booking.id}
                                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-555 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-1.5 transition-all shadow-sm shrink-0 disabled:opacity-50 border border-emerald-100"
                              >
                                {exportingBookingId === booking.id ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Exporting...</span>
                                  </>
                                ) : (
                                  <>
                                    <FileText size={12} />
                                    <span>Export Itinerary ↗</span>
                                  </>
                                )}
                              </button>
                              <button 
                                onClick={() => handleOpenItineraryModule(booking)}
                                className="px-4 py-2.5 bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-1.5 transition-all shadow-sm border border-orange-100 self-end sm:self-auto"
                              >
                                 <Sparkles size={12} />
                                 <span>AI Itinerary</span>
                              </button>
                           </div>
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

      {/* AI Personalized Itinerary Modal */}
      <AnimatePresence>
        {itineraryModalOpen && selectedBookingForItinerary && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Agility AI Travel Intelligence</h3>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{selectedBookingForItinerary.packageName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setItineraryModalOpen(false)} 
                  className="p-3 bg-white hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors border border-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 overflow-y-auto flex-grow">
                {itineraryLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-8">
                      <div className="w-20 h-20 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-orange-500">
                        <Sparkles size={24} className="animate-pulse" />
                      </div>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Synthesizing Travel Matrix</h4>
                    <p className="text-slate-400 text-sm font-semibold max-w-md animate-pulse">
                      {loadingMessages[loadingStep]}
                    </p>
                  </div>
                ) : activeItinerary ? (
                  /* Rendered Itinerary Markdown View */
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full mb-2 inline-block">Active Parameters</span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-500 mt-1">
                          <span>Pace: {itineraryPreferences.pace}</span>
                          <span>•</span>
                          <span>Focus: {itineraryPreferences.interest}</span>
                          <span>•</span>
                          <span>Dietary: {itineraryPreferences.dietary}</span>
                          {(itineraryPreferences.travelingWithKids || itineraryPreferences.travelingWithElderly) && (
                            <>
                              <span>•</span>
                              <span>Accommodations: {[
                                itineraryPreferences.travelingWithKids ? "Kids" : null,
                                itineraryPreferences.travelingWithElderly ? "Seniors" : null
                              ].filter(Boolean).join(" & ")}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveItinerary('')}
                        className="px-5 py-2.5 bg-white text-slate-600 hover:text-orange-500 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-100 shadow-sm shrink-0 flex items-center space-x-1.5"
                      >
                        <Compass size={14} />
                        <span>Re-Configure</span>
                      </button>
                    </div>

                    <div className="prose prose-orange max-w-none text-slate-700 bg-white p-6 border border-slate-100 rounded-3xl max-h-[50vh] overflow-y-auto">
                      <Markdown>{activeItinerary}</Markdown>
                    </div>
                  </div>
                ) : (
                  /* Preferences Configuration Form */
                  <div className="space-y-8 max-w-2xl mx-auto py-4">
                    <div className="text-center max-w-md mx-auto mb-8">
                      <h4 className="text-2xl font-black text-slate-900 mb-2">Configure Your Journey</h4>
                      <p className="text-slate-400 text-sm font-medium">Fine-tune the daily timeline parameters. Gemini will formulate recommendations optimized for your party.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Pacing */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                          <Compass size={14} className="mr-1.5 text-orange-500" />
                          <span>Pace & Intensity</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Relaxed', 'Balanced', 'Intense'].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setItineraryPreferences({...itineraryPreferences, pace: p})}
                              className={cn(
                                "py-3 rounded-xl text-xs font-bold border transition-all",
                                itineraryPreferences.pace === p 
                                  ? "bg-slate-900 border-slate-900 text-white shadow-md"
                                  : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dietary preference */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                          <Utensils size={14} className="mr-1.5 text-orange-500" />
                          <span>Dietary Focus</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Halal Only', 'Vegetarian', 'Standard'].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setItineraryPreferences({...itineraryPreferences, dietary: d})}
                              className={cn(
                                "py-3 rounded-xl text-xs font-bold border transition-all",
                                itineraryPreferences.dietary === d
                                  ? "bg-slate-900 border-slate-900 text-white shadow-md"
                                  : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                              )}
                            >
                              {d.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Primary Interest */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                        <Heart size={14} className="mr-1.5 text-orange-500" />
                        <span>Daytime Exploration Focus</span>
                      </label>
                      <select
                        value={itineraryPreferences.interest}
                        onChange={e => setItineraryPreferences({...itineraryPreferences, interest: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none"
                      >
                        <option>Sightseeing & Landmarks</option>
                        <option>Spiritual & Pilgrimage Focus</option>
                        <option>Local Food & Culinary</option>
                        <option>Academic & Campus Prep</option>
                        <option>Corporate & Business Networking</option>
                        <option>Shopping & Leisure Focus</option>
                        <option>Adventure & Outdoor Activities</option>
                      </select>
                    </div>

                    {/* Mobility / Accommodations */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Demographic Safeguards</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className={cn(
                          "p-4 rounded-2xl border flex items-center space-x-3 cursor-pointer transition-all",
                          itineraryPreferences.travelingWithKids ? "bg-orange-50/50 border-orange-200" : "bg-white border-slate-100"
                        )}>
                          <input 
                            type="checkbox"
                            checked={itineraryPreferences.travelingWithKids}
                            onChange={e => setItineraryPreferences({...itineraryPreferences, travelingWithKids: e.target.checked})}
                            className="rounded text-orange-500 focus:ring-orange-500/20 w-4 h-4"
                          />
                          <div className="flex items-center space-x-2">
                            <Baby size={16} className="text-orange-500" />
                            <span className="text-xs font-bold text-slate-700">Traveling with children</span>
                          </div>
                        </label>

                        <label className={cn(
                          "p-4 rounded-2xl border flex items-center space-x-3 cursor-pointer transition-all",
                          itineraryPreferences.travelingWithElderly ? "bg-orange-50/50 border-orange-200" : "bg-white border-slate-100"
                        )}>
                          <input 
                            type="checkbox"
                            checked={itineraryPreferences.travelingWithElderly}
                            onChange={e => setItineraryPreferences({...itineraryPreferences, travelingWithElderly: e.target.checked})}
                            className="rounded text-orange-500 focus:ring-orange-500/20 w-4 h-4"
                          />
                          <div className="flex items-center space-x-2">
                            <Accessibility size={16} className="text-orange-500" />
                            <span className="text-xs font-bold text-slate-700">Traveling with seniors</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Special notes */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Special Requests / Preferences</label>
                      <textarea
                        value={itineraryPreferences.extraNotes}
                        onChange={e => setItineraryPreferences({...itineraryPreferences, extraNotes: e.target.value})}
                        placeholder="e.g., 'Celebrating a 10-year anniversary. I prefer walking tours, and would love to visit historically significant mosques at night.'"
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 h-28 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {activeItinerary ? "Save, print, or regenerate at any time." : "Backed by Gemini 3.5 Model Architecture."}
                </p>
                <div className="flex space-x-3 w-full sm:w-auto justify-end">
                  {activeItinerary && !itineraryLoading && (
                    <button
                      onClick={handlePrintItinerary}
                      className="px-6 py-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-2xl transition-all border border-slate-200 shadow-sm flex items-center space-x-2"
                    >
                      <Printer size={16} />
                      <span>Print/PDF</span>
                    </button>
                  )}
                  <button
                    disabled={itineraryLoading}
                    onClick={activeItinerary ? () => setItineraryModalOpen(false) : handleGeneratePersonalizedItinerary}
                    className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {itineraryLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : activeItinerary ? (
                      <span>Complete View</span>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Formulate Itinerary</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
