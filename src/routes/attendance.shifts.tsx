import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Check, ChevronsUpDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { attendanceApi, departmentsApi } from "@/api";

export const Route = createFileRoute("/attendance/shifts")({
  component: ShiftsPage,
  loader: async () => {
    const [shifts, departments] = await Promise.all([
      attendanceApi.getShifts(),
      departmentsApi.getAll()
    ]);
    return { shifts, departments };
  }
});

function ShiftsPage() {
  const router = useRouter();
  const { shifts: initial, departments } = Route.useLoaderData();
  const [shifts, setShifts] = useState<any[]>(initial);
  const [open, setOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => { setShifts(initial); }, [initial]);

  const save = async (e: any) => {
    try {
      if (editing && e.id) {
        await attendanceApi.updateShift(e.id, e);
        toast.success("Shift updated");
      } else {
        const { id, ...data } = e;
        await attendanceApi.createShift(data);
        toast.success("Shift created");
      }
      setOpen(false); setEditing(null);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save shift");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await attendanceApi.deleteShift(id);
      toast.success("Shift deleted");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete shift");
    }
  };

  const handleBulkAssign = async (form: any) => {
    try {
      const res = await attendanceApi.bulkAssign({
        department_ids: form.department_ids,
        shift_id: parseInt(form.shift_id),
        start_date: form.start_date,
        end_date: form.end_date
      });
      toast.success(res.message ? res.message + ". Shift timings and dates have been emailed to assigned employees." : "Bulk assignment successful. Shift timings and dates have been emailed to assigned employees.");
      setBulkAssignOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to bulk assign");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader title="Shift Definitions" description="Define the shift templates available for rostering." />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkAssignOpen(true)}>Bulk assign to dept</Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> New shift
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Array.isArray(shifts) ? shifts : ((shifts as any)?.results || [])).map((shift: any) => (
          <div key={shift.id} className="border rounded-xl p-5 bg-card text-card-foreground shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.colorHex || '#000' }} />
                <div>
                  <h3 className="font-semibold text-lg">{shift.name}</h3>
                  <p className="text-sm text-muted-foreground">{shift.code}</p>
                </div>
              </div>
              <Badge variant={shift.isActive ? "default" : "secondary"}>{shift.isActive ? "active" : "inactive"}</Badge>
            </div>
            
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hours</span>
                <span className="font-medium">{(shift.startTime || "00:00").substring(0, 5)} - {(shift.endTime || "00:00").substring(0, 5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grace</span>
                <span className="font-medium">{shift.graceMinutes || 0} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">OT multiplier</span>
                <span className="font-medium">{shift.otMultiplier || 1}×</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(shift); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(shift.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ShiftDialog open={open} onOpenChange={setOpen} shift={editing} onSave={save} />
      <BulkAssignDialog 
        open={bulkAssignOpen} 
        onOpenChange={setBulkAssignOpen} 
        departments={departments} 
        shifts={Array.isArray(shifts) ? shifts : ((shifts as any)?.results || [])} 
        onSave={handleBulkAssign} 
      />
    </div>
  );
}

function ShiftDialog({ open, onOpenChange, shift, onSave }: { open: boolean; onOpenChange: (b: boolean) => void; shift: any | null; onSave: (e: any) => void }) {
  const defaultForm = { id: "", name: "", code: "", startTime: "09:00:00", endTime: "18:00:00", graceMinutes: 10, otMultiplier: 1.5, colorHex: "#6366f1", isActive: true };
  const [form, setForm] = useState<any>(shift ?? defaultForm);
  
  useEffect(() => {
    if (open) setForm(shift ?? defaultForm);
  }, [open, shift]);

  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && shift) setForm(shift); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{shift ? "Edit" : "New"} shift definition</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. General" /></Field>
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code"><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. GEN" /></Field>
            <Field label="Color"><Input type="color" value={form.colorHex} onChange={e => setForm({ ...form, colorHex: e.target.value })} className="h-10 p-1 cursor-pointer" /></Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start time"><Input type="time" value={form.startTime || form.start_time} onChange={e => setForm({ ...form, startTime: e.target.value, start_time: e.target.value })} /></Field>
            <Field label="End time"><Input type="time" value={form.endTime || form.end_time} onChange={e => setForm({ ...form, endTime: e.target.value, end_time: e.target.value })} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Grace (min)"><Input type="number" value={form.graceMinutes || form.grace_minutes} onChange={e => setForm({ ...form, graceMinutes: parseInt(e.target.value), grace_minutes: parseInt(e.target.value) })} /></Field>
            <Field label="OT multiplier"><Input type="number" step="0.1" value={form.otMultiplier || form.ot_multiplier} onChange={e => setForm({ ...form, otMultiplier: parseFloat(e.target.value), ot_multiplier: parseFloat(e.target.value) })} /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)}>{shift ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { 
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; 
}

function BulkAssignDialog({ open, onOpenChange, departments, shifts, onSave }: { open: boolean, onOpenChange: (b: boolean) => void, departments: any[], shifts: any[], onSave: (form: any) => Promise<void> }) {
  const [form, setForm] = useState<{department_ids: number[], shift_id: string, start_date: string, end_date: string}>({ department_ids: [], shift_id: "", start_date: "", end_date: "" });
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) setForm({ department_ids: [], shift_id: "", start_date: "", end_date: "" });
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    await onSave(form);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Bulk Assign Shift to Department</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <Field label="Departments">
            <Popover>
              <PopoverTrigger asChild>
                <button role="combobox" className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border-2 border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${!form.department_ids.length ? "text-muted-foreground" : ""}`}>
                  {form.department_ids.length > 0 
                    ? <span className="text-foreground font-medium">{form.department_ids.length} department(s) selected</span> 
                    : "Select departments..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 border-2 border-slate-200 dark:border-slate-700 shadow-md" align="start">
                <Command>
                  <CommandInput placeholder="Search departments..." />
                  <CommandEmpty>No departments found.</CommandEmpty>
                  <CommandGroup>
                    <div className="max-h-[200px] overflow-y-auto">
                      {departments.map((d: any) => (
                        <CommandItem
                          key={d.id}
                          value={d.name}
                          className="cursor-pointer font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                          onSelect={() => {
                            const current = form.department_ids;
                            if (current.includes(d.id)) {
                              setForm({ ...form, department_ids: current.filter((id) => id !== d.id) });
                            } else {
                              setForm({ ...form, department_ids: [...current, d.id] });
                            }
                          }}
                        >
                          <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${form.department_ids.includes(d.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"}`}>
                            <Check className="h-3 w-3 font-bold stroke-[3]" />
                          </div>
                          {d.name}
                        </CommandItem>
                      ))}
                    </div>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </Field>
          <Field label="Shift">
            <Select value={form.shift_id} onValueChange={v => setForm({ ...form, shift_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select Shift" /></SelectTrigger>
              <SelectContent>
                {shifts.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date"><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="End Date"><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || form.department_ids.length === 0 || !form.shift_id || !form.start_date || !form.end_date}>
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
