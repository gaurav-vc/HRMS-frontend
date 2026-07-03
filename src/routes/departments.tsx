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
import { departmentsApi, entitiesApi, employeesApi } from "@/api";
import type { Department, Entity, Employee } from "@/lib/mock-data";

export const Route = createFileRoute("/departments")({
  component: DepartmentsPage,
  loader: async () => {
    const [departments, entities, employees] = await Promise.all([
      departmentsApi.getAll(),
      entitiesApi.getAll(),
      employeesApi.getAll(),
    ]);
    return { departments, entities, employees };
  }
});

function DepartmentsPage() {
  const router = useRouter();
  const { departments: initial, entities, employees } = Route.useLoaderData();
  const [rows, setRows] = useState<Department[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");

  useEffect(() => { setRows(initial); }, [initial]);

  const save = async (d: Department) => {
    try {
      if (editing && d.id) {
        await departmentsApi.update(d.id, d);
        toast.success("Department updated");
      } else {
        const { id, ...data } = d;
        await departmentsApi.create(data);
        toast.success("Department created");
      }
      setOpen(false); setEditing(null);
      router.invalidate();
    } catch (err) {
      toast.error("Failed to save department");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await departmentsApi.delete(id);
      toast.success("Department removed");
      router.invalidate();
    } catch (err) {
      toast.error("Failed to delete department");
    }
  };

  return (
    <>
      <PageHeader title="Departments" description="Functional units across the organisation" />
      <DataTable rows={rows} rowKey={r => String(r.id)} searchKeys={["name","head","code"]}
        filters={[{ label: "Entity", key: "entityId", options: entities.map(e => ({ value: String(e.id), label: e.code })), predicate: (r, v) => String(r.entity) === String(v) }]}
        onCreate={() => { setEditing(null); setMode("create"); setOpen(true); }} createLabel="New Department" filename="departments.csv"
        columns={[
          { key: "name", header: "Department", accessor: r => r.name, sortable: true, render: r => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code}</div></div> },
          { key: "entity", header: "Entity", render: r => entities.find(e => String(e.id) === String(r.entity))?.code ?? "—" },
          { key: "head", header: "HOD", render: r => {
              const headEmp: any = employees.find((e: any) => String(e.id) === String(r.head) || String(e.code) === String(r.head));
              return headEmp ? `${headEmp.firstName || headEmp.first_name} ${headEmp.lastName || headEmp.last_name}` : (r.head || '—');
          }},
          { key: "size", header: "Headcount", render: r => employees.filter((e: any) => String(e.department) === String(r.id)).length },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("view"); setOpen(true); }}><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("edit"); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>}
      />
      <DepartmentDialog open={open} onOpenChange={setOpen} department={editing} onSave={save} entities={entities} employees={employees} mode={mode} />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function DepartmentDialog({ open, onOpenChange, department, onSave, entities, employees, mode }: { open: boolean; onOpenChange: (b: boolean) => void; department: Department | null; onSave: (d: Department) => void; entities: Entity[]; employees: any[]; mode: "create" | "edit" | "view" }) {
  const defaultForm = { id: "", entityId: "", name: "", code: "", head: "", entity: "" } as any;
  const [form, setForm] = useState<Department>(department ?? defaultForm);

  useEffect(() => {
    if (open) setForm(department ?? defaultForm);
  }, [open, department]);
  
  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && department) setForm(department); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "view" ? "View" : department ? "Edit" : "Create"} Department</DialogTitle></DialogHeader>
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
          <Field label="Head">
            <Select value={String(form.head)} onValueChange={v => setForm({ ...form, head: v } as any)} disabled={mode === "view"}>
              <SelectTrigger><SelectValue placeholder="Select Head of Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.firstName || e.first_name} {e.lastName || e.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{mode === "view" ? "Close" : "Cancel"}</Button>{mode !== "view" && <Button onClick={() => onSave(form)}>Save</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
