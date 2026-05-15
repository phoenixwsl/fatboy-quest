// ============================================================
// R4.4.0: 家长"今日见证"按钮 + 弹窗
//
// 用法：在 ShopManager / Dashboard 任意家长页放
//   <WitnessButton />
// 点击 → 弹窗 → 家长选自己（爸 / 妈）+ 写一句具体行为 + 选 emoji
// 提交：写表 + 推送另一位家长
// ============================================================

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import {
  WITNESS_EMOJIS, createWitnessMoment, buildOtherParentNotification,
} from '../lib/witnessMoment';
import { checkWitnessRewards } from '../lib/witnessRewards';
import { pushToRecipients } from '../lib/bark';
import { useAppStore } from '../store/useAppStore';
import type { BarkRecipient } from '../types';

export function WitnessButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={compact ? 'space-btn-ghost text-sm' : 'space-btn-ghost'}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <span>💛</span>
        <span>今日见证</span>
      </button>
      {open && <WitnessModal onClose={() => setOpen(false)} />}
    </>
  );
}

// ============================================================
function WitnessModal({ onClose }: { onClose: () => void }) {
  const toast = useAppStore(s => s.showToast);
  const recipients = useLiveQuery(() => db.recipients.toArray()) ?? [];
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const childName = settings?.childName ?? '肥仔';
  const enabledRecipients = recipients.filter(r => r.enabled);

  const [from, setFrom] = useState<BarkRecipient | null>(null);
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState<string>(WITNESS_EMOJIS[0]);

  // 默认选第一位
  useEffect(() => {
    if (!from && enabledRecipients.length > 0) setFrom(enabledRecipients[0]);
  }, [enabledRecipients.length]);

  async function submit() {
    if (!from) { toast('请先选见证人', 'warn'); return; }
    const t = text.trim();
    if (t.length < 3) { toast('描述至少 3 个字（具体一点）', 'warn'); return; }
    const moment = await createWitnessMoment(db, { text: t, emoji, from });
    // 推送另一位家长
    const notif = buildOtherParentNotification(moment, recipients, childName);
    if (notif) {
      pushToRecipients(notif.recipients, 'taskDone' as any, {
        title: notif.title,
        body: notif.body,
        group: 'fatboy-witness',
      }).catch(() => {});
    }
    toast(`✓ 已记录温柔时刻 ${emoji}`, 'success');
    // R5.2.0: 检查累计阈值 → 解锁称号
    try {
      const r = await checkWitnessRewards(db);
      if (r.newlyUnlocked.length > 0) {
        for (const title of r.newlyUnlocked) {
          toast(`🎉 解锁称号「${title}」`, 'success');
        }
      }
    } catch { /* silent */ }
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="space-card w-full max-w-md p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center mb-3">
            <div className="text-lg font-bold flex-1">💛 今日见证 · {childName}</div>
            <button onClick={onClose} className="text-xl" style={{ color: 'var(--ink-faint)' }}>×</button>
          </div>

          <div className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>
            记一个具体行为，不是"今天真乖"。比如："主动让妹妹先选玩具"、"输了棋没哭"、"自己想出新拼法"。
          </div>

          {/* 见证人 */}
          {enabledRecipients.length > 1 && (
            <div className="mb-3">
              <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>见证人</div>
              <div className="flex gap-2">
                {enabledRecipients.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setFrom(r)}
                    aria-pressed={from?.id === r.id}
                    className={`tag-btn flex-1 ${from?.id === r.id ? 'active' : ''}`}
                  >
                    {r.emoji} {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 文本 */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="今天主动让妹妹先选玩具，看到了。"
            className="w-full px-3 py-2 rounded-xl outline-none mb-3 resize-none"
            style={{ background: 'var(--surface-mist)' }}
            maxLength={140}
          />
          <div className="text-[10px] text-right mb-3" style={{ color: 'var(--ink-faint)' }}>
            {text.length} / 140
          </div>

          {/* emoji */}
          <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>选个心情</div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {WITNESS_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                aria-pressed={emoji === e}
                className="text-2xl w-11 h-11 rounded-lg active:scale-95 transition-transform"
                style={{
                  background: emoji === e ? 'var(--primary-soft)' : 'var(--surface-mist)',
                  border: emoji === e ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >{e}</button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="space-btn-ghost flex-1">取消</button>
            <button onClick={submit} className="space-btn flex-1">💛 记录</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
