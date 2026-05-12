// ============================================================
// 时间 / 日期工具
// 全部围绕本地时区操作，避免 UTC 偏差导致"今天"判断错误
// ============================================================

export function todayString(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateString(date: Date): string {
  return todayString(date);
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return todayString(dt);
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86400000);
}

// ISO 周字符串："2026-W19"
// 用于守护卡每周赠送、商店周库存重置
export function isoWeekString(now = new Date()): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7; // 周一=1 ... 周日=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// 把"分钟数"格式化为 HH:MM
export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 当前时间在当天 0:00 起算了多少分钟
export function currentMinuteOfDay(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

// 给一个日期 + "当天 X 分钟" 返回 Date
export function dateAtMinute(dateStr: string, minute: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(minute / 60), minute % 60, 0, 0);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分`;
}

export function formatChineseDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dt.getDay()];
  return `${m} 月 ${d} 日 ${weekday}`;
}
