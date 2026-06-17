import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db, empName, fmtINR, type Loan } from "@/lib/mock-data";

export const Route = createFileRoute("/loans")({ component: LoansPage });

function LoansPage() {
  const [rows, setRows] = useState<Loan[]>(db().loans);
  return (
    <>
      <PageHeader title="Loans & Advances" description="Employee loans with EMI auto-recovery from payroll"
        actions={<Button onClick={() => toast.info("New loan request")}><Plus className="h-4 w-4 mr-1" />New Loan</Button>} />
      <DataTable rows={rows} rowKey={r => r.id} searchKeys={[r => empName(r.employeeId)]} filename="loans.csv"
        filters={[
          { label: "Type", key: "type", options: ["Personal","Salary Advance","Education"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.type === v },
          { label: "Status", key: "status", options: ["Active","Closed","Pending"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.status === v },
        ]}
        columns={[
          { key: "emp", header: "Employee", render: r => empName(r.employeeId) },
          { key: "type", header: "Type", render: r => <Badge variant="outline">{r.type}</Badge> },
          { key: "amount", header: "Principal", accessor: r => r.amount, render: r => fmtINR(r.amount) },
          { key: "emi", header: "EMI", render: r => fmtINR(r.emi) },
          { key: "tenure", header: "Tenure", render: r => `${r.tenure} mo` },
          { key: "out", header: "Outstanding", render: r => fmtINR(r.outstanding) },
          { key: "status", header: "Status", render: r => <Badge className={r.status === "Active" ? "bg-info text-info-foreground" : r.status === "Closed" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>{r.status}</Badge> },
        ]}
        actions={r => <Button size="sm" variant="outline" onClick={() => { setRows(rs => rs.map(x => x.id === r.id ? { ...x, status: "Closed" } : x)); toast.success("Loan closed"); }}>Close</Button>}
      />
    </>
  );
}
