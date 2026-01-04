import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

let genAI: GoogleGenAI | null = null;

export const initGemini = () => {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. AI features will be disabled or mocked.");
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey });
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
