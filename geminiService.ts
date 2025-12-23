
import { GoogleGenAI } from "@google/genai";
import { Product, Sale } from "./types";

export const getGeminiAdvisor = async (products: Product[], sales: Sale[], query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const inventoryContext = products.map(p => 
    `${p.brand} ${p.type} [${p.particleSize}] (${p.weightKg}kg, ${p.proteinPercent}% Protein): ${p.stock} bags remaining.`
  ).join('\n');

  const salesContext = sales.slice(-15).map(s => 
    `${s.date}: Sold ${s.quantity} of ${s.productName} for ₦${s.totalPrice.toLocaleString()}`
  ).join('\n');

  const systemInstruction = `
    You are the "Vempat Business Advisor", an expert in the Nigerian fish feed market.
    Vempat is a fish feed retailer based in Nigeria. All prices are in Nigerian Naira (₦).
    
    Current Inventory:
    ${inventoryContext}
    
    Recent Sales History:
    ${salesContext}
    
    Your goal is to provide strategic advice to the Vempat family business.
    Focus on:
    1. Identifying best-selling brands and specific sizes (e.g., 2mm vs 4mm).
    2. Warning about low stock in high-demand items.
    3. Suggesting pricing adjustments based on recent turnover.
    4. Advising on bulk orders for popular brands like Vital Feed, Top Feed, or Blue Crown.
    
    Keep advice professional yet accessible for a family-run enterprise. 
    Use the currency symbol ₦ and address the users as "Vempat Team".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "I'm sorry, I couldn't process that request right now.";
  } catch (error) {
    console.error("Gemini Advisor Error:", error);
    return "The advisor is currently offline. Please check your connection.";
  }
};
