// 皮肤选择模态
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '../db';
import { SKINS } from '../lib/skins';
import { PetAvatar } from './PetAvatar';
import { sounds } from '../lib/sounds';
import { useAppStore } from '../store/useAppStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SkinPicker({ open, onClose }: Props) {
  const pet = useLiveQuery(() => db.pet.get('singleton'));
  const toast = useAppStore(s => s.showToast);
  const unlocked = new Set(pet?.unlockedSkins ?? ['skin_classic']);
  const currentId = pet?.skinId ?? 'skin_classic';

  async function pick(id: string) {
    if (!unlocked.has(id)) {
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
            className="space-card p-5 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold">🥚 选择蛋仔皮肤</div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 active:scale-90">✕</button>
            </div>

            <div className="text-xs text-white/50 mb-3">
              已解锁 {unlocked.size}/{SKINS.length}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SKINS.map(s => {
                const isUnlocked = unlocked.has(s.id);
                const isCurrent = s.id === currentId;
                return (
                  <button key={s.id} onClick={() => pick(s.id)}
                    className={`space-card p-3 text-center transition-all
                      ${isCurrent ? 'ring-2 ring-amber-300' : ''}
                      ${!isUnlocked ? 'opacity-40 grayscale' : 'active:scale-95'}`}
                  >
                    <div className="flex justify-center">
                      <PetAvatar skinId={s.id} size={72} bobbing={false} mood="happy" />
                    </div>
                    <div className="mt-2 text-sm font-bold">{s.name}</div>
                    <div className="text-[10px] text-white/50 mt-0.5">{s.desc}</div>
                    {!isUnlocked && (
                      <div className="text-[10px] text-rose-300/80 mt-1">🔒 {s.unlockHint}</div>
                    )}
                    {isCurrent && <div className="text-[10px] text-amber-300 mt-1">✓ 当前</div>}
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
