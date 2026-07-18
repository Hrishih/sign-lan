import React, { useState } from "react";
import { 
  Camera,
  RefreshCw, 
  Trash2,
  Activity,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import WebcamCapture from "./components/WebcamCapture";
import { SignTranslationResponse } from "./types";

export default function App() {
  // Workspace state
  const [compiledGlosses, setCompiledGlosses] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modular Feature Toggles passed to the WebcamCapture component
  const [handTrackingEnabled, setHandTrackingEnabled] = useState<boolean>(true);
  const [emotionDetectionEnabled, setEmotionDetectionEnabled] = useState<boolean>(true);
  const [llmInterpretationEnabled, setLlmInterpretationEnabled] = useState<boolean>(true);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState<boolean>(true);

  // Show a status alert
  const showAlert = (type: "success" | "error", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4000);
  };

  // Add detected sign to session history
  const handleSignDetected = (result: SignTranslationResponse) => {
    const formattedSign = result.detectedSign.toUpperCase().trim();
    if (!formattedSign || formattedSign === "UNKNOWN") return;

    setCompiledGlosses((prev) => {
      // Prevent consecutive duplicate flooding during continuous live scanning
      if (prev.length > 0 && prev[prev.length - 1] === formattedSign) {
        return prev;
      }
      return [...prev, formattedSign];
    });

    showAlert("success", `Detected and tracked sign: "${formattedSign}"`);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased flex flex-col selection:bg-[#00FF66]/20 selection:text-[#00FF66]">
      
      {/* Alert Banner with beautiful glow */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(0,255,102,0.15)] border text-xs font-bold flex items-center gap-2.5 ${
              alertMessage.type === "success"
                ? "bg-black border-[#00FF66]/30 text-[#00FF66]"
                : "bg-black border-red-500/30 text-red-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>{alertMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar styled strictly to Bold Typography theme */}
      <nav className="h-20 flex items-center justify-between px-6 sm:px-10 border-b border-white/10 bg-[#050505] text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 bg-[#00FF66] rounded-full shadow-[0_0_10px_#00FF66]" />
          <span className="font-black text-xl tracking-tighter uppercase">SYNTAX.CAMERA</span>
        </div>
        
        <div className="hidden md:flex gap-8 text-[11px] font-black tracking-widest uppercase text-white/60">
          <span className="cursor-default hover:text-[#00FF66] transition-colors flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#00FF66]" />
            Real-Time skeletal Tracking
          </span>
          <span className="cursor-default hover:text-[#00FF66] transition-colors">30FPS MediaPipe</span>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66] text-[10px] font-black uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-ping" />
          <span>Tracking Mode Active</span>
        </div>
      </nav>

      {/* Main Centered Content Grid */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl w-full mx-auto">
        <div className="w-full flex flex-col gap-6">
          
          {/* Section Info Header */}
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center justify-center md:justify-start gap-2">
              <Camera className="w-6 h-6 text-[#00FF66]" />
              <span>Real-Time Skeletal Tracking Camera</span>
            </h1>
            <p className="text-xs text-white/50 mt-1.5 max-w-2xl leading-relaxed">
              Extracts 21 3D joint landmarks locally using MediaPipe on your camera feed, classifications are translated instantly. Drag the green facial frame overlay to test live head coordinates tracking.
            </p>
          </div>

          {/* Core Webcam Capture Canvas Box */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-1.5">
            <WebcamCapture 
              onSignDetected={handleSignDetected}
              isTranslating={isTranslating}
              setIsTranslating={setIsTranslating}
              compiledGlosses={compiledGlosses}
              handTrackingEnabled={handTrackingEnabled}
              setHandTrackingEnabled={setHandTrackingEnabled}
              emotionDetectionEnabled={emotionDetectionEnabled}
              setEmotionDetectionEnabled={setEmotionDetectionEnabled}
              llmInterpretationEnabled={llmInterpretationEnabled}
              setLlmInterpretationEnabled={setLlmInterpretationEnabled}
              voiceOutputEnabled={voiceOutputEnabled}
              setVoiceOutputEnabled={setVoiceOutputEnabled}
            />
          </div>

          {/* Session Real-time Recognition Feed Card */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/40">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00FF66]" />
                Session Recognition Feed
              </span>
              {compiledGlosses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCompiledGlosses([])}
                  className="text-red-400 hover:text-red-300 font-extrabold uppercase text-[9px] tracking-widest flex items-center gap-1 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Feed</span>
                </button>
              )}
            </div>

            <div className="min-h-[50px] p-3.5 bg-black/60 rounded-xl border border-white/5 flex flex-wrap gap-2 items-center">
              {compiledGlosses.length === 0 ? (
                <span className="text-[11px] text-white/30 font-bold italic">
                  Awaiting real-time gestural patterns from tracking camera...
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {compiledGlosses.map((gloss, idx) => (
                    <motion.span
                      key={idx}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white/5 border border-[#00FF66]/30 text-[#00FF66] text-xs font-black font-mono tracking-widest px-3 py-1.5 rounded-lg uppercase shadow-sm"
                    >
                      {gloss}
                    </motion.span>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Humble Footer */}
      <footer className="h-14 flex items-center justify-center border-t border-white/5 bg-[#050505] text-[9px] font-mono text-white/30 tracking-widest uppercase">
        <span>ENGINE: MediaPipe v0.10.0 + Gemini Flash SDK</span>
      </footer>

    </div>
  );
}
