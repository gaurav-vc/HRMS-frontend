import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ScanFace, Camera, ShieldCheck, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/attendance/face")({ component: FacePage });

function FacePage() {
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [score, setScore] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "scanning") return;
    let i = 0;
    const t = setInterval(() => {
      i += 7;
      setScore(Math.min(96, i));
      if (i >= 96) { clearInterval(t); setPhase("done"); toast.success("Face verified — punch recorded at 09:14"); }
    }, 80);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <>
      <PageHeader title="Face Verification" description="AI-based liveness check + face match against employee photo" />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-[var(--shadow-elegant)]">
          <div ref={ref} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-700 border">
            <div className="absolute inset-0 grid place-items-center">
              <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-primary-foreground/50 grid place-items-center">
                <ScanFace className="h-20 w-20 text-primary-foreground/60" />
              </div>
            </div>
            {phase === "scanning" && <div className="absolute inset-x-0 h-1 bg-primary shadow-[0_0_30px_var(--color-primary)] animate-[scan_1.5s_linear_infinite]" style={{ top: `${score}%` }} />}
            {phase === "done" && <div className="absolute inset-0 grid place-items-center bg-success/30 backdrop-blur-sm"><div className="text-center text-white"><CheckCircle2 className="h-16 w-16 mx-auto" /><div className="text-2xl font-semibold mt-2">Match: {score}%</div></div></div>}
            <div className="absolute top-3 left-3 flex gap-2"><span className="px-2 py-1 rounded bg-black/50 text-white text-xs">LIVE</span><span className="px-2 py-1 rounded bg-success/80 text-white text-xs">Liveness OK</span></div>
          </div>
          <div className="mt-4 space-y-3">
            <div><div className="flex justify-between text-xs text-muted-foreground"><span>Match Score</span><span>{score}%</span></div><Progress value={score} className="h-2 mt-1" /></div>
            {phase === "idle" && <Button className="w-full" onClick={() => { setScore(0); setPhase("scanning"); }}><Camera className="h-4 w-4 mr-1" />Start Face Verification</Button>}
            {phase === "done" && <Button variant="outline" className="w-full" onClick={() => { setPhase("idle"); setScore(0); }}>Reset</Button>}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" />Verification pipeline</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Camera + liveness check (blink, head turn)</li>
              <li>Face embedding extracted on-device</li>
              <li>Compared against stored employee template</li>
              <li>Minimum match threshold: 85%</li>
              <li>Combined with GPS + QR for final punch</li>
            </ol>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Recent verifications</h3>
            <ul className="divide-y text-sm">
              {[["Aarav Sharma",96],["Priya Reddy",92],["Karan Mehta",78]].map(([n,s]) => (
                <li key={String(n)} className="py-2 flex justify-between"><span>{n}</span><span className={Number(s) < 85 ? "text-destructive" : "text-success"}>{s}%</span></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
