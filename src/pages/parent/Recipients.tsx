import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { newId } from '../../lib/ids';
import { useAppStore } from '../../store/useAppStore';
import { sendTestPush } from '../../lib/bark';
import type { BarkRecipient } from '../../types';

const EMOJIS = ['👨', '👩', '👴', '👵', '👦', '👧', '🧑', '🐱'];

export function Recipients() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const list = useLiveQuery(() => db.recipients.toArray());

  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('👨');
  const [serverUrl, setServerUrl] = useState('https://api.day.app');
  const [key, setKey] = useState('');

  async function add() {
    if (!label.trim() || !key.trim()) { toast('标签和 Bark Key 都要填', 'warn'); return; }
    const r: BarkRecipient = {
      id: newId('rcp'),
      label: label.trim(), emoji,
      serverUrl: serverUrl.trim() || 'https://api.day.app',
      key: key.trim(),
      subTaskDone: false,
      subRoundDone: true,
      subMilestone: true,
      subPendingReview: true,
      subWeeklyReport: true,
      subHelp: true,
      enabled: true,
    };
    await db.recipients.add(r);
    setLabel(''); setKey('');
    toast('已添加', 'success');
  }

  async function update(id: string, patch: Partial<BarkRecipient>) {
    await db.recipients.update(id, patch);
  }

  async function del(id: string) {
    if (!confirm('确定删除？')) return;
    await db.recipients.delete(id);
  }

  async function test(r: BarkRecipient) {
    toast('发送中...', 'info');
    const result = await sendTestPush(r);
    toast(result.ok ? `✓ 已发给 ${r.label}` : `失败: ${result.error}`, result.ok ? 'success' : 'warn');
  }

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/parent/dashboard')} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold">📱 通知接收人</div>
      </div>

      <div className="space-card p-3 mb-3 text-sm text-white/70">
        在 iPhone App Store 搜「Bark」安装并打开，复制里面的 URL（形如 <code className="text-amber-300">https://api.day.app/AbCdEf123</code>），把 <b>最后那段 Key</b> 粘到下面即可。每条通知都会同时推给所有 enabled 的人。
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm text-white/70 mb-2">添加接收人</div>
        <input value={label} onChange={e => setLabel(e.target.value)}
          placeholder="标签（例如：爸爸）"
          className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none mb-2" />
        <div className="flex flex-wrap gap-1 mb-2">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`text-2xl w-10 h-10 rounded-lg ${emoji === e ? 'bg-space-nebula' : 'bg-white/5'}`}>{e}</button>
          ))}
        </div>
        <input value={serverUrl} onChange={e => setServerUrl(e.target.value)}
          placeholder="Bark 服务器地址（默认即可）"
          className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none mb-2 text-sm" />
        <input value={key} onChange={e => setKey(e.target.value)}
          placeholder="Bark Key"
          className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none mb-2 font-mono text-sm" />
        <button onClick={add} className="space-btn w-full">+ 添加</button>
      </div>

      <div className="text-sm text-white/70 mb-2">已配置（{list?.length ?? 0}）</div>
      <div className="space-y-3">
        {list?.map(r => (
          <div key={r.id} className={`space-card p-4 ${!r.enabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{r.emoji}</div>
              <div className="flex-1">
                <div className="font-medium">{r.label}</div>
                <div className="text-xs text-white/50 font-mono">...{r.key.slice(-6)}</div>
              </div>
              <button onClick={() => test(r)} className="space-btn-ghost text-xs">测试</button>
              <button onClick={() => update(r.id, { enabled: !r.enabled })}
                className={`px-3 py-1.5 rounded-lg text-xs ${r.enabled ? 'bg-emerald-500/30' : 'bg-white/10'}`}>
                {r.enabled ? '启用' : '禁用'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <SubToggle label="每项作业完成" v={r.subTaskDone} on={(v) => update(r.id, { subTaskDone: v })} />
              <SubToggle label="一轮全部完成" v={r.subRoundDone} on={(v) => update(r.id, { subRoundDone: v })} />
              <SubToggle label="连击里程碑" v={r.subMilestone} on={(v) => update(r.id, { subMilestone: v })} />
              <SubToggle label="待评分提醒" v={r.subPendingReview} on={(v) => update(r.id, { subPendingReview: v })} />
              <SubToggle label="周日周报" v={r.subWeeklyReport} on={(v) => update(r.id, { subWeeklyReport: v })} />
              <SubToggle label="🙋 求助" v={r.subHelp !== false} on={(v) => update(r.id, { subHelp: v })} />
            </div>
            <button onClick={() => del(r.id)} className="text-rose-400 text-xs mt-3">删除</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubToggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <button onClick={() => on(!v)}
      className={`px-2 py-2 rounded-lg text-left ${v ? 'bg-space-nebula/30' : 'bg-white/5'}`}>
      <span className="mr-1">{v ? '✓' : '○'}</span>
      {label}
    </button>
  );
}
