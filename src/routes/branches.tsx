import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { db, type Branch } from "@/lib/mock-data";

export const Route = createFileRoute("/branches")({ component: BranchesPage });

function BranchesPage() {
  const { branches: initial, entities } = db();
  const [rows, setRows] = useState<Branch[]>(initial);
  return (
    <>
      <PageHeader title="Branches" description="Office locations under each legal entity" />
      <DataTable
        rows={rows} rowKey={r => r.id} searchKeys={["name","city","state","code"]}
        filters={[{ label: "Entity", key: "entityId", options: entities.map(e => ({ value: e.id, label: e.code })), predicate: (r, v) => r.entityId === v }]}
        onCreate={() => toast.info("New branch wizard")} createLabel="New Branch" filename="branches.csv"
        columns={[
          { key: "name", header: "Branch", accessor: r => r.name, sortable: true, render: r => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code}</div></div> },
          { key: "entity", header: "Entity", render: r => entities.find(e => e.id === r.entityId)?.code ?? "—" },
          { key: "city", header: "City", accessor: r => r.city },
          { key: "state", header: "State" },
          { key: "head", header: "Branch Head" },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setRows(rs => rs.filter(x => x.id !== r.id)); toast.success("Branch removed"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>}
      />
    </>
  );
}
