import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { db, type Designation } from "@/lib/mock-data";

export const Route = createFileRoute("/designations")({ component: DesignationsPage });

function DesignationsPage() {
  const { designations: initial, departments } = db();
  const [rows, setRows] = useState<Designation[]>(initial);
  return (
    <>
      <PageHeader title="Designations" description="Job titles & grades for every department" />
      <DataTable rows={rows} rowKey={r => r.id} searchKeys={["title","grade"]}
        filters={[{ label: "Department", key: "departmentId", options: departments.map(d => ({ value: d.id, label: d.name })), predicate: (r, v) => r.departmentId === v }]}
        onCreate={() => toast.info("New designation form")} createLabel="New Designation" filename="designations.csv"
        columns={[
          { key: "title", header: "Title", accessor: r => r.title, sortable: true },
          { key: "grade", header: "Grade", accessor: r => r.grade, sortable: true },
          { key: "dept", header: "Department", render: r => departments.find(d => d.id === r.departmentId)?.name ?? "—" },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setRows(rs => rs.filter(x => x.id !== r.id)); toast.success("Removed"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>}
      />
    </>
  );
}
