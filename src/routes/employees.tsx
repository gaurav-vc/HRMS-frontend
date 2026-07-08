import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2, UserPlus, Calculator, Send, CheckCircle, MailPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { employeesApi, departmentsApi, designationsApi, branchesApi, entitiesApi, sitesApi, payrollApi, offersApi, offerTemplatesApi } from "@/api";
import type { Employee, Department, Designation, Branch, Entity, Site } from "@/lib/mock-data";

export const Route = createFileRoute("/employees")({
  loader: async () => {
    const [employees, departments, designations, branches, entities, sites, structures, offers, offerTemplates] = await Promise.all([
      employeesApi.getAll(),
      departmentsApi.getAll(),
      designationsApi.getAll(),
      branchesApi.getAll(),
      entitiesApi.getAll(),
      sitesApi.getAll(),
      payrollApi.getStructures().catch(() => []),
      offersApi.getAll().catch((err: any) => {
        setTimeout(() => toast.error(`Error fetching offers: ${err.message || String(err)}`, { duration: 10000 }), 1000);
        return [];
      }),
      offerTemplatesApi.getAll().catch((err: any) => {
        setTimeout(() => toast.error(`Error fetching templates: ${err.message || String(err)}`, { duration: 10000 }), 1000);
        return [];
      }),
    ]);
    return { employees, departments, designations, branches, entities, sites, structures, offers, offerTemplates };
  },
  component: EmployeesPage,
});

function EmployeesPage() {
  const router = useRouter();
  const { employees: initial, departments, designations, branches, entities, sites, structures, offers, offerTemplates } = Route.useLoaderData();
  const [rows, setRows] = useState<Employee[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState("directory");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    toast.info("Importing employees...");
    try {
      const res = await employeesApi.bulkImport(file);
      if (res.success > 0) {
        toast.success(`Successfully imported ${res.success} employees!`);
        if (res.errors && res.errors.length > 0) {
          console.warn("Import errors:", res.errors);
          toast.warning(`${res.errors.length} rows had errors. Check console.`);
        }
        router.invalidate();
      } else {
        toast.error("No employees were imported.");
      }
    } catch (err: any) {
      toast.error("Bulk import failed: " + err.message);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => { setRows(initial); }, [initial]);

  const save = async (e: Employee) => {
    try {
      const cleanData: any = { ...e };
      // Convert empty strings to null for DRF validation
      if (!cleanData.dob) cleanData.dob = null;
      if (!cleanData.doj) cleanData.doj = null;
      if (!cleanData.manager || cleanData.manager === " ") cleanData.manager = null;
      if (!cleanData.entity) cleanData.entity = null;
      if (!cleanData.branch) cleanData.branch = null;
      if (!cleanData.site) cleanData.site = null;
      if (!cleanData.department) cleanData.department = null;
      if (!cleanData.designation) cleanData.designation = null;
      if (!cleanData.salaryStructure || cleanData.salaryStructure === " ") cleanData.salaryStructure = null;

      if (editing && e.id) {
        await employeesApi.update(e.id, cleanData);
        toast.success("Employee updated");
      } else {
        const { id, ...data } = cleanData;
        const result = await employeesApi.create(data);
        toast.success("Employee created and added to Pending Offers!");
      }
      setOpen(false); setEditing(null);
      router.invalidate();
    } catch (err: any) {
      toast.error(`Failed to save employee: ${err?.message || JSON.stringify(err)}`, { duration: 10000 });
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await employeesApi.delete(id);
      toast.success("Employee removed");
      router.invalidate();
    } catch (err) {
      toast.error("Failed to delete employee");
    }
  };

  return (
    <>
      <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
      <PageHeader title="Employees" description="Complete employee directory across all entities" actions={<Button onClick={() => fileInputRef.current?.click()} variant="outline"><UserPlus className="h-4 w-4 mr-1" />Bulk Import</Button>} />
      
      <div className="mb-4 flex space-x-2 border-b">
        <button className={`px-4 py-2 text-sm font-medium ${activeTab === "directory" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setActiveTab("directory")}>Directory</button>
      </div>

      {activeTab === "directory" && (
        <DataTable
          rows={rows} rowKey={r => r.id} searchKeys={["firstName","lastName","email","code","phone"]}
          filters={[
            { label: "Entity", key: "entity", options: entities.map(e => ({ value: e.id, label: e.code })), predicate: (r, v) => String(r.entity) === String(v) },
            { label: "Department", key: "department", options: departments.map(d => ({ value: d.id, label: d.name })), predicate: (r, v) => String(r.department) === String(v) },
            { label: "Status", key: "status", options: ["Active","On Leave","Inactive","Draft"].map(s => ({ value: s, label: s })), predicate: (r, v) => r.status === v },
          ]}
          onCreate={() => { setEditing(null); setOpen(true); }} createLabel="Onboard Employee" filename="employees.csv"
          columns={[
            { key: "emp", header: "Employee", accessor: (r: any) => `${r.firstName || r.first_name || ""} ${r.lastName || r.last_name || ""}`, sortable: true, render: (r: any) => {
              const fName = r.firstName || r.first_name || "";
              const lName = r.lastName || r.last_name || "";
              return (
              <Link to="/employees/$id" params={{ id: String(r.id) }} className="flex items-center gap-3 group">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{(fName?.[0]||"")}{(lName?.[0]||"")}</AvatarFallback></Avatar>
                <div className="min-w-0"><div className="font-medium group-hover:text-primary truncate">{fName} {lName}</div><div className="text-xs text-muted-foreground truncate">{r.code} • {r.email}</div></div>
              </Link>
            )}},
            { key: "desg", header: "Designation", render: r => designations.find(d => String(d.id) === String(r.designation))?.title ?? "—" },
            { key: "dept", header: "Department", render: r => departments.find(d => String(d.id) === String(r.department))?.name ?? "—" },
            { key: "branch", header: "Branch", render: r => branches.find(b => String(b.id) === String(r.branch))?.name ?? "—" },
            { key: "doj", header: "Joined", accessor: r => r.doj, sortable: true },
            { key: "status", header: "Status", render: r => <Badge className={r.status === "Active" ? "bg-success text-success-foreground" : r.status === "On Leave" ? "bg-warning text-warning-foreground" : r.status === "Draft" ? "bg-secondary text-secondary-foreground" : ""}>{r.status}</Badge> },
          ]}
          actions={r => <div className="flex justify-end gap-1">
            <Link 
              to="/employees/$id" 
              params={{ id: String(r.id) }} 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>}
        />
      )}
      
      <EmployeeDialog open={open} onOpenChange={setOpen} employee={editing} onSave={save} departments={departments} designations={designations} branches={branches} entities={entities} sites={sites} employees={rows} structures={structures} />
    </>
  );
}

function EmployeeDialog({ open, onOpenChange, employee, onSave, departments, designations, branches, entities, sites, employees, structures }: any) {
  const defaultForm = { id: "", code: "", firstName: "", lastName: "", email: "", phone: "", entity: "",  employeeType: "Normal Employee",
  branch: null, site: null, department: null, designation: null, role: 'employee',
  manager: null, status: "Active", ctc: 0, salaryStructure: null, uan: "", esi: "", bankName: "", bankAccount: "", ifsc: "", address: "", dob: "", doj: "", gender: "Male", taxRegime: "New", taxSavingDeductions: 0 };
  const [form, setForm] = useState<Employee>(employee ?? defaultForm as any);
  const [tab, setTab] = useState("personal");
  const [showEstimator, setShowEstimator] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(employee ?? defaultForm as any);
      setTab("personal");
    }
  }, [open, employee]);
  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && employee) setForm(employee); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{employee ? "Edit" : "Onboard"} Employee</DialogTitle></DialogHeader>
        <div className="mt-4">
          <div className="flex border-b mb-4">
            <button className={`px-4 py-2 text-sm font-medium ${tab === "personal" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setTab("personal")}>Personal</button>
            <button className={`px-4 py-2 text-sm font-medium ${tab === "employment" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setTab("employment")}>Employment</button>
            <button className={`px-4 py-2 text-sm font-medium ${tab === "compliance" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setTab("compliance")}>Compliance & Bank</button>
          </div>

          {tab === "personal" && <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name"><Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></Field>
              <Field label="Last Name"><Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></Field>
              <Field label="Gender">
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </Field>
              <div className="col-span-2"><Field label="Address"><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></Field></div>
            </div>
          </div>}

          {tab === "employment" && <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee Code"><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></Field>
              <Field label="Date of Joining"><Input type="date" value={form.doj} onChange={e => setForm({ ...form, doj: e.target.value })} /></Field>
              <Field label="Entity">
                <Select value={String(form.entity || ' ')} onValueChange={v => setForm({ ...form, entity: v === ' ' ? null : v } as any)}>
                  <SelectTrigger><SelectValue placeholder="Select Entity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">None</SelectItem>
                    {(entities || []).map((e: Entity, idx: number) => <SelectItem key={e?.id || `ent-${idx}`} value={String(e?.id)}>{e?.name || 'Unknown'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Branch">
                <Select value={String(form.branch || ' ')} onValueChange={v => setForm({ ...form, branch: v === ' ' ? null : v } as any)}>
                  <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">None</SelectItem>
                    {(branches || []).filter((b: Branch) => !form.entity || String(b?.entity) === String(form.entity)).map((b: Branch, idx: number) => <SelectItem key={b?.id || `br-${idx}`} value={String(b?.id)}>{b?.name || 'Unknown'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Site">
                <Select value={String(form.site || ' ')} onValueChange={v => setForm({ ...form, site: v === ' ' ? null : v } as any)}>
                  <SelectTrigger><SelectValue placeholder="Select Site" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">None</SelectItem>
                    {(sites || []).filter((s: Site) => !form.branch || String(s?.branch) === String(form.branch)).map((s: Site, idx: number) => <SelectItem key={s?.id || `st-${idx}`} value={String(s?.id)}>{s?.name || 'Unknown'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Department">
                <Select value={String(form.department || ' ')} onValueChange={v => setForm({ ...form, department: v === ' ' ? null : v } as any)}>
                  <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">None</SelectItem>
                    {(departments || []).filter((d: Department) => !form.entity || String(d?.entity) === String(form.entity)).map((d: Department, idx: number) => <SelectItem key={d?.id || `dept-${idx}`} value={String(d?.id)}>{d?.name || 'Unknown'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Designation">
                <Select value={String(form.designation || ' ')} onValueChange={v => setForm({ ...form, designation: v === ' ' ? null : v } as any)}>
                  <SelectTrigger><SelectValue placeholder="Select Designation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">None</SelectItem>
                    {(designations || []).filter((d: Designation) => !form.department || String(d?.department) === String(form.department)).map((d: Designation, idx: number) => <SelectItem key={d?.id || `desg-${idx}`} value={String(d?.id)}>{d?.title || 'Unknown'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Reporting Manager">
                <Select value={String(form.manager || '')} onValueChange={v => setForm({ ...form, manager: v || undefined } as any)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent><SelectItem value=" ">None</SelectItem>{(employees || []).map((e: Employee, idx: number) => <SelectItem key={e?.id || `emp-${idx}`} value={String(e?.id)}>{e?.firstName} {e?.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="Draft">Draft</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="CTC (Annual)">
                <div className="flex gap-2">
                  <Input type="number" value={form.ctc || ''} onChange={e => setForm({ ...form, ctc: +e.target.value })} />
                  <Button type="button" variant="outline" onClick={() => setShowEstimator(true)} title="Estimate In-Hand">
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
              </Field>
              <Field label="Employee Type">
                <Select value={form.employeeType || "Normal Employee"} onValueChange={v => setForm({ ...form, employeeType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal Employee">Normal Employee</SelectItem>
                    <SelectItem value="Service Employee">Service Employee</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Salary Structure">
                <Select value={String(form.salaryStructure || ' ')} onValueChange={v => setForm({ ...form, salaryStructure: v === ' ' ? null : v } as any)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">None</SelectItem>
                    {(structures || []).filter((s: any) => {
                      // Filter based on employee type
                      if (form.employeeType === 'Service Employee') {
                        return s.name === 'Service Structure';
                      } else {
                        return s.name !== 'Service Structure';
                      }
                    }).map((s: any, idx: number) => <SelectItem key={s?.id || `struct-${idx}`} value={String(s?.id)}>{s?.name || 'Unknown'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tax Regime">
                <Select value={form.taxRegime || 'New'} onValueChange={v => setForm({ ...form, taxRegime: v })}>
                  <SelectTrigger><SelectValue placeholder="Tax Regime" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New Regime (FY 26-27)</SelectItem>
                    <SelectItem value="Old">Old Regime</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.taxRegime === 'Old' && (
                <Field label="Tax Saving Deductions (₹)">
                  <Input type="number" value={form.taxSavingDeductions || ''} onChange={e => setForm({ ...form, taxSavingDeductions: +e.target.value })} />
                </Field>
              )}
              <div className="col-span-2 grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                <Field label="Bonus Applicable">
                  <div className="flex items-center h-10">
                    <Checkbox id="bonusApplicable" checked={form.bonusApplicable || false} onCheckedChange={(c: boolean) => setForm({ ...form, bonusApplicable: c === true, bonusType: c ? 'Fixed Amount' : undefined, bonusValue: c ? 0 : undefined })} />
                    <label htmlFor="bonusApplicable" className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Yes, this employee receives variable bonus</label>
                  </div>
                </Field>
                {form.bonusApplicable && (
                  <Field label="Bonus Type">
                    <Select value={form.bonusType || 'Fixed Amount'} onValueChange={v => setForm({ ...form, bonusType: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Bonus Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fixed Amount">Fixed Amount</SelectItem>
                        <SelectItem value="Percentage">Percentage (% of Annual CTC)</SelectItem>
                        <SelectItem value="Monthly Salary">Monthly Salary (CTC / 12)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                {form.bonusApplicable && form.bonusType !== 'Monthly Salary' && (
                  <Field label={form.bonusType === 'Percentage' ? "Bonus Percentage (%)" : "Bonus Amount (₹)"}>
                    <Input type="number" min="0" step="0.01" value={form.bonusValue || 0} onChange={e => {
                      const val = +e.target.value;
                      if (form.bonusType === 'Percentage' && val > 100) return; // Prevent > 100%
                      if (form.bonusType === 'Fixed Amount' && val > (form.ctc || 0)) return; // Prevent > CTC
                      setForm({ ...form, bonusValue: val });
                    }} />
                    {form.bonusType === 'Fixed Amount' && (form.bonusValue || 0) > (form.ctc || 0) && <p className="text-xs text-destructive mt-1">Cannot exceed Annual CTC.</p>}
                  </Field>
                )}
                {form.bonusApplicable && form.bonusType === 'Monthly Salary' && (
                  <Field label="Number of Months">
                    <Input type="number" min="1" max="12" step="1" value={form.bonusMonths || 1} onChange={e => {
                      const val = Math.max(1, Math.min(12, Math.floor(+e.target.value)));
                      setForm({ ...form, bonusMonths: val });
                    }} />
                  </Field>
                )}
              </div>
            </div>
          </div>}

          {tab === "compliance" && <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="PAN"><Input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value })} /></Field>
              <Field label="Aadhaar"><Input value={form.aadhaar} onChange={e => setForm({ ...form, aadhaar: e.target.value })} /></Field>
              <Field label="UAN"><Input value={form.uan} onChange={e => setForm({ ...form, uan: e.target.value })} /></Field>
              <Field label="ESI No."><Input value={form.esi} onChange={e => setForm({ ...form, esi: e.target.value })} /></Field>
              <div className="col-span-2 border-t pt-4 font-medium text-sm text-muted-foreground">Statutory Preferences</div>
              <div className="col-span-2">
                <div className="flex items-center h-10 mb-2">
                  <Checkbox id="pfApplicable" checked={form.pfApplicable || false} onCheckedChange={(c: boolean) => setForm({ ...form, pfApplicable: c === true })} />
                  <label htmlFor="pfApplicable" className="ml-2 text-sm font-medium leading-none">PF Applicable (Deduct Provident Fund)</label>
                </div>
              </div>
              <div className="col-span-2 border-t pt-4 font-medium text-sm text-muted-foreground">Bank Details</div>
              <Field label="Bank Name"><Input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} /></Field>
              <Field label="IFSC Code"><Input value={form.ifsc} onChange={e => setForm({ ...form, ifsc: e.target.value })} /></Field>
              <div className="col-span-2"><Field label="Bank Account No."><Input value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })} /></Field></div>
            </div>
          </div>}
        </div>
        <DialogFooter className="mt-6 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {tab === "compliance" ? (
            <Button onClick={() => onSave(form)}>Save Employee</Button>
          ) : (
            <Button onClick={() => onSave({ ...form, status: "Draft" })}>Save Draft</Button>
          )}
        </DialogFooter>
      </DialogContent>
      {showEstimator && (
        <SalaryEstimatorModal 
          isOpen={showEstimator} 
          onClose={() => setShowEstimator(false)} 
          ctc={form.ctc || 0} 
        />
      )}
    </Dialog>
  );
}

function SalaryEstimatorModal({ isOpen, onClose, ctc }: { isOpen: boolean, onClose: () => void, ctc: number }) {
  const [includeEmployerPF, setIncludeEmployerPF] = useState(true);
  const [includeEmployeePF, setIncludeEmployeePF] = useState(true);
  const [includeGratuity, setIncludeGratuity] = useState(true);
  const [includePT, setIncludePT] = useState(true);
  
  // Custom deductions for Old Regime
  const [deduction80C, setDeduction80C] = useState(0);
  const [deduction80D, setDeduction80D] = useState(0);
  const [hraExemption, setHraExemption] = useState(0);

  const taxMath = useMemo(() => {
    let factor = 2.5;
    if (includeEmployerPF) factor += 0.12;
    if (includeGratuity) factor += 0.0481;
    
    const basic = Math.round(ctc / factor);
    const gross = Math.round(2.5 * basic);
    const hra = Math.round(0.4 * basic);
    const allowances = gross - basic - hra;
    
    const employerPF = includeEmployerPF ? Math.round(0.12 * basic) : 0;
    const gratuity = includeGratuity ? Math.round(0.0481 * basic) : 0;
    const employeePF = includeEmployeePF ? Math.round(0.12 * basic) : 0;
    const professionalTax = includePT ? 2500 : 0;

    // Old Regime Tax Math
    const standardDeductionOld = 50000;
    const oldTaxable = Math.max(0, gross - standardDeductionOld - employeePF - professionalTax - deduction80C - deduction80D - hraExemption);
    let oldTax = 0;
    if (oldTaxable > 250000) {
      if (oldTaxable <= 500000) oldTax = (oldTaxable - 250000) * 0.05;
      else if (oldTaxable <= 1000000) oldTax = 12500 + (oldTaxable - 500000) * 0.20;
      else oldTax = 112500 + (oldTaxable - 1000000) * 0.30;
    }
    // 87A Rebate for Old Regime (Income up to 5L)
    if (oldTaxable <= 500000) oldTax = 0;
    oldTax = Math.round(oldTax * 1.04); // 4% Health & Education Cess

    // New Regime Tax Math 2026-27
    const standardDeductionNew = 75000;
    const newTaxable = Math.max(0, gross - standardDeductionNew);
    let newTax = 0;
    const slabs = [
      { limit: 400000, rate: 0.0 },
      { limit: 800000, rate: 0.05 },
      { limit: 1200000, rate: 0.10 },
      { limit: 1600000, rate: 0.15 },
      { limit: 2000000, rate: 0.20 },
      { limit: 2400000, rate: 0.25 },
      { limit: 10000000, rate: 0.30 },
      { limit: Infinity, rate: 0.45 }
    ];
    let remainingNew = newTaxable;
    let prevLimit = 0;
    for (const slab of slabs) {
      if (remainingNew <= 0) break;
      const taxableInSlab = Math.min(remainingNew, slab.limit - prevLimit);
      newTax += taxableInSlab * slab.rate;
      remainingNew -= taxableInSlab;
      prevLimit = slab.limit;
    }
    // Rebate up to 12L for New Regime 2026-27 assumption
    if (newTaxable <= 1200000) newTax = 0;
    newTax = Math.round(newTax * 1.04);

    // In-Hand Calculations
    const monthlyGross = Math.round(gross / 12);
    const monthlyOldTax = Math.round(oldTax / 12);
    const monthlyNewTax = Math.round(newTax / 12);
    const monthlyEmpPF = Math.round(employeePF / 12);
    const monthlyPT = Math.round(professionalTax / 12);

    const monthlyInHandOld = monthlyGross - monthlyEmpPF - monthlyPT - monthlyOldTax;
    const monthlyInHandNew = monthlyGross - monthlyEmpPF - monthlyPT - monthlyNewTax;

    const recRegime = newTax <= oldTax ? "New Regime" : "Old Regime";
    const taxSavings = Math.abs(oldTax - newTax);

    return { basic, gross, hra, allowances, employerPF, gratuity, employeePF, professionalTax, standardDeductionOld, oldTax, standardDeductionNew, newTax, monthlyGross, monthlyOldTax, monthlyNewTax, monthlyEmpPF, monthlyPT, monthlyInHandOld, monthlyInHandNew, recRegime, taxSavings };
  }, [ctc, includeEmployerPF, includeEmployeePF, includeGratuity, includePT, deduction80C, deduction80D, hraExemption]);

  const { basic, gross, hra, allowances, employerPF, gratuity, employeePF, professionalTax, standardDeductionOld, oldTax, standardDeductionNew, newTax, monthlyGross, monthlyOldTax, monthlyNewTax, monthlyEmpPF, monthlyPT, monthlyInHandOld, monthlyInHandNew, recRegime, taxSavings } = taxMath;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" /> Salary Estimator (FY 2026-27)
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-6 mt-4">
          <div className="col-span-4 space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-sm border-b pb-2">Configuration</h3>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CTC</Label>
                <div className="font-mono text-lg font-bold">₹{ctc.toLocaleString()}</div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="epf" checked={includeEmployerPF} onCheckedChange={(c: boolean) => setIncludeEmployerPF(c)} />
                <Label htmlFor="epf" className="text-sm">Include Employer PF (12%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="emp_pf" checked={includeEmployeePF} onCheckedChange={(c: boolean) => setIncludeEmployeePF(c)} />
                <Label htmlFor="emp_pf" className="text-sm">Deduct Employee PF (12%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="grat" checked={includeGratuity} onCheckedChange={(c: boolean) => setIncludeGratuity(c)} />
                <Label htmlFor="grat" className="text-sm">Include Gratuity (4.81%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="pt" checked={includePT} onCheckedChange={(c: boolean) => setIncludePT(c)} />
                <Label htmlFor="pt" className="text-sm">Deduct Professional Tax</Label>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-100">
              <h3 className="font-semibold text-sm text-blue-800 border-b border-blue-200 pb-2">Old Regime Declarations</h3>
              <div className="space-y-1">
                <Label className="text-xs">Sec 80C (Max 1.5L)</Label>
                <Input type="number" className="h-8 text-sm" value={deduction80C} onChange={e => setDeduction80C(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sec 80D (Health Ins)</Label>
                <Input type="number" className="h-8 text-sm" value={deduction80D} onChange={e => setDeduction80D(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">HRA Exemption</Label>
                <Input type="number" className="h-8 text-sm" value={hraExemption} onChange={e => setHraExemption(+e.target.value)} />
              </div>
            </div>
          </div>

          <div className="col-span-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="text-sm font-semibold mb-3">Salary Breakup (Annual)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Basic</span><span>₹{basic.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>HRA</span><span>₹{hra.toLocaleString()}</span></div>
                  <div className="flex justify-between border-b pb-2"><span>Allowances</span><span>₹{allowances.toLocaleString()}</span></div>
                  <div className="flex justify-between font-semibold"><span>Gross</span><span>₹{gross.toLocaleString()}</span></div>
                  <div className="flex justify-between text-muted-foreground mt-2"><span>Employer PF</span><span>₹{employerPF.toLocaleString()}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Gratuity</span><span>₹{gratuity.toLocaleString()}</span></div>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="text-sm font-semibold mb-3">Tax Comparison</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-medium"><span>Standard Deduction</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Old: ₹{standardDeductionOld.toLocaleString()}</span><span>New: ₹{standardDeductionNew.toLocaleString()}</span></div>
                  
                  <div className="flex justify-between font-medium mt-3 border-t pt-2"><span>Annual Tax</span></div>
                  <div className="flex justify-between"><span>Old Regime</span><span className="font-semibold text-red-600">₹{oldTax.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>New Regime</span><span className="font-semibold text-red-600">₹{newTax.toLocaleString()}</span></div>
                  
                  <div className="mt-4 p-2 bg-green-50 text-green-800 rounded border border-green-200 text-xs text-center font-semibold">
                    Recommended: {recRegime} (Saves ₹{taxSavings.toLocaleString()}/yr)
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-sm font-semibold mb-4">Monthly In-Hand Salary</h3>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Gross</div>
                  <div className="text-xl font-bold">₹{monthlyGross.toLocaleString()}</div>
                </div>
                <div className={`p-3 rounded border-2 ${recRegime === 'Old Regime' ? 'border-green-500 bg-green-50' : 'border-transparent bg-gray-50'}`}>
                  <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Old Regime</div>
                  <div className="text-2xl font-bold text-green-700">₹{monthlyInHandOld.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Tax: ₹{monthlyOldTax.toLocaleString()} | PF/PT: ₹{(monthlyEmpPF + monthlyPT).toLocaleString()}</div>
                </div>
                <div className={`p-3 rounded border-2 ${recRegime === 'New Regime' ? 'border-green-500 bg-green-50' : 'border-transparent bg-gray-50'}`}>
                  <div className="text-xs text-muted-foreground uppercase font-bold mb-1">New Regime</div>
                  <div className="text-2xl font-bold text-green-700">₹{monthlyInHandNew.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Tax: ₹{monthlyNewTax.toLocaleString()} | PF/PT: ₹{(monthlyEmpPF + monthlyPT).toLocaleString()}</div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-4">
                * Note: This is an estimated calculation. The Old Regime estimate will improve significantly if eligible deductions (80C, 80D, HRA) are provided.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase font-semibold">{label}</Label>{children}</div>; }
