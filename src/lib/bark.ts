// ============================================================
// Bark 推送
// 支持多接收人，每人有自己的订阅偏好。
// Bark 协议：GET https://api.day.app/{KEY}/{TITLE}/{BODY}?sound=...&group=...
// 每条通知会向所有 enabled 且匹配该种类的接收人发送。
// 网络错误自动忽略（推送是 best-effort，不能阻塞 App）
// ============================================================

import type { BarkRecipient } from '../types';

export type NotificationKind =
  | 'taskDone'
  | 'roundDone'
  | 'milestone'
  | 'pendingReview'
  | 'weeklyReport'
  | 'help';

const KIND_SUB_MAP: Record<NotificationKind, keyof BarkRecipient> = {
  taskDone: 'subTaskDone',
  roundDone: 'subRoundDone',
  milestone: 'subMilestone',
  pendingReview: 'subPendingReview',
  weeklyReport: 'subWeeklyReport',
  help: 'subHelp',
};

export interface PushPayload {
  title: string;
  body: string;
  group?: string;
  sound?: string;
  url?: string;       // 点击通知跳转链接
}

export function shouldNotify(recipient: BarkRecipient, kind: NotificationKind): boolean {
  if (!recipient.enabled) return false;
  const subKey = KIND_SUB_MAP[kind];
  const val = recipient[subKey];
  // help 字段是 v3 新增，老数据默认开
  if (kind === 'help' && val === undefined) return true;
  return Boolean(val);
}

/**
 * 构造 Bark URL（导出仅供测试）
 */
export function buildBarkUrl(recipient: BarkRecipient, payload: PushPayload): string {
  const base = (recipient.serverUrl || 'https://api.day.app').replace(/\/$/, '');
  const title = encodeURIComponent(payload.title);
  const body = encodeURIComponent(payload.body);
  const url = `${base}/${recipient.key}/${title}/${body}`;
  const params = new URLSearchParams();
  if (payload.group) params.set('group', payload.group);
  if (payload.sound) params.set('sound', payload.sound);
  if (payload.url) params.set('url', payload.url);
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export interface PushResult {
  recipientId: string;
  ok: boolean;
  error?: string;
}

/**
 * 给所有匹配的接收人发送通知（注入 fetch 实现，方便测试）
 */
export async function pushToRecipients(
  recipients: BarkRecipient[],
  kind: NotificationKind,
  payload: PushPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<PushResult[]> {
  const targets = recipients.filter(r => shouldNotify(r, kind));
  if (targets.length === 0) return [];

  const results = await Promise.all(targets.map(async (r) => {
    const url = buildBarkUrl(r, payload);
    try {
      const resp = await fetchImpl(url, { method: 'GET' });
      if (!resp.ok) {
        return { recipientId: r.id, ok: false, error: `HTTP ${resp.status}` };
      }
      return { recipientId: r.id, ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { recipientId: r.id, ok: false, error: msg };
    }
  }));

  return results;
}

/**
 * 发送测试通知（用于设置页"测试"按钮）
 */
export async function sendTestPush(
  recipient: BarkRecipient,
  fetchImpl: typeof fetch = fetch,
): Promise<PushResult> {
  const url = buildBarkUrl(recipient, {
    title: '🚀 肥仔大闯关',
    body: `这是发给「${recipient.label}」的测试通知，收到说明配置正确！`,
    group: 'fatboy-quest-test',
  });
  try {
    const resp = await fetchImpl(url, { method: 'GET' });
    return { recipientId: recipient.id, ok: resp.ok, error: resp.ok ? undefined : `HTTP ${resp.status}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { recipientId: recipient.id, ok: false, error: msg };
  }
}

/**
 * 预设的通知文案生成器
 */
export interface TaskDoneDetail {
  childName: string;
  taskTitle: string;
  startedAt: Date;          // 实际开始时间
  completedAt: Date;
  estimatedMin: number;
  effectiveMin: number;     // 扣除暂停
  pauseCount?: number;
  extendCount?: number;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const messages = {
  taskDone(d: TaskDoneDetail): PushPayload {
    const diff = d.estimatedMin - d.effectiveMin;
    const speedMark = diff > 0 ? `比预估快 ${diff} 分钟` : diff < 0 ? `比预估慢 ${-diff} 分钟` : '准时完成';
    const extras: string[] = [];
    if (d.pauseCount) extras.push(`暂停 ${d.pauseCount} 次`);
    if (d.extendCount) extras.push(`延时 ${d.extendCount} 次`);
    const extraLine = extras.length ? ` · ${extras.join(' · ')}` : '';
    return {
      title: `✓ ${d.childName} 完成了【${d.taskTitle}】`,
      body: `${hhmm(d.startedAt)} - ${hhmm(d.completedAt)}（用时 ${d.effectiveMin} 分，${speedMark}）${extraLine}`,
      group: 'fatboy-quest',
    };
  },
  roundDone(childName: string, count: number, totalMinutes: number, combo: number): PushPayload {
    const comboTag = combo >= 5 ? ' 🌟 完美通关' : combo >= 3 ? ` ⚡ ${combo} 连击` : '';
    return {
      title: `🎉 ${childName} 完成今日 ${count} 项作业！${comboTag}`,
      body: `本轮总用时 ${totalMinutes} 分钟，点击打开 App 进入评分`,
      group: 'fatboy-quest',
    };
  },
  milestone(childName: string, description: string, streak: number): PushPayload {
    return {
      title: `🏆 ${childName} 达成连击 ${streak} 天！`,
      body: description,
      group: 'fatboy-quest',
    };
  },
  pendingReview(childName: string, count: number): PushPayload {
    return {
      title: `⏰ 还有 ${count} 项作业等你评分`,
      body: `${childName} 等了一天啦，给个反馈吧`,
      group: 'fatboy-quest',
    };
  },
  weeklyReport(childName: string, tasks: number, points: number): PushPayload {
    return {
      title: `📊 ${childName} 本周战报`,
      body: `完成 ${tasks} 项作业，获得 ${points} 积分`,
      group: 'fatboy-quest',
    };
  },
  help(childName: string, taskTitle: string): PushPayload {
    return {
      title: `🙋 ${childName} 需要帮助`,
      body: `当前任务：${taskTitle}`,
      group: 'fatboy-quest',
      sound: 'alarm',
    };
  },
};
