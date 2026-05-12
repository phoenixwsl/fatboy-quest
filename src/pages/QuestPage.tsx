import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import { todayString, minutesToHHMM, formatDuration } from '../lib/time';
import { PetAvatar } from '../components/PetAvatar';
import { SubjectIcon } from './HomePage';
import { useAppStore } from '../store/useAppStore';
import { sounds, syncFromSettings } from '../lib/sounds';
import { pushToRecipients, messages } from '../lib/bark';
import { applyDayComplete } from '../lib/streak';
import { totalPoints } from '../lib/points';
import { canUndoCompletion } from '../lib/templates';
import { nextExtensionOffer, canShowExtensionButton } from '../lib/extension';
import { calcCombo } from '../lib/combo';
import { summarizeExecution } from '../lib/earlyBonus';
import { HardWarning } from '../components/HardWarning';
import { RestBlock } from '../components/RestBlock';
import { BattleReport } from '../components/BattleReport';
import { newId } from '../lib/ids';
import type { Task, ScheduleItem, Schedule } from '../types';

const PAUSE_LIMIT_SEC = 3 * 60; // 单次任务暂停最多 3 分钟

export function QuestPage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const today = todayString();
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const pet = useLiveQuery(() => db.pet.get('singleton'));
  const points = useLiveQuery(() => db.points.toArray());
  const streak = useLiveQuery(() => db.streak.get('singleton'));

  const schedule = useLiveQuery(async () => {
    const all = await db.schedules.where({ date: today }).reverse().sortBy('round');
    return all.find(s => s.lockedAt && !s.completedAt);
  }, [today]);

  const tasksOnTimeline = useLiveQuery(async () => {
    if (!schedule) return [];
    const ids = schedule.items.filter(i => i.kind === 'task' && i.taskId).map(i => i.taskId!);
    return await db.tasks.bulkGet(ids).then(arr => arr.filter(Boolean) as Task[]);
  }, [schedule?.id]);

  const taskMap = useMemo(() => {
    const m = new Map<string, Task>();
    if (tasksOnTimeline) for (const t of tasksOnTimeline) m.set(t.id, t);
    return m;
  }, [tasksOnTimeline]);

  // === 全局 1s tick ===
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // === 音效同步 ===
  useEffect(() => { syncFromSettings(settings?.soundEnabled); }, [settings?.soundEnabled]);

  // === 休息块跳过状态 ===
  // 注意必须放在 activeIdx useMemo 之前，且加进 deps，否则点跳过不生效
  const [skippedRests, setSkippedRests] = useState<Set<number>>(new Set());

  // === 找当前 active item ===
  // 规则：按 schedule.items 顺序：
  //   - task 未完成 → 它是 active
  //   - rest 块"激活"需满足：前面所有 task 已完成 + 未被手动跳过 + 后面没有任何
  //     task 已经开始或完成（这样刷新页面后也能正确判定"已经路过了"）
  const activeIdx = useMemo(() => {
    if (!schedule) return -1;
    for (let i = 0; i < schedule.items.length; i++) {
      const it = schedule.items[i];
      if (it.kind === 'task') {
        const t = it.taskId ? taskMap.get(it.taskId) : null;
        if (!t) continue;
        if (t.status !== 'done' && t.status !== 'evaluated') return i;
      } else {
        if (skippedRests.has(i)) continue;
        const allBeforeDone = schedule.items.slice(0, i).every(prev =>
          prev.kind !== 'task' || (prev.taskId && (() => {
            const t = taskMap.get(prev.taskId!);
            return t && (t.status === 'done' || t.status === 'evaluated');
          })()),
        );
        if (!allBeforeDone) continue;
        // 如果后面任何 task 已被启动或完成 → 这个 rest 已经被路过了
        const someAfterTouched = schedule.items.slice(i + 1).some(next =>
          next.kind === 'task' && next.taskId && (() => {
            const t = taskMap.get(next.taskId!);
            return !!(t && (t.actualStartedAt !== undefined || t.status === 'inProgress' || t.status === 'done' || t.status === 'evaluated'));
          })(),
        );
        if (someAfterTouched) continue;
        return i;
      }
    }
    return -1;
  }, [schedule, taskMap, skippedRests]);
  // 休息块开始时间：前一个 task 完成时间。**故意不依赖 now**：
  // 进入 rest 后这个值必须稳定，否则 RestBlock 内部的计时会被反复重置
  // 没找到前置任务（rest 在最前面）时用一个 ref 缓存"首次进入时刻"
  const restEnterFallbackRef = useRef<{ idx: number; ts: number } | null>(null);
  const restStartedAt = useMemo(() => {
    if (!schedule || activeIdx < 0) return 0;
    const active = schedule.items[activeIdx];
    if (active.kind !== 'rest') {
      restEnterFallbackRef.current = null;
      return 0;
    }
    for (let i = activeIdx - 1; i >= 0; i--) {
      const it = schedule.items[i];
      if (it.kind === 'task' && it.taskId) {
        const t = taskMap.get(it.taskId);
        if (t?.completedAt) return t.completedAt;
      }
    }
    // fallback: 首次进入这个 rest 时记一下，之后稳定返回
    if (!restEnterFallbackRef.current || restEnterFallbackRef.current.idx !== activeIdx) {
      restEnterFallbackRef.current = { idx: activeIdx, ts: Date.now() };
    }
    return restEnterFallbackRef.current.ts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, activeIdx, taskMap]);

  // === 3 分钟硬提醒 ===
  const [warning3MinFor, setWarning3MinFor] = useState<string | null>(null);
  const warnedRef = useRef<Set<string>>(new Set());

  // 计算当前 task 的"剩余有效时间"（毫秒）
  function calcRemainingMs(t: Task): number {
    if (!t.actualStartedAt) return t.estimatedMinutes * 60000;
    const elapsedMs = now - t.actualStartedAt;
    const pauseMs = (t.pauseSecondsUsed ?? 0) * 1000 + currentPauseMs(t);
    const usedMs = Math.max(0, elapsedMs - pauseMs);
    const totalMs = (t.estimatedMinutes + (t.extendMinutesTotal ?? 0)) * 60000;
    return totalMs - usedMs;
  }
  function currentPauseMs(t: Task): number {
    if (!t.pausedAt) return 0;
    return now - t.pausedAt;
  }
  function effectiveElapsedMs(t: Task): number {
    if (!t.actualStartedAt) return 0;
    const elapsedMs = now - t.actualStartedAt;
    const pauseMs = (t.pauseSecondsUsed ?? 0) * 1000 + currentPauseMs(t);
    return Math.max(0, elapsedMs - pauseMs);
  }

  // 触发 3 分钟硬提醒
  useEffect(() => {
    if (!schedule || activeIdx < 0) return;
    const item = schedule.items[activeIdx];
    if (item.kind !== 'task' || !item.taskId) return;
    const t = taskMap.get(item.taskId);
    if (!t || t.status !== 'inProgress' || t.pausedAt) return;
    const warnMin = settings?.warnMinutesBeforeEnd ?? 3;
    const remMs = calcRemainingMs(t);
    const remSec = remMs / 1000;
    if (remSec > 0 && remSec < warnMin * 60 + 2 && remSec > warnMin * 60 - 2) {
      if (!warnedRef.current.has(t.id)) {
        warnedRef.current.add(t.id);
        sounds.play('error');
        setWarning3MinFor(`⏰ 还有 ${warnMin} 分钟`);
      }
    }
  }, [now, schedule, activeIdx, taskMap, settings?.warnMinutesBeforeEnd]);

  // === 战报 ===
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<{
    killCount: number; totalMinutes: number; comboPeak: number; bestFastTitle?: string;
  } | null>(null);

  // === 启动任务 ===
  async function startTask(taskId: string) {
    const t = await db.tasks.get(taskId);
    if (!t || t.status !== 'scheduled') return;
    await db.tasks.update(taskId, {
      status: 'inProgress',
      actualStartedAt: Date.now(),
    });
    sounds.play('tap');
  }

  // === 暂停 / 恢复 ===
  async function pauseTask(taskId: string) {
    const t = await db.tasks.get(taskId);
    if (!t || (t.pauseCount ?? 0) >= 1) {
      toast('每项任务只能暂停 1 次', 'warn'); return;
    }
    await db.tasks.update(taskId, {
      pausedAt: Date.now(),
      pauseCount: (t.pauseCount ?? 0) + 1,
    });
    sounds.play('tap');
    toast('暂停中（最多 3 分钟）', 'info');
  }
  async function resumeTask(taskId: string) {
    const t = await db.tasks.get(taskId);
    if (!t || !t.pausedAt) return;
    const elapsedSec = Math.min(PAUSE_LIMIT_SEC, Math.floor((Date.now() - t.pausedAt) / 1000));
    await db.tasks.update(taskId, {
      pausedAt: undefined,
      pauseSecondsUsed: (t.pauseSecondsUsed ?? 0) + elapsedSec,
    });
    sounds.play('tap');
  }
  // 自动恢复（超过 3 分钟）
  useEffect(() => {
    if (!schedule || activeIdx < 0) return;
    const item = schedule.items[activeIdx];
    if (item.kind !== 'task' || !item.taskId) return;
    const t = taskMap.get(item.taskId);
    if (!t?.pausedAt) return;
    if (now - t.pausedAt >= PAUSE_LIMIT_SEC * 1000) {
      resumeTask(t.id);
      toast('暂停时间到，继续闯关 ▶', 'info');
    }
  }, [now, schedule, activeIdx, taskMap]);

  // === 延时 ===
  async function extendTask(taskId: string) {
    const t = await db.tasks.get(taskId);
    if (!t) return;
    const offer = nextExtensionOffer(t.extendCount ?? 0);
    if (!offer.isFree) {
      const total = totalPoints(points ?? []);
      if (total < offer.costPoints) {
        toast(`积分不够（需要 ${offer.costPoints}）`, 'warn');
        sounds.play('error');
        return;
      }
      if (!confirm(`${offer.description}？\n（消耗 ${offer.costPoints} 积分换 ${offer.addMinutes} 分钟）`)) return;
    }
    await db.transaction('rw', db.tasks, db.points, async () => {
      await db.tasks.update(taskId, {
        extendCount: (t.extendCount ?? 0) + 1,
        extendMinutesTotal: (t.extendMinutesTotal ?? 0) + offer.addMinutes,
        extendPointsSpent: (t.extendPointsSpent ?? 0) + offer.costPoints,
      });
      if (offer.costPoints > 0) {
        await db.points.add({
          id: newId('pt'), ts: Date.now(), delta: -offer.costPoints,
          reason: 'extend_buy', refId: taskId,
        });
      }
    });
    sounds.play('unlock');
    toast(`+${offer.addMinutes} 分钟 ${offer.isFree ? '(免费)' : `(-${offer.costPoints} 积分)`}`, 'success');
    // 清除已记录的 3min 警告，以便再次提醒
    warnedRef.current.delete(taskId);
  }

  // === 撤回 ===
  async function undoComplete(taskId: string) {
    const t = await db.tasks.get(taskId);
    if (!t || !canUndoCompletion(t)) return;
    if (!confirm('确定撤回？这一项会变回"闯关中"，可以重新点完成。')) return;
    await db.tasks.update(taskId, {
      status: 'inProgress',
      completedAt: undefined,
      undoCount: (t.undoCount ?? 0) + 1,
    });
    if (schedule?.completedAt) {
      await db.schedules.update(schedule.id, { completedAt: undefined, comboPeakInRound: undefined });
    }
    sounds.play('undo');
    toast('已撤回 ↩', 'info');
  }

  // === 求助 ===
  async function sendHelp(taskTitle: string) {
    if (!confirm('要给爸妈发"我需要帮助"的通知吗？')) return;
    const recipients = await db.recipients.toArray();
    const childName = settings?.childName ?? '肥仔';
    const result = await pushToRecipients(recipients, 'help', messages.help(childName, taskTitle));
    const ok = result.some(r => r.ok);
    sounds.play(ok ? 'unlock' : 'error');
    toast(ok ? '✓ 已通知爸妈' : '没发出去，检查 Bark 配置', ok ? 'success' : 'warn');
  }

  // === 完成 ===
  async function markComplete(taskId: string) {
    const t = await db.tasks.get(taskId);
    if (!t) return;
    // 如果暂停中，先恢复
    if (t.pausedAt) {
      const elapsedSec = Math.min(PAUSE_LIMIT_SEC, Math.floor((Date.now() - t.pausedAt) / 1000));
      await db.tasks.update(taskId, {
        pausedAt: undefined,
        pauseSecondsUsed: (t.pauseSecondsUsed ?? 0) + elapsedSec,
      });
    }
    await db.tasks.update(taskId, { status: 'done', completedAt: Date.now() });
    sounds.play('kill');
    toast('💥 击败！等家长来评分 🎉', 'success');

    // Bark 推送 - 带详细
    const recipients = await db.recipients.toArray();
    const childName = settings?.childName ?? '肥仔';
    const finalT = await db.tasks.get(taskId);
    if (finalT?.actualStartedAt && finalT.completedAt) {
      const summary = summarizeExecution(finalT);
      pushToRecipients(recipients, 'taskDone', messages.taskDone({
        childName,
        taskTitle: finalT.title,
        startedAt: new Date(finalT.actualStartedAt),
        completedAt: new Date(finalT.completedAt),
        estimatedMin: finalT.estimatedMinutes,
        effectiveMin: summary.effectiveMinutes,
        pauseCount: finalT.pauseCount,
        extendCount: finalT.extendCount,
      })).catch(() => {});
    }

    // 检查本轮完成
    if (schedule) {
      const stillTodo = await db.tasks.bulkGet(
        schedule.items.filter(i => i.kind === 'task' && i.taskId).map(i => i.taskId!),
      );
      const allDone = stillTodo.every(x => x && (x.status === 'done' || x.status === 'evaluated'));
      if (allDone) {
        // 算 combo
        const tasksFreshMap = new Map<string, Task>();
        for (const x of stillTodo) if (x) tasksFreshMap.set(x.id, x);
        const combo = calcCombo(schedule, tasksFreshMap);

        // 总时长
        let totalMin = 0;
        let bestFast: { title: string; saved: number } | null = null;
        for (const x of stillTodo) {
          if (!x?.actualStartedAt || !x.completedAt) continue;
          const sum = summarizeExecution(x);
          totalMin += sum.effectiveMinutes;
          if (sum.savedMinutes > (bestFast?.saved ?? 0)) {
            bestFast = { title: x.title, saved: sum.savedMinutes };
          }
        }

        await db.schedules.update(schedule.id, {
          completedAt: Date.now(),
          comboPeakInRound: combo.peak,
          reportShownAt: Date.now(),
        });

        const count = stillTodo.length;
        sounds.play('fanfare');
        pushToRecipients(recipients, 'roundDone',
          messages.roundDone(childName, count, totalMin, combo.peak)).catch(() => {});

        // 展示战报
        setReportData({
          killCount: count,
          totalMinutes: totalMin,
          comboPeak: combo.peak,
          bestFastTitle: bestFast?.title,
        });
        setShowReport(true);

        // 检查今日全部完成 → 连击
        const allToday = await db.tasks.where({ date: today }).toArray();
        const allTodayDone = allToday.length > 0 && allToday.every(x => x.status === 'done' || x.status === 'evaluated');
        if (allTodayDone) {
          const streakState = await db.streak.get('singleton');
          if (streakState) {
            const r = applyDayComplete(streakState, today);
            await db.streak.put(r.state);
            for (const m of r.milestonesHit) {
              await db.points.add({
                id: newId('pt'), ts: Date.now(), delta: m.points,
                reason: 'milestone', refId: m.badgeId,
              });
              if (m.badgeId) await db.badges.put({ id: m.badgeId, unlockedAt: Date.now() });
              sounds.play('unlock');
              pushToRecipients(recipients, 'milestone',
                messages.milestone(childName, m.description, r.state.currentStreak)).catch(() => {});
              toast(`🏆 ${m.description}`, 'success');
            }
            if (r.weeklyGift) {
              await db.points.add({
                id: newId('pt'), ts: Date.now(), delta: r.weeklyGift.points,
                reason: 'weekly_gift',
              });
              toast(`🎁 ${r.weeklyGift.description}`, 'success');
            }
          }
        }
      }
    }
  }

  if (!schedule) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center text-white p-6">
        <PetAvatar mood="sleepy" />
        <div className="mt-4 text-white/60">还没有锁定的时间轴</div>
        <button onClick={() => nav('/schedule')} className="space-btn mt-4">📅 去规划</button>
        <button onClick={() => nav('/')} className="space-btn-ghost mt-2">回首页</button>
      </div>
    );
  }

  const activeItem = activeIdx >= 0 ? schedule.items[activeIdx] : null;
  const activeTask = activeItem?.kind === 'task' && activeItem.taskId
    ? taskMap.get(activeItem.taskId) : null;

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/')} className="space-btn-ghost">← 首页</button>
        <div className="text-xl font-bold flex-1">⚔️ 闯关</div>
        {settings?.helpButtonEnabled !== false && activeTask && (
          <button onClick={() => sendHelp(activeTask.title)}
            className="w-11 h-11 rounded-full bg-rose-500/30 border border-rose-300/50 active:scale-90"
            title="求助">
            <span className="text-xl">🙋</span>
          </button>
        )}
      </div>

      <HardWarning show={!!warning3MinFor} message={warning3MinFor ?? ''} onDismiss={() => setWarning3MinFor(null)} />

      {/* === 当前块 === */}
      <AnimatePresence mode="wait">
        {!activeItem ? (
          <motion.div
            key="all-done"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-card p-6 text-center"
          >
            <div className="text-5xl">🏆</div>
            <div className="mt-2 text-xl font-bold">这一轮全部击败！</div>
            <div className="text-white/60 text-sm mt-1">等家长给你打分吧</div>
            <button onClick={() => nav('/')} className="space-btn mt-4">回首页</button>
          </motion.div>
        ) : activeItem.kind === 'rest' ? (
          <motion.div key={`rest-${activeIdx}`}>
            <RestBlock
              durationMinutes={activeItem.durationMinutes}
              startedAt={restStartedAt}
              leadInSec={settings?.restEndSoundLeadSec ?? 60}
              onComplete={() => setSkippedRests(prev => new Set(prev).add(activeIdx))}
              onSkip={() => setSkippedRests(prev => new Set(prev).add(activeIdx))}
            />
          </motion.div>
        ) : activeTask ? (
          <TaskActiveCard
            key={activeTask.id}
            task={activeTask}
            now={now}
            petSkinId={pet?.skinId}
            onStart={() => startTask(activeTask.id)}
            onComplete={() => markComplete(activeTask.id)}
            onPause={() => pauseTask(activeTask.id)}
            onResume={() => resumeTask(activeTask.id)}
            onExtend={() => extendTask(activeTask.id)}
            extensionOffer={nextExtensionOffer(activeTask.extendCount ?? 0)}
            canExtend={canShowExtensionButton(
              (activeTask.actualStartedAt ?? Date.now()) +
              (activeTask.estimatedMinutes + (activeTask.extendMinutesTotal ?? 0)) * 60000 +
              (activeTask.pauseSecondsUsed ?? 0) * 1000,
              now,
            )}
            elapsedMs={effectiveElapsedMs(activeTask)}
            remainingMs={calcRemainingMs(activeTask)}
          />
        ) : null}
      </AnimatePresence>

      {/* === 得分明细 === */}
      <ScoreDetail schedule={schedule} taskMap={taskMap} onUndo={undoComplete} activeIdx={activeIdx} />

      {/* === 战报 === */}
      <BattleReport
        show={showReport}
        petSkinId={pet?.skinId}
        killCount={reportData?.killCount ?? 0}
        totalMinutes={reportData?.totalMinutes ?? 0}
        comboPeak={reportData?.comboPeak ?? 0}
        bestFastTitle={reportData?.bestFastTitle}
        currentStreakDays={streak?.currentStreak ?? 0}
        onClose={() => setShowReport(false)}
      />
    </div>
  );
}

// ================== 子组件 ==================

function TaskActiveCard({
  task, now, petSkinId, onStart, onComplete, onPause, onResume, onExtend,
  extensionOffer, canExtend, elapsedMs, remainingMs,
}: {
  task: Task; now: number; petSkinId?: string;
  onStart: () => void; onComplete: () => void;
  onPause: () => void; onResume: () => void; onExtend: () => void;
  extensionOffer: ReturnType<typeof nextExtensionOffer>;
  canExtend: boolean;
  elapsedMs: number; remainingMs: number;
}) {
  const totalSec = (task.estimatedMinutes + (task.extendMinutesTotal ?? 0)) * 60;
  const remSec = Math.max(0, Math.floor(remainingMs / 1000));
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const progressPct = totalSec > 0 ? Math.min(100, (elapsedSec / totalSec) * 100) : 0;
  const remMin = Math.floor(remSec / 60);
  const remSecOnly = remSec % 60;
  const overtime = remSec === 0 && task.status === 'inProgress';
  const paused = !!task.pausedAt;
  const pauseRemainSec = paused ? Math.max(0, PAUSE_LIMIT_SEC - Math.floor((now - task.pausedAt!) / 1000)) : 0;

  // 没开始：显示开始按钮
  if (task.status === 'scheduled') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="space-card p-6 text-center"
      >
        <PetAvatar skinId={petSkinId} size={120} mood="normal" />
        <div className="mt-3 text-sm text-white/60">下一只小怪</div>
        <div className="text-2xl font-bold mt-1">{task.title}</div>
        <div className="text-sm text-white/60 mt-1">⏱ 预估 {task.estimatedMinutes} 分钟 · ⭐ {task.basePoints || '由家长评分时定'}</div>
        <button onClick={onStart} className="space-btn w-full mt-6 text-lg animate-pulse-glow">
          ▶ 我要开始
        </button>
        <div className="text-xs text-white/40 mt-2">点了才会开始计时</div>
      </motion.div>
    );
  }

  // 进行中
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="space-card p-6 text-center"
    >
      <PetAvatar skinId={petSkinId} size={120} mood="happy" />
      <div className="mt-3 text-sm text-white/60">当前小怪</div>
      <div className="text-2xl font-bold mt-1">{task.title}</div>

      {/* 倒计时显示 */}
      <div className={`text-5xl font-black my-4 tabular-nums ${overtime ? 'text-rose-400 animate-pulse' : paused ? 'text-amber-300' : 'text-white'}`}>
        {paused
          ? `⏸ ${Math.floor(pauseRemainSec / 60)}:${String(pauseRemainSec % 60).padStart(2, '0')}`
          : overtime
          ? '⏰ 超时'
          : `${String(remMin).padStart(2, '0')}:${String(remSecOnly).padStart(2, '0')}`}
      </div>
      <div className="text-xs text-white/50">
        {paused ? '暂停中（最多 3 分钟自动恢复）' :
         overtime ? '时间到了，可以延时或者赶紧收尾' :
         `已用 ${Math.floor(elapsedSec / 60)} 分 · 总额度 ${task.estimatedMinutes + (task.extendMinutesTotal ?? 0)} 分`}
      </div>

      {/* 进度条（血条） */}
      <div className="h-3 rounded-full bg-white/10 overflow-hidden my-4 relative">
        <motion.div
          className={`h-full ${overtime ? 'bg-gradient-to-r from-rose-600 to-rose-400' :
            paused ? 'bg-gradient-to-r from-amber-500 to-amber-300' :
            'bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400'}`}
          animate={{ width: `${100 - progressPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <button onClick={onComplete} disabled={paused}
        className="space-btn w-full text-lg animate-pulse-glow disabled:opacity-50">
        💥 击败！我完成了
      </button>

      <div className="flex gap-2 mt-3">
        {paused ? (
          <button onClick={onResume} className="space-btn-ghost flex-1">▶ 继续</button>
        ) : (
          <button onClick={onPause} disabled={(task.pauseCount ?? 0) >= 1}
            className="space-btn-ghost flex-1 disabled:opacity-50">
            ⏸ 暂停 ({(task.pauseCount ?? 0) >= 1 ? '已用过' : '剩 1 次'})
          </button>
        )}
        <button onClick={onExtend} disabled={!canExtend || paused}
          className={`flex-1 px-4 py-2 rounded-xl ${canExtend && !paused
            ? overtime ? 'bg-rose-500/40 border border-rose-300/60 animate-pulse'
              : 'bg-amber-500/30 border border-amber-300/50'
            : 'bg-white/5 opacity-40 cursor-not-allowed'}`}>
          ⏰ 延时 {canExtend ? `+${extensionOffer.addMinutes}` : ''}
          {canExtend && extensionOffer.isFree && ' (免费)'}
          {canExtend && !extensionOffer.isFree && ` (-${extensionOffer.costPoints} 积分)`}
        </button>
      </div>
    </motion.div>
  );
}

function ScoreDetail({
  schedule, taskMap, onUndo, activeIdx,
}: { schedule: Schedule; taskMap: Map<string, Task>; onUndo: (id: string) => void; activeIdx: number }) {
  // 算一下本轮累计积分
  const taskIds = schedule.items.filter(i => i.kind === 'task' && i.taskId).map(i => i.taskId!);
  const evs = useLiveQuery(() =>
    db.evaluations.where('taskId').anyOf(taskIds).toArray(),
    [taskIds.join(',')],
  );
  const earlyEntries = useLiveQuery(() =>
    db.points.where('reason').equals('early_bonus').filter(p => p.refId !== undefined && taskIds.includes(p.refId)).toArray(),
    [taskIds.join(',')],
  );
  const coreSum = (evs ?? []).reduce((s, e) => s + e.finalPoints, 0);
  const earlySum = (earlyEntries ?? []).reduce((s, p) => s + p.delta, 0);
  const totalEarned = coreSum + earlySum + (schedule.comboBonusPoints ?? 0);
  const evaluatedCount = evs?.length ?? 0;
  const totalCount = taskIds.length;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-white/60">📋 今日得分明细</div>
        <div className="text-xs text-amber-300">
          已得 <b className="text-lg">{totalEarned}</b> 分（{evaluatedCount}/{totalCount} 评分）
        </div>
      </div>
      {schedule.items.map((it: ScheduleItem, idx: number) => {
        if (it.kind === 'rest') {
          return (
            <div key={`rest-${idx}`} className="flex items-center gap-2 my-2 text-cyan-300/70 text-sm px-3">
              <span>☕ 休息 {it.durationMinutes} 分钟</span>
              <span className="text-white/40 text-xs">{minutesToHHMM(it.startMinute)}</span>
            </div>
          );
        }
        const t = it.taskId ? taskMap.get(it.taskId) : null;
        if (!t) return null;
        const isActive = idx === activeIdx;
        const statusEmoji =
          t.status === 'evaluated' ? '✅' :
          t.status === 'done' ? '❓' :
          t.status === 'inProgress' ? '⏳' :
          t.status === 'pending' ? '⏸' : '⏸';
        const statusText =
          t.status === 'evaluated' ? '已评分' :
          t.status === 'done' ? '待评分' :
          t.status === 'inProgress' ? '闯关中' :
          '待开始';

        return (
          <div key={t.id} className={`space-card p-3 my-2 ${isActive ? 'ring-2 ring-space-plasma' : ''} ${t.isRequired ? 'border-l-4 border-l-rose-500' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="text-lg">{statusEmoji}</div>
              <SubjectIcon subject={t.subject} />
              <div className="flex-1">
                <div className={`flex items-center gap-1.5 flex-wrap ${t.status === 'evaluated' || t.status === 'done' ? 'line-through opacity-70' : ''}`}>
                  {t.title}
                  {t.isRequired && <span className="text-[10px] px-1 py-0.5 rounded bg-rose-500/40 text-rose-100">🔴 必做</span>}
                  {t.createdBy === 'child' && <span className="text-[10px] px-1 py-0.5 rounded bg-cyan-500/30">我加的</span>}
                </div>
                <div className="text-xs text-white/50">{statusText}</div>
              </div>
              {t.status === 'evaluated' && <EvaluatedPointsBadge taskId={t.id} />}
              {t.status === 'done' && (
                <button onClick={() => onUndo(t.id)}
                  className="text-amber-300 text-xs bg-amber-500/20 px-2 py-1 rounded-lg active:scale-90">
                  ↩ 撤回
                </button>
              )}
            </div>
            {t.status === 'evaluated' && <EvaluatedDetails taskId={t.id} />}
          </div>
        );
      })}
      {(schedule.comboBonusPoints ?? 0) > 0 && (
        <div className="space-card p-3 my-2 bg-gradient-to-r from-amber-500/20 to-rose-500/20">
          <div className="flex items-center gap-2">
            <div className="text-2xl">⚡</div>
            <div className="flex-1 text-sm">{schedule.comboPeakInRound ?? 0} 连击加成</div>
            <div className="font-bold text-amber-300">+{schedule.comboBonusPoints} 分</div>
          </div>
        </div>
      )}
    </div>
  );
}

function EvaluatedPointsBadge({ taskId }: { taskId: string }) {
  const ev = useLiveQuery(() => db.evaluations.where({ taskId }).first(), [taskId]);
  const earlyEntry = useLiveQuery(() =>
    db.points.where('reason').equals('early_bonus').filter(p => p.refId === taskId).first(),
    [taskId],
  );
  if (!ev) return null;
  const early = earlyEntry?.delta ?? 0;
  const total = ev.finalPoints + early;
  return (
    <div className="text-right">
      <div className="text-amber-300 font-bold">+{total}</div>
      <div className="text-[10px] text-white/40">积分</div>
    </div>
  );
}

function EvaluatedDetails({ taskId }: { taskId: string }) {
  const ev = useLiveQuery(() => db.evaluations.where({ taskId }).first(), [taskId]);
  const earlyBonus = useLiveQuery(() =>
    db.points.where('reason').equals('early_bonus').filter(p => p.refId === taskId).toArray(),
    [taskId],
  );
  if (!ev) return null;
  const earlySum = (earlyBonus ?? []).reduce((s, p) => s + p.delta, 0);
  return (
    <div className="mt-2 ml-12 pl-3 border-l-2 border-white/10 text-xs space-y-0.5">
      <div className="flex gap-3 text-white/70">
        <span>完成度 {'⭐'.repeat(ev.completion)}</span>
        <span>质量 {'⭐'.repeat(ev.quality)}</span>
        <span>态度 {'⭐'.repeat(ev.attitude)}</span>
      </div>
      <div className="text-emerald-300">
        基础 {ev.basePointsAtEval} → 实得 <b>{ev.finalPoints}</b> 分
        {earlySum > 0 && <span className="ml-2 text-amber-300">+{earlySum} 提前奖</span>}
      </div>
      {ev.note && <div className="text-white/60 mt-1">💬 {ev.note}</div>}
    </div>
  );
}
