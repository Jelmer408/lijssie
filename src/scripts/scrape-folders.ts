import puppeteer, { Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SupermarketConfig {
  name: string;
  url: string;
  selectors: {
    folderLink?: string;
    downloadButton?: string;
    titleSelector?: string;
    validFromSelector?: string;
    validUntilSelector?: string;
  };
}

interface FolderMetadata {
  title: string;
  validFrom: Date;
  validUntil: Date;
  pdfUrl: string;
  localPath: string;
}

const SUPERMARKETS: SupermarketConfig[] = [
  {
    name: 'ah',
    url: 'https://folders.nl/winkels/albert-heijn',
    selectors: {
      folderLink: '#app > div > main > div > div > div > div.container.page-container.d-flex.flex-column.flex-grow-1.retailer.fill-width.fill-height.px-0.pt-2.pt-md-0 > div > div > div:nth-child(4) > div > div > div > div > div > div > div:nth-child(1) > div > div > a.has-been-read-container.text-center',
      downloadButton: '#app > div.v-application--wrap > div > div > div.publication-viewer-menu.d-flex > aside.drawer.elevation-8.v-navigation-drawer.v-navigation-drawer--clipped.v-navigation-drawer--mini-variant.v-navigation-drawer--custom-mini-variant.v-navigation-drawer--open.v-navigation-drawer--temporary.theme--dark > div.v-navigation-drawer__content > div:nth-child(12)',
      titleSelector: '.publication-title',
      validFromSelector: '.publication-dates span:first-child',
      validUntilSelector: '.publication-dates span:last-child'
    }
  },
  {
    name: 'jumbo',
    url: 'https://folders.nl/winkels/jumbo',
    selectors: {
      folderLink: 'a.has-been-read-container.text-center',
      downloadButton: 'div.v-navigation-drawer__content > div:nth-child(12)'
    }
  },
  {
    name: 'aldi',
    url: 'https://folders.nl/winkels/aldi',
    selectors: {
      folderLink: 'a.has-been-read-container.text-center',
      downloadButton: 'div.v-navigation-drawer__content > div:nth-child(12)'
    }
  },
  {
    name: 'dirk',
    url: 'https://folders.nl/winkels/dirk',
    selectors: {
      folderLink: 'a.has-been-read-container.text-center',
      downloadButton: 'div.v-navigation-drawer__content > div:nth-child(12)'
    }
  },
  {
    name: 'lidl',
    url: 'https://folders.nl/winkels/lidl',
    selectors: {
      folderLink: 'a.has-been-read-container.text-center',
      downloadButton: 'div.v-navigation-drawer__content > div:nth-child(12)'
    }
  },
  {
    name: 'plus',
    url: 'https://folders.nl/winkels/plus',
    selectors: {
      folderLink: 'a.has-been-read-container.text-center',
      downloadButton: 'div.v-navigation-drawer__content > div:nth-child(12)'
    }
  }
];

async function extractFolderMetadata(page: Page, supermarket: SupermarketConfig): Promise<FolderMetadata> {
  const title = await page.$eval(supermarket.selectors.titleSelector!, (el: Element) => el.textContent?.trim() || '');
  const validFromText = await page.$eval(supermarket.selectors.validFromSelector!, (el: Element) => el.textContent?.trim() || '');
  const validUntilText = await page.$eval(supermarket.selectors.validUntilSelector!, (el: Element) => el.textContent?.trim() || '');

  // Parse Dutch date format (e.g., "20 maart 2024")
  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split(' ');
    const monthMap: Record<string, number> = {
      'januari': 0, 'februari': 1, 'maart': 2, 'april': 3, 'mei': 4, 'juni': 5,
      'juli': 6, 'augustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'december': 11
    };
    return new Date(parseInt(year), monthMap[month.toLowerCase()], parseInt(day));
  };

  if (!title || !validFromText || !validUntilText) {
    throw new Error('Failed to extract folder metadata');
  }

  return {
    title,
    validFrom: parseDate(validFromText),
    validUntil: parseDate(validUntilText),
    pdfUrl: '', // Will be set after download
    localPath: '' // Will be set after saving
  };
}

async function downloadFolder(page: Page, supermarket: SupermarketConfig): Promise<void> {
  console.log(`📂 Downloading folder for ${supermarket.name}...`);
  
  try {
    // Set download path
    const downloadPath = path.join(process.cwd(), 'public', 'supermarkets', 'folders');
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    // Navigate to the supermarket page
    await page.goto(supermarket.url, { waitUntil: 'networkidle0' });
    console.log(`✅ Navigated to ${supermarket.url}`);

    // Wait for and click the folder link
    await page.waitForSelector(supermarket.selectors.folderLink!);
    await page.click(supermarket.selectors.folderLink!);
    console.log('✅ Clicked folder link');

    // Extract metadata before downloading
    const metadata = await extractFolderMetadata(page, supermarket);

    // Wait for the download button to appear and click it
    await page.waitForSelector(supermarket.selectors.downloadButton!);
    await page.click(supermarket.selectors.downloadButton!);
    console.log('✅ Clicked download button');

    // Wait for download to complete and get the file name
    const maxAttempts = 30;
    let attempts = 0;
    let downloadedFileName = '';

    while (attempts < maxAttempts) {
      const files = fs.readdirSync(downloadPath);
      const downloadedFile = files.find(file => 
        file.toLowerCase().includes(supermarket.name.toLowerCase()) && 
        file.endsWith('.pdf') &&
        !file.includes('.crdownload')
      );

      if (downloadedFile) {
        downloadedFileName = downloadedFile;
        console.log(`✅ Folder downloaded for ${supermarket.name}: ${downloadedFileName}`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!downloadedFileName) {
      throw new Error(`Download timeout for ${supermarket.name}`);
    }

    // Update metadata with file paths
    const localPath = path.join('public', 'supermarkets', 'folders', downloadedFileName);
    const pdfUrl = `/supermarkets/folders/${downloadedFileName}`;

    // Save to Supabase
    const { error } = await supabase
      .from('supermarket_folders')
      .insert({
        supermarket: supermarket.name,
        url: supermarket.url,
        title: metadata.title,
        valid_from: metadata.validFrom.toISOString(),
        valid_until: metadata.validUntil.toISOString(),
        pdf_url: pdfUrl,
        local_path: localPath
      });

    if (error) {
      throw error;
    }

    console.log(`✅ Saved folder metadata to database for ${supermarket.name}`);

  } catch (error) {
    console.error(`❌ Error processing folder for ${supermarket.name}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting folder scraper...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });

    // Download folders for each supermarket
    for (const supermarket of SUPERMARKETS) {
      await downloadFolder(page, supermarket);
      // Wait between downloads to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }

  console.log('✅ Folder scraping completed!');
}

main().catch(console.error); 