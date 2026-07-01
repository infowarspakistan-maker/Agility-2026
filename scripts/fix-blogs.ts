import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const app = initializeApp({
  projectId: "ai-studio-a7287ddf-df91-418e-a540-00f7fdf27df1"
});

const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, 'blogs'));
  for (const document of snap.docs) {
    if (!document.data().type) {
      await updateDoc(doc(db, 'blogs', document.id), { type: 'blog' });
      console.log(`Updated ${document.id} to type: blog`);
    }
  }
}

run().catch(console.error);
