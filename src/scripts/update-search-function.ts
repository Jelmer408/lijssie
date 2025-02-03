import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSearchFunction() {
  try {
    console.log('🔄 Updating hybrid search function...');

    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'src', 'scripts', 'update-hybrid-search.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Error updating function:', error.message);
      return;
    }

    console.log('✅ Successfully updated hybrid search function!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateSearchFunction().catch(console.error); 