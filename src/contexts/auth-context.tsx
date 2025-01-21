import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, error: null });

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Check active sessions and sets the user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (mounted) {
          setUser(session?.user ?? null);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize auth'));
          setUser(null);
          setLoading(false);
        }
      }
    }

    // Initialize auth state
    initializeAuth();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 