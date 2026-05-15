import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import { newId } from '../lib/ids';
import { todayString } from '../lib/time';
import { sounds } from '../lib/sounds';
import { extractTemplates, type TaskTemplate } from '../lib/templates';
import { useAppStore } from '../store/useAppStore';
import { useLiveQuery } from 'dexie-react-hooks';
import type { SubjectType, Settings } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings | undefined;
}

const SUBJECTS: { id: SubjectType; label: string; emoji: string }[] = [
  { id: 'math', label: '数学', emoji: '🔢' },
  { id: 'chinese', label: '语文', emoji: '📖' },
  { id: 'english', label: '英语', emoji: '🔤' },
  { id: 'reading', label: '阅读', emoji: '📚' },
  { id: 'writing', label: '练字', emoji: '✏️' },
  { id: 'other', label: '其他', emoji: '⭐' },
];

export function ChildAddTaskModal({ open, onClose }: Props) {
  const toast = useAppStore(s => s.showToast);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectType>('other');
  const [minutes, setMinutes] = useState(20);

  // 模板：从历史里提取，过滤隐藏
  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const hiddenRows = useLiveQuery(() => db.templateHidden.toArray());
  const templates = (() => {
    if (!allTasks) return [];
    const hidden = new Set((hiddenRows ?? []).map(h => h.title));
    return extractTemplates(allTasks, hidden, 12);
  })();

  useEffect(() => {
    if (!open) return;
    setTitle(''); setSubject('other'); setMinutes(20);
  }, [open]);

  function applyTemplate(tpl: TaskTemplate) {
    setTitle(tpl.title);
    setSubject(tpl.subject);
    setMinutes(tpl.estimatedMinutes);
    sounds.play('tap');
  }

  async function submit() {
    if (!title.trim()) { toast('给任务起个名字吧', 'warn'); sounds.play('error'); return; }
    await db.tasks.add({
      id: newId('task'),
      title: title.trim(),
      date: todayString(),
      basePoints: 0,                  // 孩子加的任务无积分，家长评分时填
      estimatedMinutes: Math.max(5, minutes),
      subject,
      status: 'pending',
      createdAt: Date.now(),
      createdBy: 'child',
    });
    sounds.play('unlock');
    toast('✓ 加好了！积分由家长评分时决定', 'success');
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-[var(--radius-xl)]"
            style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* R5.0.0: 顶部装饰条 + 标题 */}
            <div className="text-center mb-4">
              <div className="text-4xl mb-1">✏️</div>
              <div className="text-lg font-bold" style={{ color: 'var(--ink-strong)' }}>我要加一个任务</div>
              <div className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>积分由家长在评分时给你 ⭐</div>
            </div>

            {templates.length > 0 && (
              <div className="mb-4 p-2.5 rounded-md" style={{ background: 'var(--surface-mist)' }}>
                <div className="text-[11px] mb-1.5" style={{ color: 'var(--ink-faint)' }}>📋 试试以前做过的</div>
                <div className="flex flex-wrap gap-1.5">
                  {templates.slice(0, 8).map(tpl => (
                    <button key={tpl.title} onClick={() => applyTemplate(tpl)} className="tag-btn"
                      style={{ background: 'var(--surface-paper)', border: '1px solid var(--surface-fog)' }}>
                      <span className="mr-1">{SUBJECTS.find(s => s.id === tpl.subject)?.emoji}</span>
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="text-[11px] mb-1.5" style={{ color: 'var(--ink-faint)' }}>📝 任务名字</div>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="例如：背 10 个单词"
                  className="w-full px-3 py-2.5 rounded-xl outline-none text-base"
                  style={{ background: 'var(--surface-mist)', color: 'var(--ink-strong)', border: '2px solid transparent' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; }}
                />
              </div>

              <div>
                <div className="text-[11px] mb-1.5" style={{ color: 'var(--ink-faint)' }}>📚 类型</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {SUBJECTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSubject(s.id); sounds.play('tap'); }}
                      aria-pressed={subject === s.id}
                      className="py-2.5 rounded-xl text-center transition-all"
                      style={subject === s.id
                        ? { background: 'var(--primary-soft)', border: '2px solid var(--primary)', color: 'var(--primary-strong)' }
                        : { background: 'var(--surface-mist)', border: '2px solid transparent', color: 'var(--ink-muted)' }}
                    >
                      <div className="text-xl">{s.emoji}</div>
                      <div className="text-xs mt-0.5">{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] mb-1.5" style={{ color: 'var(--ink-faint)' }}>⏱ 预计用时</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[10, 15, 20, 30, 45, 60].map(m => (
                    <button
                      key={m}
                      onClick={() => { setMinutes(m); sounds.play('tap'); }}
                      aria-pressed={minutes === m}
                      className="py-2 rounded-xl text-center transition-all"
                      style={minutes === m
                        ? { background: 'var(--accent-soft)', border: '2px solid var(--accent)', color: 'var(--accent-strong)' }
                        : { background: 'var(--surface-mist)', border: '2px solid transparent', color: 'var(--ink-muted)' }}
                    >
                      <div className="text-num font-bold">{m}</div>
                      <div className="text-[9px]">分</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={onClose} className="secondary-btn flex-1">取消</button>
              <button onClick={submit} className="primary-btn flex-1">
                <span className="primary-btn-bottom" aria-hidden />
                <span
                  className="primary-btn-top"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  添加
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
