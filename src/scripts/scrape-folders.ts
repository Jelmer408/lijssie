import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { format } from 'date-fns';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SupermarketConfig {
  name: string;
  urlName: string;
}

const SUPERMARKETS: SupermarketConfig[] = [
  { name: 'Albert Heijn', urlName: 'albert-heijn' },
  { name: 'Jumbo', urlName: 'jumbo' },
  { name: 'Aldi', urlName: 'aldi' },
  { name: 'Dirk', urlName: 'dirk' },
  { name: 'Lidl', urlName: 'lidl' },
  { name: 'Plus', urlName: 'plus' },
];

async function downloadFolder(supermarket: SupermarketConfig): Promise<void> {
  try {
    const now = new Date();
    const weekNumber = format(now, 'w');
    const year = format(now, 'yyyy');
    
    let url = `https://api.wepublish.digital/viewer/pdf/download/${supermarket.urlName}-week-${weekNumber}-${year}`;
    if (supermarket.name === 'Plus') {
      url += '-v1';
    } else if (supermarket.name === 'Dirk') {
      url += '-weekaanbiedingen';
    }
    
    const folderDir = path.join(process.cwd(), 'public', 'supermarkets', 'folders');
    if (!fs.existsSync(folderDir)) {
      fs.mkdirSync(folderDir, { recursive: true });
    }

    console.log(`Downloading folder for ${supermarket.name}...`);
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer'
    });

    const fileName = `${supermarket.urlName}-week-${weekNumber}-${year}.pdf`;
    const filePath = path.join(folderDir, fileName);
    fs.writeFileSync(filePath, response.data);

    const { error } = await supabase
      .from('supermarket_folders')
      .upsert({
        supermarket: supermarket.name,
        title: `${supermarket.name} Week ${weekNumber} ${year}`,
        valid_from: format(now, 'yyyy-MM-dd'),
        valid_until: format(now, 'yyyy-MM-dd'),
        pdf_url: url,
        local_path: `/supermarkets/folders/${fileName}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error(`Error saving metadata for ${supermarket.name}:`, error);
    } else {
      console.log(`Successfully processed folder for ${supermarket.name}`);
    }
  } catch (error) {
    console.error(`Error downloading folder for ${supermarket.name}:`, error);
  }
}

async function main() {
  console.log('Starting folder downloads...');
  
  for (const supermarket of SUPERMARKETS) {
    await downloadFolder(supermarket);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('Folder downloads completed');
}

main().catch(console.error);

