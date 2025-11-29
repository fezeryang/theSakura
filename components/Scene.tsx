
import React, { useMemo, useEffect, useRef } from 'react';
import { OrbitControls, Stars } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateTree, createPhotoData } from '../utils/geometry';
import SakuraTree from './SakuraTree';
import FloatingGallery from './FloatingGallery';

interface SceneProps {
  gesture: string;
  handPos: { x: number; y: number };
}

const Scene: React.FC<SceneProps> = ({ gesture, handPos }) => {
  const { camera, scene } = useThree();
  const controlsRef = useRef<any>(null);
  
  // State Refs (Mutable for loop performance)
  const expansionRef = useRef(0); // 0 = Tree, 1 = Galaxy
  const hueRef = useRef(0); // Persistent Hue Rotation
  const bgRef = useRef(new THREE.Color('#05020a'));
  
  useEffect(() => {
    camera.position.set(0, -10, 60); 
    camera.lookAt(0, 15, 0); 
  }, [camera]);

  const { treeData, photos } = useMemo(() => {
    return { 
        treeData: generateTree({ depth: 6, branchLength: 35, startPos: new THREE.Vector3(0, -60, 0) }), 
        photos: createPhotoData(generateTree({ depth: 6, branchLength: 35, startPos: new THREE.Vector3(0, -60, 0) }).leafNodes, 16) 
    };
  }, []);

  useFrame((state, delta) => {
    // --- 1. STATE LOGIC ---
    
    // Expansion (Fist vs Open)
    let targetExpansion = expansionRef.current;
    if (gesture === 'FIST') targetExpansion = 0;
    if (gesture === 'OPEN_HAND') targetExpansion = 1;
    // Spring/Lerp expansion
    expansionRef.current = THREE.MathUtils.lerp(expansionRef.current, targetExpansion, delta * 2.0);

    // Color Cycle (1 Finger)
    // If holding 1 finger, increment hue. The hue persists when released.
    if (gesture === 'ONE_FINGER') {
        hueRef.current += delta * 0.5; // Cycle speed
    }

    // Photo Reveal (2 Fingers)
    const isRevealed = gesture === 'TWO_FINGERS';


    // --- 2. VISUALS ---
    
    // Background Color logic
    // Mix between Deep Space (Galaxy) and Warm Void (Tree) + Hue Tint
    const baseColor = new THREE.Color('#05020a');
    const galaxyColor = new THREE.Color('#1a0b18');
    
    let targetBg = baseColor.clone().lerp(galaxyColor, expansionRef.current);
    
    // Apply Hue tint to background subtly
    if (hueRef.current % (Math.PI * 2) > 0.1) {
       const tint = new THREE.Color().setHSL((hueRef.current * 0.1) % 1, 0.6, 0.05);
       targetBg.add(tint);
    }
    
    bgRef.current.lerp(targetBg, delta * 2.0);
    scene.background = bgRef.current;


    // --- 3. CAMERA JOYSTICK CONTROL ---
    
    if (controlsRef.current) {
        // Dead Zone Calculation
        // Center X/Y is 0.5, 0.5
        // Safe Zone: 0.35 to 0.65 (30% width)
        
        const deadZone = 0.15;
        const centerX = 0.5;
        const centerY = 0.5;
        
        const dx = handPos.x - centerX;
        const dy = handPos.y - centerY;
        
        // Rate Control: If outside deadzone, rotate camera
        let azimuthRate = 0;
        let polarRate = 0;
        
        if (Math.abs(dx) > deadZone) {
            // Normalize speed (0 to 1) based on distance from deadzone
            const sign = Math.sign(dx);
            const magnitude = (Math.abs(dx) - deadZone) / (0.5 - deadZone); // 0..1
            azimuthRate = sign * magnitude * 2.0; // Max speed multiplier
        }

        if (Math.abs(dy) > deadZone) {
            const sign = Math.sign(dy); // Y is down in 2D, but we mapped it 
            // In HandTracker, we already normalized Y? 
            // Actually HandTracker returns raw MediaPipe (0 top, 1 bottom).
            // Up Hand (Small Y) -> Tilt Up (Small Polar).
            // Down Hand (Large Y) -> Tilt Down (Large Polar).
            // So +dy means Hand Down -> Increase Polar.
            const magnitude = (Math.abs(dy) - deadZone) / (0.5 - deadZone);
            polarRate = sign * magnitude * 1.5;
        }

        // Apply Rotation
        const currentAzimuth = controlsRef.current.getAzimuthalAngle();
        const currentPolar = controlsRef.current.getPolarAngle();
        
        // Smooth Drift
        controlsRef.current.setAzimuthalAngle(currentAzimuth + azimuthRate * delta);
        
        const nextPolar = currentPolar + polarRate * delta;
        controlsRef.current.setPolarAngle(Math.max(0.5, Math.min(Math.PI - 0.5, nextPolar)));
        
        controlsRef.current.update();
    }
  });

  return (
    <>
      <fog attach="fog" args={[bgRef.current, 20, 200]} />
      
      <OrbitControls 
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        enableZoom={true} 
        maxDistance={150}
        minDistance={20}
        target={[0, 10, 0]} 
        rotateSpeed={0.5}
      />

      <ambientLight intensity={0.5} />
      <pointLight position={[50, 60, 50]} intensity={1.5} color="#ffe4e1" />
      <pointLight position={[-40, 20, -40]} intensity={0.8} color="#a0b0ff" />
      
      <Stars radius={200} depth={50} count={8000} factor={4} saturation={0} fade speed={0.5} />

      <SakuraTree 
        data={treeData.wood} 
        mode="wood" 
        expansionRef={expansionRef}
        hueRef={hueRef}
      />

      <SakuraTree 
        data={treeData.blossoms} 
        mode="blossom" 
        expansionRef={expansionRef}
        hueRef={hueRef}
      />

      <FloatingGallery 
        photos={photos} 
        expansionRef={expansionRef}
        isRevealed={gesture === 'TWO_FINGERS'}
      />
    </>
  );
};

export default Scene;
