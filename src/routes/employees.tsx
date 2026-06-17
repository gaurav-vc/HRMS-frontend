import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { db, type Employee } from "@/lib/mock-data";

export const Route = createFileRoute("/employees")({ component: EmployeesPage });

function EmployeesPage() {
  const { employees: initial, departments, designations, branches, entities } = db();
  const [rows, setRows] = useState<Employee[]>(initial);

  return (
    <>
      <PageHeader title="Employees" description="Complete employee directory across all entities" actions={<Button onClick={() => toast.info("Bulk import wizard")} variant="outline"><UserPlus className="h-4 w-4 mr-1" />Bulk Import</Button>} />
      <DataTable
        rows={rows} rowKey={r => r.id} searchKeys={["firstName","lastName","email","code","phone"]}
        filters={[
          { label: "Entity", key: "entityId", options: entities.map(e => ({ value: e.id, label: e.code })), predicate: (r, v) => r.entityId === v },
          { label: "Department", key: "departmentId", options: departments.map(d => ({ value: d.id, label: d.name })), predicate: (r, v) => r.departmentId === v },
          { label: "Status", key: "status", options: ["Active","On Leave","Inactive"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.status === v },
        ]}
        onCreate={() => toast.info("Opening employee onboarding wizard")} createLabel="Onboard Employee" filename="employees.csv"
        columns={[
          { key: "emp", header: "Employee", accessor: r => `${r.firstName} ${r.lastName}`, sortable: true, render: r => (
            <Link to="/employees/$id" params={{ id: r.id }} className="flex items-center gap-3 group">
              <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{r.firstName[0]}{r.lastName[0]}</AvatarFallback></Avatar>
              <div className="min-w-0"><div className="font-medium group-hover:text-primary truncate">{r.firstName} {r.lastName}</div><div className="text-xs text-muted-foreground truncate">{r.code} • {r.email}</div></div>
            </Link>
          )},
          { key: "desg", header: "Designation", render: r => designations.find(d => d.id === r.designationId)?.title ?? "—" },
          { key: "dept", header: "Department", render: r => departments.find(d => d.id === r.departmentId)?.name ?? "—" },
          { key: "branch", header: "Branch", render: r => branches.find(b => b.id === r.branchId)?.name ?? "—" },
          { key: "doj", header: "Joined", accessor: r => r.doj, sortable: true },
          { key: "status", header: "Status", render: r => <Badge className={r.status === "Active" ? "bg-success text-success-foreground" : r.status === "On Leave" ? "bg-warning text-warning-foreground" : ""}>{r.status}</Badge> },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Link to="/employees/$id" params={{ id: r.id }}><Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button></Link>
          <Button size="icon" variant="ghost" onClick={() => toast.info("Edit employee")}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setRows(rs => rs.filter(x => x.id !== r.id)); toast.success("Employee removed"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>}
      />
    </>
  );
}
