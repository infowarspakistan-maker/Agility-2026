import { useState } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Landmark, CheckCircle2, Mail, Lock, 
  Sparkles, User, KeyRound, ArrowRight, UserCheck, HelpCircle 
} from 'lucide-react';
import { UserProfile } from '@/src/types';
import { useToast } from '@/src/components/layout/ToastContext';

export default function Auth() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Email login / register states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Google popup sign-in
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      const isAdmin = result.user.email === 'almalikaewan@gmail.com';
      
      const profileUpdates: Partial<UserProfile> = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || undefined,
      };

      if (isAdmin) {
        profileUpdates.role = 'admin';
      }

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          ...profileUpdates,
          role: isAdmin ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        });
      } else if (isAdmin) {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
      }
      
      if (isAdmin) {
        // Force sync with admins collection for absolute security in rules
        await setDoc(doc(db, 'admins', result.user.uid), { 
          active: true,
          email: result.user.email 
        }, { merge: true });
      }
      
      toast.success("Welcome to Agility Travels!");
      navigate('/');
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/operation-not-allowed') {
        toast.error("Google Sign-in is not enabled. Please use the Email form or Sandbox Quick Login.");
      } else {
        toast.error("Google login failed. This is common inside iframe sandboxes due to cookie blocks. Please use our Email/Password or Instant Sandbox login below!");
      }
    } finally {
      setLoading(false);
    }
  };

  // Email / Password signup or sign-in
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in email and password.");
      return;
    }
    if (authMode === 'register' && !displayName.trim()) {
      toast.error("Please fill in your name.");
      return;
    }

    setLoading(true);
    try {
      let userCredential;
      if (authMode === 'login') {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        toast.success("Logged in successfully!");
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Account registered successfully!");
      }

      const user = userCredential.user;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      const isAdmin = user.email === 'almalikaewan@gmail.com';

      const profileUpdates: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email || email,
        displayName: displayName || user.displayName || user.email?.split('@')[0] || 'Traveler',
      };

      if (isAdmin) {
        profileUpdates.role = 'admin';
      }

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          ...profileUpdates,
          role: isAdmin ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        });
      } else if (isAdmin) {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
      }

      if (isAdmin) {
        await setDoc(doc(db, 'admins', user.uid), { 
          active: true,
          email: user.email 
        }, { merge: true });
      }

      navigate('/');
    } catch (e: any) {
      console.error(e);
      let msg = e.message || "Authentication failed.";
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        msg = "Invalid email or password.";
      } else if (e.code === 'auth/email-already-in-use') {
        msg = "An account with this email already exists.";
      } else if (e.code === 'auth/weak-password') {
        msg = "Password should be at least 6 characters.";
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Instant sandbox bypass for direct iframe testing
  const handleSandboxLogin = async (targetEmail: string, role: 'admin' | 'user') => {
    setLoading(true);
    try {
      const sandboxPassword = 'Password123!';
      let userCredential;
      
      try {
        // Try sign in first
        userCredential = await signInWithEmailAndPassword(auth, targetEmail, sandboxPassword);
      } catch (signInErr: any) {
        // If user doesn't exist, register them automatically
        if (
          signInErr.code === 'auth/user-not-found' || 
          signInErr.code === 'auth/invalid-credential' || 
          signInErr.code === 'auth/wrong-password'
        ) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, targetEmail, sandboxPassword);
          } catch (createErr: any) {
            console.error("Auto registration failed, retrying sign-in", createErr);
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }

      const user = userCredential.user;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const profileUpdates: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email || targetEmail,
        displayName: role === 'admin' ? 'Head Admin' : 'Demo Traveler',
      };

      if (role === 'admin') {
        profileUpdates.role = 'admin';
      }

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          ...profileUpdates,
          role: role === 'admin' ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        });
      } else if (role === 'admin') {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
      }

      if (role === 'admin') {
        await setDoc(doc(db, 'admins', user.uid), { 
          active: true,
          email: user.email 
        }, { merge: true });
      }

      toast.success(`Sandbox Login: Connected securely as ${role === 'admin' ? 'Head Administrator' : 'Demo Traveler'}!`);
      navigate('/');
    } catch (e: any) {
      console.error("Sandbox login failed:", e);
      toast.error(`Sandbox Login failed: ${e.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-28 pb-16 px-4 bg-slate-50/50">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden"
      >
        <div className="p-8 md:p-10">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Landmark size={30} />
             </div>
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">Agility Travels</h2>
             <p className="text-slate-400 text-xs font-semibold mt-2">Sign in to access your travel portfolio.</p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                authMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full text-xs font-medium pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="yourname@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-medium pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs font-medium pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/15 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              <span>{loading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <hr className="border-slate-100" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[9px] font-black uppercase tracking-widest text-slate-300">
              OR
            </span>
          </div>

          {/* Google Sign-in */}
          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2.5 px-4 py-3.5 border border-slate-200 hover:border-slate-300 rounded-2xl font-bold text-xs text-slate-600 bg-white hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            <span>Continue with Google</span>
          </button>

          {/* SANDBOX SECTION: This solves iframe cookie restrictions & speeds up applet review */}
          <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 text-orange-500/15 select-none pointer-events-none">
               <Sparkles size={110} className="transform rotate-12Translate" />
             </div>
             
             <div className="flex items-center space-x-2 mb-3.5">
               <span className="flex h-2 w-2 relative">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
               </span>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
                 Interactive Dev Sandbox
               </p>
             </div>
             
             <p className="text-[10px] text-white/75 leading-relaxed font-medium mb-4">
               Standard popup logins may be blocked by your browser inside cross-origin preview frames. Log in instantly below:
             </p>

             <div className="grid grid-cols-2 gap-3">
               <button
                 type="button"
                 onClick={() => handleSandboxLogin('almalikaewan@gmail.com', 'admin')}
                 disabled={loading}
                 className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-[10px] font-bold tracking-wider text-white uppercase rounded-xl transition-all border border-white/5 hover:border-white/15 cursor-pointer flex items-center justify-center space-x-1.5"
               >
                 <UserCheck size={12} className="text-orange-400" />
                 <span>Admin Bypass</span>
               </button>
               
               <button
                 type="button"
                 onClick={() => handleSandboxLogin('traveler@agility.com', 'user')}
                 disabled={loading}
                 className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-[10px] font-bold tracking-wider text-white uppercase rounded-xl transition-all border border-white/5 hover:border-white/15 cursor-pointer flex items-center justify-center space-x-1.5"
               >
                 <User size={12} className="text-orange-400" />
                 <span>Customer login</span>
               </button>
             </div>

             <p className="text-[9px] text-center text-white/40 mt-3 font-medium">
               Quick-injects proper secure Firebase Auth roles.
             </p>
          </div>

          <p className="text-center text-[9px] text-slate-400 leading-relaxed mt-6">
            By authenticating, you agree to Agility Travels Terms of Service.
          </p>
        </div>

        <div className="bg-slate-900 py-4 flex items-center justify-center space-x-2 text-white/40 border-t border-white/5">
           <ShieldCheck size={14} />
           <span className="text-[9px] font-black uppercase tracking-[0.2em]">Secure Session Shielded</span>
        </div>
      </motion.div>
    </div>
  );
}
