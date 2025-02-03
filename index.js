import puppeteer from 'puppeteer';
import fs from "fs"
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_KEY
// );

// async function deleteAllProducts() {
//   try {
//     const { error } = await supabase
//       .from('products')
//       .delete()
//       .neq('id', 0);

//     if (error) throw error;
//     console.log('Successfully deleted all products');
//   } catch (error) {
//     console.error('Failed to delete all products:', error);
//     throw error;
//   }
// }

// async function saveProducts(products) {
//   console.log(`Attempting to save ${products.length} products...`);

//   for (const product of products) {
//     try {
//       const { data, error } = await supabase
//         .from('products')
//         .insert({
//           name: product.name,
//           image_url: product.imageUrl,
//           weight: product.weight,
//           category: product.category,
//           subcategory: product.subcategory,
//           main_category: product.mainCategory,
//           price: product.price,
//           price_per_unit: product.pricePerUnit,
//           supermarket_data: product.supermarkets,
//           last_updated: new Date().toISOString()
//         });

//       if (error) {
//         console.error('Error storing product:', error);
//         console.error('Failed product data:', JSON.stringify(product, null, 2));
//       }
//     } catch (error) {
//       console.error(`Failed to save product ${product.name}:`, error);
//     }
//   }
// }


async function scrapeProducts() { // stop

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  let allScrapedProducts = [];
  const supermarketUrl = "https://schapr.nl/boodschappen"
  const page = await browser.newPage();

  try {
    console.log('Starting Product Scraper');
    // await deleteAllProducts();

    await page.goto(supermarketUrl, { waitUntil: 'networkidle2' });

    const mainSelector = '#__nuxt > div > main > div.flex.flex-col.gap-12 > div.flex.flex-col.gap-4 > div';
    await page.waitForSelector(mainSelector, { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const subcategories = await page.evaluate(() => {
      const subcategoryLinks = [];

      const categoryContainer = document.querySelector('#__nuxt > div > main > div.flex.flex-col.gap-12 > div.flex.flex-col.gap-4 > div');
      if (!categoryContainer) return subcategoryLinks;

      const categoryBoxes = categoryContainer.querySelectorAll('div');

      categoryBoxes.forEach(box => {
        const mainCategoryName = box.querySelector('p')?.innerText.trim() || '';

        const subcategoryContainer = box.querySelector('div');
        if (!subcategoryContainer) return;

        const links = subcategoryContainer.querySelectorAll('a');

        links.forEach(link => {
          const name = link.innerText.trim();
          const url = link.href;

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

    for (const subcategory of subcategories) {
      console.log(`Processing subcategory: ${subcategory.name}`);
      let pageNumber = 1;
      let totalPages = 1
      let totalCheck = true // to avoid check pages again and again
      let subCatAllProducts = []

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
            return Array.from(paginationContainer).length

          });
          totalPages = hasNextPage
          totalCheck = false
        }

        // Extract product URLs from current page
        const productUrls = await page.evaluate(() => {
          const productElements = document.querySelectorAll('#__nuxt > div > main > main > section > div > div > div.min-h-dvh.w-full > div.ais-StateResults.w-full > div.ais-Hits article > a');
          return Array.from(productElements).map(product => product.href);
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
                expandButton.click();
              }
            });

            await new Promise(resolve => setTimeout(resolve, 1500));

            await page.evaluate(() => {
              return new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100; // Distance to scroll each step
                const scrollInterval = setInterval(() => {
                  window.scrollBy(0, distance);
                  totalHeight += distance;
            
                  if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(scrollInterval);
                    resolve();
                  }
                }, 100); // Delay between scroll steps (100 ms)
              });
            });

            await new Promise(resolve => setTimeout(resolve, 1500));

            const productDetails = await page.evaluate(async (subcategoryData) => {
              const name = document.querySelector('.text-xl.font-bold.md\\:text-3xl')?.innerText.trim();
              const imageUrl = document.querySelector('.h-full.w-full.object-contain.opacity-100.transition-opacity.lazyLoad.isLoaded')?.src;
              const weight = document.querySelector('.text-\\[15px\\].font-medium.text-gray-500')?.innerText.trim();
              const breadcrumbCategory = document.querySelector('#__nuxt > div > div.container.relative.mx-auto.px-4.md\\:pb-8.container.mx-auto.px-4.pb-20.pt-28.text-black.dark\\:text-gray-100.md\\:mb-16.md\\:min-h-screen > nav > ol > li:nth-child(2) > a > span')?.innerText.trim();
              const price = document.querySelector('.flex.items-center.gap-1.text-xl.font-bold.text-gray-900.md\\:text-2xl')?.innerText.trim();
              const pricePerUnit = document.querySelector('.mr-2.flex.shrink-0.flex-col.items-start.md\\:mr-4.lg\\:basis-1\\/2.xl\\:basis-1\\/3 > p')?.innerText.trim();
              const supermarketList = document.querySelector('#__nuxt > div > div.container.relative.mx-auto.px-4.md\\:pb-8.container.mx-auto.px-4.pb-20.pt-28.text-black.dark\\:text-gray-100.md\\:mb-16.md\\:min-h-screen > main > div.mt-6.flex.w-full.items-center.md\\:mt-0 > div > div.relative.order-3');
              if (!supermarketList) {
                return {
                  name,
                  imageUrl,
                  weight,
                  category: breadcrumbCategory || subcategoryData.mainCategory,
                  subcategory: subcategoryData.name,
                  mainCategory: subcategoryData.mainCategory,
                  price,
                  pricePerUnit,
                  supermarkets: []
                };
              }

              const supermarketItems = Array.from(supermarketList.querySelectorAll('.divide-y.divide-solid.dark\\:divide-stone-700 > div'));
              const supermarkets = supermarketItems
                .map((supermarket, i) => {
                  console.log(`Processing supermarket ${i + 1}:`, supermarket);
                  //const name = supermarket.querySelector('.flex.h-14.w-full.items-center.justify-between.gap-1.px-2.md\\:h-16.rounded.border')?.textContent?.trim();
                  const logoUrl = supermarket.querySelector('img.max-h-5.w-fit.object-contain.md\\:max-h-6')?.getAttribute('src');
                  const price = supermarket.querySelector('.flex.items-center.gap-1.text-xl.font-bold.text-gray-900')?.textContent?.trim();
                  const pricePerUnit = supermarket.querySelector('.text-xs.text-gray-500')?.textContent?.trim();
                  const offerText = supermarket.querySelector('.md\\:text-md.line-clamp-1.w-fit.rounded.px-2\\.5.py-0\\.5.text-sm.font-semibold.bg-green-100')?.textContent?.trim();
                  const offerEndDate = supermarket.querySelector('.text-xs.text-green-dark')?.textContent?.trim();

                  let marketName = logoUrl ? logoUrl.split('/')[2]?.split('-')[0] : '';
                  let url = `https://schapr.nl${logoUrl}`

                  if(marketName == 'image'){
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
                .filter(supermarket => supermarket !== null);

              return {
                name,
                imageUrl,
                weight,
                category: breadcrumbCategory || subcategoryData.mainCategory,
                subcategory: subcategoryData.name,
                mainCategory: subcategoryData.mainCategory,
                price,
                pricePerUnit,
                supermarkets,
              };
            }, {
              name: subcategory.name,
              mainCategory: subcategory.mainCategory
            });

            productDetails.itemUrl = productUrl

            if (productDetails.name && productDetails.supermarkets.length > 0) {
              console.log(`Scraped product: ${productDetails.name}, Supermarkets: ${productDetails.supermarkets.length}`);
              pageProducts.push(productDetails);
              console.log("productDetails-------", productDetails)
            } else {
              console.log(`Skipping product: ${productUrl} - Incomplete data`);
            }
          } catch (error) {
            console.error(`Error processing product ${productUrl}:`, error);
          }
        }

        subCatAllProducts = [...subCatAllProducts, ...pageProducts]
        pageNumber++

      }

      const filePath = `./${subcategory}.json`;
      const jsonData = JSON.stringify(subCatAllProducts, null, 2);
      fs.writeFileSync(filePath , jsonData);
      console.log(`Total ${subCatAllProducts.length} in this category`);

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
