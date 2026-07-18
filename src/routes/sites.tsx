import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { sitesApi } from "@/api";

export const Route = createFileRoute("/sites")({
  component: SitesPage,
  loader: async () => {
    try {
      const sites = await sitesApi.getAll();
      return { sites };
    } catch {
      return { sites: [] };
    }
  }
});

function SitesPage() {
  const router = useRouter();
  const { sites: initial } = Route.useLoaderData();
  const [rows, setRows] = useState<any[]>(initial || []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [viewing, setViewing] = useState(false);

  useEffect(() => { setRows(initial || []); }, [initial]);

  const save = async (s: any) => {
    try {
      if (editing && s.id) {
        await sitesApi.update(s.id, s);
        toast.success("Site updated");
      } else {
        const { id, ...data } = s;
        await sitesApi.create(data);
        toast.success("Site created");
      }
      setOpen(false); setEditing(null);
      router.invalidate();
    } catch (err) {
      toast.error("Failed to save site");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await sitesApi.delete(id);
      toast.success("Site removed");
      router.invalidate();
    } catch (err) {
      toast.error("Failed to delete site");
    }
  };

  if (open) {
    return (
      <div className="p-6">
        <SiteDialog open={open} onOpenChange={setOpen} site={editing} onSave={save} readOnly={viewing} />
      </div>
    );
  }

  const branches = Array.from(new Set(rows.map(r => r.branch_name || r.branch || "Headquarters"))).filter(Boolean);

  return (
    <div className="p-6 space-y-6 bg-[#f9fafb] min-h-screen">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Sites</h1>
        <p className="text-[15px] text-slate-500 mt-1">Geofenced work locations with QR & face attendance settings</p>
      </div>

      <DataTable
        rows={[...rows].sort((a: any, b: any) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime())}
        rowKey={(r: any) => r.id}
        searchKeys={["name", "address", "city"]}
        onCreate={() => { setEditing(null); setViewing(false); setOpen(true); }}
        createLabel="New Site"
        filters={[
          {
            label: "Branch",
            key: "branch",
            options: branches.map(b => ({ label: String(b), value: String(b) })),
            predicate: (row: any, v: string) => String(row.branch_name || row.branch || "Headquarters") === v
          }
        ]}
        columns={[
          { 
            key: "name", 
            header: "Site", 
            accessor: (r: any) => `${r.name} - ${r.address || r.city || ""}`,
            render: (r: any) => (
              <div className="flex flex-col py-1">
                 <span className="font-semibold text-slate-900 text-sm">{r.name}</span>
                 <span className="text-xs text-slate-500 mt-0.5">{r.address || r.city || "—"}</span>
              </div>
            )
          },
          { 
            key: "branch", 
            header: "Branch", 
            accessor: (r: any) => r.branch_name || r.branch || "Headquarters",
            render: (r: any) => <span className="text-sm text-slate-700 font-medium">{r.branch_name || r.branch || "Headquarters"}</span> 
          },
          { 
            key: "lat_lng", 
            header: "Lat / Lng",
            accessor: (r: any) => `${Number(r.latitude || 0).toFixed(4)}, ${Number(r.longitude || 0).toFixed(4)}`,
            render: (r: any) => <span className="text-sm text-slate-600 font-mono tracking-tight">{Number(r.latitude || 0).toFixed(4)}, {Number(r.longitude || 0).toFixed(4)}</span> 
          },
          { 
            key: "radius", 
            header: "Radius",
            accessor: (r: any) => `${r.radius || 150} m`,
            render: (r: any) => <span className="text-sm text-slate-700 font-medium">{r.radius || 150} m</span>
          },
          { 
            key: "qr", 
            header: "QR",
            accessor: (r: any) => r.qr_enabled !== false ? "On" : "Off",
            render: (r: any) => (
              <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${r.qr_enabled !== false ? "bg-[#06b6d4] text-white shadow-sm" : "bg-slate-100 text-slate-500"}`}>
                {r.qr_enabled !== false ? "On" : "Off"}
              </span>
            )
          },
          { 
            key: "face", 
            header: "Face",
            accessor: (r: any) => r.face_enabled !== false ? "On" : "Off",
            render: (r: any) => (
              <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${r.face_enabled !== false ? "bg-[#06b6d4] text-white shadow-sm" : "bg-slate-100 text-slate-500"}`}>
                {r.face_enabled !== false ? "On" : "Off"}
              </span>
            )
          },
          {
            key: "created_at",
            header: "Created Date & Time",
            accessor: (r: any) => (r.createdAt || r.created_at),
            render: (r: any) => ((r as any).createdAt || (r as any).created_at) ? new Date((r as any).createdAt || (r as any).created_at).toLocaleString() : "—"
          },
          ]}
          actions={(r: any) => (
            <div className="flex gap-3 justify-end items-center pr-2">
              <button className="text-slate-500 hover:text-slate-900 transition-colors" title="View" onClick={() => { setEditing(r); setViewing(true); setOpen(true); }}>
                <Eye className="h-[18px] w-[18px]" />
              </button>
              <button className="text-slate-500 hover:text-slate-900 transition-colors" title="Edit" onClick={() => { setEditing(r); setViewing(false); setOpen(true); }}>
                <Pencil className="h-[18px] w-[18px]" />
              </button>
              <button className="text-[#ef4444] hover:text-[#dc2626] transition-colors" title="Delete" onClick={() => handleDelete(r.id)}>
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
        />
    </div>
  );
}

function SiteDialog({ open, onOpenChange, site, onSave, readOnly }: any) {
  const defaultForm = { 
    name: "", site_code: "", country: "", address: "", 
    latitude: "", longitude: "", radius: 150, 
    qr_enabled: true, face_enabled: true, status: "Active"
  };
  
  const [form, setForm] = useState<any>(defaultForm);

  useEffect(() => {
    if (open) {
      setForm(site || defaultForm);
    }
  }, [open, site]);

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  if (!open) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
      <div className="p-6 pb-4 border-b flex items-center gap-4 bg-slate-50/50 rounded-t-xl">
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          &larr; Back
        </Button>
        <h2 className="text-xl font-bold text-slate-800">
          {site ? (readOnly ? 'View Site' : 'Edit Site') : 'Add New Site'}
        </h2>
      </div>
      
      <div className="p-6 space-y-8 flex-1 bg-slate-50/50">
          
          {/* Site Details */}
          <section className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
            <h3 className="font-semibold text-lg text-slate-800">Site Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Site Name *</Label>
                <Input name="name" value={form.name || ""} onChange={handleChange} placeholder="e.g. Corporate HQ" disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Site Code *</Label>
                <Input name="site_code" value={form.site_code || ""} onChange={handleChange} placeholder="e.g. CHQ-001" disabled={readOnly} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Location Address</Label>
                <textarea 
                  name="address" 
                  value={form.address || ""} 
                  onChange={handleChange} 
                  disabled={readOnly}
                  className="w-full min-h-[100px] flex rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter full address..."
                />
              </div>
              <div className="space-y-2 flex flex-col justify-center items-start col-span-2">
                <div className="flex items-center space-x-4">
                  <Label>Status</Label>
                  <Switch 
                    checked={form.status === 'Active'} 
                    disabled={readOnly}
                    onCheckedChange={(c) => setForm({...form, status: c ? 'Active' : 'Inactive'})}
                  />
                  <span className="text-sm text-slate-500">{form.status}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Geofencing */}
          <section className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
            <h3 className="font-semibold text-lg text-slate-800">Geolocation & Geofencing</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input type="number" step="any" name="latitude" value={form.latitude || ""} onChange={handleChange} placeholder="e.g. 19.0760" disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input type="number" step="any" name="longitude" value={form.longitude || ""} onChange={handleChange} placeholder="e.g. 72.8777" disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Radius (meters)</Label>
                <Input type="number" name="radius" value={form.radius || 150} onChange={handleChange} placeholder="e.g. 150" disabled={readOnly} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Setting coordinates and radius enables geofenced attendance tracking for this site.</p>
          </section>

          {/* Attendance Features */}
          <section className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
            <h3 className="font-semibold text-lg text-slate-800">Attendance Modes</h3>
            <div className="flex gap-8">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="qr-mode"
                  checked={form.qr_enabled ?? true} 
                  disabled={readOnly}
                  onCheckedChange={(c) => setForm({...form, qr_enabled: c})}
                />
                <Label htmlFor="qr-mode" className="cursor-pointer">QR Check-in</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="face-mode"
                  checked={form.face_enabled ?? true} 
                  disabled={readOnly}
                  onCheckedChange={(c) => setForm({...form, face_enabled: c})}
                />
                <Label htmlFor="face-mode" className="cursor-pointer">Face Verification</Label>
              </div>
            </div>
          </section>

        </div>
        
        <div className="p-6 pt-4 border-t flex justify-end gap-2 bg-slate-50/50 rounded-b-xl">
          {readOnly ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="bg-[#1a4cd2] hover:bg-[#1641b4] text-white" onClick={() => onSave(form)}>Save Site</Button>
            </>
          )}
        </div>
    </div>
  );
}
