import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '@/src/lib/firebase';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { TravelPackage, Booking, Passenger } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, Users, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, CreditCard, ChevronRight, Landmark, ScanFace, Sparkles, Loader2, Upload } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { extractPassengerFromPassport } from '@/src/services/aiService';

export default function PackageDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<TravelPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [passengers, setPassengers] = useState<Passenger[]>([{ name: '', passportNumber: '', age: 0 }]);
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const docRef = doc(db, 'packages', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPkg({ id: docSnap.id, ...docSnap.data() } as TravelPackage);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const addPassenger = () => {
    setPassengers([...passengers, { name: '', passportNumber: '', age: 0 }]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter((_, i) => i !== index));
    }
  };

  const handlePassengerChange = (index: number, field: string, value: string | number) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const handleAIScan = async (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningIndex(index);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Only data part
        };
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const result = await extractPassengerFromPassport(base64, file.type);
      if (result) {
        handlePassengerChange(index, 'name', result.name);
        handlePassengerChange(index, 'passportNumber', result.passportNumber);
        handlePassengerChange(index, 'age', result.age);
      } else {
        alert("AI could not extract details. Please enter manually.");
      }
    } catch (err) {
      console.error(err);
      alert("Extraction failed.");
    } finally {
      setScanningIndex(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleBookingSubmit = async () => {
    if (!auth.currentUser || !pkg) {
      alert("Please sign in to book a package");
      navigate('/login');
      return;
    }

    setBookingLoading(true);
    try {
      let passportUrl = '';
      let idCardUrl = '';

      if (passportFile) {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('@/src/lib/firebase');
        const passRef = ref(storage, `bookings/passports/${auth.currentUser.uid}-${Date.now()}`);
        const snap = await uploadBytes(passRef, passportFile);
        passportUrl = await getDownloadURL(snap.ref);
      }

      if (idCardFile) {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('@/src/lib/firebase');
        const idRef = ref(storage, `bookings/id_cards/${auth.currentUser.uid}-${Date.now()}`);
        const snap = await uploadBytes(idRef, idCardFile);
        idCardUrl = await getDownloadURL(snap.ref);
      }

      const bookingData: Omit<Booking, 'id'> = {
        userId: auth.currentUser.uid,
        packageId: pkg.id,
        packageName: pkg.title,
        packageType: pkg.type,
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: paymentMethod,
        totalAmount: pkg.price * passengers.length,
        amountPaid: 0,
        bookingDate: new Date().toISOString(),
        passengers: passengers,
        passportUrl: passportUrl || undefined,
        idCardUrl: idCardUrl || undefined
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      setStep(4); // Success
    } catch (e) {
      console.error(e);
      alert("Booking failed. Please check your connection.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="pt-32 text-center">Loading package...</div>;
  if (!pkg) return <div className="pt-32 text-center text-red-500 font-bold">Package not found.</div>;

  const totalAmount = pkg.price * passengers.length;

  return (
    <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
      <Link to={`/packages/${pkg.type}`} className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-orange-500 mb-8 transition-colors">
        <ArrowLeft className="mr-2 w-4 h-4" />
        Back to Results
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Content */}
        <div className="lg:col-span-8">
           <div className="mb-8">
              <div className="flex items-center space-x-2 text-orange-500 mb-3">
                 <span className="text-[10px] uppercase font-bold tracking-[0.2em]">{pkg.type}</span>
                 <div className="w-1 h-1 bg-slate-200 rounded-full" />
                 <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">{pkg.category}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">{pkg.title}</h1>
              
              <div className="flex flex-wrap gap-8 items-center text-sm text-slate-500 font-semibold mb-8">
                <div className="flex items-center">
                  <MapPin size={18} className="mr-2 text-orange-500" />
                  Various Locations
                </div>
                <div className="flex items-center">
                  <Clock size={18} className="mr-2 text-orange-500" />
                  {pkg.duration}
                </div>
                <div className="flex items-center">
                  <Users size={18} className="mr-2 text-orange-500" />
                  Up to {pkg.inventoryCount} Slots
                </div>
              </div>
           </div>

           {/* Progress Bar (Visible during booking) */}
           {step < 4 && (
             <div className="flex items-center justify-between mb-12 max-w-md">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center flex-grow group">
                     <div className={cn(
                       "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-lg",
                       step >= i ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"
                     )}>
                        {step > i ? <CheckCircle2 size={18} /> : i}
                     </div>
                     {i < 3 && <div className={cn("h-1 flex-grow mx-2 rounded-full", step > i ? "bg-orange-500" : "bg-slate-100")} />}
                  </div>
                ))}
             </div>
           )}

           {/* Steps Content */}
           <AnimatePresence mode="wait">
             {step === 1 && (
               <motion.div
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 key="step1"
               >
                 <div className="rounded-3xl overflow-hidden mb-8 h-[400px]">
                    <img src={pkg.images[0] || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 </div>
                 <div className="prose prose-slate max-w-none">
                    <h3 className="text-2xl font-bold mb-4">About this package</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">{pkg.description}</p>
                    <h3 className="text-2xl font-bold mb-4">Itinerary</h3>
                    <ul className="space-y-4">
                       {pkg.itinerary.map((item, idx) => (
                         <li key={idx} className="flex items-start">
                            <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold mr-3 shrink-0 mt-1">
                               {idx + 1}
                            </div>
                            <span className="text-slate-700">{item}</span>
                         </li>
                       ))}
                    </ul>
                 </div>
               </motion.div>
             )}

             {step === 2 && (
               <motion.div
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 key="step2"
                 className="space-y-8"
               >
                  <h3 className="text-2xl font-bold">Passenger Details</h3>
                  <div className="flex items-center space-x-2 p-4 bg-orange-50 border border-orange-100 rounded-2xl mb-6">
                    <Sparkles className="text-orange-500 shrink-0" size={18} />
                    <p className="text-xs font-semibold text-orange-800">
                      Pro Tip: Save time by scanning your passport image. Our AI will extract your details automatically!
                    </p>
                  </div>
                  <div className="space-y-6">
                    {passengers.map((p, i) => (
                      <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                        <div className="absolute top-4 right-4 flex items-center space-x-4">
                           <button 
                             disabled={scanningIndex !== null}
                             onClick={() => {
                               setScanningIndex(i);
                               scanInputRef.current?.click();
                             }}
                             className="flex items-center space-x-2 text-[10px] font-black text-orange-500 px-3 py-1.5 bg-orange-50 rounded-lg hover:bg-orange-500 hover:text-white transition-all shadow-sm uppercase tracking-widest"
                           >
                             {scanningIndex === i ? (
                               <Loader2 size={12} className="animate-spin" />
                             ) : (
                               <ScanFace size={12} />
                             )}
                             <span>{scanningIndex === i ? 'Scanning...' : 'Scan Passport'}</span>
                           </button>
                           <div className="text-xs font-bold text-slate-300">#{i + 1}</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name (As on Passport)</label>
                            <input 
                              type="text" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.name}
                              onChange={(e) => handlePassengerChange(i, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Passport Number</label>
                            <input 
                              type="text" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.passportNumber}
                              onChange={(e) => handlePassengerChange(i, 'passportNumber', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Age</label>
                            <input 
                              type="number" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.age}
                              onChange={(e) => handlePassengerChange(i, 'age', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        {passengers.length > 1 && (
                          <button 
                            onClick={() => removePassenger(i)}
                            className="mt-4 text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-wider"
                          >
                            Remove Passenger
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={addPassenger}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-orange-500 hover:text-orange-500 transition-all"
                  >
                    + Add Another Passenger
                  </button>
                  <input 
                    ref={scanInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => scanningIndex !== null && handleAIScan(scanningIndex, e)} 
                  />

                  <div className="pt-10 border-t border-slate-100 space-y-8">
                     <h4 className="text-xl font-bold flex items-center">
                        <ShieldCheck className="mr-3 text-orange-500" />
                        Application Documents
                     </h4>
                     <p className="text-sm text-slate-500">Upload primary documents for this travel group. You can also add these later from your profile.</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passport Copy</label>
                           <div 
                             className={cn(
                               "relative w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer",
                               passportFile ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-orange-500 bg-slate-50"
                             )}
                             onClick={() => document.getElementById('pass-up')?.click()}
                           >
                              {passportFile ? (
                                <>
                                  <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                                  <p className="text-xs font-bold text-emerald-700">{passportFile.name}</p>
                                  <p className="text-[10px] text-emerald-500 mt-1 uppercase font-bold">Document Locked</p>
                                </>
                              ) : (
                                <>
                                  <Upload size={32} className="text-slate-300 mb-2" />
                                  <p className="text-xs font-bold text-slate-400">Click to upload Passport</p>
                                </>
                              )}
                              <input 
                                id="pass-up" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf" 
                                onChange={(e) => setPassportFile(e.target.files?.[0] || null)} 
                              />
                           </div>
                        </div>

                        <div className="space-y-3">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Card (Front/Back)</label>
                           <div 
                             className={cn(
                               "relative w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer",
                               idCardFile ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-orange-500 bg-slate-50"
                             )}
                             onClick={() => document.getElementById('id-up')?.click()}
                           >
                              {idCardFile ? (
                                <>
                                  <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                                  <p className="text-xs font-bold text-emerald-700">{idCardFile.name}</p>
                                  <p className="text-[10px] text-emerald-500 mt-1 uppercase font-bold">Document Locked</p>
                                </>
                              ) : (
                                <>
                                  <Upload size={32} className="text-slate-300 mb-2" />
                                  <p className="text-xs font-bold text-slate-400">Click to upload ID Card</p>
                                </>
                              )}
                              <input 
                                id="id-up" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf" 
                                onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} 
                              />
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
             )}

             {step === 3 && (
               <motion.div
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 key="step3"
                 className="space-y-8"
               >
                  <h3 className="text-2xl font-bold">Review & Payment</h3>
                  <div className="bg-slate-900 rounded-3xl p-8 text-white">
                      <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Booking Summary</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Package</span>
                          <span className="font-bold">{pkg.title}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Passengers</span>
                          <span className="font-bold">{passengers.length} Persons</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Base Price</span>
                          <span className="font-bold">{formatCurrency(pkg.price)}</span>
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xl">
                          <span className="font-bold">Total Amount</span>
                          <span className="font-bold text-orange-500">{formatCurrency(totalAmount)}</span>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest">Select Payment Method</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <button 
                        onClick={() => setPaymentMethod('bank')}
                        className={cn(
                         "p-6 rounded-2xl border-2 text-left transition-all",
                         paymentMethod === 'bank' ? "border-orange-500 bg-orange-50 text-orange-900" : "border-slate-100 hover:border-slate-200"
                        )}
                       >
                         <Landmark className="mb-2" />
                         <p className="font-bold">Bank Transfer</p>
                         <p className="text-xs opacity-60">Easypaisa, JazzCash, HBL</p>
                       </button>
                       <button 
                        onClick={() => setPaymentMethod('card')}
                        className={cn(
                         "p-6 rounded-2xl border-2 text-left transition-all",
                         paymentMethod === 'card' ? "border-orange-500 bg-orange-50 text-orange-900" : "border-slate-100 hover:border-slate-200"
                        )}
                       >
                         <CreditCard className="mb-2" />
                         <p className="font-bold">Credit/Debit Card</p>
                         <p className="text-xs opacity-60">Mastercard, VISA (Coming Soon)</p>
                       </button>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start space-x-4">
                    <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-900 mb-1">Local Payment Verification</p>
                      <p className="text-xs text-amber-700 font-medium">After submitting your booking, our team will share the specific bank details on WhatsApp for proof of transfer. Your booking status will remain 'Pending' until verified.</p>
                    </div>
                  </div>
               </motion.div>
             )}

             {step === 4 && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 key="step4"
                 className="text-center py-20 px-6 bg-emerald-50 rounded-[3rem] border border-emerald-100"
               >
                 <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20">
                    <CheckCircle2 className="text-white w-10 h-10" />
                 </div>
                 <h2 className="text-3xl font-bold text-slate-900 mb-4">Booking Successfully Submitted!</h2>
                 <p className="text-slate-600 mb-10 max-w-md mx-auto">
                   Thank you for choosing Agility Travels. Your booking ID is <strong>#{Math.random().toString(36).substr(2, 9).toUpperCase()}</strong>. One of our agents will contact you shortly on your provided number for payment verification.
                 </p>
                 <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link to="/profile" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
                      View My Bookings
                    </Link>
                    <Link to="/" className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-slate-50 transition-all">
                      Return Home
                    </Link>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Navigation Buttons */}
           {step < 4 && (
             <div className="mt-12 flex justify-between items-center">
                <button 
                  onClick={() => step > 1 && setStep(step - 1)}
                  disabled={step === 1}
                  className="px-6 py-3 font-bold text-slate-400 hover:text-orange-500 disabled:opacity-0 transition-all"
                >
                  Previous Step
                </button>
                {step < 3 ? (
                  <button 
                    onClick={() => setStep(step + 1)}
                    className="group bg-slate-900 text-white px-10 py-4 rounded-xl font-bold flex items-center space-x-2 hover:bg-orange-500 transition-all shadow-xl shadow-slate-900/10"
                  >
                    <span>Next: {step === 1 ? 'Guest Info' : 'Review'}</span>
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button 
                    onClick={handleBookingSubmit}
                    disabled={bookingLoading}
                    className="bg-orange-500 text-white px-12 py-4 rounded-xl font-bold flex items-center space-x-3 hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 disabled:bg-slate-300"
                  >
                    {bookingLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <span>Confirm & Submit Booking</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                )}
             </div>
           )}
        </div>

        {/* Right Column: Pricing & Quick Info */}
        <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit">
           <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 shadow-sm">
             <div className="mb-8">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Starting from</p>
               <div className="flex items-baseline space-x-2">
                 <span className="text-3xl font-extrabold text-slate-900 leading-none">Rs. {pkg.price.toLocaleString()}</span>
                 <span className="text-slate-400 text-xs font-medium">/ person</span>
               </div>
             </div>

             <div className="space-y-4 mb-10">
               <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100">
                 <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                    <Clock size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Duration</p>
                    <p className="text-sm font-bold text-slate-900">{pkg.duration}</p>
                 </div>
               </div>
               <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100">
                 <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <MapPin size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Category</p>
                    <p className="text-sm font-bold text-slate-900">{pkg.category}</p>
                 </div>
               </div>
             </div>

             <div className="space-y-4 pt-10 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                   <span>Booking Help?</span>
                </div>
                <div className="space-y-4">
                  <a href="tel:03205004446" className="flex items-center space-x-4 p-4 hover:bg-white rounded-2xl group transition-all">
                    <div className="w-10 h-10 bg-slate-100 group-hover:bg-orange-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-orange-600">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1">WhatsApp Support</p>
                      <p className="text-sm font-bold text-slate-900">0320 500 4446</p>
                    </div>
                  </a>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
