
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PhotoData } from '../types';

interface FloatingGalleryProps {
  photos: PhotoData[];
  expansionRef: React.MutableRefObject<number>;
  isRevealed: boolean;
}

const Polaroid: React.FC<{ data: PhotoData; expansionRef: React.MutableRefObject<number>; isRevealed: boolean; index: number; total: number }> = ({ data, expansionRef, isRevealed, index, total }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(data.url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
    });
  }, [data.url]);

  const randomOffset = useMemo(() => Math.random() * 100, []);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    let targetPos = new THREE.Vector3();
    let targetRot = new THREE.Euler();
    let targetScale = 0.3; 
    
    // Derived state from expansion ref
    const isExploded = expansionRef.current > 0.5;

    if (isRevealed) {
        // ACTIVE STATE: Form a gallery in front of camera
        const radius = 35;
        // Spread evenly in view
        const angleStep = 0.4; 
        const centerOffset = (total * angleStep) / 2;
        const currentAngle = index * angleStep - centerOffset;
        
        // Calculate position relative to camera but pushed forward in world space
        // For simplicity, we orbit the world center but orient to camera
        targetPos.set(
            Math.sin(currentAngle) * radius,
            (index % 2 === 0 ? 1 : -1) * 3, // Zig zag height
            Math.cos(currentAngle) * radius + 20 
        );
        
        // Face the camera
        const dummy = new THREE.Object3D();
        dummy.position.copy(targetPos);
        dummy.lookAt(camera.position); // Look at camera
        targetRot = dummy.rotation;

        targetScale = 2.5; 
    } else if (isExploded) {
        // GALAXY STATE: Float in target space
        targetPos.copy(data.targetSpacePos);
        targetRot.copy(data.targetSpaceRot);
        targetScale = 0.5;
    } else {
        // TREE STATE: Hang on branches
        targetPos.copy(data.position);
        targetRot.copy(data.rotation);
        targetScale = 0.3;
    }

    const lerpSpeed = isRevealed ? 3.0 : 1.5;
    
    // Float animation
    const time = state.clock.elapsedTime + randomOffset;
    const floatY = Math.sin(time * (isRevealed ? 1.0 : 0.5)) * (isRevealed ? 0.5 : 0.2);
    
    meshRef.current.position.lerp(
        new THREE.Vector3(targetPos.x, targetPos.y + floatY, targetPos.z), 
        delta * lerpSpeed
    );

    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRot.x, delta * lerpSpeed);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRot.y, delta * lerpSpeed);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRot.z, delta * lerpSpeed);
    
    const currentScale = meshRef.current.scale.x;
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScale, delta * 2));
  });

  return (
    <group ref={meshRef} position={data.position} rotation={data.rotation} scale={0.3}>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[6, 7.5, 0.1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.5, 0.05]}>
        <planeGeometry args={[5, 5]} />
        {texture ? (
           <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
           <meshBasicMaterial color="#333" />
        )}
      </mesh>
    </group>
  );
};

const FloatingGallery: React.FC<FloatingGalleryProps> = ({ photos, expansionRef, isRevealed }) => {
  return (
    <group>
      {photos.map((photo, i) => (
        <Polaroid 
            key={photo.id} 
            index={i} 
            total={photos.length}
            data={photo} 
            expansionRef={expansionRef}
            isRevealed={isRevealed} 
        />
      ))}
    </group>
  );
};

export default FloatingGallery;
