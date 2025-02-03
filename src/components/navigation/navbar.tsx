import { motion } from 'framer-motion'
import { cn } from "@/lib/utils"
import { useNavigate } from 'react-router-dom'

interface NavbarProps {
  activeView: 'list' | 'meals' | 'koken' | 'trends' | 'finance';
  setActiveView: (view: 'list' | 'meals' | 'koken' | 'trends' | 'finance') => void;
  isDialogOpen?: boolean;
}

export function Navbar({ activeView, setActiveView, isDialogOpen }: NavbarProps) {
  const navigate = useNavigate();

  const handleNavigation = (view: 'list' | 'meals' | 'koken' | 'trends' | 'finance') => {
    setActiveView(view);
    if (view === 'koken') {
      navigate('/koken');
    }
  };

  return (
    <motion.div className={cn(
      "fixed bottom-5 left-4 right-4 bg-white/80 backdrop-blur-xl border border-gray-100/20 shadow-2xl rounded-full z-50",
      isDialogOpen && "hidden" // Hide when product drawer is open
    )}>
      <div className="max-w-md mx-auto">
        <div className="flex justify-around items-center px-4 py-2">
          <motion.button
            onClick={() => handleNavigation('list')}
            className={`relative flex items-center justify-center p-2 transition-all duration-300 ${
              activeView === 'list' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {activeView === 'list' && (
              <motion.div
                layoutId="navbarActive"
                className="absolute inset-0 bg-blue-50/70 rounded-full shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative text-lg">📋</span>
          </motion.button>

          <motion.button
            onClick={() => handleNavigation('trends')}
            className={`relative flex items-center justify-center p-2 transition-all duration-300 ${
              activeView === 'trends' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {activeView === 'trends' && (
              <motion.div
                layoutId="navbarActive"
                className="absolute inset-0 bg-blue-50/70 rounded-full shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative text-lg">🏷️</span>
          </motion.button>

          <motion.button
            onClick={() => handleNavigation('finance')}
            className={`relative flex items-center justify-center p-2 transition-all duration-300 ${
              activeView === 'finance' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {activeView === 'finance' && (
              <motion.div
                layoutId="navbarActive"
                className="absolute inset-0 bg-blue-50/70 rounded-full shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative text-lg">💰</span>
          </motion.button>

          <motion.button
            onClick={() => handleNavigation('koken')}
            className={`relative flex items-center justify-center p-2 transition-all duration-300 ${
              activeView === 'koken' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {activeView === 'koken' && (
              <motion.div
                layoutId="navbarActive"
                className="absolute inset-0 bg-blue-50/70 rounded-full shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative text-lg">👨‍🍳</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
} 