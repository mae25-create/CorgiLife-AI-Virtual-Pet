
import { GoogleGenAI, Type } from "@google/genai";
import { PetState } from "../types";

// Helper to check if API key is available
const fetchApiKey = async () => {
  try {
    // Try to get it from the backend
    // We append a timestamp to avoid browser caching of the API response
    const response = await fetch(`/api/config?t=${Date.now()}`);
    if (response.ok) {
      const data = await response.json();
      if (data.apiKey) {
        return data.apiKey;
      }
    }
  } catch (e) {
    console.error("Failed to fetch API key from backend:", e);
  }

  return null;
};

const getAI = async () => {
  const key = await fetchApiKey();
  if (!key) {
    console.error("API Key not found in /api/config");
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Generates a response from the Corgi based on user interaction.
 * Uses gemini-3-flash-preview for text-based reasoning and JSON output.
 */
export const generateCorgiResponse = async (userInput: string, pet: PetState, history: any[] = []) => {
  const ai = await getAI();
  if (!ai) return { barks: "Woof woof!", translation: "I'm waiting for the electronic link (API Key) to be set up!", mood: "happy" };

  const ageDesc = pet.ageMonths < 6 ? "puppy" : pet.ageMonths < 12 ? "young dog" : "adult";
  const systemInstruction = `You are a ${pet.breed} named ${pet.name}. Current age: ${pet.ageMonths} months (${ageDesc}). Mood: ${pet.happiness > 70 ? 'joyful' : 'neutral'}. Return JSON: { "barks": "Bark string", "translation": "Funny dog thought", "mood": "happy|sad|sleepy|hungry|playful" }.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: userInput }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            barks: { type: Type.STRING },
            translation: { type: Type.STRING },
            mood: { type: Type.STRING }
          },
          required: ["barks", "translation", "mood"]
        }
      }
    });
    const text = response.text || '{}';
    return JSON.parse(text);
  } catch (e) {
    console.error("AI Response Error:", e);
    return { barks: "Woof!", translation: "I'm just happy to see you!", mood: "happy" };
  }
};

/**
 * Generates a letter from the Corgi while exploring the animal world.
 */
export const generateCorgiLetter = async (pet: PetState) => {
  const ai = await getAI();
  if (!ai) return { title: "A letter from the forest", content: "I am having fun! Miss you!" };

  const systemInstruction = `You are a ${pet.breed} named ${pet.name}. You are currently exploring a vibrant, modern animal metropolis (similar to Zootopia), interacting with other anthropomorphic animals (like business-suit foxes, barista sloths, police buffalos, pop-star gazelles, etc.). Write a short, cute letter to your owner describing your current city adventure. Return JSON: { "title": "Letter title", "content": "Letter content" }.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: "Write me a letter about your city adventure right now!" }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["title", "content"]
        }
      }
    });
    const text = response.text || '{}';
    return JSON.parse(text);
  } catch (e) {
    console.error("AI Letter Error:", e);
    return { title: "A letter from the forest", content: "I am having fun! Miss you!" };
  }
};

/**
 * Generates a high-quality image of the pet.
 */
export const generateCorgiImage = async (pet: PetState, scenario: string): Promise<{image?: string, error?: string}> => {
  const ai = await getAI();
  if (!ai) return { error: "API Key not found" };

  const growth = pet.ageMonths < 6 ? "tiny puppy" : pet.ageMonths < 12 ? "young dog" : "full grown dog";
  
  let contents: any;
  
  if (pet.customPhoto) {
    contents = {
      parts: [
        {
          inlineData: {
            data: pet.customPhoto.split(',')[1] || pet.customPhoto,
            mimeType: 'image/png'
          }
        },
        {
          text: `Based on this reference photo of my corgi, generate a high-quality, professional 4k photo. Scenario: ${scenario}. The dog is a ${growth} ${pet.breed}. Maintain unique fur markings.`
        }
      ]
    };
  } else {
    contents = {
      parts: [
        { 
          text: `A professional 4k photo of a ${growth} ${pet.breed} with ${pet.color} coat. Scenario: ${scenario}. High quality, cinematic lighting.` 
        }
      ]
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: contents,
      config: { 
        imageConfig: { 
          aspectRatio: "1:1" 
        } 
      }
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return { image: `data:image/png;base64,${part.inlineData.data}` };
        }
      }
    }
    return { error: "No image data in response" };
  } catch (e: any) {
    console.error("AI Image Error:", e);
    return { error: e.message || "Failed to generate image" };
  }
};
