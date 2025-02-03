import { supermarketScraperService } from '../services/supermarket-scraper-service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Initialize Supabase client with service role key for full access

async function main() {
  try {
    console.log('Starting supermarket offers scraping...');
    await supermarketScraperService.scrapeAllOffers();
    console.log('Successfully completed scraping offers.');
    process.exit(0);
  } catch (error) {
    console.error('Error running scraper:', error);
    process.exit(1);
  }
}

main(); 