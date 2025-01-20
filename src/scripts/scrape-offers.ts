import { supermarketScraperService } from '../services/supermarket-scraper-service';

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