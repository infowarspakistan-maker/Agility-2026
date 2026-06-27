import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { ensureItineraryArray } from '@/src/lib/utils';

let cachedAccessToken: string | null = null;

// Sets/gets Google access token in memory safely
export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Requests Google Sheets scopes from the user using Firebase signInWithPopup
export const authorizeGoogleSheets = async (): Promise<string> => {
  const provider = new GoogleAuthProvider();
  // Request spreadsheets read/write & drive.file permission
  provider.addScope('https://www.googleapis.com/auth/spreadsheets');
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.addScope('https://www.googleapis.com/auth/drive.readonly');

  // Force re-prompting consent to verify scopes
  provider.setCustomParameters({
    prompt: 'consent'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) {
      throw new Error('Google Sign-In succeeded, but failed to extract the Access Token.');
    }
    cachedAccessToken = token;
    return token;
  } catch (error: any) {
    console.error('OAuth Scope authorization failed:', error);
    throw error;
  }
};

interface CreateSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

// Creates a beautiful, pre-tabbed spreadsheet for Agility Travels
export const createAgilitySpreadsheet = async (token: string, title: string): Promise<CreateSpreadsheetResponse> => {
  const response = await fetch('https://sheets.googleapis.com/v1/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [
        { properties: { title: 'DASHBOARD' } },
        { properties: { title: 'PACKAGES' } },
        { properties: { title: 'BOOKINGS' } },
        { properties: { title: 'VISA REQUESTS' } },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
};

// Updates a specific sheet within the spreadsheet with rows
export const updateSheetData = async (
  token: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> => {
  // Clear any existing contents of the sheet first to prevent trailing old data
  try {
    await fetch(`https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${range}:clear`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    console.warn('Could not clear sheet values first:', e);
  }

  // Update sheet values
  const url = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update sheet range ${range}: ${errText}`);
  }
};

// Fully synchronizes Dashboard and summary info
export const syncDashboardSummary = async (
  token: string,
  spreadsheetId: string,
  stats: {
    totalBookings: number;
    totalAmount: number;
    totalVisas: number;
    totalPackages: number;
  }
): Promise<void> => {
  const currentDateTime = new Date().toLocaleString();
  const rows = [
    ['AGILITY TRAVELS - SYSTEM DIRECTORY & METRICS'],
    ['Sync Protocol Signature:', `SYNC_${Date.now()}`],
    ['Last Operational Sync Time:', currentDateTime],
    [''],
    ['Core Dashboard Summary Metric', 'Value', 'System Description'],
    ['Total Bookings Captured', stats.totalBookings, 'Active and processed registries'],
    ['Aggregate Valuation (PKR)', stats.totalAmount, 'Combined financial registry total'],
    ['Visa Requests Pending/Approved', stats.totalVisas, 'Visa consultation requests'],
    ['Available Packages Count', stats.totalPackages, 'Live programs and travel inventories'],
    [''],
    ['This sheet is synchronized dynamically with your Firestore enterprise database in Agility Travels.'],
    ['Do not modify this tab directory structure to avoid synchronization interference.'],
  ];

  await updateSheetData(token, spreadsheetId, 'DASHBOARD!A1:C12', rows);
};

// Synchronizes travel packages tab
export const syncPackagesSummary = async (
  token: string,
  spreadsheetId: string,
  packages: any[]
): Promise<void> => {
  const headers = [
    'Package ID',
    'Package Title',
    'Category',
    'Duration',
    'Price (PKR)',
    'Stock Inventory',
    'Locations Visited',
    'Features/Itinerary Highlights',
  ];

  const rows = [
    headers,
    ...packages.map((pkg) => [
      pkg.id,
      pkg.title,
      pkg.category || pkg.type,
      pkg.duration || 'N/A',
      pkg.price || 0,
      pkg.inventoryCount || 0,
      pkg.locations || '',
      pkg.itinerary ? ensureItineraryArray(pkg.itinerary).join(' ➔ ') : '',
    ]),
  ];

  await updateSheetData(token, spreadsheetId, `PACKAGES!A1:H${rows.length + 1}`, rows);
};

// Synchronizes booking logs tab
export const syncBookingsSummary = async (
  token: string,
  spreadsheetId: string,
  bookings: any[],
  users: any[]
): Promise<void> => {
  const headers = [
    'Booking ID',
    'Client Name',
    'Client Email',
    'Phone',
    'Package Booked',
    'Booking Date',
    'Pax Count',
    'Total Amount (PKR)',
    'Amount Paid (PKR)',
    'Payment Status',
    'Registry Status',
    'Passengers Information',
  ];

  const rows = [
    headers,
    ...bookings.map((booking) => {
      const u = users.find((profile) => profile.uid === booking.userId);
      const paxString = booking.passengers
        ? booking.passengers.map((p: any) => `${p.name} (Passport: ${p.passportNumber})`).join(' | ')
        : 'N/A';
      return [
        booking.id,
        u?.displayName || 'Unknown Client',
        u?.email || booking.userEmail || 'N/A',
        u?.phoneNumber || 'N/A',
        booking.packageName || 'N/A',
        booking.bookingDate || 'N/A',
        booking.passengers ? booking.passengers.length : 0,
        booking.totalAmount || 0,
        booking.amountPaid || 0,
        booking.paymentStatus ? booking.paymentStatus.toUpperCase() : 'UNPAID',
        booking.status ? booking.status.toUpperCase() : 'PENDING',
        paxString,
      ];
    }),
  ];

  await updateSheetData(token, spreadsheetId, `BOOKINGS!A1:L${rows.length + 1}`, rows);
};

// Synchronizes visa requests tab
export const syncVisasSummary = async (token: string, spreadsheetId: string, visas: any[]): Promise<void> => {
  const headers = ['Request ID', 'User ID', 'Visa Type', 'Registry Date', 'Application Status', 'Internal Notes'];

  const rows = [
    headers,
    ...visas.map((v) => [
      v.id,
      v.userId || 'N/A',
      v.visaType || 'N/A',
      v.submissionDate || 'N/A',
      v.status ? v.status.toUpperCase() : 'PENDING',
      v.notes || '',
    ]),
  ];

  await updateSheetData(token, spreadsheetId, `VISA REQUESTS!A1:F${rows.length + 1}`, rows);
};

// Generates a personal travel itinerary document as a personal Google Sheet for individual users
export const exportPersonalItinerarySheet = async (
  token: string,
  booking: any,
  pax: any[],
  pkg: any
): Promise<string> => {
  // Create spreadsheet
  const sprRes = await createAgilitySpreadsheet(
    token,
    `Agility Itinerary - ${booking.packageName} (Ref: ${booking.id})`
  );
  
  const currentDateTime = new Date().toLocaleString();
  const summaryRows = [
    ['AGILITY TRAVELS - CONFIRMED TRAVEL ITINERARY & BOARDING COMPANION'],
    ['Prepared For:', auth.currentUser?.displayName || auth.currentUser?.email || 'Valued Guest'],
    ['Departure Reference:', booking.id],
    ['Document Generation Date:', currentDateTime],
    [''],
    ['FLIGHT & DESTINATION MATRIX DETAILS'],
    ['Package Title', booking.packageName],
    ['Duration', pkg?.duration || booking.packageType || 'N/A'],
    ['Locations En-Route', pkg?.locations || 'N/A'],
    ['Registration Status', booking.status?.toUpperCase() || 'PENDING'],
    ['Financial Status', booking.paymentStatus?.toUpperCase() || 'UNPAID'],
    ['Total Registered Valuation', `${booking.totalAmount} PKR`],
    [''],
    ['PASSENGER MANIFEST REGISTERED'],
    ['Passenger Name', 'Passport / Document Reference', 'Age Classification'],
    ...pax.map(p => [p.name, p.passportNumber, p.age]),
    [''],
    ['ITINERARY SCHEDULE & MILESTONES'],
    ['Sequence / Day', 'Activity Detail', 'Inclusions / Meals'],
    ...(pkg?.itinerary
      ? ensureItineraryArray(pkg.itinerary).map((it: string, i: number) => [`Day ${i + 1}`, it, 'Provided as Scheduled'])
      : [['Day 1', 'Welcome airport pickup, meet and greet, transfer to hotel.', 'Welcome Dinner']])
  ];

  await updateSheetData(token, sprRes.spreadsheetId, 'DASHBOARD!A1:C50', summaryRows);
  return sprRes.spreadsheetUrl;
};
