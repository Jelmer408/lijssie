import { createClient } from '@supabase/supabase-js';

let supabaseUrl: string;
let supabaseKey: string;

if (typeof window !== 'undefined') {
  // Browser environment
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
} else {
  // Server environment
  supabaseUrl = process.env.SUPABASE_URL || '';
  supabaseKey = process.env.SUPABASE_KEY || '';
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  supabaseUrl = 'fallback_url';
  supabaseKey = 'fallback_key';
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}); 