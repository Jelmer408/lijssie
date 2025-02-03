import { useHousehold } from '@/contexts/household-context';
import { CreateHouseholdDrawer } from '@/components/household/CreateHouseholdDrawer';
import { JoinHouseholdDrawer } from '@/components/household/JoinHouseholdDrawer';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import supermarketBg from '/supermarket-pixel.png';
import { useState } from 'react';

export function HouseholdPage() {
  const { household, loading } = useHousehold();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isJoinDrawerOpen, setIsJoinDrawerOpen] = useState(false);

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
        className="min-h-screen relative overflow-hidden"
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={supermarketBg} 
            alt="Supermarket" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
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
              <div className="space-y-3">
                <h1 className="text-[32px] font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  Welkom bij Lijssie
                </h1>
                <p className="text-gray-600 text-base leading-relaxed max-w-sm mx-auto">
                  Begin met het delen van boodschappenlijstjes door een huishouden aan te maken of er een te joinen.
                </p>
              </div>

              <div className="space-y-3 max-w-lg mx-auto">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative group"
                >
                  <button 
                    onClick={() => setIsCreateDrawerOpen(true)}
                    className="relative w-full h-14 px-6 flex items-center justify-center bg-blue-50 text-blue-800 rounded-2xl transition-all duration-300 font-semibold hover:bg-blue-100/80"
                  >
                    <span>Nieuw huishouden</span>
                  </button>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative group"
                >
                  <button 
                    onClick={() => setIsJoinDrawerOpen(true)}
                    className="relative w-full h-14 px-6 flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl transition-all duration-300 font-semibold hover:from-blue-600 hover:to-blue-700"
                  >
                    <span>Join huishouden</span>
                  </button>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="relative group pt-2"
                >
                  <p className="relative text-xs text-center text-gray-400">
                    Je kunt later altijd nog van huishouden wisselen of een nieuw huishouden aanmaken 🔄
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Drawers */}
        <CreateHouseholdDrawer 
          isOpen={isCreateDrawerOpen}
          onOpenChange={setIsCreateDrawerOpen}
        />
        <JoinHouseholdDrawer 
          isOpen={isJoinDrawerOpen}
          onOpenChange={setIsJoinDrawerOpen}
        />
      </motion.div>
    );
  }

  return <Navigate to="/" replace />;
} 