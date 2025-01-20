import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

// Get the generative model
export const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" }); 