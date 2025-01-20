import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('Environment variables check:');
console.log('VITE_SUPABASE_URL exists:', Boolean(process.env.VITE_SUPABASE_URL));
console.log('VITE_SUPABASE_ANON_KEY exists:', Boolean(process.env.VITE_SUPABASE_ANON_KEY));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyEmbeddings() {
  console.log('\n🔍 Verifying embeddings...');

  try {
    const { data: offers, error } = await supabase
      .from('supermarket_offers')
      .select('id, product_name, embedding')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching offers:', error.message);
      return;
    }

    if (!offers || offers.length === 0) {
      console.log('❌ No offers found');
      return;
    }

    console.log('\nSample of offers with embeddings:');
    offers.forEach(offer => {
      console.log(`\n📦 Offer: ${offer.product_name}`);
      console.log(`🔢 Embedding dimensions: ${offer.embedding ? offer.embedding.length : 0}`);
      console.log(`✅ Has embedding: ${Boolean(offer.embedding)}`);
    });

    // Count total offers with embeddings
    const { count, error: countError } = await supabase
      .from('supermarket_offers')
      .select('id', { count: 'exact', head: true })
      .not('embedding', 'is', null);

    if (countError) {
      console.error('❌ Error counting offers:', countError.message);
      return;
    }

    console.log(`\n📊 Total offers with embeddings: ${count}`);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyEmbeddings()
  .catch(console.error); 