import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Plus,
  Check,
  ChevronsUpDown,
  Search,
  X,
  Users,
  Briefcase,
  Building2,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  attendanceApi,
  departmentsApi,
  designationsApi,
  rolesApi,
  employeesApi,
} from "@/api";

export const Route = createFileRoute("/attendance/shifts")({
  component: ShiftsPage,
  loader: async () => {
    const [shifts, departments, designations, roles, employees] = await Promise.all([
      attendanceApi.getShifts(),
      departmentsApi.getAll().catch(() => []),
      designationsApi.getAll().catch(() => []),
      rolesApi.getAll().catch(() => []),
      employeesApi.getAll().catch(() => []),
    ]);
    return {
      shifts: (shifts as any)?.results || shifts || [],
      departments: (departments as any)?.results || departments || [],
      designations: (designations as any)?.results || designations || [],
      roles: (roles as any)?.results || roles || [],
      employees: (employees as any)?.results || employees || [],
    };
  },
});

function ShiftsPage() {
  const router = useRouter();
  const {
    shifts: initial,
    departments,
    designations,
    roles,
    employees,
  } = Route.useLoaderData();
  const [shifts, setShifts] = useState<any[]>(initial);
  const [open, setOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => {
    setShifts(initial);
  }, [initial]);

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
      setOpen(false);
      setEditing(null);
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
        designation_ids: form.designation_ids,
        role_ids: form.role_ids,
        employee_ids: form.employee_ids,
        shift_id: parseInt(form.shift_id),
        start_date: form.start_date,
        end_date: form.end_date,
      });
      toast.success(
        res.message
          ? res.message + ". Shift timings and dates have been emailed to assigned employees."
          : "Bulk assignment successful. Shift timings and dates have been emailed to assigned employees.",
      );
      setBulkAssignOpen(false);
      router.invalidate();
    } catch (err: any) {
      let msg = err.message || "Failed to bulk assign";
      try {
        const parsed = JSON.parse(msg);
        msg = parsed.error || parsed.detail || msg;
      } catch (e) {}
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Shift Definitions"
          description="Define the shift templates available for rostering."
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkAssignOpen(true)}>
            <Users className="mr-2 h-4 w-4" /> Bulk Assign Shift
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New shift
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Array.isArray(shifts) ? shifts : (shifts as any)?.results || []).map((shift: any) => (
          <div
            key={shift.id}
            className="border rounded-xl p-5 bg-card text-card-foreground shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: shift.colorHex || "#000" }}
                />
                <div>
                  <h3 className="font-semibold text-lg">{shift.name}</h3>
                  <p className="text-sm text-muted-foreground">{shift.code}</p>
                </div>
              </div>
              <Badge variant={shift.isActive ? "default" : "secondary"}>
                {shift.isActive ? "active" : "inactive"}
              </Badge>
            </div>

            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hours</span>
                <span className="font-medium">
                  {(shift.startTime || "00:00").substring(0, 5)} -{" "}
                  {(shift.endTime || "00:00").substring(0, 5)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grace</span>
                <span className="font-medium">{shift.graceMinutes || 0} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">OT multiplier</span>
                <span className="font-medium">{shift.otMultiplier || 1}×</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed">
                <span className="text-muted-foreground">OT Rule</span>
                <span className="font-medium text-primary">
                  {shift.isOtEnabled === false || shift.is_ot_enabled === false
                    ? "Disabled"
                    : parseFloat(String(shift.minHoursForOt || shift.min_hours_for_ot || 0)) > 0
                    ? `Min ${shift.minHoursForOt || shift.min_hours_for_ot}h (Base ${shift.otCalculationBaseHours || shift.ot_calculation_base_hours || 8}h)`
                    : "Standard (> 8h)"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditing(shift);
                  setOpen(true);
                }}
              >
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
        designations={designations}
        roles={roles}
        employees={employees}
        shifts={Array.isArray(shifts) ? shifts : (shifts as any)?.results || []}
        onSave={handleBulkAssign}
      />
    </div>
  );
}

function ShiftDialog({
  open,
  onOpenChange,
  shift,
  onSave,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  shift: any | null;
  onSave: (e: any) => void;
}) {
  const defaultForm = {
    id: "",
    name: "",
    code: "",
    startTime: "09:00:00",
    endTime: "18:00:00",
    graceMinutes: 10,
    otMultiplier: 1.5,
    colorHex: "#6366f1",
    isActive: true,
    isOtEnabled: true,
    minHoursForOt: 0,
    otCalculationBaseHours: 8,
  };
  const [form, setForm] = useState<any>(shift ?? defaultForm);

  useEffect(() => {
    if (open) setForm(shift ?? defaultForm);
  }, [open, shift]);

  return (
    <Dialog
      open={open}
      onOpenChange={(b) => {
        onOpenChange(b);
        if (b && shift) setForm(shift);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{shift ? "Edit" : "New"} shift definition</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. General"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. GEN"
              />
            </Field>
            <Field label="Color">
              <Input
                type="color"
                value={form.colorHex}
                onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                className="h-10 p-1 cursor-pointer"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start time">
              <Input
                type="time"
                value={form.startTime || form.start_time}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value, start_time: e.target.value })
                }
              />
            </Field>
            <Field label="End time">
              <Input
                type="time"
                value={form.endTime || form.end_time}
                onChange={(e) =>
                  setForm({ ...form, endTime: e.target.value, end_time: e.target.value })
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Grace (min)">
              <Input
                type="number"
                value={form.graceMinutes || form.grace_minutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    graceMinutes: parseInt(e.target.value),
                    grace_minutes: parseInt(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="OT multiplier">
              <Input
                type="number"
                step="0.1"
                value={form.otMultiplier || form.ot_multiplier}
                onChange={(e) =>
                  setForm({
                    ...form,
                    otMultiplier: parseFloat(e.target.value),
                    ot_multiplier: parseFloat(e.target.value),
                  })
                }
              />
            </Field>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground">Overtime (OT) Configuration</span>
                <p className="text-[11px] text-muted-foreground">Threshold & base deduction rules</p>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isOtEnabled !== false && form.is_ot_enabled !== false}
                  onChange={(e) =>
                    setForm({ ...form, isOtEnabled: e.target.checked, is_ot_enabled: e.target.checked })
                  }
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs font-medium">Enable OT</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Min Work Hours for OT">
                <Input
                  type="number"
                  step="0.5"
                  value={form.minHoursForOt ?? form.min_hours_for_ot ?? 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minHoursForOt: parseFloat(e.target.value) || 0,
                      min_hours_for_ot: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="e.g. 10.0"
                />
                <span className="text-[10px] text-muted-foreground">Worked &lt; this = 0 OT</span>
              </Field>
              <Field label="Base Shift Deduction">
                <Input
                  type="number"
                  step="0.5"
                  value={form.otCalculationBaseHours ?? form.ot_calculation_base_hours ?? 8}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      otCalculationBaseHours: parseFloat(e.target.value) || 8,
                      ot_calculation_base_hours: parseFloat(e.target.value) || 8,
                    })
                  }
                  placeholder="e.g. 8.0"
                />
                <span className="text-[10px] text-muted-foreground">Hours deducted for OT (e.g. 10h - 8h = 2h OT)</span>
              </Field>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)}>{shift ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function BulkAssignDialog({
  open,
  onOpenChange,
  departments,
  designations,
  roles,
  employees,
  shifts,
  onSave,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  departments: any[];
  designations: any[];
  roles: any[];
  employees: any[];
  shifts: any[];
  onSave: (form: any) => Promise<void>;
}) {
  const [targetType, setTargetType] = useState<"department" | "designation" | "role" | "employee">("department");
  const [form, setForm] = useState<{
    department_ids: number[];
    designation_ids: number[];
    role_ids: number[];
    employee_ids: number[];
    shift_id: string;
    start_date: string;
    end_date: string;
  }>({
    department_ids: [],
    designation_ids: [],
    role_ids: [],
    employee_ids: [],
    shift_id: "",
    start_date: "",
    end_date: "",
  });

  const [deptSearch, setDeptSearch] = useState("");
  const [desigSearch, setDesigSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        department_ids: [],
        designation_ids: [],
        role_ids: [],
        employee_ids: [],
        shift_id: "",
        start_date: "",
        end_date: "",
      });
      setDeptSearch("");
      setDesigSearch("");
      setRoleSearch("");
      setEmpSearch("");
    }
  }, [open]);

  // Fast lookup maps to resolve department and designation names safely
  const deptMap = useMemo(() => {
    const map: Record<string | number, string> = {};
    (departments || []).forEach((d: any) => {
      if (d?.id) map[d.id] = String(d.name || "");
    });
    return map;
  }, [departments]);

  const desigMap = useMemo(() => {
    const map: Record<string | number, string> = {};
    (designations || []).forEach((d: any) => {
      if (d?.id) map[d.id] = String(d.title || d.name || "");
    });
    return map;
  }, [designations]);

  const getEmployeeDeptName = (e: any): string => {
    if (e.department && typeof e.department === "object" && e.department.name) {
      return String(e.department.name);
    }
    if (typeof e.department === "string") return e.department;
    if (e.department_id && deptMap[e.department_id]) return deptMap[e.department_id];
    if (e.department && (typeof e.department === "number" || typeof e.department === "string") && deptMap[e.department]) {
      return deptMap[e.department];
    }
    return "";
  };

  const getEmployeeDesigTitle = (e: any): string => {
    if (e.designation && typeof e.designation === "object" && (e.designation.title || e.designation.name)) {
      return String(e.designation.title || e.designation.name);
    }
    if (typeof e.designation === "string") return e.designation;
    if (e.designation_id && desigMap[e.designation_id]) return desigMap[e.designation_id];
    if (e.designation && (typeof e.designation === "number" || typeof e.designation === "string") && desigMap[e.designation]) {
      return desigMap[e.designation];
    }
    return "";
  };

  // Filtered lists
  const filteredDepts = useMemo(() => {
    const term = (deptSearch || "").trim().toLowerCase();
    return (departments || []).filter((d: any) =>
      String(d?.name || "").toLowerCase().includes(term)
    );
  }, [departments, deptSearch]);

  const filteredDesigs = useMemo(() => {
    const term = (desigSearch || "").trim().toLowerCase();
    return (designations || []).filter((d: any) =>
      String(d?.title || d?.name || "").toLowerCase().includes(term)
    );
  }, [designations, desigSearch]);

  const filteredRoles = useMemo(() => {
    const term = (roleSearch || "").trim().toLowerCase();
    return (roles || []).filter((r: any) =>
      String(r?.name || "").toLowerCase().includes(term) ||
      String(r?.code || "").toLowerCase().includes(term)
    );
  }, [roles, roleSearch]);

  const filteredEmps = useMemo(() => {
    const term = (empSearch || "").trim().toLowerCase();
    return (employees || []).filter((e: any) => {
      const full = `${e.firstName || e.first_name || ""} ${e.lastName || e.last_name || ""}`.toLowerCase();
      const code = String(e.code || "").toLowerCase();
      const dept = getEmployeeDeptName(e).toLowerCase();
      const desig = getEmployeeDesigTitle(e).toLowerCase();
      return !term || full.includes(term) || code.includes(term) || dept.includes(term) || desig.includes(term);
    });
  }, [employees, empSearch, deptMap, desigMap]);

  const toggleDept = (id: number) => {
    setForm((prev) => ({
      ...prev,
      department_ids: prev.department_ids.includes(id)
        ? prev.department_ids.filter((item) => item !== id)
        : [...prev.department_ids, id],
    }));
  };

  const toggleDesig = (id: number) => {
    setForm((prev) => ({
      ...prev,
      designation_ids: prev.designation_ids.includes(id)
        ? prev.designation_ids.filter((item) => item !== id)
        : [...prev.designation_ids, id],
    }));
  };

  const toggleRole = (id: number) => {
    setForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(id)
        ? prev.role_ids.filter((item) => item !== id)
        : [...prev.role_ids, id],
    }));
  };

  const toggleEmp = (id: number) => {
    setForm((prev) => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(id)
        ? prev.employee_ids.filter((item) => item !== id)
        : [...prev.employee_ids, id],
    }));
  };

  const selectAllFilteredDepts = () => {
    const ids = filteredDepts.map((d: any) => d.id);
    setForm((prev) => ({
      ...prev,
      department_ids: Array.from(new Set([...prev.department_ids, ...ids])),
    }));
  };

  const selectAllFilteredDesigs = () => {
    const ids = filteredDesigs.map((d: any) => d.id);
    setForm((prev) => ({
      ...prev,
      designation_ids: Array.from(new Set([...prev.designation_ids, ...ids])),
    }));
  };

  const selectAllFilteredRoles = () => {
    const ids = filteredRoles.map((r: any) => r.id);
    setForm((prev) => ({
      ...prev,
      role_ids: Array.from(new Set([...prev.role_ids, ...ids])),
    }));
  };

  const selectAllFilteredEmps = () => {
    const ids = filteredEmps.map((e: any) => e.id);
    setForm((prev) => ({
      ...prev,
      employee_ids: Array.from(new Set([...prev.employee_ids, ...ids])),
    }));
  };

  const totalSelected =
    form.department_ids.length +
    form.designation_ids.length +
    form.role_ids.length +
    form.employee_ids.length;

  const handleSave = async () => {
    setLoading(true);
    await onSave(form);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Bulk Assign Shift</span>
          </DialogTitle>
          <DialogDescription>
            Assign a shift template across departments, designations, dynamic roles, or search and multi-select individual employees.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Target Selection Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Assign Target Criteria</Label>
              {totalSelected > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      department_ids: [],
                      designation_ids: [],
                      role_ids: [],
                      employee_ids: [],
                    }))
                  }
                  className="text-xs text-muted-foreground hover:text-rose-600 transition-colors"
                >
                  Clear all ({totalSelected})
                </button>
              )}
            </div>

            <Tabs value={targetType} onValueChange={(v: any) => setTargetType(v)} className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="department" className="text-xs gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Departments</span>
                  {form.department_ids.length > 0 && (
                    <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] font-bold">
                      {form.department_ids.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="designation" className="text-xs gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Designations</span>
                  {form.designation_ids.length > 0 && (
                    <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] font-bold">
                      {form.designation_ids.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="role" className="text-xs gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Roles</span>
                  {form.role_ids.length > 0 && (
                    <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] font-bold">
                      {form.role_ids.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="employee" className="text-xs gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Employees</span>
                  {form.employee_ids.length > 0 && (
                    <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] font-bold">
                      {form.employee_ids.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Departments Tab */}
              <TabsContent value="department" className="mt-3 space-y-2 border rounded-xl p-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search departments..."
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={selectAllFilteredDepts}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setForm((p) => ({ ...p, department_ids: [] }))}
                  >
                    Clear
                  </Button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-border/40">
                  {filteredDepts.map((d: any) => {
                    const isChecked = form.department_ids.includes(d.id);
                    return (
                      <div
                        key={d.id}
                        onClick={() => toggleDept(d.id)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isChecked ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleDept(d.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>{d.name}</span>
                        </div>
                        {isChecked && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    );
                  })}
                  {filteredDepts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No departments found.</p>
                  )}
                </div>
              </TabsContent>

              {/* Designations Tab */}
              <TabsContent value="designation" className="mt-3 space-y-2 border rounded-xl p-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search designations..."
                      value={desigSearch}
                      onChange={(e) => setDesigSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={selectAllFilteredDesigs}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setForm((p) => ({ ...p, designation_ids: [] }))}
                  >
                    Clear
                  </Button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-border/40">
                  {filteredDesigs.map((d: any) => {
                    const isChecked = form.designation_ids.includes(d.id);
                    return (
                      <div
                        key={d.id}
                        onClick={() => toggleDesig(d.id)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isChecked ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleDesig(d.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>{d.title || d.name}</span>
                          {d.grade && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                              {d.grade}
                            </Badge>
                          )}
                        </div>
                        {isChecked && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    );
                  })}
                  {filteredDesigs.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No designations found.</p>
                  )}
                </div>
              </TabsContent>

              {/* Dynamic Roles Tab */}
              <TabsContent value="role" className="mt-3 space-y-2 border rounded-xl p-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search roles..."
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={selectAllFilteredRoles}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setForm((p) => ({ ...p, role_ids: [] }))}
                  >
                    Clear
                  </Button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-border/40">
                  {filteredRoles.map((r: any) => {
                    const isChecked = form.role_ids.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRole(r.id)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isChecked ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleRole(r.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>{r.name}</span>
                          {r.code && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              ({r.code})
                            </span>
                          )}
                        </div>
                        {isChecked && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    );
                  })}
                  {filteredRoles.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No roles found.</p>
                  )}
                </div>
              </TabsContent>

              {/* Employees Search & Multi-Select Tab */}
              <TabsContent value="employee" className="mt-3 space-y-2 border rounded-xl p-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search employees by name, code, dept, designation..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={selectAllFilteredEmps}
                  >
                    Select All ({filteredEmps.length})
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setForm((p) => ({ ...p, employee_ids: [] }))}
                  >
                    Clear
                  </Button>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1 divide-y divide-border/40">
                  {filteredEmps.map((e: any) => {
                    const isChecked = form.employee_ids.includes(e.id);
                    const empName = `${e.firstName || e.first_name || ""} ${e.lastName || e.last_name || ""}`.trim() || e.name || "Employee";
                    const deptName = getEmployeeDeptName(e);
                    const desigTitle = getEmployeeDesigTitle(e);

                    return (
                      <div
                        key={e.id}
                        onClick={() => toggleEmp(e.id)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isChecked ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleEmp(e.id)}
                            onClick={(ev) => ev.stopPropagation()}
                          />
                          <span className="font-medium truncate">{empName}</span>
                          <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                            ({e.code})
                          </span>
                          {deptName && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0">
                              {deptName}
                            </Badge>
                          )}
                          {desigTitle && (
                            <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                              &bull; {desigTitle}
                            </span>
                          )}
                        </div>
                        {isChecked && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                      </div>
                    );
                  })}
                  {filteredEmps.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No employees matching &quot;{empSearch}&quot;
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Selected Targets Summary Chips */}
            {totalSelected > 0 && (
              <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Selected Targets ({totalSelected}):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {form.department_ids.map((id) => {
                    const d = (departments || []).find((item: any) => item.id === id);
                    return (
                      <Badge
                        key={`dept-${id}`}
                        variant="secondary"
                        className="text-[11px] py-0.5 px-2 gap-1 bg-background border"
                      >
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <span>{d?.name || `Dept #${id}`}</span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-rose-600 ml-0.5"
                          onClick={() => toggleDept(id)}
                        />
                      </Badge>
                    );
                  })}
                  {form.designation_ids.map((id) => {
                    const des = (designations || []).find((item: any) => item.id === id);
                    return (
                      <Badge
                        key={`desig-${id}`}
                        variant="secondary"
                        className="text-[11px] py-0.5 px-2 gap-1 bg-background border"
                      >
                        <Briefcase className="w-3 h-3 text-muted-foreground" />
                        <span>{des?.title || des?.name || `Designation #${id}`}</span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-rose-600 ml-0.5"
                          onClick={() => toggleDesig(id)}
                        />
                      </Badge>
                    );
                  })}
                  {form.role_ids.map((id) => {
                    const r = (roles || []).find((item: any) => item.id === id);
                    return (
                      <Badge
                        key={`role-${id}`}
                        variant="secondary"
                        className="text-[11px] py-0.5 px-2 gap-1 bg-background border"
                      >
                        <ShieldCheck className="w-3 h-3 text-muted-foreground" />
                        <span>{r?.name || `Role #${id}`}</span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-rose-600 ml-0.5"
                          onClick={() => toggleRole(id)}
                        />
                      </Badge>
                    );
                  })}
                  {form.employee_ids.map((id) => {
                    const emp = (employees || []).find((item: any) => item.id === id);
                    const name = emp
                      ? `${emp.firstName || emp.first_name || ""} ${emp.lastName || emp.last_name || ""}`.trim()
                      : `Emp #${id}`;
                    return (
                      <Badge
                        key={`emp-${id}`}
                        variant="secondary"
                        className="text-[11px] py-0.5 px-2 gap-1 bg-background border"
                      >
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>{name}</span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-rose-600 ml-0.5"
                          onClick={() => toggleEmp(id)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Shift Selection */}
          <Field label="Shift Template">
            <Select value={form.shift_id} onValueChange={(v) => setForm({ ...form, shift_id: v })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select shift template to assign" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((s: any) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.colorHex || "#6366f1" }}
                      />
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({(s.startTime || "00:00").substring(0, 5)} - {(s.endTime || "00:00").substring(0, 5)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="h-10"
              />
            </Field>
            <Field label="End Date">
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="h-10"
              />
            </Field>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || totalSelected === 0 || !form.shift_id || !form.start_date || !form.end_date}
            className="gap-2"
          >
            {loading ? "Assigning..." : `Assign Shift ${totalSelected > 0 ? `(${totalSelected} Targets)` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
