"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Sprout,
  Sun,
  Droplets,
  Play,
  Sparkles,
} from "lucide-react";
import { useLabAudio } from "@/hooks/useLabAudio";
import { useLMSBridge } from "@/hooks/useLMSBridge";

// ═════════════════════════════════════════════════════════════════════════════
// 1. EXPERIMENT CONSTANTS & GAME PHASES
// ═════════════════════════════════════════════════════════════════════════════

export type GamePhase =
  | "INTRO"                   // Aarav arrives at garden with seeds & tools
  | "WALK_TO_1"               // Aarav walks to Location 1 (Sunny courtyard)
  | "LOCATION_1_SPOT"         // Spot marker at Location 1; "Choose this spot!"
  | "DIGGING_1"               // Aarav digs hole at Location 1 with crowbar
  | "LOCATION_1_SEED"         // 3D seed on grass; "Choose a seed!"
  | "PLACING_SEED_1"          // Aarav places seed into hole
  | "COVERING_1"              // Aarav automatically covers hole with soil
  | "WALK_TO_2"               // Aarav walks to Location 2 (Shaded beneath mango tree)
  | "LOCATION_2_SPOT"         // Spot marker at Location 2; "Choose this spot!"
  | "DIGGING_2"               // Aarav digs hole at Location 2 with crowbar
  | "LOCATION_2_SEED"         // 3D seed on grass; "Choose a seed!"
  | "PLACING_SEED_2"          // Aarav places seed into hole
  | "COVERING_2"              // Aarav automatically covers hole with soil
  | "INITIAL_WATER_PROMPT"    // Both planted; "Click the watering pot!"
  | "INITIAL_WATERING"        // Aarav waters Plant 1 then Plant 2 sequentially
  | "PLANTED_READY"           // Ready to start 75-day experiment
  | "TIME_LAPSE"              // 15-day time lapse with day-to-night sun & sky animation
  | "CHECKPOINT_WATER_PROMPT" // Day X time lapse done; "Let's water our plants!"
  | "CHECKPOINT_WATERING"     // Sequential watering after checkpoint
  | "CHECKPOINT_READY"        // Ready to advance to next 15-day interval
  | "FINAL_RESULT";           // Day 75 final side-by-side comparison & celebration

export type PlantingStep =
  | "PREPARE_SOIL" // Step 1: Use garden tool to prepare soil
  | "MAKE_HOLE"    // Step 2: Dig a planting hole
  | "PLACE_SEED"   // Step 3: Place seed in hole
  | "COVER_SEED"   // Step 4: Cover hole with soil
  | "WATER_SEED";  // Step 5: Pour water over planting location

export type GrowthCheckpoint = 0 | 15 | 30 | 45 | 60 | 75;

// Exact 3D coordinates for the two experiment sites (Preserved)
const SITE_A_POS: [number, number, number] = [2.3, 0.02, 0.6];  // Sunny open garden
const SITE_B_POS: [number, number, number] = [-2.7, 0.02, 0.6]; // Shaded beneath mango tree
const TREE_POS: [number, number, number] = [-6.2, 0, 0.3];      // Mango tree base (extreme left)

// ═════════════════════════════════════════════════════════════════════════════
// 2. BOTANICAL LEAF GEOMETRY (Based on User's Leaf Reference Image)
// ═════════════════════════════════════════════════════════════════════════════

// Custom botanical leaf shape: pointed tip, broad rounded belly, tapered base
function createBotanicalLeafShape(): THREE.Shape {
  const shape = new THREE.Shape();
  // Start at petiole base
  shape.moveTo(0, 0);
  // Left curve to broad belly
  shape.bezierCurveTo(-0.16, 0.1, -0.34, 0.35, -0.36, 0.62);
  // Left curve tapering to sharp pointed tip
  shape.bezierCurveTo(-0.34, 0.88, -0.16, 1.18, 0, 1.42);
  // Right curve tapering from pointed tip
  shape.bezierCurveTo(0.16, 1.18, 0.34, 0.88, 0.36, 0.62);
  // Right curve back to base
  shape.bezierCurveTo(0.34, 0.35, 0.16, 0.1, 0, 0);
  return shape;
}

const SHARED_LEAF_SHAPE = createBotanicalLeafShape();

interface BotanicalLeafProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  color?: string;
  veinColor?: string;
  droop?: number;
}

function BotanicalLeaf({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = "#2d7a36",
  veinColor = "#86efac",
  droop = 0,
}: BotanicalLeafProps) {
  const scaleVec: [number, number, number] = Array.isArray(scale)
    ? scale
    : [scale, scale, scale];

  return (
    <group position={position} rotation={rotation} scale={scaleVec}>
      {/* Organic stem / petiole connector */}
      <mesh position={[0, -0.05, 0]} rotation={[droop, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.016, 0.12, 6]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>

      {/* Main Leaf Blade with Reference Silhouette */}
      <group rotation={[droop, 0, 0]}>
        <mesh castShadow receiveShadow>
          <shapeGeometry args={[SHARED_LEAF_SHAPE]} />
          <meshStandardMaterial
            color={color}
            roughness={0.55}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Central Midrib Vein running from base to pointed tip */}
        <mesh position={[0, 0.71, 0.006]}>
          <cylinderGeometry args={[0.007, 0.014, 1.42, 6]} />
          <meshStandardMaterial color={veinColor} roughness={0.6} />
        </mesh>

        {/* Secondary Lateral Branching Veins for Botanical Realism */}
        {[
          { y: 0.38, w: 0.22, rot: 0.7 },
          { y: 0.38, w: 0.22, rot: -0.7 },
          { y: 0.65, w: 0.28, rot: 0.65 },
          { y: 0.65, w: 0.28, rot: -0.65 },
          { y: 0.95, w: 0.2, rot: 0.6 },
          { y: 0.95, w: 0.2, rot: -0.6 },
        ].map((v, i) => (
          <mesh
            key={`vein-${i}`}
            position={[v.rot > 0 ? -v.w * 0.45 : v.w * 0.45, v.y, 0.004]}
            rotation={[0, 0, v.rot]}
          >
            <cylinderGeometry args={[0.003, 0.005, v.w, 4]} />
            <meshStandardMaterial color={veinColor} roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. FOUR DISTINCT VILLAGE HOUSES (Architectural References 1 to 4)
// ═════════════════════════════════════════════════════════════════════════════

// ── HOUSE 1: Traditional Mud & Brick House (Ref Image 1) ──
// Placed towards extreme left, partially behind mango tree
function House1MudBrick({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Mud Foundation Plinth */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[3.3, 0.24, 2.4]} />
        <meshStandardMaterial color="#96603a" roughness={0.94} />
      </mesh>

      {/* Main Structure Body */}
      {/* Left Wall: Exposed reddish clay brick texture */}
      <mesh position={[-0.75, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.5, 2.05]} />
        <meshStandardMaterial color="#994635" roughness={0.88} />
      </mesh>
      {/* Brick mortar horizontal bands */}
      {[-0.4, -0.1, 0.2, 0.5].map((y, i) => (
        <mesh key={`brick-line-${i}`} position={[-0.75, 0.95 + y, 1.04]}>
          <boxGeometry args={[1.48, 0.02, 0.02]} />
          <meshStandardMaterial color="#d4b499" roughness={0.9} />
        </mesh>
      ))}

      {/* Right Wall: Hand-plastered mud wall */}
      <mesh position={[0.75, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.5, 2.05]} />
        <meshStandardMaterial color="#c49767" roughness={0.92} />
      </mesh>

      {/* Rustic Wooden Post holding up the overhanging thatched eave on left */}
      <mesh position={[-1.5, 0.95, 1.15]} castShadow>
        <cylinderGeometry args={[0.045, 0.055, 1.7, 8]} />
        <meshStandardMaterial color="#422915" roughness={0.9} />
      </mesh>

      {/* Open Dark Doorway in center/right */}
      <mesh position={[0.15, 0.85, 1.04]}>
        <boxGeometry args={[0.62, 1.3, 0.08]} />
        <meshStandardMaterial color="#170f09" roughness={0.9} />
      </mesh>
      {/* Timber door lintel */}
      <mesh position={[0.15, 1.54, 1.05]}>
        <boxGeometry args={[0.76, 0.1, 0.1]} />
        <meshStandardMaterial color="#3b1f0c" roughness={0.85} />
      </mesh>

      {/* Left Window with dark rustic burlap/weather cloth hanging */}
      <group position={[-0.8, 1.05, 1.04]}>
        <mesh>
          <boxGeometry args={[0.42, 0.44, 0.04]} />
          <meshStandardMaterial color="#222b38" roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.04, 0.02]}>
          <boxGeometry args={[0.36, 0.36, 0.02]} />
          <meshStandardMaterial color="#334155" roughness={0.95} />
        </mesh>
      </group>

      {/* Right Side Small Rustic Window */}
      <group position={[1.05, 1.05, 1.04]}>
        <mesh>
          <boxGeometry args={[0.3, 0.32, 0.04]} />
          <meshStandardMaterial color="#1f1813" />
        </mesh>
      </group>

      {/* Thick Low-Sloping Hip Thatched Straw Roof */}
      <mesh position={[0, 2.15, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[2.35, 1.25, 4]} />
        <meshStandardMaterial color="#63513a" roughness={0.98} />
      </mesh>
      {/* Overhanging straw eave fringe extending all around */}
      <mesh position={[0, 1.72, 0]}>
        <boxGeometry args={[3.5, 0.18, 2.55]} />
        <meshStandardMaterial color="#4d3e2b" roughness={0.98} />
      </mesh>
      {/* Ridge straw bundle on peak */}
      <mesh position={[0, 2.76, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 1.1, 8]} />
        <meshStandardMaterial color="#3b2e1e" />
      </mesh>
    </group>
  );
}

// ── SMALL REALISTIC EXTERIOR HOUSE LIGHT (Activated only during brief night transitions) ──
function ExteriorHouseLight({
  position,
  isNight = false,
}: {
  position: [number, number, number];
  isNight?: boolean;
}) {
  return (
    <group position={position}>
      {/* Wall Mounting Bracket */}
      <mesh position={[0, 0, -0.035]} castShadow>
        <boxGeometry args={[0.03, 0.05, 0.05]} />
        <meshStandardMaterial color="#1c1917" metalness={0.8} />
      </mesh>
      {/* Small Lantern Cap */}
      <mesh position={[0, 0.045, 0]}>
        <coneGeometry args={[0.04, 0.028, 6]} />
        <meshStandardMaterial color="#292524" metalness={0.7} />
      </mesh>
      {/* Small Glass Lantern / Bulb */}
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.028, 0.022, 0.05, 8]} />
        <meshStandardMaterial
          color={isNight ? "#fef08a" : "#44403c"}
          emissive={isNight ? "#fbbf24" : "#000000"}
          emissiveIntensity={isNight ? 2.2 : 0}
          roughness={isNight ? 0.2 : 0.8}
        />
      </mesh>
      {/* Localized Warm Point Light (Active ONLY during night) */}
      {isNight && (
        <pointLight
          color="#fde047"
          intensity={1.2}
          distance={2.8}
          decay={2}
        />
      )}
    </group>
  );
}

// ── HOUSE 2: Traditional Village Home with Front Veranda & Pillars (Ref Image 2) ──
// Placed towards upper-middle background with ample breathing space
function House2VerandaHome({
  position,
  rotationY = 0,
  isNight = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  isNight?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Small Exterior Night Light by Door */}
      <ExteriorHouseLight position={[0.55, 1.35, 0.38]} isNight={isNight} />

      {/* Wide Raised Plinth Platform */}
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <boxGeometry args={[3.8, 0.36, 2.7]} />
        <meshStandardMaterial color="#d1ad7a" roughness={0.92} />
      </mesh>

      {/* Central Entrance Steps */}
      <mesh position={[0, 0.09, 1.5]} receiveShadow>
        <boxGeometry args={[0.9, 0.18, 0.35]} />
        <meshStandardMaterial color="#c29c66" roughness={0.92} />
      </mesh>

      {/* Recessed Enclosed Rooms (Back wall of veranda) */}
      <mesh position={[0, 1.12, -0.45]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.55, 1.6]} />
        <meshStandardMaterial color="#ebd4b5" roughness={0.88} />
      </mesh>

      {/* Traditional Wooden Double Door in Center */}
      <mesh position={[0, 1.0, 0.36]} castShadow>
        <boxGeometry args={[0.68, 1.35, 0.06]} />
        <meshStandardMaterial color="#422513" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.0, 0.38]}>
        <boxGeometry args={[0.78, 1.45, 0.02]} />
        <meshStandardMaterial color="#946338" roughness={0.65} />
      </mesh>

      {/* Two Barred Windows on Veranda Wall */}
      {[-0.95, 0.95].map((x, i) => (
        <group key={`win-${i}`} position={[x, 1.12, 0.36]}>
          <mesh>
            <boxGeometry args={[0.48, 0.48, 0.04]} />
            <meshStandardMaterial color="#262626" />
          </mesh>
          {/* Vertical wooden/iron security bars */}
          {[-0.14, -0.05, 0.05, 0.14].map((bx, j) => (
            <mesh key={`bar-${j}`} position={[bx, 0, 0.02]}>
              <cylinderGeometry args={[0.012, 0.012, 0.44, 4]} />
              <meshStandardMaterial color="#525252" metalness={0.4} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Veranda Corner Posts & Support Pillars */}
      {[-1.65, -0.55, 0.55, 1.65].map((px, i) => (
        <mesh key={`pillar-${i}`} position={[px, 1.05, 1.15]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 1.75, 8]} />
          <meshStandardMaterial color="#784b25" roughness={0.85} />
        </mesh>
      ))}

      {/* Traditional Wooden Cot / Charpai on Veranda Left */}
      <group position={[-1.15, 0.48, 0.75]} rotation={[0, 0.15, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.08, 0.52]} />
          <meshStandardMaterial color="#b48348" roughness={0.8} />
        </mesh>
        {/* Charpai wooden legs */}
        {[
          [-0.4, -0.1, -0.22],
          [0.4, -0.1, -0.22],
          [-0.4, -0.1, 0.22],
          [0.4, -0.1, 0.22],
        ].map((lp, k) => (
          <mesh key={`leg-${k}`} position={lp as [number, number, number]}>
            <cylinderGeometry args={[0.025, 0.02, 0.18, 6]} />
            <meshStandardMaterial color="#522f16" />
          </mesh>
        ))}
      </group>

      {/* Traditional Clay Water Matka on Veranda Right */}
      <group position={[1.2, 0.52, 0.75]}>
        <mesh castShadow>
          <sphereGeometry args={[0.16, 14, 14]} />
          <meshStandardMaterial color="#9a3412" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.07, 0.06, 0.06, 12]} />
          <meshStandardMaterial color="#852e12" />
        </mesh>
      </group>

      {/* Wide Sloping Thatched Roof covering rooms and veranda */}
      <mesh position={[0, 2.35, 0.1]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[2.55, 1.35, 4]} />
        <meshStandardMaterial color="#8a7248" roughness={0.96} />
      </mesh>
      {/* Overhanging straw eaves fringe */}
      <mesh position={[0, 1.85, 0.15]}>
        <boxGeometry args={[4.05, 0.16, 2.95]} />
        <meshStandardMaterial color="#6a5435" roughness={0.98} />
      </mesh>
    </group>
  );
}

// ── HOUSE 3: Detailed Thatched House with Steep Gables & Timber Panels (Ref Image 3) ──
// Placed towards upper-right background
function House3DetailedGableThatch({
  position,
  rotationY = 0,
  isNight = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  isNight?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Small Exterior Night Light by Front Door */}
      <ExteriorHouseLight position={[0.55, 1.35, 1.08]} isNight={isNight} />

      {/* Stone Foundation Plinth */}
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.32, 2.5]} />
        <meshStandardMaterial color="#646059" roughness={0.9} />
      </mesh>

      {/* Wooden Entry Steps */}
      {[0, 1].map((st) => (
        <mesh
          key={`step-${st}`}
          position={[0, 0.06 + st * 0.1, 1.35 + st * 0.2]}
          receiveShadow
        >
          <boxGeometry args={[0.85, 0.12, 0.35]} />
          <meshStandardMaterial color="#573822" roughness={0.8} />
        </mesh>
      ))}

      {/* Walls with Warm Timber Paneling and Mud Infill */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 1.5, 2.1]} />
        <meshStandardMaterial color="#8c5831" roughness={0.85} />
      </mesh>

      {/* Vertical Timber Battens / Slats */}
      {[-1.2, -0.8, -0.4, 0.4, 0.8, 1.2].map((bx, i) => (
        <mesh key={`batten-${i}`} position={[bx, 1.05, 1.06]}>
          <boxGeometry args={[0.04, 1.48, 0.03]} />
          <meshStandardMaterial color="#4a2c16" roughness={0.8} />
        </mesh>
      ))}

      {/* Traditional Wooden Entrance with Paneled Frame */}
      <mesh position={[0, 0.95, 1.06]} castShadow>
        <boxGeometry args={[0.68, 1.35, 0.06]} />
        <meshStandardMaterial color="#331c0d" roughness={0.7} />
      </mesh>
      {/* Wooden door lintel canopy */}
      <mesh position={[0, 1.65, 1.15]}>
        <boxGeometry args={[0.85, 0.08, 0.22]} />
        <meshStandardMaterial color="#2d170a" />
      </mesh>

      {/* Lattice Windows on left and right */}
      {[-0.95, 0.95].map((wx, i) => (
        <group key={`lat-win-${i}`} position={[wx, 1.15, 1.06]}>
          <mesh>
            <boxGeometry args={[0.42, 0.46, 0.04]} />
            <meshStandardMaterial color="#291a10" />
          </mesh>
          <mesh position={[0, 0, 0.015]}>
            <boxGeometry args={[0.34, 0.38, 0.02]} />
            <meshStandardMaterial color="#fef3c7" transparent opacity={0.65} />
          </mesh>
          {/* Cross frame */}
          <mesh position={[0, 0, 0.025]}>
            <boxGeometry args={[0.36, 0.03, 0.01]} />
            <meshStandardMaterial color="#291a10" />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <boxGeometry args={[0.03, 0.4, 0.01]} />
            <meshStandardMaterial color="#291a10" />
          </mesh>
        </group>
      ))}

      {/* Steep Triangular Gabled Thatched Roof with visible layers */}
      {/* Lower Thatch Layer */}
      <mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[2.2, 1.6, 4]} />
        <meshStandardMaterial color="#7a6240" roughness={0.96} />
      </mesh>
      {/* Upper Steep Ridge Thatched Cap */}
      <mesh position={[0, 2.75, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.5, 1.1, 4]} />
        <meshStandardMaterial color="#5a4428" roughness={0.98} />
      </mesh>
      {/* Overhanging straw eave edge */}
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[3.3, 0.18, 2.6]} />
        <meshStandardMaterial color="#4a361e" roughness={0.98} />
      </mesh>
    </group>
  );
}

// ── HOUSE 4: Simple Rural Mud House / Circular Bhunga (Ref Image 4) ──
// Placed deeper back with height & depth variation
function House4RuralBhunga({
  position,
  rotationY = 0,
  isNight = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  isNight?: boolean;
}) {
  const radius = 1.45;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Small Exterior Night Light on Wall beside Entrance */}
      <ExteriorHouseLight position={[0.52, 1.25, 1.38]} isNight={isNight} />

      {/* Circular Raised Earthen Plinth Base */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[radius + 0.15, radius + 0.15, 0.24, 32]} />
        <meshStandardMaterial color="#ceac80" roughness={0.94} />
      </mesh>

      {/* Circular Textured Mud Plaster Wall */}
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, 1.65, 32]} />
        <meshStandardMaterial color="#be976b" roughness={0.92} />
      </mesh>

      {/* Recessed Carved Rustic Wooden Entrance Door */}
      <mesh position={[0, 0.82, radius - 0.05]} castShadow>
        <boxGeometry args={[0.62, 1.25, 0.18]} />
        <meshStandardMaterial color="#3b1f0c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.82, radius + 0.01]}>
        <boxGeometry args={[0.74, 1.35, 0.04]} />
        <meshStandardMaterial color="#7a4c28" roughness={0.7} />
      </mesh>

      {/* Small Square Niche Window in Curved Wall */}
      <group position={[-radius * 0.75, 0.92, radius * 0.62]} rotation={[0, Math.PI / 4, 0]}>
        <mesh>
          <boxGeometry args={[0.26, 0.28, 0.08]} />
          <meshStandardMaterial color="#1a120c" />
        </mesh>
      </group>

      {/* Tall Conical Straw Thatched Roof */}
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
        <coneGeometry args={[radius + 0.42, 1.85, 32]} />
        <meshStandardMaterial color="#826b48" roughness={0.98} />
      </mesh>

      {/* Traditional Wrapped Rope / Straw Ridge Rings (Seen in Ref Image 4) */}
      {[2.0, 2.45, 2.9].map((ry, i) => (
        <mesh key={`ring-${i}`} position={[0, ry, 0]}>
          <torusGeometry args={[(radius + 0.4) * (1 - (ry - 1.7) / 2.3), 0.035, 6, 24]} />
          <meshStandardMaterial color="#544129" roughness={0.95} />
        </mesh>
      ))}

      {/* Thick Lower Straw Overhang Fringe */}
      <mesh position={[0, 1.74, 0]}>
        <cylinderGeometry args={[radius + 0.44, radius + 0.4, 0.16, 32]} />
        <meshStandardMaterial color="#4d3b25" roughness={0.98} />
      </mesh>

      {/* Conical Roof Peak Finial */}
      <mesh position={[0, 3.48, 0]}>
        <coneGeometry args={[0.08, 0.32, 16]} />
        <meshStandardMaterial color="#2d1f12" />
      </mesh>
    </group>
  );
}

// ── TREE ON THE EXTREME RIGHT SIDE (Requested in Task) ──
function RightVillageTree({ position }: { position: [number, number, number] }) {
  const leavesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (leavesRef.current) {
      leavesRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.6 + 1.0) * 0.012;
    }
  });

  return (
    <group position={position}>
      {/* Natural Gnarled Trunk with Base Roots */}
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.5, 3.2, 12]} />
        <meshStandardMaterial color="#422915" roughness={0.92} />
      </mesh>
      {/* Exposed Roots */}
      <mesh position={[0.22, 0.12, 0.15]} rotation={[0.2, 0.3, 0.5]}>
        <cylinderGeometry args={[0.1, 0.2, 0.7, 8]} />
        <meshStandardMaterial color="#351f0f" roughness={0.95} />
      </mesh>
      <mesh position={[-0.2, 0.12, -0.15]} rotation={[-0.2, 0.6, -0.5]}>
        <cylinderGeometry args={[0.09, 0.18, 0.65, 8]} />
        <meshStandardMaterial color="#351f0f" roughness={0.95} />
      </mesh>

      {/* Main Spreading Limbs */}
      <mesh position={[-0.45, 2.8, 0.1]} rotation={[0.2, -0.3, 0.6]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 2.1, 8]} />
        <meshStandardMaterial color="#422915" roughness={0.9} />
      </mesh>
      <mesh position={[0.45, 2.9, -0.1]} rotation={[-0.2, 0.4, -0.55]} castShadow>
        <cylinderGeometry args={[0.15, 0.22, 2.0, 8]} />
        <meshStandardMaterial color="#422915" roughness={0.9} />
      </mesh>

      {/* Canopy Foliage Clusters with Botanical Leaves */}
      <group ref={leavesRef}>
        {[
          { pos: [0, 4.0, 0], r: 1.6, col: "#15803d" },
          { pos: [-0.8, 3.4, 0.2], r: 1.35, col: "#166534" },
          { pos: [0.8, 3.5, -0.2], r: 1.35, col: "#15803d" },
          { pos: [0.1, 4.6, 0.1], r: 1.25, col: "#22c55e" },
        ].map((f, i) => (
          <group key={`rt-fol-${i}`} position={f.pos as [number, number, number]}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[f.r, 12, 12]} />
              <meshStandardMaterial color={f.col} roughness={0.8} />
            </mesh>
            {/* Outward botanical leaf sprigs */}
            {[-0.6, 0.6].map((lx, j) => (
              <BotanicalLeaf
                key={`rt-leaf-${i}-${j}`}
                position={[lx * f.r * 0.45, -f.r * 0.35, 0.2]}
                rotation={[0.7, j * Math.PI, 0.3]}
                scale={[0.22, 0.3, 0.22]}
                color="#15803d"
                veinColor="#86efac"
              />
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

// ── Neighborhood Assembly: 4 Independent Houses with Generous Breathing Space ──
function VillageNeighborhood({ isNight = false }: { isNight?: boolean }) {
  return (
    <group>
      {/* HOUSE 1: Ref Image 1 (Extreme Left, partially behind large mango tree - No light) */}
      <House1MudBrick
        position={[-7.2, 0, -4.2]}
        rotationY={0.15}
      />

      {/* HOUSE 2: Ref Image 2 (Left-center background with front veranda - Has Night Light) */}
      <House2VerandaHome
        position={[-3.0, 0, -4.8]}
        rotationY={-0.06}
        isNight={isNight}
      />

      {/* HOUSE 4: Ref Image 4 (Deeper back, creating natural depth variation - Has Night Light) */}
      <House4RuralBhunga
        position={[1.6, 0, -6.2]}
        rotationY={0.12}
        isNight={isNight}
      />

      {/* HOUSE 3: Ref Image 3 (Upper-right background with steep gabled thatch - Has Night Light) */}
      <House3DetailedGableThatch
        position={[6.0, 0, -4.6]}
        rotationY={-0.22}
        isNight={isNight}
      />

      {/* NEW TREE ON EXTREME RIGHT SIDE (Requested in Task) */}
      <RightVillageTree
        position={[8.8, 0, -4.0]}
      />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. IMPROVED MANGO TREE WITH ORGANIC FOLIAGE & HANGING MANGOES
// ═════════════════════════════════════════════════════════════════════════════

function MangoTree() {
  const leavesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (leavesRef.current) {
      leavesRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.7) * 0.015;
    }
  });

  // Hanging Ripe Mango Fruits coordinates
  const mangoPositions: [number, number, number][] = [
    [1.6, 2.5, 0.8],
    [2.2, 2.7, 0.4],
    [2.8, 2.3, 0.6],
    [1.9, 2.9, -0.2],
    [1.1, 2.7, 0.9],
    [2.5, 2.6, -0.3],
    [0.7, 2.8, 0.7],
    [3.1, 2.4, 0.2],
    [1.4, 3.1, 0.3],
    [2.0, 2.3, 1.0],
    [1.0, 2.4, -0.1],
    [2.7, 2.8, 0.1],
  ];

  // Canopy leaf cluster coordinates for realistic organic foliage density
  const foliageNodes: [number, number, number, number][] = [
    [0.2, 4.4, 0, 1.9],
    [2.5, 3.7, 0.4, 1.7],
    [1.7, 4.6, 0.2, 1.5],
    [-1.3, 3.9, 0.2, 1.4],
    [3.2, 3.2, 0.3, 1.2],
    [0.8, 3.8, -0.5, 1.3],
  ];

  return (
    <group position={TREE_POS}>
      {/* ── Gnarled Branching Trunk ── */}
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.46, 0.75, 3.6, 16]} />
        <meshStandardMaterial color="#3a2213" roughness={0.92} />
      </mesh>
      {/* Surface roots anchored in grass */}
      <mesh position={[0.35, 0.14, 0.25]} rotation={[0.2, 0.4, 0.6]}>
        <cylinderGeometry args={[0.16, 0.28, 0.9, 12]} />
        <meshStandardMaterial color="#321c0f" roughness={0.92} />
      </mesh>
      <mesh position={[-0.32, 0.14, -0.25]} rotation={[-0.2, 0.8, -0.6]}>
        <cylinderGeometry args={[0.15, 0.26, 0.85, 12]} />
        <meshStandardMaterial color="#321c0f" roughness={0.92} />
      </mesh>

      {/* Sprawling Major Branches reaching into garden toward Site B */}
      <mesh position={[1.5, 2.9, 0.3]} rotation={[0.3, 0.2, -0.75]} castShadow>
        <cylinderGeometry args={[0.24, 0.36, 3.1, 14]} />
        <meshStandardMaterial color="#3a2213" roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 3.6, -0.3]} rotation={[-0.3, 0.5, -0.6]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 2.6, 14]} />
        <meshStandardMaterial color="#3a2213" roughness={0.9} />
      </mesh>
      <mesh position={[-0.9, 3.3, 0.1]} rotation={[0.2, -0.4, 0.65]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 2.3, 14]} />
        <meshStandardMaterial color="#3a2213" roughness={0.9} />
      </mesh>

      {/* ── Multi-Layered Canopy with Botanical Foliage Sprigs ── */}
      <group ref={leavesRef}>
        {foliageNodes.map(([fx, fy, fz, fr], idx) => (
          <group key={`foliage-${idx}`} position={[fx, fy, fz]}>
            {/* Core organic foliage cluster */}
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[fr, 12, 12]} />
              <meshStandardMaterial
                color={idx % 2 === 0 ? "#173b15" : "#1e4d1b"}
                roughness={0.78}
              />
            </mesh>
            {/* Outward extending botanical lanceolate mango leaves */}
            {[-0.8, -0.3, 0.3, 0.8].map((ox, j) => (
              <BotanicalLeaf
                key={`leaf-sprig-${idx}-${j}`}
                position={[ox * fr * 0.5, -fr * 0.4, (j % 2 === 0 ? 0.3 : -0.3) * fr]}
                rotation={[0.8, (j * Math.PI) / 2, 0.4]}
                scale={[0.24, 0.35, 0.24]}
                color="#1b4d1b"
                veinColor="#4ade80"
                droop={0.3}
              />
            ))}
          </group>
        ))}

        {/* ── Multiple Clearly Visible Ripe Golden Mangoes (#f59e0b) ── */}
        {mangoPositions.map((pos, idx) => (
          <group key={`mango-${idx}`} position={pos}>
            {/* Pedicel stem */}
            <mesh position={[0, 0.09, 0]}>
              <cylinderGeometry args={[0.012, 0.014, 0.12, 6]} />
              <meshBasicMaterial color="#3e2311" />
            </mesh>
            {/* Ripe Mango Fruit */}
            <mesh position={[0, 0, 0]} rotation={[0.25, 0, 0.18]} castShadow>
              <sphereGeometry args={[0.115, 12, 12]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.35} />
            </mesh>
            {/* Sunlit blush on mango surface */}
            <mesh position={[0.03, 0.02, 0.06]}>
              <sphereGeometry args={[0.065, 8, 8]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.65} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── Realistic Mango Tree Canopy Shadow Over Location B ── */}
      <mesh position={[3.5, 0.01, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.3, 32]} />
        <meshBasicMaterial color="#163110" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh position={[2.1, 0.01, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.9, 32]} />
        <meshBasicMaterial color="#163110" transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. NATURAL BOTANICAL PLANT MODELS (Tomatoes, Chillies, Brinjals, Greens)
// ═════════════════════════════════════════════════════════════════════════════

// ── Tomato Plant: Stems, Pairs of Pointed Botanical Leaves, Red Tomatoes & Flowers ──
function TomatoPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Soil base mound */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.04, 12]} />
        <meshStandardMaterial color="#382112" roughness={0.95} />
      </mesh>

      {/* Visible main green stem emerging from soil */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.036, 0.6, 8]} />
        <meshStandardMaterial color="#166534" roughness={0.75} />
      </mesh>

      {/* 4 Branching Petiole Stems extending naturally */}
      {/* Branch 1 */}
      <group position={[0, 0.25, 0]} rotation={[0.4, 0.2, -0.65]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.014, 0.018, 0.26, 6]} />
          <meshStandardMaterial color="#15803d" />
        </mesh>
        <BotanicalLeaf
          position={[-0.04, 0.12, 0]}
          rotation={[0.3, 0, 0.6]}
          scale={[0.18, 0.18, 0.18]}
          color="#15803d"
          veinColor="#86efac"
        />
        <BotanicalLeaf
          position={[0.04, 0.18, 0]}
          rotation={[-0.3, 0, -0.6]}
          scale={[0.18, 0.18, 0.18]}
          color="#16a34a"
          veinColor="#86efac"
        />
        <BotanicalLeaf
          position={[0, 0.26, 0]}
          rotation={[0, 0, 0]}
          scale={[0.2, 0.2, 0.2]}
          color="#15803d"
          veinColor="#86efac"
        />
      </group>

      {/* Branch 2 */}
      <group position={[0, 0.36, 0]} rotation={[-0.3, 1.4, 0.6]}>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.014, 0.018, 0.28, 6]} />
          <meshStandardMaterial color="#15803d" />
        </mesh>
        <BotanicalLeaf
          position={[-0.05, 0.14, 0]}
          rotation={[0.2, 0, 0.5]}
          scale={[0.19, 0.19, 0.19]}
          color="#166534"
          veinColor="#86efac"
        />
        <BotanicalLeaf
          position={[0.05, 0.2, 0]}
          rotation={[-0.2, 0, -0.5]}
          scale={[0.19, 0.19, 0.19]}
          color="#15803d"
          veinColor="#86efac"
        />
        <BotanicalLeaf
          position={[0, 0.28, 0]}
          scale={[0.22, 0.22, 0.22]}
          color="#22c55e"
          veinColor="#bbf7d0"
        />
      </group>

      {/* Branch 3 */}
      <group position={[0, 0.48, 0]} rotation={[0.2, -1.8, -0.55]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.012, 0.016, 0.24, 6]} />
          <meshStandardMaterial color="#166534" />
        </mesh>
        <BotanicalLeaf
          position={[-0.04, 0.12, 0]}
          rotation={[0.3, 0, 0.4]}
          scale={[0.16, 0.16, 0.16]}
          color="#15803d"
          veinColor="#86efac"
        />
        <BotanicalLeaf
          position={[0, 0.24, 0]}
          scale={[0.2, 0.2, 0.2]}
          color="#16a34a"
          veinColor="#86efac"
        />
      </group>

      {/* Terminal Top Leaf Cluster */}
      <group position={[0, 0.6, 0]}>
        <BotanicalLeaf
          position={[0, 0.05, 0]}
          scale={[0.22, 0.24, 0.22]}
          color="#22c55e"
          veinColor="#bbf7d0"
        />
      </group>

      {/* Clusters of Ripe Red Tomatoes (#ef4444) with 5-Star Green Calyx Sepals */}
      {[
        [-0.12, 0.28, 0.1],
        [0.15, 0.35, -0.06],
        [-0.08, 0.42, -0.12],
        [0.1, 0.22, 0.12],
      ].map((p, i) => (
        <group key={`tomato-${i}`} position={p as [number, number, number]}>
          <mesh castShadow>
            <sphereGeometry args={[0.072, 12, 12]} />
            <meshStandardMaterial color="#dc2626" roughness={0.3} metalness={0.05} />
          </mesh>
          {/* Calyx Star on top */}
          <mesh position={[0, 0.065, 0]}>
            <coneGeometry args={[0.038, 0.02, 5]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
        </group>
      ))}

      {/* Small Yellow Tomato Blossom */}
      <mesh position={[0.08, 0.52, 0.08]}>
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
    </group>
  );
}

// ── Chilli Plant: Thin Branching Stems, Slender Botanical Leaves, Red & Green Chillies ──
function ChilliPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Soil mound */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.18, 0.24, 0.04, 12]} />
        <meshStandardMaterial color="#382112" roughness={0.95} />
      </mesh>

      {/* Slender main stem */}
      <mesh position={[0, 0.26, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.028, 0.52, 8]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>

      {/* 3 Spreading side branches */}
      {/* Branch A */}
      <group position={[0, 0.22, 0]} rotation={[0.2, 0.4, -0.6]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.012, 0.015, 0.25, 6]} />
          <meshStandardMaterial color="#15803d" />
        </mesh>
        <BotanicalLeaf
          position={[-0.04, 0.12, 0]}
          rotation={[0.2, 0, 0.4]}
          scale={[0.14, 0.22, 0.14]}
          color="#15803d"
          veinColor="#86efac"
        />
        <BotanicalLeaf
          position={[0, 0.24, 0]}
          scale={[0.14, 0.24, 0.14]}
          color="#16a34a"
          veinColor="#86efac"
        />
      </group>

      {/* Branch B */}
      <group position={[0, 0.34, 0]} rotation={[-0.2, -1.2, 0.55]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.012, 0.015, 0.24, 6]} />
          <meshStandardMaterial color="#15803d" />
        </mesh>
        <BotanicalLeaf
          position={[0.04, 0.12, 0]}
          rotation={[-0.2, 0, -0.4]}
          scale={[0.14, 0.22, 0.14]}
          color="#166534"
          veinColor="#86efac"
        />
        <BotanicalLeaf
          position={[0, 0.24, 0]}
          scale={[0.14, 0.24, 0.14]}
          color="#22c55e"
          veinColor="#bbf7d0"
        />
      </group>

      {/* Terminal leaf node */}
      <BotanicalLeaf
        position={[0, 0.52, 0]}
        scale={[0.15, 0.25, 0.15]}
        color="#22c55e"
        veinColor="#bbf7d0"
      />

      {/* Hanging Pointed Chillies (Curved downwards) */}
      {[
        [-0.09, 0.24, 0.08, "#dc2626", 0.3],
        [0.12, 0.32, -0.06, "#dc2626", -0.4],
        [0.04, 0.2, 0.12, "#16a34a", 0.2],
        [-0.08, 0.36, -0.1, "#15803d", -0.3],
      ].map(([x, y, z, col, rotZ], i) => (
        <group
          key={`chilli-${i}`}
          position={[x as number, y as number, z as number]}
          rotation={[0.2, 0, rotZ as number]}
        >
          {/* Stem connector */}
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.008, 0.01, 0.06, 6]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
          {/* Tapered curved chilli body */}
          <mesh position={[0, -0.04, 0]} castShadow>
            <coneGeometry args={[0.026, 0.16, 8]} />
            <meshStandardMaterial color={col as string} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Brinjal Plant: Broad Leaves, Sturdy Stem, Glossy Purple Eggplants ──
function BrinjalPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Soil base mound */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.24, 0.3, 0.04, 12]} />
        <meshStandardMaterial color="#382112" roughness={0.95} />
      </mesh>

      {/* Sturdy central stem with slight purple tint */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.045, 0.6, 8]} />
        <meshStandardMaterial color="#14532d" roughness={0.8} />
      </mesh>

      {/* Broad Wavy Cordate Leaves (Scaled wider) */}
      {[
        { pos: [-0.14, 0.25, 0.08], rot: [0.4, 0.3, 0.7], sc: [0.28, 0.26, 0.28] },
        { pos: [0.15, 0.35, -0.06], rot: [-0.3, -0.6, -0.7], sc: [0.32, 0.3, 0.32] },
        { pos: [-0.12, 0.45, -0.1], rot: [0.2, -1.2, 0.6], sc: [0.3, 0.28, 0.3] },
        { pos: [0.1, 0.52, 0.1], rot: [-0.4, 1.1, -0.6], sc: [0.28, 0.26, 0.28] },
        { pos: [0, 0.62, 0], rot: [0.1, 0, 0], sc: [0.3, 0.3, 0.3] },
      ].map((lf, i) => (
        <BotanicalLeaf
          key={`brinjal-leaf-${i}`}
          position={lf.pos as [number, number, number]}
          rotation={lf.rot as [number, number, number]}
          scale={lf.sc as [number, number, number]}
          color={i % 2 === 0 ? "#166534" : "#15803d"}
          veinColor="#581c87"
        />
      ))}

      {/* Hanging Glossy Deep-Purple Brinjals / Eggplants (#581c87) */}
      {[
        [0.14, 0.22, 0.1],
        [-0.15, 0.28, -0.08],
      ].map((p, i) => (
        <group key={`brinjal-${i}`} position={p as [number, number, number]}>
          {/* Eggplant Body */}
          <mesh position={[0, -0.06, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.068, 0.2, 12]} />
            <meshStandardMaterial color="#4a044e" roughness={0.25} metalness={0.08} />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <sphereGeometry args={[0.068, 12, 12]} />
            <meshStandardMaterial color="#4a044e" roughness={0.25} metalness={0.08} />
          </mesh>
          {/* Calyx Green Star Hood on top */}
          <mesh position={[0, 0.04, 0]}>
            <coneGeometry args={[0.065, 0.05, 6]} />
            <meshStandardMaterial color="#14532d" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Leafy Vegetable Patch: Rosette of Radiating Fresh Botanical Leaves ──
function LeafyGreensPatch({ position }: { position: [number, number, number] }) {
  const leaves = [
    { rot: [0.45, 0, 0.2], sc: 0.24, col: "#15803d" },
    { rot: [-0.4, 0.9, -0.3], sc: 0.26, col: "#16a34a" },
    { rot: [0.2, -1.2, 0.5], sc: 0.22, col: "#22c55e" },
    { rot: [-0.5, 2.1, 0.1], sc: 0.25, col: "#15803d" },
    { rot: [0.35, -2.4, -0.4], sc: 0.23, col: "#166534" },
    { rot: [0.1, 0.4, 0], sc: 0.28, col: "#22c55e" },
  ];

  return (
    <group position={position}>
      {/* Loam soil mound */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.2, 0.26, 0.04, 12]} />
        <meshStandardMaterial color="#382112" roughness={0.95} />
      </mesh>
      {/* Individual leaves radiating from root crown */}
      {leaves.map((l, i) => (
        <BotanicalLeaf
          key={`spinach-${i}`}
          position={[0, 0.03, 0]}
          rotation={l.rot as [number, number, number]}
          scale={l.sc}
          color={l.col}
          veinColor="#bbf7d0"
          droop={0.4}
        />
      ))}
    </group>
  );
}

// ── Marigold Flower Bush: Stems, Leaves & Vibrant Multi-Layered Saffron Blooms ──
function MarigoldCluster({ position }: { position: [number, number, number] }) {
  const blooms = [
    { pos: [-0.08, 0.24, 0.06], col: "#ea580c" },
    { pos: [0.08, 0.26, -0.05], col: "#f59e0b" },
    { pos: [0.0, 0.3, 0.08], col: "#facc15" },
    { pos: [-0.07, 0.2, -0.08], col: "#ea580c" },
  ];

  return (
    <group position={position}>
      {/* Branching green stems */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.025, 0.28, 8]} />
        <meshStandardMaterial color="#166534" roughness={0.7} />
      </mesh>

      {/* Feathery botanical leaves */}
      {[-0.6, 0, 0.6].map((a, i) => (
        <BotanicalLeaf
          key={`m-leaf-${i}`}
          position={[0, 0.12 + i * 0.04, 0]}
          rotation={[0.3, a, 0.5 * (i % 2 === 0 ? 1 : -1)]}
          scale={[0.12, 0.16, 0.12]}
          color="#15803d"
          veinColor="#86efac"
        />
      ))}

      {/* Layered Pom-Pom Marigold Blooms */}
      {blooms.map((b, i) => (
        <group key={`bloom-${i}`} position={b.pos as [number, number, number]}>
          {/* Green Calyx base */}
          <mesh position={[0, -0.02, 0]}>
            <coneGeometry args={[0.035, 0.03, 8]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
          {/* Outer petal ring */}
          <mesh castShadow>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshStandardMaterial color={b.col} roughness={0.45} />
          </mesh>
          {/* Inner golden crest */}
          <mesh position={[0, 0.025, 0]}>
            <sphereGeometry args={[0.036, 10, 10]} />
            <meshStandardMaterial color="#fef08a" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Environment Assembly: Continuous Lawn, Footpath, and Believable Vegetable Garden ──
function FullVillageGardenEnvironment() {
  return (
    <group>
      {/* ── EXPANSIVE CONTINUOUS GREEN LAWN (Sized 70 x 50 to eliminate blue void) ── */}
      <mesh position={[0, 0, 4.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 50]} />
        <meshStandardMaterial color="#448026" roughness={0.88} />
      </mesh>

      {/* ── FOREGROUND WALKING PATHWAY ACROSS BOTTOM ── */}
      <group position={[0, 0.005, 3.8]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[28, 1.6]} />
          <meshStandardMaterial color="#caa066" roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.002, -0.85]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[28, 0.15]} />
          <meshStandardMaterial color="#6a8e38" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.002, 0.85]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[28, 0.15]} />
          <meshStandardMaterial color="#6a8e38" roughness={0.9} />
        </mesh>

        {/* Natural river stones along footpath */}
        {[
          [-3.5, 0.05, -0.75],
          [-1.8, 0.06, -0.72],
          [0.8, 0.05, -0.76],
          [2.6, 0.06, -0.74],
          [4.5, 0.05, -0.73],
        ].map((pos, i) => (
          <mesh key={`stone-${i}`} position={pos as [number, number, number]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color="#78716c" roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* ── RICH VEGETABLE AND FLOWER GARDEN (Clear of experimental sites) ── */}
      {/* Right Plot: Tomatoes, Chillies, Greens */}
      <TomatoPlant position={[4.4, 0, 0.2]} />
      <TomatoPlant position={[5.2, 0, 1.3]} />
      <ChilliPlant position={[3.8, 0, 1.9]} />
      <ChilliPlant position={[4.6, 0, 2.4]} />
      <LeafyGreensPatch position={[5.5, 0, 0.3]} />

      {/* Left Plot: Brinjals & Greens */}
      <BrinjalPlant position={[-0.9, 0, 2.1]} />
      <BrinjalPlant position={[-1.6, 0, 2.4]} />
      <LeafyGreensPatch position={[-4.3, 0, 1.8]} />

      {/* Saffron & Golden Marigolds */}
      <MarigoldCluster position={[0.6, 0, -1.8]} />
      <MarigoldCluster position={[-2.1, 0, -1.8]} />
      <MarigoldCluster position={[3.2, 0, -1.8]} />
      <MarigoldCluster position={[5.8, 0, 0.8]} />
      <MarigoldCluster position={[-4.5, 0, 1.1]} />

      {/* Natural Grass Tufts with Botanical Blades */}
      {[
        [-0.4, 0, 0.3],
        [0.8, 0, 1.1],
        [-1.8, 0, 1.2],
        [3.4, 0, 0.2],
        [-3.6, 0, 0.4],
      ].map((pos, i) => (
        <group key={`tuft-${i}`} position={pos as [number, number, number]}>
          <BotanicalLeaf
            rotation={[0.3, i * 0.8, 0.4]}
            scale={[0.1, 0.16, 0.1]}
            color="#2d6a2f"
            veinColor="#4ade80"
          />
        </group>
      ))}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. NATURAL INTERACTIVE PLANTING SPOT & DIRECT 3D OBJECTS
// ═════════════════════════════════════════════════════════════════════════════

// ── Small Black Circular Marker for Soil Preparation (Direct Object Interaction) ──
interface GroundSpotMarkerProps {
  position: [number, number, number];
  onClick: () => void;
}

function GroundSpotMarker({ position, onClick }: GroundSpotMarkerProps) {
  const markerRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (markerRef.current) {
      const t = state.clock.getElapsedTime();
      const s = 1 + Math.sin(t * 5) * 0.06;
      markerRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group ref={markerRef} position={position}>
      {/* Small Black Circular Marker flat on the ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.18, 32]} />
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>

      {/* Subtle outer dark ring for crisp edge definition against garden soil */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <ringGeometry args={[0.18, 0.22, 32]} />
        <meshBasicMaterial color="#334155" transparent opacity={0.65} />
      </mesh>

      {/* Invisible Clickable Hit Cylinder */}
      <mesh
        position={[0, 0.15, 0]}
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
        <cylinderGeometry args={[0.4, 0.4, 0.35, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── Clickable 3D Seed Lying on Grass (No Circle around Seed) ──
interface GroundSeedObjectProps {
  position: [number, number, number];
  onClick: () => void;
}

function GroundSeedObject({ position, onClick }: GroundSeedObjectProps) {
  const seedRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (seedRef.current) {
      const t = state.clock.getElapsedTime();
      seedRef.current.position.y = position[1] + Math.sin(t * 4) * 0.015;
      seedRef.current.rotation.y = t * 0.8;
    }
  });

  return (
    <group ref={seedRef} position={position}>
      {/* 3D Golden-Amber Seed Body */}
      <mesh castShadow rotation={[0.25, 0.15, 0]}>
        <sphereGeometry args={[0.075, 16, 16]} scale={[1, 0.65, 1.35]} />
        <meshStandardMaterial
          color="#d97706"
          roughness={0.35}
          metalness={0.15}
          emissive="#b45309"
          emissiveIntensity={0.25}
        />
      </mesh>
      {/* Hilum / seed scar */}
      <mesh position={[0, 0.035, 0.02]}>
        <sphereGeometry args={[0.022, 10, 10]} scale={[0.4, 0.2, 0.9]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} />
      </mesh>
      {/* Subtle sparkle indicator above the seed */}
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.026, 8, 8]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.75} />
      </mesh>

      {/* Invisible Clickable Hit Cylinder */}
      <mesh
        position={[0, 0.05, 0]}
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
        <cylinderGeometry args={[0.3, 0.3, 0.35, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

interface PlantingSpotProps {
  position: [number, number, number];
  isSunny: boolean;
  step: PlantingStep | "COMPLETED";
  isWatered?: boolean;
}

function PlantingSpot({
  position,
  isSunny,
  step,
  isWatered = false,
}: PlantingSpotProps) {
  const isSoilPrepared = step !== "PREPARE_SOIL";
  const isHoleMade = step !== "PREPARE_SOIL" && step !== "MAKE_HOLE";
  const isSeedInHole = step === "COVER_SEED" || step === "WATER_SEED" || step === "COMPLETED";
  const isCovered = step === "WATER_SEED" || step === "COMPLETED";

  return (
    <group position={position}>
      {/* ── Prepared Rich Loam Soil (Appears naturally when tilled) ── */}
      {isSoilPrepared && (
        <group position={[0, 0.015, 0]}>
          {/* Tilled soil mound */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[0.38, 24]} />
            <meshStandardMaterial
              color={isWatered ? "#231308" : "#3d2210"}
              roughness={0.95}
            />
          </mesh>

          {/* ── REALISTIC 3D DUG HOLE WITH CAVITY & DISPLACED EARTH RIM ── */}
          {isHoleMade && !isCovered && (
            <group position={[0, 0, 0]}>
              {/* Raised rim of excavated freshly dug soil around the rim */}
              <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
                <torusGeometry args={[0.18, 0.045, 8, 20]} />
                <meshStandardMaterial color="#4a2813" roughness={0.92} />
              </mesh>

              {/* Excavated soil lumps/clods around the rim */}
              {[
                [0.19, 0.03, 0.07],
                [-0.17, 0.03, -0.09],
                [0.07, 0.03, -0.19],
                [-0.11, 0.03, 0.15],
              ].map((cp, idx) => (
                <mesh key={`clod-${idx}`} position={cp as [number, number, number]}>
                  <sphereGeometry args={[0.025, 6, 6]} />
                  <meshStandardMaterial color="#351a0a" roughness={0.95} />
                </mesh>
              ))}

              {/* Realistic 3D Cavity depression recessed down into soil */}
              <mesh position={[0, -0.06, 0]}>
                <cylinderGeometry args={[0.16, 0.08, 0.14, 16, 1, true]} />
                <meshStandardMaterial
                  color="#150a04"
                  roughness={0.96}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {/* Dark floor of the hole */}
              <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.08, 16]} />
                <meshStandardMaterial color="#0c0502" roughness={0.98} />
              </mesh>

              {/* Seed visibly resting inside the hole */}
              {isSeedInHole && (
                <mesh position={[0, -0.07, 0]} castShadow>
                  <sphereGeometry args={[0.045, 12, 12]} scale={[1, 0.7, 1.2]} />
                  <meshStandardMaterial color="#d97706" roughness={0.5} />
                </mesh>
              )}
            </group>
          )}

          {/* Smooth covered & patted soil mound */}
          {isCovered && (
            <mesh position={[0, 0.02, 0]}>
              <sphereGeometry args={[0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial
                color={isWatered ? "#221206" : "#3c220e"}
                roughness={0.92}
              />
            </mesh>
          )}

          {/* Water droplets sheen sparkles when watered */}
          {isWatered && (
            <group position={[0, 0.035, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.22, 0.32, 16]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. 3D GROWING PLANT MODEL WITH BOTANICAL LEAF ARCHITECTURE
// ═════════════════════════════════════════════════════════════════════════════

interface PlantModelProps {
  position: [number, number, number];
  isSunny: boolean;
  day: GrowthCheckpoint;
}

function GrowingPlant({ position, isSunny, day }: PlantModelProps) {
  const plantRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (plantRef.current && day > 0) {
      const t = state.clock.getElapsedTime();
      plantRef.current.rotation.z = Math.sin(t * 1.5) * (isSunny ? 0.025 : 0.04);
      plantRef.current.rotation.x = Math.cos(t * 1.2) * 0.02;
    }
  });

  if (day === 0) return null;

  const sunnyHeights = { 15: 0.36, 30: 0.72, 45: 1.15, 60: 1.55, 75: 1.95 };
  const shadedHeights = { 15: 0.18, 30: 0.38, 45: 0.54, 60: 0.74, 75: 0.92 };

  const height = isSunny ? sunnyHeights[day] : shadedHeights[day];
  const stemColor = isSunny ? "#15803d" : "#84cc16";
  const leafColor = isSunny ? "#16a34a" : "#bef264";
  const veinColor = isSunny ? "#86efac" : "#d9f99d";
  const stemRadius = isSunny ? 0.035 * (day / 35 + 0.5) : 0.02 * (day / 50 + 0.4);

  return (
    <group position={position} ref={plantRef}>
      {/* ── Main Plant Stem ── */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[stemRadius * 0.7, stemRadius, height, 12]} />
        <meshStandardMaterial color={stemColor} roughness={0.7} />
      </mesh>

      {/* ── DAY 15: Young Sprout Botanical Leaves ── */}
      {day >= 15 && (
        <group position={[0, height * 0.85, 0]}>
          <BotanicalLeaf
            position={[-0.08, 0, 0]}
            rotation={[0.3, 0, 0.65]}
            scale={[0.16, 0.18, 0.16]}
            color={leafColor}
            veinColor={veinColor}
          />
          <BotanicalLeaf
            position={[0.08, 0, 0]}
            rotation={[-0.3, 0, -0.65]}
            scale={[0.16, 0.18, 0.16]}
            color={leafColor}
            veinColor={veinColor}
          />
        </group>
      )}

      {/* ── DAY 30: Secondary Branching Leaves ── */}
      {day >= 30 && (
        <group position={[0, height * 0.6, 0]}>
          <BotanicalLeaf
            position={[0, 0, 0.1]}
            rotation={[0.5, 0.4, 0]}
            scale={[0.22, 0.24, 0.22]}
            color={leafColor}
            veinColor={veinColor}
          />
          <BotanicalLeaf
            position={[0, 0, -0.1]}
            rotation={[-0.5, -0.4, 0]}
            scale={[0.22, 0.24, 0.22]}
            color={leafColor}
            veinColor={veinColor}
          />
        </group>
      )}

      {/* ── DAY 45: Branching Foliage Tier ── */}
      {day >= 45 && (
        <>
          <group position={[0, height * 0.4, 0]}>
            <BotanicalLeaf
              position={[-0.14, 0.04, 0.06]}
              rotation={[0.3, 0.5, 0.7]}
              scale={[0.26, 0.28, 0.26]}
              color={leafColor}
              veinColor={veinColor}
            />
            <BotanicalLeaf
              position={[0.14, 0.04, -0.06]}
              rotation={[-0.3, -0.5, -0.7]}
              scale={[0.26, 0.28, 0.26]}
              color={leafColor}
              veinColor={veinColor}
            />
          </group>

          {isSunny && (
            <mesh position={[0, height + 0.04, 0]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color="#fef08a" />
            </mesh>
          )}
        </>
      )}

      {/* ── DAY 60: Flourishing Foliage & Open Blossoms ── */}
      {day >= 60 && (
        <>
          <group position={[0, height * 0.75, 0]}>
            <BotanicalLeaf
              position={[0.16, 0.05, 0.1]}
              rotation={[0.4, -0.4, -0.6]}
              scale={[0.28, 0.3, 0.28]}
              color={leafColor}
              veinColor={veinColor}
            />
            <BotanicalLeaf
              position={[-0.16, 0.05, -0.1]}
              rotation={[-0.4, 0.4, 0.6]}
              scale={[0.28, 0.3, 0.28]}
              color={leafColor}
              veinColor={veinColor}
            />
          </group>

          {isSunny && (
            <group position={[0, height + 0.06, 0]}>
              <mesh>
                <sphereGeometry args={[0.08, 12, 12]} />
                <meshStandardMaterial color="#facc15" roughness={0.3} />
              </mesh>
              {[0, 1, 2, 3, 4].map((i) => (
                <mesh
                  key={`petal-${i}`}
                  position={[
                    Math.cos((i * Math.PI * 2) / 5) * 0.1,
                    0,
                    Math.sin((i * Math.PI * 2) / 5) * 0.1,
                  ]}
                  rotation={[0, (i * Math.PI * 2) / 5, 0]}
                >
                  <circleGeometry args={[0.05, 8]} />
                  <meshStandardMaterial color="#fef08a" side={THREE.DoubleSide} />
                </mesh>
              ))}
            </group>
          )}
        </>
      )}

      {/* ── DAY 75: Fully Mature Climax (Healthy Full Plant vs Shaded Stunted Plant) ── */}
      {day >= 75 && (
        <>
          {isSunny ? (
            <group position={[0, height * 0.85, 0]}>
              {[-0.22, 0, 0.22].map((ox, i) => (
                <BotanicalLeaf
                  key={`canopy-leaf-${i}`}
                  position={[ox, 0.08, 0]}
                  rotation={[0.3, i * 0.8, -0.35]}
                  scale={[0.32, 0.34, 0.32]}
                  color="#15803d"
                  veinColor="#86efac"
                />
              ))}
              {/* Young bean / pea pods on Sunny plant */}
              <mesh position={[0.15, -0.15, 0.1]} rotation={[0.2, 0, 0.4]}>
                <cylinderGeometry args={[0.025, 0.015, 0.22, 8]} />
                <meshStandardMaterial color="#4ade80" />
              </mesh>
              <mesh position={[-0.15, -0.15, -0.1]} rotation={[-0.2, 0, -0.4]}>
                <cylinderGeometry args={[0.025, 0.015, 0.22, 8]} />
                <meshStandardMaterial color="#4ade80" />
              </mesh>
            </group>
          ) : (
            <group position={[0, height * 0.8, 0]}>
              <BotanicalLeaf
                position={[0.1, 0.04, 0]}
                rotation={[0.3, 0, -0.45]}
                scale={[0.18, 0.18, 0.18]}
                color="#bef264"
                veinColor="#d9f99d"
                droop={0.5}
              />
            </group>
          )}
        </>
      )}

      {/* ── Direct Sunlight Sparkle Ring on Sunny Plant ── */}
      {isSunny && (
        <group position={[0, height + 0.18, 0]}>
          <mesh>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. REALISTIC STYLIZED 3D CHARACTER MODEL (Inspired by Character Reference)
// ═════════════════════════════════════════════════════════════════════════════

interface CharacterProps {
  phase: GamePhase;
  stepA: PlantingStep | "COMPLETED";
  stepB: PlantingStep | "COMPLETED";
  charAction: "IDLE" | "PREPARE_SOIL" | "DIG_HOLE" | "PLACE_SEED" | "COVER_SOIL" | "WATERING";
  actionSite: "A" | "B" | null;
  isWatering: boolean;
  comicMessage?: string | null;
}

function CharacterChild({
  phase,
  charAction,
  actionSite,
  isWatering,
  comicMessage,
}: CharacterProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const targetPos = useRef<[number, number, number]>([4.5, 0, 1.8]);
  const targetRotY = useRef<number>(0);

  // Update target destination based on game phase and active action site
  useEffect(() => {
    if (actionSite === "A") {
      targetPos.current = [SITE_A_POS[0] + 0.6, 0, SITE_A_POS[2] + 0.35];
      targetRotY.current = -2.25;
    } else if (actionSite === "B") {
      targetPos.current = [SITE_B_POS[0] + 0.6, 0, SITE_B_POS[2] + 0.35];
      targetRotY.current = -2.25;
    } else if (phase === "INTRO") {
      targetPos.current = [4.5, 0, 1.8];
      targetRotY.current = -0.3;
    } else if (
      phase === "WALK_TO_1" ||
      phase === "LOCATION_1_SPOT" ||
      phase === "DIGGING_1" ||
      phase === "LOCATION_1_SEED" ||
      phase === "PLACING_SEED_1" ||
      phase === "COVERING_1"
    ) {
      targetPos.current = [SITE_A_POS[0] + 0.6, 0, SITE_A_POS[2] + 0.35];
      targetRotY.current = -2.25;
    } else if (
      phase === "WALK_TO_2" ||
      phase === "LOCATION_2_SPOT" ||
      phase === "DIGGING_2" ||
      phase === "LOCATION_2_SEED" ||
      phase === "PLACING_SEED_2" ||
      phase === "COVERING_2"
    ) {
      targetPos.current = [SITE_B_POS[0] + 0.6, 0, SITE_B_POS[2] + 0.35];
      targetRotY.current = -2.25;
    } else {
      targetPos.current = [0.2, 0, 2.0];
      targetRotY.current = 0;
    }
  }, [phase, actionSite]);

  useFrame((state, delta) => {
    if (!rootGroupRef.current) return;
    const cur = rootGroupRef.current.position;
    const [tx, ty, tz] = targetPos.current;

    const dx = tx - cur.x;
    const dz = tz - cur.z;
    const dist = Math.hypot(dx, dz);
    const t = state.clock.getElapsedTime();

    if (dist > 0.06) {
      // Walking locomotion
      cur.x += dx * 3.6 * delta;
      cur.z += dz * 3.6 * delta;
      rootGroupRef.current.rotation.y = Math.atan2(dx, dz);

      const walkCycle = t * 10;
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(walkCycle) * 0.55;
        rightLegRef.current.rotation.x = -Math.sin(walkCycle) * 0.55;
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = -Math.sin(walkCycle) * 0.45;
        rightArmRef.current.rotation.x = Math.sin(walkCycle) * 0.45;
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.08;
      }
    } else {
      // Arrived at destination position
      cur.x = tx;
      cur.z = tz;
      rootGroupRef.current.rotation.y +=
        (targetRotY.current - rootGroupRef.current.rotation.y) * 8 * delta;

      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      }

      // Procedural action animations synchronized with user gardening interactions
      if (charAction === "PREPARE_SOIL") {
        // Bend down and use long crowbar with both hands to loosen and till surface soil
        if (torsoRef.current) torsoRef.current.rotation.x = 0.58;
        if (rightArmRef.current) {
          const stroke = Math.sin(t * 11);
          rightArmRef.current.rotation.x = -0.88 + stroke * 0.22;
          rightArmRef.current.rotation.y = -0.18;
          rightArmRef.current.rotation.z = -0.14;
        }
        if (leftArmRef.current) {
          const stroke = Math.sin(t * 11);
          leftArmRef.current.rotation.x = -0.72 + stroke * 0.22;
          leftArmRef.current.rotation.y = 0.22;
          leftArmRef.current.rotation.z = 0.18;
        }
      } else if (charAction === "DIG_HOLE") {
        // Bend down lower and vigorously drive long crowbar into soil to excavate cavity
        if (torsoRef.current) torsoRef.current.rotation.x = 0.72;
        if (rightArmRef.current) {
          const strike = Math.sin(t * 12);
          rightArmRef.current.rotation.x = -0.98 + strike * 0.32;
          rightArmRef.current.rotation.y = -0.22;
          rightArmRef.current.rotation.z = -0.16;
        }
        if (leftArmRef.current) {
          const strike = Math.sin(t * 12);
          leftArmRef.current.rotation.x = -0.78 + strike * 0.32;
          leftArmRef.current.rotation.y = 0.24;
          leftArmRef.current.rotation.z = 0.20;
        }
      } else if (charAction === "PLACE_SEED") {
        // Reach out with seed and drop into hole
        if (torsoRef.current) torsoRef.current.rotation.x = 0.48;
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -1.05;
          rightArmRef.current.rotation.z = -0.2;
        }
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = -0.3;
        }
      } else if (charAction === "COVER_SOIL") {
        // Bend down and use both hands to sweep and pat soil over hole
        if (torsoRef.current) torsoRef.current.rotation.x = 0.65;
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = Math.sin(t * 10) * 0.25 - 0.75;
          rightArmRef.current.rotation.z = -0.35;
        }
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = Math.cos(t * 10) * 0.25 - 0.75;
          leftArmRef.current.rotation.z = 0.35;
        }
      } else if (charAction === "WATERING" || isWatering) {
        // Hold watering pot with both hands, raise and tilt forward
        if (torsoRef.current) torsoRef.current.rotation.x = 0.35;
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -1.18;
          rightArmRef.current.rotation.z = -0.25;
        }
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = -0.92;
          leftArmRef.current.rotation.z = 0.38;
        }
      } else {
        // Cheerful Idle posture with subtle breathing
        if (torsoRef.current) {
          torsoRef.current.rotation.x = Math.sin(t * 2) * 0.02;
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = 0;
          rightArmRef.current.rotation.z = 0.12;
        }
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = 0;
          leftArmRef.current.rotation.z = -0.12;
        }
      }
    }
  });

  const skinColor = "#fcd7ba";
  const shirtColor = "#38bdf8";
  const collarColor = "#0284c7";
  const shortsColor = "#d4b896";
  const hairColor = "#3b2210";
  const shoeColor = "#2563eb";

  const isHoldingCrowbar = charAction === "PREPARE_SOIL" || charAction === "DIG_HOLE";
  const isHoldingCan = charAction === "WATERING" || isWatering;
  const isHoldingSeed = charAction === "PLACE_SEED";

  return (
    <group ref={rootGroupRef} position={[4.5, 0, 1.8]}>
      {/* ── COMIC-STYLE SPEECH BUBBLE POPUP (Dynamically tracking child's 3D position) ── */}
      {comicMessage && (
        <Html position={[0, 1.72, 0]} center pointerEvents="none">
          <div className="relative animate-in fade-in zoom-in-90 duration-200 select-none flex flex-col items-center">
            <div className="bg-[#FEFDF8] border-2 border-[#58B86A] text-[#24452D] font-black text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-xl whitespace-nowrap flex items-center justify-center tracking-tight">
              {comicMessage}
            </div>
            {/* Downward pointing triangle/tail towards child's head */}
            <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-[#58B86A] -mt-[1px]" />
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-[#FEFDF8] -mt-[8px]" />
          </div>
        </Html>
      )}

      {/* ── LOWER BODY: Hips & Legs ── */}
      {/* Waist & Shorts Body */}
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.165, 0.165, 0.14, 16]} />
        <meshStandardMaterial color={shortsColor} roughness={0.8} />
      </mesh>

      {/* Left Leg Group */}
      <group ref={leftLegRef} position={[-0.09, 0.52, 0]}>
        {/* Left Shorts Leg */}
        <mesh position={[0, -0.07, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.085, 0.16, 12]} />
          <meshStandardMaterial color={shortsColor} roughness={0.8} />
        </mesh>
        {/* Bare Knee & Lower Leg */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.052, 0.048, 0.18, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>
        {/* Light Blue Sock with White Cuff */}
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.054, 0.05, 0.11, 12]} />
          <meshStandardMaterial color="#93c5fd" />
        </mesh>
        <mesh position={[0, -0.295, 0]}>
          <cylinderGeometry args={[0.056, 0.056, 0.02, 12]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {/* Blue Sneaker with White Rubber Sole */}
        <group position={[0, -0.44, 0.04]}>
          <mesh castShadow>
            <boxGeometry args={[0.09, 0.08, 0.17]} />
            <meshStandardMaterial color={shoeColor} roughness={0.5} />
          </mesh>
          {/* White Rubber Sole */}
          <mesh position={[0, -0.035, 0]}>
            <boxGeometry args={[0.096, 0.024, 0.18]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          {/* White Toe Cap */}
          <mesh position={[0, -0.01, 0.065]}>
            <boxGeometry args={[0.085, 0.045, 0.045]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        </group>
      </group>

      {/* Right Leg Group */}
      <group ref={rightLegRef} position={[0.09, 0.52, 0]}>
        {/* Right Shorts Leg */}
        <mesh position={[0, -0.07, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.085, 0.16, 12]} />
          <meshStandardMaterial color={shortsColor} roughness={0.8} />
        </mesh>
        {/* Bare Knee & Lower Leg */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.052, 0.048, 0.18, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>
        {/* Light Blue Sock with White Cuff */}
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.054, 0.05, 0.11, 12]} />
          <meshStandardMaterial color="#93c5fd" />
        </mesh>
        <mesh position={[0, -0.295, 0]}>
          <cylinderGeometry args={[0.056, 0.056, 0.02, 12]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {/* Blue Sneaker with White Rubber Sole */}
        <group position={[0, -0.44, 0.04]}>
          <mesh castShadow>
            <boxGeometry args={[0.09, 0.08, 0.17]} />
            <meshStandardMaterial color={shoeColor} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.035, 0]}>
            <boxGeometry args={[0.096, 0.024, 0.18]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.01, 0.065]}>
            <boxGeometry args={[0.085, 0.045, 0.045]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        </group>
      </group>

      {/* ── UPPER BODY: Torso, Arms & Head (Bends at waist during actions) ── */}
      <group ref={torsoRef} position={[0, 0.65, 0]}>
        {/* Sky-Blue Collared Shirt Torso */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.175, 0.42, 16]} />
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </mesh>

        {/* Front Button Placket & Buttons */}
        <mesh position={[0, 0.22, 0.168]}>
          <boxGeometry args={[0.028, 0.36, 0.01]} />
          <meshStandardMaterial color={collarColor} />
        </mesh>
        {[0.12, 0.22, 0.32].map((by, i) => (
          <mesh key={`btn-${i}`} position={[0, by, 0.175]}>
            <sphereGeometry args={[0.009, 8, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
        ))}

        {/* Folded Shirt Collar Wings around neck */}
        <mesh position={[-0.07, 0.43, 0.09]} rotation={[0.4, 0.3, -0.3]}>
          <boxGeometry args={[0.09, 0.04, 0.015]} />
          <meshStandardMaterial color={collarColor} />
        </mesh>
        <mesh position={[0.07, 0.43, 0.09]} rotation={[0.4, -0.3, 0.3]}>
          <boxGeometry args={[0.09, 0.04, 0.015]} />
          <meshStandardMaterial color={collarColor} />
        </mesh>

        {/* Clean Neck */}
        <mesh position={[0, 0.46, 0]}>
          <cylinderGeometry args={[0.068, 0.078, 0.12, 14]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>

        {/* ── HEAD & DETAILED FACIAL FEATURES ── */}
        <group ref={headRef} position={[0, 0.68, 0]}>
          {/* Proportioned Head Base */}
          <mesh castShadow>
            <sphereGeometry args={[0.19, 20, 20]} scale={[1, 1.06, 0.96]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>

          {/* Natural Ears */}
          <mesh position={[-0.19, 0, 0]} rotation={[0, 0, -0.15]}>
            <sphereGeometry args={[0.04, 0.06, 0.025]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
          <mesh position={[0.19, 0, 0]} rotation={[0, 0, 0.15]}>
            <sphereGeometry args={[0.04, 0.06, 0.025]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>

          {/* Big Expressive Brown Eyes with Pupils & Catchlights */}
          {[-0.07, 0.07].map((ex, i) => (
            <group key={`eye-${i}`} position={[ex, 0.02, 0.16]}>
              {/* White Sclera */}
              <mesh scale={[1, 1.15, 0.4]}>
                <sphereGeometry args={[0.046, 14, 14]} />
                <meshStandardMaterial color="#ffffff" roughness={0.2} />
              </mesh>
              {/* Warm Brown Iris */}
              <mesh position={[0, 0, 0.038]}>
                <circleGeometry args={[0.032, 14]} />
                <meshStandardMaterial color="#78350f" roughness={0.3} />
              </mesh>
              {/* Dark Pupil */}
              <mesh position={[0, 0, 0.04]}>
                <circleGeometry args={[0.018, 12]} />
                <meshBasicMaterial color="#0f172a" />
              </mesh>
              {/* White Highlight Specular Dot */}
              <mesh position={[0.01, 0.012, 0.042]}>
                <circleGeometry args={[0.008, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}

          {/* Natural Dark Eyebrows */}
          <mesh position={[-0.07, 0.09, 0.168]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.065, 0.015, 0.01]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.07, 0.09, 0.168]} rotation={[0, 0, -0.1]}>
            <boxGeometry args={[0.065, 0.015, 0.01]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>

          {/* Cute Small Nose */}
          <mesh position={[0, -0.025, 0.185]}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshStandardMaterial color="#f7be97" roughness={0.6} />
          </mesh>

          {/* Friendly Smiling Mouth */}
          <mesh position={[0, -0.075, 0.168]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.03, 0.006, 6, 14, Math.PI]} />
            <meshStandardMaterial color="#be185d" />
          </mesh>

          {/* Rosy Cheeks */}
          <mesh position={[-0.11, -0.035, 0.145]}>
            <sphereGeometry args={[0.036, 10, 10]} />
            <meshStandardMaterial color="#fda4af" transparent opacity={0.45} />
          </mesh>
          <mesh position={[0.11, -0.035, 0.145]}>
            <sphereGeometry args={[0.036, 10, 10]} />
            <meshStandardMaterial color="#fda4af" transparent opacity={0.45} />
          </mesh>

          {/* ── STYLIZED TOUSLED BROWN HAIR (Ref Image) ── */}
          {/* Main Hair Cap */}
          <mesh position={[0, 0.06, -0.02]}>
            <sphereGeometry args={[0.205, 18, 18]} scale={[1.02, 1.05, 1.04]} />
            <meshStandardMaterial color={hairColor} roughness={0.88} />
          </mesh>
          {/* Forehead Hair Bangs */}
          {[-0.1, -0.04, 0.02, 0.08].map((hx, j) => (
            <mesh
              key={`bang-${j}`}
              position={[hx, 0.14, 0.15]}
              rotation={[0.3, 0, (j % 2 === 0 ? 0.2 : -0.2)]}
            >
              <coneGeometry args={[0.04, 0.11, 4]} />
              <meshStandardMaterial color={hairColor} roughness={0.88} />
            </mesh>
          ))}
          {/* Spiky Top Crown Hair Tufts */}
          {[
            [-0.05, 0.25, -0.02, 0.15],
            [0.05, 0.26, 0.02, -0.15],
            [0.0, 0.24, -0.08, 0.3],
          ].map(([tx, ty, tz, trot], k) => (
            <mesh
              key={`tuft-${k}`}
              position={[tx as number, ty as number, tz as number]}
              rotation={[trot as number, 0, (k % 2 === 0 ? 0.2 : -0.2)]}
            >
              <coneGeometry args={[0.05, 0.14, 4]} />
              <meshStandardMaterial color={hairColor} roughness={0.88} />
            </mesh>
          ))}
        </group>

        {/* ── LEFT ARM ── */}
        <group ref={leftArmRef} position={[-0.22, 0.36, 0]}>
          {/* Shirt Sleeve */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.062, 0.066, 0.14, 12]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
          {/* Forearm */}
          <mesh position={[0, -0.17, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.04, 0.18, 10]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
          {/* Hand with fingers */}
          <group position={[0, -0.28, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.048, 0.06, 0.026]} />
              <meshStandardMaterial color={skinColor} />
            </mesh>
            {/* Defined Fingers */}
            {[-0.016, -0.005, 0.006, 0.016].map((fx, idx) => (
              <mesh key={`l-fin-${idx}`} position={[fx, -0.04, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 0.03, 4]} />
                <meshStandardMaterial color={skinColor} />
              </mesh>
            ))}
          </group>
        </group>

        {/* ── RIGHT ARM ── */}
        <group ref={rightArmRef} position={[0.22, 0.36, 0]}>
          {/* Shirt Sleeve */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.062, 0.066, 0.14, 12]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
          {/* Forearm */}
          <mesh position={[0, -0.17, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.04, 0.18, 10]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
          {/* Hand with fingers */}
          <group position={[0, -0.28, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.048, 0.06, 0.026]} />
              <meshStandardMaterial color={skinColor} />
            </mesh>
            {/* Defined Fingers */}
            {[-0.016, -0.005, 0.006, 0.016].map((fx, idx) => (
              <mesh key={`r-fin-${idx}`} position={[fx, -0.04, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 0.03, 4]} />
                <meshStandardMaterial color={skinColor} />
              </mesh>
            ))}

            {/* ── REALISTIC LONG GARDENING CROWBAR (Used for Breaking Soil & Digging Holes) ── */}
            {isHoldingCrowbar && (
              <group position={[0, -0.04, 0.06]} rotation={[0.42, -0.14, 0]}>
                {/* Upper Hexagonal Steel Shaft (Extends above hands) */}
                <mesh position={[0, 0.18, 0]} castShadow>
                  <cylinderGeometry args={[0.016, 0.016, 0.36, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.25} />
                </mesh>

                {/* Tamper / Strike Top Cap */}
                <mesh position={[0, 0.37, 0]}>
                  <cylinderGeometry args={[0.022, 0.022, 0.035, 8]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.2} />
                </mesh>

                {/* Upper Hand Grip (Right Hand) - Textured Gripping Sleeve */}
                <mesh position={[0, 0.02, 0]}>
                  <cylinderGeometry args={[0.019, 0.019, 0.11, 10]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.7} />
                </mesh>

                {/* Lower Hand Grip (Left Hand) - Textured Gripping Sleeve */}
                <mesh position={[0, -0.14, 0]}>
                  <cylinderGeometry args={[0.019, 0.019, 0.11, 10]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.7} />
                </mesh>

                {/* Main Lower Steel Bar (Extends down to the ground) */}
                <mesh position={[0, -0.38, 0]} castShadow>
                  <cylinderGeometry args={[0.016, 0.016, 0.42, 8]} />
                  <meshStandardMaterial color="#475569" metalness={0.88} roughness={0.25} />
                </mesh>

                {/* Heavy Forged Chisel Blade / Wedge at bottom */}
                <group position={[0, -0.62, 0]}>
                  {/* Tapered Chisel Transition */}
                  <mesh position={[0, 0.025, 0]}>
                    <cylinderGeometry args={[0.016, 0.022, 0.06, 8]} />
                    <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
                  </mesh>
                  {/* Beveled Chisel Blade Wedge */}
                  <mesh position={[0, -0.025, 0]}>
                    <boxGeometry args={[0.038, 0.06, 0.012]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.2} />
                  </mesh>
                  {/* Sharp Beveled Ground-Striking Tip */}
                  <mesh position={[0, -0.06, 0]} rotation={[0, Math.PI / 4, 0]}>
                    <coneGeometry args={[0.022, 0.035, 4]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.15} />
                  </mesh>
                </group>
              </group>
            )}

            {/* Held Golden Seed during placement */}
            {isHoldingSeed && (
              <mesh position={[0, -0.06, 0.02]} castShadow>
                <sphereGeometry args={[0.045, 10, 10]} scale={[1, 0.7, 1.2]} />
                <meshStandardMaterial color="#d97706" roughness={0.5} />
              </mesh>
            )}
          </group>

          {/* Held Brass Watering Can in Hands during watering */}
          {isHoldingCan && (
            <group position={[-0.14, -0.28, 0.22]} rotation={[0.55, -0.2, 0]}>
              {/* Brass Body */}
              <mesh castShadow>
                <cylinderGeometry args={[0.13, 0.16, 0.28, 14]} />
                <meshStandardMaterial color="#b45309" metalness={0.75} roughness={0.3} />
              </mesh>
              {/* Handle */}
              <mesh position={[-0.12, 0.06, 0]} rotation={[0, 0, 0.4]}>
                <torusGeometry args={[0.11, 0.018, 6, 14, Math.PI]} />
                <meshStandardMaterial color="#78350f" metalness={0.6} />
              </mesh>
              {/* Spout angled forward */}
              <mesh position={[0.18, 0.08, 0]} rotation={[0, 0, -0.7]}>
                <cylinderGeometry args={[0.026, 0.04, 0.28, 10]} />
                <meshStandardMaterial color="#b45309" metalness={0.75} roughness={0.3} />
              </mesh>
              {/* Rosette shower head */}
              <mesh position={[0.28, 0.17, 0]}>
                <coneGeometry args={[0.058, 0.05, 10]} />
                <meshStandardMaterial color="#d97706" metalness={0.8} />
              </mesh>

              {/* Animated Water Streaming Cascade from spout to ground */}
              <group position={[0.3, 0.15, 0]}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((di) => (
                  <mesh
                    key={`can-drop-${di}`}
                    position={[
                      Math.sin(di) * 0.03 + 0.03,
                      -0.09 * (di + 1),
                      Math.cos(di) * 0.03,
                    ]}
                  >
                    <sphereGeometry args={[0.022, 6, 6]} />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
                  </mesh>
                ))}
              </group>
            </group>
          )}
        </group>
      </group>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. 3D WATERING CAN (DIRECT CLICKABLE OBJECT ON GROUND)
// ═════════════════════════════════════════════════════════════════════════════

interface WateringCanToolProps {
  position?: [number, number, number];
  isClickable?: boolean;
  onClick?: () => void;
}

function WateringCanTool({
  position = [0.0, 0.16, 1.4],
  isClickable = false,
  onClick,
}: WateringCanToolProps) {
  const canRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (canRef.current && isClickable) {
      const t = state.clock.getElapsedTime();
      const s = 1 + Math.sin(t * 5) * 0.04;
      canRef.current.scale.set(s, s, s);
    } else if (canRef.current) {
      canRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group ref={canRef} position={position}>
      {/* Traditional Indian Brass / Copper Watering Can */}
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.32, 16]} />
        <meshStandardMaterial color="#b45309" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[-0.14, 0.08, 0]} rotation={[0, 0, 0.4]}>
        <torusGeometry args={[0.12, 0.02, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#78350f" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.22, 0.12, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.03, 0.05, 0.32, 12]} />
        <meshStandardMaterial color="#b45309" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0.34, 0.22, 0]}>
        <coneGeometry args={[0.07, 0.06, 12]} />
        <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Invisible Clickable Hit Cylinder (Direct object interaction - NO circle around pot) */}
      {isClickable && (
        <mesh
          position={[0.08, 0.16, 0]}
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
          <cylinderGeometry args={[0.38, 0.38, 0.48, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. DYNAMIC SKY, CLOUDS, SUN, MOON & DAY-NIGHT CONTROLLER
// ═════════════════════════════════════════════════════════════════════════════

interface SkyAndLightingProps {
  timeLapseProgress: number;
  isTimeLapseActive: boolean;
}

function SkyAndLighting({ timeLapseProgress, isTimeLapseActive }: SkyAndLightingProps) {
  const sunLightRef = useRef<THREE.DirectionalLight>(null);

  const sunAngle = isTimeLapseActive ? timeLapseProgress * Math.PI * 2 : 0.65;
  const sunX = Math.cos(sunAngle) * 10.0;
  const sunY = Math.sin(sunAngle) * 8.5;
  const isNight = isTimeLapseActive && (timeLapseProgress > 0.45 && timeLapseProgress < 0.85);

  useFrame(() => {
    if (sunLightRef.current) {
      sunLightRef.current.position.set(sunX, Math.max(0.5, sunY), 4.5);
      sunLightRef.current.intensity = isNight ? 0.2 : Math.max(0.4, Math.sin(sunAngle) * 1.9);
      if (timeLapseProgress > 0.25 && timeLapseProgress < 0.45) {
        sunLightRef.current.color.set("#f97316");
      } else {
        sunLightRef.current.color.set("#fffbeb");
      }
    }
  });

  return (
    <>
      <ambientLight intensity={isNight ? 0.3 : 0.88} color={isNight ? "#312e81" : "#ffffff"} />

      <directionalLight
        ref={sunLightRef}
        position={[6, 9.5, 4.5]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* ── Soft Realistic 3D Puffy Clouds across upper sky ── */}
      {!isNight && (
        <group position={[0, 6.2, -6.5]}>
          {/* Cloud 1 */}
          <group position={[-5.5, 0.4, 0]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[1.2, 16, 16]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.88} />
            </mesh>
            <mesh position={[0.9, -0.2, 0]}>
              <sphereGeometry args={[0.85, 14, 14]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
            </mesh>
            <mesh position={[-0.8, -0.2, 0]}>
              <sphereGeometry args={[0.9, 14, 14]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
            </mesh>
          </group>

          {/* Cloud 2 */}
          <group position={[3.8, 0.8, -1.0]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[1.4, 16, 16]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.88} />
            </mesh>
            <mesh position={[1.0, -0.25, 0]}>
              <sphereGeometry args={[0.95, 14, 14]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
            </mesh>
            <mesh position={[-0.9, -0.2, 0]}>
              <sphereGeometry args={[1.0, 14, 14]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
            </mesh>
          </group>
        </group>
      )}

      {/* ── Glowing Sun Mesh in Sky ── */}
      <group position={[sunX, Math.max(-1, sunY), -4]}>
        <mesh>
          <sphereGeometry args={[0.75, 24, 24]} />
          <meshBasicMaterial color="#fde047" />
        </mesh>
        <mesh>
          <ringGeometry args={[0.9, 1.35, 24]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ── Glowing Crescent Moon during Night ── */}
      {isNight && (
        <group position={[-sunX * 0.8, Math.abs(sunY) * 0.9 + 2, -3.5]}>
          <mesh>
            <sphereGeometry args={[0.55, 20, 20]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0.22, 0.1, 0.1]}>
            <sphereGeometry args={[0.48, 16, 16]} />
            <meshBasicMaterial color="#090d16" />
          </mesh>
        </group>
      )}

      {/* ── Twinkling Night Stars ── */}
      {isNight && (
        <group position={[0, 5.0, -4]}>
          {[
            [-5, 2.5, 0],
            [-3.2, 3.8, 0],
            [-1.5, 2.2, 0],
            [1.2, 3.5, 0],
            [3.6, 4.0, 0],
            [5.2, 2.4, 0],
            [0.2, 4.6, 0],
          ].map((pos, i) => (
            <mesh key={`star-${i}`} position={pos as [number, number, number]}>
              <sphereGeometry args={[0.055, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. MAIN PLANT GROWTH LAB COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function PlantGrowthLab() {
  const { playPop, playSuccess, playClick, playChime } = useLabAudio();
  const { reportComplete } = useLMSBridge("plant-growth");
  const { width, height } = useWindowSize();

  // ── HEADER STATE ──
  const [seconds, setSeconds] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  // ── EXPERIMENT STATE FLOW ──
  const [phase, setPhase] = useState<GamePhase>("INTRO");
  const [stepA, setStepA] = useState<PlantingStep | "COMPLETED">("PREPARE_SOIL");
  const [stepB, setStepB] = useState<PlantingStep | "COMPLETED">("PREPARE_SOIL");
  const [currentDay, setCurrentDay] = useState<GrowthCheckpoint>(0);

  // Character active action and site target
  const [charAction, setCharAction] = useState<
    "IDLE" | "PREPARE_SOIL" | "DIG_HOLE" | "PLACE_SEED" | "COVER_SOIL" | "WATERING"
  >("IDLE");
  const [actionSite, setActionSite] = useState<"A" | "B" | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);

  // Watering tracking after each 15-day checkpoint
  const [wateredSunny, setWateredSunny] = useState<boolean>(false);
  const [wateredShaded, setWateredShaded] = useState<boolean>(false);

  // Active Tool Animation State
  const [activeToolTarget, setActiveToolTarget] = useState<[number, number, number] | null>(null);
  const [isPouringWater, setIsPouringWater] = useState<boolean>(false);

  // Time Lapse Animation State
  const [timeLapseProgress, setTimeLapseProgress] = useState<number>(0);
  const [isTimeLapseActive, setIsTimeLapseActive] = useState<boolean>(false);

  // Night State for House Exterior Lights (active during brief night transition)
  const isNight = isTimeLapseActive && timeLapseProgress > 0.45 && timeLapseProgress < 0.85;

  // Realistic Scientific Growth Calculations (Based on actual day 75 heights)
  const finalSunnyCm = Math.round(1.95 * 48.72); // 95 cm
  const finalShadedCm = Math.round(0.92 * 48.91); // 45 cm
  const diffCm = finalSunnyCm - finalShadedCm; // 50 cm
  const pctDiff = Math.round((diffCm / finalShadedCm) * 100); // 111%

  // Timer Tick (active once planting begins and welcome screen closed)
  useEffect(() => {
    if (!timerActive || showWelcome) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, showWelcome]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, []);

  const triggerSound = useCallback(
    (action: "pop" | "click" | "success" | "chime") => {
      if (isAudioMuted) return;
      if (action === "pop") playPop();
      if (action === "click") playClick();
      if (action === "success") playSuccess();
      if (action === "chime") playChime();
    },
    [isAudioMuted, playPop, playClick, playSuccess, playChime]
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

  const handleStartGame = () => {
    triggerSound("click");
    setShowWelcome(false);
    setTimerActive(true);
    setPhase("INTRO");
  };

  const getComicMessage = (): string | null => {
    if (phase === "LOCATION_1_SPOT" || phase === "LOCATION_2_SPOT") {
      return "Choose this spot!";
    }
    if (phase === "LOCATION_1_SEED" || phase === "LOCATION_2_SEED") {
      return "Choose a seed!";
    }
    if (phase === "INITIAL_WATER_PROMPT") {
      return "Click the watering pot!";
    }
    if (phase === "CHECKPOINT_WATER_PROMPT") {
      return "Let's water our plants!";
    }
    return null;
  };

  const handlePlayAgain = () => {
    triggerSound("click");
    setSeconds(0);
    setTimerActive(true);
    setScore(0);
    setPhase("INTRO");
    setActionSite(null);
    setStepA("PREPARE_SOIL");
    setStepB("PREPARE_SOIL");
    setCurrentDay(0);
    setWateredSunny(false);
    setWateredShaded(false);
    setActiveToolTarget(null);
    setIsPouringWater(false);
    setIsTimeLapseActive(false);
    setTimeLapseProgress(0);
    setCharAction("IDLE");
    setIsActionInProgress(false);
    setShowWelcome(false);
  };

  const handleReturnToWelcome = () => {
    triggerSound("click");
    setSeconds(0);
    setTimerActive(false);
    setScore(0);
    setPhase("INTRO");
    setActionSite(null);
    setStepA("PREPARE_SOIL");
    setStepB("PREPARE_SOIL");
    setCurrentDay(0);
    setWateredSunny(false);
    setWateredShaded(false);
    setActiveToolTarget(null);
    setIsPouringWater(false);
    setIsTimeLapseActive(false);
    setTimeLapseProgress(0);
    setCharAction("IDLE");
    setIsActionInProgress(false);
    setShowWelcome(true);
  };

  const handleReset = () => {
    handleReturnToWelcome();
  };

  // ── SEQUENCE 1: START PLANTING (Bottom Button) ──
  const handleStartPlanting = () => {
    triggerSound("click");
    setTimerActive(true);
    setPhase("WALK_TO_1");
    setActionSite("A");
    setTimeout(() => {
      setPhase("LOCATION_1_SPOT");
    }, 1000);
  };

  // ── SEQUENCE 2: DIRECT SOIL PREPARATION VIA BLACK SPOT MARKER ──
  const handleSpotClick = (site: "A" | "B") => {
    if (isActionInProgress) return;
    if (site === "A" && phase !== "LOCATION_1_SPOT") return;
    if (site === "B" && phase !== "LOCATION_2_SPOT") return;

    setIsActionInProgress(true);
    triggerSound("click");

    if (site === "A") {
      setPhase("DIGGING_1");
      setCharAction("DIG_HOLE");
      setTimeout(() => {
        setStepA("PLACE_SEED"); // 3D hole excavated and cavity open
        setCharAction("IDLE");
        setIsActionInProgress(false);
        setPhase("LOCATION_1_SEED");
        setScore((s) => s + 5);
        triggerSound("success");
      }, 1500);
    } else {
      setPhase("DIGGING_2");
      setCharAction("DIG_HOLE");
      setTimeout(() => {
        setStepB("PLACE_SEED"); // 3D hole excavated and cavity open
        setCharAction("IDLE");
        setIsActionInProgress(false);
        setPhase("LOCATION_2_SEED");
        setScore((s) => s + 5);
        triggerSound("success");
      }, 1500);
    }
  };

  // ── SEQUENCE 3: DIRECT SEED PLACEMENT & AUTOMATIC SOIL COVERING ──
  const handleSeedClick = (site: "A" | "B") => {
    if (isActionInProgress) return;
    if (site === "A" && phase !== "LOCATION_1_SEED") return;
    if (site === "B" && phase !== "LOCATION_2_SEED") return;

    setIsActionInProgress(true);
    triggerSound("pop");

    if (site === "A") {
      setPhase("PLACING_SEED_1");
      setCharAction("PLACE_SEED");
      // 1. Place seed into hole
      setTimeout(() => {
        setStepA("COVER_SEED"); // Seed resting visibly inside hole
        triggerSound("pop");
        // 2. Automatically begin covering hole with soil (No extra button needed)
        setPhase("COVERING_1");
        setCharAction("COVER_SOIL");
        setTimeout(() => {
          setStepA("COMPLETED"); // Hole smoothly covered and patted
          setCharAction("IDLE");
          setIsActionInProgress(false);
          setScore((s) => s + 10);
          triggerSound("success");
          // 3. Child automatically walks across garden to Location 2
          setPhase("WALK_TO_2");
          setActionSite("B");
          setTimeout(() => {
            setPhase("LOCATION_2_SPOT");
          }, 1100);
        }, 1200);
      }, 1200);
    } else {
      setPhase("PLACING_SEED_2");
      setCharAction("PLACE_SEED");
      // 1. Place seed into hole
      setTimeout(() => {
        setStepB("COVER_SEED"); // Seed resting visibly inside hole
        triggerSound("pop");
        // 2. Automatically begin covering hole with soil
        setPhase("COVERING_2");
        setCharAction("COVER_SOIL");
        setTimeout(() => {
          setStepB("COMPLETED"); // Hole smoothly covered and patted
          setCharAction("IDLE");
          setIsActionInProgress(false);
          setScore((s) => s + 10);
          triggerSound("success");
          // 3. Both planted! Move to initial watering prompt
          setPhase("INITIAL_WATER_PROMPT");
          setActionSite(null);
        }, 1200);
      }, 1200);
    }
  };

  // ── SEQUENCE 4: DIRECT OBJECT WATERING (CLICKING THE 3D WATERING POT) ──
  const handleWateringPotClick = () => {
    if (isActionInProgress) return;
    if (phase !== "INITIAL_WATER_PROMPT" && phase !== "CHECKPOINT_WATER_PROMPT") return;

    const isInitial = phase === "INITIAL_WATER_PROMPT";
    setIsActionInProgress(true);
    triggerSound("click");
    setPhase(isInitial ? "INITIAL_WATERING" : "CHECKPOINT_WATERING");

    // Sequential Watering: Child waters Plant 1 then Plant 2
    setActionSite("A");
    setCharAction("WATERING");
    setIsPouringWater(true);
    triggerSound("chime");

    setTimeout(() => {
      setWateredSunny(true);
      triggerSound("pop");

      // Waters Plant 2
      setActionSite("B");

      setTimeout(() => {
        setWateredShaded(true);
        setIsPouringWater(false);
        setCharAction("IDLE");
        setIsActionInProgress(false);
        setActionSite(null);
        triggerSound("success");

        if (isInitial) {
          setScore((s) => s + 15);
          setPhase("PLANTED_READY");
        } else {
          setScore((s) => s + 10);
          setPhase("CHECKPOINT_READY");
        }
      }, 1600);
    }, 1600);
  };

  // ── SEQUENCE 5: EXECUTE 15-DAY TIME-LAPSE ──
  const handleAdvance15Days = () => {
    triggerSound("chime");
    setPhase("TIME_LAPSE");
    setIsTimeLapseActive(true);
    setTimeLapseProgress(0);

    const nextTargetDay = (currentDay + 15) as GrowthCheckpoint;
    const startTime = Date.now();
    const duration = 2800;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      setTimeLapseProgress(progress);

      if (progress >= 1.0) {
        clearInterval(interval);
        setIsTimeLapseActive(false);
        setCurrentDay(nextTargetDay);
        setScore((s) => s + 15);
        triggerSound("success");

        if (nextTargetDay === 75) {
          setPhase("FINAL_RESULT");
          setScore(100);
          reportComplete({ points: 100 });
        } else {
          setWateredSunny(false);
          setWateredShaded(false);
          setPhase("CHECKPOINT_WATER_PROMPT");
        }
      }
    }, 40);
  };

  // Sky background color interpolation
  const getSkyColor = () => {
    if (!isTimeLapseActive) return "#38bdf8";
    if (timeLapseProgress < 0.25) return "#38bdf8";
    if (timeLapseProgress < 0.45) return "#f97316";
    if (timeLapseProgress < 0.8) return "#090d16";
    return "#fdba74";
  };

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden select-none flex flex-col font-sans bg-[#F0FAE8] text-[#24452D]">
      
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. FRESH LIGHT-GREEN NAVIGATION BAR (#F0FAE8 Palette)                 */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <nav className="relative z-40 w-full h-14 bg-[#F0FAE8] border-t-2 border-[#58B86A] border-b border-[#CDE8C6] px-3 sm:px-5 flex items-center justify-between shrink-0 shadow-xs">
        
        {/* ── LEFT SECTION: Back Button, Science/Plant Icon & Title ── */}
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
            title="Plant Science Lab"
          >
            <Sprout size={18} strokeWidth={2.4} />
          </div>

          <h1 className="text-[#24452D] font-extrabold text-sm sm:text-base leading-tight tracking-tight truncate max-w-[150px] sm:max-w-xs md:max-w-md">
            Plant Growth &amp; Photosynthesis
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
            onClick={handleReset}
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
              <span>Experiment Guidance</span>
            </span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-[#58B86A] hover:text-[#24452D] text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-xs font-semibold leading-relaxed text-[#24452D]">
            Compare two plants in a 75-day village garden experiment. One plant grows in full sunlight, and the other grows in the shadow of a mango tree. Observe how sunlight powers photosynthesis!
          </p>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. FULL-VIEWPORT 3D IMMERSIVE VILLAGE GARDEN ENVIRONMENT              */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden bg-sky-300">
        
        {/* ── 100% Three.js / React Three Fiber Canvas ── */}
        <Canvas
          shadows
          camera={{ position: [0, 4.2, 9.2], fov: 42 }}
          className="w-full h-full"
        >
          {/* Dynamic Sky Color */}
          <color attach="background" args={[getSkyColor()]} />

          {/* Dynamic Sun, Moon, Puffy 3D Clouds & Directional Shadows */}
          <SkyAndLighting
            timeLapseProgress={timeLapseProgress}
            isTimeLapseActive={isTimeLapseActive}
          />

          {/* 1. Multiple Separate Standalone Village Houses (Background) */}
          <VillageNeighborhood isNight={isNight} />

          {/* 2. Mature Mango Tree (Extreme Left) with Hanging Mango Fruits */}
          <MangoTree />

          {/* 3. Living Home Garden Ground with Vegetables, Flowers & Footpath */}
          <FullVillageGardenEnvironment />

          {/* 4. Natural Planting Spots (Location A: Sunny | Location B: Shade) */}
          <PlantingSpot
            position={SITE_A_POS}
            isSunny={true}
            step={stepA}
            isWatered={wateredSunny}
          />
          <PlantingSpot
            position={SITE_B_POS}
            isSunny={false}
            step={stepB}
            isWatered={wateredShaded}
          />

          {/* 4B. Interactive Ground Spot Markers (Location 1 & Location 2) */}
          {phase === "LOCATION_1_SPOT" && (
            <GroundSpotMarker
              position={[SITE_A_POS[0], 0.026, SITE_A_POS[2]]}
              onClick={() => handleSpotClick("A")}
            />
          )}
          {phase === "LOCATION_2_SPOT" && (
            <GroundSpotMarker
              position={[SITE_B_POS[0], 0.026, SITE_B_POS[2]]}
              onClick={() => handleSpotClick("B")}
            />
          )}

          {/* 4C. Interactive 3D Seeds Lying on Grass (Location 1 & Location 2) */}
          {phase === "LOCATION_1_SEED" && (
            <GroundSeedObject
              position={[SITE_A_POS[0] + 0.35, 0.04, SITE_A_POS[2] + 0.4]}
              onClick={() => handleSeedClick("A")}
            />
          )}
          {phase === "LOCATION_2_SEED" && (
            <GroundSeedObject
              position={[SITE_B_POS[0] + 0.35, 0.04, SITE_B_POS[2] + 0.4]}
              onClick={() => handleSeedClick("B")}
            />
          )}

          {/* 5. Growing Plants (Visual progression across 15, 30, 45, 60, 75 Days) */}
          <GrowingPlant
            position={SITE_A_POS}
            isSunny={true}
            day={currentDay}
          />
          <GrowingPlant
            position={SITE_B_POS}
            isSunny={false}
            day={currentDay}
          />

          {/* 6. Stylized 3D Character Avatar with Dynamic Comic Speech Bubble */}
          <CharacterChild
            phase={phase}
            stepA={stepA}
            stepB={stepB}
            charAction={charAction}
            actionSite={actionSite}
            isWatering={isPouringWater}
            comicMessage={getComicMessage()}
          />

          {/* 7. Clickable 3D Watering Pot on Ground (Hidden when held in child's hands) */}
          {charAction !== "WATERING" && !isPouringWater && (
            <WateringCanTool
              position={[0.0, 0.16, 1.4]}
              isClickable={phase === "INITIAL_WATER_PROMPT" || phase === "CHECKPOINT_WATER_PROMPT"}
              onClick={handleWateringPotClick}
            />
          )}
        </Canvas>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* 3. CLEAN CONTEXTUAL BUTTON CONTROLS (Uncluttered UI)                  */}
        {/* ═════════════════════════════════════════════════════════════════════ */}

        {/* ── Contextual Action Buttons (Bottom Center) ── */}
        {!showWelcome && phase !== "FINAL_RESULT" && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-3">
            {/* 1. Initial Start Button */}
            {phase === "INTRO" && (
              <button
                onClick={handleStartPlanting}
                className="px-7 py-3 rounded-2xl bg-[#238B45] hover:bg-[#1e783b] text-white font-black text-xs uppercase tracking-wider shadow-xl transition transform active:scale-95 cursor-pointer flex items-center gap-2 animate-bounce"
              >
                <Sprout size={16} />
                <span>Plant the First Seed</span>
              </button>
            )}

            {/* 2. Start 75-Day Experiment Button */}
            {phase === "PLANTED_READY" && (
              <button
                onClick={handleAdvance15Days}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-[#238B45] hover:from-amber-600 hover:to-[#1e783b] text-white font-black text-xs uppercase tracking-wider shadow-xl transition transform active:scale-95 cursor-pointer flex items-center gap-2 animate-bounce"
              >
                <Play size={16} />
                <span>Start 75-Day Experiment (Day 0 &rarr; 15)</span>
              </button>
            )}

            {/* 3. Advance to Next 15 Days Button */}
            {phase === "CHECKPOINT_READY" && currentDay < 75 && (
              <button
                onClick={handleAdvance15Days}
                className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#238B45] to-teal-600 hover:from-[#1e783b] hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-xl transition transform active:scale-95 cursor-pointer flex items-center gap-2 animate-bounce"
              >
                <Play size={14} />
                <span>Advance to Day {currentDay + 15} &rarr;</span>
              </button>
            )}
          </div>
        )}

        {/* ── Comic-Book-Style Dialogue Badge at Bottom-Left (Requirement 2) ── */}
        {!showWelcome && phase !== "FINAL_RESULT" && currentDay > 0 && (
          <div className="absolute bottom-6 left-6 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <div className="relative px-5 py-2.5 rounded-2xl bg-[#fef08a] text-[#1c1917] border-2 border-[#ca8a04] shadow-[4px_4px_0px_0px_rgba(202,138,4,1)] font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <Sun size={15} className="text-amber-600" />
              <span>After {currentDay} Days</span>
            </div>
          </div>
        )}

        {/* ── SCREEN 1: WELCOME SCREEN MODAL OVERLAY (Requirement 3, Inspired by Reference 1) ── */}
        {showWelcome && (
          <div className="absolute inset-0 z-40 bg-emerald-950/25 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-[#CDE8C6] text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-[#E1F4D8] border-2 border-[#58B86A] flex items-center justify-center text-[#238B45] mb-3 shadow-inner">
                <Sprout size={36} />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-[#24452D] mb-1 leading-tight tracking-tight">
                Plant Growth &amp; Photosynthesis
              </h2>
              <span className="text-xs font-black text-[#238B45] uppercase tracking-widest mb-3">
                THE POWER OF SUNLIGHT
              </span>

              <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed mb-5 bg-[#F0FAE8]/90 p-3.5 rounded-2xl border border-[#CDE8C6]">
                &ldquo;Welcome to our village garden! Plant two seeds in different locations, care for them and discover how sunlight affects plant growth over 75 days.&rdquo;
              </p>

              {/* 3 Activity Highlights */}
              <div className="grid grid-cols-3 gap-2 w-full mb-6 text-left">
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6] flex flex-col items-center text-center">
                  <span className="text-[10px] font-black text-[#238B45] uppercase mb-0.5">1. PLANT SEEDS</span>
                  <span className="text-[11px] font-bold text-[#24452D] leading-tight">Prepare soil, dig holes &amp; cover</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6] flex flex-col items-center text-center">
                  <span className="text-[10px] font-black text-[#238B45] uppercase mb-0.5">2. CARE &amp; WATER</span>
                  <span className="text-[11px] font-bold text-[#24452D] leading-tight">Water both plants every 15 days</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F0FAE8] border border-[#CDE8C6] flex flex-col items-center text-center">
                  <span className="text-[10px] font-black text-[#238B45] uppercase mb-0.5">3. DISCOVER</span>
                  <span className="text-[11px] font-bold text-[#24452D] leading-tight">Observe sunlight vs shade growth</span>
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

        {/* ── SCREEN 2: RESULTS & EXPERIMENT SUMMARY MODAL OVERLAY (Requirement 4, Inspired by Reference 2) ── */}
        {phase === "FINAL_RESULT" && (
          <div className="absolute inset-0 z-40 bg-emerald-950/25 backdrop-blur-xs flex items-center justify-center p-4">
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
                PLANT GROWTH EXPERIMENT COMPLETE!
              </h2>
              <span className="text-[11px] sm:text-xs font-black text-[#238B45] uppercase tracking-wider mb-2.5">
                75 DAYS OF GROWTH – THE POWER OF SUNLIGHT
              </span>

              {/* ── ACTUAL TWO 3D PLANT MODELS SIDE-BY-SIDE IN LIVE THREE.JS VIEWPORT ── */}
              <div className="w-full h-44 sm:h-48 rounded-2xl bg-gradient-to-b from-sky-100/80 via-[#F0FAE8]/60 to-[#E1F4D8]/80 border-2 border-[#CDE8C6] overflow-hidden relative shadow-inner mb-2.5">
                {/* Floating Location Headers */}
                <div className="absolute top-2 left-3 z-10 px-2.5 py-0.5 rounded-lg bg-amber-900/85 text-amber-100 text-[10px] font-black backdrop-blur-xs shadow-xs">
                  ☁️ PLANT 1 – SHADED LOCATION
                </div>
                <div className="absolute top-2 right-3 z-10 px-2.5 py-0.5 rounded-lg bg-[#238B45]/90 text-white text-[10px] font-black backdrop-blur-xs shadow-xs">
                  ☀️ PLANT 2 – DIRECT SUNLIGHT
                </div>

                <Canvas camera={{ position: [0, 0.72, 2.7], fov: 38 }}>
                  <ambientLight intensity={0.95} />
                  <directionalLight position={[3, 5, 4]} intensity={1.5} />

                  {/* Subtle ground grass base */}
                  <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[10, 10]} />
                    <meshStandardMaterial color="#4ade80" roughness={0.9} />
                  </mesh>

                  {/* PLANT 1: ACTUAL SHADED PLANT GROWN UNDER MANGO TREE (DAY 75) */}
                  <group position={[-0.95, 0, 0]}>
                    <mesh position={[0, 0.015, 0]}>
                      <cylinderGeometry args={[0.24, 0.28, 0.03, 16]} />
                      <meshStandardMaterial color="#3e2723" roughness={0.9} />
                    </mesh>
                    <GrowingPlant
                      position={[0, 0.03, 0]}
                      isSunny={false}
                      day={75}
                    />
                  </group>

                  {/* PLANT 2: ACTUAL DIRECT SUNLIGHT PLANT GROWN IN OPEN GARDEN (DAY 75) */}
                  <group position={[0.95, 0, 0]}>
                    <mesh position={[0, 0.015, 0]}>
                      <cylinderGeometry args={[0.24, 0.28, 0.03, 16]} />
                      <meshStandardMaterial color="#3e2723" roughness={0.9} />
                    </mesh>
                    <GrowingPlant
                      position={[0, 0.03, 0]}
                      isSunny={true}
                      day={75}
                    />
                  </group>
                </Canvas>
              </div>

              {/* ── SIDE-BY-SIDE SCIENTIFIC COMPARISON CARDS ── */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full mb-2.5 text-left">
                {/* Plant 1 - Shaded Card */}
                <div className="p-3 rounded-2xl bg-[#F0FAE8] border-2 border-[#CDE8C6]">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-black uppercase text-amber-900 block">
                      PLANT 1 – SHADED LOCATION
                    </span>
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded">
                      Partial Shade
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#24452D] my-0.5">
                    {finalShadedCm} cm
                  </div>
                  <ul className="text-[10px] sm:text-[11px] font-semibold text-slate-600 space-y-0.5 leading-tight">
                    <li>• <strong className="text-slate-800">Location:</strong> Under mango tree shadow</li>
                    <li>• <strong className="text-slate-800">Sunlight:</strong> Limited direct sun (&lt; 2 hrs/day)</li>
                    <li>• <strong className="text-slate-800">Foliage:</strong> Pale yellow-green leaves, 4 leaves</li>
                    <li>• <strong className="text-slate-800">Condition:</strong> Stunted growth, no blossoms</li>
                  </ul>
                </div>

                {/* Plant 2 - Direct Sunlight Card */}
                <div className="p-3 rounded-2xl bg-[#E1F4D8]/90 border-2 border-[#58B86A]">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-black uppercase text-[#238B45] block">
                      PLANT 2 – DIRECT SUNLIGHT
                    </span>
                    <span className="text-[9px] font-black text-[#238B45] bg-[#CDE8C6] px-1.5 py-0.5 rounded">
                      Full Sunlight
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#238B45] my-0.5">
                    {finalSunnyCm} cm
                  </div>
                  <ul className="text-[10px] sm:text-[11px] font-semibold text-slate-600 space-y-0.5 leading-tight">
                    <li>• <strong className="text-[#24452D]">Location:</strong> Open village courtyard</li>
                    <li>• <strong className="text-[#24452D]">Sunlight:</strong> Full direct sun (6+ hrs/day)</li>
                    <li>• <strong className="text-[#24452D]">Foliage:</strong> Deep emerald green, 8 lush leaves</li>
                    <li>• <strong className="text-[#24452D]">Condition:</strong> Vigorous, healthy &amp; flowering bud</li>
                  </ul>
                </div>
              </div>

              {/* ── CONCISE RESULTS STATISTICS BAR ── */}
              <div className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-[#F0FAE8] via-[#E1F4D8] to-[#CDE8C6] border border-[#58B86A]/40 flex items-center justify-around mb-2.5 text-[#24452D]">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500 block">TOTAL DURATION</span>
                  <span className="text-sm sm:text-base font-black text-[#24452D]">75 Days</span>
                </div>
                <div className="h-6 w-px bg-[#58B86A]/40" />
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500 block">WATERING SESSIONS</span>
                  <span className="text-sm sm:text-base font-black text-[#238B45]">5 Completed</span>
                </div>
                <div className="h-6 w-px bg-[#58B86A]/40" />
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500 block">GROWTH DIFFERENCE</span>
                  <span className="text-sm sm:text-base font-black text-[#238B45]">+{diffCm} cm (+{pctDiff}%)</span>
                </div>
              </div>

              {/* ── SHORT LEARNING CONCLUSION ── */}
              <div className="p-2.5 rounded-2xl bg-[#F0FAE8]/90 border border-[#CDE8C6] text-left mb-3.5 text-xs font-semibold leading-relaxed text-[#24452D]">
                <span className="font-black text-[#238B45] block mb-0.5">💡 SCIENTIFIC CONCLUSION:</span>
                &ldquo;Plants receiving sufficient sunlight generally grow healthier because sunlight provides the energy needed for photosynthesis.&rdquo;
              </div>

              {/* ── ACTION BUTTONS: PLAY AGAIN & RETURN TO WELCOME ── */}
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  className="py-3 rounded-xl bg-[#238B45] hover:bg-[#1e783b] text-white font-black text-xs sm:text-sm shadow-md cursor-pointer transition flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <RotateCcw size={15} />
                  <span>PLAY AGAIN</span>
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

        {/* ── Final Result Celebration Confetti ── */}
        {phase === "FINAL_RESULT" && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={350}
            gravity={0.22}
          />
        )}
      </div>
    </div>
  );
}
