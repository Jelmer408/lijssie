import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pLimit from 'p-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Initialize Supabase client with service role key for full access
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface SupermarketOffer {
  id: string;
  product_name: string;
  description: string | null;
  category: string | null;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 384,
  });
  return response.data[0].embedding;
}

async function updateOfferEmbedding(offer: SupermarketOffer): Promise<void> {
  // Combine relevant text fields for embedding
  const textToEmbed = [
    offer.product_name,
    offer.description,
    offer.category
  ].filter(Boolean).join(' ');

  try {
    const embedding = await generateEmbedding(textToEmbed);
    
    const { error } = await supabase
      .from('supermarket_offers')
      .update({ embedding })
      .eq('id', offer.id);

    if (error) {
      console.error(`Error updating embedding for offer ${offer.id}:`, error);
    } else {
      console.log(`✅ Updated embedding for offer ${offer.id}`);
    }
  } catch (error) {
    console.error(`Failed to generate embedding for offer ${offer.id}:`, error);
  }
}

async function main() {
  console.log('🚀 Starting embedding generation...');

  // Get all offers without embeddings
  const { data: offers, error } = await supabase
    .from('supermarket_offers')
    .select('id, product_name, description, category')
    .is('embedding', null);

  if (error) {
    console.error('Error fetching offers:', error);
    return;
  }

  if (!offers || offers.length === 0) {
    console.log('✨ No offers found needing embeddings');
    return;
  }

  console.log(`📦 Found ${offers.length} offers needing embeddings`);

  // Process in batches with concurrency limit
  const limit = pLimit(5); // Process 5 offers concurrently
  const batchSize = 100;
  const batches = [];

  for (let i = 0; i < offers.length; i += batchSize) {
    batches.push(offers.slice(i, i + batchSize));
  }

  for (const [batchIndex, batch] of batches.entries()) {
    console.log(`\n🔄 Processing batch ${batchIndex + 1}/${batches.length}`);
    
    await Promise.all(
      batch.map(offer => limit(() => updateOfferEmbedding(offer)))
    );

    // Add a small delay between batches to avoid rate limits
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n✨ Finished generating embeddings!');
}

// Run the script
main().catch(console.error); 