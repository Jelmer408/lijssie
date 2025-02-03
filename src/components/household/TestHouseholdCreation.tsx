import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';

interface TestHouseholdCreationProps {
  name: string;
}

export function TestHouseholdCreation({ name }: TestHouseholdCreationProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateTest = async () => {
    if (!name.trim()) {
      toast.error('Please enter a household name');
      return;
    }

    try {
      setIsLoading(true);
      const invite_code = nanoid(8);

      const { data, error } = await supabase
        .rpc('create_test_household', {
          p_name: name,
          p_invite_code: invite_code,
        });

      if (error) throw error;
      
      toast.success('Test household created successfully!');
      console.log('Created test household:', data);
    } catch (error) {
      console.error('Error creating test household:', error);
      toast.error('Failed to create test household');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCreateTest}
      disabled={isLoading}
      variant="outline"
    >
      Test: Create Household
    </Button>
  );
} 