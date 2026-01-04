import { GoogleGenAI } from "@google/genai";
import { getStoredApiKey } from './settingsManager';

const envApiKey = process.env.GEMINI_API_KEY;

let genAI: GoogleGenAI | null = null;

export const initGemini = () => {
  // Priority: 1. User Settings (localStorage), 2. Environment Variable
  const activeKey = getStoredApiKey() || envApiKey;

  if (!activeKey) {
    console.warn("Gemini API Key not found in Settings or Environment. AI features disabled.");
    return null;
  }
  
  // Re-initialize if the key has changed
  if (!genAI || (genAI as any).apiKey !== activeKey) {
    console.log(`[AI] Initializing Gemini with key from ${getStoredApiKey() ? 'Settings' : 'Environment'}`);
    genAI = new GoogleGenAI({ apiKey: activeKey });
  }
  return genAI;
};

export const getGeminiModel = () => {
  const ai = initGemini();
  if (!ai) return null;
  // Using the requested reliable model
  return "gemini-2.0-flash-exp"; 
};

export const fetchAIAnalysis = async (ticker: string, price: number, indicators: any, newsSummary: string) => {
  const ai = initGemini();
  if (!ai) return getDefaultRecommendation(ticker);

  const prompt = `
    Analyze ${ticker} based on this data:
    Price: ${price}
    Indicators: ${JSON.stringify(indicators)}
    News Context: ${newsSummary}

    Provide a trading recommendation in this JSON format:
    {
      "action": "BUY" | "SELL" | "HOLD",
      "confidence": number (0-100),
      "reasoning": ["point 1", "point 2"],
      "riskLevel": "Low" | "Medium" | "High",
      "targetPrice": number,
      "stopLoss": number
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: getGeminiModel() || "gemini-2.0-flash-exp",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text || "{}";
    // Extract JSON if wrapped in markdown
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Analysis Failed", error);
    return getDefaultRecommendation(ticker);
  }
};

const getDefaultRecommendation = (ticker: string) => ({
  action: "HOLD",
  confidence: 50,
  reasoning: ["AI Unavailable - Defaulting to Neutral", "Check Technical Indicators manually"],
  riskLevel: "Medium",
  targetPrice: 0,
  stopLoss: 0
});
