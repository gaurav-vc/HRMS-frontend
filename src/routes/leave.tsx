import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leavesApi, employeesApi } from "@/api";

export const Route = createFileRoute("/leave")({ 
  loader: async () => {
    const [leavesRaw, dashboard, typesRaw, balancesRaw, employeesRaw] = await Promise.all([
      leavesApi.getAll(),
      leavesApi.getDashboard(),
      leavesApi.getTypes(),
      leavesApi.getLeaveBalances(),
      employeesApi.getAll()
    ]);
    const leaves = Array.isArray(leavesRaw) ? leavesRaw : (leavesRaw as any)?.results || [];
    const types = Array.isArray(typesRaw) ? typesRaw : (typesRaw as any)?.results || [];
    const balances = Array.isArray(balancesRaw) ? balancesRaw : (balancesRaw as any)?.results || [];
    const employees = Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as any)?.results || [];
    return { leaves, dashboard, types, balances, employees };
  },
  component: LeavePage 
});

function LeavePage() {
  const { leaves, dashboard, types, balances, employees } = Route.useLoaderData();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [balancesOpen, setBalancesOpen] = useState(false);
  const [form, setForm] = useState({ employee: "", leave_type: "", start_date: "", end_date: "", total_days: "", reason: "" });

  const act = async (id: string | number, s: "Approved" | "Rejected") => { 
    try {
      if (s === "Approved") await leavesApi.approveLeave(id, { manager_comments: "Approved by manager" });
      else await leavesApi.rejectLeave(id, { manager_comments: "Rejected by manager" });
      toast.success(`Leave ${s.toLowerCase()}`); 
      router.invalidate();
    } catch(err: any) {
      toast.error(err.message || `Failed to ${s.toLowerCase()} leave`);
    }
  };

  const submitNew = async () => {
    if (!form.employee || !form.leave_type || !form.start_date || !form.end_date) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      await leavesApi.createLeave(form);
      toast.success("Leave requested successfully");
      setCreateOpen(false);
      setForm({ employee: "", leave_type: "", start_date: "", end_date: "", total_days: "", reason: "" });
      router.invalidate();
    } catch(err: any) {
      toast.error("Failed to submit leave. It may overlap or exceed balance.");
    }
  };

  const mappedLeaves = leaves.map((r: any) => ({
    ...r,
    from: r.start_date,
    to: r.end_date,
    days: r.total_days,
    type: r.leave_type_code,
    empName: r.employee_name
  }));

  return (
    <>
      <PageHeader 
        title="Leave Management" 
        description="Apply, approve and track leaves across the company" 
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBalancesOpen(true)}>View Balances</Button>
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />Apply Leave</Button>
          </div>
        } 
      />
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Pending" value={String(dashboard?.pending || 0)} icon={CalendarDays} tone="warning" />
        <StatCard label="Approved" value={String(dashboard?.approved || 0)} icon={CalendarDays} tone="success" />
        <StatCard label="Rejected" value={String(dashboard?.rejected || 0)} icon={CalendarDays} />
      </div>
      
      <DataTable rows={mappedLeaves} rowKey={(r: any) => r.id} searchKeys={[(r: any) => r.empName, "reason"]} filename="leaves.csv"
        filters={[
          { label: "Status", key: "status", options: ["Pending","Approved","Rejected"].map(s => ({ value: s, label: s })), predicate: (r: any, v: any) => r.status === v },
          { label: "Type", key: "type", options: types.map((t: any) => ({ value: t.code, label: t.name })), predicate: (r: any, v: any) => r.type === v },
        ]}
        columns={[
          { key: "empName", header: "Employee", accessor: (r: any) => r.empName },
          { key: "type", header: "Type", render: (r: any) => <Badge variant="outline">{r.type}</Badge> },
          { key: "from", header: "From", accessor: (r: any) => r.from, sortable: true },
          { key: "to", header: "To", accessor: (r: any) => r.to },
          { key: "days", header: "Days", accessor: (r: any) => r.days },
          { key: "reason", header: "Reason", accessor: (r: any) => r.reason },
          { key: "status", header: "Status", render: (r: any) => <Badge className={r.status === "Approved" ? "bg-success text-success-foreground" : r.status === "Rejected" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}>{r.status}</Badge> },
        ]}
        actions={(r: any) => r.status === "Pending" ? <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" className="text-success border-success/40" onClick={() => act(r.id, "Approved")}><Check className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/40" onClick={() => act(r.id, "Rejected")}><X className="h-4 w-4" /></Button>
        </div> : <span className="text-xs text-muted-foreground">—</span>}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle><DialogDescription>Submit a new leave request.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Employee</Label>
              <Select value={form.employee} onValueChange={v => setForm({ ...form, employee: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Leave Type</Label>
              <Select value={form.leave_type} onValueChange={v => setForm({ ...form, leave_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{types.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><Label>Total Days (Override for half-days)</Label><Input type="number" step="0.5" value={form.total_days} onChange={e => setForm({ ...form, total_days: e.target.value })} placeholder="Leave blank to auto-calculate" /></div>
            </div>
            <div><Label>Reason</Label><Textarea rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Medical, vacation, etc." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={submitNew}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={balancesOpen} onOpenChange={setBalancesOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Employee Leave Balances</DialogTitle><DialogDescription>Current leave allocation and utilization.</DialogDescription></DialogHeader>
          <DataTable rows={balances} rowKey={(r: any) => r.id} searchKeys={[(r: any) => r.employeeName]} filename="balances.csv"
            columns={[
              { key: "empName", header: "Employee", accessor: (r: any) => r.employeeName },
              { key: "type", header: "Leave Type", accessor: (r: any) => r.leaveTypeCode },
              { key: "allocated", header: "Allocated", accessor: (r: any) => r.allocatedDays },
              { key: "used", header: "Used", accessor: (r: any) => r.usedDays },
              { key: "remaining", header: "Remaining", accessor: (r: any) => r.remainingDays },
              { key: "status", header: "Status", render: (r: any) => (
                <Badge variant={r.remainingDays < 2 ? "destructive" : "outline"}>
                  {r.remainingDays < 2 ? "Low Balance" : "Healthy"}
                </Badge>
              )}
            ]}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
