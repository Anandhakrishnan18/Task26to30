"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Clock,
  Star,
  Maximize2,
  Minimize2,
  HelpCircle,
  Recycle,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Truck,
  Leaf,
} from "lucide-react";
import { useLabAudio } from "@/hooks/useLabAudio";
import { useLMSBridge } from "@/hooks/useLMSBridge";

// ═════════════════════════════════════════════════════════════════════════════
// 1. GAME STATE ENUMS & TYPES
// ═════════════════════════════════════════════════════════════════════════════

export type ActiveScene = "NEIGHBOURHOOD" | "HOSPITAL" | "FACILITY";

export type GamePhase =
  // ── SCENE 1: RESIDENTIAL NEIGHBOURHOOD ──
  | "W1_EMERGE"           // Woman 1 (Sarah) walks out of house carrying 2 bags
  | "W1_SELECT_BAG"       // User selects Dry or Sanitary bag
  | "W1_SELECT_BIN"       // User selects correct bin (Dry -> Blue, Sanitary -> Yellow)
  | "W1_BROOM_PROMPT"     // Woman 1 walks to tree area; prompt to pick up broom
  | "W1_SWEEPING"         // Sweeping leaves into pile (~2s animation)
  | "W1_TRAY_PROMPT"      // Prompt to click collection tray
  | "W1_COLLECT_TRAY"     // Collects leaves into tray & walks to Green bin
  | "W1_GREEN_DISPOSE"    // User clicks Green bin to empty garden waste
  | "W1_RETURN"           // Woman 1 walks back into house
  | "W2_EMERGE"           // Woman 2 (Priya) walks out carrying Dry & Hazardous bags
  | "W2_SELECT_BAG"       // User selects bag
  | "W2_SELECT_BIN"       // User selects bin (Dry -> Blue, Haz -> Red)
  | "W2_RETURN"           // Woman 2 walks back into house
  | "TRUCK1_ENTER"        // Special care truck enters road from left
  | "TRUCK1_PROMPT"       // Prompt: "Click the red bin to collect special-care waste!"
  | "TRUCK1_COLLECTING"   // Workers dismount, empty red bin into truck, return bin
  | "TRUCK1_EXIT"         // Truck drives away to right -> Scene 2 transition

  // ── SCENE 2: HOSPITAL ENVIRONMENT ──
  | "HOSPITAL_INIT"       // Camera / hospital environment active
  | "CLEANER_EMERGE"      // Cleaner (Ravi) walks out carrying 2 hospital bags
  | "CLEANER_SELECT_BAG"  // User selects bag
  | "CLEANER_SELECT_BIN"  // User selects bin (Yellow -> Yellow, Red -> Red)
  | "CLEANER_RETURN"      // Cleaner walks back inside hospital
  | "TRUCK2_ENTER"        // Same yellow truck arrives at hospital driveway
  | "TRUCK2_PROMPT_YEL"   // Backward compatibility
  | "TRUCK2_COLLECT_YEL"  // Backward compatibility
  | "TRUCK2_PROMPT_RED"   // "Click the red bin to collect special-care waste!" (RED BIN ONLY)
  | "TRUCK2_COLLECT_RED"  // Workers collect red bin ONLY
  | "TRUCK2_EXIT"         // Truck leaves hospital -> Scene 3 transition

  // ── SCENE 3: HAZARDOUS WASTE FACILITY ──
  | "FACILITY_INIT"       // Industrial facility environment active
  | "FACILITY_ARRIVE"     // Truck enters compound through gate and stops near tub
  | "TRUCK3_ARRIVE"       // Alias for truck arrival
  | "FACILITY_UNLOAD_PROMPT" // "Click the tub to unload the waste!"
  | "FACILITY_UNLOADING"  // Compactor tilts, waste transferred into collection tub
  | "FACILITY_COMPLETE"   // Final celebration animation
  | "RESULT";             // Result & Learning page

export type BinColor = "GREEN" | "BLUE" | "YELLOW" | "RED";

export interface WasteBagData {
  id: string;
  label: string;
  category: "WET" | "DRY" | "SANITARY" | "HAZARDOUS";
  correctBin: BinColor;
  color: string;
  textColor: string;
  hand: "left" | "right";
  isDisposed: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. COMIC-STYLE 3D SPEECH BUBBLE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

interface SpeechBubbleProps {
  text: string;
  position?: [number, number, number];
  isAlert?: boolean;
}

function SpeechBubble({ text, position = [0, 2.2, 0], isAlert = false }: SpeechBubbleProps) {
  return (
    <Html position={position} center pointerEvents="none">
      <div className="relative animate-in fade-in zoom-in-90 duration-200 select-none flex flex-col items-center">
        <div
          className={`border-2 font-black text-xs sm:text-sm px-3.5 py-2 rounded-2xl shadow-xl whitespace-nowrap flex items-center gap-1.5 tracking-tight ${
            isAlert
              ? "bg-[#FEF2F2] border-red-500 text-red-700"
              : "bg-[#FEFDF8] border-[#58B86A] text-[#24452D]"
          }`}
        >
          {isAlert && <AlertCircle size={14} className="text-red-500 shrink-0" />}
          <span>{text}</span>
        </div>
        {/* Downward pointing tail pointing towards object/character */}
        <div
          className={`w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] -mt-[1px] ${
            isAlert ? "border-t-red-500" : "border-t-[#58B86A]"
          }`}
        />
        <div
          className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] -mt-[8px] ${
            isAlert ? "border-t-[#FEF2F2]" : "border-t-[#FEFDF8]"
          }`}
        />
      </div>
    </Html>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. CANVAS TEXTURE GENERATOR FOR HIGH-CONTRAST DUSTBIN LABELS
// (Physically mapped to 3D mesh surface: 0% overflow, 0% floating, 0% clipping)
// ═════════════════════════════════════════════════════════════════════════════

const labelTextureCache = new Map<string, THREE.CanvasTexture>();

function getBinLabelTexture(
  label: string,
  bgColor: string,
  textColor: string = "#ffffff"
): THREE.CanvasTexture {
  const key = `${label}_${bgColor}_${textColor}`;
  const cached = labelTextureCache.get(key);
  if (cached) return cached;
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture(new Image() as any);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Fill background plate with rich dark contrasting tone
    ctx.fillStyle = bgColor;
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 496, 240, 32);
    } else {
      ctx.rect(8, 8, 496, 240);
    }
    ctx.fill();

    // Crisp bright border
    ctx.lineWidth = 14;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.stroke();

    // High contrast, bold, clean typography
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const words = label.split(" ");
    if (words.length === 2) {
      ctx.font = "900 56px system-ui, -apple-system, sans-serif";
      ctx.fillText(words[0], 256, 92);
      ctx.fillText(words[1], 256, 168);
    } else if (words.length >= 3) {
      ctx.font = "900 46px system-ui, -apple-system, sans-serif";
      ctx.fillText(words[0] + " " + words[1], 256, 92);
      ctx.fillText(words.slice(2).join(" "), 256, 168);
    } else {
      ctx.font = "900 58px system-ui, -apple-system, sans-serif";
      ctx.fillText(label, 256, 128);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  labelTextureCache.set(key, texture);
  return texture;
}

// ═════════════════════════════════════════════════════════════════════════════
// 3B. 3D WASTE BINS (MEDIUM SIZED, TEXTURE LABELS ON SURFACE)
// ═════════════════════════════════════════════════════════════════════════════

interface WasteBinProps {
  colorType: BinColor;
  position: [number, number, number];
  rotation?: [number, number, number];
  isClickable: boolean;
  isTargeted?: boolean;
  onClick: () => void;
}

function WasteBin({
  colorType,
  position,
  rotation = [0, 0, 0],
  isClickable,
  isTargeted = false,
  onClick,
}: WasteBinProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && isTargeted) {
      const s = 1 + Math.sin(state.clock.getElapsedTime() * 6) * 0.04;
      groupRef.current.scale.set(s, s, s);
    } else if (groupRef.current) {
      groupRef.current.scale.set(1, 1, 1);
    }
  });

  const binInfo = {
    GREEN: {
      color: "#16a34a",
      darkColor: "#14532d",
      lidColor: "#0f3e22",
      label: "WET WASTE",
    },
    BLUE: {
      color: "#2563eb",
      darkColor: "#1e3a8a",
      lidColor: "#172554",
      label: "DRY WASTE",
    },
    YELLOW: {
      color: "#eab308",
      darkColor: "#854d0e",
      lidColor: "#713f12",
      label: "SANITARY WASTE",
    },
    RED: {
      color: "#dc2626",
      darkColor: "#7f1d1d",
      lidColor: "#450a0a",
      label: "SPECIAL CARE WASTE",
    },
  }[colorType];

  const labelTexture = React.useMemo(() => {
    return getBinLabelTexture(binInfo.label, binInfo.darkColor, "#ffffff");
  }, [binInfo.label, binInfo.darkColor]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Bin Body (Tapered rectangular container, height ~0.94m) */}
      <mesh position={[0, 0.48, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.25, 0.94, 4]} />
        <meshStandardMaterial color={binInfo.color} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Front Face Colored Label Plate (Mapped directly onto 3D Mesh - 0% overflow, 0% floating) */}
      <mesh position={[0, 0.52, 0.22]} castShadow>
        <planeGeometry args={[0.38, 0.22]} />
        <meshStandardMaterial map={labelTexture} roughness={0.4} />
      </mesh>

      {/* Hinged Top Lid & Handle */}
      <group position={[0, 0.96, 0]}>
        <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
          <cylinderGeometry args={[0.33, 0.32, 0.09, 4]} />
          <meshStandardMaterial color={binInfo.lidColor} roughness={0.5} />
        </mesh>
        {/* Lid Handle */}
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[0.22, 0.04, 0.06]} />
          <meshStandardMaterial color="#334155" roughness={0.4} />
        </mesh>
      </group>

      {/* Wheels & Rear Axle at Base */}
      <group position={[0, 0.08, -0.18]}>
        <mesh position={[-0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 14]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
        <mesh position={[0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 14]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 0.52, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
      </group>

      {/* Invisible Clickable Hit Cylinder */}
      {isClickable && (
        <mesh
          position={[0, 0.5, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <cylinderGeometry args={[0.46, 0.46, 1.1, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. CLICKABLE 3D WASTE BAG (COLOR CODED WITHOUT FLOATING TEXT LABELS)
// ═════════════════════════════════════════════════════════════════════════════

interface WasteBagProps {
  data: WasteBagData;
  position: [number, number, number];
  isSelectable: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

function WasteBag({ data, position, isSelectable, isSelected = false, onClick }: WasteBagProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && isSelected) {
      const s = 1.05 + Math.sin(state.clock.getElapsedTime() * 8) * 0.05;
      groupRef.current.scale.set(s, s, s);
    } else if (groupRef.current) {
      groupRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Top Handle Loop (Connected directly to woman's hand) */}
      <mesh position={[0, 0.04, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.045, 0.012, 8, 16, Math.PI]} />
        <meshStandardMaterial color={data.color} roughness={0.5} />
      </mesh>

      {/* Tied Top Neck */}
      <mesh position={[0, -0.02, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.07, 0.07, 10]} />
        <meshStandardMaterial color={data.color} roughness={0.6} />
      </mesh>

      {/* Tied Knot Ruffle */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <coneGeometry args={[0.075, 0.06, 8]} />
        <meshStandardMaterial color={data.color} roughness={0.6} />
      </mesh>

      {/* Main Bag Body - Large, Puffy, Distinctly Colored (NO TEXT LABEL) */}
      <mesh position={[0, -0.22, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.18, 16, 16]} scale={[1.0, 1.65, 0.95]} />
        <meshStandardMaterial
          color={data.color}
          roughness={0.45}
          metalness={0.08}
          emissive={isSelected ? data.color : "#000000"}
          emissiveIntensity={isSelected ? 0.35 : 0}
        />
      </mesh>

      {/* Invisible Clickable Hit Mesh */}
      {isSelectable && (
        <mesh
          position={[0, -0.15, 0]}
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[0.3, 10, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5A. HOUSE 1: EUROPEAN COTTAGE (Ref Image 1: media_1795144584712_7f539349.jpg)
// ═════════════════════════════════════════════════════════════════════════════

function House1Cottage() {
  return (
    <group position={[-3.5, 0, -4.0]}>
      {/* ── Stone Foundation Plinth ── */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 0.3, 3.4]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </mesh>

      {/* ── Main White Stucco Body (Ground & Half-story) ── */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 2.4, 3.2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>

      {/* ── Front Gable Triangular Wall (White Stucco) ── */}
      <mesh position={[0, 3.1, 0.1]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2.3, 1.6, 4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>

      {/* ── Pitched Terracotta Tile Gabled Roof ── */}
      {/* Left Roof Slope */}
      <mesh position={[-1.0, 3.2, 0]} rotation={[0, 0, 0.72]} castShadow>
        <boxGeometry args={[2.5, 0.14, 3.6]} />
        <meshStandardMaterial color="#ea580c" roughness={0.65} />
      </mesh>
      {/* Right Roof Slope */}
      <mesh position={[1.0, 3.2, 0]} rotation={[0, 0, -0.72]} castShadow>
        <boxGeometry args={[2.5, 0.14, 3.6]} />
        <meshStandardMaterial color="#ea580c" roughness={0.65} />
      </mesh>
      {/* Roof Ridge Cap */}
      <mesh position={[0, 4.05, 0]} castShadow>
        <boxGeometry args={[0.22, 0.12, 3.64]} />
        <meshStandardMaterial color="#c2410c" roughness={0.6} />
      </mesh>

      {/* ── Roof Dormer Window on Left Side (Ref 1) ── */}
      <group position={[-1.0, 3.0, 0.6]}>
        {/* Dormer Walls */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.7, 0.7, 0.9]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {/* Dormer Roof Left Slope */}
        <mesh position={[-0.22, 0.45, 0]} rotation={[0, 0, 0.65]} castShadow>
          <boxGeometry args={[0.55, 0.08, 1.0]} />
          <meshStandardMaterial color="#ea580c" />
        </mesh>
        {/* Dormer Roof Right Slope */}
        <mesh position={[0.22, 0.45, 0]} rotation={[0, 0, -0.65]} castShadow>
          <boxGeometry args={[0.55, 0.08, 1.0]} />
          <meshStandardMaterial color="#ea580c" />
        </mesh>
        {/* Dormer Window Front Face */}
        <mesh position={[0, 0, 0.46]}>
          <planeGeometry args={[0.42, 0.42]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.47]}>
          <boxGeometry args={[0.46, 0.46, 0.02]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* ── Tall Masonry Chimney on Rear Right (Ref 1) ── */}
      <group position={[1.3, 3.2, -0.9]}>
        <mesh castShadow>
          <boxGeometry args={[0.65, 2.8, 0.65]} />
          <meshStandardMaterial color="#475569" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.45, 0]}>
          <boxGeometry args={[0.75, 0.12, 0.75]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.16, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* ── Upper Story Arched Window (Ref 1 Center) ── */}
      <group position={[0.3, 2.65, 1.62]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[0.6, 0.8]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.4, 0.01]}>
          <circleGeometry args={[0.3, 16, 0, Math.PI]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.68, 0.88, 0.03]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.6, 0.03, 0.01]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.03, 0.8, 0.01]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* ── Ground Floor Front Door & Canopy Overhang (Ref 1) ── */}
      <group position={[0.4, 0, 1.62]}>
        {/* Stone Step */}
        <mesh position={[0, 0.1, 0.25]} receiveShadow>
          <boxGeometry args={[1.2, 0.2, 0.5]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.9} />
        </mesh>
        {/* Dark Wooden Door */}
        <mesh position={[0, 1.05, 0.01]} castShadow>
          <boxGeometry args={[0.82, 1.7, 0.06]} />
          <meshStandardMaterial color="#451a03" roughness={0.6} />
        </mesh>
        {/* Door Panels */}
        <mesh position={[0, 1.35, 0.04]}>
          <boxGeometry args={[0.64, 0.6, 0.02]} />
          <meshStandardMaterial color="#301502" />
        </mesh>
        <mesh position={[0, 0.65, 0.04]}>
          <boxGeometry args={[0.64, 0.6, 0.02]} />
          <meshStandardMaterial color="#301502" />
        </mesh>
        {/* Brass Doorknob */}
        <mesh position={[0.3, 1.0, 0.06]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} />
        </mesh>

        {/* Terracotta Canopy Porch Overhang */}
        <mesh position={[0, 2.05, 0.4]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[1.3, 0.08, 0.8]} />
          <meshStandardMaterial color="#ea580c" roughness={0.6} />
        </mesh>
        {/* Canopy Wooden Brackets */}
        {[-0.55, 0.55].map((bx, bi) => (
          <mesh key={`canopy-brk-${bi}`} position={[bx, 1.85, 0.25]} rotation={[0.45, 0, 0]}>
            <boxGeometry args={[0.06, 0.45, 0.06]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        ))}
      </group>

      {/* ── Ground Floor Windows (Left & Right) ── */}
      <group position={[-1.0, 1.15, 1.62]}>
        <mesh>
          <planeGeometry args={[0.65, 0.75]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.73, 0.83, 0.03]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.45, 0, 0.02]}>
          <boxGeometry args={[0.22, 0.75, 0.02]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
        <mesh position={[0.45, 0, 0.02]}>
          <boxGeometry args={[0.22, 0.75, 0.02]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
      </group>

      {/* Foundation Bushes & Fence (Ref 1) */}
      <group position={[0, 0, 1.9]}>
        {[-1.6, -1.2, -0.8, 1.2, 1.6].map((fx, fi) => (
          <group key={`h1-picket-${fi}`} position={[fx, 0.32, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.07, 0.55, 0.02]} />
              <meshStandardMaterial color="#9a3412" />
            </mesh>
            <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.05, 0.05, 0.02]} />
              <meshStandardMaterial color="#9a3412" />
            </mesh>
          </group>
        ))}
        {[-1.4, -0.6, 1.4].map((bx, bi) => (
          <mesh key={`h1-bush-${bi}`} position={[bx, 0.25, -0.1]} castShadow>
            <sphereGeometry args={[0.28, 10, 10]} scale={[1.2, 0.9, 0.9]} />
            <meshStandardMaterial color="#16a34a" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5B. HOUSE 2: 2.5-STORY COUNTRY VILLA (Ref Image 2: media_1795144590444_e40b0958.jpg)
// ═════════════════════════════════════════════════════════════════════════════

function House2Villa({ isDoorOpen = false }: { isDoorOpen?: boolean }) {
  const doorRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (doorRef.current) {
      const targetRot = isDoorOpen ? -1.35 : 0;
      doorRef.current.rotation.y += (targetRot - doorRef.current.rotation.y) * 6 * delta;
    }
  });

  return (
    <group position={[1.0, 0, -4.0]}>
      {/* ── Grey Stone Plinth Foundation ── */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.3, 3.4]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </mesh>

      {/* ── Main Two-and-a-Half-Story Volume (Cream/Yellow Stucco) ── */}
      <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 3.2, 3.0]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.8} />
      </mesh>

      {/* ── Projecting Central Bay (Ref 2) ── */}
      <mesh position={[0, 2.0, 0.5]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 3.4, 1.4]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.8} />
      </mesh>
      {/* Central Bay Gable Roof */}
      <mesh position={[0, 4.0, 0.5]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.1, 1.2, 4]} />
        <meshStandardMaterial color="#ea580c" roughness={0.65} />
      </mesh>

      {/* ── Main Steep Terracotta Tiled Hipped Roof (Ref 2) ── */}
      <mesh position={[0, 4.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2.7, 1.8, 4]} />
        <meshStandardMaterial color="#ea580c" roughness={0.65} />
      </mesh>

      {/* ── Tall Brick Chimney on Left Side with White Collar (Ref 2) ── */}
      <group position={[-1.3, 3.9, -0.4]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 2.8, 0.55]} />
          <meshStandardMaterial color="#b45309" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.45, 0]}>
          <boxGeometry args={[0.65, 0.15, 0.65]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.16, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      {/* ── ARCHITECTURAL ENTRANCE PORCH & PROPER FRONT ENTRANCE DOOR (Ref 2) ── */}
      {/* Extending forward from house front wall (z=1.5) towards garden path (z=2.4) */}
      <group position={[0, 0, 1.5]}>
        {/* Main Stone Porch Platform */}
        <mesh position={[0, 0.14, 0.45]} receiveShadow castShadow>
          <boxGeometry args={[1.7, 0.28, 0.9]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        {/* Stone Step Leading Down to Garden Path */}
        <mesh position={[0, 0.06, 0.95]} receiveShadow castShadow>
          <boxGeometry args={[1.5, 0.12, 0.35]} />
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </mesh>

        {/* Two White Columns Supporting Porch Canopy */}
        <mesh position={[-0.72, 1.15, 0.82]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 2.05, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[0.72, 1.15, 0.82]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 2.05, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>

        {/* Porch Overhanging Roof Canopy */}
        <mesh position={[0, 2.2, 0.5]} castShadow>
          <boxGeometry args={[1.85, 0.14, 1.05]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.45, 0.5]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[1.25, 0.65, 4]} />
          <meshStandardMaterial color="#ea580c" roughness={0.65} />
        </mesh>

        {/* Decorative White Railings on Porch Sides */}
        {[-0.8, 0.8].map((rx, ri) => (
          <group key={`porch-rail-${ri}`} position={[rx, 0.55, 0.45]}>
            <mesh>
              <boxGeometry args={[0.04, 0.05, 0.82]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {[-0.25, 0, 0.25].map((bz, bi) => (
              <mesh key={`bal-${bi}`} position={[0, -0.22, bz]}>
                <boxGeometry args={[0.03, 0.44, 0.03]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            ))}
          </group>
        ))}

        {/* ── Door Frame & Recessed Entry Cavity (Woman 2 emerges/returns through here) ── */}
        {/* Exterior White Door Architrave Molding */}
        <mesh position={[0, 1.1, 0.02]}>
          <boxGeometry args={[1.18, 2.08, 0.06]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Recessed Interior Dark Vestibule (Character steps into/out of this cavity) */}
        <mesh position={[0, 1.05, -0.15]}>
          <boxGeometry args={[0.96, 1.95, 0.35]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
        {/* Interior Lit Hallway Floor */}
        <mesh position={[0, 0.02, -0.15]} receiveShadow>
          <boxGeometry args={[0.96, 0.04, 0.35]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.2} />
        </mesh>

        {/* ── Hinged Front Door (Pivots at left jamb x=-0.44) ── */}
        <group ref={doorRef} position={[-0.44, 1.05, 0.04]}>
          <mesh position={[0.44, 0, 0]} castShadow>
            <boxGeometry args={[0.88, 1.92, 0.04]} />
            <meshStandardMaterial color="#78350f" roughness={0.6} />
          </mesh>
          {/* Recessed Door Panels */}
          {[-0.45, 0.25].map((py, pi) =>
            [0.24, 0.64].map((px, pj) => (
              <mesh key={`dpanel-${pi}-${pj}`} position={[px, py, 0.022]}>
                <boxGeometry args={[0.3, 0.55, 0.01]} />
                <meshStandardMaterial color="#451a03" roughness={0.7} />
              </mesh>
            ))
          )}
          {/* Polished Brass Knob & Keyhole Plate */}
          <mesh position={[0.8, -0.05, 0.03]}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0.8, -0.05, 0.022]}>
            <boxGeometry args={[0.04, 0.12, 0.005]} />
            <meshStandardMaterial color="#d97706" metalness={0.8} />
          </mesh>
          {/* Arched Fanlight Glass Transom above Door */}
          <mesh position={[0.44, 0.9, 0.01]}>
            <planeGeometry args={[0.76, 0.22]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.2} metalness={0.3} />
          </mesh>
        </group>

        {/* Wall Coach Lantern beside Door */}
        <group position={[0.68, 1.35, 0.06]}>
          <mesh>
            <boxGeometry args={[0.08, 0.16, 0.08]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
          <pointLight color="#fef08a" intensity={0.5} distance={1.5} />
        </group>
      </group>

      {/* ── Central Bay Upper Windows (Stacked Arched & Rectangular - Ref 2) ── */}
      <group position={[0, 2.3, 1.22]}>
        <mesh>
          <planeGeometry args={[0.5, 0.65]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.325, 0.005]}>
          <circleGeometry args={[0.25, 16, 0, Math.PI]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.08, 0.01]}>
          <boxGeometry args={[0.58, 0.82, 0.03]} />
          <meshStandardMaterial color="#9a3412" />
        </mesh>
      </group>
      <group position={[0, 3.3, 1.22]}>
        <mesh>
          <planeGeometry args={[0.42, 0.42]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.48, 0.48, 0.03]} />
          <meshStandardMaterial color="#9a3412" />
        </mesh>
      </group>

      {/* ── Side Wings Windows with Reddish-Brown Frames (Ref 2) ── */}
      {[-1.1, 1.1].map((wx, wi) => (
        <group key={`h2-g-win-${wi}`} position={[wx, 1.15, 1.52]}>
          <mesh>
            <planeGeometry args={[0.55, 0.75]} />
            <meshStandardMaterial color="#0284c7" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.63, 0.83, 0.03]} />
            <meshStandardMaterial color="#9a3412" />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.55, 0.03, 0.01]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.03, 0.75, 0.01]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}

      {[-1.1, 1.1].map((wx, wi) => (
        <group key={`h2-2-win-${wi}`} position={[wx, 2.3, 1.52]}>
          <mesh>
            <planeGeometry args={[0.55, 0.75]} />
            <meshStandardMaterial color="#0284c7" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.08, 0.01]}>
            <boxGeometry args={[0.63, 0.82, 0.03]} />
            <meshStandardMaterial color="#9a3412" />
          </mesh>
        </group>
      ))}

      {/* ── Reddish-Brown Perimeter Fence & Pine Shrub (Ref 2) ── */}
      <group position={[0, 0, 1.8]}>
        {[-1.5, -1.1, -0.7, 0.7, 1.1, 1.5].map((fx, fi) => (
          <group key={`h2-picket-${fi}`} position={[fx, 0.35, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.07, 0.6, 0.02]} />
              <meshStandardMaterial color="#9a3412" />
            </mesh>
            <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.05, 0.05, 0.02]} />
              <meshStandardMaterial color="#9a3412" />
            </mesh>
          </group>
        ))}
        <mesh position={[-1.1, 0.2, 0]}>
          <boxGeometry args={[1.0, 0.03, 0.02]} />
          <meshStandardMaterial color="#9a3412" />
        </mesh>
        <mesh position={[1.1, 0.2, 0]}>
          <boxGeometry args={[1.0, 0.03, 0.02]} />
          <meshStandardMaterial color="#9a3412" />
        </mesh>
        <group position={[-1.2, 0, 0.2]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <coneGeometry args={[0.3, 0.7, 8]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow>
            <coneGeometry args={[0.22, 0.5, 8]} />
            <meshStandardMaterial color="#16a34a" roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}


// 5C. FOUR RESIDENTIAL GARDEN TREES (EXACTLY 2 IN EACH HOUSE GARDEN)
// ═════════════════════════════════════════════════════════════════════════════

// ── House 1 Garden Tree A (Large Leafy Oak Tree for Sweeping Activity) ──
function House1TreeA() {
  return (
    <group position={[-4.5, 0, -1.0]}>
      {/* Root Base Flare */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.46, 0.4, 12]} />
        <meshStandardMaterial color="#5c3a21" roughness={0.9} />
      </mesh>
      {/* Trunk */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.32, 3.2, 12]} />
        <meshStandardMaterial color="#5c3a21" roughness={0.9} />
      </mesh>
      {/* Gnarled Branches */}
      <mesh position={[-0.35, 2.8, 0.1]} rotation={[0, 0, 0.55]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 8]} />
        <meshStandardMaterial color="#5c3a21" roughness={0.9} />
      </mesh>
      <mesh position={[0.35, 3.0, -0.1]} rotation={[0, 0, -0.55]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.3, 8]} />
        <meshStandardMaterial color="#5c3a21" roughness={0.9} />
      </mesh>
      {/* Canopy Spheres */}
      <mesh position={[0, 4.4, 0]} castShadow>
        <sphereGeometry args={[1.5, 16, 16]} scale={[1.1, 1.0, 1.1]} />
        <meshStandardMaterial color="#15803d" roughness={0.75} />
      </mesh>
      <mesh position={[-0.8, 4.0, 0.3]} castShadow>
        <sphereGeometry args={[1.2, 14, 14]} />
        <meshStandardMaterial color="#16a34a" roughness={0.7} />
      </mesh>
      <mesh position={[0.8, 4.2, -0.2]} castShadow>
        <sphereGeometry args={[1.25, 14, 14]} />
        <meshStandardMaterial color="#22c55e" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ── House 1 Garden Tree B (Slender Ornamental Birch/Dogwood Tree) ──
function House1TreeB() {
  return (
    <group position={[-1.8, 0, -2.2]}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 2.8, 10]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
      </mesh>
      {/* Dark birch bark accents */}
      {[0.6, 1.2, 1.8].map((by, bi) => (
        <mesh key={`birch-${bi}`} position={[0, by, 0]}>
          <cylinderGeometry args={[0.125, 0.125, 0.06, 10]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
      <mesh position={[0, 3.2, 0]} castShadow>
        <sphereGeometry args={[1.0, 12, 12]} scale={[0.9, 1.3, 0.9]} />
        <meshStandardMaterial color="#4ade80" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── House 2 Garden Tree A (Conical Ornamental Evergreen/Pine) ──
function House2TreeA() {
  return (
    <group position={[-0.2, 0, -1.8]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1.2, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <coneGeometry args={[0.75, 1.4, 8]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <coneGeometry args={[0.55, 1.1, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.0, 0]} castShadow>
        <coneGeometry args={[0.35, 0.8, 8]} />
        <meshStandardMaterial color="#22c55e" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── House 2 Garden Tree B (Full Rounded Fruit/Shade Tree) ──
function House2TreeB() {
  return (
    <group position={[2.8, 0, -2.0]}>
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 2.6, 10]} />
        <meshStandardMaterial color="#5c3a21" roughness={0.85} />
      </mesh>
      <mesh position={[0, 3.0, 0]} castShadow>
        <sphereGeometry args={[1.1, 14, 14]} scale={[1.1, 1.0, 1.1]} />
        <meshStandardMaterial color="#15803d" roughness={0.7} />
      </mesh>
      <mesh position={[0.4, 3.4, 0.2]} castShadow>
        <sphereGeometry args={[0.8, 12, 12]} />
        <meshStandardMaterial color="#16a34a" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. WIDE MODERN HOSPITAL BUILDING (Based on Attached Hospital Reference Image 3)
// Features wide emergency pavilion with colonnade canopy & tall inpatient tower
// ═════════════════════════════════════════════════════════════════════════════

function HospitalBuilding({
  isDoorOpen = false,
  isResult = false,
}: {
  isDoorOpen?: boolean;
  isResult?: boolean;
}) {
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const openOffset = isDoorOpen ? 0.45 : 0;
    if (leftDoorRef.current) {
      leftDoorRef.current.position.x += (-openOffset - leftDoorRef.current.position.x) * 6 * delta;
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.position.x += (openOffset - rightDoorRef.current.position.x) * 6 * delta;
    }
  });

  return (
    <group position={[0, 0, -4.5]}>
      {/* ── Left Inpatient Multi-Story Block (Ref 3) ── */}
      <group position={[-4.2, 0, 0]}>
        {/* Main White Tower Body */}
        <mesh position={[0, 3.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 6.0, 4.0]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.7} />
        </mesh>
        {/* Rooftop Parapet Border */}
        <mesh position={[0, 6.1, 0]}>
          <boxGeometry args={[4.25, 0.2, 4.05]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        {/* Rooftop Utility Box */}
        <mesh position={[-0.8, 6.6, -0.4]} castShadow>
          <boxGeometry args={[2.0, 1.0, 1.8]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>

        {/* Rows of Hospital Windows (3 floors of 5 windows, Ref 3) */}
        {[1.8, 3.2, 4.6].map((wy, row) =>
          [-1.5, -0.75, 0, 0.75, 1.5].map((wx, col) => (
            <mesh key={`hwin-${row}-${col}`} position={[wx, wy, 2.02]}>
              <boxGeometry args={[0.5, 0.7, 0.02]} />
              <meshStandardMaterial color="#0284c7" roughness={0.15} metalness={0.2} />
            </mesh>
          ))
        )}

        {/* "HOSPITAL" Facade Text Signboard at Top Left (Ref 3) */}
        {!isResult && (
          <group position={[0, 5.4, 2.04]}>
            <Html center pointerEvents="none">
              <div className="font-black text-red-700 tracking-wider text-xs whitespace-nowrap bg-white/90 px-2 py-0.5 rounded shadow-sm border border-red-200">
                WATER TOWN HOSPITAL
              </div>
            </Html>
          </group>
        )}

        {/* Exterior Maintenance Wall Ladder (Ref 3 right side of tower) */}
        <group position={[1.8, 3.2, 2.02]}>
          <mesh>
            <boxGeometry args={[0.04, 4.2, 0.04]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[0.25, 0, 0]}>
            <boxGeometry args={[0.04, 4.2, 0.04]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((ly, li) => (
            <mesh key={`rung-${li}`} position={[0.125, ly, 0]}>
              <boxGeometry args={[0.25, 0.03, 0.03]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          ))}
        </group>
      </group>

      {/* ── Wide Center & Right Emergency Pavilion (Ref 3) ── */}
      <group position={[1.8, 0, 0.2]}>
        {/* Main Pavilion Wall Block */}
        <mesh position={[0, 1.8, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[7.8, 3.6, 3.6]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.7} />
        </mesh>
        {/* Pavilion Rooftop Parapet */}
        <mesh position={[0, 3.7, -0.2]}>
          <boxGeometry args={[7.85, 0.2, 3.65]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>

        {/* Floor-to-ceiling Blue Glass Entrance Curtain Wall (Ref 3) */}
        <mesh position={[0, 1.2, 1.62]}>
          <boxGeometry args={[7.2, 2.2, 0.04]} />
          <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.2} />
        </mesh>

        {/* ── STAFF & SERVICE EMERGENCY ENTRANCE (Cleaner Ravi enters/exits here) ── */}
        <group position={[-2.2, 0, 1.63]}>
          <mesh position={[0, 1.15, 0.02]}>
            <boxGeometry args={[1.5, 2.3, 0.08]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} />
          </mesh>
          <mesh position={[0, 1.1, -0.15]}>
            <boxGeometry args={[1.36, 2.18, 0.35]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0.02, -0.15]} receiveShadow>
            <boxGeometry args={[1.36, 0.04, 0.35]} />
            <meshStandardMaterial color="#e0f2fe" emissive="#38bdf8" emissiveIntensity={0.3} />
          </mesh>

          {!isResult && (
            <group position={[0, 2.38, 0.06]}>
              <mesh>
                <boxGeometry args={[1.4, 0.24, 0.04]} />
                <meshStandardMaterial color="#15803d" />
              </mesh>
              <Html center pointerEvents="none">
                <div className="font-bold text-[8px] text-white tracking-wider whitespace-nowrap uppercase select-none flex items-center gap-1">
                  <span className="text-emerald-300 font-black">+</span> STAFF &amp; SERVICE ENTRY
                </div>
              </Html>
            </group>
          )}

          {/* Left Sliding Glass Door */}
          <group ref={leftDoorRef} position={[-0.32, 1.08, 0.03]}>
            <mesh castShadow>
              <boxGeometry args={[0.62, 2.05, 0.03]} />
              <meshStandardMaterial color="#38bdf8" transparent opacity={0.75} roughness={0.1} metalness={0.3} />
            </mesh>
            <mesh position={[0.26, 0, 0.03]}>
              <cylinderGeometry args={[0.015, 0.015, 0.6, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
          </group>

          {/* Right Sliding Glass Door */}
          <group ref={rightDoorRef} position={[0.32, 1.08, 0.03]}>
            <mesh castShadow>
              <boxGeometry args={[0.62, 2.05, 0.03]} />
              <meshStandardMaterial color="#38bdf8" transparent opacity={0.75} roughness={0.1} metalness={0.3} />
            </mesh>
            <mesh position={[-0.26, 0, 0.03]}>
              <cylinderGeometry args={[0.015, 0.015, 0.6, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
          </group>
        </group>

        {/* ── Wide Covered Walkway Canopy supported by Colonnade (Ref 3) ── */}
        <mesh position={[0, 2.5, 2.6]} castShadow receiveShadow>
          <boxGeometry args={[8.2, 0.18, 2.2]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>

        {/* 7 White Colonnade Walkway Columns (Ref 3) */}
        {[-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6].map((cx, ci) => (
          <mesh key={`col-${ci}`} position={[cx, 1.25, 3.6]} castShadow>
            <boxGeometry args={[0.14, 2.5, 0.14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        ))}

        {/* ── Prominent RED MEDICAL CROSSES (+) & "EMERGENCY" Text on Canopy Fascia (Ref 3) ── */}
        <group position={[0, 2.5, 3.73]}>
          <group position={[-2.4, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.34, 0.1, 0.03]} />
              <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.2} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.1, 0.34, 0.03]} />
              <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.2} />
            </mesh>
          </group>

          {!isResult && (
            <Html center pointerEvents="none">
              <div className="font-black text-red-600 tracking-widest text-base sm:text-lg select-none whitespace-nowrap drop-shadow-sm font-sans uppercase">
                EMERGENCY
              </div>
            </Html>
          )}

          <group position={[2.4, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.34, 0.1, 0.03]} />
              <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.2} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.1, 0.34, 0.03]} />
              <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.2} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ── Natural Spreading Hospital Tree & Landscaped Park (Positioned BESIDE Hospital with clear clearance) ── */}
      <group position={[-7.5, 0, 2.0]}>
        {/* Curbside Circular Grass Lawn Bed */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[2.2, 28]} />
          <meshStandardMaterial color="#4ade80" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.16, 2.24, 28]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>

        {/* Natural Tree Model: Flared Roots, Visible Trunk, 4 Natural Branches, Clustered Leaf Foliage */}
        <group position={[0, 0, 0]}>
          {/* Flared Root Base */}
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.38, 0.25, 8]} />
            <meshStandardMaterial color="#5c381e" roughness={0.9} />
          </mesh>
          {/* Surface Roots spreading into ground */}
          {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ra, ri) => (
            <mesh
              key={`root-${ri}`}
              position={[Math.cos(ra) * 0.28, 0.04, Math.sin(ra) * 0.28]}
              rotation={[0, ra, 0.3]}
              castShadow
            >
              <boxGeometry args={[0.32, 0.08, 0.12]} />
              <meshStandardMaterial color="#5c381e" roughness={0.9} />
            </mesh>
          ))}

          {/* Sturdy Textured Trunk */}
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 1.8, 10]} />
            <meshStandardMaterial color="#6b4226" roughness={0.85} />
          </mesh>

          {/* 4 Multi-Tiered Branches at Natural Angles */}
          <group position={[0, 1.8, 0]} rotation={[0.3, 0.4, -0.45]}>
            <mesh position={[0, 0.55, 0]} castShadow>
              <cylinderGeometry args={[0.11, 0.16, 1.2, 8]} />
              <meshStandardMaterial color="#6b4226" roughness={0.85} />
            </mesh>
          </group>
          <group position={[0, 1.9, 0]} rotation={[-0.35, -0.5, -0.5]}>
            <mesh position={[0, 0.55, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.15, 1.2, 8]} />
              <meshStandardMaterial color="#6b4226" roughness={0.85} />
            </mesh>
          </group>
          <group position={[0, 2.0, 0]} rotation={[0.4, -0.5, 0.4]}>
            <mesh position={[0, 0.55, 0]} castShadow>
              <cylinderGeometry args={[0.11, 0.15, 1.2, 8]} />
              <meshStandardMaterial color="#6b4226" roughness={0.85} />
            </mesh>
          </group>
          <group position={[0, 2.1, 0]} rotation={[-0.2, 0.3, 0.35]}>
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.16, 1.3, 8]} />
              <meshStandardMaterial color="#6b4226" roughness={0.85} />
            </mesh>
          </group>

          {/* ── Multi-Layered Natural Canopy Leaf Clusters (Individually Sculpted) ── */}
          {/* Main Crown */}
          <mesh position={[0, 3.4, 0]} castShadow>
            <dodecahedronGeometry args={[0.82, 1]} />
            <meshStandardMaterial color="#16a34a" roughness={0.7} />
          </mesh>
          {/* Left Foliage Mound */}
          <mesh position={[-0.85, 2.8, -0.2]} castShadow>
            <dodecahedronGeometry args={[0.7, 1]} />
            <meshStandardMaterial color="#15803d" roughness={0.7} />
          </mesh>
          {/* Right Foliage Mound */}
          <mesh position={[0.85, 2.85, 0.1]} castShadow>
            <dodecahedronGeometry args={[0.68, 1]} />
            <meshStandardMaterial color="#22c55e" roughness={0.7} />
          </mesh>
          {/* Front Foliage Mound */}
          <mesh position={[0.2, 2.7, 0.7]} castShadow>
            <dodecahedronGeometry args={[0.66, 1]} />
            <meshStandardMaterial color="#16a34a" roughness={0.7} />
          </mesh>
          {/* Back Foliage Mound */}
          <mesh position={[-0.2, 2.75, -0.7]} castShadow>
            <dodecahedronGeometry args={[0.65, 1]} />
            <meshStandardMaterial color="#15803d" roughness={0.7} />
          </mesh>
          {/* Upper Sunlight Crown Highlight */}
          <mesh position={[0.3, 3.65, 0.2]} castShadow>
            <dodecahedronGeometry args={[0.54, 1]} />
            <meshStandardMaterial color="#4ade80" roughness={0.65} />
          </mesh>
          {/* Lower Leaf Clusters */}
          <mesh position={[-0.7, 2.3, 0.4]} castShadow>
            <dodecahedronGeometry args={[0.52, 1]} />
            <meshStandardMaterial color="#16a34a" roughness={0.7} />
          </mesh>
          <mesh position={[0.65, 2.25, -0.3]} castShadow>
            <dodecahedronGeometry args={[0.5, 1]} />
            <meshStandardMaterial color="#15803d" roughness={0.7} />
          </mesh>
        </group>

        {/* Two Wooden Park Benches in front of tree lawn */}
        {[-0.6, 0.6].map((bx, bi) => (
          <group key={`hbench-${bi}`} position={[bx, 0, 1.25]}>
            <mesh position={[0, 0.18, 0]} castShadow>
              <boxGeometry args={[0.7, 0.06, 0.24]} />
              <meshStandardMaterial color="#b45309" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.36, -0.1]} castShadow>
              <boxGeometry args={[0.7, 0.24, 0.04]} />
              <meshStandardMaterial color="#b45309" roughness={0.7} />
            </mesh>
            <mesh position={[-0.28, 0.09, 0]}>
              <boxGeometry args={[0.04, 0.18, 0.22]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0.28, 0.09, 0]}>
              <boxGeometry args={[0.04, 0.18, 0.22]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}


// 7. HAZARDOUS WASTE INDUSTRIAL PROCESSING FACILITY (Ref Image 5)
// ═════════════════════════════════════════════════════════════════════════════

interface FacilityProps {
  isUnloading: boolean;
  onUnloadClick?: () => void;
  canUnload?: boolean;
  wasteFillLevel?: number; // 0 to 1
  isResult?: boolean;
}

function HazardousFacility({
  isUnloading,
  onUnloadClick,
  canUnload = false,
  wasteFillLevel = 0,
  isResult = false,
}: FacilityProps) {
  const tubMarkerRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (tubMarkerRef.current && canUnload) {
      const s = 1 + Math.sin(state.clock.getElapsedTime() * 6) * 0.06;
      tubMarkerRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ── Base Concrete Facility Compound Ground Slab ── */}
      <mesh position={[0, 0.005, -0.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 18]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
      </mesh>
      {/* Concrete Expansion Joint Lines */}
      {[-8, -4, 0, 4, 8].map((jx, ji) => (
        <mesh key={`ejoint-${ji}`} position={[jx, 0.007, -0.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.04, 18]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      ))}

      {/* ── WIDE STRETCHED INDUSTRIAL DISPOSAL BUILDING (Background z=-4.2) ── */}
      <group position={[0, 0, -4.5]}>
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[18, 6.4, 5.0]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.7} metalness={0.15} />
        </mesh>
        <mesh position={[0, 5.2, 2.52]}>
          <boxGeometry args={[18.05, 0.5, 0.05]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        <mesh position={[0, 6.45, 0]}>
          <boxGeometry args={[18.2, 0.2, 5.1]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>

        {/* ── PROMINENT SIGNBOARD: "DISPOSAL CENTER" ── */}
        {!isResult && (
          <group position={[0, 5.8, 2.58]}>
            <Html center pointerEvents="none">
              <div className="font-black text-sm sm:text-base text-slate-900 tracking-widest bg-amber-400 px-6 py-1.5 rounded-lg border-2 border-slate-800 shadow-md whitespace-nowrap uppercase select-none font-sans">
                DISPOSAL CENTER
              </div>
            </Html>
          </group>
        )}

        {/* Roll-up bay shutter door */}
        <group position={[-0.5, 1.8, 2.52]}>
          <mesh castShadow>
            <boxGeometry args={[3.8, 3.6, 0.08]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
          </mesh>
          {[-1.4, -0.9, -0.4, 0.1, 0.6, 1.1].map((sy, si) => (
            <mesh key={`slat-${si}`} position={[0, sy, 0.05]}>
              <boxGeometry args={[3.7, 0.06, 0.03]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          ))}
          <mesh position={[0, 1.9, 0.06]}>
            <boxGeometry args={[4.0, 0.2, 0.12]} />
            <meshStandardMaterial color="#eab308" />
          </mesh>
        </group>

        {/* Personnel Door */}
        <group position={[-5.8, 1.2, 2.52]}>
          <mesh>
            <boxGeometry args={[1.1, 2.2, 0.04]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0.4, 0, 0.03]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} />
          </mesh>
        </group>

        {/* Industrial Louvers */}
        {[3.5, 6.5].map((lx, li) => (
          <group key={`louver-${li}`} position={[lx, 3.2, 2.52]}>
            <mesh>
              <boxGeometry args={[2.2, 1.8, 0.06]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            {[-0.6, -0.3, 0, 0.3, 0.6].map((ly, lk) => (
              <mesh key={`lfin-${lk}`} position={[0, ly, 0.04]} rotation={[0.4, 0, 0]}>
                <boxGeometry args={[2.1, 0.05, 0.08]} />
                <meshStandardMaterial color="#1e293b" />
              </mesh>
            ))}
          </group>
        ))}

        {/* Twin Industrial Stacks on Far Left */}
        {[-7.8, -6.6].map((cx, ci) => (
          <group key={`fstack-${ci}`} position={[cx, 0, 0]}>
            <mesh position={[0, 4.8, 0]} castShadow>
              <cylinderGeometry args={[0.35, 0.42, 9.6, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh position={[0, 9.4, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
              <meshStandardMaterial color="#eab308" metalness={0.6} />
            </mesh>
            <mesh position={[0, 5.2, 0]}>
              <cylinderGeometry args={[0.7, 0.7, 0.08, 12]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
          </group>
        ))}

        {/* Silos on Right */}
        {[6.0, 7.8].map((sx, si) => (
          <group key={`fsilo-${si}`} position={[sx, 0, 0.6]}>
            <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.8, 0.8, 6.4, 20]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 6.7, 0]} castShadow>
              <coneGeometry args={[0.82, 0.8, 16]} />
              <meshStandardMaterial color="#0284c7" roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── WIRED METAL COMPOUND PERIMETER FENCE & WIDE VEHICLE GATE ── */}
      {/* Fence along z = 2.4: Left segment runs from -8.0 to -6.2; Center segment from -3.4 to 3.6 */}
      {/* Note: The area in front of the tub (-6.2 to -3.4) has a clear low safety curb so the tub is 100% visible */}
      <group position={[0, 0, 2.4]}>
        {/* Leftmost small fence segment */}
        {[-8.0, -6.8].map((px, pi) => (
          <group key={`post-fl-${pi}`} position={[px, 0.8, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.035, 0.035, 1.6, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
          </group>
        ))}
        <mesh position={[-7.4, 0.8, 0]}>
          <planeGeometry args={[1.4, 1.2]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.35} wireframe />
        </mesh>

        {/* Low yellow safety guide curb in front of tub */}
        <mesh position={[-4.8, 0.08, 0]} receiveShadow>
          <boxGeometry args={[2.8, 0.16, 0.18]} />
          <meshStandardMaterial color="#ca8a04" roughness={0.6} />
        </mesh>

        {/* Center fence segment from x = -3.4 to x = 3.6 */}
        {[-3.4, -2.0, -0.6, 0.8, 2.2, 3.6].map((px, pi) => (
          <group key={`post-c-${pi}`} position={[px, 0.8, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.035, 0.035, 1.6, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.82, 0]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
          </group>
        ))}
        {[0.25, 0.8, 1.45].map((ry, ri) => (
          <mesh key={`rail-c-${ri}`} position={[0.1, ry, 0]}>
            <boxGeometry args={[7.0, 0.03, 0.03]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
        ))}
        <mesh position={[0.1, 0.85, 0]}>
          <planeGeometry args={[7.0, 1.2]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.35} wireframe />
        </mesh>

        {/* Vehicle Gate Posts (x = 3.6 to x = 7.2) */}
        {[3.6, 7.2].map((gx, gi) => (
          <group key={`gpost-${gi}`} position={[gx, 1.0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.22, 2.0, 0.22]} />
              <meshStandardMaterial color="#eab308" metalness={0.4} />
            </mesh>
            {[-0.6, 0, 0.6].map((sy, si) => (
              <mesh key={`gstripe-${si}`} position={[0, sy, 0.115]}>
                <boxGeometry args={[0.23, 0.18, 0.01]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
            ))}
          </group>
        ))}

        {/* Double Gates Swung Open into Compound */}
        <group position={[3.6, 0.8, 0]} rotation={[0, -1.8, 0]}>
          <mesh position={[0.85, 0, 0]} castShadow>
            <boxGeometry args={[1.7, 1.4, 0.04]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
          <mesh position={[0.85, 0, 0.01]}>
            <planeGeometry args={[1.6, 1.3]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.4} wireframe />
          </mesh>
        </group>
        <group position={[7.2, 0.8, 0]} rotation={[0, 1.8, 0]}>
          <mesh position={[-0.85, 0, 0]} castShadow>
            <boxGeometry args={[1.7, 1.4, 0.04]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
          <mesh position={[-0.85, 0, 0.01]}>
            <planeGeometry args={[1.6, 1.3]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.4} wireframe />
          </mesh>
        </group>
      </group>

      {/* Access Road Leading into Gate from Right */}
      <mesh position={[8.5, 0.006, 0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8.0, 3.6]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      {/* Yellow Safety Guideline through Gate into Courtyard */}
      <mesh position={[3.0, 0.008, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[11.0, 0.15]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>

      {/* ── LARGE INDUSTRIAL WASTE COLLECTION TUB (Moved to LEFTMOST SIDE of compound: x = -4.8, z = 0.5) ── */}
      <group position={[-4.8, 0, 0.5]}>
        {/* Steel Tub Base */}
        <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.12, 1.4]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Front Wall */}
        <mesh position={[0, 0.55, 0.68]} castShadow>
          <boxGeometry args={[1.8, 0.95, 0.08]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Back Wall */}
        <mesh position={[0, 0.55, -0.68]} castShadow>
          <boxGeometry args={[1.8, 0.95, 0.08]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Left Side Wall */}
        <mesh position={[-0.88, 0.55, 0]} castShadow>
          <boxGeometry args={[0.08, 0.95, 1.44]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Right Side Wall (toward truck rear) */}
        <mesh position={[0.88, 0.55, 0]} castShadow>
          <boxGeometry args={[0.08, 0.95, 1.44]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
        </mesh>

        {/* Reinforced Corner Columns */}
        {[
          [-0.88, -0.68],
          [0.88, -0.68],
          [-0.88, 0.68],
          [0.88, 0.68],
        ].map(([cx, cz], ci) => (
          <mesh key={`tcol-${ci}`} position={[cx, 0.55, cz]} castShadow>
            <boxGeometry args={[0.12, 1.05, 0.12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} />
          </mesh>
        ))}

        {/* Hazard Striped Safety Rim along Top */}
        <mesh position={[0, 1.04, 0.68]}>
          <boxGeometry args={[1.86, 0.08, 0.1]} />
          <meshStandardMaterial color="#eab308" metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.04, -0.68]}>
          <boxGeometry args={[1.86, 0.08, 0.1]} />
          <meshStandardMaterial color="#eab308" metalness={0.4} />
        </mesh>
        <mesh position={[-0.88, 1.04, 0]}>
          <boxGeometry args={[0.1, 0.08, 1.46]} />
          <meshStandardMaterial color="#eab308" metalness={0.4} />
        </mesh>
        <mesh position={[0.88, 1.04, 0]}>
          <boxGeometry args={[0.1, 0.08, 1.46]} />
          <meshStandardMaterial color="#eab308" metalness={0.4} />
        </mesh>

        {/* Front Facade Text on Tub: "HAZARDOUS WASTE RECEPTACLE" */}
        {!isResult && (
          <group position={[0, 0.55, 0.73]}>
            <Html center pointerEvents="none">
              <div className="font-black text-[9px] text-amber-300 tracking-wider whitespace-nowrap uppercase select-none bg-slate-950/90 px-2 py-0.5 rounded border border-amber-400/50">
                HAZARDOUS WASTE RECEPTACLE
              </div>
            </Html>
          </group>
        )}

        {/* ── Accumulating Waste Pile Inside Tub (Visibly fills as waste unloads) ── */}
        <group
          position={[0, 0.12 + wasteFillLevel * 0.45, 0]}
          scale={[1, Math.max(0.04, wasteFillLevel), 1]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.6, 1.2]} />
            <meshStandardMaterial color="#dc2626" roughness={0.8} />
          </mesh>
          <mesh position={[-0.3, 0.35, -0.2]}>
            <sphereGeometry args={[0.26, 10, 10]} scale={[1.2, 0.7, 1.1]} />
            <meshStandardMaterial color="#dc2626" roughness={0.7} />
          </mesh>
          <mesh position={[0.3, 0.35, 0.2]}>
            <sphereGeometry args={[0.28, 10, 10]} scale={[1.1, 0.8, 1.2]} />
            <meshStandardMaterial color="#eab308" roughness={0.7} />
          </mesh>
          <mesh position={[0.1, 0.38, -0.2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.35, 12]} />
            <meshStandardMaterial color="#b91c1c" metalness={0.3} />
          </mesh>
          <mesh position={[-0.35, 0.34, 0.25]}>
            <boxGeometry args={[0.35, 0.28, 0.35]} />
            <meshStandardMaterial color="#ca8a04" />
          </mesh>
        </group>

        {/* ── Glowing / Pulsing Marker when Tub is Ready for User Click ── */}
        {canUnload && !isResult && (
          <group ref={tubMarkerRef} position={[0, 1.1, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.92, 1.05, 32]} />
              <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
            </mesh>
            <pointLight color="#38bdf8" intensity={2.5} distance={3} />
          </group>
        )}

        {/* ── Transparent Clickable Hit Mesh Over Tub ── */}
        <mesh
          position={[0, 0.6, 0]}
          onClick={(e) => {
            e.stopPropagation();
            if (canUnload && onUnloadClick) onUnloadClick();
          }}
          onPointerOver={() => {
            if (canUnload) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <boxGeometry args={[2.2, 1.5, 1.8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}


// 8. 3D CHARACTERS: WOMAN 1 (SARAH), WOMAN 2 (PRIYA), CLEANER (RAVI)
// ═════════════════════════════════════════════════════════════════════════════

// ── WOMAN 1 (Sarah - Blonde Bob, Blue Blouse, White Apron, Mint Skirt - Ref 2) ──
interface Woman1Props {
  position: [number, number, number];
  rotationY?: number;
  isWalking: boolean;
  isSweeping: boolean;
  hasBroom: boolean;
  hasTray: boolean;
  bags: WasteBagData[];
  selectedBagId: string | null;
  onBagClick?: (bagId: string) => void;
  canSelectBag?: boolean;
}

function CharacterWoman1({
  position,
  rotationY = 0,
  isWalking,
  isSweeping,
  hasBroom,
  hasTray,
  bags,
  selectedBagId,
  onBagClick,
  canSelectBag,
}: Woman1Props) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (isWalking) {
      const walk = t * 9;
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(walk) * 0.5;
        rightLegRef.current.rotation.x = -Math.sin(walk) * 0.5;
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = -Math.sin(walk) * 0.35;
        rightArmRef.current.rotation.x = Math.sin(walk) * 0.35;
      }
    } else if (isSweeping) {
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      }
      if (rightArmRef.current && leftArmRef.current) {
        const sweep = Math.sin(t * 10) * 0.4;
        rightArmRef.current.rotation.x = -0.9 + sweep;
        rightArmRef.current.rotation.z = -0.3;
        leftArmRef.current.rotation.x = -0.7 + sweep * 0.8;
      }
    } else {
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = 0;
        rightArmRef.current.rotation.x = 0;
      }
    }
  });

  const skin = "#fcd7ba";
  const hair = "#d97706"; // Blonde/golden-brown wavy bob (Ref 2)
  const blouse = "#38bdf8"; // Sky blue blouse
  const apron = "#f8fafc"; // White apron
  const sash = "#86efac"; // Mint green waist sash
  const skirt = "#67e8f9"; // Mint blue skirt with cream hem
  const shoes = "#1e293b"; // Dark slip-on shoes

  const leftBag = bags.find((b) => b.hand === "left" && !b.isDisposed);
  const rightBag = bags.find((b) => b.hand === "right" && !b.isDisposed);

  return (
    <group ref={rootRef} position={position} rotation={[0, rotationY, 0]}>
      {/* ── Flared Skirt & Waist Sash (Seamlessly Encloses Hips) ── */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.28, 0.42, 16]} />
        <meshStandardMaterial color={skirt} roughness={0.6} />
      </mesh>
      {/* Skirt Cream Border Hem */}
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.285, 0.29, 0.05, 16]} />
        <meshStandardMaterial color="#fef08a" />
      </mesh>

      {/* ── Articulated Legs & Shoes with Hip & Knee Joint Transitions ── */}
      <group ref={leftLegRef} position={[-0.1, 0.52, 0]}>
        {/* Rounded Hip Joint Sphere inside skirt */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Upper Thigh */}
        <mesh position={[0, -0.11, 0]} castShadow>
          <cylinderGeometry args={[0.054, 0.048, 0.22, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Rounded Knee Joint Sphere */}
        <mesh position={[0, -0.22, 0]}>
          <sphereGeometry args={[0.048, 10, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Lower Calf */}
        <mesh position={[0, -0.33, 0]} castShadow>
          <cylinderGeometry args={[0.046, 0.042, 0.22, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Ankle & Shoe */}
        <mesh position={[0, -0.46, 0.04]} castShadow>
          <boxGeometry args={[0.08, 0.07, 0.17]} />
          <meshStandardMaterial color={shoes} />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[0.1, 0.52, 0]}>
        {/* Rounded Hip Joint Sphere inside skirt */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Upper Thigh */}
        <mesh position={[0, -0.11, 0]} castShadow>
          <cylinderGeometry args={[0.054, 0.048, 0.22, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Rounded Knee Joint Sphere */}
        <mesh position={[0, -0.22, 0]}>
          <sphereGeometry args={[0.048, 10, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Lower Calf */}
        <mesh position={[0, -0.33, 0]} castShadow>
          <cylinderGeometry args={[0.046, 0.042, 0.22, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Ankle & Shoe */}
        <mesh position={[0, -0.46, 0.04]} castShadow>
          <boxGeometry args={[0.08, 0.07, 0.17]} />
          <meshStandardMaterial color={shoes} />
        </mesh>
      </group>

      {/* ── Torso, Blouse & Seamless Neck Transition ── */}
      <group position={[0, 1.05, 0]}>
        {/* Blue Blouse Body */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.19, 0.38, 14]} />
          <meshStandardMaterial color={blouse} roughness={0.6} />
        </mesh>
        {/* Mint Green Waist Sash connecting Torso to Skirt with Zero Gap */}
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.08, 14]} />
          <meshStandardMaterial color={sash} />
        </mesh>
        {/* White Kitchen Apron Front Plate */}
        <mesh position={[0, 0.12, 0.17]}>
          <boxGeometry args={[0.22, 0.32, 0.02]} />
          <meshStandardMaterial color={apron} roughness={0.7} />
        </mesh>

        {/* White Peter Pan Blouse Collar */}
        <mesh position={[0, 0.3, 0]}>
          <torusGeometry args={[0.11, 0.025, 8, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Neck Inserting Deeply into Torso and Head */}
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.065, 0.075, 0.15, 12]} />
          <meshStandardMaterial color={skin} />
        </mesh>

        {/* ── Head & Stylized Facial Features (Ref 2) ── */}
        <group position={[0, 0.54, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.18, 16, 16]} scale={[1, 1.08, 0.95]} />
            <meshStandardMaterial color={skin} roughness={0.6} />
          </mesh>
          {/* Friendly Eyes */}
          {[-0.065, 0.065].map((ex, i) => (
            <group key={`w1-eye-${i}`} position={[ex, 0.02, 0.16]}>
              <mesh scale={[1, 1.2, 0.3]}>
                <sphereGeometry args={[0.04, 12, 12]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, 0, 0.03]}>
                <circleGeometry args={[0.025, 10]} />
                <meshStandardMaterial color="#10b981" />
              </mesh>
              <mesh position={[0, 0, 0.035]}>
                <circleGeometry args={[0.014, 8]} />
                <meshBasicMaterial color="#0f172a" />
              </mesh>
            </group>
          ))}
          {/* Cute Nose & Smiling Lips */}
          <mesh position={[0, -0.03, 0.18]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshStandardMaterial color="#f7be97" />
          </mesh>
          <mesh position={[0, -0.075, 0.165]}>
            <sphereGeometry args={[0.026, 8, 8]} scale={[1.4, 0.5, 0.6]} />
            <meshStandardMaterial color="#e11d48" />
          </mesh>
          {/* Blonde Wavy Bob Hair (Ref 2) */}
          <mesh position={[0, 0.06, -0.02]}>
            <sphereGeometry args={[0.2, 16, 16]} scale={[1.05, 1.08, 1.1]} />
            <meshStandardMaterial color={hair} roughness={0.8} />
          </mesh>
          {/* Side Bob Waves */}
          {[-0.17, 0.17].map((hx, hi) => (
            <mesh key={`bob-${hi}`} position={[hx, -0.04, 0.02]}>
              <sphereGeometry args={[0.09, 10, 10]} scale={[0.8, 1.4, 0.9]} />
              <meshStandardMaterial color={hair} roughness={0.8} />
            </mesh>
          ))}
        </group>

        {/* ── Left Arm (Articulated with Shoulder Cap & Elbow Joint) ── */}
        {/* Blouse Left Sleeve Cap (Bridges Torso to Arm with Zero Gap) */}
        <mesh position={[-0.22, 0.22, 0]}>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial color={blouse} roughness={0.6} />
        </mesh>
        <group ref={leftArmRef} position={[-0.22, 0.22, 0]}>
          {/* Upper Arm */}
          <mesh position={[0, -0.09, 0]} castShadow>
            <cylinderGeometry args={[0.046, 0.042, 0.18, 10]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {/* Rounded Elbow Joint Sphere */}
          <mesh position={[0, -0.18, 0]}>
            <sphereGeometry args={[0.042, 10, 10]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {/* Forearm */}
          <mesh position={[0, -0.27, 0]} castShadow>
            <cylinderGeometry args={[0.041, 0.038, 0.18, 10]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {/* Wrist Joint Sphere */}
          <mesh position={[0, -0.36, 0]}>
            <sphereGeometry args={[0.038, 8, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.4, 0.01]} castShadow>
            <sphereGeometry args={[0.04, 8, 8]} scale={[0.85, 1.2, 0.7]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {/* Held Left Bag */}
          {leftBag && (
            <WasteBag
              data={leftBag}
              position={[0, -0.42, 0.02]}
              isSelectable={canSelectBag ?? false}
              isSelected={selectedBagId === leftBag.id}
              onClick={() => onBagClick && onBagClick(leftBag.id)}
            />
          )}
        </group>

        {/* ── Right Arm (Articulated with Shoulder Cap & Elbow Joint) ── */}
        {/* Blouse Right Sleeve Cap (Bridges Torso to Arm with Zero Gap) */}
        <mesh position={[0.22, 0.22, 0]}>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial color={blouse} roughness={0.6} />
        </mesh>
        <group ref={rightArmRef} position={[0.22, 0.22, 0]}>
          {/* Upper Arm */}
          <mesh position={[0, -0.09, 0]} castShadow>
            <cylinderGeometry args={[0.046, 0.042, 0.18, 10]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {/* Rounded Elbow Joint Sphere */}
          <mesh position={[0, -0.18, 0]}>
            <sphereGeometry args={[0.042, 10, 10]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {/* Forearm */}
          <mesh position={[0, -0.27, 0]} castShadow>
            <cylinderGeometry args={[0.041, 0.038, 0.18, 10]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {/* Wrist Joint Sphere */}
          <mesh position={[0, -0.36, 0]}>
            <sphereGeometry args={[0.038, 8, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.4, 0.01]} castShadow>
            <sphereGeometry args={[0.04, 8, 8]} scale={[0.85, 1.2, 0.7]} />
            <meshStandardMaterial color={skin} />
          </mesh>

          {/* Held Right Bag */}
          {rightBag && (
            <WasteBag
              data={rightBag}
              position={[0, -0.42, 0.02]}
              isSelectable={canSelectBag ?? false}
              isSelected={selectedBagId === rightBag.id}
              onClick={() => onBagClick && onBagClick(rightBag.id)}
            />
          )}

          {/* Held Broom in Hand during Sweeping */}
          {hasBroom && (
            <group position={[0, -0.35, 0.15]} rotation={[0.4, 0, -0.2]}>
              <mesh position={[0, 0.25, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 1.1, 8]} />
                <meshStandardMaterial color="#b45309" roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.35, 0]} castShadow>
                <coneGeometry args={[0.16, 0.35, 8]} />
                <meshStandardMaterial color="#ca8a04" roughness={0.9} />
              </mesh>
            </group>
          )}

          {/* Held Collection Tray carrying organic leaves */}
          {hasTray && (
            <group position={[0, -0.32, 0.2]} rotation={[0.2, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.34, 0.06, 0.26]} />
                <meshStandardMaterial color="#0284c7" />
              </mesh>
              {/* Collected Leaves inside tray */}
              <mesh position={[0, 0.04, 0]}>
                <sphereGeometry args={[0.12, 8, 6]} scale={[1.3, 0.4, 1.1]} />
                <meshStandardMaterial color="#15803d" />
              </mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  );
}

// ── WOMAN 2 (Priya - Dark Hair, Pink Headband, Pink Long-Sleeve Dress - Ref 3) ──
interface Woman2Props {
  position: [number, number, number];
  rotationY?: number;
  isWalking: boolean;
  bags: WasteBagData[];
  selectedBagId: string | null;
  onBagClick?: (bagId: string) => void;
  canSelectBag?: boolean;
}

function CharacterWoman2({
  position,
  rotationY = 0,
  isWalking,
  bags,
  selectedBagId,
  onBagClick,
  canSelectBag,
}: Woman2Props) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (isWalking) {
      const walk = state.clock.getElapsedTime() * 9;
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(walk) * 0.5;
        rightLegRef.current.rotation.x = -Math.sin(walk) * 0.5;
      }
    } else {
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      }
    }
  });

  const skin = "#fcd7ba";
  const hair = "#3b2210"; // Dark brunette
  const pinkDress = "#f472b6"; // Pink long-sleeve dress (Ref 3)
  const hotPinkTrim = "#e11d48"; // Hot pink collar/cuffs/hem
  const shoes = "#db2777"; // Pink heels

  const leftBag = bags.find((b) => b.hand === "left" && !b.isDisposed);
  const rightBag = bags.find((b) => b.hand === "right" && !b.isDisposed);

  return (
    <group ref={rootRef} position={position} rotation={[0, rotationY, 0]}>
      {/* ── Pink Dress Body & Skirt (Ref 3) ── */}
      <mesh position={[0, 0.76, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.28, 0.58, 16]} />
        <meshStandardMaterial color={pinkDress} roughness={0.6} />
      </mesh>
      {/* Hot Pink Hem Trim */}
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.285, 0.29, 0.05, 16]} />
        <meshStandardMaterial color={hotPinkTrim} />
      </mesh>

      {/* ── Articulated Legs & Pink Shoes with Hip & Knee Transitions ── */}
      <group ref={leftLegRef} position={[-0.1, 0.48, 0]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.052, 10, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, -0.11, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.045, 0.22, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, -0.33, 0]} castShadow>
          <cylinderGeometry args={[0.044, 0.04, 0.22, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, -0.46, 0.04]} castShadow>
          <boxGeometry args={[0.07, 0.06, 0.14]} />
          <meshStandardMaterial color={shoes} />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[0.1, 0.48, 0]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.052, 10, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, -0.11, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.045, 0.22, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, -0.33, 0]} castShadow>
          <cylinderGeometry args={[0.044, 0.04, 0.22, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, -0.46, 0.04]} castShadow>
          <boxGeometry args={[0.07, 0.06, 0.14]} />
          <meshStandardMaterial color={shoes} />
        </mesh>
      </group>

      {/* ── Torso, Neck & Collar ── */}
      <group position={[0, 1.15, 0]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.19, 0.36, 14]} />
          <meshStandardMaterial color={pinkDress} roughness={0.6} />
        </mesh>
        {/* Hot Pink Collar Trim */}
        <mesh position={[0, 0.3, 0]}>
          <torusGeometry args={[0.12, 0.02, 6, 14]} />
          <meshStandardMaterial color={hotPinkTrim} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.065, 0.075, 0.15, 12]} />
          <meshStandardMaterial color={skin} />
        </mesh>

        {/* ── Head, Eyes & Pink Headband (Ref 3) ── */}
        <group position={[0, 0.54, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.18, 16, 16]} scale={[1, 1.08, 0.95]} />
            <meshStandardMaterial color={skin} roughness={0.6} />
          </mesh>
          {/* Eyes */}
          {[-0.065, 0.065].map((ex, i) => (
            <group key={`w2-eye-${i}`} position={[ex, 0.02, 0.16]}>
              <mesh scale={[1, 1.2, 0.3]}>
                <sphereGeometry args={[0.04, 12, 12]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, 0, 0.03]}>
                <circleGeometry args={[0.022, 10]} />
                <meshStandardMaterial color="#78350f" />
              </mesh>
            </group>
          ))}
          {/* Red Lips */}
          <mesh position={[0, -0.075, 0.165]}>
            <sphereGeometry args={[0.026, 8, 8]} scale={[1.4, 0.5, 0.6]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          {/* Dark Bob Hair */}
          <mesh position={[0, 0.06, -0.02]}>
            <sphereGeometry args={[0.2, 16, 16]} scale={[1.05, 1.08, 1.1]} />
            <meshStandardMaterial color={hair} roughness={0.8} />
          </mesh>
          {/* Bright Pink Headband */}
          <mesh position={[0, 0.16, 0.02]} rotation={[0.2, 0, 0]}>
            <torusGeometry args={[0.19, 0.025, 6, 16, Math.PI]} />
            <meshStandardMaterial color={hotPinkTrim} />
          </mesh>
        </group>

        {/* ── Articulated Left Arm Carrying Bag ── */}
        <mesh position={[-0.22, 0.22, 0]}>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial color={pinkDress} />
        </mesh>
        <group position={[-0.22, 0.22, 0]}>
          <mesh position={[0, -0.09, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.042, 0.18, 8]} />
            <meshStandardMaterial color={pinkDress} />
          </mesh>
          <mesh position={[0, -0.18, 0]}>
            <sphereGeometry args={[0.042, 8, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          <mesh position={[0, -0.27, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.038, 0.18, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          <mesh position={[0, -0.38, 0]} castShadow>
            <sphereGeometry args={[0.04, 8, 8]} scale={[0.85, 1.2, 0.7]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {leftBag && (
            <WasteBag
              data={leftBag}
              position={[0, -0.40, 0.02]}
              isSelectable={canSelectBag ?? false}
              isSelected={selectedBagId === leftBag.id}
              onClick={() => onBagClick && onBagClick(leftBag.id)}
            />
          )}
        </group>

        {/* ── Articulated Right Arm Carrying Bag ── */}
        <mesh position={[0.22, 0.22, 0]}>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial color={pinkDress} />
        </mesh>
        <group position={[0.22, 0.22, 0]}>
          <mesh position={[0, -0.09, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.042, 0.18, 8]} />
            <meshStandardMaterial color={pinkDress} />
          </mesh>
          <mesh position={[0, -0.18, 0]}>
            <sphereGeometry args={[0.042, 8, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          <mesh position={[0, -0.27, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.038, 0.18, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          <mesh position={[0, -0.38, 0]} castShadow>
            <sphereGeometry args={[0.04, 8, 8]} scale={[0.85, 1.2, 0.7]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {rightBag && (
            <WasteBag
              data={rightBag}
              position={[0, -0.40, 0.02]}
              isSelectable={canSelectBag ?? false}
              isSelected={selectedBagId === rightBag.id}
              onClick={() => onBagClick && onBagClick(rightBag.id)}
            />
          )}
        </group>
      </group>
    </group>
  );
}

// ── HOSPITAL CLEANER (Ravi - Blue Jumpsuit, White Collar - Ref 6) ──
interface CleanerProps {
  position: [number, number, number];
  rotationY?: number;
  isWalking: boolean;
  bags: WasteBagData[];
  selectedBagId: string | null;
  onBagClick?: (bagId: string) => void;
  canSelectBag?: boolean;
}

function CharacterCleaner({
  position,
  rotationY = 0,
  isWalking,
  bags,
  selectedBagId,
  onBagClick,
  canSelectBag,
}: CleanerProps) {
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (isWalking) {
      const walk = state.clock.getElapsedTime() * 9;
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(walk) * 0.5;
        rightLegRef.current.rotation.x = -Math.sin(walk) * 0.5;
      }
    } else {
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      }
    }
  });

  const skin = "#fcd7ba";
  const hair = "#451a03";
  const jumpsuit = "#2563eb"; // Royal blue jumpsuit (Ref 6)
  const collar = "#f8fafc"; // White inner shirt collar
  const boots = "#0f172a";

  const leftBag = bags.find((b) => b.hand === "left" && !b.isDisposed);
  const rightBag = bags.find((b) => b.hand === "right" && !b.isDisposed);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* ── CONTINUOUS, SEAMLESS PELVIS & WAIST (Zero Gap between Torso and Legs) ── */}
      {/* Lower Pelvis Block enclosing leg tops */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.24, 0.26, 16]} />
        <meshStandardMaterial color={jumpsuit} roughness={0.7} />
      </mesh>
      {/* Mid Waist Section */}
      <mesh position={[0, 0.74, 0]} castShadow>
        <cylinderGeometry args={[0.225, 0.22, 0.18, 16]} />
        <meshStandardMaterial color={jumpsuit} roughness={0.7} />
      </mesh>
      {/* Black Utility Work Belt with Silver Buckle */}
      <mesh position={[0, 0.81, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 0.08, 16]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.81, 0.23]}>
        <boxGeometry args={[0.07, 0.05, 0.02]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
      </mesh>

      {/* ── Articulated Legs & Work Boots with Rounded Hip Joint Spheres inside Pants ── */}
      <group ref={leftLegRef} position={[-0.1, 0.52, 0]}>
        {/* Hip Joint Sphere inside Jumpsuit */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.072, 12, 12]} />
          <meshStandardMaterial color={jumpsuit} />
        </mesh>
        {/* Upper Thigh */}
        <mesh position={[0, -0.11, 0]} castShadow>
          <cylinderGeometry args={[0.068, 0.062, 0.22, 12]} />
          <meshStandardMaterial color={jumpsuit} />
        </mesh>
        {/* Knee Joint Sphere */}
        <mesh position={[0, -0.22, 0]}>
          <sphereGeometry args={[0.062, 10, 10]} />
          <meshStandardMaterial color={jumpsuit} />
        </mesh>
        {/* Lower Calf */}
        <mesh position={[0, -0.34, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.056, 0.22, 12]} />
          <meshStandardMaterial color={jumpsuit} />
        </mesh>
        {/* Work Boot */}
        <mesh position={[0, -0.48, 0.03]} castShadow>
          <boxGeometry args={[0.095, 0.08, 0.18]} />
          <meshStandardMaterial color={boots} />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[0.1, 0.52, 0]}>
        {/* Hip Joint Sphere inside Jumpsuit */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.072, 12, 12]} />
          <meshStandardMaterial color={jumpsuit} />
        </mesh>
        {/* Upper Thigh */}
        <mesh position={[0, -0.11, 0]} castShadow>
          <cylinderGeometry args={[0.068, 0.062, 0.22, 12]} />
          <meshStandardMaterial color={jumpsuit} />
        </mesh>
        {/* Knee Joint Sphere */}
        <mesh position={[0, -0.22, 0]}>
          <sphereGeometry args={[0.062, 10, 10]} />
          <meshStandardMaterial color={jumpsuit} />
        </mesh>
        {/* Lower Calf */}
        <mesh position={[0, -0.34, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.056, 0.22, 12]} />
          <meshStandardMaterial color={jumpsuit} />
        </mesh>
        {/* Work Boot */}
        <mesh position={[0, -0.48, 0.03]} castShadow>
          <boxGeometry args={[0.095, 0.08, 0.18]} />
          <meshStandardMaterial color={boots} />
        </mesh>
      </group>

      {/* ── Torso, Neck & Head (Seamlessly Overlaps Waist Section at y=0.82) ── */}
      <group position={[0, 0.82, 0]}>
        {/* Jumpsuit Chest / Back (bottom reaches y=0.81, creating 4cm overlap with belt/pelvis) */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.225, 0.38, 16]} />
          <meshStandardMaterial color={jumpsuit} roughness={0.7} />
        </mesh>
        {/* White Collar Peak at Chest */}
        <mesh position={[0, 0.34, 0.18]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.13, 0.09, 0.02]} />
          <meshStandardMaterial color={collar} />
        </mesh>
        {/* Neck inserting deeply into Torso */}
        <mesh position={[0, 0.40, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 0.14, 12]} />
          <meshStandardMaterial color={skin} />
        </mesh>

        {/* Head & Brown Hair (Ref 6) */}
        <group position={[0, 0.58, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.19, 16, 16]} scale={[1, 1.1, 0.98]} />
            <meshStandardMaterial color={skin} roughness={0.6} />
          </mesh>
          {/* Eyes & Smile */}
          {[-0.065, 0.065].map((ex, i) => (
            <mesh key={`cl-eye-${i}`} position={[ex, 0.02, 0.17]}>
              <sphereGeometry args={[0.03, 8, 8]} scale={[1, 1.2, 0.3]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
          ))}
          <mesh position={[0, -0.06, 0.17]}>
            <sphereGeometry args={[0.025, 8, 8]} scale={[1.2, 0.5, 0.4]} />
            <meshStandardMaterial color="#b91c1c" />
          </mesh>
          {/* Tousled Brown Hair */}
          <mesh position={[0, 0.1, -0.02]}>
            <sphereGeometry args={[0.21, 16, 16]} scale={[1.05, 1.05, 1.05]} />
            <meshStandardMaterial color={hair} roughness={0.8} />
          </mesh>
        </group>

        {/* ── Left Arm Carrying Bag ── */}
        <mesh position={[-0.24, 0.28, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={jumpsuit} />
        </mesh>
        <group position={[-0.24, 0.28, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.2, 8]} />
            <meshStandardMaterial color={jumpsuit} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <sphereGeometry args={[0.048, 8, 8]} />
            <meshStandardMaterial color={jumpsuit} />
          </mesh>
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.048, 0.044, 0.2, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          <mesh position={[0, -0.42, 0]} castShadow>
            <sphereGeometry args={[0.045, 8, 8]} scale={[1, 1.2, 0.8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {leftBag && (
            <WasteBag
              data={leftBag}
              position={[0, -0.44, 0.02]}
              isSelectable={canSelectBag ?? false}
              isSelected={selectedBagId === leftBag.id}
              onClick={() => onBagClick && onBagClick(leftBag.id)}
            />
          )}
        </group>

        {/* ── Right Arm Carrying Bag ── */}
        <mesh position={[0.24, 0.28, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={jumpsuit} />
        </mesh>
        <group position={[0.24, 0.28, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.2, 8]} />
            <meshStandardMaterial color={jumpsuit} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <sphereGeometry args={[0.048, 8, 8]} />
            <meshStandardMaterial color={jumpsuit} />
          </mesh>
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.048, 0.044, 0.2, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          <mesh position={[0, -0.42, 0]} castShadow>
            <sphereGeometry args={[0.045, 8, 8]} scale={[1, 1.2, 0.8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {rightBag && (
            <WasteBag
              data={rightBag}
              position={[0, -0.44, 0.02]}
              isSelectable={canSelectBag ?? false}
              isSelected={selectedBagId === rightBag.id}
              onClick={() => onBagClick && onBagClick(rightBag.id)}
            />
          )}
        </group>
      </group>
    </group>
  );
}


// ── ANIMATED SLIDING WASTE COMPONENT (Visible waste transfer from truck to tub) ──
function AnimatedSlidingWaste({ isUnloading }: { isUnloading: boolean }) {
  const wasteRef = useRef<THREE.Group>(null);
  const items = useRef<{ x: number; y: number; z: number; rx: number; rz: number }[]>(
    Array.from({ length: 8 }).map((_, i) => ({
      x: 0.85,
      y: 1.35,
      z: ((i % 4) - 1.5) * 0.18,
      rx: 0,
      rz: 0,
    }))
  );

  useFrame((state, delta) => {
    if (!wasteRef.current) return;
    const t = state.clock.getElapsedTime();
    if (isUnloading) {
      wasteRef.current.children.forEach((child, i) => {
        const item = items.current[i];
        const itemProgress = Math.min(1, Math.max(0, (t * 0.85 + i * 0.12) % 2.4 - 0.35));
        if (itemProgress > 0) {
          child.visible = true;
          // In local truck coordinates (truck is rotated by Math.PI in facility):
          // Chute is at +X (x = 0.85), slides out along +X towards tub (x = 1.65)
          child.position.x = 0.85 + itemProgress * 0.8;
          child.position.y = 1.35 - Math.pow(itemProgress, 1.4) * 0.9;
          child.position.z = item.z;
          child.rotation.x += delta * 4;
          child.rotation.z += delta * 3;
        } else {
          child.visible = false;
        }
      });
    } else {
      wasteRef.current.children.forEach((child) => {
        child.visible = false;
      });
    }
  });

  return (
    <group ref={wasteRef}>
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={`slide-waste-${i}`} visible={false}>
          {i % 3 === 0 ? (
            <mesh castShadow>
              <sphereGeometry args={[0.13, 8, 8]} scale={[1.2, 0.85, 1.1]} />
              <meshStandardMaterial color="#dc2626" roughness={0.7} />
            </mesh>
          ) : i % 3 === 1 ? (
            <mesh castShadow>
              <boxGeometry args={[0.18, 0.22, 0.18]} />
              <meshStandardMaterial color="#eab308" roughness={0.6} />
            </mesh>
          ) : (
            <mesh castShadow>
              <cylinderGeometry args={[0.09, 0.09, 0.22, 8]} />
              <meshStandardMaterial color="#b91c1c" metalness={0.4} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// ── YELLOW SPECIAL CARE & HAZARDOUS WASTE COLLECTION TRUCK ──
interface TruckProps {
  positionX: number;
  positionZ?: number;
  rotationY?: number;
  isWorkersOutside: boolean;
  workerActionPos?: [number, number, number];
  isTippingCompactor?: boolean;
  isUnloadingWaste?: boolean;
  isResult?: boolean;
}

function WasteCollectionTruck({
  positionX,
  positionZ = 1.8,
  rotationY = 0,
  isWorkersOutside,
  workerActionPos = [1.0, 0, 1.4],
  isTippingCompactor = false,
  isUnloadingWaste = false,
  isResult = false,
}: TruckProps) {
  const compactorRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (compactorRef.current) {
      const targetRot = isTippingCompactor ? -0.62 : 0;
      compactorRef.current.rotation.z += (targetRot - compactorRef.current.rotation.z) * 3.5 * delta;
    }
  });

  const truckYellow = "#eab308";
  const hazardStripe = "#ca8a04";

  return (
    <group position={[positionX, 0, positionZ]} rotation={[0, rotationY, 0]}>
      {/* ── Main Truck Chassis Frame ── */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[4.4, 0.22, 1.5]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 6 Heavy-Duty Wheels */}
      {[-1.4, 0.6, 1.5].map((wx, wi) => (
        <group key={`wheel-pair-${wi}`} position={[wx, 0.28, 0]}>
          <mesh position={[0, 0, 0.82]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.18, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.83]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.14, 12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, -0.82]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.18, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, -0.83]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.14, 12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* ── FRONT CABIN (Facing local -X direction) ── */}
      <group position={[-1.3, 0.45, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.8, 1.5]} />
          <meshStandardMaterial color={truckYellow} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.25, 0]} castShadow>
          <boxGeometry args={[1.4, 0.1, 1.48]} />
          <meshStandardMaterial color={truckYellow} roughness={0.4} />
        </mesh>
        <mesh position={[-0.78, 0.42, 0]} castShadow>
          <boxGeometry args={[0.06, 0.55, 1.42]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[-0.8, 0.5, 0.5]}>
          <boxGeometry args={[0.04, 0.16, 0.24]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[-0.8, 0.5, -0.5]}>
          <boxGeometry args={[0.04, 0.16, 0.24]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.6} />
        </mesh>

        <mesh position={[-0.55, 0.95, 0]} rotation={[0, 0, 0.2]}>
          <planeGeometry args={[1.38, 0.65]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.65} roughness={0.1} />
        </mesh>
        <mesh position={[-0.05, 0.78, 0.76]}>
          <boxGeometry args={[0.85, 0.5, 0.02]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.65} roughness={0.1} />
        </mesh>
        <mesh position={[-0.05, 0.78, -0.76]}>
          <boxGeometry args={[0.85, 0.5, 0.02]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.65} roughness={0.1} />
        </mesh>

        {/* Amber Hazard Roof Beacons */}
        <mesh position={[-0.3, 1.34, 0.45]}>
          <boxGeometry args={[0.18, 0.12, 0.18]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[-0.3, 1.34, -0.45]}>
          <boxGeometry args={[0.18, 0.12, 0.18]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>

        {/* Driver Interior */}
        <mesh position={[-0.52, 0.44, 0]}>
          <boxGeometry args={[0.34, 0.36, 1.36]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.1, 0.38, 0.3]}>
          <boxGeometry args={[0.42, 0.38, 0.42]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[0.26, 0.7, 0.3]}>
          <boxGeometry args={[0.12, 0.45, 0.38]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[-0.36, 0.7, 0.3]} rotation={[0, 0, -0.6]}>
          <torusGeometry args={[0.11, 0.02, 6, 14]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Driver Seated at Steering Wheel */}
        <group position={[0.08, 0.58, 0.3]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.28, 0.36, 0.3]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshStandardMaterial color="#fcd7ba" />
          </mesh>
          <mesh position={[0, 0.37, 0]}>
            <sphereGeometry args={[0.12, 10, 10]} scale={[1, 0.65, 1]} />
            <meshStandardMaterial color="#eab308" />
          </mesh>
          <mesh position={[-0.2, 0.1, 0]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.26, 0.08, 0.24]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
        </group>

        {/* Side Mirrors */}
        <group position={[-0.55, 0.74, 0.88]}>
          <mesh>
            <boxGeometry args={[0.04, 0.04, 0.22]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0, 0.11]}>
            <boxGeometry args={[0.06, 0.26, 0.12]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
        <group position={[-0.55, 0.74, -0.88]}>
          <mesh>
            <boxGeometry args={[0.04, 0.04, 0.22]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0, -0.11]}>
            <boxGeometry args={[0.06, 0.26, 0.12]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      </group>

      {/* ── REAR COMPACTOR CONTAINER (Pivots at Rear Axle Hinge x=1.35, y=0.35) ── */}
      <group position={[1.35, 0.35, 0]}>
        <group ref={compactorRef}>
          <mesh position={[-1.25, 0.85, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 1.55, 1.54]} />
            <meshStandardMaterial color={hazardStripe} roughness={0.5} />
          </mesh>
          <mesh position={[-1.25, 0.5, 0.78]}>
            <planeGeometry args={[2.3, 0.28]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          {!isResult && (
            <Html position={[-1.25, 0.5, 0.79]} center transform distanceFactor={5} pointerEvents="none">
              <div className="font-black text-[8px] text-white tracking-wider uppercase select-none whitespace-nowrap bg-red-900/80 px-2 py-0.5 rounded-xs">
                HAZARDOUS &amp; SPECIAL CARE
              </div>
            </Html>
          )}

          {/* Tailgate & Open Intake Waste Hopper at REAR (+X side) */}
          <mesh position={[0.07, 0.75, 0]} castShadow>
            <boxGeometry args={[0.26, 1.25, 1.48]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
          <mesh position={[0.18, 0.45, 0]} rotation={[0, 0, 0.3]} castShadow>
            <boxGeometry args={[0.3, 0.5, 1.2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ── VISIBLE SLIDING WASTE TRANSFER ANIMATION ── */}
      <AnimatedSlidingWaste isUnloading={isUnloadingWaste} />

      {/* ── TWO SANITATION WORKERS ── */}
      {isWorkersOutside && (
        <group position={[workerActionPos[0] - positionX, 0, workerActionPos[2] - positionZ]}>
          {[-0.24, 0.24].map((ox, oi) => (
            <group key={`sworker-${oi}`} position={[ox, 0, 0]}>
              <mesh position={[-0.07, 0.08, 0]} castShadow>
                <boxGeometry args={[0.08, 0.16, 0.16]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
              <mesh position={[0.07, 0.08, 0]} castShadow>
                <boxGeometry args={[0.08, 0.16, 0.16]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
              <mesh position={[-0.07, 0.32, 0]} castShadow>
                <cylinderGeometry args={[0.045, 0.04, 0.34, 8]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
              <mesh position={[0.07, 0.32, 0]} castShadow>
                <cylinderGeometry args={[0.045, 0.04, 0.34, 8]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
              <mesh position={[0, 0.72, 0]} castShadow>
                <boxGeometry args={[0.26, 0.38, 0.2]} />
                <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.2} />
              </mesh>
              <mesh position={[0, 0.72, 0.105]}>
                <boxGeometry args={[0.24, 0.06, 0.01]} />
                <meshStandardMaterial color="#f8fafc" />
              </mesh>
              <mesh position={[-0.16, 0.85, 0]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#22c55e" />
              </mesh>
              <mesh position={[0.16, 0.85, 0]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#22c55e" />
              </mesh>
              <group position={[0, 0.78, 0.15]} rotation={[0.6, 0, 0]}>
                <mesh position={[-0.12, 0, 0.1]}>
                  <boxGeometry args={[0.06, 0.06, 0.22]} />
                  <meshStandardMaterial color="#22c55e" />
                </mesh>
                <mesh position={[0.12, 0, 0.1]}>
                  <boxGeometry args={[0.06, 0.06, 0.22]} />
                  <meshStandardMaterial color="#22c55e" />
                </mesh>
                <mesh position={[-0.12, 0, 0.22]}>
                  <sphereGeometry args={[0.04, 8, 8]} />
                  <meshStandardMaterial color="#f8fafc" />
                </mesh>
                <mesh position={[0.12, 0, 0.22]}>
                  <sphereGeometry args={[0.04, 8, 8]} />
                  <meshStandardMaterial color="#f8fafc" />
                </mesh>
              </group>
              <mesh position={[0, 1.05, 0]}>
                <cylinderGeometry args={[0.04, 0.05, 0.1, 8]} />
                <meshStandardMaterial color="#fcd7ba" />
              </mesh>
              <mesh position={[0, 1.15, 0]}>
                <sphereGeometry args={[0.1, 10, 10]} />
                <meshStandardMaterial color="#fcd7ba" />
              </mesh>
              <mesh position={[0, 1.23, 0]}>
                <sphereGeometry args={[0.12, 10, 10]} scale={[1, 0.65, 1]} />
                <meshStandardMaterial color="#eab308" />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}


// 10. GARDEN CLEANING ITEMS: BROOM, TRAY & SCATTERED LITTER PILE
// ═════════════════════════════════════════════════════════════════════════════

interface GardenItemsProps {
  showBroomOnGround: boolean;
  showTrayOnGround: boolean;
  isSweptIntoPile: boolean;
  isDebrisCollected: boolean;
  onBroomClick: () => void;
  onTrayClick: () => void;
  canClickBroom: boolean;
  canClickTray: boolean;
}

function GardenCleaningArea({
  showBroomOnGround,
  showTrayOnGround,
  isSweptIntoPile,
  isDebrisCollected,
  onBroomClick,
  onTrayClick,
  canClickBroom,
  canClickTray,
}: GardenItemsProps) {
  return (
    <group position={[-4.0, 0, -0.7]}>
      {/* ── Scattered Garden Litter (Leaves, Paper Scraps, Dust) ── */}
      {!isDebrisCollected && (
        <group>
          {isSweptIntoPile ? (
            /* Gathered neat pile */
            <mesh position={[0.2, 0.04, 0.1]} castShadow>
              <sphereGeometry args={[0.22, 12, 8]} scale={[1, 0.35, 1]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
          ) : (
            /* Scattered natural debris beneath tree */
            [
              [-0.4, 0, -0.3],
              [0.3, 0, -0.2],
              [-0.2, 0, 0.4],
              [0.4, 0, 0.3],
              [0.1, 0, 0.0],
              [-0.5, 0, 0.2],
            ].map((lp, li) => (
              <group key={`leaf-${li}`} position={lp as [number, number, number]}>
                {/* Dry Autumn Leaf */}
                <mesh position={[0, 0.015, 0]} rotation={[0, li * 1.2, 0]}>
                  <cylinderGeometry args={[0.08, 0.04, 0.01, 5]} />
                  <meshStandardMaterial color={li % 2 === 0 ? "#b45309" : "#15803d"} />
                </mesh>
                {/* Paper scrap */}
                {li % 3 === 0 && (
                  <mesh position={[0.06, 0.016, 0.04]} rotation={[0, 0.8, 0]}>
                    <planeGeometry args={[0.06, 0.05]} />
                    <meshStandardMaterial color="#f8fafc" />
                  </mesh>
                )}
              </group>
            ))
          )}
        </group>
      )}

      {/* ── Ground Broom (Clickable when prompt active) ── */}
      {showBroomOnGround && (
        <group position={[0.7, 0.04, -0.2]} rotation={[0.1, 0.4, 1.45]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.018, 0.018, 1.1, 8]} />
            <meshStandardMaterial color="#92400e" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.55, 0]} castShadow>
            <coneGeometry args={[0.18, 0.3, 8]} />
            <meshStandardMaterial color="#ca8a04" roughness={0.9} />
          </mesh>
          {/* Clickable Hit Cylinder */}
          {canClickBroom && (
            <mesh
              position={[0, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onBroomClick();
              }}
              onPointerOver={() => {
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "auto";
              }}
            >
              <cylinderGeometry args={[0.3, 0.3, 1.2, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          )}
        </group>
      )}

      {/* ── Ground Collection Tray (Clickable when prompt active) ── */}
      {showTrayOnGround && (
        <group position={[0.6, 0.03, 0.4]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.36, 0.06, 0.34]} />
            <meshStandardMaterial color="#0284c7" metalness={0.4} />
          </mesh>
          {canClickTray && (
            <mesh
              position={[0, 0.1, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onTrayClick();
              }}
              onPointerOver={() => {
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "auto";
              }}
            >
              <boxGeometry args={[0.5, 0.3, 0.5]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 11. DAYLIGHT SKY, ENVIRONMENT ROAD, TREES & GRASS
// ═════════════════════════════════════════════════════════════════════════════

function NaturalEnvironment({ scene }: { scene: ActiveScene }) {
  return (
    <>
      {/* Daylight Lighting */}
      <ambientLight intensity={0.95} color="#ffffff" />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* ── Base Ground Surface: Warm Light-Brown Soil / Earthy Ground Color ── */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color="#c49a6c" roughness={0.9} />
      </mesh>

      {/* ── Scene 1: Residential Gardens (Organic Home Garden Patches & Pathway) ── */}
      {scene === "NEIGHBOURHOOD" && (
        <group>
          {/* House 1 Front Garden Organic Grass Lawn */}
          <group position={[-3.4, 0.002, -1.8]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[2.2, 28]} />
              <meshStandardMaterial color="#48bb78" roughness={0.85} />
            </mesh>
            {/* Shaded Soil Bed beneath Tree A for Sweeping Activity */}
            <mesh position={[-0.8, 0.003, 0.9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[1.5, 24]} />
              <meshStandardMaterial color="#8c6239" roughness={0.95} />
            </mesh>
          </group>

          {/* House 2 Front Garden Organic Grass Lawn */}
          <group position={[1.2, 0.002, -1.8]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[2.0, 28]} />
              <meshStandardMaterial color="#48bb78" roughness={0.85} />
            </mesh>
          </group>

          {/* Stepping Stone Pavers from House 1 Door to Sidewalk */}
          {[-2.0, -1.5, -1.0, -0.5, 0.0].map((pz, pi) => (
            <mesh key={`pave1-${pi}`} position={[-2.8, 0.003, pz]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.22, 12]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
            </mesh>
          ))}

          {/* Stepping Stone Pavers from House 2 Door to Sidewalk */}
          {[-2.0, -1.5, -1.0, -0.5, 0.0].map((pz, pi) => (
            <mesh key={`pave2-${pi}`} position={[1.0, 0.003, pz]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.22, 12]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
            </mesh>
          ))}

          {/* Right-side Paved Pathway for the 4 Waste Bins (from x = 1.6 to 4.6) */}
          <mesh position={[3.1, 0.004, 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[3.2, 1.2]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
          </mesh>

          {/* Flowering bushes and shrubs along yard boundaries */}
          {[-4.8, -1.6, 0.2, 2.4, 4.4].map((bx, bi) => (
            <mesh key={`shrub-${bi}`} position={[bx, 0.22, -0.8]} castShadow>
              <sphereGeometry args={[0.26, 10, 10]} scale={[1.2, 0.9, 1.0]} />
              <meshStandardMaterial color={bi % 2 === 0 ? "#16a34a" : "#22c55e"} />
            </mesh>
          ))}
        </group>
      )}

      {/* ── Scene 2: Hospital Environment Landscaping ── */}
      {scene === "HOSPITAL" && (
        <group>
          {/* Paved Verge for the 2 Hospital Waste Bins (Yellow & Red at x = 2.5 and 3.5) */}
          <mesh position={[3.0, 0.004, 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[2.4, 1.2]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
          </mesh>
        </group>
      )}

      {/* ── Wide Asphalt Road in Foreground (z = 1.8) for waste truck ── */}
      <mesh position={[0, 0.005, 1.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 3.2]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      {/* White Road Center Dashed Line */}
      {[-12, -8, -4, 0, 4, 8, 12].map((rx, ri) => (
        <mesh key={`rdash-${ri}`} position={[rx, 0.01, 1.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.0, 0.14]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}

            {/* ── Puffy Soft 3D Clouds in Sky ── */}
      <group position={[0, 9.0, -8.0]}>
        {[-6, 4].map((cx, ci) => (
          <group key={`cloud-${ci}`} position={[cx, 0, 0]}>
            <mesh>
              <sphereGeometry args={[1.6, 12, 12]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.88} />
            </mesh>
            <mesh position={[1.1, -0.2, 0]}>
              <sphereGeometry args={[1.2, 12, 12]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
            </mesh>
            <mesh position={[-1.1, -0.2, 0]}>
              <sphereGeometry args={[1.2, 12, 12]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 12. MAIN LAB #28 COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function EnvironmentalSustainabilityLab() {
  const { playPop, playSuccess, playClick, playChime, playError } = useLabAudio();
  const { reportComplete } = useLMSBridge("environmental-sustainability");
  const { width, height } = useWindowSize();

  // ── HEADER STATE ──
  const [seconds, setSeconds] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  // ── GAMEPLAY STATE & ACTIVE SCENE ──
  const [scene, setScene] = useState<ActiveScene>("NEIGHBOURHOOD");
  const [phase, setPhase] = useState<GamePhase>("W1_EMERGE");
  const [activeSpeech, setActiveSpeech] = useState<{ text: string; isAlert: boolean } | null>(null);

  // ── BAGS & SELECTION STATE ──
  const [w1Bags, setW1Bags] = useState<WasteBagData[]>([
    {
      id: "w1_dry",
      label: "DRY WASTE",
      category: "DRY",
      correctBin: "BLUE",
      color: "#2563eb", // Blue bag = Dry waste (Prompt Color Code)
      textColor: "#ffffff",
      hand: "left",
      isDisposed: false,
    },
    {
      id: "w1_sanitary",
      label: "SANITARY WASTE",
      category: "SANITARY",
      correctBin: "YELLOW",
      color: "#eab308", // Yellow bag = Sanitary waste (Prompt Color Code)
      textColor: "#ffffff",
      hand: "right",
      isDisposed: false,
    },
  ]);

  const [w2Bags, setW2Bags] = useState<WasteBagData[]>([
    {
      id: "w2_dry",
      label: "DRY WASTE",
      category: "DRY",
      correctBin: "BLUE",
      color: "#2563eb", // Blue bag = Dry waste
      textColor: "#ffffff",
      hand: "left",
      isDisposed: false,
    },
    {
      id: "w2_hazard",
      label: "SPECIAL CARE WASTE",
      category: "HAZARDOUS",
      correctBin: "RED",
      color: "#dc2626", // Red bag = Special care / hazardous waste
      textColor: "#ffffff",
      hand: "right",
      isDisposed: false,
    },
  ]);

  const [cleanerBags, setCleanerBags] = useState<WasteBagData[]>([
    {
      id: "cl_sanitary",
      label: "SANITARY WASTE",
      category: "SANITARY",
      correctBin: "YELLOW",
      color: "#eab308", // Yellow bag = Sanitary waste
      textColor: "#ffffff",
      hand: "left",
      isDisposed: false,
    },
    {
      id: "cl_hazard",
      label: "SPECIAL CARE WASTE",
      category: "HAZARDOUS",
      correctBin: "RED",
      color: "#dc2626", // Red bag = Special care / hazardous waste
      textColor: "#ffffff",
      hand: "right",
      isDisposed: false,
    },
  ]);

  const [selectedBagId, setSelectedBagId] = useState<string | null>(null);

  // ── CHARACTER 3D POSITIONS & ORIENTATIONS FOR DYNAMIC MOVEMENT ──
  const [w1Pos, setW1Pos] = useState<[number, number, number]>([-2.8, 0, -2.4]);
  const [w1RotY, setW1RotY] = useState<number>(0.2);
  const [w2Pos, setW2Pos] = useState<[number, number, number]>([1.0, 0, -2.5]);
  const [w2RotY, setW2RotY] = useState<number>(0.0);
  const [cleanerPos, setCleanerPos] = useState<[number, number, number]>([-0.4, 0, -2.8]);
  const [cleanerRotY, setCleanerRotY] = useState<number>(0.0);
  const [facilityWasteLevel, setFacilityWasteLevel] = useState<number>(0);

  // ── GARDEN SWEEPING STATE ──
  const [hasBroomInHand, setHasBroomInHand] = useState<boolean>(false);
  const [hasTrayInHand, setHasTrayInHand] = useState<boolean>(false);
  const [isSweptIntoPile, setIsSweptIntoPile] = useState<boolean>(false);
  const [isDebrisCollected, setIsDebrisCollected] = useState<boolean>(false);

  // ── TRUCK POSITION & ACTION STATE ──
  // ── DUSTBIN DYNAMIC OFFSETS (For Visible Collection & Exact Return) ──
  const [binOffsets, setBinOffsets] = useState<Record<BinColor, [number, number, number]>>({
    GREEN: [0, 0, 0],
    BLUE: [0, 0, 0],
    YELLOW: [0, 0, 0],
    RED: [0, 0, 0],
  });

  const [workerPos, setWorkerPos] = useState<[number, number, number]>([0.8, 0, 1.4]);

  // ── TRUCK POSITION (Enters from RIGHT, travels towards LEFT) ──
  const [truckX, setTruckX] = useState<number>(9.0);
  const [isWorkersOutside, setIsWorkersOutside] = useState<boolean>(false);
  const [isCompactorTipping, setIsCompactorTipping] = useState<boolean>(false);

  // ── RESULTS STATS ──
  const [segregatedCount, setSegregatedCount] = useState<number>(0);
  const [collectionsCompleted, setCollectionsCompleted] = useState<number>(0);

  // ── TIMER EFFECT ──
  useEffect(() => {
    if (!timerActive || showWelcome || phase === "RESULT") return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, showWelcome, phase]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, []);

  const triggerSound = useCallback(
    (action: "pop" | "click" | "success" | "chime" | "error") => {
      if (isAudioMuted) return;
      if (action === "pop") playPop();
      if (action === "click") playClick();
      if (action === "success") playSuccess();
      if (action === "chime") playChime();
      if (action === "error") playError();
    },
    [isAudioMuted, playPop, playClick, playSuccess, playChime, playError]
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // ── SPEECH BUBBLE MESSAGE UPDATES BASED ON CURRENT ACTIVE PHASE ──
  useEffect(() => {
    if (showWelcome || phase === "RESULT") {
      setActiveSpeech(null);
      return;
    }

    switch (phase) {
      case "W1_SELECT_BAG":
        setActiveSpeech({ text: "Click the bag to pick it up!", isAlert: false });
        break;
      case "W1_SELECT_BIN":
        setActiveSpeech({ text: "Choose the correct bin.", isAlert: false });
        break;
      case "W1_BROOM_PROMPT":
        setActiveSpeech({ text: "Pick up the broom to clean the garden!", isAlert: false });
        break;
      case "W1_TRAY_PROMPT":
        setActiveSpeech({ text: "Collect the swept leaves into the tray!", isAlert: false });
        break;
      case "W1_GREEN_DISPOSE":
        setActiveSpeech({ text: "Click the green bin to dispose of garden waste!", isAlert: false });
        break;
      case "W2_SELECT_BAG":
        setActiveSpeech({ text: "Click the bag to pick it up!", isAlert: false });
        break;
      case "W2_SELECT_BIN":
        setActiveSpeech({ text: "Choose the correct bin.", isAlert: false });
        break;
      case "TRUCK1_PROMPT":
        setActiveSpeech({ text: "Click the red bin to collect special-care waste!", isAlert: false });
        break;
      case "CLEANER_SELECT_BAG":
        setActiveSpeech({ text: "Click the bag to pick it up!", isAlert: false });
        break;
      case "CLEANER_SELECT_BIN":
        setActiveSpeech({ text: "Choose the correct bin.", isAlert: false });
        break;
      case "TRUCK2_PROMPT_YEL":
        setActiveSpeech({ text: "Click the yellow bin to collect hospital sanitary waste!", isAlert: false });
        break;
      case "TRUCK2_PROMPT_RED":
        setActiveSpeech({ text: "Click the red bin to collect special-care waste!", isAlert: false });
        break;
      case "FACILITY_UNLOAD_PROMPT":
        setActiveSpeech({ text: "Click the tub to unload the waste!", isAlert: false });
        break;
      default:
        setActiveSpeech(null);
        break;
    }
  }, [phase, showWelcome]);

  // ── SEQUENCES & FLOW LOGIC ──

  // 1. Start Game: Woman 1 walks out of House 1 entrance
  const handleStartGame = () => {
    triggerSound("click");
    setShowWelcome(false);
    setTimerActive(true);
    setScene("NEIGHBOURHOOD");
    setPhase("W1_EMERGE");
    setW1Pos([-2.8, 0, -2.4]);
    setW1RotY(0.2);

    // Animate Woman 1 walking from House 1 entrance out to garden path
    let step = 0;
    const totalSteps = 25;
    const startX = -2.8;
    const startZ = -2.4;
    const targetX = -2.0;
    const targetZ = 0.2;
    const walkInterval = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      setW1Pos([startX + (targetX - startX) * progress, 0, startZ + (targetZ - startZ) * progress]);
      if (step >= totalSteps) {
        clearInterval(walkInterval);
        setPhase("W1_SELECT_BAG");
      }
    }, 40);
  };

  // 2. Select Bag Handler
  const handleSelectBag = (bagId: string) => {
    triggerSound("pop");
    setSelectedBagId(bagId);
    if (phase === "W1_SELECT_BAG") setPhase("W1_SELECT_BIN");
    if (phase === "W2_SELECT_BAG") setPhase("W2_SELECT_BIN");
    if (phase === "CLEANER_SELECT_BAG") setPhase("CLEANER_SELECT_BIN");
  };

  // 3. Bin Click Handler with Validation
  const handleBinClick = (binColor: BinColor) => {
    // Truck Collection Handling in Scene 1 (Truck stopped to LEFT of bins at truckX = -0.4)
    if (phase === "TRUCK1_PROMPT") {
      if (binColor === "RED") {
        triggerSound("success");
        setPhase("TRUCK1_COLLECTING");
        setIsWorkersOutside(true);
        setWorkerPos([0.8, 0, 1.4]);

        // Phase 1: Workers walk from truck rear (0.8) to Red Bin (3.9)
        let s1 = 0;
        const total1 = 20;
        const walkToBin = setInterval(() => {
          s1++;
          const p = s1 / total1;
          const curWX = 0.8 + (3.9 - 0.8) * p;
          setWorkerPos([curWX, 0, 1.4 - 0.6 * p]);
          if (s1 >= total1) {
            clearInterval(walkToBin);

            // Phase 2: Workers carry Red Bin to Truck Hopper (0.8)
            let s2 = 0;
            const total2 = 20;
            const carryToTruck = setInterval(() => {
              s2++;
              const p2 = s2 / total2;
              const curWX2 = 3.9 + (0.8 - 3.9) * p2;
              const curWZ2 = 0.8 + (1.4 - 0.8) * p2;
              setWorkerPos([curWX2, 0, curWZ2]);
              // Bin follows workers
              setBinOffsets((prev) => ({
                ...prev,
                RED: [(0.8 - 3.9) * p2, 0.15 * Math.sin(p2 * Math.PI), (1.4 - 0.8) * p2],
              }));

              if (s2 >= total2) {
                clearInterval(carryToTruck);
                triggerSound("chime");

                // Phase 3: Workers carry emptied Red Bin back to EXACT original position
                setTimeout(() => {
                  let s3 = 0;
                  const total3 = 20;
                  const returnBin = setInterval(() => {
                    s3++;
                    const p3 = s3 / total3;
                    const curWX3 = 0.8 + (3.9 - 0.8) * p3;
                    const curWZ3 = 1.4 + (0.8 - 1.4) * p3;
                    setWorkerPos([curWX3, 0, curWZ3]);
                    // Bin returns to original position
                    setBinOffsets((prev) => ({
                      ...prev,
                      RED: [(0.8 - 3.9) * (1 - p3), 0.15 * Math.sin(p3 * Math.PI), (1.4 - 0.8) * (1 - p3)],
                    }));

                    if (s3 >= total3) {
                      clearInterval(returnBin);
                      setBinOffsets((prev) => ({ ...prev, RED: [0, 0, 0] }));
                      setCollectionsCompleted((c) => c + 1);
                      setScore((s) => s + 15);

                      // Phase 4: Workers return to truck cab and drive away towards LEFT
                      setTimeout(() => {
                        setIsWorkersOutside(false);
                        setPhase("TRUCK1_EXIT");
                        let curTX = -0.4;
                        const driveLeft = setInterval(() => {
                          curTX -= 0.3;
                          setTruckX(curTX);
                          if (curTX <= -11.0) {
                            clearInterval(driveLeft);
                            // Transition to Scene 2: Hospital Environment
                            setScene("HOSPITAL");
                            setTruckX(9.0);
                            setPhase("HOSPITAL_INIT");
                            setCleanerPos([-0.4, 0, -2.8]);
                            setCleanerRotY(0.0);
                            setTimeout(() => {
                              // Cleaner Ravi emerges from staff emergency door
                              setPhase("CLEANER_EMERGE");
                              let clStep = 0;
                              const clTotal = 25;
                              const clWalk = setInterval(() => {
                                clStep++;
                                const p = clStep / clTotal;
                                setCleanerPos([-0.4 + (0.6 - -0.4) * p, 0, -2.8 + (0.2 - -2.8) * p]);
                                if (clStep >= clTotal) {
                                  clearInterval(clWalk);
                                  setPhase("CLEANER_SELECT_BAG");
                                }
                              }, 40);
                            }, 800);
                          }
                        }, 40);
                      }, 400);
                    }
                  }, 40);
                }, 600);
              }
            }, 40);
          }
        }, 40);
      } else {
        triggerSound("error");
        setActiveSpeech({ text: "The special-care truck collects the RED bin only!", isAlert: true });
      }
      return;
    }

    if (phase === "TRUCK2_PROMPT_RED") {
      if (binColor === "YELLOW") {
        // Yellow bin must NOT be collected; it remains at the hospital
        triggerSound("error");
        setActiveSpeech({
          text: "The yellow sanitary waste bin stays at the hospital. Click the RED bin for special-care disposal!",
          isAlert: true,
        });
        return;
      }
      if (binColor === "RED") {
        triggerSound("success");
        setPhase("TRUCK2_COLLECT_RED");
        setIsWorkersOutside(true);

        // Workers walk to Red bin (3.5), carry to truck (0.8), return to 3.5
        let s = 0;
        const total = 18;
        const walkR = setInterval(() => {
          s++;
          const p = s / total;
          setWorkerPos([0.8 + (3.5 - 0.8) * p, 0, 1.4 - 0.6 * p]);
          if (s >= total) {
            clearInterval(walkR);
            let s2 = 0;
            const carryR = setInterval(() => {
              s2++;
              const p2 = s2 / total;
              setWorkerPos([3.5 + (0.8 - 3.5) * p2, 0, 0.8 + (1.4 - 0.8) * p2]);
              setBinOffsets((prev) => ({
                ...prev,
                RED: [(0.8 - 3.5) * p2, 0.15 * Math.sin(p2 * Math.PI), (1.4 - 0.8) * p2],
              }));
              if (s2 >= total) {
                clearInterval(carryR);
                triggerSound("chime");
                setTimeout(() => {
                  let s3 = 0;
                  const retR = setInterval(() => {
                    s3++;
                    const p3 = s3 / total;
                    setWorkerPos([0.8 + (3.5 - 0.8) * p3, 0, 1.4 + (0.8 - 1.4) * p3]);
                    setBinOffsets((prev) => ({
                      ...prev,
                      RED: [(0.8 - 3.5) * (1 - p3), 0.15 * Math.sin(p3 * Math.PI), (1.4 - 0.8) * (1 - p3)],
                    }));
                    if (s3 >= total) {
                      clearInterval(retR);
                      setBinOffsets((prev) => ({ ...prev, RED: [0, 0, 0] }));
                      setCollectionsCompleted((c) => c + 1);
                      setScore((sc) => sc + 15);

                      // Truck exits hospital towards LEFT
                      setTimeout(() => {
                        setIsWorkersOutside(false);
                        setPhase("TRUCK2_EXIT");
                        let curTX = -0.4;
                        const driveHospLeft = setInterval(() => {
                          curTX -= 0.3;
                          setTruckX(curTX);
                          if (curTX <= -11.0) {
                            clearInterval(driveHospLeft);
                            // Transition to Scene 3: Hazardous Waste Disposal Facility
                            setScene("FACILITY");
                            setTruckX(8.0);
                            setPhase("FACILITY_ARRIVE");
                            setTimeout(() => {
                              // Truck enters the compound in REVERSE through the gate and positions its rear unloading section toward the tub
                              let fX = 8.0;
                              const facDrive = setInterval(() => {
                                fX -= 0.18;
                                setTruckX(fX);
                                if (fX <= -1.8) {
                                  clearInterval(facDrive);
                                  // Truck safely parked in reverse: rear facing tub at x = -4.8
                                  setPhase("FACILITY_UNLOAD_PROMPT");
                                  setActiveSpeech({ text: "Click the tub to unload the waste!", isAlert: false });
                                }
                              }, 40);
                            }, 500);
                          }
                        }, 40);
                      }, 400);
                    }
                  }, 40);
                }, 400);
              }
            }, 40);
          }
        }, 40);
      } else {
        triggerSound("error");
        setActiveSpeech({ text: "Click the RED bin to collect special-care waste!", isAlert: true });
      }
      return;
    }

    // Woman 1 Garden Waste Disposal into Green Bin (1.8)
    if (phase === "W1_GREEN_DISPOSE") {
      if (binColor === "GREEN") {
        triggerSound("success");
        setHasTrayInHand(false);
        setIsDebrisCollected(true);
        setScore((s) => s + 15);
        setPhase("W1_RETURN");
        setW1RotY(3.14);

        // Woman 1 walks back into House 1 entrance (-2.8, -2.4)
        let step = 0;
        const totalSteps = 25;
        const startX = 1.2;
        const startZ = 0.3;
        const targetX = -2.8;
        const targetZ = -2.4;
        const walkInterval = setInterval(() => {
          step++;
          const progress = step / totalSteps;
          setW1Pos([startX + (targetX - startX) * progress, 0, startZ + (targetZ - startZ) * progress]);
          if (step >= totalSteps) {
            clearInterval(walkInterval);
            // Woman 1 safely inside House 1!
            // Sequential Flow: Woman 2 now emerges from House 2 entrance (1.0, -2.4)!
            setPhase("W2_EMERGE");
            setW2Pos([1.0, 0, -2.5]);
            setW2RotY(0.0);
            let step2 = 0;
            const totalSteps2 = 25;
            const sX2 = 1.0;
            const sZ2 = -2.5;
            const tX2 = 1.0;
            const tZ2 = 0.2;
            const walk2 = setInterval(() => {
              step2++;
              const p2 = step2 / totalSteps2;
              setW2Pos([sX2 + (tX2 - sX2) * p2, 0, sZ2 + (tZ2 - sZ2) * p2]);
              if (step2 >= totalSteps2) {
                clearInterval(walk2);
                setPhase("W2_SELECT_BAG");
              }
            }, 40);
          }
        }, 40);
      } else {
        triggerSound("error");
        setActiveSpeech({ text: "Garden leaves and wet waste belong in the GREEN bin!", isAlert: true });
      }
      return;
    }

    // Bag Segregation Matching Check
    if (!selectedBagId) return;

    let activeBags = w1Bags;
    let setBags = setW1Bags;
    if (phase === "W2_SELECT_BIN") {
      activeBags = w2Bags;
      setBags = setW2Bags;
    } else if (phase === "CLEANER_SELECT_BIN") {
      activeBags = cleanerBags;
      setBags = setCleanerBags;
    }

    const currentBag = activeBags.find((b) => b.id === selectedBagId);
    if (!currentBag) return;

    if (currentBag.correctBin === binColor) {
      // Correct Bin Selection!
      triggerSound("success");
      setBags((prev) =>
        prev.map((b) => (b.id === selectedBagId ? { ...b, isDisposed: true } : b))
      );
      setSelectedBagId(null);
      setSegregatedCount((c) => c + 1);
      setScore((s) => s + 10);

      const remaining = activeBags.filter((b) => b.id !== selectedBagId && !b.isDisposed);

      if (remaining.length > 0) {
        // Return to prompt for next bag
        if (phase === "W1_SELECT_BIN") setPhase("W1_SELECT_BAG");
        if (phase === "W2_SELECT_BIN") setPhase("W2_SELECT_BAG");
        if (phase === "CLEANER_SELECT_BIN") setPhase("CLEANER_SELECT_BAG");
      } else {
        // All bags for current character finished!
        if (phase === "W1_SELECT_BIN") {
          // Woman 1 walks over to the tree in front of House 1 for garden cleaning
          setTimeout(() => {
            setW1RotY(-1.8);
            let step = 0;
            const totalSteps = 20;
            const startX = -2.0;
            const startZ = 0.2;
            const targetX = -3.7;
            const targetZ = -0.6;
            const walkInterval = setInterval(() => {
              step++;
              const progress = step / totalSteps;
              setW1Pos([startX + (targetX - startX) * progress, 0, startZ + (targetZ - startZ) * progress]);
              if (step >= totalSteps) {
                clearInterval(walkInterval);
                setW1RotY(-1.2);
                setPhase("W1_BROOM_PROMPT");
              }
            }, 40);
          }, 600);
        } else if (phase === "W2_SELECT_BIN") {
          // Woman 2 returns inside House 2 (1.0, -2.4); Collection truck arrives from RIGHT
          setPhase("W2_RETURN");
          setW2RotY(3.14);
          let step = 0;
          const totalSteps = 25;
          const startX = 1.0;
          const startZ = 0.2;
          const targetX = 1.0;
          const targetZ = -2.5;
          const walkInterval = setInterval(() => {
            step++;
            const progress = step / totalSteps;
            setW2Pos([startX + (targetX - startX) * progress, 0, startZ + (targetZ - startZ) * progress]);
            if (step >= totalSteps) {
              clearInterval(walkInterval);
              // Woman 2 safely inside House 2!
              // Special-care collection truck enters from the RIGHT towards LEFT
              setPhase("TRUCK1_ENTER");
              let tX = 9.0;
              const tInterval = setInterval(() => {
                tX -= 0.25;
                setTruckX(tX);
                if (tX <= -0.4) {
                  clearInterval(tInterval);
                  setPhase("TRUCK1_PROMPT");
                }
              }, 40);
            }
          }, 40);
        } else if (phase === "CLEANER_SELECT_BIN") {
          // Cleaner Ravi walks back inside hospital through staff emergency entrance
          setPhase("CLEANER_RETURN");
          setCleanerRotY(3.14);
          let clRStep = 0;
          const clRTotal = 25;
          const clRWalk = setInterval(() => {
            clRStep++;
            const p = clRStep / clRTotal;
            setCleanerPos([0.6 + (-0.4 - 0.6) * p, 0, 0.2 + (-2.8 - 0.2) * p]);
            if (clRStep >= clRTotal) {
              clearInterval(clRWalk);
              // Cleaner safely inside hospital!
              // Collection truck arrives at hospital driveway for RED BIN ONLY
              setPhase("TRUCK2_ENTER");
              let tX = 9.0;
              const tInterval = setInterval(() => {
                tX -= 0.25;
                setTruckX(tX);
                if (tX <= -0.4) {
                  clearInterval(tInterval);
                  // Hospital rule: Collect ONLY the RED SPECIAL CARE BIN
                  setPhase("TRUCK2_PROMPT_RED");
                  setActiveSpeech({ text: "Click the red bin to collect special-care waste!", isAlert: false });
                }
              }, 40);
            }
          }, 40);
        }
      }
    } else {
      // Incorrect Bin Selection - explain & retry
      triggerSound("error");
      setMistakes((m) => m + 1);
      const binNames: Record<BinColor, string> = {
        BLUE: "Blue Dry Waste bin",
        GREEN: "Green Wet Waste bin",
        YELLOW: "Yellow Sanitary bin",
        RED: "Red Special Care bin",
      };
      setActiveSpeech({
        text: `${currentBag.label} does not go here! Put it in the ${binNames[currentBag.correctBin]}.`,
        isAlert: true,
      });
    }
  };

  // 4. Broom Pick Up & Sweeping
  const handleBroomClick = () => {
    if (phase !== "W1_BROOM_PROMPT") return;
    triggerSound("click");
    setHasBroomInHand(true);
    setPhase("W1_SWEEPING");

    setTimeout(() => {
      setIsSweptIntoPile(true);
      setHasBroomInHand(false);
      triggerSound("chime");
      setPhase("W1_TRAY_PROMPT");
    }, 2400);
  };

  // 5. Collection Tray Click: Woman 1 walks to Green Bin with tray
  const handleTrayClick = () => {
    if (phase !== "W1_TRAY_PROMPT") return;
    triggerSound("click");
    setHasTrayInHand(true);
    setPhase("W1_COLLECT_TRAY");
    setW1RotY(1.4);

    let step = 0;
    const totalSteps = 22;
    const startX = -3.7;
    const startZ = -0.6;
    const targetX = 1.2;
    const targetZ = 0.3;
    const walkInterval = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      setW1Pos([startX + (targetX - startX) * progress, 0, startZ + (targetZ - startZ) * progress]);
      if (step >= totalSteps) {
        clearInterval(walkInterval);
        setW1RotY(0.2);
        setPhase("W1_GREEN_DISPOSE");
      }
    }, 40);
  };

  // 6. Hazardous Facility Final Unloading: Truck Compactor Tilts, Waste Slides into Tub, Tub Fills
  const handleFacilityUnload = () => {
    if (phase !== "FACILITY_UNLOAD_PROMPT") return;
    triggerSound("click");
    setPhase("FACILITY_UNLOADING");
    setIsCompactorTipping(true);
    triggerSound("chime");

    // Smoothly animate the collection tub filling as waste slides down into it
    let fill = 0;
    const fillInterval = setInterval(() => {
      fill += 0.025;
      if (fill >= 1.0) {
        fill = 1.0;
        clearInterval(fillInterval);
      }
      setFacilityWasteLevel(fill);
    }, 50);

    setTimeout(() => {
      // Container tilts back down to resting position
      setIsCompactorTipping(false);
      setScore(100);
      reportComplete({ points: 100 });
      triggerSound("success");
      setPhase("FACILITY_COMPLETE");
      setActiveSpeech({ text: "All hazardous and special-care waste safely unloaded and contained!", isAlert: false });

      setTimeout(() => {
        setPhase("RESULT");
      }, 1800);
    }, 2600);
  };

  // 7. Replay / Reset
  const handlePlayAgain = () => {
    triggerSound("click");
    setSeconds(0);
    setTimerActive(true);
    setScore(0);
    setMistakes(0);
    setSegregatedCount(0);
    setFacilityWasteLevel(0);
    setW2Pos([1.0, 0, -2.5]);
    setCleanerPos([-0.4, 0, -2.8]);
    setCollectionsCompleted(0);
    setTruckX(-9.0);
    setIsWorkersOutside(false);
    setIsCompactorTipping(false);
    setHasBroomInHand(false);
    setHasTrayInHand(false);
    setIsSweptIntoPile(false);
    setIsDebrisCollected(false);
    setSelectedBagId(null);

    // Reset Bags
    setW1Bags((prev) => prev.map((b) => ({ ...b, isDisposed: false })));
    setW2Bags((prev) => prev.map((b) => ({ ...b, isDisposed: false })));
    setCleanerBags((prev) => prev.map((b) => ({ ...b, isDisposed: false })));

    setW1Pos([-2.8, 0, -2.4]);
    setW1RotY(0.2);
    setW2Pos([1.0, 0, -2.4]);
    setW2RotY(0.0);
    setTruckX(9.0);
    setBinOffsets({
      GREEN: [0, 0, 0],
      BLUE: [0, 0, 0],
      YELLOW: [0, 0, 0],
      RED: [0, 0, 0],
    });
    setScene("NEIGHBOURHOOD");
    setPhase("W1_EMERGE");
    setShowWelcome(false);

    let step = 0;
    const totalSteps = 25;
    const startX = -2.8;
    const startZ = -2.4;
    const targetX = -2.0;
    const targetZ = 0.2;
    const walkInterval = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      setW1Pos([startX + (targetX - startX) * progress, 0, startZ + (targetZ - startZ) * progress]);
      if (step >= totalSteps) {
        clearInterval(walkInterval);
        setPhase("W1_SELECT_BAG");
      }
    }, 40);
  };

  const handleReturnToWelcome = () => {
    triggerSound("click");
    setSeconds(0);
    setTimerActive(false);
    setScore(0);
    setMistakes(0);
    setSegregatedCount(0);
    setCollectionsCompleted(0);
    setTruckX(-9.0);
    setIsWorkersOutside(false);
    setIsCompactorTipping(false);
    setHasBroomInHand(false);
    setHasTrayInHand(false);
    setIsSweptIntoPile(false);
    setIsDebrisCollected(false);
    setSelectedBagId(null);
    setW1Pos([-2.8, 0, -2.4]);
    setW1RotY(0.2);
    setW2Pos([1.0, 0, -2.4]);
    setTruckX(9.0);
    setBinOffsets({
      GREEN: [0, 0, 0],
      BLUE: [0, 0, 0],
      YELLOW: [0, 0, 0],
      RED: [0, 0, 0],
    });
    setW2RotY(0.0);
    setScene("NEIGHBOURHOOD");
    setPhase("W1_EMERGE");
    setShowWelcome(true);
  };

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden select-none flex flex-col font-sans bg-[#F0FAE8] text-[#24452D]">
      
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. FRESH LIGHT-GREEN NAVIGATION BAR (#F0FAE8 Palette)                 */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <nav className="relative z-40 w-full h-14 bg-[#F0FAE8] border-t-2 border-[#58B86A] border-b border-[#CDE8C6] px-3 sm:px-5 flex items-center justify-between shrink-0 shadow-xs">
        
        {/* ── LEFT SECTION: Back Button, Recycle Icon & Title ── */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/">
            <button
              className="w-8 h-8 rounded-xl bg-[#E1F4D8] hover:bg-[#d0ecc5] text-[#24452D] flex items-center justify-center transition border border-[#CDE8C6] cursor-pointer shrink-0"
              title="Back to All Labs"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>
          </Link>

          <div
            className="w-8 h-8 rounded-xl bg-[#E1F4D8] border border-[#58B86A]/50 flex items-center justify-center text-[#238B45] shrink-0 shadow-xs"
            title="Environmental Sustainability & Recycling"
          >
            <Recycle size={18} strokeWidth={2.4} />
          </div>

          <h1 className="text-[#24452D] font-extrabold text-sm sm:text-base leading-tight tracking-tight truncate max-w-[150px] sm:max-w-xs md:max-w-md">
            Environmental Sustainability &amp; Recycling
          </h1>
        </div>

        {/* ── CENTER SECTION: Time & Score Indicators (Light-Green Theme) ── */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Time Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-[#E1F4D8] border border-[#CDE8C6] rounded-xl shadow-xs shrink-0">
            <Clock size={16} className="text-[#238B45]" strokeWidth={2.3} />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#58B86A]">TIME</span>
              <span className="text-xs font-black font-mono text-[#24452D] tracking-wider mt-0.5">
                {formatTime(seconds)}
              </span>
            </div>
          </div>

          {/* Score Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-[#E1F4D8] border border-[#CDE8C6] rounded-xl shadow-xs shrink-0">
            <Star size={16} className="text-amber-500 fill-amber-500" strokeWidth={2} />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#58B86A]">SCORE</span>
              <span className="text-xs font-black font-mono text-[#24452D] tracking-wider mt-0.5">
                {score}
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT SECTION: Controls ── */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setIsAudioMuted((m) => !m)}
            className={`w-8 h-8 rounded-full border transition flex items-center justify-center cursor-pointer ${
              isAudioMuted
                ? "border-[#CDE8C6] bg-[#E1F4D8] text-slate-400 hover:text-[#24452D]"
                : "border-[#58B86A]/50 bg-[#E1F4D8] text-[#238B45] hover:bg-[#d0ecc5]"
            }`}
            title={isAudioMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isAudioMuted ? <VolumeX size={16} strokeWidth={2.3} /> : <Volume2 size={16} strokeWidth={2.3} />}
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReturnToWelcome}
            className="w-8 h-8 rounded-full border border-[#CDE8C6] bg-[#E1F4D8] hover:bg-[#d0ecc5] text-[#24452D] flex items-center justify-center transition cursor-pointer"
            title="Reset Experiment"
          >
            <RotateCcw size={15} strokeWidth={2.3} />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-full border border-[#CDE8C6] bg-[#E1F4D8] hover:bg-[#d0ecc5] text-[#24452D] flex items-center justify-center transition cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={15} strokeWidth={2.3} /> : <Maximize2 size={15} strokeWidth={2.3} />}
          </button>

          {/* Help Button */}
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className="w-8 h-8 rounded-full border border-[#58B86A] bg-[#238B45] hover:bg-[#1e783b] text-white flex items-center justify-center transition cursor-pointer shadow-xs"
            title="Help & Guidance"
          >
            <HelpCircle size={16} strokeWidth={2.3} />
          </button>
        </div>
      </nav>

      {/* ── HELP DIALOG MODAL (Light Theme) ── */}
      {showHelp && (
        <div className="absolute top-16 right-4 z-50 max-w-sm w-full bg-[#F0FAE8] border-2 border-[#238B45] rounded-2xl p-4 shadow-2xl text-[#24452D] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-[#CDE8C6] mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#238B45] flex items-center gap-1.5">
              <HelpCircle size={14} />
              <span>Waste Segregation Guidance</span>
            </span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-[#58B86A] hover:text-[#24452D] text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
          <ul className="text-xs font-semibold leading-relaxed text-[#24452D] space-y-1.5">
            <li>• <strong className="text-emerald-700">GREEN:</strong> Wet organic waste &amp; garden leaves</li>
            <li>• <strong className="text-blue-700">BLUE:</strong> Dry recyclable waste (plastic, paper, metal)</li>
            <li>• <strong className="text-amber-700">YELLOW:</strong> Sanitary &amp; hospital infectious waste</li>
            <li>• <strong className="text-red-700">RED:</strong> Special care &amp; hazardous chemical waste</li>
          </ul>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. FULL-VIEWPORT 3D IMMERSIVE ENVIRONMENT CANVAS                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden bg-sky-300">
        
        <Canvas
          shadows
          camera={{ position: [0, 3.8, 8.8], fov: 42 }}
          className="w-full h-full"
        >
          {/* Daylight Sky Color */}
          <color attach="background" args={["#7dd3fc"]} />

          {/* Lighting, Road, Ground Lawn & Clouds */}
          <NaturalEnvironment scene={scene} />

          {/* ── SCENE 1: RESIDENTIAL NEIGHBOURHOOD ── */}
          {scene === "NEIGHBOURHOOD" && (
            <>
              {/* House 1: European Country Cottage (Ref Image 1 on Left) */}
              <House1Cottage />

              {/* House 2: 2.5-Story Manor Villa with Accessible Porch & Animated Door */}
              <House2Villa isDoorOpen={phase === "W2_EMERGE" || phase === "W2_RETURN"} />

              {/* Exactly 2 Trees in House 1 Garden */}
              <House1TreeA />
              <House1TreeB />

              {/* Exactly 2 Trees in House 2 Garden */}
              <House2TreeA />
              <House2TreeB />

              {/* Four Dustbins on Right-side Pathway (Green, Blue, Yellow, Red) */}
              <WasteBin
                colorType="GREEN"
                position={[1.8 + binOffsets.GREEN[0], binOffsets.GREEN[1], 0.4 + binOffsets.GREEN[2]]}
                isClickable={phase === "W1_SELECT_BIN" || phase === "W1_GREEN_DISPOSE"}
                isTargeted={phase === "W1_GREEN_DISPOSE"}
                onClick={() => handleBinClick("GREEN")}
              />
              <WasteBin
                colorType="BLUE"
                position={[2.5 + binOffsets.BLUE[0], binOffsets.BLUE[1], 0.4 + binOffsets.BLUE[2]]}
                isClickable={phase === "W1_SELECT_BIN" || phase === "W2_SELECT_BIN"}
                isTargeted={
                  (phase === "W1_SELECT_BIN" && selectedBagId === "w1_dry") ||
                  (phase === "W2_SELECT_BIN" && selectedBagId === "w2_dry")
                }
                onClick={() => handleBinClick("BLUE")}
              />
              <WasteBin
                colorType="YELLOW"
                position={[3.2 + binOffsets.YELLOW[0], binOffsets.YELLOW[1], 0.4 + binOffsets.YELLOW[2]]}
                isClickable={phase === "W1_SELECT_BIN"}
                isTargeted={phase === "W1_SELECT_BIN" && selectedBagId === "w1_sanitary"}
                onClick={() => handleBinClick("YELLOW")}
              />
              <WasteBin
                colorType="RED"
                position={[3.9 + binOffsets.RED[0], binOffsets.RED[1], 0.4 + binOffsets.RED[2]]}
                isClickable={phase === "W2_SELECT_BIN" || phase === "TRUCK1_PROMPT"}
                isTargeted={
                  (phase === "W2_SELECT_BIN" && selectedBagId === "w2_hazard") ||
                  phase === "TRUCK1_PROMPT"
                }
                onClick={() => handleBinClick("RED")}
              />

              {/* Character 1: Woman 1 (Sarah) - Emerges from House 1, cleans under tree, returns to House 1 */}
              {(phase === "W1_EMERGE" ||
                phase === "W1_SELECT_BAG" ||
                phase === "W1_SELECT_BIN" ||
                phase === "W1_BROOM_PROMPT" ||
                phase === "W1_SWEEPING" ||
                phase === "W1_TRAY_PROMPT" ||
                phase === "W1_COLLECT_TRAY" ||
                phase === "W1_GREEN_DISPOSE" ||
                phase === "W1_RETURN") && (
                <CharacterWoman1
                  position={w1Pos}
                  rotationY={w1RotY}
                  isWalking={phase === "W1_EMERGE" || phase === "W1_COLLECT_TRAY" || phase === "W1_RETURN"}
                  isSweeping={phase === "W1_SWEEPING"}
                  hasBroom={hasBroomInHand}
                  hasTray={hasTrayInHand}
                  bags={w1Bags}
                  selectedBagId={selectedBagId}
                  onBagClick={handleSelectBag}
                  canSelectBag={phase === "W1_SELECT_BAG"}
                />
              )}

              {/* Garden Cleaning Litter Area directly beneath House 1 Tree A */}
              <GardenCleaningArea
                showBroomOnGround={phase === "W1_BROOM_PROMPT"}
                showTrayOnGround={phase === "W1_TRAY_PROMPT"}
                isSweptIntoPile={isSweptIntoPile}
                isDebrisCollected={isDebrisCollected}
                onBroomClick={handleBroomClick}
                onTrayClick={handleTrayClick}
                canClickBroom={phase === "W1_BROOM_PROMPT"}
                canClickTray={phase === "W1_TRAY_PROMPT"}
              />

              {/* Character 2: Woman 2 (Priya) - Emerges from House 2 ONLY after Woman 1 finishes and returns */}
              {(phase === "W2_EMERGE" ||
                phase === "W2_SELECT_BAG" ||
                phase === "W2_SELECT_BIN" ||
                phase === "W2_RETURN") && (
                <CharacterWoman2
                  position={w2Pos}
                  rotationY={w2RotY}
                  isWalking={phase === "W2_EMERGE" || phase === "W2_RETURN"}
                  bags={w2Bags}
                  selectedBagId={selectedBagId}
                  onBagClick={handleSelectBag}
                  canSelectBag={phase === "W2_SELECT_BAG"}
                />
              )}

              {/* Yellow Collection Truck (Scene 1: Enters from RIGHT, stops to LEFT of dustbins) */}
              {(phase === "TRUCK1_ENTER" ||
                phase === "TRUCK1_PROMPT" ||
                phase === "TRUCK1_COLLECTING" ||
                phase === "TRUCK1_EXIT") && (
                <WasteCollectionTruck
                  positionX={truckX}
                  isWorkersOutside={isWorkersOutside}
                  workerActionPos={workerPos}
                />
              )}
            </>
          )}

          {/* ── SCENE 2: HOSPITAL ENVIRONMENT (Rebuilt based on Ref Image 3) ── */}
          {scene === "HOSPITAL" && (
            <>
              {/* Wide Modern Hospital Building with Staff Emergency Door & Animated Sliding Entrance */}
              <HospitalBuilding
                isDoorOpen={phase === "CLEANER_EMERGE" || phase === "CLEANER_RETURN"}
                isResult={phase === "RESULT"}
              />

              {/* ONLY TWO DUSTBINS IN HOSPITAL: YELLOW & RED (Prompt Rule: Yellow stays, only Red is collected) */}
              <WasteBin
                colorType="YELLOW"
                position={[2.5 + binOffsets.YELLOW[0], binOffsets.YELLOW[1], 0.4 + binOffsets.YELLOW[2]]}
                isClickable={phase === "CLEANER_SELECT_BIN" || phase === "TRUCK2_PROMPT_RED"}
                isTargeted={phase === "CLEANER_SELECT_BIN" && selectedBagId === "cl_sanitary"}
                onClick={() => handleBinClick("YELLOW")}
              />
              <WasteBin
                colorType="RED"
                position={[3.5 + binOffsets.RED[0], binOffsets.RED[1], 0.4 + binOffsets.RED[2]]}
                isClickable={phase === "CLEANER_SELECT_BIN" || phase === "TRUCK2_PROMPT_RED"}
                isTargeted={
                  (phase === "CLEANER_SELECT_BIN" && selectedBagId === "cl_hazard") ||
                  phase === "TRUCK2_PROMPT_RED"
                }
                onClick={() => handleBinClick("RED")}
              />

              {/* Hospital Cleaner (Ravi) emerging and returning through staff emergency entrance door */}
              {(phase === "CLEANER_EMERGE" ||
                phase === "CLEANER_SELECT_BAG" ||
                phase === "CLEANER_SELECT_BIN" ||
                phase === "CLEANER_RETURN") && (
                <CharacterCleaner
                  position={cleanerPos}
                  rotationY={cleanerRotY}
                  isWalking={phase === "CLEANER_EMERGE" || phase === "CLEANER_RETURN"}
                  bags={cleanerBags}
                  selectedBagId={selectedBagId}
                  onBagClick={handleSelectBag}
                  canSelectBag={phase === "CLEANER_SELECT_BAG"}
                />
              )}

              {/* Same Yellow Waste Collection Truck (Collects ONLY the Red Bin at Hospital) */}
              {(phase === "TRUCK2_ENTER" ||
                phase === "TRUCK2_PROMPT_RED" ||
                phase === "TRUCK2_COLLECT_RED" ||
                phase === "TRUCK2_EXIT") && (
                <WasteCollectionTruck
                  positionX={truckX}
                  isWorkersOutside={isWorkersOutside}
                  workerActionPos={workerPos}
                />
              )}
            </>
          )}

          {/* ── SCENE 3: HAZARDOUS WASTE FACILITY (Complete Industrial Facility with Fence & Tub) ── */}
          {scene === "FACILITY" && (
            <>
              {/* Industrial Facility with Stretched Building, Wire Fence, Gate & Leftmost Tub */}
              <HazardousFacility
                isUnloading={phase === "FACILITY_UNLOADING"}
                canUnload={phase === "FACILITY_UNLOAD_PROMPT"}
                onUnloadClick={handleFacilityUnload}
                wasteFillLevel={facilityWasteLevel}
                isResult={phase === "RESULT"}
              />

              {/* Truck Reverses into Compound with Rear Positioned toward Tub */}
              <WasteCollectionTruck
                positionX={truckX}
                positionZ={0.5}
                rotationY={Math.PI}
                isWorkersOutside={false}
                isTippingCompactor={isCompactorTipping}
                isUnloadingWaste={phase === "FACILITY_UNLOADING"}
                isResult={phase === "RESULT"}
              />
            </>
          )}

          {/* ── Active 3D Speech Bubble Anchored in Scene (Hidden on Results Page) ── */}
          {activeSpeech && phase !== "RESULT" && (
            <SpeechBubble
              text={activeSpeech.text}
              isAlert={activeSpeech.isAlert}
              position={
                scene === "FACILITY"
                  ? [-4.8, 2.2, 0.5]
                  : isWorkersOutside
                  ? [workerPos[0], 2.4, workerPos[2]]
                  : scene === "HOSPITAL"
                  ? [cleanerPos[0], 2.2, cleanerPos[2]]
                  : phase.startsWith("W2")
                  ? [w2Pos[0], 2.2, w2Pos[2]]
                  : [w1Pos[0], 2.2, w1Pos[2]]
              }
            />
          )}
        </Canvas>

        {/* ── SCREEN 1: DEDICATED WELCOME PAGE MODAL (Environmental Theme) ── */}
        {showWelcome && (
          <div className="absolute inset-0 z-40 bg-emerald-950/25 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-[#CDE8C6] text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-[#E1F4D8] border-2 border-[#58B86A] flex items-center justify-center text-[#238B45] mb-3 shadow-inner">
                <Recycle size={38} strokeWidth={2.4} />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-[#24452D] mb-0.5 leading-tight tracking-tight uppercase">
                Environmental Sustainability Challenge
              </h2>
              <span className="text-xs font-black text-[#238B45] uppercase tracking-widest mb-3">
                WASTE SEGREGATION &amp; RESPONSIBLE DISPOSAL
              </span>

              <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed mb-5 bg-[#F0FAE8]/90 p-3.5 rounded-2xl border border-[#CDE8C6]">
                &ldquo;Welcome to the Environmental Sustainability Challenge! Help residents and hospital staff segregate waste correctly, keep the environment clean, and send special-care waste to the appropriate facility. Make the right choices and discover how responsible waste management protects our environment.&rdquo;
              </p>

              {/* 5 Main Activity Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full mb-6 text-left">
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6] flex flex-col items-center text-center">
                  <span className="text-[10px] font-black text-[#238B45] uppercase mb-0.5">1. SEGREGATE</span>
                  <span className="text-[11px] font-bold text-[#24452D] leading-tight">Separate household waste</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6] flex flex-col items-center text-center">
                  <span className="text-[10px] font-black text-[#238B45] uppercase mb-0.5">2. CLEAN GARDEN</span>
                  <span className="text-[11px] font-bold text-[#24452D] leading-tight">Sweep &amp; collect litter</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6] flex flex-col items-center text-center">
                  <span className="text-[10px] font-black text-[#238B45] uppercase mb-0.5">3. TRUCK TRANSPORT</span>
                  <span className="text-[11px] font-bold text-[#24452D] leading-tight">Collect special-care waste</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6] flex flex-col items-center text-center">
                  <span className="text-[10px] font-black text-[#238B45] uppercase mb-0.5">4. HOSPITAL CARE</span>
                  <span className="text-[11px] font-bold text-[#24452D] leading-tight">Sort medical &amp; biohazard</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6] flex flex-col items-center text-center col-span-2 sm:col-span-2">
                  <span className="text-[10px] font-black text-[#238B45] uppercase mb-0.5">5. FACILITY DISPOSAL</span>
                  <span className="text-[11px] font-bold text-[#24452D] leading-tight">Safely process at industrial facility</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartGame}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#238B45] to-[#58B86A] hover:from-[#1e783b] hover:to-[#469e56] text-white font-black text-sm sm:text-base shadow-lg cursor-pointer transition animate-bounce flex items-center justify-center gap-2 transform active:scale-98"
              >
                <span>START GAME</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── SCREEN 2: DEDICATED RESULT PAGE (Clean, Zero Overlaps, Z-Index 50) ── */}
        {phase === "RESULT" && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <Confetti
              width={width}
              height={height}
              recycle={false}
              numberOfPieces={350}
              gravity={0.25}
            />

            <div className="max-w-2xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-[#CDE8C6] text-center flex flex-col items-center animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
              <div className="w-13 h-13 rounded-2xl bg-[#E1F4D8] border-2 border-[#58B86A] flex items-center justify-center text-[#238B45] mb-2 shadow-inner">
                <Sparkles size={28} />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#24452D] mb-0.5 tracking-tight uppercase">
                ENVIRONMENTAL SUSTAINABILITY CHAMPION!
              </h2>
              <span className="text-[11px] sm:text-xs font-black text-[#238B45] uppercase tracking-wider mb-3">
                YOU COMPLETED THE WASTE SEGREGATION AND DISPOSAL CHALLENGE!
              </span>

              {/* 6 Category Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full mb-3 text-left">
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6]">
                  <span className="text-[9px] font-black uppercase text-blue-700 block">HOUSEHOLD DRY WASTE</span>
                  <div className="text-xs font-bold text-[#24452D] mt-0.5 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-blue-600" />
                    <span>Blue Bin Sorted</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6]">
                  <span className="text-[9px] font-black uppercase text-amber-700 block">SANITARY WASTE</span>
                  <div className="text-xs font-bold text-[#24452D] mt-0.5 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-amber-600" />
                    <span>Yellow Bin Sorted</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6]">
                  <span className="text-[9px] font-black uppercase text-emerald-700 block">GARDEN LITTER</span>
                  <div className="text-xs font-bold text-[#24452D] mt-0.5 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Green Wet Bin Emptied</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6]">
                  <span className="text-[9px] font-black uppercase text-red-700 block">SPECIAL CARE WASTE</span>
                  <div className="text-xs font-bold text-[#24452D] mt-0.5 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-red-600" />
                    <span>Red Bin Sorted</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6]">
                  <span className="text-[9px] font-black uppercase text-[#238B45] block">HOSPITAL MEDICAL</span>
                  <div className="text-xs font-bold text-[#24452D] mt-0.5 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-[#238B45]" />
                    <span>Infectious &amp; Hazardous</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6]">
                  <span className="text-[9px] font-black uppercase text-[#238B45] block">FACILITY UNLOADING</span>
                  <div className="text-xs font-bold text-[#24452D] mt-0.5 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-[#238B45]" />
                    <span>Processed Safely</span>
                  </div>
                </div>
              </div>

              {/* Statistics Bar */}
              <div className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-[#F0FAE8] via-[#E1F4D8] to-[#CDE8C6] border border-[#58B86A]/40 flex items-center justify-around mb-3 text-[#24452D]">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500 block">FINAL SCORE</span>
                  <span className="text-sm sm:text-base font-black text-[#238B45]">{score} Pts</span>
                </div>
                <div className="h-6 w-px bg-[#58B86A]/40" />
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500 block">CORRECT ACTIONS</span>
                  <span className="text-sm sm:text-base font-black text-[#24452D]">{segregatedCount + collectionsCompleted} Completed</span>
                </div>
                <div className="h-6 w-px bg-[#58B86A]/40" />
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500 block">MISTAKES</span>
                  <span className="text-sm sm:text-base font-black text-amber-700">{mistakes} Attempted</span>
                </div>
              </div>

              {/* Educational Learning Section (Prompt Verbatim) */}
              <div className="p-3 rounded-2xl bg-[#F0FAE8]/90 border border-[#CDE8C6] text-left mb-4 text-xs font-semibold leading-relaxed text-[#24452D]">
                <span className="font-black text-[#238B45] block mb-1">💡 ENVIRONMENTAL LEARNING:</span>
                &ldquo;Proper waste segregation is essential for protecting our environment. Separating wet, dry, sanitary, and special-care waste makes collection and disposal safer and more effective. Responsible waste management reduces pollution, supports recycling, protects public health, and helps create cleaner and more sustainable communities.&rdquo;
              </div>

              {/* Action Buttons: REPLAY & RETURN TO WELCOME */}
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  className="py-3 rounded-xl bg-[#238B45] hover:bg-[#1e783b] text-white font-black text-xs sm:text-sm shadow-md cursor-pointer transition flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <RotateCcw size={15} />
                  <span>REPLAY CHALLENGE</span>
                </button>

                <button
                  type="button"
                  onClick={handleReturnToWelcome}
                  className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#24452D] font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 border border-slate-200"
                >
                  <span>RETURN TO WELCOME</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

