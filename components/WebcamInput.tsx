import React, { useEffect, useRef, useState } from 'react';

interface WebcamInputProps {
  onMotionUpdate: (x: number, y: number, intensity: number) => void;
}

const WebcamInput: React.FC<WebcamInputProps> = ({ onMotionUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const requestRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 320 }, 
            height: { ideal: 240 },
            facingMode: 'user'
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError("Camera access denied. Please enable camera to interact.");
      }
    };

    startVideo();

    return () => {
      // Cleanup stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && video.readyState === 4) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          // Use a small size for performance (64x48 is plenty for motion blobs)
          const w = 64;
          const h = 48;
          
          if (canvas.width !== w) {
            canvas.width = w;
            canvas.height = h;
          }

          // Draw current video frame (mirror it for natural feel)
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, -w, h);
          ctx.restore();

          const frameData = ctx.getImageData(0, 0, w, h);
          const currentData = frameData.data;
          
          let sumX = 0;
          let sumY = 0;
          let count = 0;

          // Compare with previous frame
          if (prevFrameRef.current) {
            const prevData = prevFrameRef.current;
            
            // Loop through pixels (RGBA, so step by 4)
            for (let i = 0; i < currentData.length; i += 4) {
              // Simple brightness diff (using Green channel as proxy for luminance)
              const diff = Math.abs(currentData[i + 1] - prevData[i + 1]);
              
              // Threshold for "motion"
              if (diff > 25) {
                const pixelIndex = i / 4;
                const x = pixelIndex % w;
                const y = Math.floor(pixelIndex / w);
                
                sumX += x;
                sumY += y;
                count++;
              }
            }
          }

          // Store current frame for next loop
          // (We create a copy because getImageData returns a live view in some browsers, but safe to copy)
          prevFrameRef.current = new Uint8ClampedArray(currentData);

          if (count > 5) { // Minimum noise threshold
            // Calculate centroid 0..1
            const avgX = (sumX / count) / w;
            const avgY = (sumY / count) / h;
            
            // Map to -1..1 range
            // Invert Y because canvas Y is down, but 3D world Y is up
            const normX = (avgX - 0.5) * 2;
            const normY = -(avgY - 0.5) * 2; 

            // Intensity based on amount of movement
            const intensity = Math.min(count / (w * h * 0.1), 1.0);

            onMotionUpdate(normX, normY, intensity);
          } else {
            // Decay if no motion
            onMotionUpdate(0, 0, 0); 
          }
        }
      }
      requestRef.current = requestAnimationFrame(processFrame);
    };

    requestRef.current = requestAnimationFrame(processFrame);
  }, [onMotionUpdate]);

  if (error) return null;

  return (
    <div className="absolute bottom-4 right-4 z-50 pointer-events-none opacity-80">
        <div className="relative border-2 border-pink-300/30 rounded-lg overflow-hidden w-32 h-24 bg-black/50 shadow-[0_0_15px_rgba(255,183,197,0.3)]">
            {/* The canvas shows the raw feed (mirrored) which can be useful for the user to aim */}
            <canvas ref={canvasRef} className="w-full h-full object-cover opacity-60" />
            <video ref={videoRef} playsInline muted className="hidden" />
            <div className="absolute top-1 left-2 text-[8px] text-pink-200 tracking-widest font-mono uppercase">
                Motion Link
            </div>
            <div className="absolute bottom-1 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_#4ade80]" />
        </div>
    </div>
  );
};

export default WebcamInput;