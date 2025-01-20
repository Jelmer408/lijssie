import { supabase } from '@/lib/supabase';
import { Browser } from 'puppeteer';
import puppeteer_extra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin
puppeteer_extra.use(StealthPlugin());

interface SupermarketOffer {
  supermarket: 'ah' | 'jumbo' | 'dirk' | 'lidl' | 'aldi' | 'plus';
  product_name: string;
  description?: string;
  original_price?: string;
  offer_price: string;
  discount_percentage?: number;
  sale_type?: string;
  valid_from: Date;
  valid_until: Date;
  image_url?: string;
}

class SupermarketScraperService {
  private readonly SUPERMARKET_URLS = {
    ah: 'https://www.supermarktaanbiedingen.com/aanbiedingen/albert_heijn',
    jumbo: 'https://www.supermarktaanbiedingen.com/aanbiedingen/jumbo',
    dirk: 'https://www.supermarktaanbiedingen.com/aanbiedingen/dirk',
    lidl: 'https://www.supermarktaanbiedingen.com/aanbiedingen/lidl',
    aldi: 'https://www.supermarktaanbiedingen.com/aanbiedingen/aldi',
    plus: 'https://www.supermarktaanbiedingen.com/aanbiedingen/plus'
  };

  async scrapeAllOffers(): Promise<void> {
    try {
      console.log('Starting to scrape all supermarket offers');
      
      // Launch browser with stealth plugin
      const browser = await puppeteer_extra.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ],
        protocolTimeout: 180000, // Increase protocol timeout to 3 minutes
        timeout: 180000 // Increase overall timeout to 3 minutes
      });

      // Scrape each supermarket
      await Promise.all([
        this.scrapeOffers(browser, 'ah'),
        this.scrapeOffers(browser, 'jumbo'),
        this.scrapeOffers(browser, 'dirk'),
        this.scrapeOffers(browser, 'lidl'),
        this.scrapeOffers(browser, 'aldi'),
        this.scrapeOffers(browser, 'plus')
      ]);

      await browser.close();
      console.log('Finished scraping all supermarket offers');
    } catch (error) {
      console.error('Error scraping supermarket offers:', error);
      throw error;
    }
  }

  private async scrapeOffers(browser: Browser, supermarket: 'ah' | 'jumbo' | 'dirk' | 'lidl' | 'aldi' | 'plus'): Promise<void> {
    try {
      console.log(`Scraping ${supermarket.toUpperCase()} offers`);
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set default timeout for all operations
      await page.setDefaultTimeout(180000); // 3 minutes timeout
      await page.setDefaultNavigationTimeout(180000);
      
      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      });

      // Add random delay before navigation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
      
      // Navigate to the offers page
      console.log(`Navigating to ${this.SUPERMARKET_URLS[supermarket]}`);
      await page.goto(this.SUPERMARKET_URLS[supermarket], { 
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Wait for Cloudflare check to pass and content to load
      await page.waitForFunction(() => {
        const cfChallenge = document.querySelector('#challenge-running');
        return !cfChallenge;
      }, { timeout: 30000 }).catch(() => console.log('No Cloudflare challenge detected'));

      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Wait for the offers list to load with retry mechanism
      console.log('Waiting for offers to load...');
      let retries = 3;
      while (retries > 0) {
        try {
          await page.waitForSelector('#left-holder > ul', { timeout: 30000 });
          break;
        } catch (error) {
          console.log(`Retry ${4 - retries}/3: Waiting for offers list...`);
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Scroll through the page to ensure all content is loaded
      await this.autoScroll(page);

      // Get validity dates
      const validityDates = await this.getValidityDates(page, supermarket);
      
      // Extract all offers from the page
      console.log('Extracting offers...');
      const offers = await page.evaluate((supermarket, validFrom, validUntil) => {
        // Get all offer elements
        const offerElements = Array.from(document.querySelectorAll('#left-holder > ul > li'));
        console.log(`Found ${offerElements.length} offers`);

        return offerElements.map((offer: Element) => {
          const productCard = offer.querySelector('div');
          if (!productCard) return null;

          const titleElement = productCard.querySelector('div > a > div.card_info > div.card_content > h3');
          const priceElement = productCard.querySelector('div > a > div.card_action-bar > span.card_prijs');
          const originalPriceElement = productCard.querySelector('div > a > div.card_action-bar > span.card_prijs-oud');
          const imageElement = productCard.querySelector('div > a > div.card_info > div.card_image > img');
          const saleTypeElement = productCard.querySelector('div > a > div.card_info > div.card_content > p');

          const productName = titleElement?.textContent?.trim() || '';
          const priceText = priceElement?.textContent?.trim() || '0';
          
          // Clean and parse the original price
          let originalPrice: string | undefined;
          if (originalPriceElement) {
            // Get the actual text content, handling HTML entities
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = originalPriceElement.innerHTML;
            const originalPriceText = tempDiv.textContent?.trim() || '';

            // Extract the last number from the text (which is always the price)
            const priceMatch = originalPriceText.match(/(\d+[,.]?\d*)(?:\s*(?:€|\EUR)?\s*)$/);
            if (priceMatch) {
              const extractedPrice = priceMatch[1];
              const cleanOriginalPrice = extractedPrice
                .replace(/[^\d,\-]/g, '') // Remove everything except digits, commas and dashes
                .split('-')[0] // Take the first price if there are multiple
                .trim();
              
              // Convert the original price to have exactly two decimal places with comma
              originalPrice = cleanOriginalPrice ? 
                (parseInt(cleanOriginalPrice.replace(',', '')) / 100).toFixed(2).replace('.', ',') : 
                undefined;
            }
          }

          // Clean and parse the current price
          const priceMatch = priceText.match(/(\d+[,.]?\d*)(?:\s*(?:€|\EUR)?\s*)$/);
          const cleanPriceText = priceMatch ? 
            priceMatch[1].replace(/[^\d,\-]/g, '').split('-')[0].trim() : 
            priceText.replace(/[^\d,\-]/g, '').split('-')[0].trim();

          // Convert the price to have exactly two decimal places with comma
          const price = cleanPriceText ? 
            (parseInt(cleanPriceText.replace(',', '')) / 100).toFixed(2).replace('.', ',') : 
            '0,00';

          // Calculate discount percentage using the string prices
          let discountPercentage: number | undefined;
          if (originalPrice && price) {
            // Convert to numbers for calculation by temporarily using dots
            const origPrice = parseFloat(originalPrice.replace(',', '.'));
            const currPrice = parseFloat(price.replace(',', '.'));
            if (!isNaN(origPrice) && !isNaN(currPrice) && origPrice > 0) {
              discountPercentage = Math.round(((origPrice - currPrice) / origPrice) * 100);
            }
          }

          const result = {
            supermarket,
            product_name: productName,
            description: saleTypeElement?.textContent?.trim(),
            original_price: originalPrice,
            offer_price: price,
            discount_percentage: discountPercentage,
            sale_type: saleTypeElement?.textContent?.trim(),
            valid_from: validFrom,
            valid_until: validUntil,
            image_url: imageElement?.getAttribute('src') || undefined
          };

          return result;
        })
        .filter((offer): offer is NonNullable<typeof offer> => 
          offer !== null && 
          offer.product_name !== '' && 
          parseFloat(offer.offer_price.replace(',', '.')) > 0 &&
          (!offer.original_price || parseFloat(offer.original_price.replace(',', '.')) >= parseFloat(offer.offer_price.replace(',', '.')))
        );
      }, supermarket, validityDates.validFrom, validityDates.validUntil);

      console.log(`Found ${offers.length} valid offers for ${supermarket.toUpperCase()}`);

      if (offers.length === 0) {
        // Take a screenshot for debugging
        await page.screenshot({ path: `${supermarket}-debug.png`, fullPage: true });
        console.log(`Saved debug screenshot to ${supermarket}-debug.png`);
        
        // Log the page content
        const content = await page.content();
        console.log('Page content:', content);
      } else {
        // Save offers to database
        await this.saveOffersToSupabase(offers);
        console.log(`Successfully saved ${offers.length} offers for ${supermarket.toUpperCase()}`);
      }

      await page.close();
    } catch (error) {
      console.error(`Error scraping ${supermarket.toUpperCase()} offers:`, error);
      throw error;
    }
  }

  private async getValidityDates(page: any, supermarket: 'ah' | 'jumbo' | 'dirk' | 'lidl' | 'aldi' | 'plus'): Promise<{ validFrom: Date; validUntil: Date }> {
    try {
      const [validFromText, validUntilText] = await page.evaluate((supermarket: string) => {
        const fromElement = document.querySelector(`#left-holder > div.folder.${supermarket} > h2 > small > span > span:nth-child(1)`);
        const untilElement = document.querySelector(`#left-holder > div.folder.${supermarket} > h2 > small > span > span:nth-child(2)`);
        return [
          fromElement?.textContent?.trim() || null,
          untilElement?.textContent?.trim() || null
        ];
      }, supermarket);

      console.log('Validity dates:', { validFromText, validUntilText });

      // Parse the dates
      const currentDate = new Date();
      const validFrom = validFromText ? new Date(validFromText) : new Date(currentDate);
      const validUntil = validUntilText ? new Date(validUntilText) : new Date(currentDate);

      if (!validFromText || !validUntilText) {
        // Default to current week if no dates found
        validFrom.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
        validUntil.setDate(validFrom.getDate() + 6); // Sunday
      }

      return { validFrom, validUntil };
    } catch (error) {
      console.error('Error getting validity dates:', error);
      // Return default dates on error
      const currentDate = new Date();
      const validFrom = new Date(currentDate);
      validFrom.setDate(currentDate.getDate() - currentDate.getDay() + 1);
      const validUntil = new Date(validFrom);
      validUntil.setDate(validFrom.getDate() + 6);
      return { validFrom, validUntil };
    }
  }

  private async saveOffersToSupabase(offers: SupermarketOffer[]): Promise<void> {
    try {
      // First, delete all existing offers for this supermarket
      const { error: deleteError } = await supabase
        .from('supermarket_offers')
        .delete()
        .eq('supermarket', offers[0].supermarket);

      if (deleteError) {
        console.error('Error deleting old offers:', deleteError);
        throw deleteError;
      }

      console.log(`Deleted old offers for ${offers[0].supermarket.toUpperCase()}`);

      // Then insert the new offers
      const { error: insertError } = await supabase
        .from('supermarket_offers')
        .insert(offers);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error saving offers to Supabase:', error);
      throw error;
    }
  }

  // Add new helper method for auto-scrolling
  private async autoScroll(page: any): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }
}

export const supermarketScraperService = new SupermarketScraperService(); 