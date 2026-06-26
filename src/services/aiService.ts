import { db } from "@/src/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export interface ExtractedPassenger {
  name: string;
  passportNumber: string;
  age: number;
  dob?: string;
  gender?: string;
  nationality?: string;
  passportExpiry?: string;
  passportIssueDate?: string;
  issuingCountry?: string;
}

export async function extractPassengerFromPassport(base64Image: string, mimeType: string): Promise<ExtractedPassenger | null> {
  try {
    const response = await fetch("/api/ai/extract-passport", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image, mimeType }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || "Failed to extract passenger details");
    }

    const data = json.data;
    
    // Calculate age from DOB
    let calculatedAge = 0;
    if (data.dob) {
      const birthDate = new Date(data.dob);
      const today = new Date();
      calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
    }

    const result: ExtractedPassenger = {
      name: data.name || '',
      passportNumber: data.passportNumber || '',
      age: calculatedAge > 0 ? calculatedAge : 0,
      dob: data.dob || '',
      gender: data.gender || '',
      nationality: data.nationality || '',
      passportExpiry: data.passportExpiry || '',
      passportIssueDate: data.passportIssueDate || '',
      issuingCountry: data.issuingCountry || ''
    };
    
    // Log for audit
    try {
      await addDoc(collection(db, "aiLogs"), {
        type: "passport_extraction",
        success: true,
        timestamp: serverTimestamp(),
        extractedData: result
      });
    } catch (firebaseErr) {
      console.warn("Could not log to Firebase:", firebaseErr);
    }

    return result;
  } catch (error) {
    console.error("AI Extraction Error:", error);
    
    try {
      await addDoc(collection(db, "aiLogs"), {
        type: "passport_extraction",
        success: false,
        timestamp: serverTimestamp(),
        error: error instanceof Error ? error.message : String(error)
      });
    } catch (firebaseErr) {
      console.warn("Could not log error to Firebase:", firebaseErr);
    }
    
    return null;
  }
}

export async function getVisaConsultation(message: string, history: any[] = [], packagesContext: string = "") {
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, history, packagesContext }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || "Failed to get response");
    }

    // Log for audit
    try {
      await addDoc(collection(db, "aiLogs"), {
        type: "agility_ai_chat",
        success: true,
        timestamp: serverTimestamp(),
        data: { query: message, response: json.text }
      });
    } catch (firebaseErr) {
      console.warn("Could not log chat to Firebase:", firebaseErr);
    }

    return json.text;
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "I'm experiencing a high volume of requests. Please try again in a moment.";
  }
}

export async function generateItinerary(packageName: string, packageType: string, duration: number, destinations: string[]): Promise<string> {
  try {
    const response = await fetch("/api/ai/generate-itinerary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ packageName, packageType, duration, destinations }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || "Failed to generate itinerary");
    }

    return json.text;
  } catch (error) {
    console.error("Itinerary Generation Error:", error);
    return "Failed to generate itinerary automatically. Please draft one manually.";
  }
}

export async function generateExecutiveInsights(
  bookingsCount: number,
  totalRev: number,
  packagesCount: number,
  visasCount: number,
  categoriesBreakdown: string
): Promise<string> {
  try {
    const response = await fetch("/api/ai/executive-insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingsCount,
        totalRev,
        packagesCount,
        visasCount,
        categoriesBreakdown,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || "Failed to generate executive insights");
    }

    return json.text;
  } catch (error) {
    console.error("Insights generation error:", error);
    return "Executive intelligence stream offline. Please verify settings and try again.";
  }
}
