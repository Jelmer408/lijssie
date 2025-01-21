import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

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

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function initializeDatabase() {
  // Create products table if it doesn't exist
  const { error: tableError } = await supabase.from('products').select().limit(1);
  
  if (tableError) {
    await supabase.rpc('create_products_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          quantity_info TEXT,
          last_updated TEXT,
          image_url TEXT,
          category TEXT,
          supermarket_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
      `
    });
  }
}

async function scrapeProducts() {
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
      links => links.map(link => ({
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
        links => links.map(link => link.href)
      );

      for (const productUrl of productLinks) {
        try {
          await page.goto(productUrl, { waitUntil: 'networkidle0' });

          // Extract product details
          const product: Product = {
            id: productUrl.split('/').pop() || '',
            title: await page.$eval('#product-detail h1', el => el.textContent?.trim() || ''),
            quantity_info: await page.$eval('#product-detail > div:nth-child(1) > span', el => el.textContent?.trim() || ''),
            last_updated: await page.$eval('#product-detail > div:nth-child(1) > p', el => el.textContent?.trim() || ''),
            image_url: await page.$eval('img.h-full.w-full.object-contain', el => el.getAttribute('src') || ''),
            category,
            supermarket_data: [],
            created_at: new Date().toISOString()
          };

          // Extract supermarket data
          const supermarketElements = await page.$$('div.relative.order-3 > div > div');
          for (const element of supermarketElements) {
            const supermarketData = {
              supermarket: await element.$eval('img', el => el.getAttribute('alt') || ''),
              logo_url: await element.$eval('img', el => el.getAttribute('src') || ''),
              price: await element.$eval('div.flex.grow span', el => el.textContent?.trim() || ''),
              price_per_unit: await element.$eval('div.flex.grow p', el => el.textContent?.trim() || ''),
              sale_valid_from: await element.$eval('span.text-xs.text-blue-primary', el => el.textContent?.trim() || '').catch(() => undefined),
              sale_percentage: await element.$eval('span.md\\:text-md.line-clamp-1', el => el.textContent?.trim() || '').catch(() => undefined)
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

async function main() {
  try {
    await initializeDatabase();
    await scrapeProducts();
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

main(); 