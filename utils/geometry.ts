import * as THREE from 'three';
import { ParticleData, TreeData, TreeGenParams, PhotoData } from '../types';

// Utility for random float in range
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper to manage particle buffers
class ParticleBuffer {
  positions: number[] = [];
  targetPositions: number[] = [];
  colors: number[] = [];
  sizes: number[] = [];
  drifts: number[] = [];
  phases: number[] = [];

  add(
    pos: THREE.Vector3,
    targetPos: THREE.Vector3,
    color: THREE.Color,
    size: number,
    drift: THREE.Vector3,
    phase: number
  ) {
    this.positions.push(pos.x, pos.y, pos.z);
    this.targetPositions.push(targetPos.x, targetPos.y, targetPos.z);
    this.colors.push(color.r, color.g, color.b);
    this.sizes.push(size);
    this.drifts.push(drift.x, drift.y, drift.z);
    this.phases.push(phase);
  }

  toData(): ParticleData {
    return {
      positions: new Float32Array(this.positions),
      targetPositions: new Float32Array(this.targetPositions),
      colors: new Float32Array(this.colors),
      sizes: new Float32Array(this.sizes),
      drifts: new Float32Array(this.drifts),
      phases: new Float32Array(this.phases),
    };
  }
}

// Procedural Tree Generator - Structural Fractal Algorithm
export const generateTree = ({ depth, branchLength, startPos }: TreeGenParams): TreeData => {
  const woodBuffer = new ParticleBuffer();
  const blossomBuffer = new ParticleBuffer();
  const leafNodes: THREE.Vector3[] = [];

  // Configuration - DARKER TRUNK COLORS
  const woodColorBase = new THREE.Color('#1a0b08'); // Very dark, almost black brown
  const woodColorVar = new THREE.Color('#3e2b24'); // Dark bark highlight
  
  const blossomColors = [
    new THREE.Color('#ffb7c5'), // Classic Pink
    new THREE.Color('#ffc0cb'), // Pink
    new THREE.Color('#ffe4e1'), // Misty Rose
    new THREE.Color('#ffffff'), // White
    new THREE.Color('#ff9eb5'), // Deep Pink (shadows/depth)
  ];

  const getRandomSpacePos = () => {
    const r = randomRange(80, 200);
    const theta = randomRange(0, Math.PI * 2);
    const phi = Math.acos(randomRange(-1, 1));
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  };

  // Recursive Branching Function
  const growBranch = (
    start: THREE.Vector3, 
    direction: THREE.Vector3, 
    length: number, 
    radius: number, 
    currentDepth: number
  ) => {
    const end = start.clone().add(direction.clone().multiplyScalar(length));
    const isTrunk = currentDepth === depth;
    
    // ---------------------------------------------------------
    // 1. GENERATE WOOD (Skeleton) -> Add to WoodBuffer
    // ---------------------------------------------------------
    // Ultra high density for solid trunk visualization
    const densityMultiplier = isTrunk ? 32.0 : 12.0; 
    const segmentParticles = Math.ceil(length * radius * densityMultiplier); 
    
    // Axis vectors for cylinder generation
    const axis = Math.abs(direction.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(direction, axis).normalize();
    const v = new THREE.Vector3().crossVectors(direction, u).normalize();

    for (let i = 0; i < segmentParticles; i++) {
      const t = i / segmentParticles;
      const pos = new THREE.Vector3().lerpVectors(start, end, t);
      
      // Volume distribution (Cylinder)
      const theta = Math.random() * Math.PI * 2;
      
      let r = Math.random() * radius; // Base radius

      // Trunk Flare: Wider at the very bottom (Roots effect)
      if (isTrunk && t < 0.25) {
         const flare = Math.pow((0.25 - t) * 6.0, 2.5); // Stronger exponential flare
         r += flare * randomRange(0.8, 2.0); 
      }
      
      // Roughness/Noise to make it look like bark
      const roughness = isTrunk ? randomRange(0.9, 1.2) : randomRange(0.9, 1.1);
      r *= roughness;

      pos.add(u.clone().multiplyScalar(Math.cos(theta) * r));
      pos.add(v.clone().multiplyScalar(Math.sin(theta) * r));

      const colorMix = Math.random();
      // Bias towards darker base color
      const woodColor = woodColorBase.clone().lerp(woodColorVar, Math.pow(colorMix, 3.0));
      
      // Wood particles: Overlap significantly for solid look
      const sizeBase = isTrunk ? 5.0 : 3.0;
      woodBuffer.add(
        pos,
        getRandomSpacePos(),
        woodColor,
        randomRange(sizeBase * 0.9, sizeBase * 1.5),
        new THREE.Vector3(randomRange(-0.05, 0.05), randomRange(-0.02, 0.02), randomRange(-0.05, 0.05)),
        Math.random() * Math.PI * 2
      );
    }

    // ---------------------------------------------------------
    // 2. RECURSION (Fractal Growth)
    // ---------------------------------------------------------
    if (currentDepth > 0) {
      const branchCount = isTrunk ? Math.floor(randomRange(3, 5)) : Math.floor(randomRange(2, 4));

      const tangent = new THREE.Vector3().crossVectors(direction, axis).normalize();
      const bitangent = new THREE.Vector3().crossVectors(direction, tangent).normalize();

      for (let i = 0; i < branchCount; i++) {
        const angleStep = (Math.PI * 2) / branchCount;
        const azimuth = i * angleStep + randomRange(-0.3, 0.3); 

        let spreadAngle = 0.0;
        
        if (isTrunk) {
            spreadAngle = randomRange(0.3, 0.6); 
        } else if (currentDepth > depth - 3) {
            spreadAngle = randomRange(0.4, 0.9);
        } else {
            spreadAngle = randomRange(0.3, 0.8);
        }

        const x = Math.cos(azimuth) * Math.sin(spreadAngle);
        const y = Math.sin(azimuth) * Math.sin(spreadAngle);
        const z = Math.cos(spreadAngle);

        const nextDir = direction.clone().multiplyScalar(z)
            .add(tangent.clone().multiplyScalar(x))
            .add(bitangent.clone().multiplyScalar(y))
            .normalize();

        // Natural growth
        if (!isTrunk) {
            nextDir.y += 0.15; // Reach for light
        } else {
            nextDir.y += 0.4; // Trunk grows up
        }
        nextDir.normalize();

        const nextLength = length * 0.82; 
        const nextRadius = radius * 0.65; 

        growBranch(end, nextDir, nextLength, nextRadius, currentDepth - 1);
      }
    } else {
      // ---------------------------------------------------------
      // 3. BLOSSOMS (Canopy) -> Sub-clustering for realism
      // ---------------------------------------------------------
      leafNodes.push(end);
      
      // Create mini-clusters around the branch tip for organic volume
      const clusters = 5;
      
      for(let c = 0; c < clusters; c++) {
          // Offset each cluster slightly from the branch tip
          const clusterOffset = new THREE.Vector3(
              randomRange(-8, 8),
              randomRange(-4, 8),
              randomRange(-8, 8)
          );
          const clusterCenter = end.clone().add(clusterOffset);
          
          // Density per cluster
          const particlesPerCluster = 90;

          // Spread dimensions for this specific cluster
          const spreadX = randomRange(6, 10);
          const spreadY = randomRange(4, 7); 
          const spreadZ = randomRange(6, 10);

          for (let k = 0; k < particlesPerCluster; k++) {
            const p = clusterCenter.clone();
            
            // Ellipsoid distribution
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            
            const rRaw = Math.cbrt(Math.random()); 
            
            const sinPhi = Math.sin(phi);
            const x = rRaw * sinPhi * Math.cos(theta);
            const y = rRaw * sinPhi * Math.sin(theta);
            const z = rRaw * Math.cos(phi);

            p.x += x * spreadX;
            p.y += y * spreadY;
            p.z += z * spreadZ;

            // Stronger "Weeping" effect on outer edges
            const weepFactor = Math.max(0, Math.abs(x) - 2) * 0.6;
            if (Math.random() > 0.3) {
                p.y -= Math.random() * (3.0 + weepFactor * 2.0);
            }

            // Color selection - gradients
            const colorIdx = Math.floor(Math.random() * blossomColors.length);
            const color = blossomColors[colorIdx];
            
            // Size: Center of cluster is dense/large, edges are fine
            const sizeBase = 6.0;
            const sizeVar = (1.2 - rRaw) * sizeBase + randomRange(0, 3.0);

            const drift = new THREE.Vector3(
              randomRange(-0.8, 0.8),
              randomRange(0.2, 1.6),
              randomRange(-0.8, 0.8)
            );

            blossomBuffer.add(
              p,
              getRandomSpacePos(),
              color,
              sizeVar,
              drift,
              Math.random() * Math.PI * 2
            );
          }
      }
    }
  };

  // Start the trunk
  growBranch(startPos, new THREE.Vector3(0, 1, 0), branchLength, 10.0, depth);

  return {
    wood: woodBuffer.toData(),
    blossoms: blossomBuffer.toData(),
    leafNodes
  };
};

export const createPhotoData = (leafNodes: THREE.Vector3[], count: number): PhotoData[] => {
    const photos: PhotoData[] = [];
    if (leafNodes.length === 0) return photos;

    const safeCount = Math.min(count, leafNodes.length);
    const chosenNodes = [...leafNodes].sort(() => 0.5 - Math.random()).slice(0, safeCount);

    chosenNodes.forEach((node, index) => {
        const r = randomRange(100, 200);
        const theta = randomRange(0, Math.PI * 2);
        const phi = Math.acos(randomRange(-1, 1));

        photos.push({
            id: index,
            position: node.clone().add(new THREE.Vector3(0, -10.0, 0)), // Hang lower like charms
            rotation: new THREE.Euler(randomRange(-0.15, 0.15), randomRange(0, Math.PI * 2), randomRange(-0.15, 0.15)),
            url: `https://picsum.photos/seed/${index + 420}/300/400.jpg`,
            targetSpacePos: new THREE.Vector3(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            ),
            targetSpaceRot: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI),
        });
    });

    return photos;
};
