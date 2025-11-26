import { GoogleGenAI, Type } from "@google/genai";
import { Holding } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not set in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzePortfolio = async (holdings: Holding[]): Promise<any> => {
  const ai = getAIClient();
  if (!ai) return null;

  const portfolioContext = holdings.map(h => 
    `${h.symbol}: ${h.quantity} shares @ avg cost $${h.averageCost.toFixed(2)} (Current: $${h.currentPrice.toFixed(2)})`
  ).join('\n');

  const prompt = `
    Analyze this stock portfolio. 
    1. Provide a brief summary of the diversification.
    2. Assess the risk level (Low, Medium, High).
    3. Give 3 actionable suggestions for optimization or rebalancing.
    
    Portfolio:
    ${portfolioContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            suggestions: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "riskLevel", "suggestions"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw error;
  }
};

export const fetchLivePrices = async (symbols: string[]): Promise<Record<string, number> | null> => {
  const ai = getAIClient();
  if (!ai) return null;

  const prompt = `
    Find the latest market price (in USD) for these stock symbols: ${symbols.join(', ')}.
    Return a strict JSON object where keys are symbols and values are the numeric prices.
    Example format: {"AAPL": 150.25, "MSFT": 310.50}
    Do not include any markdown formatting or explanation. Just the JSON.
  `;

  try {
    // We use googleSearch to get real-time or near real-time data
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Note: responseMimeType is NOT supported when using googleSearch tool
      }
    });

    // Since we can't force JSON mode with Search, we manually parse the likely JSON output
    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error("Gemini price fetch failed:", error);
    return null;
  }
};