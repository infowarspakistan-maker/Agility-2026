import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { BlogPost } from '@/src/types';

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'blogs'), where('type', '==', 'blog'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BlogPost[]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black mb-12">Blogs</h1>
        
        {loading ? (
            <p>Loading...</p>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold uppercase tracking-widest">{post.category}</span>
                    <span className="text-slate-400 text-xs font-medium flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-3">{post.title}</h2>
                  <p className="text-slate-500 mb-6 text-sm">{post.excerpt}</p>
                  <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-2"><Calendar size={12} /> {post.date}</span>
                    <Link to={`/blog/${post.id}`} className="text-orange-500 hover:text-orange-600 flex items-center gap-1">
                      Read More <ArrowRight size={14} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}
