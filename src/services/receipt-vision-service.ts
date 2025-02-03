import { model } from '../lib/gemini';
import { aiService } from './ai-service';
import { GroceryItem } from '@/types/grocery-item';

class ReceiptVisionService {
  async extractItemsFromReceipt(imageBase64: string): Promise<GroceryItem[]> {
    try {
      // Clean the base64 string - remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

      const prompt = `Extract products and quantities from this receipt, translate them to dutch and convert the quantities to metric if necessary, round up to a whole number. Ignore prices and discounts. Format as JSON:
      {
        "items": [
          {
            "name": "product name",
            "quantity": "amount"
          }
        ]
      }`;

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }]
      });

      const response = await result.response;
      const content = response.text();
      
      if (!content) throw new Error('No response from Gemini');

      console.log('Raw Gemini response:', content);

      try {
        // Clean the response string - remove markdown code blocks if present
        const cleanedContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        console.log('Cleaned content:', cleanedContent);

        const parsedResponse = JSON.parse(cleanedContent);

        if (!parsedResponse || typeof parsedResponse !== 'object') {
          throw new Error('Invalid JSON response structure');
        }

        if (!Array.isArray(parsedResponse.items)) {
          throw new Error('Response missing items array');
        }

        const validatedItems = parsedResponse.items.map((item: any) => {
          if (!item.name) {
            console.warn('Invalid item format:', item);
            return null;
          }
          return item;
        }).filter((item: any): item is NonNullable<typeof item> => item !== null);

        const enrichedItems = await Promise.all(
          validatedItems.map(async (item: any) => {
            try {
              const suggestion = await aiService.getItemSuggestions(item.name);
              return {
                id: crypto.randomUUID(),
                name: item.name.toLowerCase(),
                quantity: item.quantity || '1',
                emoji: suggestion.emoji,
                category: suggestion.category,
                priority: false,
                completed: false
              };
            } catch (error) {
              console.error('Error enriching item:', item.name, error);
              return {
                id: crypto.randomUUID(),
                name: item.name.toLowerCase(),
                quantity: item.quantity || '1',
                emoji: '🛒',
                category: 'overig',
                priority: false,
                completed: false
              };
            }
          })
        );

        if (enrichedItems.length === 0) {
          throw new Error('No valid items found in response');
        }

        return enrichedItems;

      } catch (parseError: unknown) {
        console.error('Failed to parse Gemini response:', content);
        console.error('Parse error details:', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
        throw new Error(`Failed to parse items: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error extracting items from receipt:', error);
      throw error;
    }
  }
}

export const receiptVisionService = new ReceiptVisionService(); 