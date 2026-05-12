import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, hashAnswer } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { ensurePermission } from '../../lib/notifications';

export function ParentSettings() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const settings = useLiveQuery(() => db.settings.get('singleton'));

  const [newPin, setNewPin] = useState('');
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [childName, setChildName] = useState('');

  if (!settings) return null;

  async function updatePin() {
    if (!/^\d{4}$/.test(newPin)) { toast('PIN 必须是 4 位数字', 'warn'); return; }
    await db.settings.update('singleton', { pin: newPin });
    setNewPin(''); toast('✓ PIN 已更新', 'success');
  }
  async function updateSecurity() {
    if (!newQ.trim() || !newA.trim()) { toast('两项都要填', 'warn'); return; }
    await db.settings.update('singleton', {
      securityQuestion: newQ.trim(),
      securityAnswer: hashAnswer(newA),
    });
    setNewQ(''); setNewA(''); toast('✓ 密保已更新', 'success');
  }
  async function updateName() {
    if (!childName.trim()) return;
    await db.settings.update('singleton', { childName: childName.trim() });
    setChildName(''); toast('✓ 名字已更新', 'success');
  }
  async function enableNotifications() {
    const ok = await ensurePermission();
    if (ok) {
      await db.settings.update('singleton', { notificationsEnabled: true });
      toast('✓ 通知已开启', 'success');
    } else {
      toast('请在系统设置允许通知权限', 'warn');
    }
  }

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/parent/dashboard')} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold">⚙️ 设置</div>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm text-white/70 mb-2">孩子昵称</div>
        <div className="flex gap-2">
          <input value={childName || settings.childName}
            onChange={e => setChildName(e.target.value)}
            className="flex-1 px-3 py-2 bg-white/10 rounded-xl outline-none" />
          <button onClick={updateName} className="space-btn">更新</button>
        </div>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm text-white/70 mb-2">修改 PIN</div>
        <div className="flex gap-2">
          <input type="password" inputMode="numeric" maxLength={4}
            value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="新 4 位 PIN"
            className="flex-1 px-3 py-2 bg-white/10 rounded-xl outline-none text-center tracking-widest text-lg" />
          <button onClick={updatePin} className="space-btn">更新</button>
        </div>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm text-white/70 mb-2">修改密保问题</div>
        <div className="text-xs text-white/40 mb-2">当前问题：{settings.securityQuestion}</div>
        <input value={newQ} onChange={e => setNewQ(e.target.value)}
          placeholder="新问题"
          className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none mb-2" />
        <input value={newA} onChange={e => setNewA(e.target.value)}
          placeholder="新答案"
          className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none mb-2" />
        <button onClick={updateSecurity} className="space-btn w-full">更新密保</button>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm text-white/70 mb-2">本地通知</div>
        <div className="text-xs text-white/50 mb-3">
          权限：{settings.notificationsEnabled ? '已开启' : '未开启'}
        </div>
        <button onClick={enableNotifications} className="space-btn w-full">
          请求 / 开启通知权限
        </button>
        <div className="text-xs text-white/40 mt-2">
          需要将 App 添加到主屏幕后通知才能正常弹出（iPadOS 17+）
        </div>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm text-white/70 mb-2">关于</div>
        <div className="text-xs text-white/50">
          Schema 版本：v{settings.schemaVersion}<br/>
          App 版本：Round 1 MVP
        </div>
      </div>
    </div>
  );
}
