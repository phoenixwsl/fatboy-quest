// ============================================================
// R4.3.0: 兑换仪式 toast
//
// 兑换瞬间弹一句 mastery framing 文案——把"购买"转成"达成"。
// 数据由 buildMasteryContext 实时算，pickMasteryFlavor 选模板。
//
// 使用方式（ShopPage redeem 后）：
//   const { showMasteryToast } = useMasteryToast();
//   await redeem(item);
//   showMasteryToast(item);
// ============================================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ShopItem } from '../types';
import { db } from '../db';
import { buildMasteryContext, pickMasteryFlavor } from '../lib/mastery';

interface ToastState {
  text: string;
  emoji: string;
}

export function useMasteryToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  async function showMasteryToast(item: ShopItem) {
    try {
      const ctx = await buildMasteryContext(db);
      const text = pickMasteryFlavor(ctx, item);
      setToast({ text, emoji: item.emoji });
    } catch {
      setToast({ text: `${item.name} 是你赚来的——好好享用。`, emoji: item.emoji });
    }
  }

  function close() { setToast(null); }

  return { toast, showMasteryToast, close, MasteryToastUI: <MasteryToastUI toast={toast} onClose={close} /> };
}

function MasteryToastUI({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  // Auto-close after 5s
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="fixed left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%]"
          style={{ bottom: 24 }}
          onClick={onClose}
        >
          <div
            className="space-card p-4 flex items-start gap-3"
            style={{
              borderColor: 'var(--accent)',
              borderWidth: 2,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="text-3xl shrink-0">{toast.emoji}</div>
            <div className="flex-1 text-sm" style={{ color: 'var(--ink-strong)', lineHeight: 1.5 }}>
              {toast.text}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
