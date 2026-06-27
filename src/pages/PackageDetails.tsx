import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '@/src/lib/firebase';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { TravelPackage, Booking, Passenger } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, Users, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, CreditCard, ChevronRight, Landmark, ScanFace, Sparkles, Loader2, Upload, User, Calendar, FileText, Download, Info } from 'lucide-react';
import { cn, formatCurrency, optimizeImageUrl, compressImage, ensureItineraryArray } from '@/src/lib/utils';
import { extractPassengerFromPassport } from '@/src/services/aiService';
import { useToast } from '@/src/components/layout/ToastContext';
import DynamicPassengerFields from '@/src/components/DynamicPassengerFields';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { jsPDF } from 'jspdf';
import Markdown from 'react-markdown';
import TourPackageSchema from '@/src/components/TourPackageSchema';

export default function PackageDetails() {
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<TravelPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [createdBookingId, setCreatedBookingId] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);

  const generatePDF = () => {
    if (!pkg) return;
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const primaryColor = [249, 115, 22]; // Orange-500 (#f97316)
      const secondaryColor = [30, 41, 59]; // Slate-800 (#1e293b)
      const grayColor = [100, 116, 139]; // Slate-500 (#64748b)
      const lightGrayColor = [241, 245, 249]; // Slate-100 (#f1f5f9)
      
      const bookingId = createdBookingId || Math.random().toString(36).substr(2, 9).toUpperCase();
      
      // Page setup & borders
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Accent top bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 8, 'F');
      
      // Header: Logo / Company Name
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(26);
      doc.text('AGILITY TRAVELS', 15, 25);
      
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Premium Pilgrimage & Bespoke Corporate Tours', 15, 31);
      
      // Right header: Invoice details
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('BOOKING TICKET', pageWidth - 15, 23, { align: 'right' });
      
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Booking ID: #${bookingId}`, pageWidth - 15, 28, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, 33, { align: 'right' });
      
      // Horizontal Line
      doc.setDrawColor(226, 232, 240); // border-slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 38, pageWidth - 15, 38);
      
      // Spiritual blessing if Umrah/Haj
      let yOffset = 46;
      if (pkg.type === 'umrah' || pkg.type === 'haj') {
        doc.setFillColor(250, 250, 249); // Warm stone
        doc.setDrawColor(231, 229, 228);
        doc.rect(15, yOffset, pageWidth - 30, 12, 'FD');
        
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(120, 113, 108);
        doc.text('"May Allah accept your intentions and make your journey full of blessings."', pageWidth / 2, yOffset + 7.5, { align: 'center' });
        yOffset += 18;
      }
      
      // Main columns
      const leftColX = 15;
      const rightColX = pageWidth / 2 + 5;
      const colWidth = (pageWidth - 30 - 10) / 2;
      
      // Box 1: Booking Summary (Left)
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(leftColX, yOffset, colWidth, 48, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('PACKAGE INFORMATION', leftColX + 5, yOffset + 6);
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1);
      doc.line(leftColX + 5, yOffset + 8, leftColX + 25, yOffset + 8);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text('Selected Package:', leftColX + 5, yOffset + 15);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(pkg.title, leftColX + 5, yOffset + 20);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text('Category Type:', leftColX + 5, yOffset + 27);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(pkg.category.toUpperCase(), leftColX + 5, yOffset + 32);
      
      if (startDate && endDate) {
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text('Travel Dates:', leftColX + 5, yOffset + 39);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, leftColX + 5, yOffset + 44);
      } else if (pkg.duration) {
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text('Duration:', leftColX + 5, yOffset + 39);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(pkg.duration, leftColX + 5, yOffset + 44);
      }
      
      // Box 2: Customer details (Right)
      doc.setFillColor(248, 250, 252);
      doc.rect(rightColX, yOffset, colWidth, 48, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('CONTACT DETAILS', rightColX + 5, yOffset + 6);
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1);
      doc.line(rightColX + 5, yOffset + 8, rightColX + 25, yOffset + 8);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text('Contact Name:', rightColX + 5, yOffset + 15);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(contactInfo.name || 'Valued Customer', rightColX + 5, yOffset + 20);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text('Email Address:', rightColX + 5, yOffset + 27);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(contactInfo.email || 'N/A', rightColX + 5, yOffset + 32);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text('Phone Number:', rightColX + 5, yOffset + 39);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(contactInfo.phone || 'N/A', rightColX + 5, yOffset + 44);
      
      yOffset += 56;
      
      // Payment block
      doc.setFillColor(255, 247, 237); // Light orange bg
      doc.setDrawColor(254, 215, 170); // border
      doc.rect(15, yOffset, pageWidth - 30, 18, 'FD');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('PAYMENT SUMMARY', 20, yOffset + 7);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Method: ${paymentMethod === 'bank' ? 'Bank Transfer' : 'Credit/Debit Card'}`, 20, yOffset + 13);
      
      // Total amount
      const totalAmt = pkg.price * passengers.length;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`Total Price: ${totalAmt.toLocaleString()} PKR`, pageWidth - 20, yOffset + 11, { align: 'right' });
      
      yOffset += 26;
      
      // Passenger list header
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('PASSENGER MANIFEST', 15, yOffset);
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1);
      doc.line(15, yOffset + 2, 35, yOffset + 2);
      
      yOffset += 7;
      
      // Passenger Table Header
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, yOffset, pageWidth - 30, 8, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(47, 55, 69);
      doc.text('No.', 18, yOffset + 5.5);
      doc.text('Full Name', 30, yOffset + 5.5);
      doc.text('Passport Number', 90, yOffset + 5.5);
      doc.text('Nationality', 135, yOffset + 5.5);
      doc.text('Gender / Age', 170, yOffset + 5.5);
      
      yOffset += 8;
      
      // Passenger rows
      passengers.forEach((passenger, index) => {
        // Draw alternate rows
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, yOffset, pageWidth - 30, 8, 'F');
        }
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`${index + 1}`, 18, yOffset + 5.5);
        doc.setFont('Helvetica', 'bold');
        doc.text(passenger.name || 'N/A', 30, yOffset + 5.5);
        doc.setFont('Helvetica', 'normal');
        doc.text(passenger.passportNumber || 'N/A', 90, yOffset + 5.5);
        doc.text(passenger.nationality || 'N/A', 135, yOffset + 5.5);
        doc.text(`${passenger.gender || 'N/A'} / ${passenger.age || 'N/A'}`, 170, yOffset + 5.5);
        
        yOffset += 8;
      });
      
      // Footer block
      const footerY = pageHeight - 40;
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(15, footerY, pageWidth - 15, footerY);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('IMPORTANT INSTRUCTIONS:', 15, footerY + 6);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text('1. Please submit the proof of payment within 48 hours to confirm this booking reservation.', 15, footerY + 11);
      doc.text('2. Ensure your passport is valid for at least 6 months from the date of travel.', 15, footerY + 15);
      doc.text('3. Support and inquiries: support@agilitytravels.com | +92-300-1234567', 15, footerY + 19);
      
      // Branding bottom
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Thank you for trusting Agility Travels.', pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      doc.save(`AgilityTravels-BookingTicket-${bookingId}.pdf`);
      toast.success("PDF Invoice downloaded successfully!");
    } catch (err) {
      console.error("PDF Generation error:", err);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };
  
  // Form State
  const [passengers, setPassengers] = useState<Passenger[]>([{ 
    name: '', 
    passportNumber: '', 
    age: 0, 
    dob: '', 
    gender: '', 
    nationality: '', 
    passportExpiry: '', 
    passportIssueDate: '', 
    issuingCountry: '' 
  }]);
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', phone: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');

  useEffect(() => {
    async function load() {
      if (!id) return;
      const docRef = doc(db, 'packages', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPkg({ id: docSnap.id, ...docSnap.data() } as TravelPackage);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (pkg) {
      document.title = `${pkg.title} | Agility Travels`;
      
      const description = `Discover our premium ${pkg.title} package. Duration: ${pkg.duration}, Category: ${pkg.category}. Starting at ${pkg.price} ${pkg.currency}. View inclusions and full daily itineraries.`;
      
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) {
        descMeta.setAttribute('content', description);
      }
      
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', `${pkg.title} | Agility Travels`);
      
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
      
      // Inject Product / Offer Structured Data Schema for Google Rich Snippets
      const oldJsonLd = document.getElementById('seo-structured-data-package');
      if (oldJsonLd) oldJsonLd.remove();
      
      const script = document.createElement('script');
      script.id = 'seo-structured-data-package';
      script.type = 'application/ld+json';
      
      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': pkg.title,
        'image': pkg.images && pkg.images.length > 0 ? pkg.images[0] : 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=800',
        'description': description,
        'offers': {
          '@type': 'Offer',
          'price': pkg.price,
          'priceCurrency': pkg.currency || 'PKR',
          'availability': 'https://schema.org/InStock',
          'seller': {
            '@type': 'TravelAgency',
            'name': 'Agility Travels'
          }
        },
        'additionalProperty': [
          {
            '@type': 'PropertyValue',
            'name': 'Duration',
            'value': pkg.duration
          },
          {
            '@type': 'PropertyValue',
            'name': 'Category',
            'value': pkg.category
          }
        ]
      };
      
      script.text = JSON.stringify(productSchema);
      document.head.appendChild(script);
    }
    
    return () => {
      const oldJsonLd = document.getElementById('seo-structured-data-package');
      if (oldJsonLd) oldJsonLd.remove();
    };
  }, [pkg]);

  const addPassenger = () => {
    setPassengers([...passengers, { 
      name: '', 
      passportNumber: '', 
      age: 0, 
      dob: '', 
      gender: '', 
      nationality: '', 
      passportExpiry: '', 
      passportIssueDate: '', 
      issuingCountry: '' 
    }]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter((_, i) => i !== index));
    }
  };

  const handlePassengerChange = (index: number, field: string, value: string | number) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const handleAIScan = async (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningIndex(index);
    
    try {
      // Compress image client-side before sending to AI (faster and fits body limits perfectly)
      const { base64, mimeType } = await compressImage(file, 1200, 0.85);

      const result = await extractPassengerFromPassport(base64, mimeType);
      if (result) {
        handlePassengerChange(index, 'name', result.name);
        handlePassengerChange(index, 'passportNumber', result.passportNumber);
        handlePassengerChange(index, 'age', result.age);
        if (result.dob) handlePassengerChange(index, 'dob', result.dob);
        if (result.gender) handlePassengerChange(index, 'gender', result.gender);
        if (result.nationality) handlePassengerChange(index, 'nationality', result.nationality);
        if (result.passportExpiry) handlePassengerChange(index, 'passportExpiry', result.passportExpiry);
        if (result.passportIssueDate) handlePassengerChange(index, 'passportIssueDate', result.passportIssueDate);
        if (result.issuingCountry) handlePassengerChange(index, 'issuingCountry', result.issuingCountry);
        toast.success("Passport scanned! All fields auto-completed by AI ✨");
      } else {
        toast.error("AI could not extract details. Please enter manually.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Extraction failed.");
    } finally {
      setScanningIndex(null);
      if (e.target) e.target.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Only data part
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const uploadFileToBackend = async (file: File): Promise<string> => {
    // Compress image client-side before uploading (faster, saves storage and bandwidth)
    const { base64, mimeType } = await compressImage(file, 1500, 0.85);
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.type.startsWith('image/') ? `${file.name.split('.')[0]}.jpg` : file.name,
        fileType: mimeType,
        base64,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server upload returned status ${response.status}`);
    }

    const json = await response.json();
    if (!json.success || !json.url) {
      throw new Error(json.error || "Failed to upload to server");
    }

    return json.url;
  };

  const handleBookingSubmit = async () => {
    if (!auth.currentUser || !pkg) {
      toast.error("Please sign in to book a package");
      navigate('/login');
      return;
    }

    setBookingLoading(true);
    try {
      let driveFileIds: string[] = [];
      let passportUrl = '';
      let idCardUrl = '';
      const filesToUpload: File[] = [];
      if (passportFile) filesToUpload.push(passportFile);
      if (idCardFile) filesToUpload.push(idCardFile);

      // 1. Upload to our Express server backend (Guaranteed & fast)
      if (passportFile) {
        setUploadProgress(10);
        setUploadStatusText("Uploading Passport Copy to server...");
        try {
          passportUrl = await uploadFileToBackend(passportFile);
        } catch (err) {
          console.error("Failed to upload passport to server:", err);
        }
      }

      if (idCardFile) {
        setUploadProgress(40);
        setUploadStatusText("Uploading ID Card Copy to server...");
        try {
          idCardUrl = await uploadFileToBackend(idCardFile);
        } catch (err) {
          console.error("Failed to upload ID card to server:", err);
        }
      }

      // 2. Upload to Google Drive as additional backup if required
      if (filesToUpload.length > 0) {
        const { uploadBookingDocuments } = await import('@/src/services/googleDriveService');
        const catFolder = pkg.type === 'study-abroad' ? 'Study Abroad' : 
                          (pkg.type === 'expo' || pkg.type === 'corporate') ? 'Expo Bookings' : 
                          pkg.type === 'umrah' ? 'Umrah' : 'General Bookings';
        
        try {
           driveFileIds = await uploadBookingDocuments(
             catFolder,
             new Date().toISOString().split('T')[0],
             contactInfo.name || passengers[0].name || auth.currentUser.displayName || 'Unknown Client',
             filesToUpload,
             (progress, statusText) => {
               setUploadProgress(50 + Math.floor(progress / 2));
               setUploadStatusText(`Google Drive Sync: ${statusText}`);
             }
           );
        } catch(e) {
           console.error("Failed to upload to Google Drive:", e);
           // Allow booking to proceed without Google Drive, since we have backend upload!
        }
      }

      const bookingData: Omit<Booking, 'id'> = {
        userId: auth.currentUser.uid,
        packageId: pkg.id,
        packageName: pkg.title,
        packageType: pkg.type,
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: paymentMethod,
        totalAmount: pkg.price * passengers.length,
        amountPaid: 0,
        bookingDate: new Date().toISOString(),
        passengers: passengers,
        contactName: contactInfo.name,
        contactEmail: contactInfo.email,
        contactPhone: contactInfo.phone,
        contactAddress: contactInfo.address,
        passportUrl: passportUrl || undefined,
        idCardUrl: idCardUrl || undefined,
        notes: driveFileIds.length > 0 ? `Uploaded ${driveFileIds.length} document(s) to Google Drive.` : '',
        preferredStartDate: startDate ? startDate.toISOString().split('T')[0] : '',
        preferredEndDate: endDate ? endDate.toISOString().split('T')[0] : '',
      };

      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      setCreatedBookingId(docRef.id);

      // Trigger automated booking confirmation email
      try {
        await fetch('/api/booking-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: contactInfo.email || auth.currentUser.email,
            booking: {
              ...bookingData,
              preferredStartDate: startDate ? startDate.toLocaleDateString() : '',
              preferredEndDate: endDate ? endDate.toLocaleDateString() : '',
            }
          })
        });
      } catch (emailErr) {
        console.error("Failed to send booking confirmation email:", emailErr);
      }

      setStep(4); // Success
      toast.success("Package booked successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Booking failed. Please check your connection.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="pt-32 text-center">Loading package...</div>;
  if (!pkg) return <div className="pt-32 text-center text-red-500 font-bold">Package not found.</div>;

  const totalAmount = pkg.price * passengers.length;

  return (
    <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
      <TourPackageSchema pkg={pkg} />
      <Link to={`/packages/${pkg.type}`} className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-orange-500 mb-8 transition-colors">
        <ArrowLeft className="mr-2 w-4 h-4" />
        Back to Results
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Content */}
        <div className="lg:col-span-8">
           <div className="mb-8">
              <div className="flex items-center space-x-2 text-orange-500 mb-3">
                 <span className="text-[10px] uppercase font-bold tracking-[0.2em]">{pkg.type?.replace('-', ' ')}</span>
                 <div className="w-1 h-1 bg-slate-200 rounded-full" />
                 <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">{pkg.category}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">{pkg.title}</h1>
              
              <div className="flex flex-wrap gap-8 items-center text-sm text-slate-500 font-semibold mb-8">
                <div className="flex items-center">
                  <MapPin size={18} className="mr-2 text-orange-500" />
                  Various Locations
                </div>
                <div className="flex items-center">
                  <Clock size={18} className="mr-2 text-orange-500" />
                  {pkg.duration}
                </div>
                <div className="flex items-center">
                  <Users size={18} className="mr-2 text-orange-500" />
                  Up to {pkg.inventoryCount} Slots
                </div>
              </div>
           </div>

           {/* Progress Bar (Visible during booking) */}
           {step < 4 && (
             <div className="flex items-center justify-between mb-12 max-w-md">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center flex-grow group">
                     <div className={cn(
                       "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-lg",
                       step >= i ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"
                     )}>
                        {step > i ? <CheckCircle2 size={18} /> : i}
                     </div>
                     {i < 3 && <div className={cn("h-1 flex-grow mx-2 rounded-full", step > i ? "bg-orange-500" : "bg-slate-100")} />}
                  </div>
                ))}
             </div>
           )}

           {/* Steps Content */}
           <AnimatePresence mode="wait">
             {step === 1 && (
               <motion.div
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 key="step1"
               >
                 {/* Interactive Image Gallery */}
                 <div className="space-y-4 mb-8">
                   <div className="rounded-[2rem] overflow-hidden h-[420px] bg-slate-100 relative group shadow-sm border border-slate-100/50">
                      <img 
                        src={optimizeImageUrl(pkg.images?.[activeImageIdx] || pkg.images?.[0] || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa', 1200, 80)} 
                        alt={`${pkg.title || 'Package'} - View ${activeImageIdx + 1}`} 
                        className="w-full h-full object-cover transition-all duration-500" 
                        referrerPolicy="no-referrer" 
                      />
                      {pkg.images && pkg.images.length > 1 && (
                        <>
                          <button 
                            onClick={() => setActiveImageIdx(prev => (prev === 0 ? pkg.images.length - 1 : prev - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/95 backdrop-blur-sm rounded-full text-slate-800 hover:bg-orange-500 hover:text-white transition-all shadow-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <button 
                            onClick={() => setActiveImageIdx(prev => (prev === pkg.images.length - 1 ? 0 : prev + 1))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/95 backdrop-blur-sm rounded-full text-slate-800 hover:bg-orange-500 hover:text-white transition-all shadow-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"
                          >
                            <ArrowRight size={16} />
                          </button>
                        </>
                      )}
                      
                      <div className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-sm">
                        Image {(pkg.images && pkg.images.length > 0) ? activeImageIdx + 1 : 0} of {(pkg.images && pkg.images.length) || 0}
                      </div>
                   </div>

                   {/* Thumbnails row */}
                   {pkg.images && pkg.images.length > 1 && (
                     <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                       {pkg.images.map((img, idx) => (
                         <button
                           key={idx}
                           onClick={() => setActiveImageIdx(idx)}
                           className={cn(
                             "w-24 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all shadow-sm",
                             activeImageIdx === idx ? "border-orange-500 scale-[1.03] ring-4 ring-orange-500/10" : "border-slate-100 hover:border-slate-300"
                           )}
                         >
                           <img src={optimizeImageUrl(img, 150, 100)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
                 <div className="prose prose-slate max-w-none">
                    <h3 className="text-2xl font-bold mb-4">About this package</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">{pkg.description}</p>
                    
                    {pkg.itineraryDetails && pkg.itineraryDetails.length > 0 ? (
                      <div className="mb-8">
                        <h3 className="text-2xl font-bold mb-4">Detailed Itinerary</h3>
                        <div className="space-y-6">
                          {pkg.itineraryDetails.map((detail, idx) => (
                            <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                              <h4 className="font-bold text-slate-900 text-lg mb-2 flex items-center">
                                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                                   {idx + 1}
                                </div>
                                {detail.title}
                              </h4>
                              <p className="text-slate-600 ml-11 whitespace-pre-wrap">{detail.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold mb-4">Itinerary</h3>
                        {pkg.itinerary && typeof pkg.itinerary === 'string' ? (
                          <div className="prose prose-slate max-w-none bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-8 leading-relaxed text-slate-700 whitespace-pre-line">
                            <Markdown>{pkg.itinerary}</Markdown>
                          </div>
                        ) : (
                          <ul className="space-y-4 mb-8">
                             {ensureItineraryArray(pkg.itinerary).map((item, idx) => (
                               <li key={idx} className="flex items-start">
                                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold mr-3 shrink-0 mt-1">
                                     {idx + 1}
                                  </div>
                                  <span className="text-slate-700">{item}</span>
                               </li>
                             ))}
                          </ul>
                        )}
                      </>
                    )}

                    {pkg.additionalInfo && pkg.additionalInfo.length > 0 && (
                      <div className="mb-10">
                        <h3 className="text-2xl font-black text-slate-950 mb-6 tracking-tight flex items-center gap-2">
                          <Sparkles className="text-orange-500 w-5 h-5" />
                          <span>Key Terms & Essential Info</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {pkg.additionalInfo.map((info, idx) => {
                            const lines = info.description.split('\n').filter(line => line.trim() !== '');
                            
                            // Dynamically resolve card color & icon based on title
                            const lowercaseTitle = info.title.toLowerCase();
                            let titleColor = "text-orange-500 bg-orange-50 border-orange-100/50";
                            let iconEl = <Info size={16} />;
                            let sideBorder = "from-orange-500/80 via-amber-500/80 to-yellow-400/80";

                            if (lowercaseTitle.includes('visa') || lowercaseTitle.includes('requirement') || lowercaseTitle.includes('document') || lowercaseTitle.includes('passport')) {
                              titleColor = "text-purple-600 bg-purple-50 border-purple-100/50";
                              iconEl = <ShieldCheck size={16} />;
                              sideBorder = "from-purple-500/80 via-indigo-500/80 to-blue-400/80";
                            } else if (lowercaseTitle.includes('hotel') || lowercaseTitle.includes('stay') || lowercaseTitle.includes('accommodation') || lowercaseTitle.includes('lodging')) {
                              titleColor = "text-emerald-600 bg-emerald-50 border-emerald-100/50";
                              iconEl = <Landmark size={16} />;
                              sideBorder = "from-emerald-500/80 via-teal-500/80 to-cyan-400/80";
                            } else if (lowercaseTitle.includes('flight') || lowercaseTitle.includes('ticket') || lowercaseTitle.includes('airline') || lowercaseTitle.includes('travel')) {
                              titleColor = "text-sky-600 bg-sky-50 border-sky-100/50";
                              iconEl = <Calendar size={16} />;
                              sideBorder = "from-sky-500/80 via-blue-500/80 to-indigo-400/80";
                            } else if (lowercaseTitle.includes('inclusion') || lowercaseTitle.includes('include') || lowercaseTitle.includes('what\'s in')) {
                              titleColor = "text-emerald-600 bg-emerald-50 border-emerald-100/50";
                              iconEl = <CheckCircle2 size={16} />;
                              sideBorder = "from-emerald-400/80 via-emerald-600/80 to-teal-500/80";
                            }

                            return (
                              <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.04)] hover:border-slate-200 transition-all duration-300 overflow-hidden flex flex-col justify-between">
                                {/* Colored header indicator stripe */}
                                <div className={`h-1.5 w-full bg-gradient-to-r ${sideBorder}`} />
                                
                                <div className="p-8 flex-grow">
                                  <div className="flex items-center space-x-3 mb-4">
                                     <div className={cn("p-2.5 rounded-xl border flex items-center justify-center shrink-0", titleColor)}>
                                        {iconEl}
                                     </div>
                                     <h4 className="font-extrabold text-slate-950 text-sm tracking-tight">{info.title}</h4>
                                  </div>
                                  
                                  <div className="space-y-2.5 font-sans">
                                     {lines.map((line, lIdx) => {
                                       const cleanLine = line.replace(/^[•\-\*\s]+/, '');
                                       return (
                                         <div key={lIdx} className="flex items-start text-xs text-slate-600 leading-relaxed gap-2.5">
                                           <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60 mt-1.5 shrink-0" />
                                           <span className="font-medium">{cleanLine}</span>
                                         </div>
                                       );
                                     })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                 </div>
               </motion.div>
             )}

             {step === 2 && (
               <motion.div
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 key="step2"
                 className="space-y-8"
               >
                  <h3 className="text-2xl font-bold">
                    {pkg.type === 'study-abroad' ? 'Student & Contact Details' : 
                     (pkg.type === 'corporate' || pkg.type === 'expo') ? 'Delegate & Contact Details' : 
                     'Passenger & Contact Details'}
                  </h3>

                  {/* Primary Contact Info Section */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center">
                       <User size={16} className="mr-2 text-orange-500" />
                       Primary Contact Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Primary Contact Name"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                          value={contactInfo.name}
                          onChange={(e) => setContactInfo({...contactInfo, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                        <input 
                          type="email" 
                          required
                          placeholder="Email Address"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                          value={contactInfo.email}
                          onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                        <input 
                          type="tel" 
                          required
                          placeholder="Phone / WhatsApp"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                          value={contactInfo.phone}
                          onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Residential Address</label>
                        <input 
                          type="text" 
                          placeholder="City, Country"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                          value={contactInfo.address}
                          onChange={(e) => setContactInfo({...contactInfo, address: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferred Travel Dates Section */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center">
                       <Calendar size={16} className="mr-2 text-orange-500" />
                       Preferred Travel Dates
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Select your preferred departure and return dates for this {(pkg.type === 'umrah' || pkg.type === 'haj') ? 'spiritual journey' : 'trip'}.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Departure Date</label>
                        <DatePicker
                          selected={startDate}
                          onChange={(date: Date | null) => setStartDate(date)}
                          selectsStart
                          startDate={startDate}
                          endDate={endDate}
                          minDate={new Date()}
                          placeholderText="Select Departure Date"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-sm font-semibold text-slate-700 cursor-pointer"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Return Date</label>
                        <DatePicker
                          selected={endDate}
                          onChange={(date: Date | null) => setEndDate(date)}
                          selectsEnd
                          startDate={startDate}
                          endDate={endDate}
                          minDate={startDate || new Date()}
                          placeholderText="Select Return Date"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-sm font-semibold text-slate-700 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-4 bg-orange-50 border border-orange-100 rounded-2xl mb-6">
                    <Sparkles className="text-orange-500 shrink-0" size={18} />
                    <p className="text-xs font-semibold text-orange-800">
                      Pro Tip: Save time by scanning your passport image. Our AI will extract your details automatically!
                    </p>
                  </div>
                  <div className="space-y-6">
                    {passengers.map((p, i) => (
                      <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                        <div className="absolute top-4 right-4 flex items-center space-x-4">
                           <button 
                             disabled={scanningIndex !== null}
                             onClick={() => {
                               setScanningIndex(i);
                               scanInputRef.current?.click();
                             }}
                             className="flex items-center space-x-2 text-[10px] font-black text-orange-500 px-3 py-1.5 bg-orange-50 rounded-lg hover:bg-orange-500 hover:text-white transition-all shadow-sm uppercase tracking-widest"
                           >
                             {scanningIndex === i ? (
                               <Loader2 size={12} className="animate-spin" />
                             ) : (
                               <ScanFace size={12} />
                             )}
                             <span>{scanningIndex === i ? 'Scanning...' : 'Scan Passport'}</span>
                           </button>
                           <div className="text-xs font-bold text-slate-300">#{i + 1}</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name (As on Passport)</label>
                              {p.name && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5"><Sparkles size={8} /> AI</span>}
                            </div>
                            <input 
                              type="text" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.name}
                              onChange={(e) => handlePassengerChange(i, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passport Number</label>
                              {p.passportNumber && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5"><Sparkles size={8} /> AI</span>}
                            </div>
                            <input 
                              type="text" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.passportNumber}
                              onChange={(e) => handlePassengerChange(i, 'passportNumber', e.target.value)}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</label>
                              {p.dob && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5"><Sparkles size={8} /> AI</span>}
                            </div>
                            <input 
                              type="date" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.dob || ''}
                              onChange={(e) => {
                                handlePassengerChange(i, 'dob', e.target.value);
                                if (e.target.value) {
                                  const birthDate = new Date(e.target.value);
                                  const today = new Date();
                                  let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                                  const m = today.getMonth() - birthDate.getMonth();
                                  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                    calculatedAge--;
                                  }
                                  handlePassengerChange(i, 'age', calculatedAge > 0 ? calculatedAge : 0);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Age</label>
                            <input 
                              type="number" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.age}
                              onChange={(e) => handlePassengerChange(i, 'age', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</label>
                              {p.gender && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5"><Sparkles size={8} /> AI</span>}
                            </div>
                            <select 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.gender || ''}
                              onChange={(e) => handlePassengerChange(i, 'gender', e.target.value)}
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nationality</label>
                              {p.nationality && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5"><Sparkles size={8} /> AI</span>}
                            </div>
                            <input 
                              type="text" 
                              placeholder="Nationality"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.nationality || ''}
                              onChange={(e) => handlePassengerChange(i, 'nationality', e.target.value)}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passport Expiry Date</label>
                              {p.passportExpiry && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5"><Sparkles size={8} /> AI</span>}
                            </div>
                            <input 
                              type="date" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.passportExpiry || ''}
                              onChange={(e) => handlePassengerChange(i, 'passportExpiry', e.target.value)}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passport Issue Date</label>
                              {p.passportIssueDate && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5"><Sparkles size={8} /> AI</span>}
                            </div>
                            <input 
                              type="date" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.passportIssueDate || ''}
                              onChange={(e) => handlePassengerChange(i, 'passportIssueDate', e.target.value)}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issuing Country</label>
                              {p.issuingCountry && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5"><Sparkles size={8} /> AI</span>}
                            </div>
                            <input 
                              type="text" 
                              placeholder="e.g. Pakistan"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
                              value={p.issuingCountry || ''}
                              onChange={(e) => handlePassengerChange(i, 'issuingCountry', e.target.value)}
                            />
                          </div>
                          <DynamicPassengerFields 
                            packageType={pkg.type} 
                            passenger={p} 
                            onChange={(field, value) => handlePassengerChange(i, field, value)} 
                          />
                        </div>
                        {passengers.length > 1 && (
                          <button 
                            onClick={() => removePassenger(i)}
                            className="mt-4 text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-wider"
                          >
                            Remove {pkg.type === 'study-abroad' ? 'Student' : (pkg.type === 'corporate' || pkg.type === 'expo') ? 'Delegate' : 'Passenger'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={addPassenger}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-orange-500 hover:text-orange-500 transition-all"
                  >
                    + Add Another {pkg.type === 'study-abroad' ? 'Student' : (pkg.type === 'corporate' || pkg.type === 'expo') ? 'Delegate' : 'Passenger'}
                  </button>
                  <input 
                    ref={scanInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => scanningIndex !== null && handleAIScan(scanningIndex, e)} 
                  />

                  <div className="pt-10 border-t border-slate-100 space-y-8">
                     <h4 className="text-xl font-bold flex items-center">
                        <ShieldCheck className="mr-3 text-orange-500" />
                        Application Documents
                     </h4>
                     <p className="text-sm text-slate-500">Upload primary documents for this travel group. You can also add these later from your profile.</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passport Copy</label>
                           <div 
                             className={cn(
                               "relative w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer",
                               passportFile ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-orange-500 bg-slate-50"
                             )}
                             onClick={() => document.getElementById('pass-up')?.click()}
                           >
                              {passportFile ? (
                                <>
                                  <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                                  <p className="text-xs font-bold text-emerald-700">{passportFile.name}</p>
                                  <p className="text-[10px] text-emerald-500 mt-1 uppercase font-bold">Document Locked</p>
                                </>
                              ) : (
                                <>
                                  <Upload size={32} className="text-slate-300 mb-2" />
                                  <p className="text-xs font-bold text-slate-400">Click to upload Passport</p>
                                </>
                              )}
                              <input 
                                id="pass-up" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf" 
                                onChange={(e) => setPassportFile(e.target.files?.[0] || null)} 
                              />
                           </div>
                        </div>

                        <div className="space-y-3">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Card (Front/Back)</label>
                           <div 
                             className={cn(
                               "relative w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer",
                               idCardFile ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-orange-500 bg-slate-50"
                             )}
                             onClick={() => document.getElementById('id-up')?.click()}
                           >
                              {idCardFile ? (
                                <>
                                  <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                                  <p className="text-xs font-bold text-emerald-700">{idCardFile.name}</p>
                                  <p className="text-[10px] text-emerald-500 mt-1 uppercase font-bold">Document Locked</p>
                                </>
                              ) : (
                                <>
                                  <Upload size={32} className="text-slate-300 mb-2" />
                                  <p className="text-xs font-bold text-slate-400">Click to upload ID Card</p>
                                </>
                              )}
                              <input 
                                id="id-up" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf" 
                                onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} 
                              />
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
             )}

             {step === 3 && (
               <motion.div
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 key="step3"
                 className="space-y-8"
               >
                  <h3 className="text-2xl font-bold">Review & Payment</h3>
                  <div className="bg-slate-900 rounded-3xl p-8 text-white">
                      <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Booking Summary</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Package</span>
                          <span className="font-bold">{pkg.title}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">{pkg.type === 'study-abroad' ? 'Students' : (pkg.type === 'corporate' || pkg.type === 'expo') ? 'Delegates' : 'Passengers'}</span>
                          <span className="font-bold">{passengers.length} {pkg.type === 'study-abroad' ? 'Students' : (pkg.type === 'corporate' || pkg.type === 'expo') ? 'Delegates' : 'Persons'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Base Price</span>
                          <span className="font-bold">{formatCurrency(pkg.price)}</span>
                        </div>
                        {startDate && endDate && (
                          <div className="flex justify-between items-center">
                            <span className="text-white/60">Preferred Dates</span>
                            <span className="font-bold text-orange-400 text-sm">
                              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xl">
                          <span className="font-bold">Total Amount</span>
                          <span className="font-bold text-orange-500">{formatCurrency(totalAmount)}</span>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest">Select Payment Method</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <button 
                        onClick={() => setPaymentMethod('bank')}
                        className={cn(
                         "p-6 rounded-2xl border-2 text-left transition-all",
                         paymentMethod === 'bank' ? "border-orange-500 bg-orange-50 text-orange-900" : "border-slate-100 hover:border-slate-200"
                        )}
                       >
                         <Landmark className="mb-2" />
                         <p className="font-bold">Bank Transfer</p>
                         <p className="text-xs opacity-60">Easypaisa, JazzCash, HBL</p>
                       </button>
                       <button 
                        onClick={() => setPaymentMethod('card')}
                        className={cn(
                         "p-6 rounded-2xl border-2 text-left transition-all",
                         paymentMethod === 'card' ? "border-orange-500 bg-orange-50 text-orange-900" : "border-slate-100 hover:border-slate-200"
                        )}
                       >
                         <CreditCard className="mb-2" />
                         <p className="font-bold">Credit/Debit Card</p>
                         <p className="text-xs opacity-60">Mastercard, VISA (Coming Soon)</p>
                       </button>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start space-x-4">
                    <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-900 mb-1">Local Payment Verification</p>
                      <p className="text-xs text-amber-700 font-medium">After submitting your booking, our team will share the specific bank details on WhatsApp for proof of transfer. Your booking status will remain 'Pending' until verified.</p>
                    </div>
                  </div>
               </motion.div>
             )}

             {step === 4 && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 key="step4"
                 className="text-center py-20 px-6 bg-emerald-50 rounded-[3rem] border border-emerald-100"
               >
                 <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20">
                    <CheckCircle2 className="text-white w-10 h-10" />
                 </div>
                 <h2 className="text-3xl font-bold text-slate-900 mb-4">Booking Successfully Submitted!</h2>
                  <p className="text-slate-600 mb-8 max-w-md mx-auto font-medium">
                    Thank you for choosing Agility Travels. Your booking ID is <strong className="font-mono text-orange-600 font-bold bg-orange-100/50 px-2.5 py-1 rounded-md">#{createdBookingId || 'PENDING'}</strong>. One of our agents will contact you shortly on your provided number for payment verification.
                  </p>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-lg mx-auto mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-left">
                      <h4 className="font-bold text-slate-900 text-sm">Download Confirmation Ticket</h4>
                      <p className="text-xs text-slate-500 font-medium text-left">Get a printable PDF containing your booking manifest, pricing, and instructions.</p>
                    </div>
                    <button
                      onClick={generatePDF}
                      className="w-full md:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 text-sm shrink-0 active:scale-95 cursor-pointer"
                    >
                      <Download size={16} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                  {/*
                 <p className="text-slate-600 mb-10 max-w-md mx-auto">
                   Thank you for choosing Agility Travels. Your booking ID is <strong>#{Math.random().toString(36).substr(2, 9).toUpperCase()}</strong>. One of our agents will contact you shortly on your provided number for payment verification.
                 </p>
                 */}
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link to="/profile" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
                      View My Bookings
                    </Link>
                    <Link to="/" className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-slate-50 transition-all">
                      Return Home
                    </Link>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Navigation Buttons */}
           {step < 4 && (
             <div className="mt-12 flex justify-between items-center">
                <button 
                  onClick={() => step > 1 && setStep(step - 1)}
                  disabled={step === 1}
                  className="px-6 py-3 font-bold text-slate-400 hover:text-orange-500 disabled:opacity-0 transition-all"
                >
                  Previous Step
                </button>
                {step < 3 ? (
                  <button 
                    onClick={() => setStep(step + 1)}
                    className="group bg-slate-900 text-white px-10 py-4 rounded-xl font-bold flex items-center space-x-2 hover:bg-orange-500 transition-all shadow-xl shadow-slate-900/10"
                  >
                    <span>Next: {step === 1 ? (pkg.type === 'study-abroad' ? 'Student Info' : (pkg.type === 'corporate' || pkg.type === 'expo') ? 'Delegate Info' : 'Guest Info') : 'Review'}</span>
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <div className="flex flex-col items-end space-y-3">
                    {bookingLoading && uploadProgress > 0 && (
                      <div className="w-full max-w-sm mb-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                          <span>{uploadStatusText}</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={handleBookingSubmit}
                      disabled={bookingLoading}
                      className="bg-orange-500 text-white px-12 py-4 rounded-xl font-bold flex items-center justify-center min-w-[280px] space-x-3 hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 disabled:bg-slate-300"
                    >
                      {bookingLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm & Submit Booking</span>
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                  </div>
                )}
             </div>
           )}
        </div>

        {/* Right Column: Pricing & Quick Info */}
        <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit">
           <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 shadow-sm">
             <div className="mb-8">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Starting from</p>
               <div className="flex items-baseline space-x-2">
                 <span className="text-3xl font-extrabold text-slate-900 leading-none">Rs. {pkg.price.toLocaleString()}</span>
                 <span className="text-slate-400 text-xs font-medium">/ person</span>
               </div>
             </div>

             <div className="space-y-4 mb-10">
               <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100">
                 <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                    <Clock size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Duration</p>
                    <p className="text-sm font-bold text-slate-900">{pkg.duration}</p>
                 </div>
               </div>
               <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100">
                 <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <MapPin size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Category</p>
                    <p className="text-sm font-bold text-slate-900">{pkg.category}</p>
                 </div>
               </div>
             </div>

             <a 
               href={`https://wa.me/92315456263?text=${encodeURIComponent(`Hi, I would like to inquire about the package: ${pkg.title}`)}`}
               target="_blank"
               rel="noopener noreferrer"
               className="w-full py-4 mb-8 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-xl shadow-green-500/20"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" /></svg>
               <span>Direct Inquiry via WhatsApp</span>
             </a>

             <div className="space-y-4 pt-10 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                   <span>Booking Help?</span>
                </div>
                <div className="space-y-4">
                  <a href="tel:03205004446" className="flex items-center space-x-4 p-4 hover:bg-white rounded-2xl group transition-all">
                    <div className="w-10 h-10 bg-slate-100 group-hover:bg-orange-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-orange-600">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1">WhatsApp Support</p>
                      <p className="text-sm font-bold text-slate-900">0320 500 4446</p>
                    </div>
                  </a>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
