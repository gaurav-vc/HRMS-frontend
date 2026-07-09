import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leavesApi, employeesApi } from "@/api";

export const Route = createFileRoute("/leave")({ 
  loader: async () => {
    const [leavesRaw, typesRaw, balancesRaw, employeesRaw] = await Promise.all([
      leavesApi.getAll('my_leaves'),
      leavesApi.getTypes(),
      leavesApi.getLeaveBalances(),
      employeesApi.getAll()
    ]);
    const leaves = Array.isArray(leavesRaw) ? leavesRaw : (leavesRaw as any)?.results || [];
    const types = Array.isArray(typesRaw) ? typesRaw : (typesRaw as any)?.results || [];
    const balances = Array.isArray(balancesRaw) ? balancesRaw : (balancesRaw as any)?.results || [];
    const employees = Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as any)?.results || [];
    return { leaves, types, balances, employees };
  },
  component: LeavePage 
});

function LeavePage() {
  const { leaves, types, balances, employees } = Route.useLoaderData();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [balancesOpen, setBalancesOpen] = useState(false);
  const [form, setForm] = useState({ employee: "", leave_type: "", start_date: "", end_date: "", total_days: "", reason: "" });

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
    from: r.startDate || r.start_date,
    to: r.endDate || r.end_date,
    days: r.totalDays || r.total_days,
    type: r.leaveTypeCode || r.leave_type_code,
    empName: r.employeeName || r.employee_name
  }));

  return (
    <>
      <PageHeader 
        title="My Leave Requests" 
        description="Track your requested leaves and their approval status." 
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBalancesOpen(true)}>View Balances</Button>
            <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="h-4 w-4 mr-1" />Apply for leave</Button>
          </div>
        } 
      />
      
      <div className="bg-white border rounded-lg shadow-sm mt-6">
        <DataTable rows={mappedLeaves} rowKey={(r: any) => r.id} searchKeys={[(r: any) => r.empName, "reason"]} filename="my_leaves.csv"
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
        />
      </div>

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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Employee Leave Balances</DialogTitle><DialogDescription>Current leave allocation and utilization.</DialogDescription></DialogHeader>
          
          <DataTable rows={balances} rowKey={(r: any) => r.id} searchKeys={[(r: any) => r.employeeName]} filename="balances.csv"
            columns={[
              { key: "employeeName", header: "Employee" },
              { key: "leaveTypeCode", header: "Leave Type" },
              { key: "allocatedDays", header: "Allocated" },
              { key: "usedDays", header: "Used" },
              { key: "remainingDays", header: "Remaining" },
              { key: "status", header: "Status", render: (r: any) => {
                const rem = Number(r.remainingDays) || 0;
                return (
                  <Badge variant={rem < 2 ? "destructive" : "outline"}>
                    {rem < 2 ? "Low Balance" : "Healthy"}
                  </Badge>
                );
              }}
            ]}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
