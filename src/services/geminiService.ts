import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const suggestRent = async (propertyData: any) => {
  const prompt = `Suggest a fair monthly rent for this property in India:
    Category: ${propertyData.category} (${propertyData.sub_category})
    City/Village: ${propertyData.city}
    Address: ${propertyData.address}
    Size: ${propertyData.size}
    Amenities: ${propertyData.amenities.join(", ")}
    
    Provide a single number as the suggested rent in INR. Explain briefly why.`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedRent: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        },
        required: ["suggestedRent", "reasoning"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const parseSearchQuery = async (query: string) => {
  const prompt = `Parse this rental search query for India: "${query}"
    Extract the following fields if present:
    - city (the location)
    - category (Residential or Commercial)
    - subCategory (e.g., 1BHK, Shop, Godown)
    - minPrice
    - maxPrice
    - type (family, bachelor, etc.)`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          city: { type: Type.STRING },
          category: { type: Type.STRING },
          subCategory: { type: Type.STRING },
          minPrice: { type: Type.NUMBER },
          maxPrice: { type: Type.NUMBER },
          type: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const verifyDocument = async (base64Image: string, mimeType: string) => {
  const prompt = `Analyze this document (ID card or property deed) for a rental marketplace verification.
    Check if it looks like a valid official document.
    Return a JSON object with:
    - isVerified (boolean)
    - documentType (string, e.g., "Aadhaar", "Property Deed", "Unknown")
    - confidence (number 0-1)
    - reason (string)`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isVerified: { type: Type.BOOLEAN },
          documentType: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          reason: { type: Type.STRING }
        },
        required: ["isVerified", "documentType", "confidence", "reason"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
