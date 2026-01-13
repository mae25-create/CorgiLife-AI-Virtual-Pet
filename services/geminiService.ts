
import { GoogleGenAI, Type } from "@google/genai";
import { PetState } from "../types";

// Always use named parameter for apiKey and source from process.env.API_KEY.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Generates a response from the Corgi based on user interaction.
 * Uses gemini-3-flash-preview for text-based reasoning and JSON output.
 */
export const generateCorgiResponse = async (userInput: string, pet: PetState, history: any[] = []) => {
  const ai = getAI();
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
 * Generates a high-quality image of the pet.
 * If pet.customPhoto is provided, uses it as a reference for consistency.
 */
export const generateCorgiImage = async (pet: PetState, scenario: string) => {
  const ai = getAI();
  const growth = pet.ageMonths < 6 ? "tiny puppy" : pet.ageMonths < 12 ? "young dog" : "full grown dog";
  
  let contents: any;
  
  if (pet.customPhoto) {
    // Multimodal prompt: Reference Image + Text Instructions
    contents = {
      parts: [
        {
          inlineData: {
            data: pet.customPhoto.split(',')[1] || pet.customPhoto, // Strip header if present
            mimeType: 'image/png'
          }
        },
        {
          text: `Here is a reference photo of my corgi. Based on this specific dog, generate a new high-quality, professional 4k photo. Scenario: ${scenario}. The dog is a ${growth} ${pet.breed}. Ensure all unique fur markings, colors, and features from the reference photo are strictly maintained.`
        }
      ]
    };
  } else {
    // Text-only prompt
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
          const base64EncodeString: string = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }
    return null;
  } catch (e) {
    console.error("AI Image Error:", e);
    return `https://picsum.photos/seed/${pet.name}-${scenario}/500/500`;
  }
};
