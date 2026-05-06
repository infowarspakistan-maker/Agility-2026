import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, User, Headset, Loader2, Image as ImageIcon } from 'lucide-react';
import { auth, db } from '@/src/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { ChatMessage, ChatSession } from '@/src/types';

export default function SupportChat() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const user = auth.currentUser;

  useEffect(() => {
    if (!user || !isOpen) return;

    // Use a unique session ID for the user
    const sessionId = user.uid;
    
    // Create/Update session
    const syncSession = async () => {
      await setDoc(doc(db, 'chatSessions', sessionId), {
        userId: user.uid,
        userName: user.displayName || 'Traveler',
        userEmail: user.email || '',
        updatedAt: serverTimestamp(),
        unreadCount: 0 // In a real app, logic would be more complex
      }, { merge: true });
    };
    syncSession();

    const q = query(
      collection(db, 'chatSessions', sessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const text = input.trim();
    setInput('');
    
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
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 left-8 z-[100] p-5 bg-orange-500 text-white rounded-full shadow-2xl border-4 border-white group"
      >
        <div className="relative">
          {isOpen ? <X size={28} /> : <Headset size={28} />}
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8, x: -50 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 100, scale: 0.8, x: -50 }}
            className="fixed bottom-28 left-8 z-[100] w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-10rem)] bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 bg-orange-500 text-white shrink-0 relative overflow-hidden">
              <div className="relative flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                   <Headset size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Live Support</h3>
                  <div className="flex items-center space-x-2">
                     <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                     <span className="text-[10px] uppercase font-black tracking-widest opacity-80">Agents Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div 
              ref={scrollRef}
              className="flex-grow overflow-y-auto p-8 space-y-6 bg-slate-50/50 custom-scrollbar"
            >
              <div className="text-center py-4">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connected with Al-Malik Support</p>
              </div>

              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex flex-col",
                    msg.isAdmin ? "items-start" : "items-end"
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] p-4 rounded-2xl text-sm shadow-sm",
                    msg.isAdmin 
                      ? "bg-white text-slate-700 rounded-tl-none border border-slate-100" 
                      : "bg-slate-900 text-white rounded-tr-none"
                  )}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] font-bold text-slate-300 uppercase mt-1 px-1">
                    {msg.isAdmin ? 'Agent' : 'You'} • {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              
              {messages.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                   <MessageCircle size={40} className="mb-4 opacity-20" />
                   <p className="text-sm font-bold uppercase tracking-widest opacity-40">Start a conversation</p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 bg-white border-t border-slate-100">
              <div className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your message..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-6 pr-14 text-sm font-medium focus:outline-none focus:border-orange-500 transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="absolute right-2 top-2 p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
