import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { GroceryItem } from '@/types/grocery';
import { SaleItem } from '@/types/sales';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_AI_KEY = import.meta.env.VITE_GOOGLE_AI_KEY;
const MODEL_NAME = import.meta.env.VITE_GOOGLE_AI_MODEL;

if (!GOOGLE_AI_KEY) {
  throw new Error('Missing Google AI API key in environment variables');
}

interface RecommendationItem {
  groceryItem: GroceryItem;
  saleItem: SaleItem;
  reason: string;
  savingsPercentage: number;
}

interface AIResponse {
  emoji: string;
  category: string;
  subcategory?: string | null;
}

interface AIServiceInterface {
  getRecommendations(groceryList: GroceryItem[]): Promise<RecommendationItem[]>;
  getItemSuggestions(itemName: string): Promise<AIResponse>;
}

const categoryEmojis: Record<string, string> = {
  'Zuivel': '🥛',
  'Groenten': '🥬',
  'Fruit': '🍎',
  'Vlees': '🥩',
  'Vis': '🐟',
  'Granen': '🥖',
  'Kruiden': '🧂',
  'Aziatisch': '🍚',
  'Snacks': '🍪',
  'Dranken': '🥤',
  'Beleg': '🍯',
  'Huishoudartikelen': '🧻',
  'Diepvries': '🧊',
  'Conserven': '🥫',
  'Sauzen': '🫙',
  'Pasta': '🍝',
  'Ontbijt': '🥣',
  'Snoep': '🍬',
  'Chips': '🥔',
  'Bakkerij': '🥨',
  'Eieren': '🥚',
  'Overig': '🛒'
};

// Initialize the Gemini AI
const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

interface OfferMatch {
  id: string;
  product_name: string;
  supermarket: string;
  offer_price: string;
  original_price: string;
  discount_percentage: number;
  sale_type: string;
  valid_from: Date;
  valid_until: Date;
  image_url: string;
  description: string;
  similarity: number;
  is_direct_match: boolean;
}

export class AiService implements AIServiceInterface {
  private supabase;
  private openai;
  
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Enable browser usage
    });
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async matchOffers(
    searchQuery: string,
    matchThreshold: number = 0.7,
    matchCount: number = 10
  ): Promise<OfferMatch[]> {
    try {
      // Generate embedding for the search query
      const embedding = await this.generateEmbedding(searchQuery);

      // Call the match_sale_offers function
      const { data: matches, error } = await this.supabase
        .rpc('match_sale_offers', {
          query_embedding: embedding,
          match_threshold: matchThreshold,
          match_count: matchCount,
          query_text: searchQuery
        });

      if (error) throw error;

      return matches as OfferMatch[];

    } catch (error) {
      console.error('Error matching offers:', error);
      throw new Error('Failed to match offers');
    }
  }

  // Helper method to process the matches and format them for display
  formatMatchResults(matches: OfferMatch[]): {
    directMatches: OfferMatch[];
    semanticMatches: OfferMatch[];
  } {
    return {
      directMatches: matches.filter(match => match.is_direct_match),
      semanticMatches: matches.filter(match => !match.is_direct_match)
    };
  }

  async getRecommendations(groceryList: GroceryItem[]): Promise<RecommendationItem[]> {
    try {
      // Fetch current sale offers
      const { data: saleOffers, error: saleOffersError } = await this.supabase
        .from('supermarket_offers')
        .select('*')
        .gte('valid_until', new Date().toISOString());

      if (saleOffersError) throw saleOffersError;
      if (!saleOffers || saleOffers.length === 0) return [];

      // Fetch existing recommendations
      const { data: existingRecommendations, error: recommendationsError } = await this.supabase
        .from('recommendations')
        .select('*');

      if (recommendationsError) throw recommendationsError;

      // Create a map of existing recommendations by grocery item ID
      const existingRecommendationsMap = new Map(
        existingRecommendations?.map(rec => [rec.grocery_item_id, rec]) || []
      );

      // Find items that need new recommendations
      const newItems = groceryList.filter(item => !existingRecommendationsMap.has(item.id));

      // Create a prompt for the AI to find matches
      const createPrompt = (item: GroceryItem) => `Je bent een slimme boodschappen assistent. Vind aanbiedingen voor dit product.

      Retourneer een JSON array met matches. Elke match moet de aanbieding bevatten.
      
      Regels:
      1. Match producten op deze manieren:
         - Exact dezelfde producten
         - Zelfde product, ander merk
         - Vergelijkbare varianten
      2. Voorbeelden van goede matches:
         - "Cola" met "Coca Cola", "Pepsi Cola"
         - "Appels" met "Elstar Appels", "Jonagold"
         - "Wasmiddel" met alle merken wasmiddel
         - "Bier" met alle merken bier
      3. NIET matchen:
         - Compleet andere producten
         - Andere categorieën
      
      Product: ${item.name}
      
      Aanbiedingen:
      ${saleOffers.map((offer, index) => `${index}: ${offer.product_name} (${offer.description || ''})`).join('\n')}
      
      Retourneer matches in dit formaat:
      [
        {
          "offerIndex": 5,
          "reason": "Producten zijn hetzelfde product"
        }
      ]`;

      // Process only new items and collect recommendations
      const newRecommendations: RecommendationItem[] = [];
      
      for (const groceryItem of newItems) {
        try {
          const result = await model.generateContent(createPrompt(groceryItem));
          const response = result.response;
          const text = response.text();
          
          // Clean the response and parse JSON
          const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
          const matches = JSON.parse(cleanedText) as Array<{
            offerIndex: number;
            reason: string;
          }>;

          // Convert AI matches to recommendations
          const itemRecommendations = matches
            .filter(match => saleOffers[match.offerIndex] !== undefined)
            .map(match => {
              const saleOffer = saleOffers[match.offerIndex];

              // Create recommendation
              const recommendation: RecommendationItem = {
                groceryItem,
                saleItem: {
                  id: saleOffer.id,
                  productName: saleOffer.product_name,
                  supermarket: this.mapSupermarketName(saleOffer.supermarket),
                  currentPrice: saleOffer.offer_price,
                  originalPrice: saleOffer.original_price || saleOffer.offer_price,
                  discountPercentage: saleOffer.discount_percentage || 0,
                  saleType: saleOffer.sale_type || '',
                  validFrom: new Date(saleOffer.valid_from),
                  validUntil: new Date(saleOffer.valid_until),
                  imageUrl: saleOffer.image_url || '',
                  category: saleOffer.description || 'Overig'
                },
                reason: match.reason,
                savingsPercentage: saleOffer.discount_percentage || 0
              };

              return recommendation;
            })
            .filter((rec): rec is NonNullable<typeof rec> => rec !== null);

          // Store new recommendations in Supabase
          if (itemRecommendations.length > 0) {
            const { error: insertError } = await this.supabase
              .from('recommendations')
              .insert(
                itemRecommendations.map(rec => ({
                  grocery_item_id: rec.groceryItem.id,
                  sale_item_id: rec.saleItem.id,
                  reason: rec.reason
                }))
              );

            if (insertError) {
              console.error('Error storing recommendations:', insertError);
            }
          }

          newRecommendations.push(...itemRecommendations);

          // Add a small delay between items to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Error processing item:', groceryItem.name, error);
          continue;
        }
      }

      // Clean up recommendations for removed items
      const currentItemIds = new Set(groceryList.map(item => item.id));
      const removedItemIds = Array.from(existingRecommendationsMap.keys())
        .filter(id => !currentItemIds.has(id));

      if (removedItemIds.length > 0) {
        const { error: deleteError } = await this.supabase
          .from('recommendations')
          .delete()
          .in('grocery_item_id', removedItemIds);

        if (deleteError) {
          console.error('Error deleting old recommendations:', deleteError);
        }
      }

      // Combine existing and new recommendations
      const allRecommendations = [
        ...newRecommendations,
        ...existingRecommendations
          .filter(rec => currentItemIds.has(rec.grocery_item_id))
          .map(rec => {
            const groceryItem = groceryList.find(item => item.id === rec.grocery_item_id)!;
            const saleOffer = saleOffers.find(offer => offer.id === rec.sale_item_id)!;
            
            return {
              groceryItem,
              saleItem: {
                id: saleOffer.id,
                productName: saleOffer.product_name,
                supermarket: this.mapSupermarketName(saleOffer.supermarket),
                currentPrice: saleOffer.offer_price,
                originalPrice: saleOffer.original_price || saleOffer.offer_price,
                discountPercentage: saleOffer.discount_percentage || 0,
                saleType: saleOffer.sale_type || '',
                validFrom: new Date(saleOffer.valid_from),
                validUntil: new Date(saleOffer.valid_until),
                imageUrl: saleOffer.image_url || '',
                category: saleOffer.description || 'Overig'
              },
              reason: rec.reason,
              savingsPercentage: saleOffer.discount_percentage || 0
            } as RecommendationItem;
          })
      ];

      // Sort recommendations by savings percentage
      return allRecommendations.sort((a, b) => b.savingsPercentage - a.savingsPercentage);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  private mapSupermarketName(id: string): string {
    const map: Record<string, string> = {
      'ah': 'Albert Heijn',
      'jumbo': 'Jumbo',
      'dirk': 'Dirk'
    };
    return map[id] || id;
  }

  async getItemSuggestions(itemName: string): Promise<AIResponse> {
    try {
      const prompt = `Given the Dutch grocery item name "${itemName}", return a JSON object with an appropriate emoji and category. The category must be one of: ${Object.keys(categoryEmojis).join(', ')}. Example response format: {"emoji": "🥕", "category": "Groenten"}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Clean the response by removing markdown code block syntax
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      
      try {
        const data = JSON.parse(cleanedText) as AIResponse;
        // Ensure the category exists in our predefined categories, otherwise use 'Overig'
        if (!Object.keys(categoryEmojis).includes(data.category)) {
          data.category = 'Overig';
          data.emoji = categoryEmojis['Overig'];
        }
        return data;
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.log('Raw AI response:', text);
        console.log('Cleaned response:', cleanedText);
        return {
          emoji: categoryEmojis['Overig'],
          category: 'Overig'
        };
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      return {
        emoji: categoryEmojis['Overig'],
        category: 'Overig'
      };
    }
  }
}

export const aiService = new AiService(); 