
import React, { useEffect, useRef, useState } from 'react';

interface HandTrackerProps {
  onUpdate: (data: {
    fingerCount: number;
    gesture: string;
    position: { x: number; y: number };
    isTracking: boolean;
  }) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    // Access globals loaded via CDN in index.html
    const Hands = (window as any).Hands;
    const Camera = (window as any).Camera;
    const drawConnectors = (window as any).drawConnectors;
    const drawLandmarks = (window as any).drawLandmarks;
    const HAND_CONNECTIONS = (window as any).HAND_CONNECTIONS;

    if (!Hands || !Camera) {
      setStatus("Error: MediaPipe Libraries not found");
      return;
    }

    const hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    // Robust Finger Counter: Check if Tip is "above" PIP (Knuckle) in screen space 
    // Note: Y is 0 at top, 1 at bottom. So "Up" means Tip.y < Pip.y
    const isFingerUp = (landmarks: any[], tipIdx: number, pipIdx: number) => {
      // Calculate vector from wrist to PIP to determine hand orientation roughly
      // But simple Y check usually works for "Hand Up" pose
      return landmarks[tipIdx].y < landmarks[pipIdx].y;
    };

    hands.onResults((results: any) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw image mirrored for natural feel
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
        
        // Draw skeleton
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];

          if (drawConnectors && drawLandmarks) {
             drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: 'rgba(255, 183, 197, 0.5)', lineWidth: 2 });
             drawLandmarks(ctx, landmarks, { color: '#ffffff', lineWidth: 1, radius: 2 });
          }

          // --- ROBUST FINGER COUNTING ---
          
          // Thumb: Check Angle/Distance. 
          // We check if Thumb Tip (4) is far from Pinky Knuckle (17) 
          // This indicates an "Open" thumb relative to palm
          const thumbTip = landmarks[4];
          const pinkyKnuckle = landmarks[17];
          const distance = Math.hypot(thumbTip.x - pinkyKnuckle.x, thumbTip.y - pinkyKnuckle.y);
          const thumbOpen = distance > 0.25; // Threshold based on normalized coords

          // Other Fingers: Tip vs PIP (Knuckle) Y-level
          const indexUp = isFingerUp(landmarks, 8, 6);
          const middleUp = isFingerUp(landmarks, 12, 10);
          const ringUp = isFingerUp(landmarks, 16, 14);
          const pinkyUp = isFingerUp(landmarks, 20, 18);

          let count = 0;
          if (thumbOpen) count++;
          if (indexUp) count++;
          if (middleUp) count++;
          if (ringUp) count++;
          if (pinkyUp) count++;

          // --- GESTURE MAPPING ---
          let gesture = "UNKNOWN";

          if (count === 0) {
            gesture = "FIST"; // REFORM TREE
          } else if (count === 5) {
            gesture = "OPEN_HAND"; // DISPERSE GALAXY
          } else if (count === 1 && indexUp) {
            gesture = "ONE_FINGER"; // CYCLE COLORS
          } else if (count === 2 && indexUp && middleUp) {
            gesture = "TWO_FINGERS"; // REVEAL PHOTOS
          } else {
            gesture = `COUNT_${count}`;
          }

          // --- CAMERA CONTROL INPUT ---
          // Use Palm Center (Landmark 9)
          // Invert X because of mirroring (Screen Left = Hand Left)
          const normalizedPos = { x: 1.0 - landmarks[9].x, y: landmarks[9].y };

          onUpdate({
            fingerCount: count,
            gesture,
            position: normalizedPos,
            isTracking: true
          });
          
          setStatus(`Tracking: ${gesture}`);
        } else {
          onUpdate({
            fingerCount: 0,
            gesture: "NONE",
            position: { x: 0.5, y: 0.5 },
            isTracking: false
          });
          setStatus("Searching Hand...");
        }
        ctx.restore();
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 320,
      height: 240
    });

    camera.start().then(() => setStatus("Camera Active")).catch((e: any) => setStatus("Camera Error: " + e));

    return () => {
      // Cleanup
    };
  }, [onUpdate]);

  return (
    <div className="absolute top-4 right-4 z-50">
      <div className="relative border border-pink-500/30 rounded-lg overflow-hidden w-32 h-24 bg-transparent shadow-none">
        {/* Debug Canvas: Visible but subtle */}
        <canvas ref={canvasRef} width={320} height={240} className="w-full h-full object-cover opacity-80" />
        <video ref={videoRef} className="hidden" playsInline muted />
        
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 flex justify-between items-center">
            <span className="text-[8px] text-pink-200 font-mono tracking-wider uppercase shadow-black drop-shadow-md">{status}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${status.includes("Tracking") ? 'bg-green-400' : 'bg-red-400'}`}></div>
        </div>
      </div>
    </div>
  );
};

export default HandTracker;
