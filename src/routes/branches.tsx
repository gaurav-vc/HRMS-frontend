import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { branchesApi, entitiesApi } from "@/api";
import type { Branch, Entity } from "@/lib/mock-data";

export const Route = createFileRoute("/branches")({
  loader: async () => {
    const [branches, entities] = await Promise.all([
      branchesApi.getAll(),
      entitiesApi.getAll(),
    ]);
    return { branches, entities };
  },
  component: BranchesPage,
});

function BranchesPage() {
  const router = useRouter();
  const { branches: initial, entities } = Route.useLoaderData();
  const [rows, setRows] = useState<Branch[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");

  useEffect(() => { setRows(initial); }, [initial]);

  const save = async (b: Branch) => {
    try {
      if (editing && b.id) {
        await branchesApi.update(b.id, b);
        toast.success("Branch updated");
      } else {
        const { id, ...data } = b;
        await branchesApi.create(data);
        toast.success("Branch created");
      }
      setOpen(false); setEditing(null);
      router.invalidate();
    } catch (err) {
      toast.error("Failed to save branch");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await branchesApi.delete(id);
      toast.success("Branch removed");
      router.invalidate();
    } catch (err) {
      toast.error("Failed to delete branch");
    }
  };

  return (
    <>
      <PageHeader title="Branches" description="Office locations under each legal entity" />
      <DataTable
        rows={rows} rowKey={r => r.id} searchKeys={["name","city","state","code"]}
        filters={[{ label: "Entity", key: "entityId", options: entities.map(e => ({ value: e.id, label: e.code })), predicate: (r, v) => String(r.entity) === String(v) }]}
        onCreate={() => { setEditing(null); setMode("create"); setOpen(true); }} createLabel="New Branch" filename="branches.csv"
        columns={[
          { key: "name", header: "Branch", accessor: r => r.name, sortable: true, render: r => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code}</div></div> },
          { key: "entity", header: "Entity", render: r => entities.find(e => String(e.id) === String(r.entity))?.code ?? "—" },
          { key: "city", header: "City", accessor: r => r.city },
          { key: "state", header: "State" },
          { key: "head", header: "Branch Head" },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("view"); setOpen(true); }}><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("edit"); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>}
      />
      <BranchDialog open={open} onOpenChange={setOpen} branch={editing} onSave={save} entities={entities} mode={mode} />
    </>
  );
}

function BranchDialog({ open, onOpenChange, branch, onSave, entities, mode }: { open: boolean; onOpenChange: (b: boolean) => void; branch: Branch | null; onSave: (b: Branch) => void; entities: Entity[]; mode: "create" | "edit" | "view" }) {
  const defaultForm = { id: "", entityId: "", name: "", code: "", city: "", state: "", head: "", entity: "" } as any;
  const [form, setForm] = useState<Branch>(branch ?? defaultForm);

  useEffect(() => {
    if (open) setForm(branch ?? defaultForm);
  }, [open, branch]);
  
  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && branch) setForm(branch); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "view" ? "View" : branch ? "Edit" : "Create"} Branch</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Entity">
            <Select value={String(form.entity)} onValueChange={v => setForm({ ...form, entity: v } as any)} disabled={mode === "view"}>
              <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
              <SelectContent>
                {entities.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={mode === "view"} /></Field>
          <Field label="Code"><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} disabled={mode === "view"} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City"><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} disabled={mode === "view"} /></Field>
            <Field label="State"><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} disabled={mode === "view"} /></Field>
          </div>
          <Field label="Head"><Input value={form.head} onChange={e => setForm({ ...form, head: e.target.value })} disabled={mode === "view"} /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{mode === "view" ? "Close" : "Cancel"}</Button>{mode !== "view" && <Button onClick={() => onSave(form)}>Save</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }

