import { aiService } from './ai-service';
import type { RecipeIngredient } from '@/types/recipe';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_AI_KEY = import.meta.env.VITE_GOOGLE_AI_KEY;
const MODEL_NAME = import.meta.env.VITE_GOOGLE_AI_MODEL || 'gemini-1.5-flash-8b';

if (!GOOGLE_AI_KEY) {
  console.error('Missing Google AI key in environment variables');
}

const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

export const recipeVisionService = {
  async extractIngredientsFromImage(imageBase64: string): Promise<RecipeIngredient[]> {
    try {
      // Clean the base64 string - remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

      const prompt = `Je bent een behulpzame assistent die ingrediënten uit recepten haalt.
      Analyseer de afbeelding en extraheer alle ingrediënten met hoeveelheden.
      Geef het resultaat terug in JSON formaat met de volgende structuur:
      {
        "ingredients": [
          {
            "name": "ingredientnaam",
            "amount": nummer,
            "unit": "meeteenheid"
          }
        ]
      }`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        }
      ]);

      const response = await result.response;
      const content = response.text();
      
      if (!content) throw new Error('No response from Gemini');

      console.log('Raw Gemini response:', content);

      try {
        // Clean the response string - remove markdown code blocks if present
        const cleanedContent = content
          .replace(/```json\n?/g, '') // Remove ```json
          .replace(/```\n?/g, '')     // Remove closing ```
          .trim();

        console.log('Cleaned content:', cleanedContent);

        const parsedResponse = JSON.parse(cleanedContent);

        if (!parsedResponse || typeof parsedResponse !== 'object') {
          throw new Error('Invalid JSON response structure');
        }

        if (!Array.isArray(parsedResponse.ingredients)) {
          throw new Error('Response missing ingredients array');
        }

        const validatedIngredients = parsedResponse.ingredients.map((ing: any) => {
          if (!ing.name || typeof ing.amount !== 'number' || !ing.unit) {
            console.warn('Invalid ingredient format:', ing);
            return null;
          }
          return ing;
        }).filter((ing: any): ing is NonNullable<typeof ing> => ing !== null);

        const enrichedIngredients = await Promise.all(
          validatedIngredients.map(async (ing: any) => {
            try {
              const suggestion = await aiService.getItemSuggestions(ing.name);
              return {
                id: crypto.randomUUID(),
                name: ing.name.toLowerCase(),
                amount: ing.amount,
                unit: ing.unit.toLowerCase(),
                emoji: suggestion.emoji,
                category: suggestion.category
              };
            } catch (error) {
              console.error('Error enriching ingredient:', ing.name, error);
              return {
                id: crypto.randomUUID(),
                name: ing.name.toLowerCase(),
                amount: ing.amount,
                unit: ing.unit.toLowerCase(),
                emoji: '🍽️',
                category: 'overig'
              };
            }
          })
        );

        if (enrichedIngredients.length === 0) {
          throw new Error('No valid ingredients found in response');
        }

        return enrichedIngredients;

      } catch (parseError: unknown) {
        console.error('Failed to parse Gemini response:', content);
        console.error('Parse error details:', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
        throw new Error(`Failed to parse ingredients: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error extracting ingredients from image:', error);
      throw error;
    }
  }
}; 