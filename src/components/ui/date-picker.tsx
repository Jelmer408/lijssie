import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay
} from 'date-fns';
import { nl } from 'date-fns/locale';

interface DatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

const WEEKDAYS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'] as const;

export function DatePicker({ isOpen, onClose, selectedDate, onSelect }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => `empty-${i}`);

  const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-[320px] shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-gray-700 dark:text-gray-200">Selecteer datum</h2>
              <button 
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePreviousMonth}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-md transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {format(currentMonth, 'MMMM yyyy', { locale: nl })}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-md transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map(day => (
                  <div 
                    key={`header-${day}`} 
                    className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-2"
                  >
                    {day}
                  </div>
                ))}
                
                {emptyDays.map(key => (
                  <div key={key} className="p-2" />
                ))}

                {days.map(day => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrent = isToday(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const dayKey = `day-${format(day, 'yyyy-MM-dd')}`;

                  return (
                    <button
                      key={dayKey}
                      onClick={() => onSelect(day)}
                      className={`
                        relative p-2 text-sm rounded-lg transition-all
                        ${!isCurrentMonth && 'text-gray-300 dark:text-gray-600'}
                        ${isSelected && 'bg-blue-600 text-white'}
                        ${!isSelected && isCurrentMonth && 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}
                        ${isCurrent && !isSelected && 'font-medium'}
                      `}
                    >
                      {format(day, 'd')}
                      {isCurrent && !isSelected && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 