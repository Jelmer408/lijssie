import { aiService } from './ai-service';
import { Category } from '@/constants/categories';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Recipe } from '@/types/recipe';

const GOOGLE_AI_KEY = import.meta.env.VITE_GOOGLE_AI_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_GOOGLE_AI_MODEL || 'gemini-1.5-flash-8b';

if (!GOOGLE_AI_KEY) {
  throw new Error('Missing Google AI key in environment variables');
}

if (!OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key in environment variables');
}

const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const DAILY_RECIPE_GENERATION_LIMIT = 4;
const LIMIT_REACHED_MESSAGE = "Je hebt je dagelijkse limiet van 4 recepten bereikt 🍽️. Probeer het morgen opnieuw! 🌟";

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/png?text=Recipe+Image+Loading...';

export const CATEGORIES = [
  'Groente & Fruit',
  'Vlees & Vis',
  'Zuivel & Eieren',
  'Brood & Beleg',
  'Dranken',
  'Snacks',
  'Overig'
] as const;

// Helper function to generate recipe image
async function generateRecipeImage(recipe: Recipe): Promise<string> {
  try {
    const prompt = `Professional food photo of ${recipe.title}, overhead shot, appetizing presentation`;

    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: prompt,
      n: 1,
      size: "512x512",
      quality: "standard",
      response_format: "b64_json"
    });

    if (!response.data?.[0]?.b64_json) {
      throw new Error('No image data received from OpenAI');
    }

    return `data:image/png;base64,${response.data[0].b64_json}`;
  } catch (error) {
    console.error('Error generating recipe image:', error);
    return PLACEHOLDER_IMAGE;
  }
}

// Helper function to track recipe generations
async function trackRecipeGenerations(userId: string, count: number): Promise<void> {
  try {
    const generations = Array(count).fill({ user_id: userId });
    const { error } = await supabase
      .from('recipe_generations')
      .insert(generations);

    if (error) {
      console.error('Error tracking recipe generations:', error);
    }
  } catch (error) {
    console.error('Error tracking recipe generations:', error);
  }
}

// Helper function to detect if a message is asking for recipe generation
function isRecipeGenerationRequest(message: string): boolean {
  const recipeKeywords = [
    'maak', 'genereer', 'bedenk', 'verzin', 'geef', 'recept', 'recepten',
    'kook', 'bereid', 'hoe maak ik', 'wat kan ik maken'
  ];
  const lowercaseMessage = message.toLowerCase();
  return recipeKeywords.some(keyword => lowercaseMessage.includes(keyword));
}

// Helper function to generate recipe from Gemini response
async function generateRecipeFromResponse(content: string): Promise<Recipe[]> {
  try {
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const recipes = JSON.parse(cleanedContent);
    if (!Array.isArray(recipes)) {
      throw new Error('Invalid recipe format');
    }

    // Process each recipe
    const processedRecipes = await Promise.all(recipes.map(async (recipe: any) => {
      // Start image generation immediately
      const imagePromise = generateRecipeImage({
        title: recipe.name,
        description: recipe.description
      } as Recipe);

      const ingredients = await Promise.all(recipe.ingredients.map(async (ing: any) => {
        const suggestion = await aiService.getItemSuggestions(ing.name);
        return {
          id: crypto.randomUUID(),
          name: ing.name.toLowerCase(),
          amount: ing.amount,
          unit: ing.unit.toLowerCase(),
          emoji: suggestion.emoji,
          category: suggestion.category as Category
        };
      }));

      const recipeObj: Recipe = {
        id: parseInt(Math.random().toString().slice(2, 10)),
        title: recipe.name,
        dutchTitle: recipe.name,
        image: await imagePromise,
        readyInMinutes: recipe.prepTime ? parseInt(recipe.prepTime) : 30,
        servings: recipe.servings || 4,
        ingredients,
        instructions: recipe.instructions,
        description: recipe.description,
        nutrition: {
          calories: parseInt(recipe.nutrition?.kcal || '0'),
          protein: parseInt(recipe.nutrition?.eiwitten || '0'),
          carbs: parseInt(recipe.nutrition?.koolhydraten || '0'),
          fat: parseInt(recipe.nutrition?.vetten || '0')
        },
        createdAt: new Date().toISOString()
      };

      return recipeObj;
    }));

    return processedRecipes;
  } catch (error) {
    console.error('Error processing recipe response:', error);
    throw new Error('Er ging iets mis bij het genereren van de recepten. Probeer het opnieuw.');
  }
}

export const cookingService = {
  async getCurrentGenerationCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('recipe_generations')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', today.toISOString());

  if (error) {
    console.error('Error checking recipe generation count:', error);
    return 0;
  }

  return data?.length || 0;
  },

  async getSmartRecipeResponse(message: string): Promise<string | { explanation: string; recipes: Recipe[] }> {
    if (!message.trim()) {
      return 'Stel een vraag over koken of vraag om recepten te genereren! 👩‍🍳';
    }

    try {
      if (isRecipeGenerationRequest(message)) {
        // Recipe generation prompt
        const recipePrompt = `Genereer een JSON array met 2 recepten op basis van deze vraag: "${message}".
        Elk recept moet deze exacte structuur hebben:
        {
          "name": "Naam van het recept",
          "description": "Korte beschrijving van het gerecht",
          "ingredients": [
            { "name": "ingrediënt", "amount": number, "unit": "g/ml/stuks/etc" }
          ],
          "instructions": ["stap 1", "stap 2", etc],
          "prepTime": number,
          "servings": number,
          "difficulty": "Makkelijk/Gemiddeld/Moeilijk",
          "nutrition": {
            "kcal": number,
            "eiwitten": number,
            "koolhydraten": number,
            "vetten": number
          }
        }

        Belangrijke vereisten:
        1. prepTime moet een getal zijn in minuten (zonder tekst "minuten")
        2. Alle getallen moeten hele getallen zijn (geen decimalen)
        3. Nutritionele waarden per portie moeten realistisch zijn:
           - kcal: tussen 300-800 voor een hoofdgerecht
           - eiwitten: tussen 15-40g
           - koolhydraten: tussen 30-90g
           - vetten: tussen 10-35g
        4. Alle velden zijn verplicht, vooral de nutritionele waarden
        5. Gebruik Nederlandse namen en beschrijvingen`;

        const result = await model.generateContent([{ text: recipePrompt }]);
        const response = result.response;
        const content = response.text();
        
        if (!content?.trim()) {
          throw new Error('Geen recepten gegenereerd. Probeer het opnieuw met een andere vraag.');
        }

        const recipes = await generateRecipeFromResponse(content);
      return {
          explanation: `Hier zijn 2 recepten die passen bij jouw vraag! 👩‍🍳\nKlik op een recept voor meer details.`,
          recipes
        };
      } else {
        // Cooking question prompt
        const questionPrompt = `Je bent een vriendelijke Nederlandse kookassistent. 
        Beantwoord deze kookvraag bondig en praktisch: "${message}"
        Gebruik emoji's waar gepast en geef concrete tips.
        Begin niet met "Als kookassistent" of soortgelijke introducties.`;

        const result = await model.generateContent([{ text: questionPrompt }]);
        const response = result.response;
        const content = response.text();

        if (!content?.trim()) {
          return 'Ik begrijp je vraag niet helemaal. Kun je het anders formuleren?';
        }

        return content.trim();
      }
    } catch (error) {
      console.error('Error in getSmartRecipeResponse:', error);
      return 'Er ging iets mis. Probeer het later opnieuw of stel je vraag anders.';
    }
  },

  async generateRecipe(prompt: string, userId: string): Promise<Recipe> {
    try {
      const currentCount = await this.getCurrentGenerationCount(userId);
      if (currentCount >= DAILY_RECIPE_GENERATION_LIMIT) {
        throw new Error(LIMIT_REACHED_MESSAGE);
      }

      const result = await model.generateContent(`
        Generate a recipe based on this request: "${prompt}"
        Respond in Dutch and format the response as a JSON object with the following structure:
        {
          "title": "Recipe title in English",
          "dutchTitle": "Dutch recipe title",
          "readyInMinutes": number,
          "servings": number,
              "ingredients": [
                {
              "name": "ingredient name in Dutch",
              "amount": number,
              "unit": "unit in Dutch"
            }
          ],
          "instructions": ["Step 1 in Dutch", "Step 2 in Dutch", ...],
          "description": "Short description in Dutch",
              "nutrition": {
            "kcal": number,
            "eiwitten": number,
            "koolhydraten": number,
            "vetten": number
          }
        }
      `);

      const response = await result.response;
      const content = response.text();
      
      if (!content) throw new Error('No response from Gemini');

      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsedRecipe = JSON.parse(cleanedContent);
      const recipeId = crypto.randomUUID();

      // Start image generation immediately
      const imagePromise = generateRecipeImage({
        title: parsedRecipe.title,
        description: parsedRecipe.description
      } as Recipe);
      
      // Enrich ingredients with emojis and categories
      const enrichedIngredients = await Promise.all(
        parsedRecipe.ingredients.map(async (ing: any) => {
          try {
            const suggestion = await aiService.getItemSuggestions(ing.name);
            return {
              id: crypto.randomUUID(),
              name: ing.name.toLowerCase(),
              amount: ing.amount,
              unit: ing.unit.toLowerCase(),
              emoji: suggestion.emoji,
              category: suggestion.category as Category
          };
        } catch (error) {
            console.error('Error enriching ingredient:', ing.name, error);
          return {
              id: crypto.randomUUID(),
              name: ing.name.toLowerCase(),
                amount: ing.amount,
              unit: ing.unit.toLowerCase(),
              emoji: '🍽️',
              category: 'overig' as Category
            };
          }
        })
      );

      // Create recipe object and wait for image
      const recipeObj: Recipe = {
        id: parseInt(recipeId.replace(/-/g, '').slice(0, 8), 16),
        title: parsedRecipe.title,
        dutchTitle: parsedRecipe.dutchTitle,
        image: await imagePromise,
        readyInMinutes: parsedRecipe.readyInMinutes,
        servings: parsedRecipe.servings,
        ingredients: enrichedIngredients,
        instructions: parsedRecipe.instructions,
        description: parsedRecipe.description,
        nutrition: {
          calories: parseInt(parsedRecipe.nutrition?.kcal || '0'),
          protein: parseInt(parsedRecipe.nutrition?.eiwitten || '0'),
          carbs: parseInt(parsedRecipe.nutrition?.koolhydraten || '0'),
          fat: parseInt(parsedRecipe.nutrition?.vetten || '0')
        },
        createdAt: new Date().toISOString()
      };

      return recipeObj;
    } catch (error) {
      console.error('Error generating recipe:', error);
        throw error;
    }
  },

  async generateRecipeFromText(text: string, userId: string): Promise<Recipe[]> {
    try {
      const currentCount = await this.getCurrentGenerationCount(userId);
      if (currentCount >= DAILY_RECIPE_GENERATION_LIMIT) {
        throw new Error(LIMIT_REACHED_MESSAGE);
      }

      const result = await model.generateContent(`
        Extract recipes from this text: "${text}"
        Respond in Dutch and format each recipe as a JSON object with the following structure:
        {
          "title": "Recipe title in English",
          "dutchTitle": "Dutch recipe title",
          "readyInMinutes": number,
          "servings": number,
          "ingredients": [
            {
              "name": "ingredient name in Dutch",
              "amount": number,
              "unit": "unit in Dutch"
            }
          ],
          "instructions": ["Step 1 in Dutch", "Step 2 in Dutch", ...],
          "description": "Short description in Dutch",
          "nutrition": {
            "kcal": number,
            "eiwitten": number,
            "koolhydraten": number,
            "vetten": number
          }
        }
      `);

      const response = await result.response;
      const content = response.text();
      
      if (!content) throw new Error('No response from Gemini');

      // Clean and parse the response
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const recipes = JSON.parse(cleanedContent);
      if (!Array.isArray(recipes)) throw new Error('Invalid response format from Gemini');

      // Track the generations
      await trackRecipeGenerations(userId, recipes.length);

      // Process each recipe
      return await Promise.all(recipes.map(async (recipe: any) => {
        const recipeId = crypto.randomUUID();
        
        // Enrich ingredients with emojis and categories
        const enrichedIngredients = await Promise.all(
          recipe.ingredients.map(async (ing: any) => {
            try {
              const suggestion = await aiService.getItemSuggestions(ing.name);
      return {
                id: crypto.randomUUID(),
                name: ing.name.toLowerCase(),
                amount: ing.amount,
                unit: ing.unit.toLowerCase(),
                emoji: suggestion.emoji,
                category: suggestion.category as Category
      };
    } catch (error) {
              console.error('Error enriching ingredient:', ing.name, error);
      return {
                id: crypto.randomUUID(),
                name: ing.name.toLowerCase(),
                amount: ing.amount,
                unit: ing.unit.toLowerCase(),
                emoji: '🍽️',
                category: 'overig' as Category
              };
            }
          })
        );
        
        const recipeObj = {
          id: parseInt(recipeId.replace(/-/g, '').slice(0, 8), 16),
          title: recipe.title,
          dutchTitle: recipe.dutchTitle,
          image: PLACEHOLDER_IMAGE,
          readyInMinutes: recipe.readyInMinutes,
          servings: recipe.servings,
          ingredients: enrichedIngredients,
          instructions: recipe.instructions,
          description: recipe.description
        };

        // Start image generation asynchronously
        generateRecipeImage(recipeObj).then(imageUrl => {
          recipeObj.image = imageUrl;
        }).catch(console.error);

        return recipeObj;
      }));
    } catch (error) {
      console.error('Error generating recipes:', error);
      throw error;
    }
  }
}; 