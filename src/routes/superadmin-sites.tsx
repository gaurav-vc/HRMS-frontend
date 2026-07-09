import { createFileRoute, useRouter, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2, Plus, Search, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { sitesApi, organizationsApi } from "@/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/superadmin-sites")({
  validateSearch: z.object({
    orgId: z.string().optional(),
    action: z.string().optional(),
  }),
  component: SitesPage,
  loader: async () => {
    try {
      const [sites, orgs] = await Promise.all([
        sitesApi.getAll(),
        organizationsApi.getAll(),
      ]);
      return { 
        sites: (sites as any)?.results || sites || [], 
        organizations: (orgs as any)?.results || orgs || [] 
      };
    } catch {
      return { sites: [], organizations: [] };
    }
  }
});

const MODULES = [
  { group: "Overview", items: ["Dashboard"] },
  { group: "Organisation", items: ["Entities", "Branches", "Sites", "Departments", "Designations"] },
  { group: "People", items: ["Employees", "My Calendar", "Offer Letters", "Offer Templates"] },
  { group: "Attendance", items: ["Attendance", "Shift Definitions", "Weekly Roster", "QR Check-in", "Face Verification", "GPS Capture", "Regularization"] },
  { group: "Leave", items: ["Leave Requests", "Inbox"] },
  { group: "Holiday Planner", items: ["Holiday Planner", "Calendar"] },
  { group: "Payroll", items: ["Payroll Overview", "Salary Structure", "Run Payroll", "Salary Slips", "Compliance", "Loans & Advances", "Reimbursements"] },
  { group: "FORM 16", items: ["Form 16 Management", "My Form 16"] },
  { group: "Insights", items: ["Organization Tree", "Reports"] },
  { group: "Settings", items: ["Settings"] }
];

function SitesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const search = Route.useSearch();
  const { sites: initial, organizations } = Route.useLoaderData();
  const [rows, setRows] = useState<any[]>(initial || []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [searchTerm, setSearchTerm] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState("all");

  useEffect(() => { setRows(initial || []); }, [initial]);

  const loadSites = async () => {
    try {
      const data = await sitesApi.getAll();
      setRows(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle URL search params for auto-opening modal
  useEffect(() => {
    if (search.action === 'add' && search.orgId) {
      setEditing({ organization: Number(search.orgId) });
      setMode("create");
      setOpen(true);
    }
  }, [search.action, search.orgId]);

  const filteredRows = rows.filter(r => {
    // Remove the specific lingering sites as requested
    if (["Bengaluru HQ", "Mumbai HQ", "HQ"].includes(r.name)) return false;

    if (search.orgId && r.organization !== Number(search.orgId)) return false;

    const matchesSearch = (r.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (r.address || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProduct = productTypeFilter === "all" || r.productType === productTypeFilter;
    return matchesSearch && matchesProduct;
  });

  const save = async (s: any) => {
    try {
      // Clean up empty strings for optional fields that DRF expects to be null
      const payload = { ...s };
      if (payload.activateDate === "") payload.activateDate = null;
      if (payload.organization === "") payload.organization = null;
      if (payload.branch === "") payload.branch = null;

      if (editing && payload.id) {
        await sitesApi.update(payload.id, payload);
        toast.success("Site updated");
      } else {
        const { id, ...data } = payload;
        await sitesApi.create(data);
        toast.success("Site created");
      }
      setOpen(false); setEditing(null);
      await loadSites();
      router.invalidate();
    } catch (err: any) {
      toast.error(`Error saving site: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await sitesApi.delete(id);
      toast.success("Site removed");
      await loadSites();
      router.invalidate();
    } catch (err) {
      toast.error("Failed to delete site");
    }
  };

  if (user?.username !== "Vibe_admin") {
    return <Navigate to="/" />;
  }

  if (open) {
    return (
      <div className="p-6">
        <SiteDialog 
          open={open} 
          onOpenChange={setOpen} 
          site={editing} 
          onSave={save} 
          organizations={organizations} 
          mode={mode} 
          lockedOrg={search.action === 'add' && search.orgId ? search.orgId : undefined}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#f9fafb] min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Sites</h1>
          <p className="text-[15px] text-slate-500 mt-1">Geofenced work locations and branch configuration</p>
        </div>
        <Button className="bg-[#1a4cd2] hover:bg-[#1641b4] text-white shadow-sm" onClick={() => { setEditing(null); setMode("create"); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Site / Project
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <h3 className="font-medium text-sm text-slate-700">Filters</h3>
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search site..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Product Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="Vibecopilot">Vibecopilot</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setSearchTerm(""); setProductTypeFilter("all"); }}>
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <DataTable
          rows={filteredRows}
          rowKey={(r: any) => r.id}
          columns={[
            { 
              key: "name", 
              header: "Site Name", 
              render: (r: any) => <span className="font-medium">{r.name}</span> 
            },
            { 
              key: "location", 
              header: "Location", 
              render: (r: any) => <span className="text-muted-foreground">{r.address || r.city || "—"}</span> 
            },
            { 
              key: "productType", 
              header: "Product Type", 
              render: (r: any) => (
                r.productType ? <Badge variant="secondary" className="bg-slate-100 text-slate-700">{r.productType}</Badge> : <span>—</span>
              )
            },
            { 
              key: "contact", 
              header: "Contact", 
              render: (r: any) => <span>{r.contactName || "—"}</span> 
            },
            { 
              key: "status", 
              header: "Status", 
              render: (r: any) => (
                <Badge variant="outline" className={r.status === 'Active' ? 'text-green-600 border-green-200 bg-green-50' : 'text-slate-600 border-slate-200 bg-slate-50'}>
                  {r.status?.toUpperCase() || 'ACTIVE'}
                </Badge>
              )
            },
          ]}
          actions={(r: any) => (
            <div className="flex gap-2 justify-end">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("view"); setOpen(true); }}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("edit"); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDelete(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function SiteDialog({ open, onOpenChange, site, onSave, organizations, mode, lockedOrg }: any) {
  const defaultForm = { 
    name: "", siteCode: "", organization: lockedOrg || "", productType: "", country: "", 
    address: "", activateDate: "", status: "Active",
    contactName: "", contactPhone: "", contactEmail: "",
    modules: [] 
  };
  
  const [form, setForm] = useState<any>(defaultForm);

  useEffect(() => {
    if (open) {
      setForm(site || defaultForm);
    }
  }, [open, site]);

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleToggleModule = (modName: string, checked: boolean) => {
    let mods = form.modules || [];
    if (checked && !mods.includes(modName)) mods = [...mods, modName];
    else if (!checked) mods = mods.filter((m: string) => m !== modName);
    setForm({ ...form, modules: mods });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allMods = MODULES.flatMap(g => g.items);
      setForm({ ...form, modules: allMods });
    } else {
      setForm({ ...form, modules: [] });
    }
  };

  const fillDummy = () => {
    setForm({
      name: "Global HQ Site", siteCode: "GHQ-100", organization: lockedOrg || "", 
      productType: "Vibecopilot", country: "United States", 
      address: "123 Tech Lane, Silicon Valley, CA", activateDate: "2026-08-01", status: "Active",
      contactName: "Jane Smith", contactPhone: "+1 (555) 987-6543", contactEmail: "jane.smith@example.com",
      modules: MODULES.flatMap(g => g.items)
    });
  };

  if (!open) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
      <div className="p-6 pb-4 border-b flex items-center justify-between gap-4 bg-slate-50/50 rounded-t-xl">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            &larr; Back
          </Button>
          <h2 className="text-xl font-bold text-slate-800">
            {mode === 'create' ? 'Add New Site' : mode === 'edit' ? 'Edit Site' : 'View Site'}
          </h2>
        </div>
        {mode === 'create' && (
          <Button variant="secondary" size="sm" onClick={fillDummy} className="ml-auto bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
            Fill Dummy Data
          </Button>
        )}
      </div>
      
      <div className="p-6 space-y-8 flex-1 bg-slate-50/50">
          
          <section className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
            <h3 className="font-semibold text-lg text-slate-800">Site Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Site Name *</Label>
                <Input name="name" value={form.name || ""} onChange={handleChange} readOnly={mode === 'view'} placeholder="e.g. Corporate HQ" />
              </div>
              <div className="space-y-2">
                <Label>Site Code *</Label>
                <Input name="siteCode" value={form.siteCode || ''} onChange={handleChange} placeholder="e.g. CHQ-001" required readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>Organization</Label>
                {lockedOrg ? (
                  <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background">
                    <span className="text-muted-foreground">{organizations.find((o:any) => o.id === Number(lockedOrg))?.name || lockedOrg}</span>
                  </div>
                ) : (
                  <Select disabled={mode === 'view'} value={form.organization ? form.organization.toString() : ''} onValueChange={(v) => setForm({...form, organization: Number(v)})}>
                    <SelectTrigger><SelectValue placeholder="Select Organization" /></SelectTrigger>
                    <SelectContent>
                      {organizations.map((org: any) => (
                        <SelectItem key={org.id} value={org.id.toString()}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Select Product Type</Label>
                <Select disabled={mode === 'view'} value={form.productType || ''} onValueChange={(v) => setForm({...form, productType: v})}>
                  <SelectTrigger><SelectValue placeholder="Select a product type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vibecopilot">Vibecopilot</SelectItem>
                    <SelectItem value="Custom HRMS">Custom HRMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Country</Label>
                <Input name="country" value={form.country || ""} onChange={handleChange} readOnly={mode === 'view'} placeholder="Select or type country" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Location Address</Label>
                <Input name="address" value={form.address || ""} onChange={handleChange} readOnly={mode === 'view'} placeholder="Enter full address..." />
              </div>
              <div className="space-y-2">
                <Label>Activate Date</Label>
                <Input type="date" name="activateDate" value={form.activateDate || ""} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2 flex flex-col justify-center items-end">
                <div className="flex items-center space-x-4">
                  <Label>Status</Label>
                  <Switch 
                    disabled={mode === 'view'}
                    checked={form.status === 'Active'} 
                    onCheckedChange={(c) => setForm({...form, status: c ? 'Active' : 'Inactive'})}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Contact Person</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input name="contactName" value={form.contactName || ""} onChange={handleChange} required readOnly={mode === 'view'} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input name="contactPhone" value={form.contactPhone || ""} onChange={handleChange} readOnly={mode === 'view'} placeholder="+1 (555) 123-4567" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email Address</Label>
                <Input type="email" name="contactEmail" value={form.contactEmail || ""} onChange={handleChange} readOnly={mode === 'view'} placeholder="john.doe@example.com" />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
            <h3 className="font-semibold text-lg text-slate-800">Module Access</h3>
            
            <div className="flex gap-4 items-center">
               <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                 <Input placeholder="Search modules..." className="pl-9" />
               </div>
               <Button className="bg-[#1a4cd2] hover:bg-[#1641b4] text-white">
                 <Plus className="w-4 h-4 mr-2" /> Add Module
               </Button>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-md border">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-slate-700">Bulk Import (CSV)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 font-medium">Assign to Role:</span>
                <Select defaultValue="Admin">
                  <SelectTrigger className="w-[150px] bg-white h-8"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Admin">Admin</SelectItem><SelectItem value="Manager">Manager</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2">
              <Checkbox 
                id="select-all" 
                checked={form.modules?.length === MODULES.flatMap(g => g.items).length}
                onCheckedChange={handleSelectAll}
                disabled={mode === 'view'}
              />
              <label htmlFor="select-all" className="text-sm font-medium text-slate-700">Select All Modules</label>
            </div>

            <div className="space-y-8 mt-6">
              {MODULES.map((group, gIdx) => (
                <div key={gIdx} className="space-y-4">
                  <h4 className="font-semibold text-slate-900 border-b pb-2 flex justify-between items-center">
                    {group.group}
                    <span className="text-xs text-muted-foreground">{group.items.length} items</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                    {group.items.map((mod, mIdx) => (
                      <div key={mIdx} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`mod-${gIdx}-${mIdx}`} 
                          checked={(form.modules || []).includes(mod)}
                          onCheckedChange={(c) => handleToggleModule(mod, c as boolean)}
                          disabled={mode === 'view'}
                        />
                        <label htmlFor={`mod-${gIdx}-${mIdx}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">
                          {mod}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
          </section>

        </div>
        
        <div className="p-6 pt-4 border-t flex justify-end gap-2 bg-slate-50/50 rounded-b-xl">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-[#1a4cd2] hover:bg-[#1641b4] text-white shadow-sm" onClick={() => onSave(form)}>Save</Button>
        </div>
    </div>
  );
}
