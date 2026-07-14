import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X, MessageSquare, Plus, History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/lib/auth-context";
import { attendanceApi, employeesApi } from "@/api";

type Status = "Pending" | "Approved" | "Rejected";
interface Event { at: string; by: string; action: string; comment?: string; }
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
    const [regs, employees] = await Promise.all([
      attendanceApi.getRegularizations(),
      employeesApi.getAll()
    ]);
    return { regs, employees };
  },
  component: RegPage 
});

function RegPage() {
  const { regs, employees } = Route.useLoaderData();
  const { user } = useAuth();
  const router = useRouter();
  const isReviewer = user?.role !== "employee";

  // Map API response to our UI format
  const rows: Row[] = regs.map((r: any) => ({
    ...r,
    employeeName: r.employee_name || r.employeeName,
    attendanceDate: r.attendance_date || r.attendanceDate,
    requestedCheckIn: new Date(r.requested_check_in || r.requestedCheckIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    requestedCheckOut: new Date(r.requested_check_out || r.requestedCheckOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    history: [
      { at: new Date(r.created_at || r.createdAt).toLocaleString(), by: r.employee_name || r.employeeName, action: "Submitted", comment: r.reason },
      ...(r.status !== "Pending" ? [{
        at: r.approved_at ? new Date(r.approved_at).toLocaleString() : new Date(r.updated_at || r.updatedAt).toLocaleString(),
        by: "Manager",
        action: r.status,
        comment: r.manager_comments || r.managerComments
      }] : [])
    ]
  }));

  const [acting, setActing] = useState<{ row: Row; type: "Approved" | "Rejected" } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: employees[0]?.id || "", date: new Date().toISOString().slice(0,10), requestedIn: "09:30", requestedOut: "18:30", reason: "" });
  const [detail, setDetail] = useState<Row | null>(null);

  const counts = useMemo(() => ({
    pending: rows.filter(r => r.status === "Pending").length,
    approved: rows.filter(r => r.status === "Approved").length,
    rejected: rows.filter(r => r.status === "Rejected").length,
  }), [rows]);

  const confirmAction = async () => {
    if (!acting) return;
    if (acting.type === "Rejected" && !comment.trim()) { toast.error("Please add a reason for rejection"); return; }
    
    try {
      await attendanceApi.approveRegularization(acting.row.id, {
        status: acting.type,
        manager_comments: comment
      });
      toast.success(`Request ${acting.type.toLowerCase()}`);
      setActing(null); setComment("");
      router.invalidate();
    } catch(err) {
      toast.error("Failed to perform action");
    }
  };

  const submitNew = async () => {
    if (!form.reason.trim()) { toast.error("Reason is required"); return; }
    if (!form.employeeId) { toast.error("Employee is required"); return; }
    
    const inDate = new Date(`${form.date}T${form.requestedIn}:00`).toISOString();
    const outDate = new Date(`${form.date}T${form.requestedOut}:00`).toISOString();
    
    try {
      await attendanceApi.requestRegularization({
        employee: form.employeeId,
        attendance_date: form.date,
        requested_check_in: inDate,
        requested_check_out: outDate,
        reason: form.reason
      });
      toast.success("Regularization submitted for approval");
      setCreateOpen(false);
      setForm({ ...form, reason: "" });
      router.invalidate();
    } catch(err) {
      toast.error("Failed to submit regularization");
    }
  };

  const filteredRows = statusFilter ? rows.filter(r => r.status === statusFilter) : rows;

  return (
    <>
      <PageHeader title="Attendance Regularization" description="Pending approvals queue with reviewer comments and audit trail"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />New Request</Button>} />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div onClick={() => setStatusFilter(statusFilter === "Pending" ? null : "Pending")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard label="Pending Review" value={String(counts.pending)} tone="warning" icon={MessageSquare} />
        </div>
        <div onClick={() => setStatusFilter(statusFilter === "Approved" ? null : "Approved")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard label="Approved" value={String(counts.approved)} tone="success" icon={Check} />
        </div>
        <div onClick={() => setStatusFilter(statusFilter === "Rejected" ? null : "Rejected")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard label="Rejected" value={String(counts.rejected)} tone="info" icon={X} />
        </div>
      </div>

      <DataTable rows={filteredRows} rowKey={r => String(r.id)} tableId="regularize" searchKeys={[r => r.employeeName, "reason"]} filename="regularizations.csv"
        filters={[{ label: "Status", key: "status", options: ["Pending","Approved","Rejected"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.status === v }]}
        columns={[
          { key: "emp", header: "Employee", render: r => r.employeeName, accessor: r => r.employeeName },
          { key: "date", header: "Date", render: r => r.attendanceDate, accessor: r => r.attendanceDate, sortable: true },
          { key: "in", header: "In", render: r => r.requestedCheckIn, accessor: r => r.requestedCheckIn },
          { key: "out", header: "Out", render: r => r.requestedCheckOut, accessor: r => r.requestedCheckOut },
          { key: "reason", header: "Reason", render: r => <span className="text-sm">{r.reason}</span>, accessor: r => r.reason },
          { key: "reviewer", header: "Reviewer", render: r => r.managerComments ? <div className="text-xs"><div>Manager</div></div> : <span className="text-xs text-muted-foreground">—</span>, accessor: r => r.managerComments ? "Manager" : "—" },
          { key: "comment", header: "Comment", render: r => r.managerComments ? <span className="text-xs italic">"{r.managerComments}"</span> : <span className="text-xs text-muted-foreground">—</span>, accessor: r => r.managerComments || "—" },
          { key: "status", header: "Status", render: r => <StatusBadge s={r.status} />, accessor: r => r.status },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" title="History" onClick={() => setDetail(r)}><History className="h-4 w-4" /></Button>
          {isReviewer && r.status === "Pending" && <>
            <Button size="sm" variant="outline" className="text-success border-success/40" onClick={() => { setActing({ row: r, type: "Approved" }); setComment(""); }}><Check className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" className="text-destructive border-destructive/40" onClick={() => { setActing({ row: r, type: "Rejected" }); setComment(""); }}><X className="h-4 w-4" /></Button>
          </>}
        </div>}
      />

      <Dialog open={!!acting} onOpenChange={o => !o && setActing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{acting?.type === "Approved" ? "Approve request" : "Reject request"}</DialogTitle>
            <DialogDescription>{acting && <>{acting.row.employeeName} • {acting.row.attendanceDate} • {acting.row.requestedCheckIn}–{acting.row.requestedCheckOut}</>}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reviewer comment {acting?.type === "Rejected" && <span className="text-destructive">*</span>}</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={acting?.type === "Approved" ? "Optional note for the employee…" : "Why is this being rejected?"} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActing(null)}>Cancel</Button>
            <Button onClick={confirmAction} className={acting?.type === "Approved" ? "bg-success hover:bg-success/90 text-success-foreground" : ""} variant={acting?.type === "Rejected" ? "destructive" : "default"}>
              Confirm {acting?.type}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New regularization</DialogTitle><DialogDescription>Submit a missed-punch correction for HR approval.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Employee</Label>
              <Select value={String(form.employeeId)} onValueChange={v => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>{employees.slice(0,30).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName} ({e.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>In</Label><Input type="time" value={form.requestedIn} onChange={e => setForm({ ...form, requestedIn: e.target.value })} /></div>
              <div><Label>Out</Label><Input type="time" value={form.requestedOut} onChange={e => setForm({ ...form, requestedOut: e.target.value })} /></div>
            </div>
            <div><Label>Reason</Label><Textarea rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Forgot to check-in, system issue, etc." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={submitNew}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request history</DialogTitle>
            <DialogDescription>{detail && <>{detail.employeeName} • {detail.attendanceDate}</>}</DialogDescription>
          </DialogHeader>
          <Card className="p-4">
            <ol className="space-y-3">
              {detail?.history.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 bg-primary shrink-0" />
                  <div className="flex-1 text-sm">
                    <div className="flex justify-between gap-2"><span className="font-medium">{h.action}</span><span className="text-xs text-muted-foreground">{h.at}</span></div>
                    <div className="text-xs text-muted-foreground">by {h.by}</div>
                    {h.comment && <div className="mt-1 p-2 rounded bg-muted text-xs italic">"{h.comment}"</div>}
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
  return <Badge className={s === "Approved" ? "bg-success text-success-foreground" : s === "Rejected" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}>{s}</Badge>;
}
