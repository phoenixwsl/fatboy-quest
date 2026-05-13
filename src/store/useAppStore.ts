// ============================================================
// Zustand 全局状态
// 仅放运行时 UI 状态。所有持久化数据走 Dexie + dexie-react-hooks.
// ============================================================

import { create } from 'zustand';

export type ConfirmTone = 'info' | 'warn' | 'danger' | 'help';

export interface ConfirmOptions {
  title: string;
  body?: string;
  emoji?: string;
  tone?: ConfirmTone;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmState extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

interface AppState {
  parentMode: boolean;
  enterParentMode: () => void;
  exitParentMode: () => void;
  toast: { id: number; text: string; tone: 'info' | 'success' | 'warn' } | null;
  showToast: (text: string, tone?: 'info' | 'success' | 'warn') => void;
  clearToast: () => void;
  /** 自定义大号确认弹窗。返回 Promise<boolean>，比原生 confirm 醒目得多。 */
  confirm: ConfirmState | null;
  confirmModal: (opts: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
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

  confirm: null,
  confirmModal: (opts) => new Promise<boolean>((resolve) => {
    set({
      confirm: {
        ...opts,
        id: Date.now() + Math.random(),
        resolve,
      },
    });
  }),
  resolveConfirm: (ok) => {
    const c = get().confirm;
    if (!c) return;
    set({ confirm: null });
    c.resolve(ok);
  },
}));
