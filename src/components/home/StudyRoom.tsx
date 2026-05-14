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
const DESK_TOP_Y = 870;
const FB_SIZE = 260;
const FB_Y = 600;
const CHAIR_CX = STAGE_W / 2;
const CHAIR_W = 360;
const CHAIR_TOP_Y = 720;
const PAINT_Y = 200;
const PAINT_H = 130;
const P1_W = 210;
const P2_W = 260;
const P3_W = 210;
const P1_X = CAB_L_X + (CAB_L_W - P1_W) / 2;  // 162.5
const P2_X = CAB_M_X + (CAB_M_W - P2_W) / 2;  // 670
const P3_X = CAB_R_X + (CAB_R_W - P3_W) / 2;  // 1227.5
const PLANT_L_CX = 530;
const PLANT_R_CX = 1070;
const PLANT_BASE_Y = FLOOR_LINE_Y + 50;  // 740

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
        <ClassicTrophyCabinet x={CAB_L_X} y={CAB_TOP_Y} w={CAB_L_W} h={CAB_H} />
        <ModernLegoCabinet     x={CAB_M_X} y={CAB_TOP_Y} w={CAB_M_W} h={CAB_H} />
        <PlayfulToyCabinet     x={CAB_R_X} y={CAB_TOP_Y} w={CAB_R_W} h={CAB_H} />

        {/* ====== Layer 15: 2 plants ====== */}
        <Plant cx={PLANT_L_CX} baseY={PLANT_BASE_Y} width={150} height={220}>
          <PothosSVG />
        </Plant>
        <Plant cx={PLANT_R_CX} baseY={PLANT_BASE_Y} width={160} height={260}>
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

// ----- 左柜 · 经典实木 (空骨架 + 9 个空槽位 M1) -----
function ClassicTrophyCabinet({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const PED_H = 24;
  return (
    <div className="study-cab study-cab-classic" style={{ left: x - 14, top: y - 8 - PED_H, width: w + 28, height: h + 8 + PED_H + 22 }}>
      {/* Pediment (decorative top, arch + medallion) */}
      <div className="cab-classic-pediment" style={{ width: w + 28, height: PED_H }} />
      <div className="cab-classic-pediment-inner" style={{ left: 4, top: 2, width: w + 20, height: PED_H - 4 }} />
      {/* Arch */}
      <svg className="cab-classic-arch" viewBox={`0 0 ${w + 28} 30`} style={{ left: 0, top: -6, width: w + 28, height: 30 }} preserveAspectRatio="none">
        <path d={`M ${(w + 28) / 2 - 50} 20 Q ${(w + 28) / 2} -10 ${(w + 28) / 2 + 50} 20`} fill="none" stroke="var(--cab-classic-dark)" strokeWidth="3" />
      </svg>
      {/* Medallion */}
      <div className="cab-classic-medallion" style={{ left: (w + 28) / 2 - 10, top: 2 }} />
      <div className="cab-classic-medallion-inner" style={{ left: (w + 28) / 2 - 6, top: 6 }} />

      {/* Body */}
      <div className="cab-classic-body" style={{ left: 8, top: PED_H + 8 - 8, width: w + 12, height: h + 14 }}>
        <div className="cab-classic-body-frame" style={{ left: 4, top: 4, width: w + 4, height: h + 6 }} />
        <div className="cab-classic-body-inner" style={{ left: 10, top: 8, width: w - 8, height: h - 40 }}>
          {/* Spotlight */}
          <div className="cab-spotlight" />
          {/* Shelves (2 horizontal dividers) */}
          <div className="cab-shelf" style={{ top: `${100 / 3}%` }} />
          <div className="cab-shelf" style={{ top: `${200 / 3}%` }} />
          {/* 9 empty trophy slots (3×3) */}
          <div className="cab-grid cab-grid-3x3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="cab-slot cab-slot-empty">
                <span className="cab-slot-q">?</span>
              </div>
            ))}
          </div>
          {/* Glass divider + brass handles */}
          <div className="cab-classic-glass-divider" />
          <div className="cab-classic-handle cab-classic-handle-l" />
          <div className="cab-classic-handle cab-classic-handle-r" />
          {/* Glass reflections */}
          <div className="cab-glass-reflect cab-glass-reflect-1" />
          <div className="cab-glass-reflect cab-glass-reflect-2" />
        </div>
      </div>

      {/* Bottom plate (gold) */}
      <div className="cab-classic-plate" style={{ left: 22, top: PED_H + h - 30, width: w - 12 }}>
        <span className="cab-plate-text study-num">收藏 0 件</span>
      </div>

      {/* Floor base */}
      <div className="cab-classic-base" style={{ left: 0, top: PED_H + h - 6 + 8, width: w + 28 }} />
      <div className="cab-classic-base-inner" style={{ left: 4, top: PED_H + h - 6 + 10, width: w + 20 }} />
      {/* 2 square feet */}
      <div className="cab-classic-foot" style={{ left: 10, top: PED_H + h + 18 }} />
      <div className="cab-classic-foot" style={{ left: w + 6, top: PED_H + h + 18 }} />
    </div>
  );
}

// ----- 中柜 · 现代银灰 (LED 灯带 + 4×2 槽位) -----
function ModernLegoCabinet({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div className="study-cab study-cab-modern" style={{ left: x - 10, top: y - 4, width: w + 20, height: h + 26 }}>
      {/* Outer frame */}
      <div className="cab-modern-outer" style={{ width: w + 8, height: h + 8 }} />
      <div className="cab-modern-inner-frame" style={{ left: 2, top: 2, width: w + 4, height: h + 4 }} />
      <div className="cab-modern-cavity" style={{ left: 12, top: 12, width: w - 12, height: h - 44 }}>
        {/* LED strip */}
        <div className="cab-modern-led-bar" />
        <div className="cab-modern-led-glow" />
        {/* Shelves (4×2 grid, so 3 dividers) */}
        <div className="cab-modern-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="cab-slot cab-slot-empty cab-modern-slot">
              <span className="cab-slot-q">?</span>
            </div>
          ))}
        </div>
        {/* Big diagonal glass reflection */}
        <div className="cab-glass-reflect cab-modern-glass-reflect" />
      </div>
      {/* Bottom plate */}
      <div className="cab-modern-plate" style={{ left: 18, top: h - 26, width: w - 16 }}>
        <span className="cab-plate-text-dk study-num">收藏 0 件</span>
      </div>
      {/* Floor base */}
      <div className="cab-modern-base" style={{ left: 4, top: h + 6, width: w + 12 }} />
      <div className="cab-modern-base-inner" style={{ left: 8, top: h + 8, width: w + 4 }} />
      {/* 2 thin metal feet */}
      <div className="cab-modern-foot" style={{ left: 36, top: h + 22 }} />
      <div className="cab-modern-foot" style={{ left: w - 16, top: h + 22 }} />
    </div>
  );
}

// ----- 右柜 · 趣味 (弧形顶 + 紫红内衬 + 3×3 槽位 + 圆脚) -----
function PlayfulToyCabinet({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const ARCH_H = 26;
  return (
    <div className="study-cab study-cab-playful" style={{ left: x - 12, top: y - ARCH_H, width: w + 24, height: h + ARCH_H + 26 }}>
      {/* Arch top */}
      <div className="cab-playful-arch" style={{ left: 0, top: 0, width: w + 24, height: ARCH_H + 6 }}>
        <div className="cab-playful-arch-outer" />
        <div className="cab-playful-arch-inner" />
      </div>

      {/* Body */}
      <div className="cab-playful-body" style={{ left: 6, top: ARCH_H, width: w + 12, height: h + 8 }}>
        <div className="cab-playful-body-frame" style={{ left: 4, top: 4, width: w + 4, height: h + 2 }} />
        <div className="cab-playful-body-inner" style={{ left: 12, top: ARCH_H - 8, width: w - 8, height: h - 38 }}>
          {/* Spotlight */}
          <div className="cab-spotlight" />
          {/* Wooden shelves (visible) */}
          <div className="cab-playful-shelf" style={{ top: `${100 / 3}%` }} />
          <div className="cab-playful-shelf" style={{ top: `${200 / 3}%` }} />
          {/* 9 empty slots */}
          <div className="cab-grid cab-grid-3x3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="cab-slot cab-slot-empty">
                <span className="cab-slot-q">?</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom plate (wood) */}
      <div className="cab-playful-plate" style={{ left: 20, top: ARCH_H + h - 30, width: w - 12 }}>
        <span className="cab-plate-text-dk study-num">收藏 0 件</span>
      </div>

      {/* Floor base */}
      <div className="cab-playful-base" style={{ left: 0, top: ARCH_H + h + 4, width: w + 24 }} />
      <div className="cab-playful-base-inner" style={{ left: 4, top: ARCH_H + h + 6, width: w + 16 }} />
      {/* 2 round feet */}
      <div className="cab-playful-foot" style={{ left: 10, top: ARCH_H + h + 20 }} />
      <div className="cab-playful-foot" style={{ left: w + 2, top: ARCH_H + h + 20 }} />
    </div>
  );
}

function Plant({ cx, baseY, width, height, children }: { cx: number; baseY: number; width: number; height: number; children: React.ReactNode }) {
  // Position: cx, baseY is plant POT TOP. SVG viewBox has plant pot top at y ≈ 80 for pothos and 130 for monstera.
  // Wrapper places SVG centered on cx, with bottom-anchored alignment.
  return (
    <div
      className="study-plant"
      style={{
        left: cx - width / 2,
        top: baseY - height + (children && (children as React.ReactElement).type === MonsteraSVG ? 75 : 80),
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
  // 360 × 150, top-y=720
  return (
    <div
      className="study-chair-back"
      style={{
        left: CHAIR_CX - CHAIR_W / 2,
        top: CHAIR_TOP_Y,
        width: CHAIR_W,
        height: DESK_TOP_Y - CHAIR_TOP_Y,  // 150
      }}
    >
      {/* Inner padding (lighter color) */}
      <div className="study-chair-inner" />
      {/* Top headrest band */}
      <div className="study-chair-headrest" />
      {/* 6 vertical stitches at offsets -90, -55, -20, 20, 55, 90 from center */}
      {[-90, -55, -20, 20, 55, 90].map((offset) => (
        <div
          key={offset}
          className="study-chair-stitch"
          style={{ left: CHAIR_W / 2 + offset, top: 22, height: DESK_TOP_Y - CHAIR_TOP_Y - 36 }}
        />
      ))}
      {/* Gold emblem */}
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
        left: 40,
        top: DESK_TOP_Y - 10,
        width: STAGE_W - 80,
        height: 12,
      }}
    />
  );
}

function Desk() {
  return (
    <div className="study-desk" style={{ left: 40, top: DESK_TOP_Y, width: STAGE_W - 80, height: STAGE_H - DESK_TOP_Y - 60 }}>
      {/* Top edge: 0-14 = TOP_LT (#A07050), 12-24 = TOP (#8B5A2B), 22-30 = EDGE (#3E2614) */}
      <div className="study-desk-top-lt" />
      <div className="study-desk-top" />
      <div className="study-desk-top-edge" />
      <div className="study-desk-front" />
      {/* Wood grain horizontal lines */}
      <svg className="study-desk-grain" viewBox={`0 0 ${STAGE_W - 80} 80`} preserveAspectRatio="none">
        {[2, 4, 6, 8, 10, 12].map((y) => (
          <line key={y} x1={0} x2={STAGE_W - 80} y1={y} y2={y} stroke="var(--study-desk-grain)" strokeWidth="0.5" opacity="0.6" />
        ))}
        <line x1={20} x2={STAGE_W - 100} y1={50} y2={50} stroke="var(--study-desk-edge)" strokeWidth="1" opacity="0.4" />
        <line x1={20} x2={STAGE_W - 100} y1={75} y2={75} stroke="var(--study-desk-edge)" strokeWidth="1" opacity="0.4" />
      </svg>
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
  // Python: lamp_x=220, base on DESK_TOP_Y+14 = 884
  const LX = 220;
  const BY = DESK_TOP_Y + 14;
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
  // Python: nb_x = chair_cx - 110 = 690, nb_y = DESK_TOP_Y+26 = 896, w=220, h=28
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
  // Python: globe_cx = chair_cx + 240 = 1040, globe_cy = DESK_TOP_Y - 30 = 840
  const GX = CHAIR_CX + 240;
  const GY = DESK_TOP_Y - 30;
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
  // Python: frame_cx = W - 220 = 1380, frame_cy = DESK_TOP_Y - 25, w=60, h=70
  const FX = STAGE_W - 220;
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
