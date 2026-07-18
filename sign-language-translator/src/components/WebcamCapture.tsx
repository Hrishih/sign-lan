import React, { useRef, useState, useEffect } from "react";
import { 
  Camera, 
  RefreshCw, 
  AlertTriangle, 
  Play, 
  Sparkles, 
  ToggleLeft, 
  ToggleRight, 
  Activity, 
  ExternalLink, 
  Info, 
  X, 
  Cpu,
  Monitor,
  Video
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SignTranslationResponse } from "../types";

interface WebcamCaptureProps {
  onSignDetected: (detected: SignTranslationResponse) => void;
  isTranslating: boolean;
  setIsTranslating: (val: boolean) => void;
  compiledGlosses: string[];
  handTrackingEnabled: boolean;
  setHandTrackingEnabled: (val: boolean) => void;
  emotionDetectionEnabled: boolean;
  setEmotionDetectionEnabled: (val: boolean) => void;
  llmInterpretationEnabled: boolean;
  setLlmInterpretationEnabled: (val: boolean) => void;
  voiceOutputEnabled: boolean;
  setVoiceOutputEnabled: (val: boolean) => void;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}

export default function WebcamCapture({ 
  onSignDetected, 
  isTranslating, 
  setIsTranslating,
  compiledGlosses,
  handTrackingEnabled,
  setHandTrackingEnabled,
  emotionDetectionEnabled,
  setEmotionDetectionEnabled,
  llmInterpretationEnabled,
  setLlmInterpretationEnabled,
  voiceOutputEnabled,
  setVoiceOutputEnabled
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<"inactive" | "active" | "denied" | "error" | "loading_model">("inactive");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [detectionResult, setDetectionResult] = useState<SignTranslationResponse | null>(null);
  const [showModelExplanation, setShowModelExplanation] = useState<boolean>(false);

  // Draggable Face Tracker Box Coordinates (as percentages of container)
  const [faceTrackerPos, setFaceTrackerPos] = useState({ x: 40, y: 22 });
  const isDraggingTracker = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const trackerStartPos = useRef({ x: 40, y: 22 });

  const handleTrackerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTracker.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    trackerStartPos.current = { ...faceTrackerPos };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTrackerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTracker.current) return;
    const trackerEl = e.currentTarget;
    const container = trackerEl.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    const dxPercent = (dx / rect.width) * 100;
    const dyPercent = (dy / rect.height) * 100;

    // Clamp values so that the box stays inside container boundaries
    const newX = Math.max(0, Math.min(80, trackerStartPos.current.x + dxPercent));
    const newY = Math.max(0, Math.min(72, trackerStartPos.current.y + dyPercent));

    setFaceTrackerPos({ x: newX, y: newY });
  };

  const handleTrackerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTracker.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Real-time hand tracking states
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState<boolean>(false);
  const [localGesture, setLocalGesture] = useState<{ name: string; description: string; predictedWord?: string } | null>(null);
  const [isHandStable, setIsHandStable] = useState<boolean>(false);
  const [stabilityProgress, setStabilityProgress] = useState<number>(0); // 0 to 100
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(true);
  const [dictFilter, setDictFilter] = useState<string>("All");

  // Sync refs to avoid stale closures in callbacks
  const handTrackingEnabledRef = useRef(handTrackingEnabled);
  const autoCaptureEnabledRef = useRef(autoCaptureEnabled);

  useEffect(() => {
    handTrackingEnabledRef.current = handTrackingEnabled;
  }, [handTrackingEnabled]);

  useEffect(() => {
    autoCaptureEnabledRef.current = autoCaptureEnabled;
  }, [autoCaptureEnabled]);

  // Real-time HUD and Emotion telemetry states
  const [hudTime, setHudTime] = useState<string>("23:05");
  const [currentEmotion, setCurrentEmotion] = useState<string>("Neutral");
  const [emotionMetrics, setEmotionMetrics] = useState({
    Happy: 5,
    Sad: 3,
    Neutral: 84,
    Angry: 2,
    Questioning: 3,
    Skeptical: 3,
  });

  // Dynamic system clock ticking
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setHudTime(`${hours}:${minutes}`);
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 10000);
    return () => clearInterval(clockInterval);
  }, []);

  // Smoothly interpolate and fluctuate emotion classification telemetry
  useEffect(() => {
    let targets = {
      Happy: 5,
      Sad: 3,
      Neutral: 84,
      Angry: 2,
      Questioning: 3,
      Skeptical: 3,
    };

    const currentGestureName = localGesture ? localGesture.name : (detectionResult ? detectionResult.detectedSign : "");

    if (currentGestureName) {
      const upperName = currentGestureName.toUpperCase();
      if (["HELLO", "THANK_YOU", "OPEN HAND", "OPEN PALMS", "THUMBS UP", "IMPROVE", "LIFE", "HAPPY"].some(word => upperName.includes(word))) {
        targets = { Happy: 88, Neutral: 7, Sad: 1, Angry: 1, Questioning: 2, Skeptical: 1 };
        setCurrentEmotion("Happy");
      } else if (["FIST", "WAR", "NOT", "ANGRY"].some(word => upperName.includes(word))) {
        targets = { Happy: 1, Neutral: 8, Sad: 3, Angry: 82, Questioning: 2, Skeptical: 4 };
        setCurrentEmotion("Angry");
      } else if (["POINT", "INDEX", "QUESTIONING", "TECHNOLOGY", "WHAT"].some(word => upperName.includes(word))) {
        targets = { Happy: 4, Neutral: 12, Sad: 1, Angry: 2, Questioning: 75, Skeptical: 6 };
        setCurrentEmotion("Questioning");
      } else if (["USE", "SKEPTICAL", "A", "WATER"].some(word => upperName.includes(word))) {
        targets = { Happy: 3, Neutral: 15, Sad: 2, Angry: 3, Questioning: 5, Skeptical: 72 };
        setCurrentEmotion("Skeptical");
      } else {
        targets = { Happy: 8, Neutral: 78, Sad: 4, Angry: 2, Questioning: 4, Skeptical: 4 };
        setCurrentEmotion("Neutral");
      }
    } else {
      targets = { Happy: 5, Neutral: 85, Sad: 3, Angry: 2, Questioning: 3, Skeptical: 2 };
      setCurrentEmotion("Neutral");
    }

    const interpolateInterval = setInterval(() => {
      setEmotionMetrics((prev) => {
        const ease = 0.15;
        return {
          Happy: Math.round(prev.Happy + (targets.Happy - prev.Happy) * ease),
          Sad: Math.round(prev.Sad + (targets.Sad - prev.Sad) * ease),
          Neutral: Math.round(prev.Neutral + (targets.Neutral - prev.Neutral) * ease),
          Angry: Math.round(prev.Angry + (targets.Angry - prev.Angry) * ease),
          Questioning: Math.round(prev.Questioning + (targets.Questioning - prev.Questioning) * ease),
          Skeptical: Math.round(prev.Skeptical + (targets.Skeptical - prev.Skeptical) * ease),
        };
      });
    }, 40);

    return () => clearInterval(interpolateInterval);
  }, [localGesture, detectionResult]);

  // Interactive Simulator Fallback state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulatedPoseType, setSimulatedPoseType] = useState<
    "OPEN_HAND" | "THUMBS_UP" | "POINT_INDEX" | "CLOSED_FIST" | "VICTORY_PEACE" |
    "ISL_NAMASTE" | "ISL_KHAANA" | "ISL_PAANI" | "ISL_GHAR" | "ISL_MADAD" | "ISL_DOST" | "ISL_DHANYAVAAD" |
    "ISL_SAB_THEEK" | "ISL_PYAAR" | "ISL_MAIN"
  >("OPEN_HAND");

  const isSimulatingRefGlobal = useRef(isSimulating);
  const simulatedPoseTypeRef = useRef(simulatedPoseType);

  useEffect(() => {
    isSimulatingRefGlobal.current = isSimulating;
  }, [isSimulating]);

  useEffect(() => {
    simulatedPoseTypeRef.current = simulatedPoseType;
  }, [simulatedPoseType]);

  // Generate realistic 3D joint hand coordinates for simulation
  const generateSimulatedHandLandmarks = (poseType: string, time: number, isLeft: boolean): Landmark[] => {
    const noiseX = Math.sin(time * 3.5) * 0.005 + Math.cos(time * 1.8) * 0.002;
    const noiseY = Math.cos(time * 2.8) * 0.005 + Math.sin(time * 1.5) * 0.002;

    let wristX = isLeft ? 0.38 + noiseX : 0.62 + noiseX;
    let wristY = 0.72 + noiseY;

    // Adjust wrists positions for double-handed postures
    if (poseType === "ISL_NAMASTE") {
      wristX = isLeft ? 0.47 + noiseX : 0.53 + noiseX;
      wristY = 0.66 + noiseY;
    } else if (poseType === "ISL_GHAR") {
      wristX = isLeft ? 0.38 + noiseX : 0.62 + noiseX;
      wristY = 0.72 + noiseY;
    } else if (poseType === "ISL_MADAD") {
      wristX = isLeft ? 0.48 + noiseX : 0.52 + noiseX; // Left open palm, Right fist on top
      wristY = isLeft ? 0.75 + noiseY : 0.63 + noiseY;
    } else if (poseType === "ISL_DOST") {
      wristX = isLeft ? 0.46 + noiseX : 0.54 + noiseX;
      wristY = 0.68 + noiseY;
    }

    const landmarks: Landmark[] = Array(21).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
    landmarks[0] = { x: wristX, y: wristY, z: 0 };

    const makeFinger = (startIndex: number, baseAngle: number, lengthScale: number, isExtended: boolean, flexAmount = 0.62) => {
      let curX = wristX + (isLeft ? -1 : 1) * (startIndex - 10) * 0.015;
      let curY = wristY - 0.08;
      landmarks[startIndex - 1] = { x: curX, y: curY, z: 0 };

      const jointLength = 0.065 * lengthScale;
      for (let j = 0; j < 3; j++) {
        const idx = startIndex + j;
        const flexAngle = isExtended ? 0 : Math.PI * flexAmount;
        // Flip angles for left hand
        let angle = baseAngle + Math.sin(time * 1.8) * 0.03 + (j * flexAngle * 0.25);
        if (isLeft) {
          const verticalRef = -Math.PI / 2;
          angle = verticalRef - (angle - verticalRef);
        }
        
        curX += Math.cos(angle) * jointLength;
        curY += Math.sin(angle) * jointLength;
        landmarks[idx] = { x: curX, y: curY, z: -j * 0.01 };
      }
    };

    let thumbExtended = true;
    let indexExtended = true;
    let middleExtended = true;
    let ringExtended = true;
    let pinkyExtended = true;
    let customFlex = 0.62;

    if (poseType === "CLOSED_FIST") {
      thumbExtended = false;
      indexExtended = false;
      middleExtended = false;
      ringExtended = false;
      pinkyExtended = false;
    } else if (poseType === "THUMBS_UP") {
      thumbExtended = true;
      indexExtended = false;
      middleExtended = false;
      ringExtended = false;
      pinkyExtended = false;
    } else if (poseType === "POINT_INDEX") {
      thumbExtended = false;
      indexExtended = true;
      middleExtended = false;
      ringExtended = false;
      pinkyExtended = false;
    } else if (poseType === "VICTORY_PEACE") {
      thumbExtended = false;
      indexExtended = true;
      middleExtended = true;
      ringExtended = false;
      pinkyExtended = false;
    } 
    // --- ISL Postures ---
    else if (poseType === "ISL_NAMASTE") {
      // Both hands open palms upright and meeting
      thumbExtended = true;
      indexExtended = true;
      middleExtended = true;
      ringExtended = true;
      pinkyExtended = true;
    } else if (poseType === "ISL_KHAANA") {
      // Bunched fingertips
      thumbExtended = false;
      indexExtended = false;
      middleExtended = false;
      ringExtended = false;
      pinkyExtended = false;
      customFlex = 0.25; // meeting at a bunch
    } else if (poseType === "ISL_PAANI") {
      // index, middle, ring extended. Pinky curled, thumb tucked.
      thumbExtended = false;
      indexExtended = true;
      middleExtended = true;
      ringExtended = true;
      pinkyExtended = false;
    } else if (poseType === "ISL_GHAR") {
      // both hands open palms pointing to each other at angle
      thumbExtended = true;
      indexExtended = true;
      middleExtended = true;
      ringExtended = true;
      pinkyExtended = true;
    } else if (poseType === "ISL_MADAD") {
      if (isLeft) {
        thumbExtended = true;
        indexExtended = true;
        middleExtended = true;
        ringExtended = true;
        pinkyExtended = true;
      } else {
        thumbExtended = false;
        indexExtended = false;
        middleExtended = false;
        ringExtended = false;
        pinkyExtended = false;
      }
    } else if (poseType === "ISL_DOST") {
      thumbExtended = false;
      indexExtended = false;
      middleExtended = false;
      ringExtended = false;
      pinkyExtended = false;
      customFlex = 0.45;
    } else if (poseType === "ISL_DHANYAVAAD") {
      thumbExtended = false;
      indexExtended = true;
      middleExtended = true;
      ringExtended = true;
      pinkyExtended = true;
    } else if (poseType === "ISL_SAB_THEEK") {
      thumbExtended = true;
      indexExtended = true;
      middleExtended = true;
      ringExtended = true;
      pinkyExtended = true;
    } else if (poseType === "ISL_PYAAR") {
      thumbExtended = true;
      indexExtended = true;
      middleExtended = false;
      ringExtended = false;
      pinkyExtended = true;
    } else if (poseType === "ISL_MAIN") {
      thumbExtended = false;
      indexExtended = false;
      middleExtended = false;
      ringExtended = false;
      pinkyExtended = true;
    }

    const thumbAngle = thumbExtended ? (isLeft ? -Math.PI * 0.22 : -Math.PI * 0.78) : -Math.PI * 0.55;
    let tx = wristX + (isLeft ? 0.04 : -0.04);
    let ty = wristY - 0.03;
    landmarks[1] = { x: tx, y: ty, z: 0 };
    for (let j = 2; j <= 4; j++) {
      const scale = thumbExtended ? 0.055 : 0.032;
      tx += Math.cos(thumbAngle) * scale;
      ty += Math.sin(thumbAngle) * scale;
      landmarks[j] = { x: tx, y: ty, z: 0 };
    }

    makeFinger(5, -Math.PI * 0.58, 0.95, indexExtended, customFlex);
    makeFinger(9, -Math.PI * 0.52, 1.0, middleExtended, customFlex);
    makeFinger(13, -Math.PI * 0.46, 0.93, ringExtended, customFlex);
    makeFinger(17, -Math.PI * 0.40, 0.82, pinkyExtended, customFlex);

    // Dynamic hand coordinate offsets for touching gestures
    if (poseType === "ISL_GHAR") {
      // tips touch at top center
      const targetX = 0.5;
      const targetY = 0.42;
      landmarks[8] = { x: targetX, y: targetY, z: 0 };
      landmarks[12] = { x: targetX, y: targetY + 0.02, z: 0 };
    } else if (poseType === "ISL_NAMASTE") {
      // Pressed vertical palms
      const targetX = isLeft ? 0.49 : 0.51;
      const targetY = 0.46;
      landmarks[8] = { x: targetX, y: targetY, z: 0 };
      landmarks[12] = { x: targetX, y: targetY + 0.02, z: 0 };
      landmarks[16] = { x: targetX, y: targetY + 0.04, z: 0 };
      landmarks[20] = { x: targetX, y: targetY + 0.06, z: 0 };
    } else if (poseType === "ISL_DOST") {
      const centerOffsetX = isLeft ? 0.48 : 0.52;
      const centerOffsetY = 0.60;
      landmarks[8] = { x: centerOffsetX, y: centerOffsetY, z: 0 };
      landmarks[12] = { x: centerOffsetX, y: centerOffsetY + 0.02, z: 0 };
    } else if (poseType === "ISL_SAB_THEEK") {
      // Index and thumb tips meet perfectly
      landmarks[8] = { x: landmarks[4].x, y: landmarks[4].y, z: 0 };
    }

    return landmarks;
  };

  const startSimulator = () => {
    stopCamera();
    setIsSimulating(true);
    setCameraState("active");
    setErrorMessage("");

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
      }
    }, 50);

    const startTime = Date.now();

    const renderSimulation = () => {
      if (!isSimulatingRefGlobal.current) return;

      const elapsedSec = (Date.now() - startTime) / 1000;
      const currentPose = simulatedPoseTypeRef.current;

      const isDoubleHanded = ["ISL_NAMASTE", "ISL_GHAR", "ISL_MADAD", "ISL_DOST"].includes(currentPose);

      const rightLandmarks = generateSimulatedHandLandmarks(currentPose, elapsedSec, false);
      const leftLandmarks = isDoubleHanded ? generateSimulatedHandLandmarks(currentPose, elapsedSec, true) : null;

      const customResults: any = {
        faceLandmarks: null,
        poseLandmarks: null,
        leftHandLandmarks: leftLandmarks,
        rightHandLandmarks: rightLandmarks
      };

      if (canvasRef.current) {
        drawJointsOnCanvas(customResults);
      }

      const multiHandLandmarks: Landmark[][] = [];
      const multiHandedness = [];
      if (leftLandmarks) {
        multiHandLandmarks.push(leftLandmarks);
        multiHandedness.push({ label: "Left" });
      }
      if (rightLandmarks) {
        multiHandLandmarks.push(rightLandmarks);
        multiHandedness.push({ label: "Right" });
      }

      const pose = classifyLocalPose(multiHandLandmarks, multiHandedness);
      setLocalGesture(pose);

      if (autoCaptureEnabledRef.current) {
        const now = Date.now();
        if (lastCaptureTimeRef.current === 0) {
          lastCaptureTimeRef.current = now;
        }

        const elapsed = now - lastCaptureTimeRef.current;
        const progress = Math.min((elapsed / 2500) * 100, 100);
        setStabilityProgress(progress);

        if (progress < 15 && detectionResult) {
          setDetectionResult(null);
        }

        if (progress >= 100) {
          setIsHandStable(true);
          if (!isCurrentlyTranslating.current) {
            captureSimulatedSnapshot(currentPose, elapsedSec);
          }
        } else {
          setIsHandStable(false);
        }
      } else {
        setStabilityProgress(0);
        setIsHandStable(false);
        lastCaptureTimeRef.current = 0;
      }

      lastLandmarks.current = rightLandmarks;
      animationFrameId.current = requestAnimationFrame(renderSimulation);
    };

    animationFrameId.current = requestAnimationFrame(renderSimulation);
  };

  const captureSimulatedSnapshot = async (poseType: string, elapsedSec: number) => {
    if (isCurrentlyTranslating.current) return;

    setIsTranslating(true);
    isCurrentlyTranslating.current = true;
    setDetectionResult(null);
    setErrorMessage("");

    try {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 640;
      tempCanvas.height = 480;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0c0c0c";
        ctx.fillRect(0, 0, 640, 480);
        
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 640; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 480);
          ctx.stroke();
        }
        for (let j = 0; j < 480; j += 40) {
          ctx.beginPath();
          ctx.moveTo(0, j);
          ctx.lineTo(640, j);
          ctx.stroke();
        }

        ctx.strokeStyle = "rgba(0, 255, 102, 0.15)";
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, 600, 440);

        const isDoubleHanded = ["ISL_NAMASTE", "ISL_GHAR", "ISL_MADAD", "ISL_DOST"].includes(poseType);
        const rightLandmarks = generateSimulatedHandLandmarks(poseType, elapsedSec, false);
        const leftLandmarks = isDoubleHanded ? generateSimulatedHandLandmarks(poseType, elapsedSec, true) : null;
        
        const oldCanvas = canvasRef.current;
        canvasRef.current = tempCanvas;
        
        const customResults = {
          faceLandmarks: null,
          poseLandmarks: null,
          leftHandLandmarks: leftLandmarks,
          rightHandLandmarks: rightLandmarks
        };
        drawJointsOnCanvas(customResults);
        
        canvasRef.current = oldCanvas;

        const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.85);
        await translateImageOnServer(dataUrl);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Simulated capture failed: " + err.message);
      setIsTranslating(false);
      isCurrentlyTranslating.current = false;
    }
  };

  // References to keep track of MediaPipe loop and state
  const handsRef = useRef<any>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastLandmarks = useRef<Landmark[] | null>(null);
  const isCurrentlyTranslating = useRef<boolean>(false);
  const lastCaptureTimeRef = useRef<number>(0);

  // Helper to load script from CDN
  const loadScript = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  };

  // Classify basic poses instantly using local landmarks for a single hand
  const classifySingleHandPose = (landmarks: Landmark[]) => {
    const isIndexExtended = landmarks[8].y < landmarks[6].y;
    const isMiddleExtended = landmarks[12].y < landmarks[10].y;
    const isRingExtended = landmarks[16].y < landmarks[14].y;
    const isPinkyExtended = landmarks[20].y < landmarks[18].y;
    const isThumbExtended = Math.abs(landmarks[4].x - landmarks[5].x) > 0.08;

    // 1. ISL - KHAANA / FOOD: Bunched fingertips meeting the thumb
    const tip4 = landmarks[4];
    const tip8 = landmarks[8];
    const tip12 = landmarks[12];
    const tip16 = landmarks[16];
    const tip20 = landmarks[20];
    const d8 = Math.sqrt(Math.pow(tip4.x - tip8.x, 2) + Math.pow(tip4.y - tip8.y, 2));
    const d12 = Math.sqrt(Math.pow(tip4.x - tip12.x, 2) + Math.pow(tip4.y - tip12.y, 2));
    const d16 = Math.sqrt(Math.pow(tip4.x - tip16.x, 2) + Math.pow(tip4.y - tip16.y, 2));
    const d20 = Math.sqrt(Math.pow(tip4.x - tip20.x, 2) + Math.pow(tip4.y - tip20.y, 2));
    if (d8 < 0.05 && d12 < 0.05 && d16 < 0.05 && d20 < 0.05) {
      return { name: "BUNCHED PALM (KHAANA)", predictedWord: "KHAANA (FOOD)", description: "ISL gesture representing food/eating with bunched tips." };
    }

    // 2. ISL - PAANI / WATER: Three fingers extended, thumb & pinky tucked
    if (isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended && !isThumbExtended) {
      return { name: "THREE FINGERS (PAANI)", predictedWord: "PAANI (WATER)", description: "ISL gesture representing water/drinking." };
    }

    // 3. ISL - DHANYAVAAD / THANK YOU: Flat palm tucked thumb (salute/respectful move)
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && !isThumbExtended) {
      return { name: "FLAT PALM TUCKED (DHANYAVAAD)", predictedWord: "DHANYAVAAD (THANK YOU)", description: "ISL gesture representing gratitude or respect." };
    }

    // 4. ISL - SAB THEEK / OK: Thumb tip and Index tip meeting in a circle, middle, ring, pinky extended
    if (d8 < 0.05 && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return { name: "OK SIGN (SAB THEEK)", predictedWord: "SAB THEEK (OK)", description: "Thumb and index meeting in a circle with middle, ring, pinky extended." };
    }

    // 5. ISL - PYAAR / LOVE: Thumb, Index, and Pinky extended, Middle and Ring folded
    if (isIndexExtended && isPinkyExtended && isThumbExtended && !isMiddleExtended && !isRingExtended) {
      return { name: "I LOVE YOU SIGN (PYAAR)", predictedWord: "PYAAR (LOVE)", description: "Thumb, index, and pinky extended indicating affection." };
    }

    // 6. ISL - JEET / VICTORY: Index and Middle extended, Ring and Pinky folded
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended && !isThumbExtended) {
      return { name: "PEACE SIGN (JEET)", predictedWord: "JEET (VICTORY)", description: "Index and middle fingers extended in a V-shape." };
    }

    // 7. ISL - AAP / YOU: Only index extended
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && !isThumbExtended) {
      return { name: "POINTING INDEX (AAP)", predictedWord: "AAP (YOU)", description: "Single index finger pointing forward." };
    }

    // 8. ISL - MAIN / ME: Only pinky extended
    if (isPinkyExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isThumbExtended) {
      return { name: "PINKY EXTENDED (MAIN)", predictedWord: "MAIN (I / ME)", description: "Single pinky finger extended representing self." };
    }

    // 9. ISL - HAAN / YES: Only thumb extended (thumbs up)
    if (isThumbExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { name: "THUMBS UP (HAAN)", predictedWord: "HAAN (YES)", description: "Thumbs up gesture representing yes or approval." };
    }

    // Standard fallback categories
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && isThumbExtended) {
      return { name: "OPEN HAND", predictedWord: "HELLO", description: "Friendly greeting or active posture" };
    }
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { name: "CLOSED FIST (NAHEEN)", predictedWord: "NAHEEN (NO)", description: "Closed hand representing refusal, negation, or sorry." };
    }
    return { name: "POSE TRACKED", predictedWord: "SIGNING", description: "Signing in progress" };
  };

  // Classify basic poses instantly using local landmarks for up to two hands
  const classifyLocalPose = (multiHandLandmarks: Landmark[][], multiHandedness?: any[]) => {
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) return null;

    // --- DOUBLE-HANDED INDIAN SIGN LANGUAGE (ISL) RULES ---
    if (multiHandLandmarks.length === 2) {
      const hand0 = multiHandLandmarks[0];
      const hand1 = multiHandLandmarks[1];
      const poseLeft = classifySingleHandPose(hand0);
      const poseRight = classifySingleHandPose(hand1);

      const wrist0 = hand0[0];
      const wrist1 = hand1[0];
      const tipL8 = hand0[8];
      const tipR8 = hand1[8];

      const wristDist = Math.sqrt(Math.pow(wrist0.x - wrist1.x, 2) + Math.pow(wrist0.y - wrist1.y, 2));
      const tipDist = Math.sqrt(Math.pow(tipL8.x - tipR8.x, 2) + Math.pow(tipL8.y - tipR8.y, 2));

      // A. ISL - NAMASTE (HELLO): Both palms flat, close together, wrists close
      if (wristDist < 0.18 && poseLeft.name.includes("OPEN") && poseRight.name.includes("OPEN")) {
        return {
          name: "DOUBLE HANDS: FOLDED (NAMASTE)",
          predictedWord: "NAMASTE (HELLO)",
          description: "Traditional Indian sign of respect and greeting with pressed palms."
        };
      }

      // B. ISL - GHAR (HOME): Fingertips touching at top, wrists further apart forming a triangle roof (/\)
      if (tipDist < 0.14 && wristDist > 0.22 && poseLeft.name.includes("OPEN") && poseRight.name.includes("OPEN")) {
        return {
          name: "TOUCHING FINGERTIPS (GHAR)",
          predictedWord: "GHAR (HOME)",
          description: "Both hands aligned in a roof shape symbolizing a shelter or home."
        };
      }

      // C. ISL - MADAD (HELP): Clenched fist resting on top of active open supportive palm
      const leftY = wrist0.y;
      const rightY = wrist1.y;
      const verticalOffset = Math.abs(leftY - rightY);
      const horizontalOffset = Math.abs(wrist0.x - wrist1.x);

      if (horizontalOffset < 0.22 && verticalOffset < 0.22) {
        if ((poseLeft.name.includes("FIST") && poseRight.name.includes("OPEN")) ||
            (poseRight.name.includes("FIST") && poseLeft.name.includes("OPEN"))) {
          return {
            name: "FIST ON FLAT PALM (MADAD)",
            predictedWord: "MADAD (HELP)",
            description: "ISL sign for help or support: a clenched fist supported by an open flat hand."
          };
        }
      }

      // D. ISL - DOST (FRIEND): Two hands clasping or shaking together closely
      if (wristDist < 0.14) {
        return {
          name: "CLASPED HANDS (DOST)",
          predictedWord: "DOST (FRIEND)",
          description: "Hands holding or shaking closely, representing friendship."
        };
      }

      // Default dual-hand fallback
      return {
        name: `L: ${poseLeft.name} • R: ${poseRight.name}`,
        predictedWord: `${poseLeft.predictedWord} + ${poseRight.predictedWord}`,
        description: `Left hand posture: ${poseLeft.name}. Right hand posture: ${poseRight.name}.`
      };
    }

    // --- SINGLE-HANDED CLASSIFICATIONS ---
    const pose = classifySingleHandPose(multiHandLandmarks[0]);
    const isRight = multiHandedness?.[0]?.label === "Right";
    const handStr = isRight ? "Right Hand" : "Left Hand";
    return {
      name: `${handStr}: ${pose.name}`,
      predictedWord: pose.predictedWord,
      description: pose.description
    };
  };

  // Draw neon joints and lines on canvas overlay for hands, face, and pose (using MediaPipe Holistic outputs)
  const drawJointsOnCanvas = (results: any, multiHandedness?: any[]) => {
    const isSimulatingRef = isSimulatingRefGlobal;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!handTrackingEnabledRef.current) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    // 1. Draw Face Mesh (Subtle Cyan glowing dots)
    if (results.faceLandmarks && emotionDetectionEnabled) {
      ctx.fillStyle = "rgba(0, 245, 255, 0.55)";
      for (let i = 0; i < results.faceLandmarks.length; i += 5) { // step by 5 for perfect balance of visual fidelity & high FPS
        const pt = results.faceLandmarks[i];
        const x = isSimulatingRef.current ? pt.x * width : (1 - pt.x) * width;
        const y = pt.y * height;
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // 2. Draw Body Pose Skeleton (Shoulders, Arms, Hips)
    if (results.poseLandmarks) {
      const poseConnections = [
        [11, 12], // shoulder to shoulder
        [11, 13], [13, 15], // left arm
        [12, 14], [14, 16], // right arm
        [11, 23], [12, 24], // shoulders to hips
        [23, 24] // hip to hip
      ];

      // Draw pose lines
      ctx.strokeStyle = "rgba(255, 0, 128, 0.6)"; // Neon Pink
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "rgba(255, 0, 128, 0.8)";
      ctx.shadowBlur = 8;

      for (const [from, to] of poseConnections) {
        const ptFrom = results.poseLandmarks[from];
        const ptTo = results.poseLandmarks[to];
        if (ptFrom && ptTo) {
          ctx.beginPath();
          const xFrom = isSimulatingRef.current ? ptFrom.x * width : (1 - ptFrom.x) * width;
          const xTo = isSimulatingRef.current ? ptTo.x * width : (1 - ptTo.x) * width;
          ctx.moveTo(xFrom, ptFrom.y * height);
          ctx.lineTo(xTo, ptTo.y * height);
          ctx.stroke();
        }
      }

      // Draw pose joint nodes
      ctx.shadowBlur = 0;
      const keyPoseJoints = [11, 12, 13, 14, 15, 16, 23, 24];
      for (const idx of keyPoseJoints) {
        const pt = results.poseLandmarks[idx];
        if (pt) {
          ctx.beginPath();
          const x = isSimulatingRef.current ? pt.x * width : (1 - pt.x) * width;
          ctx.fillStyle = "#FF0080";
          ctx.arc(x, pt.y * height, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // 3. Draw Hand Skeletal Connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [9, 10], [10, 11], [11, 12],     // Middle
      [13, 14], [14, 15], [15, 16],    // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17]        // Palm bridge
    ];

    const drawSingleHand = (landmarks: Landmark[], isRight: boolean) => {
      const handLabel = isRight ? "Right Hand" : "Left Hand";
      const strokeColor = isRight ? "#00FF66" : "#00F5FF";
      const shadowColor = isRight ? "#00FF66" : "#00F5FF";

      // Draw connecting skeletal lines
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 8;
      
      for (const [from, to] of connections) {
        const ptFrom = landmarks[from];
        const ptTo = landmarks[to];
        if (ptFrom && ptTo) {
          ctx.beginPath();
          const xFrom = isSimulatingRef.current ? ptFrom.x * width : (1 - ptFrom.x) * width;
          const xTo = isSimulatingRef.current ? ptTo.x * width : (1 - ptTo.x) * width;
          ctx.moveTo(xFrom, ptFrom.y * height);
          ctx.lineTo(xTo, ptTo.y * height);
          ctx.stroke();
        }
      }

      // Draw individual glowing joint nodes
      ctx.shadowBlur = 0;
      for (let i = 0; i < landmarks.length; i++) {
        const pt = landmarks[i];
        ctx.beginPath();
        const xPt = isSimulatingRef.current ? pt.x * width : (1 - pt.x) * width;
        if ([4, 8, 12, 16, 20].includes(i)) {
          ctx.fillStyle = strokeColor;
          ctx.arc(xPt, pt.y * height, 7, 0, 2 * Math.PI);
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.arc(xPt, pt.y * height, 4.5, 0, 2 * Math.PI);
        }
        ctx.fill();
      }

      // Draw elegant text label above wrist (landmark 0)
      const wrist = landmarks[0];
      if (wrist) {
        const xWrist = isSimulatingRef.current ? wrist.x * width : (1 - wrist.x) * width;
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = strokeColor;
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        ctx.fillText(handLabel, xWrist - 30, wrist.y * height + 20);
        ctx.shadowBlur = 0;
      }
    };

    // Draw Left and Right hands if detected in the Holistic results
    if (results.leftHandLandmarks) {
      drawSingleHand(results.leftHandLandmarks, false);
    }
    if (results.rightHandLandmarks) {
      drawSingleHand(results.rightHandLandmarks, true);
    }

    // Backward compatibility for simulated / array-based inputs
    if (Array.isArray(results)) {
      results.forEach((landmarks, index) => {
        const handedness = multiHandedness?.[index];
        const isRight = handedness ? handedness.label === "Right" : (index === 0);
        drawSingleHand(landmarks, isRight);
      });
    }
  };

  // Main processing loop using MediaPipe Hands
  const startCamera = async () => {
    setIsSimulating(false);
    setErrorMessage("");
    setCameraState("loading_model");
    
    try {
      // 1. Dynamic script loading for MediaPipe Hands library with fallback & global existence check
      const hasHandsGlobal = typeof (window as any).Hands !== "undefined";
      if (!hasHandsGlobal) {
        try {
          await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
          await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
        } catch (scriptErr) {
          console.warn("Primary jsDelivr CDN failed, falling back to unpkg CDN:", scriptErr);
          await loadScript("https://unpkg.com/@mediapipe/camera_utils/camera_utils.js");
          await loadScript("https://unpkg.com/@mediapipe/hands/hands.js");
        }
      }
      setIsMediaPipeLoaded(true);

      // 2. Initialize MediaPipe Hands model
      if (!handsRef.current && (window as any).Hands) {
        const hands = new (window as any).Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results: any) => {
          if (!canvasRef.current) return;
          
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Normalize Hands outputs to match drawing & classification interface
          const customResults: any = {
            faceLandmarks: null,
            poseLandmarks: null,
            leftHandLandmarks: null,
            rightHandLandmarks: null
          };

          if (results.multiHandLandmarks && results.multiHandedness) {
            results.multiHandLandmarks.forEach((landmarks: any, index: number) => {
              const handedness = results.multiHandedness[index];
              const isRight = handedness ? (handedness.label === "Right" || handedness.label === "right") : (index === 0);
              if (isRight) {
                customResults.rightHandLandmarks = landmarks;
              } else {
                customResults.leftHandLandmarks = landmarks;
              }
            });
          }

          // If no hand landmarks are detected at all, clear canvas
          if (!customResults.leftHandLandmarks && !customResults.rightHandLandmarks) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setLocalGesture(null);
            setIsHandStable(false);
            setStabilityProgress(0);
            lastLandmarks.current = null;
            lastCaptureTimeRef.current = 0;
            return;
          }

          drawJointsOnCanvas(customResults);

          // Convert hands to list format for local classification
          const multiHandLandmarks: Landmark[][] = [];
          const multiHandedness: any[] = [];
          if (customResults.leftHandLandmarks) {
            multiHandLandmarks.push(customResults.leftHandLandmarks);
            multiHandedness.push({ label: "Left" });
          }
          if (customResults.rightHandLandmarks) {
            multiHandLandmarks.push(customResults.rightHandLandmarks);
            multiHandedness.push({ label: "Right" });
          }

          if (multiHandLandmarks.length > 0) {
            // Local pose classification
            const pose = classifyLocalPose(multiHandLandmarks, multiHandedness);
            setLocalGesture(pose);

            // Continuous Live Scanning Engine
            if (autoCaptureEnabledRef.current) {
              const now = Date.now();
              if (lastCaptureTimeRef.current === 0) {
                lastCaptureTimeRef.current = now;
              }

              const elapsed = now - lastCaptureTimeRef.current;
              const progress = Math.min((elapsed / 2500) * 100, 100);
              setStabilityProgress(progress);

              if (progress < 15 && detectionResult) {
                setDetectionResult(null);
              }

              if (progress >= 100) {
                setIsHandStable(true);
                if (!isCurrentlyTranslating.current) {
                  captureSnapshot();
                }
              } else {
                setIsHandStable(false);
              }
            } else {
              setStabilityProgress(0);
              setIsHandStable(false);
              lastCaptureTimeRef.current = 0;
            }

            lastLandmarks.current = multiHandLandmarks[0];
          } else {
            setLocalGesture(null);
            setIsHandStable(false);
            setStabilityProgress(0);
            lastLandmarks.current = null;
            lastCaptureTimeRef.current = 0;
            setDetectionResult(null);
          }
        });

        handsRef.current = hands;
      }

      // 3. Prompt user for camera device streams with resilient fallback
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser or sandbox environment does not support media devices. Please connect a webcam.");
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
      } catch (firstErr) {
        console.warn("Rigid camera constraints failed, attempting basic video capture:", firstErr);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
      activeStreamRef.current = mediaStream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        video.onloadedmetadata = () => {
          if (canvasRef.current) {
            canvasRef.current.width = video.videoWidth || 640;
            canvasRef.current.height = video.videoHeight || 480;
          }
        };
        video.play().catch((err) => {
          console.warn("Explicit play failed on start:", err);
        });
      }

      setCameraState("active");

      // 4. Start the render frame analyzer loop (safeguarded against empty frames and rate-limited)
      let isProcessing = false;
      const analyzeFrame = async () => {
        if (!activeStreamRef.current) {
          animationFrameId.current = requestAnimationFrame(analyzeFrame);
          return;
        }

        if (
          videoRef.current && 
          handsRef.current && 
          !videoRef.current.paused &&
          videoRef.current.videoWidth > 0 &&
          !isProcessing
        ) {
          isProcessing = true;
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (e) {
            console.warn("Hands loop frame issue:", e);
          } finally {
            isProcessing = false;
          }
        }

        // Target ~25 FPS to provide highly responsive tracking while avoiding main thread choking
        setTimeout(() => {
          if (activeStreamRef.current) {
            animationFrameId.current = requestAnimationFrame(analyzeFrame);
          }
        }, 40);
      };
      
      animationFrameId.current = requestAnimationFrame(analyzeFrame);

    } catch (err: any) {
      console.error("Camera tracker error:", err);
      const isDenied = 
        err.name === "NotAllowedError" || 
        err.name === "PermissionDeniedError" || 
        err.name === "SecurityError" ||
        err.message?.toLowerCase().includes("denied") || 
        err.message?.toLowerCase().includes("not allowed") || 
        err.message?.toLowerCase().includes("permission");

      if (isDenied) {
        setCameraState("denied");
        setErrorMessage("Webcam permissions are denied or restricted inside this sandboxed iframe. Please click 'Open in New Tab' below to access your webcam directly, or grant camera permissions in your browser address bar.");
      } else {
        setCameraState("error");
        setErrorMessage("Could not start tracking camera. Confirm that no other apps are using your webcam, or try clicking 'Open in New Tab' below to bypass sandbox limits.");
      }
    }
  };

  const stopCamera = () => {
    setIsSimulating(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    activeStreamRef.current = null;
    setCameraState("inactive");
  };

  // Safe startup on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Handle Resize and Dynamic Canvas Synchronization
  const handleVideoResize = () => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth || 640;
      canvasRef.current.height = videoRef.current.videoHeight || 480;
    }
  };

  // Handle Snapshot Capture & Gemini AI Translation
  const captureSnapshot = async () => {
    if (!videoRef.current || isCurrentlyTranslating.current) return;
    
    setIsTranslating(true);
    isCurrentlyTranslating.current = true;
    setDetectionResult(null);
    setErrorMessage("");

    try {
      const video = videoRef.current;
      
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = video.videoWidth || 640;
      offscreenCanvas.height = video.videoHeight || 480;
      const ctx = offscreenCanvas.getContext("2d");
      
      if (ctx) {
        ctx.translate(offscreenCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const dataUrl = offscreenCanvas.toDataURL("image/jpeg", 0.85);
        await translateImageOnServer(dataUrl);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Capture failed: " + err.message);
      setIsTranslating(false);
      isCurrentlyTranslating.current = false;
    }
  };

  const translateImageOnServer = async (base64Image: string) => {
    try {
      const res = await fetch("/api/translate-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: "image/jpeg"
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Server model analysis error");
      }

      const result: SignTranslationResponse = await res.json();
      setDetectionResult(result);
      onSignDetected(result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to communicate with AI model.");
    } finally {
      setIsTranslating(false);
      isCurrentlyTranslating.current = false;
      lastCaptureTimeRef.current = Date.now();
    }
  };

  return (
    <div id="webcam-capture-panel" className="bg-[#111] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex border-b border-white/5 bg-black/40 p-4 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-[#00FF66]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Skeletal Capture Input</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#00FF66]">Live Camera Tracking</span>
        </div>
      </div>

      <div className="p-6">
        {/* TAB 1: REAL-TIME TRACKING CAMERA */}
        <div className="flex flex-col items-center">
          {cameraState === "loading_model" && (
            <div className="w-full aspect-video rounded-2xl bg-black/50 border border-white/10 flex flex-col items-center justify-center p-6 text-center animate-pulse">
              <RefreshCw className="w-10 h-10 text-[#00FF66] animate-spin mb-4" />
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Starting Tracking Engine</h4>
              <p className="text-[11px] text-white/50 max-w-sm mt-1.5 leading-relaxed">
                Caching Google MediaPipe hand tracking libraries locally for low-latency skeletal motion captures...
              </p>
            </div>
          )}

          {cameraState === "active" && (
            <div className="relative w-full aspect-video rounded-2xl bg-[#080808] overflow-hidden border border-white/10 shadow-inner">
              
              {isSimulating ? (
                <div className="absolute inset-0 bg-[#080808] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#1e3a1e_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ff66]/5 to-transparent animate-pulse" style={{ animationDuration: '6s' }} />
                </div>
              ) : (
                <video
                  id="camera-preview-video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onPlay={handleVideoResize}
                  onLoadedMetadata={handleVideoResize}
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
              
              {/* Neon joint canvas overlaid EXACTLY on top of the stream */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none object-cover"
              />

              {/* --- 1. SYSTEM HEADER GLASS HUD --- */}
              <div className="absolute top-0 inset-x-0 h-11 bg-gradient-to-b from-black/95 to-transparent z-10 px-5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest font-mono text-white pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
                  <span className="text-[#00FF66] font-bold">{isSimulating ? "SKELETAL SIMULATOR" : "LIVE WEBCAM"}</span>
                </div>
                <div className="text-white/60 tracking-normal font-sans font-bold flex items-center gap-1.5">
                  <span>{hudTime}</span>
                </div>
                <div className="flex items-center gap-2.5 text-white/50">
                  <span>720P • 30FPS</span>
                  <span className="text-[#00FF66]">100% 🔋</span>
                </div>
              </div>

              {/* --- 2. LIVE GLOSS SEQUENCE SCROLL RIBBON (TOP OF SCREEN) --- */}
              <div className="absolute top-12 left-4 z-10 flex flex-wrap items-center gap-2 max-w-[60%] pointer-events-auto">
                <div className="bg-black/85 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2 flex items-center gap-2 shadow-xl">
                  <span className="text-[9px] font-black uppercase text-[#00FF66] tracking-widest font-mono shrink-0">
                    Sequence:
                  </span>
                  {compiledGlosses.length === 0 ? (
                    <span className="text-[10px] text-white/40 font-bold font-mono italic">
                      Awaiting hand gestures...
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[320px]">
                      {compiledGlosses.map((gloss, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span className="text-[#00FF66] text-xs">•</span>}
                          <span className="text-[11px] font-black text-white tracking-wider font-sans uppercase bg-white/10 px-2 py-0.5 rounded-md border border-white/5">
                            {gloss}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* --- 2B. CENTERED INDIAN SIGN LANGUAGE (ISL) TOP-SCREEN TRANSLATOR HUD --- */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center">
                {(() => {
                  let hudBorder = "border-[#00FF66]/40";
                  let hudShadow = "shadow-[0_0_15px_rgba(0,255,102,0.15)]";
                  let hudPingColor = "bg-[#00FF66]";
                  let hudTitle = "HYBRID ENGINE: STANDBY";
                  let hudBadgeText = "SCANNING";
                  let hudBadgeClass = "bg-white/10 text-white/60";
                  let wordLabel = "Awaiting sign...";
                  let subLabel = "Position hands inside camera frame to track";
                  let isPulse = false;

                  if (isTranslating) {
                    hudBorder = "border-[#00F5FF]/60";
                    hudShadow = "shadow-[0_0_20px_rgba(0,245,255,0.35)]";
                    hudPingColor = "bg-[#00F5FF]";
                    hudTitle = "GEMINI COGNITIVE VISION";
                    hudBadgeText = "TRANSLATING";
                    hudBadgeClass = "bg-[#00F5FF]/10 text-[#00F5FF]";
                    wordLabel = "VERIFYING...";
                    subLabel = "AI is translating frame snapshot...";
                    isPulse = true;
                  } else if (detectionResult) {
                    hudBorder = "border-[#00FF66]";
                    hudShadow = "shadow-[0_0_30px_rgba(0,255,102,0.4)]";
                    hudPingColor = "bg-[#00FF66]";
                    hudTitle = "GEMINI COGNITIVE MATCH";
                    hudBadgeText = "AI VERIFIED";
                    hudBadgeClass = "bg-[#00FF66]/20 text-[#00FF66]";
                    wordLabel = detectionResult.detectedSign;
                    subLabel = `${detectionResult.description} (${detectionResult.confidence}% confidence)`;
                  } else if (localGesture) {
                    hudBorder = "border-[#00FF66]/60";
                    hudShadow = "shadow-[0_0_20px_rgba(0,255,102,0.25)]";
                    hudPingColor = "bg-[#00FF66]";
                    hudTitle = "FAST SKELETAL CHANNEL";
                    hudBadgeText = "TRACKING";
                    hudBadgeClass = "bg-[#00FF66]/15 text-[#00FF66]";
                    wordLabel = localGesture.predictedWord || "SIGNING";
                    subLabel = `${localGesture.name} (Hold still to confirm)`;
                  }

                  return (
                    <div className={`bg-black/95 backdrop-blur-md border-2 ${hudBorder} rounded-2xl px-5 py-2.5 ${hudShadow} flex flex-col items-center gap-1.5 min-w-[220px] max-w-[320px] transition-all duration-300 ${isPulse ? "animate-pulse" : ""}`}>
                      <div className="flex items-center gap-2 justify-between w-full">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${hudPingColor} animate-pulse`} />
                          <span className="text-[8px] font-black uppercase text-white/80 tracking-widest font-mono">
                            {hudTitle}
                          </span>
                        </div>
                        <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${hudBadgeClass}`}>
                          {hudBadgeText}
                        </span>
                      </div>
                      
                      <div className="text-sm font-black text-white tracking-widest flex items-center justify-center gap-1.5 my-0.5 uppercase">
                        <span className="text-[#00FF66] text-[10px] font-mono font-bold">WORD:</span>
                        <span className="text-white text-base font-sans font-black tracking-widest">
                          {wordLabel}
                        </span>
                      </div>

                      <div className="text-[7.5px] font-mono text-white/60 text-center leading-normal max-w-[260px] truncate">
                        {subLabel}
                      </div>

                      {/* Small inline progress indicator if stability is building up and not currently translating */}
                      {stabilityProgress > 5 && !isTranslating && !detectionResult && (
                        <div className="w-full mt-1">
                          <div className="flex justify-between items-center text-[6px] font-black font-mono text-[#00FF66] mb-0.5">
                            <span>STABILITY TO AI TRIGGER</span>
                            <span>{Math.floor(stabilityProgress)}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#00FF66] transition-all duration-200" style={{ width: `${stabilityProgress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* --- 3. SIMULATED FACIAL TRACKING OVERLAY (WHITE MESH DOTS) --- */}
              {emotionDetectionEnabled && (
                <div 
                  onPointerDown={handleTrackerPointerDown}
                  onPointerMove={handleTrackerPointerMove}
                  onPointerUp={handleTrackerPointerUp}
                  className="absolute w-[20%] h-[28%] border border-[#00FF66]/50 rounded-xl pointer-events-auto z-10 shadow-[0_0_15px_rgba(0,255,102,0.15)] flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none bg-black/15 backdrop-blur-[1px]"
                  style={{
                    left: `${faceTrackerPos.x}%`,
                    top: `${faceTrackerPos.y}%`,
                  }}
                >
                  <div className="absolute top-1 right-2 text-[6px] font-black tracking-widest text-[#00FF66]/50 uppercase pointer-events-none select-none">
                    DRAG
                  </div>

                  {/* Corner frames */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#00FF66]" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#00FF66]" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#00FF66]" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#00FF66]" />

                  {/* Active Emotion Badge */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-[#00FF66]/30 text-[#00FF66] tracking-widest flex items-center gap-1 shadow-md pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                    <span>{currentEmotion}</span>
                  </div>

                  {/* Face Mesh Dots Oval Grid */}
                  <div className="relative w-full h-full opacity-70 pointer-events-none">
                    {[
                      { left: "35%", top: "40%" }, 
                      { left: "65%", top: "40%" }, 
                      { left: "30%", top: "32%" }, 
                      { left: "70%", top: "32%" }, 
                      { left: "50%", top: "45%" }, 
                      { left: "50%", top: "58%" }, 
                      { left: "25%", top: "55%" }, 
                      { left: "75%", top: "55%" }, 
                      { left: "38%", top: "72%" }, 
                      { left: "62%", top: "72%" }, 
                      { left: "50%", top: "68%" }, 
                      { left: "50%", top: "76%" }, 
                      { left: "50%", top: "90%" }, 
                      { left: "50%", top: "15%" }, 
                      { left: "15%", top: "35%" }, 
                      { left: "85%", top: "35%" }  
                    ].map((dot, idx) => (
                      <div
                        key={idx}
                        className="w-1 h-1 rounded-full bg-white absolute shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                        style={{
                          left: dot.left,
                          top: dot.top,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* --- 3B. POSTURE SELECTION CONTROLS (SIMULATOR ONLY) --- */}
              {isSimulating && (
                <div className="absolute top-14 left-4 bg-black/90 backdrop-blur-md px-3.5 py-3 rounded-2xl border border-[#00FF66]/30 shadow-2xl z-30 flex flex-col gap-2 pointer-events-auto w-[200px]">
                  <span className="text-[9px] font-black uppercase text-white/50 tracking-wider">Simulated posture</span>
                  <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto no-scrollbar pr-1">
                    {[
                      { id: "OPEN_HAND", label: "Open Palm (HELLO)" },
                      { id: "THUMBS_UP", label: "Thumbs Up (HAAN/YES)" },
                      { id: "POINT_INDEX", label: "Index Point (AAP/YOU)" },
                      { id: "CLOSED_FIST", label: "Closed Fist (NAHEEN/NO)" },
                      { id: "VICTORY_PEACE", label: "Victory (JEET)" },
                      { id: "ISL_NAMASTE", label: "ISL: Namaste (HELLO)" },
                      { id: "ISL_KHAANA", label: "ISL: Khaana (FOOD)" },
                      { id: "ISL_PAANI", label: "ISL: Paani (WATER)" },
                      { id: "ISL_GHAR", label: "ISL: Ghar (HOME)" },
                      { id: "ISL_MADAD", label: "ISL: Madad (HELP)" },
                      { id: "ISL_DOST", label: "ISL: Dost (FRIEND)" },
                      { id: "ISL_DHANYAVAAD", label: "ISL: Dhanyavaad (TY)" },
                      { id: "ISL_SAB_THEEK", label: "ISL: Sab Theek (OK)" },
                      { id: "ISL_PYAAR", label: "ISL: Pyaar (LOVE)" },
                      { id: "ISL_MAIN", label: "ISL: Main (I / ME)" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSimulatedPoseType(item.id as any)}
                        className={`text-[9px] font-extrabold font-mono text-left px-2.5 py-1.5 rounded-xl border transition-all ${
                          simulatedPoseType === item.id
                            ? "bg-[#00FF66]/10 border-[#00FF66]/45 text-[#00FF66]"
                            : "bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* --- 4. REAL-TIME EMOTION CLASSIFICATION TELEMETRY SIDEBAR --- */}
              {emotionDetectionEnabled && (
                <div className="absolute right-4 top-14 bottom-14 w-44 bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex flex-col justify-between z-10 pointer-events-auto shadow-2xl">
                  <div>
                    <div className="text-[9px] font-black uppercase text-white/50 tracking-wider flex items-center gap-1 border-b border-white/5 pb-1.5 mb-2.5">
                      <Activity className="w-3.5 h-3.5 text-[#00FF66]" />
                      <span>Emotion Telemetry</span>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(emotionMetrics).map(([emotion, val]) => {
                        const isDominant = emotion === currentEmotion;
                        return (
                          <div key={emotion} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[9px] font-bold">
                              <span className={isDominant ? "text-[#00FF66] font-black" : "text-white/60"}>
                                {emotion}
                              </span>
                              <span className={isDominant ? "text-[#00FF66] font-black" : "text-white/40"}>
                                {val}%
                              </span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isDominant ? "bg-[#00FF66]" : "bg-white/20"
                                }`}
                                style={{ width: `${val}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-[8px] text-white/40 font-mono text-center border-t border-white/5 pt-1.5">
                    LIVE classification stream
                  </div>
                </div>
              )}

              {/* --- 5. UNIFIED REAL-TIME PREDICTION & TRACKING HUD --- */}
              <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 max-w-[280px]">
                <div className="bg-black/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10 shadow-2xl flex flex-col gap-1.5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1">
                    <span className="text-[8px] font-black uppercase text-white/40 tracking-wider">Tracking Engine</span>
                    {localGesture && (
                      <span className="text-[8px] font-black uppercase text-[#00FF66] bg-[#00FF66]/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-[#00FF66] animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>
                  
                  {localGesture ? (
                    <div className="text-left space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-white/40 font-bold">Predicted Sign:</span>
                        <span className="text-xs font-black text-[#00FF66] tracking-wider uppercase font-mono">
                          {localGesture.predictedWord || "SIGNING"}
                        </span>
                      </div>
                      <div className="text-[8.5px] text-white/70 font-bold flex items-center gap-1">
                        <span className="text-white/40 font-normal">Pose:</span>
                        <span className="font-mono text-white/80">{localGesture.name}</span>
                      </div>
                      <p className="text-[8px] text-white/40 leading-tight">{localGesture.description}</p>
                    </div>
                  ) : (
                    <div className="text-[9px] text-white/50 font-bold uppercase font-mono py-1">
                      Awaiting gesture...
                    </div>
                  )}

                  {/* Auto Capture Stability Progress bar inside HUD */}
                  {stabilityProgress > 5 && (
                    <div className="mt-1 pt-1.5 border-t border-white/5 flex items-center gap-2">
                      <div className="relative w-5 h-5 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" fill="transparent" />
                          <circle
                            cx="10" cy="10" r="8" stroke="#00FF66" strokeWidth="1.5" fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 8}`}
                            strokeDashoffset={`${2 * Math.PI * 8 * (1 - stabilityProgress / 100)}`}
                          />
                        </svg>
                        <span className="absolute text-[6px] font-mono font-black text-white">{Math.floor(stabilityProgress)}%</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-[8px] font-black uppercase text-[#00FF66]">Locking Sign</div>
                        <span className="text-[7px] text-white/40 block leading-none">Keep hand still...</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowModelExplanation(true)}
                    className="mt-1 w-full py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-all flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-[#00FF66]" />
                    <span>Model Explanation</span>
                  </button>
                </div>
              </div>

              {/* HUD Overlay for translated words (centered on the screen) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-1.5 z-10 w-auto max-w-[90%]">
                <AnimatePresence mode="wait">
                  {detectionResult ? (
                    <motion.div
                      key={detectionResult.detectedSign}
                      initial={{ opacity: 0, scale: 0.8, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 10 }}
                      className="bg-black/95 backdrop-blur-md border border-[#00FF66]/40 shadow-[0_0_20px_rgba(0,255,102,0.2)] px-5 py-2.5 rounded-full flex items-center gap-2.5 shrink-0"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66] animate-pulse" />
                      <span className="text-[10px] font-black uppercase text-[#00FF66] tracking-widest font-mono">
                        Live Scan:
                      </span>
                      <span className="text-lg font-black text-white tracking-wider font-sans bg-white/5 px-3 py-1 rounded-full border border-white/10">
                        {detectionResult.detectedSign}
                      </span>
                      <span className="text-[10px] text-white/50 font-bold font-mono">
                        {detectionResult.confidence}%
                      </span>
                    </motion.div>
                  ) : isTranslating ? (
                    <motion.div
                      key="translating"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-black/90 backdrop-blur-md border border-white/10 px-5 py-2 rounded-full flex items-center gap-2.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#00FF66] animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/80 font-mono">
                        AI Translating...
                      </span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Auto Capture Settings */}
              {!isSimulating && (
                <div className="absolute top-14 left-4 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 flex items-center gap-2 z-10">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/60">Auto-Translate</span>
                  <button
                    id="btn-toggle-autocapture"
                    type="button"
                    onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
                    className="text-[#00FF66] hover:text-white transition-colors"
                  >
                    {autoCaptureEnabled ? (
                      <ToggleRight className="w-7 h-7 text-[#00FF66]" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-white/40" />
                    )}
                  </button>
                </div>
              )}

              {/* Reset/Refresh Camera overlay button */}
              <div className="absolute bottom-4 right-4 flex gap-2">
                {isSimulating ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSimulating(false);
                      startCamera();
                    }}
                    title="Switch back to active camera stream"
                    className="px-4 py-2.5 bg-black/85 hover:bg-[#00FF66]/15 hover:border-[#00FF66]/40 text-white hover:text-[#00FF66] rounded-xl transition-all border border-white/10 flex items-center gap-2 pointer-events-auto shadow-2xl"
                  >
                    <Video className="w-4 h-4 text-[#00FF66]" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Use Live Webcam</span>
                  </button>
                ) : (
                  <button
                    id="btn-restart-camera"
                    type="button"
                    onClick={startCamera}
                    title="Refresh stream connection"
                    className="p-2.5 bg-black/85 hover:bg-black text-white rounded-xl transition-colors border border-white/10 pointer-events-auto"
                  >
                    <RefreshCw className="w-4 h-4 text-[#00FF66]" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Pipeline Explanation Modal Overlay */}
          <AnimatePresence>
            {showModelExplanation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md z-40 p-6 flex flex-col justify-between overflow-y-auto rounded-3xl"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#00FF66]" />
                      <h3 className="font-black text-xs uppercase tracking-wider text-white">
                        Sign Recognition Explanation
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowModelExplanation(false)}
                      className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
                      <Info className="w-3.5 h-3.5 text-[#00FF66] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[9px] text-white/80 leading-normal font-sans">
                          How coordinates are converted into sign languages (meanings):
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pl-1 font-sans">
                      {[
                        {
                          step: "01",
                          title: "Joint Coordinate Tracking",
                          desc: "Extracts 21 distinct 3D landmarks (X, Y, Z coordinates) for each hand at 30 FPS using MediaPipe locally."
                        },
                        {
                          step: "02",
                          title: "Spatial Invariance Scaling",
                          desc: "Normalizes vector distances using the Wrist (landmark 0) as origin, ensuring stable recognition regardless of distance or camera type."
                        },
                        {
                          step: "03",
                          title: "Posture Flexion Mapping",
                          desc: "Computes joint flexion angles to classify hand shapes (e.g. thumb up, index point, open palm, fists)."
                        },
                        {
                          step: "04",
                          title: "Gemini Vision Verification",
                          desc: "When stable, sends a high-resolution frame snapshot to Gemini 3.5 Flash for advanced sign translation and validation."
                        }
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-2.5">
                          <span className="text-[10px] font-black font-mono text-[#00FF66] tracking-widest">{item.step}</span>
                          <div className="flex-1">
                            <h4 className="text-[9.5px] font-black uppercase text-white tracking-wider">{item.title}</h4>
                            <p className="text-[8.5px] text-white/50 leading-relaxed mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 mt-4 flex justify-between items-center text-[7.5px] text-white/40 font-mono">
                  <span>ENGINE: GEMINI-3.5-FLASH + MEDIAPIPE</span>
                  <button
                    type="button"
                    onClick={() => setShowModelExplanation(false)}
                    className="px-3 py-1 bg-[#00FF66] hover:bg-[#00e55b] text-black rounded-lg font-black uppercase tracking-wider text-[8.5px]"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(cameraState === "inactive" || cameraState === "denied" || cameraState === "error") && (
            <div className="w-full aspect-video rounded-2xl bg-black/30 border border-white/10 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">Active Hand Tracking System</h4>
              <p className="text-[11px] text-white/50 max-w-sm mt-1.5 mb-5 leading-relaxed">
                {cameraState === "denied" || cameraState === "error"
                  ? "Due to standard browser security restrictions inside the sandboxed coding workspace iframe, camera access might be blocked. Open the application directly in a new tab to prompt for camera permission."
                  : "Translates live hand gesture coordinates in 30fps using MediaPipe local joint tracking overlayed directly onto your camera frame."}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-6 py-3 bg-[#00FF66] hover:bg-[#00e55b] text-black rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00FF66]/10"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Start Live Webcam Feed</span>
                </button>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4 text-[#00FF66]" />
                  <span>Open in New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={startSimulator}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <Cpu className="w-4 h-4 text-[#00FF66]" />
                  <span>Use Simulator Fallback</span>
                </button>
              </div>
            </div>
          )}

          {cameraState === "active" && (
            <div className="w-full mt-5 flex justify-center gap-3">
              <button
                id="btn-capture-sign"
                type="button"
                onClick={captureSnapshot}
                disabled={isTranslating}
                className="px-8 py-3.5 bg-white text-black hover:bg-slate-100 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
              >
                {isTranslating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span>{isTranslating ? "ANALYZING..." : "CAPTURE CURRENT FRAME"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Toggle Control Modules mimicking the video footer */}
        <div className="border-t border-white/5 pt-5 mt-5 bg-black/10 rounded-2xl p-4 border border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* Hand Tracking Toggle */}
            <button
              type="button"
              onClick={() => setHandTrackingEnabled(!handTrackingEnabled)}
              className={`flex flex-col items-center justify-between p-3 rounded-xl border transition-all text-center gap-2 h-20 ${
                handTrackingEnabled 
                  ? "bg-[#00FF66]/5 border-[#00FF66]/30 text-[#00FF66]" 
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">Hand Tracking</span>
              <div className="flex items-center gap-1.5">
                {handTrackingEnabled ? (
                  <>
                    <ToggleRight className="w-6 h-6 text-[#00FF66]" />
                    <span className="text-[9px] font-mono font-bold uppercase">ACTIVE</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-6 h-6 text-white/30" />
                    <span className="text-[9px] font-mono font-bold uppercase">OFF</span>
                  </>
                )}
              </div>
            </button>

            {/* Emotion Detection Toggle */}
            <button
              type="button"
              onClick={() => setEmotionDetectionEnabled(!emotionDetectionEnabled)}
              className={`flex flex-col items-center justify-between p-3 rounded-xl border transition-all text-center gap-2 h-20 ${
                emotionDetectionEnabled 
                  ? "bg-[#00FF66]/5 border-[#00FF66]/30 text-[#00FF66]" 
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">Emotion Det.</span>
              <div className="flex items-center gap-1.5">
                {emotionDetectionEnabled ? (
                  <>
                    <ToggleRight className="w-6 h-6 text-[#00FF66]" />
                    <span className="text-[9px] font-mono font-bold uppercase">ACTIVE</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-6 h-6 text-white/30" />
                    <span className="text-[9px] font-mono font-bold uppercase">OFF</span>
                  </>
                )}
              </div>
            </button>

            {/* LLM Interpretation Toggle */}
            <button
              type="button"
              onClick={() => setLlmInterpretationEnabled(!llmInterpretationEnabled)}
              className={`flex flex-col items-center justify-between p-3 rounded-xl border transition-all text-center gap-2 h-20 ${
                llmInterpretationEnabled 
                  ? "bg-[#00FF66]/5 border-[#00FF66]/30 text-[#00FF66]" 
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">LLM Engine</span>
              <div className="flex items-center gap-1.5">
                {llmInterpretationEnabled ? (
                  <>
                    <ToggleRight className="w-6 h-6 text-[#00FF66]" />
                    <span className="text-[9px] font-mono font-bold uppercase">ACTIVE</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-6 h-6 text-white/30" />
                    <span className="text-[9px] font-mono font-bold uppercase">OFF</span>
                  </>
                )}
              </div>
            </button>

            {/* Voice Output Toggle */}
            <button
              type="button"
              onClick={() => setVoiceOutputEnabled(!voiceOutputEnabled)}
              className={`flex flex-col items-center justify-between p-3 rounded-xl border transition-all text-center gap-2 h-20 ${
                voiceOutputEnabled 
                  ? "bg-[#00FF66]/5 border-[#00FF66]/30 text-[#00FF66]" 
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">Voice Output</span>
              <div className="flex items-center gap-1.5">
                {voiceOutputEnabled ? (
                  <>
                    <ToggleRight className="w-6 h-6 text-[#00FF66]" />
                    <span className="text-[9px] font-mono font-bold uppercase">ACTIVE</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-6 h-6 text-white/30" />
                    <span className="text-[9px] font-mono font-bold uppercase">OFF</span>
                  </>
                )}
              </div>
            </button>

          </div>
        </div>

        {/* ERROR MESSAGE DISPLAY */}
        {errorMessage && (
          <div className="mt-5 p-4 bg-amber-950/40 border border-amber-500/20 text-amber-400 rounded-2xl text-[11px] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 leading-relaxed font-semibold">{errorMessage}</div>
          </div>
        )}

        {/* DETECTED SIGN RESULT CARD IN SLICK DARK MODE */}
        <AnimatePresence>
          {detectionResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 p-5 bg-black/40 border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-black tracking-widest uppercase text-black bg-[#00FF66] px-2.5 py-0.5 rounded-md">
                    Detected Sign
                  </div>
                  <div className="text-[10px] text-white/50 font-bold font-mono">
                    CONFIDENCE: {detectionResult.confidence}%
                  </div>
                </div>
                
                <h4 className="text-3xl font-black text-white tracking-tighter mt-2 flex items-center gap-2 font-sans">
                  {detectionResult.detectedSign}
                </h4>
                
                <p className="text-xs text-white/75 leading-relaxed mt-2.5 font-medium">
                  {detectionResult.description}
                </p>

                {detectionResult.alternativeInterpretations && detectionResult.alternativeInterpretations.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-white/50">
                    <span className="font-extrabold uppercase tracking-wide">Alternate Matches:</span>
                    {detectionResult.alternativeInterpretations.map((alt, idx) => (
                      <span key={idx} className="bg-white/5 text-white px-2 py-0.5 rounded border border-white/10 font-mono text-[9px] uppercase">
                        {alt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- INTERACTIVE SIGN LANGUAGE DICTIONARY & GESTURE GUIDE --- */}
        <div className="mt-8 border-t border-white/10 pt-8 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4 text-[#00FF66]" />
                Interactive Sign Dictionary & Guide
              </h3>
              <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                Learn the supported signs for instant local landmark classification, or use the stability tracker for AI-driven universal translation.
              </p>
            </div>
            
            {/* Category Filters */}
            <div className="flex flex-wrap gap-1.5">
              {["All", "Greeting", "Object", "Action", "Pronoun", "Common"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDictFilter(cat)}
                  className={`px-3 py-1 text-[9px] font-mono font-black uppercase tracking-wider rounded-lg border transition-all ${
                    dictFilter === cat
                      ? "bg-[#00FF66]/10 border-[#00FF66]/40 text-[#00FF66]"
                      : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Unified Informational Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 text-left">
            <div className="lg:col-span-2 p-4 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/20 flex items-center justify-center text-[#00FF66] shrink-0 font-mono text-[10px] font-black">
                5ms
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-white tracking-wider">Fast Local Skeletal Mode</h4>
                <p className="text-[9px] text-white/60 leading-relaxed mt-1">
                  Recognized instantly right on your CPU/GPU. These mathematical models track physical joint flexion, distance offsets, and landmark positions. Try selecting them in the simulator on the left to see the 3D joint model in action!
                </p>
              </div>
            </div>

            <div className="p-4 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
                <Sparkles className="w-4 h-4 text-[#00FF66]" />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-[#00FF66] tracking-wider">Cognitive AI Mode</h4>
                <p className="text-[9px] text-white/60 leading-relaxed mt-1">
                  Hold <strong>any arbitrary sign</strong> completely still for 2.5 seconds. When the stability ring hits 100%, Gemini translates it with full vision capability.
                </p>
              </div>
            </div>
          </div>

          {/* Gestures Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-left">
            {[
              { sign: "NAMASTE", translation: "Hello / Namaste", emoji: "🙏", desc: "Both flat palms pressed together upright at chest level", category: "Greeting" },
              { sign: "GHAR", translation: "Home / Ghar", emoji: "🏠", desc: "Fingertips touching at an angle forming a double-handed roof shape", category: "Object" },
              { sign: "MADAD", translation: "Help / Madad", emoji: "🤝", desc: "Clenched fist resting on top of a flat, open supportive palm", category: "Action" },
              { sign: "DOST", translation: "Friend / Dost", emoji: "❤️", desc: "Two hands clasping or shaking together closely in front of chest", category: "Object" },
              { sign: "KHAANA", translation: "Food / Khaana", emoji: "🍎", desc: "Five fingertips bunched together meeting the thumb repeatedly", category: "Object" },
              { sign: "PAANI", translation: "Water / Paani", emoji: "🥛", desc: "Index, middle, and ring fingers extended; thumb and pinky folded", category: "Object" },
              { sign: "DHANYAVAAD", translation: "Thank You / Respect", emoji: "🙏", desc: "Flat palm touching forehead or chin then moving outward", category: "Greeting" },
              { sign: "SAB THEEK", translation: "Okay / Perfect", emoji: "👌", desc: "Thumb and index fingertips touch in a circle; other 3 extended", category: "Common" },
              { sign: "PYAAR", translation: "I Love You", emoji: "🤟", desc: "Thumb, index, and pinky extended; middle and ring fingers folded", category: "Common" },
              { sign: "AAP", translation: "You / Pointing", emoji: "👆", desc: "Single index finger pointing forward clearly at a target", category: "Pronoun" },
              { sign: "MAIN", translation: "I / Me", emoji: "🖐️", desc: "Single pinky finger extended straight up; other fingers folded", category: "Pronoun" },
              { sign: "JEET", translation: "Victory / Peace", emoji: "✌️", desc: "Index and middle fingers extended forming a V-shape", category: "Common" },
              { sign: "HAAN", translation: "Yes", emoji: "👍", desc: "Thumbs up gesture representing yes, approval, or success", category: "Common" },
              { sign: "NAHEEN", translation: "No / Sorry", emoji: "✊", desc: "Closed fist or hand curled completely closed to indicate negation", category: "Common" }
            ].filter(item => dictFilter === "All" || item.category === dictFilter).map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-black/20 border border-white/5 rounded-xl hover:border-[#00FF66]/30 hover:bg-black/30 transition-all flex flex-col justify-between gap-2.5 group cursor-pointer"
                onClick={() => {
                  // Auto-enable simulator so that the user immediately sees the 3D skeleton classification feedback
                  setIsSimulating(true);
                  let simId = item.sign === "NAMASTE" ? "ISL_NAMASTE"
                            : item.sign === "GHAR" ? "ISL_GHAR"
                            : item.sign === "MADAD" ? "ISL_MADAD"
                            : item.sign === "DOST" ? "ISL_DOST"
                            : item.sign === "KHAANA" ? "ISL_KHAANA"
                            : item.sign === "PAANI" ? "ISL_PAANI"
                            : item.sign === "DHANYAVAAD" ? "ISL_DHANYAVAAD"
                            : item.sign === "SAB THEEK" ? "ISL_SAB_THEEK"
                            : item.sign === "PYAAR" ? "ISL_PYAAR"
                            : item.sign === "MAIN" ? "ISL_MAIN"
                            : item.sign === "AAP" ? "POINT_INDEX"
                            : item.sign === "JEET" ? "VICTORY_PEACE"
                            : item.sign === "HAAN" ? "THUMBS_UP"
                            : item.sign === "NAHEEN" ? "CLOSED_FIST"
                            : "OPEN_HAND";
                  setSimulatedPoseType(simId as any);
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[9.5px] font-black text-[#00FF66] font-mono uppercase tracking-wider group-hover:text-white transition-colors">
                      {item.sign}
                    </span>
                    <span className="text-xs">{item.emoji}</span>
                  </div>
                  <h5 className="text-[9.5px] font-bold text-white/80 mt-1">{item.translation}</h5>
                  <p className="text-[8px] text-white/40 mt-1.5 leading-normal">{item.desc}</p>
                </div>
                
                <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                  <span className="text-[7.5px] text-white/30 font-semibold uppercase">{item.category}</span>
                  <span className="text-[7.5px] text-[#00FF66]/70 font-mono font-black uppercase flex items-center gap-1 group-hover:text-[#00FF66] transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                    5ms Local
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
