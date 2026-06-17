import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { db, type Site } from "@/lib/mock-data";

export const Route = createFileRoute("/sites")({ component: SitesPage });

function SitesPage() {
  const { sites: initial, branches } = db();
  const [rows, setRows] = useState<Site[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);

  return (
    <>
      <PageHeader title="Sites" description="Geofenced work locations with QR & face attendance settings" />
      <DataTable
        rows={rows} rowKey={r => r.id} searchKeys={["name","address"]}
        filters={[{ label: "Branch", key: "branchId", options: branches.map(b => ({ value: b.id, label: b.name })), predicate: (r, v) => r.branchId === v }]}
        onCreate={() => { setEditing(null); setOpen(true); }} createLabel="New Site" filename="sites.csv"
        columns={[
          { key: "name", header: "Site", accessor: r => r.name, sortable: true, render: r => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground truncate max-w-[260px]">{r.address}</div></div> },
          { key: "branch", header: "Branch", render: r => branches.find(b => b.id === r.branchId)?.name ?? "—" },
          { key: "geo", header: "Lat / Lng", render: r => <span className="font-mono text-xs">{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</span> },
          { key: "radius", header: "Radius", accessor: r => r.radius, render: r => `${r.radius} m` },
          { key: "qr", header: "QR", render: r => <Badge variant={r.qrEnabled ? "default" : "secondary"} className={r.qrEnabled ? "bg-success text-success-foreground" : ""}>{r.qrEnabled ? "On" : "Off"}</Badge> },
          { key: "face", header: "Face", render: r => <Badge variant={r.faceEnabled ? "default" : "secondary"} className={r.faceEnabled ? "bg-info text-info-foreground" : ""}>{r.faceEnabled ? "On" : "Off"}</Badge> },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setRows(rs => rs.filter(x => x.id !== r.id)); toast.success("Site removed"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>}
      />
      <SiteDialog open={open} onOpenChange={setOpen} site={editing} onSave={(s) => {
        setRows(r => editing ? r.map(x => x.id === s.id ? s : x) : [...r, { ...s, id: `site-${Date.now()}` }]);
        toast.success(editing ? "Site updated" : "Site created"); setOpen(false); setEditing(null);
      }} />
    </>
  );
}

function SiteDialog({ open, onOpenChange, site, onSave }: { open: boolean; onOpenChange: (b: boolean) => void; site: Site | null; onSave: (s: Site) => void }) {
  const [form, setForm] = useState<Site>(site ?? { id: "", branchId: db().branches[0].id, name: "", address: "", latitude: 12.97, longitude: 77.59, radius: 150, qrEnabled: true, faceEnabled: false });
  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && site) setForm(site); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{site ? "Edit" : "Create"} Site</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label>Site Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Latitude</Label><Input type="number" value={form.latitude} onChange={e => setForm({ ...form, latitude: +e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Longitude</Label><Input type="number" value={form.longitude} onChange={e => setForm({ ...form, longitude: +e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Radius (m)</Label><Input type="number" value={form.radius} onChange={e => setForm({ ...form, radius: +e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-md border"><Label>QR Enabled</Label><Switch checked={form.qrEnabled} onCheckedChange={v => setForm({ ...form, qrEnabled: v })} /></div>
          <div className="flex items-center justify-between p-3 rounded-md border"><Label>Face Verification</Label><Switch checked={form.faceEnabled} onCheckedChange={v => setForm({ ...form, faceEnabled: v })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => onSave(form)}>Save Site</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
