import { supermarketScraperService } from '../services/supermarket-scraper-service';

async function main() {
  try {
    console.log('Starting product scraping...');
    await supermarketScraperService.scrapeAllProducts();
    console.log('Successfully completed scraping products.');
    process.exit(0);
  } catch (error) {
    console.error('Error running scraper:', error);
    process.exit(1);
  }
}

main(); 