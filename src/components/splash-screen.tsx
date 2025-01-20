import { motion } from 'framer-motion';

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 to-white"
    >
      <div className="relative">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-blue-500/20 to-blue-600/20 rounded-3xl blur-xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
        
        {/* Logo container */}
        <motion.div
          className="relative flex flex-col items-center"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          {/* App icon */}
          <motion.div
            className="w-24 h-24 mb-6 rounded-3xl bg-white shadow-xl flex items-center justify-center overflow-hidden"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <motion.img
              src="/logo.png"
              alt="Lijssie Logo"
              className="w-20 h-20 object-contain rounded-2xl"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, 0],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>

          {/* App name */}
          <motion.h1
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Lijssie
          </motion.h1>

          {/* Loading indicator */}
          <motion.div
            className="mt-8 flex items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-blue-500"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
} 