import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import { todayString, dateAtMinute, minutesToHHMM, currentMinuteOfDay } from '../lib/time';
import { PetAvatar } from '../components/PetAvatar';
import { SubjectIcon } from './HomePage';
import { useAppStore } from '../store/useAppStore';
import { LocalReminderScheduler, buildReminders, ensurePermission } from '../lib/notifications';
import { pushToRecipients, messages } from '../lib/bark';
import { applyDayComplete } from '../lib/streak';
import type { Task } from '../types';
import { newId } from '../lib/ids';

export function QuestPage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const today = todayString();
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const pet = useLiveQuery(() => db.pet.get('singleton'));
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

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const schedRef = useRef<LocalReminderScheduler>();
  useEffect(() => {
    ensurePermission();
    if (!schedule || !tasksOnTimeline) return;
    schedRef.current?.cancelAll();
    const s = new LocalReminderScheduler();
    s.scheduleAll(buildReminders(schedule, taskMap));
    schedRef.current = s;
    return () => s.cancelAll();
  }, [schedule?.id, tasksOnTimeline?.length, taskMap]);

  // 找到"当前应该正在做"的任务
  const currentMin = currentMinuteOfDay(new Date(now));
  const currentItem = useMemo(() => {
    if (!schedule) return null;
    for (const item of schedule.items) {
      if (item.kind !== 'task') continue;
      const end = item.startMinute + item.durationMinutes;
      const t = item.taskId ? taskMap.get(item.taskId) : null;
      if (t && t.status !== 'evaluated' && t.status !== 'done' && currentMin < end) {
        return { item, task: t };
      }
    }
    // 否则返回第一个未完成的
    for (const item of schedule.items) {
      if (item.kind !== 'task' || !item.taskId) continue;
      const t = taskMap.get(item.taskId);
      if (t && t.status !== 'evaluated' && t.status !== 'done') return { item, task: t };
    }
    return null;
  }, [schedule, taskMap, currentMin]);

  async function markComplete(taskId: string) {
    const t = await db.tasks.get(taskId);
    if (!t) return;
    await db.tasks.update(taskId, { status: 'done', completedAt: Date.now() });
    toast('💥 击败！等家长来评分 🎉', 'success');

    // 推送给家长
    const recipients = await db.recipients.toArray();
    const childName = settings?.childName ?? '肥仔';
    const item = schedule?.items.find(i => i.taskId === taskId);
    const dur = item?.durationMinutes ?? t.estimatedMinutes;
    pushToRecipients(recipients, 'taskDone', messages.taskDone(childName, t.title, dur)).catch(() => {});

    // 检查是否一轮全部完成
    if (schedule) {
      const stillTodo = await db.tasks.bulkGet(
        schedule.items.filter(i => i.kind === 'task' && i.taskId).map(i => i.taskId!)
      );
      const allDone = stillTodo.every(x => x && (x.status === 'done' || x.status === 'evaluated'));
      if (allDone) {
        await db.schedules.update(schedule.id, { completedAt: Date.now() });

        // 推送"一轮完成"
        const count = stillTodo.length;
        pushToRecipients(recipients, 'roundDone', messages.roundDone(childName, count)).catch(() => {});

        // 检查今天是否全部完成（含其他轮）
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

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/')} className="space-btn-ghost">← 首页</button>
        <div className="text-xl font-bold">⚔️ 闯关模式</div>
      </div>

      <AnimatePresence mode="wait">
        {currentItem ? (
          <motion.div
            key={currentItem.task.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-card p-6 text-center"
          >
            <PetAvatar skinId={pet?.skinId} size={120} mood="happy" />
            <div className="mt-4 text-sm text-white/60">当前小怪</div>
            <div className="text-2xl font-bold mt-1">{currentItem.task.title}</div>
            <div className="flex items-center justify-center gap-3 mt-2 text-sm text-white/70">
              <span>⏱ {minutesToHHMM(currentItem.item.startMinute)}-{minutesToHHMM(currentItem.item.startMinute + currentItem.item.durationMinutes)}</span>
              <span>⭐ {currentItem.task.basePoints} 积分</span>
            </div>

            {/* 血条（虚拟） */}
            <div className="mt-4 h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-400 to-amber-400"
                animate={{ width: `${remainingPct(currentItem.item, currentMin)}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>

            <button
              onClick={() => markComplete(currentItem.task.id)}
              className="space-btn mt-6 w-full text-lg animate-pulse-glow"
            >
              💥 击败！我完成了
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-card p-6 text-center"
          >
            <div className="text-5xl">🏆</div>
            <div className="mt-2 text-xl font-bold">这一轮全部击败！</div>
            <div className="text-white/60 text-sm mt-1">等家长给你打分吧</div>
            <button onClick={() => nav('/')} className="space-btn mt-4">回首页</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 完整时间轴 */}
      <div className="mt-6">
        <div className="text-sm text-white/60 mb-2">📋 今日全部</div>
        {schedule.items.map((it, idx) => {
          if (it.kind === 'rest') {
            return (
              <div key={idx} className="flex items-center gap-2 my-1 text-cyan-300/80 text-sm">
                <span>☕ 休息 {it.durationMinutes} 分钟</span>
                <span className="text-white/40">{minutesToHHMM(it.startMinute)}</span>
              </div>
            );
          }
          const t = taskMap.get(it.taskId!);
          if (!t) return null;
          const done = t.status === 'done' || t.status === 'evaluated';
          return (
            <div key={idx} className={`space-card p-3 my-2 flex items-center gap-3 ${done ? 'opacity-50' : ''}`}>
              <SubjectIcon subject={t.subject} />
              <div className="flex-1">
                <div className={done ? 'line-through' : ''}>{t.title}</div>
                <div className="text-xs text-white/50">{minutesToHHMM(it.startMinute)} - {minutesToHHMM(it.startMinute + it.durationMinutes)}</div>
              </div>
              {done && <div className="text-emerald-300">✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function remainingPct(item: { startMinute: number; durationMinutes: number }, currentMin: number): number {
  const start = item.startMinute; const end = start + item.durationMinutes;
  if (currentMin <= start) return 100;
  if (currentMin >= end) return 0;
  return Math.max(0, Math.min(100, ((end - currentMin) / (end - start)) * 100));
}
