import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db, empName, type Regularization } from "@/lib/mock-data";

export const Route = createFileRoute("/attendance/regularize")({ component: RegPage });

function RegPage() {
  const [rows, setRows] = useState<Regularization[]>(db().regularizations);
  const act = (id: string, s: "Approved" | "Rejected") => { setRows(r => r.map(x => x.id === id ? { ...x, status: s } : x)); toast.success(`Request ${s.toLowerCase()}`); };
  return (
    <>
      <PageHeader title="Attendance Regularization" description="Approve or reject missed-punch corrections" />
      <DataTable rows={rows} rowKey={r => r.id} searchKeys={[r => empName(r.employeeId), "reason"]} filename="regularizations.csv"
        filters={[{ label: "Status", key: "status", options: ["Pending","Approved","Rejected"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.status === v }]}
        columns={[
          { key: "emp", header: "Employee", render: r => empName(r.employeeId) },
          { key: "date", header: "Date", accessor: r => r.date, sortable: true },
          { key: "in", header: "Requested In", accessor: r => r.requestedIn },
          { key: "out", header: "Requested Out", accessor: r => r.requestedOut },
          { key: "reason", header: "Reason" },
          { key: "status", header: "Status", render: r => <Badge className={r.status === "Approved" ? "bg-success text-success-foreground" : r.status === "Rejected" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}>{r.status}</Badge> },
        ]}
        actions={r => r.status === "Pending" ? <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" className="text-success border-success/40" onClick={() => act(r.id, "Approved")}><Check className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/40" onClick={() => act(r.id, "Rejected")}><X className="h-4 w-4" /></Button>
        </div> : <span className="text-xs text-muted-foreground">—</span>}
      />
    </>
  );
}
