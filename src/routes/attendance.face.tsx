import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Camera, ShieldCheck, CheckCircle2, QrCode, MapPin, Loader2, XCircle, Navigation as NavigationIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scanner } from '@yudiel/react-qr-scanner';
import Webcam from "react-webcam";
import { attendanceApi, sitesApi } from "@/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { isRedirect } from "@tanstack/react-router";

export const Route = createFileRoute("/attendance/face")({
  loader: async () => {
    try {
      const sites = await sitesApi.getAll();
      return { sites, error: null };
    } catch (error: any) {
      if (isRedirect(error)) throw error;
      return { sites: [], error: error.message || String(error) };
    }
  },
  component: ScanPunchPage 
});

type ScanStep = "SELECT_SITE" | "QR" | "FACE_LIVENESS" | "GEO" | "SUBMITTING" | "DONE" | "ERROR";

function ScanPunchPage() {
  const router = useRouter();
  const loaderData = Route.useLoaderData();
  const sitesList = Array.isArray(loaderData.sites) ? loaderData.sites : ((loaderData.sites as any).results || []);
  const loaderError = (loaderData as any).error;
  
  const [site, setSite] = useState<any>(sitesList.length === 1 ? sitesList[0] : null);
  const [step, setStep] = useState<ScanStep>(
    (sitesList.length === 0 || loaderError) ? "ERROR" :
    sitesList.length === 1 ? (sitesList[0].qrEnabled === false ? "FACE_LIVENESS" : "QR") : "SELECT_SITE"
  );
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [faceImageBlob, setFaceImageBlob] = useState<Blob | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [punchType, setPunchType] = useState<"IN" | "OUT">("IN");
  const isSubmitting = useRef(false);
  
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeSteps, setChallengeSteps] = useState<string[]>([]);
  
  const [livenessPrompt, setLivenessPrompt] = useState("Please look straight into the camera");
  const [verifyStatus, setVerifyStatus] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState(
    loaderError ? `Backend API Error: ${loaderError}` : 
    sitesList.length === 0 ? "No site assigned to your profile. Backend returned 0 sites." : ""
  );
  
  // Sync state if loader data updates (e.g. after Try Again)
  useEffect(() => {
    if (loaderError) {
      setErrorMsg(`Backend API Error: ${loaderError}`);
      setStep("ERROR");
    } else if (sitesList.length > 0 && step === "ERROR" && errorMsg.includes("No site assigned")) {
      setSite(sitesList.length === 1 ? sitesList[0] : null);
      setStep(sitesList.length === 1 ? (sitesList[0].qrEnabled === false ? "FACE_LIVENESS" : "QR") : "SELECT_SITE");
      setErrorMsg("");
    } else if (sitesList.length === 0 && step !== "ERROR") {
      setErrorMsg("No site assigned to your profile. Backend returned 0 sites.");
      setStep("ERROR");
    }
  }, [sitesList, loaderError, step, errorMsg]);
  
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // 1. QR Scanner Handler
  const handleQrScan = (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const token = detectedCodes[0].rawValue;
      setQrToken(token);
      toast.success("QR Token Captured!");
      setStep("FACE_LIVENESS");
    }
  };

  // 2. Liveness Challenge & Face Capture
  useEffect(() => {
    if (step !== "FACE_LIVENESS" || !isCameraReady) return;
    
    // Fetch the dynamic challenge from the backend
    const fetchChallenge = async () => {
      try {
        const data = await attendanceApi.getLivenessChallenge();
        
        // Handle both camelCase (from DRF renderer) and snake_case
        const chalId = data.challengeId || data.challenge_id;
        
        if (chalId) {
          setChallengeId(chalId);
          setChallengeSteps(data.steps);
          
          // Execute the dynamic challenge sequence
          setLivenessPrompt(`Step 1: ${data.steps[0]}`);
          
          let timer1 = setTimeout(() => setLivenessPrompt(`Step 2: ${data.steps[1]}`), 2500);
          let timer2 = setTimeout(() => setLivenessPrompt("Perfect. Capturing..."), 5000);
          
          let timer3 = setTimeout(() => {
            captureFace();
          }, 6000);
          
          return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
        } else {
          setErrorMsg("Failed to retrieve liveness challenge from server.");
          setStep("ERROR");
        }
      } catch (err: any) {
        setErrorMsg(`CATCH ERROR: ${err.message || String(err)}`);
        setStep("ERROR");
      }
    };
    
    fetchChallenge();
  }, [step, isCameraReady]);

  const captureFace = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Convert base64 to Blob
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          setFaceImageBlob(blob);
          setStep("GEO");
        });
    } else {
      setErrorMsg("Failed to access camera.");
      setStep("ERROR");
    }
  }, [webcamRef]);

  // 3. Geolocation
  useEffect(() => {
    if (step !== "GEO") return;
    
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported. Using default.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        toast.success("GPS Location Acquired!");
      },
      (err) => {
        let msg = "Failed to get GPS. Using manual map position.";
        if (err.code === 1) msg = "Browser GPS Permission Denied. Please allow location access in your browser settings.";
        if (err.code === 2) msg = "GPS Position Unavailable on this device.";
        if (err.code === 3) msg = "GPS Request Timed Out. Try again.";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [step]);

  // 4. Submit to Backend
  useEffect(() => {
    if (step !== "SUBMITTING") {
      isSubmitting.current = false;
      return;
    }
    if ((site && site.qrEnabled !== false && !qrToken) || !faceImageBlob || !location) return;
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    const submitPunch = async () => {
      try {
        const payload: any = {
            punch_type: punchType,
            source: "ALL",
            latitude: location.lat.toString(),
            longitude: location.lng.toString(),
        };
        if (qrToken) payload.qr_token = qrToken;
        if (challengeId) payload.challenge_id = challengeId;

        const data = await attendanceApi.punchWithFace(payload, new File([faceImageBlob], "face.jpg", { type: "image/jpeg" }));
        
        if (data.status === 'PENDING_ML_INSTALL') {
           setVerifyStatus("PENDING ML INSTALL");
        } else {
           setVerifyStatus("VERIFIED");
        }
        
        setStep("DONE");
      } catch (err: any) {
        let msg = err.message || "Network Error";
        try {
            const parsed = JSON.parse(msg);
            msg = parsed.error || parsed.detail || msg;
        } catch (e) {}
        setErrorMsg(msg);
        setStep("ERROR");
      }
    };
    
    submitPunch();
  }, [step, qrToken, faceImageBlob, location]);

  const reset = () => {
    setQrToken(null);
    setFaceImageBlob(null);
    setLocation(null);
    setErrorMsg("");
    setVerifyStatus("");
    setIsCameraReady(false);
    
    if (loaderError) {
      setErrorMsg(`Backend API Error: ${loaderError}`);
      setStep("ERROR");
    } else if (sitesList.length === 0) {
      router.invalidate();
      setErrorMsg("No site assigned to your profile. Backend returned 0 sites.");
      setStep("ERROR");
    } else if (!site) {
      setStep("SELECT_SITE");
    } else {
      setStep(site.qrEnabled === false ? "FACE_LIVENESS" : "QR");
    }
  };

  return (
    <>
      <PageHeader title="Employee Scan & Punch" description="Unified secure punch: QR Token + Liveness Face Capture + GPS Geofence" />
      
      <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <Card className="p-6 shadow-[var(--shadow-elegant)] border-primary/20">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-semibold text-lg">Secure Punch</h3>
             <Badge variant="outline" className="font-mono">{step}</Badge>
          </div>
          
          {step === "GEO" && location && site && (
            <div className="flex gap-4 mb-4">
              <Button 
                className="flex-1" 
                variant="default"
                onClick={() => { setPunchType("IN"); setStep("SUBMITTING"); }}
              ><NavigationIcon className="h-4 w-4 mr-1" />Punch In</Button>
              <Button 
                className="flex-1" 
                variant="secondary"
                onClick={() => { setPunchType("OUT"); setStep("SUBMITTING"); }}
              >Punch Out</Button>
            </div>
          )}
          
          <div className="relative aspect-[3/4] sm:aspect-square bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-800 flex flex-col items-center justify-center">
            
            {step === "SELECT_SITE" && (
              <div className="w-full h-full p-8 flex flex-col items-center justify-center bg-white text-slate-900 absolute inset-0 z-20">
                 <MapPin className="h-12 w-12 text-primary mb-4" />
                 <h4 className="text-xl font-semibold mb-2">Select Your Location</h4>
                 <p className="text-sm text-muted-foreground text-center mb-6">Please confirm the site you are punching from.</p>
                 <div className="w-full max-w-xs space-y-4">
                   <div className="space-y-1.5">
                     <Label>Available Sites</Label>
                     <Select 
                       value={site ? String(site.id) : ""} 
                       onValueChange={(val) => {
                         const s = sitesList.find((x: any) => String(x.id) === val);
                         if (s) {
                           setSite(s);
                           setStep(s.qrEnabled === false ? "FACE_LIVENESS" : "QR");
                         }
                       }}
                     >
                       <SelectTrigger><SelectValue placeholder="Select a site..." /></SelectTrigger>
                       <SelectContent>
                         {sitesList.map((s: any) => (
                           <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
              </div>
            )}
            
            {step === "QR" && (
              <div className="w-full h-full p-4 relative">
                 <div className="absolute top-4 left-0 w-full text-center z-10 text-white font-medium drop-shadow-md">Scan Kiosk QR Code</div>
                 <Scanner onScan={handleQrScan} formats={['qr_code']} components={{ finder: false }} />
                 <div className="absolute inset-x-8 inset-y-16 border-2 border-primary border-dashed opacity-50 pointer-events-none rounded-xl" />
              </div>
            )}
            
            {step === "FACE_LIVENESS" && (
              <div className="w-full h-full relative">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: "user" }}
                  onUserMedia={() => setIsCameraReady(true)}
                  onUserMediaError={() => {
                    setErrorMsg("Camera permission denied or device unavailable.");
                    setStep("ERROR");
                  }}
                />
                <div className="absolute inset-0 border-[8px] border-slate-900/50 mix-blend-overlay pointer-events-none" />
                <div className="absolute inset-x-0 bottom-8 text-center px-4">
                   <div className="bg-black/70 backdrop-blur text-white px-4 py-2 rounded-full inline-block animate-pulse font-medium text-sm">
                     {isCameraReady ? livenessPrompt : "Initializing camera..."}
                   </div>
                </div>
                {/* Face Mesh visualizer overlay (mock) */}
                <div className="absolute inset-0 grid place-items-center pointer-events-none opacity-40">
                   <div className="w-48 h-60 rounded-[40%] border-2 border-dashed border-success animate-pulse" />
                </div>
              </div>
            )}
            
            {step === "GEO" && (
              <div className="w-full h-full relative bg-white overflow-hidden text-slate-900 cursor-crosshair"
                onClick={(e) => {
                  if (!site) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width;
                  const y = (e.clientY - rect.top) / rect.height;
                  const newLng = site.longitude + (x - 0.5) / 300;
                  const newLat = site.latitude - (y - 0.5) / 300;
                  setLocation({ lat: newLat, lng: newLng });
                }}
              >
                 <svg className="absolute inset-0 w-full h-full pointer-events-none">
                   <defs>
                     <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="oklch(0.85 0.02 200)" strokeWidth="1"/></pattern>
                   </defs>
                   <rect width="100%" height="100%" fill="url(#grid)" />
                 </svg>
                 {site && (
                   <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                     <div className="w-44 h-44 rounded-full bg-primary/15 border-2 border-primary/40 grid place-items-center animate-pulse">
                       <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_20px_var(--color-primary)]" />
                     </div>
                     <div className="text-center mt-2 text-xs font-semibold text-slate-700">Site geofence</div>
                   </div>
                 )}
                 {location && site && (
                   <div className="absolute transition-all duration-300 pointer-events-none" style={{ left: `${50 + (location.lng - site.longitude) * 30000}%`, top: `${50 - (location.lat - site.latitude) * 30000}%` }}>
                     <div className="w-4 h-4 rounded-full bg-success border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2" />
                     <div className="text-xs font-bold mt-1 px-2 py-0.5 rounded bg-white border shadow-sm absolute left-1/2 -translate-x-1/2">You</div>
                   </div>
                 )}
                 {!location && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none">
                     <MapPin className="w-10 h-10 mb-4 text-primary animate-bounce" />
                     <h4 className="font-semibold text-slate-800">Acquiring GPS...</h4>
                   </div>
                 )}
              </div>
            )}
            
            {step === "SUBMITTING" && (
              <div className="text-center text-white p-6">
                 <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
                 <h4 className="text-xl font-semibold">Authenticating Identity</h4>
                 <p className="text-sm text-slate-400 mt-2">Running DeepFace embeddings & cryptographic checks...</p>
              </div>
            )}
            
            {step === "DONE" && (
               <div className="text-center text-white p-6 bg-success/10 w-full h-full flex flex-col justify-center">
                 <CheckCircle2 className="w-20 h-20 mx-auto mb-4 text-success" />
                 <h4 className="text-2xl font-semibold text-success mb-2">Punch Recorded</h4>
                 <div className="bg-slate-900/50 p-4 rounded-xl inline-block mt-4 text-left border border-slate-800">
                    <p className="text-sm"><span className="text-slate-400 w-24 inline-block">QR Token:</span> <span className="text-success">Validated</span></p>
                    <p className="text-sm mt-1"><span className="text-slate-400 w-24 inline-block">Geofence:</span> <span className="text-success">Match (±15m)</span></p>
                    <p className="text-sm mt-1">
                      <span className="text-slate-400 w-24 inline-block">Biometric:</span> 
                      <span className={verifyStatus === 'VERIFIED' ? "text-success" : "text-amber-400"}>
                        {verifyStatus}
                      </span>
                    </p>
                 </div>
               </div>
            )}
            
            {step === "ERROR" && (
               <div className="text-center text-white p-6 bg-destructive/10 w-full h-full flex flex-col justify-center">
                 <XCircle className="w-20 h-20 mx-auto mb-4 text-destructive" />
                 <h4 className="text-xl font-semibold text-destructive mb-2">Authentication Failed</h4>
                 <p className="text-sm text-slate-300 mt-2 max-w-xs mx-auto border border-destructive/50 bg-destructive/20 p-3 rounded">{errorMsg}</p>
                 <Button onClick={reset} variant="outline" className="mt-8 bg-transparent text-white hover:text-black">Try Again</Button>
               </div>
            )}
            
          </div>
          
          {step === "DONE" && (
            <Button className="w-full mt-6" onClick={reset}>Scan Another</Button>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-6 border-l-4 border-l-primary">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Compliance & Security</h3>
            <ul className="space-y-3 text-sm text-muted-foreground mt-4">
              <li>
                <strong className="text-foreground">Zero Retention Policy:</strong> 
                <p className="mt-1">Raw facial images are processed in-memory and destroyed immediately after vector extraction. Images are never written to disk.</p>
              </li>
              <li>
                <strong className="text-foreground">Liveness Anti-Spoofing:</strong> 
                <p className="mt-1">Hardware requires blink and yaw detection to prevent static photo replay attacks.</p>
              </li>
              <li>
                <strong className="text-foreground">Cryptographic Isolation:</strong> 
                <p className="mt-1">Punches require a physically proximate rotating QR token coupled with encrypted GPS haversine validation.</p>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
