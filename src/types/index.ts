export type PackageType = 'umrah' | 'haj' | 'visa' | 'domestic-group' | 'domestic-private' | 'expo' | 'study-abroad' | 'corporate';

export interface TravelPackage {
  id: string;
  title: string;
  description: string;
  type: PackageType;
  price: number;
  currency: string;
  category: string;
  duration: string;
  itinerary: string | string[];
  itineraryDetails?: { title: string; description: string }[];
  additionalInfo?: { title: string; description: string }[];
  images: string[];
  inventoryCount: number;
  locations?: string;
  isTrending?: boolean;
  featured?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  phoneNumber?: string;
  address?: string;
  passportCopyUrl?: string;
  idCardUrl?: string;
  createdAt: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Passenger {
  name: string;
  passportNumber: string;
  age: number;
  dob?: string;
  gender?: string;
  nationality?: string;
  passportExpiry?: string;
  passportIssueDate?: string;
  issuingCountry?: string;
  studyProgram?: string;
  studyField?: string;
  companyName?: string;
  designation?: string;
  academicBackground?: string;
  travelHistory?: string;
  exhibitorProfile?: string;
}

export interface Booking {
  id: string;
  userId: string;
  packageId: string;
  packageName: string;
  packageType: PackageType;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  totalAmount: number;
  amountPaid: number;
  bookingDate: string;
  passengers: Passenger[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  notes?: string;
  passportUrl?: string;
  idCardUrl?: string;
  preferredStartDate?: string;
  preferredEndDate?: string;
}

export interface VisaRequest {
  id: string;
  userId: string;
  visaType: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  passportCopyUrl?: string;
  submissionDate: string;
  notes?: string;
}

export interface Review {
  id: string;
  packageId: string;
  packageName: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
  isAdmin: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  updatedAt: any;
  unreadCount: number;
}

export interface HeroSlide {
  id?: string;
  tagline: string;
  title: string;
  description: string;
  image: string;
  actionText: string;
  href: string;
  order?: number;
}

