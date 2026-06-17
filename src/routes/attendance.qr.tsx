import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { QrCode, RotateCw, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/attendance/qr")({ component: QrPage });

function QrPage() {
  const [token, setToken] = useState(() => Math.random().toString(36).slice(2, 10).toUpperCase());
  const [counter, setCounter] = useState(30);

  useEffect(() => {
    const t = setInterval(() => setCounter(c => {
      if (c <= 1) { setToken(Math.random().toString(36).slice(2, 10).toUpperCase()); return 30; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);

  // Render QR as a simple pseudo-pattern using a deterministic SVG grid
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    const seed = token.charCodeAt(i % token.length) + i;
    return (seed * 7919) % 3 === 0;
  });

  return (
    <>
      <PageHeader title="Dynamic QR Check-in" description="Auto-rotating site QR — scan from the employee app" />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-8 flex flex-col items-center text-center shadow-[var(--shadow-elegant)]">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Bengaluru HQ • Site QR</div>
          <div className="p-4 rounded-xl bg-white border-4 border-primary/20">
            <svg viewBox="0 0 21 21" width={240} height={240} shapeRendering="crispEdges">
              {cells.map((on, i) => on && <rect key={i} x={i % 21} y={Math.floor(i/21)} width={1} height={1} fill="#0b1530" />)}
              {/* finder patterns */}
              {[[0,0],[14,0],[0,14]].map(([x,y]) => (
                <g key={`${x}-${y}`}><rect x={x} y={y} width={7} height={7} fill="none" stroke="#0b1530" strokeWidth={1} />
                  <rect x={x+2} y={y+2} width={3} height={3} fill="#0b1530" /></g>
              ))}
            </svg>
          </div>
          <div className="mt-4 font-mono text-sm">{token}</div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><RotateCw className="h-3 w-3" />Rotates in {counter}s</div>
          <Button className="mt-6 w-full max-w-xs" onClick={() => toast.success("QR simulated punch recorded for Aarav Sharma at 09:12")}>
            <QrCode className="h-4 w-4 mr-1" />Simulate Scan
          </Button>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" />Security</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Single-use, time-bound token (30s TTL)</li>
              <li>• Bound to site geofence — punches outside 150m rejected</li>
              <li>• Replay protection via server nonce</li>
              <li>• Optional face verification challenge after scan</li>
            </ul>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Recent Scans</h3>
            <ul className="divide-y text-sm">
              {[["Aarav Sharma","09:08","Verified"],["Priya Reddy","09:11","Verified"],["Karan Mehta","09:14","Failed"]].map(([n,t,s]) => (
                <li key={n} className="py-2 flex justify-between"><span>{n} <span className="text-muted-foreground">• {t}</span></span><Badge className={s === "Verified" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>{s}</Badge></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
