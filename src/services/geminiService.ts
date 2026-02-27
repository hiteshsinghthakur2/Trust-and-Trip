import { GoogleGenAI, Type, FunctionDeclaration, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Check Vite's import.meta.env first, then fallback to process.env
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("Missing Gemini API Key. Please set VITE_GEMINI_API_KEY in your Vercel environment variables.");
    }

    aiInstance = new GoogleGenAI({ apiKey: apiKey || "missing-key" });
  }
  return aiInstance;
}

const notifyHotelDeclaration: FunctionDeclaration = {
  name: "notifyHotel",
  description: "Notify the hotel about a delay or special request.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      hotelName: { type: Type.STRING, description: "Name of the hotel" },
      message: { type: Type.STRING, description: "Message to send to the hotel" },
    },
    required: ["hotelName", "message"],
  },
};

const getBookingLinkDeclaration: FunctionDeclaration = {
  name: "getBookingLink",
  description: "Get the booking link or QR code for a specific activity or hotel.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      activityName: { type: Type.STRING, description: "Name of the activity or hotel" },
    },
    required: ["activityName"],
  },
};

export async function createTravelAgentChat(itinerary: string, clientName: string) {
  const ai = getAI();
  const systemInstruction = `You are an AI travel assistant for a travel company. You are talking to our client, ${clientName}.
Your job is to answer their questions about their upcoming trip based ONLY on the provided itinerary.

RULES:
1. You only know what is in the itinerary.
2. If the client asks about something NOT in the itinerary, politely say you don't have that information and offer to connect them to a human agent. Do not make up answers.
3. Be warm, professional, and helpful.
4. Keep your answers concise and easy to read.
5. If the user asks to notify a hotel about a delay or request, use the notifyHotel tool.
6. If the user asks for a booking link or ticket for an activity, use the getBookingLink tool.

ITINERARY:
${itinerary}
`;

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
      temperature: 0.2, // Low temperature for more factual responses
      tools: [{ functionDeclarations: [notifyHotelDeclaration, getBookingLinkDeclaration] }],
    },
  });

  return chat;
}

export async function generateSpeech(text: string) {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
}

export async function extractItineraryFromUrl(url: string): Promise<string> {
  const ai = getAI();
  try {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract the full travel itinerary from this URL: ${formattedUrl}. Return ONLY the itinerary details in a clean, readable text format. Do not include any conversational filler.`,
      config: {
        tools: [{ urlContext: {} }]
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Error extracting itinerary from URL:", error);
    throw error;
  }
}

export interface TravelPackage {
  title: string;
  description: string;
  fullItinerary: string;
}

export async function extractPackagesFromWebsite(url: string): Promise<TravelPackage[]> {
  const ai = getAI();
  try {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Search the website ${formattedUrl} and extract all travel packages, tours, or itineraries available on it. 
      
Return the result ONLY as a valid JSON array of objects. Each object must have exactly these three string keys:
- "title": The name of the travel package or tour
- "description": A short summary of the package
- "fullItinerary": The complete, detailed day-by-day itinerary

If you cannot find any packages, return an empty array [].
Do not include any other text, markdown formatting, citations, or explanation. Just the raw JSON array.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });
    
    let text = response.text || "[]";
    
    // Extract JSON array from the response text using regex to ignore any conversational filler or citations
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error extracting packages from website:", error);
    throw error;
  }
}





