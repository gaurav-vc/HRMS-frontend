import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Trash2, Tablet, Copy, ExternalLink, RefreshCw, Key, ShieldCheck, Check } from "lucide-react";
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
  },
});

function SitesPage() {
  const router = useRouter();
  const { sites: initial } = Route.useLoaderData();
  const [rows, setRows] = useState<any[]>(initial || []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    setRows(initial || []);
  }, [initial]);

  const save = async (s: any) => {
    try {
      // Strip 'logo' because sending the string URL back to DRF causes a FileField error.
      // (Since there is no logo uploader in this dialog anyway)
      const {
        logo,
        qrEnabled,
        faceEnabled,
        kioskEnabled,
        kioskSimilarityThreshold,
        kioskCooldownSeconds,
        kioskAutoPunch,
        kioskPin,
        kioskToken,
        ...rest
      } = s;
      
      // The backend overrides parsers and uses raw JSONParser, so it expects snake_case for writes
      // even though it emits camelCase for reads.
      const data = {
        ...rest,
        qr_enabled: qrEnabled,
        face_enabled: faceEnabled,
        kiosk_enabled: kioskEnabled ?? false,
        kiosk_similarity_threshold: Number(kioskSimilarityThreshold) || 0.45,
        kiosk_cooldown_seconds: Number(kioskCooldownSeconds) || 30,
        kiosk_auto_punch: kioskAutoPunch ?? true,
        kiosk_pin: kioskPin || "1234",
        kiosk_token: kioskToken || undefined,
        site_code: rest.site_code || rest.siteCode,
        is_sub_site: true,
      };
      
      if (editing && s.id) {
        await sitesApi.update(s.id, data);
        toast.success("Site updated successfully");
      } else {
        const { id, ...createData } = data;
        await sitesApi.create(createData);
        toast.success("Site created successfully");
      }
      setOpen(false);
      setEditing(null);
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
        <SiteDialog
          open={open}
          onOpenChange={setOpen}
          site={editing}
          onSave={save}
          readOnly={viewing}
        />
      </div>
    );
  }

  const branches = Array.from(
    new Set(rows.map((r) => r.branch_name || r.branch || "Headquarters")),
  ).filter(Boolean);

  return (
    <div className="p-6 space-y-6 bg-[#f9fafb] min-h-screen">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Sites</h1>
        <p className="text-[15px] text-slate-500 mt-1">
          Geofenced work locations with QR & face attendance settings
        </p>
      </div>

      <DataTable
        rows={[...rows].sort(
          (a: any, b: any) =>
            new Date(b.createdAt || b.created_at || 0).getTime() -
            new Date(a.createdAt || a.created_at || 0).getTime(),
        )}
        rowKey={(r: any) => r.id}
        searchKeys={["name", "address", "city"]}
        onCreate={() => {
          setEditing(null);
          setViewing(false);
          setOpen(true);
        }}
        createLabel="New Site"
        filters={[
          {
            label: "Branch",
            key: "branch",
            options: branches.map((b) => ({ label: String(b), value: String(b) })),
            predicate: (row: any, v: string) =>
              String(row.branch_name || row.branch || "Headquarters") === v,
          },
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
            ),
          },
          {
            key: "branch",
            header: "Branch",
            accessor: (r: any) => r.branch_name || r.branch || "Headquarters",
            render: (r: any) => (
              <span className="text-sm text-slate-700 font-medium">
                {r.branch_name || r.branch || "Headquarters"}
              </span>
            ),
          },
          {
            key: "lat_lng",
            header: "Lat / Lng",
            accessor: (r: any) =>
              `${Number(r.latitude || 0).toFixed(4)}, ${Number(r.longitude || 0).toFixed(4)}`,
            render: (r: any) => (
              <span className="text-sm text-slate-600 font-mono tracking-tight">
                {Number(r.latitude || 0).toFixed(4)}, {Number(r.longitude || 0).toFixed(4)}
              </span>
            ),
          },
          {
            key: "radius",
            header: "Radius",
            accessor: (r: any) => `${r.radius || 150} m`,
            render: (r: any) => (
              <span className="text-sm text-slate-700 font-medium">{r.radius || 150} m</span>
            ),
          },
          {
            key: "qr",
            header: "QR",
            accessor: (r: any) => (r.qrEnabled === false || r.qrEnabled === 'false' ? "Off" : "On"),
            render: (r: any) => {
              const isOn = r.qrEnabled !== false && r.qrEnabled !== 'false';
              return (
                <span
                  className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${isOn ? "bg-[#06b6d4] text-white shadow-sm" : "bg-slate-100 text-slate-500"}`}
                >
                  {isOn ? "On" : "Off"}
                </span>
              );
            },
          },
          {
            key: "face",
            header: "Face",
            accessor: (r: any) => (r.faceEnabled === false || r.faceEnabled === 'false' ? "Off" : "On"),
            render: (r: any) => {
              const isOn = r.faceEnabled !== false && r.faceEnabled !== 'false';
              return (
                <span
                  className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${isOn ? "bg-[#06b6d4] text-white shadow-sm" : "bg-slate-100 text-slate-500"}`}
                >
                  {isOn ? "On" : "Off"}
                </span>
              );
            },
          },
          {
            key: "kiosk",
            header: "Tablet Kiosk",
            accessor: (r: any) =>
              r.kioskEnabled || r.kiosk_enabled ? "Active" : "Off",
            render: (r: any) => {
              const isOn = Boolean(r.kioskEnabled || r.kiosk_enabled);
              return (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isOn ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Tablet className="h-3 w-3" />
                  {isOn ? "Active" : "Off"}
                </span>
              );
            },
          },
          {
            key: "created_at",
            header: "Created Date & Time",
            accessor: (r: any) => r.createdAt || r.created_at,
            render: (r: any) =>
              (r as any).createdAt || (r as any).created_at
                ? new Date((r as any).createdAt || (r as any).created_at).toLocaleString()
                : "—",
          },
        ]}
        actions={(r: any) => (
          <div className="flex gap-3 justify-end items-center pr-2">
            {(r.kioskToken || r.kiosk_token) && (
              <button
                className="text-indigo-600 hover:text-indigo-900 transition-colors p-1 hover:bg-indigo-50 rounded"
                title="Launch Tablet Kiosk Terminal"
                onClick={() => {
                  window.open(`/attendance/kiosk?token=${r.kioskToken || r.kiosk_token}`, "_blank");
                }}
              >
                <Tablet className="h-[18px] w-[18px]" />
              </button>
            )}
            <button
              className="text-slate-500 hover:text-slate-900 transition-colors"
              title="View"
              onClick={() => {
                setEditing(r);
                setViewing(true);
                setOpen(true);
              }}
            >
              <Eye className="h-[18px] w-[18px]" />
            </button>
            <button
              className="text-slate-500 hover:text-slate-900 transition-colors"
              title="Edit"
              onClick={() => {
                setEditing(r);
                setViewing(false);
                setOpen(true);
              }}
            >
              <Pencil className="h-[18px] w-[18px]" />
            </button>
            <button
              className="text-[#ef4444] hover:text-[#dc2626] transition-colors"
              title="Delete"
              onClick={() => handleDelete(r.id)}
            >
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
    name: "",
    site_code: "",
    country: "",
    address: "",
    latitude: "",
    longitude: "",
    radius: 150,
    qrEnabled: true,
    faceEnabled: true,
    status: "Active",
    kioskEnabled: false,
    kioskSimilarityThreshold: 0.45,
    kioskCooldownSeconds: 30,
    kioskAutoPunch: true,
    kioskPin: "1234",
    kioskToken: "",
  };

  const [form, setForm] = useState<any>(defaultForm);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (open) {
      if (site) {
        setForm({
          ...defaultForm,
          ...site,
          qrEnabled: site.qrEnabled === false || site.qrEnabled === 'false' ? false : (site.qrEnabled === true || site.qrEnabled === 'true' ? true : defaultForm.qrEnabled),
          faceEnabled: site.faceEnabled === false || site.faceEnabled === 'false' ? false : (site.faceEnabled === true || site.faceEnabled === 'true' ? true : defaultForm.faceEnabled),
          kioskEnabled: site.kioskEnabled === true || site.kiosk_enabled === true,
          kioskSimilarityThreshold: site.kioskSimilarityThreshold ?? site.kiosk_similarity_threshold ?? 0.45,
          kioskCooldownSeconds: site.kioskCooldownSeconds ?? site.kiosk_cooldown_seconds ?? 30,
          kioskAutoPunch: site.kioskAutoPunch !== false && site.kiosk_auto_punch !== false,
          kioskPin: site.kioskPin ?? site.kiosk_pin ?? "1234",
          kioskToken: site.kioskToken || site.kiosk_token || "",
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [open, site]);

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleGenerateToken = async () => {
    if (!site?.id) {
      toast.error("Please save the site first before generating a kiosk token.");
      return;
    }
    setGeneratingToken(true);
    try {
      const res = await sitesApi.generateKioskToken(site.id);
      const newToken = res.kioskToken || res.kiosk_token;
      setForm((prev: any) => ({ ...prev, kioskToken: newToken }));
      toast.success("New Kiosk Token generated successfully!");
    } catch (err: any) {
      toast.error("Failed to generate kiosk token: " + (err.message || "Server error"));
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyLink = () => {
    if (!form.kioskToken) return;
    const kioskUrl = `${window.location.origin}/attendance/kiosk?token=${form.kioskToken}`;
    navigator.clipboard.writeText(kioskUrl);
    setCopied(true);
    toast.success("Kiosk Terminal URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLaunchKiosk = () => {
    if (!form.kioskToken) {
      toast.error("Generate a kiosk token first to launch the kiosk terminal.");
      return;
    }
    window.open(`/attendance/kiosk?token=${form.kioskToken}`, "_blank");
  };

  if (!open) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
      <div className="p-6 pb-4 border-b flex items-center gap-4 bg-slate-50/50 rounded-t-xl">
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          &larr; Back
        </Button>
        <h2 className="text-xl font-bold text-slate-800">
          {site ? (readOnly ? "View Site" : "Edit Site") : "Add New Site"}
        </h2>
      </div>

      <div className="p-6 space-y-8 flex-1 bg-slate-50/50">
        {/* Site Details */}
        <section className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
          <h3 className="font-semibold text-lg text-slate-800">Site Details</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Site Name *</Label>
              <Input
                name="name"
                value={form.name || ""}
                onChange={handleChange}
                placeholder="e.g. Corporate HQ"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Site Code *</Label>
              <Input
                name="site_code"
                value={form.site_code || ""}
                onChange={handleChange}
                placeholder="e.g. CHQ-001"
                disabled={readOnly}
              />
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
                  checked={form.status === "Active"}
                  disabled={readOnly}
                  onCheckedChange={(c) => setForm({ ...form, status: c ? "Active" : "Inactive" })}
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
              <Input
                type="number"
                step="any"
                name="latitude"
                value={form.latitude || ""}
                onChange={handleChange}
                placeholder="e.g. 19.0760"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                type="number"
                step="any"
                name="longitude"
                value={form.longitude || ""}
                onChange={handleChange}
                placeholder="e.g. 72.8777"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Radius (meters)</Label>
              <Input
                type="number"
                name="radius"
                value={form.radius || 150}
                onChange={handleChange}
                placeholder="e.g. 150"
                disabled={readOnly}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Setting coordinates and radius enables geofenced attendance tracking for this site.
          </p>
        </section>

        {/* Attendance Features */}
        <section className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
          <div className="flex flex-col space-y-1">
            <h3 className="font-semibold text-lg text-slate-800">Attendance Modes</h3>
            <p className="text-sm text-slate-500">Configure how employees mark attendance at this site.</p>
          </div>
          
          {(!form.qrEnabled && !form.faceEnabled) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-start">
              <div className="font-semibold mr-2">Security Alert:</div>
              <div>At least one attendance mode (QR Check-in or Face Verification) must be enabled to allow employees to check in.</div>
            </div>
          )}

          <div className="flex gap-8">
            <div className="flex items-center space-x-2">
              <Switch
                id="qr-mode"
                checked={form.qrEnabled ?? true}
                disabled={readOnly}
                onCheckedChange={(c) => {
                  if (!c && !form.faceEnabled) {
                    toast.error("Cannot disable QR Check-in while Face Verification is also disabled.");
                  }
                  setForm({ ...form, qrEnabled: c });
                }}
              />
              <Label htmlFor="qr-mode" className="cursor-pointer">
                QR Check-in
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="face-mode"
                checked={form.faceEnabled ?? true}
                disabled={readOnly}
                onCheckedChange={(c) => {
                  if (!c && !form.qrEnabled) {
                    toast.error("Cannot disable Face Verification while QR Check-in is also disabled.");
                  }
                  setForm({ ...form, faceEnabled: c });
                }}
              />
              <Label htmlFor="face-mode" className="cursor-pointer">
                Face Verification
              </Label>
            </div>
          </div>
        </section>

        {/* Tablet Kiosk Biometrics & Hardware */}
        <section className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Tablet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-slate-800">Tablet Attendance Kiosk (Hardware & Biometrics)</h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700">
                    <ShieldCheck className="w-3 h-3" />
                    Strict Site Isolation
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  Continuous gate facial recognition tablet for blue-collar staff without smartphones or emails.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="kiosk-mode"
                checked={Boolean(form.kioskEnabled)}
                disabled={readOnly}
                onCheckedChange={(c) => setForm({ ...form, kioskEnabled: c })}
              />
              <Label htmlFor="kiosk-mode" className="font-semibold cursor-pointer">
                {form.kioskEnabled ? "Active" : "Disabled"}
              </Label>
            </div>
          </div>

          {form.kioskEnabled && (
            <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Similarity Threshold */}
                <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-slate-800">Face Match Sensitivity (Threshold)</Label>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-indigo-600">
                      {form.kioskSimilarityThreshold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.35"
                    max="0.70"
                    step="0.01"
                    name="kioskSimilarityThreshold"
                    value={form.kioskSimilarityThreshold || 0.45}
                    onChange={(e) => setForm({ ...form, kioskSimilarityThreshold: parseFloat(e.target.value) })}
                    disabled={readOnly}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>0.35 (Strictest)</span>
                    <span className="text-indigo-600 font-medium">0.45 (Optimal)</span>
                    <span>0.70 (Forgiving)</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Lower values prevent false matches; higher values help match under dim lighting or different angles.
                  </p>
                </div>

                {/* Cooldown Seconds */}
                <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200/70">
                  <Label className="font-semibold text-slate-800">Anti-Spam Cooldown (Seconds)</Label>
                  <Input
                    type="number"
                    min="10"
                    max="180"
                    name="kioskCooldownSeconds"
                    value={form.kioskCooldownSeconds || 30}
                    onChange={handleChange}
                    placeholder="30"
                    disabled={readOnly}
                  />
                  <p className="text-xs text-slate-500">
                    Minimum wait time before an employee can trigger another punch, preventing double-punches at the gate.
                  </p>
                </div>

                {/* Auto Punch Mode */}
                <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-slate-800">Smart Auto IN/OUT Resolution</Label>
                    <Switch
                      checked={Boolean(form.kioskAutoPunch)}
                      disabled={readOnly}
                      onCheckedChange={(c) => setForm({ ...form, kioskAutoPunch: c })}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Automatically alternates punches (e.g. IN if first punch today, OUT if already checked in). Employees do not need to touch the tablet screen.
                  </p>
                </div>

                {/* Security PIN */}
                <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-slate-600" />
                    <Label className="font-semibold text-slate-800">Tablet Exit Security PIN</Label>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPin ? "text" : "password"}
                      maxLength={6}
                      name="kioskPin"
                      value={form.kioskPin ?? ""}
                      onChange={handleChange}
                      placeholder="e.g. 1234"
                      disabled={readOnly}
                      className="pr-10 font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                      title={showPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showPin ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    4-digit security PIN entered on the tablet screen to unlock maintenance settings or exit kiosk mode. You can customize this to any PIN you want.
                  </p>
                </div>
              </div>

              {/* Hardware Token & Launcher Card */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <Tablet className="w-5 h-5 text-indigo-400" />
                      Tablet Terminal Access Token & Launcher
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Open this URL directly in Chrome or Safari on the gate tablet. The kiosk authenticates securely using this unique site token.
                    </p>
                  </div>
                  {site?.id && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={generatingToken || readOnly}
                      onClick={handleGenerateToken}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5 self-start sm:self-auto"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generatingToken ? "animate-spin" : ""}`} />
                      {form.kioskToken ? "Regenerate Token" : "Generate Token"}
                    </Button>
                  )}
                </div>

                {form.kioskToken ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg p-2.5">
                      <code className="text-xs font-mono text-indigo-300 flex-1 truncate">
                        {form.kioskToken}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCopyLink}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 gap-1.5"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy Link"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        type="button"
                        onClick={handleLaunchKiosk}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold h-10 px-5 gap-2 shadow-md"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Launch Tablet Kiosk Fullscreen
                      </Button>
                      <span className="text-xs text-slate-400">
                        Locks candidate facial recognition pool strictly to employees enrolled at <strong className="text-white">{form.name || "this site"}</strong>.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300">
                    {site?.id
                      ? "No kiosk token generated yet. Click 'Generate Token' to activate your tablet terminal link."
                      : "Save this site first to generate its unique tablet kiosk token."}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="p-6 pt-4 border-t flex justify-end gap-2 bg-slate-50/50 rounded-b-xl">
        {readOnly ? (
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#1a4cd2] hover:bg-[#1641b4] text-white"
              disabled={!form.qrEnabled && !form.faceEnabled}
              onClick={() => {
                if (!form.qrEnabled && !form.faceEnabled) {
                  toast.error("Security Requirement: At least one attendance mode must be active.");
                  return;
                }
                onSave(form);
              }}
            >
              Save Site
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
