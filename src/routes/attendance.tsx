import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck2, QrCode, ScanFace, Navigation, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, empName } from "@/lib/mock-data";
import { StatCard } from "@/components/stat-card";

export const Route = createFileRoute("/attendance")({ component: AttendancePage });

function AttendancePage() {
  const { attendance, employees } = db();
  const today = new Date().toISOString().slice(0,10);
  const todayCount = attendance.filter(a => a.date === today).length;

  return (
    <>
      <PageHeader title="Attendance" description="Live attendance feed across all sites" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Today's Punches" value={String(todayCount)} icon={CalendarCheck2} tone="success" />
        <StatCard label="QR Verified" value={`${attendance.filter(a => a.qrStatus === "Verified").length}`} icon={QrCode} tone="info" />
        <StatCard label="Avg Face Score" value={`${Math.round(attendance.reduce((s,a) => s + a.faceScore, 0)/attendance.length)}%`} icon={ScanFace} />
        <StatCard label="Out-of-geofence" value={`${attendance.filter(a => a.distanceM > 150).length}`} icon={Navigation} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4 mb-6">
        {[
          { to: "/attendance/qr", icon: QrCode, title: "Dynamic QR", desc: "Auto-rotating QR for on-site punch" },
          { to: "/attendance/face", icon: ScanFace, title: "Face Verification", desc: "Selfie + liveness check" },
          { to: "/attendance/gps", icon: Navigation, title: "GPS Capture", desc: "Geofenced GPS punch" },
          { to: "/attendance/regularize", icon: ClipboardList, title: "Regularize", desc: "Missed punch corrections" },
        ].map(c => (
          <Link key={c.to} to={c.to}><Card className="p-5 hover:border-primary/40 hover:shadow-[var(--shadow-elegant)] transition-all">
            <c.icon className="h-6 w-6 text-primary mb-3" /><div className="font-semibold">{c.title}</div><div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
          </Card></Link>
        ))}
      </div>

      <DataTable rows={attendance} rowKey={r => r.id} searchKeys={[(r) => empName(r.employeeId)]} filename="attendance.csv"
        filters={[
          { label: "Status", key: "status", options: ["Present","WFH","Late","Absent","Half Day"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.status === v },
          { label: "Employee", key: "employeeId", options: employees.slice(0,20).map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })), predicate: (r, v) => r.employeeId === v },
        ]}
        columns={[
          { key: "date", header: "Date", accessor: r => r.date, sortable: true },
          { key: "emp", header: "Employee", render: r => empName(r.employeeId) },
          { key: "in", header: "Check-in", accessor: r => r.checkIn },
          { key: "out", header: "Check-out", accessor: r => r.checkOut ?? "—" },
          { key: "loc", header: "Location", render: r => r.location },
          { key: "dist", header: "Distance", accessor: r => r.distanceM, render: r => <span className={r.distanceM > 150 ? "text-destructive font-medium" : ""}>{r.distanceM} m</span> },
          { key: "qr", header: "QR", render: r => <Badge variant={r.qrStatus === "Verified" ? "default" : "secondary"} className={r.qrStatus === "Verified" ? "bg-success text-success-foreground" : r.qrStatus === "Failed" ? "bg-destructive text-destructive-foreground" : ""}>{r.qrStatus}</Badge> },
          { key: "face", header: "Face Score", accessor: r => r.faceScore, render: r => <span className={r.faceScore < 85 ? "text-warning-foreground" : "text-success"}>{r.faceScore}%</span> },
          { key: "status", header: "Status", render: r => <Badge variant="outline">{r.status}</Badge> },
        ]}
      />
    </>
  );
}
