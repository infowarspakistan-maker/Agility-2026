import { Link, useLocation } from 'react-router-dom';
import { Plane, Ship, Map, ShieldCheck, User, Menu, X, Landmark, Briefcase, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/src/types';
import LanguageSwitcher from '@/src/components/LanguageSwitcher';

export default function Navbar() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docSnap = await getDoc(doc(db, 'users', u.uid));
        if (docSnap.exists()) {
          setRole(docSnap.data().role || 'user');
        } else if (u.email === 'almalikaewan@gmail.com') {
          setRole('admin');
        }
      } else {
        setRole(null);
      }
    });

    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => {
      unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navLinks = [
    { name: t('nav.home'), href: '/', icon: Landmark },
    { name: t('nav.packages'), href: '/packages', icon: Landmark },
    { name: t('nav.visas'), href: '/packages/visa', icon: ShieldCheck },
  ];

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-orange-500 p-2 rounded-lg">
              <Plane className="text-white w-6 h-6" />
            </div>
            <span className={cn(
              "text-2xl font-bold tracking-tight",
              isScrolled ? "text-slate-900" : "text-white drop-shadow-md"
            )}>
              Al-Malik <span className="text-orange-500">Travels</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-sm font-bold transition-colors hover:text-orange-500 uppercase tracking-widest",
                  isScrolled ? "text-slate-600" : "text-white/90 hover:text-white"
                )}
              >
                {link.name}
              </Link>
            ))}
            
            <div className="h-6 w-px bg-slate-200/20 mx-2" />
            
            <LanguageSwitcher light={!isScrolled} />

            {role === 'admin' && (
              <Link to="/admin" className={cn(
                "p-2 transition-colors",
                isScrolled ? "text-slate-400 hover:text-orange-500" : "text-white/60 hover:text-white"
              )}>
                <Settings size={20} />
              </Link>
            )}
            {user ? (
              <Link to="/profile" className={cn(
                "flex items-center space-x-2 px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/10",
                role === 'admin' ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-orange-500 text-white hover:bg-orange-600"
              )}>
                <User size={18} />
                <span className="text-xs font-black uppercase tracking-widest">{t('nav.admin')}</span>
              </Link>
            ) : (
              <Link to="/login" className={cn(
                "text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-xl",
                isScrolled ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white text-slate-900 hover:bg-orange-500 hover:text-white"
              )}>
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-4">
            <LanguageSwitcher light={!isScrolled} />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "p-2 rounded-md",
                isScrolled ? "text-slate-600" : "text-white"
              )}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="block px-3 py-4 text-base font-bold text-slate-700 hover:bg-slate-50 rounded-2xl flex items-center space-x-3 uppercase tracking-widest"
                  onClick={() => setIsOpen(false)}
                >
                  <link.icon size={20} className="text-orange-500" />
                  <span>{link.name}</span>
                </Link>
              ))}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                {role === 'admin' && (
                  <Link
                    to="/admin"
                    className="block w-full text-center px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                    onClick={() => setIsOpen(false)}
                  >
                    Control Center
                  </Link>
                )}
                {user ? (
                  <Link
                    to="/profile"
                    className="block w-full text-center px-6 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.admin')}
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="block w-full text-center px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.login')}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
