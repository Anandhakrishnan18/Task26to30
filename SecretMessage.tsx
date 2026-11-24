"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  KeyRound,
  Lock,
  Unlock,
  ShieldCheck,
  Shield,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Award,
  Terminal,
  FileCode2,
  RefreshCw,
  Send,
  Check,
  AlertCircle,
  Eye,
  UserCheck,
  MessageSquare,
  BookOpen,
  ChevronRight,
  Play,
  Bike,
  Siren,
  MapPin,
  Search,
  CheckCheck,
  FileText,
  Home,
  ChevronLeft,
} from "lucide-react";
import { useLabAudio } from "@/hooks/useLabAudio";

// ═════════════════════════════════════════════════════════════════════════════
// MATHEMATICAL ENGINE & CONSTANTS (Requirement 8)
// Formula: E(x) = (5x + 9) mod 26
// Decryption: D(y) = 21(y - 9) mod 26 (since 5 * 21 mod 26 = 105 mod 26 = 1)
// ═════════════════════════════════════════════════════════════════════════════

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const PLAINTEXT = "RAJU SELLING DRUGS ON NEHRU STREET";
export const AFFINE_A = 5;
export const AFFINE_B = 9;
export const AFFINE_A_INV = 21; // 5 * 21 = 105 === 1 mod 26

// Modular helper ensuring non-negative modulo
export function mod(n: number, m: number = 26): number {
  return ((n % m) + m) % m;
}

export function letterToNum(char: string): number {
  const code = char.toUpperCase().charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 65;
  return -1;
}

export function numToLetter(num: number): string {
  return ALPHABET[mod(num, 26)];
}

// Encryption: E(x) = (5x + 9) mod 26
export function encryptValue(x: number): number {
  return mod(AFFINE_A * x + AFFINE_B, 26);
}

export function encryptChar(char: string): string {
  if (char === " ") return " ";
  const x = letterToNum(char);
  if (x === -1) return char;
  return numToLetter(encryptValue(x));
}

// Decryption: D(y) = 21(y - 9) mod 26
export function decryptValue(y: number): number {
  return mod(AFFINE_A_INV * (y - AFFINE_B), 26);
}

export function decryptChar(char: string): string {
  if (char === " ") return " ";
  const y = letterToNum(char);
  if (y === -1) return char;
  return numToLetter(decryptValue(y));
}

// Full calculated ciphertext without hardcoding: "QJCF VDMMXWN YQFNV BW WDSQF VAQDDA"
export const FULL_CIPHERTEXT = PLAINTEXT.split("").map(encryptChar).join("");

// ═════════════════════════════════════════════════════════════════════════════
// TYPES & SCREEN STATES
// ═════════════════════════════════════════════════════════════════════════════

export type GameScreen = "WELCOME" | "GAMEPLAY" | "RESULT";

export type GameplayScene =
  | "SCENE_1_MARKET"   // Friends of Police Introduction in 3D Marketplace
  | "SCENE_2_STREET"   // Identifying Suspect Raju on Nehru Street
  | "SCENE_3_ENCRYPT"  // Manual Affine Encryption at Home Desk
  | "SCENE_4_DELIVERY" // Courier Delivery of Sealed Cipher Envelope
  | "SCENE_4_DECRYPT"  // Police Officer Affine Decryption
  | "SCENE_4_ACTION";  // Police Investigation & Appreciation

// ═════════════════════════════════════════════════════════════════════════════
// 3D MODELS & SCENIC ASSETS (Requirement 11 - Bright Daylight Colors Only)
// ═════════════════════════════════════════════════════════════════════════════

// ── Low-Poly Stylized Humanoid Character Component ──
interface CharacterProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  shirtColor?: string;
  pantsColor?: string;
  skinColor?: string;
  hairColor?: string;
  role?: "OFFICER" | "FRIEND_OF_POLICE" | "SUSPECT" | "COURIER" | "CONSTABLE";
  isTalking?: boolean;
  isWriting?: boolean;
  isObserving?: boolean;
}

function StylizedCharacter({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  shirtColor = "#38bdf8",
  pantsColor = "#334155",
  skinColor = "#fcd34d",
  hairColor = "#1e293b",
  role = "OFFICER",
  isTalking = false,
  isWriting = false,
  isObserving = false,
}: CharacterProps) {
  const headRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (headRef.current && isTalking) {
      headRef.current.position.y = 1.35 + Math.sin(t * 8) * 0.02;
      headRef.current.rotation.y = Math.sin(t * 3) * 0.1;
    }
    if (rightArmRef.current && isWriting) {
      rightArmRef.current.rotation.x = -1.1 + Math.sin(t * 12) * 0.08;
      rightArmRef.current.rotation.z = -0.3 + Math.cos(t * 10) * 0.06;
    }
    if (headRef.current && isObserving) {
      headRef.current.rotation.y = Math.sin(t * 1.5) * 0.25;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* ── Head & Hair ── */}
      <group ref={headRef} position={[0, 1.35, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 0.08, -0.02]}>
          <sphereGeometry args={[0.19, 14, 14]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.06, 0.02, 0.16]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.06, 0.02, 0.16]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Friendly smile or expression */}
        <mesh position={[0, -0.06, 0.165]}>
          <boxGeometry args={[0.06, 0.015, 0.01]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>
      </group>

      {/* ── Torso (Shirt / Jacket) ── */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.38, 0.52, 0.22]} />
        <meshStandardMaterial color={shirtColor} roughness={0.6} />
      </mesh>
      {/* Collar / Tie detail if Officer */}
      {role === "OFFICER" && (
        <mesh position={[0, 1.12, 0.115]}>
          <boxGeometry args={[0.12, 0.1, 0.02]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
      )}

      {/* ── Left Arm ── */}
      <mesh position={[-0.25, 0.88, 0]} rotation={[0, 0, 0.15]} castShadow>
        <cylinderGeometry args={[0.06, 0.055, 0.44, 12]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      {/* Left Hand */}
      <mesh position={[-0.29, 0.63, 0]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* ── Right Arm ── */}
      <group ref={rightArmRef} position={[0.25, 1.05, 0]}>
        <mesh position={[0.03, -0.2, isWriting ? 0.18 : 0]} rotation={[isWriting ? -0.8 : 0, 0, -0.15]} castShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.44, 12]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
        {/* Right Hand / Pen */}
        <mesh position={[0.03, isWriting ? -0.32 : -0.42, isWriting ? 0.32 : 0]}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        {isWriting && (
          <mesh position={[0.03, -0.34, 0.38]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        )}
      </group>

      {/* ── Hips & Belt ── */}
      <mesh position={[0, 0.64, 0]}>
        <boxGeometry args={[0.36, 0.1, 0.21]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* ── Legs (Trousers) ── */}
      <mesh position={[-0.1, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.065, 0.58, 12]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.1, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.065, 0.58, 12]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>

      {/* ── Shoes ── */}
      <mesh position={[-0.1, 0.03, 0.04]} castShadow>
        <boxGeometry args={[0.11, 0.06, 0.18]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.1, 0.03, 0.04]} castShadow>
        <boxGeometry args={[0.11, 0.06, 0.18]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}

// ── Scene 1: 3D Vegetable Marketplace (Stalls, Vendors, Bright Sunlight) ──
// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1 REDESIGN: REALISTIC 3D SUPERMARKET INTERIOR & AUDIO COMIC SYSTEM
// ═════════════════════════════════════════════════════════════════════════════

// ── Realistic Supermarket Product Models ──

function CerealBox({ position = [0, 0, 0], color = "#f59e0b" }: { position?: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.32, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0.042]}>
        <planeGeometry args={[0.18, 0.22]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0.043]}>
        <planeGeometry args={[0.15, 0.08]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function OilBottle({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.28, 12]} />
        <meshPhysicalMaterial color="#fef08a" transmission={0.65} opacity={1} roughness={0.15} ior={1.4} thickness={0.08} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.22, 12]} />
        <meshStandardMaterial color="#eab308" roughness={0.2} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <coneGeometry args={[0.06, 0.06, 12]} />
        <meshPhysicalMaterial color="#fef08a" transmission={0.65} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.035, 12]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} />
      </mesh>
    </group>
  );
}

function WaterBottle({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.26, 12]} />
        <meshPhysicalMaterial color="#bae6fd" transmission={0.75} roughness={0.1} ior={1.33} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.046, 0.046, 0.09, 12]} />
        <meshStandardMaterial color="#0284c7" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.03, 10]} />
        <meshStandardMaterial color="#0369a1" />
      </mesh>
    </group>
  );
}

function MilkCarton({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.13, 0.26, 0.13]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <coneGeometry args={[0.095, 0.07, 4]} />
        <meshStandardMaterial color="#2563eb" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.09, 0.066]}>
        <planeGeometry args={[0.11, 0.1]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
    </group>
  );
}

function GrainBag({ position = [0, 0, 0], color = "#fef3c7" }: { position?: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <boxGeometry args={[0.26, 0.28, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <boxGeometry args={[0.24, 0.035, 0.05]} />
        <meshStandardMaterial color="#d97706" />
      </mesh>
      <mesh position={[0, 0.14, 0.092]}>
        <planeGeometry args={[0.18, 0.14]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
    </group>
  );
}

function SnackPouch({ position = [0, 0, 0], color = "#f97316" }: { position?: [number, number, number]; color?: string }) {
  return (
    <group position={position} rotation={[0, 0, 0.05]}>
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.24, 0.07]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.125, 0]}>
        <boxGeometry args={[0.17, 0.018, 0.015]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.6} />
      </mesh>
      <mesh position={[0, -0.125, 0]}>
        <boxGeometry args={[0.17, 0.018, 0.015]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.6} />
      </mesh>
    </group>
  );
}

// ── Realistic Tomato Display Tray at Shopping Height (Requirement 5) ──
function TomatoTray({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  // 18 naturally varied tomatoes with size, tone, and green calyx stem
  const tomatoes = [
    { x: -0.32, z: -0.18, r: 0.072, c: "#dc2626" },
    { x: -0.19, z: -0.18, r: 0.078, c: "#ef4444" },
    { x: -0.06, z: -0.18, r: 0.070, c: "#b91c1c" },
    { x: 0.07, z: -0.18, r: 0.076, c: "#dc2626" },
    { x: 0.20, z: -0.18, r: 0.074, c: "#ef4444" },
    { x: 0.33, z: -0.18, r: 0.069, c: "#dc2626" },

    { x: -0.31, z: 0.0, r: 0.076, c: "#ef4444" },
    { x: -0.18, z: 0.0, r: 0.073, c: "#dc2626" },
    { x: -0.05, z: 0.0, r: 0.081, c: "#b91c1c" },
    { x: 0.08, z: 0.0, r: 0.071, c: "#ef4444" },
    { x: 0.21, z: 0.0, r: 0.077, c: "#dc2626" },
    { x: 0.33, z: 0.0, r: 0.073, c: "#ef4444" },

    { x: -0.30, z: 0.18, r: 0.071, c: "#dc2626" },
    { x: -0.17, z: 0.18, r: 0.078, c: "#b91c1c" },
    { x: -0.04, z: 0.18, r: 0.074, c: "#ef4444" },
    { x: 0.09, z: 0.18, r: 0.079, c: "#dc2626" },
    { x: 0.22, z: 0.18, r: 0.072, c: "#ef4444" },
    { x: 0.34, z: 0.18, r: 0.075, c: "#b91c1c" },
  ];

  return (
    <group position={position}>
      {/* Wooden Produce Crate Tray */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 0.16, 0.58]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
      {/* Tray Inner Bed */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.78, 0.1, 0.52]} />
        <meshStandardMaterial color="#451a03" />
      </mesh>

      {/* Realistic Fresh Tomatoes */}
      {tomatoes.map((t, idx) => (
        <group key={`tom-${idx}`} position={[t.x, 0.18, t.z]}>
          {/* Slightly flattened sphere for realistic organic tomato shape */}
          <mesh castShadow scale={[1.04, 0.92, 1.04]}>
            <sphereGeometry args={[t.r, 14, 14]} />
            <meshStandardMaterial color={t.c} roughness={0.25} metalness={0.05} />
          </mesh>
          {/* Star-shaped Green Stem Calyx on top */}
          <mesh position={[0, t.r * 0.9, 0]} rotation={[0, (idx * 0.7), 0]}>
            <coneGeometry args={[0.028, 0.015, 5]} />
            <meshStandardMaterial color="#15803d" roughness={0.5} />
          </mesh>
          {/* Small stem stalk */}
          <mesh position={[0, t.r * 0.98, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.02, 6]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
        </group>
      ))}

      {/* Small Price / Variety Label on Crate */}
      <mesh position={[0, 0.08, 0.292]}>
        <planeGeometry args={[0.22, 0.08]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// ── Realistic Onion Display Tray at Shopping Height (Requirement 5) ──
function OnionTray({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  // 18 onions with bulbous tear-drop shapes and golden/red papery skin tones
  const onions = [
    { x: -0.31, z: -0.17, r: 0.071, c: "#b45309" },
    { x: -0.18, z: -0.17, r: 0.076, c: "#d97706" },
    { x: -0.05, z: -0.17, r: 0.068, c: "#831843" }, // Red onion
    { x: 0.08, z: -0.17, r: 0.074, c: "#b45309" },
    { x: 0.21, z: -0.17, r: 0.072, c: "#f59e0b" },
    { x: 0.33, z: -0.17, r: 0.077, c: "#d97706" },

    { x: -0.32, z: 0.0, r: 0.075, c: "#d97706" },
    { x: -0.19, z: 0.0, r: 0.070, c: "#9d174d" }, // Red onion
    { x: -0.06, z: 0.0, r: 0.079, c: "#b45309" },
    { x: 0.07, z: 0.0, r: 0.073, c: "#f59e0b" },
    { x: 0.20, z: 0.0, r: 0.076, c: "#d97706" },
    { x: 0.32, z: 0.0, r: 0.071, c: "#831843" }, // Red onion

    { x: -0.30, z: 0.17, r: 0.073, c: "#b45309" },
    { x: -0.17, z: 0.17, r: 0.078, c: "#f59e0b" },
    { x: -0.04, z: 0.17, r: 0.071, c: "#d97706" },
    { x: 0.09, z: 0.17, r: 0.076, c: "#b45309" },
    { x: 0.22, z: 0.17, r: 0.074, c: "#9d174d" }, // Red onion
    { x: 0.34, z: 0.17, r: 0.077, c: "#d97706" },
  ];

  return (
    <group position={position}>
      {/* Wooden Produce Crate Tray */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 0.16, 0.58]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.78, 0.1, 0.52]} />
        <meshStandardMaterial color="#451a03" />
      </mesh>

      {/* Realistic Bulbed Onions */}
      {onions.map((o, idx) => (
        <group key={`on-${idx}`} position={[o.x, 0.18, o.z]}>
          {/* Bulbous Main Body */}
          <mesh castShadow scale={[1.05, 0.95, 1.05]}>
            <sphereGeometry args={[o.r, 12, 12]} />
            <meshStandardMaterial color={o.c} roughness={0.7} />
          </mesh>
          {/* Pointed Papery Top Stem Tip */}
          <mesh position={[0, o.r * 0.92, 0]}>
            <coneGeometry args={[0.022, 0.045, 8]} />
            <meshStandardMaterial color={o.c} roughness={0.85} />
          </mesh>
          {/* Dry root tuft at bottom */}
          <mesh position={[0, -o.r * 0.9, 0]}>
            <cylinderGeometry args={[0.015, 0.018, 0.02, 6]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Small Price / Variety Label */}
      <mesh position={[0, 0.08, 0.292]}>
        <planeGeometry args={[0.22, 0.08]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// ── Supermarket Produce Island Table (Shopping Height ~0.78m) ──
function ProduceIslandTable({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Heavy-Duty Produce Table Stand */}
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.72, 0.82]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      {/* Table Top Surface in Dark Slate Trim */}
      <mesh position={[0, 0.73, 0]} receiveShadow>
        <boxGeometry args={[1.98, 0.04, 0.9]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Left Tray: Fresh Tomatoes */}
      <TomatoTray position={[-0.48, 0.75, 0]} />

      {/* Right Tray: Fresh Onions */}
      <OnionTray position={[0.48, 0.75, 0]} />
    </group>
  );
}

// ── Multi-Tier Supermarket Gondola Shelving Unit ──
function SupermarketGondolaShelf({ position = [0, 0, 0], length = 3.6 }: { position?: [number, number, number]; length?: number }) {
  const shelfYPositions = [0.4, 0.9, 1.4, 1.9];

  return (
    <group position={position}>
      {/* Upright Metal Posts */}
      <mesh position={[-length / 2, 1.1, 0]} castShadow>
        <boxGeometry args={[0.08, 2.3, 0.65]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} />
      </mesh>
      <mesh position={[length / 2, 1.1, 0]} castShadow>
        <boxGeometry args={[0.08, 2.3, 0.65]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} />
      </mesh>
      {/* Central Divider Backing Board */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[length, 2.2, 0.04]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
      </mesh>

      {/* 4 Shelves with Colored Price Strips */}
      {shelfYPositions.map((sy, idx) => (
        <group key={`shelf-${idx}`} position={[0, sy, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[length - 0.04, 0.04, 0.62]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.315]}>
            <boxGeometry args={[length - 0.05, 0.035, 0.015]} />
            <meshStandardMaterial color={idx % 2 === 0 ? "#16a34a" : "#eab308"} />
          </mesh>
        </group>
      ))}

      {/* Shelf 1 Products: Rice & Grain Bags */}
      {[-1.3, -0.8, -0.3, 0.2, 0.7, 1.2].map((px, i) => (
        <GrainBag key={`grain-${i}`} position={[px, 0.42, 0.12]} color={i % 2 === 0 ? "#fef3c7" : "#e0e7ff"} />
      ))}

      {/* Shelf 2 Products: Cooking Oil & Juices */}
      {[-1.4, -1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05, 1.4].map((px, i) => (
        <OilBottle key={`oil-${i}`} position={[px, 0.92, 0.12]} />
      ))}

      {/* Shelf 3 Products: Breakfast Cereal Boxes */}
      {[-1.35, -0.9, -0.45, 0, 0.45, 0.9, 1.35].map((px, i) => (
        <CerealBox
          key={`cereal-${i}`}
          position={[px, 1.42, 0.12]}
          color={["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6"][i % 5]}
        />
      ))}

      {/* Shelf 4 Products: Snack & Chip Packs */}
      {[-1.4, -1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05, 1.4].map((px, i) => (
        <SnackPouch key={`snack-${i}`} position={[px, 2.05, 0.12]} color={["#f97316", "#ef4444", "#06b6d4", "#a855f7"][i % 4]} />
      ))}
    </group>
  );
}

// ── Multi-Door Reach-in Glass Refrigerator Unit ──
function ReachInCooler({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 2.8, 0.8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.65, 0.41]}>
        <boxGeometry args={[4.2, 0.22, 0.02]} />
        <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.4} />
      </mesh>

      {/* 4 Glass Doors */}
      {[-1.55, -0.52, 0.52, 1.55].map((dx, i) => (
        <group key={`door-${i}`} position={[dx, 1.35, 0.41]}>
          <mesh>
            <planeGeometry args={[0.96, 2.2]} />
            <meshPhysicalMaterial color="#e0f2fe" transmission={0.7} roughness={0.1} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.98, 2.22, 0.02]} />
            <meshStandardMaterial color="#64748b" wireframe />
          </mesh>
          <mesh position={[0.42, 0, 0.03]}>
            <cylinderGeometry args={[0.012, 0.012, 0.45, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
          </mesh>
        </group>
      ))}

      <pointLight position={[0, 1.8, 0.2]} intensity={2.2} color="#bae6fd" distance={4} />

      {[-1.6, -1.3, -0.6, -0.3, 0.4, 0.7, 1.4, 1.7].map((mx, idx) => (
        <group key={`cool-stock-${idx}`}>
          <MilkCarton position={[mx, 0.4, 0.05]} />
          <WaterBottle position={[mx, 1.0, 0.05]} />
          <WaterBottle position={[mx, 1.6, 0.05]} />
        </group>
      ))}
    </group>
  );
}

// ── Leftmost Checkout Counter & Cashier Workstation (Requirement 2: Clearly Visible) ──
function CheckoutCounter({ position = [-2.6, 0, 0.3] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 1. Main Conveyor Counter Body */}
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.96, 2.2]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>

      {/* Conveyor Belt Surface (Black Matte Rubber Strip) */}
      <mesh position={[-0.1, 0.97, 0]} receiveShadow>
        <boxGeometry args={[0.85, 0.02, 2.0]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* Chrome Lane Divider Bar */}
      <mesh position={[0.38, 1.02, 0]}>
        <boxGeometry args={[0.04, 0.08, 2.1]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>

      {/* Acrylic Sneeze Guard */}
      <mesh position={[0.4, 1.42, -0.2]}>
        <boxGeometry args={[0.02, 0.68, 1.5]} />
        <meshPhysicalMaterial color="#e0f2fe" transmission={0.75} roughness={0.05} />
      </mesh>

      {/* 2. Elevated, Tilted POS Billing Computer (Prominently Visible) */}
      <group position={[-0.05, 0.98, -0.35]} rotation={[0, 0.35, 0]}>
        {/* Metal Monitor Stand */}
        <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.1, 0.1, 0.02, 12]} /><meshStandardMaterial color="#0f172a" /></mesh>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.025, 0.025, 0.34, 8]} /><meshStandardMaterial color="#64748b" metalness={0.6} /></mesh>

        {/* Monitor Screen Bezel (Tilted Back slightly) */}
        <mesh position={[0, 0.38, 0]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[0.62, 0.42, 0.04]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        {/* Glowing Blue POS Billing Screen */}
        <mesh position={[0, 0.38, 0.022]} rotation={[-0.2, 0, 0]}>
          <planeGeometry args={[0.56, 0.36]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>

        {/* Full Keyboard on Counter */}
        <mesh position={[0, 0.02, 0.24]}>
          <boxGeometry args={[0.42, 0.025, 0.16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Optical Mouse */}
        <mesh position={[0.26, 0.02, 0.24]}>
          <boxGeometry args={[0.06, 0.02, 0.09]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Handheld Barcode Scanner in Cradle with Red Laser Tip */}
        <group position={[0.34, 0.06, 0.05]} rotation={[0.4, -0.4, 0]}>
          <mesh><cylinderGeometry args={[0.025, 0.035, 0.18, 8]} /><meshStandardMaterial color="#0f172a" /></mesh>
          <mesh position={[0, 0.09, 0.03]}><boxGeometry args={[0.06, 0.05, 0.08]} /><meshStandardMaterial color="#dc2626" /></mesh>
        </group>

        {/* Receipt Printer with Paper Roll Slot */}
        <mesh position={[-0.32, 0.07, 0.08]}>
          <boxGeometry args={[0.16, 0.14, 0.18]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[-0.32, 0.15, 0.1]} rotation={[0.25, 0, 0]}>
          <planeGeometry args={[0.08, 0.1]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* 3. Impulse Candy & Gum Rack on Front of Desk */}
      <group position={[0.66, 0.48, 0]}>
        <mesh><boxGeometry args={[0.06, 0.8, 1.8]} /><meshStandardMaterial color="#475569" /></mesh>
        {[-0.2, 0.06, 0.32].map((ry, idx) => (
          <mesh key={`impulse-${idx}`} position={[0.04, ry, 0]}>
            <boxGeometry args={[0.08, 0.04, 1.7]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        ))}
      </group>

      {/* 4. Red Plastic Shopping Baskets Beside Register */}
      <group position={[0.15, 0, 1.35]}>
        {[0, 0.06, 0.12, 0.18, 0.24].map((by, i) => (
          <group key={`basket-${i}`} position={[0, by, 0]}>
            <mesh position={[0, 0.14, 0]} castShadow>
              <boxGeometry args={[0.38, 0.22, 0.28]} />
              <meshStandardMaterial color="#dc2626" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.26, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.34, 6]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 5. Cashier Character Behind Counter (Clearly Visible Upper Body & Apron) */}
      <group position={[-0.45, 0, -0.45]} rotation={[0, 0.35, 0]}>
        <StylizedCharacter
          shirtColor="#059669"
          pantsColor="#0f172a"
          skinColor="#fde047"
          hairColor="#0f172a"
          role="CONSTABLE"
          isObserving={true}
        />
      </group>

      {/* ── Cashier Compartment SUPERMARKET Physical 3D Signboard (Priority 4) ── */}
      <group position={[-0.05, 2.15, -0.2]} rotation={[0, 0.35, 0]}>
        {/* Support Steel Suspension Rods connecting overhead */}
        <mesh position={[-0.6, 0.3, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.6, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.6, 0.3, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.6, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Outer Frame */}
        <mesh>
          <boxGeometry args={[1.56, 0.44, 0.04]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Inner Signboard Panel (Sapphire Supermarket Blue) */}
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[1.48, 0.36, 0.04]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Soft Front Illumination Light */}
        <pointLight position={[0, 0, 0.25]} intensity={1.8} color="#e0f2fe" distance={3.0} />

        {/* Physical 3D Signboard Text: SUPERMARKET */}
        <Html position={[0, 0, 0.035]} center pointerEvents="none" transform scale={0.22}>
          <div className="select-none text-center font-black tracking-widest text-white text-base drop-shadow-md whitespace-nowrap px-3 py-0.5">
            SUPERMARKET
          </div>
        </Html>
      </group>
    </group>
  );
}

// ── Realistic Physical SUPERMARKET Signboard (Requirement 3) ──
function SupermarketIdentificationBanner({ position = [0, 3.25, -4.68] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Background Signboard Panel */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.65, 0.06]} />
        <meshStandardMaterial color="#0369a1" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Metallic Silver Border Rim */}
      <mesh>
        <boxGeometry args={[3.26, 0.71, 0.04]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Backlight / Soft Overhead Sign Spotlight */}
      <pointLight position={[0, -0.1, 0.4]} intensity={2.2} color="#bae6fd" distance={4} />

      {/* Sign Text: ONLY the word SUPERMARKET */}
      <Html position={[0, 0, 0.035]} center pointerEvents="none" transform scale={0.32}>
        <div className="select-none text-center font-black tracking-widest text-white text-2xl drop-shadow-lg whitespace-nowrap px-6 py-1">
          SUPERMARKET
        </div>
      </Html>
    </group>
  );
}

// ── Supermarket Environment Main Component (Automatic Audio & Scene Transition) ──
interface SupermarketEnvironmentProps {
  onCompleteDialogue: () => void;
  isAudioMuted: boolean;
  onDialogueUpdate?: (data: {
    speaker: "OFFICER" | "FRIEND_OF_POLICE" | null;
    text: string;
    step: number;
  } | null) => void;
}

function SupermarketEnvironment({
  onCompleteDialogue,
  isAudioMuted,
  onDialogueUpdate,
}: SupermarketEnvironmentProps) {
  // Walking sequence: Officer walks from checkout (x = -1.6) to meeting spot (x = 0.8)
  const [officerX, setOfficerX] = useState<number>(-1.6);
  const [hasArrived, setHasArrived] = useState<boolean>(false);

  // Dialogue steps: 0 (Officer), 1 (Friend of Police), 2 (Officer final), 3 (Completed)
  const [dialogueStep, setDialogueStep] = useState<number>(-1);
  const [activeSpeaker, setActiveSpeaker] = useState<"OFFICER" | "FRIEND_OF_POLICE" | null>(null);
  const [spokenSubtitle, setSpokenSubtitle] = useState<string>("");

  const hasTransitionedRef = useRef<boolean>(false);
  const onCompleteDialogueRef = useRef(onCompleteDialogue);
  onCompleteDialogueRef.current = onCompleteDialogue;

  const onDialogueUpdateRef = useRef(onDialogueUpdate);
  onDialogueUpdateRef.current = onDialogueUpdate;

  const dialogues = useMemo(
    () => [
      {
        speaker: "OFFICER" as const,
        name: "POLICE OFFICER (CIVILIAN)",
        text: "Hello! Welcome to the Friends of Police initiative. As a responsible citizen, you can help us maintain safety in our city.",
      },
      {
        speaker: "FRIEND_OF_POLICE" as const,
        name: "FRIEND OF POLICE",
        text: "Absolutely. I understand my responsibility. If I notice any suspicious activities, I will report them to you immediately.",
      },
      {
        speaker: "OFFICER" as const,
        name: "POLICE OFFICER (CIVILIAN)",
        text: "Thank you. Remember, responsible citizens play an important role in maintaining public safety.",
      },
    ],
    []
  );

  // ── Walking Animation Loop (Approaches from Left to Right) ──
  useFrame((_, delta) => {
    if (!hasArrived) {
      setOfficerX((prev) => {
        const nextX = prev + delta * 1.1;
        if (nextX >= 0.8) {
          setHasArrived(true);
          return 0.8;
        }
        return nextX;
      });
    }
  });

  // Start Dialogue when Officer reaches meeting distance (short natural pause)
  useEffect(() => {
    if (hasArrived && dialogueStep === -1) {
      const timer = setTimeout(() => {
        setDialogueStep(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasArrived, dialogueStep]);

  // Chromium Web Speech API Keep-Alive (Fixes Chrome pausing speech mid-sentence)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const interval = setInterval(() => {
      if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Clean up any pending utterance and reset on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        (window as any).__activeSpeechUtterance = null;
      }
    };
  }, []);

  // ── Voice Audio Speech Synthesis Execution & Automatic Transition ──
  useEffect(() => {
    if (dialogueStep < 0) return;

    // All 3 dialogues finished: trigger automatic transition to Scene 2
    if (dialogueStep >= dialogues.length) {
      if (!hasTransitionedRef.current) {
        hasTransitionedRef.current = true;
        setActiveSpeaker(null);
        setSpokenSubtitle("");
        if (onDialogueUpdateRef.current) {
          onDialogueUpdateRef.current(null);
        }
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          (window as any).__activeSpeechUtterance = null;
        }
        // Smooth natural pause (650ms), then automatic transition to Scene 2
        const transitionTimer = setTimeout(() => {
          onCompleteDialogueRef.current();
        }, 650);
        return () => clearTimeout(transitionTimer);
      }
      return;
    }

    const current = dialogues[dialogueStep];
    setActiveSpeaker(current.speaker);
    setSpokenSubtitle(current.text);

    if (onDialogueUpdateRef.current) {
      onDialogueUpdateRef.current({
        speaker: current.speaker,
        text: current.text,
        step: dialogueStep,
      });
    }

    let isStepActive = true;
    let fallbackTimer: any = null;

    const advanceStep = () => {
      if (!isStepActive) return;
      isStepActive = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (typeof window !== "undefined") {
        (window as any).__activeSpeechUtterance = null;
      }
      // Natural conversational pause (400ms) before next character speaks
      setTimeout(() => {
        setDialogueStep((prev) => prev + 1);
      }, 400);
    };

    // Speak using Web Speech API if unmuted and supported
    if (!isAudioMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(current.text);
      // Persist reference to window to defeat Chromium V8 garbage collection
      (window as any).__activeSpeechUtterance = utterance;

      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(
        (v) => v.lang.includes("en-IN") || v.name.toLowerCase().includes("india")
      );
      const enVoice = voices.find((v) => v.lang.startsWith("en"));

      if (current.speaker === "OFFICER") {
        utterance.voice = indianVoice || enVoice || null;
        utterance.pitch = 0.95;
        utterance.rate = 0.94;
      } else {
        const altVoice = voices.find(
          (v) => v.lang.startsWith("en") && (!indianVoice || v.name !== indianVoice.name)
        );
        utterance.voice = altVoice || enVoice || null;
        utterance.pitch = 1.1;
        utterance.rate = 0.94;
      }

      utterance.onend = () => {
        advanceStep();
      };

      utterance.onerror = (e) => {
        if (e.error === "canceled" || e.error === "interrupted") return;
        advanceStep();
      };

      // Robust fallback timer ensuring progress even if browser audio callback is blocked
      const wordsCount = current.text.split(" ").length;
      const expectedDurationMs = Math.max(wordsCount * 450, 4500) + 2000;
      fallbackTimer = setTimeout(advanceStep, expectedDurationMs);

      window.speechSynthesis.speak(utterance);
    } else {
      // Audio muted: progress smoothly based on reading duration
      const wordsCount = current.text.split(" ").length;
      const readingDurationMs = Math.max(wordsCount * 300, 4200);
      fallbackTimer = setTimeout(advanceStep, readingDurationMs);
    }

    return () => {
      isStepActive = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      // NOTE: Never call window.speechSynthesis.cancel() in step cleanup
      // as routine re-renders would cancel speech mid-sentence!
    };
  }, [dialogueStep, dialogues, isAudioMuted]);

  return (
    <group>
      {/* Ceramic Tile Supermarket Floor with Specular Sheen */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.08} />
      </mesh>

      {/* Ceramic Tile Grid Floor Lines */}
      {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((gx) => (
        <mesh key={`grid-x-${gx}`} position={[gx, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, 16]} />
          <meshBasicMaterial color="#e2e8f0" />
        </mesh>
      ))}
      {[-6, -4, -2, 0, 2, 4, 6].map((gz) => (
        <mesh key={`grid-z-${gz}`} position={[0, 0.001, gz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[22, 0.02]} />
          <meshBasicMaterial color="#e2e8f0" />
        </mesh>
      ))}

      {/* Back Wall with Light Beige Ceramic Tone */}
      <mesh position={[0, 3.5, -4.8]} receiveShadow>
        <boxGeometry args={[22, 7.0, 0.2]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
      </mesh>

      {/* Top Department Signage Border */}
      <mesh position={[0, 3.8, -4.68]}>
        <boxGeometry args={[21.8, 0.45, 0.02]} />
        <meshStandardMaterial color="#0284c7" />
      </mesh>

      {/* Realistic SUPERMARKET Identification Banner on Rear Wall */}
      <SupermarketIdentificationBanner position={[0, 3.25, -4.68]} />

      {/* Ceiling with Recessed Linear LED Panel Lights */}
      <mesh position={[0, 4.0, 0]}>
        <boxGeometry args={[22, 0.1, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      {[-5, 0, 5].map((lx) =>
        [-2.5, 2.5].map((lz) => (
          <group key={`light-${lx}-${lz}`} position={[lx, 3.92, lz]}>
            <mesh>
              <boxGeometry args={[2.8, 0.06, 0.35]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
            </mesh>
            <pointLight position={[0, -0.4, 0]} intensity={1.8} color="#ffffff" distance={5.5} />
          </group>
        ))
      )}

      {/* ── Leftmost Checkout Counter & Cashier Workstation (Includes 3D SUPERMARKET Sign) ── */}
      <CheckoutCounter position={[-2.6, 0, 0.3]} />

      {/* ── Rear Reach-In Refrigerated Cooler (Beverages, Dairy) ── */}
      <ReachInCooler position={[-0.4, 0, -4.3]} />

      {/* ── Right Gondola Shelves (Food, Grains, Snacks) ── */}
      <SupermarketGondolaShelf position={[3.2, 0, -1.8]} length={3.4} />

      {/* ── Waist-Height Fresh Produce Island: Tomatoes & Onions ── */}
      <ProduceIslandTable position={[0.1, 0, 1.8]} />

      {/* ── Main Characters & Conversational Positioning ── */}

      {/* Friend of Police (Right side near shelves, ~25-30 yo civilian) */}
      <group position={[1.9, 0, 0.4]} rotation={[0, hasArrived ? -0.45 : -1.2, 0]}>
        <StylizedCharacter
          shirtColor="#fef08a"
          pantsColor="#78716c"
          role="FRIEND_OF_POLICE"
          isTalking={activeSpeaker === "FRIEND_OF_POLICE"}
          isObserving={activeSpeaker === "OFFICER"}
        />
      </group>

      {/* Police Officer (Civilian clothes, ~27 yo, walks from left to meet Friend of Police) */}
      <group
        position={[officerX, 0, 0.4]}
        rotation={[0, !hasArrived ? Math.PI / 2 : 0.45, 0]}
      >
        <StylizedCharacter
          shirtColor="#38bdf8"
          pantsColor="#1e293b"
          role="OFFICER"
          isTalking={activeSpeaker === "OFFICER"}
          isObserving={activeSpeaker === "FRIEND_OF_POLICE"}
        />
      </group>
    </group>
  );
}

// ── Scene 2: 3D Public Street (Nehru Street & Suspicious Activity) ──
// Detailed Indian Commercial Street with Three Connected Shops, Vehicles, Road, and Animated Suspicious Transactions

interface StreetEnvironmentProps {
  onObservationComplete?: () => void;
  activePhase?: number;
  onPhaseChange?: (phase: number) => void;
  isCinematicActive?: boolean;
}

// ── 0. Nehru Street Asphalt Road, Centerline, Kerb Stones, Sidewalks & Drainage Grates ──
function NehruStreetRoad() {
  return (
    <group>
      {/* ── Main Asphalt Road Surface ── */}
      <mesh position={[0, -0.01, 2.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[36, 9.2]} />
        <meshStandardMaterial color="#2c3440" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Road Aggregate Weathering / Tar Patches */}
      {[-8, -2, 4, 10].map((px, i) => (
        <mesh
          key={`tar-patch-${i}`}
          position={[px, 0.002, 1.0 + (i % 2) * 0.8]}
          rotation={[-Math.PI / 2, 0, 0.1 * i]}
        >
          <planeGeometry args={[1.8, 0.9]} />
          <meshStandardMaterial color="#1e2530" roughness={0.9} />
        </mesh>
      ))}

      {/* Centerline Dashed Yellow Markings */}
      {[-12, -9, -6, -3, 0, 3, 6, 9, 12].map((rx, idx) => (
        <mesh
          key={`center-line-${idx}`}
          position={[rx, 0.005, 1.2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.6, 0.14]} />
          <meshStandardMaterial color="#facc15" roughness={0.5} />
        </mesh>
      ))}

      {/* Solid White Shoulder Lines */}
      <mesh position={[0, 0.004, -1.85]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[32, 0.1]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 0.004, 4.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[32, 0.1]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Pedestrian Zebra Crossing (Near Left Corner, X = -6.8) */}
      {[-0.9, -0.45, 0, 0.45, 0.9].map((zy, zi) => (
        <mesh
          key={`zebra-${zi}`}
          position={[-6.8, 0.005, 1.2 + zy * 2.2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.6, 0.45]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
        </mesh>
      ))}

      {/* ── North Sidewalk (Raised Concrete Pavement in front of Shops) ── */}
      <mesh position={[0, 0.09, -2.9]} receiveShadow>
        <boxGeometry args={[32, 0.18, 2.0]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.8} />
      </mesh>

      {/* Pavement Slabs / Expansion Joints */}
      {[-14, -11, -8, -5, -2, 1, 4, 7, 10, 13].map((sx, si) => (
        <mesh
          key={`slab-line-${si}`}
          position={[sx, 0.185, -2.9]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.02, 2.0]} />
          <meshBasicMaterial color="#64748b" />
        </mesh>
      ))}

      {/* Alternating Black and White Kerb Stones */}
      {Array.from({ length: 32 }).map((_, ki) => {
        const kx = -15.5 + ki * 1.0;
        const isWhite = ki % 2 === 0;
        return (
          <mesh key={`kerb-${ki}`} position={[kx, 0.12, -1.9]}>
            <boxGeometry args={[0.96, 0.24, 0.16]} />
            <meshStandardMaterial
              color={isWhite ? "#f8fafc" : "#1e293b"}
              roughness={0.7}
            />
          </mesh>
        );
      })}

      {/* Stormwater Drainage Grates */}
      {[-5.0, 0.5, 6.0].map((gx, gi) => (
        <group key={`grate-${gi}`} position={[gx, 0.01, -1.82]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.8, 0.35]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.4} />
          </mesh>
          {[-0.25, -0.1, 0.05, 0.2].map((gxOff, ri) => (
            <mesh
              key={`bar-${ri}`}
              position={[gxOff, 0.015, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.04, 0.3]} />
              <meshBasicMaterial color="#475569" />
            </mesh>
          ))}
        </group>
      ))}

    </group>
  );
}

// ── 1. Municipal Street Namepost (Nehru Street / நேரு தெரு) ──
function MunicipalSignpost({ position = [-7.5, 0, -2.4] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Concrete post */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 2.6, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.6} />
      </mesh>
      {/* Green Municipal Street Sign */}
      <group position={[0, 2.45, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.35, 0.48, 0.04]} />
          <meshStandardMaterial color="#065f46" roughness={0.4} />
        </mesh>
        <mesh>
          <boxGeometry args={[1.39, 0.52, 0.02]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <Html position={[0, 0, 0.03]} transform scale={0.2} pointerEvents="none" center>
          <div className="select-none text-center font-black tracking-wide text-white whitespace-nowrap">
            <div className="text-[11px] leading-tight font-black text-amber-300">நேரு தெரு</div>
            <div className="text-[13px] leading-tight font-extrabold tracking-wider">NEHRU STREET</div>
            <div className="text-[8px] text-emerald-200 font-bold">CHENNAI - 600 002</div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// ── 2. Concrete Utility Pole & Tangled Overhead Power Cables ──
function UtilityPolesAndCables() {
  return (
    <group>
      {/* Left Concrete Utility Pole */}
      <group position={[-3.6, 0, -1.7]}>
        <mesh position={[0, 2.8, 0]} castShadow>
          <boxGeometry args={[0.22, 5.6, 0.22]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} />
        </mesh>
        {/* Metal Crossarm */}
        <mesh position={[0, 5.1, 0]}>
          <boxGeometry args={[1.8, 0.08, 0.08]} />
          <meshStandardMaterial color="#334155" metalness={0.7} />
        </mesh>
        {/* Ceramic Insulators */}
        {[-0.7, -0.25, 0.25, 0.7].map((cx, ci) => (
          <mesh key={`insul-l-${ci}`} position={[cx, 5.22, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.16, 8]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
        ))}
        {/* Streetlight Luminaire on Pole */}
        <group position={[0.4, 4.4, 0.3]} rotation={[0.2, 0, 0]}>
          <mesh position={[0, 0, 0.4]}>
            <boxGeometry args={[0.18, 0.08, 0.6]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[0, -0.04, 0.5]}>
            <planeGeometry args={[0.16, 0.3]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
          <pointLight position={[0, -0.3, 0.5]} intensity={1.4} color="#fef08a" distance={6} />
        </group>
      </group>

      {/* Right Utility Pole */}
      <group position={[7.2, 0, -1.7]}>
        <mesh position={[0, 2.8, 0]} castShadow>
          <boxGeometry args={[0.22, 5.6, 0.22]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} />
        </mesh>
        <mesh position={[0, 5.1, 0]}>
          <boxGeometry args={[1.8, 0.08, 0.08]} />
          <meshStandardMaterial color="#334155" metalness={0.7} />
        </mesh>
        {[-0.7, -0.25, 0.25, 0.7].map((cx, ci) => (
          <mesh key={`insul-r-${ci}`} position={[cx, 5.22, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.16, 8]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Overhead Tangled Cables */}
      {[-0.35, 0, 0.35].map((zOff, wi) => (
        <group key={`cables-${wi}`}>
          {/* Main sagging overhead power wire */}
          <mesh position={[1.8, 5.08 - Math.abs(zOff) * 0.12, -1.7 + zOff]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.01, 0.01, 11.0, 6]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          {/* Service drop connection wire into shop roof */}
          <mesh position={[5.4, 4.3, -2.4]} rotation={[0.4, 0.3, 0.2]}>
            <cylinderGeometry args={[0.008, 0.008, 2.6, 6]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── 3. Roadside Neem Tree with Circular Stone Bench ──
function RoadsideNeemTree({ position = [-4.6, 0, 0.6] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Circular Brick / Stone Planter and Seating Ledge */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.1, 1.15, 0.5, 16]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>
      {/* Soil interior */}
      <mesh position={[0, 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 14]} />
        <meshStandardMaterial color="#3f2e21" roughness={0.95} />
      </mesh>
      {/* Tree Trunk */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.26, 2.6, 10]} />
        <meshStandardMaterial color="#573a27" roughness={0.9} />
      </mesh>
      {/* Branches */}
      <mesh position={[0.25, 2.8, 0.1]} rotation={[0, 0, -0.4]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 1.2, 8]} />
        <meshStandardMaterial color="#573a27" />
      </mesh>
      <mesh position={[-0.25, 2.9, -0.1]} rotation={[0, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 1.2, 8]} />
        <meshStandardMaterial color="#573a27" />
      </mesh>
      {/* Foliage Canopy */}
      <mesh position={[0, 3.8, 0]} castShadow>
        <sphereGeometry args={[1.2, 10, 10]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
      <mesh position={[0.6, 3.5, 0.3]} castShadow>
        <sphereGeometry args={[0.9, 8, 8]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>
      <mesh position={[-0.6, 3.6, -0.3]} castShadow>
        <sphereGeometry args={[0.9, 8, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── 4. Indian Auto-Rickshaw (Bajaj RE Style) ──
function IndianAutoRickshaw({
  position = [-1.4, 0, 0.4],
  rotation = [0, 0.2, 0],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Lower Chassis & Body (Black) */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.3, 0.5, 2.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>
      {/* Green decorative bottom strip */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[1.32, 0.12, 2.22]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      {/* Iconic Yellow Curved Roof Canopy */}
      <mesh position={[0, 1.45, -0.1]} castShadow>
        <boxGeometry args={[1.28, 0.1, 2.1]} />
        <meshStandardMaterial color="#eab308" roughness={0.5} />
      </mesh>
      {/* Canopy Curved Front Slope */}
      <mesh position={[0, 1.35, 0.9]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[1.26, 0.08, 0.4]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>
      {/* Canopy Support Pillars */}
      {[-0.6, 0.6].map((px, pi) =>
        [-0.9, 0.1, 0.9].map((pz, pzi) => (
          <mesh key={`pillar-${pi}-${pzi}`} position={[px, 0.95, pz]}>
            <cylinderGeometry args={[0.02, 0.02, 0.95, 6]} />
            <meshStandardMaterial color="#eab308" metalness={0.7} />
          </mesh>
        ))
      )}
      {/* Front Windscreen with Rubber Beading */}
      <mesh position={[0, 1.05, 0.85]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.15, 0.55, 0.03]} />
        <meshPhysicalMaterial color="#e0f2fe" transmission={0.8} roughness={0.1} />
      </mesh>
      {/* Driver Seat & Rear Passenger Vinyl Bench */}
      <mesh position={[0, 0.62, 0.4]}>
        <boxGeometry args={[0.55, 0.15, 0.45]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.65, -0.6]}>
        <boxGeometry args={[1.15, 0.18, 0.55]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Single Front Wheel */}
      <mesh position={[0, 0.22, 1.05]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.14, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {/* Dual Rear Wheels */}
      {[-0.64, 0.64].map((wx, wi) => (
        <mesh key={`rw-${wi}`} position={[wx, 0.22, -0.6]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.16, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
      ))}
      {/* Chrome Headlamp */}
      <mesh position={[0, 0.62, 1.12]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.8} />
      </mesh>
      {/* License Plate */}
      <mesh position={[0, 0.35, 1.13]}>
        <boxGeometry args={[0.32, 0.08, 0.02]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
    </group>
  );
}

// ── 5. Parked Classic Indian Scooter (Bajaj Chetak style) ──
function ParkedClassicScooter({
  position = [2.2, 0.18, -0.8],
  rotation = [0, -0.3, 0],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Turquoise Body Shell */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.36, 0.32, 1.1]} />
        <meshStandardMaterial color="#0d9488" roughness={0.5} />
      </mesh>
      {/* Curved Legshield */}
      <mesh position={[0, 0.58, 0.4]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.48, 0.5, 0.06]} />
        <meshStandardMaterial color="#0d9488" />
      </mesh>
      {/* Handlebar & Round Chrome Headlight */}
      <mesh position={[0, 0.88, 0.38]}>
        <boxGeometry args={[0.56, 0.08, 0.08]} />
        <meshStandardMaterial color="#0d9488" />
      </mesh>
      <mesh position={[0, 0.9, 0.42]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.8} />
      </mesh>
      {/* Dual Split Seat (Black Vinyl) */}
      <mesh position={[0, 0.62, 0.08]}>
        <boxGeometry args={[0.3, 0.1, 0.35]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.62, -0.32]}>
        <boxGeometry args={[0.3, 0.1, 0.35]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Spare Wheel Mounted at Rear */}
      <mesh position={[0, 0.5, -0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 10]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Wheels */}
      <mesh position={[0, 0.18, 0.42]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 10]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0, 0.18, -0.35]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 10]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}

// ── 6. Parked Commuter Motorcycle ──
function ParkedCommuterMotorcycle({
  position = [-5.2, 0.18, -0.8],
  rotation = [0, 0.35, 0],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Slim Black Fuel Tank with Red Pinstripe */}
      <mesh position={[0, 0.58, 0.1]} castShadow>
        <boxGeometry args={[0.26, 0.22, 0.5]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.59, 0.1]}>
        <boxGeometry args={[0.27, 0.04, 0.42]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {/* Long Black Seat */}
      <mesh position={[0, 0.62, -0.32]}>
        <boxGeometry args={[0.24, 0.1, 0.55]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Silver Engine Block & Exhaust */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.22, 0.28, 0.35]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
      <mesh position={[0.14, 0.22, -0.3]} rotation={[0.1, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
      </mesh>
      {/* Spoke Wheels */}
      <mesh position={[0, 0.24, 0.55]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.06, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0, 0.24, -0.55]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.06, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}

// ── 7. Three Connected Roadside Shops (Continuous Commercial Building Structure) ──
function ThreeConnectedCommercialShops() {
  return (
    <group position={[0, 0, 0]}>
      {/* ── Main Continuous Building Structure ── */}
      {/* Raised Concrete Plinth Slab */}
      <mesh position={[0, 0.09, -3.4]} receiveShadow>
        <boxGeometry args={[16.2, 0.2, 3.0]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>
      {/* Rear Main Concrete Wall */}
      <mesh position={[0, 2.0, -4.8]} receiveShadow>
        <boxGeometry args={[16.2, 4.0, 0.3]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>
      {/* Top Continuous Concrete Parapet Ledge & Cornice */}
      <mesh position={[0, 3.95, -4.75]}>
        <boxGeometry args={[16.4, 0.25, 0.4]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.6} />
      </mesh>

      {/* Concrete Partition Walls separating the three shops */}
      <mesh position={[-2.7, 2.0, -3.5]}>
        <boxGeometry args={[0.2, 3.8, 2.4]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[2.7, 2.0, -3.5]}>
        <boxGeometry args={[0.2, 3.8, 2.4]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SHOP 1 (EXTREME LEFT): ANNAPOORNA LOCAL FOOD SHOP & TIFFIN STALL  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <group position={[-5.4, 0, 0]}>
        {/* Sloping Striped Canopy Awning */}
        <mesh position={[0, 3.1, -2.6]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[5.0, 0.06, 1.4]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} />
        </mesh>
        {/* Striped Canopy Edge Flap */}
        <mesh position={[0, 2.9, -1.9]}>
          <boxGeometry args={[5.0, 0.2, 0.04]} />
          <meshStandardMaterial color="#fef08a" />
        </mesh>

        {/* Fascia Signboard: ANNAPURNA DIFFERENT TYPES OF TIFFIN & MEALS (Unobstructed by tree) */}
        <group position={[1.45, 3.45, -3.35]}>
          <mesh castShadow>
            <boxGeometry args={[2.5, 0.65, 0.06]} />
            <meshStandardMaterial color="#ca8a04" roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh>
            <boxGeometry args={[2.56, 0.71, 0.02]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <Html position={[0, 0, 0.04]} transform scale={0.22} pointerEvents="none" center>
            <div className="select-none text-center font-black tracking-wide text-white whitespace-nowrap">
              <div className="text-[10px] text-yellow-200">அன்னபூர்ணா உணவகம்</div>
              <div className="text-xs font-black text-white drop-shadow">ANNAPURNA DIFFERENT TYPES OF TIFFIN &amp; MEALS</div>
              <div className="text-[8px] text-amber-100">HOT IDLI • DOSA • VADA • MEALS</div>
            </div>
          </Html>
        </group>

        {/* Stainless Steel Food Display Counter */}
        <group position={[0.4, 0.48, -2.5]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.4, 0.96, 0.9]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* Glass sneeze shield on counter */}
          <mesh position={[0, 0.65, 0.4]}>
            <boxGeometry args={[2.3, 0.35, 0.02]} />
            <meshPhysicalMaterial color="#e0f2fe" transmission={0.8} roughness={0.1} />
          </mesh>
          {/* Stainless steel food trays (Sambar, Chutney, Curry) */}
          {[-0.7, 0, 0.7].map((tx, ti) => (
            <mesh key={`tray-${ti}`} position={[tx, 0.49, 0]}>
              <boxGeometry args={[0.55, 0.04, 0.6]} />
              <meshStandardMaterial color={["#ea580c", "#f8fafc", "#ca8a04"][ti]} />
            </mesh>
          ))}
        </group>

        {/* Cylindrical Stainless Steel Idli Steamer on Side Table */}
        <group position={[-1.7, 0.98, -2.8]}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.7, 14]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
          </mesh>
          {/* Steamer lid handles & top whistle */}
          <mesh position={[0, 0.73, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.8} />
          </mesh>
        </group>

        {/* Aluminium Biryani / Kurma Degh Pot with Tied White Cloth */}
        <group position={[-1.7, 0.35, -2.2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.32, 0.24, 0.55, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.08, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
        </group>

        {/* Compact Steel Folding Table with 2 Plastic Chairs */}
        <group position={[-1.1, 0, -3.9]}>
          {/* Table */}
          <mesh position={[0, 0.74, 0]}>
            <boxGeometry args={[1.1, 0.04, 0.8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.72, 6]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          {/* Steel Water Tumbler on Table */}
          <mesh position={[0.2, 0.84, 0.1]}>
            <cylinderGeometry args={[0.04, 0.03, 0.14, 8]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.9} />
          </mesh>
          {/* Red & Blue Plastic Molded Chairs */}
          <mesh position={[-0.45, 0.42, 0]}>
            <boxGeometry args={[0.34, 0.42, 0.34]} />
            <meshStandardMaterial color="#dc2626" roughness={0.5} />
          </mesh>
          <mesh position={[0.45, 0.42, 0]}>
            <boxGeometry args={[0.34, 0.42, 0.34]} />
            <meshStandardMaterial color="#2563eb" roughness={0.5} />
          </mesh>
        </group>

        {/* Food Shopkeeper Character */}
        <group position={[0.6, 0.18, -3.5]} rotation={[0, 0.1, 0]}>
          <StylizedCharacter
            shirtColor="#15803d"
            pantsColor="#f8fafc"
            skinColor="#fcd34d"
            role="CONSTABLE"
            isObserving={true}
          />
        </group>
      </group>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SHOP 2 (CENTRE): SRI MURUGAN GENERAL PROVISION STORE               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <group position={[0, 0, 0]}>
        {/* Blue Metal Corrugated Awning Canopy */}
        <mesh position={[0, 3.1, -2.6]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[5.0, 0.05, 1.4]} />
          <meshStandardMaterial color="#0284c7" metalness={0.3} roughness={0.6} />
        </mesh>
        {/* Awning Front Trim */}
        <mesh position={[0, 2.9, -1.9]}>
          <boxGeometry args={[5.0, 0.2, 0.04]} />
          <meshStandardMaterial color="#38bdf8" />
        </mesh>

        {/* Fascia Signboard: SRI MURUGAN GENERAL STORES */}
        <group position={[0, 3.55, -3.4]}>
          <mesh castShadow>
            <boxGeometry args={[4.8, 0.62, 0.06]} />
            <meshStandardMaterial color="#065f46" roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh>
            <boxGeometry args={[4.88, 0.7, 0.02]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          <Html position={[0, 0, 0.04]} transform scale={0.25} pointerEvents="none" center>
            <div className="select-none text-center font-black tracking-wider text-white whitespace-nowrap">
              <div className="text-[10px] text-yellow-300">ஸ்ரீ முருகன் மளிகை &amp; ஜெனரல் ஸ்டோர்ஸ்</div>
              <div className="text-sm font-black text-white drop-shadow">SRI MURUGAN GENERAL STORES</div>
              <div className="text-[8px] text-emerald-200">PROVISIONS • SNACKS • COOL DRINKS • RECHARGE</div>
            </div>
          </Html>
        </group>

        {/* Hanging Strings of Snack Packets across Shop Front (Lays, Kurkure, Biscuits) */}
        {[-1.8, -1.0, -0.2, 0.6, 1.4].map((hx, hi) => (
          <group key={`snack-string-${hi}`} position={[hx, 2.8, -2.1]}>
            {/* Hanging String Ribbon */}
            <mesh position={[0, -0.6, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 1.2, 4]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Mini Snack Packets on String */}
            {[-0.2, -0.5, -0.8, -1.1].map((py, pi) => (
              <mesh key={`pkt-${pi}`} position={[0, py, 0]} rotation={[0, 0.1 * pi, 0]}>
                <boxGeometry args={[0.16, 0.22, 0.03]} />
                <meshStandardMaterial
                  color={["#eab308", "#ea580c", "#2563eb", "#dc2626", "#16a34a"][(hi + pi) % 5]}
                />
              </mesh>
            ))}
          </group>
        ))}

        {/* Tiered Rear Grocery Shelves Stacked with Packaged Products */}
        <group position={[0, 1.8, -4.5]}>
          <mesh castShadow>
            <boxGeometry args={[4.6, 3.2, 0.5]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          {/* Shelves & Products */}
          {[-1.0, -0.4, 0.2, 0.8].map((sy, si) => (
            <group key={`shelf-${si}`} position={[0, sy, 0.28]}>
              <mesh>
                <boxGeometry args={[4.4, 0.05, 0.4]} />
                <meshStandardMaterial color="#b45309" />
              </mesh>
              {/* Colorful Product Boxes */}
              {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((bx, bi) => (
                <mesh key={`box-${bi}`} position={[bx, 0.14, 0]}>
                  <boxGeometry args={[0.24, 0.24, 0.2]} />
                  <meshStandardMaterial
                    color={["#dc2626", "#2563eb", "#16a34a", "#eab308", "#9333ea"][(si + bi) % 5]}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>

        {/* Stacked Jute Burlap Sacks (Rice, Flour, Dhal) on Floor */}
        <group position={[-1.7, 0.18, -3.2]}>
          {[0, 0.45].map((sx, si) =>
            [0, 0.35].map((sz, szi) => (
              <mesh key={`sack-${si}-${szi}`} position={[sx, 0.22, sz]} castShadow>
                <boxGeometry args={[0.42, 0.38, 0.32]} />
                <meshStandardMaterial color="#d4a373" roughness={0.9} />
              </mesh>
            ))
          )}
        </group>

        {/* Beverage Cooler / Cold Drink Bottle Display Crate */}
        <group position={[1.7, 0.8, -3.4]}>
          <mesh castShadow>
            <boxGeometry args={[0.9, 1.4, 0.6]} />
            <meshStandardMaterial color="#dc2626" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.31]}>
            <planeGeometry args={[0.75, 1.2]} />
            <meshPhysicalMaterial color="#bae6fd" transmission={0.75} roughness={0.1} />
          </mesh>
          {/* Drink Bottles inside */}
          {[-0.2, 0.2].map((bx, bi) => (
            <mesh key={`bottle-${bi}`} position={[bx, 0.1, 0.1]}>
              <cylinderGeometry args={[0.04, 0.04, 0.24, 6]} />
              <meshStandardMaterial color={bi === 0 ? "#16a34a" : "#0284c7"} />
            </mesh>
          ))}
        </group>

        {/* Front Billing Counter with Weighing Scale */}
        <group position={[0, 0.48, -2.6]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.96, 0.7]} />
            <meshStandardMaterial color="#854d0e" roughness={0.6} />
          </mesh>
          {/* Digital Weighing Scale */}
          <mesh position={[-0.45, 0.52, 0]}>
            <boxGeometry args={[0.4, 0.08, 0.35]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
          {/* Blue Cash Box */}
          <mesh position={[0.4, 0.53, 0]}>
            <boxGeometry args={[0.35, 0.1, 0.25]} />
            <meshStandardMaterial color="#1e3a8a" />
          </mesh>
        </group>

        {/* General Store Shopkeeper */}
        <group position={[0, 0.18, -3.4]}>
          <StylizedCharacter
            shirtColor="#e2e8f0"
            pantsColor="#0f172a"
            skinColor="#fcd34d"
            role="FRIEND_OF_POLICE"
            isObserving={true}
          />
        </group>
      </group>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SHOP 3 (EXTREME RIGHT): TRADITIONAL INDIAN ROADSIDE TEA SHOP       */}
      {/* (THE CENTRAL FOCAL POINT OF SCENE 2)                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <group position={[5.4, 0, 0]}>
        {/* Weathered Wooden / Tin Awning Canopy */}
        <mesh position={[0, 3.1, -2.6]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[5.0, 0.06, 1.4]} />
          <meshStandardMaterial color="#b45309" roughness={0.7} />
        </mesh>
        {/* Corrugated Awning Trim */}
        <mesh position={[0, 2.9, -1.9]}>
          <boxGeometry args={[5.0, 0.2, 0.04]} />
          <meshStandardMaterial color="#d97706" />
        </mesh>

        {/* ── Realistic Physical 3D Signboard: TEA SHOP ── */}
        <group position={[0, 3.55, -3.4]}>
          {/* Signboard Panel */}
          <mesh castShadow>
            <boxGeometry args={[4.8, 0.65, 0.08]} />
            <meshStandardMaterial color="#78350f" roughness={0.5} metalness={0.1} />
          </mesh>
          {/* Gold / Brass Border Frame */}
          <mesh>
            <boxGeometry args={[4.88, 0.73, 0.03]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* 3D Signboard Text: TEA SHOP & NEHRU TEA STALL */}
          <Html position={[0, 0, 0.05]} transform scale={0.25} pointerEvents="none" center>
            <div className="select-none text-center font-black tracking-wider text-white whitespace-nowrap">
              <div className="text-[10px] text-amber-300 font-extrabold">நேரு டீ ஸ்டால்</div>
              <div className="text-base font-black text-yellow-400 drop-shadow-md tracking-widest">
                TEA SHOP
              </div>
              <div className="text-[9px] text-amber-100 font-bold tracking-wider">
                NEHRU TEA STALL • FRESH CHAI • SNACKS
              </div>
            </div>
          </Html>
        </group>

        {/* ── Main Tea Preparation Counter ── */}
        <group position={[0, 0.48, -2.4]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.2, 0.96, 0.95]} />
            <meshStandardMaterial color="#475569" roughness={0.5} />
          </mesh>
          {/* Stainless steel top counter sheet */}
          <mesh position={[0, 0.49, 0]}>
            <boxGeometry args={[3.22, 0.04, 0.97]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
          </mesh>

          {/* 1. Iconic Brass & Stainless Steel Cylindrical Tea Boiler (Samovar) */}
          <group position={[-0.85, 0.84, 0.05]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.68, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.1} />
            </mesh>
            {/* Top Brass Dome Cap & Steam Valve Knob */}
            <mesh position={[0, 0.38, 0]}>
              <sphereGeometry args={[0.16, 12, 10]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.52, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.08, 6]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.9} />
            </mesh>
            {/* Brass Dispensing Tap in Front */}
            <mesh position={[0, -0.18, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.1, 6]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.8} />
            </mesh>
            {/* Water Level Gauge Glass Tube */}
            <mesh position={[0.23, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.45, 6]} />
              <meshPhysicalMaterial color="#bae6fd" transmission={0.9} />
            </mesh>
            {/* Soft Steam Light Effect */}
            <pointLight position={[0, 0.6, 0]} intensity={0.8} color="#ffffff" distance={1.5} />
          </group>

          {/* 2. Cutting Chai Glass Rack with Traditional Glasses */}
          <group position={[-0.2, 0.58, 0.15]}>
            {/* Chrome Wire Basket */}
            <mesh>
              <boxGeometry args={[0.55, 0.1, 0.38]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} wireframe />
            </mesh>
            {/* 6 Ribbed Cutting Chai Glasses */}
            {[-0.18, 0, 0.18].map((gx, gi) =>
              [-0.09, 0.09].map((gz, gzi) => (
                <group key={`glass-${gi}-${gzi}`} position={[gx, 0.08, gz]}>
                  {/* Glass Cup */}
                  <mesh>
                    <cylinderGeometry args={[0.035, 0.025, 0.12, 8]} />
                    <meshPhysicalMaterial color="#e0f2fe" transmission={0.85} roughness={0.1} />
                  </mesh>
                  {/* Tea inside glass */}
                  <mesh position={[0, -0.01, 0]}>
                    <cylinderGeometry args={[0.03, 0.022, 0.08, 8]} />
                    <meshStandardMaterial color="#b45309" roughness={0.4} />
                  </mesh>
                </group>
              ))
            )}
          </group>

          {/* 3. Glass Bakery Showcase Cabinet (Samosas, Vadas, Rusks) */}
          <group position={[0.75, 0.72, 0.05]}>
            {/* Wooden Base */}
            <mesh position={[0, -0.18, 0]}>
              <boxGeometry args={[0.9, 0.06, 0.55]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
            {/* Glass Box */}
            <mesh>
              <boxGeometry args={[0.88, 0.34, 0.52]} />
              <meshPhysicalMaterial color="#e0f2fe" transmission={0.85} roughness={0.05} />
            </mesh>
            {/* Crispy Golden Samosas & Vadas inside */}
            {[-0.25, 0, 0.25].map((sx, si) => (
              <mesh key={`samosa-${si}`} position={[sx, -0.06, 0]} rotation={[0, 0.2 * si, 0]}>
                <coneGeometry args={[0.065, 0.1, 4]} />
                <meshStandardMaterial color="#d97706" roughness={0.7} />
              </mesh>
            ))}
            {/* Tea Rusks on upper shelf */}
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[0.5, 0.04, 0.2]} />
              <meshStandardMaterial color="#b45309" roughness={0.8} />
            </mesh>
          </group>

          {/* 4. Large Transparent Biscuit Jars with Bright Red Lids */}
          <group position={[1.4, 0.65, 0.05]}>
            {[-0.14, 0.14].map((jx, ji) => (
              <group key={`jar-${ji}`} position={[jx, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.09, 0.09, 0.24, 10]} />
                  <meshPhysicalMaterial color="#e0f2fe" transmission={0.85} />
                </mesh>
                {/* Red Lid */}
                <mesh position={[0, 0.13, 0]}>
                  <cylinderGeometry args={[0.095, 0.095, 0.04, 10]} />
                  <meshStandardMaterial color="#dc2626" />
                </mesh>
              </group>
            ))}
          </group>
        </group>

        {/* Traditional Gas Stove & Red Indane LPG Cylinder under Counter */}
        <group position={[-0.85, 0.24, -2.4]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.44, 10]} />
            <meshStandardMaterial color="#dc2626" roughness={0.5} />
          </mesh>
          {/* Cylinder Top Valve Guard Ring */}
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.08, 8]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
        </group>

        {/* Stainless Steel Water Dispenser Drum with Tap on Counter Corner */}
        <group position={[-1.4, 1.25, -2.4]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.5, 12]} />
            <meshStandardMaterial color="#0284c7" metalness={0.6} />
          </mesh>
          {/* Tap & Tumbler on Top */}
          <mesh position={[0, -0.15, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.06, 6]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.04, 0.035, 0.12, 8]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.9} />
          </mesh>
        </group>

        {/* 3 Circular Plastic Customer Stools on Sidewalk outside Tea Shop */}
        {[-0.8, 0.2, 1.1].map((stx, sti) => (
          <group key={`stool-${sti}`} position={[stx, 0.18, -1.3]}>
            {/* Circular Stool Seat */}
            <mesh position={[0, 0.34, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.05, 12]} />
              <meshStandardMaterial color={sti === 1 ? "#2563eb" : "#dc2626"} roughness={0.5} />
            </mesh>
            {/* 4 Stool Legs */}
            {[-0.1, 0.1].map((lx, lxi) =>
              [-0.1, 0.1].map((lz, lzi) => (
                <mesh key={`leg-${lxi}-${lzi}`} position={[lx, 0.17, lz]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.34, 6]} />
                  <meshStandardMaterial color="#334155" />
                </mesh>
              ))
            )}
          </group>
        ))}

        {/* Hanging Bare Incandescent Light Bulb Overhead with Warm Amber Glow */}
        <group position={[0, 2.65, -2.2]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.4, 4]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[0, -0.1, 0]} intensity={1.8} color="#fef08a" distance={4.5} />
        </group>

        {/* Tea Master Character Behind the Counter */}
        <group position={[0.2, 0.18, -3.4]} rotation={[0, -0.1, 0]}>
          <StylizedCharacter
            shirtColor="#f8fafc"
            pantsColor="#1e3a8a"
            skinColor="#fcd34d"
            role="FRIEND_OF_POLICE"
            isTalking={true}
          />
        </group>
      </group>
    </group>
  );
}

// ── 8. Main Scene 2 Environment & Suspicious Interaction Animation Sequence (Static Camera) ──
interface StreetEnvironmentProps {
  onObservationComplete?: () => void;
}

function StreetEnvironment({ onObservationComplete }: StreetEnvironmentProps) {
  // Timeline:
  // 0 - 3s: Initial street establishing
  // 3 - 12s: Customer 1 walks to tea shop, discreet exchange with Raju, customer leaves
  // 12 - 15s: Brief pause & seller vigilance
  // 15 - 24s: Customer 2 walks to tea shop, discreet exchange with Raju, customer leaves
  // 24 - 27s: Informer realization thought bubble
  // 27s+: Observation completed, triggers onObservationComplete
  const [animTime, setAnimTime] = useState<number>(0);
  const [cust1Pos, setCust1Pos] = useState<[number, number, number]>([5.8, 0.18, 1.4]);
  const [cust1Rot, setCust1Rot] = useState<[number, number, number]>([0, 0, 0]);
  const [cust1Active, setCust1Active] = useState<boolean>(false);
  const [cust1HasPacket, setCust1HasPacket] = useState<boolean>(false);

  const [cust2Pos, setCust2Pos] = useState<[number, number, number]>([7.8, 0.18, -1.2]);
  const [cust2Rot, setCust2Rot] = useState<[number, number, number]>([0, 0, 0]);
  const [cust2Active, setCust2Active] = useState<boolean>(false);
  const [cust2HasPacket, setCust2HasPacket] = useState<boolean>(false);

  const [rajuHandExtended, setRajuHandExtended] = useState<boolean>(false);
  const [informerRealized, setInformerRealized] = useState<boolean>(false);
  const hasNotifiedCompleteRef = useRef<boolean>(false);

  // Lock camera to ONE fixed static view on every frame (Zero movement, zero zoom)
  useFrame((state, delta) => {
    state.camera.position.set(0, 2.7, 8.4);
    state.camera.lookAt(0, 1.2, -1.8);

    const nextTime = animTime + delta;
    setAnimTime(nextTime);

    // ── Customer 1 Transaction (3s to 12s) ──
    if (nextTime >= 3.0 && nextTime < 12.0) {
      setCust1Active(true);
      if (nextTime < 6.5) {
        // Customer 1 approaches along open road corridor (X = 5.8 -> 3.2, Z = 1.4 -> -1.5)
        // Stays strictly in open corridor (X >= 3.2), safely clear of scooter (X = 2.2, Z = -0.8) and auto (X = -1.4)
        const progress = (nextTime - 3.0) / 3.5;
        const currentX = 5.8 - progress * 2.6;
        const currentZ = 1.4 - progress * 2.9;
        setCust1Pos([currentX, 0.18, currentZ]);
        setCust1Rot([0, Math.atan2(-2.6, -2.9), 0]);
        setRajuHandExtended(false);
        setCust1HasPacket(false);
      } else if (nextTime >= 6.5 && nextTime < 8.8) {
        // Customer 1 stops at Raju; faces Raju; Handshake exchange of white packet
        setCust1Pos([3.2, 0.18, -1.5]);
        setCust1Rot([0, 1.73, 0]);
        setRajuHandExtended(true);
        if (nextTime >= 7.5) {
          setCust1HasPacket(true);
        }
      } else {
        // Customer 1 turns and walks away down Nehru street open road towards right (X = 3.2 -> 7.5, Z = -1.5 -> 1.2)
        setRajuHandExtended(false);
        const exitProgress = (nextTime - 8.8) / 3.2;
        const exitX = 3.2 + exitProgress * 4.3;
        const exitZ = -1.5 + exitProgress * 2.7;
        setCust1Pos([exitX, 0.18, exitZ]);
        setCust1Rot([0, Math.atan2(4.3, 2.7), 0]);
      }
    } else if (nextTime >= 12.0) {
      setCust1Active(false);
    }

    // ── Intermission Pause (12s to 15s) ──
    if (nextTime >= 12.0 && nextTime < 15.0) {
      setRajuHandExtended(false);
    }

    // ── Customer 2 Transaction (15s to 24s) ──
    if (nextTime >= 15.0 && nextTime < 24.0) {
      setCust2Active(true);
      if (nextTime < 18.5) {
        // Customer 2 walks from right sidewalk towards Raju (X = 7.8 -> 3.3, Z = -1.2 -> -1.5)
        // Stays strictly in open corridor (X >= 3.3), safely clear of scooter (X = 2.2) and auto (X = -1.4)
        const progress = (nextTime - 15.0) / 3.5;
        const currentX = 7.8 - progress * 4.5;
        const currentZ = -1.2 - progress * 0.3;
        setCust2Pos([currentX, 0.18, currentZ]);
        setCust2Rot([0, Math.atan2(-4.5, -0.3), 0]);
        setRajuHandExtended(false);
        setCust2HasPacket(false);
      } else if (nextTime >= 18.5 && nextTime < 20.8) {
        // Customer 2 stops at Raju; faces Raju; second exchange of white packet
        setCust2Pos([3.3, 0.18, -1.5]);
        setCust2Rot([0, 1.73, 0]);
        setRajuHandExtended(true);
        if (nextTime >= 19.5) {
          setCust2HasPacket(true);
        }
      } else {
        // Customer 2 pockets item and exits towards right open road (X = 3.3 -> 7.6, Z = -1.5 -> 0.8)
        // Completely clear of auto-rickshaw (X = -1.4) and scooter (X = 2.2)
        setRajuHandExtended(false);
        const exitProgress = (nextTime - 20.8) / 3.2;
        const exitX = 3.3 + exitProgress * 4.3;
        const exitZ = -1.5 + exitProgress * 2.3;
        setCust2Pos([exitX, 0.18, exitZ]);
        setCust2Rot([0, Math.atan2(4.3, 2.3), 0]);
      }
    } else if (nextTime >= 24.0) {
      setCust2Active(false);
    }

    // ── Informer Realization (24s+) ──
    if (nextTime >= 24.0) {
      setInformerRealized(true);
    }

    // ── Observation Complete (27s+) ──
    if (nextTime >= 27.0 && !hasNotifiedCompleteRef.current) {
      hasNotifiedCompleteRef.current = true;
      if (onObservationComplete) {
        onObservationComplete();
      }
    }
  });

  return (
    <group>
      {/* ── Public Asphalt Road Surface & Pavements ── */}
      <NehruStreetRoad />

      {/* ── Municipal Signpost (NEHRU STREET) ── */}
      {/* ── Distant Daylight Sky & Horizon Plane Behind Shops ── */}
      <mesh position={[0, 6, -8.0]}>
        <planeGeometry args={[70, 22]} />
        <meshBasicMaterial color="#7dd3fc" />
      </mesh>

      {/* ── Municipal Signpost (NEHRU STREET) ── */}
      <MunicipalSignpost position={[-7.5, 0, -2.4]} />

      {/* ── Concrete Utility Poles, Streetlights & Overhead Cables ── */}
      <UtilityPolesAndCables />

      {/* ── Roadside Neem Tree with Stone Bench ── */}
      <RoadsideNeemTree position={[-4.6, 0, 0.6]} />

      {/* ── Parked Indian Vehicles (Auto-Rickshaw, Scooter, Motorcycle) ── */}
      <IndianAutoRickshaw position={[-1.4, 0, 0.4]} rotation={[0, 0.15, 0]} />
      <ParkedClassicScooter position={[2.2, 0.18, -0.8]} rotation={[0, -0.25, 0]} />
      <ParkedCommuterMotorcycle position={[-5.4, 0.18, -0.8]} rotation={[0, 0.35, 0]} />

      {/* ── Three Connected Commercial Shops ── */}
      <ThreeConnectedCommercialShops />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CHARACTERS & ANIMATED SUSPICIOUS ACTIVITY                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* 1. FRIEND OF POLICE (INFORMER / OBSERVER) ── EXTREME LEFT SIDE ── */}
      <group position={[-5.5, 0.18, 0.6]} rotation={[0, 0.5, 0]}>
        <StylizedCharacter
          shirtColor="#fef08a"
          pantsColor="#334155"
          skinColor="#fcd34d"
          role="FRIEND_OF_POLICE"
          isObserving={true}
        />

        {/* Minimal Informer Observation Indicator (ONLY 'INFORMER OBSERVING' with clean leader pointer) */}
        <Html position={[0.3, 1.85, 0]} center pointerEvents="none">
          <div className="relative flex flex-col items-center select-none animate-in fade-in duration-300">
            <div className="px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-indigo-400 shadow-md flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black tracking-wider text-white uppercase drop-shadow">
                INFORMER OBSERVING
              </span>
            </div>
            {/* Small pointer directed down towards the informer */}
            <div className="w-0 h-0 border-t-[5px] border-t-slate-900/90 border-x-[4px] border-x-transparent -mt-[1px] -ml-4" />
          </div>
        </Html>
      </group>

      {/* 2. DRUG SELLER (RAJU) ── OUTSIDE RIGHTMOST TEA SHOP ── */}
      <group position={[3.8, 0.18, -1.6]} rotation={[0, -0.6, 0]}>
        <StylizedCharacter
          shirtColor="#dc2626"
          pantsColor="#0f172a"
          skinColor="#fcd34d"
          hairColor="#0f172a"
          role="SUSPECT"
          isTalking={cust1Active || cust2Active}
          isObserving={!cust1Active && !cust2Active}
        />

        {/* Small Fictional White Packet Prop held in Raju's hand during deal */}
        {rajuHandExtended && (
          <mesh position={[-0.32, 0.85, 0.35]}>
            <boxGeometry args={[0.08, 0.05, 0.1]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} emissive="#f8fafc" emissiveIntensity={0.5} />
          </mesh>
        )}
      </group>

      {/* 3. ANIMATED CUSTOMER 1 (First Transaction) */}
      {cust1Active && (
        <group position={cust1Pos} rotation={cust1Rot}>
          <StylizedCharacter
            shirtColor="#0284c7"
            pantsColor="#78716c"
            skinColor="#fcd34d"
            role="FRIEND_OF_POLICE"
            isObserving={true}
          />
          {/* White packet in Customer 1's hand after transfer */}
          {cust1HasPacket && (
            <mesh position={[0.26, 0.72, 0.1]}>
              <boxGeometry args={[0.07, 0.05, 0.09]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          )}
        </group>
      )}

      {/* 4. ANIMATED CUSTOMER 2 (Second Transaction) */}
      {cust2Active && (
        <group position={cust2Pos} rotation={cust2Rot}>
          <StylizedCharacter
            shirtColor="#16a34a"
            pantsColor="#ca8a04"
            skinColor="#fcd34d"
            role="FRIEND_OF_POLICE"
            isObserving={true}
          />
          {/* White packet in Customer 2's hand after transfer */}
          {cust2HasPacket && (
            <mesh position={[0.26, 0.72, 0.1]}>
              <boxGeometry args={[0.07, 0.05, 0.09]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}


// ── Seated & Writing Character (Friend of Police at Study Desk) ──
function SeatedWritingCharacter({
  shirtColor = "#fef08a",
  pantsColor = "#334155",
  skinColor = "#fcd34d",
  hairColor = "#1e293b",
}: {
  shirtColor?: string;
  pantsColor?: string;
  skinColor?: string;
  hairColor?: string;
}) {
  const headRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Subtle head movement while writing and reviewing notes
    if (headRef.current) {
      headRef.current.rotation.x = -0.28 + Math.sin(t * 2) * 0.025;
      headRef.current.rotation.y = Math.sin(t * 1.5) * 0.04;
      headRef.current.rotation.z = Math.cos(t * 1.8) * 0.02;
    }
    // Dynamic handwriting scribbling motion across the open notebook
    if (rightHandRef.current) {
      rightHandRef.current.position.x = 0.12 + Math.sin(t * 8) * 0.025;
      rightHandRef.current.position.z = 0.36 + Math.cos(t * 11) * 0.02;
      rightHandRef.current.rotation.y = Math.sin(t * 8) * 0.08;
    }
    // Subtle upper-body breathing posture movement
    if (torsoRef.current) {
      torsoRef.current.rotation.x = -0.12 + Math.sin(t * 1.8) * 0.012;
    }
  });

  return (
    <group rotation={[0, Math.PI, 0]}>
      {/* ── Pelvis / Seated Hips on Chair ── */}
      <mesh position={[0, 0.49, 0]} castShadow>
        <boxGeometry args={[0.36, 0.12, 0.24]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>

      {/* ── Horizontal Thighs Extending Forward Under the Desk ── */}
      <mesh position={[-0.1, 0.46, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.07, 0.38, 12]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.1, 0.46, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.07, 0.38, 12]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>

      {/* ── Vertical Lower Legs (Shins) Dropping Down to Floor ── */}
      <mesh position={[-0.1, 0.23, 0.37]} castShadow>
        <cylinderGeometry args={[0.065, 0.06, 0.44, 12]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.1, 0.23, 0.37]} castShadow>
        <cylinderGeometry args={[0.065, 0.06, 0.44, 12]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>

      {/* ── Shoes Flat on the Floor Under Desk ── */}
      <mesh position={[-0.1, 0.03, 0.42]} castShadow>
        <boxGeometry args={[0.11, 0.06, 0.18]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.1, 0.03, 0.42]} castShadow>
        <boxGeometry args={[0.11, 0.06, 0.18]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* ── Torso (Inclined Attentively Towards Desk) ── */}
      <group ref={torsoRef} position={[0, 0.55, 0]}>
        <mesh position={[0, 0.26, 0]} castShadow>
          <boxGeometry args={[0.38, 0.52, 0.22]} />
          <meshStandardMaterial color={shirtColor} roughness={0.6} />
        </mesh>

        {/* ── Head & Hair (Tilted Down Towards Notebook) ── */}
        <group ref={headRef} position={[0, 0.65, 0.02]}>
          <mesh castShadow>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
          {/* Hair */}
          <mesh position={[0, 0.08, -0.02]}>
            <sphereGeometry args={[0.19, 14, 14]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          {/* Eyes Looking Down at the Paper */}
          <mesh position={[-0.06, -0.02, 0.16]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.06, -0.02, 0.16]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
        </group>

        {/* ── Left Arm Resting on Desk Steadying Secret Message ── */}
        <group position={[-0.24, 0.42, 0]}>
          <mesh position={[-0.04, -0.16, 0.12]} rotation={[0.9, 0, 0.2]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.36, 10]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
          <mesh position={[-0.06, -0.28, 0.28]} rotation={[1.5, 0, 0.3]} castShadow>
            <cylinderGeometry args={[0.05, 0.045, 0.28, 10]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
          <mesh position={[-0.08, -0.28, 0.38]}>
            <boxGeometry args={[0.07, 0.03, 0.09]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
        </group>

        {/* ── Right Arm Extending Forward to Desk Surface ── */}
        <group position={[0.24, 0.42, 0]}>
          <mesh position={[0.04, -0.16, 0.12]} rotation={[0.85, 0, -0.2]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.36, 10]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
          <mesh position={[0.02, -0.28, 0.28]} rotation={[1.4, 0, -0.25]} castShadow>
            <cylinderGeometry args={[0.05, 0.045, 0.28, 10]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
        </group>
      </group>

      {/* ── Animated Handwriting Hand & Pen Prop on Desk ── */}
      <group ref={rightHandRef} position={[0.12, 0.88, 0.36]}>
        {/* Hand */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        {/* Pen in Hand */}
        <mesh position={[0.02, 0.02, -0.02]} rotation={[0.4, 0.2, 0.6]}>
          <cylinderGeometry args={[0.008, 0.006, 0.16, 8]} />
          <meshStandardMaterial color="#0284c7" metalness={0.7} />
        </mesh>
        {/* Pen Tip on Notebook */}
        <mesh position={[0.05, -0.03, -0.05]} rotation={[0.4, 0.2, 0.6]}>
          <coneGeometry args={[0.008, 0.025, 8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ── Scene 3: Realistic 3D Indian Home Interior (Study Desk, Bed, TV, Doors, Window) ──
function HomeStudyEnvironment() {
  return (
    <group>
      {/* ── Floor: Realistic Warm Sandstone Ceramic Tiles with Grout ── */}
      <mesh position={[0, -0.01, -0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6.2, 7.2]} />
        <meshStandardMaterial color="#e5ddd0" roughness={0.7} />
      </mesh>

      {/* Tile Grout Grid Pattern (0.8m grid) */}
      {[-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4].map((gx, gi) => (
        <mesh key={`gx-${gi}`} position={[gx, 0.001, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.015, 7.2]} />
          <meshBasicMaterial color="#c5b9a8" />
        </mesh>
      ))}
      {[-3.6, -2.8, -2.0, -1.2, -0.4, 0.4, 1.2, 2.0, 2.8].map((gz, gj) => (
        <mesh key={`gz-${gj}`} position={[0, 0.001, gz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6.2, 0.015]} />
          <meshBasicMaterial color="#c5b9a8" />
        </mesh>
      ))}

      {/* ── Room Walls (Warm Cream / Eggshell) ── */}
      {/* Back Wall */}
      <mesh position={[0, 1.8, -4.05]} receiveShadow>
        <boxGeometry args={[6.2, 3.6, 0.1]} />
        <meshStandardMaterial color="#faf6ee" roughness={0.9} />
      </mesh>
      {/* Left Wall */}
      <mesh position={[-3.05, 1.8, -0.5]} receiveShadow>
        <boxGeometry args={[0.1, 3.6, 7.2]} />
        <meshStandardMaterial color="#f7f3e8" roughness={0.9} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[3.05, 1.8, -0.5]} receiveShadow>
        <boxGeometry args={[0.1, 3.6, 7.2]} />
        <meshStandardMaterial color="#f7f3e8" roughness={0.9} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 3.6, -0.5]}>
        <boxGeometry args={[6.2, 0.08, 7.2]} />
        <meshStandardMaterial color="#fcfbf9" roughness={0.95} />
      </mesh>

      {/* Wooden Skirting Boards along Wall Perimeters */}
      <mesh position={[0, 0.06, -3.98]}>
        <boxGeometry args={[6.0, 0.12, 0.03]} />
        <meshStandardMaterial color="#573a27" roughness={0.7} />
      </mesh>
      <mesh position={[-2.98, 0.06, -0.5]}>
        <boxGeometry args={[0.03, 0.12, 7.0]} />
        <meshStandardMaterial color="#573a27" roughness={0.7} />
      </mesh>
      <mesh position={[2.98, 0.06, -0.5]}>
        <boxGeometry args={[0.03, 0.12, 7.0]} />
        <meshStandardMaterial color="#573a27" roughness={0.7} />
      </mesh>

      {/* ── Ceiling Fan with Central Downrod ── */}
      <group position={[0, 3.3, -1.0]}>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 0.1, 14]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
        </mesh>
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, ai) => (
          <group key={`fan-blade-${ai}`} rotation={[0, angle, 0]}>
            <mesh position={[0.55, 0, 0]}>
              <boxGeometry args={[0.85, 0.015, 0.14]} />
              <meshStandardMaterial color="#475569" roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── B. Left Side: Interior Door Leading to Another Room ── */}
      <group position={[-2.96, 0, -1.0]}>
        {/* Door Frame */}
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[0.08, 2.3, 1.1]} />
          <meshStandardMaterial color="#451a03" roughness={0.6} />
        </mesh>
        {/* Door Leaf (Recessed Wooden Panel) */}
        <mesh position={[0.02, 1.13, 0]} castShadow>
          <boxGeometry args={[0.04, 2.22, 1.0]} />
          <meshStandardMaterial color="#78350f" roughness={0.5} />
        </mesh>
        {/* Door Panels Molding Details */}
        {[-0.5, 0.5].map((py, pi) => (
          <mesh key={`door-p-${pi}`} position={[0.045, 1.13 + py * 0.55, 0]}>
            <boxGeometry args={[0.015, 0.75, 0.7]} />
            <meshStandardMaterial color="#573a27" roughness={0.6} />
          </mesh>
        ))}
        {/* Metallic Door Handle with Backplate */}
        <group position={[0.05, 1.05, 0.38]}>
          <mesh>
            <boxGeometry args={[0.01, 0.16, 0.04]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0.03, 0, -0.04]}>
            <cylinderGeometry args={[0.012, 0.012, 0.1, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* ── Left-Back: Wooden Bookshelf / Storage Unit ── */}
      <group position={[-2.65, 0, -2.6]}>
        {/* Outer Wooden Shell */}
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.42, 2.2, 1.15]} />
          <meshStandardMaterial color="#573a27" roughness={0.6} />
        </mesh>
        {/* Shelves & Books */}
        {[-0.6, -0.15, 0.35, 0.8].map((sy, si) => (
          <group key={`shelf-${si}`} position={[0.02, 1.1 + sy, 0]}>
            <mesh>
              <boxGeometry args={[0.38, 0.03, 1.08]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
            {/* Colorful Books on Shelf */}
            {[-0.35, -0.12, 0.1, 0.32].map((bx, bi) => (
              <mesh key={`book-${bi}`} position={[0, 0.14, bx]}>
                <boxGeometry args={[0.26, 0.25, 0.16]} />
                <meshStandardMaterial
                  color={["#1e3a8a", "#b91c1c", "#15803d", "#d97706", "#7c3aed"][((si * 4) + bi) % 5]}
                  roughness={0.7}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* ── C. Back Wall: Main Entrance Door ── */}
      <group position={[1.6, 0, -3.96]}>
        {/* Heavy Teak Door Frame */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[1.2, 2.4, 0.08]} />
          <meshStandardMaterial color="#451a03" roughness={0.6} />
        </mesh>
        {/* Main Door Leaf */}
        <mesh position={[0, 1.18, 0.02]} castShadow>
          <boxGeometry args={[1.1, 2.32, 0.05]} />
          <meshStandardMaterial color="#5c2e0b" roughness={0.5} />
        </mesh>
        {/* 6 Decorative Raised Moulded Panels */}
        {[-0.65, 0, 0.65].map((my, mi) =>
          [-0.25, 0.25].map((mx, mxi) => (
            <mesh key={`mp-${mi}-${mxi}`} position={[mx, 1.18 + my, 0.05]}>
              <boxGeometry args={[0.35, 0.45, 0.015]} />
              <meshStandardMaterial color="#451a03" roughness={0.6} />
            </mesh>
          ))
        )}
        {/* Polished Brass Handle & Security Latch Lock */}
        <group position={[-0.42, 1.1, 0.06]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.05, 0.22, 0.015]} />
            <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0, 0.03]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.11, 8]} />
            <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.03, 8]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ── Back Wall: Window, Curtains & Natural Daylight ── */}
      <group position={[-1.2, 2.2, -3.96]}>
        {/* Window Wooden Frame */}
        <mesh>
          <boxGeometry args={[1.8, 1.6, 0.08]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Glass Panes */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[1.68, 1.48]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            transmission={0.85}
            roughness={0.05}
            reflectivity={0.9}
            transparent
            opacity={0.7}
          />
        </mesh>
        {/* Window Crossbar Grille */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[1.68, 0.04, 0.02]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.04, 1.48, 0.02]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {/* Curtain Rod */}
        <mesh position={[0, 0.9, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 2.2, 10]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.8} />
        </mesh>
        {/* Curtains Drapes on Left and Right */}
        <mesh position={[-0.95, 0, 0.08]} castShadow>
          <boxGeometry args={[0.35, 1.8, 0.1]} />
          <meshStandardMaterial color="#991b1b" roughness={0.9} />
        </mesh>
        <mesh position={[0.95, 0, 0.08]} castShadow>
          <boxGeometry args={[0.35, 1.8, 0.1]} />
          <meshStandardMaterial color="#991b1b" roughness={0.9} />
        </mesh>
        {/* Direct Daylight Streaming Light */}
        <directionalLight position={[0, 2, 1]} intensity={0.8} color="#fef9c3" />
      </group>

      {/* ── Back Wall: Wall Clock ── */}
      <group position={[0.2, 2.9, -3.96]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.04, 20]} />
          <meshStandardMaterial color="#573a27" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <circleGeometry args={[0.2, 20]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        {/* Hour & Minute Hands */}
        <mesh position={[0.02, 0.05, 0.03]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.015, 0.11, 0.005]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[-0.04, 0.02, 0.03]} rotation={[0, 0, 1.2]}>
          <boxGeometry args={[0.01, 0.15, 0.005]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* ── D. Right Side: Television Area & Console ── */}
      <group position={[2.65, 0, -0.8]}>
        {/* Low-Profile Wooden TV Cabinet / Credenza */}
        <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.52, 1.8]} />
          <meshStandardMaterial color="#573a27" roughness={0.5} />
        </mesh>
        {/* Cabinet Doors with Brass Knobs */}
        {[-0.55, 0.55].map((kz, ki) => (
          <mesh key={`knob-${ki}`} position={[-0.26, 0.28, kz]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#eab308" metalness={0.9} />
          </mesh>
        ))}
        {/* Set-top Box on Console */}
        <mesh position={[0, 0.54, 0]}>
          <boxGeometry args={[0.3, 0.045, 0.45]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        {/* Small Decorative Ceramic Pot on TV Console */}
        <mesh position={[0, 0.6, 0.65]}>
          <cylinderGeometry args={[0.06, 0.08, 0.16, 10]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
      </group>

      {/* Flat-Screen Television on Right Wall */}
      <group position={[2.96, 1.55, -0.8]} rotation={[0, -Math.PI / 2, 0]}>
        {/* TV Outer Slim Frame */}
        <mesh castShadow>
          <boxGeometry args={[1.65, 0.98, 0.06]} />
          <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* TV Glossy Screen Glass */}
        <mesh position={[0, 0, 0.032]}>
          <planeGeometry args={[1.56, 0.89]} />
          <meshPhysicalMaterial
            color="#0f172a"
            roughness={0.1}
            metalness={0.8}
            reflectivity={0.9}
          />
        </mesh>
        {/* Green Power LED */}
        <mesh position={[0.72, -0.44, 0.035]}>
          <boxGeometry args={[0.015, 0.015, 0.005]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      </group>

      {/* ── E. Bedroom Area: Bed Facing Television ── */}
      <group position={[0.6, 0, -0.8]}>
        {/* Wooden Headboard on Left Side */}
        <mesh position={[-0.65, 0.55, 0]} castShadow>
          <boxGeometry args={[0.08, 1.1, 1.6]} />
          <meshStandardMaterial color="#451a03" roughness={0.6} />
        </mesh>
        {/* Bed Wooden Base Frame */}
        <mesh position={[0.25, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.75, 0.32, 1.5]} />
          <meshStandardMaterial color="#573a27" roughness={0.6} />
        </mesh>
        {/* Thick Comfortable Mattress */}
        <mesh position={[0.25, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.22, 1.44]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.9} />
        </mesh>
        {/* Fitted Bedsheet (Warm Navy Fabric) */}
        <mesh position={[0.25, 0.54, 0]}>
          <boxGeometry args={[1.68, 0.04, 1.42]} />
          <meshStandardMaterial color="#334155" roughness={0.85} />
        </mesh>
        {/* Two Soft Pillows at Headboard */}
        {[-0.38, 0.38].map((pz, pi) => (
          <mesh key={`pillow-${pi}`} position={[-0.45, 0.6, pz]} rotation={[0, 0, -0.15]} castShadow>
            <boxGeometry args={[0.3, 0.12, 0.5]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
          </mesh>
        ))}
        {/* Folded Blanket / Quilt at Foot of Bed */}
        <mesh position={[0.85, 0.58, 0]} castShadow>
          <boxGeometry args={[0.42, 0.08, 1.4]} />
          <meshStandardMaterial color="#991b1b" roughness={0.9} />
        </mesh>
      </group>

      {/* ── F. Study Desk, Chair & Seated Friend of Police ── */}
      <group position={[-1.2, 0, -2.2]} rotation={[0, -0.15, 0]}>
        {/* Solid Wooden Study Desk (Positioned directly in front of character) */}
        <group position={[0, 0, -0.45]}>
          {/* Tabletop */}
          <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.65, 0.06, 0.85]} />
            <meshStandardMaterial color="#854d0e" roughness={0.5} />
          </mesh>

          {/* Left Table Legs */}
          {[-0.34, 0.34].map((lz, li) => (
            <mesh key={`desk-l-${li}`} position={[-0.74, 0.42, lz]} castShadow>
              <boxGeometry args={[0.06, 0.82, 0.06]} />
              <meshStandardMaterial color="#573a27" roughness={0.7} />
            </mesh>
          ))}

          {/* Right Pedestal with 3 Drawers */}
          <mesh position={[0.56, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.48, 0.82, 0.78]} />
            <meshStandardMaterial color="#713f12" roughness={0.6} />
          </mesh>
          {[0.2, 0.45, 0.7].map((dy, di) => (
            <mesh key={`dp-${di}`} position={[0.56, dy, 0.4]}>
              <boxGeometry args={[0.12, 0.02, 0.02]} />
              <meshStandardMaterial color="#eab308" metalness={0.9} />
            </mesh>
          ))}

          {/* Open Notebook directly under right writing hand */}
          <mesh position={[0.12, 0.885, 0.14]} rotation={[-Math.PI / 2, 0, 0.05]} receiveShadow>
            <planeGeometry args={[0.38, 0.28]} />
            <meshStandardMaterial color="#fef08a" roughness={0.8} />
          </mesh>
          {/* Ruled lines on notebook */}
          {[-0.08, -0.04, 0, 0.04, 0.08].map((ly, lidx) => (
            <mesh key={`nl-${lidx}`} position={[0.12, 0.887, 0.14 + ly]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.32, 0.006]} />
              <meshBasicMaterial color="#94a3b8" />
            </mesh>
          ))}

          {/* Blank Secret Message Paper Sheet under left resting hand */}
          <mesh position={[-0.32, 0.885, 0.12]} rotation={[-Math.PI / 2, 0, -0.06]} receiveShadow>
            <planeGeometry args={[0.34, 0.26]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>

          {/* Pen Holder Cup with Pens */}
          <group position={[-0.62, 0.88, -0.22]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.16, 10]} />
              <meshStandardMaterial color="#334155" metalness={0.6} />
            </mesh>
            <mesh position={[0.01, 0.16, 0]} rotation={[0.2, 0, 0.2]}>
              <cylinderGeometry args={[0.006, 0.006, 0.2, 8]} />
              <meshStandardMaterial color="#0284c7" />
            </mesh>
          </group>

          {/* Brass Desk Lamp with Local Lighting */}
          <group position={[0.56, 0.88, -0.2]}>
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 0.03, 12]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.4, 8]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.8} />
            </mesh>
            <mesh position={[-0.1, 0.42, 0.06]} rotation={[0.3, 0, 0.5]}>
              <coneGeometry args={[0.12, 0.18, 12]} />
              <meshStandardMaterial color="#eab308" metalness={0.7} />
            </mesh>
            <pointLight position={[-0.1, 0.36, 0.06]} intensity={1.8} color="#fef08a" distance={2.5} />
          </group>
        </group>

        {/* Study Chair placed directly behind the character */}
        <group position={[0, 0, 0.15]}>
          {/* Chair Seat */}
          <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.05, 0.48]} />
            <meshStandardMaterial color="#573a27" roughness={0.6} />
          </mesh>
          {/* Cushioned Seat Pad */}
          <mesh position={[0, 0.47, 0]}>
            <boxGeometry args={[0.44, 0.03, 0.42]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          {/* Chair Backrest - behind character (at +Z) */}
          <mesh position={[0, 0.86, 0.22]} castShadow>
            <boxGeometry args={[0.44, 0.65, 0.04]} />
            <meshStandardMaterial color="#78350f" roughness={0.6} />
          </mesh>
          {/* 4 Wooden Chair Legs */}
          {[-0.21, 0.21].map((cx, ci) =>
            [-0.19, 0.19].map((cz, cj) => (
              <mesh key={`chair-leg-${ci}-${cj}`} position={[cx, 0.22, cz]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 0.44, 8]} />
                <meshStandardMaterial color="#3f2e21" />
              </mesh>
            ))
          )}
        </group>

        {/* Seated Friend of Police Character facing towards the desk (-Z) */}
        <group position={[0, 0, 0.1]}>
          <SeatedWritingCharacter
            shirtColor="#fef08a"
            pantsColor="#334155"
            skinColor="#fcd34d"
            hairColor="#1e293b"
          />
        </group>
      </group>

      {/* ── Indoor Potted Plant in Corner ── */}
      <group position={[-2.4, 0, -3.5]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.12, 0.44, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <sphereGeometry args={[0.26, 8, 8]} />
          <meshStandardMaterial color="#15803d" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// ── Scene 4: 3D Police Station Environment & Characters ──

// ── Right Side Jail Compartment (Holding Cell) ──
function JailHoldingCell() {
  const barCount = 14;
  const barZStart = -3.0;
  const barZEnd = 0.4;
  const barSpacing = (barZEnd - barZStart) / barCount;

  return (
    <group>
      {/* Dark Concrete Floor for Cell */}
      <mesh position={[3.4, 0.005, -1.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.0, 3.8]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* Back & Right Walls of Jail Cell */}
      <mesh position={[3.4, 1.8, -3.15]}>
        <boxGeometry args={[3.0, 3.6, 0.2]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[4.85, 1.8, -1.3]}>
        <boxGeometry args={[0.2, 3.6, 3.8]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[3.4, 1.8, 0.55]}>
        <boxGeometry args={[3.0, 3.6, 0.2]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Vertical Metal Bars along X = 2.0 */}
      {Array.from({ length: barCount + 1 }).map((_, i) => {
        const z = barZStart + i * barSpacing;
        return (
          <mesh key={i} position={[2.0, 1.8, z]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 3.6, 10]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
          </mesh>
        );
      })}

      {/* Horizontal Reinforcing Beams */}
      {[0.15, 1.8, 3.4].map((y, i) => (
        <mesh key={i} position={[2.0, y, -1.3]} castShadow>
          <boxGeometry args={[0.06, 0.06, 3.55]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Cell Gate Frame & Lock Mechanism */}
      <group position={[2.0, 1.8, -1.0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.08, 0.18, 0.14]} />
          <meshStandardMaterial color="#334155" metalness={0.9} />
        </mesh>
        {/* Brass Padlock */}
        <mesh position={[-0.04, -0.09, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.06, 8]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Jail Signboard */}
      <group position={[2.0, 3.1, -1.3]}>
        <mesh>
          <boxGeometry args={[0.04, 0.28, 1.2]} />
          <meshStandardMaterial color="#7f1d1d" />
        </mesh>
        <Html position={[-0.03, 0, 0]} transform rotation={[0, -Math.PI / 2, 0]} scale={0.12} pointerEvents="none">
          <div className="bg-red-900 border border-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded tracking-widest text-center uppercase select-none">
            HOLDING CELL • RESTRICTED
          </div>
        </Html>
      </group>

      {/* Concrete Holding Cell Bench */}
      <mesh position={[3.6, 0.42, -1.8]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.08, 0.6]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      {/* Bench Legs */}
      {[-0.65, 0.65].map((bx) => (
        <mesh key={bx} position={[3.6 + bx, 0.21, -1.8]} castShadow>
          <boxGeometry args={[0.1, 0.42, 0.5]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ))}

      {/* Non-graphic Detained Suspect seated on bench */}
      <group position={[3.6, 0.46, -1.8]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Torso */}
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.34, 0.46, 0.2]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.7} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.78, 0]} castShadow>
          <sphereGeometry args={[0.14, 14, 14]} />
          <meshStandardMaterial color="#d4a373" roughness={0.7} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 0.84, -0.02]}>
          <sphereGeometry args={[0.145, 12, 12]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Seated Thighs */}
        <mesh position={[-0.09, 0.12, 0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.06, 0.38, 10]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        <mesh position={[0.09, 0.12, 0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.06, 0.38, 10]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        {/* Calves hanging down */}
        <mesh position={[-0.09, -0.16, 0.41]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.36, 10]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        <mesh position={[0.09, -0.16, 0.41]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.36, 10]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        {/* Hands on knees */}
        <mesh position={[-0.14, 0.22, 0.32]} rotation={[0.4, 0, -0.2]}>
          <cylinderGeometry args={[0.045, 0.04, 0.35, 10]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0.14, 0.22, 0.32]} rotation={[0.4, 0, 0.2]}>
          <cylinderGeometry args={[0.045, 0.04, 0.35, 10]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>

      {/* Dim cool light inside jail cell */}
      <pointLight position={[3.4, 2.8, -1.4]} intensity={0.5} distance={5} color="#94a3b8" />
    </group>
  );
}

// ── Main Police Inspector & Official Executive Desk (Realistic Standing, Walking & Stationary Chair) ──
function InspectorWorkstation({
  receivedCiphertext,
  isVerified,
  onInspectorExit,
}: {
  receivedCiphertext: string;
  isVerified: boolean;
  onInspectorExit?: () => void;
}) {
  const inspectorGroupRef = useRef<THREE.Group>(null);
  const inspectorTorsoRef = useRef<THREE.Group>(null);
  const inspectorHeadRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegGroupRef = useRef<THREE.Group>(null);
  const rightLegGroupRef = useRef<THREE.Group>(null);
  const verifiedStartTimeRef = useRef<number | null>(null);
  const exitTriggeredRef = useRef(false);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (!isVerified) {
      // Natural idle seated behavior while waiting for decryption verification
      if (inspectorHeadRef.current) {
        inspectorHeadRef.current.rotation.x = Math.sin(t * 1.5) * 0.04;
        inspectorHeadRef.current.rotation.y = Math.sin(t * 0.8) * 0.06;
      }
      return;
    }

    if (verifiedStartTimeRef.current === null) {
      verifiedStartTimeRef.current = t;
    }
    const elapsed = t - verifiedStartTimeRef.current;

    // STEP 1 & PHASE 1: Examining document & approving nod (0s to 1.2s)
    if (elapsed < 1.2) {
      if (inspectorHeadRef.current) {
        inspectorHeadRef.current.rotation.x = Math.sin(elapsed * 5) * 0.14;
        inspectorHeadRef.current.rotation.y = 0;
      }
      if (inspectorTorsoRef.current) {
        inspectorTorsoRef.current.rotation.x = 0;
        inspectorTorsoRef.current.rotation.y = 0;
      }
      if (leftLegGroupRef.current && rightLegGroupRef.current) {
        leftLegGroupRef.current.rotation.x = Math.PI / 2.3;
        rightLegGroupRef.current.rotation.x = Math.PI / 2.3;
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.set(0.72, 0, -0.15);
        rightArmRef.current.rotation.set(0.72, 0, 0.15);
      }
      if (inspectorGroupRef.current) {
        inspectorGroupRef.current.position.set(0, 0, -0.65);
        inspectorGroupRef.current.rotation.set(0, 0, 0);
      }
    }
    // STEP 1 & PHASE 2: Seated-to-Standing Transition (1.2s to 2.4s)
    // - Moves body forward slightly before standing (shifts center of mass over feet)
    // - Legs straighten to support body naturally
    // - Arms and hands move naturally down to sides
    // - Character body does NOT intersect with desk or stationary chair
    else if (elapsed >= 1.2 && elapsed < 2.4) {
      const standProgress = (elapsed - 1.2) / 1.2; // 0 to 1
      // Smoothstep easing for weight shift and natural kinetic rise
      const ease = standProgress * standProgress * (3 - 2 * standProgress);

      // 1. Torso leans forward during initial rise, then straightens upright
      const forwardLean = Math.sin(standProgress * Math.PI) * 0.18;
      if (inspectorTorsoRef.current) {
        inspectorTorsoRef.current.rotation.x = forwardLean;
        inspectorTorsoRef.current.rotation.y = 0;
      }
      if (inspectorHeadRef.current) {
        inspectorHeadRef.current.rotation.x = -forwardLean * 0.5; // Keeps eyes forward
        inspectorHeadRef.current.rotation.y = 0;
      }

      // 2. Body rises vertically and shifts slightly back to clear desk
      const riseY = ease * 0.16;
      const shiftZ = -0.65 - ease * 0.08;
      if (inspectorGroupRef.current) {
        inspectorGroupRef.current.position.set(0, riseY, shiftZ);
        inspectorGroupRef.current.rotation.set(0, 0, 0);
      }

      // 3. Legs unbend from 78 deg seated angle to 0 deg straight standing
      const legAngle = (1 - ease) * (Math.PI / 2.3);
      if (leftLegGroupRef.current && rightLegGroupRef.current) {
        leftLegGroupRef.current.rotation.x = legAngle;
        rightLegGroupRef.current.rotation.x = legAngle;
      }

      // 4. Arms move naturally from desk rest to standing posture at sides
      const armRestX = (1 - ease) * 0.72 + 0.08;
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.set(armRestX, 0, -0.12);
        rightArmRef.current.rotation.set(armRestX, 0, 0.12);
      }
    }
    // STEP 3 & PHASE 3: Natural Walking Animation towards Station Exit (2.4s onwards)
    // - Legs swing in alternating rhythm with proper hip stride
    // - Arms swing naturally in opposition to legs (left arm with right leg)
    // - Subtle vertical step bounce and posture sway
    // - Feet maintain proper floor contact
    // - Smooth rotation during turning (no snapping)
    else if (elapsed >= 2.4) {
      const walkElapsed = elapsed - 2.4;
      const walkFreq = 7.5;
      const legSwing = Math.sin(walkElapsed * walkFreq) * 0.36;

      // Realistic alternating leg strides
      if (leftLegGroupRef.current && rightLegGroupRef.current) {
        leftLegGroupRef.current.rotation.x = legSwing;
        rightLegGroupRef.current.rotation.x = -legSwing;
      }

      // Natural opposite arm swings
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.set(-legSwing * 0.75 + 0.06, 0, -0.12);
        rightArmRef.current.rotation.set(legSwing * 0.75 + 0.06, 0, 0.12);
      }

      // Postural body dynamics: natural vertical step bounce & torso sway
      const verticalBob = Math.abs(Math.sin(walkElapsed * walkFreq)) * 0.035;
      if (inspectorTorsoRef.current) {
        inspectorTorsoRef.current.rotation.x = 0.05; // Slight forward walking lean
        inspectorTorsoRef.current.rotation.y = Math.sin(walkElapsed * walkFreq) * 0.04;
      }
      if (inspectorHeadRef.current) {
        inspectorHeadRef.current.rotation.set(0, 0, 0);
      }

      // Two-stage smooth walking path to station exit:
      // Stage A (0 to 1.3s): Steps out from behind desk to the left aisle
      // Stage B (1.3s onwards): Strides towards the front-left exit doors
      if (inspectorGroupRef.current) {
        if (walkElapsed < 1.3) {
          const p = walkElapsed / 1.3;
          const easeP = p * p * (3 - 2 * p);
          const currentX = -easeP * 1.6;
          const currentZ = -0.73 - easeP * 0.14;
          const rotY = THREE.MathUtils.lerp(0, -Math.PI / 2, Math.min(1, p * 2.0));
          inspectorGroupRef.current.position.set(currentX, 0.16 + verticalBob, currentZ);
          inspectorGroupRef.current.rotation.set(0, rotY, 0);
        } else {
          const p = Math.min(1, (walkElapsed - 1.3) / 1.8);
          const easeP = p * p * (3 - 2 * p);
          const currentX = -1.6 - easeP * 1.8; // moves to -3.4
          const currentZ = -0.87 + easeP * 2.3; // moves to +1.43
          const rotY = THREE.MathUtils.lerp(-Math.PI / 2, -2.35, easeP);
          inspectorGroupRef.current.position.set(currentX, 0.16 + verticalBob, currentZ);
          inspectorGroupRef.current.rotation.set(0, rotY, 0);
        }
      }

      // STEP 4: While inspector walks away towards exit, trigger result page transition
      if (walkElapsed >= 2.8 && !exitTriggeredRef.current) {
        exitTriggeredRef.current = true;
        if (onInspectorExit) {
          onInspectorExit();
        }
      }
    }
  });

  return (
    <group position={[-0.2, 0, -0.8]}>
      {/* ── Main Executive Wooden Desk ── */}
      {/* Desktop */}
      <mesh position={[0, 0.88, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 0.08, 1.25]} />
        <meshStandardMaterial color="#4a2c17" roughness={0.4} />
      </mesh>
      {/* Side Pedestals / Drawers */}
      <mesh position={[-0.9, 0.44, 0]} castShadow>
        <boxGeometry args={[0.45, 0.84, 1.15]} />
        <meshStandardMaterial color="#3d2110" roughness={0.5} />
      </mesh>
      <mesh position={[0.9, 0.44, 0]} castShadow>
        <boxGeometry args={[0.45, 0.84, 1.15]} />
        <meshStandardMaterial color="#3d2110" roughness={0.5} />
      </mesh>
      {/* Brass Drawer Handles */}
      {[0.25, 0.5, 0.72].map((dy, i) => (
        <group key={i}>
          <mesh position={[-0.67, dy, 0.58]}>
            <boxGeometry args={[0.1, 0.02, 0.02]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.8} />
          </mesh>
          <mesh position={[0.67, dy, 0.58]}>
            <boxGeometry args={[0.1, 0.02, 0.02]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Modesty Panel */}
      <mesh position={[0, 0.5, 0.52]}>
        <boxGeometry args={[1.35, 0.72, 0.03]} />
        <meshStandardMaterial color="#3d2110" />
      </mesh>

      {/* ── Desk Equipment ── */}
      {/* Desktop Computer Monitor */}
      <group position={[-0.65, 0.92, -0.15]} rotation={[0, 0.3, 0]}>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.22, 0.02, 0.18]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.44, 0]} castShadow>
          <boxGeometry args={[0.78, 0.5, 0.04]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Police Terminal Display */}
        <mesh position={[0, 0.44, 0.022]}>
          <planeGeometry args={[0.74, 0.46]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* Office Telephone */}
      <group position={[0.65, 0.92, -0.2]} rotation={[0, -0.2, 0]}>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.22, 0.06, 0.24]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.08, 0.06, 0.28]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* Desk Lamp */}
      <group position={[0.75, 0.92, 0.2]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.08, 0.09, 0.04, 12]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.8} />
        </mesh>
        <mesh position={[-0.08, 0.48, 0]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.04, 0.12, 0.18, 12]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.8} />
        </mesh>
        <pointLight position={[-0.1, 0.42, 0]} intensity={1.2} distance={3.5} color="#fef08a" />
      </group>

      {/* Stack of Case Files / Documents */}
      <group position={[0.25, 0.92, 0.2]}>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.32, 0.04, 0.42]} />
          <meshStandardMaterial color="#fef08a" />
        </mesh>
        <mesh position={[0.02, 0.05, 0.01]} rotation={[0, 0.05, 0]}>
          <boxGeometry args={[0.32, 0.03, 0.42]} />
          <meshStandardMaterial color="#fed7aa" />
        </mesh>
      </group>

      {/* ── Official Confidential Physical Document on Desk ── */}
      <group position={[-0.1, 0.925, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh receiveShadow>
          <planeGeometry args={[0.62, 0.46]} />
          <meshStandardMaterial color="#fefce8" roughness={0.6} />
        </mesh>
        {/* Document Content */}
        <Html position={[0, 0, 0.005]} transform scale={0.062} pointerEvents="none">
          <div className="w-96 p-3 bg-amber-50/90 border border-amber-300 rounded shadow-md text-slate-800 font-sans select-none">
            <div className="flex items-center justify-between border-b border-amber-300/80 pb-1 mb-1.5">
              <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">CONFIDENTIAL REPORT</span>
              <span className="text-[9px] font-bold text-amber-800">SOURCE: FOP</span>
            </div>
            <div className="text-[9px] font-black uppercase text-slate-600 mb-1">
              ENCRYPTED CIPHERTEXT (AFFINE a=5, b=9):
            </div>
            <div className="p-2 bg-white rounded border border-amber-200 font-mono font-black text-xs text-indigo-950 tracking-wider break-all shadow-inner">
              {receivedCiphertext}
            </div>
            <div className="text-[8px] font-bold text-emerald-800 mt-1.5 text-center uppercase tracking-wide">
              TAMIL NADU POLICE • OFFICIAL RECORD
            </div>
          </div>
        </Html>
      </group>

      {/* ── STEP 2: CHAIR MUST REMAIN STATIONARY (SEPARATE FROM INSPECTOR GROUP) ── */}
      {/* The chair stays permanently beside the desk and never moves, rotates, or follows the inspector */}
      <group position={[0, 0, -0.75]}>
        {/* Seat cushion */}
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.56, 0.08, 0.52]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        {/* Chair backrest */}
        <mesh position={[0, 0.9, -0.22]} castShadow>
          <boxGeometry args={[0.54, 0.75, 0.08]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        {/* Chair armrests */}
        <mesh position={[-0.26, 0.68, 0]} castShadow>
          <boxGeometry args={[0.06, 0.04, 0.42]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.26, 0.68, 0]} castShadow>
          <boxGeometry args={[0.06, 0.04, 0.42]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Central hydraulic pedestal */}
        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.48, 12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* 5-star caster base */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.3, 0.32, 0.04, 10]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
      </group>

      {/* ── Main Police Inspector Character (Dedicated Animation Hierarchy) ── */}
      <group ref={inspectorGroupRef} position={[0, 0, -0.65]}>
        {/* Torso in Khaki Tunic & Belt Accessories */}
        <group ref={inspectorTorsoRef} position={[0, 0.98, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.54, 0.24]} />
            <meshStandardMaterial color="#c69d58" roughness={0.6} />
          </mesh>
          {/* Sam Browne Dark Brown Leather Belt */}
          <mesh position={[0, -0.26, 0]}>
            <boxGeometry args={[0.44, 0.08, 0.25]} />
            <meshStandardMaterial color="#3d2110" />
          </mesh>
          {/* Belt Buckle */}
          <mesh position={[0, -0.26, 0.13]}>
            <boxGeometry args={[0.08, 0.06, 0.02]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.9} />
          </mesh>
          {/* Diagonal Shoulder Belt Strap */}
          <mesh position={[-0.04, 0, 0.125]} rotation={[0, 0, -0.45]}>
            <boxGeometry args={[0.05, 0.56, 0.015]} />
            <meshStandardMaterial color="#3d2110" />
          </mesh>
          {/* Shoulder Epaulets with 3 Gold Stars each */}
          <mesh position={[-0.22, 0.24, 0]}><boxGeometry args={[0.1, 0.02, 0.16]} /><meshStandardMaterial color="#c69d58" /></mesh>
          <mesh position={[-0.22, 0.255, 0]}><boxGeometry args={[0.06, 0.015, 0.12]} /><meshStandardMaterial color="#ca8a04" metalness={0.9} /></mesh>
          <mesh position={[0.22, 0.24, 0]}><boxGeometry args={[0.1, 0.02, 0.16]} /><meshStandardMaterial color="#c69d58" /></mesh>
          <mesh position={[0.22, 0.255, 0]}><boxGeometry args={[0.06, 0.015, 0.12]} /><meshStandardMaterial color="#ca8a04" metalness={0.9} /></mesh>
        </group>

        {/* Articulated Left Arm (Shoulder Pivot) */}
        <group ref={leftArmRef} position={[-0.26, 1.15, 0]}>
          <mesh position={[0, -0.11, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.22, 10]} />
            <meshStandardMaterial color="#c69d58" />
          </mesh>
          <mesh position={[0, -0.31, 0.04]} rotation={[0.4, 0, 0]} castShadow>
            <cylinderGeometry args={[0.048, 0.042, 0.22, 10]} />
            <meshStandardMaterial color="#c69d58" />
          </mesh>
          {/* Left Hand */}
          <mesh position={[0, -0.42, 0.12]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#fcd34d" />
          </mesh>
        </group>

        {/* Articulated Right Arm (Shoulder Pivot) */}
        <group ref={rightArmRef} position={[0.26, 1.15, 0]}>
          <mesh position={[0, -0.11, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.22, 10]} />
            <meshStandardMaterial color="#c69d58" />
          </mesh>
          <mesh position={[0, -0.31, 0.04]} rotation={[0.4, 0, 0]} castShadow>
            <cylinderGeometry args={[0.048, 0.042, 0.22, 10]} />
            <meshStandardMaterial color="#c69d58" />
          </mesh>
          {/* Right Hand */}
          <mesh position={[0, -0.42, 0.12]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#fcd34d" />
          </mesh>
        </group>

        {/* Articulated Left Leg (Hip Joint Pivot) */}
        <group ref={leftLegGroupRef} position={[-0.13, 0.65, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.07, 0.32, 10]} />
            <meshStandardMaterial color="#9f7a35" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.44, 0]} castShadow>
            <cylinderGeometry args={[0.068, 0.062, 0.28, 10]} />
            <meshStandardMaterial color="#9f7a35" roughness={0.7} />
          </mesh>
          {/* Left Boot */}
          <mesh position={[0, -0.58, 0.04]} castShadow>
            <boxGeometry args={[0.11, 0.08, 0.22]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>

        {/* Articulated Right Leg (Hip Joint Pivot) */}
        <group ref={rightLegGroupRef} position={[0.13, 0.65, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.07, 0.32, 10]} />
            <meshStandardMaterial color="#9f7a35" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.44, 0]} castShadow>
            <cylinderGeometry args={[0.068, 0.062, 0.28, 10]} />
            <meshStandardMaterial color="#9f7a35" roughness={0.7} />
          </mesh>
          {/* Right Boot */}
          <mesh position={[0, -0.58, 0.04]} castShadow>
            <boxGeometry args={[0.11, 0.08, 0.22]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>

        {/* Head & Face */}
        <group ref={inspectorHeadRef} position={[0, 1.45, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#fcd34d" roughness={0.7} />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.06, 0.02, 0.16]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.06, 0.02, 0.16]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Mustache */}
          <mesh position={[0, -0.04, 0.17]}>
            <boxGeometry args={[0.12, 0.025, 0.02]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* Police Peaked Cap */}
          <group position={[0, 0.12, 0.02]}>
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.2, 0.18, 0.14, 16]} />
              <meshStandardMaterial color="#854d0e" roughness={0.5} />
            </mesh>
            {/* Cap Visor / Peak */}
            <mesh position={[0, 0.02, 0.14]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.22, 0.02, 0.12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} />
            </mesh>
            {/* Gold Police Cap Badge */}
            <mesh position={[0, 0.08, 0.19]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.9} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// ── Animated Courier Delivering Sealed Envelope Without Desk Collisions ──
function AnimatedCourier({ onDelivered }: { onDelivered?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const deliveredRef = useRef(false);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      // Approach Phase: t = 0 to 3.8s
      // Walks from entrance [-3.2, 0, 1.8] to comfortably in FRONT of desk [-0.4, 0, 0.5]
      // Desk front edge is at Z = -0.175, so Z = 0.5 gives 67cm of clearance!
      if (t < 3.8) {
        const progress = t / 3.8;
        const x = -3.2 + progress * 2.8;
        const z = 1.8 - progress * 1.3;
        groupRef.current.position.set(x, 0, z);
        groupRef.current.rotation.y = 2.0;

        const legAngle = Math.sin(t * 8) * 0.35;
        if (leftLegRef.current) leftLegRef.current.rotation.x = legAngle;
        if (rightLegRef.current) rightLegRef.current.rotation.x = -legAngle;

        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -0.6 + Math.sin(t * 8) * 0.06;
          rightArmRef.current.rotation.y = 0;
        }
      }
      // Delivery Phase: t = 3.8 to 5.2s
      // Stopped in front of desk, facing inspector, extending arm forward across desk
      else if (t >= 3.8 && t < 5.2) {
        groupRef.current.position.set(-0.4, 0, 0.5);
        groupRef.current.rotation.y = 0.05;

        if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
        if (rightLegRef.current) rightLegRef.current.rotation.x = 0;

        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -1.25;
          rightArmRef.current.rotation.y = -0.1;
        }

        // Trigger envelope handover & paper popup at t = 4.4s
        if (t >= 4.4 && !deliveredRef.current) {
          deliveredRef.current = true;
          if (onDelivered) {
            onDelivered();
          }
        }
      }
      // Step-back Phase: t = 5.2 to 6.8s
      // Steps back and to the side to [-1.4, 0, 0.9], standing at attention
      else if (t >= 5.2 && t < 6.8) {
        const backProgress = (t - 5.2) / 1.6;
        const x = -0.4 - backProgress * 1.0;
        const z = 0.5 + backProgress * 0.4;
        groupRef.current.position.set(x, 0, z);
        groupRef.current.rotation.y = 0.8;

        const legAngle = Math.sin(t * 6) * 0.22;
        if (leftLegRef.current) leftLegRef.current.rotation.x = legAngle;
        if (rightLegRef.current) rightLegRef.current.rotation.x = -legAngle;

        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -0.2;
          rightArmRef.current.rotation.y = 0;
        }
      }
      // Standing at Attention Phase: t >= 6.8s
      else {
        groupRef.current.position.set(-1.4, 0, 0.9);
        groupRef.current.rotation.y = 1.0;
        if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
        if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = 0;
          rightArmRef.current.rotation.y = 0;
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={[-3.2, 0, 1.8]}>
      {/* Khaki Tunic */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.38, 0.52, 0.22]} />
        <meshStandardMaterial color="#c69d58" roughness={0.6} />
      </mesh>
      {/* Belt */}
      <mesh position={[0, 0.64, 0]}>
        <boxGeometry args={[0.4, 0.08, 0.23]} />
        <meshStandardMaterial color="#3d2110" />
      </mesh>
      {/* Left Arm */}
      <mesh position={[-0.25, 0.88, 0]} rotation={[0, 0, 0.15]} castShadow>
        <cylinderGeometry args={[0.06, 0.055, 0.44, 10]} />
        <meshStandardMaterial color="#c69d58" />
      </mesh>

      {/* Right Arm (Carrying / Handing Envelope) */}
      <group ref={rightArmRef} position={[0.25, 1.05, 0]}>
        <mesh position={[0.03, -0.2, 0.12]} rotation={[-0.6, 0, -0.15]} castShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.44, 10]} />
          <meshStandardMaterial color="#c69d58" />
        </mesh>
        <mesh position={[0.03, -0.38, 0.25]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
        {/* The Sealed Brown Envelope in Hand */}
        <group position={[0.03, -0.38, 0.34]} rotation={[0.4, 0.2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.28, 0.18, 0.02]} />
            <meshStandardMaterial color="#d97706" roughness={0.7} />
          </mesh>
          {/* Red Seal */}
          <mesh position={[0, 0, 0.012]}>
            <cylinderGeometry args={[0.03, 0.03, 0.01, 10]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
        </group>
      </group>

      {/* Legs */}
      <group ref={leftLegRef} position={[-0.1, 0.6, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.58, 10]} />
          <meshStandardMaterial color="#9f7a35" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.57, 0.04]} castShadow>
          <boxGeometry args={[0.11, 0.06, 0.18]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.1, 0.6, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.58, 10]} />
          <meshStandardMaterial color="#9f7a35" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.57, 0.04]} castShadow>
          <boxGeometry args={[0.11, 0.06, 0.18]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* Head & Khaki Police Cap */}
      <group position={[0, 1.35, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.18, 14, 14]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.08, -0.02]}>
          <sphereGeometry args={[0.19, 12, 12]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.06, 0.02, 0.16]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.06, 0.02, 0.16]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Police Cap */}
        <mesh position={[0, 0.12, 0.02]}>
          <cylinderGeometry args={[0.19, 0.17, 0.12, 16]} />
          <meshStandardMaterial color="#854d0e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.08, 0.13]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.2, 0.02, 0.1]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>
    </group>
  );
}

// ── Complete Police Station 3D Environment Component ──
function PoliceStationEnvironment({
  receivedCiphertext,
  isVerified,
  onEnvelopeDelivered,
  onInspectorExit,
}: {
  receivedCiphertext: string;
  isVerified: boolean;
  isDecryptionCompleted?: boolean;
  onEnvelopeDelivered?: () => void;
  onInspectorExit?: () => void;
}) {
  return (
    <group>
      {/* ── Polished Sandstone Tiled Floor ── */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 16]} />
        <meshStandardMaterial color="#dcd3c5" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* ── Back Wall with Rich Wood Wainscot & Plaster ── */}
      {/* Lower Teak Wood Paneling */}
      <mesh position={[0, 0.8, -3.2]}>
        <boxGeometry args={[12, 1.6, 0.2]} />
        <meshStandardMaterial color="#4a2c17" roughness={0.5} />
      </mesh>
      {/* Upper Beige Plaster */}
      <mesh position={[0, 2.7, -3.2]}>
        <boxGeometry args={[12, 2.2, 0.2]} />
        <meshStandardMaterial color="#f0e6d8" roughness={0.8} />
      </mesh>
      {/* Teak Wood Molding Trim */}
      <mesh position={[0, 1.6, -3.09]}>
        <boxGeometry args={[12, 0.08, 0.04]} />
        <meshStandardMaterial color="#3d2110" />
      </mesh>

      {/* Left Wall with Entrance Doorway */}
      <mesh position={[-4.8, 1.8, 0]}>
        <boxGeometry args={[0.2, 3.6, 6.4]} />
        <meshStandardMaterial color="#f0e6d8" roughness={0.8} />
      </mesh>
      {/* Entrance Door Frame on Left */}
      <group position={[-4.7, 1.3, 1.8]}>
        <mesh position={[0, 0, -0.55]}><boxGeometry args={[0.1, 2.6, 0.1]} /><meshStandardMaterial color="#4a2c17" /></mesh>
        <mesh position={[0, 0, 0.55]}><boxGeometry args={[0.1, 2.6, 0.1]} /><meshStandardMaterial color="#4a2c17" /></mesh>
        <mesh position={[0, 1.3, 0]}><boxGeometry args={[0.1, 0.1, 1.2]} /><meshStandardMaterial color="#4a2c17" /></mesh>
      </group>

      {/* ── Center Back Wall: Tamil Nadu Police Header Signage ── */}
      <group position={[-0.2, 3.25, -3.09]}>
        <mesh>
          <boxGeometry args={[3.8, 0.82, 0.04]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 0, 0.022]}>
          <boxGeometry args={[3.72, 0.74, 0.02]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <Html position={[0, 0, 0.04]} transform scale={0.16} pointerEvents="none">
          <div className="w-[580px] p-2 text-center select-none">
            <div className="text-[11px] font-black tracking-widest text-amber-400 uppercase flex items-center justify-center gap-2">
              <span>★</span>
              <span>TAMIL NADU POLICE DEPARTMENT</span>
              <span>★</span>
            </div>
            <div className="text-base font-black text-white tracking-wider mt-0.5 uppercase drop-shadow-md">
              NEHRU STREET POLICE STATION
            </div>
            <div className="text-[9px] font-extrabold text-amber-200/90 tracking-widest uppercase mt-0.5">
              CRIME INVESTIGATION &amp; INTELLIGENCE BRANCH
            </div>
          </div>
        </Html>
      </group>

      {/* ── Investigation Notice Board on Left Wall ── */}
      <group position={[-2.8, 2.2, -3.08]}>
        <mesh><boxGeometry args={[1.8, 1.2, 0.04]} /><meshStandardMaterial color="#78350f" /></mesh>
        <mesh position={[0, 0, 0.025]}><boxGeometry args={[1.7, 1.1, 0.02]} /><meshStandardMaterial color="#fed7aa" /></mesh>
        <Html position={[0, 0, 0.04]} transform scale={0.11} pointerEvents="none">
          <div className="w-48 text-slate-800 p-2 font-sans select-none">
            <div className="text-[9px] font-black text-red-800 uppercase border-b border-red-300 pb-0.5">
              NOTICE BOARD • DAILY BRIEF
            </div>
            <div className="text-[8px] font-bold text-slate-700 mt-1">
              • Special Vigilance: Nehru Street
            </div>
            <div className="text-[8px] font-bold text-slate-700">
              • Partner: Friends of Police (FOP)
            </div>
            <div className="text-[7px] text-slate-500 mt-1 italic">
              Encrypted reports must be verified using Affine Decryption Formula.
            </div>
          </div>
        </Html>
      </group>

      {/* ── Case Filing Shelves on Right Wall ── */}
      <group position={[1.2, 1.5, -3.05]}>
        <mesh><boxGeometry args={[1.0, 2.4, 0.28]} /><meshStandardMaterial color="#3e2723" /></mesh>
        {/* Bookshelf levels & files */}
        {[-0.8, -0.3, 0.2, 0.7].map((sy, i) => (
          <group key={i} position={[0, sy, 0.06]}>
            <mesh position={[0, -0.06, 0]}><boxGeometry args={[0.94, 0.03, 0.24]} /><meshStandardMaterial color="#2d1c10" /></mesh>
            {[-0.32, -0.16, 0, 0.16, 0.32].map((fx, j) => (
              <mesh key={j} position={[fx, 0.12, 0]} castShadow>
                <boxGeometry args={[0.08, 0.26, 0.18]} />
                <meshStandardMaterial
                  color={
                    (i + j) % 4 === 0
                      ? "#dc2626"
                      : (i + j) % 4 === 1
                      ? "#2563eb"
                      : (i + j) % 4 === 2
                      ? "#ca8a04"
                      : "#16a34a"
                  }
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* ── Indian National Flag Desk Stand ── */}
      <group position={[-1.8, 0, -2.4]}>
        <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.12, 0.14, 0.08, 12]} /><meshStandardMaterial color="#ca8a04" metalness={0.8} /></mesh>
        <mesh position={[0, 1.3, 0]}><cylinderGeometry args={[0.02, 0.02, 2.6, 8]} /><meshStandardMaterial color="#ca8a04" metalness={0.8} /></mesh>
        {/* Tricolor Flag */}
        <group position={[0.28, 2.2, 0]}>
          <mesh position={[0, 0.16, 0]}><boxGeometry args={[0.56, 0.12, 0.02]} /><meshStandardMaterial color="#ea580c" /></mesh>
          <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.56, 0.12, 0.02]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, -0.08, 0]}><boxGeometry args={[0.56, 0.12, 0.02]} /><meshStandardMaterial color="#16a34a" /></mesh>
        </group>
      </group>

      {/* ── Right-Side Jail Compartment (Holding Cell) ── */}
      <JailHoldingCell />

      {/* ── Main Police Inspector Executive Workstation ── */}
      <InspectorWorkstation
        receivedCiphertext={receivedCiphertext}
        isVerified={isVerified}
        onInspectorExit={onInspectorExit}
      />

      {/* ── Animated Courier Officer Without Desk Collisions ── */}
      <AnimatedCourier onDelivered={onEnvelopeDelivered} />
    </group>
  );
}



// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export default function SecretMessageLab() {
  const { width = 1200, height = 800 } = useWindowSize();
  const { playClick, playSuccess, playPop, playChime } = useLabAudio();

  // ── CORE GAME STATE (PRESERVED) ──
  const [currentScreen, setCurrentScreen] = useState<GameScreen>("WELCOME");
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // ── FOUR-SCENE GAMEPLAY STATE (REQUIREMENTS 3-7) ──
  const [currentScene, setCurrentScene] = useState<GameplayScene>("SCENE_1_MARKET");
  const [marketDialogue, setMarketDialogue] = useState<{
    speaker: "OFFICER" | "FRIEND_OF_POLICE" | null;
    text: string;
    step: number;
  } | null>(null);

  // Scene 1: Dialogue progression
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);

  // Scene 2: Street & Observation state
  const [isObservationCompleted, setIsObservationCompleted] = useState<boolean>(false);
  const [hasConfirmedReport, setHasConfirmedReport] = useState<boolean>(false);

  // Scene 3: Manual Encryption state
  // Tracking per-letter positions and calculations for PLAINTEXT (29 letters)
  const [encryptActiveIndex, setEncryptActiveIndex] = useState<number>(0);
  const [encryptPositions, setEncryptPositions] = useState<Record<number, number>>({});
  const [encryptCipherChars, setEncryptCipherChars] = useState<Record<number, string>>({});
  const [encryptInputPos, setEncryptInputPos] = useState<string>("");
  const [step1Identified, setStep1Identified] = useState<boolean>(false);
  const [encryptFeedback, setEncryptFeedback] = useState<string | null>(null);
  const [isEncryptionCompleted, setIsEncryptionCompleted] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  // Scene 4: Decryption state
  const [decryptActiveIndex, setDecryptActiveIndex] = useState<number>(0);
  const [decryptPositions, setDecryptPositions] = useState<Record<number, number>>({});
  const [decryptPlainChars, setDecryptPlainChars] = useState<Record<number, string>>({});
  const [decryptInputPos, setDecryptInputPos] = useState<string>("");
  const [decryptStep1Identified, setDecryptStep1Identified] = useState<boolean>(false);
  const [decryptFeedback, setDecryptFeedback] = useState<string | null>(null);
  const [isDecryptionCompleted, setIsDecryptionCompleted] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [showCipherPaperPopup, setShowCipherPaperPopup] = useState<boolean>(false);
  const [isInspectorWalkingExit, setIsInspectorWalkingExit] = useState<boolean>(false);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctAttempts, setCorrectAttempts] = useState<number>(0);

  const accuracyPercentage = useMemo(() => {
    if (totalAttempts === 0) return 100;
    return Math.max(0, Math.min(100, Math.round((correctAttempts / totalAttempts) * 100)));
  }, [totalAttempts, correctAttempts]);

  // Audio helpers
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

  // ── TIMER EFFECT: RUNS ONLY DURING GAMEPLAY ──
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && currentScreen === "GAMEPLAY") {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, currentScreen]);

  // ── FULLSCREEN TOGGLE ──
  const toggleFullscreen = () => {
    sfxPop();
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

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // ── NAVIGATION & TRANSITION HANDLERS (PRESERVED & CONNECTED) ──
  const handleStartGame = () => {
    sfxClick();
    setCurrentScreen("GAMEPLAY");
    setCurrentScene("SCENE_1_MARKET");
    setDialogueIndex(0);
    setIsTimerRunning(true);
  };

  const handleResetGame = () => {
    sfxPop();
    setTimerSeconds(0);
    setScore(0);
    setIsTimerRunning(false);
    setCurrentScreen("WELCOME");
    setCurrentScene("SCENE_1_MARKET");
    setDialogueIndex(0);
    setHasConfirmedReport(false);
    setEncryptPositions({});
    setEncryptCipherChars({});
    setEncryptActiveIndex(0);
    setIsEncryptionCompleted(false);
    setStep1Identified(false);
    setShowReviewModal(false);
    setDecryptPositions({});
    setDecryptPlainChars({});
    setDecryptActiveIndex(0);
    setDecryptStep1Identified(false);
    setIsDecryptionCompleted(false);
    setIsVerified(false);
    setShowCipherPaperPopup(false);
    setIsInspectorWalkingExit(false);
    setTotalAttempts(0);
    setCorrectAttempts(0);
  };

  const handlePlayAgain = () => {
    handleResetGame();
  };

  // Format Time Helper (MM:SS)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // ── DIALOGUES FOR SCENE 1 (Friends of Police Intro) ──
  const scene1Dialogues = useMemo(
    () => [
      {
        speaker: "Police Officer",
        role: "OFFICER",
        text: "Hello! Welcome to the Friends of Police initiative. As a responsible citizen, you can help us maintain safety in our city.",
      },
      {
        speaker: "Police Officer",
        role: "OFFICER",
        text: "If you notice any suspicious or unlawful activities, such as drug-related activities or other criminal behaviour, please inform the police.",
      },
      {
        speaker: "Police Officer",
        role: "OFFICER",
        text: "Your cooperation can help us identify problems and protect our community.",
      },
      {
        speaker: "Friend of Police",
        role: "FRIEND_OF_POLICE",
        text: "Absolutely. I understand my responsibility. If I notice any suspicious activities, I will report them to you immediately.",
      },
      {
        speaker: "Police Officer",
        role: "OFFICER",
        text: "Thank you. Remember, responsible citizens play an important role in maintaining public safety.",
      },
    ],
    []
  );

  // ── ENCRYPTION LOGIC FOR SCENE 3 ──
  // List of non-space character indices in PLAINTEXT
  const letterIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < PLAINTEXT.length; i++) {
      if (PLAINTEXT[i] !== " ") indices.push(i);
    }
    return indices;
  }, []);

  const currentEncryptChar = PLAINTEXT[encryptActiveIndex];
  const isEncryptCharSpace = currentEncryptChar === " ";
  const currentEncryptX = !isEncryptCharSpace ? letterToNum(currentEncryptChar) : -1;
  const currentEncryptTargetNum = currentEncryptX !== -1 ? encryptValue(currentEncryptX) : -1;
  const currentEncryptTargetChar = currentEncryptTargetNum !== -1 ? numToLetter(currentEncryptTargetNum) : "";

  // Auto skip spaces in encryption
  useEffect(() => {
    if (PLAINTEXT[encryptActiveIndex] === " " && encryptActiveIndex < PLAINTEXT.length - 1) {
      setEncryptActiveIndex((prev) => prev + 1);
    }
  }, [encryptActiveIndex]);

  // Progress counter: Current letter number out of 29 letters
  const currentLetterProgress = letterIndices.indexOf(encryptActiveIndex) + 1;

  // Hidden Cheat Code 005: Full encryption auto-completion for demonstration
  const handleTriggerCheat005 = () => {
    sfxChime();
    const allPos: Record<number, number> = {};
    const allChars: Record<number, string> = {};
    letterIndices.forEach((idx) => {
      const char = PLAINTEXT[idx];
      const x = letterToNum(char);
      const encVal = (5 * x + 9) % 26;
      allPos[idx] = x;
      allChars[idx] = numToLetter(encVal);
    });
    setEncryptPositions(allPos);
    setEncryptCipherChars(allChars);
    setEncryptInputPos("");
    setEncryptFeedback(null);
    setStep1Identified(false);
    setIsEncryptionCompleted(true);
    setScore(58);
  };

  // Step 1: Submit and validate alphabet position for current letter (or hidden 005 shortcut)
  const handleCheckPosition = () => {
    const raw = encryptInputPos.trim();
    if (raw === "005") {
      handleTriggerCheat005();
      return;
    }
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;

    if (val === currentEncryptX) {
      sfxSuccess();
      setEncryptPositions((prev) => ({ ...prev, [encryptActiveIndex]: val }));
      setStep1Identified(true);
      setEncryptFeedback(null);
    } else {
      sfxClick();
      setEncryptFeedback("Incorrect! Please check the alphabet position and try again.");
    }
  };

  // Step 3: Apply Encryption confirmed by player, save ciphertext character, and advance to next letter
  const handleApplyEncryption = () => {
    sfxPop();
    const updatedChars = { ...encryptCipherChars, [encryptActiveIndex]: currentEncryptTargetChar };
    setEncryptCipherChars(updatedChars);
    setEncryptFeedback(null);
    setStep1Identified(false);
    setEncryptInputPos("");
    setScore((s) => s + 2);

    // Check if all 29 alphabetic characters have been encrypted
    const completedCount = Object.keys(updatedChars).length;
    if (completedCount >= letterIndices.length) {
      sfxChime();
      setIsEncryptionCompleted(true);
    } else {
      // Advance to next non-space letter
      let nextIdx = encryptActiveIndex + 1;
      while (nextIdx < PLAINTEXT.length && PLAINTEXT[nextIdx] === " ") {
        nextIdx++;
      }
      if (nextIdx < PLAINTEXT.length) {
        setEncryptActiveIndex(nextIdx);
      }
    }
  };

  // Redo Encryption: reset progress, clear encrypted output, restart from letter 1
  const handleRedoEncryption = () => {
    sfxPop();
    setEncryptPositions({});
    setEncryptCipherChars({});
    setEncryptActiveIndex(0);
    setIsEncryptionCompleted(false);
    setStep1Identified(false);
    setEncryptInputPos("");
    setEncryptFeedback(null);
    setShowReviewModal(false);
  };

  // Quick Assist Tool: Batch calculate remaining letters if desired
  const handleBatchEncrypt = () => {
    sfxSuccess();
    const allPos: Record<number, number> = {};
    const allChars: Record<number, string> = {};
    letterIndices.forEach((idx) => {
      const char = PLAINTEXT[idx];
      const x = letterToNum(char);
      allPos[idx] = x;
      allChars[idx] = numToLetter(encryptValue(x));
    });
    setEncryptPositions(allPos);
    setEncryptCipherChars(allChars);
    setStep1Identified(false);
    setIsEncryptionCompleted(true);
    setScore(50);
  };

  // ── DECRYPTION LOGIC FOR SCENE 4 ──
  const receivedCiphertext = useMemo(() => {
    return PLAINTEXT.split("").map((ch, idx) => {
      if (ch === " ") return " ";
      return encryptCipherChars[idx] || numToLetter(encryptValue(letterToNum(ch)));
    }).join("");
  }, [encryptCipherChars]);

  const currentDecryptChar = receivedCiphertext[decryptActiveIndex] || "Q";
  const isDecryptCharSpace = currentDecryptChar === " ";
  const currentDecryptY = !isDecryptCharSpace ? letterToNum(currentDecryptChar) : -1;
  const currentDecryptTargetNum = currentDecryptY !== -1 ? decryptValue(currentDecryptY) : -1;
  const currentDecryptTargetChar = currentDecryptTargetNum !== -1 ? numToLetter(currentDecryptTargetNum) : "";
  const currentDecryptLetterProgress =
    letterIndices.indexOf(decryptActiveIndex) >= 0 ? letterIndices.indexOf(decryptActiveIndex) + 1 : 1;

  // Auto skip spaces in decryption
  useEffect(() => {
    if (receivedCiphertext[decryptActiveIndex] === " " && decryptActiveIndex < receivedCiphertext.length - 1) {
      setDecryptActiveIndex((prev) => prev + 1);
    }
  }, [decryptActiveIndex, receivedCiphertext]);

  // Submit Alphabet Position for cipher letter (Step 1 + Hidden 005 Shortcut)
  const handleValidateDecryptPos = () => {
    const trimmed = decryptInputPos.trim();
    // Hidden 005 shortcut: Instantly decrypt all letters for rapid testing
    if (trimmed === "005") {
      sfxSuccess();
      const allPos: Record<number, number> = {};
      const allChars: Record<number, string> = {};
      letterIndices.forEach((idx) => {
        const char = receivedCiphertext[idx];
        const y = letterToNum(char);
        allPos[idx] = y;
        allChars[idx] = numToLetter(decryptValue(y));
      });
      setDecryptPositions(allPos);
      setDecryptPlainChars(allChars);
      setDecryptStep1Identified(false);
      setIsDecryptionCompleted(true);
      setIsVerified(true);
      setScore(100);
      setTotalAttempts(29);
      setCorrectAttempts(29);
      setDecryptFeedback(null);
      setDecryptInputPos("");
      return;
    }

    const val = parseInt(trimmed, 10);
    if (isNaN(val)) return;

    setTotalAttempts((prev) => prev + 1);
    if (val === currentDecryptY) {
      setCorrectAttempts((prev) => prev + 1);
      sfxPop();
      setDecryptPositions((prev) => ({ ...prev, [decryptActiveIndex]: val }));
      setDecryptStep1Identified(true);
      setDecryptFeedback(null);
      setDecryptInputPos("");
    } else {
      setDecryptFeedback(`Incorrect position! Letter "${currentDecryptChar}" is not at index ${val}. (A=0, B=1 ... Z=25). Try again.`);
    }
  };

  // Apply Decryption Step (Commits recovered letter and advances)
  const handleApplyDecryption = () => {
    sfxSuccess();
    const updatedChars = { ...decryptPlainChars, [decryptActiveIndex]: currentDecryptTargetChar };
    setDecryptPlainChars(updatedChars);
    setDecryptStep1Identified(false);
    setDecryptFeedback(null);
    setScore((s) => s + 2);

    // Check if all 29 non-space letters are decrypted
    const completedCount = Object.keys(updatedChars).length;
    if (completedCount >= letterIndices.length) {
      sfxChime();
      setIsDecryptionCompleted(true);
      setIsVerified(true);
      setScore(100);
    } else {
      let nextIdx = decryptActiveIndex + 1;
      while (nextIdx < PLAINTEXT.length && PLAINTEXT[nextIdx] === " ") {
        nextIdx++;
      }
      if (nextIdx < PLAINTEXT.length) {
        setDecryptActiveIndex(nextIdx);
      }
    }
  };

  const handleRedoDecryption = () => {
    sfxPop();
    setDecryptPositions({});
    setDecryptPlainChars({});
    setDecryptActiveIndex(letterIndices[0] || 0);
    setDecryptStep1Identified(false);
    setIsDecryptionCompleted(false);
    setIsVerified(false);
    setShowCipherPaperPopup(false);
    setIsInspectorWalkingExit(false);
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setDecryptFeedback(null);
    setDecryptInputPos("");
  };

  const recoveredPlaintext = useMemo(() => {
    return PLAINTEXT.split("").map((ch, idx) => {
      if (ch === " ") return " ";
      return decryptPlainChars[idx] || "_";
    }).join("");
  }, [decryptPlainChars]);

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden select-none flex flex-col font-sans bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#EEF2FF] text-slate-800">
      
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. COMMON NAVIGATION BAR / HEADER (PRESERVED)                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <header className="relative z-40 w-full h-14 bg-white/95 backdrop-blur-md border-b border-indigo-100/80 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
        
        {/* ── LEFT SECTION: Back Button, Game Icon & Title ── */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link href="/">
            <button
              onClick={sfxClick}
              className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors border border-indigo-200/70 cursor-pointer shrink-0 shadow-xs active:scale-95"
              title="Back to All Labs"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>
          </Link>

          <div
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-300 flex items-center justify-center text-white shrink-0 shadow-xs"
            title="Cryptography & Secret Codes"
          >
            <KeyRound size={17} strokeWidth={2.4} />
          </div>

          <div className="flex flex-col min-w-0">
            <h1 className="text-slate-900 font-extrabold text-xs sm:text-sm md:text-base leading-tight tracking-tight truncate">
              Cryptography and Secret Codes
            </h1>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-indigo-600 leading-none hidden sm:inline">
              SECRET COMMUNICATION &amp; CIPHERS
            </span>
          </div>
        </div>

        {/* ── CENTER SECTION: Timer & Score Indicators ── */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Timer Display */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs shrink-0">
            <Clock size={15} className="text-indigo-600" strokeWidth={2.4} />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-slate-500">TIME</span>
              <span className="text-xs sm:text-sm font-black font-mono text-slate-800 tracking-wider mt-0.5">
                {formatTime(timerSeconds)}
              </span>
            </div>
          </div>

          {/* Score Display */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs shrink-0">
            <Star size={15} className="text-amber-500 fill-amber-500" strokeWidth={2} />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-slate-500">SCORE</span>
              <span className="text-xs sm:text-sm font-black font-mono text-slate-800 tracking-wider mt-0.5">
                {score}
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT SECTION: Audio, Reset & Screen Controls ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              setIsAudioMuted((prev) => !prev);
              if (isAudioMuted) playPop();
            }}
            className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
              isAudioMuted
                ? "border-slate-200 bg-slate-100 text-slate-400 hover:text-slate-600"
                : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
            title={isAudioMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isAudioMuted ? <VolumeX size={15} strokeWidth={2.3} /> : <Volume2 size={15} strokeWidth={2.3} />}
          </button>

          {/* Reset Game Action */}
          <button
            onClick={handleResetGame}
            className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95"
            title="Reset Game to Welcome Screen"
          >
            <RotateCcw size={14} strokeWidth={2.3} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={14} strokeWidth={2.3} /> : <Maximize2 size={14} strokeWidth={2.3} />}
          </button>

          {/* Guidance / Help Dialog Button */}
          <button
            onClick={() => {
              sfxPop();
              setShowHelp((prev) => !prev);
            }}
            className="w-8 h-8 rounded-full border border-indigo-400 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            title="Mission Help & Information"
          >
            <HelpCircle size={15} strokeWidth={2.4} />
          </button>
        </div>
      </header>

      {/* ── HELP / GUIDANCE MODAL POPUP (PRESERVED) ── */}
      {showHelp && (
        <div className="absolute top-16 right-4 z-50 max-w-sm w-full bg-white/95 backdrop-blur-md border-2 border-indigo-400 rounded-2xl p-4 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100 mb-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-indigo-600" />
              <span>Secret Code Agent Guide</span>
            </span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-xs font-medium text-slate-600 leading-relaxed mb-2.5">
            Cryptography is the science of protecting sensitive information by converting plain text into unreadable secret codes.
          </p>
          <div className="space-y-1.5 text-[11px] font-semibold text-slate-700 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
            <div>• <strong className="text-indigo-800">Plaintext:</strong> The original readable message.</div>
            <div>• <strong className="text-indigo-800">Ciphertext:</strong> The disguised encrypted code.</div>
            <div>• <strong className="text-indigo-800">Formula E(x):</strong> (5x + 9) mod 26.</div>
            <div>• <strong className="text-indigo-800">Formula D(y):</strong> 21(y - 9) mod 26.</div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. SCREEN 1: WELCOME PAGE (PRESERVED INITIAL SCREEN)                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {currentScreen === "WELCOME" && (
        <main className="relative flex-1 w-full min-h-0 overflow-hidden flex flex-col items-center justify-center p-3 sm:p-6">
          


          <div className="relative z-10 max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-xl border-2 border-indigo-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            
            {/* Top Vector Illustration */}
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 mb-3 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="88" stroke="#E0E7FF" strokeWidth="6" strokeDasharray="6 4" />
                <circle cx="100" cy="100" r="76" fill="#F8FAFC" stroke="#C7D2FE" strokeWidth="2.5" />
                
                {["A", "B", "C", "D", "E", "F", "G", "H"].map((letter, idx) => {
                  const angle = (idx * 45 * Math.PI) / 180;
                  const x = 100 + 64 * Math.cos(angle);
                  const y = 104 + 64 * Math.sin(angle);
                  return (
                    <text
                      key={letter}
                      x={x}
                      y={y}
                      fill="#6366F1"
                      fontSize="9"
                      fontWeight="900"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {letter}
                    </text>
                  );
                })}

                <rect x="52" y="70" width="96" height="64" rx="10" fill="#EEF2FF" stroke="#818CF8" strokeWidth="2.5" />
                <path d="M52 76 L100 108 L148 76" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
                
                <rect x="84" y="96" width="32" height="26" rx="6" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
                <path d="M90 96 V86 C90 80.5 110 80.5 110 86 V96" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none" />
                <circle cx="100" cy="108" r="3" fill="#78350F" />
                <line x1="100" y1="110" x2="100" y2="116" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />

                <g transform="translate(134, 40) rotate(25)">
                  <circle cx="12" cy="12" r="8" fill="#10B981" stroke="#059669" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3.5" fill="#FFFFFF" />
                  <rect x="18" y="10" width="16" height="4" rx="1.5" fill="#10B981" />
                  <rect x="26" y="14" width="4" height="4" rx="1" fill="#10B981" />
                  <rect x="31" y="14" width="3" height="3" rx="1" fill="#10B981" />
                </g>

                <rect x="22" y="26" width="48" height="18" rx="6" fill="#EDE9FE" stroke="#A78BFA" strokeWidth="1.5" />
                <text x="46" y="38" fill="#6D28D9" fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                  0101 KEY
                </text>
              </svg>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles size={12} className="text-indigo-600" />
              <span>Lab #29 • Cybersecurity Foundation</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-1 leading-tight tracking-tight">
              Cryptography and Secret Codes
            </h2>

            <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-md mx-auto leading-relaxed mb-4">
              Step into the world of secret communication and discover how hidden messages are protected and decoded.
            </p>

            <div className="grid grid-cols-3 gap-2 w-full mb-5 text-left">
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-indigo-100 flex flex-col items-center text-center">
                <span className="text-[9px] sm:text-[10px] font-black text-indigo-600 uppercase mb-0.5">1. CIPHER WHEEL</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight">Letter shift rules</span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-purple-100 flex flex-col items-center text-center">
                <span className="text-[9px] sm:text-[10px] font-black text-purple-600 uppercase mb-0.5">2. KEYS &amp; LOCKS</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight">Protect secrets</span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-sky-100 flex flex-col items-center text-center">
                <span className="text-[9px] sm:text-[10px] font-black text-sky-600 uppercase mb-0.5">3. DECODE CLUES</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight">Reveal missions</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartGame}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-sm sm:text-base shadow-lg hover:shadow-indigo-500/25 cursor-pointer transition-all flex items-center justify-center gap-2.5 transform active:scale-98 animate-pulse hover:animate-none"
            >
              <span>START GAME</span>
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </main>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 3. SCREEN 2: MAIN GAMEPLAY CONTAINER (COMPLETE 4-SCENE SYSTEM)         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {currentScreen === "GAMEPLAY" && (
        <main className="relative flex-1 w-full min-h-0 overflow-hidden flex flex-col">
          
          {/* ───────────────────────────────────────────────────────────── */}
          {/* SCENE 1: FRIENDS OF POLICE INTRODUCTION (MARKETPLACE)         */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentScene === "SCENE_1_MARKET" && (
            <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-[#f1f5f9] select-none">
              {/* Entire Gameplay Viewport Occupied by 3D Supermarket Canvas with balanced framing */}
              <Canvas shadows camera={{ position: [0, 1.75, 4.5], fov: 50 }}>
                <color attach="background" args={["#f1f5f9"]} />
                <ambientLight intensity={1.1} />
                <directionalLight position={[4, 8, 4]} intensity={1.25} castShadow />
                <SupermarketEnvironment
                  onCompleteDialogue={() => {
                    setMarketDialogue(null);
                    sfxSuccess();
                    setCurrentScene("SCENE_2_STREET");
                  }}
                  isAudioMuted={isAudioMuted}
                  onDialogueUpdate={(dialogue) => {
                    setMarketDialogue(dialogue);
                  }}
                />
              </Canvas>

                            {/* ── Side-Positioned Comic Dialogue Bubble Overlay (Dynamically Pointing Directly to Speaker) ── */}
              {marketDialogue && marketDialogue.speaker && (
                <div
                  className={`absolute top-[32%] -translate-y-1/2 z-20 pointer-events-none transition-all duration-300 max-w-[280px] sm:max-w-sm md:max-w-[420px] ${
                    marketDialogue.speaker === "OFFICER"
                      ? "left-3 sm:left-auto sm:right-[45%] md:right-[44%]"
                      : "left-3 sm:left-auto sm:right-[26%] md:right-[25%]"
                  }`}
                >
                  <div
                    className={`relative bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl border-2 pointer-events-auto transition-transform duration-200 animate-in fade-in zoom-in-95 ${
                      marketDialogue.speaker === "OFFICER"
                        ? "border-sky-400 shadow-sky-950/20"
                        : "border-amber-400 shadow-amber-950/20"
                    }`}
                  >
                    {/* Speaker Identification Tag */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          marketDialogue.speaker === "OFFICER"
                            ? "bg-sky-100 text-sky-800 border border-sky-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {marketDialogue.speaker === "OFFICER" ? "POLICE OFFICER (CIVILIAN)" : "FRIEND OF POLICE"}
                      </span>
                    </div>

                    {/* Full Dialogue Text (Guaranteed visible, comfortable line height) */}
                    <p className="text-xs sm:text-sm md:text-base font-extrabold leading-relaxed text-slate-800 whitespace-normal break-words">
                      &ldquo;{marketDialogue.text}&rdquo;
                    </p>

                    {/* Comic Speech Bubble Tail pointing directly towards active speaker */}
                    <div className="absolute top-1/2 -translate-y-1/2 -right-[15px] w-[16px] h-[24px] pointer-events-none overflow-visible">
                      <svg viewBox="0 0 16 24" className="w-full h-full overflow-visible" fill="none">
                        <polygon
                          points="0,3 15,12 0,21"
                          fill="rgba(255, 255, 255, 0.96)"
                        />
                        <polyline
                          points="0,3 15,12 0,21"
                          stroke={marketDialogue.speaker === "OFFICER" ? "#38bdf8" : "#fbbf24"}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <line x1="0" y1="4" x2="0" y2="20" stroke="white" strokeWidth="3" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentScene === "SCENE_2_STREET" && (
            <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-gradient-to-b from-sky-400 via-sky-200 to-sky-100 select-none">
              {/* Entire Gameplay Viewport Occupied by 3D Street Canvas (Static View) */}
              <Canvas shadows camera={{ position: [0, 2.7, 8.4], fov: 46 }}>
                <color attach="background" args={["#7dd3fc"]} />
                <ambientLight intensity={0.95} />
                <directionalLight position={[5, 10, 6]} intensity={1.35} castShadow />
                <hemisphereLight args={["#bae6fd", "#fef08a", 0.65]} />
                <StreetEnvironment
                  onObservationComplete={() => {
                    setIsObservationCompleted(true);
                  }}
                />
              </Canvas>

              {/* ── Lower-Right: Suspicious Activity Detected Notification Card ── */}
              {isObservationCompleted && (
                <div className="absolute bottom-6 right-6 z-20 max-w-xs sm:max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto select-none">
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border-2 border-red-400 shadow-2xl">
                    <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-wider mb-1.5">
                      <AlertCircle size={16} />
                      <span>Suspicious Activity Detected</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 leading-snug mb-2.5">
                      Repeated suspicious transactions observed near the tea shop. Report this activity to the police.
                    </p>
                    <div className="space-y-1 text-[11px] font-semibold text-slate-700 bg-red-50/80 p-2.5 rounded-xl border border-red-100">
                      <div><span className="text-slate-500 uppercase text-[9px]">Name:</span> <strong className="text-red-700">RAJU</strong></div>
                      <div><span className="text-slate-500 uppercase text-[9px]">Reported Activity:</span> <strong className="text-slate-800">Suspected illegal drug selling</strong></div>
                      <div><span className="text-slate-500 uppercase text-[9px]">Location:</span> <strong className="text-emerald-700">NEHRU STREET – TEA SHOP</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Lower-Middle: Floating Compose Report Button (Direct Transition to Scene 3) ── */}
              {isObservationCompleted && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-in fade-in zoom-in-95 duration-500 pointer-events-auto">
                  <button
                    onClick={() => {
                      sfxSuccess();
                      setHasConfirmedReport(true);
                      setCurrentScene("SCENE_3_ENCRYPT");
                    }}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-sm flex items-center gap-2.5 shadow-2xl border-2 border-red-300 cursor-pointer transition active:scale-95 whitespace-nowrap"
                  >
                    <CheckCircle2 size={18} />
                    <span>COMPOSE REPORT</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SCENE 3: REALISTIC 3D HOME INTERIOR & INTERACTIVE ENCRYPTION WORKSPACE */}
          {/* 70% 3D Room (Left) : 30% Continuous Mathematical Workspace (Right)  */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentScene === "SCENE_3_ENCRYPT" && (
            <div className="relative flex-1 w-full h-full flex flex-col md:flex-row min-h-0 overflow-hidden bg-slate-100">
              {/* ── LEFT SIDE (70%): REALISTIC 3D HOME INTERIOR ── */}
              <div className="w-full md:w-[70%] h-[46vh] md:h-full relative shrink-0">
                <Canvas shadows camera={{ position: [0.0, 3.4, 5.4], fov: 48 }}>
                  <color attach="background" args={["#f8fafc"]} />
                  <ambientLight intensity={0.9} />
                  <directionalLight position={[2, 6, 4]} intensity={1.25} castShadow />
                  <HomeStudyEnvironment />
                </Canvas>

              </div>

              {/* ── RIGHT SIDE (30%): CONTINUOUS MATHEMATICAL WORKSPACE ── */}
              <div className="w-full md:w-[30%] h-[54vh] md:h-full flex flex-col bg-slate-50 border-t md:border-t-0 md:border-l border-slate-300 overflow-y-auto select-none">
                {/* SECTION A – ENCRYPTION FORMULA (Top 20–25%) */}
                <div className="p-3.5 border-b border-slate-200 bg-white shrink-0">
                  <div className="text-xs font-black uppercase tracking-wider text-indigo-700 mb-2 flex items-center gap-1.5">
                    <Terminal size={15} />
                    <span>ENCRYPTION FORMULA</span>
                  </div>

                  <div className="bg-indigo-50/90 rounded-xl p-3 border border-indigo-200 text-center">
                    <div className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                      AFFINE CIPHER RULE
                    </div>
                    <div className="text-base sm:text-lg font-black font-mono text-indigo-950 my-1">
                      E(x) = (5x + 9) mod 26
                    </div>
                    <div className="flex items-center justify-center gap-4 pt-1.5 border-t border-indigo-200/60 text-xs font-extrabold text-slate-700">
                      <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">Secret a = 5</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">Secret b = 9</span>
                    </div>
                  </div>
                </div>

                {/* SECTION B – ORIGINAL SECRET MESSAGE */}
                <div className="p-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
                  <div className="text-[10px] font-black uppercase text-indigo-700 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Lock size={12} className="text-indigo-600" />
                    <span>ORIGINAL SECRET MESSAGE</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-indigo-100 font-mono font-black text-xs sm:text-sm text-indigo-950 tracking-wider shadow-2xs">
                    RAJU SELLING DRUGS ON NEHRU STREET
                  </div>
                </div>

                {/* SECTION C & INTERACTIVE CALCULATION WORKSPACE */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  {!isEncryptionCompleted ? (
                    <div className="space-y-3">
                      {/* SECTION C – CURRENT LETTER & PROGRESS */}
                      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                          <span className="uppercase text-[10px] font-black tracking-wider text-indigo-700">
                            CURRENT LETTER
                          </span>
                          <span className="font-mono text-indigo-900 font-extrabold text-xs">
                            LETTER {currentLetterProgress} OF 29
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-mono font-black text-2xl flex items-center justify-center shadow-xs">
                              {currentEncryptChar}
                            </span>
                            <div>
                              <div className="text-xs font-black text-slate-800">
                                Target: <span className="font-mono text-indigo-700 text-sm">&ldquo;{currentEncryptChar}&rdquo;</span>
                              </div>
                              <div className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 mt-0.5 inline-block">
                                Alphabet Position: {currentEncryptChar} = {letterToNum(currentEncryptChar)}
                              </div>
                            </div>
                          </div>

                          {/* Progress Percentage */}
                          <div className="text-right">
                            <span className="text-[10px] font-mono font-bold text-slate-600">
                              {Math.round((Object.keys(encryptCipherChars).length / 29) * 100)}%
                            </span>
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className="bg-indigo-600 h-full transition-all duration-300"
                                style={{ width: `${(Object.keys(encryptCipherChars).length / 29) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* STEP 1: IDENTIFY ALPHABET POSITION */}
                      <div className="bg-white rounded-xl p-3.5 border-2 border-indigo-100 shadow-2xs">
                        <div className="text-xs font-black uppercase text-indigo-900 tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">1</span>
                          <span>STEP 1: IDENTIFY ALPHABET POSITION</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-black text-slate-800 min-w-10">
                            {currentEncryptChar} = ?
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={3}
                            placeholder="Enter 0–25"
                            value={encryptInputPos}
                            disabled={step1Identified}
                            onChange={(e) => {
                              setEncryptInputPos(e.target.value);
                              setEncryptFeedback(null);
                            }}
                            onKeyDown={(e) => e.key === "Enter" && !step1Identified && handleCheckPosition()}
                            className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-300 focus:border-indigo-600 rounded-xl font-mono text-sm font-bold text-center focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
                          />
                          <button
                            onClick={handleCheckPosition}
                            disabled={step1Identified || encryptInputPos.trim() === ""}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer shadow-xs transition active:scale-95 whitespace-nowrap ${
                              step1Identified
                                ? "bg-emerald-600 text-white cursor-default"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            }`}
                          >
                            {step1Identified ? "CHECKED ✓" : "CHECK POSITION"}
                          </button>
                        </div>

                        {/* Error Message for Step 1 */}
                        {encryptFeedback && !step1Identified && (
                          <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 flex items-center gap-1.5 animate-shake">
                            <AlertCircle size={14} />
                            <span>{encryptFeedback}</span>
                          </div>
                        )}

                        {/* Success Message for Step 1 */}
                        {step1Identified && (
                          <div className="mt-2 text-xs font-extrabold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 size={14} />
                            <span>Correct! Alphabet position identified.</span>
                          </div>
                        )}
                      </div>

                      {/* STEP 2: AUTOMATICALLY DISPLAY ENCRYPTION CALCULATION */}
                      {step1Identified && (
                        <div className="bg-white rounded-xl p-3.5 border-2 border-emerald-200 shadow-2xs animate-in fade-in zoom-in-95 duration-300">
                          <div className="text-xs font-black uppercase text-emerald-900 tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">2</span>
                            <span>STEP 2: APPLY ENCRYPTION FORMULA</span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-xs space-y-1 text-slate-800">
                            <div className="text-slate-500 font-bold">E(x) = (5x + 9) mod 26</div>
                            <div>E({currentEncryptX}) = (5 × {currentEncryptX} + 9) mod 26</div>
                            <div>E({currentEncryptX}) = ({5 * currentEncryptX} + 9) mod 26</div>
                            <div>E({currentEncryptX}) = {5 * currentEncryptX + 9} mod 26</div>
                            <div className="font-bold text-indigo-700">E({currentEncryptX}) = {currentEncryptTargetNum}</div>
                            <div className="font-black text-emerald-700">{currentEncryptTargetNum} = {currentEncryptTargetChar}</div>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between bg-emerald-50/80 px-3 py-2 rounded-lg border border-emerald-200">
                            <span className="text-xs font-extrabold text-emerald-900">Encrypted letter:</span>
                            <span className="px-3 py-0.5 rounded-md bg-emerald-600 text-white font-mono font-black text-sm shadow-xs">
                              {currentEncryptTargetChar}
                            </span>
                          </div>

                          {/* STEP 3: APPLY ENCRYPTION BUTTON */}
                          <div className="mt-3">
                            <button
                              onClick={handleApplyEncryption}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
                            >
                              <Check size={16} />
                              <span>APPLY ENCRYPTION</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ENCRYPTED MESSAGE OUTPUT */}
                      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                        <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                          <Lock size={12} />
                          <span>ENCRYPTED MESSAGE</span>
                        </div>
                        <div className="p-2.5 bg-slate-900 rounded-lg font-mono font-black text-xs sm:text-sm text-emerald-400 tracking-widest break-all select-all">
                          {PLAINTEXT.split("").map((ch, i) => {
                            if (ch === " ") return "   ";
                            return encryptCipherChars[i] || "_";
                          }).join("")}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* COMPLETION AND REVIEW SECTION */
                    <div className="bg-white rounded-2xl p-4 border-2 border-emerald-300 shadow-md space-y-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                        <CheckCircle2 size={28} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                          ENCRYPTION COMPLETED SUCCESSFULLY
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          All 29 characters secured using the Affine Cipher formula.
                        </p>
                      </div>

                      {/* Comparison Box */}
                      <div className="space-y-2 text-left bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs">
                        <div>
                          <div className="text-[10px] uppercase font-black text-slate-500">Original message:</div>
                          <div className="font-bold text-slate-900 break-all">{PLAINTEXT}</div>
                        </div>
                        <div className="pt-2 border-t border-slate-200">
                          <div className="text-[10px] uppercase font-black text-indigo-600">Encrypted message:</div>
                          <div className="font-black text-indigo-900 break-all">{FULL_CIPHERTEXT}</div>
                        </div>
                      </div>

                      {/* Action Buttons: Continue, Review, Redo */}
                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          onClick={() => {
                            sfxSuccess();
                            setCurrentScene("SCENE_4_DECRYPT");
                          }}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
                        >
                          <span>CONTINUE</span>
                          <ArrowRight size={16} />
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              sfxPop();
                              setShowReviewModal((prev) => !prev);
                            }}
                            className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border border-slate-300 transition"
                          >
                            Review Encryption
                          </button>
                          <button
                            onClick={handleRedoEncryption}
                            className="flex-1 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs cursor-pointer border border-amber-300 transition"
                          >
                            Redo Encryption
                          </button>
                        </div>
                      </div>
                    </div>
                  )}


                </div>
              </div>

              {/* Review Modal for Verification */}
              {showReviewModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="font-black text-sm text-indigo-950 uppercase flex items-center gap-1.5">
                        <BookOpen size={16} className="text-indigo-600" />
                        <span>Encryption Calculations Review</span>
                      </h4>
                      <button
                        onClick={() => setShowReviewModal(false)}
                        className="text-slate-400 hover:text-slate-600 text-base font-black px-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-1.5">
                      <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[10px] font-black p-2 bg-slate-100 rounded-lg text-slate-600 uppercase">
                        <div>Char</div>
                        <div>x</div>
                        <div>5x + 9</div>
                        <div>mod 26</div>
                        <div>Cipher</div>
                      </div>
                      {letterIndices.map((idx) => {
                        const char = PLAINTEXT[idx];
                        const x = letterToNum(char);
                        const raw = 5 * x + 9;
                        const encVal = raw % 26;
                        const cipherChar = numToLetter(encVal);
                        return (
                          <div key={idx} className="grid grid-cols-5 gap-1.5 text-center font-mono text-xs p-1.5 bg-slate-50 border border-slate-100 rounded-lg items-center">
                            <div className="font-black text-slate-800">{char}</div>
                            <div className="text-slate-600">{x}</div>
                            <div className="text-slate-500">{raw}</div>
                            <div className="text-indigo-600 font-bold">{encVal}</div>
                            <div className="font-black text-emerald-600 bg-emerald-50 rounded py-0.5">{cipherChar}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-3 border-t border-slate-200 text-right">
                      <button
                        onClick={() => setShowReviewModal(false)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-indigo-700"
                      >
                        Close Review
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
{/* ───────────────────────────────────────────────────────────── */}
          {/* SCENE 4: REALISTIC 3D POLICE STATION & INTERACTIVE DECRYPTION */}
          {/* ───────────────────────────────────────────────────────────── */}
          {(currentScene === "SCENE_4_DECRYPT" ||
            currentScene === "SCENE_4_DELIVERY" ||
            currentScene === "SCENE_4_ACTION") && (
            <div className="relative flex-1 w-full h-full flex flex-col md:flex-row min-h-0 overflow-hidden bg-[#f1f5f9]">
              {/* LEFT 70%: REALISTIC 3D POLICE STATION CANVAS */}
              <div className="flex-1 relative h-full bg-[#f1f5f9] min-h-0">
                <Canvas shadows camera={{ position: [0.0, 3.2, 5.4], fov: 48 }}>
                  <color attach="background" args={["#f0e6d8"]} />
                  <ambientLight intensity={0.85} color="#fffbf0" />
                  <directionalLight position={[4, 8, 5]} intensity={1.3} castShadow />
                  <PoliceStationEnvironment
                    receivedCiphertext={receivedCiphertext}
                    isVerified={isVerified}
                    isDecryptionCompleted={isDecryptionCompleted}
                    onEnvelopeDelivered={() => setShowCipherPaperPopup(true)}
                    onInspectorExit={() => {
                      sfxSuccess();
                      setScore(100);
                      setIsTimerRunning(false);
                      setCurrentScreen("RESULT");
                    }}
                  />
                </Canvas>

                {/* Top Overlay Badge */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-indigo-200 text-[10px] font-black text-indigo-950 shadow-md flex items-center gap-2 select-none">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>TAMIL NADU POLICE • NEHRU STREET POLICE STATION</span>
                </div>
              </div>

              {/* RIGHT 30%: INTERACTIVE AFFINE DECRYPTION WORKSPACE */}
              <div className="w-full md:w-[32%] lg:w-[30%] h-full bg-white border-l border-slate-200 flex flex-col justify-between overflow-y-auto shrink-0 shadow-lg">
                {/* SECTION A – DECRYPTION FORMULA */}
                <div className="p-3 border-b border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-white shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-700 mb-1.5">
                    <KeyRound size={15} className="text-indigo-600" />
                    <span>DECRYPTION FORMULA</span>
                  </div>
                  <div className="bg-indigo-50/90 rounded-xl p-2.5 border border-indigo-200 text-center">
                    <div className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                      MODULAR INVERSE AFFINE RULE
                    </div>
                    <div className="text-base sm:text-lg font-black font-mono text-indigo-950 my-1">
                      D(y) = 21(y - 9) mod 26
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-indigo-200/60 text-[11px] font-extrabold text-slate-700">
                      <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">Secret a = 5</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">Secret b = 9</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">a⁻¹ = 21</span>
                    </div>
                  </div>
                </div>

                {/* SECTION B – RECEIVED ENCRYPTED MESSAGE */}
                <div className="p-3 border-b border-slate-200 bg-slate-50 shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                      <FileText size={12} className="text-indigo-600" />
                      <span>RECEIVED ENCRYPTED MESSAGE</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sfxPop();
                        setShowCipherPaperPopup(true);
                      }}
                      className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen size={11} />
                      <span>View Letter</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 p-2 bg-white rounded-xl border border-indigo-100 max-h-24 overflow-y-auto">
                    {receivedCiphertext.split("").map((ch, idx) => {
                      if (ch === " ") return <span key={idx} className="w-2" />;
                      const isDecrypted = decryptPlainChars[idx] !== undefined;
                      const isActive = idx === decryptActiveIndex && !isDecryptionCompleted;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            sfxClick();
                            setDecryptActiveIndex(idx);
                            setDecryptStep1Identified(false);
                            setDecryptFeedback(null);
                            setDecryptInputPos("");
                          }}
                          className={`w-6 h-8 rounded-lg font-mono font-black text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isActive
                              ? "bg-indigo-600 text-white ring-2 ring-indigo-400 scale-105 shadow-sm"
                              : isDecrypted
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <span className="leading-none">{ch}</span>
                          <span className="text-[8px] opacity-75 mt-0.5 leading-none">
                            {decryptPlainChars[idx] || (decryptPositions[idx] !== undefined ? decryptPositions[idx] : "-")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION C & INTERACTIVE CALCULATION WORKSPACE */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  {!isDecryptionCompleted ? (
                    <div className="space-y-3">
                      {/* SECTION C – CURRENT ENCRYPTED LETTER */}
                      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                          <span className="uppercase text-[10px] font-black tracking-wider text-indigo-700">
                            CURRENT ENCRYPTED LETTER
                          </span>
                          <span className="font-mono text-indigo-900 font-extrabold text-xs">
                            LETTER {currentDecryptLetterProgress} OF 29
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-mono font-black text-2xl flex items-center justify-center shadow-xs">
                              {currentDecryptChar}
                            </span>
                            <div>
                              <div className="text-xs font-black text-slate-800">
                                Target Cipher: <span className="font-mono text-purple-700 text-sm">&ldquo;{currentDecryptChar}&rdquo;</span>
                              </div>
                              <div className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 mt-0.5 inline-block">
                                Alphabet Position: {currentDecryptChar} = {letterToNum(currentDecryptChar)}
                              </div>
                            </div>
                          </div>
                          {decryptStep1Identified && (
                            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              <span>y = {currentDecryptY}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* STEP 1: IDENTIFY ALPHABET POSITION */}
                      {!decryptStep1Identified ? (
                        <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100">
                          <div className="text-xs font-extrabold text-slate-700 mb-1">
                            <span className="text-indigo-600">STEP 1:</span> Find Alphabet Position for &ldquo;{currentDecryptChar}&rdquo;
                          </div>
                          <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                            What is the numerical position <strong>y</strong> of <strong>{currentDecryptChar}</strong>? (A = 0, B = 1 ... Z = 25)
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              value={decryptInputPos}
                              onChange={(e) => {
                                setDecryptInputPos(e.target.value);
                                setDecryptFeedback(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleValidateDecryptPos();
                              }}
                              placeholder="Enter 0-25"
                              className="w-28 px-3 py-2 bg-white border-2 border-indigo-200 rounded-xl font-mono text-base font-bold text-center focus:outline-hidden focus:border-indigo-600 text-slate-800 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={handleValidateDecryptPos}
                              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition active:scale-95"
                            >
                              CHECK POSITION
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* STEP 2: DECRYPTION FORMULA CALCULATION */
                        <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200">
                          <div className="text-xs font-extrabold text-slate-700 mb-1 flex items-center justify-between">
                            <span>
                              <span className="text-emerald-700">STEP 2:</span> Apply Decryption Formula
                            </span>
                            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Position y = {currentDecryptY}
                            </span>
                          </div>
                          {/* Step-by-step arithmetic */}
                          <div className="space-y-1 font-mono text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-emerald-100 my-2">
                            <div>D({currentDecryptY}) = 21 × ({currentDecryptY} - 9) mod 26</div>
                            <div>= 21 × ({currentDecryptY - 9}) mod 26</div>
                            <div>
                              = {21 * (currentDecryptY - 9)} mod 26 ={" "}
                              <strong className="text-emerald-700">{currentDecryptTargetNum}</strong>
                            </div>
                            <div className="pt-1 border-t border-slate-100 font-sans font-bold text-xs flex items-center justify-between">
                              <span className="text-slate-600">Position {currentDecryptTargetNum} corresponds to:</span>
                              <span className="font-mono text-base font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {currentDecryptTargetChar}
                              </span>
                            </div>
                          </div>

                          {/* STEP 3: APPLY DECRYPTION BUTTON */}
                          <button
                            type="button"
                            onClick={handleApplyDecryption}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <span>APPLY DECRYPTION</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}

                      {/* Feedback message */}
                      {decryptFeedback && (
                        <div className="p-2.5 rounded-xl text-xs font-bold bg-amber-50 border border-amber-200 text-amber-900">
                          {decryptFeedback}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ALL 29 LETTERS DECRYPTED - COMPACT STATUS & NATURAL 3D ENDING */
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase mb-1">
                          <CheckCircle2 size={12} />
                          <span>DECRYPTION COMPLETED &amp; VERIFIED</span>
                        </div>
                        <div className="text-xs font-mono font-black text-emerald-950 tracking-wide mt-1">
                          &ldquo;{PLAINTEXT}&rdquo;
                        </div>
                      </div>

                      {/* Natural Character Animation Status */}
                      <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-center space-y-1.5">
                        <div className="flex items-center justify-center gap-2 text-xs font-black text-indigo-950">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                          <span>Inspector Sundaram Standing &amp; Deploying...</span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600">
                          The inspector examined the decrypted evidence and is heading out to initiate lawful police action on Nehru Street.
                        </p>
                      </div>

                      {/* Fast-forward action button if user prefers immediate navigation */}
                      <button
                        type="button"
                        onClick={() => {
                          sfxSuccess();
                          setScore(100);
                          setIsTimerRunning(false);
                          setCurrentScreen("RESULT");
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <span>VIEW FINAL RESULTS NOW</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}

                  {/* RECOVERED ORIGINAL MESSAGE SECTION */}
                  <div className="mt-3 pt-3 border-t border-slate-200 shrink-0">
                    <div className="text-[10px] font-black uppercase text-indigo-700 tracking-wider mb-1 flex items-center gap-1">
                      <Shield size={12} className="text-indigo-600" />
                      <span>RECOVERED ORIGINAL MESSAGE</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm font-black text-slate-800 tracking-wider break-all shadow-inner">
                      {recoveredPlaintext}
                    </div>
                  </div>
                </div>
              </div>
              {/* PHYSICAL ENCRYPTED PAPER POPUP (Requirement 4) */}
              {showCipherPaperPopup && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                  <div className="relative max-w-xl w-full bg-[#FAF8F5] text-slate-800 rounded-2xl shadow-2xl border-4 border-[#E2D9CC] p-5 sm:p-7 flex flex-col font-sans animate-in zoom-in-95">
                    {/* Official Letterhead Header */}
                    <div className="flex items-center justify-between border-b-2 border-slate-300 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold shadow-xs">
                          <Lock size={18} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-red-700">
                            TAMIL NADU POLICE • OFFICIAL DISPATCH
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                            CONFIDENTIAL MESSAGE
                          </h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-800 text-[10px] font-black uppercase tracking-wider">
                          SEALED REPORT
                        </span>
                        <div className="text-[9px] font-mono font-bold text-slate-500 mt-0.5">
                          SOURCE: FRIEND OF POLICE
                        </div>
                      </div>
                    </div>

                    {/* Paper Document Content Area */}
                    <div className="p-4 sm:p-5 bg-white rounded-xl border border-amber-200/80 shadow-inner mb-4">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 mb-2 border-b border-slate-100 pb-1">
                        <span>ENCRYPTED CIPHERTEXT (RECEIVED DISPATCH)</span>
                        <span className="text-indigo-600 font-mono font-bold">AFFINE RULE: E(x)=(5x+9) mod 26</span>
                      </div>
                      <div className="p-3.5 bg-amber-50/60 rounded-lg border border-amber-200 font-mono font-black text-sm sm:text-base text-indigo-950 tracking-widest break-all text-center leading-relaxed select-all">
                        {receivedCiphertext}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600 mt-2.5 text-center leading-normal">
                        This encrypted dispatch was delivered in a sealed envelope to Nehru Street Police Station. The original plaintext remains strictly confidential until decoded using the Affine inverse decryption formula.
                      </p>
                    </div>

                    {/* Action to proceed with manual decryption */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-200">
                      <span className="text-xs font-semibold text-slate-600">
                        Review completed • Ready to decrypt
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          sfxSuccess();
                          setShowCipherPaperPopup(false);
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span>START AFFINE DECRYPTION</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 4. SCREEN 3: RESULT / COMPLETION PAGE (PRESERVED)                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {currentScreen === "RESULT" && (
        <main className="relative flex-1 w-full min-h-0 overflow-hidden flex flex-col items-center justify-center p-3 sm:p-6">
          
          {/* Confetti Celebration */}
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={300}
            gravity={0.22}
          />

          <div className="relative z-10 max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-xl border-2 border-indigo-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Top Vector Success Illustration matching Welcome page style */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-3 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="80" cy="80" r="72" stroke="#E0E7FF" strokeWidth="5" strokeDasharray="5 3" />
                <circle cx="80" cy="80" r="62" fill="#F0FDF4" stroke="#86EFAC" strokeWidth="2.5" />
                <path
                  d="M80 34 L108 46 V80 C108 98 96 114 80 122 C64 114 52 98 52 80 V46 L80 34 Z"
                  fill="#10B981"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M68 78 L76 86 L94 68"
                  stroke="#FFFFFF"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="112" cy="48" r="14" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
                <path
                  d="M112 40 L114.5 45 L120 45.8 L116 49.7 L117 55.2 L112 52.6 L107 55.2 L108 49.7 L104 45.8 L109.5 45 L112 40 Z"
                  fill="#FEF3C7"
                />
              </svg>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles size={12} className="text-emerald-600" />
              <span>Mission Accomplished • Friends of Police</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-1 leading-tight tracking-tight">
              Mission Completed!
            </h2>

            <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-md mx-auto leading-relaxed mb-4">
              Outstanding work! You have successfully decrypted the secret message and assisted the police in protecting Nehru Street.
            </p>

            {/* Prominently Displayed Accuracy Metric */}
            <div className="w-full bg-slate-50 border border-indigo-100 rounded-2xl p-4 sm:p-5 mb-5 shadow-inner flex flex-col items-center justify-center">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                ACCURACY
              </span>
              <div className="flex items-center gap-2">
                <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-600 tracking-tight">
                  {accuracyPercentage}%
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 mt-1">
                Mathematical Decryption Performance
              </span>
            </div>

            {/* Bottom Section: Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
              {/* PLAY AGAIN */}
              <button
                type="button"
                onClick={handlePlayAgain}
                className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-indigo-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <RefreshCw size={15} strokeWidth={2.4} />
                <span>PLAY AGAIN</span>
              </button>

              {/* BACK TO LABS */}
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
