import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, Loader2, Bot, User, Globe } from 'lucide-react';
import { getVisaConsultation } from '@/src/services/aiService';
import { cn } from '@/src/lib/utils';
import Markdown from 'react-markdown';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { TravelPackage } from '@/src/types';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function VisaConsultant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'As-salam-alaikum! I am your Agility AI Assistant. How can I help you find the right Umrah, Study Abroad, or Expo package today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [packagesContext, setPackagesContext] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadPackages() {
      try {
        const q = query(collection(db, 'packages'));
        const snapshot = await getDocs(q);
        const pkgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TravelPackage[];
        
        const context = pkgs.map(p => 
          `Package: ${p.title} (Type: ${p.type}, Price: ${p.currency} ${p.price}, Duration: ${p.duration})\n` +
          `Description: ${p.description}\n` +
          `Link: /packages/${p.id}\n`
        ).join('\n---\n');
        
        setPackagesContext(context);
      } catch (err) {
        console.error("Failed to load packages for AI context", err);
      }
    }
    loadPackages();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await getVisaConsultation(userMessage, history, packagesContext);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: "Forgive me, my connection is stuttering. Could you repeat that?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 z-[100] p-5 bg-slate-900 text-white rounded-full shadow-2xl border-4 border-white group"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-1000"></div>
        <div className="relative">
          {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        </div>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8, x: 50 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 100, scale: 0.8, x: 50 }}
            className="fixed bottom-28 right-8 z-[100] w-[450px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-10rem)] bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 bg-slate-900 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10">
                 <Globe size={120} />
              </div>
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Sparkles size={16} className="text-orange-400" />
                    <h3 className="font-bold italic tracking-tighter text-lg">AGILITY AI ASSISTANT</h3>
                  </div>
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Powered by Advanced AI Intelligence</p>
                </div>
                <div className="flex items-center space-x-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   <span className="text-[8px] font-bold text-emerald-500">SYSTEM_ONLINE</span>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-grow overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/30"
            >
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "flex items-start space-x-3",
                  m.role === 'user' ? "flex-row-reverse space-x-reverse" : ""
                )}>
                  <div className={cn(
                    "p-2 rounded-xl shrink-0 mt-1 shadow-sm",
                    m.role === 'model' ? "bg-slate-900 text-white" : "bg-orange-500 text-white"
                  )}>
                    {m.role === 'model' ? <Bot size={16} /> : <User size={16} />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-2xl text-sm shadow-sm",
                    m.role === 'model' 
                      ? "bg-white border border-slate-100 text-slate-700 rounded-tl-none" 
                      : "bg-orange-50 text-orange-900 border border-orange-100 rounded-tr-none"
                  )}>
                    <div className="markdown-body">
                      <Markdown>{m.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl shrink-0 mt-1 bg-slate-900 text-white animate-pulse">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm rounded-tl-none flex items-center space-x-2">
                    <Loader2 size={16} className="animate-spin text-orange-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <div className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about our packages..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-6 pr-14 text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 p-3 bg-slate-900 text-white rounded-xl hover:bg-orange-500 transition-all disabled:opacity-50 disabled:hover:bg-slate-900"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center mt-4">
                Consultant advice is AI-generated • Verify critical info manually
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
