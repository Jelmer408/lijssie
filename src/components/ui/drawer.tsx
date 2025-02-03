"use client"

import * as React from "react"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { cn } from "@/lib/utils"

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children?: React.ReactNode
  shouldScaleBackground?: boolean
}

const Drawer = ({ 
  open, 
  onOpenChange, 
  children
}: DrawerProps) => {
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = React.useState(false);

  // Prevent body scroll when drawer is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [open]);

  return (
    <AnimatePresence mode="wait">
      {open && (
        <div className="fixed inset-0 z-[999]">
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 touch-none"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            key="drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragDirectionLock
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(_, info) => {
              setIsDragging(false);
              if (info.offset.y > 50 || info.velocity.y > 500) {
                onOpenChange(false);
              }
            }}
            className="fixed inset-x-0 bottom-0 flex flex-col rounded-t-[10px] bg-white max-h-[95vh]"
            style={{ touchAction: 'pan-y' }}
          >
            <div 
              className="h-7 cursor-grab active:cursor-grabbing flex items-center touch-pan-y"
              onPointerDown={(e) => {
                dragControls.start(e);
                e.preventDefault();
              }}
            >
              <div className="mx-auto h-1 w-16 rounded-full bg-gray-300/80" />
            </div>
            <div className={cn(
              "min-h-0 overflow-y-auto overscroll-contain",
              isDragging ? "pointer-events-none touch-none" : "pointer-events-auto touch-pan-y"
            )}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

const DrawerContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 p-4 -mt-1", className)} {...props}>
    {children}
  </div>
)

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto p-4", className)} {...props} />
)

export {
  Drawer,
  DrawerContent,
  DrawerFooter,
}
