import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { db, type Department } from "@/lib/mock-data";

export const Route = createFileRoute("/departments")({ component: DepartmentsPage });

function DepartmentsPage() {
  const { departments: initial, entities, employees } = db();
  const [rows, setRows] = useState<Department[]>(initial);
  return (
    <>
      <PageHeader title="Departments" description="Functional units across the organisation" />
      <DataTable rows={rows} rowKey={r => r.id} searchKeys={["name","head","code"]}
        filters={[{ label: "Entity", key: "entityId", options: entities.map(e => ({ value: e.id, label: e.code })), predicate: (r, v) => r.entityId === v }]}
        onCreate={() => toast.info("New department form")} createLabel="New Department" filename="departments.csv"
        columns={[
          { key: "name", header: "Department", accessor: r => r.name, sortable: true, render: r => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code}</div></div> },
          { key: "entity", header: "Entity", render: r => entities.find(e => e.id === r.entityId)?.code ?? "—" },
          { key: "head", header: "HOD" },
          { key: "size", header: "Headcount", render: r => employees.filter(e => e.departmentId === r.id).length },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setRows(rs => rs.filter(x => x.id !== r.id)); toast.success("Removed"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>}
      />
    </>
  );
}
