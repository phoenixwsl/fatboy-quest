// ============================================================
// Zustand 全局状态
// 仅放运行时 UI 状态。所有持久化数据走 Dexie + dexie-react-hooks.
// ============================================================

import { create } from 'zustand';

interface AppState {
  parentMode: boolean;
  enterParentMode: () => void;
  exitParentMode: () => void;
  toast: { id: number; text: string; tone: 'info' | 'success' | 'warn' } | null;
  showToast: (text: string, tone?: 'info' | 'success' | 'warn') => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  parentMode: false,
  enterParentMode: () => set({ parentMode: true }),
  exitParentMode: () => set({ parentMode: false }),
  toast: null,
  showToast: (text, tone = 'info') => {
    const id = Date.now();
    set({ toast: { id, text, tone } });
    setTimeout(() => {
      // 只清除自己；避免清掉新的 toast
      set((s) => (s.toast?.id === id ? { toast: null } : s));
    }, 2400);
  },
  clearToast: () => set({ toast: null }),
}));
