// 仪式监视器：挂到 App 根，每 30 秒检查一次是否该弹晚安总结 / 周日仪式 / 断击预警
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  shouldShowEveningSummary, shouldShowSundayRitual, shouldShowStreakAlert, ritualLogId,
} from '../lib/ritualTriggers';
import { todayString, addDays } from '../lib/time';
import { totalPoints } from '../lib/points';
import { analyzeWeek } from '../lib/analyze';
import { pushToRecipients } from '../lib/bark';
import { sounds } from '../lib/sounds';
import { PetAvatar } from './PetAvatar';

type Active = null | { kind: 'evening' | 'sunday' | 'streak'; payload: any };

export function RitualMonitor() {
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const evals = useLiveQuery(() => db.evaluations.toArray());
  const points = useLiveQuery(() => db.points.toArray());
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const pet = useLiveQuery(() => db.pet.get('singleton'));
  const logs = useLiveQuery(() => db.ritualLogs.toArray());
  const [active, setActive] = useState<Active>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!settings || !logs) return;
    const now = new Date();
    const today = todayString(now);
    const todayTasks = (tasks ?? []).filter(t => t.date === today);
    const completedToday = todayTasks.filter(t => t.status === 'done' || t.status === 'evaluated').length;
    if (shouldShowSundayRitual(now, settings, logs)) {
      const text = analyzeWeek({
        tasks: tasks ?? [], evaluations: evals ?? [], points: points ?? [],
        childName: settings.childName, streakDays: streak?.currentStreak ?? 0,
      });
      setActive({ kind: 'sunday', payload: { text } });
      logRitual('sunday-ritual', today);
      pushHome('sunday', settings.childName, text);
    } else if (shouldShowEveningSummary(now, settings, logs)) {
      const todayCompleted = completedToday;
      const todayPts = (points ?? []).filter(p => {
        const dt = new Date(p.ts);
        return p.delta > 0 && todayString(dt) === today;
      }).reduce((s, p) => s + p.delta, 0);
      setActive({ kind: 'evening', payload: {
        completed: todayCompleted, total: todayTasks.length,
        points: todayPts, streak: streak?.currentStreak ?? 0,
      }});
      logRitual('evening-summary', today);
      pushHome('evening', settings.childName,
        `完成 ${todayCompleted}/${todayTasks.length} 项，今日获得 ${todayPts} 积分`);
    } else if (shouldShowStreakAlert(now, settings, logs, streak?.currentStreak ?? 0, completedToday)) {
      setActive({ kind: 'streak', payload: { streak: streak?.currentStreak ?? 0 } });
      logRitual('streak-alert', today);
      pushHome('streak', settings.childName,
        `连击 ${streak?.currentStreak} 天还没保住，请提醒孩子`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, settings?.id, logs?.length, tasks?.length, streak?.currentStreak]);

  async function logRitual(kind: any, date: string) {
    await db.ritualLogs.put({ id: ritualLogId(kind, date), kind, date, shownAt: Date.now() });
  }

  async function pushHome(kind: string, childName: string, body: string) {
    const recipients = await db.recipients.toArray();
    const titlePrefix = kind === 'streak' ? '⚠️ 断击预警' :
                       kind === 'sunday' ? '📊 本周战报' : '🌙 今日总结';
    pushToRecipients(recipients, (kind === 'streak' ? 'help' : 'weeklyReport') as any, {
      title: `${titlePrefix} - ${childName}`, body, group: 'fatboy-quest',
    }).catch(() => {});
  }

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="space-card p-6 max-w-md w-full text-center max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {active.kind === 'evening' && (
              <>
                <div className="text-5xl mb-2">🌙</div>
                <div className="text-xl font-bold mb-3">今日总结</div>
                <PetAvatar skinId={pet?.skinId} size={80} mood="sleepy" bobbing={false} />
                <div className="my-4 space-y-2 text-left">
                  <Row label="✅ 完成" value={`${active.payload.completed}/${active.payload.total} 项`} />
                  <Row label="⭐ 获得" value={`${active.payload.points} 积分`} />
                  <Row label="🔥 连击" value={`${active.payload.streak} 天`} />
                </div>
                <div className="text-sm text-white/60 mb-4">早点休息，明天继续闯关 💤</div>
                <button onClick={() => { sounds.play('unlock'); setActive(null); }} className="space-btn w-full">睡觉啦 💤</button>
              </>
            )}
            {active.kind === 'sunday' && (
              <>
                <div className="text-5xl mb-2">📊</div>
                <div className="text-xl font-bold mb-3">本周战报</div>
                <pre className="text-sm whitespace-pre-wrap font-kid text-white/90 leading-relaxed text-left bg-white/5 p-3 rounded-xl">
                  {active.payload.text}
                </pre>
                <button onClick={() => { sounds.play('fanfare'); setActive(null); }} className="space-btn w-full mt-4">下周加油 🚀</button>
              </>
            )}
            {active.kind === 'streak' && (
              <>
                <div className="text-5xl mb-2">⚠️</div>
                <div className="text-xl font-bold mb-1 text-rose-300">连击告急！</div>
                <div className="text-sm text-white/70 mb-4">
                  当前连击 <b className="text-rose-300">{active.payload.streak} 天</b>，今天还没完成任何作业。<br/>
                  抓紧时间，别让 ta 断了 🔥
                </div>
                <button onClick={() => { sounds.play('error'); setActive(null); }} className="space-btn w-full">知道啦</button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-white/80">
      <span>{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
}
