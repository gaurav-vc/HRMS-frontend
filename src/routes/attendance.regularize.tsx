import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Check,
  X,
  MessageSquare,
  Plus,
  History,
  Clock,
  Calendar,
  CalendarRange,
  Search,
  Sparkles,
  Filter,
  User,
  ChevronDown,
  Building2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { attendanceApi, employeesApi, sitesApi, leavesConfigApi } from "@/api";

type Status = "Pending" | "Approved" | "Rejected";

interface Event {
  at: string;
  by: string;
  action: string;
  comment?: string;
}

interface Row {
  id: string | number;
  employeeName: string;
  employee: string | number;
  attendanceDate: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: Status;
  managerComments?: string;
  approvedAt?: string;
  createdAt: string;
  history: Event[];
}

export const Route = createFileRoute("/attendance/regularize")({
  loader: async () => {
    const [regs, employees, sites, leaveConfig] = await Promise.all([
      attendanceApi.getRegularizations(),
      employeesApi.getAll(),
      sitesApi.getAll(),
      leavesConfigApi.getSettings().catch(() => ({ is_saturday_working: false })),
    ]);
    return { regs, employees, sites, leaveConfig };
  },
  component: RegPage,
});

function RegPage() {
  const loaderData = Route.useLoaderData() as any;
  const rawRegs = loaderData?.regs;
  const rawEmployees = loaderData?.employees;
  const rawSites = loaderData?.sites;
  const rawLeaveConfig = loaderData?.leaveConfig;

  // Defensive array extraction to handle both flat arrays and paginated DRF responses
  const employees: any[] = useMemo(() => {
    return Array.isArray(rawEmployees)
      ? rawEmployees
      : (rawEmployees as any)?.results || [];
  }, [rawEmployees]);

  const sites: any[] = useMemo(() => {
    return Array.isArray(rawSites)
      ? rawSites
      : (rawSites as any)?.results || [];
  }, [rawSites]);

  const rawRegsList: any[] = useMemo(() => {
    return Array.isArray(rawRegs) ? rawRegs : (rawRegs as any)?.results || [];
  }, [rawRegs]);

  const { user } = useAuth();
  const router = useRouter();

  // Dynamic permission check: ZERO hardcoded roles
  const isReviewer = Boolean(
    user?.can_approve ||
      user?.is_superuser ||
      user?.dynamic_role?.can_approve ||
      user?.dynamic_role?.permissions?.regularization?.approve ||
      user?.dynamic_role?.permissions?.attendance?.approve ||
      (user?.access_scope && ["Corporate", "Region"].includes(user.access_scope)) ||
      (user?.dynamic_role?.access_scope &&
        ["Corporate", "Region"].includes(user.dynamic_role.access_scope))
  );

  // Map API response to our UI format
  const rows: Row[] = useMemo(() => {
    return rawRegsList.map((r: any) => ({
      ...r,
      employeeName: r.employee_name || r.employeeName || "Employee",
      attendanceDate: r.attendance_date || r.attendanceDate || "—",
      requestedCheckIn:
        r.requested_check_in || r.requestedCheckIn
          ? new Date(r.requested_check_in || r.requestedCheckIn).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
      requestedCheckOut:
        r.requested_check_out || r.requestedCheckOut
          ? new Date(r.requested_check_out || r.requestedCheckOut).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
      history: [
        {
          at: new Date(r.created_at || r.createdAt || Date.now()).toLocaleString(),
          by: r.employee_name || r.employeeName || "Employee",
          action: "Submitted",
          comment: r.reason,
        },
        ...(r.status !== "Pending"
          ? [
              {
                at: r.approved_at
                  ? new Date(r.approved_at).toLocaleString()
                  : new Date(r.updated_at || r.updatedAt || Date.now()).toLocaleString(),
                by: "Manager",
                action: r.status,
                comment: r.manager_comments || r.managerComments,
              },
            ]
          : []),
      ],
    }));
  }, [rawRegsList]);

  const [acting, setActing] = useState<{ row: Row; type: "Approved" | "Rejected" } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time Search State
  const [timeFilter, setTimeFilter] = useState<string>("");

  // Mode: "single" vs "range"
  const [applyMode, setApplyMode] = useState<"single" | "range">("single");

  // Multiple Employee Selection State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    employees[0]?.id ? [String(employees[0].id)] : []
  );

  // Single Date Form State
  const [form, setForm] = useState({
    employeeId: employees[0]?.id ? String(employees[0].id) : "",
    date: new Date().toISOString().slice(0, 10),
    requestedIn: "09:30",
    requestedOut: "18:30",
    reason: "",
  });

  // Date Range Form State
  const [rangeForm, setRangeForm] = useState({
    startDate: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    requestedIn: "09:30",
    requestedOut: "18:30",
    skipSundays: true,
    includeSaturday: false,
    reason: "",
  });

  // Ensure default employee selection when employees list loads
  useEffect(() => {
    if (selectedEmployeeIds.length === 0 && employees.length > 0) {
      const firstId = String(employees[0].id);
      setSelectedEmployeeIds([firstId]);
      setForm((prev) => ({ ...prev, employeeId: firstId }));
    }
  }, [employees, selectedEmployeeIds.length]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((item) => item !== id) : [...prev, id];
      if (updated.length > 0) {
        setForm((f) => ({ ...f, employeeId: updated[0] }));
      }
      return updated;
    });
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredEmployees.map((e: any) => String(e.id));
    setSelectedEmployeeIds((prev) => {
      const set = new Set([...prev, ...filteredIds]);
      const list = Array.from(set);
      if (list.length > 0) setForm((f) => ({ ...f, employeeId: list[0] }));
      return list;
    });
  };

  const deselectAllFiltered = () => {
    const filteredIds = new Set(filteredEmployees.map((e: any) => String(e.id)));
    setSelectedEmployeeIds((prev) => {
      const updated = prev.filter((id) => !filteredIds.has(id));
      if (updated.length > 0) setForm((f) => ({ ...f, employeeId: updated[0] }));
      return updated;
    });
  };

  // Selected Employee lookup
  const selectedEmployee = useMemo(() => {
    const targetId = selectedEmployeeIds[0] || form.employeeId;
    return employees.find((e: any) => String(e.id) === String(targetId)) || null;
  }, [employees, selectedEmployeeIds, form.employeeId]);

  const selectedEmployeesSummary = useMemo(() => {
    if (selectedEmployeeIds.length === 0) return "";
    const names = employees
      .filter((e: any) => selectedEmployeeIds.includes(String(e.id)))
      .map((e: any) => `${e.firstName} ${e.lastName}`);
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  }, [employees, selectedEmployeeIds]);

  // Site lookup for the selected employee
  const employeeSite = useMemo(() => {
    if (!selectedEmployee) return null;
    const sId =
      selectedEmployee.site?.id ||
      selectedEmployee.site ||
      selectedEmployee.siteId ||
      selectedEmployee.site_id;
    return sites.find((s: any) => String(s.id) === String(sId)) || null;
  }, [selectedEmployee, sites]);

  // Settings (Base Entitlements) Saturday configuration
  const settingsSaturdayWorking = useMemo(() => {
    return Boolean(
      rawLeaveConfig?.is_saturday_working === true ||
      rawLeaveConfig?.isSaturdayWorking === true ||
      rawLeaveConfig?.is_saturday_working === "true" ||
      rawLeaveConfig?.isSaturdayWorking === "true" ||
      rawLeaveConfig?.is_saturday_working === "True" ||
      rawLeaveConfig?.isSaturdayWorking === "True"
    );
  }, [rawLeaveConfig]);

  // Dynamically sync Saturday inclusion whenever settings Saturday toggle changes or modal opens
  useEffect(() => {
    setRangeForm((prev) => ({
      ...prev,
      includeSaturday: settingsSaturdayWorking,
    }));
  }, [settingsSaturdayWorking, createOpen]);

  // Search Employee Filter inside Modal
  const [empSearch, setEmpSearch] = useState<string>("");
  const [empDropdownOpen, setEmpDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEmpDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return employees;
    const q = empSearch.toLowerCase().trim();
    return employees.filter(
      (e: any) =>
        `${e.firstName || ""} ${e.lastName || ""}`.toLowerCase().includes(q) ||
        (e.code && e.code.toLowerCase().includes(q)) ||
        (e.department?.name && e.department.name.toLowerCase().includes(q))
    );
  }, [employees, empSearch]);

  const [detail, setDetail] = useState<Row | null>(null);

  // Dynamic Real-Time Date Range Calculation
  const rangePreview = useMemo(() => {
    if (!rangeForm.startDate || !rangeForm.endDate) {
      return { days: [], count: 0, hoursPerDay: 0, totalHours: 0, saturdayCount: 0 };
    }
    const start = new Date(rangeForm.startDate);
    const end = new Date(rangeForm.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return { days: [], count: 0, hoursPerDay: 0, totalHours: 0, saturdayCount: 0 };
    }

    const days: {
      dateStr: string;
      displayStr: string;
      dayType: "weekday" | "saturday";
    }[] = [];
    const curr = new Date(start);
    let saturdayCount = 0;

    while (curr <= end) {
      const dayOfWeek = curr.getDay(); // 0 = Sun, 6 = Sat

      // 0 = Sunday: Skipped by default
      if (dayOfWeek === 0 && rangeForm.skipSundays) {
        curr.setDate(curr.getDate() + 1);
        continue;
      }

      // 6 = Saturday: Dynamically check if Saturday is working
      if (dayOfWeek === 6) {
        if (!rangeForm.includeSaturday) {
          // Saturday is skipped because it's not working for this site
          curr.setDate(curr.getDate() + 1);
          continue;
        }
        saturdayCount++;
      }

      days.push({
        dateStr: curr.toISOString().slice(0, 10),
        displayStr: curr.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        dayType: dayOfWeek === 6 ? "saturday" : "weekday",
      });

      curr.setDate(curr.getDate() + 1);
    }

    let hoursPerDay = 9.0;
    try {
      const [inH, inM] = rangeForm.requestedIn.split(":").map(Number);
      const [outH, outM] = rangeForm.requestedOut.split(":").map(Number);
      const inMins = inH * 60 + inM;
      const outMins = outH * 60 + outM;
      const diff = (outMins - inMins) / 60;
      if (diff > 0) hoursPerDay = Number(diff.toFixed(2));
    } catch (e) {
      /* fallback */
    }

    return {
      days,
      count: days.length,
      hoursPerDay,
      totalHours: Number((days.length * hoursPerDay).toFixed(2)),
      saturdayCount,
    };
  }, [
    rangeForm.startDate,
    rangeForm.endDate,
    rangeForm.skipSundays,
    rangeForm.includeSaturday,
    rangeForm.requestedIn,
    rangeForm.requestedOut,
  ]);

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === "Pending").length,
      approved: rows.filter((r) => r.status === "Approved").length,
      rejected: rows.filter((r) => r.status === "Rejected").length,
    }),
    [rows]
  );

  const confirmAction = async () => {
    if (!acting) return;
    if (acting.type === "Rejected" && !comment.trim()) {
      toast.error("Please add a reason for rejection");
      return;
    }

    try {
      await attendanceApi.approveRegularization(acting.row.id, {
        status: acting.type,
        manager_comments: comment,
      });
      toast.success(`Request ${acting.type.toLowerCase()}`);
      setActing(null);
      setComment("");
      router.invalidate();
    } catch (err) {
      toast.error("Failed to perform action");
    }
  };

  const submitNew = async () => {
    if (selectedEmployeeIds.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    if (applyMode === "single") {
      if (!form.reason.trim()) {
        toast.error("Reason is required");
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await attendanceApi.bulkApplyRegularization({
          employee_ids: selectedEmployeeIds,
          start_date: form.date,
          end_date: form.date,
          requested_in: form.requestedIn,
          requested_out: form.requestedOut,
          reason: form.reason,
          skip_sundays: false,
          include_saturday: true,
        });
        toast.success(
          res?.message ||
            `Successfully submitted regularization for ${selectedEmployeeIds.length} employee(s)`
        );
        setCreateOpen(false);
        setForm((prev) => ({ ...prev, reason: "" }));
        router.invalidate();
      } catch (err: any) {
        let msg = err?.message || "Failed to submit regularization";
        try {
          const parsed = JSON.parse(msg);
          msg = parsed.error || parsed.detail || msg;
        } catch {}
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Date Range Multi-Day Mode
      if (!rangeForm.reason.trim()) {
        toast.error("Reason is required");
        return;
      }
      if (!rangeForm.startDate || !rangeForm.endDate) {
        toast.error("Start date and End date are required");
        return;
      }
      if (rangePreview.count === 0) {
        toast.error("No valid working days selected in this date range");
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await attendanceApi.bulkApplyRegularization({
          employee_ids: selectedEmployeeIds,
          start_date: rangeForm.startDate,
          end_date: rangeForm.endDate,
          requested_in: rangeForm.requestedIn,
          requested_out: rangeForm.requestedOut,
          reason: rangeForm.reason,
          skip_sundays: rangeForm.skipSundays,
          include_saturday: rangeForm.includeSaturday,
        });
        toast.success(
          res?.message ||
            `Successfully regularized ${selectedEmployeeIds.length} employee(s) across ${rangePreview.count} working day(s)`
        );
        setCreateOpen(false);
        setRangeForm((prev) => ({ ...prev, reason: "" }));
        router.invalidate();
      } catch (err: any) {
        let msg = err.message || "Failed to apply date range regularization";
        try {
          const parsed = JSON.parse(msg);
          msg = parsed.error || parsed.detail || msg;
        } catch (e) {
          /* ignore */
        }
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Filtered rows matching both Status and Search Time Filter
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (timeFilter.trim()) {
        const t = timeFilter.toLowerCase().trim();
        const inMatch = r.requestedCheckIn.toLowerCase().includes(t);
        const outMatch = r.requestedCheckOut.toLowerCase().includes(t);
        if (!inMatch && !outMatch) return false;
      }
      return true;
    });
  }, [rows, statusFilter, timeFilter]);

  return (
    <>
      <PageHeader
        title="Attendance Regularization"
        description="Pending approvals queue with reviewer comments, time search, and multi-day range corrections"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            New Regularization
          </Button>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => setStatusFilter(statusFilter === "Pending" ? null : "Pending")}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard
            label="Pending Review"
            value={String(counts.pending)}
            tone="warning"
            icon={MessageSquare}
          />
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === "Approved" ? null : "Approved")}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard label="Approved" value={String(counts.approved)} tone="success" icon={Check} />
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === "Rejected" ? null : "Rejected")}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard label="Rejected" value={String(counts.rejected)} tone="info" icon={X} />
        </div>
      </div>

      {/* Dynamic Time Search & Quick Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-muted/40 p-3 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Clock className="w-4 h-4" />
          </div>
          <div className="relative flex-1 max-w-sm">
            <Input
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              placeholder="Search by time: e.g. 09:30, 18:30, 09:00 AM..."
              className="h-9 text-xs pr-8 bg-background rounded-xl border-muted-foreground/20"
            />
            {timeFilter && (
              <button
                onClick={() => setTimeFilter("")}
                className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                title="Clear time filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Shift Time Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Time Presets:
          </span>
          {["09:30", "10:00", "18:30", "19:00"].map((preset) => (
            <Button
              key={preset}
              variant={timeFilter === preset ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs px-3 rounded-xl transition-all"
              onClick={() => setTimeFilter(timeFilter === preset ? "" : preset)}
            >
              {preset}
            </Button>
          ))}
          {timeFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2.5 text-muted-foreground hover:text-destructive"
              onClick={() => setTimeFilter("")}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <DataTable
        rows={filteredRows}
        rowKey={(r) => String(r.id)}
        tableId="regularize"
        searchKeys={[
          (r) => String(r.employeeName || ""),
          "reason",
          (r) => String(r.requestedCheckIn || ""),
          (r) => String(r.requestedCheckOut || ""),
          (r) => String(r.attendanceDate || ""),
        ]}
        filename="regularizations.csv"
        filters={[
          {
            label: "Status",
            key: "status",
            options: ["Pending", "Approved", "Rejected"].map((s) => ({ value: s, label: s })),
            predicate: (r, v) => r.status === v,
          },
        ]}
        columns={[
          {
            key: "emp",
            header: "Employee",
            render: (r) => <span className="font-semibold text-foreground">{r.employeeName}</span>,
            accessor: (r) => r.employeeName,
          },
          {
            key: "date",
            header: "Date",
            render: (r) => (
              <span className="font-mono text-xs font-medium text-foreground">
                {r.attendanceDate}
              </span>
            ),
            accessor: (r) => r.attendanceDate,
            sortable: true,
          },
          {
            key: "in",
            header: "In Time",
            render: (r) => (
              <Badge
                variant="outline"
                className="font-mono text-xs border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
              >
                {r.requestedCheckIn}
              </Badge>
            ),
            accessor: (r) => r.requestedCheckIn,
          },
          {
            key: "out",
            header: "Out Time",
            render: (r) => (
              <Badge
                variant="outline"
                className="font-mono text-xs border-indigo-500/30 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20"
              >
                {r.requestedCheckOut}
              </Badge>
            ),
            accessor: (r) => r.requestedCheckOut,
          },
          {
            key: "reason",
            header: "Reason",
            render: (r) => <span className="text-xs text-muted-foreground">{r.reason}</span>,
            accessor: (r) => r.reason,
          },
          {
            key: "reviewer",
            header: "Reviewer",
            render: (r) =>
              r.managerComments ? (
                <div className="text-xs font-medium">Manager</div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
            accessor: (r) => (r.managerComments ? "Manager" : "—"),
          },
          {
            key: "comment",
            header: "Comment",
            render: (r) =>
              r.managerComments ? (
                <span className="text-xs italic text-muted-foreground">
                  "{r.managerComments}"
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
            accessor: (r) => r.managerComments || "—",
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge s={r.status} />,
            accessor: (r) => r.status,
          },
        ]}
        actions={(r) => (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" title="History" onClick={() => setDetail(r)}>
              <History className="h-4 w-4" />
            </Button>
            {isReviewer && r.status === "Pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-success border-success/40 hover:bg-success/10"
                  onClick={() => {
                    setActing({ row: r, type: "Approved" });
                    setComment("");
                  }}
                  title="Approve regularization"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  onClick={() => {
                    setActing({ row: r, type: "Rejected" });
                    setComment("");
                  }}
                  title="Reject regularization"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      />

      {/* Approval / Rejection Confirmation Modal */}
      <Dialog open={!!acting} onOpenChange={(o) => !o && setActing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {acting?.type === "Approved" ? "Approve Regularization" : "Reject Regularization"}
            </DialogTitle>
            <DialogDescription>
              {acting && (
                <>
                  {acting.row.employeeName} &bull; {acting.row.attendanceDate} &bull;{" "}
                  {acting.row.requestedCheckIn} – {acting.row.requestedCheckOut}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Reviewer comment{" "}
              {acting?.type === "Rejected" && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder={
                acting?.type === "Approved"
                  ? "Optional approval note for the employee…"
                  : "State reason for rejection…"
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActing(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              className={
                acting?.type === "Approved"
                  ? "bg-success hover:bg-success/90 text-success-foreground"
                  : ""
              }
              variant={acting?.type === "Rejected" ? "destructive" : "default"}
            >
              Confirm {acting?.type}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Regularization Dialog (Single Date & Multi-Day Date Range) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>New Regularization</span>
            </DialogTitle>
            <DialogDescription>
              Submit single or multi-day missed-punch corrections with dynamic schedule updates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1">
            {/* Searchable Multi-Select Employee Combobox */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Employee(s)</Label>
                <div className="flex items-center gap-2">
                  {selectedEmployeeIds.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">
                      {selectedEmployeeIds.length} selected
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {filteredEmployees.length} of {employees.length} employees
                  </span>
                </div>
              </div>

              <div className="relative">
                {/* Trigger Button showing Selected Employee(s) */}
                <button
                  type="button"
                  onClick={() => setEmpDropdownOpen(!empDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border bg-background hover:bg-muted/50 transition-colors shadow-sm text-left"
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                    {selectedEmployeeIds.length === 0 ? (
                      <span className="text-muted-foreground">Select employee(s)...</span>
                    ) : selectedEmployeeIds.length === 1 && selectedEmployee ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                          {selectedEmployee.firstName?.[0] || ""}{selectedEmployee.lastName?.[0] || ""}
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold text-foreground truncate">
                            {selectedEmployee.firstName} {selectedEmployee.lastName}
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            ({selectedEmployee.code})
                          </span>
                          {selectedEmployee.department?.name && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                              {selectedEmployee.department.name}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
                          {selectedEmployeeIds.length}
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold text-foreground">
                            {selectedEmployeeIds.length} Employees Selected
                          </span>
                          <span className="text-muted-foreground text-[11px] truncate">
                            ({selectedEmployeesSummary})
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform duration-200 ${empDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Searchable Multi-Select Dropdown Popup */}
                {empDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 p-2.5 bg-popover text-popover-foreground rounded-2xl border shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="relative mb-2">
                      <Input
                        placeholder="Search employee by name, code, dept..."
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        autoFocus
                        className="h-8 text-xs pl-8 pr-7 bg-background rounded-lg"
                      />
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                      {empSearch && (
                        <button
                          type="button"
                          onClick={() => setEmpSearch("")}
                          className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Quick Selection Actions Toolbar */}
                    <div className="flex items-center justify-between pb-2 mb-1 border-b text-[11px] px-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllFiltered}
                          className="text-primary hover:underline font-semibold"
                        >
                          Select All ({filteredEmployees.length})
                        </button>
                        <span className="text-muted-foreground">·</span>
                        <button
                          type="button"
                          onClick={deselectAllFiltered}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEmpDropdownOpen(false)}
                        className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90"
                      >
                        Done
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {filteredEmployees.map((e: any) => {
                        const isSelected = selectedEmployeeIds.includes(String(e.id));
                        return (
                          <div
                            key={e.id}
                            onClick={() => toggleEmployee(String(e.id))}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleEmployee(String(e.id))}
                                onClick={(ev) => ev.stopPropagation()}
                              />
                              <span className="truncate">
                                {e.firstName} {e.lastName}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                                ({e.code})
                              </span>
                              {e.department?.name && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                  {e.department.name}
                                </span>
                              )}
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                        );
                      })}

                      {filteredEmployees.length === 0 && (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No employees matching "{empSearch}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mode Switcher: Single Day vs Date Range */}
            <div className="grid grid-cols-2 p-1 bg-muted rounded-xl gap-1 border">
              <button
                type="button"
                onClick={() => setApplyMode("single")}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  applyMode === "single"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Single Date</span>
              </button>
              <button
                type="button"
                onClick={() => setApplyMode("range")}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  applyMode === "range"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Date Range (Multi-Day)</span>
              </button>
            </div>

            {/* SINGLE DATE FORM */}
            {applyMode === "single" ? (
              <div className="space-y-3 bg-muted/20 p-3 rounded-xl border">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs font-medium">Date</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="h-9 text-xs mt-1 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">In Time</Label>
                    <Input
                      type="time"
                      value={form.requestedIn}
                      onChange={(e) => setForm({ ...form, requestedIn: e.target.value })}
                      className="h-9 text-xs mt-1 bg-background font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Out Time</Label>
                    <Input
                      type="time"
                      value={form.requestedOut}
                      onChange={(e) => setForm({ ...form, requestedOut: e.target.value })}
                      className="h-9 text-xs mt-1 bg-background font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* DATE RANGE MULTI-DAY FORM */
              <div className="space-y-3 bg-primary/5 p-3.5 rounded-2xl border border-primary/25">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-medium">Start Date</Label>
                    <Input
                      type="date"
                      value={rangeForm.startDate}
                      onChange={(e) =>
                        setRangeForm({ ...rangeForm, startDate: e.target.value })
                      }
                      className="h-9 text-xs mt-1 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">End Date</Label>
                    <Input
                      type="date"
                      value={rangeForm.endDate}
                      onChange={(e) => setRangeForm({ ...rangeForm, endDate: e.target.value })}
                      className="h-9 text-xs mt-1 bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium">In Time</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">09:30</span>
                    </div>
                    <Input
                      type="time"
                      value={rangeForm.requestedIn}
                      onChange={(e) =>
                        setRangeForm({ ...rangeForm, requestedIn: e.target.value })
                      }
                      className="h-9 text-xs mt-1 bg-background font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium">Out Time</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">18:30</span>
                    </div>
                    <Input
                      type="time"
                      value={rangeForm.requestedOut}
                      onChange={(e) =>
                        setRangeForm({ ...rangeForm, requestedOut: e.target.value })
                      }
                      className="h-9 text-xs mt-1 bg-background font-mono"
                    />
                  </div>
                </div>

                {/* DYNAMIC WEEKEND CONFIGURATION: SATURDAY SITE TOGGLE */}
                <div className="pt-1">
                  {/* Saturday Rule (Dynamically checks Settings -> Base Entitlements: is_saturday_working) */}
                  <div
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      rangeForm.includeSaturday
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-muted/40 border-muted text-muted-foreground"
                    }`}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1">
                      <input
                        type="checkbox"
                        checked={rangeForm.includeSaturday}
                        onChange={(e) =>
                          setRangeForm((prev) => ({ ...prev, includeSaturday: e.target.checked }))
                        }
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {rangeForm.includeSaturday
                            ? "Saturdays Included (Working Day)"
                            : "Saturdays Skipped (Off-Day)"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Settings:{" "}
                          <strong
                            className={
                              settingsSaturdayWorking
                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                : "text-amber-600 dark:text-amber-400 font-semibold"
                            }
                          >
                            {settingsSaturdayWorking
                              ? "Saturday Working Toggle ON"
                              : "Saturday Working Toggle OFF"}
                          </strong>
                        </span>
                      </div>
                    </label>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono shrink-0 ml-2 ${
                        rangeForm.includeSaturday
                          ? "border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                          : "border-muted text-muted-foreground"
                      }`}
                    >
                      {rangeForm.includeSaturday ? "Working (Added)" : "Off (Skipped)"}
                    </Badge>
                  </div>
                </div>

                {/* Dynamic Real-Time Date Calculation Card */}
                {rangePreview.count > 0 && (
                  <div className="bg-background/90 border border-primary/25 rounded-xl p-3 space-y-2 shadow-sm animate-in fade-in duration-150">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-primary flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        {rangePreview.count} Working Day{rangePreview.count > 1 ? "s" : ""} Selected
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {rangePreview.hoursPerDay} hrs/day &bull; Total {rangePreview.totalHours} hrs
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                      {rangePreview.days.map((d) => (
                        <span
                          key={d.dateStr}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${
                            d.dayType === "saturday"
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold"
                              : "bg-muted/60 border-muted text-foreground"
                          }`}
                        >
                          {d.displayStr}
                          {d.dayType === "saturday" && " (Sat)"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reason Field with Quick Fill Chips */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Reason</Label>
                <div className="flex flex-wrap gap-1">
                  {[
                    "Biometric Device Offline",
                    "On-Site Client Visit",
                    "System Technical Issue",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        if (applyMode === "single") setForm({ ...form, reason: chip });
                        else setRangeForm({ ...rangeForm, reason: chip });
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                rows={2}
                value={applyMode === "single" ? form.reason : rangeForm.reason}
                onChange={(e) => {
                  if (applyMode === "single") setForm({ ...form, reason: e.target.value });
                  else setRangeForm({ ...rangeForm, reason: e.target.value });
                }}
                placeholder="Detail the reason for missed punches..."
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-3.5 border-t bg-muted/20 shrink-0 flex sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={submitNew} disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Sparkles className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {selectedEmployeeIds.length > 1
                  ? applyMode === "single"
                    ? `Apply for ${selectedEmployeeIds.length} Employees`
                    : `Apply for ${selectedEmployeeIds.length} Employees (${rangePreview.count} Days)`
                  : applyMode === "single"
                    ? "Submit Request"
                    : `Apply for ${rangePreview.count} Day${rangePreview.count === 1 ? "" : "s"}`}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Details Modal */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request History</DialogTitle>
            <DialogDescription>
              {detail && (
                <>
                  {detail.employeeName} &bull; {detail.attendanceDate}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Card className="p-4">
            <ol className="space-y-3">
              {detail?.history.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 bg-primary shrink-0" />
                  <div className="flex-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{h.action}</span>
                      <span className="text-xs text-muted-foreground">{h.at}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">by {h.by}</div>
                    {h.comment && (
                      <div className="mt-1 p-2 rounded bg-muted text-xs italic">
                        "{h.comment}"
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({ s }: { s: Status }) {
  return (
    <Badge
      className={
        s === "Approved"
          ? "bg-success text-success-foreground"
          : s === "Rejected"
            ? "bg-destructive text-destructive-foreground"
            : "bg-warning text-warning-foreground"
      }
    >
      {s}
    </Badge>
  );
}
