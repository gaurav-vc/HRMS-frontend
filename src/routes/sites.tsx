import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sitesApi, branchesApi, entitiesApi } from "@/api";
import type { Site, Branch } from "@/lib/mock-data";

export const Route = createFileRoute("/sites")({
  component: SitesPage,
  loader: async () => {
    const [sites, branches, entities] = await Promise.all([
      sitesApi.getAll(),
      branchesApi.getAll(),
      entitiesApi.getAll(),
    ]);
    return { sites, branches, entities };
  }
});

function SitesPage() {
  const router = useRouter();
  const { sites: initial, branches, entities } = Route.useLoaderData();
  const [rows, setRows] = useState<any[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");

  useEffect(() => { setRows(initial); }, [initial]);

  const save = async (s: Site) => {
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

  return (
    <>
      <PageHeader title="Sites" description="Geofenced work locations with QR & face attendance settings" />
      <DataTable
        rows={rows} rowKey={r => r.id} searchKeys={["name","address"]}
        filters={[{ label: "Branch", key: "branchId", options: branches.map(b => ({ value: b.id, label: b.name })), predicate: (r, v) => String(r.branch) === String(v) }]}
        onCreate={() => { setEditing(null); setMode("create"); setOpen(true); }} createLabel="New Site" filename="sites.csv"
        columns={[
          { key: "name", header: "Site", accessor: r => r.name, sortable: true, render: r => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground truncate max-w-[260px]">{r.address}</div></div> },
          { key: "branch", header: "Branch", render: r => branches.find(b => String(b.id) === String(r.branch))?.name ?? "—" },
          { key: "geo", header: "Lat / Lng", render: r => <span className="font-mono text-xs">{(r.latitude||0).toFixed(4)}, {(r.longitude||0).toFixed(4)}</span> },
          { key: "radius", header: "Radius", accessor: r => r.radius, render: r => `${r.radius} m` },
          { key: "qr", header: "QR", render: r => <Badge variant={r.qrEnabled ? "default" : "secondary"} className={r.qrEnabled ? "bg-success text-success-foreground" : ""}>{r.qrEnabled ? "On" : "Off"}</Badge> },
          { key: "face", header: "Face", render: r => <Badge variant={r.faceEnabled ? "default" : "secondary"} className={r.faceEnabled ? "bg-info text-info-foreground" : ""}>{r.faceEnabled ? "On" : "Off"}</Badge> },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("view"); setOpen(true); }}><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setMode("edit"); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>}
      />
      <SiteDialog open={open} onOpenChange={setOpen} site={editing} onSave={save} branches={branches} mode={mode} />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function SiteDialog({ open, onOpenChange, site, onSave, branches, mode }: { open: boolean; onOpenChange: (b: boolean) => void; site: Site | null; onSave: (s: Site) => void; branches: Branch[]; mode: "create" | "edit" | "view" }) {
  const defaultForm = { id: "", branchId: "", name: "", address: "", latitude: 12.97, longitude: 77.59, radius: 150, qrEnabled: true, faceEnabled: false, branch: "" } as any;
  const [form, setForm] = useState<Site>(site ?? defaultForm);

  useEffect(() => {
    if (open) setForm(site ?? defaultForm);
  }, [open, site]);
  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && site) setForm(site); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "view" ? "View" : site ? "Edit" : "Create"} Site</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Branch">
            <Select value={String(form.branch)} onValueChange={v => setForm({ ...form, branch: v } as any)} disabled={mode === "view"}>
              <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={mode === "view"} /></Field>
          <Field label="Address"><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} disabled={mode === "view"} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude"><Input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: +e.target.value })} disabled={mode === "view"} /></Field>
            <Field label="Longitude"><Input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: +e.target.value })} disabled={mode === "view"} /></Field>
          </div>
          <Field label="Geo-fence Radius (m)"><Input type="number" value={form.radius} onChange={e => setForm({ ...form, radius: +e.target.value })} disabled={mode === "view"} /></Field>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.qrEnabled} onChange={e => setForm({ ...form, qrEnabled: e.target.checked })} disabled={mode === "view"} /> QR Code</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.faceEnabled} onChange={e => setForm({ ...form, faceEnabled: e.target.checked })} disabled={mode === "view"} /> Face Liveness</label>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{mode === "view" ? "Close" : "Cancel"}</Button>{mode !== "view" && <Button onClick={() => onSave(form)}>Save</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
