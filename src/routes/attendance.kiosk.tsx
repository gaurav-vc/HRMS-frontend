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
  LogIn,
  Sparkles,
  Scan,
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
  | "PROMPT_PUNCH"
  | "DUPLICATE_PHOTO_ALERT"
  | "SUCCESS"
  | "COOLDOWN"
  | "CAMERA_ERROR";

interface DetectedFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  confidence?: number;
}

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

interface IdentifiedPromptData {
  employee: {
    id: number;
    code: string;
    employee_id: string;
    name: string;
    department?: string;
    designation?: string;
    photo_url?: string;
  };
  recommended_type: "IN" | "OUT";
  last_punch?: {
    punch_type: string;
    punch_time: string;
  } | null;
  confidence: number;
}

interface DuplicateAlertData {
  message: string;
  employees: Array<{
    id: number;
    code: string;
    employee_id?: string;
    name: string;
    photo_url?: string;
    department?: string;
  }>;
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
  const [punchMode, setPunchMode] = useState<"INTERACTIVE" | "AUTO" | "IN" | "OUT">("INTERACTIVE");
  const [successData, setSuccessData] = useState<PunchSuccessData | null>(null);
  const [promptData, setPromptData] = useState<IdentifiedPromptData | null>(null);
  const [promptTimer, setPromptTimer] = useState<number>(10);
  const [duplicateAlertData, setDuplicateAlertData] = useState<DuplicateAlertData | null>(null);
  const [cooldownMsg, setCooldownMsg] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [adminPin, setAdminPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);
  const [manualTokenInput, setManualTokenInput] = useState<string>("");

  // Real-time Dynamic Face Tracking state
  const [detectedFace, setDetectedFace] = useState<DetectedFaceBox | null>(null);

  const webcamRef = useRef<Webcam>(null);
  const isBusyRef = useRef<boolean>(false);
  const scanTimerRef = useRef<any>(null);

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cleanup active camera stream on unmount
  useEffect(() => {
    return () => {
      try {
        if (webcamRef.current?.video?.srcObject) {
          const stream = webcamRef.current.video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (e) {
        /* ignore */
      }
    };
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

  // Real-time Client-Side Face Detection loop on live video element
  useEffect(() => {
    let isMounted = true;
    let detector: any = null;

    try {
      if (typeof window !== "undefined" && "FaceDetector" in window) {
        detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      }
    } catch (e) {
      detector = null;
    }

    const interval = setInterval(async () => {
      if (!isMounted) return;
      if (!detector || !webcamRef.current?.video) return;
      const video = webcamRef.current.video;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      try {
        const faces = await detector.detect(video);
        if (faces && faces.length > 0) {
          const f = faces[0].boundingBox;
          const isMirrored = facingMode === "user";
          const boxX = isMirrored
            ? (1 - (f.x + f.width) / video.videoWidth) * 100
            : (f.x / video.videoWidth) * 100;
          const boxY = (f.y / video.videoHeight) * 100;
          const boxW = (f.width / video.videoWidth) * 100;
          const boxH = (f.height / video.videoHeight) * 100;

          setDetectedFace((prev) => ({
            x: Math.max(2, Math.min(94, boxX)),
            y: Math.max(2, Math.min(94, boxY)),
            width: Math.max(8, Math.min(80, boxW)),
            height: Math.max(8, Math.min(80, boxH)),
            name: prev?.name,
          }));
        } else {
          // If no face found in this frame, keep previous name if still in matching/success
          setDetectedFace((prev) => (prev?.name ? prev : null));
        }
      } catch (e) {
        /* ignore detector frame exceptions */
      }
    }, 140);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [facingMode]);

  // Unified punch response handler
  const processPunchResponse = (res: any) => {
    // 1. If backend returned facial_area and frame_dims, position the dynamic face box
    if (res.facial_area && res.frame_dims) {
      const isMirrored = facingMode === "user";
      const { x, y, w, h } = res.facial_area;
      const { width: fw, height: fh } = res.frame_dims;
      const boxX = isMirrored ? (1 - (x + w) / fw) * 100 : (x / fw) * 100;
      const boxY = (y / fh) * 100;
      const boxW = (w / fw) * 100;
      const boxH = (h / fh) * 100;

      const empName = res.employee
        ? (res.employee.name || `${res.employee.first_name || ""} ${res.employee.last_name || ""}`.trim())
        : undefined;

      setDetectedFace({
        x: Math.max(2, Math.min(94, boxX)),
        y: Math.max(2, Math.min(94, boxY)),
        width: Math.max(8, Math.min(80, boxW)),
        height: Math.max(8, Math.min(80, boxH)),
        name: empName,
      });
    }

    // 1b. Handle DUPLICATE_PHOTO_ALERT status (when 2 employees share the same photo or face)
    if (res.status === "DUPLICATE_PHOTO_ALERT") {
      if (audioEnabled) playChime("ERROR");
      setDuplicateAlertData({
        message: res.message || res.error || "2 employees have the same photo.",
        employees: res.conflict_employees || [],
      });
      setStatus("DUPLICATE_PHOTO_ALERT");
      isBusyRef.current = false;

      setTimeout(() => {
        setDuplicateAlertData(null);
        setDetectedFace(null);
        setStatus("SCANNING");
        isBusyRef.current = false;
      }, 5500);
      return;
    }

    // 2. Handle IDENTIFIED status (face matched in INTERACTIVE mode: ask for Punch IN or Punch OUT)
    if (res.status === "IDENTIFIED") {
      if (audioEnabled) playChime("KEYPAD");

      const emp = res.employee || {};
      const fullName = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Employee";
      const empCode = emp.code || emp.employee_id || "N/A";

      setPromptData({
        employee: {
          id: emp.id || 0,
          code: empCode,
          employee_id: empCode,
          name: fullName,
          department: emp.department || "",
          designation: emp.designation || "",
          photo_url: emp.photo_url || "",
        },
        recommended_type: res.recommended_type || "IN",
        last_punch: res.last_punch || null,
        confidence: res.similarity_score ? Math.round(res.similarity_score * 100) : 98,
      });

      setPromptTimer(10);
      setStatus("PROMPT_PUNCH");
      isBusyRef.current = false;
      return;
    }

    // 3. Handle SUCCESS or MATCHED status
    if (res.status === "SUCCESS" || (res.status === "MATCHED" && res.verified)) {
      if (audioEnabled) playChime("SUCCESS");

      const emp = res.employee || {};
      const fullName = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Employee";
      const empId = emp.code || emp.employee_id || "N/A";

      const formatted: PunchSuccessData = {
        employee: {
          id: emp.id || 0,
          employee_id: empId,
          name: fullName,
          department: emp.department || "",
          designation: emp.designation || "",
          photo_url: emp.photo_url || "",
        },
        punch_type: res.punch_type || "IN",
        timestamp: res.punch_time || new Date().toISOString(),
        confidence: res.similarity_score ? Math.round(res.similarity_score * 100) : 98,
        mode: punchMode,
      };

      setSuccessData(formatted);
      setStatus("SUCCESS");

      // Hold celebration for 2.6 seconds, then smoothly resume scanning
      setTimeout(() => {
        setSuccessData(null);
        setDetectedFace(null);
        setStatus("SCANNING");
        isBusyRef.current = false;
      }, 2600);
      return;
    }

    // 3. Handle COOLDOWN status
    if (res.status === "COOLDOWN") {
      if (audioEnabled) playChime("COOLDOWN");
      setCooldownMsg(res.message || "A punch was already recorded within the cooldown window.");
      setStatus("COOLDOWN");

      setTimeout(() => {
        setCooldownMsg("");
        setDetectedFace(null);
        setStatus("SCANNING");
        isBusyRef.current = false;
      }, 2400);
      return;
    }

    // 4. Default / retry
    setStatus("SCANNING");
    isBusyRef.current = false;
  };

  // Unified punch error handler
  const handlePunchError = (err: any) => {
    let msg = err.message || "Error during punch";
    try {
      const parsed = JSON.parse(msg);
      msg = parsed.error || parsed.detail || msg;
    } catch (e) {
      /* ignore */
    }

    if (msg.toLowerCase().includes("same photo") || msg.toLowerCase().includes("duplicate photo")) {
      if (audioEnabled) playChime("ERROR");
      setDuplicateAlertData({
        message: msg,
        employees: [],
      });
      setStatus("DUPLICATE_PHOTO_ALERT");

      setTimeout(() => {
        setDuplicateAlertData(null);
        setDetectedFace(null);
        setStatus("SCANNING");
        isBusyRef.current = false;
      }, 5500);
    } else if (msg.toLowerCase().includes("cooldown") || msg.toLowerCase().includes("already punched")) {
      if (audioEnabled) playChime("COOLDOWN");
      setCooldownMsg(msg);
      setStatus("COOLDOWN");

      setTimeout(() => {
        setCooldownMsg("");
        setDetectedFace(null);
        setStatus("SCANNING");
        isBusyRef.current = false;
      }, 2400);
    } else {
      // Regular no-match / retry - resume scanning smoothly
      setStatus("SCANNING");
      isBusyRef.current = false;
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
      const apiPunchType = punchMode === "INTERACTIVE" ? "IDENTIFY" : punchMode;
      const res = await kioskApi.punch(token, frameB64, apiPunchType);
      processPunchResponse(res);
    } catch (err: any) {
      handlePunchError(err);
    }
  }, [token, status, punchMode, audioEnabled, facingMode]);

  // Confirm punch when employee clicks PUNCH IN or PUNCH OUT on the interactive prompt
  const confirmPunch = async (chosenType: "IN" | "OUT") => {
    if (!promptData) return;
    const empId = promptData.employee.id;
    setPromptData(null);
    setStatus("MATCHING");
    isBusyRef.current = true;

    try {
      const res = await kioskApi.punch(token, undefined, chosenType, empId);
      processPunchResponse(res);
    } catch (err: any) {
      handlePunchError(err);
    }
  };

  const cancelPrompt = useCallback(() => {
    setPromptData(null);
    setDetectedFace(null);
    setStatus("SCANNING");
    isBusyRef.current = false;
  }, []);

  // 10-second auto-cancel countdown timer when in PROMPT_PUNCH mode
  useEffect(() => {
    if (status !== "PROMPT_PUNCH") return;
    const interval = setInterval(() => {
      setPromptTimer((prev) => {
        if (prev <= 1) {
          cancelPrompt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, cancelPrompt]);

  // Quick interactive manual punch trigger
  const executeManualPunch = async (overrideType: "IN" | "OUT") => {
    if (isBusyRef.current) return;
    if (!webcamRef.current) return;

    const frameB64 = webcamRef.current.getScreenshot();
    if (!frameB64) {
      toast.error("Camera frame not available");
      return;
    }

    isBusyRef.current = true;
    setStatus("MATCHING");

    try {
      const res = await kioskApi.punch(token, frameB64, overrideType);
      processPunchResponse(res);
    } catch (err: any) {
      handlePunchError(err);
    }
  };

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
        {/* Full-bleed widescreen webcam preview */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.88}
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

        {/* Full Viewport Cyber Corner Brackets */}
        <div className="absolute inset-4 sm:inset-6 pointer-events-none flex flex-col justify-between z-10">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 sm:w-14 sm:h-14 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
            <div className="w-10 h-10 sm:w-14 sm:h-14 border-t-2 border-r-2 border-cyan-400/80 rounded-tr-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
          </div>
          <div className="flex justify-between items-end">
            <div className="w-10 h-10 sm:w-14 sm:h-14 border-b-2 border-l-2 border-cyan-400/80 rounded-bl-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
            <div className="w-10 h-10 sm:w-14 sm:h-14 border-b-2 border-r-2 border-cyan-400/80 rounded-br-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
          </div>
        </div>

        {/* Top Floating Smart Status Banner */}
        <div className="absolute top-6 inset-x-0 flex justify-center z-20 pointer-events-none">
          <div
            className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide backdrop-blur-md border shadow-xl flex items-center gap-2 transition-all duration-300 ${
              status === "SUCCESS" || status === "PROMPT_PUNCH"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-500/20"
                : status === "DUPLICATE_PHOTO_ALERT"
                ? "bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-500/20"
                : status === "COOLDOWN"
                ? "bg-amber-950/90 text-amber-200 border-amber-500/50 shadow-amber-500/20"
                : status === "MATCHING"
                ? "bg-indigo-950/90 text-indigo-200 border-indigo-500/50 shadow-indigo-500/20 animate-pulse"
                : "bg-slate-950/80 text-cyan-200 border-cyan-500/30 shadow-cyan-500/10"
            }`}
          >
            {status === "DUPLICATE_PHOTO_ALERT" && (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Duplicate Photo Alert &bull; 2 employees have the same photo</span>
              </>
            )}
            {status === "MATCHING" && (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Matching face pixels against site roster...</span>
              </>
            )}
            {status === "PROMPT_PUNCH" && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Identity Verified &bull; Select Punch In or Punch Out</span>
              </>
            )}
            {status === "SCANNING" && (
              <>
                <Scan className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Free-Scan Biometric Radar Active &bull; Approach camera to punch</span>
              </>
            )}
            {status === "SUCCESS" && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Identity Verified &bull; Attendance Recorded</span>
              </>
            )}
            {status === "COOLDOWN" && (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Punch Logged Recently</span>
              </>
            )}
            {status === "CAMERA_ERROR" && (
              <>
                <XCircle className="w-4 h-4 text-red-400" />
                <span>Camera Device Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Real-time Dynamic Face Bounding Box (Wraps around standing person's face) */}
        {detectedFace && status !== "CAMERA_ERROR" && (
          <div
            className={`absolute pointer-events-none transition-all duration-150 rounded-2xl ${
              status === "SUCCESS" || status === "PROMPT_PUNCH"
                ? "border-2 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.7)] bg-emerald-500/10"
                : status === "DUPLICATE_PHOTO_ALERT"
                ? "border-2 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.7)] bg-rose-500/10"
                : status === "COOLDOWN"
                ? "border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.7)] bg-amber-500/10"
                : status === "MATCHING"
                ? "border-2 border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.6)] bg-indigo-500/10 animate-pulse"
                : "border-2 border-cyan-400/90 shadow-[0_0_25px_rgba(34,211,238,0.5)] bg-cyan-400/5"
            }`}
            style={{
              left: `${detectedFace.x}%`,
              top: `${detectedFace.y}%`,
              width: `${detectedFace.width}%`,
              height: `${detectedFace.height}%`,
            }}
          >
            {/* Cybernetic Corner Brackets */}
            <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-300" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-300" />
            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-300" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-300" />

            {/* Floating Tag */}
            <div className="absolute -top-7 left-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase backdrop-blur-md bg-slate-950/85 border border-cyan-400/40 text-cyan-200 shadow-md">
              {status === "MATCHING" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  ANALYZING...
                </>
              ) : status === "DUPLICATE_PHOTO_ALERT" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  DUPLICATE PHOTO ALERT
                </>
              ) : status === "SUCCESS" || status === "PROMPT_PUNCH" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {detectedFace.name || "VERIFIED"}
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  FACE LOCKED
                </>
              )}
            </div>
          </div>
        )}

        {/* Ambient Center Radar Guide when No Face is in Frame */}
        {!detectedFace && status === "SCANNING" && (
          <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none opacity-30 hover:opacity-60 transition-opacity">
            <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-3xl border border-dashed border-cyan-400/30 flex items-center justify-center relative">
              <div className="w-14 h-14 rounded-full border border-cyan-400/40 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400/80 animate-ping" />
              </div>
            </div>
          </div>
        )}

        {/* Interactive Quick Punch IN / OUT Action Buttons */}
        <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-4 z-20 pointer-events-auto">
          <Button
            onClick={() => executeManualPunch("IN")}
            disabled={status === "MATCHING"}
            className="px-6 py-3 h-auto rounded-2xl bg-emerald-600/95 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/30 flex items-center gap-2 backdrop-blur border border-emerald-400/40 active:scale-95 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>PUNCH IN</span>
          </Button>
          <Button
            onClick={() => executeManualPunch("OUT")}
            disabled={status === "MATCHING"}
            className="px-6 py-3 h-auto rounded-2xl bg-amber-600/95 hover:bg-amber-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-amber-600/30 flex items-center gap-2 backdrop-blur border border-amber-400/40 active:scale-95 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>PUNCH OUT</span>
          </Button>
        </div>

        {/* INTERACTIVE PUNCH PROMPT MODAL OVERLAY (Shows employee ID & Asks for Punch In / Out) */}
        {status === "PROMPT_PUNCH" && promptData && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-40 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
            <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-3xl p-8 shadow-[0_0_80px_rgba(16,185,129,0.25)] text-center space-y-6">
              {/* Face Verified Pill */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs tracking-wider uppercase bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Face Recognized &bull; Identity Verified</span>
              </div>

              {/* Employee Photo / Avatar */}
              <div className="relative mx-auto w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-emerald-400 shadow-xl">
                {promptData.employee.photo_url ? (
                  <img
                    src={promptData.employee.photo_url}
                    alt={promptData.employee.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-indigo-400">
                    {promptData.employee.name[0]}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-slate-950">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Employee Details & ID Display */}
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {promptData.employee.name}
                </h2>
                <div className="inline-block px-3.5 py-1 rounded-xl bg-slate-800 border border-emerald-500/40 text-emerald-300 font-mono text-base font-bold shadow-inner">
                  ID: {promptData.employee.code || promptData.employee.employee_id}
                </div>
                {(promptData.employee.department || promptData.employee.designation) && (
                  <p className="text-xs text-slate-400">
                    {[promptData.employee.designation, promptData.employee.department]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}
              </div>

              {/* Status / Last punch today */}
              <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Today's Activity:</span>
                <span className="font-semibold text-white">
                  {promptData.last_punch
                    ? `Last punch: ${promptData.last_punch.punch_type} at ${promptData.last_punch.punch_time}`
                    : "No punches yet today"}
                </span>
              </div>

              {/* Action Buttons: PUNCH IN / PUNCH OUT */}
              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Please select your punch:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => confirmPunch("IN")}
                    className={`h-14 rounded-2xl text-base font-bold flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-all ${
                      promptData.recommended_type === "IN"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/40 ring-2 ring-emerald-400"
                        : "bg-emerald-700/70 hover:bg-emerald-600 text-white/90"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <LogIn className="w-4 h-4" />
                      <span>PUNCH IN</span>
                    </div>
                    {promptData.recommended_type === "IN" && (
                      <span className="text-[10px] font-normal text-emerald-200">Suggested</span>
                    )}
                  </Button>

                  <Button
                    onClick={() => confirmPunch("OUT")}
                    className={`h-14 rounded-2xl text-base font-bold flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-all ${
                      promptData.recommended_type === "OUT"
                        ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/40 ring-2 ring-amber-400"
                        : "bg-amber-700/70 hover:bg-amber-600 text-white/90"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <LogOut className="w-4 h-4" />
                      <span>PUNCH OUT</span>
                    </div>
                    {promptData.recommended_type === "OUT" && (
                      <span className="text-[10px] font-normal text-amber-200">Suggested</span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Countdown & Cancel */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
                <span>Auto-cancelling in {promptTimer}s</span>
                <button
                  type="button"
                  onClick={cancelPrompt}
                  className="text-slate-400 hover:text-white underline transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAMERA ERROR RECOVERY PANEL */}
        {status === "CAMERA_ERROR" && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-40 animate-in fade-in duration-200 pointer-events-auto">
            <div className="w-full max-w-md bg-slate-900 border-2 border-red-500/50 rounded-3xl p-8 shadow-[0_0_60px_rgba(239,68,68,0.25)] text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Camera Feed Unavailable</h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  The terminal was unable to access the camera hardware. Please ensure:
                </p>
                <ul className="text-xs text-slate-400 list-disc list-inside space-y-1 text-left bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <li>Camera permission is allowed in your browser settings.</li>
                  <li>No other application or browser tab is locking the webcam.</li>
                  <li>The camera device is securely connected and operational.</li>
                </ul>
              </div>
              <Button
                onClick={() => {
                  setStatus("INITIALIZING");
                  setTimeout(() => setStatus("SCANNING"), 400);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-indigo-600/30 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Camera Initialization</span>
              </Button>
            </div>
          </div>
        )}

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
                  {isNaN(Date.parse(successData.timestamp))
                    ? successData.timestamp
                    : new Date(successData.timestamp).toLocaleTimeString([], {
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

        {/* DUPLICATE PHOTO ALERT MODAL OVERLAY (When 2 employees have the same common profile photo) */}
        {status === "DUPLICATE_PHOTO_ALERT" && duplicateAlertData && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-40 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
            <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-rose-950/40 border-2 border-rose-500/60 rounded-3xl p-7 shadow-[0_0_80px_rgba(244,63,94,0.3)] text-center space-y-6">
              {/* Alert Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs tracking-wider uppercase bg-rose-500/20 border border-rose-500/40 text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Duplicate Profile Photo Detected</span>
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  2 Employees Have The Same Photo
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                  {duplicateAlertData.message}
                </p>
              </div>

              {/* Conflicting Employees Comparison Grid */}
              {duplicateAlertData.employees && duplicateAlertData.employees.length > 0 && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/70 border border-rose-500/30">
                  {duplicateAlertData.employees.map((emp, idx) => (
                    <div
                      key={emp.id || idx}
                      className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
                    >
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-rose-500 to-amber-500 shadow-md">
                        {emp.photo_url ? (
                          <img
                            src={emp.photo_url}
                            alt={emp.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-rose-400">
                            {emp.name ? emp.name[0] : "?"}
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-white truncate max-w-[140px]">
                          {emp.name}
                        </div>
                        <div className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-rose-300 font-mono text-xs font-semibold">
                          ID: {emp.code || emp.employee_id}
                        </div>
                        {emp.department && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{emp.department}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action guidance */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90 leading-snug">
                  Please update employee profile photos in <strong>People &gt; Employees</strong> to resolve this biometric duplicate conflict before punching.
                </p>
              </div>

              {/* Dismiss / Close */}
              <Button
                onClick={() => {
                  setDuplicateAlertData(null);
                  setDetectedFace(null);
                  setStatus("SCANNING");
                  isBusyRef.current = false;
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold h-11 rounded-xl"
              >
                Dismiss &amp; Resume Scanning
              </Button>
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
              onClick={() => setPunchMode("INTERACTIVE")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                punchMode === "INTERACTIVE"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              PROMPT PUNCH
            </button>
            <button
              onClick={() => setPunchMode("AUTO")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                punchMode === "AUTO"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              SMART AUTO
            </button>
            <button
              onClick={() => setPunchMode("IN")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                punchMode === "IN"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              FORCE IN
            </button>
            <button
              onClick={() => setPunchMode("OUT")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
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

            {/* PIN Dots Indicator */}
            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    adminPin.length > idx
                      ? "bg-indigo-500 shadow-[0_0_10px_#6366f1] scale-110"
                      : "bg-slate-800 border border-slate-700"
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-xs text-red-400 text-center font-medium animate-shake">
                {pinError}
              </p>
            )}

            {/* Custom On-Screen Tablet Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleNumpadPress(digit)}
                  className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-lg transition-colors border border-slate-700/50 shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleNumpadClear}
                className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors border border-slate-800"
              >
                Clear
              </button>
              <button
                onClick={() => handleNumpadPress("0")}
                className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-lg transition-colors border border-slate-700/50 shadow-sm"
              >
                0
              </button>
              <button
                onClick={() => {
                  if (audioEnabled) playChime("KEYPAD");
                  setAdminPin((prev) => prev.slice(0, -1));
                }}
                className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors border border-slate-800"
              >
                &larr; Del
              </button>
            </div>

            {/* Modal Cancel Button */}
            <Button
              variant="ghost"
              onClick={() => {
                setIsExitModalOpen(false);
                setAdminPin("");
                setPinError("");
              }}
              className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel & Return to Terminal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
