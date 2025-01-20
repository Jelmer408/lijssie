import { useHousehold } from '@/contexts/household-context';
import { CreateHouseholdDialog } from '@/components/household/CreateHouseholdDialog';
import { JoinHouseholdDialog } from '@/components/household/JoinHouseholdDialog';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '/logo.png';

export function HouseholdPage() {
  const { household, loading } = useHousehold();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 animate-pulse">Even geduld...</p>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white px-4 py-8 md:py-12"
      >
        <div className="max-w-md mx-auto space-y-12">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center space-y-6"
          >
            <div className="relative inline-block mx-auto">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20 
                }}
                className="w-24 h-24 mx-auto mb-6 flex items-center justify-center"
              >
                <img 
                  src={logo} 
                  alt="Lijssie" 
                  className="w-full h-full object-contain rounded-[1.5rem]"
                />
              </motion.div>
              <motion.div 
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute -top-2 -right-2"
              >
                <span className="text-2xl animate-bounce">✨</span>
              </motion.div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
              Welkom bij Lijssie
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-sm mx-auto">
              Begin met het delen van boodschappenlijstjes door een huishouden aan te maken of er een te joinen.
            </p>
          </motion.div>

          {/* Options */}
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <CreateHouseholdDialog
                trigger={
                  <button className="w-full h-14 px-8 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-full transition-all duration-300 font-medium shadow-sm hover:shadow-md hover:shadow-blue-500/10">
                    <span className="text-2xl">👨‍👩‍👦</span>
                    <span className="text-base">Nieuw huishouden</span>
                  </button>
                }
              />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <JoinHouseholdDialog
                trigger={
                  <button className="w-full h-14 px-8 flex items-center justify-center gap-3 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white rounded-full transition-all duration-300 font-medium shadow-sm hover:shadow-md hover:shadow-green-500/10">
                    <span className="text-2xl">🤝</span>
                    <span className="text-base">Join huishouden</span>
                  </button>
                }
              />
            </motion.div>
          </div>

          {/* Help text */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
            <p className="relative text-sm text-center text-gray-500 bg-white/60 py-4 px-6 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm group-hover:bg-white/80 transition-all duration-500">
              Je kunt later altijd nog van huishouden wisselen of een nieuw huishouden aanmaken 🔄
            </p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return <Navigate to="/" replace />;
} 