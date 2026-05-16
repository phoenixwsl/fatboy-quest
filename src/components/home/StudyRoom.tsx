// ============================================================
// 肥仔的书房 · 页面化重构 (R3.5)
//
// 跟外面 HomePage 一个语言：
//   - 流式布局（不再用 1600×1000 transform: scale 舞台）
//   - 全主题 token（cozy / starry / mecha 自动跟随）
//   - 透出全局 BackgroundCanvas（星星/云/电路即"墙外的天空"）
//
// 视觉结构：
//   顶栏
//   ── 科比海报 ──
//   桌前肥仔 + 左侧向日葵
//   底栏（积分 + 装饰商店）
// ============================================================

import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { db } from '../../db';
import { Fatboy, type FatboyCharacterId } from '../fatboy/Fatboy';
import { migrateSkinId } from '../../lib/skins';
import { totalPoints } from '../../lib/points';
import { sounds } from '../../lib/sounds';

import { SunflowerSVG } from './plants/SunflowerSVG';

import centerHeroImg from '../../assets/home/paintings/center_hero.jpg';
import './study-room.css';

// =====================================================
//  Greeting (复用 HomePage 同款语气)
// =====================================================
function greeting(hour: number, name: string): string {
  if (hour < 6)  return `还在熬夜呢，${name}`;
  if (hour < 11) return `早上好，${name}`;
  if (hour < 14) return `中午好，${name}`;
  if (hour < 18) return `下午好，${name}`;
  if (hour < 22) return `晚上好，${name}`;
  return `该睡了，${name}`;
}

// =====================================================
//  Main component
// =====================================================
export function StudyRoom() {
  const nav = useNavigate();
  const pet = useLiveQuery(() => db.pet.get('singleton'));
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const pointsEntries = useLiveQuery(() => db.points.toArray());
  const character: FatboyCharacterId = pet ? migrateSkinId(pet.skinId) : 'default';
  const childName = settings?.childName ?? '肥仔';
  const total = pointsEntries ? totalPoints(pointsEntries) : 0;
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour < 7;

  return (
    <div className="study-page-v2 min-h-full p-4 pb-28" style={{ color: 'var(--ink)' }}>
      {/* 顶栏 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => { sounds.play('tap'); nav(-1); }}
          className="px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium active:scale-95 transition-transform"
          style={{
            background: 'var(--paper)',
            color: 'var(--ink)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          ← 返回
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
          肥仔的书房
        </h1>
        <span className="w-[68px]" aria-hidden />
      </div>

      {/* 科比海报 */}
      <div className="study-hero-poster mb-4">
        <div className="study-hero-poster-mat">
          <img src={centerHeroImg} alt="偶像海报" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* 桌前肥仔 + 左侧向日葵 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[var(--radius-lg)] p-4 pb-6"
        style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-md)' }}
      >
        <span
          aria-hidden
          className="absolute left-0 right-0 bottom-[-3px] h-2 rounded-b-[var(--radius-lg)]"
          style={{ background: 'var(--fog)', zIndex: -1 }}
        />
        <div className="study-desk-scene">
          {/* 左植物 */}
          <div className="study-plant study-plant-l" aria-hidden>
            <SunflowerSVG />
          </div>
          {/* 台灯（左侧、桌后） */}
          <div className="study-lamp" aria-hidden>
            <DeskLampSimple />
          </div>
          {/* 肥仔（桌后头肩露出） */}
          <div className="study-fatboy-pos">
            <Fatboy
              character={character}
              state={isNight ? 'sleeping' : 'default'}
              size={150}
              bouncing={false}
              autoAnimate={false}
            />
          </div>
          {/* 桌子 */}
          <div className="study-desk-simple" aria-hidden>
            <div className="study-desk-top-band" />
            <div className="study-desk-front-band" />
          </div>
        </div>
        <h2 className="text-center text-base font-bold mt-2" style={{ color: 'var(--ink)' }}>
          {greeting(hour, childName)}
        </h2>
      </motion.div>

      {/* 底栏 — 积分跟外面 HomePage 同款 FloatBadge */}
      <div className="study-bottom-bar-v2">
        <div className="study-bottom-inner">
          <span
            className="study-points-badge"
            style={{
              background: 'var(--fatboy-500)',
              color: 'var(--ink)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Star size={16} fill="currentColor" />
            <span className="text-num">{total}</span>
          </span>
          <button
            onClick={() => { sounds.play('tap'); nav('/shop'); }}
            className="primary-btn"
          >
            <span className="primary-btn-bottom" aria-hidden />
            <span className="primary-btn-top" style={{ padding: '10px 16px', fontSize: 14 }}>
              🎁 装饰商店
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}

// =====================================================
//  Desk lamp — 简化版（删去原来 4 件桌面道具，只留台灯）
// =====================================================
function DeskLampSimple() {
  return (
    <svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid meet">
      <ellipse cx="22" cy="98" rx="16" ry="4" fill="var(--ink-faint)" opacity="0.6" />
      <ellipse cx="22" cy="94" rx="13" ry="3" fill="var(--ink-muted)" />
      <line x1="22" y1="92" x2="44" y2="28" stroke="var(--ink-muted)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="44" cy="28" r="3.5" fill="var(--ink)" />
      <line x1="44" y1="28" x2="68" y2="44" stroke="var(--ink-muted)" strokeWidth="3" strokeLinecap="round" />
      <polygon points="66,42 86,28 96,60 76,72" fill="var(--primary)" stroke="var(--primary-strong)" strokeWidth="1" />
      <polygon points="68,44 82,34 84,42 72,52" fill="var(--primary-soft)" opacity="0.6" />
    </svg>
  );
}

