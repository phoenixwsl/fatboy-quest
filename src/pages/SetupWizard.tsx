import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db, hashAnswer } from '../db';
import { PetAvatar } from '../components/PetAvatar';
import { SKINS } from '../lib/skins';

export function SetupWizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [childName, setChildName] = useState('肥仔');
  const [petName, setPetName] = useState('');
  const [skinId, setSkinId] = useState<string>(SKINS[0].id);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('我妈妈的小名是？');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');

  const next = () => {
    setError('');
    if (step === 0 && !childName.trim()) { setError('给孩子起个昵称吧'); return; }
    if (step === 1 && !petName.trim()) { setError('给蛋仔起个名字'); return; }
    if (step === 2) {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('PIN 必须是 4 位数字'); return; }
      if (pin !== pinConfirm) { setError('两次 PIN 不一致'); return; }
      if (!securityQuestion.trim() || !securityAnswer.trim()) { setError('密保问题和答案都要填'); return; }
    }
    setStep(step + 1);
  };

  const finish = async () => {
    await db.settings.update('singleton', {
      childName: childName.trim(),
      pin,
      securityQuestion: securityQuestion.trim(),
      securityAnswer: hashAnswer(securityAnswer),
      setupComplete: true,
    });
    await db.pet.put({
      id: 'singleton',
      name: petName.trim(),
      skinId,
      unlockedSkins: [skinId],
      level: 1,
      exp: 0,
      evolutionStage: 1,
      equippedAccessories: [],
    });
    nav('/');
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-card p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="text-3xl font-bold glow-text">🚀 肥仔大闯关</div>
          <div className="mt-2 text-sm" style={{ color: 'var(--ink-faint)' }}>第 {step + 1} / 4 步</div>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className="text-lg">第一步：给孩子起个昵称</div>
            <input
              value={childName}
              onChange={e => setChildName(e.target.value)}
              placeholder="例如：肥仔"
              className="w-full px-4 py-3 rounded-xl outline-none"
              style={{ background: 'var(--surface-mist)' }}
            />
            <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>这个名字会出现在通知和分享卡片里</div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="text-lg">第二步：选一只蛋仔并起个名字</div>
            <div className="flex justify-center">
              <PetAvatar skinId={skinId} size={120} mood="happy" />
            </div>
            <div className="text-xs text-center" style={{ color: 'var(--ink-faint)' }}>{SKINS.find(s => s.id === skinId)?.desc}</div>
            <div className="grid grid-cols-4 gap-2">
              {SKINS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSkinId(s.id)}
                  className={`p-2 rounded-xl flex flex-col items-center ${s.id === skinId ? 'ring-2 ring-space-plasma bg-space-card' : ''}`}
                  style={s.id === skinId ? undefined : { background: 'var(--surface-mist)' }}
                >
                  <PetAvatar skinId={s.id} size={48} bobbing={false} />
                  <div className="text-[10px] mt-1" style={{ color: 'var(--ink-muted)' }}>{s.name}</div>
                </button>
              ))}
            </div>
            <input
              value={petName}
              onChange={e => setPetName(e.target.value)}
              placeholder="给蛋仔起个名字"
              className="w-full px-4 py-3 rounded-xl outline-none"
              style={{ background: 'var(--surface-mist)' }}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-lg">第三步：家长 4 位 PIN</div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="设置 4 位 PIN"
              className="w-full px-4 py-3 rounded-xl outline-none text-center tracking-widest text-2xl"
              style={{ background: 'var(--surface-mist)' }}
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
              placeholder="再输一次"
              className="w-full px-4 py-3 rounded-xl outline-none text-center tracking-widest text-2xl"
              style={{ background: 'var(--surface-mist)' }}
            />
            <input
              value={securityQuestion}
              onChange={e => setSecurityQuestion(e.target.value)}
              placeholder="密保问题"
              className="w-full px-4 py-3 rounded-xl outline-none"
              style={{ background: 'var(--surface-mist)' }}
            />
            <input
              value={securityAnswer}
              onChange={e => setSecurityAnswer(e.target.value)}
              placeholder="密保答案（PIN 忘了用这个重置）"
              className="w-full px-4 py-3 rounded-xl outline-none"
              style={{ background: 'var(--surface-mist)' }}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="text-lg">准备就绪！</div>
            <PetAvatar skinId={skinId} size={120} mood="happy" />
            <div className="text-sm leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
              <p>蛋仔「{petName}」已就位 🚀</p>
              <p className="mt-2">下一步家长可以通过 <b>长按右上角图标 3 秒</b> 进入家长模式，添加作业。</p>
              <p className="mt-2" style={{ color: 'var(--ink-faint)' }}>通知权限会在第一次需要时请求</p>
            </div>
          </div>
        )}

        {error && <div className="text-sm mt-3" style={{ color: 'var(--state-danger)' }}>{error}</div>}

        <div className="flex justify-between mt-6 gap-3">
          {step > 0 && step < 3 && (
            <button onClick={() => setStep(step - 1)} className="space-btn-ghost flex-1">上一步</button>
          )}
          {step < 3 ? (
            <button onClick={next} className="space-btn flex-1">下一步</button>
          ) : (
            <button onClick={finish} className="space-btn flex-1">开始闯关</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
