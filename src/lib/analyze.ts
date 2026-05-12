// ============================================================
// 一键分析：生成本周综合点评（详细版，5-8 行带 emoji，全部本地规则）
// ============================================================

import type { Evaluation, PointsEntry, Task } from '../types';
import { addDays, todayString } from './time';

export interface AnalysisInput {
  tasks: Task[];
  evaluations: Evaluation[];
  points: PointsEntry[];
  childName: string;
  streakDays: number;
}

export function analyzeWeek(input: AnalysisInput, today = todayString()): string {
  const thisWeekStart = addDays(today, -6);
  const lastWeekStart = addDays(today, -13);
  const lastWeekEnd = addDays(today, -7);

  const tasksThis = input.tasks.filter(t => t.date >= thisWeekStart && t.date <= today);
  const tasksLast = input.tasks.filter(t => t.date >= lastWeekStart && t.date <= lastWeekEnd);
  const completedThis = tasksThis.filter(t => t.status === 'done' || t.status === 'evaluated');
  const completedLast = tasksLast.filter(t => t.status === 'done' || t.status === 'evaluated');

  const ptsThis = input.points.filter(p => p.ts >= new Date(thisWeekStart).getTime() && p.delta > 0)
    .reduce((s, p) => s + p.delta, 0);
  const ptsLast = input.points.filter(p =>
    p.ts >= new Date(lastWeekStart).getTime() &&
    p.ts < new Date(thisWeekStart).getTime() &&
    p.delta > 0,
  ).reduce((s, p) => s + p.delta, 0);

  const lines: string[] = [];
  lines.push(`📊 本周分析（${thisWeekStart.slice(5)} - ${today.slice(5)}）`);
  lines.push('');

  // 完成数对比
  const completionDelta = completedThis.length - completedLast.length;
  const completionTrend = completionDelta > 0 ? `⬆️ 多 ${completionDelta}` :
                          completionDelta < 0 ? `⬇️ 少 ${-completionDelta}` : '持平';
  lines.push(`🎯 完成 ${completedThis.length} 项（vs 上周 ${completedLast.length}，${completionTrend}）`);

  // 积分对比
  const ptsDelta = ptsThis - ptsLast;
  const ptsPct = ptsLast > 0 ? Math.round((ptsDelta / ptsLast) * 100) : 0;
  const ptsTrend = ptsDelta > 0 ? `+${ptsPct}%` : ptsDelta < 0 ? `${ptsPct}%` : '持平';
  lines.push(`⭐ ${ptsThis} 积分（${ptsTrend}）`);

  // 连击
  lines.push(`🔥 连击 ${input.streakDays} 天`);

  // 评分维度均值
  const evsThis = input.evaluations.filter(e =>
    completedThis.some(t => t.id === e.taskId),
  );
  if (evsThis.length > 0) {
    const avgC = evsThis.reduce((s, e) => s + e.completion, 0) / evsThis.length;
    const avgQ = evsThis.reduce((s, e) => s + e.quality, 0) / evsThis.length;
    const avgA = evsThis.reduce((s, e) => s + e.attitude, 0) / evsThis.length;
    lines.push('');
    lines.push('🌟 评分维度均值');
    lines.push(`  完成度 ${avgC.toFixed(1)} · 质量 ${avgQ.toFixed(1)} · 态度 ${avgA.toFixed(1)}`);

    // 找最弱维度
    const dims = [
      { name: '完成度', v: avgC }, { name: '质量', v: avgQ }, { name: '态度', v: avgA },
    ].sort((a, b) => a.v - b.v);
    if (dims[0].v < 4) {
      lines.push(`⚠️ ${dims[0].name}偏低（${dims[0].v.toFixed(1)} 星），可以聊聊`);
    }

    // 找最强科目
    const bySubject = new Map<string, { c: number; q: number; a: number; n: number }>();
    for (const e of evsThis) {
      const t = completedThis.find(t => t.id === e.taskId);
      if (!t) continue;
      const cur = bySubject.get(t.subject) ?? { c: 0, q: 0, a: 0, n: 0 };
      cur.c += e.completion; cur.q += e.quality; cur.a += e.attitude; cur.n += 1;
      bySubject.set(t.subject, cur);
    }
    if (bySubject.size > 0) {
      const subjects = Array.from(bySubject.entries())
        .map(([k, v]) => ({ s: k, avg: (v.c + v.q + v.a) / (3 * v.n) }))
        .sort((a, b) => b.avg - a.avg);
      const labels: Record<string, string> = {
        math: '数学', chinese: '语文', english: '英语', reading: '阅读', writing: '练字', other: '其他',
      };
      lines.push(`✨ 最强：${labels[subjects[0].s] ?? subjects[0].s}（综合 ${subjects[0].avg.toFixed(1)} 星）`);
      if (subjects.length > 1) {
        const last = subjects[subjects.length - 1];
        if (last.avg < subjects[0].avg - 0.5) {
          lines.push(`📚 较弱：${labels[last.s] ?? last.s}（${last.avg.toFixed(1)} 星）`);
        }
      }
    }
  } else {
    lines.push('💤 本周还没有评分数据');
  }

  // 蛋仔点评
  lines.push('');
  if (completedThis.length === 0) {
    lines.push(`💬 蛋仔："${input.childName} 这周还没开始，明天加油 💪"`);
  } else if (completionDelta > 2) {
    lines.push(`💬 蛋仔："${input.childName} 这周状态超棒！继续保持 ✨"`);
  } else if (completionDelta < -2) {
    lines.push(`💬 蛋仔："${input.childName} 这周慢了点，是不是累了？"`);
  } else {
    lines.push(`💬 蛋仔："${input.childName} 这周稳定，慢慢来"`);
  }

  return lines.join('\n');
}
