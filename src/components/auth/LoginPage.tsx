import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import loginBg from '/login-pixel-art.png';
import { Check } from 'lucide-react';

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect to home
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: "/"
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen relative overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={loginBg} 
          alt="Login Background" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col min-h-screen relative z-10">
        {/* Content Box */}
        <div className="mt-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-t-[32px] p-8 shadow-2xl space-y-6 w-full"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">Welkom bij Lijssie</h2>
                <p className="text-gray-600 mt-2">Jouw slimme boodschappenlijst assistent</p>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-3"
                >
                  <Check className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Bespaar op je Boodschappen</h3>
                    <p className="text-sm text-gray-600">Ontdek direct waar je het minste betaalt voor je boodschappen door onze slimme prijsvergelijking</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <Check className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Nooit meer Aanbiedingen Missen</h3>
                    <p className="text-sm text-gray-600">Ontvang gepersonaliseerde aanbiedingen op basis van je boodschappenlijst en voorkeuren</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-start gap-3"
                >
                  <Check className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Samen Boodschappen Doen</h3>
                    <p className="text-sm text-gray-600">Beheer je boodschappenlijst samen met je huisgenoten in real-time, zodat iedereen altijd up-to-date is</p>
                  </div>
                </motion.div>
              </div>

              {/* Login Button */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="pt-4"
              >
                <button 
                  onClick={handleGoogleLogin}
                  className="w-full h-14 px-6 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl transition-all duration-300 font-medium border border-gray-300 shadow-sm"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google logo" className="w-5 h-5" />
                  Inloggen met Google
                </button>

                <p className="text-xs text-center text-gray-500 mt-4">
                  Door in te loggen ga je akkoord met onze voorwaarden en privacy policy
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
} 