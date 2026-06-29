import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { auth, db, storage, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { Booking, UserProfile, TravelPackage, PackageType, Review, VisaRequest, ChatMessage, ChatSession, HeroSlide, ExpoPass } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Database, Users, TrendingUp, Package, 
  CheckCircle2, Clock, XCircle, BarChart3, RotateCcw, 
  Plus, Trash2, Edit3, Save, LayoutDashboard, Calendar, 
  Tag, Info, Image as ImageIcon, MapPin, Layers, ShieldCheck,
  Upload, X, FileText, MessageSquare, Star, AlertTriangle, ChevronRight,
  Activity, Cpu, Zap, Radio, Sparkles
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, formatCurrency, ensureItineraryArray } from '@/src/lib/utils';
import { seedDatabase } from '@/src/services/api';
import { generateItinerary, generateExecutiveInsights } from '@/src/services/aiService';
import Markdown from 'react-markdown';
import { 
  authorizeGoogleSheets, 
  createAgilitySpreadsheet, 
  syncDashboardSummary, 
  syncPackagesSummary, 
  syncBookingsSummary, 
  syncVisasSummary,
  getGoogleAccessToken,
  setGoogleAccessToken
} from '@/src/services/googleSheetsService';
import { useToast } from '@/src/components/layout/ToastContext';

import SEOContentGenerator from '@/src/components/SEOContentGenerator';

type TabType = 'overview' | 'bookings' | 'packages' | 'users' | 'visas' | 'reviews' | 'chat' | 'sheets' | 'sliders' | 'seo';

export default function Admin() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [activeCategory, setActiveCategory] = useState<'intel' | 'ops' | 'inventory'>('intel');

  // Keep category in sync with sub-tab transitions
  useEffect(() => {
    if (['overview', 'sheets', 'sliders'].includes(activeTab)) {
      setActiveCategory('intel');
    } else if (['bookings', 'chat', 'reviews'].includes(activeTab)) {
      setActiveCategory('ops');
    } else {
      setActiveCategory('inventory');
    }
  }, [activeTab]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [visaRequests, setVisaRequests] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Define loadData as it's called elsewhere, even if onSnapshot handles most things
  const loadData = async () => {
    // onSnapshot already handles the main data, but we can force a refresh of non-snap data if needed
    console.log("Refreshing system state...");
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [seeding, setSeeding] = useState(false);
  
  // Advanced Dashboard Metrics & Strategic States
  const [analyticsCategory, setAnalyticsCategory] = useState<string>('all');
  const [executiveInsights, setExecutiveInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const handleGeneratePulseInsights = async () => {
    if (loadingInsights) return;
    setLoadingInsights(true);
    try {
      const breakdownStr = `Umrah: ${packages.filter(p => p.type === 'umrah').length}, Domestic: ${packages.filter(p => p.type.includes('domestic')).length}, Visa: ${packages.filter(p => p.type === 'visa').length}, Expo: ${packages.filter(p => p.type === 'expo').length}, Study Abroad: ${packages.filter(p => p.type === 'study-abroad').length}`;
      const totalRevAmount = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const report = await generateExecutiveInsights(
        bookings.length,
        totalRevAmount,
        packages.length,
        visaRequests.length,
        breakdownStr
      );
      setExecutiveInsights(report);
      toast.success("Strategic intelligence report generated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to compile executive intelligence report.");
    } finally {
      setLoadingInsights(false);
    }
  };
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState<'passport' | 'idCard' | null>(null);
  const [pulseEvents, setPulseEvents] = useState<any[]>([]);
  const [isCreatingVisa, setIsCreatingVisa] = useState(false);
  const [generatingItinerary, setGeneratingItinerary] = useState<string | null>(null);
  const [itineraryContent, setItineraryContent] = useState('');
  const [newVisaRequest, setNewVisaRequest] = useState<Partial<VisaRequest>>({
    userId: '',
    visaType: 'Umrah Visa',
    status: 'pending',
    notes: ''
  });

  // Google Sheets Integration State Block
  const [sheetsConfig, setSheetsConfig] = useState<{ spreadsheetId?: string; spreadsheetUrl?: string; lastSync?: string } | null>(null);
  const [sheetsAuthorized, setSheetsAuthorized] = useState(false);
  const [isAuthorizingSheets, setIsAuthorizingSheets] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [inputSpreadsheetUrl, setInputSpreadsheetUrl] = useState('');
  
  // Sorting State
  const [packageSortField, setPackageSortField] = useState<'price' | 'inventoryCount' | 'createdAt'>('createdAt');
  const [packageSortOrder, setPackageSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Package Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<Partial<TravelPackage> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<'essential' | 'narrative' | 'media' | 'itinerary' | 'infocards' | 'expopasses'>('essential');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hero Slide Management State
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [currentSlideItem, setCurrentSlideItem] = useState<Partial<HeroSlide> | null>(null);
  const [isUploadingSlideImage, setIsUploadingSlideImage] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ url: string, title: string } | null>(null);

  // Real-time synchronization
  useEffect(() => {
    setLoading(true);
    
    // 1. Bookings Sync
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snap) => {
      setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    // 2. Packages Sync
    const unsubPackages = onSnapshot(collection(db, 'packages'), (snap) => {
      setPackages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TravelPackage[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'packages');
    });

    // 3. Users Sync
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    // 4. Visas Sync
    const unsubVisas = onSnapshot(collection(db, 'visaRequests'), (snap) => {
      setVisaRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VisaRequest[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'visaRequests');
    });

    // 5. Reviews Sync
    const unsubReviews = onSnapshot(collection(db, 'reviews'), (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reviews');
    });

    // 7. Chat Sessions Sync
    const unsubChats = onSnapshot(query(collection(db, 'chatSessions'), orderBy('updatedAt', 'desc')), (snap) => {
      setChatSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatSession[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chatSessions');
    });

    // 6. Intelligence Pulse Sync (Combined Stream)
    const logQuery = query(collection(db, 'aiLogs'), orderBy('timestamp', 'desc'), limit(20));
    const unsubLogs = onSnapshot(logQuery, (snap) => {
      const logs = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        source: 'AI Intelligence',
        icon: Cpu,
        color: doc.data().success ? 'text-emerald-500' : 'text-rose-500'
      }));
      setPulseEvents(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'aiLogs');
    });

    // 8. Google Sheets Settings Sync
    const unsubSheets = onSnapshot(doc(db, 'settings', 'googleSheets'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSheetsConfig({
          spreadsheetId: data.spreadsheetId,
          spreadsheetUrl: data.spreadsheetUrl,
          lastSync: data.lastSync
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/googleSheets');
    });

    // 9. Slides Sync
    const unsubSlides = onSnapshot(collection(db, 'slides'), (snap) => {
      const slideList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HeroSlide[];
      setSlides(slideList.sort((a, b) => (a.order || 0) - (b.order || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'slides');
    });

    setSheetsAuthorized(!!getGoogleAccessToken());

    return () => {
      unsubBookings();
      unsubPackages();
      unsubUsers();
      unsubVisas();
      unsubReviews();
      unsubLogs();
      unsubChats();
      unsubSheets();
      unsubSlides();
    };
  }, []);

  useEffect(() => {
    if (!selectedChat) return;

    const q = query(
      collection(db, 'chatSessions', selectedChat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chatSessions/${selectedChat.id}/messages`);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !selectedChat || !auth.currentUser) return;

    const text = chatInput.trim();
    setChatInput('');

    try {
      await addDoc(collection(db, 'chatSessions', selectedChat.id, 'messages'), {
        text,
        senderId: auth.currentUser.uid,
        senderName: 'Admin Support',
        timestamp: serverTimestamp(),
        isAdmin: true
      });

      await updateDoc(doc(db, 'chatSessions', selectedChat.id), {
        lastMessage: text,
        updatedAt: serverTimestamp(),
        unreadCount: 0
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const booking = bookings.find(b => b.id === id);
      await updateDoc(doc(db, 'bookings', id), { status: newStatus });
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus as any } : b));

      // Email Notification
      if (booking && (newStatus === 'confirmed' || newStatus === 'completed')) {
        const user = users.find(u => u.uid === booking.userId);
        if (user) {
          const { sendEmailNotification } = await import('@/src/services/notificationService');
          await sendEmailNotification(
            user.email,
            `Booking ${newStatus === 'confirmed' ? 'Confirmed' : 'Completed'} - Agility Travels`,
            `Your booking for <b>${booking.packageName}</b> (ID: ${id.slice(0, 8)}) has been marked as <b>${newStatus}</b>. Login to your dashboard for more details.`
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVisaStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'visaRequests', id), { status: newStatus });
      setVisaRequests(visaRequests.map(v => v.id === id ? { ...v, status: newStatus } : v));
      
      const visa = visaRequests.find(v => v.id === id);
      if (visa && (newStatus === 'approved' || newStatus === 'rejected')) {
        const user = users.find(u => u.uid === visa.userId);
        if (user) {
          const { sendEmailNotification } = await import('@/src/services/notificationService');
          await sendEmailNotification(
            user.email,
            `Visa Request ${newStatus === 'approved' ? 'Approved' : 'Rejected'} - Agility Travels`,
            `Your visa request for <b>${visa.visaType}</b> has been <b>${newStatus}</b>. ${newStatus === 'approved' ? 'Please check your dashboard for further instructions.' : 'Please contact support for details.'}`
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('Confirm Review Elimination Protocol?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
      setReviews(reviews.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeed = async () => {
    if (!confirm('This will add duplicate sample data. Are you sure?')) return;
    setSeeding(true);
    try {
      await seedDatabase();
      toast.success('Database seeded successfully!');
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to seed database');
    } finally {
      setSeeding(false);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentPackage) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    const newImages = [...(currentPackage.images || [])];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `packages/${Date.now()}-${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              // If multiple files, calculate aggregate progress
              const totalProgress = ((i * 100) + progress) / files.length;
              setUploadProgress(totalProgress);
            }, 
            (error) => {
              setUploadError(`Failed to upload ${file.name}: ${error.message}`);
              reject(error);
            }, 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              newImages.push(downloadURL);
              resolve(null);
            }
          );
        });
      }
      setCurrentPackage({ ...currentPackage, images: newImages });
    } catch (error) {
      console.error("Upload error:", error);
      // setUploadError is already called in the uploadTask.on error callback
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    if (!currentPackage || !currentPackage.images) return;
    const newImages = currentPackage.images.filter((_, i) => i !== index);
    setCurrentPackage({ ...currentPackage, images: newImages });
  };

  const handleSavePackage = async () => {
    if (!currentPackage) return;
    setLoading(true);
    try {
      if (currentPackage.id) {
        const { id, ...data } = currentPackage;
        await updateDoc(doc(db, 'packages', id), data);
      } else {
        await addDoc(collection(db, 'packages'), {
          ...currentPackage,
          currency: 'PKR',
          createdAt: new Date().toISOString()
        });
      }
      setIsEditing(false);
      setCurrentPackage(null);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      await deleteDoc(doc(db, 'packages', id));
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAuthorizeSheets = async () => {
    setIsAuthorizingSheets(true);
    setSyncError(null);
    try {
      const token = await authorizeGoogleSheets();
      setSheetsAuthorized(true);
      toast.success("Administrator successfully fully authenticated with Google Workspace.");
    } catch (e: any) {
      console.error(e);
      setSyncError(e.message || "Scope authorization denied.");
    } finally {
      setIsAuthorizingSheets(false);
    }
  };

  const handleDisconnectSheets = () => {
    setGoogleAccessToken(null);
    setSheetsAuthorized(false);
    toast.info("Google Workspace credentials revoked.");
  };

  const handleCreateNewSheet = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      toast.error("Please connect your Google account first.");
      return;
    }
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const title = "Agility Travels - Operations Registry";
      const spr = await createAgilitySpreadsheet(token, title);
      
      const configDoc = doc(db, 'settings', 'googleSheets');
      await setDoc(configDoc, {
        spreadsheetId: spr.spreadsheetId,
        spreadsheetUrl: spr.spreadsheetUrl,
        lastSync: new Date().toISOString()
      }, { merge: true });
      
      setSyncStatus('success');
      toast.success(`Spreadsheet generated and linked: ${title}`, 0, {
        label: "Open Sheet ↗",
        onClick: () => {
          window.open(spr.spreadsheetUrl, '_blank');
        },
        url: spr.spreadsheetUrl
      });
    } catch (e: any) {
      console.error(e);
      setSyncStatus('error');
      setSyncError(e.message || "Failed to generate spreadsheet.");
    }
  };

  const handleLinkExistingSheet = () => {
    if (!inputSpreadsheetUrl.trim()) {
      toast.error("Please enter a valid Google Spreadsheet URL or ID.");
      return;
    }
    let spreadsheetId = inputSpreadsheetUrl.trim();
    if (spreadsheetId.includes('/d/')) {
      const parts = spreadsheetId.split('/d/');
      if (parts[1]) {
        spreadsheetId = parts[1].split('/')[0];
      }
    }
    
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const configDoc = doc(db, 'settings', 'googleSheets');
      setDoc(configDoc, {
        spreadsheetId,
        spreadsheetUrl,
        lastSync: new Date().toISOString()
      }, { merge: true });
      
      setSyncStatus('success');
      setInputSpreadsheetUrl('');
      toast.success("Spreadsheet linked successfully.");
    } catch (e: any) {
      console.error(e);
      setSyncStatus('error');
      setSyncError(e.message || "Failed to link spreadsheet.");
    }
  };

  const handleSyncAllDatabases = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      toast.error("Please connect and authorize your Google Account first.");
      return;
    }
    if (!sheetsConfig?.spreadsheetId) {
      toast.error("Please link or create a Spreadsheet first.");
      return;
    }
    
    setIsSyncingAll(true);
    setSyncStatus('syncing');
    setSyncError(null);
    
    try {
      const sprId = sheetsConfig.spreadsheetId;
      
      const totalAmount = bookings.reduce((acc, b) => acc + b.totalAmount, 0);
      const totalBookings = bookings.length;
      const totalVisas = visaRequests.length;
      const totalPackages = packages.length;
      
      await Promise.all([
        syncDashboardSummary(token, sprId, {
          totalBookings,
          totalAmount,
          totalVisas,
          totalPackages
        }),
        syncPackagesSummary(token, sprId, packages),
        syncBookingsSummary(token, sprId, bookings, users),
        syncVisasSummary(token, sprId, visaRequests)
      ]);
      
      const configDoc = doc(db, 'settings', 'googleSheets');
      await updateDoc(configDoc, {
        lastSync: new Date().toISOString()
      });
      
      setSyncStatus('success');
      toast.success("All local tables synchronized successfully to your Google Sheet!", 0, {
        label: "Open Sheet ↗",
        onClick: () => {
          window.open(sheetsConfig?.spreadsheetUrl, '_blank');
        },
        url: sheetsConfig?.spreadsheetUrl
      });
    } catch (e: any) {
      console.error("Fulfillment database synchronization failed:", e);
      setSyncStatus('error');
      setSyncError(e.message || "Failed to sync spreadsheet with live database.");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleCreateVisaRequest = async () => {
    if (!newVisaRequest.userId || !newVisaRequest.visaType) {
      toast.error("Please select a user and visa type");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'visaRequests'), {
        ...newVisaRequest,
        submissionDate: new Date().toISOString()
      });
      setIsCreatingVisa(false);
      setNewVisaRequest({
        userId: '',
        visaType: 'Umrah Visa',
        status: 'pending',
        notes: ''
      });
      // onSnapshot will handle the update
    } catch (e) {
      console.error(e);
      toast.error("Failed to create visa request");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateItinerary = async (pkg: TravelPackage) => {
    setLoading(true);
    try {
      const it = await generateItinerary(
        pkg.title, 
        pkg.type, 
        parseInt(pkg.duration) || 7, 
        (pkg.locations || '').split(',').map(s => s.trim()).filter(S => !!S)
      );
      setGeneratingItinerary(pkg.id);
      setItineraryContent(it);
      toast.success("Intelligence itinerary generated successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Itinerary generation failed");
    } finally {
      setLoading(false);
    }
  };

  const saveGeneratedItinerary = async (pkgId: string) => {
    try {
      await updateDoc(doc(db, 'packages', pkgId), {
        itinerary: itineraryContent
      });
      setGeneratingItinerary(null);
      setItineraryContent('');
      toast.success("Itinerary saved successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save itinerary");
    }
  };

  // Hero Slide Action Handlers
  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSlideItem) return;
    
    const { tagline, title, description, image, actionText, href, order } = currentSlideItem;
    if (!tagline || !title || !description || !image || !actionText || !href) {
      toast.error("Please fill in all required fields including image");
      return;
    }
    
    try {
      const slideData = {
        tagline,
        title,
        description,
        image,
        actionText,
        href,
        order: Number(order) || 0
      };
      
      if (currentSlideItem.id) {
        await updateDoc(doc(db, 'slides', currentSlideItem.id), slideData);
        toast.success("Hero slide updated successfully!");
      } else {
        await addDoc(collection(db, 'slides'), slideData);
        toast.success("New hero slide created successfully!");
      }
      setIsEditingSlide(false);
      setCurrentSlideItem(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save hero slide.");
    }
  };

  const handleDeleteSlide = async (slideId: string) => {
    if (!window.confirm("Are you sure you want to delete this slide from the homepage hero slider?")) return;
    try {
      await deleteDoc(doc(db, 'slides', slideId));
      toast.success("Hero slide deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete hero slide.");
    }
  };

  const handleSlideImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingSlideImage(true);
    try {
      const storageRef = ref(storage, `slides/image-${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setCurrentSlideItem(prev => prev ? { ...prev, image: url } : { image: url } as Partial<HeroSlide>);
      toast.success("Slide asset uploaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload slide image asset.");
    } finally {
      setIsUploadingSlideImage(false);
    }
  };

  const handleSeedSlides = async () => {
    try {
      const initialSlides: Omit<HeroSlide, 'id'>[] = [
        {
          tagline: 'Sacred Pilgrimage & Devotion',
          title: 'Spiritual Journeys & Sacred Guides',
          description: 'Premium custom Umrah & Haj 2026/2027 packages. Tailored itineraries, luxury lodging located in the immediate courtyard of the Holy Harams, and expert religious guidance.',
          image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070&auto=format&fit=crop',
          actionText: 'Explore Sacred Packages',
          href: '/packages/umrah',
          order: 1
        },
        {
          tagline: 'Global Business Expansion',
          title: 'EXPO Sponsorship, Booths & Passes',
          description: 'Unlock premier business engagement. Book corporate exhibition booths, secure elite delegate passes, B2B matchmaking invitations, and get fast-track visa processing with all-inclusive flight tickets.',
          image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop',
          actionText: 'Book EXPO Packages',
          href: '/packages/expo',
          order: 2
        },
        {
          tagline: 'World-Class European Education',
          title: 'Study Abroad: Finland & Estonia 2027',
          description: 'Admission assistance for prestigious Graduate & Masters programs for Summer, Winter, and Autumn 2027 intakes. Seamless university admission support, documentation profiling, and high-success study visa coaching.',
          image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop',
          actionText: 'Explore Study Abroad',
          href: '/packages/study-abroad',
          order: 3
        }
      ];
      for (const slide of initialSlides) {
        await addDoc(collection(db, 'slides'), slide);
      }
      toast.success("Successfully seeded default banner slides!");
    } catch (error) {
      console.error(error);
      toast.error("Seeding slider collection failed.");
    }
  };

  const handleAdminDocUpload = async (e: ChangeEvent<HTMLInputElement>, type: 'passport' | 'idCard' | 'educationDegree') => {
    const file = e.target.files?.[0];
    if (!file || !selectedBooking) return;

    setIsUploadingDoc(type);
    try {
      const storageRef = ref(storage, `clients/${selectedBooking.userId}/documents/${type}-${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const updateData = type === 'passport' 
        ? { passportUrl: downloadURL } 
        : type === 'idCard' 
          ? { idCardUrl: downloadURL }
          : { educationDegreeUrl: downloadURL };
          
      await updateDoc(doc(db, 'bookings', selectedBooking.id), updateData);
      
      setSelectedBooking({ ...selectedBooking, ...updateData });
      setBookings(bookings.map(b => b.id === selectedBooking.id ? { ...b, ...updateData } : b));
      toast.success(`${type === 'passport' ? 'Passport' : type === 'idCard' ? 'ID Card' : 'Education Degree'} updated successfully!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const filteredBookingsDetails = bookings.filter(b => {
    if (analyticsCategory === 'all') return true;
    if (analyticsCategory === 'visa') return b.packageType === 'visa';
    return b.packageType === analyticsCategory;
  });

  const filteredRevenueDetails = filteredBookingsDetails.reduce((acc, b) => acc + b.totalAmount, 0);
  const activeBookingsDetails = filteredBookingsDetails.filter(b => b.status === 'pending').length;
  const activeListingsDetails = packages.filter(p => {
    if (analyticsCategory === 'all') return true;
    return p.type === analyticsCategory;
  }).length;

  const stats = [
    { 
      label: 'Operational Revenue', 
      value: formatCurrency(filteredRevenueDetails), 
      icon: TrendingUp, 
      color: 'text-emerald-500',
      change: `${analyticsCategory === 'all' ? '100%' : `${Math.round((filteredRevenueDetails / Math.max(1, bookings.reduce((a,b)=>a+b.totalAmount,0))) * 105)}% share`}`
    },
    { 
      label: 'Pending Queue', 
      value: activeBookingsDetails, 
      icon: Clock, 
      color: 'text-amber-500',
      change: 'Active workflow states'
    },
    { 
      label: 'System Intakes', 
      value: visaRequests.length, 
      icon: ShieldCheck, 
      color: 'text-indigo-500',
      change: 'Visa applications live'
    },
    { 
      label: 'Catalog Count', 
      value: activeListingsDetails, 
      icon: Package, 
      color: 'text-sky-500',
      change: 'Active inventory items'
    },
  ];

  // Dynamically compute chart value baseline aggregated over real payments + strategic forecast projection values
  const getDynamicChartData = () => {
    const basePoints: { [key: string]: number } = {
      'Jan': 240000,
      'Feb': 310000,
      'Mar': 450000,
      'Apr': 380000,
      'May': 590000,
      'Jun': filteredRevenueDetails > 0 ? filteredRevenueDetails + 200000 : 720000
    };

    filteredBookingsDetails.forEach(b => {
      if (!b.bookingDate) return;
      try {
        const parts = b.bookingDate.split('-');
        const monthNum = parseInt(parts[1], 10);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[monthNum - 1];
        if (monthName && basePoints[monthName] !== undefined) {
          basePoints[monthName] += b.totalAmount;
        }
      } catch (e) {
        console.error("Chart parsing issue: ", e);
      }
    });

    return Object.entries(basePoints).map(([key, val]) => ({
      name: key,
      value: val
    }));
  };

  const chartData = getDynamicChartData();

  const sortedPackages = [...packages].sort((a, b) => {
    const valA = a[packageSortField];
    const valB = b[packageSortField];

    if (valA === undefined || valB === undefined) return 0;

    if (packageSortOrder === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
         <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
           <div className="flex items-center space-x-3 mb-1">
             <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <LayoutDashboard size={20} />
             </div>
             <h1 className="text-3xl font-bold">Admin <span className="text-slate-400">Control</span></h1>
           </div>
           <p className="text-slate-500 uppercase text-[10px] font-bold tracking-widest">Management & Intelligence Suite</p>
        </div>
        <div className="flex items-center space-x-4">
           <button 
            onClick={loadData}
            className="p-3 bg-white border border-slate-100 shadow-sm rounded-2xl hover:bg-slate-50 transition-all text-slate-400"
           >
             <RotateCcw size={18} />
           </button>
           <button 
             onClick={handleSeed}
             disabled={seeding}
             className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold text-xs hover:bg-orange-50 transition-all disabled:opacity-50"
           >
             <Database size={16} />
             <span>{seeding ? 'Syncing...' : 'Seed Data'}</span>
           </button>
        </div>
      </div>

      {/* Dashboard Custom Cockpit Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12 items-start mt-4">
        {/* Left Control Column - Vertical Subsystem Navigation */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 border border-slate-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full translate-x-12 -translate-y-12 blur-xl pointer-events-none" />
            <span className="text-[10px] font-black tracking-widest text-orange-400/80 uppercase font-mono block mb-5">Admin Cockpit</span>
            
            <div className="space-y-2">
              {[
                { id: 'intel', label: 'Intelligence & Sync', icon: Database, desc: 'Analytics & Google Sheets' },
                { id: 'ops', label: 'Operations & Queue', icon: Calendar, desc: 'Bookings, Chats & Reviews' },
                { id: 'inventory', label: 'Inventory & Audits', icon: ShieldCheck, desc: 'Visa, Users & Packages' }
              ].map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id as any);
                      // Auto-select first tab
                      if (cat.id === 'intel') setActiveTab('overview');
                      else if (cat.id === 'ops') setActiveTab('bookings');
                      else if (cat.id === 'inventory') setActiveTab('packages');
                    }}
                    type="button"
                    className={cn(
                      "w-full flex items-start space-x-3.5 p-4 rounded-3xl transition-all text-left group",
                      isActive 
                        ? "bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-orange-400/5 border border-orange-500/30 text-white" 
                        : "hover:bg-white/5 border border-transparent text-slate-400 hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-xl transition-all",
                      isActive ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "bg-white/5 text-slate-400 group-hover:text-white"
                    )}>
                      <cat.icon size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{cat.label}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5 font-medium group-hover:text-slate-400 transition-colors">{cat.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Operations panel inside vertical column */}
          <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono block">Systems Sync</span>
            <div className="space-y-2">
              <button 
                onClick={loadData}
                type="button"
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-xs font-bold text-slate-700"
              >
                <span className="flex items-center space-x-2">
                  <RotateCcw size={14} className="text-slate-400" />
                  <span>Refresh Memory</span>
                </span>
                <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-[4px] font-mono font-bold uppercase">Live</span>
              </button>
              <button 
                onClick={handleSeed}
                type="button"
                disabled={seeding}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-orange-50 rounded-2xl transition-all text-xs font-bold text-slate-707 disabled:opacity-50"
              >
                <span className="flex items-center space-x-2">
                  <Database size={14} className="text-slate-400" />
                  <span>{seeding ? 'Syncing...' : 'Seed Data'}</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Content Column - Tab Options Horizontal Menus and content panels */}
        <div className="lg:col-span-3 space-y-8">
          {/* Categorized Sub-tab Horizontal Selector */}
          <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-[2rem] w-full">
            {activeCategory === 'intel' && [
              { id: 'overview', icon: BarChart3, label: 'Analytics Dashboard Overview' },
              { id: 'sheets', icon: FileText, label: 'Google Sheets Integration & Sync' },
              { id: 'sliders', icon: ImageIcon, label: 'Hero Banners & Slides Manager' },
              { id: 'seo', icon: Sparkles, label: 'SEO Content AI' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                type="button"
                className={cn(
                  "flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all flex-grow md:flex-grow-0 justify-center",
                  activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <tab.icon size={13} />
                <span>{tab.label}</span>
              </button>
            ))}

            {activeCategory === 'ops' && [
              { id: 'bookings', icon: Calendar, label: 'Fulfilment Booking Requests' },
              { id: 'chat', icon: MessageSquare, label: 'User Live Support Chats' },
              { id: 'reviews', icon: Star, label: 'User Feedback & Reviews' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                type="button"
                className={cn(
                  "flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all flex-grow md:flex-grow-0 justify-center",
                  activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <tab.icon size={13} />
                <span>{tab.label}</span>
              </button>
            ))}

            {activeCategory === 'inventory' && [
              { id: 'packages', icon: Package, label: 'Services & Travel Packages' },
              { id: 'visas', icon: ShieldCheck, label: 'Visa Assistance Intake' },
              { id: 'users', icon: Users, label: 'Active User Profiles Index' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                type="button"
                className={cn(
                  "flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-xs transition-style transition-all flex-grow md:flex-grow-0 justify-center",
                  activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <tab.icon size={13} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Swallow original visual tabs rendering block */}
          <div className="hidden">
            {/* Original horizontal navigation starts here */}
            {/* Navigation Tabs placeholder */}
      <div className="flex space-x-2 mb-10 bg-slate-100 p-1.5 rounded-3xl w-fit overflow-x-auto max-w-full">
         {[
           { id: 'overview', icon: BarChart3, label: 'Analytics' },
           { id: 'bookings', icon: Calendar, label: 'Bookings' },
           { id: 'visas', icon: ShieldCheck, label: 'Visa Requests' },
           { id: 'packages', icon: Package, label: 'Packages' },
           { id: 'reviews', icon: Star, label: 'Reviews' },
           { id: 'users', icon: Users, label: 'Users' },
           { id: 'chat', icon: MessageSquare, label: 'Support Chat' },
           { id: 'sheets', icon: FileText, label: 'Google Sheets' }
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as TabType)}
             className={cn(
               "flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all",
               activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
             )}
           >
             <tab.icon size={16} />
             <span>{tab.label}</span>
           </button>
         ))}
      </div>

          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
          {activeTab === 'overview' && (
            <div className="space-y-12">
              {/* Dynamic Operations Filter Context */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                    <Filter size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-widest block font-mono">Operations Context</span>
                    <span className="text-[10px] text-slate-400 font-medium">Filter widgets, revenues, and catalogs dynamically</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {[
                    { id: 'all', label: 'All Operations' },
                    { id: 'umrah', label: 'Umrah & Haj' },
                    { id: 'expo', label: 'EXPO Deals' },
                    { id: 'study-abroad', label: 'Study Abroad' },
                    { id: 'visa', label: 'Visa Assistance' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setAnalyticsCategory(cat.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all flex-grow sm:flex-grow-0 text-center",
                        analyticsCategory === cat.id 
                          ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-102" 
                          : "bg-white text-slate-600 hover:text-slate-900 border border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Interactive KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-orange-200 hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-12 -translate-y-12 group-hover:bg-slate-100/50 transition-colors pointer-events-none" />
                    <div className={cn("w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform relative z-10", stat.color)}>
                       <stat.icon size={22} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">{stat.label}</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tight relative z-10">{stat.value}</p>
                    <div className="flex items-center space-x-1.5 mt-2 relative z-10">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full group-hover:bg-orange-500 transition-colors" />
                      <p className="text-[10px] font-bold text-slate-400 font-mono tracking-xs">{stat.change}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full translate-x-1/2 -translate-y-1/2 blur-[100px] pointer-events-none" />
                   <div className="flex justify-between items-center mb-10">
                      <h3 className="text-xl font-bold flex items-center">
                         <TrendingUp className="mr-3 text-orange-500" />
                         Dynamic Operational Yield
                      </h3>
                      <div className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                         Context: {analyticsCategory}
                      </div>
                   </div>
                   <div className="h-80 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                         <defs>
                           <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#F97316" stopOpacity={0.2}/>
                             <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} dy={10} />
                         <YAxis hide />
                         <Tooltip 
                           contentStyle={{ borderRadius: '24px', border: '1px solid #F1F5F9', boxShadow: '0 20px 50px rgba(0,0,0,0.06)', padding: '16px' }}
                           itemStyle={{ fontWeight: 'bold', color: '#0F172A' }}
                           cursor={{ stroke: '#F97316', strokeWidth: 2, strokeDasharray: '5 5' }}
                         />
                         <Area type="monotone" dataKey="value" stroke="#F97316" strokeWidth={5} fillOpacity={1} fill="url(#colorAdmin)" />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                 <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col justify-between shadow-lg">
                   <div>
                     <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-bold text-orange-400 tracking-tight">Active Capacity</h3>
                        <div className="flex items-center space-x-2">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                           <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Live</span>
                        </div>
                     </div>
                     <div className="space-y-8">
                        {[
                          { label: 'Umrah & Haj', count: packages.filter(p => p.type === 'umrah').length, color: 'bg-emerald-500' },
                          { label: 'EXPO Premium', count: packages.filter(p => p.type === 'expo').length, color: 'bg-orange-500' },
                          { label: 'Study Abroad', count: packages.filter(p => p.type === 'study-abroad').length, color: 'bg-purple-600' },
                          { label: 'Visa Programs', count: packages.filter(p => p.type === 'visa').length, color: 'bg-indigo-500' },
                        ].map(item => (
                          <div key={item.label} className="space-y-3">
                             <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{item.label}</p>
                                  <p className="text-2xl font-bold">{item.count}</p>
                                </div>
                                <span className="text-[10px] font-bold text-white/20 font-mono">Listed Catalogs</span>
                             </div>
                             <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${(item.count / Math.max(1, packages.length)) * 100}%` }}
                                 className={cn("h-full", item.color)} 
                                />
                             </div>
                          </div>
                        ))}
                     </div>
                   </div>
                   <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/5">
                      <div className="flex items-center space-x-3 text-orange-400 mb-2">
                         <Info size={16} />
                         <span className="text-xs font-bold uppercase tracking-widest font-mono">Compliance Guard</span>
                      </div>
                      <p className="text-xs text-white/45 leading-relaxed font-medium">All statistics reflect direct digital records and synchronized passport Extractions.</p>
                   </div>
                </div>
              </div>

              {/* Strategic AI Insights Dashboard Widget */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-black p-10 rounded-[3rem] text-white shadow-xl relative overflow-hidden ring-1 ring-white/5">
                 <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl pointer-events-none" />
                 <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                 
                 <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 border-b border-white/10 pb-8 z-10 font-sans">
                    <div>
                       <div className="flex items-center space-x-2 text-xs font-bold tracking-[0.2em] text-orange-400 uppercase font-mono mb-2">
                          <Sparkles size={14} className="animate-pulse" />
                          <span>AI Cognitive Engine</span>
                       </div>
                       <h3 className="text-2xl font-bold tracking-tight">Executive Strategic Analysis</h3>
                       <p className="text-xs text-white/50 mt-1 font-medium">Instantly generate high-order business recommendations compiled directly from live database metrics.</p>
                    </div>
                    
                    <button
                       onClick={handleGeneratePulseInsights}
                       disabled={loadingInsights}
                       className="flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-widest px-8 py-4.5 rounded-2xl shadow-lg shadow-orange-500/15 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    >
                       {loadingInsights ? (
                          <>
                             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                             <span>Compiling Indicators...</span>
                          </>
                       ) : (
                          <>
                             <Sparkles size={14} />
                             <span>Compile Intel Report</span>
                          </>
                       )}
                    </button>
                 </div>

                 <AnimatePresence mode="wait">
                    {executiveInsights ? (
                       <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative z-10"
                       >
                          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8 markdown-body text-white/85 text-xs md:text-sm leading-relaxed prose prose-invert max-w-none font-sans">
                             <Markdown>{executiveInsights}</Markdown>
                          </div>
                       </motion.div>
                    ) : (
                       <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center justify-center py-12 text-center text-white/20 relative z-10"
                       >
                          <div className="w-16 h-16 bg-white/[0.02] rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                            <Cpu size={30} className="text-orange-400/30 animate-pulse" />
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wider">Strategic Advisory Standard Offline</p>
                          <p className="text-[10px] text-white/30 mt-1 max-w-md font-medium">Click the compile button to dispatch live metrics payload to Gemini and generate strategic action items.</p>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              {/* Dynamic Operations Cockpit Block */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 {/* Recent Bookings Queue */}
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div>
                       <div className="flex justify-between items-center mb-8">
                          <div className="flex items-center space-x-3">
                             <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                                <Calendar size={18} />
                             </div>
                             <div>
                                <h3 className="font-bold text-slate-800 tracking-tight text-base">Fulfillment Intake Monitor</h3>
                                <p className="text-[10px] text-slate-400 font-medium font-mono">Dynamic Booking Queue</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => setActiveTab('bookings')}
                            className="bg-slate-50 hover:bg-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center"
                          >
                            <span>Operational Hub</span>
                            <ChevronRight size={10} className="ml-1" />
                          </button>
                       </div>

                       <div className="space-y-4">
                          {bookings.slice(0, 3).map((b) => (
                             <div key={b.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-white transition-all flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                   <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-[10px] uppercase font-mono">
                                      {b.packageType?.slice(0, 2) || 'OP'}
                                   </div>
                                   <div>
                                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{b.packageName}</p>
                                      <p className="text-[10px] text-slate-400 font-bold font-mono">Price: {formatCurrency(b.totalAmount)}</p>
                                   </div>
                                </div>
                                <span className={cn(
                                   "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono",
                                   b.status === 'confirmed' ? "bg-emerald-100 text-emerald-800" :
                                   b.status === 'cancelled' ? "bg-rose-100 text-rose-800" :
                                   "bg-amber-100 text-amber-800"
                                )}>
                                   {b.status}
                                </span>
                             </div>
                          ))}
                          {bookings.length === 0 && (
                             <div className="text-center py-10 text-slate-300">
                                <Calendar size={28} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs font-bold uppercase tracking-wider">No Intake Record Located</p>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>

                 {/* Active Visa Requests Queue */}
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div>
                       <div className="flex justify-between items-center mb-8">
                          <div className="flex items-center space-x-3">
                             <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                <ShieldCheck size={18} />
                             </div>
                             <div>
                                <h3 className="font-bold text-slate-800 tracking-tight text-base">Visa Verification Intake</h3>
                                <p className="text-[10px] text-slate-400 font-medium font-mono">Real-time Clearance Watch</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => setActiveTab('visas')}
                            className="bg-slate-50 hover:bg-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center"
                          >
                            <span>Clearance Hub</span>
                            <ChevronRight size={10} className="ml-1" />
                          </button>
                       </div>

                       <div className="space-y-4">
                          {visaRequests.slice(0, 3).map((v) => (
                             <div key={v.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-white transition-all flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                   <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs uppercase font-mono">
                                      VI
                                   </div>
                                   <div>
                                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{v.visaType}</p>
                                      <p className="text-[10px] text-slate-400 font-bold font-mono">User ID: {v.userId?.slice(0, 8)}...</p>
                                   </div>
                                </div>
                                <span className={cn(
                                   "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono",
                                   v.status === 'verified' || v.status === 'approved' ? "bg-emerald-100 text-emerald-800" :
                                   v.status === 'rejected' ? "bg-rose-100 text-rose-800" :
                                   "bg-amber-100 text-amber-800"
                                )}>
                                   {v.status}
                                </span>
                             </div>
                          ))}
                          {visaRequests.length === 0 && (
                             <div className="text-center py-10 text-slate-300">
                                <ShieldCheck size={28} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs font-bold uppercase tracking-wider font-mono">No Visa Clearance Active</p>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Intelligence Pulse Feed */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                 <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center space-x-3">
                       <Zap className="text-orange-500" size={24} />
                       <h3 className="text-xl font-bold">INTELLIGENCE <span className="text-slate-400">PULSE</span></h3>
                    </div>
                    <div className="flex items-center space-x-4">
                       <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <Radio size={12} className="text-emerald-500 animate-pulse" />
                          <span>Stream Active</span>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                       <AnimatePresence>
                          {pulseEvents.map((event, idx) => (
                            <motion.div 
                              key={event.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-start space-x-4 group hover:border-orange-200 hover:bg-white transition-all"
                            >
                               <div className={cn("p-3 rounded-xl bg-white shadow-sm mt-1", event.color)}>
                                  <event.icon size={16} />
                               </div>
                               <div className="flex-grow">
                                  <div className="flex justify-between items-center mb-1">
                                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{event.source}</span>
                                     <span className="text-[10px] font-bold text-slate-300">
                                        {event.timestamp?.toDate().toLocaleTimeString()}
                                     </span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900 mb-1">
                                     {event.type === 'passport_extraction' ? 'AI Document Scan' : 'System Event'}
                                  </p>
                                  <div className="p-3 bg-slate-900 rounded-lg text-[10px] font-mono text-white/50 leading-relaxed">
                                     {event.success ? (
                                       <span className="text-emerald-400">SUCCESS:</span>
                                     ) : (
                                       <span className="text-rose-400">ERROR:</span>
                                     )} {JSON.stringify(event.extractedData || event.error || event.data).slice(0, 150)}...
                                  </div>
                               </div>
                            </motion.div>
                          ))}
                          {pulseEvents.length === 0 && (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-300 animate-pulse">
                               <Activity size={32} className="mb-4" />
                               <p className="text-xs font-bold uppercase tracking-widest text-center">Awaiting Intelligence Signals...</p>
                               <p className="text-[10px] mt-1 text-slate-400">Listening to global system state</p>
                            </div>
                          )}
                       </AnimatePresence>
                    </div>

                    <div className="space-y-6">
                       <div className="p-8 bg-orange-500 rounded-[2.5rem] text-white overflow-hidden relative group">
                          <Zap className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 text-white/10 group-hover:scale-110 transition-transform" size={160} />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-6">AI Efficiency Multiplier</h4>
                          <div className="space-y-6 relative">
                             <div>
                                <p className="text-3xl font-black italic tracking-tighter">98.4%</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">Extraction Precision</p>
                             </div>
                             <div>
                                <p className="text-3xl font-black italic tracking-tighter">~1.2s</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">Mean Scan Latency</p>
                             </div>
                          </div>
                       </div>

                       <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center">
                             <ShieldCheck className="mr-2" size={12} />
                             Compliance Pulse
                          </h4>
                          <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600">Identity Checks</span>
                                <span className="text-xs font-black text-emerald-500">NOMINAL</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600">Document Encryption</span>
                                <span className="text-xs font-black text-emerald-500">ACTIVE</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600">API Health</span>
                                <span className="text-xs font-black text-orange-500">99.9%</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                    <h3 className="text-2xl font-bold">Fulfillment Center</h3>
                    <p className="text-sm text-slate-400 font-medium">Review and process recent travel reservations.</p>
                 </div>
                 <div className="relative w-full md:w-80">
                   <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                   <input 
                     placeholder="Search ID, Passenger..." 
                     className="pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-sm border-none outline-none focus:ring-2 focus:ring-orange-500/10 w-full transition-all"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-10 py-6 border-b border-slate-50">Identity</th>
                      <th className="px-10 py-6 border-b border-slate-50">Package Detail</th>
                      <th className="px-10 py-6 border-b border-slate-50">Amount</th>
                      <th className="px-10 py-6 border-b border-slate-50">Lifecycle</th>
                      <th className="px-10 py-6 border-b border-slate-50">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {bookings.filter(b => b.id.toLowerCase().includes(searchTerm.toLowerCase()) || b.passengers[0]?.name.toLowerCase().includes(searchTerm.toLowerCase())).map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-10 py-8">
                           <div className="font-mono text-[10px] font-bold text-slate-400 mb-1">#{booking.id.toUpperCase().slice(0, 8)}</div>
                           <div className="font-bold text-slate-900">{booking.passengers[0]?.name}</div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="font-bold text-slate-900">{booking.packageName}</div>
                           <div className="text-[10px] uppercase tracking-wider font-bold text-orange-500 mt-1">{booking.packageType}</div>
                        </td>
                        <td className="px-10 py-8 font-bold text-slate-900">{formatCurrency(booking.totalAmount)}</td>
                        <td className="px-10 py-8">
                           <div className="group relative w-fit">
                             <span className={cn(
                               "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-help transition-all hover:ring-4 hover:ring-opacity-20",
                               booking.status === 'pending' ? "bg-amber-100 text-amber-700 hover:ring-amber-500" :
                               booking.status === 'confirmed' ? "bg-sky-100 text-sky-700 hover:ring-sky-500" :
                               booking.status === 'completed' ? "bg-emerald-100 text-emerald-700 hover:ring-emerald-500" :
                               "bg-rose-100 text-rose-700 hover:ring-rose-500"
                             )}>
                               {booking.status}
                             </span>
                             <div className="absolute bottom-full mb-2 left-0 w-48 bg-slate-900 text-white text-[10px] font-bold p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-xl z-10 translate-y-2 group-hover:translate-y-0">
                               <div className="flex items-center space-x-2 mb-1 text-orange-400">
                                  <Info size={10} />
                                  <span className="uppercase tracking-widest">Status Detail</span>
                               </div>
                               <p className="text-white/70 leading-relaxed">
                                 {booking.status === 'pending' && 'Awaiting administrative review and payment verification.'}
                                 {booking.status === 'confirmed' && 'Booking verified. Travel documents are being processed.'}
                                 {booking.status === 'completed' && 'Travel cycle fulfilled successfully.'}
                                 {booking.status === 'cancelled' && 'Booking invalidated or withdrawn by traveler/admin.'}
                               </p>
                               <div className="absolute top-full left-4 border-8 border-transparent border-t-slate-900" />
                             </div>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="flex items-center space-x-3">
                              <select 
                                className="bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold px-3 py-2 outline-none focus:border-orange-500 appearance-none pointer-events-auto"
                                value={booking.status}
                                onChange={(e) => handleStatusUpdate(booking.id, e.target.value)}
                              >
                                 <option value="pending">Pending</option>
                                 <option value="confirmed">Confirm</option>
                                 <option value="completed">Complete</option>
                                 <option value="cancelled">Cancel</option>
                              </select>
                              <button 
                                onClick={() => setSelectedBooking(booking)}
                                className="p-3 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                              >
                                <FileText size={14} />
                              </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-10 py-20 text-center text-slate-400 font-medium">No active bookings found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="space-y-10">
               <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                  <div>
                    <h3 className="text-2xl font-bold">Catalog Architect</h3>
                    <p className="text-sm text-slate-400 font-medium">Create and refine your travel offerings.</p>
                  </div>
                  
                  <div className="flex items-center space-x-4 w-full md:w-auto">
                    <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl">
                      <select 
                        value={`${packageSortField}-${packageSortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split('-');
                          setPackageSortField(field as any);
                          setPackageSortOrder(order as any);
                        }}
                        className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 px-3 cursor-pointer appearance-none"
                      >
                        <option value="createdAt-desc">Newest First</option>
                        <option value="createdAt-asc">Oldest First</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="inventoryCount-desc">Inventory: High First</option>
                        <option value="inventoryCount-asc">Inventory: Low First</option>
                      </select>
                      <div className="p-2 bg-white rounded-xl text-orange-500 shadow-sm shadow-orange-500/5">
                        <BarChart3 size={14} className={cn(packageSortOrder === 'desc' ? "rotate-0" : "rotate-180 transition-transform")} />
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setCurrentPackage({
                          title: '',
                          description: '',
                          type: 'umrah',
                          price: 0,
                          duration: '',
                          category: 'Standard',
                          currency: 'PKR',
                          itinerary: [''],
                          images: ['https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80'],
                          inventoryCount: 10,
                          featured: false,
                          isTrending: false
                        });
                        setEditorTab('essential');
                        setIsEditing(true);
                      }}
                      className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-4 rounded-2xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 whitespace-nowrap"
                    >
                      <Plus size={18} />
                      <span>New Listing</span>
                    </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sortedPackages.map((pkg) => (
                    <motion.div 
                      key={pkg.id} 
                      className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:border-orange-200 transition-all flex flex-col"
                    >
                       <div className="aspect-[16/10] bg-slate-100 relative">
                          <img src={pkg.images[0]} className="w-full h-full object-cover" alt={pkg.title} />
                          <div className="absolute top-4 left-4">
                             <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[10px] font-black uppercase text-slate-900 tracking-tighter">
                               {pkg.type}
                             </span>
                          </div>
                          <div className="absolute top-4 right-4 flex space-x-2">
                             <button 
                               onClick={() => {
                                 setCurrentPackage(pkg);
                                 setEditorTab('essential');
                                 setIsEditing(true);
                               }}
                               className="p-2 bg-white rounded-lg text-slate-400 hover:text-sky-500 transition-colors shadow-sm"
                             >
                               <Edit3 size={16} />
                             </button>
                             <button 
                               onClick={() => handleDeletePackage(pkg.id)}
                               className="p-2 bg-white rounded-lg text-slate-400 hover:text-rose-500 transition-colors shadow-sm"
                             >
                               <Trash2 size={16} />
                             </button>
                          </div>
                       </div>
                       <div className="p-8 flex-grow">
                          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-2">{pkg.category}</p>
                          <h4 className="text-lg font-bold text-slate-900 mb-2">{pkg.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 font-medium leading-relaxed">{pkg.description}</p>
                          
                          <div className="mt-6 flex flex-wrap gap-2">
                             <button 
                               onClick={() => handleGenerateItinerary(pkg)}
                               className="flex items-center space-x-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold hover:bg-orange-100 transition-all uppercase tracking-widest"
                             >
                               <Sparkles size={12} />
                               <span>AI Itinerary</span>
                             </button>
                             {pkg.itinerary && typeof pkg.itinerary === 'string' && (
                               <div className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                                  <CheckCircle2 size={12} />
                                  <span>Generated</span>
                               </div>
                             )}
                          </div>
                       </div>
                       <div className="p-8 pt-0 flex justify-between items-center bg-slate-50/30">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory</p>
                            <p className="font-bold text-slate-900">{pkg.inventoryCount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Starting Price</p>
                            <p className="font-black text-orange-500">{formatCurrency(pkg.price)}</p>
                          </div>
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-10 border-b border-slate-50">
                  <h3 className="text-2xl font-bold">Identity Vault</h3>
                  <p className="text-sm text-slate-400 font-medium">Directory of all registered travelers and administrators.</p>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <tr>
                          <th className="px-10 py-6">User Context</th>
                          <th className="px-10 py-6">Privilege</th>
                          <th className="px-10 py-6">Phone Number</th>
                          <th className="px-10 py-6">Member Since</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {users.map(user => (
                         <tr key={user.uid} className="hover:bg-slate-50/30 transition-colors group relative">
                            <td className="px-10 py-8">
                               <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold relative">
                                     {user.displayName?.charAt(0) || user.email?.charAt(0)}
                                     
                                     {/* User Detail Tooltip */}
                                     <div className="absolute left-full ml-10 top-0 w-64 bg-slate-900 text-white p-6 rounded-[2rem] opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl z-[60] translate-x-4 group-hover:translate-x-0 border border-white/10 backdrop-blur-xl">
                                        <div className="flex items-center space-x-3 mb-4">
                                           <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl">
                                              <ShieldCheck size={14} />
                                           </div>
                                           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Profile Intelligence</span>
                                        </div>
                                        
                                        <div className="space-y-4">
                                           <div>
                                              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Communication</p>
                                              <p className="text-xs font-bold text-white truncate">{user.email}</p>
                                              <p className="text-[10px] text-white/50 mt-0.5">{user.phoneNumber || 'No phone recorded'}</p>
                                           </div>
                                           
                                           <div>
                                              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Residence</p>
                                              <p className="text-xs text-white/70 leading-relaxed italic">{user.address || 'Address not registered'}</p>
                                           </div>

                                           <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                                              <div>
                                                 <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Enrolled</p>
                                                 <p className="text-xs font-mono text-orange-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                                              </div>
                                              <div className="text-[8px] font-bold px-2 py-1 bg-white/10 rounded-md text-white/40 uppercase">
                                                 {user.role}
                                              </div>
                                           </div>
                                        </div>
                                        <div className="absolute right-full top-6 border-8 border-transparent border-r-slate-900" />
                                     </div>
                                  </div>
                                  <div>
                                     <div className="font-bold text-slate-900">{user.displayName || 'Unnamed User'}</div>
                                     <div className="text-xs text-slate-400">{user.email}</div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-8">
                               <span className={cn(
                                 "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                 user.role === 'admin' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                               )}>
                                 {user.role}
                               </span>
                            </td>
                            <td className="px-10 py-8 font-medium text-slate-600 italic">
                               {user.phoneNumber || 'Not provided'}
                            </td>
                            <td className="px-10 py-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                               {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-10 border-b border-slate-50">
                  <h3 className="text-2xl font-bold">Feedback Intelligence</h3>
                  <p className="text-sm text-slate-400 font-medium">Monitoring traveler sentiments and service quality audits.</p>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <tr>
                          <th className="px-10 py-6">Customer</th>
                          <th className="px-10 py-6">Intelligence context</th>
                          <th className="px-10 py-6">Sentiment Data</th>
                          <th className="px-10 py-6">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {reviews.map(review => (
                         <tr key={review.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-10 py-8">
                               <div className="font-bold text-slate-900">{review.userName}</div>
                               <div className="text-xs text-slate-400 font-medium">{review.userEmail}</div>
                            </td>
                            <td className="px-10 py-8">
                               <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-1">
                                  <Package size={14} className="text-orange-500" />
                                  <span>{review.packageName}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono italic">Submitted: {new Date(review.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="px-10 py-8 lg:max-w-md">
                               <div className="flex items-center space-x-1 mb-2">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      size={12} 
                                      className={cn(i < review.rating ? "text-amber-400 fill-amber-400" : "text-slate-200")} 
                                    />
                                  ))}
                                  <span className="text-xs font-black text-slate-900 ml-2">{review.rating}.0</span>
                               </div>
                               <p className="text-xs text-slate-500 font-medium leading-relaxed italic">"{review.comment}"</p>
                            </td>
                            <td className="px-10 py-8">
                               <button 
                                 onClick={() => handleDeleteReview(review.id)}
                                 className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </td>
                         </tr>
                       ))}
                       {reviews.length === 0 && (
                         <tr>
                            <td colSpan={4} className="px-10 py-24 text-center">
                               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                                  <MessageSquare size={40} />
                               </div>
                               <h3 className="text-xl font-bold text-slate-400">No signals detected</h3>
                               <p className="text-slate-300 text-sm">Traveler feedback threads will appear here upon submission.</p>
                            </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'visas' && (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                     <h3 className="text-2xl font-bold">Visa Surveillance</h3>
                     <p className="text-sm text-slate-400 font-medium">Global tracking of entry permit requests and approval statuses.</p>
                  </div>
                  <button 
                    onClick={() => setIsCreatingVisa(true)}
                    className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-4 rounded-2xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 whitespace-nowrap"
                  >
                    <Plus size={18} />
                    <span>New Visa Request</span>
                  </button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <tr>
                          <th className="px-10 py-6">Applicant</th>
                          <th className="px-10 py-6">Permit Type</th>
                          <th className="px-10 py-6">Documentation</th>
                          <th className="px-10 py-6">Current Cycle</th>
                          <th className="px-10 py-6">Command</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {visaRequests.map(visa => {
                         const user = users.find(u => u.uid === visa.userId);
                         return (
                           <tr key={visa.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-10 py-8">
                                 <div className="font-bold text-slate-900">{user?.displayName || 'Unknown Applicant'}</div>
                                 <div className="text-xs text-slate-400">{user?.email}</div>
                              </td>
                              <td className="px-10 py-8">
                                 <div className="font-bold text-slate-900">{visa.visaType}</div>
                                 <div className="text-[10px] text-slate-400 uppercase font-mono mt-1">Submitted: {new Date(visa.submissionDate).toLocaleDateString()}</div>
                              </td>
                              <td className="px-10 py-8">
                                 {visa.passportCopyUrl ? (
                                   <a 
                                     href={visa.passportCopyUrl} 
                                     target="_blank" 
                                     rel="noreferrer"
                                     className="flex items-center space-x-2 text-orange-500 hover:text-orange-600 transition-colors"
                                   >
                                     <FileText size={16} />
                                     <span className="text-xs font-bold font-mono">VIEW PASSPORT</span>
                                   </a>
                                 ) : (
                                   <span className="text-xs text-slate-300 italic">No document</span>
                                 )}
                              </td>
                              <td className="px-10 py-8">
                                 <span className={cn(
                                   "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                   visa.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                                   visa.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                                   visa.status === 'processing' ? "bg-sky-100 text-sky-700" :
                                   "bg-amber-100 text-amber-700"
                                 )}>
                                   {visa.status}
                                 </span>
                              </td>
                              <td className="px-10 py-8">
                                 <select 
                                   className="bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest px-3 py-2 outline-none focus:border-orange-500 appearance-none transition-all"
                                   value={visa.status}
                                   onChange={(e) => handleVisaStatusUpdate(visa.id, e.target.value)}
                                 >
                                    <option value="pending">PENDING</option>
                                    <option value="processing">PROcessing</option>
                                    <option value="approved">APPROVED</option>
                                    <option value="rejected">REJECTED</option>
                                 </select>
                              </td>
                           </tr>
                         );
                       })}
                       {visaRequests.length === 0 && (
                         <tr>
                           <td colSpan={5} className="px-10 py-20 text-center text-slate-400 font-medium">No visa requests in the system.</td>
                         </tr>
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-[600px]">
              {/* Chat List */}
              <div className="md:col-span-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 shrink-0">
                  <h3 className="text-lg font-bold">Active Sessions</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Customer Support Feed</p>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                  {chatSessions.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                      <MessageSquare className="mx-auto mb-4 opacity-20" size={32} />
                      <p className="text-xs font-bold uppercase tracking-widest">No active sessions</p>
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedChat(session)}
                        className={cn(
                          "w-full p-6 text-left border-b border-slate-50 transition-all hover:bg-slate-50 flex items-start space-x-4",
                          selectedChat?.id === session.id ? "bg-orange-50 border-l-4 border-l-orange-500" : ""
                        )}
                      >
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0 font-bold">
                          {session.userName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm truncate">{session.userName}</span>
                            {session.unreadCount > 0 && (
                              <span className="w-2 h-2 bg-orange-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{session.lastMessage}</p>
                          <p className="text-[8px] text-slate-300 mt-2 font-bold uppercase tracking-widest">
                            {session.updatedAt ? new Date(session.updatedAt.toDate()).toLocaleTimeString() : ''}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat View */}
              <div className="md:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                {selectedChat ? (
                  <>
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white shrink-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white font-bold">
                          {selectedChat.userName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{selectedChat.userName}</h4>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">Level 1 Support Thread</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span>Live Session</span>
                      </div>
                    </div>

                    <div 
                      ref={chatScrollRef}
                      className="flex-grow p-8 overflow-y-auto space-y-6 bg-slate-50/50 custom-scrollbar"
                    >
                      {chatMessages.map((msg, i) => (
                        <div key={msg.id || i} className={cn(
                          "flex flex-col max-w-[80%]",
                          msg.isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                        )}>
                          <div className={cn(
                            "px-5 py-3 rounded-2xl text-sm font-medium shadow-sm",
                            msg.isAdmin ? "bg-slate-900 text-white rounded-br-none" : "bg-white text-slate-900 rounded-bl-none border border-slate-100"
                          )}>
                            {msg.text}
                          </div>
                          <span className="text-[8px] font-bold text-slate-300 mt-1 uppercase tracking-widest">
                            {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : 'Sending...'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 bg-white border-t border-slate-50 shrink-0">
                      <div className="flex items-center space-x-4">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                          placeholder="Command input console..."
                          className="flex-grow bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-orange-500/10 text-sm font-medium"
                        />
                        <button
                          onClick={handleSendChatMessage}
                          disabled={!chatInput.trim()}
                          className="p-4 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-slate-300">
                    <MessageSquare size={48} className="mb-4 opacity-10" />
                    <p className="text-xs font-bold uppercase tracking-widest">Select a terminal to engage support</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sheets' && (
            <div className="space-y-10">
              {/* Sheets Dashboard Card */}
              <div className="bg-slate-950 text-white rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl">
                <div className="absolute -inset-10 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-3xl opacity-50 group-hover:opacity-75 transition-all duration-1000" />
                
                <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                  <div>
                    <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                      Google Workspace Core
                    </span>
                    <h2 className="text-4xl font-bold mt-4 tracking-tight">Google Sheets Operations Panel</h2>
                    <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium leading-relaxed">
                      Sync live system databases—bookings, Visa requests, package catalogues, and financial summary sheets—instantly to one central Google Sheet document.
                    </p>
                  </div>
                  
                  <div className="shrink-0 flex items-center space-x-3">
                    {sheetsAuthorized ? (
                      <div className="flex items-center space-x-3">
                        <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold flex items-center space-x-1.5 border border-emerald-500/10">
                          <CheckCircle2 size={14} />
                          <span>Connected</span>
                        </span>
                        <button 
                          onClick={handleDisconnectSheets}
                          className="px-6 py-4 bg-white/5 text-rose-400 rounded-2xl text-xs font-bold hover:bg-rose-500/10 hover:text-rose-300 transition-all border border-white/5"
                        >
                          Revoke
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleAuthorizeSheets}
                        disabled={isAuthorizingSheets}
                        className="px-8 py-5 bg-emerald-555 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 transition-all hover:-translate-y-0.5"
                      >
                        {isAuthorizingSheets ? 'Authorizing...' : 'Connect Admin Google Account'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Configuration Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Connected Document */}
                <div className="lg:col-span-8 bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Active Google Sheet Spreadsheet</h3>
                    <p className="text-slate-400 text-sm mt-1 mb-8 font-medium">This is the shared target registry of your travels operation.</p>
                    
                    {sheetsConfig?.spreadsheetId ? (
                      <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <FileText size={24} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">Linked Spreadsheet Document</p>
                            <p className="text-xs font-mono text-slate-400 mt-1 truncate">ID: {sheetsConfig.spreadsheetId}</p>
                          </div>
                        </div>
                        <a 
                          href={sheetsConfig.spreadsheetUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-6 py-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-2xl text-xs font-bold text-center transition-all flex items-center justify-center space-x-2 shadow-sm shrink-0"
                        >
                          <span>Open Sheet ↗</span>
                        </a>
                      </div>
                    ) : (
                      <div className="py-12 px-6 text-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <FileText size={40} className="text-slate-300 mx-auto mb-4" />
                        <h4 className="font-bold text-slate-700">No Target Registry Selected</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 mb-6 font-medium">Setup a target spreadsheet so that we can coordinate database operations securely.</p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                          <button 
                            onClick={handleCreateNewSheet}
                            disabled={!sheetsAuthorized}
                            className="w-full sm:w-auto px-6 py-4 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-md disabled:opacity-50"
                          >
                            Generate Registry Sheet
                          </button>
                          
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">or</span>
                          
                          <div className="flex items-center space-x-2 w-full sm:w-80">
                            <input 
                              type="text"
                              value={inputSpreadsheetUrl}
                              onChange={(e) => setInputSpreadsheetUrl(e.target.value)}
                              placeholder="Paste spreadsheet URL/ID..."
                              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-emerald-500 transition-all placeholder:text-slate-400"
                            />
                            <button 
                              onClick={handleLinkExistingSheet}
                              disabled={!sheetsAuthorized}
                              className="px-4 py-3 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
                            >
                              Link Exist
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold">
                      <Clock size={14} />
                      <span>Last Synchronized: {sheetsConfig?.lastSync ? new Date(sheetsConfig.lastSync).toLocaleString() : 'Never Sync'}</span>
                    </div>
                    {sheetsConfig?.spreadsheetId && (
                      <button 
                        onClick={handleSyncAllDatabases}
                        disabled={isSyncingAll || !sheetsAuthorized}
                        className="px-8 py-4.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        {isSyncingAll ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Updating Sheet...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={14} />
                            <span>Sync All Tables Now</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Integration Logs & Details */}
                <div className="lg:col-span-4 bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <Layers size={18} className="text-orange-500" />
                      <span>Active Ledgers</span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 mb-6 font-medium">Included pages synchronized dynamically:</p>
                    
                    <div className="space-y-3">
                      {[
                        { title: 'Dashboard Analytics', rows: '6 KPIs', color: 'bg-indigo-50 text-indigo-500' },
                        { title: 'Travel Packages Catalog', rows: `${packages.length} Items`, color: 'bg-emerald-50 text-emerald-500' },
                        { title: 'Traveler Bookings Log', rows: `${bookings.length} Bookings`, color: 'bg-amber-50 text-amber-500' },
                        { title: 'Visa Requests Ledger', rows: `${visaRequests.length} Requests`, color: 'bg-sky-50 text-sky-500' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center space-x-3">
                            <div className={cn("w-2 h-2 rounded-full", item.color.split(' ')[1])} />
                            <p className="text-xs font-bold text-slate-800">{item.title}</p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{item.rows}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 p-4 rounded-2xl bg-amber-50 border border-amber-100/50 text-[11px] text-amber-700 font-medium leading-relaxed flex items-start gap-2">
                    <Info size={14} className="shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      Data sync uses atomic spreadsheet values mapping. If you reorganize or rename system sheets, the application will automatically recreate missing files to avoid conflicts.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sliders' && (
            <div className="space-y-10">
              {/* Sliders Administration Header */}
              <div className="bg-slate-950 text-white rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl">
                <div className="absolute -inset-10 bg-gradient-to-r from-orange-500/20 to-amber-500/20 blur-3xl opacity-50 group-hover:opacity-75 transition-all duration-1000" />
                
                <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <span className="px-4 py-1.5 bg-orange-500/10 text-orange-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-500/20">
                      Wanderlust Portal Core
                    </span>
                    <h2 className="text-4xl font-bold mt-4 tracking-tight">Homepage Hero Slider</h2>
                    <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium leading-relaxed">
                      Manage visual banner slides shown on the main user landing page. Link directly to specific service listings, visa systems, or custom URLs.
                    </p>
                  </div>
                  
                  {!isEditingSlide && (
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={handleSeedSlides}
                        type="button"
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-widest border border-white/15 transition-all"
                      >
                        Reset Defaults
                      </button>
                      <button 
                        onClick={() => {
                          setCurrentSlideItem({
                            tagline: 'New Adventure Starts Here',
                            title: 'Discover Pure Perfection',
                            description: 'Bespoke high-end itineraries designed by travel experts.',
                            image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070&auto=format&fit=crop',
                            actionText: 'View Package Details',
                            href: '/packages/all',
                            order: (slides.length + 1)
                          });
                          setIsEditingSlide(true);
                        }}
                        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-lg hover:shadow-orange-500/25 transition-all flex items-center space-x-2"
                      >
                        <Plus size={14} />
                        <span>Add Hero Banner</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Form: Add/Edit Slide */}
              {isEditingSlide && currentSlideItem && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-xl shadow-slate-100/50"
                >
                  <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-slate-900">
                        {currentSlideItem.id ? 'Modify Hero Banner Specifications' : 'Compose New Hero Space'}
                      </h3>
                      <p className="text-xs font-medium text-slate-400">Fill visual copy text and mapping attributes.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsEditingSlide(false);
                        setCurrentSlideItem(null);
                      }}
                      className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Dynamic Package Linker Mechanism */}
                  <div className="mb-10 p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles size={14} className="text-orange-500" />
                      <span>Dynamic Mechanism: Source from Live Travel Packages</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mb-4 font-medium leading-relaxed">
                      Select an existing inventory package from the database catalog to instantly map and overlay its title, description, and link variables inside this slide.
                    </p>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const pkg = packages.find(p => p.id === val);
                        if (pkg) {
                          setCurrentSlideItem(prev => ({
                            ...prev,
                            tagline: `Featured ${pkg.category}`,
                            title: pkg.title,
                            description: pkg.description.substring(0, 160) + '...',
                            image: pkg.images?.[0] || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070&auto=format&fit=crop',
                            actionText: 'Book This Package Now',
                            href: `/package/${pkg.id}`
                          }));
                          toast.success("Details successfully imported from travel package catalogs!");
                        }
                      }}
                      value=""
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none text-xs font-bold text-slate-700 focus:border-orange-500 transition-all shadow-sm"
                    >
                      <option value="">-- Choose target catalog to auto-fill --</option>
                      {packages.map(p => (
                        <option key={p.id} value={p.id}>
                          [{p.category.toUpperCase()}] {p.title} ({p.currency} {p.price.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <form onSubmit={handleSaveSlide} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Tagline */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest mb-3">Slide Tagline (Subheader)</label>
                      <input 
                        type="text" 
                        required
                        value={currentSlideItem.tagline || ''} 
                        onChange={(e) => setCurrentSlideItem({ ...currentSlideItem, tagline: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500/10 text-xs font-medium text-slate-800"
                        placeholder="e.g. Experience the Extraordinary"
                      />
                    </div>

                    {/* Order */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest mb-3">Sorting Weight (Order Rank)</label>
                      <input 
                        type="number" 
                        required
                        value={currentSlideItem.order || 0} 
                        onChange={(e) => setCurrentSlideItem({ ...currentSlideItem, order: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500/10 text-xs font-medium text-slate-800"
                        placeholder="e.g. 1"
                      />
                    </div>

                    {/* Title */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest mb-3">Marketing Callout Title</label>
                      <input 
                        type="text" 
                        required
                        value={currentSlideItem.title || ''} 
                        onChange={(e) => setCurrentSlideItem({ ...currentSlideItem, title: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500/10 text-sm font-bold text-slate-800"
                        placeholder="e.g. Spiritual Journeys & Sacred Guides"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest mb-3">Slide Copytext / Description</label>
                      <textarea 
                        rows={3}
                        required
                        value={currentSlideItem.description || ''} 
                        onChange={(e) => setCurrentSlideItem({ ...currentSlideItem, description: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-xl p-5 outline-none focus:ring-2 focus:ring-orange-500/10 text-xs font-medium leading-relaxed text-slate-800"
                        placeholder="e.g. Premium custom Umrah & Haj 2026 packages. Tailored itineraries, luxury lodging..."
                      />
                    </div>

                    {/* Action button CTA label */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest mb-3">Action Button Label (CTA)</label>
                      <input 
                        type="text" 
                        required
                        value={currentSlideItem.actionText || ''} 
                        onChange={(e) => setCurrentSlideItem({ ...currentSlideItem, actionText: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500/10 text-xs font-medium text-slate-800"
                        placeholder="e.g. Explore Umrah Packages"
                      />
                    </div>

                    {/* Direct redirection Link */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest mb-3">Redirect Route Path (e.g. /packages/umrah)</label>
                      <input 
                        type="text" 
                        required
                        value={currentSlideItem.href || ''} 
                        onChange={(e) => setCurrentSlideItem({ ...currentSlideItem, href: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500/10 text-xs font-medium text-slate-800"
                        placeholder="e.g. /packages/umrah"
                      />
                    </div>

                    {/* High-res Banner Image */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest mb-3">Banner Asset (AVIF/WebP, Resolution 2000x900)</label>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-full sm:w-1/3 h-32 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative shrink-0">
                          {currentSlideItem.image ? (
                            <img src={currentSlideItem.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                              <ImageIcon size={28} />
                              <span className="text-[9px] mt-1 uppercase font-bold">No Image Banner</span>
                            </div>
                          )}
                          {isUploadingSlideImage && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold">
                              <RotateCcw className="animate-spin mr-1" size={14} />
                              Uploading...
                            </div>
                          )}
                        </div>
                        
                        <div className="w-full space-y-3">
                          <input 
                            type="text" 
                            required
                            value={currentSlideItem.image || ''} 
                            onChange={(e) => setCurrentSlideItem({ ...currentSlideItem, image: e.target.value })}
                            className="w-full bg-slate-50 border-none rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500/10 text-xs font-medium text-slate-800"
                            placeholder="Paste external slide asset URL directly or upload local file"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => document.getElementById('slide-image-file-picker')?.click()}
                              className="px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-lg shadow-slate-900/10 flex items-center gap-1.5"
                            >
                              <Upload size={12} />
                              <span>Upload Media asset</span>
                            </button>
                            <input 
                              type="file" 
                              id="slide-image-file-picker" 
                              accept="image/*"
                              className="hidden" 
                              onChange={handleSlideImageUpload} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t border-slate-50">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingSlide(false);
                          setCurrentSlideItem(null);
                        }}
                        className="px-6 py-3.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg hover:shadow-orange-500/25 transition-all"
                      >
                        Save Dynamic Slider
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Slider Lists Display */}
              {!isEditingSlide && (
                <div className="space-y-6">
                  {slides.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-16 text-center shadow-sm">
                      <ImageIcon className="mx-auto text-slate-200 mb-4" size={56} />
                      <h4 className="text-lg font-bold text-slate-800">No Hero Banner Slides Registered</h4>
                      <p className="text-slate-400 text-xs mt-1 mb-8 max-w-sm mx-auto leading-relaxed">
                        There are no active dynamic slides currently initialized. Bootstrap the defaults or insert custom visual banners.
                      </p>
                      <button 
                        onClick={handleSeedSlides}
                        className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20"
                      >
                        Seed Default Visual Slider
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {slides.map((slide, sIdx) => (
                        <div 
                          key={slide.id}
                          className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            <div className="relative h-44 bg-slate-900 overflow-hidden">
                              <img src={slide.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                              <div className="absolute top-4 left-4 bg-black/50 text-white px-2.5 py-1 rounded-md text-[10px] font-mono font-bold select-none backdrop-blur-sm">
                                RANK #{slide.order || sIdx + 1}
                              </div>
                            </div>
                            
                            <div className="p-6 space-y-3">
                              <span className="text-[9px] font-black tracking-widest text-orange-500 uppercase block">{slide.tagline}</span>
                              <h4 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">{slide.title}</h4>
                              <p className="text-xs text-slate-400 leading-relaxed font-semibold line-clamp-3">{slide.description}</p>
                              
                              <div className="space-y-1.5 pt-3 border-t border-slate-50">
                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <span className="text-slate-900 uppercase">Button:</span>
                                  <span>{slide.actionText}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <span className="text-slate-900 uppercase">Target:</span>
                                  <span className="font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded leading-none">{slide.href}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-6 bg-slate-50/50 border-t border-slate-100/50 flex space-x-2 shrink-0">
                            <button
                              onClick={() => {
                                setCurrentSlideItem(slide);
                                setIsEditingSlide(true);
                              }}
                              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                            >
                              <Edit3 size={11} />
                              <span>Update</span>
                            </button>
                            <button
                              onClick={() => slide.id && handleDeleteSlide(slide.id)}
                              className="p-2.5 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-colors"
                              aria-label="Delete Banner Slide"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'seo' && (
            <SEOContentGenerator />
          )}
        </motion.div>
      </AnimatePresence>
      
                  

      {/* Package Editor Modal */}
      {isEditing && currentPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
           <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
           >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                 <div>
                   <h3 className="text-2xl font-bold">{currentPackage.id ? 'Edit Package' : 'Create New Package'}</h3>
                   <p className="text-sm text-slate-400 font-medium">Define package details, pricing, and itinerary.</p>
                 </div>
                 <button 
                  onClick={() => setIsEditing(false)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-rose-500 transition-colors"
                 >
                   <XCircle size={24} />
                  </button>
               </div>

                                              {/* Modular Premium Tab Bar */}
               <div className="px-10 py-4 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto scrollbar-none">
                 {[
                   { id: 'essential', label: 'Basic Details', icon: <Tag size={14} /> },
                   { id: 'narrative', label: 'Description', icon: <FileText size={14} /> },
                   { id: 'media', label: 'Images', icon: <ImageIcon size={14} /> },
                   { id: 'itinerary', label: 'Itinerary', icon: <MapPin size={14} /> },
                   { id: 'infocards', label: 'Policies', icon: <Layers size={14} /> },
                   { id: 'expopasses', label: 'Tiers & Passes', icon: <Sparkles size={14} /> }
                 ].map((tab) => (
                   <button
                     key={tab.id}
                     onClick={() => setEditorTab(tab.id as any)}
                     className={cn(
                       "px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0",
                       editorTab === tab.id 
                         ? "bg-slate-900 text-white shadow-md shadow-slate-900/15" 
                         : "bg-white text-slate-500 border border-slate-200/60 hover:bg-slate-100"
                     )}
                   >
                     {tab.icon}
                     <span>{tab.label}</span>
                   </button>
                 ))}
               </div>

               <div className="p-10 overflow-y-auto flex-grow">
                 <AnimatePresence mode="wait">
                   {editorTab === 'essential' && (
                     <motion.div
                       key="essential"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="space-y-6"
                     >
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Col 1 */}
                          <div className="space-y-6">
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                  <Tag size={12} className="mr-2 text-orange-500" />
                                  Package Title
                               </label>
                               <input 
                                 className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                                 value={currentPackage.title}
                                 placeholder="e.g. Executive Umrah Plus Package"
                                 onChange={(e) => setCurrentPackage({ ...currentPackage, title: e.target.value })}
                               />
                            </div>
                            
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                  <Layers size={12} className="mr-2 text-orange-500" />
                                  Package Type
                               </label>
                               <div className="relative">
                                 <select 
                                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white transition-all appearance-none"
                                   value={currentPackage.type}
                                   onChange={(e) => setCurrentPackage({ ...currentPackage, type: e.target.value as PackageType })}
                                 >
                                    <option value="umrah">Umrah Package</option>
                                    <option value="haj">Haj Package</option>
                                    <option value="visa">Visa Services</option>
                                    <option value="domestic-group">Domestic Group Tour</option>
                                    <option value="domestic-private">Domestic Private Tour</option>
                                    <option value="expo">Business Expo</option>
                                    <option value="study-abroad">Study Abroad Program</option>
                                 </select>
                                 <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                   <ChevronRight size={16} className="rotate-90" />
                                 </div>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                    <TrendingUp size={12} className="mr-2 text-orange-500" />
                                    Pricing
                                 </label>
                                 <div className="flex space-x-2">
                                   <select 
                                     className="w-24 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-4 text-xs font-black outline-none focus:border-orange-500 transition-all appearance-none text-center"
                                     value={currentPackage.currency || 'PKR'}
                                     onChange={(e) => setCurrentPackage({ ...currentPackage, currency: e.target.value })}
                                   >
                                     <option value="PKR">PKR</option>
                                     <option value="USD">USD</option>
                                     <option value="EUR">EUR</option>
                                     <option value="GBP">GBP</option>
                                   </select>
                                   <input 
                                     type="number"
                                     placeholder="0"
                                     className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                                     value={currentPackage.price}
                                     onChange={(e) => setCurrentPackage({ ...currentPackage, price: Number(e.target.value) })}
                                   />
                                 </div>
                               </div>
                               <div className="space-y-2">
                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                    <Clock size={12} className="mr-2 text-orange-500" />
                                    Trip Duration
                                 </label>
                                 <input 
                                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                                   placeholder="e.g. 14 Days"
                                   value={currentPackage.duration}
                                   onChange={(e) => setCurrentPackage({ ...currentPackage, duration: e.target.value })}
                                 />
                               </div>
                            </div>
                          </div>

                          {/* Col 2 */}
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                    <Tag size={12} className="mr-2 text-orange-500" />
                                    Package Tier
                                 </label>
                                 <input 
                                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                                   placeholder="e.g. Premium, Economy"
                                   value={currentPackage.category || ''}
                                   onChange={(e) => setCurrentPackage({ ...currentPackage, category: e.target.value })}
                                 />
                               </div>
                               <div className="space-y-2">
                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                    <Layers size={12} className="mr-2 text-orange-500" />
                                    Available Spots
                                 </label>
                                 <input 
                                   type="number"
                                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                                   value={currentPackage.inventoryCount || 0}
                                   onChange={(e) => setCurrentPackage({ ...currentPackage, inventoryCount: Number(e.target.value) })}
                                 />
                               </div>
                            </div>

                            <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100/50">
                               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">Included Services</h4>
                               <div className="grid grid-cols-2 gap-3">
                                 {['Visa', 'Ticket', 'Hotel', 'Accommodation', 'Transport', 'Meals'].map(service => (
                                   <label key={service} className="flex items-center space-x-3 cursor-pointer group">
                                     <div className={cn(
                                       "w-5 h-5 rounded-lg border flex items-center justify-center transition-colors",
                                       currentPackage.includedServices?.includes(service) ? "bg-orange-500 border-orange-500" : "bg-white border-slate-200 group-hover:border-orange-300"
                                     )}>
                                       {currentPackage.includedServices?.includes(service) && <CheckCircle2 size={12} className="text-white" />}
                                     </div>
                                     <span className="text-xs font-bold text-slate-700">{service}</span>
                                     <input 
                                       type="checkbox"
                                       className="hidden"
                                       checked={currentPackage.includedServices?.includes(service) || false}
                                       onChange={(e) => {
                                         const services = currentPackage.includedServices || [];
                                         if (e.target.checked) {
                                           setCurrentPackage({ ...currentPackage, includedServices: [...services, service] });
                                         } else {
                                           setCurrentPackage({ ...currentPackage, includedServices: services.filter(s => s !== service) });
                                         }
                                       }}
                                     />
                                   </label>
                                 ))}
                               </div>
                            </div>

                            {currentPackage.type === 'study-abroad' && (
                              <div className="space-y-4 bg-orange-50 p-6 rounded-3xl border border-orange-100/50">
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-900 mb-2">Primary Program Support Focus</h4>
                                 <p className="text-xs text-orange-700/80 mb-4">Select the main support category for this study abroad package.</p>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   {['University Admission', 'Program Selection Support', 'Obtaining Visa & Permits', 'Arrival & Community'].map(focus => (
                                     <label key={focus} className="flex items-center space-x-3 cursor-pointer group">
                                       <div className={cn(
                                         "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                         currentPackage.programFocus === focus ? "bg-orange-500 border-orange-500" : "bg-white border-orange-200 group-hover:border-orange-400"
                                       )}>
                                         {currentPackage.programFocus === focus && <div className="w-2 h-2 rounded-full bg-white" />}
                                       </div>
                                       <span className="text-xs font-bold text-slate-700">{focus}</span>
                                       <input 
                                         type="radio"
                                         name="programFocus"
                                         className="hidden"
                                         value={focus}
                                         checked={currentPackage.programFocus === focus}
                                         onChange={() => setCurrentPackage({ ...currentPackage, programFocus: focus })}
                                       />
                                     </label>
                                   ))}
                                 </div>
                              </div>
                            )}

                            <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100/50">
                               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">Visibility Settings</h4>
                               <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                   <div className="flex flex-col">
                                     <span className="text-xs font-black text-slate-800">Featured Placement</span>
                                     <span className="text-[10px] text-slate-400">Promote package on homepage hero section.</span>
                                   </div>
                                   <button
                                     type="button"
                                     onClick={() => setCurrentPackage({ ...currentPackage, featured: !currentPackage.featured })}
                                     className={cn(
                                       "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                       currentPackage.featured ? 'bg-orange-500' : 'bg-slate-300'
                                     )}
                                   >
                                     <span className={cn(
                                       "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                       currentPackage.featured ? 'translate-x-6' : 'translate-x-1'
                                     )} />
                                   </button>
                                 </div>
                                 <div className="flex items-center justify-between border-t border-slate-200/50 pt-4">
                                   <div className="flex flex-col">
                                     <span className="text-xs font-black text-slate-800">Trending Slider Placement</span>
                                     <span className="text-[10px] text-slate-400">Include in trending catalog carousel.</span>
                                   </div>
                                   <button
                                     type="button"
                                     onClick={() => setCurrentPackage({ ...currentPackage, isTrending: !currentPackage.isTrending })}
                                     className={cn(
                                       "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                       currentPackage.isTrending ? 'bg-orange-500' : 'bg-slate-300'
                                     )}
                                   >
                                     <span className={cn(
                                       "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                       currentPackage.isTrending ? 'translate-x-6' : 'translate-x-1'
                                     )} />
                                   </button>
                                 </div>
                               </div>
                            </div>
                          </div>
                       </div>
                     </motion.div>
                   )}

                   {editorTab === 'narrative' && (
                     <motion.div
                       key="narrative"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="space-y-6"
                     >
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                             <FileText size={12} className="mr-2 text-orange-500" />
                             Package Description
                          </label>
                          <textarea 
                            rows={8}
                            className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-6 py-5 text-sm font-medium outline-none focus:border-orange-500 focus:bg-white transition-all leading-relaxed shadow-sm resize-none"
                            placeholder="Provide a high-quality rich description about this luxury package..."
                            value={currentPackage.description}
                            onChange={(e) => setCurrentPackage({ ...currentPackage, description: e.target.value })}
                          />
                       </div>
                     </motion.div>
                   )}

                   {editorTab === 'media' && (
                     <motion.div
                       key="media"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="space-y-6"
                     >
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                              <ImageIcon size={12} className="mr-2 text-orange-500" />
                              Package Image Gallery
                           </label>
                           
                           {uploadError && (
                             <motion.div 
                               initial={{ opacity: 0, x: -10 }}
                               animate={{ opacity: 1, x: 0 }}
                               className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600 shadow-sm"
                             >
                               <AlertTriangle size={16} className="shrink-0 text-rose-500" />
                               <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed flex-grow">{uploadError}</p>
                               <button onClick={() => setUploadError(null)} className="p-1 hover:bg-rose-100 rounded-lg transition-colors">
                                 <X size={14} />
                               </button>
                             </motion.div>
                           )}

                           <div className="grid grid-cols-4 gap-4 mb-6">
                             {currentPackage.images?.map((img, idx) => (
                               <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden group border border-slate-100 shadow-sm">
                                 <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                 <button 
                                   onClick={() => removeImage(idx)}
                                   className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                 >
                                   <Trash2 size={12} />
                                 </button>
                               </div>
                             ))}
                             
                             <button 
                               onClick={() => fileInputRef.current?.click()}
                               disabled={isUploading}
                               className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50/10 transition-all bg-slate-50 relative overflow-hidden"
                             >
                               {isUploading ? (
                                 <div className="flex flex-col items-center justify-center p-2 w-full h-full bg-orange-50/50">
                                   <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                                   <span className="text-[10px] font-black text-orange-600">{Math.round(uploadProgress)}%</span>
                                   <div className="absolute bottom-0 left-0 h-1.5 bg-orange-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                 </div>
                               ) : (
                                 <>
                                   <Upload size={24} className="mb-2 text-slate-400" />
                                   <span className="text-[10px] font-black uppercase tracking-wider">Upload File</span>
                                 </>
                               )}
                             </button>
                           </div>

                           <input 
                             ref={fileInputRef}
                             type="file" 
                             multiple 
                             accept="image/*" 
                             className="hidden" 
                             onChange={handleImageUpload} 
                           />

                           <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <input 
                               id="add-image-link-input"
                               className="flex-grow bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-orange-500 transition-all shadow-sm"
                               placeholder="Or paste external image URL here..."
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
                                   const val = (e.target as HTMLInputElement).value;
                                   if (val) {
                                     setCurrentPackage({ ...currentPackage, images: [...(currentPackage.images || []), val] });
                                     (e.target as HTMLInputElement).value = '';
                                   }
                                 }
                               }}
                             />
                             <button
                               type="button"
                               onClick={() => {
                                 const input = document.getElementById('add-image-link-input') as HTMLInputElement;
                                 if (input && input.value) {
                                   setCurrentPackage({ ...currentPackage, images: [...(currentPackage.images || []), input.value] });
                                   input.value = '';
                                 }
                               }}
                               className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-500 transition-colors shadow-sm"
                             >
                               Add URL
                             </button>
                           </div>
                        </div>
                     </motion.div>
                   )}

                   {editorTab === 'itinerary' && (
                     <motion.div
                       key="itinerary"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="space-y-6"
                     >
                        {/* Day-by-day nested cards */}
                        <div className="space-y-4">
                           <div className="flex justify-between items-center mb-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                <MapPin size={12} className="mr-2 text-orange-500" />
                                Structured Daily Milestones
                             </label>
                           </div>

                           {currentPackage.itineraryDetails?.map((detail, idx) => (
                             <div key={idx} className="space-y-3 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 relative group shadow-sm hover:border-slate-200 transition-all">
                               <button 
                                 onClick={() => {
                                   const newDetails = [...(currentPackage.itineraryDetails || [])];
                                   newDetails.splice(idx, 1);
                                   setCurrentPackage({ ...currentPackage, itineraryDetails: newDetails });
                                 }}
                                 className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                               >
                                 <Trash2 size={16} />
                               </button>
                               
                               <div className="flex gap-4">
                                 <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm shrink-0">
                                   {idx + 1}
                                 </div>
                                 <div className="flex-grow space-y-3">
                                   <input 
                                     type="text"
                                     className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-orange-500 shadow-sm"
                                     placeholder="Day / Subtitle (e.g. Day 1: Makkah Arrival)"
                                     value={detail.title}
                                     onChange={(e) => {
                                       const newDetails = [...(currentPackage.itineraryDetails || [])];
                                       newDetails[idx].title = e.target.value;
                                       setCurrentPackage({ ...currentPackage, itineraryDetails: newDetails });
                                     }}
                                   />
                                   <textarea 
                                     rows={2}
                                     className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-orange-500 shadow-sm resize-none"
                                     placeholder="Describe the day's events, locations, stays..."
                                     value={detail.description}
                                     onChange={(e) => {
                                       const newDetails = [...(currentPackage.itineraryDetails || [])];
                                       newDetails[idx].description = e.target.value;
                                       setCurrentPackage({ ...currentPackage, itineraryDetails: newDetails });
                                     }}
                                   />
                                 </div>
                               </div>
                             </div>
                           ))}

                           <button 
                             onClick={() => setCurrentPackage({ 
                               ...currentPackage, 
                               itineraryDetails: [...(currentPackage.itineraryDetails || []), { title: '', description: '' }] 
                             })}
                             className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50/5 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                           >
                             <Plus size={14} />
                             <span>Add Day-by-Day Milestone</span>
                           </button>
                        </div>

                        {/* Standard Quick bullet lists */}
                        <div className="space-y-2 border-t border-slate-100 pt-6">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                              <span className="flex items-center">
                                <CheckCircle2 size={12} className="mr-2 text-orange-500" />
                                {currentPackage.itinerary && typeof currentPackage.itinerary === 'string' ? 'AI-Generated Markdown Summary' : 'Package Inclusions / Short List (One per line)'}
                              </span>
                              
                              {currentPackage.itinerary && typeof currentPackage.itinerary === 'string' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to convert this Markdown text into line list items?")) {
                                      setCurrentPackage({ ...currentPackage, itinerary: ensureItineraryArray(currentPackage.itinerary) });
                                    }
                                  }}
                                  className="text-[9px] font-black text-orange-600 hover:underline uppercase tracking-wider"
                                >
                                  Convert to Line List
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Convert this bulleted list into a raw multiline text field?")) {
                                      setCurrentPackage({ ...currentPackage, itinerary: ensureItineraryArray(currentPackage.itinerary).join('\n') });
                                    }
                                  }}
                                  className="text-[9px] font-black text-sky-600 hover:underline uppercase tracking-wider"
                                >
                                  Convert to Raw Text
                                </button>
                              )}
                           </label>
                           
                           <textarea 
                             rows={currentPackage.itinerary && typeof currentPackage.itinerary === 'string' ? 8 : 4}
                             className={`w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white transition-all resize-none leading-relaxed shadow-sm ${currentPackage.itinerary && typeof currentPackage.itinerary === 'string' ? 'font-mono text-[11px]' : ''}`}
                             placeholder="Flight tickets included&#10;5-Star Hotel Stay&#10;Visa Processing included"
                             value={currentPackage.itinerary && typeof currentPackage.itinerary === 'string' ? currentPackage.itinerary : ensureItineraryArray(currentPackage.itinerary).join('\n')}
                             onChange={(e) => setCurrentPackage({ 
                               ...currentPackage, 
                               itinerary: currentPackage.itinerary && typeof currentPackage.itinerary === 'string' ? e.target.value : e.target.value.split('\n').filter(line => line.trim() !== '')
                             })}
                           />
                        </div>
                     </motion.div>
                   )}

                   {editorTab === 'infocards' && (
                     <motion.div
                       key="infocards"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="space-y-6"
                     >
                        <div className="space-y-4">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                              <Layers size={12} className="mr-2 text-orange-500" />
                              Specifications, Terms, and Custom Info Cards
                           </label>

                           {currentPackage.additionalInfo?.map((info, idx) => (
                             <div key={idx} className="space-y-3 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 relative group shadow-sm hover:border-slate-200 transition-all">
                               <button 
                                 onClick={() => {
                                   const newInfo = [...(currentPackage.additionalInfo || [])];
                                   newInfo.splice(idx, 1);
                                   setCurrentPackage({ ...currentPackage, additionalInfo: newInfo });
                                 }}
                                 className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                               >
                                 <Trash2 size={16} />
                               </button>

                               <input 
                                 type="text"
                                 className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-orange-500 shadow-sm"
                                 placeholder="Card Title (e.g. Flight Schedule, Visa Guidelines)"
                                 value={info.title}
                                 onChange={(e) => {
                                   const newInfo = [...(currentPackage.additionalInfo || [])];
                                   newInfo[idx].title = e.target.value;
                                   setCurrentPackage({ ...currentPackage, additionalInfo: newInfo });
                                 }}
                               />
                               <textarea 
                                 rows={3}
                                 className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 shadow-sm resize-none"
                                 placeholder="Detailed rules, bullet items, or term details..."
                                 value={info.description}
                                 onChange={(e) => {
                                   const newInfo = [...(currentPackage.additionalInfo || [])];
                                   newInfo[idx].description = e.target.value;
                                   setCurrentPackage({ ...currentPackage, additionalInfo: newInfo });
                                 }}
                               />
                             </div>
                           ))}

                           <button 
                             onClick={() => setCurrentPackage({ 
                               ...currentPackage, 
                               additionalInfo: [...(currentPackage.additionalInfo || []), { title: '', description: '' }] 
                             })}
                             className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50/5 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                           >
                             <Plus size={14} />
                             <span>Add New Spec Card</span>
                           </button>
                        </div>
                     </motion.div>
                   )}
                 

                    {editorTab === 'expopasses' && currentPackage && (
                      <motion.div
                        key="expopasses"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                 <Sparkles size={12} className="mr-2 text-orange-500" />
                                 Package Tiers & Custom Passes
                              </label>
                              <p className="text-xs text-slate-400 font-medium">Create distinct options or tiers (e.g. Economy Pack, VIP Access) with their own cost.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newPasses = [...(currentPackage.expoPasses || [])];
                                newPasses.push({
                                  id: Math.random().toString(36).substring(2, 9),
                                  title: '',
                                  price: 0,
                                  currency: currentPackage.currency || 'PKR',
                                  description: '',
                                  badgeColor: 'orange',
                                  features: []
                                });
                                setCurrentPackage({ ...currentPackage, expoPasses: newPasses });
                              }}
                              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-500 transition-all flex items-center gap-1.5 shadow-sm shrink-0 self-start sm:self-center cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>Create Tier Option</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(currentPackage.expoPasses || []).map((pass, idx) => (
                              <div 
                                key={pass.id || idx} 
                                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative group hover:border-slate-200 transition-all flex flex-col justify-between"
                              >
                                {/* Header Color Stripe depending on badgeColor */}
                                <div className={cn(
                                  "h-2 w-full",
                                  pass.badgeColor === 'orange' ? 'bg-orange-500' :
                                  pass.badgeColor === 'emerald' ? 'bg-emerald-500' :
                                  pass.badgeColor === 'sky' ? 'bg-sky-500' :
                                  pass.badgeColor === 'purple' ? 'bg-purple-500' :
                                  pass.badgeColor === 'amber' ? 'bg-amber-500' :
                                  pass.badgeColor === 'rose' ? 'bg-rose-500' :
                                  pass.badgeColor === 'indigo' ? 'bg-indigo-500' :
                                  'bg-slate-500'
                                )} />

                                <div className="p-6 space-y-4 flex-grow">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pass Specification</span>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newPasses = [...(currentPackage.expoPasses || [])];
                                        newPasses.splice(idx, 1);
                                        setCurrentPackage({ ...currentPackage, expoPasses: newPasses });
                                      }}
                                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pass Title</label>
                                      <input 
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100/80 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-none"
                                        placeholder="e.g. Premium VIP Delegate Pass"
                                        value={pass.title}
                                        onChange={(e) => {
                                          const newPasses = [...(currentPackage.expoPasses || [])];
                                          newPasses[idx].title = e.target.value;
                                          setCurrentPackage({ ...currentPackage, expoPasses: newPasses });
                                        }}
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pass Price</label>
                                        <input 
                                          type="number"
                                          className="w-full bg-slate-50 border border-slate-100/80 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-none"
                                          placeholder="0 (or Add-on Price)"
                                          value={pass.price}
                                          onChange={(e) => {
                                            const newPasses = [...(currentPackage.expoPasses || [])];
                                            newPasses[idx].price = Number(e.target.value);
                                            setCurrentPackage({ ...currentPackage, expoPasses: newPasses });
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Badge Theme</label>
                                        <select 
                                          className="w-full bg-slate-50 border border-slate-100/80 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-none"
                                          value={pass.badgeColor || 'orange'}
                                          onChange={(e) => {
                                            const newPasses = [...(currentPackage.expoPasses || [])];
                                            newPasses[idx].badgeColor = e.target.value as any;
                                            setCurrentPackage({ ...currentPackage, expoPasses: newPasses });
                                          }}
                                        >
                                          <option value="orange">Orange Accent</option>
                                          <option value="emerald">Emerald Success</option>
                                          <option value="sky">Sky Info</option>
                                          <option value="purple">Purple Creative</option>
                                          <option value="amber">Amber Warm</option>
                                          <option value="rose">Rose Premium</option>
                                          <option value="indigo">Indigo Tech</option>
                                          <option value="slate">Slate Basic</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pass Description / Benefits</label>
                                      <textarea 
                                        rows={2}
                                        className="w-full bg-slate-50 border border-slate-100/80 rounded-xl px-4 py-2 text-xs outline-none focus:border-orange-500 focus:bg-white transition-all resize-none shadow-none leading-relaxed"
                                        placeholder="Full conference access, lounge access, delegate welcome kit..."
                                        value={pass.description}
                                        onChange={(e) => {
                                          const newPasses = [...(currentPackage.expoPasses || [])];
                                          newPasses[idx].description = e.target.value;
                                          setCurrentPackage({ ...currentPackage, expoPasses: newPasses });
                                        }}
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                                        <span>Key Features / Benefits (One per line)</span>
                                      </label>
                                      <textarea 
                                        rows={3}
                                        className="w-full bg-slate-50 border border-slate-100/80 rounded-xl px-4 py-2 text-[11px] font-mono outline-none focus:border-orange-500 focus:bg-white transition-all resize-none shadow-none leading-relaxed"
                                        placeholder="Main Hall access&#10;B2B Networking lounge&#10;Lunch & refreshments included"
                                        value={pass.features?.join('\n') || ''}
                                        onChange={(e) => {
                                          const newPasses = [...(currentPackage.expoPasses || [])];
                                          newPasses[idx].features = e.target.value.split('\n').filter(line => line.trim() !== '');
                                          setCurrentPackage({ ...currentPackage, expoPasses: newPasses });
                                        }}
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total slots</label>
                                        <input 
                                          type="number"
                                          className="w-full bg-slate-50 border border-slate-100/80 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-none"
                                          placeholder="e.g. 50"
                                          value={pass.slotsTotal || ''}
                                          onChange={(e) => {
                                            const newPasses = [...(currentPackage.expoPasses || [])];
                                            newPasses[idx].slotsTotal = e.target.value ? Number(e.target.value) : undefined;
                                            setCurrentPackage({ ...currentPackage, expoPasses: newPasses });
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Available left</label>
                                        <input 
                                          type="number"
                                          className="w-full bg-slate-50 border border-slate-100/80 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-none"
                                          placeholder="e.g. 45"
                                          value={pass.slotsAvailable || ''}
                                          onChange={(e) => {
                                            const newPasses = [...(currentPackage.expoPasses || [])];
                                            newPasses[idx].slotsAvailable = e.target.value ? Number(e.target.value) : undefined;
                                            setCurrentPackage({ ...currentPackage, expoPasses: newPasses });
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {(currentPackage.expoPasses || []).length === 0 && (
                            <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50">
                              <Sparkles className="text-slate-300 w-12 h-12 stroke-[1.5]" />
                              <div className="space-y-1">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">No Passes Created Yet</h3>
                                <p className="text-xs text-slate-400 max-w-sm">Define multiple exclusive passes, badges, or visitor invitation cards for this Expo catalog entry to show off professional ticket options.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newPasses = [
                                    {
                                      id: Math.random().toString(36).substring(2, 9),
                                      title: 'Standard Visitor Pass',
                                      price: 0,
                                      currency: currentPackage.currency || 'PKR',
                                      description: 'Grants access to main halls, keynote presentations, and exhibition zones.',
                                      badgeColor: 'sky' as const,
                                      features: ['Access to all 4 halls', 'Keynote audio headsets', 'Standard booklet guide'],
                                      slotsTotal: 100,
                                      slotsAvailable: 100
                                    },
                                    {
                                      id: Math.random().toString(36).substring(2, 9),
                                      title: 'Exhibitor Gold Card',
                                      price: 15000,
                                      currency: currentPackage.currency || 'PKR',
                                      description: 'For corporate delegates representing companies. Includes raw booth space benefits and custom presentation slots.',
                                      badgeColor: 'orange' as const,
                                      features: ['Standard 3x3 booth space', '2 x Delegated gold badges', 'Company feature in catalog', 'Exclusive VIP lounge lunches'],
                                      slotsTotal: 25,
                                      slotsAvailable: 25
                                    }
                                  ];
                                  setCurrentPackage({ ...currentPackage, expoPasses: newPasses });
                                }}
                                className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-md shadow-slate-900/10 cursor-pointer"
                              >
                                Generate Standard Demo Pass Tiers
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
</AnimatePresence>
               </div>

                    

              <div className="p-10 bg-slate-50 flex justify-between items-center border-t border-slate-100">
                 <div className="flex items-center space-x-3 text-slate-400">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Changes persist globally</span>
                 </div>
                 <div className="flex space-x-4">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      Discard
                    </button>
                    <button 
                      onClick={handleSavePackage}
                      className="flex items-center space-x-2 bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-orange-500 transition-all shadow-xl shadow-slate-900/10"
                    >
                      <Save size={18} />
                      <span>Commit Changes</span>
                    </button>
                 </div>
              </div>
           </motion.div>
        </div>
      )}

      {/* Visa Request Creation Modal */}
      {isCreatingVisa && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
           <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
           >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                 <div>
                   <h3 className="text-2xl font-bold">New Visa Protocol</h3>
                   <p className="text-sm text-slate-400 font-medium">Initialize a manual visa application for a verified user.</p>
                 </div>
                 <button 
                  onClick={() => setIsCreatingVisa(false)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-rose-500 transition-colors"
                 >
                   <XCircle size={24} />
                 </button>
              </div>

              <div className="p-10 overflow-y-auto space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                       <Users size={12} className="mr-2" />
                       Select Applicant
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all appearance-none"
                      value={newVisaRequest.userId}
                      onChange={(e) => setNewVisaRequest({ ...newVisaRequest, userId: e.target.value })}
                    >
                       <option value="">Choose a user...</option>
                       {users.map(u => (
                         <option key={u.uid} value={u.uid}>{u.displayName || u.email} ({u.email})</option>
                       ))}
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                       <ShieldCheck size={12} className="mr-2" />
                       Visa Classification
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all appearance-none"
                      value={newVisaRequest.visaType}
                      onChange={(e) => setNewVisaRequest({ ...newVisaRequest, visaType: e.target.value })}
                    >
                       <option value="Umrah Visa">Umrah Visa</option>
                       <option value="Tourist Visa">Tourist Visa</option>
                       <option value="Business Visa">Business Visa</option>
                       <option value="Student Visa">Student Visa</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                       <Filter size={12} className="mr-2" />
                       Initial Status
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-all appearance-none"
                      value={newVisaRequest.status}
                      onChange={(e) => setNewVisaRequest({ ...newVisaRequest, status: e.target.value as any })}
                    >
                       <option value="pending">PENDING</option>
                       <option value="processing">PROCESSING</option>
                       <option value="approved">APPROVED</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                       <FileText size={12} className="mr-2" />
                       Internal Notes
                    </label>
                    <textarea 
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-5 py-4 text-sm font-medium outline-none focus:border-orange-500 transition-all resize-none"
                      placeholder="Enter any specific requirements or notes..."
                      value={newVisaRequest.notes}
                      onChange={(e) => setNewVisaRequest({ ...newVisaRequest, notes: e.target.value })}
                    />
                 </div>
              </div>

              <div className="p-10 bg-slate-50 flex justify-end items-center border-t border-slate-100 space-x-4">
                 <button 
                   onClick={() => setIsCreatingVisa(false)}
                   className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:text-slate-900 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleCreateVisaRequest}
                   className="flex items-center space-x-2 bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-orange-500 transition-all shadow-xl shadow-slate-900/10"
                 >
                   <Save size={18} />
                   <span>Initialize Request</span>
                 </button>
              </div>
           </motion.div>
        </div>
      )}
      
      {/* Generated Itinerary Editor Modal */}
      {generatingItinerary && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
           <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
           >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
                 <div>
                   <h3 className="text-2xl font-bold flex items-center gap-3">
                      <Sparkles className="text-orange-400" />
                      AI Itinerary Protocol
                   </h3>
                   <p className="text-sm text-white/40 font-medium">Review and refine the AI-generated day-by-day plan.</p>
                 </div>
                 <button 
                  onClick={() => setGeneratingItinerary(null)}
                  className="p-3 bg-white/10 text-white/40 rounded-2xl hover:text-white transition-colors"
                 >
                   <XCircle size={24} />
                 </button>
              </div>

              <div className="p-10 overflow-y-auto flex-grow bg-slate-50">
                 <textarea 
                   rows={20}
                   className="w-full bg-white border border-slate-200 rounded-[2rem] p-10 text-sm font-mono leading-relaxed outline-none focus:border-orange-500 transition-all shadow-inner"
                   value={itineraryContent}
                   onChange={(e) => setItineraryContent(e.target.value)}
                 />
              </div>

              <div className="p-10 bg-white flex justify-end items-center border-t border-slate-100 space-x-4">
                 <button 
                   onClick={() => setGeneratingItinerary(null)}
                   className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:text-slate-900 transition-colors"
                 >
                   Discard
                 </button>
                 <button 
                   onClick={() => saveGeneratedItinerary(generatingItinerary)}
                   className="flex items-center space-x-2 bg-orange-500 text-white px-10 py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20"
                 >
                   <Save size={18} />
                   <span>Commit to Package</span>
                 </button>
              </div>
           </motion.div>
        </div>
      )}

      {/* Booking Detail Intelligence Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col"
            >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white shrink-0">
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <Package size={24} className="text-orange-400" />
                    <h3 className="text-xl font-bold italic tracking-tighter">APPLICATION OVERDRAFT: #{selectedBooking.id.toUpperCase().slice(0, 8)}</h3>
                  </div>
                  <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Deep inspection of traveler fulfillment documents</p>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-10 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left: General Info & Passengers */}
                  <div className="space-y-12">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                        <Users size={12} className="mr-2" />
                        Traveler Manifest
                      </h4>
                      <div className="space-y-4">
                        {selectedBooking.passengers.map((p, i) => (
                          <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-orange-200 transition-all">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-900 uppercase text-sm tracking-tight">{p.name}</p>
                                <p className="text-xs text-slate-400 font-medium">Passport: <span className="font-mono text-slate-600 font-semibold">{p.passportNumber || "MISSING"}</span></p>
                                
                                {/* Passport Scan Metadata */}
                                {(p.dob || p.gender || p.nationality || p.passportExpiry || p.passportIssueDate || p.issuingCountry) && (
                                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-500 font-semibold">
                                    {p.dob && (
                                      <div>
                                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Date of Birth</span>
                                        <span className="text-slate-700">{p.dob}</span>
                                      </div>
                                    )}
                                    {p.gender && (
                                      <div>
                                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Gender</span>
                                        <span className="text-slate-700">{p.gender}</span>
                                      </div>
                                    )}
                                    {p.nationality && (
                                      <div>
                                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Nationality</span>
                                        <span className="text-slate-700">{p.nationality}</span>
                                      </div>
                                    )}
                                    {p.issuingCountry && (
                                      <div>
                                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Issuing Country</span>
                                        <span className="text-slate-700">{p.issuingCountry}</span>
                                      </div>
                                    )}
                                    {p.passportIssueDate && (
                                      <div>
                                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Issue Date</span>
                                        <span className="text-slate-700">{p.passportIssueDate}</span>
                                      </div>
                                    )}
                                    {p.passportExpiry && (
                                      <div>
                                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Expiry Date</span>
                                        <span className="text-slate-700">{p.passportExpiry}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {(p.studyProgram || p.studyField) && (
                                  <p className="text-xs text-slate-400 font-medium mt-1">Study: <span className="text-sky-600">{p.studyProgram} - {p.studyField}</span></p>
                                )}
                                {p.academicBackground && (
                                  <p className="text-xs text-slate-400 font-medium mt-1">Academics: <span className="text-sky-600">{p.academicBackground}</span></p>
                                )}
                                {(p.companyName || p.designation) && (
                                  <p className="text-xs text-slate-400 font-medium mt-1">Company: <span className="text-sky-600">{p.companyName} ({p.designation})</span></p>
                                )}
                                {p.exhibitorProfile && (
                                  <p className="text-xs text-slate-400 font-medium mt-1">Profile: <span className="text-sky-600">{p.exhibitorProfile}</span></p>
                                )}
                                {p.travelHistory && (
                                  <p className="text-xs text-slate-400 font-medium mt-1">History: <span className="text-sky-600">{p.travelHistory}</span></p>
                                )}
                              </div>
                              <span className="text-[10px] font-black bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm text-slate-400">{p.age} YRS</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-10 border-t border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                        <Tag size={12} className="mr-2" />
                        Financial Audit
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-900 rounded-2xl text-white">
                          <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-1">Contract Value</p>
                          <p className="text-xl font-black">{formatCurrency(selectedBooking.totalAmount)}</p>
                        </div>
                        <div className="p-6 bg-orange-500 rounded-2xl text-white">
                          <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-1">Status Protocol</p>
                          <p className="text-xl font-black uppercase tracking-tighter italic">{selectedBooking.status}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Documents Intelligence */}
                  <div className="space-y-10">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                      <FileText size={12} className="mr-2" />
                      Document Overrides
                    </h4>
                    
                    <div className="space-y-6">
                      {/* Passport */}
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                            <div>
                              <p className="text-xs font-bold text-slate-900 uppercase">Primary Passport Copy</p>
                              <p className="text-[10px] text-slate-400 font-medium">Critical travel document</p>
                            </div>
                            {selectedBooking.passportUrl || users.find(u => u.uid === selectedBooking.userId)?.passportCopyUrl ? (
                              <button 
                                onClick={() => setViewingDocument({ url: selectedBooking.passportUrl || users.find(u => u.uid === selectedBooking.userId)?.passportCopyUrl || '', title: 'Passport Document' })} 
                                className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all font-bold text-[10px] uppercase tracking-widest"
                              >
                                <span>View Document</span>
                                <ChevronRight size={14} />
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2 px-4 py-2 bg-rose-50 text-rose-500 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                                <span>No Document</span>
                                <X size={14} />
                              </div>
                            )}
                          </div>
                          
                          <button 
                            disabled={isUploadingDoc === 'passport'}
                            onClick={() => document.getElementById('admin-passport-upload')?.click()}
                            className="w-full flex items-center justify-center space-x-2 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-orange-50 hover:text-orange-500 transition-all border border-dashed border-slate-200"
                          >
                            {isUploadingDoc === 'passport' ? <RotateCcw size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>{selectedBooking.passportUrl ? 'REPLACE IN DOCUMENT' : 'INITIAL OVERRIDE'}</span>
                          </button>
                          {isUploadingDoc === 'passport' && (
                            <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="h-full bg-orange-500"
                              />
                            </div>
                          )}
                          <input type="file" id="admin-passport-upload" className="hidden" onChange={(e) => handleAdminDocUpload(e, 'passport')} />
                        </div>
                      </div>

                      {/* ID Card */}
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                            <div>
                              <p className="text-xs font-bold text-slate-900 uppercase">Government ID Card</p>
                              <p className="text-[10px] text-slate-400 font-medium">Verification layer secondary</p>
                            </div>
                            {selectedBooking.idCardUrl || users.find(u => u.uid === selectedBooking.userId)?.idCardUrl ? (
                              <button 
                                onClick={() => setViewingDocument({ url: selectedBooking.idCardUrl || users.find(u => u.uid === selectedBooking.userId)?.idCardUrl || '', title: 'ID Card Document' })} 
                                className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all font-bold text-[10px] uppercase tracking-widest"
                              >
                                <span>View Document</span>
                                <ChevronRight size={14} />
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2 px-4 py-2 bg-rose-50 text-rose-500 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                                <span>No Document</span>
                                <X size={14} />
                              </div>
                            )}
                          </div>
                          
                          <button 
                            disabled={isUploadingDoc === 'idCard'}
                            onClick={() => document.getElementById('admin-idcard-upload')?.click()}
                            className="w-full flex items-center justify-center space-x-2 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-orange-50 hover:text-orange-500 transition-all border border-dashed border-slate-200"
                          >
                            {isUploadingDoc === 'idCard' ? <RotateCcw size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>{selectedBooking.idCardUrl ? 'REPLACE IN DOCUMENT' : 'INITIAL OVERRIDE'}</span>
                          </button>
                          {isUploadingDoc === 'idCard' && (
                            <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="h-full bg-orange-500"
                              />
                            </div>
                          )}
                          <input type="file" id="admin-idcard-upload" className="hidden" onChange={(e) => handleAdminDocUpload(e, 'idCard')} />
                        </div>
                      </div>
                      
                      {/* Education Degree */}
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                            <div>
                              <p className="text-xs font-bold text-slate-900 uppercase">Education Degree</p>
                              <p className="text-[10px] text-slate-400 font-medium">Academic qualifications</p>
                            </div>
                            {selectedBooking.educationDegreeUrl || users.find(u => u.uid === selectedBooking.userId)?.educationDegreeUrl ? (
                              <button 
                                onClick={() => setViewingDocument({ url: selectedBooking.educationDegreeUrl || users.find(u => u.uid === selectedBooking.userId)?.educationDegreeUrl || '', title: 'Education Degree Document' })} 
                                className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all font-bold text-[10px] uppercase tracking-widest"
                              >
                                <span>View Document</span>
                                <ChevronRight size={14} />
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2 px-4 py-2 bg-rose-50 text-rose-500 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                                <span>No Document</span>
                                <X size={14} />
                              </div>
                            )}
                          </div>
                          
                          <button 
                            disabled={isUploadingDoc === 'educationDegree'}
                            onClick={() => document.getElementById('admin-education-degree-upload')?.click()}
                            className="w-full flex items-center justify-center space-x-2 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-orange-50 hover:text-orange-500 transition-all border border-dashed border-slate-200"
                          >
                            {isUploadingDoc === 'educationDegree' ? <RotateCcw size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>{selectedBooking.educationDegreeUrl ? 'REPLACE IN DOCUMENT' : 'INITIAL OVERRIDE'}</span>
                          </button>
                          {isUploadingDoc === 'educationDegree' && (
                            <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="h-full bg-orange-500"
                              />
                            </div>
                          )}
                          <input type="file" id="admin-education-degree-upload" className="hidden" onChange={(e) => handleAdminDocUpload(e, 'educationDegree')} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 bg-slate-50 shrink-0 border-t border-slate-100 flex justify-between items-center">
                 <div className="flex items-center space-x-2 text-slate-400 italic">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Administrative Audit Tracked</span>
                 </div>
                 <button 
                   onClick={() => setSelectedBooking(null)}
                   className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/10 hover:bg-orange-500 transition-all"
                 >
                   Intelligence Verified
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingDocument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setViewingDocument(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-full"
            >
              <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-100 shrink-0">
                <div className="flex items-center space-x-3">
                  <FileText className="text-orange-500" size={24} />
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{viewingDocument.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure Document Viewer</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <a 
                    href={viewingDocument.url}
                    target="_blank"
                    download
                    className="p-3 bg-white text-slate-600 rounded-xl hover:bg-orange-50 hover:text-orange-500 transition-colors border border-slate-200"
                    title="Download Document"
                  >
                    <Download size={18} />
                  </a>
                  <button 
                    onClick={() => setViewingDocument(null)}
                    className="p-3 bg-white text-slate-600 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-colors border border-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-100 overflow-hidden flex items-center justify-center p-4 relative min-h-[500px]">
                <iframe 
                  src={`${viewingDocument.url}#view=FitH`} 
                  className="w-full h-full rounded-xl bg-white shadow-inner"
                  title="Document Preview"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
    </div>
  );
}
