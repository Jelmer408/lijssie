import { supabase } from '@/lib/supabase';

async function main() {
  try {
    console.log('Clearing sale recommendations...');
    
    // Delete all rows from the sale_recommendations table
    const { error } = await supabase
      .from('sale_recommendations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows using a valid UUID

    if (error) {
      console.error('Error clearing recommendations:', error);
      process.exit(1);
    }

    console.log('Successfully cleared sale recommendations');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 