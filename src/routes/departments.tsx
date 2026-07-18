import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
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
      <DataTable rows={[...rows].sort((a, b) => new Date((b as any).createdAt || (b as any).created_at || 0).getTime() - new Date((a as any).createdAt || (a as any).created_at || 0).getTime())} rowKey={r => String(r.id)} searchKeys={["name","head","code"]}
        filters={[{ label: "Entity", key: "entityId", options: entities.map(e => ({ value: String(e.id), label: e.code })), predicate: (r, v) => String(r.entity) === String(v) }]}
        onCreate={() => { setEditing(null); setMode("create"); setOpen(true); }} createLabel="New Department" filename="departments.csv"
        columns={[
          { key: "name", header: "Department", accessor: r => r.name, sortable: true, render: r => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code}</div></div> },
          { key: "entity", header: "Entity", accessor: r => entities.find(e => String(e.id) === String(r.entity))?.code ?? "—", render: r => entities.find(e => String(e.id) === String(r.entity))?.code ?? "—" },
          { key: "head", header: "HOD", accessor: r => {
              const headEmp: any = employees.find((e: any) => String(e.id) === String(r.head) || String(e.code) === String(r.head));
              return headEmp ? `${headEmp.firstName || headEmp.first_name} ${headEmp.lastName || headEmp.last_name}` : (r.head || '—');
          }, render: r => {
              const headEmp: any = employees.find((e: any) => String(e.id) === String(r.head) || String(e.code) === String(r.head));
              return headEmp ? `${headEmp.firstName || headEmp.first_name} ${headEmp.lastName || headEmp.last_name}` : (r.head || '—');
          }},
          { key: "size", header: "Headcount", accessor: r => employees.filter((e: any) => String(e.department) === String(r.id)).length, render: r => employees.filter((e: any) => String(e.department) === String(r.id)).length },
          { key: "created_at", header: "Created Date & Time", render: r => ((r as any).createdAt || (r as any).created_at) ? new Date((r as any).createdAt || (r as any).created_at).toLocaleString() : "-" },
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
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  disabled={mode === "view"}
                  role="combobox" 
                  className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${!form.head ? "text-muted-foreground" : ""} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {form.head
                    ? `${(employees || []).find((e: any) => String(e.id) === String(form.head))?.firstName || (employees || []).find((e: any) => String(e.id) === String(form.head))?.first_name || ''} ${(employees || []).find((e: any) => String(e.id) === String(form.head))?.lastName || (employees || []).find((e: any) => String(e.id) === String(form.head))?.last_name || ''}`
                    : "Search Head..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 shadow-md" align="start">
                <Command>
                  <CommandInput placeholder="Search head of department..." />
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    <div className="max-h-[200px] overflow-y-auto">
                      <CommandItem
                        value="none"
                        onSelect={() => setForm({ ...form, head: "" })}
                        className="cursor-pointer font-medium"
                      >
                        <Check className={`mr-2 h-4 w-4 ${!form.head ? "opacity-100" : "opacity-0"}`} />
                        None
                      </CommandItem>
                      {(employees || [])
                        .map((e: any) => (
                          <CommandItem
                            key={e.id}
                            value={`${e.firstName || e.first_name} ${e.lastName || e.last_name}`}
                            onSelect={() => setForm({ ...form, head: e.id })}
                            className="cursor-pointer font-medium"
                          >
                            <Check className={`mr-2 h-4 w-4 ${String(form.head) === String(e.id) ? "opacity-100" : "opacity-0"}`} />
                            {e.firstName || e.first_name} {e.lastName || e.last_name}
                          </CommandItem>
                        ))}
                    </div>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{mode === "view" ? "Close" : "Cancel"}</Button>{mode !== "view" && <Button onClick={() => onSave(form)}>Save</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
