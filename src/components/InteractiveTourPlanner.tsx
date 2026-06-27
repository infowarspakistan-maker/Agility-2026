import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Users, Calendar, ArrowRight, Check, Sparkles, MessageSquare, AlertCircle, MapPin, Landmark, Briefcase, GraduationCap, FileText, Landmark as Mosque } from 'lucide-react';
import { db } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/src/components/layout/ToastContext';

const TRAVEL_SERVICES = [
  { id: 'umrah', title: 'Premium Umrah', desc: 'Pilgrimage with Holy Haram hotels', icon: Mosque, bg: 'hover:bg-emerald-50 hover:border-emerald-200 text-emerald-600 border-slate-100' },
  { id: 'haj', title: 'Haj 2026', desc: 'Official, guided, secure logistics', icon: Landmark, bg: 'hover:bg-amber-50 hover:border-amber-200 text-amber-600 border-slate-100' },
  { id: 'tours', title: 'Northern Pakistan', desc: 'Hunza, Skardu, family & corporate trips', icon: Compass, bg: 'hover:bg-sky-50 hover:border-sky-200 text-sky-600 border-slate-100' },
  { id: 'visa', title: 'Visa Consulting', desc: 'Saudi, Dubai, UK, USA, Europe visas', icon: FileText, bg: 'hover:bg-orange-50 hover:border-orange-200 text-orange-600 border-slate-100' },
  { id: 'expo', title: 'Corporate Expo', desc: 'Trade show arrangements & business VIP', icon: Briefcase, bg: 'hover:bg-purple-50 hover:border-purple-200 text-purple-600 border-slate-100' },
  { id: 'study', title: 'Study Abroad', desc: 'Admission & student visa guidance', icon: GraduationCap, bg: 'hover:bg-rose-50 hover:border-rose-200 text-rose-600 border-slate-100' },
];

const HOTEL_STANDARDS = [
  { id: '3star', title: '3-Star Economy', desc: 'Comfortable, budget-friendly lodging' },
  { id: '4star', title: '4-Star Executive', desc: 'Premium luxury, close proximity' },
  { id: '5star', title: '5-Star Signature', desc: 'Ultimate luxury immediately facing Holy Courtyards' },
];

export default function InteractiveTourPlanner() {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    service: 'umrah',
    travelers: 2,
    hotelStandard: '4star',
    targetMonth: 'October 2026',
    fullName: '',
    phone: '',
    email: '',
    additionalNotes: ''
  });

  const handleServiceSelect = (serviceId: string) => {
    setFormData({ ...formData, service: serviceId });
    setStep(2);
  };

  const handleNextStep = () => {
    if (step === 2) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      toast.error('Please provide your name and phone number.');
      return;
    }

    setLoading(true);
    try {
      // 1. Persist in Firestore
      await addDoc(collection(db, 'customInquiries'), {
        ...formData,
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      toast.success('Your custom travel plan has been submitted successfully!');
      setStep(4);
    } catch (err) {
      console.error('Error saving custom plan:', err);
      toast.error('Failed to submit plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Pre-formatted WhatsApp text for CRO conversion
  const getWhatsAppLink = () => {
    const serviceName = TRAVEL_SERVICES.find(s => s.id === formData.service)?.title || formData.service;
    const hotelDesc = HOTEL_STANDARDS.find(h => h.id === formData.hotelStandard)?.title || formData.hotelStandard;
    const text = `As-salam-alaikum Agility Travels! I would like to request a custom quote:
- *Service:* ${serviceName}
- *No. of Travelers:* ${formData.travelers} Persons
- *Standard:* ${hotelDesc}
- *Target Month:* ${formData.targetMonth}
- *My Name:* ${formData.fullName}
- *Contact:* ${formData.phone}
- *Additional notes:* ${formData.additionalNotes || 'None'}`;

    return `https://wa.me/923154256263?text=${encodeURIComponent(text)}`;
  };

  const serviceInfo = TRAVEL_SERVICES.find(s => s.id === formData.service);

  return (
    <div className="bg-slate-50 py-24 border-y border-slate-100" id="section-interactive-planner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title & SEO Description */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full font-bold text-xs mb-4">
            <Sparkles size={14} className="animate-pulse" />
            <span className="uppercase tracking-wider">Premium Customization Tool</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4">
            Plan Your Journey <span className="text-orange-500">Your Way</span>
          </h2>
          <p className="text-slate-500 font-medium">
            Answer a few quick questions to design your custom itinerary. We will calculate lodging details, optimal flight schedules, and coordinate directly with you.
          </p>
        </div>

        {/* Dynamic Stepper Card */}
        <div className="max-w-4xl mx-auto bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden min-h-[480px] flex flex-col md:flex-row">
          
          {/* Stepper Sidebar indicators */}
          <div className="md:w-1/3 bg-slate-900 p-8 text-white flex flex-col justify-between border-r border-slate-100">
            <div>
              <div className="flex items-center space-x-3 mb-8">
                <div className="p-2.5 bg-orange-500 rounded-2xl text-white">
                  <Compass size={22} className="animate-spin-slow" />
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-wide uppercase text-orange-400">Agility Customizer</h4>
                  <p className="text-[10px] text-slate-400">Personalized Travel Desk</p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="space-y-6">
                {[
                  { num: 1, label: 'Choose Service', desc: 'Select travel type' },
                  { num: 2, label: 'Preferences', desc: 'Travelers & standards' },
                  { num: 3, label: 'Inquiry Details', desc: 'Contact details' },
                  { num: 4, label: 'Complete', desc: 'Instant quote options' }
                ].map((s) => (
                  <div key={s.num} className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s.num 
                        ? 'bg-orange-500 text-white ring-4 ring-orange-500/20' 
                        : step > s.num 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {step > s.num ? <Check size={14} /> : s.num}
                    </div>
                    <div>
                      <p className={`text-xs font-bold tracking-wide ${step === s.num ? 'text-white' : 'text-slate-400'}`}>{s.label}</p>
                      <p className="text-[10px] text-slate-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              * Guaranteed response from certified booking managers within <span className="text-orange-400 font-bold">2 Hours</span>.
            </div>
          </div>

          {/* Stepper Content */}
          <div className="flex-grow p-8 md:p-12 flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-1">What service are you planning?</h3>
                    <p className="text-xs text-slate-400 font-medium">Select the primary service to begin designing your quote.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {TRAVEL_SERVICES.map((srv) => {
                      const Icon = srv.icon;
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => handleServiceSelect(srv.id)}
                          className={`flex items-start text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                            formData.service === srv.id 
                              ? 'bg-orange-50/50 border-orange-500 text-slate-900 shadow-md ring-1 ring-orange-500/10' 
                              : `bg-slate-50/50 border-slate-100 text-slate-700 ${srv.bg}`
                          }`}
                        >
                          <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 mr-4">
                            <Icon size={20} className={formData.service === srv.id ? 'text-orange-500' : ''} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-900">{srv.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{srv.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-1">Specify your parameters</h3>
                    <p className="text-xs text-slate-400 font-medium">Help us optimize the accommodations and group transport size.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Traveler Counter */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                        <Users size={12} className="mr-2 text-slate-400" />
                        Number of Travelers
                      </label>
                      <div className="flex items-center space-x-4 bg-slate-50 border border-slate-100 rounded-2xl p-2 w-max">
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, travelers: Math.max(1, formData.travelers - 1) })}
                          className="w-10 h-10 rounded-xl bg-white text-slate-700 font-bold border border-slate-200/60 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-none"
                        >
                          -
                        </button>
                        <span className="text-sm font-bold text-slate-800 px-4">{formData.travelers} Person{formData.travelers > 1 ? 's' : ''}</span>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, travelers: formData.travelers + 1 })}
                          className="w-10 h-10 rounded-xl bg-white text-slate-700 font-bold border border-slate-200/60 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-none"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Standard Rating */}
                    {['umrah', 'haj'].includes(formData.service) && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hotel & Accommodation Class</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {HOTEL_STANDARDS.map((h) => (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, hotelStandard: h.id })}
                              className={`p-3 text-left border rounded-xl transition-all cursor-pointer ${
                                formData.hotelStandard === h.id 
                                  ? 'bg-orange-50 border-orange-400 text-slate-900 font-semibold' 
                                  : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-500'
                              }`}
                            >
                              <h4 className="text-xs font-bold text-slate-800">{h.title}</h4>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">{h.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Target Date */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                        <Calendar size={12} className="mr-2" />
                        Preferred Month of Departure
                      </label>
                      <select 
                        value={formData.targetMonth}
                        onChange={(e) => setFormData({ ...formData, targetMonth: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 appearance-none"
                      >
                        <option value="August 2026">August 2026</option>
                        <option value="September 2026">September 2026</option>
                        <option value="October 2026">October 2026</option>
                        <option value="November 2026">November 2026</option>
                        <option value="December 2026 (Winter Holidays)">December 2026 (Winter Holidays)</option>
                        <option value="Haj Season (Early 2027)">Haj Season (Early 2027)</option>
                        <option value="Later / Custom">Later / Custom Date</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <button 
                      type="button"
                      onClick={handlePrevStep}
                      className="text-xs font-bold text-slate-400 hover:text-slate-950 uppercase"
                    >
                      Back
                    </button>
                    <button 
                      type="button"
                      onClick={handleNextStep}
                      className="bg-slate-900 hover:bg-slate-950 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center space-x-2 transition-all cursor-pointer"
                    >
                      <span>Next Step</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-1">Who should we prepare the quote for?</h3>
                    <p className="text-xs text-slate-400 font-medium">Please enter your verified details to secure proper priority queues.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Full Name *</label>
                        <input
                          required
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="John Doe"
                          className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Phone *</label>
                        <input
                          required
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="e.g. 0320 1234567"
                          className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Special Requirements (e.g., wheelchair, specific transit flights)</label>
                      <textarea
                        rows={2}
                        value={formData.additionalNotes}
                        onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                        placeholder="Let us know of any special needs, flight preferences, or hotel requests..."
                        className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-all resize-none"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <button 
                        type="button"
                        onClick={handlePrevStep}
                        className="text-xs font-bold text-slate-400 hover:text-slate-950 uppercase"
                      >
                        Back
                      </button>
                      <button 
                        type="submit"
                        disabled={loading}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-60"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Calculate & Request Quote</span>
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 text-center py-6"
                >
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-1">Quote Request Received!</h3>
                    <p className="text-xs text-slate-500 font-medium">Your customized plan was securely submitted to our ticketing and reservations team.</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left max-w-md mx-auto space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase">Travel Service:</span>
                      <span className="text-slate-800 font-black">{serviceInfo?.title}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase">No. of Travelers:</span>
                      <span className="text-slate-800 font-black">{formData.travelers} Person{formData.travelers > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase">Standard Requested:</span>
                      <span className="text-slate-800 font-black">
                        {HOTEL_STANDARDS.find(h => h.id === formData.hotelStandard)?.title || 'Standard'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase">Departure Month:</span>
                      <span className="text-slate-800 font-black">{formData.targetMonth}</span>
                    </div>
                  </div>

                  {/* WhatsApp redirection card to close deal immediately */}
                  <div className="space-y-4 max-w-md mx-auto pt-4">
                    <a
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-2xl flex items-center justify-center space-x-3 transition-all shadow-lg text-xs"
                    >
                      <MessageSquare size={18} />
                      <span>Connect with Agent on WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setFormData({
                          service: 'umrah',
                          travelers: 2,
                          hotelStandard: '4star',
                          targetMonth: 'October 2026',
                          fullName: '',
                          phone: '',
                          email: '',
                          additionalNotes: ''
                        });
                      }}
                      className="text-xs font-bold text-orange-500 hover:underline cursor-pointer"
                    >
                      Plan Another Journey
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
