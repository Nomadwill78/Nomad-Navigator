import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Info, Target, BrainCircuit, Database } from 'lucide-react';

interface DemoModeBannerProps {
  isActive: boolean;
  onClose: () => void;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ isActive, onClose }) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4"
        >
          <div className="bg-abyss border border-hairline text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-teal"></div>
            <div className="flex items-center gap-3">
              <div className="bg-teal/15 p-2 rounded-lg">
                <Sparkles size={20} className="text-teal animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Demo Mode Active</h4>
                <p className="text-xs text-inkfaint">Explore all features with pre-populated, verified impact data.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-surface2 rounded-lg transition-colors text-inkfaint"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const DemoHint: React.FC<{ children: React.ReactNode; text: string; position?: 'top' | 'bottom' | 'left' | 'right' }> = ({ children, text, position = 'top' }) => {
  const [show, setShow] = React.useState(false);

  return (
    <div className="relative inline-block w-full" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-50 pointer-events-none whitespace-nowrap bg-gradient-to-b from-brassbright to-brass text-[#26200e] text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded shadow-lg ${
              position === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' :
              position === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' :
              position === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' :
              'left-full ml-2 top-1/2 -translate-y-1/2'
            }`}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
