import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck2, QrCode, ScanFace, Navigation as NavigationIcon, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { attendanceApi, employeesApi } from "@/api";

export const Route = createFileRoute("/attendance/")({
  loader: async () => {
    const [attendance, dashboard, employees] = await Promise.all([
      attendanceApi.getHistory(),
      attendanceApi.getDashboard(),
      employeesApi.getAll(),
    ]);
    return { attendance, dashboard, employees };
  },
  component: AttendancePage 
});

function AttendancePage() {
  const { attendance, dashboard, employees } = Route.useLoaderData();
  
  // Compute some stats based on punch history
  const isVerified = (status: string) => status === 'VERIFIED' || status === 'PENDING_ML_INSTALL';
  const qrVerified = attendance.filter(a => a.punches?.some((p: any) => (p.qr_token || p.qrToken) && isVerified(p.verification_status || p.verificationStatus))).length;
  const faceVerified = attendance.filter(a => a.punches?.some((p: any) => (p.source === 'ALL' || p.source === 'FACE') && isVerified(p.verification_status || p.verificationStatus))).length;
  const gpsPunches = attendance.filter(a => a.punches?.some((p: any) => p.latitude && p.longitude)).length;

  return (
    <>
      <PageHeader title="Attendance" description="Live attendance feed across all sites" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Today's Punches" value={String(dashboard?.presentToday || 0)} icon={CalendarCheck2} tone="success" />
        <StatCard label="QR Verified" value={String(qrVerified)} icon={QrCode} tone="info" />
        <StatCard label="Face Verified Punches" value={String(faceVerified)} icon={ScanFace} />
        <StatCard label="GPS Punches" value={String(gpsPunches)} icon={NavigationIcon} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4 mb-6">
        {[
          { to: "/attendance/qr", icon: QrCode, title: "Dynamic QR", desc: "Auto-rotating QR for on-site punch" },
          { to: "/attendance/face", icon: ScanFace, title: "Face Verification", desc: "Selfie + liveness check" },
          { to: "/attendance/gps", icon: NavigationIcon, title: "GPS Capture", desc: "Geofenced GPS punch" },
          { to: "/attendance/regularize", icon: ClipboardList, title: "Regularize", desc: "Missed punch corrections" },
        ].map(c => (
          <Link key={c.to} to={c.to}><Card className="p-5 hover:border-primary/40 hover:shadow-[var(--shadow-elegant)] transition-all">
            <c.icon className="h-6 w-6 text-primary mb-3" /><div className="font-semibold">{c.title}</div><div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
          </Card></Link>
        ))}
      </div>

      <DataTable rows={attendance} rowKey={r => r.id} searchKeys={[(r) => r.employeeName]} filename="attendance.csv"
        filters={[
          { label: "Status", key: "attendanceStatus", options: ["Present","Absent","Half Day"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.attendanceStatus === v },
          { label: "Employee", key: "employee", options: employees.map((e: any) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })), predicate: (r, v) => String(r.employee) === String(v) },
        ]}
        columns={[
          { key: "date", header: "Date", render: r => new Date(r.attendance_date || r.attendanceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), accessor: r => r.attendance_date || r.attendanceDate, sortable: true },
          { key: "emp", header: "Employee", render: r => `${r.employee_name || r.employeeName} (${r.employee_code || r.employeeCode})` },
          { key: "in", header: "Check-in", render: r => (r.first_check_in || r.firstCheckIn) ? new Date(r.first_check_in || r.firstCheckIn).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "—", accessor: r => r.first_check_in || r.firstCheckIn },
          { key: "out", header: "Check-out", render: r => (r.last_check_out || r.lastCheckOut) ? new Date(r.last_check_out || r.lastCheckOut).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "—", accessor: r => r.last_check_out || r.lastCheckOut },
          { key: "hours", header: "Total Hrs", render: r => r.total_work_hours || r.totalWorkHours ? `${r.total_work_hours || r.totalWorkHours}h` : "—", accessor: r => r.total_work_hours || r.totalWorkHours },
          { key: "qr", header: "QR", render: r => {
              const p = r.punches?.find((x: any) => x.qr_token || x.qrToken);
              if (!p) return <Badge variant="outline" className="text-muted-foreground">Not Verified</Badge>;
              const status = p.verification_status || p.verificationStatus;
              if (status === 'VERIFIED') return <Badge variant="outline" className="bg-success/10 text-success">Verified</Badge>;
              if (status === 'PENDING_ML_INSTALL') return <Badge variant="outline" className="bg-warning/10 text-warning">Pending ML</Badge>;
              return <Badge variant="outline" className="text-muted-foreground">Not Verified</Badge>;
            } 
          },
          { key: "face", header: "Face", render: r => {
              const p = r.punches?.find((x: any) => x.source === 'ALL' || x.source === 'FACE');
              if (!p) return <Badge variant="outline" className="text-muted-foreground">Not Verified</Badge>;
              const status = p.verification_status || p.verificationStatus;
              if (status === 'VERIFIED') return <Badge variant="outline" className="bg-success/10 text-success">Verified</Badge>;
              if (status === 'PENDING_ML_INSTALL') return <Badge variant="outline" className="bg-warning/10 text-warning">Pending ML</Badge>;
              return <Badge variant="outline" className="text-muted-foreground">Not Verified</Badge>;
            } 
          },
          { key: "status", header: "Status", render: r => <Badge variant={(r.attendance_status || r.attendanceStatus) === 'Present' ? 'default' : 'secondary'}>{r.attendance_status || r.attendanceStatus}</Badge> },
        ]}
      />
    </>
  );
}
