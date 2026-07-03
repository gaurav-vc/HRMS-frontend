import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Entity } from "@/lib/mock-data";
import { entitiesApi } from "@/api";

export const Route = createFileRoute("/entities")({
  component: EntitiesPage,
  loader: async () => {
    const entities = await entitiesApi.getAll();
    return { entities };
  }
});

function EntitiesPage() {
  const router = useRouter();
  const { entities: initial } = Route.useLoaderData();
  const [rows, setRows] = useState<Entity[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");

  useEffect(() => { setRows(initial); }, [initial]);

  const save = async (e: Entity) => {
    try {
      if (editing && e.id) {
        await entitiesApi.update(e.id, e);
        toast.success("Entity updated");
      } else {
        const { id, ...data } = e;
        await entitiesApi.create(data);
        toast.success("Entity created");
      }
      setOpen(false); setEditing(null);
      router.invalidate();
    } catch (err) {
      toast.error("Failed to save entity");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await entitiesApi.delete(id);
      toast.success("Deleted");
      router.invalidate();
    } catch (err) {
      toast.error("Failed to delete entity");
    }
  };

  return (
    <>
      <PageHeader title="Entities" description="Manage legal entities across geographies" />
      <DataTable
        rows={rows}
        rowKey={r => r.id}
        searchKeys={["name", "code", "country"]}
        filters={[{ label: "Status", key: "status", options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }], predicate: (r, v) => r.status === v }]}
        onCreate={() => { setEditing(null); setMode("create"); setOpen(true); }}
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
            <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("view"); setOpen(true); }}><Eye className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("edit"); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        )}
      />
      <EntityDialog open={open} onOpenChange={setOpen} entity={editing} onSave={save} mode={mode} />
    </>
  );
}

function EntityDialog({ open, onOpenChange, entity, onSave, mode }: { open: boolean; onOpenChange: (b: boolean) => void; entity: Entity | null; onSave: (e: Entity) => void; mode: "create" | "edit" | "view" }) {
  const defaultForm = { id: "", name: "", code: "", country: "India", currency: "INR", gstin: "", status: "Active" } as any;
  const [form, setForm] = useState<Entity>(entity ?? defaultForm);

  useEffect(() => {
    if (open) setForm(entity ?? defaultForm);
  }, [open, entity]);
  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && entity) setForm(entity); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "view" ? "View" : entity ? "Edit" : "Create"} Entity</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={mode === "view"} /></Field>
          <Field label="Code"><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} disabled={mode === "view"} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country"><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} disabled={mode === "view"} /></Field>
            <Field label="Currency"><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} disabled={mode === "view"} /></Field>
          </div>
          <Field label="GSTIN"><Input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} disabled={mode === "view"} /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{mode === "view" ? "Close" : "Cancel"}</Button>{mode !== "view" && <Button onClick={() => onSave(form)}>Save</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
