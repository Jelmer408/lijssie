import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase';

export function LoginScreen() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: "/"
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-xl shadow-xl rounded-3xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-6 flex items-center justify-center"
            >
              <img 
                src="/logo.webp" 
                alt="Boodschappenlijstje Logo" 
                className="w-full h-full object-contain rounded-2xl"
              />
            </motion.div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Boodschappenlijstje
            </h1>
            <p className="text-gray-500 mt-2">
              Log in om je boodschappen te beheren
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <Button
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-gray-50 text-gray-800 font-medium py-3 px-4 border border-gray-200 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-md"
            >
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                className="w-5 h-5"
              />
              Inloggen met Google
            </Button>

            <p className="text-center text-xs text-gray-500">
              Door in te loggen ga je akkoord met onze{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700">
                voorwaarden
              </a>{' '}
              en{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700">
                privacybeleid
              </a>
            </p>
          </motion.div>
        </div>

        <div className="mt-12 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-4"
          >
            <motion.div 
              animate={{ rotate: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-2xl"
            >
              🛒
            </motion.div>
            <p className="text-gray-600 font-medium">
              Nooit meer vergeten wat je nodig hebt!
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-4"
          >
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-2xl"
            >
              🎯️
            </motion.div>
            <p className="text-gray-600 font-medium">
              Plan maaltijden en stem samen af wat jullie eten!
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-4"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-2xl"
            >
              ✨
            </motion.div>
            <p className="text-gray-600 font-medium">
              Maak boodschappen doen weer leuk en efficiënt!
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-2 mt-8 text-xs text-gray-400"
        >
          <span>Deze app is gemaakt door</span>
          <a 
            href="https://www.instagram.com/jelmer_hb/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 transition-colors duration-200"
          >
            @jelmer_hb
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
} 