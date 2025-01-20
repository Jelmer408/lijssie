import { createContext, useContext, useEffect, useState } from 'react';
import { householdService, Household, HouseholdMember } from '@/services/household-service';
import { useAuth } from './auth-context';

interface HouseholdContextType {
  household: Household | null;
  members: HouseholdMember[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchHouseholdData = async () => {
    if (!user) {
      setHousehold(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await householdService.getCurrentHousehold();
      
      // If no data is returned, it means the user has no household
      if (!data) {
        setHousehold(null);
        setMembers([]);
        setError(null);
        return;
      }

      setHousehold(data.household);
      setMembers(data.members);
      setError(null);
    } catch (err) {
      console.error('Error fetching household:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch household'));
      setHousehold(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholdData();
  }, [user]);

  const value = {
    household,
    members,
    loading,
    error,
    refetch: fetchHouseholdData
  };

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
} 