import { createFileRoute } from "@tanstack/react-router";
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
import { db, empName, type Regularization } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";

type Status = "Pending" | "Approved" | "Rejected";
interface Event { at: string; by: string; action: string; comment?: string; }
interface Row extends Regularization { comment?: string; reviewer?: string; reviewedAt?: string; history: Event[]; }

const nowIso = () => new Date().toISOString().slice(0,16).replace("T"," ");

export const Route = createFileRoute("/attendance/regularize")({ component: RegPage });

function RegPage() {
  const { user } = useAuth();
  const { employees } = db();
  const isReviewer = user?.role !== "employee";

  const [rows, setRows] = useState<Row[]>(() =>
    db().regularizations.map(r => ({ ...r, history: [{ at: r.date + " 09:30", by: empName(r.employeeId), action: "Submitted", comment: r.reason }] }))
  );
  const [acting, setActing] = useState<{ row: Row; type: "Approved" | "Rejected" } | null>(null);
  const [comment, setComment] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: employees[0].id, date: new Date().toISOString().slice(0,10), requestedIn: "09:30", requestedOut: "18:30", reason: "" });
  const [detail, setDetail] = useState<Row | null>(null);

  const counts = useMemo(() => ({
    pending: rows.filter(r => r.status === "Pending").length,
    approved: rows.filter(r => r.status === "Approved").length,
    rejected: rows.filter(r => r.status === "Rejected").length,
  }), [rows]);

  const confirmAction = () => {
    if (!acting) return;
    if (acting.type === "Rejected" && !comment.trim()) { toast.error("Please add a reason for rejection"); return; }
    const reviewer = user?.name || "Reviewer";
    setRows(rs => rs.map(r => r.id === acting.row.id ? {
      ...r, status: acting.type, comment, reviewer, reviewedAt: nowIso(),
      history: [...r.history, { at: nowIso(), by: reviewer, action: acting.type, comment: comment || undefined }],
    } : r));
    toast.success(`Request ${acting.type.toLowerCase()}`);
    setActing(null); setComment("");
  };

  const submitNew = () => {
    if (!form.reason.trim()) { toast.error("Reason is required"); return; }
    const id = `rg-${String(rows.length + 1).padStart(4,"0")}`;
    const row: Row = { id, employeeId: form.employeeId, date: form.date, requestedIn: form.requestedIn, requestedOut: form.requestedOut, reason: form.reason, status: "Pending", history: [{ at: nowIso(), by: empName(form.employeeId), action: "Submitted", comment: form.reason }] };
    setRows(r => [row, ...r]);
    toast.success("Regularization submitted for approval");
    setCreateOpen(false);
    setForm({ ...form, reason: "" });
  };

  return (
    <>
      <PageHeader title="Attendance Regularization" description="Pending approvals queue with reviewer comments and audit trail"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />New Request</Button>} />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Pending Review" value={String(counts.pending)} tone="warning" icon={MessageSquare} />
        <StatCard label="Approved" value={String(counts.approved)} tone="success" icon={Check} />
        <StatCard label="Rejected" value={String(counts.rejected)} tone="info" icon={X} />
      </div>

      <DataTable rows={rows} rowKey={r => r.id} tableId="regularize" searchKeys={[r => empName(r.employeeId), "reason"]} filename="regularizations.csv"
        filters={[{ label: "Status", key: "status", options: ["Pending","Approved","Rejected"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.status === v }]}
        columns={[
          { key: "emp", header: "Employee", render: r => empName(r.employeeId) },
          { key: "date", header: "Date", accessor: r => r.date, sortable: true },
          { key: "in", header: "In", accessor: r => r.requestedIn },
          { key: "out", header: "Out", accessor: r => r.requestedOut },
          { key: "reason", header: "Reason", render: r => <span className="text-sm">{r.reason}</span> },
          { key: "reviewer", header: "Reviewer", render: r => r.reviewer ? <div className="text-xs"><div>{r.reviewer}</div><div className="text-muted-foreground">{r.reviewedAt}</div></div> : <span className="text-xs text-muted-foreground">—</span> },
          { key: "comment", header: "Comment", render: r => r.comment ? <span className="text-xs italic">"{r.comment}"</span> : <span className="text-xs text-muted-foreground">—</span> },
          { key: "status", header: "Status", render: r => <StatusBadge s={r.status} /> },
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
            <DialogDescription>{acting && <>{empName(acting.row.employeeId)} • {acting.row.date} • {acting.row.requestedIn}–{acting.row.requestedOut}</>}</DialogDescription>
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
              <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{employees.slice(0,30).map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.code})</SelectItem>)}</SelectContent>
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
            <DialogDescription>{detail && <>{empName(detail.employeeId)} • {detail.date}</>}</DialogDescription>
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
