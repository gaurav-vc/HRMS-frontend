import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarCheck2, QrCode, ScanFace, Navigation as NavigationIcon, ClipboardList, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const [selectedPunch, setSelectedPunch] = useState<{lat: number, lng: number, title: string} | null>(null);
  const [detailedRow, setDetailedRow] = useState<any>(null);
  
  // Compute some stats based on punch history
  const isVerified = (status: string) => status === 'VERIFIED' || status === 'PENDING_ML_INSTALL';
  const qrVerified = attendance.filter(a => a.punches?.some((p: any) => (p.qr_token || p.qrToken) && isVerified(p.verification_status || p.verificationStatus))).length;
  const faceVerified = attendance.filter(a => a.punches?.some((p: any) => (p.source === 'ALL' || p.source === 'FACE') && isVerified(p.verification_status || p.verificationStatus))).length;
  const gpsPunches = attendance.filter(a => a.punches?.some((p: any) => p.latitude && p.longitude)).length;

  return (
    <>
      <Dialog open={!!selectedPunch} onOpenChange={(o) => !o && setSelectedPunch(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPunch?.title || 'Location'}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video relative rounded-md border overflow-hidden bg-muted">
            <iframe 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              loading="lazy" 
              allowFullScreen 
              referrerPolicy="no-referrer-when-downgrade" 
              src={`https://maps.google.com/maps?q=${selectedPunch?.lat},${selectedPunch?.lng}&t=m&z=17&ie=UTF8&iwloc=B&output=embed`}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!detailedRow} onOpenChange={(o) => !o && setDetailedRow(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Attendance Details - {detailedRow?.employee_name || detailedRow?.employeeName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-medium">{detailedRow && new Date(detailedRow.attendance_date || detailedRow.attendanceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant={(detailedRow?.attendance_status || detailedRow?.attendanceStatus) === 'Present' ? 'default' : 'secondary'}>{detailedRow?.attendance_status || detailedRow?.attendanceStatus}</Badge>
              </div>
            </div>
            
            <h4 className="font-semibold text-sm border-b pb-2 mt-4">Punch Logs</h4>
            {detailedRow?.punches?.length > 0 ? (
              <div className="space-y-3">
                {detailedRow.punches.map((p: any, i: number) => {
                  const pTime = new Date(p.punch_time || p.punchTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={p.id || i} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <Badge variant={p.punch_type === 'IN' || p.punchType === 'IN' ? 'default' : 'outline'} className={p.punch_type === 'IN' || p.punchType === 'IN' ? 'bg-success/10 text-success' : ''}>
                            {p.punch_type || p.punchType}
                          </Badge>
                          {pTime}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span>Source: {p.source}</span>
                          <span>•</span>
                          <span>Status: {p.verification_status || p.verificationStatus}</span>
                        </div>
                      </div>
                      {p.latitude && p.longitude && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedPunch({ lat: p.latitude, lng: p.longitude, title: `${p.punch_type || p.punchType} Location (${pTime})` })}>
                          <MapPin className="h-4 w-4 mr-2 text-primary" /> View Map
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">No detailed punches recorded.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
        onRowClick={(r) => setDetailedRow(r)}
        filters={[
          { label: "Status", key: "attendanceStatus", options: ["Present","Absent","Half Day"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.attendanceStatus === v },
          { label: "Employee", key: "employee", options: employees.map((e: any) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })), predicate: (r, v) => String(r.employee) === String(v) },
        ]}
        columns={[
          { key: "date", header: "Date", render: r => new Date(r.attendance_date || r.attendanceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), accessor: r => r.attendance_date || r.attendanceDate, sortable: true },
          { key: "emp", header: "Employee", accessor: r => `${r.employee_name || r.employeeName} (${r.employee_code || r.employeeCode})`, render: r => `${r.employee_name || r.employeeName} (${r.employee_code || r.employeeCode})` },
          { key: "in", header: "Check-in", render: r => {
              const time = (r.first_check_in || r.firstCheckIn) ? new Date(r.first_check_in || r.firstCheckIn).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "—";
              const punchIn = r.punches?.find((p: any) => p.punch_type === 'IN' || p.punchType === 'IN');
              return (
                <div className="flex items-center gap-2">
                  <span>{time}</span>
                  {punchIn?.latitude && punchIn?.longitude && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={() => setSelectedPunch({ lat: punchIn.latitude, lng: punchIn.longitude, title: `Check-in Location (${time})` })}>
                      <MapPin className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            }, accessor: r => r.first_check_in || r.firstCheckIn },
          { key: "out", header: "Check-out", render: r => {
              const time = (r.last_check_out || r.lastCheckOut) ? new Date(r.last_check_out || r.lastCheckOut).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "—";
              const punchOut = r.punches?.find((p: any) => p.punch_type === 'OUT' || p.punchType === 'OUT');
              return (
                <div className="flex items-center gap-2">
                  <span>{time}</span>
                  {punchOut?.latitude && punchOut?.longitude && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={() => setSelectedPunch({ lat: punchOut.latitude, lng: punchOut.longitude, title: `Check-out Location (${time})` })}>
                      <MapPin className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            }, accessor: r => r.last_check_out || r.lastCheckOut },
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
