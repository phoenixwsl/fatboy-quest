// ============================================================
// R4.3.0: 等级升级监听
//
// 用 useLiveQuery 监听 points 表变化 → 异步算 lifetime → 比对
// localStorage 'fatboy:lastShownLevel'。如果跨过新等级 → 弹模态。
//
// 模态由 App.tsx 渲染（LevelUpModal），这里只是触发。
// ============================================================

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getLifetimePoints } from '../lib/petStats';
import { getLevelFromLifetime, type Level } from '../lib/levels';
import { LevelUpModal } from './LevelUpModal';
import { checkLevelMilestone } from '../lib/badges';

const LS_KEY = 'fatboy:lastShownLevel';

function getLastShown(): number {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v ? Number(v) : 1;
  } catch {
    return 1;
  }
}

function setLastShown(n: number) {
  try { localStorage.setItem(LS_KEY, String(n)); } catch { /* silent */ }
}

export function LevelUpWatcher() {
  const points = useLiveQuery(() => db.points.toArray());
  const [pendingLevel, setPendingLevel] = useState<Level | null>(null);

  useEffect(() => {
    if (!points) return;
    let alive = true;
    getLifetimePoints(db).then(lifetime => {
      if (!alive) return;
      const cur = getLevelFromLifetime(lifetime);
      const last = getLastShown();
      if (cur.level > last) {
        setPendingLevel(cur);
        // R5.2.0: 等级里程碑 badge（幂等，已发不重发）
        checkLevelMilestone(db, cur.level).catch(() => {});
      }
    });
    return () => { alive = false; };
  }, [points?.length]);

  function close() {
    if (pendingLevel) {
      setLastShown(pendingLevel.level);
      setPendingLevel(null);
    }
  }

  return <LevelUpModal newLevel={pendingLevel} onClose={close} />;
}
