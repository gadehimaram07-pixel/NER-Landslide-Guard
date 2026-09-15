import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Play, Pause, RotateCcw, Mountain, Sliders,
  Gauge, Sun, Cloud, AlertTriangle, CheckCircle2, Volume2, VolumeX,
  Compass, Eye, RefreshCw, Zap, Info, Crosshair, Sparkles
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* PROCEDURAL TEXTURE GENERATORS (High-Performance Canvas-Generated Textures)  */
/* -------------------------------------------------------------------------- */

function createBedrockTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep slate geological rock base
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 512, 512);

  // Geological bedding strata bands
  for (let y = 0; y < 512; y += 18) {
    const darkness = 0.85 + Math.sin(y * 0.12) * 0.15;
    ctx.fillStyle = `rgba(${Math.floor(40 * darkness)}, ${Math.floor(48 * darkness)}, ${Math.floor(62 * darkness)}, 0.6)`;
    ctx.fillRect(0, y, 512, 10 + Math.sin(y) * 4);
  }

  // Weathering fractures & mineral veins
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    let x = (i * 27) % 512;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 512) {
      x += (Math.random() - 0.48) * 22;
      y += 20 + Math.random() * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function createAsphaltRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark asphalt pavement
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  // Aggregate stone grain speckles
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const lum = 40 + Math.floor(Math.random() * 35);
    ctx.fillStyle = `rgb(${lum}, ${lum + 2}, ${lum + 8})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Outer solid white road edge lines (shoulders)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(25, 0, 14, 512);
  ctx.fillRect(473, 0, 14, 512);

  // Center double yellow dashed lines
  ctx.fillStyle = '#facc15';
  const dashH = 48;
  const gapH = 32;
  for (let y = 0; y < 512; y += dashH + gapH) {
    ctx.fillRect(246, y, 7, dashH);
    ctx.fillRect(259, y, 7, dashH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

function createConcreteWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Reinforced concrete grey
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 256, 256);

  // Formwork panels & seams
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 248);
  ctx.strokeRect(4, 128, 248, 2);

  // Weep drainage holes
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.arc(64, 190, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(192, 190, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(128, 64, 8, 0, Math.PI * 2); ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  return texture;
}

/* -------------------------------------------------------------------------- */
/* MAIN THREE.JS 3D SLOPE DIGITAL TWIN COMPONENT                              */
/* -------------------------------------------------------------------------- */

export default function ThreeSlopeDigitalTwin({
  slopeAngle = 42,
  rainIntensity = 55,
  waterTableHeight = 1.8,
  porePressure = 15.2,
  factorOfSafety = 0.88,
  isFailed = false,
  drivingStress = 45.2,
  resistingStrength = 39.8,
  saturation = 72,
  cohesion = 12,
  durationHours = 6,
  gsiSlopeClass = 'VERY_HIGH_HAZARD (VERY STEEP 36°-45°)',
  gsiSlopeStatus = 'CRITICAL',
  gsiRainAlert = 'GSI_WARNING (75-120mm)',
  gsiRainStatus = 'WARNING',
  bisPoreStatus = 'BIS_CRITICAL_HYDROSTATIC (ru > 0.35)',
  bisPoreLevel = 'CRITICAL',
  bisRuRatio = 0.38,
  bisFosCompliance = 'BIS_FAILURE_VIOLATION (FoS < 1.00)',
  bisCodeStatus = 'CRITICAL',
  compositeHazardPct = 78.5,
  isBisCompliant = false
}) {
  const mountRef = useRef(null);
  const animFrameRef = useRef(null);

  // Simulation playback state (UI synced)
  const [slideProgress, setSlideProgress] = useState(0);
  const [isPlayingSlide, setIsPlayingSlide] = useState(false);
  const [autoSlideOnFailure, setAutoSlideOnFailure] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraPreset, setCameraPreset] = useState('iso');
  const [lightingPreset, setLightingPreset] = useState('daylight');
  const [autoRotate, setAutoRotate] = useState(false);
  const [fps, setFps] = useState(60);

  // Interactive 3D Raycasting Telemetry Tooltip
  const [tooltip, setTooltip] = useState(null);

  // Layer visibility toggles (all 11 interactive)
  const [visibleLayers, setVisibleLayers] = useState({
    bedrock: true,
    soilWedge: true,
    slipCircle: true,
    waterTable: true,
    rain: true,
    borehole: true,
    infrastructure: true,
    slices: true,
    tensionCrack: true,
    seepage: true,
    trees: true
  });

  // Scene & Rendering Refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const sunLightRef = useRef(null);
  const hemiLightRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseCoordsRef = useRef(new THREE.Vector2(-999, -999));
  const interactiveObjectsRef = useRef([]);

  // Model & Mesh Sub-Group Refs
  const slopeModelGroupRef = useRef(null);
  const slidingGroupRef = useRef(null);
  const bedrockMeshRef = useRef(null);
  const soilMeshRef = useRef(null);
  const grassMeshRef = useRef(null);
  const waterMeshRef = useRef(null);
  const crackMeshRef = useRef(null);
  const slipCircleMeshRef = useRef(null);
  const slipCircleOtherMeshRef = useRef(null);
  const slipArrowsGroupRef = useRef(null);
  const slicesGroupRef = useRef(null);
  const boreholeGroupRef = useRef(null);
  const boreholeUpperRef = useRef(null);
  const boreholeLedRef = useRef(null);
  const roadGroupRef = useRef(null);
  const retainingWallRef = useRef(null);
  const seepageGroupRef = useRef(null);
  const seepageParticlesRef = useRef([]);
  const rainSystemRef = useRef(null);
  const dustSystemRef = useRef(null);
  const dustDataRef = useRef([]);
  const treesListRef = useRef([]);
  const bouldersListRef = useRef([]);

  // Slip center tracking for mathematically exact rotational shear
  const slipCenterRef = useRef({
    cx: -2,
    cy: 14,
    radius: 18,
    crestX: -2.6,
    toeX: 9.0,
    crestY: 11.0,
    toeY: 0.5,
    betaRad: (42 * Math.PI) / 180
  });

  // Damped Smooth Camera Controls Ref (Inertia & Smooth Transitions)
  const controlsRef = useRef({
    isDragging: false,
    isPanning: false,
    button: 0,
    prevMouseX: 0,
    prevMouseY: 0,
    // Current smoothed coordinates (rendered)
    sphericalCurrent: { radius: 46, theta: 0.95, phi: 1.1 },
    // Target coordinates (interpolated toward)
    sphericalTarget: { radius: 46, theta: 0.95, phi: 1.1 },
    targetCurrent: new THREE.Vector3(2, 2, 0),
    targetTarget: new THREE.Vector3(2, 2, 0),
    // Camera Preset Smooth Glide Transition
    transitioning: false,
    transitionStartTime: 0,
    transitionDuration: 850,
    startSpherical: { radius: 46, theta: 0.95, phi: 1.1 },
    startTarget: new THREE.Vector3(2, 2, 0),
    endSpherical: { radius: 46, theta: 0.95, phi: 1.1 },
    endTarget: new THREE.Vector3(2, 2, 0),
    dampingFactor: 0.085
  });

  const slideProgressRef = useRef(0);
  const isPlayingRef = useRef(false);
  const audioCtxRef = useRef(null);
  const lastUiUpdateRef = useRef(0);
  const autoRotateRef = useRef(false);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    slideProgressRef.current = slideProgress;
  }, [slideProgress]);

  useEffect(() => {
    isPlayingRef.current = isPlayingSlide;
  }, [isPlayingSlide]);

  const isThresholdBreached = isFailed || factorOfSafety < 1.0;

  /* ------------------------------------------------------------------------ */
  /* HIGH-FIDELITY WEB AUDIO ACOUSTIC SYNTHESIS (Multi-Oscillator Mountain Rumble) */
  /* ------------------------------------------------------------------------ */

  const playRumbleSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const duration = 2.4;

      // Master gain node with smooth envelope (zero pops/clicks)
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      masterGain.connect(ctx.destination);

      // Low-frequency grinding sawtooth oscillator
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(48, now);
      osc1.frequency.exponentialRampToValueAtTime(22, now + duration);
      osc1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + duration);

      // Sub-bass tectonic rumble sine oscillator
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(32, now);
      osc2.frequency.linearRampToValueAtTime(16, now + duration);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.15, now);
      osc2.connect(subGain);
      subGain.connect(masterGain);
      osc2.start(now);
      osc2.stop(now + duration);

      // Filtered noise buffer for cascading gravel & rockfall friction
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, now);
      filter.frequency.linearRampToValueAtTime(70, now + duration);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(masterGain);
      whiteNoise.start(now);
      whiteNoise.stop(now + duration);

    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled]);

  // React to threshold breach: if breached, trigger failure slide; if safe, restore pristine intact state
  useEffect(() => {
    if (isThresholdBreached && autoSlideOnFailure) {
      if (slideProgressRef.current < 0.05) {
        setIsPlayingSlide(true);
        playRumbleSound();
      }
    } else if (!isThresholdBreached) {
      setIsPlayingSlide(false);
      setSlideProgress(0);
      slideProgressRef.current = 0;
      applySlideDeformation(0);
    }
  }, [isThresholdBreached, autoSlideOnFailure, playRumbleSound]);

  /* ------------------------------------------------------------------------ */
  /* SMOOTH CAMERA PRESET TRANSITION (Cubic Ease-In-Out Glide)                */
  /* ------------------------------------------------------------------------ */

  const applyCameraPreset = (preset) => {
    setCameraPreset(preset);
    const { crestX, toeX, crestY, toeY } = slipCenterRef.current;
    const ctrl = controlsRef.current;

    let targetSpherical = { radius: 46, theta: 0.95, phi: 1.1 };
    let targetLookAt = new THREE.Vector3(2, 2, 0);

    if (preset === 'iso') {
      targetSpherical = { radius: 46, theta: 0.95, phi: 1.1 };
      targetLookAt = new THREE.Vector3(2, 2, 0);
    } else if (preset === 'section') {
      targetSpherical = { radius: 40, theta: 0.0, phi: Math.PI / 2 - 0.03 };
      targetLookAt = new THREE.Vector3((crestX + toeX) / 2, (crestY + toeY) / 2, 0);
    } else if (preset === 'scarp') {
      targetSpherical = { radius: 25, theta: 0.75, phi: 0.82 };
      targetLookAt = new THREE.Vector3(crestX, crestY, 1);
    } else if (preset === 'toe') {
      targetSpherical = { radius: 26, theta: 1.38, phi: 1.14 };
      targetLookAt = new THREE.Vector3(toeX + 2, toeY, 1);
    }

    // Initiate smooth cubic easing transition
    ctrl.startSpherical = { ...ctrl.sphericalCurrent };
    ctrl.startTarget.copy(ctrl.targetCurrent);
    ctrl.endSpherical = targetSpherical;
    ctrl.endTarget.copy(targetLookAt);
    ctrl.transitionStartTime = performance.now();
    ctrl.transitioning = true;
  };

  /* ------------------------------------------------------------------------ */
  /* 1. INITIALIZE THREE.JS WEBGL SCENE (Antialiased, Soft Shadows, Tone Map)  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbde0fe); // Crisp Alpine Sky
    scene.fog = new THREE.FogExp2(0xbde0fe, 0.0032);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Sunlight (High-Precision Cascaded Directional Light)
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.6);
    sunLight.position.set(38, 62, 34);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 140;
    sunLight.shadow.camera.left = -42;
    sunLight.shadow.camera.right = 42;
    sunLight.shadow.camera.top = 42;
    sunLight.shadow.camera.bottom = -42;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Ambient Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x78350f, 1.4);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Subtle Cool Blue Fill Light
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    fillLight.position.set(-36, 26, -26);
    scene.add(fillLight);

    // Foundation Datum Grid
    const gridHelper = new THREE.GridHelper(72, 36, 0x475569, 0x64748b);
    gridHelper.position.y = -8;
    scene.add(gridHelper);

    // Master Group
    const masterSlopeGroup = new THREE.Group();
    slopeModelGroupRef.current = masterSlopeGroup;
    scene.add(masterSlopeGroup);

    // Build parametric model
    rebuildParametricSlope(masterSlopeGroup, slopeAngle, factorOfSafety, saturation, cohesion, waterTableHeight);

    // Particle Systems
    createRainSystem(scene);
    createDustSystem(scene);

    /* ---------------------------------------------------------------------- */
    /* DAMPED MOUSE, PAN & TOUCH CONTROLS                                     */
    /* ---------------------------------------------------------------------- */

    const ctrl = controlsRef.current;

    const handleMouseDown = (e) => {
      ctrl.isDragging = true;
      ctrl.button = e.button; // 0: left click (orbit), 2: right click (pan)
      ctrl.prevMouseX = e.clientX;
      ctrl.prevMouseY = e.clientY;
      ctrl.transitioning = false; // Interrupted by user input
    };

    const handleMouseMove = (e) => {
      // Raycasting coordinates update (relative to canvas)
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseCoordsRef.current.set(x, y);

      if (!ctrl.isDragging) return;

      const dx = e.clientX - ctrl.prevMouseX;
      const dy = e.clientY - ctrl.prevMouseY;
      ctrl.prevMouseX = e.clientX;
      ctrl.prevMouseY = e.clientY;

      if (ctrl.button === 0) {
        // Orbit: Update target spherical coordinates smoothly
        ctrl.sphericalTarget.theta -= dx * 0.0075;
        ctrl.sphericalTarget.phi -= dy * 0.0075;
        ctrl.sphericalTarget.phi = Math.max(0.10, Math.min(Math.PI / 2 - 0.04, ctrl.sphericalTarget.phi));
      } else if (ctrl.button === 2 || ctrl.button === 1) {
        // Pan: Smoothly shift target in camera plane
        const panSpeed = ctrl.sphericalCurrent.radius * 0.0018;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        ctrl.targetTarget.addScaledVector(right, -dx * panSpeed);
        ctrl.targetTarget.addScaledVector(up, dy * panSpeed);
      }
    };

    const handleMouseUp = () => {
      ctrl.isDragging = false;
    };

    const handleContextMenu = (e) => {
      e.preventDefault(); // Enable smooth right-click panning without context menu popup
    };

    const handleWheel = (e) => {
      e.preventDefault();
      ctrl.transitioning = false;
      const zoomFactor = Math.exp(e.deltaY * 0.0012);
      ctrl.sphericalTarget.radius = Math.max(12, Math.min(105, ctrl.sphericalTarget.radius * zoomFactor));
    };

    // Touch support (1 finger orbit, 2 finger zoom)
    let touchStartDist = 0;
    const handleTouchStart = (e) => {
      ctrl.transitioning = false;
      if (e.touches.length === 1) {
        ctrl.isDragging = true;
        ctrl.button = 0;
        ctrl.prevMouseX = e.touches[0].clientX;
        ctrl.prevMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        ctrl.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1 && ctrl.isDragging) {
        const dx = e.touches[0].clientX - ctrl.prevMouseX;
        const dy = e.touches[0].clientY - ctrl.prevMouseY;
        ctrl.prevMouseX = e.touches[0].clientX;
        ctrl.prevMouseY = e.touches[0].clientY;
        ctrl.sphericalTarget.theta -= dx * 0.008;
        ctrl.sphericalTarget.phi -= dy * 0.008;
        ctrl.sphericalTarget.phi = Math.max(0.10, Math.min(Math.PI / 2 - 0.04, ctrl.sphericalTarget.phi));
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (touchStartDist > 0) {
          const ratio = touchStartDist / dist;
          ctrl.sphericalTarget.radius = Math.max(12, Math.min(105, ctrl.sphericalTarget.radius * ratio));
          touchStartDist = dist;
        }
      }
    };

    const handleTouchEnd = () => {
      ctrl.isDragging = false;
      touchStartDist = 0;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    /* ---------------------------------------------------------------------- */
    /* 60/120 FPS BUTTERY-SMOOTH ANIMATION & PHYSICS LOOP                     */
    /* ---------------------------------------------------------------------- */

    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTime = performance.now();

    const animate = (currentTime) => {
      const dt = Math.min(0.08, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // FPS Monitor calculation
      frameCounter++;
      if (currentTime - fpsTime >= 500) {
        setFps(Math.round((frameCounter * 1000) / (currentTime - fpsTime)));
        frameCounter = 0;
        fpsTime = currentTime;
      }

      /* 1. Camera Smooth Damping & Cinematic Presets */
      if (ctrl.transitioning) {
        const elapsed = currentTime - ctrl.transitionStartTime;
        const t = Math.min(1.0, elapsed / ctrl.transitionDuration);
        // Cubic Ease-in-out
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        ctrl.sphericalCurrent.radius = THREE.MathUtils.lerp(ctrl.startSpherical.radius, ctrl.endSpherical.radius, ease);
        ctrl.sphericalCurrent.theta = THREE.MathUtils.lerp(ctrl.startSpherical.theta, ctrl.endSpherical.theta, ease);
        ctrl.sphericalCurrent.phi = THREE.MathUtils.lerp(ctrl.startSpherical.phi, ctrl.endSpherical.phi, ease);
        ctrl.targetCurrent.lerpVectors(ctrl.startTarget, ctrl.endTarget, ease);

        ctrl.sphericalTarget.radius = ctrl.sphericalCurrent.radius;
        ctrl.sphericalTarget.theta = ctrl.sphericalCurrent.theta;
        ctrl.sphericalTarget.phi = ctrl.sphericalCurrent.phi;
        ctrl.targetTarget.copy(ctrl.targetCurrent);

        if (t >= 1.0) ctrl.transitioning = false;
      } else {
        // Auto-rotation turntable mode
        if (autoRotateRef.current) {
          ctrl.sphericalTarget.theta += 0.0035;
        }

        // Buttery-smooth damping towards target
        const damp = ctrl.dampingFactor;
        ctrl.sphericalCurrent.theta += (ctrl.sphericalTarget.theta - ctrl.sphericalCurrent.theta) * damp;
        ctrl.sphericalCurrent.phi += (ctrl.sphericalTarget.phi - ctrl.sphericalCurrent.phi) * damp;
        ctrl.sphericalCurrent.radius += (ctrl.sphericalTarget.radius - ctrl.sphericalCurrent.radius) * damp;
        ctrl.targetCurrent.lerp(ctrl.targetTarget, damp);
      }

      // Update camera position from smoothed spherical coordinates
      const { radius, theta, phi } = ctrl.sphericalCurrent;
      const target = ctrl.targetCurrent;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);

      /* 2. Viscoplastic Landslide Physics Progression (Smooth Shear Acceleration) */
      if (isPlayingRef.current) {
        let cur = slideProgressRef.current;
        if (cur < 1.0) {
          // Non-linear viscoplastic shear velocity curve
          // Slow initial creep -> rapid accelerated shearing -> decelerating runout deposition
          const viscoplasticSpeed = 0.22 + Math.sin(cur * Math.PI) * 0.65;
          cur = Math.min(1.0, cur + dt * viscoplasticSpeed);
          slideProgressRef.current = cur;

          // Throttle React UI state update to 20Hz to prevent reconciliation stutter
          if (currentTime - lastUiUpdateRef.current > 45) {
            setSlideProgress(cur);
            lastUiUpdateRef.current = currentTime;
          }
        } else {
          isPlayingRef.current = false;
          setIsPlayingSlide(false);
          setSlideProgress(1.0);
        }
      }

      // Apply dynamic geometrical displacement (runs at full 60/120Hz)
      applySlideDeformation(slideProgressRef.current);

      /* 3. Rain Animation with Terminal Velocity and Splashes */
      if (rainSystemRef.current && rainSystemRef.current.visible) {
        const positions = rainSystemRef.current.geometry.attributes.position.array;
        const count = positions.length / 3;
        const speed = Math.max(0.65, rainIntensity / 28);
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] -= 48 * speed * dt;
          positions[i * 3] += 8 * dt; // Slight wind drift
          if (positions[i * 3 + 1] < -6) {
            positions[i * 3 + 1] = 28 + Math.random() * 8;
            positions[i * 3] = -28 + Math.random() * 56;
          }
        }
        rainSystemRef.current.geometry.attributes.position.needsUpdate = true;
      }

      /* 4. Billowing Landslide Dust Cloud Simulation with Expansion & Fade */
      if (dustSystemRef.current && dustSystemRef.current.visible) {
        const dustPos = dustSystemRef.current.geometry.attributes.position.array;
        const dustCount = dustPos.length / 3;
        const dData = dustDataRef.current;
        const isSliding = isPlayingRef.current && slideProgressRef.current > 0.04 && slideProgressRef.current < 0.98;

        if (isSliding) {
          for (let i = 0; i < dustCount; i++) {
            dustPos[i * 3] += dData[i].vx * dt;
            dustPos[i * 3 + 1] += dData[i].vy * dt;
            dustPos[i * 3 + 2] += dData[i].vz * dt;
            dData[i].life -= dt * 0.8;

            if (dData[i].life <= 0) {
              // Recycle particle to active shearing zone
              dustPos[i * 3] = 7.5 + Math.random() * 5.5;
              dustPos[i * 3 + 1] = 0.2 + Math.random() * 3.5;
              dustPos[i * 3 + 2] = -7 + Math.random() * 14;
              dData[i].vx = (Math.random() - 0.25) * 4.2;
              dData[i].vy = 1.2 + Math.random() * 3.8;
              dData[i].vz = (Math.random() - 0.5) * 3.5;
              dData[i].life = 0.5 + Math.random() * 1.5;
            }
          }
          dustSystemRef.current.geometry.attributes.position.needsUpdate = true;
        }
      }

      /* 5. Animated Toe Seepage Springs Flow */
      if (seepageParticlesRef.current.length > 0 && seepageGroupRef.current?.visible) {
        const time = currentTime * 0.003;
        seepageParticlesRef.current.forEach((sp, idx) => {
          const pulse = Math.sin(time * 3 + idx) * 0.25;
          sp.scale.set(1 + pulse, 1 + pulse * 1.5, 1 + pulse);
        });
      }

      /* 6. Subterranean Phreatic Surface Translucent Water Wave */
      if (waterMeshRef.current && waterMeshRef.current.visible) {
        const wave = Math.sin(currentTime * 0.0018) * 0.04;
        waterMeshRef.current.position.y = wave;
      }

      /* 7. Bishop Shear Slip Directional Vectors Flow Animation */
      if (slipArrowsGroupRef.current && slipArrowsGroupRef.current.visible) {
        const flowTime = currentTime * 0.004;
        slipArrowsGroupRef.current.children.forEach((arrow, i) => {
          const offset = ((flowTime + i * 0.15) % 1);
          arrow.material.opacity = 0.3 + Math.sin(offset * Math.PI) * 0.7;
        });
      }

      /* 8. Interactive Raycast Detection on Hover */
      if (mouseCoordsRef.current.x !== -999) {
        raycasterRef.current.setFromCamera(mouseCoordsRef.current, camera);
        const intersects = raycasterRef.current.intersectObjects(interactiveObjectsRef.current, true);
        if (intersects.length > 0) {
          let hitObj = intersects[0].object;
          while (hitObj && !hitObj.userData?.telemetry && hitObj.parent) {
            hitObj = hitObj.parent;
          }
          if (hitObj?.userData?.telemetry) {
            const screenPos = intersects[0].point.clone().project(camera);
            const domW = mountRef.current.clientWidth;
            const domH = mountRef.current.clientHeight;
            const screenX = ((screenPos.x + 1) * domW) / 2;
            const screenY = ((-screenPos.y + 1) * domH) / 2;

            setTooltip({
              ...hitObj.userData.telemetry,
              screenX: Math.max(20, Math.min(domW - 240, screenX + 16)),
              screenY: Math.max(20, Math.min(domH - 120, screenY - 40))
            });
          } else {
            setTooltip(null);
          }
        } else {
          setTooltip(null);
        }
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* 2. REBUILD PARAMETRIC SLOPE ON ANGLE, FOS, COHESION, OR SATURATION CHANGE */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!slopeModelGroupRef.current) return;
    rebuildParametricSlope(slopeModelGroupRef.current, slopeAngle, factorOfSafety, saturation, cohesion, waterTableHeight);
    applySlideDeformation(slideProgressRef.current);
  }, [slopeAngle, factorOfSafety, saturation, cohesion, waterTableHeight]);

  /* ------------------------------------------------------------------------ */
  /* 3. DYNAMICALLY UPDATE SOIL MOISTURE APPEARANCE (Saturation Wetness Sheen) */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!soilMeshRef.current || !soilMeshRef.current.material) return;
    const satNorm = Math.max(0, Math.min(1, (saturation - 30) / (95 - 30)));
    const r = THREE.MathUtils.lerp(0x9a / 255, 0x3a / 255, satNorm);
    const g = THREE.MathUtils.lerp(0x58 / 255, 0x18 / 255, satNorm);
    const b = THREE.MathUtils.lerp(0x23 / 255, 0x05 / 255, satNorm);
    soilMeshRef.current.material.color.setRGB(r, g, b);
    soilMeshRef.current.material.roughness = THREE.MathUtils.lerp(0.92, 0.35, satNorm);
    soilMeshRef.current.material.needsUpdate = true;
  }, [saturation]);

  /* ------------------------------------------------------------------------ */
  /* 4. DYNAMIC ATMOSPHERIC SKY & STORM LIGHTING (Rain Intensity)              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!sceneRef.current || !sunLightRef.current) return;

    if (rainSystemRef.current) {
      rainSystemRef.current.visible = visibleLayers.rain && rainIntensity > 0;
      if (rainSystemRef.current.material) {
        rainSystemRef.current.material.opacity = Math.min(0.92, 0.25 + rainIntensity / 95);
      }
    }

    if (lightingPreset === 'daylight') {
      if (rainIntensity === 0) {
        sceneRef.current.background.setHex(0xbde0fe); // Crisp Azure Sunny Sky
        sceneRef.current.fog.color.setHex(0xbde0fe);
        sunLightRef.current.intensity = 2.7;
        sunLightRef.current.color.setHex(0xfffbeb);
      } else if (rainIntensity < 45) {
        sceneRef.current.background.setHex(0x93c5fd); // Light Overcast Daylight
        sceneRef.current.fog.color.setHex(0x93c5fd);
        sunLightRef.current.intensity = 2.2;
        sunLightRef.current.color.setHex(0xf8fafc);
      } else if (rainIntensity < 85) {
        sceneRef.current.background.setHex(0x64748b); // Storm Slate Grey
        sceneRef.current.fog.color.setHex(0x64748b);
        sunLightRef.current.intensity = 1.6;
        sunLightRef.current.color.setHex(0xe2e8f0);
      } else {
        sceneRef.current.background.setHex(0x334155); // Severe Monsoon Cloudburst
        sceneRef.current.fog.color.setHex(0x334155);
        sunLightRef.current.intensity = 1.1;
        sunLightRef.current.color.setHex(0xcfd8dc);
      }
    } else {
      sceneRef.current.background.setHex(0x1e293b);
      sceneRef.current.fog.color.setHex(0x1e293b);
      sunLightRef.current.intensity = 0.95;
    }
  }, [rainIntensity, visibleLayers.rain, lightingPreset]);

  /* ------------------------------------------------------------------------ */
  /* 5. DYNAMIC WATER TABLE & SEEPAGE SPRINGS                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!waterMeshRef.current) return;
    const factor = Math.max(0.3, Math.min(2.5, waterTableHeight / 1.35));
    waterMeshRef.current.scale.set(1, factor, 1);

    if (seepageGroupRef.current) {
      seepageGroupRef.current.visible = visibleLayers.seepage && (waterTableHeight > 1.35 || bisRuRatio > 0.20 || saturation > 68);
    }
  }, [waterTableHeight, bisRuRatio, saturation, visibleLayers.seepage]);

  /* ------------------------------------------------------------------------ */
  /* 6. BISHOP SLIP ARC COLOR, CRACK & BOREHOLE LED                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!slipCircleMeshRef.current) return;
    let col = 0x10b981; // Safe green
    if (factorOfSafety < 1.0) col = 0xef4444; // Crimson failure
    else if (factorOfSafety < 1.30) col = 0xf97316; // Warning orange
    else if (factorOfSafety < 1.50) col = 0xf59e0b; // Amber

    slipCircleMeshRef.current.material.color.setHex(col);
    if (slipCircleOtherMeshRef.current) {
      slipCircleOtherMeshRef.current.material.color.setHex(col);
    }

    if (crackMeshRef.current) {
      if (factorOfSafety < 1.0) {
        crackMeshRef.current.visible = visibleLayers.tensionCrack;
        const crackW = Math.max(0.6, slideProgressRef.current * 4.8);
        crackMeshRef.current.scale.set(crackW, 1, 1);
      } else if (factorOfSafety < 1.30) {
        crackMeshRef.current.visible = visibleLayers.tensionCrack;
        const crackW = (1.30 - factorOfSafety) * 1.5;
        crackMeshRef.current.scale.set(crackW, 1, 1);
      } else {
        crackMeshRef.current.visible = false;
        crackMeshRef.current.scale.set(0.001, 1, 1);
      }
    }

    if (boreholeLedRef.current) {
      if (factorOfSafety < 1.0 || slideProgressRef.current > 0.05) {
        boreholeLedRef.current.material.color.setHex(0xef4444);
        boreholeLedRef.current.material.emissive.setHex(0xb91c1c);
      } else if (factorOfSafety < 1.30) {
        boreholeLedRef.current.material.color.setHex(0xf59e0b);
        boreholeLedRef.current.material.emissive.setHex(0xb45309);
      } else {
        boreholeLedRef.current.material.color.setHex(0x10b981);
        boreholeLedRef.current.material.emissive.setHex(0x059669);
      }
    }
  }, [factorOfSafety, slideProgress, visibleLayers.tensionCrack]);

  /* ------------------------------------------------------------------------ */
  /* 7. DYNAMIC VISIBILITY OF ALL 11 LAYERS                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (bedrockMeshRef.current) bedrockMeshRef.current.visible = visibleLayers.bedrock;
    if (soilMeshRef.current) soilMeshRef.current.visible = visibleLayers.soilWedge;
    if (grassMeshRef.current) grassMeshRef.current.visible = visibleLayers.soilWedge;
    if (slipCircleMeshRef.current) slipCircleMeshRef.current.visible = visibleLayers.slipCircle;
    if (slipCircleOtherMeshRef.current) slipCircleOtherMeshRef.current.visible = visibleLayers.slipCircle;
    if (slipArrowsGroupRef.current) slipArrowsGroupRef.current.visible = visibleLayers.slipCircle;
    if (slicesGroupRef.current) slicesGroupRef.current.visible = visibleLayers.slices;
    if (waterMeshRef.current) waterMeshRef.current.visible = visibleLayers.waterTable;
    if (boreholeGroupRef.current) boreholeGroupRef.current.visible = visibleLayers.borehole;
    if (roadGroupRef.current) roadGroupRef.current.visible = visibleLayers.infrastructure;
    if (treesListRef.current) {
      treesListRef.current.forEach(t => { t.visible = visibleLayers.trees; });
    }
    if (seepageGroupRef.current) {
      seepageGroupRef.current.visible = visibleLayers.seepage && (waterTableHeight > 1.35 || bisRuRatio > 0.20 || saturation > 68);
    }
    if (crackMeshRef.current) {
      crackMeshRef.current.visible = visibleLayers.tensionCrack && (factorOfSafety < 1.30 || slideProgressRef.current > 0);
    }
    if (rainSystemRef.current) {
      rainSystemRef.current.visible = visibleLayers.rain && rainIntensity > 0;
    }
  }, [visibleLayers, waterTableHeight, bisRuRatio, saturation, factorOfSafety]);

  /* ------------------------------------------------------------------------ */
  /* REBUILD PARAMETRIC SLOPE WITH HIGH GEOMETRICAL FIDELITY & HIGHWAY TWIN     */
  /* ------------------------------------------------------------------------ */

  const rebuildParametricSlope = (masterGroup, angleDeg, currentFos, currentSat, currentCoh, currentHw) => {
    while (masterGroup.children.length > 0) {
      const obj = masterGroup.children[0];
      masterGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }

    interactiveObjectsRef.current = [];

    const widthZ = 16;
    const halfZ = widthZ / 2;
    const extrudeSettings = { depth: widthZ, bevelEnabled: false };

    const betaRad = (angleDeg * Math.PI) / 180;
    const toeX = 9.0;
    const toeY = 0.5;
    const crestY = 11.0;
    const slopeH = crestY - toeY; // 10.5m
    const slopeRun = slopeH / Math.tan(betaRad);
    const crestX = toeX - slopeRun;

    const slipCenter = new THREE.Vector2((crestX + toeX) / 2, crestY + 3.0);
    const slipRadius = Math.sqrt(Math.pow(toeX - slipCenter.x, 2) + Math.pow(toeY - slipCenter.y, 2)) + 0.5;

    slipCenterRef.current = {
      cx: slipCenter.x,
      cy: slipCenter.y,
      radius: slipRadius,
      crestX,
      toeX,
      crestY,
      toeY,
      betaRad
    };

    /* 1. BEDROCK FOUNDATION (Stationary Stable Strata with Procedural Texture) */
    const bedrockShape = new THREE.Shape();
    bedrockShape.moveTo(-24, -7);
    bedrockShape.lineTo(22, -7);
    bedrockShape.lineTo(22, -4);
    bedrockShape.lineTo(14, -3);
    bedrockShape.lineTo(toeX + 1.5, toeY - 2.8);
    bedrockShape.lineTo(crestX - 1.5, crestY - 2.8);
    bedrockShape.lineTo(-24, crestY - 2.8);
    bedrockShape.closePath();

    const bedrockGeo = new THREE.ExtrudeGeometry(bedrockShape, extrudeSettings);
    bedrockGeo.translate(0, 0, -halfZ);
    const bedrockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      map: createBedrockTexture(),
      roughness: 0.85,
      metalness: 0.12
    });
    const bedrockMesh = new THREE.Mesh(bedrockGeo, bedrockMat);
    bedrockMesh.receiveShadow = true;
    bedrockMesh.castShadow = true;
    bedrockMesh.visible = visibleLayers.bedrock;
    bedrockMesh.userData = {
      telemetry: {
        title: "Bedrock Foundation Strata",
        subtitle: "Intact Precambrian Gneiss / Quartzite",
        status: "STABLE",
        details: "Stationary geological basement. High shear strength resisting zone."
      }
    };
    bedrockMeshRef.current = bedrockMesh;
    masterGroup.add(bedrockMesh);
    interactiveObjectsRef.current.push(bedrockMesh);

    /* 2. BISHOP'S SLIP CIRCLE ARC & MOBILIZED SHEAR ARROWS */
    const startAngle = Math.atan2(crestY - slipCenter.y, crestX - slipCenter.x);
    const endAngle = Math.atan2(toeY - slipCenter.y, toeX - slipCenter.x);

    const arcPoints = [];
    const numArcSegments = 42;
    for (let i = 0; i <= numArcSegments; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / numArcSegments);
      const px = slipCenter.x + slipRadius * Math.cos(a);
      const py = slipCenter.y + slipRadius * Math.sin(a);
      arcPoints.push(new THREE.Vector3(px, py, halfZ + 0.08));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
    let arcCol = currentFos < 1.0 ? 0xef4444 : currentFos < 1.3 ? 0xf97316 : 0x10b981;
    const arcMat = new THREE.LineBasicMaterial({ color: arcCol, linewidth: 3 });
    const slipLine = new THREE.Line(arcGeo, arcMat);
    slipLine.visible = visibleLayers.slipCircle;
    slipCircleMeshRef.current = slipLine;
    masterGroup.add(slipLine);

    const arcPointsOther = arcPoints.map(p => new THREE.Vector3(p.x, p.y, -halfZ - 0.08));
    const arcGeoOther = new THREE.BufferGeometry().setFromPoints(arcPointsOther);
    const slipLineOther = new THREE.Line(arcGeoOther, arcMat);
    slipLineOther.visible = visibleLayers.slipCircle;
    slipCircleOtherMeshRef.current = slipLineOther;
    masterGroup.add(slipLineOther);

    // Animated shear stress directional arrows along the arc
    const slipArrowsGroup = new THREE.Group();
    const arrowCount = 6;
    for (let i = 1; i <= arrowCount; i++) {
      const frac = i / (arrowCount + 1);
      const a = startAngle + (endAngle - startAngle) * frac;
      const px = slipCenter.x + slipRadius * Math.cos(a);
      const py = slipCenter.y + slipRadius * Math.sin(a);

      // Tangent vector
      const tx = -Math.sin(a);
      const ty = Math.cos(a);
      const arrowGeo = new THREE.ConeGeometry(0.24, 0.75, 6);
      arrowGeo.rotateZ(Math.atan2(ty, tx) - Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({ 
        color: arcCol, 
        transparent: true, 
        opacity: 0.75 
      });
      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      arrowMesh.position.set(px, py, halfZ + 0.12);
      slipArrowsGroup.add(arrowMesh);
    }
    slipArrowsGroup.visible = visibleLayers.slipCircle;
    slipArrowsGroupRef.current = slipArrowsGroup;
    masterGroup.add(slipArrowsGroup);

    /* 3. BISHOP VERTICAL SLICES (Dynamically Stress-Colored Planes) */
    const slicesGroup = new THREE.Group();
    const sliceCount = 8;
    const sliceStartX = crestX + 0.5;
    const sliceEndX = toeX + 1.0;
    const sliceW = (sliceEndX - sliceStartX) / sliceCount;

    for (let i = 0; i < sliceCount; i++) {
      const sx = sliceStartX + i * sliceW + sliceW / 2;
      const t = (sx - crestX) / (toeX - crestX);
      const groundY = crestY - t * (crestY - toeY);
      const dx = sx - slipCenter.x;
      const radDiff = slipRadius * slipRadius - dx * dx;
      if (radDiff >= 0) {
        const circleBottomY = slipCenter.y - Math.sqrt(radDiff);
        const sliceH = Math.max(0.5, groundY - circleBottomY);

        const slicePlaneGeo = new THREE.PlaneGeometry(sliceW * 0.92, sliceH);
        const sliceColor = currentFos < 1.0 ? 0xef4444 : currentFos < 1.30 ? 0xf59e0b : (i % 2 === 0 ? 0x059669 : 0x0284c7);
        const slicePlaneMat = new THREE.MeshBasicMaterial({
          color: sliceColor,
          transparent: true,
          opacity: currentFos < 1.0 ? 0.35 : 0.22,
          side: THREE.DoubleSide
        });
        const sliceMesh = new THREE.Mesh(slicePlaneGeo, slicePlaneMat);
        sliceMesh.position.set(sx, circleBottomY + sliceH / 2, 0);
        slicesGroup.add(sliceMesh);
      }
    }
    slicesGroup.visible = visibleLayers.slices;
    slicesGroupRef.current = slicesGroup;
    masterGroup.add(slicesGroup);

    /* 4. THE SLIDING COLLUVIAL WEDGE (Mobile Mass) */
    const slidingGroup = new THREE.Group();
    slidingGroupRef.current = slidingGroup;
    masterGroup.add(slidingGroup);

    const soilShape = new THREE.Shape();
    soilShape.moveTo(crestX, crestY);
    soilShape.lineTo(crestX + (toeX - crestX) * 0.3, crestY - slopeH * 0.3);
    soilShape.lineTo(crestX + (toeX - crestX) * 0.7, crestY - slopeH * 0.7);
    soilShape.lineTo(toeX, toeY);
    soilShape.lineTo(toeX + 2.5, toeY - 0.2);
    soilShape.lineTo(toeX + 4.5, -3.0);

    for (let i = numArcSegments; i >= 0; i--) {
      const a = startAngle + (endAngle - startAngle) * (i / numArcSegments);
      const px = slipCenter.x + slipRadius * Math.cos(a);
      const py = slipCenter.y + slipRadius * Math.sin(a);
      soilShape.lineTo(px, py);
    }
    soilShape.closePath();

    const soilGeo = new THREE.ExtrudeGeometry(soilShape, extrudeSettings);
    soilGeo.translate(0, 0, -halfZ);

    const satNorm = Math.max(0, Math.min(1, (currentSat - 30) / (95 - 30)));
    const r = THREE.MathUtils.lerp(0x9a / 255, 0x3d / 255, satNorm);
    const g = THREE.MathUtils.lerp(0x58 / 255, 0x1a / 255, satNorm);
    const b = THREE.MathUtils.lerp(0x23 / 255, 0x04 / 255, satNorm);

    const soilMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(r, g, b),
      roughness: THREE.MathUtils.lerp(0.92, 0.42, satNorm),
      metalness: 0.05
    });
    const soilMesh = new THREE.Mesh(soilGeo, soilMat);
    soilMesh.castShadow = true;
    soilMesh.receiveShadow = true;
    soilMesh.visible = visibleLayers.soilWedge;
    soilMesh.userData = {
      telemetry: {
        title: "Colluvial Soil Wedge",
        subtitle: `Cohesion: ${currentCoh} kPa | Saturation: ${currentSat}%`,
        status: currentFos < 1.0 ? "FAILURE SLIP" : currentFos < 1.3 ? "CREEP DISTRESS" : "STABLE",
        details: `Mobilized driving shear stress: ${drivingStress} kPa against resisting strength: ${resistingStrength} kPa.`
      }
    };
    soilMeshRef.current = soilMesh;
    slidingGroup.add(soilMesh);
    interactiveObjectsRef.current.push(soilMesh);

    // Alpine Grassy Topsoil
    const grassShape = new THREE.Shape();
    grassShape.moveTo(crestX - 0.2, crestY + 0.12);
    grassShape.lineTo(toeX, toeY + 0.12);
    grassShape.lineTo(toeX, toeY - 0.18);
    grassShape.lineTo(crestX - 0.2, crestY - 0.18);
    grassShape.closePath();

    const grassGeo = new THREE.ExtrudeGeometry(grassShape, { depth: widthZ + 0.12, bevelEnabled: false });
    grassGeo.translate(0, 0, -halfZ - 0.06);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.75,
      metalness: 0.0
    });
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.castShadow = true;
    grassMesh.receiveShadow = true;
    grassMesh.visible = visibleLayers.soilWedge;
    grassMeshRef.current = grassMesh;
    slidingGroup.add(grassMesh);

    // Pine Trees on the Slope Face
    treesListRef.current = [];
    const treeCount = 8;
    const treeFoliageGeo = new THREE.ConeGeometry(0.95, 2.4, 7);
    const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const treeTrunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c2c16 });

    for (let i = 0; i < treeCount; i++) {
      const frac = 0.10 + (i / treeCount) * 0.78;
      const tx = crestX + frac * (toeX - crestX);
      const ty = crestY - frac * (crestY - toeY);
      const tz = -halfZ + 2.0 + (i * 2.3) % (widthZ - 4.2);

      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
      trunk.position.y = 0.6;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      const foliage = new THREE.Mesh(treeFoliageGeo, treeFoliageMat);
      foliage.position.y = 1.9;
      foliage.castShadow = true;
      treeGroup.add(foliage);

      treeGroup.position.set(tx, ty, tz);
      treeGroup.visible = visibleLayers.trees;
      treesListRef.current.push(treeGroup);
      slidingGroup.add(treeGroup);
    }

    /* 5. DYNAMIC ROCKFALL BOULDERS (Tumbling Avalanche & Talus Cone Physics) */
    bouldersListRef.current = [];
    const boulderCount = 32;
    const boulderGroup = new THREE.Group();

    for (let i = 0; i < boulderCount; i++) {
      const radius = 0.25 + Math.random() * 0.42;
      const rockGeo = new THREE.DodecahedronGeometry(radius, 1);
      const rockColor = Math.random() > 0.4 ? 0x57534e : 0x78716c;
      const rockMat = new THREE.MeshStandardMaterial({ color: rockColor, roughness: 0.92 });
      const rockMesh = new THREE.Mesh(rockGeo, rockMat);
      rockMesh.castShadow = true;
      rockMesh.receiveShadow = true;

      // Geological initial positioning nestled along the upper slope
      const frac = 0.15 + Math.random() * 0.75;
      const startX = crestX + frac * (toeX - crestX);
      const startY = crestY - frac * (crestY - toeY) + 0.2;
      const startZ = -halfZ + 1.5 + Math.random() * (widthZ - 3);

      // Final runout deposition target on Highway NH-31A
      const landX = toeX + 0.5 + Math.random() * 3.8;
      const landY = toeY + 0.15 + Math.random() * 0.45;
      const landZ = startZ + (Math.random() - 0.5) * 2.2;

      rockMesh.position.set(startX, startY, startZ);
      rockMesh.userData = {
        startX, startY, startZ,
        landX, landY, landZ,
        releaseThreshold: 0.06 + (i / boulderCount) * 0.65,
        rollSpeedX: (Math.random() - 0.5) * 14,
        rollSpeedZ: (Math.random() - 0.5) * 14
      };

      bouldersListRef.current.push(rockMesh);
      boulderGroup.add(rockMesh);
    }
    masterGroup.add(boulderGroup);

    /* 6. HIGHWAY NH-31A, GUARDRAIL & RETAINING BUTTRESS WALL */
    const roadGroup = new THREE.Group();
    roadGroupRef.current = roadGroup;

    // Asphalt Pavement
    const roadGeo = new THREE.BoxGeometry(4.8, 0.25, widthZ);
    const roadMat = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      map: createAsphaltRoadTexture(),
      roughness: 0.75 
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(toeX + 2.1, toeY - 0.08, 0);
    roadMesh.receiveShadow = true;
    roadMesh.userData = {
      telemetry: {
        title: "NH-31A Strategic Corridor",
        subtitle: "Two-Lane Mountain National Highway",
        status: currentFos < 1.0 ? "CRITICAL RISK (IMPACT ZONE)" : "CLEAR PASSABLE",
        details: "Lifeline transport corridor for Sikkim & Kalimpong. Subject to complete blockage during failure."
      }
    };
    roadGroup.add(roadMesh);
    interactiveObjectsRef.current.push(roadMesh);

    // Steel W-Beam Crash Guardrail along Outer Highway Shoulder
    const guardrailGroup = new THREE.Group();
    const beamGeo = new THREE.BoxGeometry(0.12, 0.35, widthZ * 0.98);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(toeX + 4.35, toeY + 0.6, 0);
    beamMesh.castShadow = true;
    guardrailGroup.add(beamMesh);

    // Guardrail Vertical Steel Posts
    for (let pz = -halfZ + 1.2; pz <= halfZ - 1.2; pz += 2.4) {
      const postGeo = new THREE.BoxGeometry(0.12, 0.9, 0.12);
      const postMesh = new THREE.Mesh(postGeo, beamMat);
      postMesh.position.set(toeX + 4.35, toeY + 0.3, pz);
      postMesh.castShadow = true;
      guardrailGroup.add(postMesh);
    }
    roadGroup.add(guardrailGroup);

    // Reinforced Concrete Retaining Wall
    const wallGeo = new THREE.BoxGeometry(0.72, 2.4, widthZ);
    const wallMat = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      map: createConcreteWallTexture(),
      roughness: 0.85 
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(toeX - 0.3, toeY + 0.8, 0);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wallMesh.userData = {
      telemetry: {
        title: "Toe Retaining Buttress Wall",
        subtitle: "Reinforced Concrete Cantilever Buttress (BIS IS 14458)",
        status: currentFos < 1.0 ? "BREACHED / OVERTOPPED" : "STRUCTURAL EQUILIBRIUM",
        details: "Mitigates toe erosion. Under severe hydrostatic pressure and surcharge thrust during downpours."
      }
    };
    retainingWallRef.current = wallMesh;
    roadGroup.add(wallMesh);
    interactiveObjectsRef.current.push(wallMesh);

    roadGroup.visible = visibleLayers.infrastructure;
    masterGroup.add(roadGroup);

    /* 7. INCLINOMETER BOREHOLE CASING & TELEMETRY BEACON */
    const boreholeGroup = new THREE.Group();
    const midX = (crestX + toeX) / 2;
    const midY = (crestY + toeY) / 2;

    const lowerCasingGeo = new THREE.CylinderGeometry(0.16, 0.16, 6.2, 12);
    const lowerCasingMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
    const lowerCasingMesh = new THREE.Mesh(lowerCasingGeo, lowerCasingMat);
    lowerCasingMesh.position.set(midX, midY - 4.5, 0);
    boreholeGroup.add(lowerCasingMesh);

    const upperCasingGroup = new THREE.Group();
    const upperCasingGeo = new THREE.CylinderGeometry(0.16, 0.16, 5.5, 12);
    const upperCasingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.25 });
    const upperCasingMesh = new THREE.Mesh(upperCasingGeo, upperCasingMat);
    upperCasingMesh.position.set(0, 0, 0);
    upperCasingGroup.add(upperCasingMesh);

    const headGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.6, 8);
    const headMat = new THREE.MeshStandardMaterial({ 
      color: currentFos < 1.0 ? 0xef4444 : currentFos < 1.3 ? 0xf59e0b : 0x10b981, 
      emissive: currentFos < 1.0 ? 0xb91c1c : currentFos < 1.3 ? 0xb45309 : 0x059669, 
      emissiveIntensity: 0.85 
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 3.1, 0);
    boreholeLedRef.current = headMesh;
    upperCasingGroup.add(headMesh);

    upperCasingGroup.position.set(midX, midY + 1.2, 0);
    boreholeUpperRef.current = upperCasingGroup;
    boreholeGroup.add(upperCasingGroup);

    boreholeGroup.visible = visibleLayers.borehole;
    boreholeGroup.userData = {
      telemetry: {
        title: "Digital Inclinometer Borehole (INCL-02)",
        subtitle: `Real-Time Shear Strain Sensor (Depth: 12.5m)`,
        status: currentFos < 1.0 ? "CRITICAL SHEAR DISPLACEMENT" : "NORMAL STABILITY",
        details: `Monitors lateral borehole deformation along the slip plane. Current Pore Pressure: ${porePressure} kPa.`
      }
    };
    boreholeGroupRef.current = boreholeGroup;
    masterGroup.add(boreholeGroup);
    interactiveObjectsRef.current.push(boreholeGroup);

    /* 8. PHREATIC WATER TABLE (Translucent Subterranean Fluid) */
    const waterShape = new THREE.Shape();
    waterShape.moveTo(crestX, crestY - 4.5);
    waterShape.lineTo(toeX + 2, toeY - 2.2);
    waterShape.lineTo(toeX + 2, toeY - 4.5);
    waterShape.lineTo(crestX, crestY - 7.5);
    waterShape.closePath();

    const waterGeo = new THREE.ExtrudeGeometry(waterShape, { depth: widthZ + 0.12, bevelEnabled: false });
    waterGeo.translate(0, 0, -halfZ - 0.06);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.45,
      roughness: 0.08,
      metalness: 0.25
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    const factor = Math.max(0.3, Math.min(2.5, currentHw / 1.35));
    waterMesh.scale.set(1, factor, 1);
    waterMesh.visible = visibleLayers.waterTable;
    waterMesh.userData = {
      telemetry: {
        title: "Phreatic Groundwater Table",
        subtitle: `Height: ${waterTableHeight}m | ru: ${bisRuRatio}`,
        status: bisRuRatio > 0.35 ? "CRITICAL HYDROSTATIC PRESSURE" : "MODERATE DAMP",
        details: "Subsurface pore-water pressure reduces effective normal stress, triggering shear failure."
      }
    };
    waterMeshRef.current = waterMesh;
    masterGroup.add(waterMesh);
    interactiveObjectsRef.current.push(waterMesh);

    /* 9. CROWN TENSION CRACK (Fissure with Emissive Glow) */
    const crackGeo = new THREE.BoxGeometry(0.52, 3.4, widthZ * 0.96);
    const crackMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 1.0,
      emissive: 0xef4444,
      emissiveIntensity: 0.7
    });
    const crackMesh = new THREE.Mesh(crackGeo, crackMat);
    crackMesh.position.set(crestX, crestY, 0);
    crackMesh.scale.set(0.001, 1, 1);
    crackMesh.visible = visibleLayers.tensionCrack && currentFos < 1.30;
    crackMesh.userData = {
      telemetry: {
        title: "Crown Tension Crack Extensometer",
        subtitle: "Upper Escarpment Tensile Rupture Zone",
        status: currentFos < 1.0 ? "CRITICAL DILATION" : "INITIAL EXTENSION",
        details: "Tensile separation at slope scarp allows rapid storm surface runoff infiltration, accelerating failure."
      }
    };
    crackMeshRef.current = crackMesh;
    masterGroup.add(crackMesh);
    interactiveObjectsRef.current.push(crackMesh);

    /* 10. TOE SEEPAGE SYSTEM */
    createSeepageSystem(masterGroup, toeX, toeY);
  };

  const createSeepageSystem = (group, toeX = 9.0, toeY = 0.5) => {
    const seepageGroup = new THREE.Group();
    seepageParticlesRef.current = [];

    for (let i = 0; i < 9; i++) {
      const seepGeo = new THREE.CylinderGeometry(0.12, 0.22, 1.4, 7);
      const seepMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.78,
        roughness: 0.1,
        metalness: 0.3
      });
      const seepMesh = new THREE.Mesh(seepGeo, seepMat);
      seepMesh.position.set(toeX - 0.45, toeY + 0.18, -6.8 + i * 1.7);
      seepMesh.rotation.z = Math.PI / 4;
      seepageGroup.add(seepMesh);
      seepageParticlesRef.current.push(seepMesh);
    }
    seepageGroup.visible = visibleLayers.seepage && (waterTableHeight > 1.35 || bisRuRatio > 0.20 || saturation > 68);
    seepageGroupRef.current = seepageGroup;
    group.add(seepageGroup);
  };

  const createRainSystem = (scene) => {
    const rainCount = 1800;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = -28 + Math.random() * 56;
      positions[i * 3 + 1] = -5 + Math.random() * 36;
      positions[i * 3 + 2] = -12 + Math.random() * 24;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.32,
      transparent: true,
      opacity: 0.75
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    rainSystemRef.current = rainPoints;
    scene.add(rainPoints);
  };

  const createDustSystem = (scene) => {
    const dustCount = 800;
    const dustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(dustCount * 3);
    dustDataRef.current = [];

    for (let i = 0; i < dustCount; i++) {
      positions[i * 3] = 7.5 + Math.random() * 5.5;
      positions[i * 3 + 1] = 0.2 + Math.random() * 3.5;
      positions[i * 3 + 2] = -7 + Math.random() * 14;

      dustDataRef.current.push({
        vx: (Math.random() - 0.25) * 4.2,
        vy: 1.2 + Math.random() * 3.8,
        vz: (Math.random() - 0.5) * 3.5,
        life: Math.random() * 1.5
      });
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0xb45309,
      size: 0.95,
      transparent: true,
      opacity: 0.65
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    dustPoints.visible = false;
    dustSystemRef.current = dustPoints;
    scene.add(dustPoints);
  };

  /* ------------------------------------------------------------------------ */
  /* DYNAMIC MULTI-STAGE LANDSLIDE DEFORMATION & ROCKFALL DYNAMICS            */
  /* ------------------------------------------------------------------------ */

  const applySlideDeformation = (progress) => {
    if (!slidingGroupRef.current) return;

    const { cx, cy, toeX, toeY } = slipCenterRef.current;
    const maxSlideAngle = 0.21;
    const currentAngle = progress * maxSlideAngle;

    // Mathematically exact rotational shear around the dynamic Bishop slip circle center
    slidingGroupRef.current.position.x = cx;
    slidingGroupRef.current.position.y = cy;
    slidingGroupRef.current.rotation.z = -currentAngle;
    slidingGroupRef.current.position.x += -cx * Math.cos(-currentAngle) + cy * Math.sin(-currentAngle);
    slidingGroupRef.current.position.y += -cx * Math.sin(-currentAngle) - cy * Math.cos(-currentAngle);

    slidingGroupRef.current.position.x += progress * 3.2;
    slidingGroupRef.current.position.y -= progress * 2.4;

    // Continuous inclinometer borehole shear deflection curve
    if (boreholeUpperRef.current) {
      boreholeUpperRef.current.rotation.z = -progress * 0.32;
      boreholeUpperRef.current.position.x = progress * 2.8;
      boreholeUpperRef.current.position.y = 1.2 - progress * 1.9;
    }

    if (boreholeLedRef.current) {
      if (progress > 0.05 || isThresholdBreached) {
        boreholeLedRef.current.material.color.setHex(0xef4444);
        boreholeLedRef.current.material.emissive.setHex(0xb91c1c);
      } else if (factorOfSafety < 1.30) {
        boreholeLedRef.current.material.color.setHex(0xf59e0b);
        boreholeLedRef.current.material.emissive.setHex(0xb45309);
      } else {
        boreholeLedRef.current.material.color.setHex(0x10b981);
        boreholeLedRef.current.material.emissive.setHex(0x059669);
      }
    }

    // Dynamic pine tree tilting & downslope translation
    if (treesListRef.current) {
      treesListRef.current.forEach((t, idx) => {
        t.rotation.z = -progress * (0.44 + idx * 0.06);
      });
    }

    // Dynamic rockfall boulders avalanche & talus deposition across highway
    if (bouldersListRef.current) {
      bouldersListRef.current.forEach((b) => {
        const u = b.userData;
        if (progress < u.releaseThreshold) {
          // Resting naturally on slope
          b.position.set(u.startX, u.startY, u.startZ);
          b.rotation.set(0, 0, 0);
        } else {
          // Boulders tumbling downslope along parabolic trajectory
          const t = Math.min(1.0, (progress - u.releaseThreshold) / (1.0 - u.releaseThreshold));
          const bounce = Math.abs(Math.sin(t * Math.PI * 3.5)) * Math.exp(-t * 2.2) * 1.8;

          b.position.x = THREE.MathUtils.lerp(u.startX, u.landX, t);
          b.position.y = THREE.MathUtils.lerp(u.startY, u.landY, t) + bounce;
          b.position.z = THREE.MathUtils.lerp(u.startZ, u.landZ, t);

          b.rotation.x = t * u.rollSpeedX;
          b.rotation.z = t * u.rollSpeedZ;
        }
      });
    }

    // Crown tension crack widening
    if (crackMeshRef.current) {
      const baseCrack = factorOfSafety < 1.0 ? 1.0 : (1.30 - Math.min(1.30, factorOfSafety)) * 1.5;
      const crackWidth = Math.max(0.001, baseCrack + progress * 4.9);
      crackMeshRef.current.scale.set(crackWidth, 1, 1);
    }

    // Retaining wall structural tilting & progressive breach
    if (retainingWallRef.current) {
      retainingWallRef.current.rotation.z = -progress * 0.38;
      retainingWallRef.current.position.x = toeX - 0.3 + progress * 0.85;
      retainingWallRef.current.position.y = toeY + 0.8 - progress * 0.25;
    }

    // Dust billow activation
    if (dustSystemRef.current) {
      dustSystemRef.current.visible = progress > 0.04 && progress < 0.98;
    }
  };

  /* ------------------------------------------------------------------------ */
  /* INTERACTIVE CONTROLS HANDLERS                                             */
  /* ------------------------------------------------------------------------ */

  const handleTogglePlay = () => {
    if (slideProgress >= 1.0) {
      setSlideProgress(0);
      slideProgressRef.current = 0;
      setIsPlayingSlide(true);
      playRumbleSound();
    } else {
      const nextPlay = !isPlayingSlide;
      setIsPlayingSlide(nextPlay);
      if (nextPlay) playRumbleSound();
    }
  };

  const handleResetSlope = () => {
    setIsPlayingSlide(false);
    setSlideProgress(0);
    slideProgressRef.current = 0;
    applySlideDeformation(0);
  };

  const handleScrubSlide = (e) => {
    const val = parseFloat(e.target.value);
    setSlideProgress(val);
    slideProgressRef.current = val;
    setIsPlayingSlide(false);
    applySlideDeformation(val);
  };

  return (
    <div className="relative w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl flex flex-col select-none">
      
      {/* 3D Top Status Bar */}
      <div className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl border transition-colors ${
            isThresholdBreached 
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse' 
              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
          }`}>
            <Mountain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Daylight 3D Mountain Slope &bull; Parametric Incline & Dynamic Slip
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 flex items-center space-x-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>{fps} FPS Smooth Physics</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {isThresholdBreached 
                ? '⚠️ THRESHOLD BREACHED: Rotational shear slip actively displaces colluvium & blocks highway' 
                : '🌿 INTACT & STABLE: Slope in pristine equilibrium &bull; Zero crack deformation'}
            </p>
          </div>
        </div>

        {/* Real-Time Threshold Status Pill */}
        <div className="flex items-center space-x-3 bg-slate-950/90 border border-slate-700 rounded-xl px-3 py-1.5 shadow-md">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isThresholdBreached || isPlayingSlide ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
            <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
              {slideProgress >= 1.0 ? 'FAILED & COLLAPSED' : isPlayingSlide ? 'ACTIVE SLIDE IN PROGRESS...' : isThresholdBreached ? 'THRESHOLD BREACHED (FAILURE)' : 'PRISTINE / SAFE EQUILIBRIUM'}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-xs font-mono font-bold text-cyan-400">
            Displacement: {(slideProgress * 4.9).toFixed(2)} m
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div className="relative w-full h-[490px] md:h-[560px] cursor-grab active:cursor-grabbing">
        <div ref={mountRef} className="w-full h-full" />

        {/* Overlay: Failure vs Safe Banner */}
        {isThresholdBreached ? (
          <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-rose-600/95 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xl border border-rose-300 backdrop-blur animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            <span>CRITICAL THRESHOLD BREACH (FoS &lt; 1.0) &bull; ROTATIONAL SHEAR SLIP ACTIVE</span>
          </div>
        ) : (
          <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-emerald-700/90 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-lg border border-emerald-400 backdrop-blur">
            <CheckCircle2 className="w-4 h-4" />
            <span>PRISTINE INTACT SLOPE &bull; BIS IS 14458 CODE COMPLIANT (FoS &ge; 1.30)</span>
          </div>
        )}

        {/* Floating Interactive 3D Raycasting Telemetry Tooltip */}
        {tooltip && (
          <div 
            className="absolute z-30 pointer-events-none bg-slate-950/95 border border-cyan-500/80 rounded-xl p-3 shadow-2xl backdrop-blur-md max-w-xs transition-transform duration-75 text-xs text-white space-y-1.5"
            style={{ transform: `translate3d(${tooltip.screenX}px, ${tooltip.screenY}px, 0)` }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="font-bold text-cyan-400 flex items-center space-x-1">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span>{tooltip.title}</span>
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                tooltip.status.includes('FAIL') || tooltip.status.includes('CRITICAL') || tooltip.status.includes('BREACH')
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {tooltip.status}
              </span>
            </div>
            <div className="text-[11px] text-amber-300 font-mono font-medium">{tooltip.subtitle}</div>
            <p className="text-[10px] text-slate-300 leading-tight">{tooltip.details}</p>
          </div>
        )}

        {/* Floating Camera View, Audio, Turntable & Lighting Controls */}
        <div className="absolute top-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-1.5 shadow-xl flex items-center space-x-1 text-xs">
          
          {/* Turntable Auto-Orbit Button */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] font-medium flex items-center space-x-1 ${
              autoRotate ? 'bg-cyan-600 text-white shadow' : 'text-slate-300 hover:text-white bg-slate-800'
            }`}
            title="Toggle Smooth 360° Cinematic Turntable Orbit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Auto-Orbit</span>
          </button>

          {/* Lighting Mode */}
          <button
            onClick={() => setLightingPreset(lightingPreset === 'daylight' ? 'storm' : 'daylight')}
            className="px-2.5 py-1 rounded-lg transition text-[11px] font-medium flex items-center space-x-1 text-amber-300 bg-slate-800 hover:bg-slate-700"
            title="Toggle Daylight / Overcast Storm Lighting"
          >
            {lightingPreset === 'daylight' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Cloud className="w-3.5 h-3.5 text-slate-300" />}
            <span className="hidden sm:inline">{lightingPreset === 'daylight' ? 'Daylight' : 'Storm'}</span>
          </button>
          
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg transition ${soundEnabled ? 'text-cyan-400 bg-slate-800' : 'text-slate-500 bg-slate-800/50'}`}
            title="Toggle Mountain Landslide Rumble Soundscape"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Smooth Camera Preset Buttons */}
          <button
            onClick={() => applyCameraPreset('iso')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] font-medium ${cameraPreset === 'iso' ? 'bg-cyan-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
          >
            3D Iso
          </button>
          <button
            onClick={() => applyCameraPreset('section')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] font-medium ${cameraPreset === 'section' ? 'bg-cyan-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
          >
            Section
          </button>
          <button
            onClick={() => applyCameraPreset('scarp')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] font-medium ${cameraPreset === 'scarp' ? 'bg-cyan-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
          >
            Crown
          </button>
          <button
            onClick={() => applyCameraPreset('toe')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] font-medium ${cameraPreset === 'toe' ? 'bg-cyan-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
          >
            Toe
          </button>
        </div>

        {/* Floating GSI & BIS Geotechnical Compliance Card */}
        <div className="absolute bottom-4 left-4 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-2xl max-w-xs space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-slate-200 font-semibold">
            <span className="flex items-center space-x-1.5 text-cyan-400">
              <Gauge className="w-4 h-4" />
              <span>GSI / BIS Real-Time Diagnostics</span>
            </span>
            <span className="font-mono text-xs text-amber-400">Hazard: {compositeHazardPct}%</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">GSI Slope Hazard</span>
              <span className={`font-mono font-bold ${gsiSlopeStatus === 'CRITICAL' ? 'text-rose-400' : gsiSlopeStatus === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {slopeAngle}° ({gsiSlopeStatus})
              </span>
            </div>
            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">GSI Rainfall Trigger</span>
              <span className={`font-mono font-bold ${gsiRainStatus === 'CRITICAL' ? 'text-rose-400' : gsiRainStatus === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {gsiRainStatus}
              </span>
            </div>
            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">BIS Pore Pressure (ru)</span>
              <span className={`font-mono font-bold ${bisPoreLevel === 'CRITICAL' ? 'text-rose-400' : bisPoreLevel === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {bisRuRatio} ({bisPoreLevel})
              </span>
            </div>
            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">BIS Factor of Safety</span>
              <span className={`font-mono font-bold ${factorOfSafety < 1.0 ? 'text-rose-400' : factorOfSafety < 1.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {factorOfSafety.toFixed(2)} ({bisCodeStatus})
              </span>
            </div>
          </div>
        </div>

        {/* Floating 3D Layer Toggles (All 11 functional) */}
        <div className="absolute bottom-4 right-4 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-2.5 shadow-2xl text-xs space-y-1.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider block">
              Daylight Model Layers
            </span>
            <span className="text-[9px] text-cyan-400 font-mono">Hover to Inspect</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={visibleLayers.soilWedge}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, soilWedge: e.target.checked })}
                className="rounded text-amber-500 bg-slate-800 border-slate-700"
              />
              <span>Colluvium Wedge</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={visibleLayers.slipCircle}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, slipCircle: e.target.checked })}
                className="rounded text-rose-500 bg-slate-800 border-slate-700"
              />
              <span>Bishop Slip Arc</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={visibleLayers.tensionCrack}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, tensionCrack: e.target.checked })}
                className="rounded text-rose-500 bg-slate-800 border-slate-700"
              />
              <span>Tension Crack</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={visibleLayers.waterTable}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, waterTable: e.target.checked })}
                className="rounded text-cyan-500 bg-slate-800 border-slate-700"
              />
              <span>Phreatic Water</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={visibleLayers.borehole}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, borehole: e.target.checked })}
                className="rounded text-sky-500 bg-slate-800 border-slate-700"
              />
              <span>Inclinometer</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={visibleLayers.rain}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, rain: e.target.checked })}
                className="rounded text-blue-500 bg-slate-800 border-slate-700"
              />
              <span>Rainfall</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={visibleLayers.trees}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, trees: e.target.checked })}
                className="rounded text-emerald-500 bg-slate-800 border-slate-700"
              />
              <span>Pine Forest</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={visibleLayers.infrastructure}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, infrastructure: e.target.checked })}
                className="rounded text-indigo-500 bg-slate-800 border-slate-700"
              />
              <span>NH-31A Highway</span>
            </label>
          </div>
        </div>
      </div>

      {/* Interactive Landslide Physics Sliding Controls Bar */}
      <div className="bg-slate-900/95 border-t border-slate-800 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          {/* Main Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleTogglePlay}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-lg ${
                isPlayingSlide 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {isPlayingSlide ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlayingSlide ? 'Pause Slide' : slideProgress >= 1.0 ? 'Replay Landslide' : 'Trigger Landslide Slip'}</span>
            </button>

            <button
              onClick={handleResetSlope}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Good State</span>
            </button>

            {/* Auto-Slide on Failure Toggle */}
            <label className="flex items-center space-x-2 text-xs text-slate-300 ml-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSlideOnFailure}
                onChange={(e) => setAutoSlideOnFailure(e.target.checked)}
                className="rounded text-rose-500 bg-slate-800 border-slate-700"
              />
              <span>Auto-slide on Threshold Breach</span>
            </label>
          </div>

          {/* BIS Code Formula Callout */}
          <div className="hidden lg:flex items-center space-x-2 text-[11px] font-mono text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-cyan-400 font-semibold">BIS IS 14458 FoS:</span>
            <span>[c' + (&gamma;&middot;z&middot;cos&sup2;&beta; - u)tan&phi;'] / [&gamma;&middot;z&middot;sin&beta;&middot;cos&beta;]</span>
          </div>
        </div>

        {/* Slow-Motion Deformation Scrubber */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-slate-300">
            <span className="font-medium">Geotechnical Shear Strain & Scarp Displacement:</span>
            <span className="font-mono text-cyan-400 font-bold">
              {Math.round(slideProgress * 100)}% Shear Strain &bull; {(slideProgress * 4.9).toFixed(2)} m Runout
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={slideProgress}
            onChange={handleScrubSlide}
            className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer h-2"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span className="text-emerald-400">0% (Pristine Intact Mountain)</span>
            <span className="text-amber-400">25% (Tension Cracks Opening)</span>
            <span className="text-orange-400">60% (Shear Plane Rupture & Wall Breach)</span>
            <span className="text-rose-400">100% (Complete Highway Burial & Debris Mound)</span>
          </div>
        </div>

      </div>

    </div>
  );
}
