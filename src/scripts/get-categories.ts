import puppeteer from 'puppeteer';
import fs from "fs";
import path from "path";

interface Subcategory {
  name: string;
  url: string;
  mainCategory: string;
}

async function getAllCategories(): Promise<Subcategory[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const supermarketUrl = "https://schapr.nl/boodschappen"
  const page = await browser.newPage();
  
  try {
    console.log('Starting Category Fetcher');
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

    return subcategories;
  } finally {
    await browser.close();
  }
}

function splitIntoChunks(categories: Subcategory[], numChunks: number): Subcategory[][] {
  const chunks: Subcategory[][] = Array(numChunks).fill(null).map(() => []);
  categories.forEach((category, index) => {
    chunks[index % numChunks].push(category);
  });
  return chunks;
}

async function main() {
  try {
    const categories = await getAllCategories();
    console.log(`Found ${categories.length} total categories`);

    const NUM_CHUNKS = 40; // Number of parallel jobs
    const chunks = splitIntoChunks(categories, NUM_CHUNKS);

    // Create chunks directory if it doesn't exist
    const chunksDir = path.join(process.cwd(), 'category-chunks');
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir);
    }

    // Save each chunk to a separate file
    chunks.forEach((chunk, index) => {
      const filePath = path.join(chunksDir, `chunk-${index}.json`);
      fs.writeFileSync(filePath, JSON.stringify(chunk, null, 2));
      console.log(`Wrote chunk ${index} with ${chunk.length} categories to ${filePath}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error running category fetcher:', error);
    process.exit(1);
  }
}

main(); 