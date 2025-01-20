import { model } from '../lib/gemini';
import { supabase } from '@/lib/supabase';
import { GroceryItem } from '@/types/grocery-item';
import { Category } from '@/constants/categories';
import { aiService } from './ai-service';

interface PredictionPattern {
  normalizedName: string;
  frequency: string;
  confidence: number;
  lastPurchased: Date | null;
  purchaseCount: number;
}

interface RelatedProduct {
  name: string;
  confidence: number;
  reason: string;
}

interface ItemGroup {
  items: GroceryItem[];
  category: Category;
  lastPurchased: Date;
}

interface AIPrediction {
  name: string;
  category: Category;
  quantity: string;
  confidence: number;
  reason: 'FREQUENCY' | 'RELATED' | 'SMART_SUGGESTION';
  emoji: string;
}

class AIPredictionService {
  async normalizeProductNames(names: string[]): Promise<Map<string, string>> {
    try {
      const prompt = `Normalize these product names to a standard format. Remove brand names, sizes, and specific variations.
      Return ONLY a JSON object mapping original names to normalized names, nothing else.
      
      Example input and output:
      Input: ["Campina Halfvolle Melk 1L", "Albert Heijn Jonge Kaas 48+", "Lay's Naturel Chips 225g"]
      Output: {
        "Campina Halfvolle Melk 1L": "halfvolle melk",
        "Albert Heijn Jonge Kaas 48+": "jonge kaas",
        "Lay's Naturel Chips 225g": "chips naturel"
      }
      
      Input: ${JSON.stringify(names)}`;

      const result = await model.generateContent(prompt);
      const content = result.response.text();
      
      // Clean the response and parse JSON
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const normalizedMap = JSON.parse(cleanedContent);
      return new Map(Object.entries(normalizedMap));
    } catch (error) {
      console.error('Error normalizing product names:', error);
      // Fallback to simple lowercase normalization
      return new Map(names.map(name => [name, name.toLowerCase()]));
    }
  }

  async analyzePatterns(householdId: string): Promise<PredictionPattern[]> {
    try {
      // Fetch historic completed items from the last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: historicItems } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('household_id', householdId)
        .eq('completed', true)
        .gte('created_at', threeMonthsAgo.toISOString())
        .order('created_at', { ascending: false });

      if (!historicItems || historicItems.length === 0) {
        console.log('No historic items found for household:', householdId);
        return [];
      }

      // Normalize all product names in one batch
      const items = historicItems as GroceryItem[];
      const uniqueNames = Array.from(new Set(items.map(item => item.name)));
      const normalizedNames = await this.normalizeProductNames(uniqueNames);

      // Group items by normalized name
      const itemGroups = new Map<string, ItemGroup>();

      for (const item of items) {
        const normalizedName = normalizedNames.get(item.name) || item.name.toLowerCase();
        const existingGroup = itemGroups.get(normalizedName);
        
        if (existingGroup) {
          existingGroup.items = [...existingGroup.items, item];
        } else {
          itemGroups.set(normalizedName, {
            items: [item],
            category: item.category,
            lastPurchased: new Date(item.created_at)
          });
        }
      }

      // Convert to prediction patterns, only including items purchased multiple times
      const patterns: PredictionPattern[] = [];
      for (const [normalizedName, group] of itemGroups) {
        const purchaseCount = group.items.length;
        
        // Only include items purchased at least twice
        if (purchaseCount < 2) continue;

        const daysBetweenPurchases = Math.ceil(90 / purchaseCount); // Rough estimate based on 3 months

        let frequency: string;
        if (daysBetweenPurchases <= 7) {
          frequency = 'weekly';
        } else if (daysBetweenPurchases <= 14) {
          frequency = 'biweekly';
        } else {
          frequency = 'monthly';
        }

        // Calculate confidence based on purchase frequency and count
        // Higher confidence for more frequent purchases and higher counts
        const frequencyMultiplier = daysBetweenPurchases <= 7 ? 1 : 
                                  daysBetweenPurchases <= 14 ? 0.8 : 0.6;
        const countMultiplier = Math.min(1, purchaseCount / 12); // Max out at 12 purchases
        const confidence = Math.min(0.95, frequencyMultiplier * countMultiplier);

        patterns.push({
          normalizedName,
          frequency,
          confidence,
          lastPurchased: group.lastPurchased,
          purchaseCount
        });
      }

      // Sort patterns by confidence (highest first)
      patterns.sort((a, b) => b.confidence - a.confidence);

      console.log('Generated patterns:', patterns);
      return patterns;
    } catch (error) {
      console.error('Error analyzing patterns:', error);
      return [];
    }
  }

  async generatePredictions(householdId: string): Promise<AIPrediction[]> {
    try {
      // Get patterns and current items
      const patterns = await this.analyzePatterns(householdId);
      console.log('Found patterns:', patterns);

      if (patterns.length === 0) {
        console.log('No patterns found, cannot generate predictions');
        return [];
      }

      const { data: currentItems } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('household_id', householdId)
        .eq('completed', false); // Only get active items

      console.log('Current items:', currentItems);

      const prompt = `Je bent een slimme boodschappenlijst assistent. Gebaseerd op deze aankooppatronen en huidige items, voorspel welke producten binnenkort nodig zijn.
      
      Belangrijke regels:
      1. Focus ALLEEN op items die regelmatig gekocht worden (minstens 2 keer)
      2. Kijk naar de aankoopfrequentie (weekly/biweekly/monthly) en laatste aankoopdatum
      3. Geef hogere prioriteit aan items met hogere confidence scores
      4. Controleer of items niet al op de huidige lijst staan
      5. Houd rekening met seizoensgebonden producten
      
      Retourneer ALLEEN een JSON array in dit formaat, zonder extra tekst of uitleg:
      [
        {
          "name": "product naam in Nederlands",
          "category": "categorie",
          "quantity": "1",
          "confidence": 0.9,
          "reason": "FREQUENCY|RELATED|SMART_SUGGESTION"
        }
      ]

      Aankooppatronen: ${JSON.stringify(patterns, null, 2)}
      Huidige Items: ${JSON.stringify(currentItems, null, 2)}`;

      console.log('Sending prompt to AI:', prompt);
      const result = await model.generateContent(prompt);
      const content = result.response.text();
      console.log('Raw AI response:', content);
      
      // Clean the response by removing markdown code block syntax and any additional text
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\s*\[/, '[')  // Ensure array starts at the beginning
        .replace(/\]\s*$/, ']')  // Ensure array ends properly
        .trim();
      
      console.log('Cleaned content:', cleanedContent);
      
      try {
        const predictions = JSON.parse(cleanedContent);
        console.log('Parsed predictions:', predictions);
        
        if (!Array.isArray(predictions)) {
          console.error('Invalid predictions format, expected array:', cleanedContent);
          return [];
        }

        if (predictions.length === 0) {
          console.log('AI returned no predictions');
          return [];
        }

        const enrichedPredictions = await Promise.all(
          predictions.map(async (pred) => {
            try {
              const suggestion = await this.enrichSuggestion(pred.name);
              return {
                name: pred.name,
                category: suggestion.category as Category,
                quantity: pred.quantity || '1',
                confidence: pred.confidence || 0.5,
                reason: pred.reason || 'SMART_SUGGESTION',
                emoji: suggestion.emoji || '🛒'
              };
            } catch (error) {
              console.error('Error enriching prediction:', error);
              return {
                name: pred.name,
                category: 'Overig' as Category,
                quantity: '1',
                confidence: 0.5,
                reason: 'SMART_SUGGESTION' as const,
                emoji: '🛒'
              };
            }
          })
        );

        return enrichedPredictions;
      } catch (parseError) {
        console.error('Error parsing predictions:', parseError);
        console.log('Raw content:', content);
        console.log('Cleaned content:', cleanedContent);
        return [];
      }
    } catch (error) {
      console.error('Error generating predictions:', error);
      return [];
    }
  }

  private async enrichSuggestion(name: string) {
    try {
      const suggestion = await aiService.getItemSuggestions(name);
      return {
        category: suggestion.category,
        emoji: suggestion.emoji || '🛒'
      };
    } catch (error) {
      console.error('Error enriching suggestion:', error);
      return {
        category: 'Overig' as Category,
        emoji: '🛒'
      };
    }
  }

  async findRelatedProducts(items: string[]): Promise<RelatedProduct[]> {
    try {
      const prompt = `Given these grocery items, suggest related products that are often bought together.
      Consider common cooking combinations and practical relationships.
      
      Items: ${JSON.stringify(items)}
      
      Return format (JSON array):
      [
        {
          "name": "product name",
          "confidence": 0.8,
          "reason": "short explanation why this is related"
        }
      ]`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Error finding related products:', error);
      return [];
    }
  }
}

export const aiPredictionService = new AIPredictionService(); 