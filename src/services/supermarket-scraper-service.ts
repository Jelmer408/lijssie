import { supabase } from '@/lib/supabase';
import type { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';
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

interface Product {
  id: string;
  title: string;
  quantity_info: string;
  last_updated: string;
  image_url: string;
  category: string;
  supermarket_data: {
    supermarket: string;
    logo_url: string;
    price: string;
    price_per_unit: string;
    sale_valid_from?: string;
    sale_percentage?: string;
  }[];
  created_at: string;
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
      const offers = await page.evaluate((supermarket, validFromStr, validUntilStr) => {
        // Get all offer elements
        const offerElements = Array.from(document.querySelectorAll('#left-holder > ul > li'));
        console.log(`Found ${offerElements.length} offers`);

        const validFrom = new Date(validFromStr);
        const validUntil = new Date(validUntilStr);

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
            valid_from: validFrom.toISOString(),
            valid_until: validUntil.toISOString(),
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
      }, supermarket, validityDates.validFrom.toISOString(), validityDates.validUntil.toISOString());

      console.log(`Found ${offers.length} valid offers for ${supermarket.toUpperCase()}`);

      // Convert the ISO strings back to Date objects before saving
      const offersWithDates = offers.map(offer => ({
        ...offer,
        valid_from: new Date(offer.valid_from),
        valid_until: new Date(offer.valid_until)
      }));

      if (offers.length === 0) {
        // Take a screenshot for debugging
        await page.screenshot({ path: `${supermarket}-debug.png`, fullPage: true });
        console.log(`Saved debug screenshot to ${supermarket}-debug.png`);
        
        // Log the page content
        const content = await page.content();
        console.log('Page content:', content);
      } else {
        // Save offers to database
        await this.saveOffersToSupabase(offersWithDates);
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

      // Parse Dutch dates
      function parseDutchDate(dateStr: string | null): Date | null {
        if (!dateStr) return null;
        
        const dutchMonths: { [key: string]: number } = {
          'januari': 0, 'februari': 1, 'maart': 2, 'april': 3, 'mei': 4, 'juni': 5,
          'juli': 6, 'augustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'december': 11
        };

        const parts = dateStr.toLowerCase().split(' ');
        if (parts.length >= 3) {
          const day = parseInt(parts[0]);
          const month = dutchMonths[parts[1]];
          const year = parseInt(parts[2]);
          
          if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
        return null;
      }

      // Parse the dates
      const currentDate = new Date();
      const validFrom = parseDutchDate(validFromText) || new Date(currentDate);
      const validUntil = parseDutchDate(validUntilText) || new Date(currentDate);

      if (!validFromText || !validUntilText || validUntil <= currentDate) {
        // Default to current week if no dates found or if validUntil is in the past
        validFrom.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
        validUntil.setDate(validFrom.getDate() + 6); // Sunday
        
        // If validUntil is still in the past or today, add a week
        if (validUntil <= currentDate) {
          validFrom.setDate(validFrom.getDate() + 7);
          validUntil.setDate(validUntil.getDate() + 7);
        }
      }

      // Ensure both dates are valid
      if (isNaN(validFrom.getTime()) || isNaN(validUntil.getTime())) {
        throw new Error('Invalid date after parsing');
      }

      return { validFrom, validUntil };
    } catch (error) {
      console.error('Error getting validity dates:', error);
      // Return default dates on error (always future dates)
      const currentDate = new Date();
      const validFrom = new Date(currentDate);
      validFrom.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
      const validUntil = new Date(validFrom);
      validUntil.setDate(validFrom.getDate() + 6); // Sunday
      
      // If validUntil is in the past or today, add a week
      if (validUntil <= currentDate) {
        validFrom.setDate(validFrom.getDate() + 7);
        validUntil.setDate(validUntil.getDate() + 7);
      }
      
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

  async scrapeAllProducts() {
    console.log('Checking database connection...');
    try {
      const { error: healthCheckError } = await supabase.from('products').select('count').limit(1);
      if (healthCheckError) {
        console.error('Database health check failed:', healthCheckError);
        throw healthCheckError;
      }
      console.log('Database connection successful');
    } catch (error) {
      console.error('Error connecting to database:', error);
      throw error;
    }

    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to the main page
      await page.goto('https://schapr.nl/boodschappen', { waitUntil: 'networkidle0' });

      // Get all category links
      const categoryLinks = await page.$$eval(
        'div.-mt-1.grid.w-full.grid-cols-1.gap-2\\.5.md\\:mt-0.md\\:grid-cols-3.lg\\:grid-cols-5.lg\\:gap-2.xl\\:grid-cols-6\\.2xl\\:grid-cols-7 > a',
        (links: HTMLAnchorElement[]) => links.map(link => ({
          href: link.href,
          category: link.textContent?.trim() || ''
        }))
      );

      for (const { href: categoryUrl, category } of categoryLinks) {
        console.log(`Scraping category: ${category}`);
        await page.goto(categoryUrl, { waitUntil: 'networkidle0' });

        // Get all product links in this category
        const productLinks = await page.$$eval(
          'div.ais-Hits article > a',
          (links: HTMLAnchorElement[]) => links.map(link => link.href)
        );

        for (const productUrl of productLinks) {
          try {
            await page.goto(productUrl, { waitUntil: 'networkidle0' });

            // Extract product details
            const product: Product = {
              id: productUrl.split('/').pop() || '',
              title: await page.$eval('#product-detail h1', (el: HTMLElement) => el.textContent?.trim() || ''),
              quantity_info: await page.$eval('#product-detail > div:nth-child(1) > span', (el: HTMLElement) => el.textContent?.trim() || ''),
              last_updated: await page.$eval('#product-detail > div:nth-child(1) > p', (el: HTMLElement) => el.textContent?.trim() || ''),
              image_url: await page.$eval('img.h-full.w-full.object-contain', (el: HTMLImageElement) => el.getAttribute('src') || ''),
              category,
              supermarket_data: [],
              created_at: new Date().toISOString()
            };

            // Extract supermarket data
            const supermarketElements = await page.$$('div.relative.order-3 > div > div');
            for (const element of supermarketElements) {
              const supermarketData = {
                supermarket: await element.$eval('img', (el: HTMLImageElement) => el.getAttribute('alt') || ''),
                logo_url: await element.$eval('img', (el: HTMLImageElement) => el.getAttribute('src') || ''),
                price: await element.$eval('div.flex.grow span', (el: HTMLElement) => el.textContent?.trim() || ''),
                price_per_unit: await element.$eval('div.flex.grow p', (el: HTMLElement) => el.textContent?.trim() || ''),
                sale_valid_from: await element.$eval('span.text-xs.text-blue-primary', (el: HTMLElement) => el.textContent?.trim() || '').catch(() => undefined),
                sale_percentage: await element.$eval('span.md\\:text-md.line-clamp-1', (el: HTMLElement) => el.textContent?.trim() || '').catch(() => undefined)
              };
              product.supermarket_data.push(supermarketData);
            }

            // Upsert product to database
            const { error } = await supabase
              .from('products')
              .upsert(product, { onConflict: 'id' });

            if (error) {
              console.error(`Error upserting product ${product.id}:`, error);
            }

            // Add a small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error scraping product ${productUrl}:`, error);
          }
        }
      }
    } finally {
      await browser.close();
    }
  }
}

export const supermarketScraperService = new SupermarketScraperService(); 