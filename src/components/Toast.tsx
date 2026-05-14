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
          <div
            className="px-4 py-2 rounded-xl backdrop-blur-md border"
            style={
              toast.tone === 'success' ? { background: 'var(--state-success-soft)', borderColor: 'var(--state-success)', color: 'var(--state-success-strong)' } :
              toast.tone === 'warn'    ? { background: 'var(--state-warn-soft)',    borderColor: 'var(--state-warn)',    color: 'var(--state-warn-strong)' } :
                                         { background: 'var(--surface-paper)',      borderColor: 'var(--surface-fog)',   color: 'var(--ink-strong)' }
            }
          >
            {toast.text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
