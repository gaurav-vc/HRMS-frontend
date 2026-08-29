import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtINR } from "@/lib/mock-data";
import { loansApi, employeesApi } from "@/api";
import { useAuth, usePermissions } from "@/lib/auth-context";

export const Route = createFileRoute("/loans")({
  loader: async () => {
    const [loans, employees] = await Promise.all([loansApi.getAll(), employeesApi.getAll()]);
    return { loans, employees };
  },
  component: LoansPage,
});

function LoansPage() {
  const { loans, employees } = Route.useLoaderData();
  const [rows, setRows] = useState<any[]>(loans);
  const { user } = useAuth();
  const { canUpdate } = usePermissions("Loans & Advances");

  // Dialog State
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    employee: "",
    type: "Personal",
    amount: 100000,
    emi: 5000,
    tenure: 20,
  });

  const empName = (id: string | number) => {
    const emp = employees.find((e: any) => e.id == id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "—";
  };

  const handleCreate = async () => {
    if (!form.employee) {
      toast.error("Please select an employee");
      return;
    }
    try {
      setIsSubmitting(true);
      const newLoan = await loansApi.createLoan({
        ...form,
        employee_id: form.employee, // map to backend if needed
        outstanding: form.amount,
        status: "Pending",
      });
      setRows((prev) => [...prev, newLoan]);
      setOpen(false);
      toast.success("Loan created successfully");
    } catch (e: any) {
      toast.error("Failed to create loan: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Loans & Advances"
        description="Employee loans with EMI auto-recovery from payroll"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Loan
          </Button>
        }
      />

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        searchKeys={[(r) => empName(r.employee || r.employeeId || r.employee_id)]}
        filename="loans.csv"
        filters={[
          {
            label: "Type",
            key: "type",
            options: ["Personal", "Salary Advance", "Education"].map((s) => ({
              value: s,
              label: s,
            })),
            predicate: (r, v) => r.type === v,
          },
          {
            label: "Status",
            key: "status",
            options: ["Active", "Closed", "Pending"].map((s) => ({ value: s, label: s })),
            predicate: (r, v) => r.status === v,
          },
        ]}
        columns={[
          {
            key: "emp",
            header: "Employee",
            accessor: (r) => empName(r.employee || r.employeeId || r.employee_id),
            render: (r) => empName(r.employee || r.employeeId || r.employee_id),
          },
          { key: "type", header: "Type", render: (r) => <Badge variant="outline">{r.type}</Badge> },
          {
            key: "amount",
            header: "Principal",
            accessor: (r) => r.amount,
            render: (r) => fmtINR(r.amount),
          },
          { key: "emi", header: "EMI", render: (r) => fmtINR(r.emi) },
          { key: "tenure", header: "Tenure", render: (r) => `${r.tenure} mo` },
          { key: "out", header: "Outstanding", render: (r) => fmtINR(r.outstanding) },
          {
            key: "status",
            header: "Status",
            render: (r) => {
              let displayStatus = r.status;
              let badgeClass = "bg-warning text-warning-foreground";
              
              if (r.status === "Active") {
                displayStatus = "Accepted";
                badgeClass = "bg-info text-info-foreground";
              } else if (r.status === "Closed") {
                if (r.outstanding === r.amount && r.amount > 0) {
                  displayStatus = "Rejected";
                  badgeClass = "bg-destructive text-destructive-foreground";
                } else {
                  displayStatus = "Closed";
                  badgeClass = "bg-success text-success-foreground";
                }
              }

              return (
                <Badge className={badgeClass}>
                  {displayStatus}
                </Badge>
              );
            },
          },
        ]}
        actions={(r) => {
          const currentEmpCode = user?.employee_id;
          const myEmpObj = employees.find((e: any) => e.code === currentEmpCode || e.employeeId === currentEmpCode);
          const myDbId = myEmpObj?.id;

          const loanEmpId = r.employee || r.employeeId || r.employee_id;
          const isMyLoan = Boolean(myDbId && loanEmpId && myDbId == loanEmpId);

          const canAction = (canUpdate || user?.is_superuser) && !isMyLoan;

          if (!canAction) return null;

          if (r.status === "Pending") {
            return (
              <div className="flex justify-end gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 text-success hover:text-success border-success/30 hover:bg-success/10"
                  onClick={async () => {
                    try {
                      const updated = await loansApi.updateLoan(r.id, { status: "Active" });
                      setRows((rs) => rs.map((x) => (x.id === r.id ? updated : x)));
                      toast.success("Action accepted");
                    } catch (e: any) {
                      toast.error("Failed to accept: " + e.message);
                    }
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={async () => {
                    try {
                      const updated = await loansApi.updateLoan(r.id, {
                        status: "Closed",
                        outstanding: r.amount, // Record that nothing was paid
                      });
                      setRows((rs) => rs.map((x) => (x.id === r.id ? updated : x)));
                      toast.success("Action rejected");
                    } catch (e: any) {
                      toast.error("Failed to reject: " + e.message);
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          }
          return null;
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Loan Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select
                value={form.employee}
                onValueChange={(v) => setForm({ ...form, employee: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Loan Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Salary Advance">Salary Advance</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Principal Amount</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => {
                  const amt = +e.target.value;
                  const newTenure = form.emi > 0 ? Math.ceil(amt / form.emi) : form.tenure;
                  setForm({ ...form, amount: amt, tenure: newTenure });
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>EMI Amount</Label>
                <Input
                  type="number"
                  value={form.emi}
                  onChange={(e) => {
                    const emiVal = +e.target.value;
                    const newTenure = emiVal > 0 ? Math.ceil(form.amount / emiVal) : form.tenure;
                    setForm({ ...form, emi: emiVal, tenure: newTenure });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tenure (months)</Label>
                <Input
                  type="number"
                  value={form.tenure}
                  onChange={(e) => setForm({ ...form, tenure: +e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create Loan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
