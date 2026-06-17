import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db, empName, fmtINR, type Reimbursement } from "@/lib/mock-data";

export const Route = createFileRoute("/reimbursements")({ component: ReimbPage });

function ReimbPage() {
  const [rows, setRows] = useState<Reimbursement[]>(db().reimbursements);
  const act = (id: string, s: Reimbursement["status"]) => { setRows(r => r.map(x => x.id === id ? { ...x, status: s } : x)); toast.success(`Marked ${s}`); };
  return (
    <>
      <PageHeader title="Reimbursements" description="Expense claims integrated with payroll"
        actions={<Button onClick={() => toast.info("New claim form")}><Plus className="h-4 w-4 mr-1" />Submit Claim</Button>} />
      <DataTable rows={rows} rowKey={r => r.id} searchKeys={[r => empName(r.employeeId), "category"]} filename="reimbursements.csv"
        filters={[
          { label: "Category", key: "category", options: ["Travel","Meals","Internet","Medical"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.category === v },
          { label: "Status", key: "status", options: ["Pending","Approved","Rejected","Paid"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.status === v },
        ]}
        columns={[
          { key: "emp", header: "Employee", render: r => empName(r.employeeId) },
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
    </>
  );
}
