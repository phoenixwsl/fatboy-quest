// ============================================================
// 肥仔的书房 · 页面化重构 (R3.5)
//
// 跟外面 HomePage 一个语言：
//   - 流式布局（不再用 1600×1000 transform: scale 舞台）
//   - 全主题 token（cozy / starry / mecha 自动跟随）
//   - 透出全局 BackgroundCanvas（星星/云/电路即"墙外的天空"）
//
// 视觉结构（与原书房一致）：
//   顶栏
//   ── 三幅画 ──
//   ── 三个柜子（可点击）──
//   桌前肥仔 + 桌子两端绿植
//   底栏（积分 + 装饰商店）
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { db } from '../../db';
import { Fatboy, type FatboyCharacterId } from '../fatboy/Fatboy';
import { migrateSkinId } from '../../lib/skins';
import { totalPoints } from '../../lib/points';
import { sounds } from '../../lib/sounds';

import { PaintingLeftSVG } from './paintings/PaintingLeft';
import { PaintingRightSVG } from './paintings/PaintingRight';
import { PothosSVG } from './plants/PothosSVG';
import { MonsteraSVG } from './plants/MonsteraSVG';
import { TrophyOverlay, type OverlayType } from './TrophyOverlay';

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

  const [overlay, setOverlay] = useState<OverlayType | null>(null);

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

      {/* 三幅画 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <PaintingCard><PaintingLeftSVG /></PaintingCard>
        <PaintingCard>
          <img
            src={centerHeroImg}
            alt="偶像海报"
            className="w-full h-full object-cover"
          />
        </PaintingCard>
        <PaintingCard><PaintingRightSVG /></PaintingCard>
      </div>

      {/* 三个柜子（可点击） */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <CabinetCard
          emblem={<ClassicDoorEmblem />}
          title="奖杯柜"
          subtitle="点开看成就"
          onClick={() => { sounds.play('tap'); setOverlay('trophy'); }}
        />
        <CabinetCard
          emblem={<ModernDoorEmblem />}
          title="LEGO 柜"
          subtitle="敬请期待"
          onClick={() => { sounds.play('tap'); setOverlay('lego'); }}
        />
        <CabinetCard
          emblem={<PlayfulDoorEmblem />}
          title="玩具柜"
          subtitle="敬请期待"
          onClick={() => { sounds.play('tap'); setOverlay('toy'); }}
        />
      </div>

      {/* 桌前肥仔 + 桌子两端绿植 */}
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
            <PothosSVG />
          </div>
          {/* 右植物 */}
          <div className="study-plant study-plant-r" aria-hidden>
            <MonsteraSVG />
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

      <TrophyOverlay
        open={overlay !== null}
        type={overlay ?? 'trophy'}
        onClose={() => setOverlay(null)}
      />
    </div>
  );
}

// =====================================================
//  Painting card — paper 卡 + 内边框，比例 3:2
// =====================================================
function PaintingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="study-painting-card">
      <div className="study-painting-mat">
        {children}
      </div>
    </div>
  );
}

// =====================================================
//  Cabinet card — 可点击 + hover/active 发光
// =====================================================
function CabinetCard({
  emblem, title, subtitle, onClick,
}: { emblem: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="study-cabinet-card"
    >
      <div className="study-cabinet-emblem">{emblem}</div>
      <div className="study-cabinet-title">{title}</div>
      <div className="study-cabinet-subtitle">{subtitle}</div>
    </button>
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

// =====================================================
//  Cabinet door emblems — 三张柜门图案（保留原 SVG）
// =====================================================

// 左柜门：金色奖杯
function ClassicDoorEmblem() {
  return (
    <svg viewBox="0 0 120 160" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="trophy-gold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFE182" />
          <stop offset="50%" stopColor="#F0C350" />
          <stop offset="100%" stopColor="#AF8228" />
        </linearGradient>
      </defs>
      {/* Handles */}
      <path d="M 28 50 Q 12 50 12 72 Q 12 88 28 88" stroke="url(#trophy-gold)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M 92 50 Q 108 50 108 72 Q 108 88 92 88" stroke="url(#trophy-gold)" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Cup */}
      <path d="M 26 42 L 94 42 L 88 96 Q 60 110 32 96 Z" fill="url(#trophy-gold)" stroke="#8C5523" strokeWidth="1.5" />
      <ellipse cx="60" cy="42" rx="34" ry="5" fill="#FFE182" stroke="#8C5523" strokeWidth="1" />
      <polygon
        points={(() => {
          const cx = 60, cy = 72;
          const pts: string[] = [];
          for (let i = 0; i < 10; i++) {
            const ang = (-90 + 36 * i) * Math.PI / 180;
            const r = i % 2 === 0 ? 14 : 6;
            pts.push(`${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`);
          }
          return pts.join(' ');
        })()}
        fill="#FFFFFF" opacity="0.85"
      />
      <rect x="54" y="106" width="12" height="14" fill="#AF8228" />
      <rect x="42" y="120" width="36" height="10" rx="2" fill="url(#trophy-gold)" stroke="#8C5523" strokeWidth="1" />
      <rect x="38" y="130" width="44" height="6" rx="1" fill="#8C5523" />
    </svg>
  );
}

// 中柜门：LEGO 黄色 logo
function ModernDoorEmblem() {
  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lego-yellow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFD93D" />
          <stop offset="100%" stopColor="#F0B722" />
        </linearGradient>
        <linearGradient id="lego-red" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#E22D2D" />
          <stop offset="100%" stopColor="#B81818" />
        </linearGradient>
        <linearGradient id="lego-blue" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4A92E0" />
          <stop offset="100%" stopColor="#1F5FAD" />
        </linearGradient>
      </defs>

      <g transform="translate(20 30)">
        <rect x="0" y="6" width="38" height="22" rx="3" fill="url(#lego-blue)" stroke="#11366B" strokeWidth="1" />
        <circle cx="8" cy="6" r="5" fill="url(#lego-blue)" stroke="#11366B" strokeWidth="1" />
        <circle cx="20" cy="6" r="5" fill="url(#lego-blue)" stroke="#11366B" strokeWidth="1" />
        <circle cx="32" cy="6" r="5" fill="url(#lego-blue)" stroke="#11366B" strokeWidth="1" />
      </g>
      <g transform="translate(140 145)">
        <rect x="0" y="6" width="38" height="22" rx="3" fill="url(#lego-red)" stroke="#7A1010" strokeWidth="1" />
        <circle cx="8" cy="6" r="5" fill="url(#lego-red)" stroke="#7A1010" strokeWidth="1" />
        <circle cx="20" cy="6" r="5" fill="url(#lego-red)" stroke="#7A1010" strokeWidth="1" />
        <circle cx="32" cy="6" r="5" fill="url(#lego-red)" stroke="#7A1010" strokeWidth="1" />
      </g>

      <rect x="48" y="68" width="104" height="68" rx="14" fill="url(#lego-yellow)" stroke="#000" strokeWidth="3" />
      <text x="100" y="116" textAnchor="middle" fontFamily="Impact, 'Arial Black', sans-serif" fontSize="38" fontWeight="900" fill="url(#lego-red)" stroke="#000" strokeWidth="1.5">LEGO</text>
    </svg>
  );
}

// 右柜门：机器人 + 火箭 + 球
function PlayfulDoorEmblem() {
  return (
    <svg viewBox="0 0 200 220" preserveAspectRatio="xMidYMid meet">
      {/* Robot */}
      <g transform="translate(35 60)">
        <rect x="8" y="0" width="36" height="32" rx="6" fill="#E8E8EC" stroke="#3A3A40" strokeWidth="1.5" />
        <rect x="14" y="8" width="8" height="8" rx="1" fill="#4A92E0" />
        <rect x="30" y="8" width="8" height="8" rx="1" fill="#4A92E0" />
        <rect x="20" y="22" width="12" height="3" fill="#3A3A40" />
        <line x1="26" y1="0" x2="26" y2="-8" stroke="#3A3A40" strokeWidth="2" />
        <circle cx="26" cy="-10" r="3" fill="#E22D2D" />
        <rect x="4" y="32" width="44" height="38" rx="4" fill="#D2D7E1" stroke="#3A3A40" strokeWidth="1.5" />
        <circle cx="26" cy="48" r="6" fill="#F0C350" stroke="#3A3A40" strokeWidth="1" />
      </g>

      {/* Rocket */}
      <g transform="translate(120 30)">
        <polygon points="22,0 36,30 8,30" fill="#E8E8EC" stroke="#3A3A40" strokeWidth="1.5" />
        <rect x="8" y="30" width="28" height="44" fill="#FFFFFF" stroke="#3A3A40" strokeWidth="1.5" />
        <circle cx="22" cy="46" r="5" fill="#4A92E0" stroke="#3A3A40" strokeWidth="1" />
        <polygon points="8,74 0,90 8,90" fill="#E22D2D" stroke="#3A3A40" strokeWidth="1" />
        <polygon points="36,74 44,90 36,90" fill="#E22D2D" stroke="#3A3A40" strokeWidth="1" />
        <polygon points="14,90 30,90 22,108" fill="#FFC83C" />
        <polygon points="18,90 26,90 22,102" fill="#FFFFFF" opacity="0.7" />
      </g>

      {/* Ball */}
      <g transform="translate(80 160)">
        <circle cx="20" cy="20" r="20" fill="#E22D2D" stroke="#3A3A40" strokeWidth="1.5" />
        <path d="M 4 20 Q 20 8 36 20" fill="none" stroke="#3A3A40" strokeWidth="1" />
        <path d="M 4 20 Q 20 32 36 20" fill="none" stroke="#3A3A40" strokeWidth="1" />
      </g>
    </svg>
  );
}
