import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, type Entity } from "@/lib/mock-data";

export const Route = createFileRoute("/entities")({ component: EntitiesPage });

function EntitiesPage() {
  const [rows, setRows] = useState<Entity[]>(db().entities);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);

  const save = (e: Entity) => {
    setRows(r => editing ? r.map(x => x.id === e.id ? e : x) : [...r, { ...e, id: `ent-${r.length+1}` }]);
    toast.success(editing ? "Entity updated" : "Entity created");
    setOpen(false); setEditing(null);
  };

  return (
    <>
      <PageHeader title="Entities" description="Manage legal entities across geographies" />
      <DataTable
        rows={rows}
        rowKey={r => r.id}
        searchKeys={["name","code","country"]}
        filters={[{ label: "Status", key: "status", options: [{value:"Active",label:"Active"},{value:"Inactive",label:"Inactive"}], predicate: (r, v) => r.status === v }]}
        onCreate={() => { setEditing(null); setOpen(true); }}
        createLabel="New Entity"
        filename="entities.csv"
        columns={[
          { key: "name", header: "Entity", accessor: r => r.name, sortable: true, render: r => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code}</div></div> },
          { key: "country", header: "Country", accessor: r => r.country, sortable: true },
          { key: "currency", header: "Currency", accessor: r => r.currency },
          { key: "gstin", header: "GSTIN" },
          { key: "status", header: "Status", render: r => <Badge variant={r.status === "Active" ? "default" : "secondary"} className={r.status === "Active" ? "bg-success text-success-foreground" : ""}>{r.status}</Badge> },
        ]}
        actions={r => (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => toast.info(`Viewing ${r.name}`)}><Eye className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => { setRows(rs => rs.filter(x => x.id !== r.id)); toast.success("Deleted"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        )}
      />
      <EntityDialog open={open} onOpenChange={setOpen} entity={editing} onSave={save} />
    </>
  );
}

function EntityDialog({ open, onOpenChange, entity, onSave }: { open: boolean; onOpenChange: (b: boolean) => void; entity: Entity | null; onSave: (e: Entity) => void }) {
  const [form, setForm] = useState<Entity>(entity ?? { id: "", name: "", code: "", country: "India", currency: "INR", gstin: "", status: "Active" });
  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && entity) setForm(entity); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{entity ? "Edit" : "Create"} Entity</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Code"><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country"><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></Field>
            <Field label="Currency"><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></Field>
          </div>
          <Field label="GSTIN"><Input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => onSave(form)}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
