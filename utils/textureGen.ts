import * as THREE from 'three';

export const createPetalTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.Texture();

  // Clear
  ctx.clearRect(0, 0, 128, 128);

  // Draw Petal Shape
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  // Start at bottom center
  ctx.moveTo(64, 115); 
  // Left bulge
  ctx.bezierCurveTo(10, 80, 20, 20, 64, 35);
  // Right bulge
  ctx.bezierCurveTo(108, 20, 118, 80, 64, 115);
  ctx.fill();
  
  // Optional: Add a slight gradient for depth
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(1, 'rgba(255, 240, 245, 0.8)');
  ctx.fillStyle = grad;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

export const createBarkTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.Texture();

  // Solid dark base
  ctx.fillStyle = '#8a7b75'; // Lighter here so tinting works in shader
  ctx.fillRect(0, 0, 64, 64);

  // Add noise/grain
  for(let i=0; i<500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)';
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      const w = Math.random() * 4 + 1;
      const h = Math.random() * 2 + 1;
      ctx.fillRect(x, y, w, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};
