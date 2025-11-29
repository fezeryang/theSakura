
import React, { useState, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Scene from './components/Scene';
import HandTracker from './components/HandTracker';

const App: React.FC = () => {
  const [started, setStarted] = useState(false);
  
  // Visual Feedback State
  const [hudData, setHudData] = useState({ fingers: 0, gesture: 'NONE' });
  
  // Real-time gesture data is passed to Scene via props to avoid re-rendering entire Canvas on every frame
  // We use a ref-like pattern by passing the raw object or utilizing the Scene's internal handling
  // However, specifically for the App UI, we need state.
  const [currentGesture, setCurrentGesture] = useState('NONE');
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });

  const handleHandUpdate = useCallback((data: { 
    fingerCount: number; 
    gesture: string; 
    position: { x: number; y: number }; 
    isTracking: boolean 
  }) => {
    setHudData({ fingers: data.fingerCount, gesture: data.gesture });
    setCurrentGesture(data.gesture);
    if (data.isTracking) {
        setHandPosition(data.position);
    }
  }, []);

  return (
    <>
      <div className="relative w-full h-full bg-[#05020a]">
        {!started && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white">
            <h1 className="text-5xl md:text-7xl font-thin tracking-[0.2em] mb-4 text-pink-200 text-center drop-shadow-[0_0_15px_rgba(255,183,197,0.5)]">
              SAKURA DREAM
            </h1>
            <p className="text-gray-400 mb-12 text-center max-w-lg px-6 font-light leading-relaxed">
              A webcam-controlled interactive installation.
              <br/><br/>
              <span className="grid grid-cols-2 gap-x-8 gap-y-4 text-left text-sm border-t border-b border-gray-800 py-6">
                <span>✊ <b>Fist:</b> Reform Tree</span>
                <span>✋ <b>Open Hand:</b> Galaxy Mode</span>
                <span>☝️ <b>1 Finger:</b> Cycle Color</span>
                <span>✌️ <b>2 Fingers:</b> Inspect Photos</span>
              </span>
            </p>
            <button 
              onClick={() => setStarted(true)}
              className="px-10 py-4 border border-pink-500/50 rounded-full text-pink-100 hover:bg-pink-900/20 hover:scale-105 transition-all tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(255,183,197,0.2)]"
            >
              Start Camera
            </button>
          </div>
        )}

        <Canvas
          dpr={[1, 2]} 
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          shadows={false}
        >
          <Suspense fallback={null}>
            <Scene 
              gesture={currentGesture} 
              handPos={handPosition}
            />
          </Suspense>
        </Canvas>
        
        {started && (
          <>
            <HandTracker onUpdate={handleHandUpdate} />
            
            {/* Clean, Transparent HUD */}
            <div className="absolute top-6 left-6 z-40 pointer-events-none font-mono select-none">
                <div className="flex flex-col gap-1 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                    <div className="text-xs text-pink-400 uppercase tracking-widest opacity-80">System Status</div>
                    <div className="text-2xl text-white font-light tracking-tighter">
                        {hudData.gesture === 'NONE' ? 'WAITING' : hudData.gesture}
                    </div>
                    <div className="text-sm text-gray-300">
                        Fingers: <span className="text-pink-200 font-bold">{hudData.fingers}</span>
                    </div>
                    
                    {/* Mode Indicator Overlay */}
                    <div className="mt-4 flex gap-2">
                         <div className={`px-2 py-0.5 text-[10px] rounded border ${hudData.gesture === 'FIST' ? 'border-green-400 text-green-400 bg-green-900/30' : 'border-gray-700 text-gray-700'}`}>TREE</div>
                         <div className={`px-2 py-0.5 text-[10px] rounded border ${hudData.gesture === 'OPEN_HAND' ? 'border-purple-400 text-purple-400 bg-purple-900/30' : 'border-gray-700 text-gray-700'}`}>GALAXY</div>
                         <div className={`px-2 py-0.5 text-[10px] rounded border ${hudData.gesture === 'ONE_FINGER' ? 'border-yellow-400 text-yellow-400 bg-yellow-900/30' : 'border-gray-700 text-gray-700'}`}>COLOR</div>
                         <div className={`px-2 py-0.5 text-[10px] rounded border ${hudData.gesture === 'TWO_FINGERS' ? 'border-blue-400 text-blue-400 bg-blue-900/30' : 'border-gray-700 text-gray-700'}`}>PHOTO</div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none opacity-40">
              <span className="text-white font-thin tracking-[1em] text-[10px] uppercase">
                Gesture Controlled Environment
              </span>
            </div>
          </>
        )}
      </div>
      <Loader 
        containerStyles={{ backgroundColor: '#05020a' }}
        barStyles={{ backgroundColor: '#ffb7c5' }}
        dataStyles={{ color: '#ffb7c5', fontFamily: 'monospace' }} 
      />
    </>
  );
};

export default App;
