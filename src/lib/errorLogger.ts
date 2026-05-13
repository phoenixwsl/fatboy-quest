// ============================================================
// R2.3.4: 运行时错误收集
// 挂全局 onerror / unhandledrejection，写到 db.errorLogs。
// 家长面板可以一键导出，便于 iPad 上事后排查。
// 控制台 spam 防御：最近 50 条上限，超出循环覆盖（按 ts 排序删最老）。
// ============================================================
import { db } from '../db';
import { APP_VERSION } from '../version';

const MAX_LOGS = 50;
let installed = false;

export function installGlobalErrorLogger() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e) => {
    appendLog({
      kind: 'window-error',
      message: e.message || String(e.error?.message || e.error || 'unknown'),
      stack: e.error?.stack,
      url: e.filename,
    }).catch(() => {});
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason: any = e.reason;
    appendLog({
      kind: 'unhandled-rejection',
      message: reason?.message ?? String(reason ?? 'unknown rejection'),
      stack: reason?.stack,
    }).catch(() => {});
  });
}

export async function appendLog(entry: {
  kind: 'window-error' | 'unhandled-rejection' | 'manual';
  message: string;
  stack?: string;
  url?: string;
}) {
  const log = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    appVersion: APP_VERSION,
    ...entry,
  };
  await db.errorLogs.add(log);
  // GC 老的
  const count = await db.errorLogs.count();
  if (count > MAX_LOGS) {
    const oldest = await db.errorLogs.orderBy('ts').limit(count - MAX_LOGS).toArray();
    await db.errorLogs.bulkDelete(oldest.map(e => e.id));
  }
}

/** 导出全部日志为 JSON 字符串 */
export async function exportErrorLogsJSON(): Promise<string> {
  const logs = await db.errorLogs.orderBy('ts').reverse().toArray();
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    logs,
  }, null, 2);
}
