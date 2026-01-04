
import { GoogleGenAI, Type } from "@google/genai";
import { PetState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateCorgiResponse = async (
  userInput: string,
  petState: PetState,
  history: { role: 'user' | 'model', parts: { text: string }[] }[]
) => {
  const model = "gemini-3-flash-preview";
  
  const ageDescription = petState.ageMonths < 6 ? "tiny puppy" : petState.ageMonths < 12 ? "growing puppy" : "adult dog";

  const systemInstruction = `
    You are the consciousness of a ${petState.breed} named ${petState.name}.
    Appearance: ${petState.color} coat.
    Current Age: ${petState.ageMonths} months old (${ageDescription}).
    Current state: Hunger ${petState.hunger}/100, Happiness ${petState.happiness}/100, Energy ${petState.energy}/100.
    
    Rules:
    1. Respond primarily in "Corgi barks" (e.g., "Woof! Arf!", "Bork bork!", "Awooo!").
    2. Provide a "Human Translation" of your thoughts in brackets.
    3. Keep translations funny, cute, and dog-centric. 
    4. Mention how your current age (${petState.ageMonths} months) affects your energy or curiosity.
    5. Always return as a JSON object with: 
       - "barks": The bark sequence.
       - "translation": The cute human translation.
       - "mood": One of ['happy', 'sad', 'sleepy', 'hungry', 'playful'].
  `;

  try {
    const response = await ai.models.generateContent({
      model,
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

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      barks: "Woof...",
      translation: "I'm a bit confused, but I still love you!",
      mood: "happy"
    };
  }
};

export const generateCorgiImage = async (petState: PetState, scenario: string) => {
  const model = 'gemini-2.5-flash-image';
  
  let growthDescriptor = "puppy";
  if (petState.ageMonths >= 6 && petState.ageMonths < 12) growthDescriptor = "growing young corgi";
  if (petState.ageMonths >= 12) growthDescriptor = "adult corgi";

  const prompt = `A professional high-quality photo of a ${growthDescriptor}. 
    Breed: ${petState.breed}. 
    Coat Color: ${petState.color}. 
    Age: ${petState.ageMonths} months old. 
    Current activity: ${scenario}.
    The dog is expressive and reflects its age. 
    Cinematic lighting, bright and joyful atmosphere, 4k resolution.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image generation error:", error);
    return `https://picsum.photos/seed/${scenario}-${petState.color}-${petState.ageMonths}/400/400`;
  }
};
