import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, Building2, Calendar, FileText, Landmark, MapPin, Phone, Upload, User, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtINR } from "@/lib/mock-data";
import { employeesApi, departmentsApi, designationsApi, branchesApi, entitiesApi, sitesApi, payrollApi } from "@/api";

import React from "react";

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ margin: '2rem', padding: '2rem', backgroundColor: '#fee2e2', border: '5px solid #ef4444', color: '#7f1d1d', borderRadius: '8px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>CRITICAL UI CRASH</h1>
          <p style={{ fontSize: '1.25rem' }}>The page failed to load due to the following render error:</p>
          <pre style={{ backgroundColor: 'black', color: 'red', padding: '1rem', marginTop: '1rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <div style={{ marginTop: '2rem' }}>
            <Link to="/employees" style={{ textDecoration: 'underline', color: '#2563eb', fontWeight: 'bold' }}>
              Go back to Employee List
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function EmployeeDetailWrapped() {
  return <ErrorBoundary><EmployeeDetail /></ErrorBoundary>;
}

export const Route = createFileRoute("/employees/$id")({
  component: EmployeeDetailWrapped,
  loader: async ({ params }) => {
    const [e, allEmps, depts, desgs, branches, sites, entities, structures, documents] = await Promise.all([
      employeesApi.getById(params.id).catch(e => { throw new Error(`getById failed: ${e.message}`) }),
      employeesApi.getAll().catch(e => { throw new Error(`getAll failed: ${e.message}`) }),
      departmentsApi.getAll().catch(e => { throw new Error(`depts failed: ${e.message}`) }),
      designationsApi.getAll().catch(e => { throw new Error(`desgs failed: ${e.message}`) }),
      branchesApi.getAll().catch(e => { throw new Error(`branches failed: ${e.message}`) }),
      sitesApi.getAll().catch(e => { throw new Error(`sites failed: ${e.message}`) }),
      entitiesApi.getAll().catch(e => { throw new Error(`entities failed: ${e.message}`) }),
      payrollApi.getStructures().catch(e => { throw new Error(`structures failed: ${e.message}`) }),
      employeesApi.getDocuments(params.id).catch(() => [])
    ]);
    return { e, allEmps, depts, desgs, branches, sites, entities, structures, documents };
  },
  pendingComponent: () => <div className="p-12 text-center text-lg animate-pulse font-semibold">Loading employee data... Please wait.</div>,
  errorComponent: ({ error }: any) => (
    <div style={{ margin: '2rem', padding: '2rem', backgroundColor: '#fee2e2', border: '5px solid #ef4444', color: '#7f1d1d', borderRadius: '8px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>CRITICAL UI CRASH</h1>
      <p style={{ fontSize: '1.25rem' }}>The page failed to load due to the following error:</p>
      <pre style={{ backgroundColor: 'black', color: 'red', padding: '1rem', marginTop: '1rem', overflowX: 'auto' }}>
        {error?.message || String(error)}
      </pre>
      <div style={{ marginTop: '2rem' }}>
        <Link to="/employees" style={{ textDecoration: 'underline', color: '#2563eb', fontWeight: 'bold' }}>
          Go back to Employee List
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center"><p>Employee not found.</p><Link to="/employees" className="text-primary underline">Back to list</Link></div>,
});

function EmployeeDetail() {
  const { e: rawE, allEmps, depts, desgs, branches, sites, entities, structures, documents: initialDocs } = Route.useLoaderData();
  
  // Normalize snake_case to camelCase in case the backend renderer missed it
  const e = {
    ...rawE,
    firstName: rawE.firstName || (rawE as any).first_name,
    lastName: rawE.lastName || (rawE as any).last_name,
    salaryStructure: rawE.salaryStructure || (rawE as any).salary_structure,
    taxRegime: rawE.taxRegime || (rawE as any).tax_regime,
    taxSavingDeductions: rawE.taxSavingDeductions || (rawE as any).tax_saving_deductions,
    bankName: rawE.bankName || (rawE as any).bank_name,
    bankAccount: rawE.bankAccount || (rawE as any).bank_account,
  };

  const [tab, setTab] = useState("personal");
  const [ctc, setCtc] = useState(e.ctc || 0);
  const [structureId, setStructureId] = useState(e.salaryStructure ? String(e.salaryStructure) : "");
  const [taxRegime, setTaxRegime] = useState(e.taxRegime || "New");
  const [taxSavingDeductions, setTaxSavingDeductions] = useState(e.taxSavingDeductions || "0.00");
  const [isSaving, setIsSaving] = useState(false);
  const [docs, setDocs] = useState<any[]>(Array.isArray(initialDocs) ? initialDocs : ((initialDocs as any)?.results || []));

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

  const deptsArray = Array.isArray(depts) ? depts : ((depts as any)?.results || []);
  const desgsArray = Array.isArray(desgs) ? desgs : ((desgs as any)?.results || []);
  const branchesArray = Array.isArray(branches) ? branches : ((branches as any)?.results || []);
  const sitesArray = Array.isArray(sites) ? sites : ((sites as any)?.results || []);
  const entitiesArray = Array.isArray(entities) ? entities : ((entities as any)?.results || []);
  const allEmpsArray = Array.isArray(allEmps) ? allEmps : ((allEmps as any)?.results || []);
  const structuresArray = Array.isArray(structures) ? structures : ((structures as any)?.results || []);

  const dept = deptsArray.find((d: any) => String(d.id) === String(e.department));
  const desg = desgsArray.find((d: any) => String(d.id) === String(e.designation));
  const branch = branchesArray.find((b: any) => String(b.id) === String(e.branch));
  const site = sitesArray.find((s: any) => String(s.id) === String(e.site));
  const entity = entitiesArray.find((en: any) => String(en.id) === String(e.entity));
  
  const manager = e.manager ? allEmpsArray.find((x: any) => String(x.id) === String(e.manager)) : null;
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
                  {structuresArray.map((s: any) => (
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
              {docs.map(d => (
                <div key={d.id} className="p-4 rounded-md border flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-sm font-medium truncate">{d.documentType || d.document_type}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.name}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" asChild>
                      <a href={d.file} target="_blank" rel="noopener noreferrer">View</a>
                    </Button>
                    <Button size="sm" variant="destructive" onClick={async () => {
                      if (confirm("Are you sure you want to delete this document?")) {
                        try {
                          await employeesApi.deleteDocument(d.id);
                          setDocs(docs.filter(doc => doc.id !== d.id));
                          toast.success("Document deleted");
                        } catch (e: any) {
                          toast.error(e.message || "Failed to delete document");
                        }
                      }
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {docs.length === 0 && <div className="text-muted-foreground text-sm col-span-3">No documents uploaded for this employee.</div>}
            </div>
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
            <FieldRO label="Geo-fence" value={site ? `${site.radius || 0}m radius` : "—"} />
            <FieldRO label="Coordinates" value={site && site.latitude != null && site.longitude != null ? `${Number(site.latitude).toFixed(4)}, ${Number(site.longitude).toFixed(4)}` : "—"} />
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
