import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateWithGemini(prompt) {
  const key = import.meta.env.VITE_GOOGLE_GEMINI_AI_API_KEY;
  if (!key) return null;
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash' });
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const text = result?.response?.text?.() || '';
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : text);
  } catch (error) {
    console.warn('AI provider unavailable; using local trip builder.');
    return null;
  }
}
