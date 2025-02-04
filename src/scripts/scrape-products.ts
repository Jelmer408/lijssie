import puppeteer from 'puppeteer';
import fs from "fs"
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const chunkIndex = parseInt(process.env.CHUNK_INDEX || '0', 10);
const totalChunks = parseInt(process.env.TOTAL_CHUNKS || '1', 10);

// Browser configuration for better performance
const BROWSER_CONFIG = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920x1080',
  ]
};

// Page configuration for better performance
const PAGE_CONFIG = {
  waitUntil: 'networkidle0' as 'networkidle0',
  timeout: 30000,
};

// Concurrent processing settings
const CONCURRENT_PAGES = 5; // Number of concurrent pages to process
const WAIT_TIME = 500; // Reduced wait time between actions

interface Subcategory {
  name: string;
  url: string;
  mainCategory: string;
}

interface Supermarket {
  name: string;
  logoUrl: string;
  price: string;
  pricePerUnit: string;
  offerText?: string;
  offerEndDate?: string;
}

interface Product {
  name: string;
  imageUrl: string;
  weight: string;
  category: string;
  subcategory: string;
  mainCategory: string;
  price: string;
  pricePerUnit: string;
  supermarkets: Supermarket[];
  itemUrl?: string;
}

async function upsertProduct(product: Product) {
  try {
    if (!product.itemUrl) {
      console.error('Product URL is missing:', product.name);
      return;
    }

    // First, check if product exists by URL
    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .eq('url', product.itemUrl)
      .limit(1);

    if (fetchError) {
      console.error('Error fetching existing product:', fetchError);
      return;
    }

    const now = new Date().toISOString();

    if (existingProducts && existingProducts.length > 0) {
      // Update existing product
      const { error: updateError } = await supabase
        .from('products')
        .update({
          title: product.name,
          image_url: product.imageUrl,
          quantity_info: product.weight,
          category: product.category,
          subcategory: product.subcategory,
          main_category: product.mainCategory,
          supermarket_data: product.supermarkets,
          last_updated: now,
          url: product.itemUrl,
          updated_at: now
        })
        .eq('id', existingProducts[0].id);

      if (updateError) {
        console.error('Error updating product in products table:', updateError);
      } else {
        console.log(`Updated product in products table: ${product.name} (${existingProducts[0].id})`);
      }
    } else {
      // Insert new product with UUID
      const id = uuidv4(); // Generate proper UUID
      const { error: insertError } = await supabase
        .from('products')
        .insert([{
          id,
          title: product.name,
          image_url: product.imageUrl,
          quantity_info: product.weight,
          category: product.category,
          subcategory: product.subcategory,
          main_category: product.mainCategory,
          supermarket_data: product.supermarkets,
          last_updated: now,
          url: product.itemUrl,
          created_at: now,
          updated_at: now
        }]);

      if (insertError) {
        console.error('Error inserting product into products table:', insertError);
      } else {
        console.log(`Inserted new product into products table: ${product.name} (${id})`);
      }
    }
  } catch (error) {
    console.error(`Failed to upsert product ${product.name} in products table:`, error);
  }
}

async function processProductUrl(browser: puppeteer.Browser, productUrl: string, subcategory: Subcategory): Promise<Product | null> {
  const page = await browser.newPage();
  try {
    // Set performance configs
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto(productUrl, PAGE_CONFIG);
    await page.waitForSelector('.text-xl.font-bold.md\\:text-3xl', { timeout: 5000 });

    // Click "Toon alles" button to expand supermarket list
    await page.evaluate(() => {
      const expandButton = document.querySelector('.absolute.bottom-0.left-1\\/2.flex.h-12.w-\\[calc\\(100\\%_\\+_10px\\)\\].-translate-x-1\\/2.items-end.justify-center.\\!border-none.bg-gradient-to-t.from-white.to-\\[\\#ffffff9c\\].dark\\:from-stone-900.md\\:h-16 > button');
      if (expandButton) {
        (expandButton as HTMLButtonElement).click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, WAIT_TIME));

    const productDetails = await page.evaluate(async (subcategoryData) => {
      const name = document.querySelector('.text-xl.font-bold.md\\:text-3xl')?.textContent?.trim();
      const imageElement = document.querySelector('.h-full.w-full.object-contain.opacity-100.transition-opacity.lazyLoad.isLoaded') as HTMLImageElement;
      const imageUrl = imageElement?.src;
      const weight = document.querySelector('.text-\\[15px\\].font-medium.text-gray-500')?.textContent?.trim();
      const breadcrumbCategory = document.querySelector('#__nuxt > div > div.container.relative.mx-auto.px-4.md\\:pb-8.container.mx-auto.px-4.pb-20.pt-28.text-black.dark\\:text-gray-100.md\\:mb-16.md\\:min-h-screen > nav > ol > li:nth-child(2) > a > span')?.textContent?.trim();
      const price = document.querySelector('.flex.items-center.gap-1.text-xl.font-bold.text-gray-900.md\\:text-2xl')?.textContent?.trim();
      const pricePerUnit = document.querySelector('.mr-2.flex.shrink-0.flex-col.items-start.md\\:mr-4.lg\\:basis-1\\/2.xl\\:basis-1\\/3 > p')?.textContent?.trim();
      const supermarketList = document.querySelector('#__nuxt > div > div.container.relative.mx-auto.px-4.md\\:pb-8.container.mx-auto.px-4.pb-20.pt-28.text-black.dark\\:text-gray-100.md\\:mb-16.md\\:min-h-screen > main > div.mt-6.flex.w-full.items-center.md\\:mt-0 > div > div.relative.order-3');

      if (!name || !imageUrl || !price) {
        return null;
      }

      let supermarkets: Supermarket[] = [];
      if (supermarketList) {
        const supermarketItems = Array.from(supermarketList.querySelectorAll('.divide-y.divide-solid.dark\\:divide-stone-700 > div'));
        supermarkets = supermarketItems
          .map((supermarket) => {
            const logoUrl = supermarket.querySelector('img.max-h-5.w-fit.object-contain.md\\:max-h-6')?.getAttribute('src');
            const price = supermarket.querySelector('.flex.items-center.gap-1.text-xl.font-bold.text-gray-900')?.textContent?.trim();
            const pricePerUnit = supermarket.querySelector('.text-xs.text-gray-500')?.textContent?.trim();
            const offerText = supermarket.querySelector('.md\\:text-md.line-clamp-1.w-fit.rounded.px-2\\.5.py-0\\.5.text-sm.font-semibold.bg-green-100')?.textContent?.trim();
            const offerEndDate = supermarket.querySelector('.text-xs.text-green-dark')?.textContent?.trim();

            let marketName = logoUrl ? logoUrl.split('/')[2]?.split('-')[0] : '';
            let url = `https://schapr.nl${logoUrl}`

            if (marketName === 'image') {
              const logoUrl2 = supermarket.querySelector('img.max-h-5.w-fit.object-contain.md\\:max-h-6')?.getAttribute('src');
              marketName = logoUrl2 ? logoUrl2.split('/')[2]?.split('-')[0] : '';
              url = `https://schapr.nl${logoUrl2}`
            }

            if (!price) return null;

            return {
              name: marketName,
              logoUrl: url || '',
              price,
              pricePerUnit: pricePerUnit || '',
              ...(offerText ? { offerText } : {}),
              ...(offerEndDate ? { offerEndDate } : {})
            };
          })
          .filter((supermarket): supermarket is Supermarket => supermarket !== null);
      }

      return {
        name,
        imageUrl,
        weight: weight || '',
        category: breadcrumbCategory || subcategoryData.mainCategory,
        subcategory: subcategoryData.name,
        mainCategory: subcategoryData.mainCategory,
        price,
        pricePerUnit: pricePerUnit || '',
        supermarkets,
        itemUrl: window.location.href
      } as Product;
    }, {
      name: subcategory.name,
      mainCategory: subcategory.mainCategory
    });

    return productDetails;
  } catch (error) {
    console.error(`Error processing product ${productUrl}:`, error);
    return null;
  } finally {
    await page.close();
  }
}

async function processProductUrls(browser: puppeteer.Browser, productUrls: string[], subcategory: Subcategory) {
  const products: Product[] = [];
  
  // Process products in batches
  for (let i = 0; i < productUrls.length; i += CONCURRENT_PAGES) {
    const batch = productUrls.slice(i, i + CONCURRENT_PAGES);
    const batchPromises = batch.map(url => processProductUrl(browser, url, subcategory));
    
    const batchResults = await Promise.all(batchPromises);
    const validProducts = batchResults.filter((product): product is Product => product !== null);
    
    // Upsert products in parallel
    await Promise.all(validProducts.map(product => upsertProduct(product)));
    
    products.push(...validProducts);
  }
  
  return products;
}

async function scrapeProducts() {
  const browser = await puppeteer.launch(BROWSER_CONFIG);
  const page = await browser.newPage();

  try {
    console.log('Starting Product Scraper');
    await page.goto("https://schapr.nl/boodschappen", PAGE_CONFIG);

    const mainSelector = '#__nuxt > div > main > div.flex.flex-col.gap-12 > div.flex.flex-col.gap-4 > div';
    await page.waitForSelector(mainSelector, { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, WAIT_TIME));

    const subcategories = await page.evaluate(() => {
      const subcategoryLinks: Subcategory[] = [];

      const categoryContainer = document.querySelector('#__nuxt > div > main > div.flex.flex-col.gap-12 > div.flex.flex-col.gap-4 > div');
      if (!categoryContainer) return subcategoryLinks;

      const categoryBoxes = categoryContainer.querySelectorAll('div');

      categoryBoxes.forEach(box => {
        const mainCategoryName = box.querySelector('p')?.textContent?.trim() || '';

        const subcategoryContainer = box.querySelector('div');
        if (!subcategoryContainer) return;

        const links = subcategoryContainer.querySelectorAll('a');

        links.forEach(link => {
          const name = link.textContent?.trim() || '';
          const url = (link as HTMLAnchorElement).href;

          if (name && url) {
            subcategoryLinks.push({
              name,
              url,
              mainCategory: mainCategoryName
            });
          }
        });
      });

      return subcategoryLinks;
    });

    console.log(`Total subcategories found: ${subcategories.length}`);

    const chunkSize = Math.ceil(subcategories.length / totalChunks);
    const startIndex = chunkIndex * chunkSize;
    const endIndex = Math.min(startIndex + chunkSize, subcategories.length);
    const chunkSubcategories = subcategories.slice(startIndex, endIndex);

    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunkSubcategories.length} subcategories)`);

    for (const subcategory of chunkSubcategories) {
      console.log(`Processing subcategory: ${subcategory.name}`);
      let pageNumber = 1;
      let totalPages = 1;
      let totalCheck = true;
      let subCatAllProducts: Product[] = [];

      while (pageNumber <= totalPages) {
        const currentUrl = subcategory.url + (pageNumber > 1 ? `?pagina=${pageNumber}` : '');
        await page.goto(currentUrl, PAGE_CONFIG);
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME));

        try {
          await page.waitForSelector('#__nuxt > div > main > main > section > div > div > div.min-h-dvh.w-full > div.ais-StateResults.w-full > div.ais-Hits', { timeout: 5000 });
        } catch (error) {
          console.log('No more products found on this page');
          break;
        }

        if (totalCheck) {
          totalPages = await page.evaluate(() => {
            const paginationContainer = document.querySelectorAll('#__nuxt > div > main > main > section > div > div > div.min-h-dvh.w-full > div.mx-auto.my-2.md\\:mt-4 > div > ul > li.gap-8 > a');
            return Array.from(paginationContainer).length || 1;
          });
          totalCheck = false;
          console.log(`Found ${totalPages} pages for subcategory: ${subcategory.name}`);
        }

        const productUrls = await page.evaluate(() => {
          const productElements = document.querySelectorAll('#__nuxt > div > main > main > section > div > div > div.min-h-dvh.w-full > div.ais-StateResults.w-full > div.ais-Hits article > a');
          return Array.from(productElements).map(product => (product as HTMLAnchorElement).href);
        });

        console.log(`Processing ${productUrls.length} products on page ${pageNumber}`);
        const pageProducts = await processProductUrls(browser, productUrls, subcategory);
        subCatAllProducts = [...subCatAllProducts, ...pageProducts];
        pageNumber++;
      }

      const filePath = `./${subcategory.name.replace(/[^a-z0-9]/gi, '_')}.json`;
      fs.writeFileSync(filePath, JSON.stringify(subCatAllProducts, null, 2));
      console.log(`Total ${subCatAllProducts.length} products in this category`);
    }

    console.log('Scraping completed successfully');
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    await scrapeProducts();
    process.exit(0);
  } catch (error) {
    console.error('Error running scraper:', error);
    process.exit(1);
  }
}

main();
