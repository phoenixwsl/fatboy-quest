// ============================================================
// R2.4.3: 未评分提醒 watcher
// 后台每 60s 跑一次：扫描 status='done' 且 completedAt + threshold 已过 的任务
// → 推送家长 + 写防重戳
// 启用条件：settings.unevaluatedNotifyMinutes > 0 且 ≥ 1（默认 45）
// ============================================================
import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { planUnevaluatedReminders } from '../lib/unevaluatedReminder';
import { pushToRecipients } from '../lib/bark';

const POLL_INTERVAL_MS = 60_000;

export function EvalReminderWatcher() {
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const threshold = settings?.unevaluatedNotifyMinutes ?? 45;

  useEffect(() => {
    if (threshold <= 0) return;
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      try {
        const doneTasks = await db.tasks.where({ status: 'done' }).toArray();
        const plan = planUnevaluatedReminders(doneTasks, threshold);
        if (plan.taskIdsToNotify.length === 0) return;
        const recipients = await db.recipients.toArray();
        const childName = settings?.childName ?? '肥仔';
        for (const tid of plan.taskIdsToNotify) {
          const t = await db.tasks.get(tid);
          if (!t) continue;
          await db.tasks.update(tid, { unevaluatedNotifySentAt: Date.now() });
          const waitedMin = Math.floor(((Date.now()) - (t.completedAt ?? Date.now())) / 60_000);
          pushToRecipients(
            recipients.filter(r => r.subPendingReview !== false),
            'help' as any,
            {
              title: `⭐ ${childName} 完成的【${t.title}】等你评分了`,
              body: `已经完成 ${waitedMin} 分钟。点开 App → 待评分。`,
              group: 'fatboy-quest',
            },
          ).catch(() => {});
        }
      } catch {}
    }

    // 启动立即跑一次，然后定时
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [threshold, settings?.childName]);

  return null;
}
