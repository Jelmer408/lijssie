import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supermarketService } from '@/services/supermarket-service';
import { useToast } from '@/components/ui/use-toast';

interface Supermarket {
  id: string;
  name: string;
  logo: string;
  color: string;
}

const supermarkets: Record<string, Supermarket> = {
  'Albert Heijn': {
    id: 'ah',
    name: 'Albert Heijn',
    logo: '/supermarkets/ah-logo.png',
    color: '#00B0EF',
  },
  'Dirk': {
    id: 'dirk',
    name: 'Dirk',
    logo: '/supermarkets/dirk-logo.png',
    color: '#E60012',
  },
  'Jumbo': {
    id: 'jumbo',
    name: 'Jumbo',
    logo: '/supermarkets/jumbo-logo.png',
    color: '#FDD700',
  },
};

export function SupermarketStories() {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [folders, setFolders] = useState<Array<{
    supermarket: string;
    pdfUrl: string;
    weekNumber: number;
    validUntil: Date;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    try {
      setIsLoading(true);
      const data = await supermarketService.getFolders();
      setFolders(data.map(folder => ({
        supermarket: folder.supermarket,
        pdfUrl: folder.pdfUrl,
        weekNumber: folder.weekNumber,
        validUntil: new Date(folder.validUntil)
      })));
    } catch (error) {
      console.error('Error loading folders:', error);
      toast({
        title: 'Fout bij laden folders',
        description: 'Er ging iets mis bij het laden van de folders.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isPaused || isLoading || folders.length === 0) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveIndex((prevIndex) => 
            prevIndex === folders.length - 1 ? 0 : prevIndex + 1
          );
          return 0;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, isLoading, folders.length]);

  const handleNext = () => {
    if (activeIndex < folders.length - 1) {
      setActiveIndex(activeIndex + 1);
      setProgress(0);
    }
  };

  const handlePrevious = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setProgress(0);
    }
  };

  const handleOpenFolder = (url: string) => {
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="relative w-full max-w-lg mx-auto h-[70vh] bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="text-gray-500">Folders laden...</div>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="relative w-full max-w-lg mx-auto h-[70vh] bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="text-gray-500">Geen folders beschikbaar</div>
      </div>
    );
  }

  const currentFolder = folders[activeIndex];
  const supermarket = supermarkets[currentFolder.supermarket];

  return (
    <div className="relative w-full max-w-lg mx-auto h-[70vh] bg-gray-100 rounded-xl overflow-hidden">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
        {folders.map((_, index) => (
          <div
            key={index}
            className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
          >
            {index === activeIndex && (
              <motion.div
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.05, ease: "linear" }}
              />
            )}
            {index < activeIndex && (
              <div className="h-full w-full bg-white" />
            )}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-6">
        <div className="flex items-center gap-2">
          <img
            src={supermarket.logo}
            alt={supermarket.name}
            className="w-8 h-8 rounded-full bg-white p-1"
          />
          <div className="flex flex-col">
            <span className="font-medium text-white drop-shadow-md">
              {supermarket.name}
            </span>
            <span className="text-xs text-white/80">
              Week {currentFolder.weekNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div 
        className="relative w-full h-full"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ backgroundColor: supermarket.color }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => handleOpenFolder(currentFolder.pdfUrl)}
                className="px-6 py-3 bg-white rounded-full font-medium text-gray-900 hover:bg-gray-100 transition-colors shadow-lg"
              >
                Bekijk folder
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <button
          onClick={handlePrevious}
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/20 text-white backdrop-blur-sm transition-opacity",
            activeIndex === 0 ? "opacity-30 cursor-not-allowed" : "opacity-70 hover:opacity-100"
          )}
          disabled={activeIndex === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/20 text-white backdrop-blur-sm transition-opacity",
            activeIndex === folders.length - 1 ? "opacity-30 cursor-not-allowed" : "opacity-70 hover:opacity-100"
          )}
          disabled={activeIndex === folders.length - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 