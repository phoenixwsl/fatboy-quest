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
            initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}
            className="space-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold mb-1">✨ 我要加一个任务</div>
            <div className="text-xs text-white/50 mb-4">积分由家长在评分时给你</div>

            {templates.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-white/70 mb-2">📋 选一个模板</div>
                <div className="flex flex-wrap gap-1.5">
                  {templates.slice(0, 8).map(tpl => (
                    <button key={tpl.title} onClick={() => applyTemplate(tpl)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-xs">
                      <span className="mr-1">{SUBJECTS.find(s => s.id === tpl.subject)?.emoji}</span>
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <div className="text-sm text-white/70 mb-1">任务名字</div>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="例如：背 10 个单词"
                  className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none" />
              </div>

              <div>
                <div className="text-sm text-white/70 mb-1">类型</div>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map(s => (
                    <button key={s.id} onClick={() => { setSubject(s.id); sounds.play('tap'); }}
                      className={`px-3 py-1.5 rounded-xl text-sm ${subject === s.id ? 'bg-space-nebula' : 'bg-white/10'}`}>
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-white/70 mb-1">预计用时</div>
                <div className="flex gap-2 flex-wrap">
                  {[10, 15, 20, 30, 45, 60].map(m => (
                    <button key={m} onClick={() => { setMinutes(m); sounds.play('tap'); }}
                      className={`px-3 py-1.5 rounded-xl text-sm ${minutes === m ? 'bg-space-nebula' : 'bg-white/10'}`}>
                      {m} 分
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="space-btn-ghost flex-1">取消</button>
              <button onClick={submit} className="space-btn flex-1">添加</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
