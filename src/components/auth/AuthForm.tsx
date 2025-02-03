import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { AuthErrorBoundary } from './AuthErrorBoundary';

interface AuthFormProps {
  redirectTo?: string;
}

export function AuthForm({ redirectTo = window.location.origin }: AuthFormProps) {
  return (
    <AuthErrorBoundary>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google']}
        redirectTo={redirectTo}
      />
    </AuthErrorBoundary>
  );
} 