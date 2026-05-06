import { useState } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, Landmark, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '@/src/types';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      
      navigate('/');
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/operation-not-allowed') {
        alert("Google Sign-in is not enabled in Firebase Console. Please enable it in the Authentication > Sign-in method tab.");
      } else {
        alert("Login failed. Please try again with your Google account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-10 px-4 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 overflow-hidden"
      >
        <div className="p-10">
          <div className="text-center mb-10">
             <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Landmark size={32} />
             </div>
             <h2 className="text-3xl font-bold text-slate-900">Agility Travels</h2>
             <p className="text-slate-400 text-sm font-medium mt-2">Sign in to access your dashboard.</p>
          </div>

          <div className="space-y-6">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 px-6 py-5 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-orange-200 transition-all active:scale-95 shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
            </button>

            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
               <div className="flex items-start space-x-3">
                 <CheckCircle2 size={18} className="text-emerald-500 mt-0.5" />
                 <div>
                   <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1">Admin Access</p>
                   <p className="text-xs text-emerald-600 leading-relaxed font-medium">
                     Google Login for <span className="font-bold text-emerald-800 underline">almalikaewan@gmail.com</span> will automatically grant full Administrative privileges.
                   </p>
                 </div>
               </div>
            </div>

            <p className="text-center text-[10px] text-slate-400 leading-relaxed px-4">
              By continuing, you agree to Agility Travels Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

        <div className="bg-slate-900 p-8 flex items-center justify-center space-x-3 text-white/40">
           <ShieldCheck size={18} />
           <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Secure Authentication</span>
        </div>
      </motion.div>
    </div>
  );
}

