import { createFileRoute, useRouter, Link, Outlet, useMatchRoute, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { organizationsApi } from "@/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/organizations")({
  component: OrganizationsPage,
  loader: async () => {
    try {
      const orgs = await organizationsApi.getAll();
      return { organizations: orgs };
    } catch {
      return { organizations: [] };
    }
  }
});

function OrganizationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { organizations: initial } = Route.useLoaderData();
  const [rows, setRows] = useState<any[]>(initial || []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [searchTerm, setSearchTerm] = useState("");
  const matchRoute = useMatchRoute();

  if (user?.username !== "Vibe_admin") {
    return <Navigate to="/" />;
  }

  const isDetail = matchRoute({ to: '/organizations/$orgId', fuzzy: true });

  useEffect(() => { setRows(initial || []); }, [initial]);

  const loadOrgs = async () => {
    try {
      const data = await organizationsApi.getAll();
      setRows(data);
    } catch (err) {
      console.error(err);
    }
  };

  const save = async (e: any) => {
    try {
      if (editing && e.id) {
        await organizationsApi.update(e.id, e);
        toast.success("Organization updated");
      } else {
        const { id, ...data } = e;
        await organizationsApi.create(data);
        toast.success("Organization created");
      }
      setOpen(false); setEditing(null);
      await loadOrgs();
      router.invalidate();
    } catch (err) {
      toast.error("Failed to save organization");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await organizationsApi.delete(id);
      toast.success("Deleted");
      await loadOrgs();
      router.invalidate();
    } catch (err) {
      toast.error("Failed to delete organization");
    }
  };

  if (isDetail) {
    return <Outlet />;
  }

  if (open) {
    return (
      <div className="p-6">
        <OrgDialog open={open} onOpenChange={setOpen} data={editing} mode={mode} onSave={save} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#f9fafb] min-h-screen">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Organizations</h1>
        <p className="text-[15px] text-slate-500 mt-1">Manage super admin level tenant organizations</p>
      </div>

      <DataTable
        rows={rows}
        rowKey={(r: any) => r.id}
        onCreate={() => { setEditing({}); setMode("create"); setOpen(true); }}
        createLabel="Add Organization"
        columns={[
          { key: "name", header: "Organization Name" },
          { key: "companyName", header: "Company Name" },
          { key: "entityName", header: "Entity Name" },
          { key: "siteLocation", header: "Location" },
          { 
            key: "status", 
            header: "Status",
            render: (r: any) => (
              <Badge variant={r.status === 'Active' ? 'default' : 'secondary'}>
                {r.status || 'Active'}
              </Badge>
            )
          }
        ]}
        actions={(r: any) => (
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/organizations/$orgId" params={{ orgId: r.id.toString() }}>
                <Eye className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setMode("edit"); setOpen(true); }}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(r.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      />
    </div>
  );
}

function OrgDialog({ open, onOpenChange, data, mode, onSave }: any) {
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (open) setForm(data || { status: 'Active', whiteLabelEnabled: false });
  }, [open, data]);

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleCheck = (checked: boolean) => setForm({ ...form, whiteLabelEnabled: checked });

  const fillDummy = () => setForm({
    name: "Nexus Innovations", status: "Active", companyName: "Nexus Innovations LLC",
    entityName: "Nexus Tech", siteLocation: "HQ Building", country: "United States",
    region: "North America", state: "California", city: "San Francisco", zone: "West Coast",
    whiteLabelEnabled: true, subDomain: "nexus.peoplepulse.com", solutionType: "SaaS",
    solutionFor: "HR Management", billingTerm: "Monthly", rateOfBilling: "499.00",
    billingCycle: "Prepaid", startDate: "2026-08-01", projectDuration: "1 Year",
    endDate: "2027-08-01", billingDate: "2026-08-01", currentDue: "499.00"
  });

  if (!open) return null;

  return (
    <div className="bg-white rounded-xl border shadow-sm flex flex-col">
      <div className="p-6 pb-4 border-b flex items-center gap-4 bg-slate-50/50 rounded-t-xl">
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          &larr; Back
        </Button>
        <h2 className="text-xl font-bold text-slate-800">
          {mode === 'create' ? 'Add New Organization' : mode === 'edit' ? 'Edit Organization' : 'View Organization'}
        </h2>
        {mode === 'create' && (
          <Button variant="secondary" size="sm" onClick={fillDummy} className="ml-auto">
            Fill Dummy Data
          </Button>
        )}
      </div>

      <div className="p-6 space-y-8 flex-1">
        {/* General Information */}
          <section>
            <h3 className="text-lg font-semibold mb-4 text-blue-900 border-b pb-2">General Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input name="name" value={form.name || ''} onChange={handleChange} readOnly={mode === 'view'} placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select disabled={mode === 'view'} value={form.status || 'Active'} onValueChange={(v) => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Company Details */}
          <section>
            <h3 className="text-lg font-semibold mb-4 text-blue-900 border-b pb-2">Company Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input name="companyName" value={form.companyName || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>Entity</Label>
                <Input name="entityName" value={form.entityName || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>Site Location</Label>
                <Input name="siteLocation" value={form.siteLocation || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
            </div>
          </section>

          {/* Location Details */}
          <section>
            <h3 className="text-lg font-semibold mb-4 text-blue-900 border-b pb-2">Location Details</h3>
            <div className="grid grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Input name="country" value={form.country || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input name="region" value={form.region || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input name="state" value={form.state || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input name="city" value={form.city || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>Zone</Label>
                <Input name="zone" value={form.zone || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
            </div>
          </section>

          {/* Advanced Options */}
          <section>
            <h3 className="text-lg font-semibold mb-4 text-blue-900 border-b pb-2">Advanced Options</h3>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="flex items-center space-x-2 border p-4 rounded-md h-[72px]">
                <Checkbox id="white_label" checked={form.whiteLabelEnabled || false} onCheckedChange={handleCheck} disabled={mode === 'view'} />
                <label htmlFor="white_label" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Enable White-label App
                </label>
              </div>
              <div className="space-y-2">
                <Label>Sub Domain URL</Label>
                <div className="flex relative">
                  <Input name="subDomain" value={form.subDomain || ''} onChange={handleChange} readOnly={mode === 'view'} className="pr-[140px]" />
                  <span className="absolute right-3 top-2.5 text-sm text-slate-400">.peoplepulse.com</span>
                </div>
              </div>
            </div>
          </section>

          {/* Billing Configuration */}
          <section>
            <h3 className="text-lg font-semibold mb-4 text-blue-900 border-b pb-2">Billing & Contract</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Solution Type</Label>
                <Select disabled={mode === 'view'} value={form.solutionType || ''} onValueChange={(v) => setForm({...form, solutionType: v})}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SaaS">SaaS</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Solution For</Label>
                <Input name="solutionFor" value={form.solutionFor || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>Billing Term</Label>
                <Select disabled={mode === 'view'} value={form.billingTerm || ''} onValueChange={(v) => setForm({...form, billingTerm: v})}>
                  <SelectTrigger><SelectValue placeholder="-- Please choose an option --" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rate of Billing</Label>
                <Input type="number" name="rateOfBilling" value={form.rateOfBilling || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select disabled={mode === 'view'} value={form.billingCycle || ''} onValueChange={(v) => setForm({...form, billingCycle: v})}>
                  <SelectTrigger><SelectValue placeholder="-- Please choose an option --" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prepaid">Prepaid</SelectItem>
                    <SelectItem value="Postpaid">Postpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" name="startDate" value={form.startDate || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>Project Duration</Label>
                <Select disabled={mode === 'view'} value={form.projectDuration || ''} onValueChange={(v) => setForm({...form, projectDuration: v})}>
                  <SelectTrigger><SelectValue placeholder="-- Please choose an option --" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6 Months">6 Months</SelectItem>
                    <SelectItem value="1 Year">1 Year</SelectItem>
                    <SelectItem value="2 Years">2 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" name="endDate" value={form.endDate || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
              <div className="space-y-2">
                <Label>Billing Date</Label>
                <Input type="date" name="billingDate" value={form.billingDate || ''} onChange={handleChange} readOnly={mode === 'view'} />
              </div>
            </div>
          </section>

        </div>

        <div className="p-6 pt-4 border-t flex justify-end gap-2 bg-slate-50/50 rounded-b-xl">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {mode !== 'view' && (
            <Button onClick={() => onSave(form)}>Save Organization</Button>
          )}
        </div>
    </div>
  );
}
