import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, hashAnswer, initializeDB } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { ensurePermission } from '../../lib/notifications';
import { APP_VERSION, APP_BUILD_DATE } from '../../version';
import { SOUND_PACK_LABELS, sounds } from '../../lib/sounds';
import type { SoundPack } from '../../lib/sounds';
import {
  planCurrentStateReset, isResetNeeded, taskResetPatch, scheduleResetPatch,
} from '../../lib/reset';

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
        <div className="text-sm text-white/70 mb-2">🔊 声音包</div>
        <div className="space-y-2">
          {(['default', 'cartoon', 'minimal'] as SoundPack[]).map(p => (
            <button key={p}
              onClick={async () => {
                await db.settings.update('singleton', { soundPack: p });
                sounds.setPack(p);
                sounds.play('unlock');
              }}
              className={`w-full px-3 py-2 rounded-xl text-left text-sm ${settings.soundPack === p ? 'bg-space-nebula ring-1 ring-space-plasma' : 'bg-white/5'}`}>
              {settings.soundPack === p && '✓ '}
              {SOUND_PACK_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="text-xs text-white/40 mt-2">点选项可试听</div>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm text-white/70 mb-2">💤 Idle Nag（5 分钟无操作蛋仔催）</div>
        <button
          onClick={() => db.settings.update('singleton', { idleNagEnabled: !settings.idleNagEnabled })}
          className={`w-full px-3 py-2 rounded-xl text-sm ${settings.idleNagEnabled !== false ? 'bg-emerald-500/30' : 'bg-white/10'}`}>
          {settings.idleNagEnabled !== false ? '✓ 已开启' : '✗ 已关闭'}
        </button>
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

      {/* R2.2.3: 仅重置当前任务状态（保留所有历史） */}
      <div className="space-card p-4 mb-3 border border-emerald-500/30">
        <div className="text-sm text-white/70 mb-2 text-emerald-300">🔄 仅重置当前任务状态</div>
        <div className="text-xs text-white/50 mb-3">
          闯关卡住、找不到任务时点这里。把所有"待开始/进行中"的任务恢复为"待安排"，
          清掉错误标记完成的时间轴。
          <b className="text-emerald-200"> 不影响积分、连击、评分历史、徽章、商店</b>。
        </div>
        <ResetCurrentStateButton />
      </div>

      <div className="space-card p-4 mb-3 border border-amber-500/30">
        <div className="text-sm text-white/70 mb-2 text-amber-300">🧹 快速重置（测试用）</div>
        <div className="text-xs text-white/50 mb-3">
          单击确认即重置全部数据。建议测试场景使用。
        </div>
        <QuickResetButton />
      </div>

      <div className="space-card p-4 mb-3 border border-rose-500/30">
        <div className="text-sm text-white/70 mb-2 text-rose-300">⚠️ 重置全部数据（严谨版）</div>
        <div className="text-xs text-white/50 mb-3">
          3 步确认 + 输入"重置"。建议先去「数据」页导出备份。
        </div>
        <ResetAllButton />
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm text-white/70 mb-2">关于</div>
        <div className="text-xs text-white/50 space-y-0.5">
          <div>App 版本：<b className="text-amber-300">{APP_VERSION}</b>（构建 {APP_BUILD_DATE}）</div>
          <div>数据库 schema：v{settings.schemaVersion}</div>
        </div>
      </div>
    </div>
  );
}

async function clearAllData() {
  await db.transaction('rw',
    [db.tasks, db.evaluations, db.schedules, db.points, db.streak, db.pet,
     db.badges, db.shop, db.redemptions, db.recipients, db.settings,
     db.templateHidden, db.taskDefinitions, db.ritualLogs] as any,
    async () => {
      await Promise.all([
        db.tasks.clear(), db.evaluations.clear(), db.schedules.clear(),
        db.points.clear(), db.streak.clear(), db.pet.clear(),
        db.badges.clear(), db.shop.clear(), db.redemptions.clear(),
        db.recipients.clear(), db.settings.clear(),
        db.templateHidden.clear(), db.taskDefinitions.clear(), db.ritualLogs.clear(),
      ]);
    });
  await initializeDB();
}

// R2.2.3: 仅重置当前任务状态（保留所有历史）
function ResetCurrentStateButton() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const schedules = useLiveQuery(() => db.schedules.toArray());
  const [confirming, setConfirming] = useState(false);

  const plan = (tasks && schedules)
    ? planCurrentStateReset(tasks, schedules)
    : { taskIdsToReset: [], scheduleIdsToUncomplete: [] };
  const needed = isResetNeeded(plan);

  async function doReset() {
    await db.transaction('rw', db.tasks, db.schedules, async () => {
      for (const id of plan.taskIdsToReset) {
        await db.tasks.update(id, taskResetPatch());
      }
      for (const id of plan.scheduleIdsToUncomplete) {
        await db.schedules.update(id, scheduleResetPatch());
      }
    });
    toast(`✓ 已重置 ${plan.taskIdsToReset.length} 个任务 + ${plan.scheduleIdsToUncomplete.length} 个时间轴`, 'success');
    setConfirming(false);
    setTimeout(() => nav('/'), 600);
  }

  if (!needed) {
    return (
      <div className="px-4 py-2 rounded-xl bg-white/5 text-white/40 text-sm text-center">
        ✨ 没有卡住的任务，状态正常
      </div>
    );
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)}
        className="w-full px-4 py-2 rounded-xl bg-emerald-500/30 border border-emerald-300/50 text-emerald-100 active:scale-95">
        🔄 重置 {plan.taskIdsToReset.length} 个卡住的任务
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-white/70 bg-white/5 rounded-lg p-2">
        即将执行：<br/>
        • 重置 <b>{plan.taskIdsToReset.length}</b> 个待开始/进行中的任务 → 待安排<br/>
        • 清除 <b>{plan.scheduleIdsToUncomplete.length}</b> 个被误标完成的时间轴<br/>
        <span className="text-emerald-300">✓ 历史评分 / 积分 / 连击 / 徽章全部保留</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setConfirming(false)} className="space-btn-ghost flex-1">取消</button>
        <button onClick={doReset} className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 text-white">确定重置</button>
      </div>
    </div>
  );
}

function QuickResetButton() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const [confirming, setConfirming] = useState(false);

  async function doReset() {
    await clearAllData();
    toast('✓ 已重置，回到引导页', 'success');
    setTimeout(() => { nav('/'); window.location.reload(); }, 500);
  }
  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)}
        className="w-full px-4 py-2 rounded-xl bg-amber-500/30 border border-amber-300/50 text-amber-100 active:scale-95">
        🧹 一键重置（单确认）
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => setConfirming(false)} className="space-btn-ghost flex-1">不了</button>
      <button onClick={doReset} className="flex-1 px-3 py-2 rounded-xl bg-amber-600 text-white">确定，清空</button>
    </div>
  );
}

function ResetAllButton() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState('');

  async function doReset() {
    if (confirmText !== '重置') { toast('请输入"重置"二字以确认', 'warn'); return; }
    await clearAllData();
    toast('✓ 已重置，回到引导页', 'success');
    setTimeout(() => { nav('/'); window.location.reload(); }, 500);
  }

  if (step === 0) {
    return (
      <button onClick={() => setStep(1)}
        className="w-full px-4 py-2 rounded-xl bg-rose-500/30 border border-rose-300/50 text-rose-100 active:scale-95">
        🗑 一键重置所有数据
      </button>
    );
  }
  if (step === 1) {
    return (
      <div className="space-y-2">
        <div className="text-rose-200 text-sm font-bold">真的要清空全部数据？</div>
        <div className="text-xs text-white/60">
          以下都会被删除：所有任务、所有积分流水、连击天数、蛋仔（名字皮肤等级）、徽章、商店配置、Bark 接收人配置、孩子昵称、PIN、密保。
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep(0)} className="space-btn-ghost flex-1">不了</button>
          <button onClick={() => setStep(2)} className="flex-1 px-3 py-2 rounded-xl bg-rose-500/40 text-rose-100">我确定</button>
        </div>
      </div>
    );
  }
  // step === 2: 终极确认
  return (
    <div className="space-y-2">
      <div className="text-rose-200 text-sm font-bold">最后确认：在下方输入「重置」二字</div>
      <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
        placeholder="输入 重置"
        className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none text-center" />
      <div className="flex gap-2">
        <button onClick={() => { setStep(0); setConfirmText(''); }} className="space-btn-ghost flex-1">取消</button>
        <button onClick={doReset}
          disabled={confirmText !== '重置'}
          className="flex-1 px-3 py-2 rounded-xl bg-rose-600 text-white disabled:opacity-40">
          🗑 删除全部
        </button>
      </div>
    </div>
  );
}
