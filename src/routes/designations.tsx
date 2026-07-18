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
import { designationsApi, departmentsApi } from "@/api";
import type { Designation, Department } from "@/lib/mock-data";

export const Route = createFileRoute("/designations")({
  component: DesignationsPage,
  loader: async () => {
    const [designations, departments] = await Promise.all([
      designationsApi.getAll(),
      departmentsApi.getAll(),
    ]);
    return { designations, departments };
  }
});

function DesignationsPage() {
  const router = useRouter();
  const { designations: initial, departments } = Route.useLoaderData();
  const [rows, setRows] = useState<Designation[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");

  useEffect(() => { setRows(initial); }, [initial]);

  const save = async (d: Designation) => {
    try {
      if (editing && d.id) {
        await designationsApi.update(d.id, d);
        toast.success("Designation updated");
      } else {
        const { id, ...data } = d;
        await designationsApi.create(data);
        toast.success("Designation created");
      }
      setOpen(false); setEditing(null);
      router.invalidate();
    } catch (err) {
      toast.error("Failed to save designation");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await designationsApi.delete(id);
      toast.success("Designation removed");
      router.invalidate();
    } catch (err) {
      toast.error("Failed to delete designation");
    }
  };

  return (
    <>
      <PageHeader title="Designations" description="Job titles & grades for every department" />
      <DataTable rows={[...rows].sort((a, b) => new Date((b as any).createdAt || (b as any).created_at || 0).getTime() - new Date((a as any).createdAt || (a as any).created_at || 0).getTime())} rowKey={r => String(r.id)} searchKeys={["title","grade"]}
        filters={[{ label: "Department", key: "departmentId", options: departments.map(d => ({ value: String(d.id), label: d.name })), predicate: (r, v) => String(r.department) === String(v) }]}
        onCreate={() => { setEditing(null); setMode("create"); setOpen(true); }} createLabel="New Designation" filename="designations.csv"
        columns={[
          { key: "title", header: "Title", accessor: r => r.title, sortable: true },
          { key: "grade", header: "Grade", accessor: r => r.grade, sortable: true },
          { key: "dept", header: "Department", accessor: r => departments.find(d => String(d.id) === String(r.department))?.name ?? "—", render: r => departments.find(d => String(d.id) === String(r.department))?.name ?? "—" },
          { key: "created_at", header: "Created Date & Time", render: r => ((r as any).createdAt || (r as any).created_at) ? new Date((r as any).createdAt || (r as any).created_at).toLocaleString() : "-" },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("view"); setOpen(true); }}><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("edit"); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>}
      />
      <DesignationDialog open={open} onOpenChange={setOpen} designation={editing} onSave={save} departments={departments} mode={mode} />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function DesignationDialog({ open, onOpenChange, designation, onSave, departments, mode }: { open: boolean; onOpenChange: (b: boolean) => void; designation: Designation | null; onSave: (d: Designation) => void; departments: Department[]; mode: "create" | "edit" | "view" }) {
  const defaultForm = { id: "", departmentId: "", title: "", grade: "", department: "" } as any;
  const [form, setForm] = useState<Designation>(designation ?? defaultForm);

  useEffect(() => {
    if (open) setForm(designation ?? defaultForm);
  }, [open, designation]);
  
  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && designation) setForm(designation); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "view" ? "View" : designation ? "Edit" : "Create"} Designation</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Department">
            <Select value={String(form.department)} onValueChange={v => setForm({ ...form, department: v } as any)} disabled={mode === "view"}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} disabled={mode === "view"} /></Field>
          <Field label="Grade"><Input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} disabled={mode === "view"} /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{mode === "view" ? "Close" : "Cancel"}</Button>{mode !== "view" && <Button onClick={() => onSave(form)}>Save</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
