import React from 'react';
import { Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";


interface HouseholdSettings {
  household_id: string;
  max_stores: number;
  selected_stores: Array<{ name: string; isSelected: boolean }>;
  show_price_features: boolean;
}

interface StoreSettingsButtonProps {
  onClick: () => void;
  showPriceFeatures: boolean;
  className?: string;
  householdSettings: HouseholdSettings | null;
}

const StoreSettingsButton: React.FC<StoreSettingsButtonProps> = ({ 
  onClick, 
  showPriceFeatures, 
  className,
  householdSettings
}) => {
  // Get the default store data for logos
  const defaultStores = [
    { name: 'Albert Heijn', logo: '/supermarkets/ah-logo.png' },
    { name: 'Jumbo', logo: '/supermarkets/jumbo-logo.png' },
    { name: 'Plus', logo: '/supermarkets/plus-logo.png' },
    { name: 'Aldi', logo: '/supermarkets/aldi-logo.png' },
    { name: 'Dirk', logo: '/supermarkets/dirk-logo.png' },
    { name: 'Coop', logo: '/supermarkets/coop-logo.png' },
    { name: 'DekaMarkt', logo: '/supermarkets/dekamarkt-logo.png' },
    { name: 'Vomar', logo: '/supermarkets/vomar-logo.png' },
    { name: 'Poiesz', logo: '/supermarkets/poiesz-logo.png' },
    { name: 'Hoogvliet', logo: '/supermarkets/hoogvliet-logo.png' }
  ];

  // Get active stores from household settings
  const activeStores = householdSettings?.selected_stores
    .filter(store => store.isSelected)
    .map(store => {
      const defaultStore = defaultStores.find(s => s.name === store.name);
      return defaultStore ? { ...defaultStore, isSelected: true } : null;
    })
    .filter((store): store is NonNullable<typeof store> => store !== null);

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm bg-gray-50 text-gray-400 hover:text-gray-600 transition-all duration-300",
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Settings className="h-4 w-4" />
      {showPriceFeatures && activeStores ? (
        <div className="flex items-center">
          <div className="flex -space-x-1.5">
            {activeStores.slice(0, 2).map((store, index) => (
              <motion.div
                key={store.name}
                className="w-5 h-5 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-[0_0.5px_2px_rgba(0,0,0,0.05)]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-3.5 h-3.5 object-contain"
                />
              </motion.div>
            ))}
          </div>
          {activeStores.length > 2 && (
            <span className="ml-1.5 text-xs font-medium text-gray-500">
              +{activeStores.length - 2}
            </span>
          )}
        </div>
      ) : (
        <span>Eenvoudig</span>
      )}
    </motion.button>
  );
};

export default StoreSettingsButton; 