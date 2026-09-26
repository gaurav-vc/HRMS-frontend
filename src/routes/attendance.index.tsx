import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  CalendarCheck2,
  QrCode,
  ScanFace,
  Navigation as NavigationIcon,
  ClipboardList,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { attendanceApi, employeesApi } from "@/api";
import { EmployeeAttendanceReport } from "@/components/employee-attendance-report";

export const Route = createFileRoute("/attendance/")({
  loader: async () => {
    const [attendance, dashboard, employees] = await Promise.all([
      attendanceApi.getHistory(),
      attendanceApi.getDashboard(),
      employeesApi.getAll(),
    ]);
    return { attendance, dashboard, employees };
  },
  component: AttendancePage,
});

function AttendancePage() {
  const { attendance, dashboard, employees } = Route.useLoaderData();
  const [selectedPunch, setSelectedPunch] = useState<{
    lat: number;
    lng: number;
    title: string;
  } | null>(null);
  const [detailedRow, setDetailedRow] = useState<any>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportEmployeeId, setReportEmployeeId] = useState<number | null>(null);

  // Compute some stats based on punch history
  const isVerified = (status: string) => status === "VERIFIED" || status === "PENDING_ML_INSTALL";
  const qrVerified = attendance.filter((a) =>
    a.punches?.some(
      (p: any) =>
        (p.qr_token || p.qrToken) && isVerified(p.verification_status || p.verificationStatus),
    ),
  ).length;
  const faceVerified = attendance.filter((a) =>
    a.punches?.some(
      (p: any) =>
        (p.source === "ALL" || p.source === "FACE") &&
        isVerified(p.verification_status || p.verificationStatus),
    ),
  ).length;
  const gpsPunches = attendance.filter((a) =>
    a.punches?.some((p: any) => p.latitude && p.longitude),
  ).length;

  const months = useMemo(() => {
    const m = new Map<string, string>();
    attendance.forEach((r) => {
      const d = r.attendance_date || r.attendanceDate;
      if (d) {
        const date = new Date(d);
        const label = date.toLocaleString("default", { month: "long", year: "numeric" });
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        m.set(value, label);
      }
    });
    return Array.from(m.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => b.value.localeCompare(a.value));
  }, [attendance]);

  return (
    <>
      <Dialog open={!!selectedPunch} onOpenChange={(o) => !o && setSelectedPunch(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPunch?.title || "Location"}</DialogTitle>
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
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle>
              Attendance Details - {detailedRow?.employee_name || detailedRow?.employeeName}
            </DialogTitle>
            <Button size="sm" variant="outline" onClick={() => { setReportEmployeeId(detailedRow?.employee || null); setReportOpen(true); setDetailedRow(null); }}>
              View Monthly Report
            </Button>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-medium">
                  {detailedRow &&
                    new Date(
                      detailedRow.attendance_date || detailedRow.attendanceDate,
                    ).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge
                  variant={
                    (detailedRow?.attendance_status || detailedRow?.attendanceStatus) === "Present"
                      ? "default"
                      : "secondary"
                  }
                >
                  {detailedRow?.attendance_status || detailedRow?.attendanceStatus}
                </Badge>
              </div>
            </div>

            <h4 className="font-semibold text-sm border-b pb-2 mt-4">Punch Logs</h4>
            {detailedRow?.punches?.length > 0 ? (
              <div className="space-y-3">
                {detailedRow.punches.map((p: any, i: number) => {
                  const pTime = new Date(p.punch_time || p.punchTime).toLocaleTimeString(
                    undefined,
                    { hour: "2-digit", minute: "2-digit" },
                  );
                  return (
                    <div
                      key={p.id || i}
                      className="flex items-center justify-between p-3 border rounded-md bg-muted/20"
                    >
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <Badge
                            variant={
                              p.punch_type === "IN" || p.punchType === "IN" ? "default" : "outline"
                            }
                            className={
                              p.punch_type === "IN" || p.punchType === "IN"
                                ? "bg-success/10 text-success"
                                : ""
                            }
                          >
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedPunch({
                              lat: p.latitude,
                              lng: p.longitude,
                              title: `${p.punch_type || p.punchType} Location (${pTime})`,
                            })
                          }
                        >
                          <MapPin className="h-4 w-4 mr-2 text-primary" /> View Map
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                No detailed punches recorded.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EmployeeAttendanceReport
        open={reportOpen}
        onOpenChange={setReportOpen}
        initialEmployeeId={reportEmployeeId}
        employees={employees}
      />

      <PageHeader title="Attendance" description="Live attendance feed across all sites" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Today's Punches"
          value={String(dashboard?.presentToday || 0)}
          icon={CalendarCheck2}
          tone="success"
        />
        <StatCard label="QR Verified" value={String(qrVerified)} icon={QrCode} tone="info" />
        <StatCard label="Face Verified Punches" value={String(faceVerified)} icon={ScanFace} />
        <StatCard
          label="GPS Punches"
          value={String(gpsPunches)}
          icon={NavigationIcon}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4 mb-6">
        {[
          {
            to: "/attendance/qr",
            icon: QrCode,
            title: "Dynamic QR",
            desc: "Auto-rotating QR for on-site punch",
          },
          {
            to: "/attendance/face",
            icon: ScanFace,
            title: "Face Verification",
            desc: "Selfie + liveness check",
          },
          {
            to: "/attendance/gps",
            icon: NavigationIcon,
            title: "GPS Capture",
            desc: "Geofenced GPS punch",
          },
          {
            to: "/attendance/regularize",
            icon: ClipboardList,
            title: "Regularize",
            desc: "Missed punch corrections",
          },
        ].map((c) => (
          <Link key={c.to} to={c.to}>
            <Card className="p-5 hover:border-primary/40 hover:shadow-[var(--shadow-elegant)] transition-all">
              <c.icon className="h-6 w-6 text-primary mb-3" />
              <div className="font-semibold">{c.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
            </Card>
          </Link>
        ))}
      </div>

      <DataTable
        rows={attendance}
        rowKey={(r) => r.id}
        searchKeys={[(r) => r.employeeName]}
        filename="attendance.csv"
        onRowClick={(r) => setDetailedRow(r)}
        filters={[
          {
            label: "Status",
            key: "attendanceStatus",
            options: ["Present", "Absent", "Half Day"].map((s) => ({ value: s, label: s })),
            predicate: (r, v) => r.attendanceStatus === v,
          },
          {
            label: "Employee",
            key: "employee",
            options: employees.map((e: any) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName}`,
            })),
            predicate: (r, v) => String(r.employee) === String(v),
          },
          {
            label: "Month",
            key: "month",
            options: months,
            predicate: (r, v) => {
              const d = r.attendance_date || r.attendanceDate;
              if (!d) return false;
              const date = new Date(d);
              const rv = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
              return rv === v;
            },
          },
        ]}
        columns={[
          // --- CSV EXPORT ONLY COLUMNS ---
          {
            key: "emp_id",
            header: "Emp ID",
            exportOnly: true,
            accessor: (r) => r.employee_code || r.employeeCode || "",
          },
          {
            key: "emp_name",
            header: "Employee Name",
            exportOnly: true,
            accessor: (r) => r.full_name || r.fullName || r.employee_name || r.employeeName || "",
          },
          {
            key: "date_export",
            header: "Date",
            exportOnly: true,
            accessor: (r) => {
              const d = r.attendance_date || r.attendanceDate;
              return d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : "";
            },
          },
          {
            key: "shift",
            header: "Shift",
            exportOnly: true,
            accessor: (r) => r.shift_name || r.shiftName || "Not Assigned",
          },
          {
            key: "shift_start",
            header: "Shift Start",
            exportOnly: true,
            accessor: (r) => r.shift_start || r.shiftStart || "--:--",
          },
          {
            key: "in_time",
            header: "In Time",
            exportOnly: true,
            accessor: (r) => {
              const t = r.first_check_in || r.firstCheckIn;
              return t ? new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
            },
          },
          {
            key: "shift_end",
            header: "Shift End",
            exportOnly: true,
            accessor: (r) => r.shift_end || r.shiftEnd || "--:--",
          },
          {
            key: "out_time",
            header: "Out Time",
            exportOnly: true,
            accessor: (r) => {
              const t = r.last_check_out || r.lastCheckOut;
              return t ? new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
            },
          },
          {
            key: "shift_hours",
            header: "Shift Hours",
            exportOnly: true,
            accessor: (r) => r.shift_hours || r.shiftHours || "00:00",
          },
          {
            key: "work_hours",
            header: "Work Hours",
            exportOnly: true,
            accessor: (r) => r.total_work_hours || r.totalWorkHours || "00:00",
          },
          {
            key: "ot_hours",
            header: "OT Hours",
            exportOnly: true,
            accessor: (r) => r.overtime_hours || r.overtimeHours || "00:00",
          },
          {
            key: "attendance_export",
            header: "Attendance",
            exportOnly: true,
            accessor: (r) => r.attendance_status || r.attendanceStatus || "",
          },
          {
            key: "status_export",
            header: "Status",
            exportOnly: true,
            accessor: (r) => r.status_text || r.statusText || "—",
          },
          // --- UI ONLY COLUMNS ---
          {
            key: "date",
            header: "Date",
            noExport: true,
            render: (r) =>
              new Date(r.attendance_date || r.attendanceDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            accessor: (r) => {
              const d = r.attendance_date || r.attendanceDate;
              return d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : "";
            },
            sortable: true,
          },
          // UI Columns
          {
            key: "emp",
            header: "Employee",
            noExport: true,
            accessor: (r) =>
              `${r.full_name || r.fullName || r.employee_name || r.employeeName} (${r.employee_code || r.employeeCode})`,
            render: (r) => (
              <div className="flex flex-col">
                <span className="font-semibold text-[15px]">{r.full_name || r.fullName || r.employee_name || r.employeeName}</span>
                <span className="text-[11px] text-muted-foreground uppercase font-medium tracking-wide">
                  {r.designation || r.employee_code || r.employeeCode}
                </span>
              </div>
            ),
          },
          {
            key: "shift_ui",
            header: "Shift Info",
            noExport: true,
            render: (r) => {
              const name = r.shift_name || r.shiftName || "Not Assigned";
              const start = r.shift_start || r.shiftStart || "--:--";
              const end = r.shift_end || r.shiftEnd || "--:--";
              
              if (name === "Not Assigned") {
                return <span className="text-muted-foreground text-xs italic">No Shift</span>;
              }
              
              return (
                <div className="flex flex-col">
                  <span className="font-semibold text-[13px] text-foreground">{name}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">{start} - {end}</span>
                </div>
              );
            }
          },
          {
            key: "in",
            header: "Check-in",
            render: (r) => {
              const time =
                r.first_check_in || r.firstCheckIn
                  ? new Date(r.first_check_in || r.firstCheckIn).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
              const punchIn = r.punches?.find(
                (p: any) => p.punch_type === "IN" || p.punchType === "IN",
              );
              return (
                <div className="flex items-center gap-2">
                  <span>{time}</span>
                  {punchIn?.latitude && punchIn?.longitude && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-primary hover:bg-primary/10"
                      onClick={() =>
                        setSelectedPunch({
                          lat: punchIn.latitude,
                          lng: punchIn.longitude,
                          title: `Check-in Location (${time})`,
                        })
                      }
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            },
            accessor: (r) => {
              const t = r.first_check_in || r.firstCheckIn;
              return t ? new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
            },
          },
          {
            key: "out",
            header: "Check-out",
            render: (r) => {
              const time =
                r.last_check_out || r.lastCheckOut
                  ? new Date(r.last_check_out || r.lastCheckOut).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
              const punchOut = r.punches?.find(
                (p: any) => p.punch_type === "OUT" || p.punchType === "OUT",
              );
              return (
                <div className="flex items-center gap-2">
                  <span>{time}</span>
                  {punchOut?.latitude && punchOut?.longitude && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-primary hover:bg-primary/10"
                      onClick={() =>
                        setSelectedPunch({
                          lat: punchOut.latitude,
                          lng: punchOut.longitude,
                          title: `Check-out Location (${time})`,
                        })
                      }
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            },
            accessor: (r) => {
              const t = r.last_check_out || r.lastCheckOut;
              return t ? new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
            },
          },
          {
            key: "hours",
            header: "Total Hrs",
            noExport: true,
            render: (r) =>
              r.total_work_hours || r.totalWorkHours
                ? `${r.total_work_hours || r.totalWorkHours}h`
                : "—",
            accessor: (r) => r.total_work_hours || r.totalWorkHours,
          },
          {
            key: "qr",
            header: "QR",
            noExport: true,
            render: (r) => {
              const p = r.punches?.find((x: any) => x.qr_token || x.qrToken);
              if (!p)
                return (
                  <Badge variant="outline" className="text-muted-foreground">
                    Not Verified
                  </Badge>
                );
              const status = p.verification_status || p.verificationStatus;
              if (status === "VERIFIED")
                return (
                  <Badge variant="outline" className="bg-success/10 text-success">
                    Verified
                  </Badge>
                );
              if (status === "PENDING_ML_INSTALL")
                return (
                  <Badge variant="outline" className="bg-warning/10 text-warning">
                    Pending ML
                  </Badge>
                );
              return (
                <Badge variant="outline" className="text-muted-foreground">
                  Not Verified
                </Badge>
              );
            },
            accessor: (r) => {
              const p = r.punches?.find((x: any) => x.qr_token || x.qrToken);
              if (!p) return "Not Verified";
              const status = p.verification_status || p.verificationStatus;
              if (status === "VERIFIED") return "Verified";
              if (status === "PENDING_ML_INSTALL") return "Pending ML";
              return "Not Verified";
            },
          },
          {
            key: "face",
            header: "Face",
            render: (r) => {
              const p = r.punches?.find((x: any) => x.source === "ALL" || x.source === "FACE");
              if (!p)
                return (
                  <Badge variant="outline" className="text-muted-foreground">
                    Not Verified
                  </Badge>
                );
              const status = p.verification_status || p.verificationStatus;
              if (status === "VERIFIED")
                return (
                  <Badge variant="outline" className="bg-success/10 text-success">
                    Verified
                  </Badge>
                );
              if (status === "PENDING_ML_INSTALL")
                return (
                  <Badge variant="outline" className="bg-warning/10 text-warning">
                    Pending ML
                  </Badge>
                );
              return (
                <Badge variant="outline" className="text-muted-foreground">
                  Not Verified
                </Badge>
              );
            },
            accessor: (r) => {
              const p = r.punches?.find((x: any) => x.source === "ALL" || x.source === "FACE");
              if (!p) return "Not Verified";
              const status = p.verification_status || p.verificationStatus;
              if (status === "VERIFIED") return "Verified";
              if (status === "PENDING_ML_INSTALL") return "Pending ML";
              return "Not Verified";
            },
          },
          {
            key: "status",
            header: "Status",
            noExport: true,
            accessor: (r) => r.attendance_status || r.attendanceStatus || "",
            render: (r) => (
              <Badge
                variant={
                  (r.attendance_status || r.attendanceStatus) === "Present"
                    ? "default"
                    : "secondary"
                }
              >
                {r.attendance_status || r.attendanceStatus}
              </Badge>
            ),
          },
        ]}
      />
    </>
  );
}
