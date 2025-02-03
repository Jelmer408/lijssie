import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { createPortal } from 'react-dom';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Initialize pdfjs worker with local file from public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Function to get next Sunday's date
function getNextSunday() {
  const today = new Date();
  const daysUntilSunday = 7 - today.getDay();
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  return nextSunday;
}

interface SupermarketStory {
  id: string;
  supermarket: string;
  imageUrl: string;
  title: string;
  validUntil: string;
}

// Story Viewer Component
function StoryViewer({ story, onClose, currentPage, numPages, isLoading, pageWidth, pageHeight, handleDocumentLoadSuccess, handleNext, handlePrevious, getPdfPath }: {
  story: SupermarketStory;
  onClose: () => void;
  currentPage: number;
  numPages: number | null;
  isLoading: boolean;
  pageWidth: number;
  pageHeight: number;
  handleDocumentLoadSuccess: ({ numPages }: { numPages: number }) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  getPdfPath: (supermarket: string) => string;
}) {
  // Get next Sunday's date
  const validUntilDate = getNextSunday();

  // Add state for preloaded pages
  const [preloadedPages, setPreloadedPages] = useState<number[]>([]);

  // Preload adjacent pages
  useEffect(() => {
    const pagesToPreload = [
      currentPage - 1,
      currentPage,
      currentPage + 1
    ].filter(page => page >= 0 && page < (numPages || 0));

    setPreloadedPages(pagesToPreload);
  }, [currentPage, numPages]);

  // Handle individual page load state
  const handlePageLoadSuccess = (pageNumber: number) => {
    // Just log for debugging purposes
    console.debug(`Page ${pageNumber} loaded successfully`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100dvh',
        width: '100vw',
        zIndex: 999999,
        touchAction: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Story Content */}
      <div className="relative w-full h-full bg-black">
        {/* Story Header */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pt-safe bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <img
                src={story.imageUrl}
                alt={story.title}
                className="w-5 h-5 object-contain"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {story.title}
              </h3>
              <p className="text-xs text-white/80">
                Geldig t/m {validUntilDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-full hover:bg-white/10 transition-colors duration-200 relative z-50"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Story Image/PDF */}
        <div className="w-full h-full flex items-center justify-center bg-black pb-safe">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <Document
            file={getPdfPath(story.supermarket)}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={(error) => console.error('Error loading PDF:', error)}
            loading={null}
          >
            <div className="relative">
              {preloadedPages.map((pageNum) => (
                <motion.div
                  key={pageNum}
                  initial={{ opacity: pageNum === currentPage ? 0 : 0 }}
                  animate={{ opacity: pageNum === currentPage ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: pageNum === currentPage ? 'relative' : 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: pageNum === currentPage ? 'auto' : 'none',
                  }}
                >
                  <Page
                    key={`page-${pageNum}`}
                    pageNumber={pageNum + 1}
                    width={pageWidth}
                    height={pageHeight - 120}
                    scale={1.0}
                    renderMode="canvas"
                    loading={null}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onRenderSuccess={() => handlePageLoadSuccess(pageNum)}
                    onRenderError={() => handlePageLoadSuccess(pageNum)}
                    onLoadSuccess={() => handlePageLoadSuccess(pageNum)}
                    onLoadError={() => handlePageLoadSuccess(pageNum)}
                    className="transition-opacity duration-200"
                  />
                </motion.div>
              ))}
            </div>
          </Document>
        </div>

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2 pt-safe">
          {numPages && [...Array(numPages)].map((_, index) => (
            <div
              key={index}
              className="h-0.5 flex-1 bg-white/30 overflow-hidden"
            >
              <motion.div
                key={`progress-${currentPage}-${index}`}
                initial={{ width: index < currentPage ? "100%" : "0%" }}
                animate={{ width: index <= currentPage ? "100%" : "0%" }}
                transition={{ 
                  duration: index === currentPage ? 5 : 0,
                  ease: "linear"
                }}
                onAnimationComplete={() => {
                  if (index === currentPage) handleNext();
                }}
                className="h-full bg-white"
              />
            </div>
          ))}
        </div>

        {/* Navigation Areas */}
        <div className="absolute inset-0 z-20 flex touch-none">
          <button
            className="w-1/2 h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
          />
          <button
            className="w-1/2 h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function SupermarketStories() {
  const [selectedStory, setSelectedStory] = useState<SupermarketStory | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageWidth, setPageWidth] = useState(window.innerWidth);
  const [pageHeight, setPageHeight] = useState(window.innerHeight);
  const [viewedStories, setViewedStories] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('viewedStories');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Save viewed stories to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('viewedStories', JSON.stringify(Array.from(viewedStories)));
  }, [viewedStories]);

  // Update dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      setPageWidth(window.innerWidth);
      setPageHeight(window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Function to get current week number
  function getWeekNumber() {
    const now = new Date();
    const date = new Date(now.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1
    const week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1
    const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return weekNumber;
  }

  // Get current week and year
  const currentWeek = getWeekNumber();
  const currentYear = new Date().getFullYear();

  // Create a unique key for the current week's stories
  const weekKey = `week-${currentWeek}-${currentYear}`;

  // Initialize viewed stories with a new Set for each new week
  useEffect(() => {
    const savedWeekKey = localStorage.getItem('currentWeekKey');
    if (savedWeekKey !== weekKey) {
      setViewedStories(new Set());
      localStorage.setItem('currentWeekKey', weekKey);
    }
  }, [weekKey]);

  // Mock data with dynamic PDF paths
  const stories: SupermarketStory[] = [
    {
      id: '1',
      supermarket: 'ah',
      imageUrl: '/supermarkets/ah-logo.png',
      title: 'Albert Heijn Folder',
      validUntil: '2024-03-27'
    },
    {
      id: '2',
      supermarket: 'jumbo',
      imageUrl: '/supermarkets/jumbo-logo.png',
      title: 'Jumbo Folder',
      validUntil: '2024-03-27'
    },
    {
      id: '3',
      supermarket: 'lidl',
      imageUrl: '/supermarkets/lidl-logo.png',
      title: 'Lidl Folder',
      validUntil: '2024-03-27'
    },
    {
      id: '4',
      supermarket: 'aldi',
      imageUrl: '/supermarkets/aldi-logo.png',
      title: 'Aldi Folder',
      validUntil: '2024-03-27'
    },
    {
      id: '5',
      supermarket: 'plus',
      imageUrl: '/supermarkets/plus-logo.png',
      title: 'Plus Folder',
      validUntil: '2024-03-27'
    },
    {
      id: '6',
      supermarket: 'dirk',
      imageUrl: '/supermarkets/dirk-logo.png',
      title: 'Dirk Folder',
      validUntil: '2024-03-27'
    },
  ];

  // Function to get PDF path for a supermarket
  const getPdfPath = (supermarket: string) => {
    // Map supermarket names to their folder names
    const supermarketMap: { [key: string]: string } = {
      'ah': 'albert-heijn',
      'jumbo': 'jumbo',
      'lidl': 'lidl',
      'aldi': 'aldi',
      'plus': 'plus',
      'dirk': 'dirk'
    };
    
    const folderName = supermarketMap[supermarket] || supermarket;
    return `/supermarkets/folders/${folderName}-week-${currentWeek}-${currentYear}.pdf`;
  };

  const handleStoryClick = (story: SupermarketStory) => {
    setSelectedStory(story);
    setCurrentPage(0);
    setIsLoading(true);
  };

  const handleClose = () => {
    if (selectedStory) {
      setViewedStories(prev => new Set([...prev, selectedStory.id]));
    }
    setSelectedStory(null);
    setCurrentPage(0);
    setNumPages(null);
  };

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handleNext = () => {
    if (numPages && currentPage < numPages - 1) {
      setCurrentPage(prev => prev + 1);
    } else {
      if (selectedStory) {
        setViewedStories(prev => new Set([...prev, selectedStory.id]));
      }
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Lock body scroll when story is open
  useEffect(() => {
    if (selectedStory) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [selectedStory]);

  return (
    <>
      {/* Stories List */}
      <div className="mb-6 w-full overflow-x-auto scrollbar-hide">
        <div className="flex gap-4">
          <div className="pl-4 sm:pl-6 md:pl-8 flex gap-4">
            {stories.map((story) => (
              <button
                key={story.id}
                onClick={() => handleStoryClick(story)}
                className="flex-shrink-0 group"
              >
                <div className={`w-16 h-16 rounded-full p-0.5 ${
                  viewedStories.has(story.id)
                    ? 'bg-gray-300'
                    : 'bg-gradient-to-tr from-blue-500 to-purple-500'
                }`}>
                  <div className="w-full h-full rounded-full p-0.5 bg-white">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      <img
                        src={story.imageUrl}
                        alt={story.title}
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-1 text-xs text-center text-gray-600 font-medium truncate max-w-[4rem]">
                  {story.supermarket.toUpperCase()}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Story Viewer Portal */}
      {selectedStory && createPortal(
        <StoryViewer
          story={selectedStory}
          onClose={handleClose}
          currentPage={currentPage}
          numPages={numPages}
          isLoading={isLoading}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          handleDocumentLoadSuccess={handleDocumentLoadSuccess}
          handleNext={handleNext}
          handlePrevious={handlePrevious}
          getPdfPath={getPdfPath}
        />,
        document.body
      )}
    </>
  );
} 