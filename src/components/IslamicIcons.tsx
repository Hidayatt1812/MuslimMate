/**
 * Islamic SVG Icon Components
 * Custom-drawn icons for MuslimMate using react-native-svg.
 * All icons are original hand-crafted vector paths — no license required.
 *
 * Usage:
 *   <MosqueIcon size={32} color="#10B981" />
 *   <CrescentStarIcon size={24} color="#F59E0B" />
 */

import React from 'react';
import Svg, {
  Path,
  Circle,
  G,
  Rect,
  Line,
  Ellipse,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  secondaryColor?: string;
  style?: object;
}

// ─── Mosque Icon ─────────────────────────────────────────────────────────────
export function MosqueIcon({ size = 24, color = '#10B981', style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/* Left minaret body */}
      <Rect x="2" y="11" width="2.5" height="9" rx="0.3" fill={color} />
      {/* Left minaret cap */}
      <Polygon points="2,11 3.25,7.5 4.5,11" fill={color} />
      {/* Left minaret ball */}
      <Circle cx="3.25" cy="7.2" r="0.7" fill={color} />

      {/* Right minaret body */}
      <Rect x="19.5" y="11" width="2.5" height="9" rx="0.3" fill={color} />
      {/* Right minaret cap */}
      <Polygon points="19.5,11 20.75,7.5 22,11" fill={color} />
      {/* Right minaret ball */}
      <Circle cx="20.75" cy="7.2" r="0.7" fill={color} />

      {/* Main dome + building body */}
      {/* Dome: arc from (5.5,12) to (18.5,12) going upward, radius 6.5 */}
      <Path
        d="M 5.5 12 A 6.5 6.5 0 0 1 18.5 12 L 18.5 20 L 5.5 20 Z"
        fill={color}
      />

      {/* Arched door */}
      <Path
        d="M 10.3 20 L 10.3 16.2 A 1.7 1.7 0 0 1 13.7 16.2 L 13.7 20 Z"
        fill="none"
        stroke="white"
        strokeWidth="0.6"
        opacity={0.7}
      />

      {/* Two windows */}
      <Circle cx="8" cy="15" r="1" fill="none" stroke="white" strokeWidth="0.5" opacity={0.6} />
      <Circle cx="16" cy="15" r="1" fill="none" stroke="white" strokeWidth="0.5" opacity={0.6} />

      {/* Crescent on top of dome */}
      {/* Outer circle center≈(12,5.5) r=2, inner offset right */}
      <Path
        d="M 13.8 3.8 A 2.2 2.2 0 1 0 13.8 7.2 A 1.5 1.5 0 0 1 13.8 3.8 Z"
        fill={color}
      />

      {/* Base line */}
      <Line x1="1" y1="20" x2="23" y2="20" stroke={color} strokeWidth="0.8" opacity={0.4} />
    </Svg>
  );
}

// ─── Crescent + Star Icon ─────────────────────────────────────────────────────
export function CrescentStarIcon({ size = 24, color = '#10B981', style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/*
        Crescent moon (left portion of canvas)
        Outer: center(9,12) r=8.5 → top=(9,3.5) bottom=(9,20.5)
        Inner: center(12,12) r=6.5
        Intersection x: 6x=(8.5²-6.5²)/(2*(12-9))... let me use approximation
        Points ≈ (15.5, 5.8) and (15.5, 18.2)
      */}
      <Path
        d="M 15.5 5.8 A 8.5 8.5 0 1 0 15.5 18.2 A 6.5 6.5 0 0 1 15.5 5.8 Z"
        fill={color}
      />

      {/*
        5-pointed star — center (20.5, 9.5), outer r=3, inner r=1.2
        Outer points:
          top:        (20.5, 6.5)
          upper-right:(23.35, 8.57)
          lower-right:(22.26, 11.93)
          lower-left: (18.74, 11.93)
          upper-left: (17.65, 8.57)
        Inner points:
          (21.21, 8.54)
          (21.64, 9.87)
          (20.5,  10.7)
          (19.36, 9.87)
          (19.79, 8.54)
      */}
      <Path
        d="M 20.5 6.5 L 21.21 8.54 L 23.35 8.57 L 21.64 9.87 L 22.26 11.93 L 20.5 10.7 L 18.74 11.93 L 19.36 9.87 L 17.65 8.57 L 19.79 8.54 Z"
        fill={color}
      />
    </Svg>
  );
}

// ─── Quran / Open Book Icon ───────────────────────────────────────────────────
export function QuranIcon({ size = 24, color = '#10B981', style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/* Left page */}
      <Path
        d="M 2 6.5 Q 2 5 3.5 5 L 11.5 5 L 11.5 19 L 3.5 19 Q 2 19 2 17.5 Z"
        fill={color}
        opacity={0.9}
      />
      {/* Right page */}
      <Path
        d="M 12.5 5 L 20.5 5 Q 22 5 22 6.5 L 22 17.5 Q 22 19 20.5 19 L 12.5 19 Z"
        fill={color}
      />
      {/* Spine */}
      <Rect x="11.3" y="4.5" width="1.4" height="15" rx="0.5" fill={color} />

      {/* Text lines on left page */}
      <Line x1="4.5" y1="9"  x2="10" y2="9"  stroke="white" strokeWidth="0.7" opacity={0.5} strokeLinecap="round" />
      <Line x1="4.5" y1="11" x2="10" y2="11" stroke="white" strokeWidth="0.7" opacity={0.5} strokeLinecap="round" />
      <Line x1="4.5" y1="13" x2="10" y2="13" stroke="white" strokeWidth="0.7" opacity={0.5} strokeLinecap="round" />
      <Line x1="4.5" y1="15" x2="8"  y2="15" stroke="white" strokeWidth="0.7" opacity={0.5} strokeLinecap="round" />

      {/* Text lines on right page */}
      <Line x1="14" y1="9"  x2="19.5" y2="9"  stroke="white" strokeWidth="0.7" opacity={0.5} strokeLinecap="round" />
      <Line x1="14" y1="11" x2="19.5" y2="11" stroke="white" strokeWidth="0.7" opacity={0.5} strokeLinecap="round" />
      <Line x1="14" y1="13" x2="19.5" y2="13" stroke="white" strokeWidth="0.7" opacity={0.5} strokeLinecap="round" />
      <Line x1="14" y1="15" x2="17.5" y2="15" stroke="white" strokeWidth="0.7" opacity={0.5} strokeLinecap="round" />

      {/* Decorative bismillah dot (top center of each page) */}
      <Circle cx="7"  cy="7" r="0.6" fill="white" opacity={0.6} />
      <Circle cx="17" cy="7" r="0.6" fill="white" opacity={0.6} />
    </Svg>
  );
}

// ─── Kaaba Icon (for Qibla) ───────────────────────────────────────────────────
export function KaabaIcon({ size = 24, color = '#10B981', style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/* Front face */}
      <Rect x="5" y="9" width="11" height="12" rx="0.5" fill={color} />
      {/* Top face (perspective) */}
      <Path d="M 5 9 L 9.5 5 L 20.5 5 L 16 9 Z" fill={color} opacity={0.75} />
      {/* Right face (perspective) */}
      <Path d="M 16 9 L 20.5 5 L 20.5 17 L 16 21 Z" fill={color} opacity={0.6} />

      {/* Kiswah stripe (gold band) */}
      <Rect x="5" y="12.5" width="11" height="1.8" fill="white" opacity={0.25} />

      {/* Door (arched) */}
      <Path
        d="M 8.5 21 L 8.5 16.5 A 2 2 0 0 1 12.5 16.5 L 12.5 21 Z"
        fill="none"
        stroke="white"
        strokeWidth="0.6"
        opacity={0.5}
      />

      {/* Corner pillar highlights */}
      <Line x1="5"  y1="9"  x2="5"  y2="21" stroke="white" strokeWidth="0.4" opacity={0.3} />
      <Line x1="16" y1="9"  x2="16" y2="21" stroke="white" strokeWidth="0.4" opacity={0.3} />
    </Svg>
  );
}

// ─── Compass / Qibla Icon ─────────────────────────────────────────────────────
export function CompassIcon({ size = 24, color = '#10B981', style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/* Outer ring */}
      <Circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.2" />
      {/* Inner ring (decorative) */}
      <Circle cx="12" cy="12" r="7.5" fill="none" stroke={color} strokeWidth="0.4" opacity={0.4} />

      {/* North needle (pointing up = Qibla direction) */}
      <Path d="M 12 3.5 L 10.2 11 L 12 9.5 L 13.8 11 Z" fill={color} />
      {/* South needle */}
      <Path d="M 12 20.5 L 10.2 13 L 12 14.5 L 13.8 13 Z" fill={color} opacity={0.35} />

      {/* Center circle */}
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Circle cx="12" cy="12" r="0.6" fill="white" opacity={0.8} />

      {/* Cardinal tick marks */}
      <Line x1="12" y1="2"  x2="12" y2="3.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <Line x1="12" y1="20.5" x2="12" y2="22" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity={0.5} />
      <Line x1="2"  y1="12" x2="3.5" y2="12" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity={0.5} />
      <Line x1="20.5" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity={0.5} />

      {/* Small Kaaba symbol at top (Qibla indicator) */}
      <Rect x="10.8" y="1" width="2.4" height="2" rx="0.3" fill={color} />
    </Svg>
  );
}

// ─── Tasbih / Dhikr Icon ─────────────────────────────────────────────────────
export function TasbihIcon({ size = 24, color = '#10B981', style }: IconProps) {
  // 11 beads arranged in a circle, radius=8, centered at (12,12)
  const cx = 12;
  const cy = 12;
  const ringR = 7.8;
  const beadR = 1.1;
  const count = 11;
  const beads = Array.from({ length: count }, (_, i) => {
    const angle = (i * (2 * Math.PI)) / count - Math.PI / 2;
    return {
      x: cx + ringR * Math.cos(angle),
      y: cy + ringR * Math.sin(angle),
    };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/* Connecting ring (dashed) */}
      <Circle
        cx={cx}
        cy={cy}
        r={ringR}
        fill="none"
        stroke={color}
        strokeWidth="0.4"
        opacity={0.3}
        strokeDasharray="1.5 1"
      />

      {/* Beads */}
      {beads.map((b, i) => (
        <Circle
          key={i}
          cx={b.x}
          cy={b.y}
          r={beadR}
          fill={i === 0 ? 'white' : color}
          stroke={i === 0 ? color : 'none'}
          strokeWidth={i === 0 ? '0.5' : '0'}
          opacity={i === 0 ? 1 : 0.85 - i * 0.03}
        />
      ))}

      {/* Handle / tassel at marker bead (bead 0 = top) */}
      <Line
        x1={beads[0].x}
        y1={beads[0].y - beadR}
        x2={beads[0].x}
        y2={beads[0].y - beadR - 2.5}
        stroke={color}
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <Circle cx={beads[0].x} cy={beads[0].y - beadR - 3.2} r="0.7" fill={color} />

      {/* Center decoration */}
      <Circle cx={cx} cy={cy} r="1.2" fill={color} opacity={0.2} />
    </Svg>
  );
}

// ─── Prayer / Tracker Icon ────────────────────────────────────────────────────
export function PrayerTrackerIcon({ size = 24, color = '#10B981', style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/* Prayer mat outline */}
      <Rect x="3" y="8" width="18" height="13" rx="1.5" fill={color} opacity={0.15} stroke={color} strokeWidth="1" />
      {/* Arch / mihrab design on mat */}
      <Path
        d="M 8 21 L 8 14 A 4 4 0 0 1 16 14 L 16 21"
        fill={color}
        opacity={0.25}
      />
      <Path
        d="M 8 14 A 4 4 0 0 1 16 14"
        fill="none"
        stroke={color}
        strokeWidth="1"
      />

      {/* Checkmark overlay (tracker element) */}
      <Path
        d="M 9.5 15 L 11.5 17 L 15 13"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Top fringe lines */}
      <Line x1="5"  y1="8" x2="5"  y2="6" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity={0.6} />
      <Line x1="8"  y1="8" x2="8"  y2="6" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity={0.6} />
      <Line x1="11" y1="8" x2="11" y2="6" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity={0.6} />
      <Line x1="14" y1="8" x2="14" y2="6" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity={0.6} />
      <Line x1="17" y1="8" x2="17" y2="6" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity={0.6} />
      <Line x1="20" y1="8" x2="20" y2="6" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity={0.6} />
    </Svg>
  );
}

// ─── Ramadan / Moon Icon ──────────────────────────────────────────────────────
export function RamadanIcon({ size = 24, color = '#F59E0B', style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/*
        Large crescent moon centered in frame
        Outer: center(11,12) r=9
        Inner: center(14,12) r=7
        Intersections ≈ (17.2, 5.5) and (17.2, 18.5)
      */}
      <Path
        d="M 17.2 5.5 A 9 9 0 1 0 17.2 18.5 A 7 7 0 0 1 17.2 5.5 Z"
        fill={color}
      />

      {/* Stars around the moon */}
      {/* Small star top-right */}
      <Path
        d="M 20 4 L 20.5 5.5 L 22 5.5 L 20.8 6.5 L 21.3 8 L 20 7.1 L 18.7 8 L 19.2 6.5 L 18 5.5 L 19.5 5.5 Z"
        fill={color}
        opacity={0.7}
      />
      {/* Tiny star bottom-right */}
      <Path
        d="M 21 14 L 21.3 15 L 22.3 15 L 21.5 15.6 L 21.8 16.6 L 21 16 L 20.2 16.6 L 20.5 15.6 L 19.7 15 L 20.7 15 Z"
        fill={color}
        opacity={0.5}
      />
    </Svg>
  );
}

// ─── Tahfidz / Memorization Icon ─────────────────────────────────────────────
export function TahfidzIcon({ size = 24, color = '#8B5CF6', style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/* Book/scroll */}
      <Rect x="4" y="3" width="13" height="17" rx="1.5" fill={color} opacity={0.15} stroke={color} strokeWidth="1" />
      {/* Scroll roll on left */}
      <Ellipse cx="4" cy="11.5" rx="1.5" ry="8.5" fill={color} opacity={0.5} />
      <Ellipse cx="4" cy="11.5" rx="0.8" ry="8.5" fill={color} />

      {/* Text lines (content) */}
      <Line x1="7.5" y1="7"  x2="15" y2="7"  stroke={color} strokeWidth="0.9" strokeLinecap="round" />
      <Line x1="7.5" y1="10" x2="15" y2="10" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
      <Line x1="7.5" y1="13" x2="15" y2="13" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
      <Line x1="7.5" y1="16" x2="12" y2="16" stroke={color} strokeWidth="0.9" strokeLinecap="round" />

      {/* Brain/memory indicator (star) top right corner */}
      <Path
        d="M 18 3 L 18.6 4.8 L 20.5 4.8 L 19 5.9 L 19.6 7.7 L 18 6.5 L 16.4 7.7 L 17 5.9 L 15.5 4.8 L 17.4 4.8 Z"
        fill={color}
      />
    </Svg>
  );
}

// ─── AI / Sparkle Icon ───────────────────────────────────────────────────────
export function AISparkleIcon({ size = 24, color = '#06B6D4', style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {/* Main sparkle (4-pointed star) */}
      <Path
        d="M 12 2 L 13.2 10.8 L 22 12 L 13.2 13.2 L 12 22 L 10.8 13.2 L 2 12 L 10.8 10.8 Z"
        fill={color}
      />
      {/* Small sparkles */}
      <Path
        d="M 19 4 L 19.5 6 L 21.5 6.5 L 19.5 7 L 19 9 L 18.5 7 L 16.5 6.5 L 18.5 6 Z"
        fill={color}
        opacity={0.7}
      />
      <Path
        d="M 5 15 L 5.35 16.3 L 6.65 16.65 L 5.35 17 L 5 18.3 L 4.65 17 L 3.35 16.65 L 4.65 16.3 Z"
        fill={color}
        opacity={0.6}
      />
    </Svg>
  );
}

// ─── MuslimMate App Logo ──────────────────────────────────────────────────────
// Larger, detailed logo for splash screen, about page, headers.
export function MuslimMateLogo({
  size = 80,
  color = '#10B981',
  secondaryColor = '#F59E0B',
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" style={style}>
      {/* Background circle */}
      <Circle cx="40" cy="40" r="38" fill={color} opacity={0.12} />
      <Circle cx="40" cy="40" r="32" fill={color} opacity={0.08} />

      {/* ── Mosque ── */}
      {/* Left minaret */}
      <Rect x="8"  y="38" width="7" height="26" rx="1" fill={color} />
      <Polygon points="8,38 11.5,28 15,38" fill={color} />
      <Circle cx="11.5" cy="27" r="2" fill={color} />

      {/* Right minaret */}
      <Rect x="65" y="38" width="7" height="26" rx="1" fill={color} />
      <Polygon points="65,38 68.5,28 72,38" fill={color} />
      <Circle cx="68.5" cy="27" r="2" fill={color} />

      {/* Main dome + building */}
      <Path
        d="M 17 40 A 23 23 0 0 1 63 40 L 63 64 L 17 64 Z"
        fill={color}
      />

      {/* Door arch */}
      <Path
        d="M 33 64 L 33 53 A 7 7 0 0 1 47 53 L 47 64 Z"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        opacity={0.5}
      />

      {/* Windows */}
      <Circle cx="26" cy="52" r="3" fill="none" stroke="white" strokeWidth="1" opacity={0.4} />
      <Circle cx="54" cy="52" r="3" fill="none" stroke="white" strokeWidth="1" opacity={0.4} />

      {/* Kiswah band on building */}
      <Rect x="17" y="47" width="46" height="3.5" fill="white" opacity={0.1} />

      {/* ── Crescent + Star on dome top ── */}
      {/*
        Crescent: outer center≈(38,17) r=8, inner center≈(41,17) r=6.2
        Intersection x ≈ (r²_outer - r²_inner)/(2*dx) + center_x_outer
                       = (64-38.44)/(2*3) + 38 = 25.56/6 + 38 ≈ 42.26
        y ≈ ±sqrt(64-(42.26-38)²) ≈ ±sqrt(64-18.15) ≈ ±6.77
        Points ≈ (42.3, 10.2) and (42.3, 23.8)
      */}
      <Path
        d="M 42.3 10.2 A 8 8 0 1 0 42.3 23.8 A 6.2 6.2 0 0 1 42.3 10.2 Z"
        fill={secondaryColor}
      />

      {/*
        Star: center(48,14) outer r=4.5 inner r=1.8
        Outer points (angle=-90+i*72, r=4.5):
          (48, 9.5)
          (52.28, 12.11)
          (50.62, 17.3)
          (45.38, 17.3)
          (43.72, 12.11)
        Inner (angle=-54+i*72, r=1.8):
          (49.06, 12.04)
          (49.71, 13.56)
          (48, 14.8)
          (46.29, 13.56)
          (46.94, 12.04)
      */}
      <Path
        d="M 48 9.5 L 49.06 12.04 L 52.28 12.11 L 49.71 13.56 L 50.62 17.3 L 48 14.8 L 45.38 17.3 L 46.29 13.56 L 43.72 12.11 L 46.94 12.04 Z"
        fill={secondaryColor}
      />

      {/* Base line */}
      <Line x1="4" y1="64" x2="76" y2="64" stroke={color} strokeWidth="1.5" opacity={0.3} strokeLinecap="round" />
    </Svg>
  );
}
