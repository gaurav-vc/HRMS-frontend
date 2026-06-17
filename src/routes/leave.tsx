import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { CalendarDays } from "lucide-react";
import { db, empName, type LeaveReq } from "@/lib/mock-data";

export const Route = createFileRoute("/leave")({ component: LeavePage });

function LeavePage() {
  const [rows, setRows] = useState<LeaveReq[]>(db().leaves);
  const act = (id: string, s: "Approved" | "Rejected") => { setRows(r => r.map(x => x.id === id ? { ...x, status: s } : x)); toast.success(`Leave ${s.toLowerCase()}`); };
  const counts = { p: rows.filter(r => r.status === "Pending").length, a: rows.filter(r => r.status === "Approved").length, r: rows.filter(r => r.status === "Rejected").length };
  return (
    <>
      <PageHeader title="Leave Management" description="Apply, approve and track leaves across the company" actions={<Button onClick={() => toast.info("New leave form")}><Plus className="h-4 w-4 mr-1" />Apply Leave</Button>} />
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Pending" value={String(counts.p)} icon={CalendarDays} tone="warning" />
        <StatCard label="Approved" value={String(counts.a)} icon={CalendarDays} tone="success" />
        <StatCard label="Rejected" value={String(counts.r)} icon={CalendarDays} />
      </div>
      <DataTable rows={rows} rowKey={r => r.id} searchKeys={[r => empName(r.employeeId), "reason"]} filename="leaves.csv"
        filters={[
          { label: "Status", key: "status", options: ["Pending","Approved","Rejected"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.status === v },
          { label: "Type", key: "type", options: ["Casual","Sick","Earned","Maternity","WFH"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.type === v },
        ]}
        columns={[
          { key: "emp", header: "Employee", render: r => empName(r.employeeId) },
          { key: "type", header: "Type", render: r => <Badge variant="outline">{r.type}</Badge> },
          { key: "from", header: "From", accessor: r => r.from, sortable: true },
          { key: "to", header: "To", accessor: r => r.to },
          { key: "days", header: "Days", accessor: r => r.days },
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
