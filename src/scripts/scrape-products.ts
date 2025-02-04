import puppeteer from 'puppeteer';
import fs from "fs"
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with explicit schema
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    db: {
      schema: 'public'
    }
  }
);

// Get chunk information from environment variables
const chunkIndex = parseInt(process.env.CHUNK_INDEX || '0', 10);
const totalChunks = parseInt(process.env.TOTAL_CHUNKS || '1', 10);

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

    // Prepare the data with explicit typing for JSONB
    const now = new Date().toISOString();
    const supermarketData = product.supermarkets.map(sm => ({
      name: sm.name,
      logoUrl: sm.logoUrl,
      price: sm.price,
      pricePerUnit: sm.pricePerUnit,
      ...(sm.offerText ? { offerText: sm.offerText } : {}),
      ...(sm.offerEndDate ? { offerEndDate: sm.offerEndDate } : {})
    }));

    if (existingProducts && existingProducts.length > 0) {
      // Direct SQL query for update to ensure we're hitting the right table
      const { error: updateError } = await supabase.rpc('update_product', {
        p_id: existingProducts[0].id,
        p_title: product.name,
        p_image_url: product.imageUrl,
        p_quantity_info: product.weight,
        p_category: product.category,
        p_subcategory: product.subcategory,
        p_main_category: product.mainCategory,
        p_supermarket_data: supermarketData,
        p_last_updated: now,
        p_url: product.itemUrl
      });

      if (updateError) {
        console.error('Error updating product in products table:', updateError);
      } else {
        console.log(`Updated product in products table: ${product.name} (${existingProducts[0].id})`);
      }
    } else {
      // Direct SQL query for insert to ensure we're hitting the right table
      const id = Math.floor(Math.random() * 1000000000000).toString();
      const { error: insertError } = await supabase.rpc('insert_product', {
        p_id: id,
        p_title: product.name,
        p_image_url: product.imageUrl,
        p_quantity_info: product.weight,
        p_category: product.category,
        p_subcategory: product.subcategory,
        p_main_category: product.mainCategory,
        p_supermarket_data: supermarketData,
        p_last_updated: now,
        p_url: product.itemUrl
      });

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

async function scrapeProducts() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const supermarketUrl = "https://schapr.nl/boodschappen"
  const page = await browser.newPage();

  try {
    console.log('Starting Product Scraper');

    await page.goto(supermarketUrl, { waitUntil: 'networkidle2' });

    const mainSelector = '#__nuxt > div > main > div.flex.flex-col.gap-12 > div.flex.flex-col.gap-4 > div';
    await page.waitForSelector(mainSelector, { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

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

    // Calculate chunk size and get subcategories for this chunk
    const chunkSize = Math.ceil(subcategories.length / totalChunks);
    const startIndex = chunkIndex * chunkSize;
    const endIndex = Math.min(startIndex + chunkSize, subcategories.length);
    const chunkSubcategories = subcategories.slice(startIndex, endIndex);

    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunkSubcategories.length} subcategories)`);

    for (const subcategory of chunkSubcategories) {
      console.log(`Processing subcategory: ${subcategory.name}`);
      let pageNumber = 1;
      let totalPages = 1;
      let totalCheck = true; // Reset for each subcategory
      let subCatAllProducts: Product[] = [];

      while (pageNumber <= totalPages) {
        const currentUrl = subcategory.url + (pageNumber > 1 ? `?pagina=${pageNumber}` : '');
        console.log(`Navigating to: ${currentUrl}`);

        await page.goto(currentUrl, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          await page.waitForSelector('#__nuxt > div > main > main > section > div > div > div.min-h-dvh.w-full > div.ais-StateResults.w-full > div.ais-Hits', { timeout: 5000 });
        } catch (error) {
          console.log('No more products found on this page');
          break;
        }

        if (totalCheck) {
          const hasNextPage = await page.evaluate(() => {
            const paginationContainer = document.querySelectorAll('#__nuxt > div > main > main > section > div > div > div.min-h-dvh.w-full > div.mx-auto.my-2.md\\:mt-4 > div > ul > li.gap-8 > a');
            return Array.from(paginationContainer).length || 1; // Default to 1 if no pagination
          });
          totalPages = hasNextPage;
          totalCheck = false;
          console.log(`Found ${totalPages} pages for subcategory: ${subcategory.name}`);
        }

        // Extract product URLs from current page
        const productUrls = await page.evaluate(() => {
          const productElements = document.querySelectorAll('#__nuxt > div > main > main > section > div > div > div.min-h-dvh.w-full > div.ais-StateResults.w-full > div.ais-Hits article > a');
          return Array.from(productElements).map(product => (product as HTMLAnchorElement).href);
        });

        console.log(`On page ${pageNumber}`);
        // console.log(`Found ${productUrls.length} products on page ${pageNumber}`);

        const pageProducts = [];
        for (const productUrl of productUrls) {
          try {
            await page.goto(productUrl, { waitUntil: 'networkidle2' });
            await page.waitForSelector('.text-xl.font-bold.md\\:text-3xl');

            // Click "Toon alles" button to expand supermarket list
            await page.evaluate(() => {
              const expandButton = document.querySelector('.absolute.bottom-0.left-1\\/2.flex.h-12.w-\\[calc\\(100\\%_\\+_10px\\)\\].-translate-x-1\\/2.items-end.justify-center.\\!border-none.bg-gradient-to-t.from-white.to-\\[\\#ffffff9c\\].dark\\:from-stone-900.md\\:h-16 > button');
              if (expandButton) {
                (expandButton as HTMLButtonElement).click();
              }
            });

            await page.evaluate(() => {
              return new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const scrollInterval = setInterval(() => {
                  window.scrollBy(0, distance);
                  totalHeight += distance;
            
                  if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(scrollInterval);
                    resolve();
                  }
                }, 100);
              });
            });

            await new Promise(resolve => setTimeout(resolve, 1500));

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

            if (productDetails && productDetails.name) {
              console.log(`Scraped product: ${productDetails.name}, Supermarkets: ${productDetails.supermarkets.length}`);
              pageProducts.push(productDetails);
              await upsertProduct(productDetails);
              console.log("productDetails-------", productDetails);
            } else {
              console.log(`Skipping product: ${productUrl} - Incomplete data`);
            }
          } catch (error) {
            console.error(`Error processing product ${productUrl}:`, error);
          }
        }

        const validProducts = pageProducts.filter((product): product is Product => product !== null);
        subCatAllProducts = [...subCatAllProducts, ...validProducts];
        pageNumber++;

      }

      const filePath = `./${subcategory.name.replace(/[^a-z0-9]/gi, '_')}.json`;
      const jsonData = JSON.stringify(subCatAllProducts, null, 2);
      fs.writeFileSync(filePath, jsonData);
      console.log(`Total ${subCatAllProducts.length} products in this category`);

      // process.exit(0);

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
