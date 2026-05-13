import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db';
import { calcFinalPoints } from '../../lib/points';
import { earlyBonus, summarizeExecution } from '../../lib/earlyBonus';
import { StarRating } from '../../components/StarRating';
import { SubjectIcon } from '../HomePage';
import { DifficultyStars } from '../../components/DifficultyStars';
import { DIFFICULTY_LABELS, difficultyBonus } from '../../lib/difficulty';
import { useAppStore } from '../../store/useAppStore';
import { evaluateTaskOnce, QUICK_PRESETS, smartDefaultBasePoints } from '../../lib/evaluate';
import type { Task } from '../../types';

export function Evaluations() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const confirmModal = useAppStore(s => s.confirmModal);
  const pendingTasks = useLiveQuery(() => db.tasks.where({ status: 'done' }).reverse().sortBy('completedAt'));
  const evaluatedTasks = useLiveQuery(() => db.tasks.where({ status: 'evaluated' }).reverse().sortBy('completedAt'));

  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [basePoints, setBasePoints] = useState(20);
  const [completion, setCompletion] = useState(5);
  const [quality, setQuality] = useState(5);
  const [attitude, setAttitude] = useState(5);
  const [note, setNote] = useState('');
  const [parentReminder, setParentReminder] = useState('');

  useEffect(() => {
    if (!openTask) return;
    // 智能默认基础积分：孩子加的按时长/2 估算（最小 5），家长加的用 task.basePoints
    if (openTask.createdBy === 'child' && openTask.basePoints === 0) {
      setBasePoints(Math.max(5, Math.round(openTask.estimatedMinutes / 2)));
    } else {
      setBasePoints(openTask.basePoints || 20);
    }
    setCompletion(5); setQuality(5); setAttitude(5); setNote(''); setParentReminder('');
  }, [openTask?.id]);

  const summary = openTask ? summarizeExecution(openTask) : null;
  const corePts = openTask ? calcFinalPoints(basePoints, { completion, quality, attitude }) : 0;
  const earlyBonusPts = openTask ? earlyBonus({
    estimatedMinutes: openTask.estimatedMinutes,
    actualStartedAt: openTask.actualStartedAt,
    completedAt: openTask.completedAt,
    pauseSecondsUsed: openTask.pauseSecondsUsed,
    qualityStars: quality,
  }) : 0;
  const totalPts = corePts + earlyBonusPts;

  async function submit() {
    if (!openTask) return;
    const r = await evaluateTaskOnce(db, {
      taskId: openTask.id,
      basePoints,
      completion, quality, attitude,
      note: note.trim() || undefined,
      parentReminderForNext: parentReminder.trim() || undefined,
    });
    if (r.comboBonusPoints) {
      toast(`⚡ 连击额外 +${r.comboBonusPoints} 积分`, 'success');
    }
    toast(`✓ 已评分 +${r.finalPoints + r.earlyBonusPoints} 积分`, 'success');
    setOpenTask(null);
  }

  // R2.4.1: 快速套餐评分（跳过 modal）
  async function quickEvaluate(task: Task, preset: typeof QUICK_PRESETS[number]) {
    const r = await evaluateTaskOnce(db, {
      taskId: task.id,
      basePoints: smartDefaultBasePoints(task),
      ...preset.stars,
    });
    toast(`✓ ${task.title} ${preset.label} +${r.finalPoints + r.earlyBonusPoints} 积分`, 'success');
  }

  // R2.4.2: 批量评分 — 给所有待评分任务一键 5/5/5
  async function evaluateAllPerfect() {
    const tasks = pendingTasks ?? [];
    if (tasks.length === 0) return;
    const ok = await confirmModal({
      title: `全部完美评分？`,
      body: `把所有 ${tasks.length} 个待评分任务一键 5⭐5⭐5⭐。\n之后还能在已评分里点进去修改。`,
      emoji: '🌟',
      tone: 'info',
      confirmLabel: `全部 +5⭐`,
    });
    if (!ok) return;
    let totalAdded = 0;
    for (const t of tasks) {
      const r = await evaluateTaskOnce(db, {
        taskId: t.id,
        basePoints: smartDefaultBasePoints(t),
        completion: 5, quality: 5, attitude: 5,
      });
      totalAdded += r.finalPoints + r.earlyBonusPoints + (r.comboBonusPoints ?? 0);
    }
    toast(`✓ 批量评分完成，共 +${totalAdded} 积分`, 'success');
  }

  return (
    <div className="min-h-full p-4 pb-24" style={{ color: 'var(--ink)' }}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/parent/dashboard')} className="secondary-btn" style={{ padding: '8px 16px' }}>←</button>
        <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>待评分</div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-sm" style={{ color: 'var(--ink-muted)' }}>
          待评分 (<span className="text-num">{pendingTasks?.length ?? 0}</span>)
        </div>
        {(pendingTasks?.length ?? 0) >= 2 && (
          <button onClick={evaluateAllPerfect} className="primary-btn">
            <span className="primary-btn-bottom" aria-hidden />
            <span className="primary-btn-top" style={{ padding: '10px 18px', fontSize: 14 }}>
              全部完美评分
            </span>
          </button>
        )}
      </div>
      <div className="space-y-3">
        {pendingTasks?.map(t => (
          <div
            key={t.id}
            className="p-3 rounded-[var(--radius-md)]"
            style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-sm)' }}
          >
            <button onClick={() => setOpenTask(t)}
              className="flex items-center gap-3 w-full text-left active:scale-95">
              <SubjectIcon subject={t.subject} />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                  {t.title}
                  {t.createdBy === 'child' && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--sky-100)', color: 'var(--sky-700)' }}
                    >
                      孩子加的
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                  完成于 {t.completedAt ? new Date(t.completedAt).toLocaleString() : '?'}
                </div>
              </div>
              <span className="text-xs" style={{ color: 'var(--sky-700)' }}>详细 →</span>
            </button>
            {/* R3.0 §7.3: 评分按钮统一灰底未选；hover/选中后才显色（低饱和） */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {QUICK_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => quickEvaluate(t, preset)}
                  className="rating-btn"
                  style={{
                    flex: '1',
                    padding: '12px 0',
                    background: 'var(--mist)',
                    border: '2px solid var(--fog)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink-muted)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s var(--spring-bouncy)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--sky-300)';
                    e.currentTarget.style.background = 'var(--paper)';
                    e.currentTarget.style.color = 'var(--ink)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--fog)';
                    e.currentTarget.style.background = 'var(--mist)';
                    e.currentTarget.style.color = 'var(--ink-muted)';
                    e.currentTarget.style.transform = '';
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {pendingTasks?.length === 0 && (
          <div className="text-sm text-center py-4" style={{ color: 'var(--ink-faint)' }}>
            没有待评分的作业 ✨
          </div>
        )}
      </div>

      {evaluatedTasks && evaluatedTasks.length > 0 && (
        <>
          <div className="text-sm mt-6 mb-2" style={{ color: 'var(--ink-muted)' }}>已评分（最近）</div>
          <div className="space-y-2">
            {evaluatedTasks.slice(0, 10).map(t => (
              <div
                key={t.id}
                className="p-3 rounded-[var(--radius-md)] opacity-80 flex items-center gap-3"
                style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-sm)' }}
              >
                <SubjectIcon subject={t.subject} />
                <div className="flex-1">
                  <div className="text-sm" style={{ color: 'var(--ink)' }}>{t.title}</div>
                  <div className="text-xs" style={{ color: 'var(--success)' }}>已评分 ✓</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {openTask && summary && (() => {
          const modalLabel: React.CSSProperties = { fontSize: 13, color: 'var(--ink-muted)', marginBottom: 4 };
          const modalInput: React.CSSProperties = {
            background: 'var(--mist)',
            color: 'var(--ink)',
            border: '1px solid var(--fog)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            outline: 'none',
          };
          const difficultyPts = difficultyBonus(openTask.difficulty);
          const grandTotal = totalPts + difficultyPts;
          return (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setOpenTask(null)}
          >
            <motion.div
              initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}
              className="w-full max-w-md max-h-[92vh] overflow-y-auto"
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--fog)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                padding: 24,
                color: 'var(--ink)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* R3.3.1: 任务详情头 — subject icon + 难度 + 必做 + 预估 */}
              <div className="flex items-center gap-3 mb-3">
                <SubjectIcon subject={openTask.subject} />
                <div className="flex-1">
                  <div className="text-lg font-bold flex items-center gap-2 flex-wrap" style={{ color: 'var(--ink)' }}>
                    {openTask.title}
                    <DifficultyStars difficulty={openTask.difficulty} size="md" />
                    {openTask.isRequired && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--danger)', color: '#fff' }}
                      >
                        必做
                      </span>
                    )}
                    {openTask.createdBy === 'child' && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--sky-100)', color: 'var(--sky-700)' }}
                      >
                        孩子加的
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                    预估 <span className="text-num">{openTask.estimatedMinutes}</span> 分
                    {openTask.difficulty && openTask.difficulty > 1 && (
                      <> · 难度 {DIFFICULTY_LABELS[openTask.difficulty]}（额外 +{difficultyPts} ⭐）</>
                    )}
                  </div>
                </div>
              </div>

              {/* 执行记录 */}
              <div
                className="text-xs space-y-1 mb-3"
                style={{
                  background: 'var(--mist)',
                  border: '1px solid var(--fog)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  color: 'var(--ink)',
                }}
              >
                <div className="font-bold mb-1" style={{ color: 'var(--ink-muted)' }}>⏱ 执行记录</div>
                <div>实际用时 <b className="text-num">{summary.effectiveMinutes}</b> 分钟（预估 <span className="text-num">{summary.estimatedMinutes}</span> 分，
                  {summary.savedMinutes >= 0
                    ? <span style={{ color: 'var(--success)' }}>提前 <span className="text-num">{summary.savedMinutes}</span></span>
                    : <span style={{ color: 'var(--danger)' }}>超时 <span className="text-num">{-summary.savedMinutes}</span></span>} 分钟）
                </div>
                {summary.pauseCount > 0 && <div style={{ color: 'var(--fatboy-700)' }}>⏸ 暂停 {summary.pauseCount} 次（{summary.pauseMinutes} 分钟）</div>}
                {summary.extendCount > 0 && <div style={{ color: 'var(--fatboy-700)' }}>⏰ 延时 {summary.extendCount} 次（+{summary.extendMinutes} 分钟）</div>}
                {summary.undoCount > 0 && <div style={{ color: 'var(--danger)' }}>↩ 撤回 {summary.undoCount} 次</div>}
                {summary.isOnTime && <div style={{ color: 'var(--success)' }}>✓ 按时完成</div>}
              </div>

              <div className="space-y-3">
                <div>
                  <div style={modalLabel}>基础积分（可改）</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setBasePoints(Math.max(1, basePoints - 5))}
                      style={{ ...modalInput, padding: '10px 14px', cursor: 'pointer' }}>−5</button>
                    <input type="number" value={basePoints}
                      onChange={e => setBasePoints(Math.max(1, Number(e.target.value)))}
                      className="flex-1 text-center text-lg"
                      style={modalInput} />
                    <button onClick={() => setBasePoints(basePoints + 5)}
                      style={{ ...modalInput, padding: '10px 14px', cursor: 'pointer' }}>+5</button>
                  </div>
                </div>
                <div>
                  <div style={modalLabel}>完成度</div>
                  <StarRating value={completion} onChange={setCompletion} />
                </div>
                <div>
                  <div style={modalLabel}>完成质量</div>
                  <StarRating value={quality} onChange={setQuality} />
                  {quality < 4 && <div className="text-xs mt-1" style={{ color: 'var(--fatboy-700)' }}>质量 &lt; 4 星：没有提前完成奖励</div>}
                </div>
                <div>
                  <div style={modalLabel}>完成态度</div>
                  <StarRating value={attitude} onChange={setAttitude} />
                </div>
                <div>
                  <div style={modalLabel}>备注（可选）</div>
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    rows={2}
                    placeholder="给孩子的反馈..."
                    className="w-full resize-none"
                    style={modalInput} />
                </div>
                <div>
                  <div style={modalLabel}>💡 下次提醒（同名任务下次出现时给孩子看）</div>
                  <textarea value={parentReminder} onChange={e => setParentReminder(e.target.value)}
                    rows={2}
                    placeholder="比如：明天先做数学；这次第 3 题不会，可以多练"
                    className="w-full resize-none"
                    style={modalInput} />
                </div>
              </div>

              <div
                className="mt-4 p-3"
                style={{
                  background: 'var(--fatboy-50)',
                  border: '1px solid var(--fatboy-300)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>实得积分</div>
                <div className="text-3xl font-bold text-num" style={{ color: 'var(--fatboy-700)' }}>⭐ {grandTotal}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>
                  核心 <span className="text-num">{corePts}</span>
                  {earlyBonusPts > 0 && <span style={{ color: 'var(--success)' }}> · 提前奖 +<span className="text-num">{earlyBonusPts}</span></span>}
                  {difficultyPts > 0 && <span style={{ color: 'var(--fatboy-700)' }}> · 难度奖 +<span className="text-num">{difficultyPts}</span></span>}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => setOpenTask(null)} className="space-btn-ghost flex-1">取消</button>
                <button onClick={submit} className="space-btn flex-1">提交评分</button>
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
