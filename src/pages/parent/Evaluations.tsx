import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db';
import { newId } from '../../lib/ids';
import { calcFinalPoints, makeEvaluation } from '../../lib/points';
import { StarRating } from '../../components/StarRating';
import { SubjectIcon } from '../HomePage';
import { useAppStore } from '../../store/useAppStore';
import type { Task } from '../../types';

export function Evaluations() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const pendingTasks = useLiveQuery(() => db.tasks.where({ status: 'done' }).reverse().sortBy('completedAt'));
  const evaluatedTasks = useLiveQuery(() => db.tasks.where({ status: 'evaluated' }).reverse().sortBy('completedAt'));

  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [completion, setCompletion] = useState(5);
  const [quality, setQuality] = useState(5);
  const [attitude, setAttitude] = useState(5);
  const [note, setNote] = useState('');

  const finalPts = openTask ? calcFinalPoints(openTask.basePoints, { completion, quality, attitude }) : 0;

  function open(t: Task) {
    setOpenTask(t);
    setCompletion(5); setQuality(5); setAttitude(5); setNote('');
  }

  async function submit() {
    if (!openTask) return;
    const ev = makeEvaluation(openTask, { completion, quality, attitude }, note.trim() || undefined);
    await db.transaction('rw', db.evaluations, db.tasks, db.points, async () => {
      await db.evaluations.add(ev);
      await db.tasks.update(openTask.id, { status: 'evaluated', evaluationId: ev.id });
      await db.points.add({
        id: newId('pt'), ts: Date.now(), delta: ev.finalPoints,
        reason: 'task_evaluated', refId: openTask.id,
      });
    });
    toast(`✓ 已评分 +${ev.finalPoints} 积分`, 'success');
    setOpenTask(null);
  }

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/parent/dashboard')} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold">⭐ 待评分</div>
      </div>

      <div className="text-sm text-white/60 mb-2">待评分 ({pendingTasks?.length ?? 0})</div>
      <div className="space-y-2">
        {pendingTasks?.map(t => (
          <button key={t.id} onClick={() => open(t)}
            className="space-card p-3 flex items-center gap-3 w-full text-left active:scale-95">
            <SubjectIcon subject={t.subject} />
            <div className="flex-1">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-white/50">
                完成于 {t.completedAt ? new Date(t.completedAt).toLocaleString() : '?'}
              </div>
            </div>
            <span className="text-space-plasma">→</span>
          </button>
        ))}
        {pendingTasks?.length === 0 && (
          <div className="text-white/40 text-sm text-center py-4">没有待评分的作业 ✨</div>
        )}
      </div>

      {evaluatedTasks && evaluatedTasks.length > 0 && (
        <>
          <div className="text-sm text-white/60 mt-6 mb-2">已评分（最近）</div>
          <div className="space-y-2">
            {evaluatedTasks.slice(0, 10).map(t => (
              <div key={t.id} className="space-card p-3 opacity-70 flex items-center gap-3">
                <SubjectIcon subject={t.subject} />
                <div className="flex-1">
                  <div className="text-sm">{t.title}</div>
                  <div className="text-xs text-white/50">已评分 ✓</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {openTask && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setOpenTask(null)}
          >
            <motion.div
              initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}
              className="space-card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-lg font-bold mb-1">评分：{openTask.title}</div>
              <div className="text-xs text-white/50 mb-4">基础积分 {openTask.basePoints}</div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-white/70 mb-1">完成度</div>
                  <StarRating value={completion} onChange={setCompletion} />
                </div>
                <div>
                  <div className="text-sm text-white/70 mb-1">完成质量</div>
                  <StarRating value={quality} onChange={setQuality} />
                </div>
                <div>
                  <div className="text-sm text-white/70 mb-1">完成态度</div>
                  <StarRating value={attitude} onChange={setAttitude} />
                </div>
                <div>
                  <div className="text-sm text-white/70 mb-1">备注（可选）</div>
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    rows={3}
                    placeholder="给孩子的反馈..."
                    className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none resize-none" />
                </div>
              </div>

              <div className="mt-4 p-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl text-center">
                <div className="text-xs text-white/60">实得积分</div>
                <div className="text-3xl font-bold text-amber-300">⭐ {finalPts}</div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => setOpenTask(null)} className="space-btn-ghost flex-1">取消</button>
                <button onClick={submit} className="space-btn flex-1">提交评分</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
