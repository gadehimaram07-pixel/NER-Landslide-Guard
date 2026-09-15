import React, { useEffect, useRef, useState } from 'react';
import { 
  Layers, AlertTriangle, Shield, Radio, Activity, Compass, 
  MapPin, Eye, ArrowRight, CloudRain, Zap, RefreshCw, CheckCircle2,
  BellRing, Volume2, VolumeX, Edit3, Sliders, Megaphone, RotateCcw,
  Cpu, Brain, ShieldCheck, Sparkles
} from 'lucide-react';
import L from 'leaflet';

export default function GisMapDashboard({ 
  zonesData, 
  sensorsData, 
  roadsData, 
  weatherData, 
  insarData,
  uninstrumentedDetections,
  onTriggerSatelliteDetection,
  onSelectZone,
  onOpenShap,
  onSimulateRain,
  onOpenReroute,
  onAlertBroadcast
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const currentTileLayerRef = useRef(null);

  // Set OpenStreetMap as the primary default basemap
  const [basemap, setBasemap] = useState('streets'); // 'streets' (OpenStreetMap) | 'satellite' | 'topo' | 'dark'
  const [activeLayers, setActiveLayers] = useState({
    zones: true,
    sensors: true,
    roads: true,
    shelters: true,
    insar: true,
    uninstrumented: true
  });

  const [activeSatelliteDiscovery, setActiveSatelliteDiscovery] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState('dzongu');
  const [isScanningSatellite, setIsScanningSatellite] = useState(false);

  const [selectedZone, setSelectedZone] = useState(null);
  const [activeTab, setActiveTab] = useState('zones'); // 'zones' | 'roads' | 'sensors'

  // What-If Scenario Controls State (Rainfall Intensity, Storm Duration, Slope Inclination Angle, Antecedent Saturation, Soil Cohesion)
  const [rainIntensity, setRainIntensity] = useState(10.0);
  const [durationHours, setDurationHours] = useState(6.0);
  const [slopeAngle, setSlopeAngle] = useState(34.0);
  const [saturation, setSaturation] = useState(72.0);
  const [cohesion, setCohesion] = useState(12.0);

  const [isAlertDispatched, setIsAlertDispatched] = useState(false);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [autoSirenEnabled, setAutoSirenEnabled] = useState(true);
  const [sirenMode, setSirenMode] = useState('wail'); // 'wail' (municipal siren) | 'klaxon' (two-tone alert)
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const audioCtxRef = useRef(null);
  const activeSirenNodesRef = useRef(null);
  const prevFosRef = useRef(1.5);

  // Sync with selected zone LIVE conditions (not hypothetical defaults).
  // Sliders snap to the zone's live slope + live 24h rainfall from weather_logs,
  // so the Physics/ML/Hybrid cards evaluate reality. Any manual slider edit
  // switches the panel into WHAT-IF mode (badged) until reset.
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const snappedZoneRef = useRef(null);
  const weatherLen = Array.isArray(weatherData) ? weatherData.length : 0;
  useEffect(() => {
    if (!selectedZone) return;
    // Snap once per zone selection (defer until live weather has loaded so we
    // don't lock in the 10mm/h fallback); never clobber manual what-if edits.
    if (snappedZoneRef.current === selectedZone.id) return;
    if (weatherLen === 0) return;
    const liveSlope = selectedZone.slope_angle_deg || 34.0;
    const liveWeather = weatherData?.find(w => w.zone_id === selectedZone.id) || null;
    const liveR24 = liveWeather ? Number(liveWeather.rainfall_24h_mm) : null;
    const liveR72 = liveWeather ? Number(liveWeather.rainfall_72h_mm) : null;
    // Map 24h accumulation onto the intensity x duration convention (default 6h window)
    const liveDuration = 6.0;
    const liveIntensity = liveR24 != null ? Math.round((liveR24 / liveDuration) * 10) / 10 : 10.0;
    const snap = {
      slopeAngle: liveSlope,
      rainIntensity: liveIntensity,
      durationHours: liveDuration,
      saturation: 72.0,
      cohesion: 12.0,
      liveRain24: liveR24,
      liveRain72: liveR72,
      hasLiveRain: liveR24 != null,
      weatherTimestamp: liveWeather?.timestamp || null
    };
    setSlopeAngle(snap.slopeAngle);
    setRainIntensity(snap.rainIntensity);
    setDurationHours(snap.durationHours);
    setSaturation(snap.saturation);
    setCohesion(snap.cohesion);
    setLiveSnapshot(snap);
    snappedZoneRef.current = selectedZone.id;
    setIsAlertDispatched(false);
    setDispatchStatus(null);
  }, [selectedZone?.id, weatherLen]);

  // Dual-Pipeline & Hybrid Risk Synchronization with Backend ML Engine
  const [hybridResult, setHybridResult] = useState(null);
  const [isHybridLoading, setIsHybridLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchHybridRisk = async () => {
      if (!selectedZone) return;
      setIsHybridLoading(true);
      try {
        const totalRain24h = Math.round(rainIntensity * Math.min(24, durationHours));
        const totalRain72h = Math.round(totalRain24h * 1.6);
        const totalRainSurroundMax = Math.round(totalRain24h * 1.3);
        const res = await fetch('/api/hybrid-risk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zone_id: selectedZone.id,
            features: {
              slope_deg: slopeAngle,
              rainfall_24h_mm: totalRain24h,
              rainfall_72h_mm: totalRain72h,
              rainfall_surround_max_mm: totalRainSurroundMax,
              cohesion_kpa: cohesion,
              saturation_pct: saturation,
              elevation_m: selectedZone.elevation_m || 1840.0
            },
            alpha: 0.50
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setHybridResult(data);
          }
        }
      } catch (err) {
        console.error('Failed to sync hybrid risk with backend ML engine:', err);
      } finally {
        if (!isCancelled) setIsHybridLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchHybridRisk, 250);
    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [selectedZone?.id, slopeAngle, rainIntensity, durationHours, saturation, cohesion]);

  // Stop current active siren audio cleanly
  const stopSiren = () => {
    if (activeSirenNodesRef.current) {
      try {
        const { gain, osc1, osc2, lfo } = activeSirenNodesRef.current;
        const now = gain.context.currentTime;
        gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
        setTimeout(() => {
          try {
            osc1.stop();
            if (osc2) osc2.stop();
            if (lfo) lfo.stop();
          } catch (e) {}
        }, 300);
      } catch (err) {
        console.error('Error stopping siren:', err);
      }
      activeSirenNodesRef.current = null;
    }
    setIsSirenPlaying(false);
  };

  // Start realistic multi-tone disaster early warning siren
  const startSiren = (mode = sirenMode) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (activeSirenNodesRef.current) {
        stopSiren();
      }

      setIsSirenPlaying(true);
      const now = ctx.currentTime;

      // Master Gain Node with gentle fade in
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.linearRampToValueAtTime(0.16, now + 0.2);
      masterGain.connect(ctx.destination);

      // Primary Oscillator (Main Siren Tone)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';

      // Secondary Oscillator (Acoustic harmonics)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';

      // LFO for Authentic Undulating Pitch Sweep
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';

      if (mode === 'wail') {
        // Undulating Municipal Disaster Early Warning Siren (500Hz - 940Hz sweep)
        osc1.frequency.setValueAtTime(720, now);
        osc2.frequency.setValueAtTime(725, now);

        lfo.frequency.setValueAtTime(0.7, now); // ~1.4s sweep cycle
        lfoGain.gain.setValueAtTime(220, now); // +/- 220Hz deviation

        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);
      } else {
        // High Hazard Alert Klaxon (alternating horn 580Hz <-> 840Hz)
        osc1.frequency.setValueAtTime(680, now);
        osc2.frequency.setValueAtTime(680, now);

        lfo.frequency.setValueAtTime(1.8, now);
        lfoGain.gain.setValueAtTime(160, now);

        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
      }

      osc1.connect(masterGain);
      osc2.connect(masterGain);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      activeSirenNodesRef.current = { gain: masterGain, osc1, osc2, lfo };

      // Auto-stop after 8 seconds if not silenced manually
      setTimeout(() => {
        if (activeSirenNodesRef.current?.osc1 === osc1) {
          stopSiren();
        }
      }, 8000);
    } catch (err) {
      console.error('Audio siren error:', err);
      setIsSirenPlaying(false);
    }
  };

  const toggleSiren = () => {
    if (isSirenPlaying) {
      stopSiren();
    } else {
      startSiren(sirenMode);
    }
  };

  // Dynamic Geotechnical Limit Equilibrium Physics Engine
  const calculateGeotechnicalRisk = (slopeDeg, rainMmH, durationH, satPct, cohesionKpa) => {
    const betaRad = (slopeDeg * Math.PI) / 180;
    const phiRad = (30.0 * Math.PI) / 180; // 30° soil internal friction angle
    const failureDepthM = 2.5;
    const soilUnitWeight = 19.5;
    const waterUnitWeight = 9.81;

    // MIRRORED FROM backend/ml/hybrid_risk.py::compute_physics_baseline (BIS IS 14458).
    // Keep this in lock-step with the backend: same 24h/72h accumulation convention,
    // same 1.5 seepage factor, same 0.65*FoS + 0.35*rain*slopeGate fusion and 0.35/0.55/0.75 bands.
    // rainMmH (mm/h slider) x durationH (h slider) -> 24h accumulation, capped at 24h,
    // with 72h antecedent proxy identical to the POST body below (x1.6).
    const rain24Mm = rainMmH * Math.min(24, durationH);
    const rain72Mm = rain24Mm * 1.6;
    const totalRainMm = rain24Mm + rain72Mm * 0.3;
    const waterTableRiseM = Math.min(
      failureDepthM,
      (satPct / 100.0) * failureDepthM + (totalRainMm / 1000.0) * 1.5
    );

    const uKpa = waterUnitWeight * waterTableRiseM * Math.pow(Math.cos(betaRad), 2);
    const totalNormalStress = soilUnitWeight * failureDepthM * Math.pow(Math.cos(betaRad), 2);
    const effectiveNormalStress = Math.max(0.0, totalNormalStress - uKpa);

    const resistingForce = cohesionKpa + effectiveNormalStress * Math.tan(phiRad);
    const drivingForce = soilUnitWeight * failureDepthM * Math.sin(betaRad) * Math.cos(betaRad);

    const fos = Math.max(0.01, resistingForce / Math.max(drivingForce, 0.001));
    const roundedFos = Number(fos.toFixed(2));

    let fosScore;
    if (fos < 1.0) {
      fosScore = Math.min(0.98, 0.75 + (1.0 - Math.min(fos, 1.0)) * 0.30);
    } else if (fos < 1.25) {
      fosScore = 0.55 + (1.25 - fos) / 0.25 * 0.20;
    } else if (fos < 1.50) {
      fosScore = 0.35 + (1.50 - fos) / 0.25 * 0.20;
    } else {
      fosScore = Math.max(0.05, 0.35 - (fos - 1.50) / 1.50 * 0.30);
    }
    const rainScore = Math.min(1.0, (rain24Mm / 120.0) * 0.6 + (rain72Mm / 250.0) * 0.4);
    // Slope gate (mirrors backend): rain alone cannot slide flat ground.
    const slopeGate = Math.min(1.0, Math.max(0.20, (slopeDeg - 8.0) / 22.0));
    const fusedScore = Number((0.65 * fosScore + 0.35 * rainScore * slopeGate).toFixed(4));

    let level, color, isHighRisk;
    if (fusedScore >= 0.75) {
      level = 'Critical';
      color = '#ef4444';
      isHighRisk = true;
    } else if (fusedScore >= 0.55) {
      level = 'High';
      color = '#f97316';
      isHighRisk = true;
    } else if (fusedScore >= 0.35) {
      level = 'Moderate';
      color = '#eab308';
      isHighRisk = false;
    } else {
      level = 'Low';
      color = '#22c55e';
      isHighRisk = false;
    }
    const riskScorePct = Math.round(fusedScore * 100);

    return {
      fos: roundedFos,
      level,
      color,
      isHighRisk,
      score: fusedScore,
      riskScorePct,
      poreWaterPressure: Number(uKpa.toFixed(1)),
      waterTableRise: Number(waterTableRiseM.toFixed(1)),
      totalRainfall: Number((rainMmH * durationH).toFixed(1)),
      rain24Mm: Number(rain24Mm.toFixed(1)),
      rain72Mm: Number(rain72Mm.toFixed(1)),
      drivingForce: Number(drivingForce.toFixed(1)),
      resistingForce: Number(resistingForce.toFixed(1))
    };
  };

  const estimatedRisk = calculateGeotechnicalRisk(slopeAngle, rainIntensity, durationHours, saturation, cohesion);

  // LIVE vs WHAT-IF: sliders match the live snapshot until the user edits one.
  // Alerts/sirens firing in WHAT-IF mode are scenario exploration, not live risk.
  const isWhatIf = liveSnapshot ? (
    slopeAngle !== liveSnapshot.slopeAngle ||
    rainIntensity !== liveSnapshot.rainIntensity ||
    durationHours !== liveSnapshot.durationHours ||
    saturation !== liveSnapshot.saturation ||
    cohesion !== liveSnapshot.cohesion
  ) : false;

  // Trigger Audio Siren automatically when threshold values are exceeded
  useEffect(() => {
    // Check if threshold values are exceeded: FoS < 1.25 (High Risk) or FoS < 1.0 (Critical)
    if (autoSirenEnabled && estimatedRisk.isHighRisk) {
      if (prevFosRef.current >= 1.25 || (estimatedRisk.fos < 1.0 && prevFosRef.current >= 1.0)) {
        startSiren(estimatedRisk.fos < 1.0 ? 'wail' : 'klaxon');
      }
    } else if (!estimatedRisk.isHighRisk && isSirenPlaying) {
      stopSiren();
    }
    prevFosRef.current = estimatedRisk.fos;
  }, [estimatedRisk.fos, estimatedRisk.isHighRisk, autoSirenEnabled]);

  // Clean up audio nodes on unmount
  useEffect(() => {
    return () => {
      stopSiren();
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  // Broadcast Emergency Alert to Backend
  const handleDispatchNotification = async () => {
    if (!selectedZone) return;
    try {
      setDispatchStatus('dispatching');
      // Prefer the fused hybrid advisory (conservative envelope over ML+physics)
      // over the raw slider-only estimate when the backend evaluation is ready.
      const advisoryLevel = hybridResult?.hybrid_risk?.advisory_level || estimatedRisk.level;
      const scenarioTag = isWhatIf ? 'What-If Scenario' : 'Live Conditions';
      const res = await fetch('/api/alerts/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: selectedZone.id,
          severity: advisoryLevel.toUpperCase(),
          headline: `NDMA SACHET EMERGENCY ALERT: ${advisoryLevel.toUpperCase()} Landslide Risk at ${selectedZone.name}`,
          description: `${scenarioTag} evaluated: Slope=${slopeAngle}°, Rainfall=${rainIntensity}mm/h, Storm Duration=${durationHours}h, Antecedent Saturation=${saturation}%, Soil Cohesion=${cohesion}kPa. Factor of Safety=${estimatedRisk.fos} (${estimatedRisk.riskScorePct}% Failure Risk).` +
            (liveSnapshot?.hasLiveRain ? ` Live station rain: ${liveSnapshot.liveRain24}mm/24h, ${liveSnapshot.liveRain72}mm/72h.` : '') +
            (hybridResult?.hybrid_risk ? ` Hybrid ${Math.round(hybridResult.hybrid_risk.score * 100)}% (${hybridResult.hybrid_risk.model_agreement}, ${hybridResult.hybrid_risk.governing_model}-governed).` : ''),
          suggested_action: `Restrict traffic along NH-10 corridor, initiate immediate preventive evacuations in vulnerable settlements, and arm community sirens.`,
          channels: ['CELL_BROADCAST', 'CAP_RSS', 'SMS_GATEWAY', 'SIREN_GRID'],
          languages: ['English', 'Hindi', 'Nepali'],
          authorized_by: 'District Magistrate / DEOC Commander'
        })
      });

      if (res.ok) {
        setIsAlertDispatched(true);
        setDispatchStatus('sent');
        playEmergencySiren();
        if (onAlertBroadcast) onAlertBroadcast();
      } else {
        setDispatchStatus('error');
      }
    } catch (err) {
      console.error('Alert broadcast error:', err);
      setDispatchStatus('error');
    }
  };

  // NER Geographic Bounds (Sikkim, Assam, Meghalaya, Nagaland, Manipur, Mizoram, Tripura, Arunachal)
  const resetToNerBounds = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds([
        [22.5, 88.0], // South-West corner (Tripura/Mizoram/Sikkim corridor)
        [28.5, 96.5]  // North-East corner (Arunachal Pradesh border)
      ]);
    }
  };

  // Initialize Map with proper lifecycle cleanup and resize handling
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any stale map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Centered on the North Eastern Region of India (Assam / Meghalaya / Nagaland / Manipur / Sikkim)
    const map = L.map(mapContainerRef.current, {
      center: [25.8, 93.0],
      zoom: 7,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: false
    });

    // Zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Force map to recalculate container dimensions once rendered
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 400);

    // Watch for window or container resize
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Manage Dynamic Basemap Layer (Watermark-free)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    let tileLayer;
    if (basemap === 'satellite') {
      tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri World Imagery &mdash; ISRO/USGS',
        maxZoom: 18
      });
    } else if (basemap === 'dark') {
      tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &mdash; OpenStreetMap',
        maxZoom: 19
      });
    } else if (basemap === 'topo') {
      tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap, SRTM Elevation',
        maxZoom: 17
      });
    } else {
      // Default high-reliability OpenStreetMap / CARTO Voyager hybrid
      tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      });
    }

    tileLayer.addTo(map);
    currentTileLayerRef.current = tileLayer;
    map.invalidateSize();
  }, [basemap]);

  // Update Map Layers whenever data or layer toggles change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Render Monitored Zones
    if (activeLayers.zones && zonesData?.features) {
      zonesData.features.forEach((feature) => {
        const props = feature.properties;
        const [lng, lat] = feature.geometry.coordinates;

        const isCritical = props.current_risk_level === 'Critical';
        const color = isCritical ? '#ef4444' : props.current_risk_level === 'High' ? '#f97316' : props.current_risk_level === 'Moderate' ? '#eab308' : '#22c55e';

        // Outer pulsing ring for critical/high
        if (isCritical || props.current_risk_level === 'High') {
          const pulseCircle = L.circleMarker([lat, lng], {
            radius: isCritical ? 24 : 18,
            color: color,
            fillColor: color,
            fillOpacity: 0.15,
            weight: 1,
            className: isCritical ? 'pulse-radar' : ''
          });
          group.addLayer(pulseCircle);
        }

        const circle = L.circleMarker([lat, lng], {
          radius: isCritical ? 12 : 9,
          color: '#ffffff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.9
        });

        circle.bindTooltip(`
          <div class="text-xs font-sans">
            <strong class="text-white">${props.name}</strong><br/>
            <span class="text-slate-300">${props.district}, ${props.state}</span><br/>
            <span class="font-bold" style="color: ${color}">Risk: ${props.current_risk_level} (${Math.round(props.current_risk_score * 100)}%)</span>
          </div>
        `, { direction: 'top', offset: [0, -8] });

        circle.on('click', () => {
          setSelectedZone(props);
          if (onSelectZone) onSelectZone(props);
        });

        group.addLayer(circle);
      });
    }

    // 2. Render Road Network Segments
    if (activeLayers.roads && roadsData) {
      roadsData.forEach((road) => {
        const isBlocked = road.status === 'Blocked';
        const isCaution = road.status === 'Caution';
        const roadColor = isBlocked ? '#ef4444' : isCaution ? '#f59e0b' : '#10b981';

        const polyline = L.polyline(road.coordinates, {
          color: roadColor,
          weight: isBlocked ? 5 : 3.5,
          opacity: 0.85,
          dashArray: isBlocked ? '8, 8' : undefined
        });

        polyline.bindTooltip(`
          <div class="text-xs">
            <strong>${road.highway_no} (${road.name})</strong><br/>
            <span>Status: <strong style="color: ${roadColor}">${road.status}</strong></span><br/>
            ${road.blockage_reason ? `<span class="text-rose-300">${road.blockage_reason}</span>` : ''}
          </div>
        `);

        polyline.on('click', () => {
          if (onOpenReroute) onOpenReroute(road);
        });

        group.addLayer(polyline);
      });
    }

    // 3. Render IoT Sensor Nodes
    if (activeLayers.sensors && sensorsData) {
      sensorsData.forEach((sensor) => {
        const isTriggered = sensor.edge_alarm_state === 'TRIGGERED';
        const sensorColor = isTriggered ? '#ef4444' : sensor.edge_alarm_state === 'WARNING' ? '#f97316' : '#38bdf8';

        const iconHtml = `
          <div style="background-color: ${sensorColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${sensorColor}; display: flex; align-items: center; justify-content: center;">
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-sensor-icon',
          html: iconHtml,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker([sensor.latitude, sensor.longitude], { icon: customIcon });

        marker.bindTooltip(`
          <div class="text-xs">
            <strong class="text-sky-300">📡 ${sensor.name}</strong><br/>
            <span>Tilt: <strong>${sensor.resultant_tilt_deg}°</strong> | Moisture: <strong>${sensor.soil_moisture_vwc}%</strong></span><br/>
            <span>Battery: <strong>${sensor.battery_pct}%</strong> | Mesh: <strong>${sensor.connectivity_mode}</strong></span>
          </div>
        `);

        group.addLayer(marker);
      });
    }

    // 4. Render Evacuation Shelters
    if (activeLayers.shelters) {
      const shelters = [
        { name: "Gangtok Paljor Stadium Disaster Relief Center", lat: 27.3312, lng: 88.6145, cap: 2500 },
        { name: "Cherrapunji Ramakrishna Mission Relief Camp", lat: 25.2810, lng: 91.7250, cap: 1200 },
        { name: "Kohima Indira Gandhi Stadium Base", lat: 25.6880, lng: 94.1150, cap: 3000 },
        { name: "Aizawl Hawla Indoor Stadium Transit Shelter", lat: 23.7380, lng: 92.7250, cap: 2200 }
      ];

      shelters.forEach((shl) => {
        const shelterIconHtml = `
          <div style="background-color: #06b6d4; width: 16px; height: 16px; border-radius: 4px; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold;">
            S
          </div>
        `;
        const icon = L.divIcon({
          className: 'shelter-icon',
          html: shelterIconHtml,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const marker = L.marker([shl.lat, shl.lng], { icon });
        marker.bindTooltip(`
          <div class="text-xs">
            <strong class="text-cyan-400">🛡️ ${shl.name}</strong><br/>
            <span>Emergency Capacity: <strong>${shl.cap} persons</strong></span>
          </div>
        `);
        group.addLayer(marker);
      });
    }

    // 5. Render InSAR Satellite Radar Deformation Vectors
    if (activeLayers.insar && insarData && insarData.length > 0) {
      insarData.forEach((insar) => {
        const isCriticalSub = insar.risk_flag?.includes('CRITICAL') || Math.abs(insar.velocity_mm_per_year) > 100;
        const isRapid = insar.risk_flag?.includes('RAPID') || Math.abs(insar.velocity_mm_per_year) > 50;
        const radarColor = isCriticalSub ? '#ec4899' : isRapid ? '#a855f7' : '#06b6d4';

        // Outer radar scan circle
        const radarCircle = L.circleMarker([insar.latitude, insar.longitude], {
          radius: isCriticalSub ? 28 : 20,
          color: radarColor,
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: radarColor,
          fillOpacity: 0.12
        });
        group.addLayer(radarCircle);

        // Satellite Icon marker offset slightly to avoid overlapping exactly with the zone circle
        const satIconHtml = `
          <div style="background: linear-gradient(135deg, #581c87, #9333ea); width: 22px; height: 22px; border-radius: 50%; border: 2px solid #c084fc; display: flex; align-items: center; justify-content: center; font-size: 11px; box-shadow: 0 0 10px rgba(168, 85, 247, 0.8); color: white; cursor: pointer;">
            🛰️
          </div>
        `;
        const satIcon = L.divIcon({
          className: 'satellite-insar-icon',
          html: satIconHtml,
          iconSize: [22, 22],
          iconAnchor: [-8, -8]
        });

        const satMarker = L.marker([insar.latitude, insar.longitude], { icon: satIcon });
        satMarker.bindTooltip(`
          <div class="p-1 font-sans text-xs min-w-[200px]">
            <div class="flex items-center justify-between pb-1 border-b border-slate-700">
              <strong class="text-purple-300 font-bold">🛰️ ${insar.satellite}</strong>
              <span class="text-[9px] bg-purple-950 text-purple-200 px-1.5 py-0.5 rounded border border-purple-800 font-mono">${insar.measurement_reliability}</span>
            </div>
            <div class="pt-1.5 space-y-1 text-slate-200">
              <div>Corridor: <strong class="text-white">${insar.zone_name}</strong></div>
              <div class="flex justify-between">
                <span>LOS Subsidence:</span>
                <strong class="text-pink-400 font-mono font-bold">${insar.velocity_mm_per_year} mm/yr</strong>
              </div>
              <div class="flex justify-between">
                <span>Cum. Displacement:</span>
                <strong class="text-amber-300 font-mono">${insar.cumulative_displacement_mm} mm</strong>
              </div>
              <div class="flex justify-between">
                <span>Radar Coherence:</span>
                <strong class="text-emerald-300 font-mono">&gamma; = ${insar.coherence}</strong>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
                <span>Radar Pass:</span>
                <span>${insar.acquisition_date}</span>
              </div>
            </div>
          </div>
        `, { direction: 'top', offset: [15, -5] });

        group.addLayer(satMarker);
      });
    }

    // 6. Render Autonomous Remote Satellite Landslide Detections (Zero Ground Sensors)
    if (activeLayers.uninstrumented && uninstrumentedDetections && uninstrumentedDetections.length > 0) {
      uninstrumentedDetections.forEach((det) => {
        // Hazard impact footprint polygon / circle
        const radius = Math.min(Math.max(Math.sqrt(det.estimated_area_sqm / Math.PI), 25), 45);
        const scarCircle = L.circle([det.latitude, det.longitude], {
          radius: radius * 30, // in meters
          color: '#f43f5e',
          weight: 2,
          dashArray: '6, 6',
          fillColor: '#e11d48',
          fillOpacity: 0.22,
          className: 'pulse-radar'
        });
        group.addLayer(scarCircle);

        // Satellite Radar Scar Beacon Icon
        const scarIconHtml = `
          <div style="background: linear-gradient(135deg, #9f1239, #f43f5e); width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 0 18px #f43f5e; color: white; cursor: pointer;" title="Autonomous Satellite Landslide Discovery (0 Sensors)">
            🛰️
          </div>
        `;
        const scarIcon = L.divIcon({
          className: 'uninstrumented-satellite-marker',
          html: scarIconHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const scarMarker = L.marker([det.latitude, det.longitude], { icon: scarIcon });
        scarMarker.bindTooltip(`
          <div class="p-1.5 font-sans text-xs min-w-[220px]">
            <div class="flex items-center justify-between pb-1 border-b border-rose-800">
              <strong class="text-rose-400 font-bold">🛰️ SATELLITE DISCOVERY</strong>
              <span class="text-[9px] bg-rose-950 text-rose-200 px-1.5 py-0.5 rounded border border-rose-700 font-bold font-mono">0 SENSORS</span>
            </div>
            <div class="pt-1.5 space-y-1 text-slate-200">
              <div><strong class="text-white">${det.location_name}</strong></div>
              <div class="text-[10px] text-slate-400 font-mono">${det.satellite_mission}</div>
              <div class="flex justify-between">
                <span>Decorrelation:</span>
                <span class="text-pink-300 text-[10px] font-semibold">${det.coherence_drop}</span>
              </div>
              <div class="flex justify-between">
                <span>LOS Subsidence:</span>
                <strong class="text-pink-400 font-mono">${det.los_subsidence_velocity_mm_yr} mm/yr</strong>
              </div>
              <div class="flex justify-between">
                <span>Debris Volume:</span>
                <strong class="text-amber-300 font-mono">${Number(det.estimated_volume_m3).toLocaleString()} m³</strong>
              </div>
              <div class="text-[10px] text-amber-200 pt-1 border-t border-slate-800">
                ⚠️ ${det.nearest_infrastructure}
              </div>
            </div>
          </div>
        `, { direction: 'top', offset: [0, -12] });

        scarMarker.on('click', () => {
          setActiveSatelliteDiscovery(det);
        });

        group.addLayer(scarMarker);
      });
    }

  }, [zonesData, sensorsData, roadsData, insarData, uninstrumentedDetections, activeLayers]);

  // Set default selected zone to first critical zone if not selected
  useEffect(() => {
    if (!selectedZone && zonesData?.features?.length > 0) {
      const crit = zonesData.features.find(f => f.properties.current_risk_level === 'Critical');
      setSelectedZone(crit ? crit.properties : zonesData.features[0].properties);
    }
  }, [zonesData, selectedZone]);

  const toggleLayer = (layerName) => {
    setActiveLayers(prev => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  return (
    <div className="relative w-full h-[calc(100vh-115px)] flex flex-col md:flex-row overflow-hidden bg-slate-950">
      
      {/* Map Canvas */}
      <div className="relative flex-1 h-full min-h-[500px]">
        <div ref={mapContainerRef} className="w-full h-full min-h-[500px] z-0" style={{ minHeight: '500px' }} />

        {/* Map Layer Controls Floating Island */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-xl max-w-xs text-xs space-y-2">
          <div className="flex items-center space-x-2 pb-1 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
            <Layers className="w-4 h-4 text-rose-500" />
            <span>GIS Map Layers</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={activeLayers.zones} 
                onChange={() => toggleLayer('zones')}
                className="rounded text-rose-500 bg-slate-800 border-slate-700" 
              />
              <span>Hazard Zones</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={activeLayers.sensors} 
                onChange={() => toggleLayer('sensors')}
                className="rounded text-sky-500 bg-slate-800 border-slate-700" 
              />
              <span>IoT Tilt Nodes</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={activeLayers.roads} 
                onChange={() => toggleLayer('roads')}
                className="rounded text-amber-500 bg-slate-800 border-slate-700" 
              />
              <span>Highways (NH)</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={activeLayers.shelters} 
                onChange={() => toggleLayer('shelters')}
                className="rounded text-cyan-500 bg-slate-800 border-slate-700" 
              />
              <span>Safe Shelters</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-purple-300 hover:text-white col-span-2 pt-1 border-t border-slate-800/80">
              <input 
                type="checkbox" 
                checked={activeLayers.insar} 
                onChange={() => toggleLayer('insar')}
                className="rounded text-purple-500 bg-slate-800 border-slate-700" 
              />
              <span className="flex items-center space-x-1 font-semibold text-purple-300">
                <span>🛰️ Sentinel-1 InSAR (Simulated Feed)</span>
                <span className="text-[9px] bg-purple-950/80 border border-purple-800 text-purple-200 px-1 rounded">Prototype</span>
              </span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-pink-300 hover:text-white col-span-2 pt-1 border-t border-slate-800/80">
              <input 
                type="checkbox" 
                checked={activeLayers.uninstrumented} 
                onChange={() => toggleLayer('uninstrumented')}
                className="rounded text-pink-500 bg-slate-800 border-slate-700" 
              />
              <span className="flex items-center space-x-1 font-semibold text-pink-300">
                <span>🛰️⚠️ Remote Satellite Scars</span>
                <span className="text-[9px] bg-pink-950/90 border border-pink-700 text-pink-200 px-1 rounded font-mono">0 Sensors</span>
              </span>
            </label>
          </div>

          {/* Basemap Selection (Watermark-free) */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Basemap Provider (100% Free)</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setBasemap('streets')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition text-left truncate ${
                  basemap === 'streets'
                    ? 'bg-rose-600 text-white font-bold shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🗺️ OpenStreetMap
              </button>
              <button
                type="button"
                onClick={() => setBasemap('satellite')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition text-left truncate ${
                  basemap === 'satellite'
                    ? 'bg-rose-600 text-white font-bold shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🛰️ Satellite (Esri)
              </button>
              <button
                type="button"
                onClick={() => setBasemap('topo')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition text-left truncate ${
                  basemap === 'topo'
                    ? 'bg-rose-600 text-white font-bold shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🏔️ Himalayan Topo
              </button>
              <button
                type="button"
                onClick={() => setBasemap('dark')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition text-left truncate ${
                  basemap === 'dark'
                    ? 'bg-rose-600 text-white font-bold shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🌑 Dark Filter
              </button>
            </div>
            
            <button
              type="button"
              onClick={resetToNerBounds}
              className="w-full mt-1 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 rounded py-1 text-[10px] font-semibold flex items-center justify-center space-x-1 transition"
            >
              <span>🎯 Center All 8 NER States</span>
            </button>
          </div>

          {/* Autonomous Satellite Landslide Discovery Trigger */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-pink-400 font-bold uppercase flex items-center space-x-1">
                <span>🛰️ Satellite Blind-Spot AI</span>
              </span>
              <span className="text-[9px] bg-pink-950/80 border border-pink-700 text-pink-200 px-1 py-0.2 rounded font-mono font-bold">
                0 Sensors
              </span>
            </div>
            <p className="text-[9.5px] text-slate-400 leading-tight">
              Test autonomous satellite discovery of remote landslides where NO ground IoT sensors exist.
            </p>
            <div className="flex items-center space-x-1">
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded px-1 py-1 focus:outline-none focus:border-pink-500"
              >
                <option value="dzongu">Dzongu (N. Sikkim)</option>
                <option value="sonapur">Sonapur (Meghalaya)</option>
                <option value="sinjol">Sinjol (Nagaland)</option>
              </select>
              <button
                type="button"
                disabled={isScanningSatellite}
                onClick={async () => {
                  setIsScanningSatellite(true);
                  try {
                    const res = await onTriggerSatelliteDetection(selectedPreset);
                    if (res && res.details) {
                      setActiveSatelliteDiscovery(res.details);
                      const map = mapInstanceRef.current;
                      if (map) {
                        map.flyTo([res.details.latitude, res.details.longitude], 12, { duration: 1.5 });
                      }
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsScanningSatellite(false);
                  }
                }}
                className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-[10px] px-2 py-1 rounded transition shadow flex items-center space-x-1 shrink-0"
              >
                <span>{isScanningSatellite ? 'Scanning...' : 'Trigger Scan'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-xl text-[11px] space-y-1">
          <div className="font-semibold text-slate-300">Landslide Hazard Severity</div>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span><span className="text-slate-300">Critical (&gt;80%)</span></span>
            <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span><span className="text-slate-300">High (65-80%)</span></span>
            <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span><span className="text-slate-300">Moderate</span></span>
            <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span className="text-slate-300">Low</span></span>
          </div>
        </div>
      </div>

      {/* Right Drawer: Live Telemetry, Zone Analysis & SHAP Inspector */}
      <div className="w-full md:w-[420px] lg:w-[460px] bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-2xl">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-3 pt-2 text-xs">
          <button
            onClick={() => setActiveTab('zones')}
            className={`flex-1 py-2 font-medium text-center border-b-2 transition ${
              activeTab === 'zones'
                ? 'border-rose-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Zone Telemetry
          </button>
          <button
            onClick={() => setActiveTab('roads')}
            className={`flex-1 py-2 font-medium text-center border-b-2 transition ${
              activeTab === 'roads'
                ? 'border-rose-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Highway Lifelines ({roadsData?.filter(r => r.status !== 'Open').length || 0})
          </button>
          <button
            onClick={() => setActiveTab('sensors')}
            className={`flex-1 py-2 font-medium text-center border-b-2 transition ${
              activeTab === 'sensors'
                ? 'border-rose-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            IoT Nodes ({sensorsData?.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'zones' && selectedZone && (
            <div className="space-y-4">
              {/* Zone Header with Dual Pipeline & Hybrid AI Estimation */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-semibold">
                      {selectedZone.id} • {selectedZone.state}
                    </span>
                    <h2 className="text-base font-bold text-white tracking-tight">{selectedZone.name}</h2>
                    <p className="text-xs text-slate-400">District: {selectedZone.district} • Elevation: {selectedZone.elevation_m}m</p>
                    <div className="flex items-center space-x-1.5 pt-1">
                      {!liveSnapshot?.hasLiveRain ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-800 text-slate-400 border-slate-700" title="No live weather row for this zone — showing fallback scenario">
                          NO LIVE DATA
                        </span>
                      ) : isWhatIf ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-amber-950/60 text-amber-300 border-amber-700/60" title="Sliders edited — cards show a hypothetical scenario, not live conditions">
                          WHAT-IF SCENARIO
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-emerald-950/60 text-emerald-300 border-emerald-700/60" title={liveSnapshot?.weatherTimestamp ? `Live weather @ ${liveSnapshot.weatherTimestamp}` : 'Live zone conditions'}>
                          LIVE CONDITIONS
                        </span>
                      )}
                      {liveSnapshot?.hasLiveRain && (
                        <span className="text-[9px] font-mono text-slate-400">
                          Live rain {liveSnapshot.liveRain24}mm/24h • {liveSnapshot.liveRain72}mm/72h
                        </span>
                      )}
                    </div>
                  </div>
                  <span 
                    className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm transition-colors"
                    style={{
                      backgroundColor: `${estimatedRisk.color}22`,
                      color: estimatedRisk.color,
                      borderColor: `${estimatedRisk.color}66`
                    }}
                  >
                    {hybridResult?.hybrid_risk?.risk_level || estimatedRisk.level} ({Math.round((hybridResult?.hybrid_risk?.score || estimatedRisk.score) * 100)}%)
                  </span>
                </div>

                {/* 3-Tier Pipeline Comparison Strip: Physics vs ML vs Hybrid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  {/* 1. Physics Baseline */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-1">
                    <div className="flex items-center justify-center space-x-1 text-[9px] text-slate-400 font-semibold uppercase">
                      <Layers className="w-3 h-3 text-rose-400" />
                      <span>Physics Baseline</span>
                    </div>
                    <div className="font-mono text-base font-bold text-rose-400">
                      {Math.round((hybridResult?.physics_baseline?.score ?? estimatedRisk.score) * 100)}%
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      FoS {hybridResult?.physics_baseline?.factor_of_safety ?? estimatedRisk.fos}
                    </div>
                    <span className="text-[8px] bg-rose-950/80 border border-rose-800/60 text-rose-300 px-1 py-0.2 rounded block truncate">
                      Limit-Equilibrium
                    </span>
                  </div>

                  {/* 2. Real ML Model */}
                  <div className="bg-slate-900/90 border border-indigo-900/60 rounded-xl p-2.5 space-y-1">
                    <div className="flex items-center justify-center space-x-1 text-[9px] text-indigo-300 font-semibold uppercase">
                      <Cpu className="w-3 h-3 text-indigo-400" />
                      <span>ML Risk Probability</span>
                    </div>
                    <div className="font-mono text-base font-bold text-indigo-300">
                      {isHybridLoading ? (
                        <span className="text-slate-500 text-xs">Evaluating...</span>
                      ) : (
                        hybridResult?.ml_model?.probability !== undefined && hybridResult?.ml_model?.probability !== null
                          ? `${Math.round(hybridResult.ml_model.probability * 100)}%`
                          : <span className="text-slate-500 text-xs">N/A</span>
                      )}
                    </div>
                    <div className="text-[9px] text-indigo-300/80 font-mono">
                      {hybridResult?.ml_model?.tree_agreement_pct !== undefined
                        ? `Tree Agree: ${Math.round(hybridResult.ml_model.tree_agreement_pct)}%`
                        : (hybridResult?.ml_model?.confidence !== undefined
                            ? `Tree Agree: ${Math.round(hybridResult.ml_model.confidence * 100)}%`
                            : 'Tree Agree: --')}
                    </div>
                    <span className="text-[8px] bg-indigo-950/80 border border-indigo-800/60 text-indigo-200 px-1 py-0.2 rounded block truncate" title="Random Forest Ensemble • 620 Real Samples • 16 Informative Features • Zero Leakage Split • Real IMERG & WorldCover">
                      RF • N=620 • 16 Feats
                    </span>
                  </div>

                  {/* 3. Hybrid Fused Risk */}
                  <div className="bg-slate-900/90 border border-cyan-800/80 rounded-xl p-2.5 space-y-1 shadow-sm">
                    <div className="flex items-center justify-center space-x-1 text-[9px] text-cyan-300 font-semibold uppercase">
                      <ShieldCheck className="w-3 h-3 text-cyan-400" />
                      <span>Hybrid AI+Phys</span>
                    </div>
                    <div className="font-mono text-base font-bold text-cyan-300">
                      {hybridResult?.hybrid_risk?.score !== undefined
                        ? `${Math.round(hybridResult.hybrid_risk.score * 100)}%`
                        : `${Math.round(estimatedRisk.score * 100)}%`}
                    </div>
                    <div className="text-[9px] text-cyan-400 font-mono" title={hybridResult?.hybrid_risk?.formula || 'R_hybrid = 0.5 * P_ML + 0.5 * R_Physics'}>
                      &alpha; = {hybridResult?.hybrid_risk?.alpha_ml_weight ?? 0.50} {hybridResult?.hybrid_risk?.governing_model ? `(${hybridResult.hybrid_risk.governing_model}-gov)` : 'Fused'}
                    </div>
                    <span className="text-[8px] bg-cyan-950 border border-cyan-700/60 text-cyan-300 px-1 py-0.2 rounded block truncate font-bold">
                      {hybridResult?.hybrid_risk?.risk_level || estimatedRisk.level} Risk
                    </span>
                  </div>
                </div>

                {/* Consensus Indicator */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Pipeline Consensus:</span>
                  </span>
                  <span className="font-semibold text-cyan-300 truncate max-w-[200px]" title={hybridResult?.hybrid_risk?.recommended_action || ''}>
                    {hybridResult?.hybrid_risk?.model_agreement && hybridResult.hybrid_risk.model_agreement.startsWith('SEVERE') ? `DIVERGENCE (${hybridResult.hybrid_risk.model_agreement}): advisory ${hybridResult.hybrid_risk.advisory_level} - ` : ''}{hybridResult?.hybrid_risk?.interpretation || 'Physics Limit-Equilibrium & ML in agreement'}
                  </span>
                </div>

                {/* How-is-this-%-calculated explainer */}
                <details className="bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-300">
                  <summary className="cursor-pointer font-semibold text-cyan-300 hover:text-cyan-200 flex items-center justify-between" style={{ listStyle: 'none' }}>
                    <span>How are these % calculated?</span>
                    <span className="text-slate-500 text-[9px] font-normal">ML &middot; Physics &middot; Hybrid</span>
                  </summary>
                  <div className="pt-2 space-y-2 leading-relaxed">
                    <div className="bg-indigo-950/40 border border-indigo-800/50 rounded p-1.5">
                      <div className="font-bold text-indigo-300 text-[10px]">ML {hybridResult?.ml_model?.probability != null ? `${Math.round(hybridResult.ml_model.probability * 100)}%` : '--'} — Random Forest vote</div>
                      <div>{hybridResult?.ml_model?.tree_vote_summary || '100 decision trees vote; probability = share voting Landslide.'} Tree agreement: {hybridResult?.ml_model?.tree_agreement_pct ?? '--'}%. Thresholds: &ge;75% Critical, &ge;55% High, &ge;35% Moderate.</div>
                      {hybridResult?.ml_model?.top_drivers?.length > 0 && (
                        <div className="font-mono text-[9px] text-indigo-200/90 pt-0.5">Top drivers: {hybridResult.ml_model.top_drivers.slice(0, 3).map(d => `${d.feature}=${d.measured_value} (w=${d.global_importance})`).join(', ')}</div>
                      )}
                    </div>
                    <div className="bg-rose-950/40 border border-rose-800/50 rounded p-1.5">
                      <div className="font-bold text-rose-300 text-[10px]">Physics {hybridResult?.physics_baseline?.score != null ? `${Math.round(hybridResult.physics_baseline.score * 100)}%` : '--'} — limit equilibrium</div>
                      <div>Factor of Safety {hybridResult?.physics_baseline?.factor_of_safety ?? '--'} (resisting &divide; driving, BIS IS 14458) + pore pressure {hybridResult?.physics_baseline?.pore_pressure_kpa ?? '--'} kPa from slope {hybridResult?.physics_baseline?.components?.slope_deg ?? '--'}&deg; &amp; rain {hybridResult?.physics_baseline?.components?.rainfall_24h_mm ?? '--'}/{hybridResult?.physics_baseline?.components?.rainfall_72h_mm ?? '--'} mm. Score = 0.65&middot;FoS-score + 0.35&middot;rain-score&middot;slope-gate.</div>
                    </div>
                    <div className="bg-cyan-950/40 border border-cyan-700/50 rounded p-1.5">
                      <div className="font-bold text-cyan-300 text-[10px]">Hybrid {hybridResult?.hybrid_risk?.score != null ? `${Math.round(hybridResult.hybrid_risk.score * 100)}%` : '--'} — reliability-weighted fusion</div>
                      <div className="font-mono text-[9px]">{hybridResult?.hybrid_risk?.formula || 'R = alpha x P_ML + (1-alpha) x R_Physics'}</div>
                      {hybridResult?.hybrid_risk?.alpha_ml_weight != null && hybridResult?.ml_probability != null && (
                        <div className="font-mono text-[9px]">= {hybridResult.hybrid_risk.alpha_ml_weight} &times; {Math.round(hybridResult.ml_probability * 100)}% + {hybridResult.hybrid_risk.physics_weight} &times; {Math.round(hybridResult.physics_risk * 100)}%</div>
                      )}
                      <div>ML reliability {hybridResult?.hybrid_risk?.ml_reliability ?? '--'} (tree agreement, OOD-discounted) &middot; Physics reliability {hybridResult?.hybrid_risk?.physics_reliability ?? '--'} &middot; Governor: {hybridResult?.hybrid_risk?.governing_model ?? '--'} &middot; Advisory: {hybridResult?.hybrid_risk?.advisory_level ?? '--'}.</div>
                      {hybridResult?.hybrid_risk?.recommended_action && (<div className="text-cyan-200/90">Action: {hybridResult.hybrid_risk.recommended_action}</div>)}
                    </div>
                  </div>
                </details>
                {/* Out-of-Distribution (OOD) Warning Banner */}
                {(hybridResult?.is_out_of_distribution || hybridResult?.ml_model?.is_out_of_distribution) && (
                  <div className="bg-amber-950/70 border border-amber-500/80 rounded-xl p-2.5 space-y-1.5 text-amber-200">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Out-of-Distribution (OOD) Input Warning</span>
                    </div>
                    <p className="text-[10px] text-amber-300 leading-tight">
                      {hybridResult?.ood_warning || hybridResult?.ml_model?.ood_warning || 'Input features outside training distribution. Predictions may be unreliable.'}
                    </p>
                    {((hybridResult?.ood_violations && hybridResult.ood_violations.length > 0) ||
                      (hybridResult?.ml_model?.ood_violations && hybridResult.ml_model.ood_violations.length > 0)) && (
                      <div className="text-[9px] text-amber-200/90 font-mono bg-amber-900/40 rounded p-1 space-y-0.5 max-h-16 overflow-y-auto">
                        {(hybridResult?.ood_violations || hybridResult?.ml_model?.ood_violations || []).map((v, i) => (
                          <div key={i} className="truncate">
                            &bull; <span className="font-semibold">{v.feature}</span>: {v.measured_value} ({v.deviation})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dedicated Visual Satellite InSAR Radar Telemetry Card */}
              {(() => {
                const zoneInsar = insarData?.find(i => i.zone_id === selectedZone.id) || null;
                if (!zoneInsar) return null;
                const vel = zoneInsar.velocity_mm_per_year;
                const isCritical = Math.abs(vel) >= 100;
                const isElevated = Math.abs(vel) >= 50;
                const statusColor = isCritical ? 'text-pink-400' : isElevated ? 'text-amber-400' : 'text-emerald-400';
                const badgeBg = isCritical ? 'bg-pink-950/80 border-pink-700/60 text-pink-300' : isElevated ? 'bg-amber-950/80 border-amber-700/60 text-amber-300' : 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300';
                const gaugePct = Math.min(Math.round((Math.abs(vel) / 200) * 100), 100);

                return (
                  <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-800/60 rounded-xl p-3.5 space-y-2.5 shadow-lg animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-purple-800/40 pb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-sm shadow">
                          🛰️
                        </div>
                        <div>
                          <h3 className="font-bold text-xs text-purple-200">Satellite InSAR Radar Monitoring</h3>
                          <p className="text-[10px] text-slate-400 font-mono">{zoneInsar.satellite} &bull; C-Band SAR</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeBg}`}>
                        {zoneInsar.risk_flag.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* InSAR Velocity & Visual Creep Gauge */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">LOS Ground Subsidence:</span>
                        <span className={`font-mono font-extrabold text-sm ${statusColor}`}>
                          {vel} mm/year
                        </span>
                      </div>

                      {/* Visual Creep Speed Bar */}
                      <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5 border border-slate-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-pink-500 transition-all duration-500"
                          style={{ width: `${gaugePct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>0 mm/yr (Stable)</span>
                        <span>-50 mm (Creep Limit)</span>
                        <span>-200+ mm (Slump)</span>
                      </div>
                    </div>

                    {/* Detailed Radar Telemetry Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-purple-900/30">
                      <div className="bg-slate-950/70 rounded p-1.5 border border-slate-800/80">
                        <span className="text-slate-400 block text-[9px] uppercase">Cum. Displacement</span>
                        <strong className="font-mono text-amber-300 text-xs">{zoneInsar.cumulative_displacement_mm} mm</strong>
                      </div>
                      <div className="bg-slate-950/70 rounded p-1.5 border border-slate-800/80">
                        <span className="text-slate-400 block text-[9px] uppercase">Radar Coherence</span>
                        <strong className="font-mono text-emerald-300 text-xs">&gamma; = {zoneInsar.coherence} ({zoneInsar.measurement_reliability})</strong>
                      </div>
                      <div className="bg-slate-950/70 rounded p-1.5 border border-slate-800/80 col-span-2 flex justify-between items-center text-slate-400">
                        <span>Last Orbit Radar Pass:</span>
                        <span className="font-mono text-slate-200 font-semibold">{zoneInsar.acquisition_date}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* EMERGENCY NOTIFICATION CARD (Activated when High or Critical Risk) */}
              {estimatedRisk.isHighRisk ? (
                <div className="bg-gradient-to-br from-rose-950/90 to-amber-950/80 border-2 border-rose-500/80 rounded-xl p-3.5 shadow-2xl space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                      </span>
                      <span className="text-xs font-bold text-rose-200 uppercase tracking-wider flex items-center space-x-1">
                        <BellRing className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                        <span>High Risk Notification Activated</span>
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-2 py-0.5 rounded uppercase">
                      {estimatedRisk.level} Priority
                    </span>
                  </div>

                  <p className="text-[11px] text-rose-100 leading-relaxed font-medium">
                    Geotechnical failure hazard exceeds critical threshold for <strong>{selectedZone.name}</strong>. NDMA SACHET Emergency Siren &amp; Evacuation Protocol Armed.
                  </p>
                  {isWhatIf && (
                    <p className="text-[10px] text-amber-300 leading-relaxed font-semibold bg-amber-950/50 border border-amber-700/60 rounded px-1.5 py-1">
                      Scenario exploration — sliders differ from live conditions (live rain {liveSnapshot?.liveRain24 ?? '--'}mm/24h). Reset to live before dispatching real alerts.
                    </p>
                  )}

                  {/* Breached Thresholds List */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {estimatedRisk.fos < 1.0 && (
                      <span className="bg-rose-900/80 border border-rose-600 text-rose-200 px-1.5 py-0.5 rounded font-mono font-bold">
                        ⚠️ FoS {estimatedRisk.fos} &lt; 1.0 (Critical Failure)
                      </span>
                    )}
                    {estimatedRisk.fos >= 1.0 && estimatedRisk.fos < 1.25 && (
                      <span className="bg-amber-900/80 border border-amber-600 text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">
                        ⚠️ FoS {estimatedRisk.fos} &lt; 1.25 (Active Creep)
                      </span>
                    )}
                    {slopeAngle > 35 && (
                      <span className="bg-rose-900/60 border border-rose-700/60 text-rose-200 px-1.5 py-0.5 rounded font-mono">
                        Slope {slopeAngle}° &gt; 35°
                      </span>
                    )}
                    {rainIntensity >= 50 && (
                      <span className="bg-rose-900/60 border border-rose-700/60 text-rose-200 px-1.5 py-0.5 rounded font-mono">
                        Rain {rainIntensity} mm/h &ge; 50
                      </span>
                    )}
                    {saturation >= 75 && (
                      <span className="bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 px-1.5 py-0.5 rounded font-mono">
                        Saturation {saturation}% &ge; 75%
                      </span>
                    )}
                  </div>

                  {/* Audio Siren Control Bar */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-1.5 font-semibold text-slate-300">
                        {isSirenPlaying ? (
                          <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                        ) : (
                          <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span className={isSirenPlaying ? 'text-rose-300 font-bold' : 'text-slate-400'}>
                          {isSirenPlaying ? '🔊 SIREN WAILING' : 'Siren Idle'}
                        </span>
                      </div>

                      {/* Tone Mode Selector */}
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSirenMode('wail');
                            if (isSirenPlaying) startSiren('wail');
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition ${
                            sirenMode === 'wail'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          Wail Siren
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSirenMode('klaxon');
                            if (isSirenPlaying) startSiren('klaxon');
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition ${
                            sirenMode === 'klaxon'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          Hi-Lo Horn
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/80">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={autoSirenEnabled}
                          onChange={(e) => setAutoSirenEnabled(e.target.checked)}
                          className="rounded text-rose-500 bg-slate-900 border-slate-700"
                        />
                        <span>Auto-sound when threshold exceeded</span>
                      </label>
                      <button
                        type="button"
                        onClick={toggleSiren}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold transition flex items-center space-x-1 ${
                          isSirenPlaying 
                            ? 'bg-rose-600 text-white animate-pulse' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isSirenPlaying ? (
                          <>
                            <VolumeX className="w-3 h-3" />
                            <span>Silence Siren</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Play Siren</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Dispatch Warning Action Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleDispatchNotification}
                      disabled={dispatchStatus === 'dispatching' || dispatchStatus === 'sent'}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition ${
                        dispatchStatus === 'sent'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
                      }`}
                    >
                      {dispatchStatus === 'sent' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Emergency Warning Dispatched to Authorities &amp; Cells!</span>
                        </>
                      ) : (
                        <>
                          <Megaphone className="w-4 h-4" />
                          <span>{dispatchStatus === 'dispatching' ? 'Broadcasting Alert...' : 'Dispatch NDMA SACHET Alert'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {dispatchStatus === 'sent' && (
                    <div className="text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-800 rounded p-1.5 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Transmitted via NDMA SACHET Cell Broadcast to East Sikkim &amp; VHF Police Radio Relay.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-2.5 flex items-center space-x-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-[11px]">
                    <strong>Normal Advisory Level:</strong> Calculated risk ({(estimatedRisk.score * 100).toFixed(1)}%) is below emergency notification threshold. Sirens idle.
                  </div>
                </div>
              )}

              {/* What-If Scenario Controls Header (from 2nd Picture) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2 font-bold text-sm text-slate-200">
                    <Sliders className="w-4 h-4 text-rose-500" />
                    <span>What-If Scenario Controls</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (liveSnapshot) {
                        setSlopeAngle(liveSnapshot.slopeAngle);
                        setRainIntensity(liveSnapshot.rainIntensity);
                        setDurationHours(liveSnapshot.durationHours);
                        setSaturation(liveSnapshot.saturation);
                        setCohesion(liveSnapshot.cohesion);
                      } else {
                        setSlopeAngle(34.0);
                        setRainIntensity(10.0);
                        setDurationHours(6.0);
                        setSaturation(72.0);
                        setCohesion(12.0);
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 transition"
                    title={liveSnapshot ? "Reset to live zone conditions" : "Reset to default scenario values"}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{liveSnapshot ? 'Reset to live' : 'Reset'}</span>
                  </button>
                </div>

                {/* 1. Rainfall Intensity */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Rainfall Intensity</span>
                    <span className="font-mono font-bold text-rose-400">{rainIntensity} mm/h</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="5"
                    value={rainIntensity}
                    onChange={(e) => setRainIntensity(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0 (Dry)</span>
                    <span>50 (Heavy)</span>
                    <span>150 (Cloudburst)</span>
                  </div>
                </div>

                {/* 2. Storm Duration */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Storm Duration</span>
                    <span className="font-mono font-bold text-sky-400">{durationHours} hrs</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="48"
                    step="1"
                    value={durationHours}
                    onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1 hr (Flash)</span>
                    <span>12 hrs</span>
                    <span>48 hrs (Prolonged)</span>
                  </div>
                </div>

                {/* 3. Slope Inclination Angle */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Slope Inclination Angle</span>
                    <span className="font-mono font-bold text-amber-400">{slopeAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="65"
                    step="1"
                    value={slopeAngle}
                    onChange={(e) => setSlopeAngle(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>20° (Gentle)</span>
                    <span>35° (Threshold)</span>
                    <span>65° (Cliff)</span>
                  </div>
                </div>

                {/* 4. Antecedent Saturation */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Antecedent Saturation</span>
                    <span className="font-mono font-bold text-indigo-400">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="1"
                    value={saturation}
                    onChange={(e) => setSaturation(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>20% (Dry)</span>
                    <span>60% (Moist)</span>
                    <span>100% (Saturated)</span>
                  </div>
                </div>

                {/* 5. Soil Cohesion (c') */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Soil Cohesion (c')</span>
                    <span className="font-mono font-bold text-emerald-400">{cohesion} kPa</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={cohesion}
                    onChange={(e) => setCohesion(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>5 kPa (Colluvium)</span>
                    <span>15 kPa (Loam)</span>
                    <span>30 kPa (Dense Till)</span>
                  </div>
                </div>

                {/* Real-Time Geotechnical Output Metrics Strip */}
                <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Factor of Safety</span>
                    <span className="font-mono text-sm font-bold" style={{ color: estimatedRisk.color }}>
                      {estimatedRisk.fos}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {estimatedRisk.fos < 1.0 ? 'FoS < 1.0 Fail' : estimatedRisk.fos < 1.25 ? 'Creep Margin' : 'Stable'}
                    </span>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Pore Pressure (u)</span>
                    <span className="font-mono text-sm font-bold text-sky-400">
                      {estimatedRisk.poreWaterPressure} kPa
                    </span>
                    <span className="text-[9px] text-slate-500 block">Hydraulic Head</span>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Accum. Rain</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {estimatedRisk.totalRainfall} mm
                    </span>
                    <span className="text-[9px] text-slate-500 block">{durationHours}h Storm</span>
                  </div>
                </div>

                {/* Scenario Quick Presets */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Disaster Presets:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSlopeAngle(45);
                        setRainIntensity(35);
                        setDurationHours(4);
                        setSaturation(90);
                        setCohesion(8);
                      }}
                      className="bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/60 text-rose-200 rounded p-1.5 text-left font-medium transition"
                    >
                      💥 Himalayan Cloudburst
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSlopeAngle(38);
                        setRainIntensity(6);
                        setDurationHours(24);
                        setSaturation(85);
                        setCohesion(12);
                      }}
                      className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded p-1.5 text-left font-medium transition"
                    >
                      🌧️ Multi-Day Monsoon
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSlopeAngle(30);
                        setRainIntensity(12);
                        setDurationHours(4);
                        setSaturation(60);
                        setCohesion(16);
                      }}
                      className="bg-yellow-950/40 hover:bg-yellow-900/60 border border-yellow-700/40 text-yellow-200 rounded p-1.5 text-left font-medium transition"
                    >
                      🟡 Moderate Incline
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSlopeAngle(20);
                        setRainIntensity(0);
                        setDurationHours(1);
                        setSaturation(35);
                        setCohesion(22);
                      }}
                      className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/40 text-emerald-200 rounded p-1.5 text-left font-medium transition"
                    >
                      🟢 Dry Stable Mountain
                    </button>
                  </div>
                </div>

              </div>

              {/* Vulnerable Infrastructure */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Critical Assets in Runout Zone</span>
                <p className="text-slate-200 font-medium">{selectedZone.critical_infrastructure}</p>
              </div>

              {/* Explainable AI Button */}
              <button
                onClick={() => onOpenShap(selectedZone.id)}
                className="w-full bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-rose-900/30 text-xs flex items-center justify-center space-x-2 transition"
              >
                <Eye className="w-4 h-4" />
                <span>Explain AI Risk Score (SHAP Breakdown)</span>
              </button>

              {/* Live Rain Simulation Tool */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                    <CloudRain className="w-4 h-4 text-sky-400" />
                    <span>Simulate Cloudburst Injection</span>
                  </span>
                  <span className="text-[10px] text-sky-400 font-mono">IMD Doppler Sync</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Inject synthetic 1-hour heavy rainfall to test how the dynamic nowcasting engine responds in real-time.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onSimulateRain(selectedZone.id, 25.0)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-800/60 rounded-lg py-1.5 font-medium transition text-center"
                  >
                    +25 mm (Heavy)
                  </button>
                  <button
                    onClick={() => onSimulateRain(selectedZone.id, 65.0)}
                    className="flex-1 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/60 rounded-lg py-1.5 font-medium transition text-center"
                  >
                    +65 mm (Cloudburst)
                  </button>
                </div>
              </div>

              {/* Monitored Zones Quick Switcher */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Switch Monitored Zone</span>
                <div className="space-y-1.5">
                  {zonesData?.features?.map((f) => {
                    const p = f.properties;
                    const isSelected = p.id === selectedZone.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedZone(p)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-slate-800/90 border-rose-500 text-white'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.state} • {p.district}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.current_risk_level === 'Critical' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {p.current_risk_level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'roads' && (
            <div className="space-y-3 text-xs">
              <div className="text-slate-400 text-[11px]">
                Mountain arterial corridors under continuous geotechnical surveillance. Blockages trigger automatic alternate route calculations.
              </div>
              {roadsData?.map((road) => (
                <div key={road.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-sky-400 text-xs">{road.highway_no}</span>
                      <h4 className="font-semibold text-slate-200 text-xs">{road.name}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      road.status === 'Blocked' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      road.status === 'Caution' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {road.status}
                    </span>
                  </div>
                  {road.blockage_reason && (
                    <div className="text-rose-300 bg-rose-950/40 border border-rose-900/40 rounded p-2 text-[11px]">
                      ⚠️ {road.blockage_reason}
                    </div>
                  )}
                  <div className="text-slate-400 text-[11px]">
                    <strong>Alternate:</strong> {road.alternate_route}
                  </div>
                  {road.status !== 'Open' && (
                    <button
                      onClick={() => onOpenReroute(road)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg py-1.5 font-medium flex items-center justify-center space-x-1 text-[11px] transition"
                    >
                      <span>Simulate Alternate Rerouting</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'sensors' && (
            <div className="space-y-2.5 text-xs">
              <div className="text-slate-400 text-[11px]">
                Real-time telemetry from LoRaWAN borehole inclinometers, piezometers, and micro-vibration sensors deployed on critical slopes.
              </div>
              {sensorsData?.map((sensor) => (
                <div key={sensor.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-slate-400">{sensor.id}</span>
                      <h4 className="font-semibold text-slate-200">{sensor.name}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      sensor.edge_alarm_state === 'TRIGGERED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      sensor.edge_alarm_state === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {sensor.edge_alarm_state}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] pt-1">
                    <div className="bg-slate-900 p-1.5 rounded">
                      <span className="text-slate-400 block text-[10px]">Tilt Angle</span>
                      <strong className="text-slate-200">{sensor.resultant_tilt_deg}°</strong>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded">
                      <span className="text-slate-400 block text-[10px]">Moisture</span>
                      <strong className="text-slate-200">{sensor.soil_moisture_vwc}%</strong>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded">
                      <span className="text-slate-400 block text-[10px]">Pore Press.</span>
                      <strong className="text-slate-200">{sensor.pore_pressure_kpa} kPa</strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>🔋 Battery: {sensor.battery_pct}%</span>
                    <span>📡 Mode: {sensor.connectivity_mode}</span>
                    <span>RSSI: {sensor.signal_rssi} dBm</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Autonomous Satellite Landslide Discovery Modal (Zero Ground Sensors) */}
      {activeSatelliteDiscovery && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-600/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-rose-900/50 bg-rose-950/40 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center text-white shadow-lg text-lg">
                  🛰️
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-white">Autonomous Satellite Landslide Discovery</h3>
                    <span className="bg-rose-500 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                      Zero Ground Sensors
                    </span>
                  </div>
                  <p className="text-xs text-rose-300/80">
                    {activeSatelliteDiscovery.location_name} &bull; {activeSatelliteDiscovery.district}, {activeSatelliteDiscovery.state}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveSatelliteDiscovery(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Alert Callout */}
              <div className="bg-rose-950/50 border border-rose-700/60 rounded-xl p-3.5 space-y-2 text-rose-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300 text-xs flex items-center space-x-1.5">
                    <span>⚠️ Remote Blind-Spot Rupture Detected</span>
                  </span>
                  <span className="font-mono text-[10px] text-rose-400 font-bold">
                    ID: {activeSatelliteDiscovery.id}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  No physical IoT tilt or piezometer sensors exist on this remote mountain flank. Detection was executed autonomously by <strong>{activeSatelliteDiscovery.satellite_mission}</strong> via interferometric phase decorrelation and SAR amplitude backscatter change.
                </p>
              </div>

              {/* Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Ground Sensors</span>
                  <strong className="text-sm font-mono text-rose-400 font-bold">0 (NONE)</strong>
                  <span className="text-[9px] text-slate-500 block">Blind-Spot</span>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Decorrelation</span>
                  <strong className="text-xs font-mono text-pink-300 font-bold">{activeSatelliteDiscovery.coherence_drop.split(' ')[0]}</strong>
                  <span className="text-[9px] text-slate-500 block">Phase Rupture</span>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">LOS Subsidence</span>
                  <strong className="text-sm font-mono text-rose-400 font-bold">{activeSatelliteDiscovery.los_subsidence_velocity_mm_yr} mm/yr</strong>
                  <span className="text-[9px] text-slate-500 block">Critical Slump</span>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Debris Volume</span>
                  <strong className="text-sm font-mono text-amber-300 font-bold">~{Number(activeSatelliteDiscovery.estimated_volume_m3).toLocaleString()} m³</strong>
                  <span className="text-[9px] text-slate-500 block">Estimated Mass</span>
                </div>
              </div>

              {/* Technical Detection Methodology */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Satellite Detection Methodology & Pedigree</span>
                <div className="text-slate-200 text-[11px] font-mono leading-relaxed">
                  {activeSatelliteDiscovery.detection_method}
                </div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  Trigger Event: <strong className="text-slate-300">{activeSatelliteDiscovery.trigger_cause}</strong>
                </div>
              </div>

              {/* Downstream Impact & Action Plan */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Threat to Critical Downstream Infrastructure</span>
                <p className="text-slate-200 text-xs font-semibold">
                  {activeSatelliteDiscovery.nearest_infrastructure}
                </p>
                <div className="text-[10px] text-emerald-300 pt-1 border-t border-slate-800/80 flex items-center space-x-1.5">
                  <span>✓ Recommended Action:</span>
                  <span>{activeSatelliteDiscovery.recommended_action}</span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                Detected: {activeSatelliteDiscovery.detected_at}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    alert(`Emergency alert dispatched via NDMA SACHET Cell Broadcast for ${activeSatelliteDiscovery.location_name}!`);
                    setActiveSatelliteDiscovery(null);
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                >
                  Broadcast Evacuation Warning
                </button>
                <button
                  onClick={() => setActiveSatelliteDiscovery(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
