import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtINR } from "@/lib/mock-data";
import { reimbursementsApi, employeesApi } from "@/api";

export const Route = createFileRoute("/reimbursements")({
  loader: async () => {
    const [reimbursements, employees] = await Promise.all([reimbursementsApi.getAll(), employeesApi.getAll()]);
    return { reimbursements, employees };
  },
  component: ReimbPage
});

function ReimbPage() {
  const { reimbursements, employees } = Route.useLoaderData();
  const [rows, setRows] = useState<any[]>(reimbursements);

  // Dialog State
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    employee: "",
    category: "Travel",
    amount: 5000,
    date: new Date().toISOString().split('T')[0]
  });

  const empName = (id: string | number) => {
    const emp = employees.find((e: any) => e.id == id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "—";
  };
  const act = (id: string, s: any) => { setRows(r => r.map(x => x.id === id ? { ...x, status: s } : x)); toast.success(`Marked ${s}`); };

  const handleCreate = async () => {
    if (!form.employee) {
      toast.error("Please select an employee");
      return;
    }
    try {
      setIsSubmitting(true);
      const newClaim = await reimbursementsApi.createReimbursement({
        ...form,
        employee_id: form.employee,
        status: "Pending"
      });
      setRows(prev => [newClaim, ...prev]);
      setOpen(false);
      toast.success("Claim submitted successfully");
    } catch (e: any) {
      toast.error("Failed to submit claim: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Reimbursements" description="Expense claims integrated with payroll"
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Submit Claim</Button>} />
      <DataTable rows={rows} rowKey={r => r.id} searchKeys={[r => empName(r.employee || r.employee_id), "category"]} filename="reimbursements.csv"
        filters={[
          { label: "Category", key: "category", options: ["Travel","Meals","Internet","Medical"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.category === v },
          { label: "Status", key: "status", options: ["Pending","Approved","Rejected","Paid"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.status === v },
        ]}
        columns={[
          { key: "emp", header: "Employee", render: r => empName(r.employee || r.employee_id) },
          { key: "category", header: "Category", render: r => <Badge variant="outline">{r.category}</Badge> },
          { key: "amount", header: "Amount", accessor: r => r.amount, render: r => fmtINR(r.amount) },
          { key: "date", header: "Date", accessor: r => r.date, sortable: true },
          { key: "receipt", header: "Receipt" },
          { key: "status", header: "Status", render: r => <Badge className={r.status === "Paid" || r.status === "Approved" ? "bg-success text-success-foreground" : r.status === "Rejected" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}>{r.status}</Badge> },
        ]}
        actions={r => r.status === "Pending" ? <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" className="text-success border-success/40" onClick={() => act(r.id, "Approved")}><Check className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/40" onClick={() => act(r.id, "Rejected")}><X className="h-4 w-4" /></Button>
        </div> : <Button size="sm" variant="ghost" disabled>—</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit New Claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={form.employee} onValueChange={v => setForm({ ...form, employee: v })}>
                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id.toString()}>{e.firstName} {e.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Travel">Travel</SelectItem>
                  <SelectItem value="Meals">Meals</SelectItem>
                  <SelectItem value="Internet">Internet</SelectItem>
                  <SelectItem value="Medical">Medical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Claim Amount</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date incurred</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit Claim"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
