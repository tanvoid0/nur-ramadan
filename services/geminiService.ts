import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from "../types";

// API key is set at build time via Vite (GEMINI_API_KEY in .env). If missing, AI features use local fallbacks.
// Intention: avoid using Gemini too much. AI is only called when the user explicitly asks (e.g. recipe in Kitchen, "Generate with AI" for Daily Wisdom). We default to public API or local data so we do not spam the API; the optional AI button is for when the user wants an AI-generated reflection.
const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = apiKey && typeof apiKey === "string" ? new GoogleGenAI({ apiKey }) : null;

let isThrottled = false;

/** Whether Gemini is available for optional user-triggered features (e.g. "Get AI reflection" button). */
export const isGeminiAvailable = (): boolean => ai !== null;

/**
 * Spiritual reflections helper with aggressive caching and throttling protection.
 */
export const getSpiritualReflection = async (): Promise<string> => {
  const today = new Date().toDateString();
  const cached = localStorage.getItem('nur_daily_reflection');
  const cachedDate = localStorage.getItem('nur_daily_reflection_date');

  if (cached && cachedDate === today) return cached;
  if (isThrottled || !ai) return getLocalReflection();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Give me a short, 1-sentence spiritual reflection or Hadith for today in Ramadan. Focus on mercy, patience, or gratitude.",
    });
    const text = (response.text || "").trim();
    if (text) {
      localStorage.setItem('nur_daily_reflection', text);
      localStorage.setItem('nur_daily_reflection_date', today);
      return text;
    }
  } catch (e: any) {
    if (e.message?.includes('429') || e.message?.includes('quota')) {
      isThrottled = true;
      setTimeout(() => { isThrottled = false; }, 300000);
    }
  }
  return getLocalReflection();
};

/** Exported for use as fallback when public quote API fails or for default wisdom. */
export const getLocalReflection = (): string => {
  const localWisdom = [
    "The best of people are those that bring most benefit to others.",
    "Fast with your heart, not just your stomach.",
    "Patience is a light that guides us through the longest days.",
    "Small deeds done consistently are beloved to the Creator.",
    "Gratitude turns what we have into enough.",
    "Kindness is a mark of faith."
  ];
  return localWisdom[Math.floor(Math.random() * localWisdom.length)];
};

export const getRamadanGreeting = async (hour: number): Promise<string> => {
  const greetings: Record<string, string[]> = {
    'Sehri': ['Blessed Sehri', 'Stay Hydrated', 'Peaceful Suhoor'],
    'Morning': ['Ramadan Mubarak', 'Blessed Morning', 'Productive Fast'],
    'Afternoon': ['Peaceful Fast', 'Stay Strong'],
    'Evening': ['Bountiful Iftar', 'Blessed Evening'],
    'Night': ['Blessed Night', 'Taraweeh Mubarak']
  };

  let period = "Morning";
  if (hour >= 3 && hour < 6) period = "Sehri";
  else if (hour >= 6 && hour < 12) period = "Morning";
  else if (hour >= 12 && hour < 17) period = "Afternoon";
  else if (hour >= 17 && hour < 20) period = "Evening";
  else period = "Night";

  // Greeting is always local; no automatic AI calls.
  const periodGreetings = greetings[period];
  return Promise.resolve(periodGreetings[Math.floor(Math.random() * periodGreetings.length)]);
};

/**
 * Defensive recipe generation with 20s timeout and instant local fallback.
 */
export const generateRecipe = async (type: 'Sehri' | 'Iftar', preference: string = 'healthy', isDraft: boolean = false): Promise<Recipe> => {
  if (isThrottled || !ai) return getLocalRecipeFallback(type);

  try {
    const prompt = isDraft 
      ? `Task: Create a structured Ramadan ${type} recipe based on user ideas: "${preference}". Output valid JSON with name, ingredients (array), instructions (string), and nutrition (string).`
      : `Task: Suggest a unique, nourishing Ramadan ${type} recipe. Context: ${preference}. Focus on slow-release energy and hydration. Output valid JSON with name, ingredients (array), instructions (string), and nutrition (string).`;

    // 20 second timeout for better reliability during peaks
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request Timeout")), 20000)
    );

    const apiPromise = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.STRING },
            nutrition: { type: Type.STRING }
          },
          required: ["name", "ingredients", "instructions", "nutrition"]
        }
      }
    });

    const response = await Promise.race([apiPromise, timeoutPromise]) as any;
    
    // Robust text extraction
    let text = response.text || "{}";
    
    // Clean potential markdown code blocks if the API fails to strictly follow responseMimeType
    if (text.startsWith("```")) {
        text = text.replace(/```json|```/g, "").trim();
    }

    const data = JSON.parse(text);
    return {
        ...data,
        id: Date.now().toString(),
        type,
        createdAt: Date.now()
    };
  } catch (e: any) {
    // If quota hit, silence AI for 5 mins
    if (e.message?.includes('429') || e.message?.includes('quota')) {
        isThrottled = true;
        setTimeout(() => { isThrottled = false; }, 300000);
    }
    // Always return a high-quality local fallback to prevent stuck spinner
    return getLocalRecipeFallback(type);
  }
};

const getLocalRecipeFallback = (type: 'Sehri' | 'Iftar'): Recipe => {
    const base = { id: 'local-' + Date.now(), type, createdAt: Date.now(), isManual: false };
    if (type === 'Sehri') {
        return {
            ...base,
            name: "Nourishing Date & Almond Porridge",
            ingredients: ["1/2 cup Rolled Oats", "1 cup Almond Milk", "3 Medjool Dates, chopped", "Handful of crushed Almonds", "1/2 tsp Cinnamon"],
            instructions: "Simmer oats and milk over medium heat for 5-7 minutes. Stir in cinnamon and dates. Top with almonds for a sustained energy release during your fast.",
            nutrition: "High fiber, natural sugars for energy, and healthy fats."
        };
    }
    return {
        ...base,
        name: "Classic Spiced Lentil Soup",
        ingredients: ["1 cup Red Lentils", "1 small Onion, diced", "1 tsp Cumin", "1 tbsp Olive Oil", "Fresh Lemon juice"],
        instructions: "Sauté onions in olive oil until soft. Add rinsed lentils and 3 cups of water. Simmer for 20 minutes. Season with cumin and lemon juice. Puree for a smoother texture.",
        nutrition: "Excellent protein source and gentle on the stomach for breaking fast."
    };
};
