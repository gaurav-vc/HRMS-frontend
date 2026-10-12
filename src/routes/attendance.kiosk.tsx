import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Camera,
  Clock,
  MapPin,
  Building2,
  XCircle,
  Volume2,
  VolumeX,
  FlipHorizontal,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { kioskApi } from "@/api";

export const Route = createFileRoute("/attendance/kiosk")({
  component: TabletKioskPage,
});

type KioskStatus =
  | "INITIALIZING"
  | "INVALID_TOKEN"
  | "SCANNING"
  | "MATCHING"
  | "SUCCESS"
  | "COOLDOWN"
  | "CAMERA_ERROR";

interface PunchSuccessData {
  employee: {
    id: number;
    employee_id: string;
    name: string;
    department?: string;
    designation?: string;
    photo_url?: string;
  };
  punch_type: string;
  timestamp: string;
  confidence: number;
  mode: string;
  auto_resolved?: boolean;
}

// Web Audio API Synthesizer for instant, zero-asset hardware chimes
function playChime(type: "SUCCESS" | "COOLDOWN" | "ERROR" | "KEYPAD") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === "SUCCESS") {
      // Harmonic major chord: C5 -> E5 -> G5
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.65);
      });
    } else if (type === "COOLDOWN") {
      // Warm warning tone (440Hz -> 349Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(349, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === "ERROR") {
      // Low reject buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "KEYPAD") {
      // Crisp click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  } catch (e) {
    // AudioContext blocked until user gesture or unsupported
  }
}

function TabletKioskPage() {
  const [token, setToken] = useState<string>("");
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [status, setStatus] = useState<KioskStatus>("INITIALIZING");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [punchMode, setPunchMode] = useState<"AUTO" | "IN" | "OUT">("AUTO");
  const [successData, setSuccessData] = useState<PunchSuccessData | null>(null);
  const [cooldownMsg, setCooldownMsg] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [adminPin, setAdminPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);
  const [manualTokenInput, setManualTokenInput] = useState<string>("");

  const webcamRef = useRef<Webcam>(null);
  const isBusyRef = useRef<boolean>(false);
  const scanTimerRef = useRef<any>(null);

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Read token from query parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token") || "";
    if (tokenParam) {
      setToken(tokenParam);
      loadConfig(tokenParam);
    } else {
      setStatus("INVALID_TOKEN");
      setErrorMessage("No Kiosk Token provided in the URL.");
    }
  }, []);

  // Fetch site configuration by token
  const loadConfig = async (kioskToken: string) => {
    setStatus("INITIALIZING");
    setErrorMessage("");
    try {
      const res = await kioskApi.getConfig(kioskToken);
      setSiteConfig(res);
      setStatus("SCANNING");
    } catch (err: any) {
      let msg = err.message || "Failed to load kiosk configuration";
      try {
        const parsed = JSON.parse(msg);
        msg = parsed.error || parsed.detail || msg;
      } catch (e) {
        /* ignore */
      }
      setStatus("INVALID_TOKEN");
      setErrorMessage(msg);
    }
  };

  // Continuous Scan Loop
  const captureAndVerify = useCallback(async () => {
    if (isBusyRef.current) return;
    if (status !== "SCANNING") return;
    if (!webcamRef.current) return;

    const frameB64 = webcamRef.current.getScreenshot();
    if (!frameB64) return;

    isBusyRef.current = true;
    setStatus("MATCHING");

    try {
      const res = await kioskApi.punch(token, frameB64, punchMode);

      if (res.status === "MATCHED" && res.verified) {
        if (audioEnabled) playChime("SUCCESS");
        setSuccessData(res);
        setStatus("SUCCESS");

        // Hold success celebration for 2.8 seconds, then resume scanning
        setTimeout(() => {
          setSuccessData(null);
          setStatus("SCANNING");
          isBusyRef.current = false;
        }, 2800);
      } else {
        // Face processed but not high enough confidence or no face detected
        setStatus("SCANNING");
        isBusyRef.current = false;
      }
    } catch (err: any) {
      let msg = err.message || "Error during punch";
      try {
        const parsed = JSON.parse(msg);
        msg = parsed.error || parsed.detail || msg;
      } catch (e) {
        /* ignore */
      }

      if (msg.toLowerCase().includes("cooldown") || msg.toLowerCase().includes("already punched")) {
        if (audioEnabled) playChime("COOLDOWN");
        setCooldownMsg(msg);
        setStatus("COOLDOWN");

        // Hold cooldown banner for 2.2 seconds, then resume scanning
        setTimeout(() => {
          setCooldownMsg("");
          setStatus("SCANNING");
          isBusyRef.current = false;
        }, 2200);
      } else {
        // Regular no-match / retry - resume quickly without interrupting queue
        setStatus("SCANNING");
        isBusyRef.current = false;
      }
    }
  }, [token, status, punchMode, audioEnabled]);

  // Set scanning interval (every 1600ms when in SCANNING status)
  useEffect(() => {
    if (status === "SCANNING") {
      scanTimerRef.current = setInterval(() => {
        captureAndVerify();
      }, 1600);
    } else {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    }
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [status, captureAndVerify]);

  // Handle PIN verification to unlock and exit kiosk
  const handleVerifyPin = async (pinToVerify?: string) => {
    const pin = pinToVerify ?? adminPin;
    if (!pin) {
      setPinError("Please enter PIN");
      return;
    }
    setVerifyingPin(true);
    setPinError("");
    try {
      await kioskApi.verifyPin(token, pin);
      if (audioEnabled) playChime("SUCCESS");
      toast.success("Kiosk Unlocked");
      window.location.href = "/sites";
    } catch (err: any) {
      if (audioEnabled) playChime("ERROR");
      setPinError("Incorrect PIN. Please try again.");
      setAdminPin("");
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleNumpadPress = (digit: string) => {
    if (audioEnabled) playChime("KEYPAD");
    if (adminPin.length < 6) {
      const next = adminPin + digit;
      setAdminPin(next);
      if (next.length === 4) {
        handleVerifyPin(next);
      }
    }
  };

  const handleNumpadClear = () => {
    if (audioEnabled) playChime("KEYPAD");
    setAdminPin("");
    setPinError("");
  };

  // Render Token Configuration Fallback if token missing or invalid
  if (status === "INVALID_TOKEN") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Kiosk Terminal Unconfigured</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              {errorMessage || "This tablet terminal requires a valid site-specific Kiosk Token to activate."}
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              How to configure this tablet:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Log in to PeoplePulse as Site Admin or HR.</li>
              <li>Go to <strong>Sites</strong> &rarr; Click <strong>Edit</strong> on this site.</li>
              <li>Under <strong>Tablet Attendance Kiosk</strong>, click <strong>Generate Token</strong>.</li>
              <li>Scan or open the generated link on this tablet.</li>
            </ol>
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Enter Kiosk Token Manually:
              </label>
              <Input
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="Paste kiosk_token_..."
                className="bg-slate-950 border-slate-700 text-white font-mono text-sm h-11"
              />
            </div>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-11 font-semibold"
              disabled={!manualTokenInput.trim()}
              onClick={() => {
                setToken(manualTokenInput.trim());
                loadConfig(manualTokenInput.trim());
              }}
            >
              Activate Kiosk Terminal
            </Button>
          </div>

          <div className="text-center">
            <a
              href="/sites"
              className="text-xs text-slate-400 hover:text-white underline transition-colors"
            >
              &larr; Return to Sites Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="h-20 bg-slate-900/90 backdrop-blur border-b border-slate-800/80 px-6 flex items-center justify-between z-30 flex-shrink-0">
        {/* Site Branding & Isolation Indicator */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-600/30">
            {siteConfig?.site?.name ? siteConfig.site.name[0] : "P"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                {siteConfig?.site?.name || "Gate Attendance Terminal"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                ONLINE
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Site-Isolated Biometric Gate</span>
              <span>&bull;</span>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Candidate Pool: Strictly This Site</span>
            </div>
          </div>
        </div>

        {/* Live Digital Clock */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-5 py-2.5 rounded-2xl shadow-inner">
          <Clock className="w-5 h-5 text-indigo-400" />
          <div className="text-right">
            <div className="text-2xl font-mono font-bold tracking-wider text-white">
              {currentTime.toLocaleTimeString([], { hour12: true })}
            </div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">
              {currentTime.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Terminal Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Mute Toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl w-10 h-10"
            title={audioEnabled ? "Mute audio chimes" : "Enable audio chimes"}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-400" />}
          </Button>

          {/* Camera Flip */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl w-10 h-10"
            title="Flip camera"
          >
            <FlipHorizontal className="w-5 h-5" />
          </Button>

          {/* Admin Exit / Unlock */}
          <Button
            onClick={() => {
              setAdminPin("");
              setPinError("");
              setIsExitModalOpen(true);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs px-3.5 h-10 rounded-xl gap-2 shadow-sm"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Admin Exit</span>
          </Button>
        </div>
      </header>

      {/* Main Kiosk Camera & HUD Viewport */}
      <main className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {/* Continuous Fullscreen Webcam Feed */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            mirrored={facingMode === "user"}
            videoConstraints={{
              facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }}
            className="w-full h-full object-cover"
            onUserMediaError={() => setStatus("CAMERA_ERROR")}
          />
        </div>

        {/* Ambient Vignette & Futuristic HUD Grid */}
        <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

        {/* Biometric Face Alignment HUD Oval */}
        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
          {/* Oval Scanner Frame */}
          <div
            className={`w-72 h-96 sm:w-80 sm:h-[420px] rounded-[48%] border-4 transition-all duration-300 relative flex items-center justify-center ${
              status === "SUCCESS"
                ? "border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.6)]"
                : status === "COOLDOWN"
                ? "border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.6)]"
                : status === "MATCHING"
                ? "border-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.5)] animate-pulse"
                : "border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            }`}
          >
            {/* Animated Laser Scanning Beam */}
            {status === "SCANNING" && (
              <div className="absolute inset-x-4 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan-beam" />
            )}

            {/* Corner Target Markers */}
            <div className="absolute -top-3 -left-3 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
            <div className="absolute -top-3 -right-3 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
            <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
            <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

            {/* Status Prompt Inside / Over Oval */}
            <div className="absolute -bottom-14 inset-x-0 flex justify-center">
              <div
                className={`px-5 py-2.5 rounded-full text-sm font-semibold tracking-wide backdrop-blur-md border shadow-xl flex items-center gap-2 ${
                  status === "SUCCESS"
                    ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/50"
                    : status === "COOLDOWN"
                    ? "bg-amber-950/90 text-amber-200 border-amber-500/50"
                    : status === "MATCHING"
                    ? "bg-indigo-950/90 text-indigo-200 border-indigo-500/50"
                    : "bg-black/75 text-white border-white/20"
                }`}
              >
                {status === "MATCHING" && (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Identifying face...</span>
                  </>
                )}
                {status === "SCANNING" && (
                  <>
                    <Camera className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>Align face within guide &bull; Stand 2-3 ft away</span>
                  </>
                )}
                {status === "SUCCESS" && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Identity Verified!</span>
                  </>
                )}
                {status === "COOLDOWN" && (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Punch Recorded Recently</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SUCCESS CELEBRATION MODAL OVERLAY */}
        {status === "SUCCESS" && successData && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-40 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-3xl p-8 shadow-[0_0_80px_rgba(16,185,129,0.3)] text-center space-y-6">
              {/* Punch Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm tracking-wider uppercase bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                <Sparkles className="w-4 h-4" />
                {successData.punch_type === "IN" ? "PUNCH IN RECORDED" : "PUNCH OUT RECORDED"}
              </div>

              {/* Employee Photo / Avatar */}
              <div className="relative mx-auto w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-cyan-400 shadow-xl">
                {successData.employee.photo_url ? (
                  <img
                    src={successData.employee.photo_url}
                    alt={successData.employee.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-4xl font-bold text-emerald-400">
                    {successData.employee.name[0]}
                  </div>
                )}
                <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Employee Details */}
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {successData.employee.name}
                </h2>
                <p className="text-sm font-mono text-emerald-400 font-semibold">
                  ID: {successData.employee.employee_id}
                </p>
                {(successData.employee.department || successData.employee.designation) && (
                  <p className="text-xs text-slate-400">
                    {[successData.employee.designation, successData.employee.department]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}
              </div>

              {/* Timestamp Card */}
              <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs text-slate-300">
                <span>Recorded at:</span>
                <span className="font-mono font-bold text-white">
                  {new Date(successData.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>

              <p className="text-xs text-slate-400 animate-pulse">
                Thank you! Auto-resuming scanning for next worker...
              </p>
            </div>
          </div>
        )}

        {/* COOLDOWN / ANTI-SPAM WARNING OVERLAY */}
        {status === "COOLDOWN" && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-40 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-6 text-center space-y-4 shadow-[0_0_60px_rgba(245,158,11,0.25)]">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Already Checked In / Out</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {cooldownMsg || "A punch was already recorded within the cooldown window."}
                </p>
              </div>
              <p className="text-[11px] text-amber-300 font-medium">
                Please step aside to let the next worker check in.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Mode Toolbar */}
      <footer className="h-20 bg-slate-900/90 backdrop-blur border-t border-slate-800/80 px-6 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Punch Mode:</span>
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              onClick={() => setPunchMode("AUTO")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                punchMode === "AUTO"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              SMART AUTO
            </button>
            <button
              onClick={() => setPunchMode("IN")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                punchMode === "IN"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              FORCE IN
            </button>
            <button
              onClick={() => setPunchMode("OUT")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                punchMode === "OUT"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              FORCE OUT
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-4">
          <span>
            Sensitivity Threshold:{" "}
            <strong className="text-white font-mono">
              {siteConfig?.site?.similarity_threshold ?? 0.45}
            </strong>
          </span>
          <span>&bull;</span>
          <span>
            Cooldown:{" "}
            <strong className="text-white font-mono">
              {siteConfig?.site?.cooldown_seconds ?? 30}s
            </strong>
          </span>
        </div>
      </footer>

      {/* Security Exit PIN Modal */}
      {isExitModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Supervisor Exit PIN</h2>
              <p className="text-xs text-slate-400">
                Enter site 4-digit PIN to unlock tablet & exit kiosk mode.
              </p>
            </div>

            {/* PIN Dots Display */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    adminPin.length > idx
                      ? "bg-indigo-400 border-indigo-400 scale-110 shadow-[0_0_10px_#818cf8]"
                      : "border-slate-700 bg-slate-800"
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-center text-xs text-red-400 font-semibold animate-shake">
                {pinError}
              </p>
            )}

            {/* On-Screen Touch Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumpadPress(num)}
                  className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-lg font-bold text-white transition-colors"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleNumpadClear}
                className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-400"
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={() => handleNumpadPress("0")}
                className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-lg font-bold text-white transition-colors"
              >
                0
              </button>
              <button
                type="button"
                disabled={verifyingPin || adminPin.length === 0}
                onClick={() => handleVerifyPin()}
                className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white"
              >
                {verifyingPin ? "..." : "OK"}
              </button>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsExitModalOpen(false)}
              className="w-full text-slate-400 hover:text-white text-xs h-9"
            >
              Cancel & Resume Kiosk
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
