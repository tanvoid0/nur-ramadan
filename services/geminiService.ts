import { Recipe } from "../types";

// Gemini is called by our server (server/ai.js); the key never reaches the client. If the API is missing or fails, AI features use local fallbacks.
// Intention: avoid using Gemini too much. AI is only called when the user explicitly asks (e.g. recipe in Kitchen, "Generate with AI" for Daily Wisdom). We default to public API or local data so we do not spam the API; the optional AI button is for when the user wants an AI-generated reflection.
// Unset VITE_API_URL means same origin (Vercel serves /api next to the app).
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const postAi = async <T>(path: string, body: unknown = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
  return response.json();
};

let isThrottled = false;

/**
 * Spiritual reflections helper with aggressive caching and throttling protection.
 */
export const getSpiritualReflection = async (): Promise<string> => {
  const today = new Date().toDateString();
  const cached = localStorage.getItem('nur_daily_reflection');
  const cachedDate = localStorage.getItem('nur_daily_reflection_date');

  if (cached && cachedDate === today) return cached;
  if (isThrottled) return getLocalReflection();

  try {
    const text = ((await postAi<{ text?: string }>('/api/reflection')).text || "").trim();
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
  if (isThrottled) return getLocalRecipeFallback(type);

  try {
    const data = await postAi<Pick<Recipe, 'name' | 'ingredients' | 'instructions' | 'nutrition'>>('/api/ai-recipe', { type, preference: preference.slice(0, 1000), isDraft });
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
