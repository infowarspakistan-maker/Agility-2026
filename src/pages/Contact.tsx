import { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Send, Clock, MessageCircle } from 'lucide-react';
import { useToast } from '@/src/components/layout/ToastContext';

export default function Contact() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast.success("Message Sent Successfully! We will get back to you shortly.");
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 1500);
  };

  const contactMethods = [
    {
      icon: Phone,
      title: "Call Us",
      details: ["0320 500 4446"],
      description: "Mon-Sat from 9am to 6pm.",
      color: "bg-emerald-500",
      bgLight: "bg-emerald-50"
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Us",
      details: ["0315 425 6263"],
      description: "Available for quick queries.",
      color: "bg-green-500",
      bgLight: "bg-green-50"
    },
    {
      icon: Mail,
      title: "Email Us",
      details: ["contact@agilitytravels.pk"],
      description: "We'll respond within 24 hours.",
      color: "bg-orange-500",
      bgLight: "bg-orange-50"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      details: ["Johar Town", "Lahore, Pakistan"],
      description: "Visit our main office.",
      color: "bg-blue-500",
      bgLight: "bg-blue-50"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full font-bold text-sm mb-6"
          >
            <Clock size={16} />
            <span>24/7 Dedicated Support</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6"
          >
            Get in <span className="text-orange-500">Touch</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-500 font-medium"
          >
            Whether you're planning a sacred pilgrimage, seeking study abroad opportunities, or booking a corporate EXPO package, our travel consultants are here to help.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Methods Cards */}
          <div className="lg:col-span-1 space-y-6">
            {contactMethods.map((method, index) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100"
              >
                <div className="flex items-start space-x-5">
                  <div className={`p-4 rounded-2xl ${method.bgLight} shrink-0`}>
                    <method.icon size={24} className={method.color.replace('bg-', 'text-')} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{method.title}</h3>
                    <p className="text-sm text-slate-500 mb-3">{method.description}</p>
                    <div className="space-y-1">
                      {method.details.map((detail, idx) => (
                        <p key={idx} className="font-semibold text-slate-700">{detail}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 mb-2">Send us a Message</h2>
              <p className="text-slate-500 font-medium">Fill out the form below and our team will get back to you promptly.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+92 3XX XXXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-semibold text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all appearance-none"
                  >
                    <option value="" disabled>Select Inquiry Type</option>
                    <option value="umrah">Umrah & Haj Packages</option>
                    <option value="study">Study Abroad Assistance</option>
                    <option value="expo">EXPO & Corporate Bookings</option>
                    <option value="visa">Visa Services</option>
                    <option value="other">Other Inquiry</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Message</label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="How can we help you?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-2xl flex items-center justify-center space-x-2 transition-all disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Message</span>
                    <Send size={18} />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
