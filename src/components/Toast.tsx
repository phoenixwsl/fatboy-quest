import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

export function Toast() {
  const toast = useAppStore(s => s.toast);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={`px-4 py-2 rounded-xl backdrop-blur-md border ${
            toast.tone === 'success' ? 'bg-emerald-500/30 border-emerald-300/50' :
            toast.tone === 'warn' ? 'bg-amber-500/30 border-amber-300/50' :
            'bg-space-card/80 border-space-border'
          }`}>
            {toast.text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
