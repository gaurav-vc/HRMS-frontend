import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Navigation, MapPin, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/mock-data";

export const Route = createFileRoute("/attendance/gps")({ component: GpsPage });

function GpsPage() {
  const site = db().sites[0];
  const [pos, setPos] = useState({ lat: site.latitude + 0.0005, lng: site.longitude - 0.0003 });
  const distance = Math.round(Math.sqrt((pos.lat - site.latitude) ** 2 + (pos.lng - site.longitude) ** 2) * 111000);
  const inside = distance <= site.radius;

  return (
    <>
      <PageHeader title="GPS Capture" description="Geofenced location capture for mobile punches" />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 shadow-[var(--shadow-elegant)]">
          <div className="aspect-[16/10] rounded-xl border relative overflow-hidden" style={{ background: "linear-gradient(145deg, oklch(0.95 0.02 200), oklch(0.92 0.04 160))" }}>
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="oklch(0.85 0.02 200)" strokeWidth="1"/></pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-44 h-44 rounded-full bg-primary/15 border-2 border-primary/40 grid place-items-center animate-pulse">
                <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_20px_var(--color-primary)]" />
              </div>
              <div className="text-center mt-2 text-xs text-muted-foreground">Site geofence ({site.radius}m)</div>
            </div>
            <div className="absolute" style={{ left: `${50 + (pos.lng - site.longitude) * 30000}%`, top: `${50 - (pos.lat - site.latitude) * 30000}%` }}>
              <div className="w-4 h-4 rounded-full bg-success border-2 border-white shadow-lg" />
              <div className="text-xs font-medium mt-1 px-2 py-0.5 rounded bg-card border shadow-sm">You</div>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            <Stat label="Latitude" value={pos.lat.toFixed(6)} />
            <Stat label="Longitude" value={pos.lng.toFixed(6)} />
            <Stat label="Distance from site" value={`${distance} m`} highlight={!inside} />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => { setPos({ lat: site.latitude + (Math.random()-0.5)*0.002, lng: site.longitude + (Math.random()-0.5)*0.002 }); toast.success("Location refreshed"); }} variant="outline"><RefreshCw className="h-4 w-4 mr-1" />Refresh GPS</Button>
            <Button disabled={!inside} onClick={() => toast.success("Punch recorded — Bengaluru HQ")}><Navigation className="h-4 w-4 mr-1" />Punch In</Button>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Active site</h3>
          <div className="text-sm font-medium">{site.name}</div>
          <div className="text-xs text-muted-foreground">{site.address}</div>
          <div className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Radius</span><span>{site.radius} m</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">QR</span><Badge className="bg-success text-success-foreground">Enabled</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Face</span><Badge className="bg-info text-info-foreground">Enabled</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={inside ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>{inside ? "Inside geofence" : "Outside"}</Badge></div>
          </div>
        </Card>
      </div>
    </>
  );
}
function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div className="p-3 rounded-md border"><div className="text-xs text-muted-foreground">{label}</div><div className={`font-mono ${highlight ? "text-destructive" : ""}`}>{value}</div></div>;
}
