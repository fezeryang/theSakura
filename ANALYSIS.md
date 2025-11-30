# Repository Overview

This project is a Vite + React + Three.js interactive art experience called **Sakura Dream**. It renders a procedurally generated sakura tree whose particles can disperse into a galaxy. Hand gestures captured by MediaPipe control the scene.

## Application Flow
- **Entry point (`index.tsx`)** mounts the `App` component into the root DOM node and wraps it with `React.StrictMode` for development safeguards.
- **HTML shell (`index.html`)** loads TailwindCSS for styling and MediaPipe scripts (`hands`, `camera_utils`, etc.) from CDN, providing global camera/hand-tracking utilities.

## Core UI (`App.tsx`)
- Maintains UI state for start overlay, HUD data, current gesture, and normalized hand position.
- Renders a full-screen `Canvas` from `@react-three/fiber` with the main `Scene` and `Loader` overlay.
- Once started, mounts `HandTracker` to stream webcam frames to MediaPipe and update gesture/hand position data, which feeds the HUD and scene.
- Provides an instructional start screen describing gesture mappings (fist reforms tree, open hand triggers galaxy, one finger cycles color, two fingers reveals photos).

## 3D Scene (`components/Scene.tsx`)
- Initializes camera positioning and uses procedural data from `generateTree`/`createPhotoData` to build the scene.
- Maintains mutable refs for expansion state (tree ↔ galaxy), persistent hue rotation, and background color for smooth animation.
- On each frame:
  - Updates expansion based on gestures and interpolates a background color between tree and galaxy palettes with subtle hue tinting.
  - Applies hue shifts when a single finger gesture is held.
  - Drives `OrbitControls` with joystick-like hand-position input (dead zone to avoid jitter, rate control for camera orbit/polar angles).
- Renders fog, lighting, starfield, two `SakuraTree` point clouds (wood + blossoms), and a `FloatingGallery` of polaroids that reveal when two fingers are held.

## Procedural Generation (`utils/geometry.ts`)
- `generateTree` recursively grows branches using dense particle buffers for wood and blossom point clouds, with randomization for bark roughness and petal clustering. Leaves are stored for later decoration.
- `createPhotoData` picks leaf nodes to anchor polaroid photos, assigns branch-hanging transforms, and alternative “galaxy” target positions/rotations.

## Custom Materials (`components/SakuraTree.tsx`, `utils/textureGen.ts`)
- Builds GPU buffer attributes for each particle (positions, target positions, colors, sizes, random rotations).
- Custom shader material animates particles between tree and galaxy states, applies wind/orbit motion, hue rotation, size attenuation, and alpha handling. Uses generated petal/bark textures drawn on HTML canvas.

## Interactive Media Elements
- **Hand tracking (`components/HandTracker.tsx`):** Uses MediaPipe Hands via CDN to track a single hand, robustly counts raised fingers (thumb openness check plus tip-vs-PIP comparisons), maps counts to gestures, and reports palm-center coordinates as normalized joystick input. Draws mirrored landmark overlays on a canvas HUD.
- **Floating gallery (`components/FloatingGallery.tsx`):** Loads polaroid textures from Picsum, animates their positions/rotations based on current mode (branch-hung, galaxy-dispersed, or camera-facing reveal), and adds gentle float motion.
- **Webcam motion helper (`components/WebcamInput.tsx`):** Separate motion-centroid detector (not currently used in App) that diffs consecutive webcam frames on a downsampled canvas to emit motion vectors and intensity.

## Configuration
- `package.json` defines the Vite/React/Three stack; `vite.config.ts` and `tsconfig.json` provide build tooling defaults.
- The app expects `GEMINI_API_KEY` in `.env.local` for AI Studio deployments, though current code path uses only MediaPipe for interaction.

## Key Interaction Map
- **Fist:** Collapse particles back into a tree.
- **Open hand:** Expand into a galaxy and drift photos into space.
- **One finger:** Cycle blossom hues with persistent offset.
- **Two fingers:** Reveal and arrange polaroid photos in front of the camera.

This structure combines procedural graphics, shader-driven particle animation, and webcam-based gesture control to create an immersive, gesture-driven art installation.
