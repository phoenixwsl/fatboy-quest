import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db';
import { SCHEMA_VERSION } from '../../types';
import { useAppStore } from '../../store/useAppStore';

export function DataExport() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const fileInput = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<string>('');

  async function exportData() {
    const dump = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      tasks: await db.tasks.toArray(),
      evaluations: await db.evaluations.toArray(),
      schedules: await db.schedules.toArray(),
      points: await db.points.toArray(),
      streak: await db.streak.toArray(),
      pet: await db.pet.toArray(),
      badges: await db.badges.toArray(),
      shop: await db.shop.toArray(),
      redemptions: await db.redemptions.toArray(),
      recipients: await db.recipients.toArray(),
      settings: await db.settings.toArray(),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fatboy-quest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('✓ 备份已导出，请保存到「文件」App', 'success');
  }

  async function importData(file: File) {
    const text = await file.text();
    let data: any;
    try { data = JSON.parse(text); } catch { toast('JSON 格式错误', 'warn'); return; }
    if (!data.schemaVersion) { toast('备份文件无效', 'warn'); return; }
    if (data.schemaVersion > SCHEMA_VERSION) {
      toast(`备份来自更新的版本（v${data.schemaVersion}），请先升级 App`, 'warn');
      return;
    }
    if (!confirm('确定恢复备份？当前数据将被覆盖。')) return;

    await db.transaction('rw',
      [db.tasks, db.evaluations, db.schedules, db.points, db.streak, db.pet,
       db.badges, db.shop, db.redemptions, db.recipients, db.settings] as any,
      async () => {
        // 清空所有表
        await Promise.all([
          db.tasks.clear(), db.evaluations.clear(), db.schedules.clear(),
          db.points.clear(), db.streak.clear(), db.pet.clear(),
          db.badges.clear(), db.shop.clear(), db.redemptions.clear(),
          db.recipients.clear(), db.settings.clear(),
        ]);
        // 写入
        if (data.tasks?.length) await db.tasks.bulkAdd(data.tasks);
        if (data.evaluations?.length) await db.evaluations.bulkAdd(data.evaluations);
        if (data.schedules?.length) await db.schedules.bulkAdd(data.schedules);
        if (data.points?.length) await db.points.bulkAdd(data.points);
        if (data.streak?.length) await db.streak.bulkAdd(data.streak);
        if (data.pet?.length) await db.pet.bulkAdd(data.pet);
        if (data.badges?.length) await db.badges.bulkAdd(data.badges);
        if (data.shop?.length) await db.shop.bulkAdd(data.shop);
        if (data.redemptions?.length) await db.redemptions.bulkAdd(data.redemptions);
        if (data.recipients?.length) await db.recipients.bulkAdd(data.recipients);
        if (data.settings?.length) await db.settings.bulkAdd(data.settings);
      });
    toast('✓ 已恢复', 'success');
    setTimeout(() => nav('/'), 500);
  }

  async function showStats() {
    const counts = {
      tasks: await db.tasks.count(),
      evaluations: await db.evaluations.count(),
      points: await db.points.count(),
      schedules: await db.schedules.count(),
      shop: await db.shop.count(),
      recipients: await db.recipients.count(),
    };
    setStats(Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · '));
  }

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/parent/dashboard')} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold">💾 数据 导出 / 导入</div>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm font-bold mb-2">📤 导出备份</div>
        <div className="text-xs text-white/60 mb-3">
          导出一个 JSON 文件，建议每周日存一份到 iCloud Drive。
          升级 App 不会丢数据，但是 iPadOS 在极端情况下可能清理 PWA 存储——所以备份很重要。
        </div>
        <button onClick={exportData} className="space-btn w-full">下载备份文件</button>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm font-bold mb-2">📥 从备份恢复</div>
        <div className="text-xs text-white/60 mb-3">
          上传之前导出的 JSON 文件。<b className="text-amber-300">注意：会覆盖当前所有数据</b>。
        </div>
        <input ref={fileInput} type="file" accept="application/json"
          onChange={e => e.target.files?.[0] && importData(e.target.files[0])}
          className="hidden" />
        <button onClick={() => fileInput.current?.click()} className="space-btn-ghost w-full">选择文件...</button>
      </div>

      <div className="space-card p-4">
        <div className="text-sm font-bold mb-2">📊 数据统计</div>
        <button onClick={showStats} className="space-btn-ghost mb-2">查看</button>
        {stats && <div className="text-xs text-white/60 break-words">{stats}</div>}
      </div>
    </div>
  );
}
