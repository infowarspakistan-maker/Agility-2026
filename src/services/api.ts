import { collection, addDoc, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { TravelPackage, Booking, UserProfile, VisaRequest } from '@/src/types';

export const packageService = {
  async getAll() {
    const q = query(collection(db, 'packages'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TravelPackage[];
  },
  
  async getByType(type: string) {
    const q = query(collection(db, 'packages'), where('type', '==', type));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TravelPackage[];
  },

  async getFeatured() {
    const q = query(collection(db, 'packages'), where('featured', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TravelPackage[];
  }
};

export const bookingService = {
  async create(booking: Omit<Booking, 'id'>) {
    return await addDoc(collection(db, 'bookings'), {
      ...booking,
      bookingDate: new Date().toISOString()
    });
  },

  async getUserBookings(userId: string) {
    const q = query(collection(db, 'bookings'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
  },

  async getAllAdmin() {
    const snapshot = await getDocs(collection(db, 'bookings'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
  }
};

export const userService = {
  async getProfile(uid: string) {
    const docSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
    if (!docSnap.empty) {
      return docSnap.docs[0].data() as UserProfile;
    }
    return null;
  }
};

// Seed script to populate some initial data
export const seedDatabase = async () => {
  const packages = [
    {
      title: 'Economy Umrah Package',
      description: 'An affordable spiritual journey for individuals and families. Includes standard hotel accommodations and visa processing.',
      type: 'umrah',
      price: 155000,
      currency: 'PKR',
      category: 'Economy',
      duration: '14 Days',
      itinerary: ['7 Days Makkah (Standard Hotel)', '7 Days Madinah (Standard Hotel)', 'Visa Processing', 'Ziarats included'],
      images: ['https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 50,
      featured: true,
      isTrending: true
    },
    {
      title: 'Premium Umrah 5-Star',
      description: 'Experience ultimate comfort during your pilgrimage with 5-star hotels located in the courtyards of the Haram.',
      type: 'umrah',
      price: 320000,
      currency: 'PKR',
      category: 'Luxury',
      duration: '10 Days',
      itinerary: ['5 Days Makkah (Clock Tower Hotel)', '5 Days Madinah (Dar Al Iman)', 'VIP Transport', 'Tailored Ziarats'],
      images: ['https://images.unsplash.com/photo-1565552645632-d715f886735f?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 15,
      featured: true
    },
    {
      title: 'Haj 2026 Executive Registry',
      description: 'Exclusive reservation for the upcoming Haj. Comprehensive management including Shifting/Non-Shifting options.',
      type: 'haj',
      price: 1250000,
      currency: 'PKR',
      category: 'Platinum',
      duration: '40 Days',
      itinerary: ['Pre-Haj stay in Azizia', 'Haj Days in Category A Tents (Mina)', 'Post-Haj stay in 5-Star Hotel Madinah'],
      images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef21?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 5,
      featured: true
    },
    {
      title: 'Skardu & Deosai Plains Expedition',
      description: 'A breathtaking journey to the land of giants. Explore the highest plateaus and scenic Shangrila Resort.',
      type: 'domestic-group',
      price: 75000,
      currency: 'PKR',
      category: 'Adventure',
      duration: '7 Days',
      itinerary: ['Day 1: Flight to Skardu', 'Day 2: Shangrila & Upper Kachura', 'Day 3-4: Deosai Plains Camping', 'Day 5: Shigar Valley', 'Day 6: Mantokha Waterfalls', 'Day 7: Return'],
      images: ['https://images.unsplash.com/photo-1624522851253-ab05608823f6?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 12,
      featured: true,
      isTrending: true
    },
    {
      title: 'Private Hunza Valley Retreat',
      description: 'Customizable private tour for couples or families looking for serenity and local culture in Hunza.',
      type: 'domestic-private',
      price: 185000,
      currency: 'PKR',
      category: 'Bespoke',
      duration: '6 Days',
      itinerary: ['Day 1: Private transport to Chilas', 'Day 2: Arrival at Hunza Serena', 'Day 3: Baltit/Altit Forts', 'Day 4: Attabad Lake & Passu Cones', 'Day 5: Khunjerab Pass (China Border)', 'Day 6: Return Flight from Gilgit'],
      images: ['https://images.unsplash.com/photo-1581442111558-86d4e08c8e1e?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 5,
      featured: false
    },
    {
      title: 'Saudi Tourist Visa (Fast Track)',
      description: '1-year multiple entry visa for Saudi Arabia. Quick processing time for transit or tourism.',
      type: 'visa',
      price: 45000,
      currency: 'PKR',
      category: 'Services',
      duration: '3-5 Working Days',
      itinerary: ['Online portal submission', 'Approval tracking', 'E-visa delivery via email'],
      images: ['https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 999,
      featured: false
    },
    {
      title: 'Dubai Trade Expo Delegate Pass',
      description: 'Join the international business elite. Complete business matchmaking, premium lounge access, 5-star hotel lodging, and professional networking passes for Dubai Expo.',
      type: 'expo',
      price: 240000,
      currency: 'PKR',
      category: 'Business',
      duration: '5 Days',
      itinerary: ['VIP Trade Expo Multi-Day Pass', '4 Nights in 5-Star Downtown Dubai Hotel', 'Elite B2B Networking Invitation', 'Bilingual Coordinator & Local Transfers'],
      images: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 25,
      featured: true,
      isTrending: true
    },
    {
      title: 'German Academic Pathway & Student Visa Support',
      description: 'Comprehensive student counseling, public university placements, German blockade bank setup guidance, and high-success visa coaching.',
      type: 'study-abroad',
      price: 120000,
      currency: 'PKR',
      category: 'Education',
      duration: '3 Months Support',
      itinerary: ['Personal Career & University Profiling', '3 Public/Private University Applications', 'Blocked Account & Insurance Setup Assistance', 'Premium Mock Visa Interviews & Support'],
      images: ['https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 50,
      featured: true,
      isTrending: true
    },
    {
      title: 'Finland Admission Support Package',
      description: 'Education in English & Scholarships. Finland’s world leading higher education system offers 400+ bachelor’s and master’s degree programs in English. Selection of the right program and university for IT, AI and Medical programs.',
      type: 'study-abroad',
      price: 499,
      currency: 'EUR',
      category: 'Admission Support',
      duration: 'Program Intakes: Summer, Winter, Autumn 2027',
      itinerary: ['University selection', 'Course selection', 'Assistance in application filling', 'Motivation and reference letters', 'Assistance to acquire scholarships', 'Email support'],
      images: ['https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 100,
      featured: true,
      isTrending: true
    },
    {
      title: 'Finland Visa Support Package',
      description: 'Complete Visa Support for Finland study programs. We will assist you throughout from selection of the right program and university until you receive the resident permit.',
      type: 'study-abroad',
      price: 1999,
      currency: 'EUR',
      category: 'Visa Support',
      duration: 'Program Intakes: Summer, Winter, Autumn 2027',
      itinerary: ['Assistance in all document’s preparations', 'Visa application filing', 'Assistance in Appointment booking', 'Interview preparations', 'Assistance in health insurance', 'One to one session with consultant'],
      images: ['https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 100,
      featured: false
    },
    {
      title: 'Finland Arrival Support Package',
      description: 'Post-arrival support in Finland for students. Get adapted to Finland and its job market.',
      type: 'study-abroad',
      price: 499,
      currency: 'EUR',
      category: 'Arrival Support',
      duration: 'Program Intakes: Summer, Winter, Autumn 2027',
      itinerary: ['Euro CV preparation', 'Adaptation in Finland', 'Opening bank account', 'Email support', 'Orientation about Finnish job market', 'Assistance in job hunting'],
      images: ['https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 100,
      featured: false
    },
    {
      title: 'Talk To A Consultant (Finland Study)',
      description: 'Consultation session for studying in Finland. Discuss programs, scholarships, and general information.',
      type: 'study-abroad',
      price: 69,
      currency: 'EUR',
      category: 'Consultation',
      duration: '1 Hour',
      itinerary: ['Question and answer session', 'General Information', 'Scholarship information'],
      images: ['https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=800&q=80'],
      inventoryCount: 500,
      featured: false
    }
  ];

  for (const pkg of packages) {
    await addDoc(collection(db, 'packages'), pkg);
  }
  console.log('Seeding complete');
};
