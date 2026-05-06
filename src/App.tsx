import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '@/src/types';

import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import VisaConsultant from '@/src/components/VisaConsultant';
import Home from '@/src/pages/Home';
import Packages from '@/src/pages/Packages';
import PackageDetails from '@/src/pages/PackageDetails';
import Auth from '@/src/pages/Auth';
import Profile from '@/src/pages/Profile';
import Admin from '@/src/pages/Admin';
import FAQ from '@/src/pages/FAQ';

const Placeholder = ({ name }: { name: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-4 text-center">
    <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-[2rem] flex items-center justify-center mb-8">
       <span className="text-4xl">🚀</span>
    </div>
    <h1 className="text-5xl font-bold mb-4">{name}</h1>
    <p className="text-slate-500 max-w-md mx-auto text-lg">We are finalizing this module to ensure a premium experience. Stay tuned!</p>
    <button onClick={() => window.history.back()} className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold">Go Back</button>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const profileData = docSnap.data() as UserProfile;
          if (u.email === 'almalikaewan@gmail.com' && profileData.role !== 'admin') {
            profileData.role = 'admin';
            // Also update Firestore to keep it in sync
            setDoc(docRef, { role: 'admin' }, { merge: true }).catch(console.error);
          }
          setProfile(profileData);
        } else if (u.email === 'almalikaewan@gmail.com') {
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || 'Head Admin',
            role: 'admin',
            createdAt: new Date().toISOString()
          };
          setProfile(newProfile);
          // And create it in Firestore
          setDoc(docRef, newProfile).catch(console.error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-[3px] border-slate-100 border-t-orange-500 shadow-xl"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-orange-100 selection:text-orange-900">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/packages/:type" element={<Packages />} />
            <Route path="/package/:id" element={<PackageDetails />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/admin" element={profile?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/about" element={<Placeholder name="Our Story" />} />
            <Route path="/contact" element={<Placeholder name="Support Center" />} />
            <Route path="/placeholder/:name" element={<Placeholder name="System Update" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <div className="mt-auto">
          <Footer />
        </div>
        <VisaConsultant />
      </div>
    </Router>
  );
}
