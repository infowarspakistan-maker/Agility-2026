export type PackageType = 'umrah' | 'haj' | 'visa' | 'domestic-group' | 'domestic-private';

export interface TravelPackage {
  id: string;
  title: string;
  description: string;
  type: PackageType;
  price: number;
  currency: string;
  category: string;
  duration: string;
  itinerary: string[];
  images: string[];
  inventoryCount: number;
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
  createdAt: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Passenger {
  name: string;
  passportNumber: string;
  age: number;
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
  notes?: string;
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
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}
