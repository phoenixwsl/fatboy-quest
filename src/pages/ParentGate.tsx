import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db, hashAnswer } from '../db';

export function ParentGate() {
  const nav = useNavigate();
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);
  const [answer, setAnswer] = useState('');
  const [newPin, setNewPin] = useState('');

  // useLiveQuery 未解析完时 settings 为 undefined —— 此时不能把"数据没加载"
  // 误判成"PIN 错误"（会出现首毫秒点确定就报错的 bug，也让测试出现竞态）
  const loading = settings === undefined;

  const submit = () => {
    if (loading) return;
    if (pin === settings.pin) {
      nav('/parent/dashboard');
    } else {
      setError('PIN 错误');
      setPin('');
    }
  };

  const resetPin = async () => {
    if (loading) return;
    if (hashAnswer(answer) !== settings?.securityAnswer) {
      setError('密保答案错误'); return;
    }
    if (!/^\d{4}$/.test(newPin)) { setError('新 PIN 必须是 4 位数字'); return; }
    await db.settings.update('singleton', { pin: newPin });
    setError(''); setForgot(false); setPin(''); setAnswer(''); setNewPin('');
    alert('PIN 已重置，请重新输入');
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-card p-8 max-w-sm w-full"
      >
        <div className="text-3xl text-center mb-2">🔒</div>
        <div className="text-center text-lg mb-4">家长模式</div>

        {!forgot ? (
          <>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="输入 4 位 PIN"
              className="w-full px-4 py-3 rounded-xl outline-none text-center tracking-widest text-2xl"
              style={{ background: 'var(--surface-mist)' }}
              autoFocus
            />
            <button onClick={submit} disabled={loading} className="space-btn w-full mt-3">确定</button>
            <button onClick={() => { setForgot(true); setError(''); }} className="text-sm w-full mt-3" style={{ color: 'var(--ink-faint)' }}>忘记 PIN？</button>
          </>
        ) : (
          <>
            <div className="text-sm mb-3" style={{ color: 'var(--ink-muted)' }}>密保问题：{settings?.securityQuestion}</div>
            <input
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="密保答案"
              className="w-full px-4 py-3 rounded-xl outline-none mb-2"
              style={{ background: 'var(--surface-mist)' }}
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="设置新的 4 位 PIN"
              className="w-full px-4 py-3 rounded-xl outline-none text-center tracking-widest text-2xl"
              style={{ background: 'var(--surface-mist)' }}
            />
            <button onClick={resetPin} disabled={loading} className="space-btn w-full mt-3">重置 PIN</button>
            <button onClick={() => setForgot(false)} className="text-sm w-full mt-2" style={{ color: 'var(--ink-faint)' }}>返回</button>
          </>
        )}

        {error && <div className="text-sm text-center mt-3" style={{ color: 'var(--state-danger)' }}>{error}</div>}

        <button onClick={() => nav('/')} className="space-btn-ghost w-full mt-6">取消，回首页</button>
      </motion.div>
    </div>
  );
}
