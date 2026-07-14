import { createFileRoute, useRouter, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2, UserPlus, Calculator, Send, CheckCircle, MailPlus, Upload, Download, Check, ChevronsUpDown, X } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { employeesApi, departmentsApi, designationsApi, branchesApi, entitiesApi, sitesApi, payrollApi, offersApi, offerTemplatesApi } from "@/api";
import type { Employee, Department, Designation, Branch, Entity, Site } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/employees")({
  validateSearch: (search: Record<string, unknown>): { edit?: string; tab?: string } => {
    return {
      edit: search.edit as string | undefined,
      tab: search.tab as string | undefined,
    };
  },
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
  const matchRoute = useMatchRoute();

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
  const downloadSampleTemplate = () => {
    const headers = "First Name,Last Name,Email,Phone,Date of Birth,Gender,Address,Employee Code,Date of Joining,Entity,Branch,Site,Department,Designation,Reporting Manager,Status,PAN,Aadhaar,UAN,ESI No.,Bank Name,IFSC Code,Bank Account No.\n";
    const sampleRow = "John,Doe,john.doe@example.com,\t9876543210,01-01-1990,Male,123 Tech Park,EMP1001,01-01-2024,Main Entity,HQ,Site A,Engineering,Software Engineer,None,Active,ABCDE1234F,\t123456789012,\t100000000000,\tESI1234,HDFC Bank,HDFC0001234,\t12345678901234\n";
    const blob = new Blob(["\uFEFF" + headers + sampleRow], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Employee_Bulk_Import_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const searchParams = Route.useSearch();

  useEffect(() => { setRows(initial); }, [initial]);

  useEffect(() => {
    const editId = searchParams.edit;
    if (editId && initial.length > 0) {
      const emp = initial.find(e => String(e.id) === String(editId));
      if (emp) {
        setEditing(emp);
        setOpen(true);
      }
    }
  }, [initial, searchParams.edit]);
  const save = async (e: Employee, pendingDocs?: {file: File, type: string}[]) => {
    try {
      const cleanData: any = { ...e };
      
      if (!cleanData.firstName || !cleanData.lastName || !cleanData.email) {
        toast.error("First Name, Last Name, and Email are required.");
        return;
      }
      
      if (!cleanData.dob) cleanData.dob = null;
      if (!cleanData.doj) cleanData.doj = null;
      if (!cleanData.manager || cleanData.manager === " ") cleanData.manager = null;
      if (!cleanData.entity) cleanData.entity = null;
      if (!cleanData.branch) cleanData.branch = null;
      if (!cleanData.site) cleanData.site = null;
      if (!cleanData.department) cleanData.department = null;
      if (!cleanData.designation) cleanData.designation = null;
      if (!cleanData.salaryStructure || cleanData.salaryStructure === " ") cleanData.salaryStructure = null;

      let empId = e.id;
      if (editing && e.id) {
        await employeesApi.update(e.id, cleanData);
        toast.success("Employee updated");
      } else {
        const { id, ...data } = cleanData;
        const result = await employeesApi.create(data);
        empId = result.id;
        toast.success("Employee created and added to Pending Offers!");
      }
      
      if (pendingDocs && pendingDocs.length > 0 && empId) {
        toast.info("Uploading documents...");
        let allSuccess = true;
        for (const doc of pendingDocs) {
          try {
            await employeesApi.uploadDocument(empId, doc.file, doc.type);
          } catch (err: any) {
            allSuccess = false;
            toast.error(`Failed to upload ${doc.file.name}: ${err.message}`);
          }
        }
        if (allSuccess) {
          toast.success("Documents uploaded successfully!");
        }
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

  const isExact = matchRoute({ to: '/employees', fuzzy: false });
  if (!isExact) {
    return <Outlet />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
      <PageHeader 
        title="Employees" 
        description="Complete employee directory across all entities" 
        actions={
          <div className="flex gap-2 pointer-events-auto">
            <Button onClick={downloadSampleTemplate} variant="outline" className="bg-white"><Download className="h-4 w-4 mr-1" />Download Template</Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline"><UserPlus className="h-4 w-4 mr-1" />Bulk Import</Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }}><UserPlus className="h-4 w-4 mr-1" />Onboard Employee</Button>
          </div>
        } 
      />
      
      <div className="mb-4 flex space-x-2 border-b">
        <button className={`px-4 py-2 text-sm font-medium ${activeTab === "directory" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setActiveTab("directory")}>Directory</button>
      </div>

      {activeTab === "directory" && (
        <DataTable
          key="emp-table" tableId="employees-directory"
          rows={rows} rowKey={r => r.id} searchKeys={["firstName","lastName","email","code","phone"]}
          filters={[
            { label: "Entity", key: "entity", options: entities.map((e: any) => ({ value: e.id, label: e.code })), predicate: (r: any, v: any) => String(r.entity) === String(v) },
            { label: "Department", key: "department", options: departments.map((d: any) => ({ value: d.id, label: d.name })), predicate: (r: any, v: any) => String(r.department) === String(v) },
            { label: "Status", key: "status", options: ["Active","On Leave","Inactive","Draft"].map(s => ({ value: s, label: s })), predicate: (r: any, v: any) => r.status === v },
          ]}
          onCreate={() => { setEditing(null); setOpen(true); }} createLabel="Onboard Employee" filename="employees.csv"
          columns={[
            { key: "emp", header: "Employee", noExport: true, accessor: (r: any) => `${r.firstName || r.first_name || ""} ${r.lastName || r.last_name || ""}`, sortable: true, render: (r: any) => {
              const fName = r.firstName || r.first_name || "";
              const lName = r.lastName || r.last_name || "";
              return (
              <Link to="/employees/$id" params={{ id: String(r.id) }} className="flex items-center gap-3 group">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{(fName?.[0]||"")}{(lName?.[0]||"")}</AvatarFallback></Avatar>
                <div className="min-w-0"><div className="font-medium group-hover:text-primary truncate">{fName} {lName}</div><div className="text-xs text-muted-foreground truncate">{r.code} • {r.email}</div></div>
              </Link>
            )}},
            { key: "fn", header: "First Name", accessor: (r: any) => r.firstName || r.first_name || "—", defaultHidden: true },
            { key: "ln", header: "Last Name", accessor: (r: any) => r.lastName || r.last_name || "—", defaultHidden: true },
            { key: "email", header: "Email", accessor: (r: any) => r.email ?? "—", defaultHidden: true },
            { key: "phone", header: "Phone", accessor: (r: any) => r.phone ?? "—", defaultHidden: true },
            { key: "dob", header: "Date of Birth", accessor: (r: any) => r.dob ? r.dob.split('-').reverse().join('-') : "—", defaultHidden: true },
            { key: "gender", header: "Gender", accessor: (r: any) => r.gender ?? "—", defaultHidden: true },
            { key: "address", header: "Address", accessor: (r: any) => r.address ?? "—", defaultHidden: true },
            { key: "code", header: "Employee Code", accessor: (r: any) => r.code ?? "—", defaultHidden: true },
            { key: "doj", header: "Date of Joining", accessor: (r: any) => r.doj ? r.doj.split('-').reverse().join('-') : "—", sortable: true },
            { key: "entity", header: "Entity", accessor: (r: any) => entities.find((e: any) => String(e.id) === String(r.entity))?.name ?? "—", defaultHidden: true },
            { key: "branch", header: "Branch", accessor: (r: any) => branches.find((b: any) => String(b.id) === String(r.branch))?.name ?? "—", render: (r: any) => branches.find((b: any) => String(b.id) === String(r.branch))?.name ?? "—" },
            { key: "site", header: "Site", accessor: (r: any) => sites.find((s: any) => String(s.id) === String(r.site))?.name ?? "—", defaultHidden: true },
            { key: "dept", header: "Department", accessor: (r: any) => departments.find((d: any) => String(d.id) === String(r.department))?.name ?? "—", render: (r: any) => departments.find((d: any) => String(d.id) === String(r.department))?.name ?? "—" },
            { key: "desg", header: "Designation", accessor: (r: any) => designations.find((d: any) => String(d.id) === String(r.designation))?.title ?? "—", render: (r: any) => designations.find((d: any) => String(d.id) === String(r.designation))?.title ?? "—" },
            { key: "manager", header: "Reporting Manager", accessor: (r: any) => { const m = rows.find((e: any) => String(e.id) === String(r.manager)) as any; return m ? `${m.firstName || m.first_name || ""} ${m.lastName || m.last_name || ""}`.trim() : "—"; }, defaultHidden: true },
            { key: "status", header: "Status", accessor: (r: any) => r.status ?? "—", render: (r: any) => <Badge className={r.status === "Active" ? "bg-success text-success-foreground" : r.status === "On Leave" ? "bg-warning text-warning-foreground" : r.status === "Draft" ? "bg-secondary text-secondary-foreground" : ""}>{r.status}</Badge> },
            { key: "pan", header: "PAN", accessor: (r: any) => r.pan ?? "—", defaultHidden: true },
            { key: "aadhaar", header: "Aadhaar", accessor: (r: any) => r.aadhaar ?? "—", defaultHidden: true },
            { key: "uan", header: "UAN", accessor: (r: any) => r.uan ?? "—", defaultHidden: true },
            { key: "esi", header: "ESI No.", accessor: (r: any) => r.esi ?? "—", defaultHidden: true },
            { key: "bankName", header: "Bank Name", accessor: (r: any) => r.bankName ?? "—", defaultHidden: true },
            { key: "ifscCode", header: "IFSC Code", accessor: (r: any) => (r.ifsc || r.ifscCode) ?? "—", defaultHidden: true },
            { key: "bankAccount", header: "Bank Account No.", accessor: (r: any) => r.bankAccount ?? "—", defaultHidden: true },
          ]}
          actions={(r: any) => <div className="flex justify-end gap-1">
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
    </div>
  );
}

function EmployeeDialog({ open, onOpenChange, employee, onSave, departments, designations, branches, entities, sites, employees, structures }: any) {
  const defaultForm = { id: "", code: "", firstName: "", lastName: "", email: "", phone: "", entity: "",  employeeType: "Normal Employee",
  branch: null, site: null, department: null, designation: null, role: 'employee',
  manager: null, status: "Active", ctc: 0, salaryStructure: null, uan: "", esi: "", bankName: "", bankAccount: "", ifsc: "", address: "", dob: "", doj: "", gender: "Male", taxRegime: "New", taxSavingDeductions: 0 };
  const [form, setForm] = useState<any>(employee ?? defaultForm as any);
  const [tab, setTab] = useState("personal");
  const [showEstimator, setShowEstimator] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<{file: File, type: string}[]>([]);
  const [uploadDocType, setUploadDocType] = useState("Offer Letter");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const canAddCTC = user?.role === 'super_admin' || user?.permissions?.can_add_ctc === true;

  const searchParams = Route.useSearch();

  useEffect(() => {
    const tabParam = searchParams.tab;
    if (tabParam === 'compensation' && canAddCTC) {
      setTab('compensation');
    }
  }, [searchParams.tab, canAddCTC]);

  useEffect(() => {
    if (open) {
      setForm(employee ?? defaultForm as any);
      setPendingDocs([]);
      if (searchParams.tab === 'compensation' && canAddCTC) {
        setTab("compensation");
      } else {
        setTab("personal");
      }
    }
  }, [open, employee, canAddCTC, searchParams.tab]);

  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && employee) setForm(employee); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{employee ? "Edit" : "Onboard"} Employee</DialogTitle></DialogHeader>
        <div className="mt-4">
          <div className="flex border-b mb-4">
            <button className={`px-4 py-2 text-sm font-medium ${tab === "personal" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setTab("personal")}>Personal</button>
            <button className={`px-4 py-2 text-sm font-medium ${tab === "employment" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setTab("employment")}>Employment</button>
            {canAddCTC && <button className={`px-4 py-2 text-sm font-medium ${tab === "compensation" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setTab("compensation")}>Compensation</button>}
            <button className={`px-4 py-2 text-sm font-medium ${tab === "compliance" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setTab("compliance")}>Compliance & Bank</button>
            <button className={`px-4 py-2 text-sm font-medium ${tab === "documents" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setTab("documents")}>Documents</button>
          </div>

          {tab === "personal" && <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name"><Input value={form.firstName || ""} onChange={e => setForm({ ...form, firstName: e.target.value })} /></Field>
              <Field label="Last Name"><Input value={form.lastName || ""} onChange={e => setForm({ ...form, lastName: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Date of Birth"><Input type="date" value={form.dob || ""} onChange={e => setForm({ ...form, dob: e.target.value })} /></Field>
              <Field label="Gender">
                <Select value={form.gender || "Male"} onValueChange={v => setForm({ ...form, gender: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </Field>
              <div className="col-span-2"><Field label="Address"><Input value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} /></Field></div>
            </div>
          </div>}

          {tab === "employment" && <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee Code"><Input value={form.code || ""} onChange={e => setForm({ ...form, code: e.target.value })} /></Field>
              <Field label="Date of Joining"><Input type="date" value={form.doj || ""} onChange={e => setForm({ ...form, doj: e.target.value })} /></Field>
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
              <Field label="Enrolled Sites">
                <Popover>
                  <PopoverTrigger asChild>
                    <button role="combobox" className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border-2 border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${!form.enrolled_sites?.length ? "text-muted-foreground" : ""}`}>
                      {form.enrolled_sites?.length > 0 
                        ? <span className="text-foreground font-medium">{form.enrolled_sites.length} site(s) selected</span> 
                        : "Select sites..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 border-2 border-slate-200 dark:border-slate-700 shadow-md" align="start">
                    <Command>
                      <CommandInput placeholder="Search sites..." />
                      <CommandEmpty>No sites found for this entity.</CommandEmpty>
                      <CommandGroup>
                        <div className="max-h-[200px] overflow-y-auto">
                          {(sites || [])
                            .filter((s: Site) => {
                              if (!form.entity) return true;
                              const siteBranch = (branches || []).find((b: Branch) => String(b.id) === String(s.branch));
                              return siteBranch && String(siteBranch.entity) === String(form.entity);
                            })
                            .map((s: Site) => (
                              <CommandItem
                                key={s.id}
                                value={s.name}
                                className="cursor-pointer font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                                onSelect={() => {
                                  const current = form.enrolled_sites || [];
                                  if (current.includes(s.id)) {
                                    setForm({ ...form, enrolled_sites: current.filter((id: any) => String(id) !== String(s.id)) });
                                  } else {
                                    setForm({ ...form, enrolled_sites: [...current, s.id] });
                                  }
                                }}
                              >
                                <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${form.enrolled_sites?.includes(s.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"}`}>
                                  <Check className="h-3 w-3 font-bold stroke-[3]" />
                                </div>
                                {s.name}
                              </CommandItem>
                            ))}
                        </div>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                  <SelectContent><SelectItem value=" ">None</SelectItem>{(employees || []).filter((e: Employee) => !form.entity || String(e?.entity) === String(form.entity)).map((e: Employee, idx: number) => <SelectItem key={e?.id || `emp-${idx}`} value={String(e?.id)}>{e?.firstName} {e?.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="Draft">Draft</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
          </div>}

          {tab === "compensation" && <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
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
                <div className="col-span-2 flex gap-8 mb-2">
                  <Field label="PF Applicable">
                    <div className="flex items-center h-10">
                      <Checkbox id="pfApplicable" checked={form.pfApplicable || false} onCheckedChange={(c: boolean) => setForm({ ...form, pfApplicable: c === true })} />
                      <label htmlFor="pfApplicable" className="ml-2 text-sm font-medium leading-none">Deduct Provident Fund</label>
                    </div>
                  </Field>
                  <Field label="Bonus Applicable">
                    <div className="flex items-center h-10">
                      <Checkbox id="bonusApplicable" checked={form.bonusApplicable || false} onCheckedChange={(c: boolean) => setForm({ ...form, bonusApplicable: c === true, bonusType: c ? 'Fixed Amount' : undefined, bonusValue: c ? 0 : undefined })} />
                      <label htmlFor="bonusApplicable" className="ml-2 text-sm font-medium leading-none">Employee receives variable bonus</label>
                    </div>
                  </Field>
                </div>
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
              <Field label="PAN"><Input value={form.pan || ""} onChange={e => setForm({ ...form, pan: e.target.value })} /></Field>
              <Field label="Aadhaar"><Input value={form.aadhaar || ""} onChange={e => setForm({ ...form, aadhaar: e.target.value })} /></Field>
              <Field label="UAN"><Input value={form.uan || ""} onChange={e => setForm({ ...form, uan: e.target.value })} /></Field>
              <Field label="ESI No."><Input value={form.esi || ""} onChange={e => setForm({ ...form, esi: e.target.value })} /></Field>
              <div className="col-span-2 border-t pt-4 font-medium text-sm text-muted-foreground">Bank Details</div>
              <Field label="Bank Name"><Input value={form.bankName || ""} onChange={e => setForm({ ...form, bankName: e.target.value })} /></Field>
              <Field label="IFSC Code"><Input value={form.ifsc || ""} onChange={e => setForm({ ...form, ifsc: e.target.value })} /></Field>
              <div className="col-span-2"><Field label="Bank Account No."><Input value={form.bankAccount || ""} onChange={e => setForm({ ...form, bankAccount: e.target.value })} /></Field></div>
            </div>
          </div>}

          {tab === "documents" && <div className="space-y-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select value={uploadDocType} onValueChange={setUploadDocType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {["Offer Letter","Aadhaar Card","PAN Card","Bank Passbook","Previous Form 16","Address Proof", "Other"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPendingDocs(prev => [...prev, { file, type: uploadDocType }]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }
                }} />
                <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline">
                  <Upload className="h-4 w-4 mr-2" /> Select File
                </Button>
              </div>
            </div>
            
            {pendingDocs.length > 0 && (
              <div className="mt-6">
                <Label className="mb-2 block">Files to Upload</Label>
                <div className="space-y-2">
                  {pendingDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="text-sm font-medium">{doc.type}</div>
                        <div className="text-xs text-muted-foreground">{doc.file.name}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setPendingDocs(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>}
        </div>
        <DialogFooter className="mt-6 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {tab === "compliance" || tab === "documents" ? (
            <Button onClick={() => onSave(form, pendingDocs)}>Save Employee</Button>
          ) : (
            <Button onClick={() => onSave({ ...form, status: "Draft" }, pendingDocs)}>Save Draft</Button>
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
          <div className="col-span-4 space-y-4 border-r pr-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Components Included in CTC</h3>
              <div className="flex items-center gap-2"><Checkbox id="epf" checked={includeEmployerPF} onCheckedChange={(c) => setIncludeEmployerPF(!!c)} /><label htmlFor="epf" className="text-sm">Employer PF (12% of Basic)</label></div>
              <div className="flex items-center gap-2"><Checkbox id="egrat" checked={includeGratuity} onCheckedChange={(c) => setIncludeGratuity(!!c)} /><label htmlFor="egrat" className="text-sm">Gratuity (4.81% of Basic)</label></div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <h3 className="font-semibold text-sm">Deductions & Tax (Old Regime)</h3>
              <div className="flex items-center gap-2"><Checkbox id="mpf" checked={includeEmployeePF} onCheckedChange={(c) => setIncludeEmployeePF(!!c)} /><label htmlFor="mpf" className="text-sm">Employee PF (12% of Basic)</label></div>
              <div className="flex items-center gap-2"><Checkbox id="pt" checked={includePT} onCheckedChange={(c) => setIncludePT(!!c)} /><label htmlFor="pt" className="text-sm">Professional Tax</label></div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">80C Investments (Max 1.5L)</label>
                <Input type="number" className="h-8" value={deduction80C || ''} onChange={e => setDeduction80C(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">80D Health Insurance (Max 25k-50k)</label>
                <Input type="number" className="h-8" value={deduction80D || ''} onChange={e => setDeduction80D(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">HRA Exemption</label>
                <Input type="number" className="h-8" value={hraExemption || ''} onChange={e => setHraExemption(+e.target.value)} />
              </div>
            </div>
          </div>

          <div className="col-span-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Old Regime (Monthly In-Hand)</div>
                <div className={`text-2xl font-bold ${recRegime === 'Old Regime' ? 'text-success' : ''}`}>₹{monthlyInHandOld.toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground mt-1">Tax: ₹{oldTax.toLocaleString('en-IN')}/yr</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">New Regime (Monthly In-Hand)</div>
                <div className={`text-2xl font-bold ${recRegime === 'New Regime' ? 'text-success' : ''}`}>₹{monthlyInHandNew.toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground mt-1">Tax: ₹{newTax.toLocaleString('en-IN')}/yr</div>
              </div>
            </div>

            {taxSavings > 0 && (
              <div className="mb-6 p-3 bg-primary/10 text-primary rounded-md flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="text-sm">
                  We recommend the <strong>{recRegime}</strong> for this employee, which saves <strong>₹{taxSavings.toLocaleString('en-IN')}</strong> in taxes annually compared to the alternative.
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Monthly Breakdown (Based on {recRegime})</h3>
              
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground mb-2">Earnings</div>
                  <div className="flex justify-between py-1"><span>Basic Salary</span><span>₹{Math.round(basic/12).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between py-1"><span>HRA</span><span>₹{Math.round(hra/12).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between py-1"><span>Special Allowance</span><span>₹{Math.round(allowances/12).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between py-1 font-semibold border-t mt-1 pt-1"><span>Gross Salary</span><span>₹{monthlyGross.toLocaleString('en-IN')}</span></div>
                </div>
                
                <div>
                  <div className="font-medium text-muted-foreground mb-2">Deductions</div>
                  {includeEmployeePF && <div className="flex justify-between py-1"><span>Employee PF</span><span>₹{monthlyEmpPF.toLocaleString('en-IN')}</span></div>}
                  {includePT && <div className="flex justify-between py-1"><span>Professional Tax</span><span>₹{monthlyPT.toLocaleString('en-IN')}</span></div>}
                  <div className="flex justify-between py-1"><span>Income Tax (TDS)</span><span>₹{(recRegime === 'New Regime' ? monthlyNewTax : monthlyOldTax).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between py-1 font-semibold border-t mt-1 pt-1"><span>Total Deductions</span><span>₹{(monthlyEmpPF + monthlyPT + (recRegime === 'New Regime' ? monthlyNewTax : monthlyOldTax)).toLocaleString('en-IN')}</span></div>
                </div>
              </div>
              
              <div className="flex justify-between p-3 bg-muted rounded-md font-bold mt-2">
                <span>Net Take-Home Pay</span>
                <span>₹{(recRegime === 'New Regime' ? monthlyInHandNew : monthlyInHandOld).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
