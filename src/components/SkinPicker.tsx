// 皮肤选择模态 - R2.2: 用 Fatboy v4 character 缩略图
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '../db';
import { SKINS, migrateSkinId } from '../lib/skins';
import { Fatboy } from './fatboy/Fatboy';
import { sounds } from '../lib/sounds';
import { useAppStore } from '../store/useAppStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SkinPicker({ open, onClose }: Props) {
  const pet = useLiveQuery(() => db.pet.get('singleton'));
  const toast = useAppStore(s => s.showToast);
  const unlockedRaw = pet?.unlockedSkins ?? ['default'];
  // 兼容老格式：每个 id 经 migrate 得到新 character id
  const unlocked = new Set(unlockedRaw.map(id => migrateSkinId(id)));
  unlocked.add('default');
  const currentId = migrateSkinId(pet?.skinId);

  async function pick(id: string) {
    if (!unlocked.has(id as any)) {
      sounds.play('error');
      toast('还没解锁哦', 'warn');
      return;
    }
    await db.pet.update('singleton', { skinId: id });
    sounds.play('unlock');
    toast(`换成 ${SKINS.find(s => s.id === id)?.name} ✨`, 'success');
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto p-5 rounded-[var(--radius-xl)]"
            style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold" style={{ color: 'var(--ink)' }}>选择肥仔角色</div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                  已解锁 <span className="text-num">{unlocked.size}</span>/<span className="text-num">{SKINS.length}</span>
                </span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full active:scale-90 flex items-center justify-center"
                  style={{ background: 'var(--mist)', color: 'var(--ink)' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SKINS.map(s => {
                const isUnlocked = unlocked.has(s.id);
                const isCurrent = s.id === currentId;
                return (
                  <button
                    key={s.id}
                    onClick={() => pick(s.id)}
                    className="p-3 text-center transition-all rounded-[var(--radius-md)]"
                    style={{
                      background: isCurrent ? 'var(--fatboy-50)' : 'var(--mist)',
                      border: `2px solid ${isCurrent ? 'var(--fatboy-500)' : 'transparent'}`,
                      ...(isCurrent ? { boxShadow: 'var(--glow-fatboy)' } : {}),
                      ...(!isUnlocked ? { opacity: 0.5, filter: 'grayscale(0.8)' } : {}),
                    }}
                  >
                    <div className="flex justify-center">
                      <Fatboy character={s.id} state="default" size={72} autoAnimate />
                    </div>
                    <div className="mt-2 text-sm font-bold" style={{ color: 'var(--ink)' }}>{s.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>{s.desc}</div>
                    {!isUnlocked && (
                      <div className="text-[10px] mt-1" style={{ color: 'var(--danger)' }}>🔒 {s.unlockHint}</div>
                    )}
                    {isCurrent && (
                      <div className="text-[10px] mt-1 font-bold" style={{ color: 'var(--fatboy-700)' }}>✓ 当前</div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
