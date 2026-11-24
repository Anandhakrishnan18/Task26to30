"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
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
  Sparkles,
  HeartPulse,
  Cross,
  ShieldAlert,
  Activity,
  HeartHandshake,
  CheckCircle2,
  RefreshCw,
  Play,
  Pause,
  ChevronRight,
  UserCheck,
  Stethoscope,
  Bandage,
  Award,
  Scissors,
  ShieldCheck,
  Droplets,
  Pill,
  Check,
  HandHelping,
} from "lucide-react";
import { useLabAudio } from "@/hooks/useLabAudio";

// ── Screen States ──
export type GameScreen = "WELCOME" | "GAMEPLAY" | "RESULT";

// ── Strict Gameplay Flow States ──
export type FlowState =
  | "INTRO_IDLE" // 1. Initial 2s ward overview
  | "P1_ARRIVING" // 2. Patient 1 + companion enter ward towards Bed 2
  | "P1_WAITING_NURSE" // 3. Patient 1 in Bed 2, circular indicator on Nurse
  | "P1_ZOOMING_IN" // 4. Camera zooms towards Patient 1 & bedside trolley
  | "P1_TREATMENT" // 5. Interactive 3D physical equipment workspace active
  | "P1_STEP_ANIMATING" // 5b. Step animation running (nurse treats patient)
  | "P1_ZOOMING_OUT" // 6. Camera zooms back to overview, patient resting
  | "INTER_PAUSE_1" // 7. 1 second pause
  | "P2_ARRIVING" // 8. Patient 2 + companion enter ward towards Bed 3
  | "P2_WAITING_NURSE" // 9. Patient 2 in Bed 3, circular indicator on Nurse
  | "P2_ZOOMING_IN" // 10. Camera zooms towards Patient 2 & trolley
  | "P2_TREATMENT" // 11. Interactive 3D physical equipment workspace active
  | "P2_STEP_ANIMATING" // 11b. Step animation running
  | "P2_ZOOMING_OUT" // 12. Camera zooms back to overview, patient resting
  | "INTER_PAUSE_2" // 13. 1 second pause
  | "P3_ARRIVING" // 14. Patient 3 + companion enter ward towards Bed 4
  | "P3_WAITING_NURSE" // 15. Patient 3 in Bed 4, circular indicator on Nurse
  | "P3_ZOOMING_IN" // 16. Camera zooms towards Patient 3 & trolley
  | "P3_TREATMENT" // 17. Interactive multi-injury treatment active
  | "P3_STEP_ANIMATING" // 17b. Step animation running
  | "P3_ZOOMING_OUT" // 18. Camera zooms back to overview
  | "WARD_STABILIZED"; // 19. All 4 stretchers active & comfortable, mission complete!

// ── Medical Supply Identifier ──
export type MedicalSupplyId =
  | "cotton"
  | "antiseptic"
  | "bandage"
  | "scissors"
  | "tape"
  | "painkiller";

interface SupplyConfig {
  id: MedicalSupplyId;
  name: string;
  category: string;
  description: string;
}

const MEDICAL_SUPPLIES: SupplyConfig[] = [
  {
    id: "cotton",
    name: "Sterile Cotton",
    category: "Cleansing",
    description: "Sterile absorbent cotton wool in kidney dish for gently swabbing visible blood.",
  },
  {
    id: "antiseptic",
    name: "Antiseptic Solution",
    category: "Disinfection",
    description: "Povidone-Iodine hospital disinfectant bottle with pump dispenser.",
  },
  {
    id: "bandage",
    name: "Medical Bandage",
    category: "Immobilization",
    description: "Sterile conforming gauze bandage roll to wrap and stabilize the limb.",
  },
  {
    id: "scissors",
    name: "Medical Scissors",
    category: "Instruments",
    description: "Stainless surgical bandage shears for cutting bandage cleanly.",
  },
  {
    id: "tape",
    name: "Medical Tape",
    category: "Securing",
    description: "Micropore adhesive surgical tape dispenser to anchor dressings firmly.",
  },
  {
    id: "painkiller",
    name: "Pain Relief Tablet",
    category: "Comfort",
    description: "Oral analgesic pain relief tablet in blister pack with medicine cup.",
  },
];

// Step definitions for Patient 1 (Broken Leg) – Clean prompt without step numbers
const P1_STEPS: { supplyId: MedicalSupplyId; prompt: string; actionDesc: string }[] = [
  { supplyId: "cotton", prompt: "Select sterile cotton on trolley to clean visible blood.", actionDesc: "Nurse picks up cotton and gently swabs visible blood around the fractured shin." },
  { supplyId: "antiseptic", prompt: "Select antiseptic bottle on trolley to disinfect skin.", actionDesc: "Nurse applies hospital-grade antiseptic to sterilize the skin surface." },
  { supplyId: "bandage", prompt: "Select bandage roll on trolley to wrap and splint leg.", actionDesc: "Nurse positions anatomical rigid splint and wraps conforming gauze around leg." },
  { supplyId: "scissors", prompt: "Select medical scissors on trolley to cut bandage.", actionDesc: "Nurse trims the gauze bandage neatly with stainless surgical shears." },
  { supplyId: "tape", prompt: "Select medical tape on trolley to secure the dressing.", actionDesc: "Nurse places medical adhesive tape strips to firmly secure the dressing." },
  { supplyId: "painkiller", prompt: "Select pain relief medicine on trolley for the patient.", actionDesc: "Nurse administers oral analgesic tablet with water; patient rests comfortably." },
];

// Step definitions for Patient 2 (Broken Hand / Forearm)
const P2_STEPS: { supplyId: MedicalSupplyId; prompt: string; actionDesc: string }[] = [
  { supplyId: "cotton", prompt: "Select sterile cotton on trolley to swab wrist debris.", actionDesc: "Nurse gently cleans superficial debris from injured hand and wrist." },
  { supplyId: "antiseptic", prompt: "Select antiseptic bottle to disinfect wrist contusion.", actionDesc: "Nurse disinfects the contusion zone with sterile antiseptic solution." },
  { supplyId: "bandage", prompt: "Select bandage roll on trolley to wrap wrist joint.", actionDesc: "Nurse supports wrist and wraps conforming bandage to immobilize joint." },
  { supplyId: "scissors", prompt: "Select scissors on trolley to trim the bandage.", actionDesc: "Nurse carefully cuts the gauze roll with surgical shears." },
  { supplyId: "tape", prompt: "Select medical tape on trolley to anchor wrist wrap.", actionDesc: "Nurse secures the wrist dressing with adhesive tape strips." },
  { supplyId: "painkiller", prompt: "Select pain relief to position arm sling & comfort patient.", actionDesc: "Nurse fits elevated triangular arm sling and provides pain relief tablet." },
];

// Step definitions for Patient 3 (Multiple Injuries from Bike Accident)
const P3_STEPS: { supplyId: MedicalSupplyId; prompt: string; actionDesc: string }[] = [
  { supplyId: "cotton", prompt: "Select cotton on trolley to clean forearm and torso wounds.", actionDesc: "Nurse swabs gravel and visible blood from multiple abrasion sites." },
  { supplyId: "antiseptic", prompt: "Select antiseptic bottle on trolley to disinfect all wounds.", actionDesc: "Nurse disinfects forearm laceration, hip scrape, and leg abrasion." },
  { supplyId: "bandage", prompt: "Select sterile bandage on trolley for dressing pads.", actionDesc: "Nurse applies sterile non-stick gauze dressing pads over the wounds." },
  { supplyId: "scissors", prompt: "Select medical scissors on trolley to cut gauze lengths.", actionDesc: "Nurse cuts conforming bandage to size with surgical shears." },
  { supplyId: "tape", prompt: "Select medical tape to wrap leg and secure all dressings.", actionDesc: "Nurse wraps leg abrasion and firmly tapes all dressing pads in place." },
  { supplyId: "painkiller", prompt: "Select pain relief medicine for trauma recovery.", actionDesc: "Nurse administers analgesic medication; patient is comfortable and stable." },
];

// ═════════════════════════════════════════════════════════════════════════════
// 3D HOSPITAL EMERGENCY WARD ARCHITECTURE
// ═════════════════════════════════════════════════════════════════════════════

function HospitalArchitecture() {
  return (
    <group>
      {/* ── 1. Seamless Polished Hospital Vinyl Tile Floor ── */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14.5, 9.8]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.08} />
      </mesh>

      {/* ── 2. Wide Central Walking Pathway Strip ── */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 9.6]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.3} metalness={0.02} />
      </mesh>
      {/* Central Pathway Boundary Guide Lines */}
      <mesh position={[-1.4, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.06, 9.6]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>
      <mesh position={[1.4, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.06, 9.6]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>
      {/* Directional Floor Guidance Chevrons along Central Path */}
      {[-3.0, -1.0, 1.0, 3.0].map((fz) => (
        <mesh key={`path-arrow-${fz}`} position={[0, 0.005, fz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.4, 0.06]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      ))}

      {/* Subtle Tile Grid Lines */}
      {[-5.0, -2.5, 2.5, 5.0].map((gx) => (
        <mesh key={`grid-gx-${gx}`} position={[gx, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, 9.6]} />
          <meshBasicMaterial color="#e2e8f0" />
        </mesh>
      ))}

      {/* ── 3. Back Wall (Soft Clinical White with Hospital Wainscot & Bumper) ── */}
      <mesh position={[0, 2.4, -4.6]} receiveShadow>
        <boxGeometry args={[14.5, 2.8, 0.2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, -4.58]} receiveShadow>
        <boxGeometry args={[14.5, 1.0, 0.22]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.02, -4.46]}>
        <boxGeometry args={[14.5, 0.08, 0.04]} />
        <meshStandardMaterial color="#0284c7" />
      </mesh>

      {/* Grand Emergency Ward Identification Header Sign on Back Wall */}
      <group position={[0, 2.85, -4.48]}>
        <mesh castShadow>
          <boxGeometry args={[5.8, 0.72, 0.04]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.022]}>
          <boxGeometry args={[5.7, 0.64, 0.02]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <Html position={[0, 0, 0.04]} transform scale={0.16} pointerEvents="none" center>
          <div className="w-[560px] p-1.5 text-center select-none font-sans">
            <div className="flex items-center justify-center gap-2 text-red-500 font-black text-xs uppercase tracking-widest">
              <span>✚</span>
              <span className="text-amber-400">EMERGENCY DEPARTMENT • 24/7 TRIAGE</span>
              <span>✚</span>
            </div>
            <div className="text-base font-black text-white tracking-wider uppercase mt-0.5 drop-shadow">
              HOSPITAL EMERGENCY INTENSIVE WARD
            </div>
            <div className="text-[10px] font-extrabold text-cyan-300 tracking-widest uppercase">
              TRAUMA CRITICAL CARE • FIRST AID RESPONSE UNIT
            </div>
          </div>
        </Html>
      </group>

      {/* ── 4. Left Wall with Frosted Clinical Windows & Sink Station ── */}
      <mesh position={[-7.1, 1.8, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3.8, 9.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.7} />
      </mesh>
      <mesh position={[-7.08, 0.5, 0]}>
        <boxGeometry args={[0.22, 1.0, 9.6]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[-6.96, 1.02, 0]}>
        <boxGeometry args={[0.04, 0.08, 9.6]} />
        <meshStandardMaterial color="#0284c7" />
      </mesh>

      {[-2.0, 1.8].map((wz, idx) => (
        <group key={`l-win-${idx}`} position={[-6.98, 2.2, wz]}>
          <mesh castShadow>
            <boxGeometry args={[0.04, 1.4, 1.8]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[0.02, 0, 0]}>
            <planeGeometry args={[1.7, 1.3]} />
            <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.2} transparent opacity={0.65} />
          </mesh>
        </group>
      ))}

      {/* Scrub Wash Station on Left Wall */}
      <group position={[-6.7, 0, -3.4]}>
        <mesh position={[0, 0.44, 0]} castShadow>
          <boxGeometry args={[0.5, 0.88, 0.6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.88, 0]}>
          <boxGeometry args={[0.42, 0.06, 0.52]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
        </mesh>
        <mesh position={[-0.15, 1.05, 0]} rotation={[0, 0, -0.4]}>
          <cylinderGeometry args={[0.012, 0.012, 0.28, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.95} />
        </mesh>
      </group>

      {/* ── 5. Right Wall with Glass Medical Cabinets & Defibrillator Station ── */}
      <mesh position={[7.1, 1.8, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3.8, 9.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.7} />
      </mesh>
      <mesh position={[7.08, 0.5, 0]}>
        <boxGeometry args={[0.22, 1.0, 9.6]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[6.96, 1.02, 0]}>
        <boxGeometry args={[0.04, 0.08, 9.6]} />
        <meshStandardMaterial color="#0284c7" />
      </mesh>

      <group position={[6.7, 0, -3.2]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[0.55, 2.2, 1.0]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[-0.26, 1.15, 0]}>
          <boxGeometry args={[0.03, 1.8, 0.92]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.2} transparent opacity={0.4} />
        </mesh>
      </group>

      {/* ── 6. Overhead Suspended Modular LED Troffer Lights ── */}
      {[-3.6, 0, 3.6].map((lx) =>
        [-2.0, 1.4].map((lz) => (
          <group key={`overhead-light-${lx}-${lz}`} position={[lx, 3.6, lz]}>
            <mesh>
              <boxGeometry args={[1.4, 0.06, 0.7]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.6} />
            </mesh>
            <mesh position={[0, -0.032, 0]}>
              <planeGeometry args={[1.3, 0.6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

// ── Realistic Hospital Patient Stretcher ──
function HospitalStretcher({
  bedNumber,
  position,
}: {
  bedNumber: string;
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* Metal Lower Chassis Frame */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1.1, 0.06, 2.1]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Swivel Castor Wheels */}
      {[
        [-0.48, 0.1, -0.92],
        [0.48, 0.1, -0.92],
        [-0.48, 0.1, 0.92],
        [0.48, 0.1, 0.92],
      ].map(([cx, cy, cz], idx) => (
        <group key={`wheel-${bedNumber}-${idx}`} position={[cx, cy, cz]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Central Hydraulic Elevation Column */}
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.44, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Upper Bed Platform */}
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[1.15, 0.08, 2.2]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Thick Hospital Mattress (Flat horizontal resting surface) */}
      <mesh position={[0, 0.78, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[1.08, 0.14, 1.55]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
      </mesh>
      {/* Slightly elevated head section */}
      <mesh position={[0, 0.84, -0.72]} rotation={[0.2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.08, 0.14, 0.72]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
      </mesh>

      {/* Ergonomic Pillow (Slightly contoured for head resting) */}
      <mesh position={[0, 0.93, -0.80]} rotation={[0.18, 0, 0]} castShadow>
        <boxGeometry args={[0.68, 0.10, 0.38]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>

      {/* Chrome Safety Side Guardrails */}
      {[-0.56, 0.56].map((gx, gIdx) => (
        <group key={`rail-${bedNumber}-${gIdx}`} position={[gx, 0.88, 0]}>
          <mesh>
            <boxGeometry args={[0.03, 0.03, 1.5]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </mesh>
          {[-0.6, -0.2, 0.2, 0.6].map((postZ, pIdx) => (
            <mesh key={`post-${pIdx}`} position={[0, -0.1, postZ]}>
              <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Bed Number Plate on Footboard */}
      <group position={[0, 0.78, 1.12]}>
        <mesh>
          <boxGeometry args={[0.8, 0.22, 0.03]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.5} />
        </mesh>
        <Html position={[0, 0, 0.02]} transform scale={0.12} pointerEvents="none" center>
          <div className="px-2.5 py-0.5 bg-slate-900 text-white rounded font-black tracking-widest text-[9px] uppercase border border-cyan-400 whitespace-nowrap shadow-sm">
            {bedNumber}
          </div>
        </Html>
      </group>
    </group>
  );
}

// ── Bedside Cardiac Vitals Monitor & IV Stand ──
function BedsideMonitor({
  position,
  heartRate,
  spo2,
  bp,
  isMonitorOn,
}: {
  position: [number, number, number];
  heartRate: number;
  spo2: number;
  bp: string;
  isMonitorOn: boolean;
}) {
  return (
    <group position={position}>
      {/* Wheeled IV Drip Pole */}
      <group position={[0, 0, -0.6]}>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 2.3, 10]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} />
        </mesh>
        <mesh position={[-0.12, 2.05, 0]} castShadow>
          <boxGeometry args={[0.1, 0.26, 0.05]} />
          <meshStandardMaterial color="#e0f2fe" transparent opacity={0.7} roughness={0.1} />
        </mesh>
      </group>

      {/* Cardiac Vitals Monitor – Ergonomic Bedside Height with Stacking Protection */}
      <group position={[0, 1.18, 0]}>
        <mesh position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.65, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.54, 0.38, 0.14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} />
        </mesh>
        <Html position={[0, 0, 0.08]} transform scale={0.1} pointerEvents="none" center zIndexRange={[10, 0]}>
          <div className="w-[190px] h-[125px] bg-slate-950 p-2 rounded flex flex-col justify-between font-mono select-none text-[10px]">
            {isMonitorOn ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <HeartPulse size={11} className="animate-pulse" />
                    <span>{heartRate} BPM</span>
                  </span>
                  <span className="text-cyan-400 font-bold">{spo2}% SpO₂</span>
                  <span className="text-amber-400 font-bold text-[8px]">{bp}</span>
                </div>
                <div className="w-full h-8 overflow-hidden relative flex items-center my-0.5">
                  <svg viewBox="0 0 100 24" className="w-full h-full stroke-emerald-400 fill-none" strokeWidth="1.8">
                    <path d="M0,12 L20,12 L25,4 L30,20 L35,12 L50,12 L55,2 L60,22 L65,12 L80,12 L85,6 L90,18 L95,12 L100,12" />
                  </svg>
                </div>
                <div className="flex justify-between items-center text-[7px] text-slate-400 font-sans uppercase">
                  <span className="text-emerald-300 font-extrabold">NORMAL SINUS</span>
                  <span>RESP: 18</span>
                  <span>TEMP: 36.8°C</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-center">
                <span className="text-[9px] font-bold tracking-widest uppercase">STANDBY</span>
                <span className="text-[7px] text-slate-700">PATIENT ADMIT READY</span>
              </div>
            )}
          </div>
        </Html>
      </group>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3D PHYSICAL MEDICAL EQUIPMENT TROLLEY & INDIVIDUAL CLICKABLE ITEMS
// ═════════════════════════════════════════════════════════════════════════════

function MedicalEquipmentTrolley({
  position,
  rotationY = 0,
  activeSupplyId,
  isAnimating,
  onSupplyClick,
}: {
  position: [number, number, number];
  rotationY?: number;
  activeSupplyId: MedicalSupplyId | null;
  isAnimating: boolean;
  onSupplyClick: (id: MedicalSupplyId) => void;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 4 Tubular Legs */}
      {[
        [-0.32, 0.45, -0.22],
        [0.32, 0.45, -0.22],
        [-0.32, 0.45, 0.22],
        [0.32, 0.45, 0.22],
      ].map(([lx, ly, lz], idx) => (
        <group key={`trolley-leg-${idx}`} position={[lx, ly, lz]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, 0.88, 10]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 10]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      ))}

      {/* Bottom Storage Tray at Y = 0.22 */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.7, 0.025, 0.5]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.1, 0.26, 0]}>
        <boxGeometry args={[0.26, 0.05, 0.22]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.5} />
      </mesh>

      {/* Top Work Tray at Y = 0.88 */}
      <mesh position={[0, 0.88, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.74, 0.03, 0.54]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Tray Raised Rim */}
      <mesh position={[0, 0.90, -0.26]}><boxGeometry args={[0.74, 0.02, 0.02]} /><meshStandardMaterial color="#94a3b8" metalness={0.9} /></mesh>
      <mesh position={[0, 0.90, 0.26]}><boxGeometry args={[0.74, 0.02, 0.02]} /><meshStandardMaterial color="#94a3b8" metalness={0.9} /></mesh>
      <mesh position={[-0.36, 0.90, 0]}><boxGeometry args={[0.02, 0.02, 0.54]} /><meshStandardMaterial color="#94a3b8" metalness={0.9} /></mesh>
      <mesh position={[0.36, 0.90, 0]}><boxGeometry args={[0.02, 0.02, 0.54]} /><meshStandardMaterial color="#94a3b8" metalness={0.9} /></mesh>

      {/* ── 1. Sterile Medical Cotton in Stainless Kidney Tray ── */}
      <group
        position={[-0.22, 0.90, -0.12]}
        onClick={(e) => {
          e.stopPropagation();
          if (!isAnimating) onSupplyClick("cotton");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <mesh castShadow position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.075, 0.065, 0.03, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.15} />
        </mesh>
        <group position={[0, 0.032, 0]}>
          <mesh position={[-0.025, 0.012, -0.015]} castShadow>
            <sphereGeometry args={[0.024, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.95} />
          </mesh>
          <mesh position={[0.02, 0.014, -0.01]} castShadow>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.95} />
          </mesh>
          <mesh position={[0.0, 0.016, 0.02]} castShadow>
            <sphereGeometry args={[0.023, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.95} />
          </mesh>
          <mesh position={[-0.01, 0.026, 0.0]} castShadow>
            <sphereGeometry args={[0.02, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.95} />
          </mesh>
        </group>

        {activeSupplyId === "cotton" && !isAnimating && (
          <Html position={[0, 0.16, 0]} center pointerEvents="none">
            <div className="flex flex-col items-center animate-bounce">
              <div className="relative flex items-center justify-center">
                <span className="w-5 h-5 rounded-full bg-rose-500 animate-ping absolute" />
                <span className="w-4 h-4 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-[9px] font-black shadow-md">
                  ▼
                </span>
              </div>
              <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/95 text-white font-black text-[9px] uppercase tracking-wider border border-rose-400 whitespace-nowrap shadow-md">
                SELECT COTTON
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* ── 2. Antiseptic Disinfectant Bottle ── */}
      <group
        position={[0.0, 0.90, -0.12]}
        onClick={(e) => {
          e.stopPropagation();
          if (!isAnimating) onSupplyClick("antiseptic");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <mesh position={[0, 0.065, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.11, 14]} />
          <meshStandardMaterial color="#78350f" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.065, 0]}>
          <cylinderGeometry args={[0.0305, 0.0305, 0.06, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.065, 0.031]}>
          <planeGeometry args={[0.02, 0.02]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.025, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.015, 0.145, 0]}>
          <boxGeometry args={[0.04, 0.01, 0.014]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>

        {activeSupplyId === "antiseptic" && !isAnimating && (
          <Html position={[0, 0.22, 0]} center pointerEvents="none">
            <div className="flex flex-col items-center animate-bounce">
              <div className="relative flex items-center justify-center">
                <span className="w-5 h-5 rounded-full bg-rose-500 animate-ping absolute" />
                <span className="w-4 h-4 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-[9px] font-black shadow-md">
                  ▼
                </span>
              </div>
              <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/95 text-white font-black text-[9px] uppercase tracking-wider border border-rose-400 whitespace-nowrap shadow-md">
                SELECT ANTISEPTIC
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* ── 3. Medical Conforming Bandage Roll ── */}
      <group
        position={[0.22, 0.90, -0.12]}
        onClick={(e) => {
          e.stopPropagation();
          if (!isAnimating) onSupplyClick("bandage");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <mesh position={[0, 0.035, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.034, 0.034, 0.09, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.035, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.092, 12]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        <mesh position={[0.02, 0.01, 0.05]} rotation={[-0.2, 0.3, 0]}>
          <planeGeometry args={[0.06, 0.08]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>

        {activeSupplyId === "bandage" && !isAnimating && (
          <Html position={[0, 0.16, 0]} center pointerEvents="none">
            <div className="flex flex-col items-center animate-bounce">
              <div className="relative flex items-center justify-center">
                <span className="w-5 h-5 rounded-full bg-rose-500 animate-ping absolute" />
                <span className="w-4 h-4 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-[9px] font-black shadow-md">
                  ▼
                </span>
              </div>
              <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/95 text-white font-black text-[9px] uppercase tracking-wider border border-rose-400 whitespace-nowrap shadow-md">
                SELECT BANDAGE
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* ── 4. Stainless Medical Bandage Scissors ── */}
      <group
        position={[-0.20, 0.90, 0.12]}
        rotation={[0, 0.4, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (!isAnimating) onSupplyClick("scissors");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <mesh position={[0, 0.008, -0.04]} castShadow>
          <boxGeometry args={[0.018, 0.004, 0.1]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.012, -0.09]}>
          <boxGeometry args={[0.022, 0.005, 0.02]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.012, -0.01]}>
          <cylinderGeometry args={[0.006, 0.006, 0.008, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
        <mesh position={[-0.022, 0.008, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.018, 0.005, 8, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <mesh position={[0.022, 0.008, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.018, 0.005, 8, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>

        {activeSupplyId === "scissors" && !isAnimating && (
          <Html position={[0, 0.16, 0]} center pointerEvents="none">
            <div className="flex flex-col items-center animate-bounce">
              <div className="relative flex items-center justify-center">
                <span className="w-5 h-5 rounded-full bg-rose-500 animate-ping absolute" />
                <span className="w-4 h-4 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-[9px] font-black shadow-md">
                  ▼
                </span>
              </div>
              <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/95 text-white font-black text-[9px] uppercase tracking-wider border border-rose-400 whitespace-nowrap shadow-md">
                SELECT SCISSORS
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* ── 5. Micropore Medical Adhesive Tape Dispenser ── */}
      <group
        position={[0.0, 0.90, 0.12]}
        onClick={(e) => {
          e.stopPropagation();
          if (!isAnimating) onSupplyClick("tape");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.032, 14]} />
          <meshStandardMaterial color="#0d9488" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.025, 0]} castShadow>
          <cylinderGeometry args={[0.042, 0.042, 0.03, 16]} />
          <meshStandardMaterial color="#fef9c3" roughness={0.6} />
        </mesh>
        <mesh position={[0.045, 0.025, 0]}>
          <boxGeometry args={[0.012, 0.028, 0.025]} />
          <meshStandardMaterial color="#0d9488" />
        </mesh>

        {activeSupplyId === "tape" && !isAnimating && (
          <Html position={[0, 0.16, 0]} center pointerEvents="none">
            <div className="flex flex-col items-center animate-bounce">
              <div className="relative flex items-center justify-center">
                <span className="w-5 h-5 rounded-full bg-rose-500 animate-ping absolute" />
                <span className="w-4 h-4 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-[9px] font-black shadow-md">
                  ▼
                </span>
              </div>
              <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/95 text-white font-black text-[9px] uppercase tracking-wider border border-rose-400 whitespace-nowrap shadow-md">
                SELECT TAPE
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* ── 6. Pain Relief Medication Blister Pack & Dosing Cup ── */}
      <group
        position={[0.22, 0.90, 0.12]}
        onClick={(e) => {
          e.stopPropagation();
          if (!isAnimating) onSupplyClick("painkiller");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <mesh position={[-0.02, 0.005, 0]} castShadow>
          <boxGeometry args={[0.07, 0.004, 0.11]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.25} />
        </mesh>
        {[-0.035, 0.0, 0.035].map((bz, idx) => (
          <group key={`pill-row-${idx}`} position={[-0.02, 0.01, bz]}>
            <mesh position={[-0.018, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.007, 0.012, 6, 8]} />
              <meshStandardMaterial color="#ef4444" roughness={0.3} />
            </mesh>
            <mesh position={[0.018, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.007, 0.012, 6, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
        ))}
        <group position={[0.05, 0.025, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.022, 0.016, 0.045, 12]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.65} roughness={0.1} />
          </mesh>
          <mesh position={[0, -0.005, 0]}>
            <cylinderGeometry args={[0.018, 0.014, 0.028, 10]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} roughness={0.05} />
          </mesh>
        </group>

        {activeSupplyId === "painkiller" && !isAnimating && (
          <Html position={[0, 0.16, 0]} center pointerEvents="none">
            <div className="flex flex-col items-center animate-bounce">
              <div className="relative flex items-center justify-center">
                <span className="w-5 h-5 rounded-full bg-rose-500 animate-ping absolute" />
                <span className="w-4 h-4 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-[9px] font-black shadow-md">
                  ▼
                </span>
              </div>
              <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/95 text-white font-black text-[9px] uppercase tracking-wider border border-rose-400 whitespace-nowrap shadow-md">
                SELECT PAIN RELIEF
              </span>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ANATOMICALLY FULLY-CONNECTED HUMAN PATIENT (ZERO GAPS, ORGANIC WOUND)
// ═════════════════════════════════════════════════════════════════════════════

const SKIN_COLOR = "#dfa887";
const HAIR_COLOR = "#1e293b";
const PATIENT_GOWN_COLOR = "#bae6fd";
const SHORTS_COLOR = "#93c5fd";

// ── Patient 1: Anatomical Human on Bed 2 (Broken Leg / Tibial Fracture) ──
// ── Patient 1: Anatomical Human on Bed 2 (Broken Leg / Tibial Fracture) ──
function PatientOneAnatomical({
  flowState,
  p1Step,
}: {
  flowState: FlowState;
  p1Step: number;
}) {
  if (flowState === "INTRO_IDLE") return null;

  return (
    <group position={[-3.6, 0.98, 1.4]}>
      {/* ── 1. Head & Neck (Resting naturally and comfortably on hospital pillow) ── */}
      <group position={[0, 0.16, -0.80]} rotation={[0.15, 0, 0]}>
        {/* Cranium & Facial Structure */}
        <mesh castShadow scale={[0.88, 1.05, 0.96]}>
          <sphereGeometry args={[0.125, 18, 18]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Hair resting on pillow */}
        <mesh position={[0, 0.04, -0.02]} scale={[0.9, 1.04, 0.98]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color={HAIR_COLOR} roughness={0.8} />
        </mesh>
        {/* Nose bridge */}
        <mesh position={[0, 0.01, 0.125]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[0.016, 0.038, 8]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Facial Expression (Pained -> Peaceful relief after Step 5) */}
        <mesh position={[0, -0.04, 0.12]}>
          <planeGeometry args={[0.04, 0.012]} />
          <meshBasicMaterial color={p1Step >= 5 ? "#10b981" : "#b91c1c"} />
        </mesh>
      </group>

      {/* Anatomical Neck connecting chest directly to skull */}
      <mesh position={[0, 0.12, -0.60]} rotation={[-0.25, 0, 0]}>
        <cylinderGeometry args={[0.054, 0.068, 0.18, 14]} />
        <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
      </mesh>

      {/* ── 2. Torso & Pelvis (Clean, continuous human torso with hospital gown & shorts) ── */}
      <group position={[0, 0.08, 0]}>
        {/* Upper Chest / Pectorals */}
        <mesh position={[0, 0.04, -0.32]} castShadow>
          <boxGeometry args={[0.38, 0.17, 0.28]} />
          <meshStandardMaterial color={PATIENT_GOWN_COLOR} roughness={0.5} />
        </mesh>
        {/* Mid Torso / Abdomen */}
        <mesh position={[0, 0.03, -0.06]} castShadow>
          <boxGeometry args={[0.34, 0.15, 0.28]} />
          <meshStandardMaterial color={PATIENT_GOWN_COLOR} roughness={0.5} />
        </mesh>
        {/* Pelvic Core (Hospital Shorts) */}
        <mesh position={[0, 0.02, 0.18]} castShadow>
          <boxGeometry args={[0.35, 0.16, 0.24]} />
          <meshStandardMaterial color={SHORTS_COLOR} roughness={0.5} />
        </mesh>
        {/* Anatomical Hip Sockets embedded seamlessly into shorts */}
        <mesh position={[-0.11, 0.01, 0.24]}>
          <sphereGeometry args={[0.080, 16, 16]} />
          <meshStandardMaterial color={SHORTS_COLOR} roughness={0.5} />
        </mesh>
        <mesh position={[0.11, 0.01, 0.24]}>
          <sphereGeometry args={[0.080, 16, 16]} />
          <meshStandardMaterial color={SHORTS_COLOR} roughness={0.5} />
        </mesh>
      </group>

      {/* ── 3. Arms & Hands (EXACTLY TWO ARMS, CONNECTED AT SHOULDERS, RESTING NATURALLY BESIDE TORSO) ── */}
      {/* Right Arm (Resting flat along right side on mattress, ZERO extra limbs) */}
      <group position={[-0.22, 0.08, 0]}>
        {/* Shoulder */}
        <mesh position={[0, 0.02, -0.32]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshStandardMaterial color={PATIENT_GOWN_COLOR} />
        </mesh>
        {/* Upper Arm resting along bed mattress */}
        <mesh position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.040, 0.16, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Elbow Joint */}
        <mesh position={[0, 0, -0.02]}>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Forearm resting along bed mattress */}
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.034, 0.16, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Right Hand flat on bed mattress beside hip */}
        <mesh position={[0, -0.01, 0.26]}>
          <boxGeometry args={[0.055, 0.020, 0.08]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
      </group>

      {/* Left Arm (Resting flat along left side on mattress, ZERO extra limbs) */}
      <group position={[0.22, 0.08, 0]}>
        {/* Shoulder */}
        <mesh position={[0, 0.02, -0.32]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshStandardMaterial color={PATIENT_GOWN_COLOR} />
        </mesh>
        {/* Upper Arm resting along bed mattress */}
        <mesh position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.040, 0.16, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Elbow Joint */}
        <mesh position={[0, 0, -0.02]}>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Forearm resting along bed mattress */}
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.034, 0.16, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Left Hand flat on bed mattress beside hip */}
        <mesh position={[0, -0.01, 0.26]}>
          <boxGeometry args={[0.055, 0.020, 0.08]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
      </group>

      {/* ── 4. Legs (ZERO GAPS: Seamless Capsule Limbs & Overlapping Spheres) ── */}

      {/* ── RIGHT LEG (NORMAL, UNINJURED) ── */}
      <group position={[-0.11, 0.08, 0.24]}>
        {/* Seamless Thigh: Capsule with rounded hemispherical ends */}
        <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.064, 0.22, 8, 16]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Knee Joint Sphere */}
        <mesh position={[0, 0.01, 0.36]}>
          <sphereGeometry args={[0.062, 16, 16]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Shin & Calf */}
        <mesh position={[0, 0, 0.54]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.050, 0.22, 8, 16]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Ankle Joint */}
        <mesh position={[0, 0.01, 0.72]}>
          <sphereGeometry args={[0.044, 14, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Foot resting flat on bed */}
        <group position={[0, 0.04, 0.78]}>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.075, 0.10, 0.14]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>
        </group>
      </group>

      {/* ── LEFT LEG (FRACTURED SHIN WITH REALISTIC RED WOUND & PROGRESSIVE HEALING) ── */}
      <group position={[0.11, 0.08, 0.24]}>
        {/* Thigh (Relaxed angle) */}
        <mesh position={[0.02, 0, 0.18]} rotation={[Math.PI / 2, 0, 0.04]} castShadow>
          <capsuleGeometry args={[0.064, 0.22, 8, 16]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Knee Joint */}
        <mesh position={[0.03, 0.01, 0.36]}>
          <sphereGeometry args={[0.062, 16, 16]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>

        {/* ── Lower Leg with Visible Fracture & Progressive Treatment ── */}
        <group position={[0.03, 0, 0.36]}>
          {/* Anatomical Lower Leg Core (Seamless Capsule) */}
          <mesh position={[0.01, 0, 0.18]} rotation={[Math.PI / 2, 0, 0.06]} castShadow>
            <capsuleGeometry args={[0.050, 0.22, 8, 16]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>

          {/* 1. REALISTIC RED OPEN WOUND (Zero purple, natural deep reds and crimson) */}
          {p1Step === 0 && (
            <group position={[0.025, 0.046, 0.18]}>
              {/* Deep Red Subcutaneous Trauma Bed */}
              <mesh position={[0, -0.003, 0]} scale={[1.15, 0.40, 1.35]}>
                <sphereGeometry args={[0.046, 16, 16]} />
                <meshStandardMaterial color="#991b1b" roughness={0.4} />
              </mesh>
              {/* Central Laceration with Jagged Margins (Vivid Open Blood Red) */}
              <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0.4]}>
                <circleGeometry args={[0.028, 14]} />
                <meshStandardMaterial color="#b91c1c" roughness={0.3} />
              </mesh>
              <mesh position={[0.010, 0.007, -0.015]} rotation={[-Math.PI / 2, 0, -0.5]}>
                <circleGeometry args={[0.022, 12]} />
                <meshStandardMaterial color="#7f1d1d" roughness={0.3} />
              </mesh>
              <mesh position={[-0.012, 0.007, 0.016]} rotation={[-Math.PI / 2, 0, 0.7]}>
                <circleGeometry args={[0.024, 12]} />
                <meshStandardMaterial color="#dc2626" roughness={0.3} />
              </mesh>
              <mesh position={[0.003, 0.008, 0.028]} rotation={[-Math.PI / 2, 0, 0.2]}>
                <circleGeometry args={[0.016, 10]} />
                <meshStandardMaterial color="#b91c1c" roughness={0.3} />
              </mesh>

              {/* Natural Red Capillary Blood Droplets around the wound */}
              {[
                [-0.025, 0.005, -0.030, 0.008],
                [0.020, 0.006, -0.035, 0.010],
                [-0.028, 0.005, 0.032, 0.009],
                [0.026, 0.005, 0.030, 0.008],
                [0.012, 0.006, 0.055, 0.011],
                [-0.015, 0.005, -0.055, 0.009],
                [0.030, 0.005, -0.010, 0.007],
                [-0.032, 0.005, 0.008, 0.007],
              ].map(([dx, dy, dz, r], sIdx) => (
                <mesh key={`p1-splatter-${sIdx}`} position={[dx, dy, dz]} rotation={[-Math.PI / 2, 0, sIdx]}>
                  <circleGeometry args={[r, 10]} />
                  <meshStandardMaterial color="#b91c1c" roughness={0.4} />
                </mesh>
              ))}
            </group>
          )}

          {/* 2. Antiseptic Golden Disinfection Sheen (Visible after Step 1) */}
          {p1Step >= 1 && p1Step < 3 && (
            <mesh position={[0.025, 0.046, 0.18]} rotation={[-Math.PI / 2, 0, 0.2]}>
              <circleGeometry args={[0.055, 16]} />
              <meshStandardMaterial color="#d97706" roughness={0.3} transparent opacity={0.75} />
            </mesh>
          )}

          {/* 3. Rigid Anatomical Leg Splint (Positioned in Step 3) */}
          {p1Step >= 2 && (
            <mesh position={[0.025, -0.01, 0.18]} rotation={[0, 0.06, 0]} castShadow>
              <boxGeometry args={[0.11, 0.05, 0.38]} />
              <meshStandardMaterial color="#ca8a04" roughness={0.5} />
            </mesh>
          )}

          {/* 4. Conforming Gauze Bandage Wraps around Leg & Splint (Wrapped in Step 3) */}
          {p1Step >= 3 && (
            <group position={[0.02, 0.01, 0.18]} rotation={[Math.PI / 2, 0, 0.06]}>
              <mesh castShadow>
                <capsuleGeometry args={[0.068, 0.26, 8, 16]} />
                <meshStandardMaterial color="#ffffff" roughness={0.7} />
              </mesh>
              {[-0.10, -0.04, 0.03, 0.09].map((by) => (
                <mesh key={`b-loop-${by}`} position={[0, by, 0]}>
                  <torusGeometry args={[0.070, 0.006, 8, 20]} />
                  <meshStandardMaterial color="#e2e8f0" />
                </mesh>
              ))}
            </group>
          )}

          {/* 5. Medical Adhesive Tape Anchors (Applied in Step 5) */}
          {p1Step >= 4 && (
            <group position={[0.02, 0.01, 0.18]}>
              <mesh position={[0, 0.065, -0.08]}>
                <boxGeometry args={[0.13, 0.025, 0.03]} />
                <meshStandardMaterial color="#fef08a" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.065, 0.08]}>
                <boxGeometry args={[0.13, 0.025, 0.03]} />
                <meshStandardMaterial color="#fef08a" roughness={0.4} />
              </mesh>
            </group>
          )}

          {/* Ankle & Foot */}
          <mesh position={[0.01, 0.01, 0.36]}>
            <sphereGeometry args={[0.044, 14, 14]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>
          <group position={[0.02, 0.04, 0.42]} rotation={[0, 0.06, 0]}>
            <mesh position={[0, 0, 0.02]}>
              <boxGeometry args={[0.075, 0.10, 0.14]} />
              <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// ── Patient 2: Anatomical Human on Bed 3 (Broken Hand / Wrist Immobilization) ──
function PatientTwoAnatomical({
  flowState,
  p2Step,
}: {
  flowState: FlowState;
  p2Step: number;
}) {
  const isArrived =
    flowState !== "INTRO_IDLE" &&
    !flowState.startsWith("P1_") &&
    flowState !== "INTER_PAUSE_1" &&
    flowState !== "P2_ARRIVING";

  if (!isArrived) return null;

  return (
    <group position={[3.6, 0.98, -2.2]}>
      {/* ── 1. Head & Neck Naturally Resting on Hospital Pillow ── */}
      <group position={[0, 0.16, -0.80]} rotation={[0.15, 0, 0]}>
        <mesh castShadow scale={[0.88, 1.05, 0.96]}>
          <sphereGeometry args={[0.125, 18, 18]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.04, -0.02]} scale={[0.9, 1.04, 0.98]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
      </group>

      {/* Neck */}
      <mesh position={[0, 0.12, -0.60]} rotation={[-0.25, 0, 0]}>
        <cylinderGeometry args={[0.054, 0.068, 0.18, 14]} />
        <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
      </mesh>

      {/* ── 2. Torso & Pelvis Continuous ── */}
      <group position={[0, 0.08, 0]}>
        <mesh position={[0, 0.04, -0.32]} castShadow>
          <boxGeometry args={[0.38, 0.17, 0.28]} />
          <meshStandardMaterial color="#a7f3d0" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.03, -0.06]} castShadow>
          <boxGeometry args={[0.34, 0.15, 0.28]} />
          <meshStandardMaterial color="#a7f3d0" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0.18]} castShadow>
          <boxGeometry args={[0.35, 0.16, 0.24]} />
          <meshStandardMaterial color="#6ee7b7" roughness={0.5} />
        </mesh>
        {/* Hip joint sockets */}
        <mesh position={[-0.11, 0.01, 0.24]}>
          <sphereGeometry args={[0.080, 16, 16]} />
          <meshStandardMaterial color="#6ee7b7" roughness={0.5} />
        </mesh>
        <mesh position={[0.11, 0.01, 0.24]}>
          <sphereGeometry args={[0.080, 16, 16]} />
          <meshStandardMaterial color="#6ee7b7" roughness={0.5} />
        </mesh>
      </group>

      {/* ── 3. Arms & Hands (EXACTLY TWO ARMS, ZERO FLOATING LIMBS) ── */}

      {/* Left Arm (Uninjured, Wall Side X = +0.22, resting flat on mattress) */}
      <group position={[0.22, 0.08, 0]}>
        <mesh position={[0, 0.02, -0.32]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshStandardMaterial color="#a7f3d0" />
        </mesh>
        <mesh position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.040, 0.16, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, -0.02]}>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.034, 0.16, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.01, 0.26]}>
          <boxGeometry args={[0.055, 0.020, 0.08]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
      </group>

      {/* Right Arm (Injured Forearm & Wrist, Aisle Side X = -0.22, elevated and resting clearly on top of abdomen) */}
      <group position={[-0.22, 0.08, 0]}>
        {/* Shoulder Joint Socket */}
        <mesh position={[0, 0.02, -0.32]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshStandardMaterial color="#a7f3d0" />
        </mesh>
        {/* Upper Arm resting along side */}
        <mesh position={[0, 0.02, -0.17]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.040, 0.18, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Elbow Joint */}
        <mesh position={[0, 0.03, -0.02]}>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Forearm rising smoothly and naturally across onto the abdomen */}
        <mesh position={[0.07, 0.085, 0.005]} rotation={[0.427, 0, -0.859]} castShadow>
          <capsuleGeometry args={[0.035, 0.115, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Wrist Joint */}
        <mesh position={[0.14, 0.14, 0.03]}>
          <sphereGeometry args={[0.036, 12, 12]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        {/* Injured Hand positioned clearly and visibly on top of abdomen (fully exposed, not submerged) */}
        <mesh position={[0.17, 0.145, 0.045]} rotation={[0.05, 0, -0.3]}>
          <boxGeometry args={[0.058, 0.024, 0.085]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>

        {/* ── Injured Wrist Wound (Clear, Visible Open Red Contusion on top of elevated wrist) ── */}
        {p2Step === 0 && (
          <group position={[0.14, 0.160, 0.035]}>
            <mesh scale={[1.1, 0.4, 1.2]}>
              <sphereGeometry args={[0.032, 14, 14]} />
              <meshStandardMaterial color="#991b1b" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0.3]}>
              <circleGeometry args={[0.024, 12]} />
              <meshStandardMaterial color="#dc2626" roughness={0.3} />
            </mesh>
          </group>
        )}
        {p2Step >= 1 && p2Step < 3 && (
          <mesh position={[0.14, 0.160, 0.035]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.038, 12]} />
            <meshStandardMaterial color="#d97706" roughness={0.3} transparent opacity={0.8} />
          </mesh>
        )}
        {p2Step >= 3 && (
          <mesh position={[0.14, 0.145, 0.035]} rotation={[0.427, 0, -0.859]} castShadow>
            <capsuleGeometry args={[0.048, 0.10, 8, 14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        )}
        {p2Step >= 4 && (
          <mesh position={[0.14, 0.170, 0.035]}>
            <boxGeometry args={[0.08, 0.015, 0.02]} />
            <meshStandardMaterial color="#fef08a" />
          </mesh>
        )}

        {/* Triangular Elevated Arm Sling (Step 5+) – Supporting contoured fabric wrap */}
        {p2Step >= 5 && (
          <group position={[0.08, 0.11, 0.00]}>
            <mesh castShadow>
              <boxGeometry args={[0.26, 0.14, 0.20]} />
              <meshStandardMaterial color="#0284c7" roughness={0.5} />
            </mesh>
            <mesh position={[-0.04, 0.16, -0.15]} rotation={[0.4, 0, 0]}>
              <boxGeometry args={[0.04, 0.015, 0.26]} />
              <meshStandardMaterial color="#0369a1" />
            </mesh>
          </group>
        )}
      </group>

      {/* ── 4. Both Legs (ZERO GAPS: 100% Connected from Thighs to Feet) ── */}
      {[-0.11, 0.11].map((lx, idx) => (
        <group key={`p2-leg-${idx}`} position={[lx, 0.08, 0.24]}>
          {/* Thigh */}
          <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.064, 0.22, 8, 16]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>
          {/* Knee */}
          <mesh position={[0, 0.01, 0.36]}>
            <sphereGeometry args={[0.062, 16, 16]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>
          {/* Lower Leg (Shin & Calf) – PROPERLY POSITIONED AT Z = 0.54 (NO FLOATING IN SKY!) */}
          <mesh position={[0, 0, 0.54]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.050, 0.22, 8, 16]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>
          {/* Ankle Joint */}
          <mesh position={[0, 0.01, 0.72]}>
            <sphereGeometry args={[0.044, 14, 14]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>
          {/* Foot Resting Flat on Bed */}
          <group position={[0, 0.04, 0.78]}>
            <mesh position={[0, 0, 0.02]}>
              <boxGeometry args={[0.075, 0.10, 0.14]} />
              <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// ── Patient 3: Anatomical Human on Bed 4 (Bike Accident Multi-Injuries) ──
function PatientThreeAnatomical({
  flowState,
  p3Step,
}: {
  flowState: FlowState;
  p3Step: number;
}) {
  const isArrived =
    flowState !== "INTRO_IDLE" &&
    !flowState.startsWith("P1_") &&
    !flowState.startsWith("P2_") &&
    flowState !== "INTER_PAUSE_2" &&
    flowState !== "P3_ARRIVING";

  if (!isArrived) return null;

  return (
    <group position={[3.6, 0.98, 1.4]}>
      {/* ── 1. Head & Neck Naturally Resting on Hospital Pillow ── */}
      <group position={[0, 0.16, -0.80]} rotation={[0.15, 0, 0]}>
        <mesh castShadow scale={[0.88, 1.05, 0.96]}>
          <sphereGeometry args={[0.125, 18, 18]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.04, -0.02]} scale={[0.9, 1.04, 0.98]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
      </group>

      {/* Neck */}
      <mesh position={[0, 0.12, -0.60]} rotation={[-0.25, 0, 0]}>
        <cylinderGeometry args={[0.054, 0.068, 0.18, 14]} />
        <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
      </mesh>

      {/* ── 2. Torso & Pelvis Continuous ── */}
      <group position={[0, 0.08, 0]}>
        <mesh position={[0, 0.04, -0.32]} castShadow>
          <boxGeometry args={[0.38, 0.17, 0.28]} />
          <meshStandardMaterial color="#c7d2fe" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.03, -0.06]} castShadow>
          <boxGeometry args={[0.34, 0.15, 0.28]} />
          <meshStandardMaterial color="#c7d2fe" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0.18]} castShadow>
          <boxGeometry args={[0.35, 0.16, 0.24]} />
          <meshStandardMaterial color="#a5b4fc" roughness={0.5} />
        </mesh>
        {/* Hip joint sockets */}
        <mesh position={[-0.11, 0.01, 0.24]}>
          <sphereGeometry args={[0.080, 16, 16]} />
          <meshStandardMaterial color="#a5b4fc" roughness={0.5} />
        </mesh>
        <mesh position={[0.11, 0.01, 0.24]}>
          <sphereGeometry args={[0.080, 16, 16]} />
          <meshStandardMaterial color="#a5b4fc" roughness={0.5} />
        </mesh>

        {/* Hip Abrasion (Realistic Red Wound) */}
        {p3Step === 0 && (
          <group position={[-0.18, 0.06, 0.18]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh>
              <circleGeometry args={[0.042, 12]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            <mesh position={[0, 0, 0.002]}>
              <circleGeometry args={[0.028, 10]} />
              <meshStandardMaterial color="#991b1b" />
            </mesh>
          </group>
        )}
        {p3Step >= 1 && p3Step < 3 && (
          <mesh position={[-0.18, 0.06, 0.18]} rotation={[0, -Math.PI / 2, 0]}>
            <circleGeometry args={[0.046, 12]} />
            <meshStandardMaterial color="#d97706" />
          </mesh>
        )}
        {p3Step >= 3 && (
          <mesh position={[-0.18, 0.06, 0.18]}>
            <boxGeometry args={[0.05, 0.07, 0.14]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        )}
      </group>

      {/* ── 3. Arms & Hands (EXACTLY TWO ARMS RESTING NATURALLY BESIDE TORSO) ── */}
      {/* Left Arm (Wall Side X = +0.22) */}
      <group position={[0.22, 0.08, 0]}>
        <mesh position={[0, 0.02, -0.32]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshStandardMaterial color="#c7d2fe" />
        </mesh>
        <mesh position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.040, 0.16, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, -0.02]}>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.034, 0.16, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.01, 0.26]}>
          <boxGeometry args={[0.055, 0.020, 0.08]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
      </group>

      {/* Right Arm (Aisle Side X = -0.22, resting naturally with forearm abrasion) */}
      <group position={[-0.22, 0.08, 0]}>
        <mesh position={[0, 0.02, -0.32]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshStandardMaterial color="#c7d2fe" />
        </mesh>
        <mesh position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.040, 0.16, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, -0.02]}>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.034, 0.16, 8, 14]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.01, 0.26]}>
          <boxGeometry args={[0.055, 0.020, 0.08]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>

        {/* Forearm Abrasion (Vivid Red Laceration) */}
        {p3Step === 0 && (
          <group position={[0, 0.04, 0.10]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <circleGeometry args={[0.032, 12]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            <mesh position={[0, 0, 0.002]}>
              <circleGeometry args={[0.020, 10]} />
              <meshStandardMaterial color="#991b1b" />
            </mesh>
          </group>
        )}
        {p3Step >= 1 && p3Step < 3 && (
          <mesh position={[0, 0.04, 0.10]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.038, 12]} />
            <meshStandardMaterial color="#d97706" />
          </mesh>
        )}
        {p3Step >= 3 && (
          <mesh position={[0, 0.04, 0.10]}>
            <boxGeometry args={[0.07, 0.03, 0.14]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        )}
      </group>

      {/* ── 4. Both Legs (ZERO GAPS: 100% Connected, Lower Leg at Z = 0.54) ── */}
      {[-0.11, 0.11].map((lx, idx) => (
        <group key={`p3-leg-${idx}`} position={[lx, 0.08, 0.24]}>
          {/* Thigh */}
          <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.064, 0.22, 8, 16]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>
          {/* Knee */}
          <mesh position={[0, 0.01, 0.36]}>
            <sphereGeometry args={[0.062, 16, 16]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>
          {/* Lower Leg (Shin & Calf) – PROPERLY POSITIONED AT Z = 0.54 */}
          <mesh position={[0, 0, 0.54]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.050, 0.22, 8, 16]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>
          {/* Ankle Joint */}
          <mesh position={[0, 0.01, 0.72]}>
            <sphereGeometry args={[0.044, 14, 14]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
          </mesh>
          {/* Foot Resting Flat on Bed */}
          <group position={[0, 0.04, 0.78]}>
            <mesh position={[0, 0, 0.02]}>
              <boxGeometry args={[0.075, 0.10, 0.14]} />
              <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
            </mesh>
          </group>

          {/* Right Leg Abrasion (idx === 1, Vivid Red Laceration) */}
          {idx === 1 && (
            <>
              {p3Step === 0 && (
                <group position={[0, 0.04, 0.54]} rotation={[-Math.PI / 2, 0, 0]}>
                  <mesh>
                    <circleGeometry args={[0.038, 12]} />
                    <meshStandardMaterial color="#dc2626" />
                  </mesh>
                  <mesh position={[0, 0, 0.002]}>
                    <circleGeometry args={[0.024, 10]} />
                    <meshStandardMaterial color="#991b1b" />
                  </mesh>
                </group>
              )}
              {p3Step >= 4 && (
                <mesh position={[0, 0.01, 0.54]} rotation={[Math.PI / 2, 0, 0]}>
                  <capsuleGeometry args={[0.062, 0.20, 8, 14]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
              )}
            </>
          )}
        </group>
      ))}
    </group>
  );
}

// ── Patient 0: Resting human on Bed 1 (Back-Left) ──
function PatientZeroAnatomical() {
  return (
    <group position={[-3.6, 0.98, -2.2]}>
      {/* Head on pillow */}
      <group position={[0, 0.16, -0.80]} rotation={[0.15, 0, 0]}>
        <mesh castShadow scale={[0.88, 1.05, 0.96]}>
          <sphereGeometry args={[0.125, 18, 18]} />
          <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.04, -0.02]} scale={[0.9, 1.04, 0.98]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
      </group>
      <mesh position={[0, 0.12, -0.60]} rotation={[-0.25, 0, 0]}>
        <cylinderGeometry args={[0.054, 0.068, 0.18, 14]} />
        <meshStandardMaterial color={SKIN_COLOR} roughness={0.65} />
      </mesh>
      <group position={[0, 0.08, 0]}>
        <mesh position={[0, 0.04, -0.32]} castShadow>
          <boxGeometry args={[0.38, 0.17, 0.28]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.03, -0.06]} castShadow>
          <boxGeometry args={[0.34, 0.15, 0.28]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.5} />
        </mesh>
      </group>
      <mesh position={[0, 0.12, 0.35]} castShadow receiveShadow>
        <boxGeometry args={[0.92, 0.20, 1.1]} />
        <meshStandardMaterial color="#bae6fd" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ── Doctor's Executive Workstation & Doctor Character ──
function DoctorWorkstation() {
  return (
    <group position={[0, 0, 2.4]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.84, 0.7]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.86, 0.04, 0.76]} />
        <meshStandardMaterial color="#334155" roughness={0.4} />
      </mesh>
      <mesh position={[-0.45, 0.88, 0.05]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.26, 0.015, 0.35]} />
        <meshStandardMaterial color="#b45309" roughness={0.6} />
      </mesh>
      <group position={[0.45, 0.87, -0.05]}>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.02, 0.06, 0.2, 10]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.26, 0]} rotation={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.5, 0.3, 0.03]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[-0.01, 0.26, 0.018]} rotation={[0, -0.3, 0]}>
          <planeGeometry args={[0.46, 0.26]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>
      <group position={[0, 0.52, 0.62]}>
        <mesh position={[0, 0.32, 0]} castShadow>
          <boxGeometry args={[0.38, 0.44, 0.22]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <group position={[0, 0.66, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.05, -0.02]}>
            <sphereGeometry args={[0.14, 14, 14]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// NURSE CHARACTER: POSITIONED BESIDE INJURY, FACING PATIENT & HANDS ON WOUND
// ═════════════════════════════════════════════════════════════════════════════

const NURSE_SCRUB_COLOR = "#0d9488";
const NURSE_PANTS_COLOR = "#0f766e";

function NurseCharacterAnatomical({
  flowState,
  p1Step,
  p2Step,
  p3Step,
  onNurseClick,
}: {
  flowState: FlowState;
  p1Step: number;
  p2Step: number;
  p3Step: number;
  onNurseClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const isP1 = flowState.startsWith("P1_");
  const isP2 = flowState.startsWith("P2_");
  const isP3 = flowState.startsWith("P3_");

  const currentStep = isP1 ? p1Step : isP2 ? p2Step : isP3 ? p3Step : 0;
  const isWaitingNurse =
    flowState === "P1_WAITING_NURSE" ||
    flowState === "P2_WAITING_NURSE" ||
    flowState === "P3_WAITING_NURSE";
  const isStepAnimating =
    flowState === "P1_STEP_ANIMATING" ||
    flowState === "P2_STEP_ANIMATING" ||
    flowState === "P3_STEP_ANIMATING";
  const isTreatmentPhase =
    flowState === "P1_TREATMENT" ||
    flowState === "P2_TREATMENT" ||
    flowState === "P3_TREATMENT";

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // ── Targeted Standing Position Beside Bed & Facing DIRECTLY into the Patient ──
    let targetX = -2.95;
    let targetZ = 2.05; // Right beside Bed 2's injured shin at Z = 2.22
    let targetRot = -Math.PI * 0.40; // Faces towards negative X (Bed 2 & Patient's injured leg!)

    if (isP1) {
      targetX = -2.95;
      targetZ = 2.05;
      targetRot = -Math.PI * 0.40;
    } else if (isP2) {
      targetX = 2.95;
      targetZ = -2.20; // Right beside Bed 3 wrist injury (Bed 3 is at X = +3.6, Z = -2.20)
      targetRot = Math.PI * 0.40;
    } else if (isP3) {
      targetX = 2.95;
      targetZ = 1.70; // Beside Bed 4 trauma (Bed 4 is at X = +3.6, Z = 1.40)
      targetRot = Math.PI * 0.40;
    } else if (flowState === "WARD_STABILIZED") {
      targetX = 0;
      targetZ = 0.5;
      targetRot = 0;
    } else {
      // Intro idle
      targetX = -1.8;
      targetZ = -0.5;
      targetRot = 0.8;
    }

    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.08);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.08);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, 0.08);
    }

    // ── Torso Bending / Leaning forward at waist over the bed towards the patient ──
    if (torsoRef.current) {
      if (isStepAnimating) {
        torsoRef.current.rotation.x = THREE.MathUtils.lerp(torsoRef.current.rotation.x, 0.32, 0.12);
        torsoRef.current.rotation.y = THREE.MathUtils.lerp(torsoRef.current.rotation.y, 0.02, 0.12);
        torsoRef.current.rotation.z = THREE.MathUtils.lerp(torsoRef.current.rotation.z, -0.04, 0.12);
      } else if (isTreatmentPhase) {
        torsoRef.current.rotation.x = THREE.MathUtils.lerp(torsoRef.current.rotation.x, 0.16, 0.1);
        torsoRef.current.rotation.y = THREE.MathUtils.lerp(torsoRef.current.rotation.y, 0, 0.1);
        torsoRef.current.rotation.z = THREE.MathUtils.lerp(torsoRef.current.rotation.z, 0, 0.1);
      } else {
        torsoRef.current.rotation.x = THREE.MathUtils.lerp(torsoRef.current.rotation.x, 0.06, 0.1);
        torsoRef.current.rotation.y = THREE.MathUtils.lerp(torsoRef.current.rotation.y, 0, 0.1);
        torsoRef.current.rotation.z = THREE.MathUtils.lerp(torsoRef.current.rotation.z, 0, 0.1);
      }
    }

    // ── Head nods down towards the patient's injury ──
    if (headRef.current) {
      if (isStepAnimating || isTreatmentPhase) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.25, 0.1);
      } else {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.04, 0.1);
      }
    }

    // ── Hands and Arms extending FORWARD towards the patient's wound ──
    // Note: Negative rotation.x rotates the hanging arm FORWARD (+Z) towards the patient!
    if (leftArmRef.current && rightArmRef.current) {
      if (isStepAnimating) {
        const wave = Math.sin(t * 8) * 0.12;
        // Right arm extends forward and down directly onto the patient's wound surface
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -1.25 + wave, 0.2);
        rightArmRef.current.rotation.y = THREE.MathUtils.lerp(rightArmRef.current.rotation.y, -0.15 + wave * 0.6, 0.2);
        rightArmRef.current.rotation.z = -0.12;

        // Left arm extends forward in support adjacent to the wound
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -1.15, 0.2);
        leftArmRef.current.rotation.y = 0.15;
        leftArmRef.current.rotation.z = 0.12;
      } else if (isTreatmentPhase) {
        // Hands held forward attentively ready for first aid procedure
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -0.65, 0.1);
        rightArmRef.current.rotation.y = THREE.MathUtils.lerp(rightArmRef.current.rotation.y, -0.10, 0.1);
        rightArmRef.current.rotation.z = -0.08;

        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -0.55, 0.1);
        leftArmRef.current.rotation.y = 0.10;
        leftArmRef.current.rotation.z = 0.08;
      } else {
        // Resting natural posture
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -0.12 + Math.sin(t * 2) * 0.03, 0.1);
        rightArmRef.current.rotation.y = 0;
        rightArmRef.current.rotation.z = -0.06;

        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -0.12 - Math.sin(t * 2) * 0.03, 0.1);
        leftArmRef.current.rotation.y = 0;
        leftArmRef.current.rotation.z = 0.06;
      }
    }
  });

  return (
    <group ref={groupRef} position={[-1.8, 0, -0.5]}>
      {/* 3D Indicator above Nurse when waiting */}
      {isWaitingNurse && (
        <Html position={[0, 1.85, 0]} center pointerEvents="auto">
          <button
            type="button"
            onClick={onNurseClick}
            className="cursor-pointer group flex flex-col items-center animate-bounce focus:outline-none"
            title="Click nurse to initiate first-aid treatment"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 rounded-full bg-emerald-400/40 animate-ping" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-black group-hover:scale-110 transition-transform">
                <HandHelping size={18} strokeWidth={2.5} />
              </div>
            </div>
            <span className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-900/95 text-white font-black text-[10px] tracking-wider uppercase border border-emerald-400/60 shadow-md whitespace-nowrap">
              CLICK NURSE TO TREAT
            </span>
          </button>
        </Html>
      )}

      {/* ── LOWER BODY (Stationary on floor, Y in [0, 0.72]) ── */}
      <group position={[0, 0, 0]}>
        {/* Pelvic base */}
        <mesh position={[0, 0.70, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={NURSE_PANTS_COLOR} roughness={0.5} />
        </mesh>

        {/* Left Leg */}
        <group position={[-0.09, 0, 0]}>
          <mesh position={[0, 0.70, 0]}>
            <sphereGeometry args={[0.062, 14, 14]} />
            <meshStandardMaterial color={NURSE_PANTS_COLOR} />
          </mesh>
          {/* Thigh */}
          <mesh position={[0, 0.52, 0]} castShadow>
            <capsuleGeometry args={[0.056, 0.22, 8, 14]} />
            <meshStandardMaterial color={NURSE_PANTS_COLOR} />
          </mesh>
          {/* Knee */}
          <mesh position={[0, 0.38, 0]}>
            <sphereGeometry args={[0.054, 12, 12]} />
            <meshStandardMaterial color={NURSE_PANTS_COLOR} />
          </mesh>
          {/* Calf / Pants Lower */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <capsuleGeometry args={[0.050, 0.20, 8, 14]} />
            <meshStandardMaterial color={NURSE_PANTS_COLOR} />
          </mesh>
          {/* Shoe */}
          <mesh position={[0, 0.04, 0.04]}>
            <capsuleGeometry args={[0.042, 0.10, 8, 12]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
        </group>

        {/* Right Leg */}
        <group position={[0.09, 0, 0]}>
          <mesh position={[0, 0.70, 0]}>
            <sphereGeometry args={[0.062, 14, 14]} />
            <meshStandardMaterial color={NURSE_PANTS_COLOR} />
          </mesh>
          {/* Thigh */}
          <mesh position={[0, 0.52, 0]} castShadow>
            <capsuleGeometry args={[0.056, 0.22, 8, 14]} />
            <meshStandardMaterial color={NURSE_PANTS_COLOR} />
          </mesh>
          {/* Knee */}
          <mesh position={[0, 0.38, 0]}>
            <sphereGeometry args={[0.054, 12, 12]} />
            <meshStandardMaterial color={NURSE_PANTS_COLOR} />
          </mesh>
          {/* Calf / Pants Lower */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <capsuleGeometry args={[0.050, 0.20, 8, 14]} />
            <meshStandardMaterial color={NURSE_PANTS_COLOR} />
          </mesh>
          {/* Shoe */}
          <mesh position={[0, 0.04, 0.04]}>
            <capsuleGeometry args={[0.042, 0.10, 8, 12]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* ── UPPER BODY (Torso Pivoting cleanly at waist Y = 0.72) ── */}
      <group ref={torsoRef} position={[0, 0.72, 0]}>
        {/* Waist & Tunic bottom */}
        <mesh position={[0, 0.06, 0]}>
          <capsuleGeometry args={[0.13, 0.08, 8, 16]} />
          <meshStandardMaterial color={NURSE_SCRUB_COLOR} roughness={0.5} />
        </mesh>

        {/* Torso Scrub Tunic */}
        <group position={[0, 0.28, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.34, 0.38, 0.20]} />
            <meshStandardMaterial color={NURSE_SCRUB_COLOR} roughness={0.5} />
          </mesh>
          {/* V-neck skin patch at +Z (Front) */}
          <mesh position={[0, 0.14, 0.102]}>
            <planeGeometry args={[0.1, 0.1]} />
            <meshBasicMaterial color={SKIN_COLOR} />
          </mesh>
          {/* ID Badge at +Z (Front) */}
          <mesh position={[0.08, 0.10, 0.103]}>
            <planeGeometry args={[0.05, 0.07]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Stethoscope around neck */}
          <mesh position={[0, 0.16, 0.08]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.11, 0.012, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
        </group>

        {/* Head & Neck (Pivots with headRef for downward gaze towards patient) */}
        <group ref={headRef} position={[0, 0.58, 0]}>
          {/* Neck */}
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.044, 0.052, 0.10, 10]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.08, 0]} castShadow scale={[0.88, 1.05, 0.95]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
          </mesh>
          {/* Hair Front & Back */}
          <mesh position={[0, 0.14, -0.04]}>
            <sphereGeometry args={[0.125, 14, 14]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
          {/* Hair Bun at -Z (Back) */}
          <mesh position={[0, 0.14, -0.12]}>
            <sphereGeometry args={[0.048, 12, 12]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
          {/* Nurse Cap */}
          <mesh position={[0, 0.22, 0.02]}>
            <boxGeometry args={[0.13, 0.035, 0.10]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {/* Red Cross on Cap at +Z (Front) */}
          <mesh position={[0, 0.22, 0.072]}>
            <planeGeometry args={[0.025, 0.025]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>

        {/* Left Arm (Shoulder at [-0.20, 0.44, 0]) */}
        <group ref={leftArmRef} position={[-0.20, 0.44, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.052, 12, 12]} />
            <meshStandardMaterial color={NURSE_SCRUB_COLOR} />
          </mesh>
          {/* Upper Arm */}
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.042, 0.16, 8, 14]} />
            <meshStandardMaterial color={NURSE_SCRUB_COLOR} />
          </mesh>
          {/* Elbow */}
          <mesh position={[0, -0.24, 0]}>
            <sphereGeometry args={[0.040, 10, 10]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
          </mesh>
          {/* Forearm */}
          <mesh position={[0, -0.36, 0.02]}>
            <capsuleGeometry args={[0.034, 0.16, 8, 14]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.48, 0.02]}>
            <capsuleGeometry args={[0.030, 0.05, 8, 12]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
          </mesh>
        </group>

        {/* Right Arm (Shoulder at [0.20, 0.44, 0]) */}
        <group ref={rightArmRef} position={[0.20, 0.44, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.052, 12, 12]} />
            <meshStandardMaterial color={NURSE_SCRUB_COLOR} />
          </mesh>
          {/* Upper Arm */}
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.042, 0.16, 8, 14]} />
            <meshStandardMaterial color={NURSE_SCRUB_COLOR} />
          </mesh>
          {/* Elbow */}
          <mesh position={[0, -0.24, 0]}>
            <sphereGeometry args={[0.040, 10, 10]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
          </mesh>
          {/* Forearm */}
          <mesh position={[0, -0.36, 0.02]}>
            <capsuleGeometry args={[0.034, 0.16, 8, 14]} />
            <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
          </mesh>
          {/* Hand & Held 3D Prop directly at the wound */}
          <group position={[0, -0.48, 0.02]}>
            <mesh>
              <capsuleGeometry args={[0.030, 0.05, 8, 12]} />
              <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
            </mesh>

            {/* Held 3D Prop directly at the wound */}
            {isStepAnimating && (
              <group position={[0, -0.04, 0.04]}>
                {currentStep === 0 && (
                  <mesh>
                    <sphereGeometry args={[0.036, 12, 12]} />
                    <meshStandardMaterial color="#ffffff" roughness={0.95} />
                  </mesh>
                )}
                {currentStep === 1 && (
                  <group>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[0.005, 0.005, 0.14, 8]} />
                      <meshStandardMaterial color="#fef08a" />
                    </mesh>
                    <mesh position={[0, 0, 0.07]}>
                      <sphereGeometry args={[0.018, 10, 10]} />
                      <meshStandardMaterial color="#d97706" roughness={0.4} />
                    </mesh>
                  </group>
                )}
                {currentStep === 2 && (
                  <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.032, 0.032, 0.08, 12]} />
                    <meshStandardMaterial color="#ffffff" roughness={0.7} />
                  </mesh>
                )}
                {currentStep === 3 && (
                  <mesh rotation={[0.4, 0, 0]}>
                    <boxGeometry args={[0.015, 0.10, 0.02]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.95} />
                  </mesh>
                )}
                {currentStep === 4 && (
                  <mesh>
                    <boxGeometry args={[0.08, 0.02, 0.02]} />
                    <meshStandardMaterial color="#fef08a" />
                  </mesh>
                )}
                {currentStep === 5 && (
                  <mesh>
                    <cylinderGeometry args={[0.02, 0.015, 0.04, 10]} />
                    <meshStandardMaterial color="#e0f2fe" transparent opacity={0.7} />
                  </mesh>
                )}
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

// ── Smooth Camera Controller ──
function CameraManager({ flowState }: { flowState: FlowState }) {
  const targetPos = useRef(new THREE.Vector3(0, 5.0, 6.8));
  const targetLookAt = useRef(new THREE.Vector3(0, 0.8, -0.4));
  const currentLookAt = useRef(new THREE.Vector3(0, 0.8, -0.4));

  useFrame((state, delta) => {
    if (
      flowState === "P1_ZOOMING_IN" ||
      flowState === "P1_TREATMENT" ||
      flowState === "P1_STEP_ANIMATING"
    ) {
      targetPos.current.set(-1.6, 2.1, 2.7);
      targetLookAt.current.set(-3.1, 1.05, 1.4);
    } else if (
      flowState === "P2_ZOOMING_IN" ||
      flowState === "P2_TREATMENT" ||
      flowState === "P2_STEP_ANIMATING"
    ) {
      targetPos.current.set(1.6, 2.2, -0.9);
      targetLookAt.current.set(3.1, 1.05, -2.2);
    } else if (
      flowState === "P3_ZOOMING_IN" ||
      flowState === "P3_TREATMENT" ||
      flowState === "P3_STEP_ANIMATING"
    ) {
      targetPos.current.set(1.6, 2.1, 2.7);
      targetLookAt.current.set(3.1, 1.05, 1.4);
    } else {
      targetPos.current.set(0, 5.0, 6.8);
      targetLookAt.current.set(0, 0.8, -0.4);
    }

    const t = Math.min(1, delta * 3.5);
    state.camera.position.lerp(targetPos.current, t);
    currentLookAt.current.lerp(targetLookAt.current, t);
    state.camera.lookAt(currentLookAt.current);
  });

  return null;
}

// ── Hospital Ward Scene Root ──
function HospitalWardScene({
  flowState,
  p1Step,
  p2Step,
  p3Step,
  onNurseClick,
  onSupplyClick,
}: {
  flowState: FlowState;
  p1Step: number;
  p2Step: number;
  p3Step: number;
  onNurseClick: () => void;
  onSupplyClick: (id: MedicalSupplyId) => void;
}) {
  const isP1 = flowState.startsWith("P1_");
  const isP2 = flowState.startsWith("P2_");
  const isP3 = flowState.startsWith("P3_");

  const activeSupplyId: MedicalSupplyId | null = useMemo(() => {
    if (flowState === "P1_TREATMENT") return P1_STEPS[p1Step]?.supplyId || null;
    if (flowState === "P2_TREATMENT") return P2_STEPS[p2Step]?.supplyId || null;
    if (flowState === "P3_TREATMENT") return P3_STEPS[p3Step]?.supplyId || null;
    return null;
  }, [flowState, p1Step, p2Step, p3Step]);

  const isAnimating =
    flowState === "P1_STEP_ANIMATING" ||
    flowState === "P2_STEP_ANIMATING" ||
    flowState === "P3_STEP_ANIMATING";

  return (
    <group>
      <CameraManager flowState={flowState} />
      <HospitalArchitecture />

      {/* Bed 1: Patient 0 Resting Stably */}
      <HospitalStretcher bedNumber="BED 01" position={[-3.6, 0, -2.2]} />
      <BedsideMonitor position={[-4.8, 0, -2.2]} heartRate={72} spo2={99} bp="118/76" isMonitorOn={true} />
      <PatientZeroAnatomical />

      {/* Bed 2: Patient 1 (Broken Leg) */}
      <HospitalStretcher bedNumber="BED 02" position={[-3.6, 0, 1.4]} />
      <BedsideMonitor position={[-4.8, 0, 1.4]} heartRate={84} spo2={98} bp="124/82" isMonitorOn={flowState !== "INTRO_IDLE" && flowState !== "P1_ARRIVING"} />
      <PatientOneAnatomical flowState={flowState} p1Step={p1Step} />

      {/* 3D Physical Medical Equipment Trolley at Bed 2 */}
      <MedicalEquipmentTrolley
        position={[-2.45, 0, 1.55]}
        rotationY={-Math.PI / 2}
        activeSupplyId={isP1 ? activeSupplyId : null}
        isAnimating={isAnimating}
        onSupplyClick={onSupplyClick}
      />

      {/* Bed 3: Patient 2 (Broken Hand) */}
      <HospitalStretcher bedNumber="BED 03" position={[3.6, 0, -2.2]} />
      <BedsideMonitor position={[4.8, 0, -2.2]} heartRate={80} spo2={99} bp="120/80" isMonitorOn={isP2 || isP3 || flowState === "WARD_STABILIZED"} />
      <PatientTwoAnatomical flowState={flowState} p2Step={p2Step} />

      {/* 3D Physical Medical Equipment Trolley at Bed 3 */}
      <MedicalEquipmentTrolley
        position={[2.45, 0, -2.05]}
        rotationY={Math.PI / 2}
        activeSupplyId={isP2 ? activeSupplyId : null}
        isAnimating={isAnimating}
        onSupplyClick={onSupplyClick}
      />

      {/* Bed 4: Patient 3 (Bike Accident) */}
      <HospitalStretcher bedNumber="BED 04" position={[3.6, 0, 1.4]} />
      <BedsideMonitor position={[4.8, 0, 1.4]} heartRate={88} spo2={97} bp="126/84" isMonitorOn={isP3 || flowState === "WARD_STABILIZED"} />
      <PatientThreeAnatomical flowState={flowState} p3Step={p3Step} />

      {/* 3D Physical Medical Equipment Trolley at Bed 4 */}
      <MedicalEquipmentTrolley
        position={[2.45, 0, 1.55]}
        rotationY={Math.PI / 2}
        activeSupplyId={isP3 ? activeSupplyId : null}
        isAnimating={isAnimating}
        onSupplyClick={onSupplyClick}
      />

      {/* Doctor's Workstation */}
      <DoctorWorkstation />

      {/* Nurse Character */}
      <NurseCharacterAnatomical
        flowState={flowState}
        p1Step={p1Step}
        p2Step={p2Step}
        p3Step={p3Step}
        onNurseClick={onNurseClick}
      />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export default function FirstAidSafetyLab() {
  const { width = 1200, height = 800 } = useWindowSize();
  const { playClick, playSuccess, playPop, playChime } = useLabAudio();

  const [currentScreen, setCurrentScreen] = useState<GameScreen>("WELCOME");
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const [flowState, setFlowState] = useState<FlowState>("INTRO_IDLE");

  const [p1Step, setP1Step] = useState<number>(0);
  const [p2Step, setP2Step] = useState<number>(0);
  const [p3Step, setP3Step] = useState<number>(0);

  const [clinicalFeedback, setClinicalFeedback] = useState<string | null>(null);

  const sfxClick = useCallback(() => {
    if (!isAudioMuted) playClick();
  }, [isAudioMuted, playClick]);

  const sfxSuccess = useCallback(() => {
    if (!isAudioMuted) playSuccess();
  }, [isAudioMuted, playSuccess]);

  const sfxPop = useCallback(() => {
    if (!isAudioMuted) playPop();
  }, [isAudioMuted, playPop]);

  const sfxChime = useCallback(() => {
    if (!isAudioMuted) playChime();
  }, [isAudioMuted, playChime]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    sfxPop();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleStartGame = () => {
    sfxClick();
    setScore(0);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setFlowState("INTRO_IDLE");
    setP1Step(0);
    setP2Step(0);
    setP3Step(0);
    setClinicalFeedback(null);
    setCurrentScreen("GAMEPLAY");
  };

  const handleResetGame = () => {
    sfxPop();
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setScore(0);
    setFlowState("INTRO_IDLE");
    setP1Step(0);
    setP2Step(0);
    setP3Step(0);
    setClinicalFeedback(null);
    setShowHelp(false);
    setCurrentScreen("WELCOME");
  };

  const handlePlayAgain = () => {
    sfxClick();
    handleResetGame();
  };

  const handleCompleteMission = () => {
    sfxSuccess();
    sfxChime();
    setScore(100);
    setIsTimerRunning(false);
    setCurrentScreen("RESULT");
  };

  useEffect(() => {
    if (currentScreen !== "GAMEPLAY" || flowState !== "INTRO_IDLE") return;
    const timer = setTimeout(() => {
      setFlowState("P1_ARRIVING");
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentScreen, flowState]);

  useEffect(() => {
    if (flowState !== "P1_ARRIVING") return;
    const timer = setTimeout(() => {
      setFlowState("P1_WAITING_NURSE");
      sfxPop();
    }, 2400);
    return () => clearTimeout(timer);
  }, [flowState, sfxPop]);

  useEffect(() => {
    if (flowState !== "P1_ZOOMING_IN") return;
    const timer = setTimeout(() => {
      setFlowState("P1_TREATMENT");
    }, 1200);
    return () => clearTimeout(timer);
  }, [flowState]);

  useEffect(() => {
    if (flowState !== "P1_ZOOMING_OUT") return;
    const timer = setTimeout(() => {
      setFlowState("INTER_PAUSE_1");
    }, 1400);
    return () => clearTimeout(timer);
  }, [flowState]);

  useEffect(() => {
    if (flowState !== "INTER_PAUSE_1") return;
    const timer = setTimeout(() => {
      setFlowState("P2_ARRIVING");
      sfxPop();
    }, 1000);
    return () => clearTimeout(timer);
  }, [flowState, sfxPop]);

  useEffect(() => {
    if (flowState !== "P2_ARRIVING") return;
    const timer = setTimeout(() => {
      setFlowState("P2_WAITING_NURSE");
      sfxPop();
    }, 2400);
    return () => clearTimeout(timer);
  }, [flowState, sfxPop]);

  useEffect(() => {
    if (flowState !== "P2_ZOOMING_IN") return;
    const timer = setTimeout(() => {
      setFlowState("P2_TREATMENT");
    }, 1200);
    return () => clearTimeout(timer);
  }, [flowState]);

  useEffect(() => {
    if (flowState !== "P2_ZOOMING_OUT") return;
    const timer = setTimeout(() => {
      setFlowState("INTER_PAUSE_2");
    }, 1400);
    return () => clearTimeout(timer);
  }, [flowState]);

  useEffect(() => {
    if (flowState !== "INTER_PAUSE_2") return;
    const timer = setTimeout(() => {
      setFlowState("P3_ARRIVING");
      sfxPop();
    }, 1000);
    return () => clearTimeout(timer);
  }, [flowState, sfxPop]);

  useEffect(() => {
    if (flowState !== "P3_ARRIVING") return;
    const timer = setTimeout(() => {
      setFlowState("P3_WAITING_NURSE");
      sfxPop();
    }, 2400);
    return () => clearTimeout(timer);
  }, [flowState, sfxPop]);

  useEffect(() => {
    if (flowState !== "P3_ZOOMING_IN") return;
    const timer = setTimeout(() => {
      setFlowState("P3_TREATMENT");
    }, 1200);
    return () => clearTimeout(timer);
  }, [flowState]);

  useEffect(() => {
    if (flowState !== "P3_ZOOMING_OUT") return;
    const timer = setTimeout(() => {
      setFlowState("WARD_STABILIZED");
      sfxSuccess();
      sfxChime();
    }, 1400);
    return () => clearTimeout(timer);
  }, [flowState, sfxSuccess, sfxChime]);

  const handleNurseClick = useCallback(() => {
    sfxPop();
    if (flowState === "P1_WAITING_NURSE") {
      setFlowState("P1_ZOOMING_IN");
    } else if (flowState === "P2_WAITING_NURSE") {
      setFlowState("P2_ZOOMING_IN");
    } else if (flowState === "P3_WAITING_NURSE") {
      setFlowState("P3_ZOOMING_IN");
    }
  }, [flowState, sfxPop]);

  const handleSupplySelect = useCallback(
    (supplyId: MedicalSupplyId) => {
      if (
        flowState !== "P1_TREATMENT" &&
        flowState !== "P2_TREATMENT" &&
        flowState !== "P3_TREATMENT"
      ) {
        return;
      }

      setClinicalFeedback(null);

      // Patient 1 (Broken Leg)
      if (flowState === "P1_TREATMENT") {
        const expectedSupply = P1_STEPS[p1Step].supplyId;
        if (supplyId !== expectedSupply) {
          sfxClick();
          setClinicalFeedback(`Protocol: Select the 3D "${MEDICAL_SUPPLIES.find((s) => s.id === expectedSupply)?.name}" on the trolley first.`);
          return;
        }

        sfxPop();
        setFlowState("P1_STEP_ANIMATING");
        setTimeout(() => {
          const next = p1Step + 1;
          setP1Step(next);
          if (next >= P1_STEPS.length) {
            setScore((s) => s + 30);
            sfxSuccess();
            setFlowState("P1_ZOOMING_OUT");
          } else {
            setFlowState("P1_TREATMENT");
          }
        }, 1800);
      }

      // Patient 2 (Broken Hand)
      else if (flowState === "P2_TREATMENT") {
        const expectedSupply = P2_STEPS[p2Step].supplyId;
        if (supplyId !== expectedSupply) {
          sfxClick();
          setClinicalFeedback(`Protocol: Select the 3D "${MEDICAL_SUPPLIES.find((s) => s.id === expectedSupply)?.name}" on the trolley first.`);
          return;
        }

        sfxPop();
        setFlowState("P2_STEP_ANIMATING");
        setTimeout(() => {
          const next = p2Step + 1;
          setP2Step(next);
          if (next >= P2_STEPS.length) {
            setScore((s) => s + 35);
            sfxSuccess();
            setFlowState("P2_ZOOMING_OUT");
          } else {
            setFlowState("P2_TREATMENT");
          }
        }, 1800);
      }

      // Patient 3 (Bike Accident)
      else if (flowState === "P3_TREATMENT") {
        const expectedSupply = P3_STEPS[p3Step].supplyId;
        if (supplyId !== expectedSupply) {
          sfxClick();
          setClinicalFeedback(`Protocol: Select the 3D "${MEDICAL_SUPPLIES.find((s) => s.id === expectedSupply)?.name}" on the trolley first.`);
          return;
        }

        sfxPop();
        setFlowState("P3_STEP_ANIMATING");
        setTimeout(() => {
          const next = p3Step + 1;
          setP3Step(next);
          if (next >= P3_STEPS.length) {
            setScore(100);
            sfxSuccess();
            setFlowState("P3_ZOOMING_OUT");
          } else {
            setFlowState("P3_TREATMENT");
          }
        }, 1800);
      }
    },
    [flowState, p1Step, p2Step, p3Step, sfxClick, sfxPop, sfxSuccess]
  );

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden select-none flex flex-col font-sans bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#FFF1F2] text-slate-800">
      
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. MAIN APPLICATION NAVBAR                                            */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <header className="relative z-40 w-full h-14 bg-white/95 backdrop-blur-md border-b border-rose-100/80 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
        
        {/* LEFT: Back, Icon, Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link href="/">
            <button
              onClick={sfxClick}
              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-colors border border-rose-200/70 cursor-pointer shrink-0 shadow-xs active:scale-95"
              title="Back to All Labs"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>
          </Link>

          <div
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 border border-rose-300 flex items-center justify-center text-white shrink-0 shadow-xs"
            title="First Aid Safety"
          >
            <HeartPulse size={17} strokeWidth={2.4} />
          </div>

          <div className="flex flex-col min-w-0">
            <h1 className="text-slate-900 font-extrabold text-xs sm:text-sm md:text-base leading-tight tracking-tight truncate">
              First Aid Safety
            </h1>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-600 leading-none hidden sm:inline">
              HOSPITAL EMERGENCY WARD &amp; FIRST AID
            </span>
          </div>
        </div>

        {/* CENTER: Timer & Score */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs shrink-0">
            <Clock size={15} className="text-rose-600" strokeWidth={2.4} />
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                TIME
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight font-mono leading-none">
                {formatTime(timerSeconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs shrink-0">
            <Star size={15} className="text-amber-500 fill-amber-500" strokeWidth={2} />
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                SCORE
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight font-mono leading-none">
                {score}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => {
              sfxPop();
              setIsAudioMuted((m) => !m);
            }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors border cursor-pointer active:scale-95 shadow-2xs ${
              isAudioMuted
                ? "bg-slate-100 text-slate-400 border-slate-200"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
            }`}
            title={isAudioMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isAudioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            onClick={handleResetGame}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors border border-slate-200 cursor-pointer active:scale-95 shadow-2xs"
            title="Reset to Welcome Screen"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hidden sm:flex items-center justify-center transition-colors border border-slate-200 cursor-pointer active:scale-95 shadow-2xs"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            onClick={() => {
              sfxPop();
              setShowHelp((prev) => !prev);
            }}
            className="w-8 h-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer active:scale-95"
            title="First Aid Guidance"
          >
            <HelpCircle size={16} strokeWidth={2.4} />
          </button>
        </div>
      </header>

      {/* Guidance Popup */}
      {showHelp && (
        <div className="absolute top-16 right-4 z-50 max-w-sm w-full bg-white/95 backdrop-blur-md border-2 border-rose-400 rounded-2xl p-4 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-rose-100 mb-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <ShieldAlert size={16} className="text-rose-600" />
              <span>3D Hospital First Aid Guide</span>
            </span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-xs font-medium text-slate-600 leading-relaxed mb-2.5">
            Click the nurse to focus on the patient, then click the actual 3D medical equipment on the bedside trolley in the correct sequence to guide the nurse through first-aid procedures!
          </p>
          <div className="space-y-1.5 text-[11px] font-semibold text-slate-700 bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
            <div>1. <strong>Sterile Cotton:</strong> Swab visible blood from injury.</div>
            <div>2. <strong>Antiseptic Bottle:</strong> Disinfect skin surface.</div>
            <div>3. <strong>Bandage Roll:</strong> Position splint &amp; wrap conforming gauze.</div>
            <div>4. <strong>Medical Scissors:</strong> Trim excess bandage.</div>
            <div>5. <strong>Medical Tape:</strong> Secure dressing with adhesive strips.</div>
            <div>6. <strong>Painkiller:</strong> Administer supervised oral pain relief.</div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. WELCOME SCREEN (PRESERVED)                                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {currentScreen === "WELCOME" && (
        <main className="relative flex-1 w-full min-h-0 overflow-hidden flex flex-col items-center justify-center p-3 sm:p-6">
          <div className="relative z-10 max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-xl border-2 border-rose-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 mb-3 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="88" stroke="#FFE4E6" strokeWidth="6" strokeDasharray="6 4" />
                <circle cx="100" cy="100" r="76" fill="#FFF1F2" stroke="#FDA4AF" strokeWidth="2.5" />
                <rect x="52" y="60" width="96" height="80" rx="16" fill="#FFFFFF" stroke="#F43F5E" strokeWidth="3" />
                <path d="M80 60 V50 C80 44 120 44 120 50 V60" stroke="#E11D48" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M92 78 H108 V92 H122 V108 H108 V122 H92 V108 H78 V92 H92 Z" fill="#E11D48" stroke="#BE123C" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M62 100 H72 L78 88 L84 112 L90 95 L96 100 H104" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
              </svg>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-wider mb-2">
              <HeartPulse size={12} className="text-rose-600" />
              <span>Realistic 3D First-Aid Simulation • Lab #30</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              First Aid Safety &amp; Emergency Ward
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-md mb-5">
              Experience realistic 3D medical triage. Interact with actual 3D equipment on the hospital trolley to guide the nurse through first-aid procedures for broken limbs and trauma.
            </p>

            <button
              type="button"
              onClick={handleStartGame}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white font-black text-sm sm:text-base shadow-lg hover:shadow-rose-500/25 cursor-pointer transition-all flex items-center justify-center gap-2.5 transform active:scale-98 animate-pulse hover:animate-none"
            >
              <span>START GAME</span>
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </main>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 3. 3D HOSPITAL EMERGENCY WARD GAMEPLAY VIEWPORT                        */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {currentScreen === "GAMEPLAY" && (
        <main className="relative flex-1 w-full min-h-0 overflow-hidden flex flex-col bg-slate-900 select-none">
          
          <Canvas
            shadows
            camera={{ position: [0, 5.0, 6.8], fov: 48 }}
            className="w-full h-full"
          >
            <color attach="background" args={["#e2e8f0"]} />
            <ambientLight intensity={1.15} />
            <directionalLight
              position={[5, 10, 5]}
              intensity={1.4}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-bias={-0.0001}
            />
            <pointLight position={[-3.6, 3.2, -1.0]} intensity={1.0} color="#e0f2fe" distance={7} />
            <pointLight position={[3.6, 3.2, -1.0]} intensity={1.0} color="#e0f2fe" distance={7} />
            <pointLight position={[0, 3.5, 2.5]} intensity={1.2} color="#ffffff" distance={8} />

            <HospitalWardScene
              flowState={flowState}
              p1Step={p1Step}
              p2Step={p2Step}
              p3Step={p3Step}
              onNurseClick={handleNurseClick}
              onSupplyClick={handleSupplySelect}
            />
          </Canvas>

          {/* ── Fixed UI Placement: Centered at top with guaranteed clearance from bedside monitors ── */}
          <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-40 max-w-[360px] sm:max-w-md w-auto pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-2 sm:px-5 sm:py-2.5 shadow-lg border border-slate-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                {flowState === "INTRO_IDLE" && <Activity size={16} className="animate-pulse" />}
                {flowState.startsWith("P1_") && <Bandage size={16} className="text-amber-600" />}
                {flowState.startsWith("P2_") && <HeartHandshake size={16} className="text-cyan-600" />}
                {flowState.startsWith("P3_") && <Cross size={16} className="text-red-600" />}
                {flowState === "WARD_STABILIZED" && <CheckCircle2 size={16} className="text-emerald-600" />}
              </div>

              <div className="flex flex-col min-w-0 text-left">
                {/* Patient Identification – Clean without step counter numbers */}
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                  {flowState === "INTRO_IDLE" && "EMERGENCY INTENSIVE WARD"}
                  {flowState.startsWith("P1_") && "PATIENT 1 • BROKEN LEG TRIAGE"}
                  {flowState.startsWith("P2_") && "PATIENT 2 • BROKEN HAND TRIAGE"}
                  {flowState.startsWith("P3_") && "PATIENT 3 • BIKE ACCIDENT MULTI-TRAUMA"}
                  {flowState === "WARD_STABILIZED" && "WARD FULLY STABILIZED"}
                </span>
                {/* Action Instruction – Clean, concise, no step numbers */}
                <p className="text-xs sm:text-sm font-extrabold text-slate-800 leading-snug">
                  {flowState === "INTRO_IDLE" && "Emergency Ward ready. Incoming patient arriving..."}
                  {flowState === "P1_ARRIVING" && "Patient 1 arriving with broken leg. Resting in Bed 02..."}
                  {flowState === "P1_WAITING_NURSE" && "Patient in Bed 02. Click the nurse to initiate treatment!"}
                  {flowState === "P1_ZOOMING_IN" && "Focusing camera on injured leg and bedside trolley..."}
                  {flowState === "P1_TREATMENT" && P1_STEPS[p1Step].prompt}
                  {flowState === "P1_STEP_ANIMATING" && P1_STEPS[p1Step].actionDesc}
                  {flowState === "P1_ZOOMING_OUT" && "Patient 1 leg stabilized! Resting in Bed 02."}
                  {flowState === "INTER_PAUSE_1" && "Preparing for next patient intake..."}
                  {flowState === "P2_ARRIVING" && "Patient 2 arriving with broken hand. Resting in Bed 03..."}
                  {flowState === "P2_WAITING_NURSE" && "Patient in Bed 03. Click the nurse to initiate treatment!"}
                  {flowState === "P2_ZOOMING_IN" && "Focusing camera on injured wrist and bedside trolley..."}
                  {flowState === "P2_TREATMENT" && P2_STEPS[p2Step].prompt}
                  {flowState === "P2_STEP_ANIMATING" && P2_STEPS[p2Step].actionDesc}
                  {flowState === "P2_ZOOMING_OUT" && "Patient 2 wrist immobilized in sling! Resting in Bed 03."}
                  {flowState === "INTER_PAUSE_2" && "Preparing for next patient intake..."}
                  {flowState === "P3_ARRIVING" && "Patient 3 arriving from bike accident. Resting in Bed 04..."}
                  {flowState === "P3_WAITING_NURSE" && "Patient in Bed 04. Click the nurse to initiate treatment!"}
                  {flowState === "P3_ZOOMING_IN" && "Focusing camera on multiple accident wounds and trolley..."}
                  {flowState === "P3_TREATMENT" && P3_STEPS[p3Step].prompt}
                  {flowState === "P3_STEP_ANIMATING" && P3_STEPS[p3Step].actionDesc}
                  {flowState === "P3_ZOOMING_OUT" && "All wound sites sterilized and dressed! Resting in Bed 04."}
                  {flowState === "WARD_STABILIZED" && "All 4 patients stabilized and resting comfortably!"}
                </p>
              </div>
            </div>
          </div>

          {/* Feedback Warning banner if user clicks wrong physical item */}
          {clinicalFeedback && (
            <div className="absolute top-18 left-1/2 -translate-x-1/2 z-40 max-w-sm w-auto animate-bounce pointer-events-none">
              <div className="bg-amber-500/95 backdrop-blur-md rounded-xl px-4 py-1.5 shadow-lg border border-amber-300 text-white text-xs font-black text-center whitespace-nowrap">
                ⚠️ {clinicalFeedback}
              </div>
            </div>
          )}

          {/* ── Mission Complete Banner (When all 4 stretchers active & stable) ── */}
          {flowState === "WARD_STABILIZED" && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] sm:w-auto animate-in zoom-in-95 duration-300">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 border-emerald-400 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-2">
                  <Sparkles size={13} className="text-emerald-600" />
                  <span>All Patients Stabilized</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1">
                  Emergency Triage &amp; First Aid Complete!
                </h3>
                <p className="text-xs text-slate-600 font-medium mb-3">
                  All 4 patient stretchers are active and stabilized under proper first aid protocol.
                </p>
                <button
                  type="button"
                  onClick={handleCompleteMission}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition"
                >
                  <Award size={16} />
                  <span>VIEW CLINICAL REPORT &amp; SCORE</span>
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 4. RESULT SCREEN (PRESERVED)                                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {currentScreen === "RESULT" && (
        <main className="relative flex-1 w-full min-h-0 overflow-hidden flex flex-col items-center justify-center p-3 sm:p-6">
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={300}
            gravity={0.22}
          />

          <div className="relative z-10 max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-xl border-2 border-rose-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-3 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="80" cy="80" r="72" stroke="#FFE4E6" strokeWidth="5" strokeDasharray="5 3" />
                <circle cx="80" cy="80" r="62" fill="#F0FDF4" stroke="#86EFAC" strokeWidth="2.5" />
                <path d="M80 34 L108 46 V80 C108 98 96 114 80 122 C64 114 52 98 52 80 V46 L80 34 Z" fill="#10B981" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M75 58 H85 V68 H95 V78 H85 V88 H75 V78 H65 V68 H75 Z" fill="#FFFFFF" />
                <circle cx="112" cy="48" r="14" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
              </svg>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles size={12} className="text-emerald-600" />
              <span>Mission Accomplished • First Aid Certified</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-1 leading-tight tracking-tight">
              Hospital Ward Fully Stabilized!
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-md mb-4">
              Outstanding emergency response! You guided the clinical team through accurate first aid procedures using physical medical equipment for all trauma cases.
            </p>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-md mb-4">
              <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">SCORE</span>
                <span className="text-base sm:text-xl font-black text-slate-900 font-mono">100</span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">TIME</span>
                <span className="text-base sm:text-xl font-black text-slate-900 font-mono">{formatTime(timerSeconds)}</span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">PATIENTS</span>
                <span className="text-base sm:text-xl font-black text-emerald-600 font-mono">3 / 3</span>
              </div>
            </div>

            <div className="w-full max-w-md bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 mb-5 text-left text-xs font-semibold text-emerald-900 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Bed 02: Rigid anatomical splint &amp; conforming wrap for broken leg</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Bed 03: Wrist immobilization &amp; triangular elevated arm sling</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Bed 04: Antiseptic disinfection &amp; sterile pressure dressings for multi-trauma</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full max-w-md">
              <button
                type="button"
                onClick={handlePlayAgain}
                className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <RefreshCw size={15} strokeWidth={2.4} />
                <span>PLAY AGAIN</span>
              </button>

              <Link href="/" className="w-full sm:flex-1">
                <button
                  type="button"
                  onClick={sfxClick}
                  className="w-full py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-200 cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <ArrowLeft size={15} strokeWidth={2.4} />
                  <span>BACK TO LABS</span>
                </button>
              </Link>
            </div>
          </div>
        </main>
      )}

    </div>
  );
}
