import { supabase } from '@/lib/supabase';
import { GroceryItem } from '@/types/grocery-item';
import { PredictedGroceryItem } from '@/types/predicted-grocery-item';
import { aiPredictionService } from './ai-prediction-service';
import { aiService } from './ai-service';
import { Category, isCategory } from '@/constants/categories';

export interface PredictionPreferences {
  maxSuggestions: number;
  enableNotifications: boolean;
  notificationDay?: string;
  notificationTime?: string;
}

class PredictionService {
  private ensureCategory(category: string): Category {
    return isCategory(category) ? category : 'Overig';
  }

  async predictItems(householdId: string, forceRegenerate = false): Promise<PredictedGroceryItem[]> {
    try {
      // Check if we have recent suggestions (less than 24 hours old)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Get existing suggestions
      const { data: existingSuggestions } = await supabase
        .from('suggestions')
        .select('*')
        .eq('household_id', householdId)
        .gte('created_at', oneDayAgo.toISOString())
        .order('confidence', { ascending: false });

      // If we have suggestions and are not forcing regeneration, return them
      if (existingSuggestions && existingSuggestions.length > 0 && !forceRegenerate) {
        console.log('Using existing suggestions');
        return existingSuggestions as PredictedGroceryItem[];
      }

      // Only if we're forcing regeneration or have no suggestions, generate new ones
      if (forceRegenerate || !existingSuggestions || existingSuggestions.length === 0) {
        console.log('Generating new suggestions');

        // Delete old suggestions first
        await supabase
          .from('suggestions')
          .delete()
          .eq('household_id', householdId);

        // Get user preferences for minimum suggestions
        const preferences = await this.getPreferences(householdId);
        const minPredictions = Math.max(10, preferences.maxSuggestions);

        // Get AI predictions
        const predictions = await aiPredictionService.generatePredictions(householdId);
        
        // Remove duplicates and limit to minimum predictions
        const uniquePredictions = predictions.reduce((acc, curr) => {
          const existingPrediction = acc.find(p => p.name.toLowerCase() === curr.name.toLowerCase());
          if (!existingPrediction || curr.confidence > existingPrediction.confidence) {
            if (existingPrediction) {
              acc = acc.filter(p => p.name.toLowerCase() !== curr.name.toLowerCase());
            }
            acc.push(curr);
          }
          return acc;
        }, [] as typeof predictions);

        const limitedPredictions = uniquePredictions
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, minPredictions);

        // Prepare suggestions for insert
        const now = new Date().toISOString();
        const suggestionsToInsert = limitedPredictions.map(pred => ({
          household_id: householdId,
          name: pred.name,
          category: pred.category,
          quantity: pred.quantity,
          emoji: pred.emoji,
          explanation: pred.reason === 'FREQUENCY' 
            ? 'Regelmatig gekocht'
            : pred.reason === 'RELATED' 
            ? 'Past bij je boodschappen'
            : 'Slim voorgesteld',
          confidence: pred.confidence,
          created_at: now,
          updated_at: now
        }));

        // Insert all suggestions at once
        const { error } = await supabase
          .from('suggestions')
          .insert(suggestionsToInsert);

        if (error) {
          console.error('Error inserting suggestions:', error);
          return [];
        }

        // Return the suggestions with additional fields needed for the UI
        return suggestionsToInsert.map(suggestion => ({
          ...suggestion,
          id: crypto.randomUUID(),
          priority: false,
          completed: false,
        })) as PredictedGroceryItem[];
      }

      return [];
    } catch (error) {
      console.error('Error predicting items:', error);
      return [];
    }
  }

  async updatePatterns(householdId: string, items: GroceryItem[]): Promise<void> {
    try {
      // Normalize all product names in one batch
      const itemNames = items.map(item => item.name);
      const normalizedNames = await aiPredictionService.normalizeProductNames(itemNames);

      for (const item of items) {
        const normalizedName = normalizedNames.get(item.name) || item.name.toLowerCase();

        // Get existing pattern
        const { data: existingPattern } = await supabase
          .from('prediction_patterns')
          .select('*')
          .eq('household_id', householdId)
          .eq('normalized_name', normalizedName)
          .single();

        if (existingPattern) {
          // Update existing pattern
          const originalNames = new Set([
            ...(existingPattern.original_names || []),
            item.name
          ]);

          await supabase
            .from('prediction_patterns')
            .update({
              original_names: Array.from(originalNames),
              purchase_count: existingPattern.purchase_count + 1,
              last_purchased: new Date().toISOString(),
              category: item.category,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPattern.id);
        } else {
          // Create new pattern
          await supabase
            .from('prediction_patterns')
            .insert({
              household_id: householdId,
              normalized_name: normalizedName,
              original_names: [item.name],
              category: item.category,
              purchase_count: 1,
              last_purchased: new Date().toISOString()
            });
        }
      }
    } catch (error) {
      console.error('Error updating patterns:', error);
    }
  }

  async updatePreferences(
    householdId: string,
    preferences: PredictionPreferences
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('prediction_preferences')
        .upsert({
          household_id: householdId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  async getPreferences(householdId: string): Promise<PredictionPreferences> {
    try {
      // Try to get existing preferences
      const { data: existingPrefs } = await supabase
        .from('prediction_preferences')
        .select('max_suggestions, enable_notifications, notification_day, notification_time')
        .eq('household_id', householdId)
        .single();

      // If preferences exist, return them
      if (existingPrefs) {
        return {
          maxSuggestions: existingPrefs.max_suggestions,
          enableNotifications: existingPrefs.enable_notifications,
          notificationDay: existingPrefs.notification_day,
          notificationTime: existingPrefs.notification_time
        };
      }

      // If preferences don't exist, create default preferences
      const defaultPrefs = {
        max_suggestions: 5,
        enable_notifications: true,
        household_id: householdId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('prediction_preferences')
        .insert([defaultPrefs]);

      if (insertError) {
        console.error('Error creating default preferences:', insertError);
        throw insertError;
      }

      // Return the default preferences in the expected format
      return {
        maxSuggestions: defaultPrefs.max_suggestions,
        enableNotifications: defaultPrefs.enable_notifications
      };
    } catch (error) {
      console.error('Error getting/creating preferences:', error);
      // Return default preferences without saving if there's an error
      return {
        maxSuggestions: 5,
        enableNotifications: true
      };
    }
  }

  async findRelatedItems(items: GroceryItem[]): Promise<PredictedGroceryItem[]> {
    try {
      const itemNames = items.map(item => item.name);
      const relatedProducts = await aiPredictionService.findRelatedProducts(itemNames);

      // Convert related products to grocery items and enrich them
      const enrichedRelatedItems = await Promise.all(
        relatedProducts.map(async (product) => {
          try {
            const suggestion = await aiService.getItemSuggestions(product.name);
            return {
              id: crypto.randomUUID(),
              name: product.name,
              emoji: suggestion.emoji || '🛒',
              category: this.ensureCategory(suggestion.category),
              quantity: '1',
              priority: false,
              completed: false,
              household_id: items[0].household_id,
              explanation: 'Past bij je boodschappen',
              confidence: product.confidence,
              reason: 'RELATED' as const
            } satisfies PredictedGroceryItem;
          } catch (error) {
            console.error('Error enriching related item:', error);
            return {
              id: crypto.randomUUID(),
              name: product.name,
              emoji: '🛒',
              category: 'Overig' as Category,
              quantity: '1',
              priority: false,
              completed: false,
              household_id: items[0].household_id,
              explanation: 'Past bij je boodschappen',
              confidence: 0.5,
              reason: 'RELATED' as const
            } satisfies PredictedGroceryItem;
          }
        })
      );

      return enrichedRelatedItems;
    } catch (error) {
      console.error('Error finding related items:', error);
      return [];
    }
  }
}

export const predictionService = new PredictionService(); 