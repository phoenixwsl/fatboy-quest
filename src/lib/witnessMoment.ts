// ============================================================
// R4.4.0: 见证奖励 — CRUD + 月度分组 + 导出
//
// 哲学（kid-rewards skill anti-pattern A2 + B7）：
// 不给本来内在驱动的行为发积分（看书/善良/创造），但要"被看见"。
// 见证奖励 = 家长亲见某个时刻 → 写文字 + 选 emoji → 入孩子贴纸墙。
// 不入积分系统、不可兑换、不可消费——只是"我妈妈/我爸爸记住了这个时刻"。
//
// SDT relatedness 维度的核心实现。
// ============================================================

import type { FatboyDB } from './../db';
import type { WitnessMoment, BarkRecipient } from '../types';
import { newId } from './ids';

// ------------------------------------------------------------
// 推荐 emoji（家长 UI 选项）
// ------------------------------------------------------------
export const WITNESS_EMOJIS = ['🌟', '✨', '🎯', '💛', '🌈', '🦄', '🍀', '💪'] as const;

// ------------------------------------------------------------
// 创建一条贴纸
// ------------------------------------------------------------
export async function createWitnessMoment(
  db: FatboyDB,
  input: { text: string; emoji: string; from: BarkRecipient },
  now: number = Date.now(),
): Promise<WitnessMoment> {
  const moment: WitnessMoment = {
    id: newId('wit'),
    ts: now,
    text: input.text.trim(),
    emoji: input.emoji,
    fromRecipientId: input.from.id,
    fromLabel: input.from.label,
  };
  await db.witnessMoments.add(moment);
  return moment;
}

// ------------------------------------------------------------
// 列表 + 月度分组（孩子端 StickerWall 用）
// ------------------------------------------------------------
export interface MonthGroup {
  monthKey: string;        // "YYYY-MM"
  monthLabel: string;      // "2026 年 5 月"
  moments: WitnessMoment[];
}

export function groupByMonth(moments: WitnessMoment[]): MonthGroup[] {
  const map = new Map<string, WitnessMoment[]>();
  // 按 ts 倒序（新的在前）
  const sorted = [...moments].sort((a, b) => b.ts - a.ts);
  for (const m of sorted) {
    const d = new Date(m.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries()).map(([monthKey, moments]) => {
    const [y, m] = monthKey.split('-');
    return {
      monthKey,
      monthLabel: `${y} 年 ${parseInt(m, 10)} 月`,
      moments,
    };
  });
}

// ------------------------------------------------------------
// 导出当月汇总文本（家长可复制 / 打印 / 截图）
// ------------------------------------------------------------
export function exportMonthAsText(group: MonthGroup, childName: string = '肥仔'): string {
  const lines: string[] = [];
  lines.push(`# ${childName}的温柔时刻 · ${group.monthLabel}`);
  lines.push('');
  for (const m of group.moments) {
    const d = new Date(m.ts);
    const date = `${d.getMonth() + 1}/${d.getDate()}`;
    lines.push(`${m.emoji} ${date} · ${m.fromLabel}见证`);
    lines.push(`  ${m.text}`);
    lines.push('');
  }
  lines.push(`—— 共 ${group.moments.length} 个时刻 ——`);
  return lines.join('\n');
}

// ------------------------------------------------------------
// 删除（家长端，纠错用；不暴露给孩子）
// ------------------------------------------------------------
export async function deleteWitnessMoment(db: FatboyDB, id: string): Promise<void> {
  await db.witnessMoments.delete(id);
}

// ------------------------------------------------------------
// 推送另一位家长（"妈妈刚记录了一条见证"）
// 返回的是给 pushToRecipients 的 payload，调用方负责 push
// ------------------------------------------------------------
export interface NotifyOtherParentPayload {
  recipients: BarkRecipient[];   // 已过滤好的"另一位"
  title: string;
  body: string;
}

export function buildOtherParentNotification(
  moment: WitnessMoment,
  allRecipients: BarkRecipient[],
  childName: string = '肥仔',
): NotifyOtherParentPayload | null {
  const others = allRecipients.filter(r =>
    r.enabled && r.id !== moment.fromRecipientId,
  );
  if (others.length === 0) return null;
  return {
    recipients: others,
    title: `${moment.emoji} ${moment.fromLabel}见证了 ${childName}`,
    body: moment.text,
  };
}
