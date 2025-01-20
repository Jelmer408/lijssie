import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '[present]' : '[missing]');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployHybridSearch() {
  try {
    console.log('Deploying hybrid search function...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'update-hybrid-search.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL directly
    const { error } = await supabase
      .from('_sql')
      .select('*')
      .eq('query', sql)
      .single();

    if (error) {
      console.error('Error deploying function:', error);
      process.exit(1);
    }

    console.log('Successfully deployed hybrid search function!');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

deployHybridSearch(); 