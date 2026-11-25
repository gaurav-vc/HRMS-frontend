import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Landmark,
  MapPin,
  Phone,
  Upload,
  User,
  Loader2,
  Trash2,
  KeyRound,
  TrendingUp,
  History,
  Sparkles,
  CheckCircle2,
  Lock,
  Unlock,
  ShieldCheck,
  AlertCircle,
  Check,
  X,
  FilePlus,
} from "lucide-react";
import { ResetPasswordDialog } from "@/components/reset-password-dialog";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { fmtINR } from "@/lib/utils";
import type { CompensationHistory } from "@/types";
import {
  employeesApi,
  departmentsApi,
  designationsApi,
  branchesApi,
  entitiesApi,
  sitesApi,
  payrollApi,
  getMediaUrl,
} from "@/api";

import React from "react";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            margin: "2rem",
            padding: "2rem",
            backgroundColor: "#fee2e2",
            border: "5px solid #ef4444",
            color: "#7f1d1d",
            borderRadius: "8px",
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
            CRITICAL UI CRASH
          </h1>
          <p style={{ fontSize: "1.25rem" }}>
            The page failed to load due to the following render error:
          </p>
          <pre
            style={{
              backgroundColor: "black",
              color: "red",
              padding: "1rem",
              marginTop: "1rem",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <div style={{ marginTop: "2rem" }}>
            <Link
              to="/employees"
              style={{ textDecoration: "underline", color: "#2563eb", fontWeight: "bold" }}
            >
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
  return (
    <ErrorBoundary>
      <EmployeeDetail />
    </ErrorBoundary>
  );
}

export const Route = createFileRoute("/employees/$id")({
  component: EmployeeDetailWrapped,
  loader: async ({ params }) => {
    const [e, allEmps, depts, desgs, branches, sites, entities, structures, documents] =
      await Promise.all([
        employeesApi.getById(params.id).catch((e) => {
          throw new Error(`getById failed: ${e.message}`);
        }),
        employeesApi.getAll().catch(() => []),
        departmentsApi.getAll().catch(() => []),
        designationsApi.getAll().catch(() => []),
        branchesApi.getAll().catch(() => []),
        sitesApi.getAll().catch(() => []),
        entitiesApi.getAll().catch(() => []),
        payrollApi.getStructures().catch(() => []),
        employeesApi.getDocuments(params.id).catch(() => []),
      ]);
    return { e, allEmps, depts, desgs, branches, sites, entities, structures, documents };
  },
  pendingComponent: () => (
    <div className="p-12 text-center text-lg animate-pulse font-semibold">
      Loading employee data... Please wait.
    </div>
  ),
  errorComponent: ({ error }: any) => (
    <div
      style={{
        margin: "2rem",
        padding: "2rem",
        backgroundColor: "#fee2e2",
        border: "5px solid #ef4444",
        color: "#7f1d1d",
        borderRadius: "8px",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
        CRITICAL UI CRASH
      </h1>
      <p style={{ fontSize: "1.25rem" }}>The page failed to load due to the following error:</p>
      <pre
        style={{
          backgroundColor: "black",
          color: "red",
          padding: "1rem",
          marginTop: "1rem",
          overflowX: "auto",
        }}
      >
        {error?.message || String(error)}
      </pre>
      <div style={{ marginTop: "2rem" }}>
        <Link
          to="/employees"
          style={{ textDecoration: "underline", color: "#2563eb", fontWeight: "bold" }}
        >
          Go back to Employee List
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p>Employee not found.</p>
      <Link to="/employees" className="text-primary underline">
        Back to list
      </Link>
    </div>
  ),
});

function EmployeeDetail() {
  const router = useRouter();
  const {
    e: rawE,
    allEmps,
    depts,
    desgs,
    branches,
    sites,
    entities,
    structures,
    documents: initialDocs,
  } = Route.useLoaderData();

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

  const { user } = useAuth();
  const isOwnProfile = Boolean(
    (user?.id && (String(user.id) === String(e.user) || String(user.id) === String((e as any).userId))) ||
    (user?.employee_id && (user.employee_id === e.code || user.email === e.email))
  );
  const isCeo = Boolean(
    user?.can_view_confidential ||
    user?.is_ceo ||
    user?.is_superuser ||
    user?.role === "super_admin" ||
    user?.employee_id === "CEO001"
  );
  const canViewConfidential = isCeo || isOwnProfile;
  const canEditCTC = isCeo;

  const isManagerOfThisEmployee = Boolean(
    user?.employee_profile?.id && String(user.employee_profile.id) === String(e.manager)
  );
  const isManagerOrAdmin = Boolean(
    user?.is_superuser ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "site_admin" ||
    isManagerOfThisEmployee
  );

  // Profile edit lock state
  const [profileUnlocked, setProfileUnlocked] = useState<boolean>(
    rawE.profileEditUnlocked ?? (rawE as any).profile_edit_unlocked ?? true
  );
  const [unlockRequested, setUnlockRequested] = useState<boolean>(
    rawE.profileUnlockRequested ?? (rawE as any).profile_unlock_requested ?? false
  );
  const [unlockReason, setUnlockReason] = useState<string>(
    rawE.profileUnlockReason ?? (rawE as any).profile_unlock_reason ?? ""
  );

  // Bank edit state
  const [bankForm, setBankForm] = useState({
    bank_name: e.bankName || (rawE as any).bank_name || "",
    bank_account: e.bankAccount || (rawE as any).bank_account || "",
    ifsc: e.ifsc || (rawE as any).ifsc || "",
  });

  // Statutory edit state
  const [statutoryForm, setStatutoryForm] = useState({
    pan: e.pan || (rawE as any).pan || "",
    aadhaar: e.aadhaar || (rawE as any).aadhaar || "",
    uan: e.uan || (rawE as any).uan || "",
    esi: e.esi || (rawE as any).esi || "",
  });

  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [isSubmittingUnlock, setIsSubmittingUnlock] = useState(false);

  // Document upload state
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("ID Proof");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const handleSaveDetails = async () => {
    setIsSavingDetails(true);
    try {
      const payload = {
        ...bankForm,
        ...statutoryForm,
      };
      const res = await employeesApi.updateProfileDetails(rawE.id, payload);
      toast.success(res.message || "Profile details saved and locked successfully!");
      setProfileUnlocked(res.profile_edit_unlocked ?? false);
      setUnlockRequested(false);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile details");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleRequestUnlock = async () => {
    if (!requestReason.trim()) {
      toast.error("Please enter a reason for requesting profile edit permission.");
      return;
    }
    setIsSubmittingUnlock(true);
    try {
      const res = await employeesApi.requestProfileUnlock(rawE.id, requestReason);
      toast.success(res.message || "Unlock request sent to your manager!");
      setUnlockRequested(true);
      setUnlockReason(requestReason);
      setUnlockModalOpen(false);
      setRequestReason("");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit unlock request");
    } finally {
      setIsSubmittingUnlock(false);
    }
  };

  const handleApproveUnlock = async () => {
    try {
      const res = await employeesApi.approveProfileUnlock(rawE.id);
      toast.success(res.message || "Profile unlocked successfully!");
      setProfileUnlocked(true);
      setUnlockRequested(false);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve unlock");
    }
  };

  const handleRejectUnlock = async () => {
    try {
      const res = await employeesApi.rejectProfileUnlock(rawE.id, "Declined by manager");
      toast.info(res.message || "Profile unlock request rejected.");
      setUnlockRequested(false);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject unlock");
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile) {
      toast.error("Please choose a file to upload.");
      return;
    }
    setIsUploadingDoc(true);
    try {
      const newDoc = await employeesApi.uploadDocument(rawE.id, uploadFile, uploadDocType);
      toast.success("Document uploaded successfully!");
      setDocs((prev) => [...prev, newDoc]);
      setDocUploadOpen(false);
      setUploadFile(null);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const [tab, setTab] = useState("personal");
  const [ctc, setCtc] = useState(e.ctc || 0);
  const [structureId, setStructureId] = useState(
    e.salaryStructure ? String(e.salaryStructure) : "",
  );
  const [taxRegime, setTaxRegime] = useState(e.taxRegime || "New");
  const [taxSavingDeductions, setTaxSavingDeductions] = useState(e.taxSavingDeductions || "0.00");
  const [isSaving, setIsSaving] = useState(false);
  const [newManagerId, setNewManagerId] = useState("");
  const [isSavingManager, setIsSavingManager] = useState(false);
  const [resetPassOpen, setResetPassOpen] = useState(false);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  React.useEffect(() => {
    if (tab === "logs") {
      setLoadingLogs(true);
      employeesApi
        .getAuditLogs(rawE.id)
        .then((res) => setAuditLogs(res))
        .catch((err) => console.error("Failed to load audit logs", err))
        .finally(() => setLoadingLogs(false));
    }
  }, [tab, rawE.id]);

  const [docs, setDocs] = useState<any[]>(
    Array.isArray(initialDocs) ? initialDocs : (initialDocs as any)?.results || [],
  );

  // Salary Revisions State
  const [revisions, setRevisions] = useState<CompensationHistory[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionForm, setRevisionForm] = useState({
    new_ctc: ctc,
    hike_percentage: 0,
    effective_from: new Date().toISOString().split("T")[0],
    revision_type: "Annual Appraisal",
    salary_structure_id: structureId,
    reason: "",
    notes: "",
  });
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  const fetchRevisions = async () => {
    try {
      setLoadingRevisions(true);
      const res = await employeesApi.getSalaryRevisions(rawE.id);
      setRevisions(res || []);
    } catch (err) {
      console.error("Failed to load salary revisions", err);
    } finally {
      setLoadingRevisions(false);
    }
  };

  React.useEffect(() => {
    if (tab === "payroll") {
      fetchRevisions();
    }
  }, [tab, rawE.id]);

  const handleOpenRevisionModal = () => {
    setRevisionForm({
      new_ctc: ctc,
      hike_percentage: 0,
      effective_from: new Date().toISOString().split("T")[0],
      revision_type: "Annual Appraisal",
      salary_structure_id: structureId,
      reason: "",
      notes: "",
    });
    setRevisionModalOpen(true);
  };

  const handleNewCtcChange = (newVal: number) => {
    const oldCtc = Number(ctc || 0);
    const hike = oldCtc > 0 ? Number((((newVal - oldCtc) / oldCtc) * 100).toFixed(2)) : 0;
    setRevisionForm((prev) => ({
      ...prev,
      new_ctc: newVal,
      hike_percentage: hike,
    }));
  };

  const handleHikePctChange = (hikeVal: number) => {
    const oldCtc = Number(ctc || 0);
    const calculatedNew = Math.round(oldCtc * (1 + hikeVal / 100));
    setRevisionForm((prev) => ({
      ...prev,
      new_ctc: calculatedNew,
      hike_percentage: hikeVal,
    }));
  };

  const handleReviseSalary = async () => {
    if (!revisionForm.new_ctc || revisionForm.new_ctc <= 0) {
      toast.error("Please enter a valid new CTC");
      return;
    }
    if (!revisionForm.effective_from) {
      toast.error("Please select an effective date");
      return;
    }
    try {
      setIsSubmittingRevision(true);
      const res = await employeesApi.reviseSalary(rawE.id, revisionForm);
      setCtc(res.employee.current_ctc);
      if (res.employee.salary_structure_id) {
        setStructureId(String(res.employee.salary_structure_id));
      }
      toast.success(res.message || "Salary revision recorded successfully");
      if (res.is_retroactive && res.retro_notice) {
        toast.info(res.retro_notice);
      }
      setRevisionModalOpen(false);
      await fetchRevisions();
    } catch (err: any) {
      toast.error(err.message || "Failed to record salary revision");
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const handleSavePayroll = async () => {
    try {
      setIsSaving(true);
      await employeesApi.update(e.id, {
        ctc,
        salaryStructure: structureId || null,
        taxRegime,
        taxSavingDeductions: parseFloat(String(taxSavingDeductions || "0")).toFixed(2),
      });
      toast.success("Payroll details saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save payroll details");
    } finally {
      setIsSaving(false);
    }
  };

  const deptsArray = Array.isArray(depts) ? depts : (depts as any)?.results || [];
  const desgsArray = Array.isArray(desgs) ? desgs : (desgs as any)?.results || [];
  const branchesArray = Array.isArray(branches) ? branches : (branches as any)?.results || [];
  const sitesArray = Array.isArray(sites) ? sites : (sites as any)?.results || [];
  const entitiesArray = Array.isArray(entities) ? entities : (entities as any)?.results || [];
  const allEmpsArray = Array.isArray(allEmps) ? allEmps : (allEmps as any)?.results || [];
  const structuresArray = Array.isArray(structures)
    ? structures
    : (structures as any)?.results || [];

  const dept = deptsArray.find((d: any) => String(d.id) === String(e.department));
  const desg = desgsArray.find((d: any) => String(d.id) === String(e.designation));
  const branch = branchesArray.find((b: any) => String(b.id) === String(e.branch));
  const site = sitesArray.find((s: any) => String(s.id) === String(e.site));
  const entity = entitiesArray.find((en: any) => String(en.id) === String(e.entity));

  const manager = e.manager
    ? allEmpsArray.find((x: any) => String(x.id) === String(e.manager))
    : null;
  const managerName = manager
    ? `${manager.firstName || (manager as any).first_name || ""} ${manager.lastName || (manager as any).last_name || ""}`.trim()
    : "—";
  const managerDesg = manager
    ? desgsArray.find((d: any) => String(d.id) === String(manager.designation))?.title
    : null;
  const managerDisplay = manager ? `${managerName}${managerDesg ? ` (${managerDesg})` : ""}` : "—";

  const canResetCredentials = useMemo(() => {
    if (!user) return false;
    if (user.is_superuser) return true;
    const dynamicRole = user.dynamic_role;
    if (["Corporate", "Region"].includes(dynamicRole?.access_scope)) return true;
    if (dynamicRole?.can_manage_users) return true;
    const perms = user.permissions || dynamicRole?.permissions || {};
    return Boolean(perms["Employees"]?.update || perms["Employees"]?.manage);
  }, [user]);

  const handleSaveManager = async () => {
    if (!newManagerId) {
      toast.error("Please select a new manager.");
      return;
    }
    setIsSavingManager(true);
    try {
      await employeesApi.update(e.id, { manager: parseInt(newManagerId, 10) });
      toast.success("Manager reassigned successfully!");
      router.invalidate();
      setNewManagerId("");
    } catch (err: any) {
      toast.error("Failed to reassign manager: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingManager(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/employees"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1" />
        Back to Employees
      </Link>

      <Card className="p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {e.firstName?.[0] || ""}
              {e.lastName?.[0] || ""}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">
                {e.firstName} {e.lastName}
              </h1>
              <Badge
                className={
                  e.status === "Active"
                    ? "bg-success text-success-foreground"
                    : "bg-warning text-warning-foreground"
                }
              >
                {e.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {desg?.title} • {dept?.name} • {entity?.name}
            </p>
            <div className="flex flex-wrap gap-4 text-sm mt-3 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {e.phone}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {branch?.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Joined {e.doj}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Code: {e.code}</div>
            {canResetCredentials && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 text-xs gap-1.5"
                onClick={() => setResetPassOpen(true)}
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                Reset Password
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div>
        <div className="flex overflow-x-auto border-b mb-6 no-scrollbar">
          <TabButton
            active={tab === "personal"}
            onClick={() => setTab("personal")}
            icon={<User className="h-3.5 w-3.5 mr-1" />}
            label="Personal"
          />
          <TabButton
            active={tab === "employment"}
            onClick={() => setTab("employment")}
            icon={<Briefcase className="h-3.5 w-3.5 mr-1" />}
            label="Employment"
          />
          {canViewConfidential && (
            <TabButton
              active={tab === "payroll"}
              onClick={() => setTab("payroll")}
              icon={<Landmark className="h-3.5 w-3.5 mr-1" />}
              label="Payroll & CTC"
            />
          )}
          <TabButton
            active={tab === "bank"}
            onClick={() => setTab("bank")}
            icon={<Landmark className="h-3.5 w-3.5 mr-1" />}
            label="Bank"
          />
          <TabButton
            active={tab === "statutory"}
            onClick={() => setTab("statutory")}
            icon={<FileText className="h-3.5 w-3.5 mr-1" />}
            label="Statutory"
          />
          <TabButton
            active={tab === "documents"}
            onClick={() => setTab("documents")}
            icon={<Upload className="h-3.5 w-3.5 mr-1" />}
            label="Documents"
          />
          <TabButton active={tab === "manager"} onClick={() => setTab("manager")} label="Manager" />
          <TabButton
            active={tab === "location"}
            onClick={() => setTab("location")}
            icon={<Building2 className="h-3.5 w-3.5 mr-1" />}
            label="Location"
          />
          <TabButton
            active={tab === "site"}
            onClick={() => setTab("site")}
            icon={<MapPin className="h-3.5 w-3.5 mr-1" />}
            label="Site"
          />
          <TabButton
            active={tab === "logs"}
            onClick={() => setTab("logs")}
            icon={<Calendar className="h-3.5 w-3.5 mr-1" />}
            label="Logs"
          />
        </div>

        {tab === "personal" && (
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="First Name" value={e.firstName} />
            <FieldRO label="Last Name" value={e.lastName} />
            <FieldRO label="Email" value={e.email} />
            <FieldRO label="Phone" value={e.phone} />
            <FieldRO label="Date of Birth" value={e.dob || "—"} />
            <FieldRO label="Gender" value={e.gender} />
            <div className="sm:col-span-2">
              <FieldRO label="Address" value={e.address || "—"} />
            </div>
          </Card>
        )}

        {tab === "logs" && (
          <Card className="p-6 space-y-6">
            <h3 className="font-semibold text-lg border-b pb-2">Audit Logs</h3>
            {loadingLogs ? (
              <div className="text-center py-4 text-muted-foreground animate-pulse">
                Loading audit logs...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldRO
                  label="Created On"
                  value={
                    (e as any).createdAt || (e as any).created_at
                      ? new Date((e as any).createdAt || (e as any).created_at).toLocaleString()
                      : "—"
                  }
                />
                <FieldRO
                  label="Last Updated"
                  value={
                    (e as any).updatedAt || (e as any).updated_at
                      ? new Date((e as any).updatedAt || (e as any).updated_at).toLocaleString()
                      : "—"
                  }
                />
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground mt-4 italic">
                    No detailed audit trail available for this record yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border rounded-md p-4 bg-slate-50">
                    <div className="flex justify-between items-start border-b pb-2 mb-3">
                      <div>
                        <Badge
                          variant={log.action === "Create" ? "default" : "secondary"}
                          className="mb-1"
                        >
                          {log.action}
                        </Badge>
                        <p className="text-sm text-slate-600">
                          Performed by <span className="font-semibold">{log.performed_by}</span>
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(log.changes || {}).map(([field, vals]: [string, any]) => {
                        const isPromotion = field === "designation" || field === "role";
                        return (
                          <div
                            key={field}
                            className={`text-sm grid grid-cols-[140px_1fr] gap-2 items-center p-1.5 rounded ${
                              isPromotion ? "bg-emerald-500/10 border border-emerald-500/20" : ""
                            }`}
                          >
                            <span className="font-medium text-slate-700 capitalize flex items-center gap-1.5">
                              {field.replace(/_/g, " ")}:
                              {isPromotion && (
                                <Badge className="text-[10px] h-4 px-1.5 bg-emerald-600 text-white font-normal">
                                  Promotion / Role Change
                                </Badge>
                              )}
                            </span>
                            {vals.old !== undefined || vals.new !== undefined ? (
                              <span className="text-slate-600">
                                <span className="line-through text-red-500 mr-2 font-medium">
                                  {vals.old || "None"}
                                </span>
                                <ArrowLeft className="inline w-3 h-3 mx-1 text-slate-400 rotate-180" />
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold ml-2">
                                  {vals.new || "None"}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-600">{vals}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <FieldRO label="Worker Classification" value={e.workerType || e.worker_type || "Salaried"} />
            <FieldRO label="Group Category" value={e.groupCategory || e.group_category || "General"} />
            <FieldRO label="Grade Category" value={e.gradeCategory || e.grade_category || "Unassigned"} />
            <FieldRO label="Reporting Manager" value={managerName} />
          </Card>
        )}

        {tab === "payroll" && canViewConfidential && (
          <div className="space-y-6">
            {/* Primary Compensation Card */}
            <Card className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Current Compensation & Structure
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Authorized CTC, tax regime settings, and baseline payroll configuration.
                  </p>
                </div>
                {canEditCTC && (
                  <Button
                    onClick={handleOpenRevisionModal}
                    className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs h-9"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Revise Salary / Grant Hike
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Annual CTC
                  </span>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {fmtINR(ctc)}
                  </p>
                  <span className="text-xs text-muted-foreground">Cost to Company</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Monthly Gross
                  </span>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {fmtINR(Math.round(ctc / 12))}
                  </p>
                  <span className="text-xs text-muted-foreground">Estimated pre-deduction</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Assigned Structure
                  </span>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                    {structuresArray.find((s: any) => String(s.id) === String(structureId))?.name || "Unassigned"}
                  </p>
                  <span className="text-xs text-muted-foreground">Component rules template</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Assigned Salary Structure</Label>
                  <select
                    disabled={!canEditCTC}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={structureId}
                    onChange={(ev) => setStructureId(ev.target.value)}
                  >
                    <option value="">-- No Structure Assigned --</option>
                    {structuresArray.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Tax Regime</Label>
                  <select
                    disabled={!canEditCTC}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={taxRegime}
                    onChange={(ev) => setTaxRegime(ev.target.value)}
                  >
                    <option value="New">New Regime (FY 26-27 standard)</option>
                    <option value="Old">Old Regime (with itemized deductions)</option>
                  </select>
                </div>

                {taxRegime === "Old" && (
                  <div className="space-y-1.5">
                    <Label>Tax Saving Deductions (₹)</Label>
                    <Input
                      type="number"
                      disabled={!canEditCTC}
                      value={taxSavingDeductions}
                      onChange={(ev) => setTaxSavingDeductions(ev.target.value)}
                    />
                  </div>
                )}
              </div>

              {canEditCTC && (
                <div className="pt-2">
                  <Button onClick={handleSavePayroll} disabled={isSaving} variant="outline" size="sm">
                    {isSaving ? "Saving..." : "Save Tax & Structure Assignment"}
                  </Button>
                </div>
              )}
            </Card>

            {/* Salary Revision & Hike History Card */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    Salary Revision & Hike History
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Chronological compensation audit trail with percentage hikes and effective date tracking.
                  </p>
                </div>
              </div>

              {loadingRevisions ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Loading revision history...</div>
              ) : revisions.length === 0 ? (
                <div className="py-8 text-center border rounded-lg bg-slate-50/50">
                  <p className="text-xs text-muted-foreground">No salary revision history recorded yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Use "Revise Salary / Grant Hike" above to grant appraisals or promotions.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                      <tr>
                        <th className="p-2.5 text-left">Effective Date</th>
                        <th className="p-2.5 text-left">Revision Type</th>
                        <th className="p-2.5 text-right">Previous CTC</th>
                        <th className="p-2.5 text-right">Revised CTC</th>
                        <th className="p-2.5 text-right">Hike</th>
                        <th className="p-2.5 text-left">Structure</th>
                        <th className="p-2.5 text-left">Changed By</th>
                        <th className="p-2.5 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {revisions.map((rev, idx) => {
                        const isLatest = idx === 0 && !rev.effectiveTo;
                        const hikeAmt = Number(rev.ctc) - Number(rev.previousCtc);
                        return (
                          <tr key={rev.id} className="hover:bg-muted/20">
                            <td className="p-2.5 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{rev.effectiveFrom}</span>
                                {isLatest && (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0 h-4">
                                    Active
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5">{rev.revisionType || "Annual Appraisal"}</td>
                            <td className="p-2.5 text-right text-muted-foreground font-mono">
                              {rev.previousCtc ? fmtINR(rev.previousCtc) : "—"}
                            </td>
                            <td className="p-2.5 text-right font-bold font-mono">{fmtINR(rev.ctc)}</td>
                            <td className="p-2.5 text-right font-medium text-emerald-600 whitespace-nowrap">
                              {hikeAmt > 0 ? `+${fmtINR(hikeAmt)} (+${rev.hikePercentage}%)` : "0%"}
                            </td>
                            <td className="p-2.5 text-muted-foreground">{rev.salaryStructureName || "Standard"}</td>
                            <td className="p-2.5 text-muted-foreground">{rev.changedByName || "System"}</td>
                            <td className="p-2.5 text-muted-foreground max-w-[150px] truncate" title={rev.notes || rev.reason || ""}>
                              {rev.notes || rev.reason || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Revise Salary Dialog */}
            <Dialog open={revisionModalOpen} onOpenChange={setRevisionModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Revise Salary / Grant Hike
                  </DialogTitle>
                  <DialogDescription>
                    Record a formal compensation revision with percentage tracking and effective dates.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  <div className="p-3 bg-muted/40 rounded-lg border flex justify-between items-center">
                    <div>
                      <span className="text-muted-foreground">Current Annual CTC:</span>
                      <p className="text-base font-bold text-foreground mt-0.5">{fmtINR(ctc)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {fmtINR(Math.round(ctc / 12))}/mo
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">New Annual CTC (₹)</Label>
                      <Input
                        type="number"
                        value={revisionForm.new_ctc}
                        onChange={(e) => handleNewCtcChange(+e.target.value)}
                        className="h-9 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Hike (%)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={revisionForm.hike_percentage}
                          onChange={(e) => handleHikePctChange(+e.target.value)}
                          className="h-9 text-xs pr-7 font-semibold text-emerald-600"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Effective From Date</Label>
                    <Input
                      type="date"
                      value={revisionForm.effective_from}
                      onChange={(e) => setRevisionForm({ ...revisionForm, effective_from: e.target.value })}
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Backdating before current month will flag arrears for automatic calculation.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Revision Type / Category</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                      value={revisionForm.revision_type}
                      onChange={(e) => setRevisionForm({ ...revisionForm, revision_type: e.target.value })}
                    >
                      <option value="Annual Appraisal">Annual Appraisal</option>
                      <option value="Promotion">Promotion</option>
                      <option value="Market Correction">Market Correction</option>
                      <option value="Role Change">Role Change / Lateral Move</option>
                      <option value="Probation Confirmation">Probation Confirmation</option>
                      <option value="Ad-hoc Revision">Ad-hoc Revision</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Assigned Salary Structure</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                      value={revisionForm.salary_structure_id}
                      onChange={(e) => setRevisionForm({ ...revisionForm, salary_structure_id: e.target.value })}
                    >
                      <option value="">-- Keep Current Structure --</option>
                      {structuresArray.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Reason / Justification Notes</Label>
                    <Input
                      placeholder="e.g. Excellent performance in FY26 Q4; promoted to Senior Lead"
                      value={revisionForm.notes}
                      onChange={(e) => setRevisionForm({ ...revisionForm, notes: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setRevisionModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReviseSalary}
                    disabled={isSubmittingRevision}
                    className="bg-[#0f172a] hover:bg-[#1e293b] text-white"
                  >
                    {isSubmittingRevision ? "Recording..." : "Record Salary Revision"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Helper Banner for Profile Lock / Unlock Governance */}
        {(tab === "bank" || tab === "statutory" || tab === "documents") && (
          <div className="mb-4">
            {profileUnlocked ? (
              <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                    <Unlock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      Profile Self-Service Unlocked {((e.profileEditCount ?? 0) === 0) ? "(One-Time Initial Onboarding)" : "(Approved by Manager)"}
                    </p>
                    <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300">
                      You have full access to enter your bank details, statutory numbers, and upload documents. Saving changes will lock your details.
                    </p>
                  </div>
                </div>
                {(isOwnProfile || isManagerOrAdmin) && (
                  <Button
                    size="sm"
                    onClick={handleSaveDetails}
                    disabled={isSavingDetails}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 shrink-0 gap-1.5 shadow-none"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isSavingDetails ? "Saving & Locking..." : "Save & Lock Details"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                      Profile Details Locked
                    </p>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300">
                      Bank details, statutory numbers, and document uploads are locked. If you need to make corrections, submit an unlock request to your manager.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {unlockRequested ? (
                    <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-xs py-1 px-2.5 gap-1.5 font-medium">
                      <Loader2 className="h-3 w-3 animate-spin text-amber-600" /> Pending Manager Approval
                    </Badge>
                  ) : isOwnProfile ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setUnlockModalOpen(true)}
                      className="border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs h-8 gap-1.5"
                    >
                      <Lock className="h-3.5 w-3.5" /> Request Manager to Unlock
                    </Button>
                  ) : null}
                  {isManagerOrAdmin && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleApproveUnlock}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5"
                      >
                        <Unlock className="h-3.5 w-3.5" /> {unlockRequested ? "Approve Unlock" : "Unlock for Employee"}
                      </Button>
                      {unlockRequested && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRejectUnlock}
                          className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-8 gap-1"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "bank" && (
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" /> Bank Account Details
                </h3>
                <p className="text-xs text-muted-foreground">Salary disbursement and direct deposit details.</p>
              </div>
              {profileUnlocked && (isOwnProfile || isManagerOrAdmin) && (
                <Button
                  size="sm"
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8"
                >
                  {isSavingDetails ? "Saving..." : "Save & Lock Bank Details"}
                </Button>
              )}
            </div>

            {profileUnlocked && (isOwnProfile || isManagerOrAdmin) ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bank Name</Label>
                  <Input
                    value={bankForm.bank_name}
                    onChange={(ev) => setBankForm({ ...bankForm, bank_name: ev.target.value })}
                    placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bank Account Number</Label>
                  <Input
                    value={bankForm.bank_account}
                    onChange={(ev) => setBankForm({ ...bankForm, bank_account: ev.target.value })}
                    placeholder="e.g. 50100234567890"
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">IFSC Code</Label>
                  <Input
                    value={bankForm.ifsc}
                    onChange={(ev) => setBankForm({ ...bankForm, ifsc: ev.target.value.toUpperCase() })}
                    placeholder="e.g. HDFC0001234"
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldRO label="Bank" value={bankForm.bank_name || e.bankName || "—"} />
                <FieldRO label="Account Number" value={bankForm.bank_account || e.bankAccount || "—"} />
                <FieldRO label="IFSC" value={bankForm.ifsc || e.ifsc || "—"} />
              </div>
            )}
          </Card>
        )}

        {tab === "statutory" && (
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Statutory & Compliance Identifiers
                </h3>
                <p className="text-xs text-muted-foreground">PAN, Aadhaar, Provident Fund UAN, and ESIC compliance numbers.</p>
              </div>
              {profileUnlocked && (isOwnProfile || isManagerOrAdmin) && (
                <Button
                  size="sm"
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8"
                >
                  {isSavingDetails ? "Saving..." : "Save & Lock Statutory Details"}
                </Button>
              )}
            </div>

            {profileUnlocked && (isOwnProfile || isManagerOrAdmin) ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">PAN (Permanent Account Number)</Label>
                  <Input
                    value={statutoryForm.pan}
                    onChange={(ev) => setStatutoryForm({ ...statutoryForm, pan: ev.target.value.toUpperCase() })}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Aadhaar Number</Label>
                  <Input
                    value={statutoryForm.aadhaar}
                    onChange={(ev) => setStatutoryForm({ ...statutoryForm, aadhaar: ev.target.value })}
                    placeholder="e.g. 1234 5678 9012"
                    maxLength={14}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">UAN (Universal Account Number - PF)</Label>
                  <Input
                    value={statutoryForm.uan}
                    onChange={(ev) => setStatutoryForm({ ...statutoryForm, uan: ev.target.value })}
                    placeholder="e.g. 100123456789"
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ESIC Insurance Number</Label>
                  <Input
                    value={statutoryForm.esi}
                    onChange={(ev) => setStatutoryForm({ ...statutoryForm, esi: ev.target.value })}
                    placeholder="e.g. 31001234560000001"
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <FieldRO label="TDS Status" value={(e.tdsApplicable ?? e.tds_applicable) ? `Active (${e.tdsSection || e.tds_section || '194J'} @ ${e.tdsRate ?? e.tds_rate ?? 10}%)` : "Exempt / Off (Full Pay)"} />
                <FieldRO label="PF Applicable" value={(e.pfApplicable ?? e.pf_applicable) ? "Yes" : "No"} />
                {(e.tdsLowerDeductionCert || e.tds_lower_deduction_cert) && (
                  <FieldRO label="Section 197 Cert" value={e.tdsLowerDeductionCert || e.tds_lower_deduction_cert} />
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldRO label="PAN" value={statutoryForm.pan || e.pan || "—"} />
                <FieldRO label="Aadhaar" value={statutoryForm.aadhaar || e.aadhaar || "—"} />
                <FieldRO label="TDS Status" value={(e.tdsApplicable ?? e.tds_applicable) ? `Active (${e.tdsSection || e.tds_section || '194J'} @ ${e.tdsRate ?? e.tds_rate ?? 10}%)` : "Exempt / Off (Full Pay)"} />
                <FieldRO label="PF Applicable" value={(e.pfApplicable ?? e.pf_applicable) ? "Yes" : "No"} />
                <FieldRO label="UAN (PF)" value={statutoryForm.uan || e.uan || "—"} />
                <FieldRO label="ESI Number" value={statutoryForm.esi || e.esi || "—"} />
                {(e.tdsLowerDeductionCert || e.tds_lower_deduction_cert) && (
                  <FieldRO label="Section 197 Cert" value={e.tdsLowerDeductionCert || e.tds_lower_deduction_cert} />
                )}
              </div>
            )}
          </Card>
        )}

        {tab === "documents" && (
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" /> Uploaded Documents & Records
                </h3>
                <p className="text-xs text-muted-foreground">ID proofs, passbooks, and certificates attached to this profile.</p>
              </div>
              {profileUnlocked && (isOwnProfile || isManagerOrAdmin) ? (
                <Button
                  size="sm"
                  onClick={() => setDocUploadOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white text-xs h-8 gap-1.5"
                >
                  <FilePlus className="h-3.5 w-3.5" /> Upload Document
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-600" /> Upload locked
                </span>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {docs.map((d) => (
                <div key={d.id} className="p-4 rounded-md border flex items-center justify-between bg-card">
                  <div className="min-w-0 pr-2">
                    <div className="text-sm font-medium truncate">
                      {d.documentType || d.document_type}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{d.name}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" asChild>
                      <a href={getMediaUrl(d.file)} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                    {(profileUnlocked || isManagerOrAdmin) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete this document?")) {
                            try {
                              await employeesApi.deleteDocument(d.id);
                              setDocs(docs.filter((doc) => doc.id !== d.id));
                              toast.success("Document deleted");
                            } catch (e: any) {
                              toast.error(e.message || "Failed to delete document");
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {docs.length === 0 && (
                <div className="text-muted-foreground text-sm col-span-3 py-6 text-center">
                  No documents uploaded for this employee yet.
                </div>
              )}
            </div>
          </Card>
        )}

        {tab === "manager" && (
          <Card className="p-6 space-y-4">
            <FieldRO label="Reporting Manager" value={managerDisplay} />
            <div className="pt-4 border-t space-y-3">
              <Label>Reassign Manager</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newManagerId}
                onChange={(ev) => setNewManagerId(ev.target.value)}
              >
                <option value="">-- Select New Manager --</option>
                {allEmpsArray
                  .filter((x: any) => String(x.id) !== String(e.id))
                  .map((emp: any) => {
                    const empName =
                      `${emp.firstName || emp.first_name || ""} ${emp.lastName || emp.last_name || ""}`.trim();
                    const empDesg =
                      desgsArray.find((d: any) => String(d.id) === String(emp.designation))
                        ?.title || "No Designation";
                    return (
                      <option key={emp.id} value={emp.id}>
                        {empName} ({empDesg}) - {emp.code}
                      </option>
                    );
                  })}
              </select>
              <Button onClick={handleSaveManager} disabled={isSavingManager || !newManagerId}>
                {isSavingManager ? "Saving..." : "Reassign Manager"}
              </Button>
            </div>
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
            <FieldRO
              label="Coordinates"
              value={
                site && site.latitude != null && site.longitude != null
                  ? `${Number(site.latitude).toFixed(4)}, ${Number(site.longitude).toFixed(4)}`
                  : "—"
              }
            />
            <FieldRO label="QR Enabled" value={site?.qrEnabled ? "Yes" : "No"} />
            <FieldRO label="Face Verification" value={site?.faceEnabled ? "Yes" : "No"} />
          </Card>
        )}
      </div>
      {/* Request Unlock Modal */}
      <Dialog open={unlockModalOpen} onOpenChange={setUnlockModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Lock className="w-4 h-4 text-amber-500" />
              Request Manager Approval to Edit Profile
            </DialogTitle>
            <DialogDescription className="text-xs">
              State the reason for requesting edit access (e.g. changed salary bank account, updating PAN/Aadhaar card, or uploading documents). Your manager will receive an immediate notification with one-click approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs">Reason for Edit Request</Label>
            <textarea
              className="w-full min-h-[90px] rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Opened new salary account in HDFC; need to upload updated passbook and update IFSC/Account."
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setUnlockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRequestUnlock}
              disabled={isSubmittingUnlock}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
            >
              {isSubmittingUnlock ? "Sending Request..." : "Send Request to Manager"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Upload Modal */}
      <Dialog open={docUploadOpen} onOpenChange={setDocUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Upload className="w-4 h-4 text-primary" />
              Upload Employee Document
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload identity proof, bank passbook/cheque, degree certificates, or compliance forms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Document Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                value={uploadDocType}
                onChange={(e) => setUploadDocType(e.target.value)}
              >
                <option value="ID Proof">ID Proof</option>
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Bank Passbook / Cheque">Bank Passbook / Cheque</option>
                <option value="Experience Certificate">Experience Certificate</option>
                <option value="Education Certificate">Education Certificate</option>
                <option value="Offer Letter">Offer Letter</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Select File</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Supported: PDF, PNG, JPG, DOCX (Max 10MB)</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDocUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUploadDocument}
              disabled={isUploadingDoc || !uploadFile}
              className="bg-primary hover:bg-primary/90 text-white text-xs"
            >
              {isUploadingDoc ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResetPasswordDialog
        open={resetPassOpen}
        onOpenChange={setResetPassOpen}
        employee={rawE}
        onSuccess={() => router.invalidate()}
      />
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function FieldRO({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value || "—"}</div>
    </div>
  );
}
