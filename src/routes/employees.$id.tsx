import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, Building2, Calendar, FileText, Landmark, MapPin, Phone, Upload, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtINR } from "@/lib/mock-data";
import { employeesApi, departmentsApi, designationsApi, branchesApi, entitiesApi, sitesApi, payrollApi } from "@/api";

export const Route = createFileRoute("/employees/$id")({
  component: EmployeeDetail,
  loader: async ({ params }) => {
    try {
      const [e, allEmps, depts, desgs, branches, sites, entities, structures] = await Promise.all([
        employeesApi.getById(params.id),
        employeesApi.getAll(),
        departmentsApi.getAll(),
        designationsApi.getAll(),
        branchesApi.getAll(),
        sitesApi.getAll(),
        entitiesApi.getAll(),
        payrollApi.getStructures()
      ]);
      return { e, allEmps, depts, desgs, branches, sites, entities, structures };
    } catch (err) {
      throw notFound();
    }
  },
  notFoundComponent: () => <div className="p-8 text-center"><p>Employee not found.</p><Link to="/employees" className="text-primary underline">Back to list</Link></div>,
});

function EmployeeDetail() {
  const { e, allEmps, depts, desgs, branches, sites, entities, structures } = Route.useLoaderData();
  const [tab, setTab] = useState("personal");
  const [ctc, setCtc] = useState(e.ctc || 0);
  const [structureId, setStructureId] = useState(e.salaryStructure ? String(e.salaryStructure) : "");
  const [taxRegime, setTaxRegime] = useState(e.taxRegime || "New");
  const [taxSavingDeductions, setTaxSavingDeductions] = useState(e.taxSavingDeductions || "0.00");
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePayroll = async () => {
    try {
      setIsSaving(true);
      await employeesApi.update(e.id, { ctc, salaryStructure: structureId || null, taxRegime, taxSavingDeductions: parseFloat(String(taxSavingDeductions || "0")).toFixed(2) });
      toast.success("Payroll details saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save payroll details");
    } finally {
      setIsSaving(false);
    }
  };

  const dept = depts.find(d => String(d.id) === String(e.department));
  const desg = desgs.find(d => String(d.id) === String(e.designation));
  const branch = branches.find(b => String(b.id) === String(e.branch));
  const site = sites.find(s => String(s.id) === String(e.site));
  const entity = entities.find(en => String(en.id) === String(e.entity));
  
  const manager = e.manager ? allEmps.find(x => String(x.id) === String(e.manager)) : null;
  const managerName = manager ? `${manager.firstName} ${manager.lastName}` : "—";

  return (
    <div className="space-y-6">
      <Link to="/employees" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5 mr-1" />Back to Employees</Link>

      <Card className="p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start gap-6">
          <Avatar className="h-20 w-20"><AvatarFallback className="text-2xl bg-primary/10 text-primary">{(e.firstName?.[0]||"")}{(e.lastName?.[0]||"")}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{e.firstName} {e.lastName}</h1>
              <Badge className={e.status === "Active" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>{e.status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{desg?.title} • {dept?.name} • {entity?.name}</p>
            <div className="flex flex-wrap gap-4 text-sm mt-3 text-muted-foreground">
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{e.phone}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{branch?.name}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joined {e.doj}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs uppercase text-muted-foreground">Annual CTC</div>
            <div className="text-2xl font-semibold text-primary">{fmtINR(e.ctc || 0)}</div>
            <div className="text-xs text-muted-foreground">Code: {e.code}</div>
          </div>
        </div>
      </Card>

      <div>
        <div className="flex overflow-x-auto border-b mb-6 no-scrollbar">
          <TabButton active={tab === "personal"} onClick={() => setTab("personal")} icon={<User className="h-3.5 w-3.5 mr-1" />} label="Personal" />
          <TabButton active={tab === "employment"} onClick={() => setTab("employment")} icon={<Briefcase className="h-3.5 w-3.5 mr-1" />} label="Employment" />
          <TabButton active={tab === "payroll"} onClick={() => setTab("payroll")} icon={<Landmark className="h-3.5 w-3.5 mr-1" />} label="Payroll & CTC" />
          <TabButton active={tab === "bank"} onClick={() => setTab("bank")} icon={<Landmark className="h-3.5 w-3.5 mr-1" />} label="Bank" />
          <TabButton active={tab === "statutory"} onClick={() => setTab("statutory")} icon={<FileText className="h-3.5 w-3.5 mr-1" />} label="Statutory" />
          <TabButton active={tab === "documents"} onClick={() => setTab("documents")} icon={<Upload className="h-3.5 w-3.5 mr-1" />} label="Documents" />
          <TabButton active={tab === "manager"} onClick={() => setTab("manager")} label="Manager" />
          <TabButton active={tab === "location"} onClick={() => setTab("location")} icon={<Building2 className="h-3.5 w-3.5 mr-1" />} label="Location" />
          <TabButton active={tab === "site"} onClick={() => setTab("site")} icon={<MapPin className="h-3.5 w-3.5 mr-1" />} label="Site" />
        </div>

        {tab === "personal" && (
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="First Name" value={e.firstName} />
            <FieldRO label="Last Name" value={e.lastName} />
            <FieldRO label="Email" value={e.email} />
            <FieldRO label="Phone" value={e.phone} />
            <FieldRO label="Date of Birth" value={e.dob || "—"} />
            <FieldRO label="Gender" value={e.gender} />
            <div className="sm:col-span-2"><FieldRO label="Address" value={e.address || "—"} /></div>
          </Card>
        )}
        
        {tab === "employment" && (
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="Employee Code" value={e.code} />
            <FieldRO label="Date of Joining" value={e.doj || "—"} />
            <FieldRO label="Entity" value={entity?.name ?? "—"} />
            <FieldRO label="Department" value={dept?.name ?? "—"} />
            <FieldRO label="Designation" value={desg?.title ?? "—"} />
            <FieldRO label="Grade" value={desg?.grade ?? "—"} />
            <FieldRO label="Reporting Manager" value={managerName} />
          </Card>
        )}
        
        {tab === "payroll" && (
          <Card className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Annual CTC (₹)</Label>
                <Input type="number" value={ctc} onChange={(ev) => setCtc(+ev.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Salary Structure</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={structureId} onChange={ev => setStructureId(ev.target.value)}>
                  <option value="">-- No Structure Assigned --</option>
                  {structures.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Tax Regime</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={taxRegime} onChange={ev => setTaxRegime(ev.target.value)}>
                  <option value="New">New Regime (FY 26-27)</option>
                  <option value="Old">Old Regime</option>
                </select>
              </div>
              {taxRegime === 'Old' && (
                <div className="space-y-1.5">
                  <Label>Tax Saving Deductions (₹)</Label>
                  <Input type="number" value={taxSavingDeductions} onChange={ev => setTaxSavingDeductions(ev.target.value)} />
                </div>
              )}
            </div>
            <Button onClick={handleSavePayroll} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Payroll Assignment"}
            </Button>
          </Card>
        )}
        
        {tab === "bank" && (
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="Bank" value={e.bankName || "—"} />
            <FieldRO label="Account Number" value={e.bankAccount || "—"} />
            <FieldRO label="IFSC" value={e.ifsc || "—"} />
          </Card>
        )}
        
        {tab === "statutory" && (
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="PAN" value={e.pan || "—"} />
            <FieldRO label="Aadhaar" value={e.aadhaar || "—"} />
            <FieldRO label="UAN (PF)" value={e.uan || "—"} />
            <FieldRO label="ESI Number" value={e.esi || "—"} />
          </Card>
        )}
        
        {tab === "documents" && (
          <Card className="p-6">
            <div className="grid sm:grid-cols-3 gap-3">
              {["Offer Letter","Aadhaar Card","PAN Card","Bank Passbook","Previous Form 16","Address Proof"].map(d => (
                <div key={d} className="p-4 rounded-md border flex items-center justify-between"><div><div className="text-sm font-medium">{d}</div><div className="text-xs text-muted-foreground">Uploaded</div></div><Button size="sm" variant="outline">View</Button></div>
              ))}
            </div>
            <Button className="mt-4"><Upload className="h-4 w-4 mr-1" />Upload Document</Button>
          </Card>
        )}
        
        {tab === "manager" && (
          <Card className="p-6 space-y-3">
            <FieldRO label="Reporting Manager" value={managerName} />
            <div className="space-y-1.5"><Label>Reassign Manager</Label><Input placeholder="Search by name or code…" /></div>
            <Button>Save Manager Assignment</Button>
          </Card>
        )}
        
        {tab === "location" && (
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="Entity" value={entity?.name ?? "—"} />
            <FieldRO label="Branch" value={branch?.name ?? "—"} />
            <FieldRO label="Branch City" value={`${branch?.city ?? ""}, ${branch?.state ?? ""}`} />
          </Card>
        )}
        
        {tab === "site" && (
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="Site" value={site?.name ?? "—"} />
            <FieldRO label="Address" value={site?.address ?? "—"} />
            <FieldRO label="Geo-fence" value={site ? `${site.radius}m radius` : "—"} />
            <FieldRO label="Coordinates" value={site ? `${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}` : "—"} />
            <FieldRO label="QR Enabled" value={site?.qrEnabled ? "Yes" : "No"} />
            <FieldRO label="Face Verification" value={site?.faceEnabled ? "Yes" : "No"} />
          </Card>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex items-center whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {icon}{label}
    </button>
  );
}

function FieldRO({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div><div className="text-sm font-medium mt-0.5">{value}</div></div>;
}
