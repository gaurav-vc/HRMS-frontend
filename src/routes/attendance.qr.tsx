import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, MonitorPlay } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { attendanceApi } from "@/api";

export const Route = createFileRoute("/attendance/qr")({ component: QrPage });

function QrPage() {
  const [token, setToken] = useState("");
  const [counter, setCounter] = useState(120);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await attendanceApi.generateQr({ site_id: 1 }); // site 1 for demo
        if (res && res.token) setToken(res.token);
      } catch (err) {
        console.error("Failed to fetch token", err);
      }
    };
    
    fetchToken();

    const t = setInterval(() => setCounter(c => {
      if (c <= 1) { fetchToken(); return 120; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <PageHeader title="Dynamic QR Kiosk" description="Auto-rotating site QR — mount this device at the secure entrance." />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-8 flex flex-col items-center justify-center text-center shadow-[var(--shadow-elegant)] min-h-[500px]">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Bengaluru HQ • Secure Gateway</div>
          
          <div className="p-6 rounded-2xl bg-white border-4 border-primary/10 shadow-inner relative">
            <div className="absolute top-2 right-2 flex space-x-1">
               <div className={`w-2 h-2 rounded-full ${counter > 10 ? 'bg-success' : 'bg-destructive animate-pulse'}`} />
            </div>
            {token ? (
              <QRCodeSVG 
                value={token} 
                size={280} 
                level={"H"} 
                includeMargin={false}
                fgColor={"#0b1530"}
              />
            ) : (
              <div className="w-[280px] h-[280px] bg-muted/20 animate-pulse rounded-lg flex items-center justify-center">
                 <span className="text-muted-foreground text-sm font-medium">Generating...</span>
              </div>
            )}
          </div>
          
          <div className="mt-8 font-mono text-sm tracking-widest bg-muted/50 px-4 py-2 rounded-full text-muted-foreground">
            {token ? `${token.substring(0,8)}-****` : 'WAITING...'}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MonitorPlay className="w-4 h-4" />
            <span>Refreshes in <strong className="text-foreground">{counter}s</strong></span>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" />Enterprise Security</h3>
            <ul className="space-y-2 text-sm text-muted-foreground mt-4">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                <p><strong>Cryptographic TTL:</strong> Token rotates every 120 seconds to prevent physical photograph replay attacks.</p>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                <p><strong>Single-Use Constraint:</strong> Burned immediately per employee. Cannot be replayed by the same individual.</p>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                <p><strong>Hardware Geofencing:</strong> Enforces Haversine proximity checks during punch sequence.</p>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                <p><strong>Biometric Fusion:</strong> Combined with Liveness Check and DeepFace ONNX matching on the employee device.</p>
              </li>
            </ul>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Live Scanner Activity</h3>
            <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              <p>Kiosk is isolated. Live activity monitored via employee app.</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
