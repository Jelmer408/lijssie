import { aiService } from './ai-service';
import type { RecipeIngredient } from '@/types/recipe';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Add interface for receipt data
interface ReceiptItem {
  name: string;
  originalPrice: number;
  discountedPrice?: number;
  discount?: number;
  quantity: number;
}

interface ReceiptData {
  storeName: string;
  totalAmount: number;
  items: ReceiptItem[];
}

const GOOGLE_AI_KEY = import.meta.env.VITE_GOOGLE_AI_KEY;

if (!GOOGLE_AI_KEY) {
  console.error('Missing Google AI key in environment variables');
}

const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const prompt = `Je bent een assistent die kassabonnen analyseert. Analyseer een Nederlandse kassabon HEEL NAUWKEURIG!! en geef de informatie terug in het volgende JSON-formaat:

{
  "storeName": "naam van de winkel",
  "totalAmount": totaalbedrag als nummer,
  "items": [
    {
      "name": "productnaam",
      "originalPrice": originele totaalprijs als nummer,
      "discountedPrice": kortingsprijs als nummer (indien van toepassing),
      "quantity": aantal als nummer
    }
  ]
}

Instructies:
Winkelnaam:
- Lees de winkelnaam van de bovenkant van de bon.

Totaalbedrag:
- Neem het bedrag dat staat bij "TOTAAL" of "TOTAL".
- Dit moet exact overeenkomen met de som van alle items (na kortingen).

Items:
- Haal alle gekochte producten op.
- Gebruik altijd de totaalprijs per product (niet de stuksprijs).
- Negeer "BONUSKAART", "BONUS BOX" en andere niet-product items (Bijvoorbeeld waar BONUS voor staat, dit zijn kortingen).
- Negeer kortingsregels die geen product zijn (zoals "AH BONUS").
- Negeer betalingsmethoden (zoals "PIN").
- Dezelfde items kunnen meerdere keren voorkomen.

Kortingen:
- Kortingen worden vaak onder "SUBTOTAAL" of "BONUS" vermeld.
- Voor albert heijn alle items met een B achter de prijs hebben een korting.
- Gebruik fuzzy matching om kortingen te koppelen aan de juiste producten:
  * "MANDARIJNEN" hoort bij "BONUS AHMANDARIJNO"
  * "AH HALFVOLLE MELK" hoort bij "BONUS AH MELK"
- Als een korting is toegepast:
  1. Zoek het originele product boven "SUBTOTAAL"
  2. Gebruik de originele prijs van dat product
  3. Trek de korting af om de kortingsprijs te berekenen
  4. Sla de kortingsprijs op in "discountedPrice"

Hoeveelheden:
- Als een product meerdere keren voorkomt, gebruik "quantity"
- Als er "2 VOOR" of "3 HALEN 2 BETALEN" staat:
  * Zet het juiste aantal bij "quantity"
  * Gebruik de totaalprijs voor alle items samen bij "originalPrice"
  * Bereken de kortingsprijs per stuk correct

Validatie:
- Controleer of de som van alle items (met kortingen) exact gelijk is aan het totaalbedrag
- Als er een verschil is:
  1. Controleer of alle kortingen zijn toegepast
  2. Controleer of je de juiste totaalprijzen gebruikt
  3. Controleer of de hoeveelheden kloppen

Voorbeeld:
Als de bon de volgende informatie bevat:

Winkel: Albert Heijn 1342
Totaal: €19.83

WITTE BOLLEN                1.99
YFOOD                     4,39
MANDARIJNEN               2.79
YFOODDRINKS               4,39
--------------------------------
SUBTOTAAL                 13.56
BONUS AHMANDARIJNO        0.50-
BONUS YFOODDRINKS        1.00-
--------------------------------
TOTAAL                   19.83

Dan moet de JSON-output er zo uitzien:

{
  "storeName": "Albert Heijn 1342",
  "totalAmount": 19.83,
  "items": [
    {
      "name": "WITTE BOLLEN",
      "originalPrice": 1.99,
      "discountedPrice": null,
      "quantity": 1
    },
    {
      "name": "YFOOD",
      "originalPrice": 4.39,
      "discountedPrice": 3.39,
      "quantity": 2
    },
    {
      "name": "MANDARIJNEN",
      "originalPrice": 2.79,
      "discountedPrice": 2.29,
      "quantity": 1
    },
    {
      "name": "YFOODDRINKS",
      "originalPrice": 4.39,
      "discountedPrice": 3.39,
      "quantity": 1
    }
  ]
}

Let op:
- Gebruik altijd getallen voor prijzen (niet als string)
- Rond prijzen af op 2 decimalen
- Gebruik null voor discountedPrice als er geen korting is
- Controleer of de totaalsom klopt: 1.99 + 7.78 + 2.29 + 1.99 = 19.83`;

// Add helper function to convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// Add helper function to convert object keys from snake_case to camelCase
function convertKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toCamelCase(key),
        convertKeysToCamelCase(value)
      ])
    );
  }
  return obj;
}

export const recipeVisionService = {
  async extractIngredientsFromImage(imageBase64: string): Promise<RecipeIngredient[]> {
    try {
      // Clean the base64 string - remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

      const prompt = `Je bent een behulpzame assistent die ingrediënten uit recepten haalt.
      Analyseer de afbeelding en extraheer alle ingrediënten met hoeveelheden. Vertaal de ingrediënten naar het Nederlands en converteer de hoeveelheden naar metrische eenheden. Rond de hoeveelheden af naar een geheel getal.
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
  },

  async extractReceiptData(imageBase64: string): Promise<ReceiptData> {
    try {
      // Clean the base64 string - remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        },
        { text: prompt }
      ]);

      const response = result.response;
      const content = response.text();

      if (!content) throw new Error('No response from Gemini');

      try {
        // Clean the response string - remove markdown code blocks if present
        const cleanedContent = content
          .replace(/```json\n?/g, '') // Remove ```json
          .replace(/```\n?/g, '')     // Remove closing ```
          .trim();

        const parsedResponse = JSON.parse(cleanedContent);
        if (!parsedResponse || typeof parsedResponse !== 'object') {
          throw new Error('Invalid JSON response structure');
        }

        // Convert snake_case to camelCase
        const convertedResponse = convertKeysToCamelCase(parsedResponse);

        // Validate the converted response
        if (!convertedResponse.storeName || typeof convertedResponse.totalAmount !== 'number' || !Array.isArray(convertedResponse.items)) {
          throw new Error('Invalid receipt data structure');
        }

        // Validate and clean up each item
        const validatedItems = convertedResponse.items
          .map((item: any) => {
            if (!item.name || typeof item.originalPrice !== 'number') {
              console.warn('Invalid item format:', item);
              return null;
            }
            return {
              name: item.name,
              originalPrice: item.originalPrice,
              discountedPrice: typeof item.discountedPrice === 'number' ? item.discountedPrice : undefined,
              discount: typeof item.discount === 'number' ? item.discount : undefined,
              quantity: typeof item.quantity === 'number' ? item.quantity : 1
            };
          })
          .filter((item: any): item is NonNullable<typeof item> => item !== null);

        if (validatedItems.length === 0) {
          throw new Error('No valid items found in receipt');
        }

        // Validate totals and fix any issues
        const finalItems = this.validateAndFixItems(validatedItems, convertedResponse.totalAmount);

        return {
          storeName: convertedResponse.storeName,
          totalAmount: convertedResponse.totalAmount,
          items: finalItems
        };

      } catch (parseError: unknown) {
        console.error('Failed to parse Gemini response:', content);
        console.error('Parse error details:', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
        throw new Error(`Failed to parse receipt data: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error extracting receipt data from image:', error);
      throw error;
    }
  },

  // Add helper function to check if two product names might refer to the same item
  areSimilarProducts(name1: string, name2: string): boolean {
    const normalize = (str: string) => str
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/bonus\s+/i, '')
      .replace(/ah\s+/i, '')
      .trim();

    const n1 = normalize(name1);
    const n2 = normalize(name2);

    // Check if one name contains the other
    if (n1.includes(n2) || n2.includes(n1)) return true;

    // Calculate word overlap
    const words1 = new Set(n1.split(' '));
    const words2 = new Set(n2.split(' '));
    const commonWords = [...words1].filter(word => words2.has(word));
    
    // If they share at least 2 significant words, consider them similar
    return commonWords.length >= 2;
  },

  // Update validateAndFixItems to handle discounts
  validateAndFixItems(items: ReceiptItem[], totalAmount: number): ReceiptItem[] {
    // First, separate regular items and discount items
    const regularItems: ReceiptItem[] = [];
    const discountItems: ReceiptItem[] = [];
    
    items.forEach(item => {
      if (item.discount && item.discount > 0 && item.originalPrice === 0) {
        discountItems.push(item);
      } else {
        regularItems.push(item);
      }
    });

    // Match discounts with their items using fuzzy matching
    const processedItems = regularItems.map(item => {
      const matchingDiscounts = discountItems.filter(discount => 
        this.areSimilarProducts(item.name, discount.name)
      );

      if (matchingDiscounts.length > 0) {
        const totalDiscount = matchingDiscounts.reduce((sum, d) => sum + (d.discount || 0), 0);
        return {
          ...item,
          discount: totalDiscount,
          discountedPrice: Math.max(0, item.originalPrice - totalDiscount)
        };
      }
      return item;
    });

    const calculateTotal = (items: ReceiptItem[]) => items.reduce((sum, item) => {
      const price = item.discountedPrice || item.originalPrice;
      return sum + (price * item.quantity);
    }, 0);

    const roundToTwo = (num: number) => Math.round(num * 100) / 100;
    const itemsTotal = roundToTwo(calculateTotal(processedItems));
    const expectedTotal = roundToTwo(totalAmount);

    if (itemsTotal !== expectedTotal) {
      console.warn(`Total mismatch: Items total (${itemsTotal}) != Expected total (${expectedTotal})`);
      console.warn('This might indicate missing discounts or incorrect price calculations');
      
      // Log detailed breakdown for debugging
      processedItems.forEach(item => {
        const price = item.discountedPrice || item.originalPrice;
        if (item.discount) {
          console.log(`${item.name}: ${item.originalPrice} - ${item.discount} = ${price} x ${item.quantity}`);
        } else {
          console.log(`${item.name}: ${price} x ${item.quantity}`);
        }
      });
    }

    return processedItems;
  }
}; 