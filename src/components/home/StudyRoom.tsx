// ============================================================
// 肥仔的书房 · 主容器 (M1 基础架构)
//
// 坐标系：1600 × 1000 内部画布，绝对像素定位匹配 Python 源头
// 视口适配：transform: scale 等比缩放到屏幕大小（保持 16:10）
//
// Python 来源: docs/home-feature-delivery/03-render-reference.py
// 像素对照: docs/home-feature-delivery/IMPLEMENTATION.md
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Fatboy, type FatboyCharacterId } from '../fatboy/Fatboy';
import { migrateSkinId } from '../../lib/skins';

import { PaintingLeftSVG } from './paintings/PaintingLeft';
import { PaintingRightSVG } from './paintings/PaintingRight';
import { PothosSVG } from './plants/PothosSVG';
import { MonsteraSVG } from './plants/MonsteraSVG';
import { TrophyOverlay } from './TrophyOverlay';

import centerHeroImg from '../../assets/home/paintings/center_hero.jpg';
import '../../styles/study-room-tokens.css';
import './study-room.css';

// =====================================================
//  Layout constants — mirrored from Python source
// =====================================================
const STAGE_W = 1600;
const STAGE_H = 1000;
const FLOOR_LINE_Y = 690;
const CAB_TOP_Y = 380;
const CAB_BASE_Y = 685;
const CAB_H = CAB_BASE_Y - CAB_TOP_Y;  // 305
const CAB_L_X = 80;   const CAB_L_W = 375;
const CAB_M_X = 575;  const CAB_M_W = 450;
const CAB_R_X = 1145; const CAB_R_W = 375;
// M1.1: desk shrunk to ~60% width, top raised for Z-depth feel
const DESK_X1 = 320;
const DESK_X2 = 1280;
const DESK_W = DESK_X2 - DESK_X1;   // 960
const DESK_TOP_Y = 830;              // was 870 → up 40 to give thicker visible top
const FB_SIZE = 260;                 // unchanged per user request
const FB_Y = 610;                    // adjusted so head/shoulders show above new chair
const CHAIR_CX = STAGE_W / 2;
const CHAIR_W = 300;                 // was 360 → shrunk
const CHAIR_H = 100;                 // was 150 → much smaller, like office chair backrest
const CHAIR_TOP_Y = DESK_TOP_Y - CHAIR_H;  // 730
const PAINT_Y = 200;
const PAINT_H = 130;
const P1_W = 210;
const P2_W = 260;
const P3_W = 210;
const P1_X = CAB_L_X + (CAB_L_W - P1_W) / 2;  // 162.5
const P2_X = CAB_M_X + (CAB_M_W - P2_W) / 2;  // 670
const P3_X = CAB_R_X + (CAB_R_W - P3_W) / 2;  // 1227.5
// M1.2: plants larger + hugging desk ends for a natural look
const PLANT_L_CX = 270;              // was 200 → DESK_X1 - 50
const PLANT_R_CX = 1330;             // was 1400 → DESK_X2 + 50
const PLANT_BASE_Y = 820;            // sits on floor next to desk

// =====================================================
//  Hook: scale stage to fit viewport (16:10 letterbox)
// =====================================================
function useStageScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sX = vw / STAGE_W;
      const sY = vh / STAGE_H;
      setScale(Math.min(sX, sY));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

// =====================================================
//  Main component
// =====================================================
export function StudyRoom() {
  const navigate = useNavigate();
  const pet = useLiveQuery(() => db.pet.get('singleton'));
  const character: FatboyCharacterId = pet ? migrateSkinId(pet.skinId) : 'default';
  const scale = useStageScale();
  const [trophyOpen, setTrophyOpen] = useState(false);

  return (
    <div className="study-page study-room-scope">
      <div
        className="study-stage"
        style={{
          width: `${STAGE_W}px`,
          height: `${STAGE_H}px`,
          transform: `scale(${scale})`,
        }}
      >
        {/* ====== Layer 1: Wall + gradient + texture ====== */}
        <Wall />

        {/* ====== Layer 2: Window beam (cinematic left-top light) ====== */}
        <WindowBeam />

        {/* ====== Layer 3: Overhead ambient glow ====== */}
        <AmbientGlow />

        {/* ====== Layer 4: Ceiling trim + Picture rail ====== */}
        <CeilingTrim />
        <PictureRail />

        {/* ====== Layer 5: Floor + planks + seams ====== */}
        <Floor />

        {/* ====== Layer 10: 3 paintings ====== */}
        <Painting
          x={P1_X} y={PAINT_Y} w={P1_W} h={PAINT_H}
          padding={6}
        >
          <PaintingLeftSVG />
        </Painting>
        <Painting
          x={P2_X} y={PAINT_Y} w={P2_W} h={PAINT_H}
          padding={4}
        >
          <img src={centerHeroImg} alt="偶像海报" className="painting-hero-img" />
        </Painting>
        <Painting
          x={P3_X} y={PAINT_Y} w={P3_W} h={PAINT_H}
          padding={6}
        >
          <PaintingRightSVG />
        </Painting>

        {/* ====== Layer 11: Cabinet floor shadows (under each cabinet) ====== */}
        <CabinetFloorShadow x={CAB_L_X} w={CAB_L_W} />
        <CabinetFloorShadow x={CAB_M_X} w={CAB_M_W} />
        <CabinetFloorShadow x={CAB_R_X} w={CAB_R_W} />

        {/* ====== Layer 12-14: 3 cabinets ====== */}
        <ClassicTrophyCabinet x={CAB_L_X} y={CAB_TOP_Y} w={CAB_L_W} h={CAB_H} onTrophyClick={() => setTrophyOpen(true)} />
        <ModernLegoCabinet     x={CAB_M_X} y={CAB_TOP_Y} w={CAB_M_W} h={CAB_H} />
        <PlayfulToyCabinet     x={CAB_R_X} y={CAB_TOP_Y} w={CAB_R_W} h={CAB_H} />

        {/* ====== Layer 15: 2 plants ====== */}
        <Plant cx={PLANT_L_CX} baseY={PLANT_BASE_Y} width={210} height={310}>
          <PothosSVG />
        </Plant>
        <Plant cx={PLANT_R_CX} baseY={PLANT_BASE_Y} width={224} height={364}>
          <MonsteraSVG />
        </Plant>

        {/* ====== Layer 18-19: Chair floor shadow + Chair ====== */}
        <ChairFloorShadow />
        <ChairBack />

        {/* ====== Layer 20: FATBOY (must be BEFORE chair visually but rendered after) ====== */}
        <div
          className="study-fatboy-wrapper"
          style={{
            left: `${CHAIR_CX - FB_SIZE / 2}px`,
            top: `${FB_Y}px`,
            width: `${FB_SIZE}px`,
            height: `${FB_SIZE}px`,
          }}
        >
          <Fatboy character={character} state="default" size={FB_SIZE} bouncing={false} autoAnimate={false} />
        </div>

        {/* ====== Layer 21-22: Desk shadow + Desk ====== */}
        <DeskShadow />
        <Desk />

        {/* ====== Layer 23: Desk items (lamp, notebook, globe, frame) ====== */}
        <DeskItems />

        {/* ====== Layer 100: Top nav ====== */}
        <TopNav onExit={() => navigate(-1)} />

        {/* ====== Layer 100: Bottom status bar ====== */}
        <BottomBar />
      </div>

      {/* Trophy overlay (outside stage, uses fixed positioning) */}
      <TrophyOverlay open={trophyOpen} onClose={() => setTrophyOpen(false)} />
    </div>
  );
}

// =====================================================
//  Sub-components — all positioned with absolute px
// =====================================================

function Wall() {
  return (
    <div className="study-wall">
      <div className="study-wall-gradient" />
      <div className="study-wall-texture" />
    </div>
  );
}

function WindowBeam() {
  return <div className="study-window-beam" />;
}

function AmbientGlow() {
  return <div className="study-ambient-glow" />;
}

function CeilingTrim() {
  return (
    <>
      <div className="study-ceiling-trim-1" style={{ top: 60 }} />
      <div className="study-ceiling-trim-2" style={{ top: 66 }} />
    </>
  );
}

function PictureRail() {
  // Python: rect [0, 165, W, 170] PIC_RAIL + [0, 170, W, 172] WOOD_LIGHT
  return (
    <>
      <div className="study-pic-rail-1" style={{ top: 165, height: 5 }} />
      <div className="study-pic-rail-2" style={{ top: 170, height: 2 }} />
    </>
  );
}

function Floor() {
  // 5 横向板缝 + 6 行错落纵向接缝
  const plankYs = [720, 760, 805, 860, 930];
  const seamData: Array<{ y1: number; y2: number; xs: number[] }> = [
    { y1: 690, y2: 720, xs: [200, 480, 720, 1050, 1320] },
    { y1: 720, y2: 760, xs: [80, 380, 620, 900, 1180, 1470] },
    { y1: 760, y2: 805, xs: [250, 550, 850, 1100, 1400] },
    { y1: 805, y2: 860, xs: [120, 420, 700, 980, 1280, 1500] },
    { y1: 860, y2: 930, xs: [300, 600, 900, 1200, 1450] },
    { y1: 930, y2: 1000, xs: [180, 480, 760, 1080, 1350] },
  ];
  return (
    <>
      <div className="study-floor" />
      <div className="study-floor-wall-line-1" style={{ top: 686 }} />
      <div className="study-floor-wall-line-2" style={{ top: 690 }} />
      <svg
        className="study-floor-seams"
        viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
        preserveAspectRatio="none"
      >
        {plankYs.map((py) => (
          <g key={`plank-${py}`}>
            <line x1={0} x2={STAGE_W} y1={py} y2={py} stroke="var(--study-floor-grain)" strokeWidth="1" />
            <line x1={0} x2={STAGE_W} y1={py + 1} y2={py + 1} stroke="rgb(155,120,80)" strokeWidth="1" opacity="0.7" />
          </g>
        ))}
        {seamData.map((row, ri) =>
          row.xs.map((sx) => (
            <line
              key={`seam-${ri}-${sx}`}
              x1={sx} x2={sx} y1={row.y1} y2={Math.min(row.y2, STAGE_H)}
              stroke="rgb(140,105,70)" strokeWidth="1"
            />
          )),
        )}
      </svg>
    </>
  );
}

interface PaintingProps {
  x: number;
  y: number;
  w: number;
  h: number;
  padding: number;
  children: React.ReactNode;
}
function Painting({ x, y, w, h, padding, children }: PaintingProps) {
  const cx = x + w / 2;
  // 挂绳：从画顶中央 (cx, y) 拉到画轨上的两个点 (cx-30, 172) 和 (cx+30, 172)
  return (
    <>
      {/* Picture cord (V-shape from rail to top-center of painting) */}
      <svg
        className="study-pic-cord"
        viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
        preserveAspectRatio="none"
      >
        <line x1={cx - 30} y1={172} x2={cx} y2={y} stroke="var(--study-wood-dark)" strokeWidth="1" />
        <line x1={cx + 30} y1={172} x2={cx} y2={y} stroke="var(--study-wood-dark)" strokeWidth="1" />
      </svg>
      {/* Frame: 3-layer wood + paper mat */}
      <div
        className="study-painting"
        style={{ left: x - 10, top: y - 10, width: w + 20, height: h + 20 }}
      >
        <div className="study-painting-outer" />
        <div className="study-painting-mid" />
        <div className="study-painting-inner" />
        <div
          className="study-painting-mat"
          style={{ inset: `${10 + padding}px` }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

function CabinetFloorShadow({ x, w }: { x: number; w: number }) {
  return (
    <div
      className="study-cabinet-floor-shadow"
      style={{
        left: x - 20,
        top: CAB_BASE_Y + 12,
        width: w + 40,
        height: 30,
      }}
    />
  );
}

// ============================================================
// M1.1: cabinets redesigned — opaque doors (no peeking inside),
//   theme emblem on door front for identity, 3D depth (top board,
//   side shadow, raised panels, deeper base)
// ============================================================

// ----- 左柜 · 经典实木 + 金色奖杯铜雕门 -----
function ClassicTrophyCabinet({ x, y, w, h, onTrophyClick }: { x: number; y: number; w: number; h: number; onTrophyClick?: () => void }) {
  const PED_H = 20;
  const TOP_BOARD = 12;  // 顶板厚度
  const BASE_H = 26;     // 底座厚度
  return (
    <div className="study-cab study-cab-classic" style={{ left: x - 14, top: y - 8 - PED_H, width: w + 28, height: h + 8 + PED_H + BASE_H + 12 }}>
      {/* Pediment (decorative top) */}
      <div className="cab-classic-pediment" style={{ width: w + 28, height: PED_H }} />
      <div className="cab-classic-pediment-inner" style={{ left: 4, top: 2, width: w + 20, height: PED_H - 4 }} />
      {/* Center medallion on pediment */}
      <div className="cab-classic-medallion" style={{ left: (w + 28) / 2 - 9, top: 1 }} />
      <div className="cab-classic-medallion-inner" style={{ left: (w + 28) / 2 - 5, top: 5 }} />

      {/* Cabinet body */}
      <div className="cab-classic-body" style={{ left: 8, top: PED_H, width: w + 12, height: h + 14 }}>
        {/* Top board (slight 3D perspective hint) */}
        <div className="cab-classic-top-board" style={{ width: w + 12, height: TOP_BOARD }} />
        {/* Door frame */}
        <div className="cab-classic-door-frame" style={{ left: 4, top: TOP_BOARD, width: w + 4, height: h + 6 - TOP_BOARD }}>
          {/* Door */}
          <div className="cab-classic-door">
            {/* Raised panel border */}
            <div className="cab-classic-door-panel">
              {/* Center: large trophy emblem — clickable to open trophy overlay */}
              <div className="trophy-emblem-clickable" onClick={onTrophyClick} role="button" aria-label="查看奖杯">
                <ClassicDoorEmblem />
              </div>
            </div>
            {/* Door knob */}
            <div className="cab-classic-knob" />
          </div>
        </div>
        {/* Right edge shadow (light from upper-left) */}
        <div className="cab-3d-right-shadow" style={{ width: 5, top: TOP_BOARD, height: h + 6 - TOP_BOARD }} />
      </div>

      {/* Floor base (thicker, with visible top surface) */}
      <div className="cab-classic-base" style={{ left: 0, top: PED_H + h + 8, width: w + 28, height: BASE_H }} />
      <div className="cab-classic-base-top" style={{ left: 4, top: PED_H + h + 6, width: w + 20, height: 4 }} />
      {/* 2 square feet */}
      <div className="cab-classic-foot" style={{ left: 10, top: PED_H + h + 8 + BASE_H }} />
      <div className="cab-classic-foot" style={{ left: w + 6, top: PED_H + h + 8 + BASE_H }} />
    </div>
  );
}

// 左柜门图案：大金色奖杯
function ClassicDoorEmblem() {
  return (
    <svg className="cab-door-emblem" viewBox="0 0 120 160" preserveAspectRatio="xMidYMid meet">
      {/* Trophy cup body */}
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
      {/* Rim */}
      <ellipse cx="60" cy="42" rx="34" ry="5" fill="#FFE182" stroke="#8C5523" strokeWidth="1" />
      {/* Star on cup */}
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
      {/* Stem */}
      <rect x="54" y="106" width="12" height="14" fill="#AF8228" />
      {/* Base */}
      <rect x="42" y="120" width="36" height="10" rx="2" fill="url(#trophy-gold)" stroke="#8C5523" strokeWidth="1" />
      <rect x="38" y="130" width="44" height="6" rx="1" fill="#8C5523" />
    </svg>
  );
}

// ----- 中柜 · 现代银灰 + LEGO logo 门 -----
function ModernLegoCabinet({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const TOP_BOARD = 10;
  const BASE_H = 22;
  return (
    <div className="study-cab study-cab-modern" style={{ left: x - 10, top: y - 4, width: w + 20, height: h + 4 + BASE_H + 14 }}>
      {/* Outer metal frame */}
      <div className="cab-modern-outer" style={{ width: w + 8, height: h + 8 }} />
      <div className="cab-modern-inner-frame" style={{ left: 2, top: 2, width: w + 4, height: h + 4 }} />
      {/* Top board (silver, slight highlight strip) */}
      <div className="cab-modern-top-board" style={{ left: 6, top: 6, width: w + 0, height: TOP_BOARD }} />
      {/* LED strip (decorative — under top board) */}
      <div className="cab-modern-led-bar" style={{ left: 14, top: 6 + TOP_BOARD, width: w - 16 }} />
      {/* Door */}
      <div className="cab-modern-door" style={{ left: 10, top: 6 + TOP_BOARD + 10, width: w, height: h - TOP_BOARD - 32 }}>
        <ModernDoorEmblem />
        {/* Vertical handle (modern minimalist) */}
        <div className="cab-modern-handle" />
      </div>
      {/* Right edge shadow */}
      <div className="cab-3d-right-shadow" style={{ width: 5, top: 6 + TOP_BOARD, height: h - TOP_BOARD - 10 }} />

      {/* Floor base */}
      <div className="cab-modern-base" style={{ left: 0, top: h + 4, width: w + 20, height: BASE_H }} />
      <div className="cab-modern-base-top" style={{ left: 4, top: h + 2, width: w + 12, height: 4 }} />
      {/* 2 thin metal feet */}
      <div className="cab-modern-foot" style={{ left: 36, top: h + 4 + BASE_H }} />
      <div className="cab-modern-foot" style={{ left: w - 16, top: h + 4 + BASE_H }} />
    </div>
  );
}

// 中柜门图案：经典 LEGO 黄色 logo
function ModernDoorEmblem() {
  return (
    <svg className="cab-door-emblem" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
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

      {/* Decorative small bricks top-left and bottom-right */}
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

      {/* Center: LEGO yellow square + red "LEGO" text */}
      <rect x="48" y="68" width="104" height="68" rx="14" fill="url(#lego-yellow)" stroke="#000" strokeWidth="3" />
      <text x="100" y="116" textAnchor="middle" fontFamily="Impact, 'Arial Black', sans-serif" fontSize="38" fontWeight="900" fill="url(#lego-red)" stroke="#000" strokeWidth="1.5">LEGO</text>
    </svg>
  );
}

// ----- 右柜 · 趣味紫木 + 玩具图案门 -----
function PlayfulToyCabinet({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const ARCH_H = 22;
  const BASE_H = 26;
  return (
    <div className="study-cab study-cab-playful" style={{ left: x - 12, top: y - ARCH_H, width: w + 24, height: h + ARCH_H + BASE_H + 12 }}>
      {/* Arched top */}
      <div className="cab-playful-arch" style={{ left: 0, top: 0, width: w + 24, height: ARCH_H + 6 }}>
        <div className="cab-playful-arch-outer" />
        <div className="cab-playful-arch-inner" />
      </div>

      {/* Body */}
      <div className="cab-playful-body" style={{ left: 6, top: ARCH_H, width: w + 12, height: h + 8 }}>
        {/* Top board */}
        <div className="cab-playful-top-board" style={{ width: w + 12, height: 10 }} />
        {/* Door */}
        <div className="cab-playful-door" style={{ left: 4, top: 10, width: w + 4, height: h - 6 }}>
          <PlayfulDoorEmblem />
          <div className="cab-playful-knob" />
        </div>
        {/* Right edge shadow */}
        <div className="cab-3d-right-shadow" style={{ width: 5, top: 10, height: h - 6 }} />
      </div>

      {/* Floor base */}
      <div className="cab-playful-base" style={{ left: 0, top: ARCH_H + h + 8, width: w + 24, height: BASE_H }} />
      <div className="cab-playful-base-top" style={{ left: 4, top: ARCH_H + h + 6, width: w + 16, height: 4 }} />
      {/* 2 round feet */}
      <div className="cab-playful-foot" style={{ left: 10, top: ARCH_H + h + 8 + BASE_H }} />
      <div className="cab-playful-foot" style={{ left: w + 2, top: ARCH_H + h + 8 + BASE_H }} />
    </div>
  );
}

// 右柜门图案：玩具组合（机器人 + 火箭 + 球）
function PlayfulDoorEmblem() {
  return (
    <svg className="cab-door-emblem" viewBox="0 0 200 220" preserveAspectRatio="xMidYMid meet">
      {/* Robot (left) */}
      <g transform="translate(35 60)">
        {/* Head */}
        <rect x="8" y="0" width="36" height="32" rx="6" fill="#E8E8EC" stroke="#3A3A40" strokeWidth="1.5" />
        <rect x="14" y="8" width="8" height="8" rx="1" fill="#4A92E0" />
        <rect x="30" y="8" width="8" height="8" rx="1" fill="#4A92E0" />
        <rect x="20" y="22" width="12" height="3" fill="#3A3A40" />
        {/* Antenna */}
        <line x1="26" y1="0" x2="26" y2="-8" stroke="#3A3A40" strokeWidth="2" />
        <circle cx="26" cy="-10" r="3" fill="#E22D2D" />
        {/* Body */}
        <rect x="4" y="32" width="44" height="38" rx="4" fill="#D2D7E1" stroke="#3A3A40" strokeWidth="1.5" />
        <circle cx="26" cy="48" r="6" fill="#F0C350" stroke="#3A3A40" strokeWidth="1" />
      </g>

      {/* Rocket (right) */}
      <g transform="translate(120 30)">
        <polygon points="22,0 36,30 8,30" fill="#E8E8EC" stroke="#3A3A40" strokeWidth="1.5" />
        <rect x="8" y="30" width="28" height="44" fill="#FFFFFF" stroke="#3A3A40" strokeWidth="1.5" />
        <circle cx="22" cy="46" r="5" fill="#4A92E0" stroke="#3A3A40" strokeWidth="1" />
        {/* Wings */}
        <polygon points="8,74 0,90 8,90" fill="#E22D2D" stroke="#3A3A40" strokeWidth="1" />
        <polygon points="36,74 44,90 36,90" fill="#E22D2D" stroke="#3A3A40" strokeWidth="1" />
        {/* Flame */}
        <polygon points="14,90 30,90 22,108" fill="#FFC83C" />
        <polygon points="18,90 26,90 22,102" fill="#FFFFFF" opacity="0.7" />
      </g>

      {/* Ball (bottom center) */}
      <g transform="translate(80 160)">
        <circle cx="20" cy="20" r="20" fill="#E22D2D" stroke="#3A3A40" strokeWidth="1.5" />
        <path d="M 4 20 Q 20 8 36 20" fill="none" stroke="#3A3A40" strokeWidth="1" />
        <path d="M 4 20 Q 20 32 36 20" fill="none" stroke="#3A3A40" strokeWidth="1" />
      </g>
    </svg>
  );
}

function Plant({ cx, baseY, width, height, children }: { cx: number; baseY: number; width: number; height: number; children: React.ReactNode }) {
  // baseY = pot top y (where the plant "sits" on floor logically).
  // Each SVG has its pot top at different internal y, so we anchor by pot:
  //   Pothos viewBox 0..220, pot top at y≈80 → place wrapper so that 80/220 of wrapper height is at baseY
  //   Monstera viewBox -10..250, pot top at y≈130 → similar but baseline at 140/260
  const isMonstera = (children as React.ReactElement)?.type === MonsteraSVG;
  // ratio of "pot top" within SVG height
  const potTopRatio = isMonstera ? 140 / 260 : 90 / 220;
  return (
    <div
      className="study-plant"
      style={{
        left: cx - width / 2,
        top: baseY - height * potTopRatio,
        width,
        height,
      }}
    >
      {children}
    </div>
  );
}

function ChairFloorShadow() {
  return (
    <div
      className="study-chair-floor-shadow"
      style={{
        left: CHAIR_CX - CHAIR_W / 2 - 16,
        top: DESK_TOP_Y - 18,
        width: CHAIR_W + 32,
        height: 30,
      }}
    />
  );
}

function ChairBack() {
  // M1.1: smaller chair — 300w × 100h
  // Fewer stitches (4 instead of 6), proportional offsets for narrower chair
  return (
    <div
      className="study-chair-back"
      style={{
        left: CHAIR_CX - CHAIR_W / 2,
        top: CHAIR_TOP_Y,
        width: CHAIR_W,
        height: CHAIR_H,
      }}
    >
      <div className="study-chair-inner" />
      <div className="study-chair-headrest" />
      {/* 4 stitches scaled for narrower chair */}
      {[-60, -22, 22, 60].map((offset) => (
        <div
          key={offset}
          className="study-chair-stitch"
          style={{ left: CHAIR_W / 2 + offset, top: 16, height: CHAIR_H - 28 }}
        />
      ))}
      <div className="study-chair-emblem">
        <div className="study-chair-emblem-inner" />
      </div>
    </div>
  );
}

function DeskShadow() {
  return (
    <div
      className="study-desk-shadow"
      style={{
        left: DESK_X1 - 6,
        top: DESK_TOP_Y - 14,
        width: DESK_W + 12,
        height: 18,
      }}
    />
  );
}

function Desk() {
  // M1.1: thicker desk top (50px depth) — "桌面看着宽一些"（Z 轴深度感）
  // Layout (relative to top of desk box):
  //   0-18px:  desk top highlight band (var(--study-desk-top-light))
  //   18-44px: desk top main (var(--study-desk-top))      ← thick top surface
  //   44-50px: desk edge band (var(--study-desk-edge))
  //   50-end:  front panel (var(--study-desk-front))
  return (
    <div className="study-desk study-desk-v2" style={{ left: DESK_X1, top: DESK_TOP_Y, width: DESK_W, height: STAGE_H - DESK_TOP_Y - 60 }}>
      <div className="study-desk-top-lt v2" />
      <div className="study-desk-top v2" />
      <div className="study-desk-top-edge v2" />
      <div className="study-desk-front v2" />
      {/* Wood grain on thick top */}
      <svg className="study-desk-grain v2" viewBox={`0 0 ${DESK_W} 50`} preserveAspectRatio="none">
        {[4, 8, 14, 22, 32, 40].map((y) => (
          <line key={y} x1={6} x2={DESK_W - 6} y1={y} y2={y} stroke="var(--study-desk-grain)" strokeWidth="0.6" opacity="0.5" />
        ))}
      </svg>
      {/* Side end panels (suggest desk has 3D thickness on left/right edges) */}
      <div className="study-desk-side-l" />
      <div className="study-desk-side-r" />
    </div>
  );
}

function DeskItems() {
  // 4 default items: lamp (left), notebook (center-front), globe (right of fatboy), frame (far right)
  return (
    <>
      <DeskLamp />
      <DeskNotebook />
      <DeskGlobe />
      <DeskFrame />
    </>
  );
}

function DeskLamp() {
  // M1.1: moved from 220 → 400 to fit inside new desk (x=320..1280)
  const LX = 400;
  const BY = DESK_TOP_Y + 20;
  return (
    <>
      {/* Glow halo (rendered behind lamp) */}
      <div
        className="study-lamp-glow"
        style={{
          left: LX + 30,
          top: BY - 30,
          width: 200,
          height: 110,
        }}
      />
      <svg
        className="study-desk-item-svg"
        style={{ left: LX - 30, top: BY - 80, width: 160, height: 100 }}
        viewBox="0 0 160 100"
      >
        {/* Base */}
        <ellipse cx="30" cy="86" rx="22" ry="6" fill="rgb(60,60,70)" />
        <ellipse cx="30" cy="80" rx="18" ry="4" fill="rgb(90,90,100)" />
        {/* Arm 1 */}
        <line x1="30" y1="80" x2="65" y2="16" stroke="rgb(60,60,70)" strokeWidth="4" strokeLinecap="round" />
        {/* Joint */}
        <circle cx="65" cy="16" r="4" fill="rgb(40,40,50)" />
        {/* Arm 2 */}
        <line x1="65" y1="16" x2="100" y2="40" stroke="rgb(60,60,70)" strokeWidth="4" strokeLinecap="round" />
        {/* Shade (parallelogram) */}
        <polygon points="100,38 125,20 140,56 115,74" fill="rgb(75,130,95)" />
        {/* Shade highlight */}
        <polygon points="102,40 118,28 120,38 106,50" fill="rgb(115,165,135)" />
      </svg>
    </>
  );
}

function DeskNotebook() {
  // Notebook in front of fatboy, sits on desk top
  const NX = CHAIR_CX - 110;
  const NY = DESK_TOP_Y + 26;
  return (
    <svg
      className="study-desk-item-svg"
      style={{ left: NX - 15, top: NY, width: 250, height: 35 }}
      viewBox="0 0 250 35"
    >
      {/* Notebook trapezoid (perspective) */}
      <polygon points="3,0 247,0 235,28 15,28" fill="rgb(252,248,238)" />
      {/* Spine */}
      <line x1="125" y1="0" x2="125" y2="28" stroke="rgb(210,200,180)" strokeWidth="1" />
      {/* Left page lines */}
      <line x1="9" y1="6" x2="112" y2="6" stroke="rgb(185,175,160)" strokeWidth="0.8" />
      <line x1="9" y1="12" x2="112" y2="12" stroke="rgb(185,175,160)" strokeWidth="0.8" />
      <line x1="9" y1="18" x2="112" y2="18" stroke="rgb(185,175,160)" strokeWidth="0.8" />
      {/* Right page lines (blue, different lengths) */}
      <line x1="138" y1="6" x2="231" y2="6" stroke="rgb(60,100,180)" strokeWidth="0.8" />
      <line x1="138" y1="12" x2="205" y2="12" stroke="rgb(60,100,180)" strokeWidth="0.8" />
      <line x1="138" y1="18" x2="221" y2="18" stroke="rgb(60,100,180)" strokeWidth="0.8" />
      {/* Pencil — yellow rectangle + dark tip + red eraser */}
      <polygon points="105,24 195,14 197,19 107,29" fill="rgb(255,200,60)" />
      <polygon points="105,24 107,29 97,26" fill="rgb(50,30,20)" />
      <rect x="193" y="14" width="8" height="6" fill="rgb(232,117,117)" transform="rotate(-6 193 14)" />
    </svg>
  );
}

function DeskGlobe() {
  // Globe right of fatboy, still within new desk (x=320..1280)
  const GX = CHAIR_CX + 200;  // was +240 → moved in a bit
  const GY = DESK_TOP_Y - 25;
  return (
    <svg
      className="study-desk-item-svg"
      style={{ left: GX - 45, top: GY - 45, width: 90, height: 100 }}
      viewBox="0 0 90 100"
    >
      {/* Wooden base */}
      <rect x="17" y="80" width="56" height="12" fill="rgb(75,55,35)" rx="1" />
      {/* Stand pole */}
      <line x1="45" y1="80" x2="45" y2="70" stroke="rgb(100,75,50)" strokeWidth="3" />
      {/* Gold equator ring */}
      <circle cx="45" cy="42" r="42" fill="none" stroke="var(--acc-gold-dark)" strokeWidth="3" />
      {/* Globe sphere */}
      <circle cx="45" cy="42" r="36" fill="rgb(75,145,215)" />
      {/* Continents */}
      <polygon points="25,20 39,14 53,30 49,48 35,60 21,48 17,34" fill="rgb(120,180,100)" />
      <polygon points="59,17 73,28 69,44" fill="rgb(120,180,100)" />
      {/* Highlight */}
      <ellipse cx="25" cy="28" rx="8" ry="7" fill="rgb(180,220,255)" opacity="0.7" />
    </svg>
  );
}

function DeskFrame() {
  // M1.1: moved from 1380 → 1200 to fit inside new desk (x=320..1280)
  const FX = 1200;
  const FY = DESK_TOP_Y - 25;
  return (
    <svg
      className="study-desk-item-svg"
      style={{ left: FX - 35, top: FY - 40, width: 70, height: 85 }}
      viewBox="0 0 70 85"
    >
      {/* Outer dark wood */}
      <rect x="2" y="2" width="66" height="76" fill="var(--study-wood-dark)" rx="2" />
      {/* Light wood inner */}
      <rect x="5" y="5" width="60" height="70" fill="var(--study-wood-light)" />
      {/* Paper */}
      <rect x="8" y="8" width="54" height="64" fill="var(--study-paper)" />
      {/* Small gold star */}
      <polygon
        points={(() => {
          const cx = 35, cy = 40;
          const pts = [];
          for (let i = 0; i < 10; i++) {
            const ang = (-90 + 36 * i) * Math.PI / 180;
            const r = i % 2 === 0 ? 10 : 4;
            pts.push(`${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`);
          }
          return pts.join(' ');
        })()}
        fill="var(--acc-gold)"
        stroke="var(--acc-gold-dark)"
        strokeWidth="0.5"
      />
    </svg>
  );
}

function TopNav({ onExit }: { onExit: () => void }) {
  return (
    <div className="study-top-nav">
      <button className="study-nav-exit" onClick={onExit}>← 退出</button>
      <h1 className="study-nav-title">肥仔的书房</h1>
      <button className="study-nav-gear" aria-label="设置">
        <svg width="22" height="22" viewBox="0 0 22 22">
          <g fill="none" stroke="var(--study-ink-muted)" strokeWidth="2.5">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => {
              const rad = ang * Math.PI / 180;
              const x1 = 11 + Math.cos(rad) * 6;
              const y1 = 11 + Math.sin(rad) * 6;
              const x2 = 11 + Math.cos(rad) * 10;
              const y2 = 11 + Math.sin(rad) * 10;
              return <line key={ang} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>
          <circle cx="11" cy="11" r="6" fill="var(--study-ink-muted)" stroke="var(--study-ink)" strokeWidth="1" />
          <circle cx="11" cy="11" r="2" fill="var(--study-wall-top)" />
        </svg>
      </button>
    </div>
  );
}

function BottomBar() {
  return (
    <div className="study-bottom-bar">
      <div className="study-points">
        <svg width="22" height="22" viewBox="0 0 22 22">
          <polygon
            points={(() => {
              const pts = [];
              for (let i = 0; i < 10; i++) {
                const ang = (-90 + 36 * i) * Math.PI / 180;
                const r = i % 2 === 0 ? 10 : 5;
                pts.push(`${11 + r * Math.cos(ang)},${11 + r * Math.sin(ang)}`);
              }
              return pts.join(' ');
            })()}
            fill="var(--acc-gold)"
            stroke="var(--acc-gold-dark)"
            strokeWidth="1"
          />
        </svg>
        <span className="study-num">361 积分</span>
      </div>
      <button className="study-shop-btn">
        <svg width="20" height="22" viewBox="0 0 20 22">
          <rect x="1" y="6" width="18" height="14" rx="2" fill="var(--study-ink)" />
          <path d="M 4 6 Q 4 2 10 2 Q 16 2 16 6" fill="none" stroke="var(--study-ink)" strokeWidth="2" />
        </svg>
        装饰商店
      </button>
    </div>
  );
}
