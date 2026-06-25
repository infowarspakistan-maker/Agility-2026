import { GoogleGenAI, Type } from "@google/genai";
import { db } from "@/src/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            {
              text: `Extract passenger details from this passport image. Be extremely precise. 
              Analyze the passport photo details carefully (especially the Machine Readable Zone (MRZ) at the bottom if visible).
              
              Required fields to extract:
              - Full Name (Exactly as shown, combining first, middle, and surnames appropriately)
              - Passport Number (Typically alphanumeric, check carefully)
              - Date of Birth (dob) in YYYY-MM-DD format
              - Gender (Male, Female, or Other)
              - Nationality (Country name, e.g. Pakistan, United States, Saudi Arabia, etc.)
              - Passport Expiry Date (passportExpiry) in YYYY-MM-DD format
              - Passport Issue Date (passportIssueDate) in YYYY-MM-DD format
              - Issuing Country (Country of issue, e.g. Pakistan, USA, etc.)

              Respond ONLY in JSON format.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Full name of the passenger" },
            passportNumber: { type: Type.STRING, description: "Passport number" },
            dob: { type: Type.STRING, description: "Date of Birth (YYYY-MM-DD)" },
            gender: { type: Type.STRING, description: "Gender (Male, Female, or Other)" },
            nationality: { type: Type.STRING, description: "Nationality of the passenger" },
            passportExpiry: { type: Type.STRING, description: "Passport Expiry Date (YYYY-MM-DD)" },
            passportIssueDate: { type: Type.STRING, description: "Passport Issue Date (YYYY-MM-DD)" },
            issuingCountry: { type: Type.STRING, description: "Country that issued the passport" },
          },
          required: ["name", "passportNumber", "dob", "gender", "nationality", "passportExpiry"],
        },
      },
    });

    const data = JSON.parse(response.text);
    
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
    await addDoc(collection(db, "aiLogs"), {
      type: "passport_extraction",
      success: true,
      timestamp: serverTimestamp(),
      extractedData: result
    });

    return result;
  } catch (error) {
    console.error("AI Extraction Error:", error);
    
    await addDoc(collection(db, "aiLogs"), {
      type: "passport_extraction",
      success: false,
      timestamp: serverTimestamp(),
      error: error instanceof Error ? error.message : String(error)
    });
    
    return null;
  }
}

export async function getVisaConsultation(message: string, history: any[] = [], packagesContext: string = "") {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      history: history,
      config: {
        systemInstruction: `You are the 'Agility AI Assistant' for Agility Travels. You specialize in Umrah, Study Abroad, and Expo packages available on our webapp. Be professional, direct, and helpful. 
        
IMPORTANT: Only provide information about the packages available on the webapp. If the user asks about a package, use the following context to recommend the right package and provide a link to it. If the context does not contain relevant packages, politely inform the user that we do not have such packages currently but they can contact our support team.

AVAILABLE PACKAGES:
${packagesContext}`
      }
    });

    const response = await chat.sendMessage({ message: message });
    const text = response.text;

    // Log for audit
    await addDoc(collection(db, "aiLogs"), {
      type: "agility_ai_chat",
      success: true,
      timestamp: serverTimestamp(),
      data: { query: message, response: text }
    });

    return text;
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "I'm experiencing a high volume of requests. Please try again in a moment.";
  }
}

export async function generateItinerary(packageName: string, packageType: string, duration: number, destinations: string[]): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Generate a detailed day-by-day itinerary for a travel package.
              Package Name: ${packageName}
              Type: ${packageType}
              Duration: ${duration} Days
              Destinations: ${destinations.join(', ')}
              
              Format the output in clean Markdown with clear headings for each day. Include suggested activities, local food recommendations, and travel tips.`,
            },
          ],
        },
      ],
    });

    return response.text;
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `You are the Lead Systems Intelligence AI at Agility Travels. Analyze these system metrics:
              - Confirmed/Pending Bookings: ${bookingsCount}
              - Total Dynamic/Base Revenue: PKR ${totalRev}
              - Running Services & Packages: ${packagesCount}
              - Active Visa Assistance Programs: ${visasCount}
              - Services active inventory: ${categoriesBreakdown}
              
              Provide a professional, highly strategic Executive Summary containing:
              1. **Market Signals**: Concise analysis of which category (Umrah, Study Abroad, EXPO, visa) is gaining traction based on inventory split and metrics.
              2. **Operational Recommendations**: Concrete business suggestions (e.g. optimizing flight/transport block-allocations, cross-promoting high-conversion categories, offering bundled options like EXPO travelers requiring Visas).
              3. **Predictive Performance Actionables**: Real-time suggestions to optimize booking completion rates.
              
              Format the output strictly as professionally styled clean markdown. Keep it high-impact and readable.`
            }
          ]
        }
      ]
    });
    return response.text;
  } catch (error) {
    console.error("Insights generation error:", error);
    return "Executive intelligence stream offline. Please verify settings and try again.";
  }
}

