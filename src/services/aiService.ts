import { GoogleGenAI, Type } from "@google/genai";
import { db } from "@/src/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedPassenger {
  name: string;
  passportNumber: string;
  age: number;
}

export async function extractPassengerFromPassport(base64Image: string, mimeType: string): Promise<ExtractedPassenger | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
              text: `Extract passenger details from this passport image. 
              Required fields: 
              - Full Name (Exactly as shown)
              - Passport Number
              - Age (Calculate from Date of Birth if possible, relative to May 2026, or just extract DOB).
              
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
          },
          required: ["name", "passportNumber", "dob"],
        },
      },
    });

    const data = JSON.parse(response.text);
    
    // Calculate age from DOB
    let calculatedAge = 0;
    if (data.dob) {
      const birthDate = new Date(data.dob);
      const today = new Date(); // In production this would be better anchored or using a fixed date for consistency in a travel context
      calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
    }

    const result = {
      name: data.name,
      passportNumber: data.passportNumber,
      age: calculatedAge > 0 ? calculatedAge : 0
    };
    
    // Log for audit
    await addDoc(collection(db, "aiLogs"), {
      type: "passport_extraction",
      success: true,
      timestamp: serverTimestamp(),
      extractedData: result
    });

    return result as ExtractedPassenger;
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

export async function getVisaConsultation(message: string, history: any[] = []) {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      history: history,
      config: {
        systemInstruction: "You are the 'Smart Visa Consultant' for Al-Malik Travels. You specialize in Umrah visas, domestic travel in Pakistan, and travel document requirements. Be professional, direct, and helpful. Use Pakistani travel context where relevant."
      }
    });

    const response = await chat.sendMessage({ message: message });
    const text = response.text;

    // Log for audit
    await addDoc(collection(db, "aiLogs"), {
      type: "visa_consultant_chat",
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
