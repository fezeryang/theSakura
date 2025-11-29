
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ParticleData } from '../types';
import { createPetalTexture, createBarkTexture } from '../utils/textureGen';

const SakuraShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uExpansion: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uTexture: { value: null as THREE.Texture | null },
    uHueOffset: { value: 0 },
    uIsWood: { value: 0 }, // 1 for wood, 0 for blossom
  },
  vertexShader: `
    uniform float uTime;
    uniform float uExpansion;
    uniform float uPixelRatio;
    uniform float uHueOffset;
    uniform float uIsWood;
    
    attribute vec3 aTargetPos;
    attribute float aSize;
    attribute vec3 color;
    attribute float aRotation;
    
    varying vec3 vColor;
    varying float vAlpha;
    varying float vRotation;

    float easeInOutCubic(float x) {
        return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
    }

    // Hue rotation function
    vec3 hueRotate(vec3 col, float angle) {
        const vec3 k = vec3(0.57735);
        float c = cos(angle);
        float s = sin(angle);
        return col * c + cross(k, col) * s + k * dot(k, col) * (1.0 - c);
    }

    void main() {
      // 1. Color Logic
      vec3 finalColor = color;
      
      // Apply persistent hue offset
      if (uHueOffset > 0.01) {
          // Add a spatial rainbow wave based on Y position + Time + HueOffset
          float angle = uHueOffset + position.y * 0.02;
          finalColor = hueRotate(color, angle);
      }

      vColor = finalColor;
      vRotation = aRotation;
      
      // 2. Position/Expansion Logic
      float t = easeInOutCubic(uExpansion);
      vec3 pos = mix(position, aTargetPos, t);
      
      // Turbulence / Wind
      if (uExpansion < 0.5) {
          // Tree State: Gentle Sway
          float wind = sin(uTime * 1.5 + pos.y * 0.05) * 0.3 * (pos.y * 0.01 + 1.0);
          pos.x += wind;
          pos.z += cos(uTime * 1.2 + pos.x * 0.05) * 0.2;
      } else {
          // Galaxy State: Orbit
          float orbitSpeed = 0.2;
          float r = length(pos.xz);
          float theta = atan(pos.z, pos.x) + uTime * orbitSpeed * (100.0 / (r + 10.0));
          pos.x = r * cos(theta);
          pos.z = r * sin(theta);
          
          // Bobbing
          pos.y += sin(uTime + pos.x) * 0.5;
          vRotation += uTime;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      
      // Size attenuation
      gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
      
      // 3. Alpha Logic
      
      // Fade out at camera near plane
      float camDistAlpha = smoothstep(10.0, 30.0, -mvPosition.z);
      
      // Wood Fade: If it's wood and expanding, fade it out to prevent "black bugs"
      float woodFade = 1.0;
      if (uIsWood > 0.5) {
          woodFade = 1.0 - smoothstep(0.0, 0.2, uExpansion);
      }
      
      vAlpha = camDistAlpha * woodFade;
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vRotation;
    
    void main() {
      // Rotate texture UVs
      float mid = 0.5;
      float c = cos(vRotation);
      float s = sin(vRotation);
      vec2 rotatedCoord = vec2(
          c * (gl_PointCoord.x - mid) + s * (gl_PointCoord.y - mid) + mid,
          c * (gl_PointCoord.y - mid) - s * (gl_PointCoord.x - mid) + mid
      );

      vec4 texColor = texture2D(uTexture, rotatedCoord);
      
      // Alpha Clipping (Fix artifacts)
      if (texColor.a < 0.3) discard;
      if (vAlpha < 0.01) discard;
      
      gl_FragColor = vec4(vColor, vAlpha * texColor.a);
    }
  `
};

interface SakuraTreeProps {
  data: ParticleData;
  mode: 'wood' | 'blossom';
  expansionRef: React.MutableRefObject<number>;
  hueRef: React.MutableRefObject<number>;
}

const SakuraTree: React.FC<SakuraTreeProps> = ({ data, mode, expansionRef, hueRef }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  const texture = useMemo(() => {
    return mode === 'wood' ? createBarkTexture() : createPetalTexture();
  }, [mode]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute('aTargetPos', new THREE.BufferAttribute(data.targetPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    const count = data.positions.length / 3;
    const rotations = new Float32Array(count);
    for(let i=0; i<count; i++) rotations[i] = Math.random() * Math.PI * 2;
    geo.setAttribute('aRotation', new THREE.BufferAttribute(rotations, 1));
    return geo;
  }, [data]);

  useEffect(() => {
    if (shaderRef.current) shaderRef.current.uniforms.uTexture.value = texture;
  }, [texture]);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      shaderRef.current.uniforms.uExpansion.value = expansionRef.current;
      shaderRef.current.uniforms.uHueOffset.value = hueRef.current;
      shaderRef.current.uniforms.uIsWood.value = mode === 'wood' ? 1.0 : 0.0;
    }
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={shaderRef}
        attach="material"
        args={[SakuraShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
};

export default SakuraTree;
