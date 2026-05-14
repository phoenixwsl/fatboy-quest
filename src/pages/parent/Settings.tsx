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
import { exportErrorLogsJSON } from '../../lib/errorLogger';

// R3.3.1: 通用样式片段 — 让本页所有卡片/输入都跟随主题
const cardStyle: React.CSSProperties = {
  background: 'var(--paper)',
  border: '1px solid var(--fog)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
  marginBottom: '12px',
  boxShadow: 'var(--shadow-sm)',
};
const labelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--ink-muted)', marginBottom: 8 };
const inputStyle: React.CSSProperties = {
  background: 'var(--mist)',
  color: 'var(--ink)',
  border: '1px solid var(--fog)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  outline: 'none',
};

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
    <div className="min-h-full p-4 pb-24" style={{ color: 'var(--ink)' }}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/parent/dashboard')} className="secondary-btn" style={{ padding: '8px 16px' }}>←</button>
        <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>⚙️ 设置</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>孩子昵称</div>
        <div className="flex gap-2">
          <input value={childName || settings.childName}
            onChange={e => setChildName(e.target.value)}
            className="flex-1" style={inputStyle} />
          <button onClick={updateName} className="space-btn">更新</button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>修改 PIN</div>
        <div className="flex gap-2">
          <input type="password" inputMode="numeric" maxLength={4}
            value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="新 4 位 PIN"
            className="flex-1 text-center tracking-widest text-lg"
            style={inputStyle} />
          <button onClick={updatePin} className="space-btn">更新</button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>修改密保问题</div>
        <div className="text-xs mb-2" style={{ color: 'var(--ink-faint)' }}>当前问题：{settings.securityQuestion}</div>
        <input value={newQ} onChange={e => setNewQ(e.target.value)}
          placeholder="新问题"
          className="w-full mb-2" style={inputStyle} />
        <input value={newA} onChange={e => setNewA(e.target.value)}
          placeholder="新答案"
          className="w-full mb-2" style={inputStyle} />
        <button onClick={updateSecurity} className="space-btn w-full">更新密保</button>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>🔊 声音包</div>
        <div className="space-y-2">
          {(['default', 'cartoon', 'minimal'] as SoundPack[]).map(p => {
            const active = settings.soundPack === p;
            return (
              <button key={p}
                onClick={async () => {
                  await db.settings.update('singleton', { soundPack: p });
                  sounds.setPack(p);
                  sounds.play('unlock');
                }}
                className="w-full text-left text-sm"
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: active ? 'var(--fatboy-50)' : 'var(--mist)',
                  border: `2px solid ${active ? 'var(--fatboy-500)' : 'transparent'}`,
                  color: active ? 'var(--fatboy-700)' : 'var(--ink)',
                  fontWeight: active ? 600 : 400,
                }}>
                {active && '✓ '}
                {SOUND_PACK_LABELS[p]}
              </button>
            );
          })}
        </div>
        <div className="text-xs mt-2" style={{ color: 'var(--ink-faint)' }}>点选项可试听</div>
      </div>

      {/* R3.1 / R3.3.1: 外观主题（也提供给孩子端使用） */}
      <div style={cardStyle}>
        <div style={labelStyle}>🎨 外观主题</div>
        <ThemePicker />
        <div className="text-xs mt-2" style={{ color: 'var(--ink-faint)' }}>孩子也可以在首页右上角切换</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>💤 Idle Nag（5 分钟无操作蛋仔催）</div>
        <button
          onClick={() => db.settings.update('singleton', { idleNagEnabled: !settings.idleNagEnabled })}
          className="w-full text-sm"
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: settings.idleNagEnabled !== false ? 'rgba(107,195,107,0.18)' : 'var(--mist)',
            color: settings.idleNagEnabled !== false ? 'var(--success)' : 'var(--ink-muted)',
            border: `1px solid ${settings.idleNagEnabled !== false ? 'var(--success)' : 'var(--fog)'}`,
          }}>
          {settings.idleNagEnabled !== false ? '✓ 已开启' : '✗ 已关闭'}
        </button>
      </div>

      {/* R2.4.3: 未评分提醒阈值 */}
      <div style={cardStyle}>
        <div style={labelStyle}>⏰ 未评分提醒（孩子完成后多久没评分就推送你）</div>
        <div className="text-xs mb-2" style={{ color: 'var(--ink-faint)' }}>设 0 关闭。默认 45 分钟。</div>
        <div className="flex items-center gap-2">
          <button onClick={() => db.settings.update('singleton', {
              unevaluatedNotifyMinutes: Math.max(0, (settings.unevaluatedNotifyMinutes ?? 45) - 15),
            })}
            style={{ ...inputStyle, padding: '8px 14px', cursor: 'pointer' }}>−15</button>
          <div className="flex-1 text-center text-lg tabular-nums" style={{ color: 'var(--ink)' }}>
            {settings.unevaluatedNotifyMinutes === 0
              ? '已关闭'
              : `${settings.unevaluatedNotifyMinutes ?? 45} 分钟`}
          </div>
          <button onClick={() => db.settings.update('singleton', {
              unevaluatedNotifyMinutes: Math.min(240, (settings.unevaluatedNotifyMinutes ?? 45) + 15),
            })}
            style={{ ...inputStyle, padding: '8px 14px', cursor: 'pointer' }}>+15</button>
        </div>
      </div>

      {/* R2.5.C: ADHD 友好模式 */}
      <div style={{ ...cardStyle, border: '1px solid var(--magic)' }}>
        <div style={{ ...labelStyle, color: 'var(--magic)' }}>🌈 ADHD 友好模式（推荐）</div>
        <div className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
          超时反馈分级、无焦虑放大：<br/>
          • 0-3 分钟超时：仅视觉提示（无声）<br/>
          • 3-5 分钟超时：温和提示音（不是警报）<br/>
          • 5+ 分钟超时：推送家长（文案：陪一下）<br/>
          关闭后回退到原"立刻响 + 3min 推送"行为。
        </div>
        <button
          onClick={() => db.settings.update('singleton', { adhdFriendlyMode: !(settings.adhdFriendlyMode !== false) })}
          className="w-full text-sm"
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: settings.adhdFriendlyMode !== false ? 'rgba(156,140,217,0.18)' : 'var(--mist)',
            color: settings.adhdFriendlyMode !== false ? 'var(--magic)' : 'var(--ink-muted)',
            border: `1px solid ${settings.adhdFriendlyMode !== false ? 'var(--magic)' : 'var(--fog)'}`,
          }}>
          {settings.adhdFriendlyMode !== false ? '✓ 已开启（推荐）' : '✗ 已关闭'}
        </button>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>本地通知</div>
        <div className="text-xs mb-3" style={{ color: 'var(--ink-faint)' }}>
          权限：{settings.notificationsEnabled ? '已开启' : '未开启'}
        </div>
        <button onClick={enableNotifications} className="space-btn w-full">
          请求 / 开启通知权限
        </button>
        <div className="text-xs mt-2" style={{ color: 'var(--ink-faint)' }}>
          需要将 App 添加到主屏幕后通知才能正常弹出（iPadOS 17+）
        </div>
      </div>

      {/* R2.2.3: 仅重置当前任务状态（保留所有历史） */}
      <div style={{ ...cardStyle, border: '1px solid var(--success)' }}>
        <div style={{ ...labelStyle, color: 'var(--success)' }}>🔄 仅重置当前任务状态</div>
        <div className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>
          闯关卡住、找不到任务时点这里。把所有"待开始/进行中"的任务恢复为"待安排"，
          清掉错误标记完成的时间轴。
          <b style={{ color: 'var(--success)' }}> 不影响积分、连击、评分历史、徽章、商店</b>。
        </div>
        <ResetCurrentStateButton />
      </div>

      <div style={{ ...cardStyle, border: '1px solid var(--fatboy-500)' }}>
        <div style={{ ...labelStyle, color: 'var(--fatboy-700)' }}>🧹 快速重置（测试用）</div>
        <div className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>
          单击确认即重置全部数据。建议测试场景使用。
        </div>
        <QuickResetButton />
      </div>

      <div style={{ ...cardStyle, border: '1px solid var(--sky-500)' }}>
        <div style={{ ...labelStyle, color: 'var(--sky-700)' }}>🔍 诊断 / 错误日志（R2.3.4）</div>
        <div className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>
          App 启动后 catch 到的 JS 错误会写入日志（上限 50 条）。出 bug 时点这里导出给我。
        </div>
        <ErrorLogExportButton />
      </div>

      <div style={{ ...cardStyle, border: '1px solid var(--danger)' }}>
        <div style={{ ...labelStyle, color: 'var(--danger)' }}>⚠️ 重置全部数据（严谨版）</div>
        <div className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>
          3 步确认 + 输入"重置"。建议先去「数据」页导出备份。
        </div>
        <ResetAllButton />
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>关于</div>
        <div className="text-xs space-y-0.5" style={{ color: 'var(--ink-faint)' }}>
          <div>App 版本：<b style={{ color: 'var(--fatboy-700)' }}>{APP_VERSION}</b>（构建 {APP_BUILD_DATE}）</div>
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
      <div
        className="text-sm text-center"
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--mist)',
          color: 'var(--ink-faint)',
        }}
      >
        ✨ 没有卡住的任务，状态正常
      </div>
    );
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)}
        className="w-full active:scale-95"
        style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(107,195,107,0.18)',
          border: '1px solid var(--success)',
          color: 'var(--success)',
          fontWeight: 600,
        }}>
        🔄 重置 {plan.taskIdsToReset.length} 个卡住的任务
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <div
        className="text-xs"
        style={{
          padding: '8px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--mist)',
          color: 'var(--ink-muted)',
        }}
      >
        即将执行：<br/>
        • 重置 <b style={{ color: 'var(--ink)' }}>{plan.taskIdsToReset.length}</b> 个待开始/进行中的任务 → 待安排<br/>
        • 清除 <b style={{ color: 'var(--ink)' }}>{plan.scheduleIdsToUncomplete.length}</b> 个被误标完成的时间轴<br/>
        <span style={{ color: 'var(--success)' }}>✓ 历史评分 / 积分 / 连击 / 徽章全部保留</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setConfirming(false)} className="space-btn-ghost flex-1">取消</button>
        <button onClick={doReset} className="flex-1"
          style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--success)', color: '#fff', fontWeight: 600 }}>
          确定重置
        </button>
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
        className="w-full active:scale-95"
        style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(244,199,82,0.2)',
          border: '1px solid var(--fatboy-500)',
          color: 'var(--fatboy-700)',
          fontWeight: 600,
        }}>
        🧹 一键重置（单确认）
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => setConfirming(false)} className="space-btn-ghost flex-1">不了</button>
      <button onClick={doReset} className="flex-1"
        style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--fatboy-700)', color: '#fff', fontWeight: 600 }}>
        确定，清空
      </button>
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
        className="w-full active:scale-95"
        style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(232,117,117,0.2)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          fontWeight: 600,
        }}>
        🗑 一键重置所有数据
      </button>
    );
  }
  if (step === 1) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-bold" style={{ color: 'var(--danger)' }}>真的要清空全部数据？</div>
        <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
          以下都会被删除：所有任务、所有积分流水、连击天数、蛋仔（名字皮肤等级）、徽章、商店配置、Bark 接收人配置、孩子昵称、PIN、密保。
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep(0)} className="space-btn-ghost flex-1">不了</button>
          <button onClick={() => setStep(2)} className="flex-1"
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(232,117,117,0.3)', color: 'var(--danger)', fontWeight: 600 }}>
            我确定
          </button>
        </div>
      </div>
    );
  }
  // step === 2: 终极确认
  return (
    <div className="space-y-2">
      <div className="text-sm font-bold" style={{ color: 'var(--danger)' }}>最后确认：在下方输入「重置」二字</div>
      <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
        placeholder="输入 重置"
        className="w-full text-center" style={inputStyle} />
      <div className="flex gap-2">
        <button onClick={() => { setStep(0); setConfirmText(''); }} className="space-btn-ghost flex-1">取消</button>
        <button onClick={doReset}
          disabled={confirmText !== '重置'}
          className="flex-1 disabled:opacity-40"
          style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--danger)', color: '#fff', fontWeight: 600 }}>
          🗑 删除全部
        </button>
      </div>
    </div>
  );
}

// R3.4: 主题选择 — 也 export 给孩子端 HomePage 复用
// 预览色严格对齐 src/index.css 里每个主题的真实 token，避免预览与实际不符
const THEMES = [
  {
    id: 'cozy' as const,
    name: '温馨',
    desc: '暖橙绘本',
    preview: {
      bg: 'linear-gradient(135deg, #FFF8EC, #FFEED4)',
      dot: '#F5A04A',                            // primary 暖橙
      dot2: '#7FC8A9',                           // accent 薄荷
    },
  },
  {
    id: 'starry' as const,
    name: '星空',
    desc: '紫蓝星夜',
    preview: {
      bg: 'linear-gradient(135deg, #1B2547, #0E1226)',
      dot: '#6F5BE9',                            // primary 紫
      dot2: '#FFD66B',                           // accent 金（唯一暖锚）
    },
  },
  {
    id: 'mecha' as const,
    name: '机械',
    desc: '青霓机甲',
    preview: {
      bg: 'linear-gradient(135deg, #1A1F2E, #0E121E)',
      dot: '#2DD4BF',                            // primary 青绿
      dot2: '#FB7185',                           // accent 玫红
    },
  },
];

export function ThemePicker() {
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const current =
    settings?.themeId === 'space' ? 'starry' :
    (settings?.themeId as 'cozy' | 'starry' | 'mecha' | undefined) ?? 'cozy';

  async function pick(id: 'cozy' | 'starry' | 'mecha') {
    await db.settings.update('singleton', { themeId: id });
    sounds.play('tap');
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {THEMES.map(t => {
        const active = t.id === current;
        return (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            className="text-center transition-all active:scale-95"
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--mist)',
              border: `2px solid ${active ? 'var(--fatboy-500)' : 'var(--fog)'}`,
              ...(active ? { boxShadow: 'var(--glow-fatboy)' } : {}),
            }}
          >
            <div
              className="h-12 mb-2 relative"
              style={{ background: t.preview.bg, borderRadius: 'var(--radius-sm)' }}
            >
              {/* 主色 dot */}
              <span
                className="absolute right-2 top-2 w-3 h-3 rounded-full"
                style={{ background: t.preview.dot, boxShadow: `0 0 8px ${t.preview.dot}` }}
              />
              {/* 辅色 dot（小一点，左下） — 让用户感知"双色组合" */}
              <span
                className="absolute left-2 bottom-2 w-2 h-2 rounded-full"
                style={{ background: t.preview.dot2, boxShadow: `0 0 6px ${t.preview.dot2}` }}
              />
            </div>
            <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{t.name}</div>
            <div className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t.desc}</div>
            {active && (
              <div className="text-[10px] mt-1 font-bold" style={{ color: 'var(--fatboy-700)' }}>
                ✓ 当前
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// R2.3.4: 错误日志导出
function ErrorLogExportButton() {
  const toast = useAppStore(s => s.showToast);
  const count = useLiveQuery(() => db.errorLogs.count(), []) ?? 0;

  async function exportLogs() {
    const json = await exportErrorLogsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fatboy-error-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`✓ 已导出 ${count} 条日志`, 'success');
  }

  async function clearLogs() {
    await db.errorLogs.clear();
    toast('✓ 已清空错误日志', 'success');
  }

  return (
    <div className="space-y-2">
      <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
        当前共 <b style={{ color: 'var(--ink)' }}>{count}</b> 条日志
      </div>
      <div className="flex gap-2">
        <button onClick={exportLogs} disabled={count === 0}
          className="flex-1 disabled:opacity-40 active:scale-95"
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(74,158,231,0.15)',
            border: '1px solid var(--sky-500)',
            color: 'var(--sky-700)',
            fontWeight: 600,
          }}>
          📥 导出 JSON
        </button>
        <button onClick={clearLogs} disabled={count === 0}
          className="disabled:opacity-40 active:scale-95"
          style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--mist)', color: 'var(--ink)' }}>
          🗑 清空
        </button>
      </div>
    </div>
  );
}
