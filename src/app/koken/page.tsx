'use client';

import { motion } from 'framer-motion';

export default function KokenPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold">Koken</h1>
        {/* Add your cooking page content here */}
      </motion.div>
    </div>
  );
} 