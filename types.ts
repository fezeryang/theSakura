import * as THREE from 'three';

export interface ParticleData {
  positions: Float32Array;
  targetPositions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
}

export interface TreeData {
  wood: ParticleData;
  blossoms: ParticleData;
  leafNodes: THREE.Vector3[];
}

export interface PhotoData {
  id: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  url: string;
  targetSpacePos: THREE.Vector3;
  targetSpaceRot: THREE.Euler;
}

export interface TreeGenParams {
  depth: number;
  branchLength: number;
  startPos: THREE.Vector3;
}