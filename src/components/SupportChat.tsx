import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, User, Headset, ArrowRight, HelpCircle, AlertCircle } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { ChatMessage } from '@/src/types';

// Solid local FAQ data for unauthenticated or quick-access users
const SUPPORT_FAQS = [
  {
    q: "🕋 What hotels are included in Umrah packages?",
    a: "Our standard Umrah packages include premium 4-Star or 5-Star hotels (like Pullman Zamzam, Swissôtel Makkah, or similar) situated within the immediate courtyard of the Holy Harams (3 to 5 minutes walk), ensuring quick and easy access for older family members.",
    category: "Umrah"
  },
  {
    q: "✈️ Is the flight ticket included in the price?",
    a: "Yes! All group Umrah and Haj packages include return economy class flights from major cities in Pakistan (Lahore, Karachi, Islamabad). Custom individual packages can be configured with or without flights based on your needs.",
    category: "Haj/Umrah"
  },
  {
    q: "📋 What are the visa passport requirements?",
    a: "Your passport must have a minimum of 6 months validity from your travel date with at least two blank facing pages. For Umrah/Haj, we also require a scanned copy of your CNIC/NICOP, passport-sized white background photographs, and vaccine certificates.",
    category: "Visa"
  },
  {
    q: "💼 Can we get customized private corporate tours?",
    a: "Absolutely. We specialize in tailoring corporate and family tours. You can specify hotel stars, private luxury land transfers (GMC/Coasters), customized Ziarat itineraries, and flight dates.",
    category: "Corporate"
  }
];

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [guestMessages, setGuestMessages] = useState<{ id: string; text: string; sender: 'user' | 'bot'; timestamp: Date }[]>([
    {
      id: 'welcome',
      text: "As-salam-alaikum! Welcome to Agility Travels Support. Ask a question below, check our quick FAQs, or sign in to open a live chat session with our team.",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const [user, setUser] = useState(auth.currentUser);

  // Keep track of auth changes
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Sync real-time messages for signed-in users
  useEffect(() => {
    if (!user || !isOpen) return;

    const sessionId = user.uid;
    
    // Create or update chat session
    const syncSession = async () => {
      try {
        await setDoc(doc(db, 'chatSessions', sessionId), {
          userId: user.uid,
          userName: user.displayName || 'Traveler',
          userEmail: user.email || '',
          updatedAt: serverTimestamp(),
          unreadCount: 0
        }, { merge: true });
      } catch (err) {
        console.error("Failed to sync session with firestore", err);
      }
    };
    syncSession();

    const q = query(
      collection(db, 'chatSessions', sessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Guard timestamp for serialization
          timestamp: data.timestamp
        };
      }) as ChatMessage[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chatSessions/${sessionId}/messages`);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, guestMessages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    if (!textToSend) setInput('');

    if (user) {
      // User is signed in: send to Firestore
      try {
        const sessionId = user.uid;
        await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
          text,
          senderId: user.uid,
          senderName: user.displayName || 'Traveler',
          timestamp: serverTimestamp(),
          isAdmin: false
        });

        await updateDoc(doc(db, 'chatSessions', sessionId), {
          lastMessage: text,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Failed to send message to support", e);
      }
    } else {
      // User is guest: simulate local AI support answers
      const newMsgId = Math.random().toString(36).substr(2, 9);
      setGuestMessages(prev => [
        ...prev,
        { id: newMsgId, text, sender: 'user', timestamp: new Date() }
      ]);
      setLoading(true);

      setTimeout(() => {
        // Try to match standard package query keywords
        let answer = "Thank you for your question! To speak with a live travel agent and get custom quotes, please sign in. Alternatively, click on our quick FAQs above for immediate help.";
        const lowercaseText = text.toLowerCase();
        
        if (lowercaseText.includes('umrah') || lowercaseText.includes('makkah') || lowercaseText.includes('hotel')) {
          answer = "Our premium Umrah packages include 4-Star or 5-Star accommodations located close to the Holy Courtyards (Pullman Zamzam, Movenpick, Swissôtel). All transfers are conducted in private air-conditioned vehicles with guided spiritual tours.";
        } else if (lowercaseText.includes('price') || lowercaseText.includes('cost') || lowercaseText.includes('flight') || lowercaseText.includes('ticket')) {
          answer = "Return airfares from Pakistan (Lahore, Islamabad, Karachi) are included in all group packages. For individual travel, we can tailor custom packages without flights if you prefer booking your own air tickets.";
        } else if (lowercaseText.includes('visa') || lowercaseText.includes('passport') || lowercaseText.includes('requirement')) {
          answer = "For Umrah and Haj travel, passports must be valid for at least 6 months. High-resolution scans of passport bio-pages, CNIC, vaccine certificate, and white background passport photographs are needed to process visas.";
        } else if (lowercaseText.includes('private') || lowercaseText.includes('custom') || lowercaseText.includes('corporate')) {
          answer = "Yes, we customize VIP, private family, and corporate exhibition groups. We can arrange private VIP transport, luxury hotels, specific tour guides, and fast-track visa processing.";
        }

        setGuestMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            text: answer,
            sender: 'bot',
            timestamp: new Date()
          }
        ]);
        setLoading(false);
      }, 700);
    }
  };

  const handleFAQClick = (faq: typeof SUPPORT_FAQS[0]) => {
    handleSend(faq.q);
    if (!user) {
      setLoading(true);
      setTimeout(() => {
        setGuestMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            text: faq.a,
            sender: 'bot',
            timestamp: new Date()
          }
        ]);
        setLoading(false);
      }, 500);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        id="btn-support-chat"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 left-8 z-[100] p-5 bg-orange-500 text-white rounded-full shadow-2xl border-4 border-white group transition-all"
        aria-label="Open support chat"
      >
        <div className="relative">
          {isOpen ? <X size={28} /> : <Headset size={28} />}
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>
      </motion.button>

      {/* Chat Window Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="window-support-chat"
            initial={{ opacity: 0, y: 100, scale: 0.8, x: -50 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 100, scale: 0.8, x: -50 }}
            className="fixed bottom-28 left-8 z-[100] w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-10rem)] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-orange-500 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                     <Headset size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">Agility Support Desk</h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                       <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                       <span className="text-[10px] uppercase font-bold tracking-widest text-orange-100">Verified Agents Online</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Informational Box for Guests */}
            {!user && (
              <div className="bg-orange-50 px-6 py-3 border-b border-orange-100/50 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <AlertCircle size={14} className="text-orange-500 shrink-0" />
                  <p className="text-[11px] text-orange-800 font-medium">Log in to unlock official agent live chat.</p>
                </div>
                <Link 
                  to="/login" 
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-white border border-orange-200 px-2.5 py-1 rounded-lg shadow-sm transition-colors"
                >
                  Login
                </Link>
              </div>
            )}

            {/* Chat Body & Messages */}
            <div 
              ref={scrollRef}
              className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar"
            >
              {/* Pre-defined FAQs Header */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-slate-400">
                  <HelpCircle size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Quick Package Inquiry FAQs</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {SUPPORT_FAQS.map((faq, i) => (
                    <button
                      key={i}
                      onClick={() => handleFAQClick(faq)}
                      className="text-left text-[11px] font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/50 p-2 rounded-lg transition-colors border border-dashed border-slate-100 hover:border-orange-200/50 cursor-pointer"
                    >
                      {faq.q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Display */}
              {user ? (
                // Authenticated Flow (Firestore sync)
                messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex flex-col",
                      msg.isAdmin ? "items-start" : "items-end"
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm",
                      msg.isAdmin 
                        ? "bg-white text-slate-700 rounded-tl-none border border-slate-100" 
                        : "bg-slate-900 text-white rounded-tr-none"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 px-1">
                      {msg.isAdmin ? 'Agent' : 'You'} • {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                    </span>
                  </div>
                ))
              ) : (
                // Guest Flow (Local simulated answers)
                guestMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex flex-col",
                      msg.sender === 'bot' ? "items-start" : "items-end"
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm",
                      msg.sender === 'bot'
                        ? "bg-white text-slate-700 rounded-tl-none border border-slate-100" 
                        : "bg-slate-900 text-white rounded-tr-none"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 px-1">
                      {msg.sender === 'bot' ? 'Support Desk Assistant' : 'You'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}

              {/* Thinking loader */}
              {loading && (
                <div className="flex items-start space-x-2">
                  <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl shadow-sm rounded-tl-none flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Typing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={user ? "Type your message to our agents..." : "Ask our virtual travel desk..."}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-5 pr-12 text-xs font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="absolute right-1.5 top-1.5 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-40 disabled:hover:bg-orange-500 cursor-pointer"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
