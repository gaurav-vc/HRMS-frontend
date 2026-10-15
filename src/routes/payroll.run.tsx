import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, Fragment, useMemo } from "react";
import { toast } from "sonner";
import {
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Rocket,
  ArrowLeft,
  ArrowRight,
  FileCheck2,
  CalendarRange,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Settings2,
  Pencil,
  X,
  Loader2,
  FileSpreadsheet,
  Eye,
  Mail,
  History,
  Info,
  ExternalLink,
  Users,
  Sliders,
  Banknote,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fmtINR } from "@/lib/mock-data";
import { payrollApi, employeesApi, entitiesApi } from "@/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/payroll/run")({
  loader: async () => {
    const [employees, payrollRuns, entities] = await Promise.all([
      employeesApi.getAll().catch(() => []),
      payrollApi.getRuns().catch(() => []),
      entitiesApi.getAll().catch(() => []),
    ]);
    return { employees, payrollRuns, entities };
  },
  component: RunPage,
});

function RunPage() {
  const [isConfirming, setIsConfirming] = useState(false);
  const { user, refreshUser } = useAuth();
  const { payrollRuns: initialRuns } = Route.useLoaderData();
  const [runs, setRuns] = useState<any[]>(initialRuns || []);

  const refreshRuns = async () => {
    try {
      const latest = await payrollApi.getRuns();
      setRuns(Array.isArray(latest) ? latest : (latest as any)?.results || []);
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    setRuns(initialRuns || []);
  }, [initialRuns]);

  useEffect(() => {
    if (refreshUser) {
      refreshUser();
    }
    const timer = setInterval(refreshRuns, 15000);
    return () => clearInterval(timer);
  }, []);

  const canViewConfidential =
    user?.permissions?.can_view_confidential_payroll === true ||
    user?.permissions?.can_view_confidential === true ||
    user?.permissions?.can_view_confidential_payroll === "true";
  const canApprove =
    user?.permissions?.can_approve_payroll === true ||
    user?.permissions?.can_approve_payroll === "true";

  // Role based check for Maker
  const isMaker =
    user?.permissions?.can_run_payroll === true ||
    user?.permissions?.can_process_payroll === true ||
    user?.permissions?.can_run_payroll === "true";

  return (
    <>
      {!isConfirming && (
        <PageHeader
          title={isMaker ? "Run Payroll" : canApprove ? "Payroll Approvals" : "Payroll"}
          description={
            isMaker
              ? (user?.role_name ? `One-click ${user.role_name} mode or step-by-step HR wizard` : "One-click mode or step-by-step HR wizard")
              : canApprove
              ? "Review and approve pending payroll runs"
              : "Access restricted"
          }
          actions={
            <Link to="/payroll">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
          }
        />
      )}
      <Tabs defaultValue={isMaker ? "oneclick" : canApprove ? "approvals" : ""}>
        {!isConfirming && (isMaker || canApprove) && (
          <TabsList
            className={`grid w-full max-w-xl h-11 ${
              isMaker && canApprove
                ? "grid-cols-3"
                : isMaker
                ? "grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {isMaker && (
              <>
                <TabsTrigger value="oneclick" className="text-sm">
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  One-Click
                </TabsTrigger>
                <TabsTrigger value="wizard" className="text-sm">
                  <FileCheck2 className="h-4 w-4 mr-1.5" />
                  HR Wizard
                </TabsTrigger>
              </>
            )}
            {canApprove && (
              <TabsTrigger value="approvals" className="text-sm relative">
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Approvals
              </TabsTrigger>
            )}
          </TabsList>
        )}
        {isMaker && (
          <>
            <TabsContent value="oneclick">
              <OneClickPanel
                onConfirmChange={setIsConfirming}
                canViewConfidential={canViewConfidential}
              />
            </TabsContent>
            <TabsContent value="wizard">
              <WizardPanel canViewConfidential={canViewConfidential} />
            </TabsContent>
          </>
        )}
        {canApprove && (
          <TabsContent value="approvals">
            <ApprovalsPanel
              pendingRuns={runs.filter(
                (r: any) => ["Maker-Submitted", "Disbursed", "Rejected", "Frozen"].includes(r.status) && r.employees > 0,
              )}
              canViewConfidential={canViewConfidential}
              canApprove={canApprove}
              onRefresh={refreshRuns}
            />
          </TabsContent>
        )}
        {!isMaker && !canApprove && (
          <div className="py-20 mt-8 text-center bg-card border rounded-lg shadow-sm">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-foreground">Access Restricted</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              You do not have the required permissions to run or approve payroll. If you believe
              this is an error, please contact your administrator.
            </p>
          </div>
        )}
      </Tabs>
    </>
  );
}

interface MissingEmployeeItem {
  id: number | string;
  code: string;
  name: string;
  department?: string;
  designation?: string;
  entity?: string;
  missing?: string[];
  missing_salary_structure?: boolean;
  missing_ctc?: boolean;
}

function MissingPayrollConfigModal({
  isOpen,
  onClose,
  missingEmployees,
}: {
  isOpen: boolean;
  onClose: () => void;
  missingEmployees: MissingEmployeeItem[];
}) {
  if (!isOpen || missingEmployees.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Configuration Required Before Running Payroll
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                The following active employees are missing essential salary configurations. Please update these records before executing payroll.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold">
              Payroll execution is temporarily held for accuracy and data integrity.
            </p>
            <p className="text-amber-800/80 dark:text-amber-300/80">
              {missingEmployees.length} employee(s) need a Salary Structure or CTC configured. Once assigned, return here and run the payroll again.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto border border-border/80 rounded-lg custom-scrollbar min-h-[160px] max-h-[340px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted text-muted-foreground uppercase text-[10px] sticky top-0 z-10 border-b">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">Employee</th>
                <th className="px-3.5 py-2.5 font-semibold">Department</th>
                <th className="px-3.5 py-2.5 font-semibold">Missing Requirements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {missingEmployees.map((emp) => {
                const missingList = emp.missing || [
                  ...(emp.missing_salary_structure ? ["Salary Structure"] : []),
                  ...(emp.missing_ctc ? ["CTC"] : []),
                ];
                return (
                  <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-foreground">{emp.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{emp.code}</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">
                      {emp.department || "General"}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {(emp.missing_salary_structure || missingList.includes("Salary Structure")) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Sliders className="h-3 w-3" /> Missing Salary Structure
                          </span>
                        )}
                        {(emp.missing_ctc || missingList.includes("CTC")) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Banknote className="h-3 w-3" /> Missing CTC
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {missingEmployees.length} employee record(s) pending configuration
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-initial">
              Dismiss
            </Button>
            <Link
              to="/employees"
              onClick={onClose}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Users className="h-4 w-4" />
              Manage All Employees
            </Link>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STEPS = ["Cutoff", "Validate Inputs", "Calculate", "Review", "Approve & Disburse"];

function getLastDayOfMonth(periodStr: string): string {
  if (!periodStr) return "";
  const [year, month] = periodStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${periodStr}-${String(lastDay).padStart(2, "0")}`;
}

function OneClickPanel({
  onConfirmChange,
  canViewConfidential,
}: {
  onConfirmChange?: (b: boolean) => void;
  canViewConfidential?: boolean;
}) {
  const { user } = useAuth();
  const { employees, payrollRuns, entities } = Route.useLoaderData();
  const last =
    payrollRuns.length > 0
      ? payrollRuns[payrollRuns.length - 1]
      : { gross: 0, deductions: 0, net: 0, period: "No Runs" };
  const [phase, setPhase] = useState<"setup" | "confirm" | "running" | "done">("setup");
  const [pct, setPct] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState("2026-06");
  const [cutoff, setCutoff] = useState("2026-06-25");
  const [selectedEntities, setSelectedEntities] = useState<string[]>(() =>
    entities.map((e: any) => String(e.id)),
  );
  const [includeReimb, setIncludeReimb] = useState(true);
  const [includeLoans, setIncludeLoans] = useState(true);
  const [includeBonus, setIncludeBonus] = useState(true);
  const [includeLeaves, setIncludeLeaves] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);

  const [entityFilter, setEntityFilter] = useState<string>("__all__");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [overrides, setOverrides] = useState<Record<number, any>>({});
  const [arrearsLogs, setArrearsLogs] = useState<string[]>([]);
  const [missingEmployees, setMissingEmployees] = useState<MissingEmployeeItem[]>([]);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);

  const getMissingEmployees = () => {
    // 1. First prioritize previewData if available from backend engine
    if (previewData && previewData.length > 0) {
      const missingFromPreview: MissingEmployeeItem[] = [];
      previewData.forEach((d) => {
        if (entityFilter === "__all__" || d.entity === entityFilter) {
          if (d.missing_employees && Array.isArray(d.missing_employees)) {
            missingFromPreview.push(...d.missing_employees);
          }
        }
      });
      const seen = new Set<string | number>();
      return missingFromPreview.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    }

    // 2. Fallback to active employees in selectedEntities from loader only if preview has not run
    const activeInSelected = employees.filter(
      (e: any) =>
        e.status === "Active" &&
        (selectedEntities.length === 0 || selectedEntities.includes(String(e.entity))),
    );

    const missingList: MissingEmployeeItem[] = [];
    for (const emp of activeInSelected as any[]) {
      const missing: string[] = [];
      if (!emp.ctc || Number(emp.ctc) <= 0) {
        missing.push("CTC");
      }
      if (!emp.salary_structure && !emp.salaryStructure && !emp.salary_structure_name) {
        missing.push("Salary Structure");
      }
      if (missing.length > 0) {
        missingList.push({
          id: emp.id,
          code: emp.code || `EMP${emp.id}`,
          name: `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim() || emp.name || "Employee",
          department: emp.department_name || (typeof emp.department === "string" ? emp.department : "") || "General",
          designation: emp.designation_name || (typeof emp.designation === "string" ? emp.designation : "") || "N/A",
          entity: emp.entity_name || String(emp.entity || ""),
          missing,
          missing_salary_structure: missing.includes("Salary Structure"),
          missing_ctc: missing.includes("CTC"),
        });
      }
    }
    return missingList;
  };

  const missingInCurrentFilter = useMemo(() => {
    return getMissingEmployees();
  }, [previewData, entityFilter, employees, selectedEntities]);

  const handleEditSave = (entityName: string, empId: number) => {
    setPreviewData((prev) =>
      prev.map((d) => {
        if (d.entity !== entityName) return d;
        const newEmployees = d.employeeDetails.map((e: any) => (e.id === empId ? editForm : e));
        return {
          ...d,
          employeeDetails: newEmployees,
          gross: newEmployees.reduce((sum: number, e: any) => sum + Number(e.totalAmount || 0), 0),
          deduction: newEmployees.reduce(
            (sum: number, e: any) => sum + Number(e.deduction || 0),
            0,
          ),
          net: newEmployees.reduce((sum: number, e: any) => sum + Number(e.payableSalary || 0), 0),
        };
      }),
    );
    const cleanOverride = { ...editForm };
    delete cleanOverride.totalAmount;
    delete cleanOverride.deduction;
    delete cleanOverride.payableSalary;
    delete cleanOverride.pf;
    delete cleanOverride.pt;
    delete cleanOverride.currentSalary;
    
    setOverrides((prev) => ({ ...prev, [empId]: cleanOverride }));
    setEditingRow(null);
  };

  const ALL_COLUMNS = [
    { id: "name", label: "Employee Name" },
    { id: "entity", label: "Entity" },
    { id: "department", label: "Department" },
    { id: "acNo", label: "Ac No" },
    { id: "ifscCode", label: "IFSC Code" },
    { id: "currentSalary", label: "Current Salary" },
    { id: "presentDays", label: "Total Days present" },
    { id: "leaves", label: "Annual Leaves" },
    { id: "lopDays", label: "LOP" },
    { id: "halfDays", label: "Half Days" },
    { id: "latePenalties", label: "Late Penalties" },
    { id: "ot", label: "OT (Hours)" },
    { id: "overtimePay", label: "OT Pay" },
    { id: "daysPaid", label: "Payable Days" },
    { id: "totalAmount", label: "Total Amount" },
    { id: "arrears", label: "Arrears" },
    { id: "deduction", label: "Deduction" },
    { id: "pf", label: "PF" },
    { id: "pt", label: "PT" },
    { id: "reimbursement", label: "Reimbursement" },
    { id: "incentive", label: "Incentive" },
    { id: "payableSalary", label: "Payable Salary" },
  ].filter((col) => {
    if (!canViewConfidential) {
      return !["currentSalary", "totalAmount", "arrears", "deduction", "pf", "pt", "reimbursement", "incentive", "payableSalary", "overtimePay"].includes(col.id);
    }
    return true;
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(ALL_COLUMNS.map((c) => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleExportCsv = (entityName: string, employees: any[]) => {
    if (!employees || employees.length === 0) return;
    const headers = ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id)).map((c) => c.label);
    const rows = [headers.join(",")];
    for (const emp of employees) {
      const rowData = ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id)).map((c) => {
        let val = emp[c.id];
        if (typeof val === "number") val = val.toFixed(2);
        return `"${String(val || "").replace(/"/g, '""')}"`;
      });
      rows.push(rowData.join(","));
    }
    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Payroll_Breakdown_${entityName.replace(/\s+/g, "_")}_${period}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("export successfully!");
  };

  const handleReviewAndRun = async () => {
    setPhase("confirm");
    if (onConfirmChange) onConfirmChange(true);
    setIsLoadingPreview(true);
    try {
      const entityParam =
        selectedEntities.length === entities.length ? "__all__" : selectedEntities.join(",");
      const res = await payrollApi.getPreview({
        period,
        entity: entityParam === "__all__" ? undefined : entityParam,
        include_leaves_encashment: includeLeaves,
      });
      setPreviewData(res.data);
      if (res.missing_employees && Array.isArray(res.missing_employees)) {
        setMissingEmployees(res.missing_employees);
      }
    } catch (e: any) {
      toast.error("Failed to fetch preview: " + e.message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const filteredEmployees = useMemo(
    () => employees.filter((e: any) => selectedEntities.includes(String(e.entity))),
    [employees, selectedEntities],
  );
  const empCount = filteredEmployees.length;

  const grossEst = useMemo(
    () => filteredEmployees.reduce((sum: number, emp: any) => sum + (emp.ctc || 0) / 12, 0),
    [filteredEmployees],
  );
  const dedEst = grossEst * 0.1;
  const netEst = grossEst - dedEst;

  const flatEmployees = useMemo(
    () =>
      previewData
        .filter((d) => entityFilter === "__all__" || d.entity === entityFilter)
        .flatMap((d) => {
          return (d.employeeDetails || []).map((emp: any) => ({ ...emp, _entity: d.entity }));
        }),
    [previewData, entityFilter],
  );

  const startEngine = () => {
    const missing = getMissingEmployees();
    if (missing.length > 0) {
      setMissingEmployees(missing);
      setIsMissingModalOpen(true);
      return;
    }

    setPhase("running");
    setPct(0);
    setLogs([]);
    if (onConfirmChange) onConfirmChange(false);

    const messages = [
      `Locking attendance cutoff at ${cutoff}…`,
      `Validating master data for ${employees.length} employees…`,
      "Applying salary structures…",
      "Computing earnings & deductions…",
      includeLoans ? "Processing loan EMI recoveries…" : "Skipping loan recoveries…",
      includeReimb ? "Settling approved reimbursements…" : "Skipping reimbursements…",
      includeBonus ? "Applying variable bonus pay…" : "No bonus payouts for this run…",
      "Calculating PF, ESI, PT, TDS…",
      `Generating ${employees.length} payslips…`,
      "Posting JV to finance…",
      "Preparing NEFT bank file…",
    ];
    let i = 0;
    const t = setInterval(() => {
      i++;
      setLogs((l) => [...l, messages[i - 1]]);
      setPct(Math.min(100, Math.round((i / messages.length) * 100)));
      if (i >= messages.length) {
        clearInterval(t);

        const entitiesWithEmployees = new Set(
          employees
            .filter((e: any) => e.status === "Active" && e.entity)
            .map((e: any) => String(e.entity)),
        );
        const entitiesToRun = selectedEntities.filter((id: string) =>
          entitiesWithEmployees.has(id),
        );

        Promise.all(
          entitiesToRun.map((entId: string) => {
            return payrollApi
              .createRun({
                period,
                entity: entId,
                status: "Draft",
              })
              .then((run: any) => {
                return payrollApi
                .executeRun(run.id, {
                  overrides: Object.values(overrides),
                  include_variable_bonus: includeBonus,
                  include_leaves_encashment: includeLeaves,
                })
                .then((r: any) => {
                  if (r && r.arrearsLogs) {
                    setArrearsLogs(r.arrearsLogs);
                  }
                  return r.data;
                });
              });
          }),
        )
          .then((results) => {
            setPhase("done");
            toast.success("Payroll processed successfully and submitted for review");
          })
          .catch((e: any) => {
            console.error("Engine failed:", e);
            const backendMissing = e.data?.missing_employees || e.response?.data?.missing_employees;
            if (backendMissing && Array.isArray(backendMissing) && backendMissing.length > 0) {
              setMissingEmployees(backendMissing);
              setIsMissingModalOpen(true);
              setPhase("confirm");
            } else {
              toast.error(e.message || "Failed to run engine", { duration: 8000 });
              setPhase("confirm");
            }
          });
      }
    }, 320);
  };

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  if (phase === "confirm") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 mt-2">
        <Card className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setPhase("setup");
                  if (onConfirmChange) onConfirmChange(false);
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Review & Run Payroll
                </h2>
                <p className="text-sm text-muted-foreground">
                  Please review carefully. This action cannot be undone once funds are disbursed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Entities</SelectItem>
                  {previewData.map((d) => (
                    <SelectItem key={d.entity} value={d.entity}>
                      {d.entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 h-72 overflow-y-auto">
                  {ALL_COLUMNS.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={visibleColumns.includes(col.id)}
                      onCheckedChange={() => toggleColumn(col.id)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleExportCsv("All_Entities", flatEmployees)}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {isLoadingPreview ? (
            <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
              <Rocket className="h-10 w-10 animate-pulse text-primary" />
              Calculating live payroll data...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Notice Banner if actual missing fields exist */}
              {missingInCurrentFilter.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">
                        {missingInCurrentFilter.length} employee(s) in this run are missing Salary Structure or CTC configuration.
                      </p>
                      <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                        Payroll execution is held to ensure calculation accuracy. Please configure these fields before running.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMissingEmployees(missingInCurrentFilter);
                      setIsMissingModalOpen(true);
                    }}
                    className="border-amber-500/30 text-amber-800 dark:text-amber-200 hover:bg-amber-500/15 shrink-0"
                  >
                    <Sliders className="h-3.5 w-3.5 mr-1.5" />
                    View Missing Fields ({missingInCurrentFilter.length})
                  </Button>
                </div>
              )}

              <div className="border border-border rounded-md overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar bg-card shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-muted text-muted-foreground uppercase text-[10px] whitespace-nowrap sticky top-0 z-30 shadow-sm backdrop-blur-sm">
                    <tr>
                      {ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id)).map((col) => (
                        <th
                          key={col.id}
                          className="px-2.5 py-1.5 font-bold bg-muted border-b border-r border-border"
                        >
                          {col.label}
                        </th>
                      ))}
                      <th className="px-2.5 py-1.5 font-bold text-right sticky right-0 bg-muted border-b border-l border-border z-40 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="whitespace-nowrap text-[12px]">
                    {flatEmployees.length === 0 ? (
                      <tr>
                        <td
                          colSpan={visibleColumns.length + 1}
                          className="p-8 text-center text-muted-foreground"
                        >
                          No employees found.
                        </td>
                      </tr>
                    ) : (
                      flatEmployees.map((emp: any) => {
                        const isEditing = editingRow === `${emp._entity}-${emp.id}`;
                        return (
                          <tr
                            key={`${emp._entity}-${emp.id}`}
                            className="hover:bg-muted/40 border-b border-border transition-colors"
                          >
                            {ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id)).map((col) => {
                              const isFinancial = [
                                "totalAmount",
                                "arrears",
                                "deduction",
                                "pf",
                                "pt",
                                "reimbursement",
                                "incentive",
                                "payableSalary",
                                "currentSalary",
                                "overtimePay",
                              ].includes(col.id);
                              return (
                                <td
                                  key={col.id}
                                  className={`px-2.5 py-1.5 align-middle border-r border-border ${isFinancial ? "text-right" : ["presentDays", "leaves", "lopDays", "halfDays", "latePenalties", "ot", "daysPaid"].includes(col.id) ? "text-center" : "text-left"}`}
                                >
                                  {isEditing && (isFinancial || ["presentDays", "leaves", "lopDays", "halfDays", "latePenalties", "ot", "daysPaid"].includes(col.id)) ? (
                                    <Input
                                      type="number"
                                      className="h-7 w-24 px-2 text-xs font-mono border-primary/50 focus-visible:ring-primary/30"
                                      value={editForm[col.id] || ""}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        if (["presentDays", "lopDays", "leaves", "daysPaid", "halfDays", "latePenalties"].includes(col.id)) {
                                          let updated = { ...editForm, [col.id]: val };
                                          const total = Number(updated.totalDays || 30) || 30;
                                          const hDays = Number(col.id === "halfDays" ? val : (updated.halfDays || 0));
                                          const lPenalties = Number(col.id === "latePenalties" ? val : (updated.latePenalties || 0));
                                          
                                          if (col.id === "daysPaid") {
                                            updated.daysPaid = Math.max(0, Math.min(total, val));
                                            updated.lopDays = Math.max(0, total - updated.daysPaid - (hDays * 0.5) - lPenalties);
                                          } else if (col.id === "lopDays") {
                                            updated.lopDays = Math.max(0, val);
                                            updated.daysPaid = Math.max(0, total - updated.lopDays - (hDays * 0.5) - lPenalties);
                                          } else if (col.id === "halfDays") {
                                            updated.halfDays = Math.max(0, val);
                                            updated.daysPaid = Math.max(0, total - Number(updated.lopDays || 0) - (val * 0.5) - lPenalties);
                                          } else if (col.id === "latePenalties") {
                                            updated.latePenalties = Math.max(0, val);
                                            updated.daysPaid = Math.max(0, total - Number(updated.lopDays || 0) - (hDays * 0.5) - val);
                                          } else if (col.id === "presentDays") {
                                            updated.presentDays = Math.max(0, val);
                                            updated.lopDays = Math.max(0, total - val - Number(updated.leaves || 0) - (hDays * 0.5) - lPenalties);
                                            updated.daysPaid = Math.max(0, total - updated.lopDays - (hDays * 0.5) - lPenalties);
                                          } else if (col.id === "leaves") {
                                            updated.leaves = Math.max(0, val);
                                            updated.lopDays = Math.max(0, total - Number(updated.presentDays || 0) - val - (hDays * 0.5) - lPenalties);
                                            updated.daysPaid = Math.max(0, total - updated.lopDays - (hDays * 0.5) - lPenalties);
                                          }
                                          
                                          // Dynamically recalculate prorated gross and net for live preview
                                          const currentCtc = Number(updated.currentSalary || 0);
                                          const monthlyBase = currentCtc > 0 ? (currentCtc / 12) : Number(updated.totalAmount || 0);
                                          const prorationRatio = total > 0 ? (updated.daysPaid / total) : 1;
                                          const otAmt = Number(updated.overtimePay || 0);
                                          const arrearsAmt = Number(updated.arrears || 0);
                                          const reimbAmt = Number(updated.reimbursement || 0);
                                          const incAmt = Number(updated.incentive || 0);
                                          const proratedGross = Math.round((monthlyBase * prorationRatio + otAmt + arrearsAmt + reimbAmt + incAmt) * 100) / 100;
                                          const dedAmt = Number(updated.deduction || 0);
                                          updated.totalAmount = proratedGross;
                                          updated.payableSalary = Math.max(0, Math.round((proratedGross - dedAmt) * 100) / 100);
                                          setEditForm(updated);
                                        } else if (col.id === "ot") {
                                          const currentCtc = Number(editForm.currentSalary || 0);
                                          const total = Number(editForm.totalDays || 30) || 30;
                                          const basicAmt = (currentCtc / 12) * 0.5;
                                          const hourlyRate = total > 0 ? (basicAmt / total / 8) : 0;
                                          const newOtPay = Math.round(hourlyRate * 1.5 * val * 100) / 100;
                                          const oldOtPay = Number(editForm.overtimePay || 0);
                                          const diff = newOtPay - oldOtPay;
                                          setEditForm({
                                            ...editForm,
                                            ot: val,
                                            overtimePay: newOtPay,
                                            totalAmount: Math.round((Number(editForm.totalAmount || 0) + diff) * 100) / 100,
                                            payableSalary: Math.round((Number(editForm.payableSalary || 0) + diff) * 100) / 100,
                                          });
                                        } else {
                                          setEditForm({
                                            ...editForm,
                                            [col.id]: val,
                                          });
                                        }
                                      }}
                                    />
                                  ) : col.id === "attendance" ? (
                                    <div className="flex flex-col w-36 text-[11px] bg-muted/20 p-2 rounded border border-border/40 shadow-sm">
                                      <div className="flex justify-between items-center border-b border-border/80 pb-1 mb-1">
                                        <span className="text-muted-foreground font-medium">
                                          Total Days:
                                        </span>
                                        <span className="font-mono font-medium text-foreground">
                                          {emp.totalDays}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">
                                          Paid Days:
                                        </span>
                                        <span className="font-mono font-medium text-primary">
                                          {emp.presentDays}
                                        </span>
                                      </div>
                                    </div>
                                  ) : col.id === "name" ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="font-medium">
                                        {emp.name ||
                                          (emp.firstName
                                            ? `${emp.firstName} ${emp.lastName}`
                                            : "—")}
                                      </span>
                                      {emp.missingFields && emp.missingFields.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                          {emp.missingFields.map((f: string) => (
                                            <span
                                              key={f}
                                              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded"
                                            >
                                              Missing {f}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {emp.error && (!emp.missingFields || emp.missingFields.length === 0) && (
                                        <div className="flex items-start gap-1 p-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] rounded border border-amber-500/20 w-48 whitespace-normal leading-tight">
                                          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                          <span>{emp.error}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : isFinancial ? (
                                    canViewConfidential ? (
                                      fmtINR(emp[col.id] || 0)
                                    ) : (
                                      "****"
                                    )
                                  ) : emp[col.id] !== undefined &&
                                    emp[col.id] !== null &&
                                    emp[col.id] !== "" ? (
                                    emp[col.id]
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-2.5 py-1 text-right align-middle sticky right-0 bg-card border-l border-border z-10 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                              {isEditing ? (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-success hover:bg-success/10 hover:text-success"
                                    onClick={() => handleEditSave(emp._entity, emp.id)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setEditingRow(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                  onClick={() => {
                                    setEditingRow(`${emp._entity}-${emp.id}`);
                                    setEditForm({ ...emp });
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t">
                <div className="flex flex-wrap gap-6">
                  <Stat label="Total Employees" value={String(empCount)} />
                  <Stat
                    label="Month"
                    value={`${new Date(period + "-01").toLocaleString("en-US", { month: "short" })} (${new Date(parseInt(period.split("-")[0]), parseInt(period.split("-")[1]), 0).getDate()} days)`}
                  />
                  {canViewConfidential && (
                    <>
                      <Stat
                        label="Total Gross"
                        value={fmtINR(previewData.reduce((sum, d) => sum + d.gross, 0))}
                      />
                      <Stat
                        label="Total Deductions"
                        value={fmtINR(previewData.reduce((sum, d) => sum + d.deduction, 0))}
                      />
                      <Stat
                        label="Total Net Payout"
                        value={fmtINR(previewData.reduce((sum, d) => sum + d.net, 0))}
                        tone="success"
                      />
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPhase("setup");
                      if (onConfirmChange) onConfirmChange(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const missing = getMissingEmployees();
                      if (missing.length > 0) {
                        setMissingEmployees(missing);
                        setIsMissingModalOpen(true);
                        return;
                      }
                      startEngine();
                    }}
                    className={`gap-2 px-8 ${missingInCurrentFilter.length > 0 ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                    disabled={isLoadingPreview || previewData.length === 0}
                  >
                    {missingInCurrentFilter.length > 0 ? (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        Resolve Missing Requirements ({missingInCurrentFilter.length})
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        Process & Submit for Review
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <MissingPayrollConfigModal
            isOpen={isMissingModalOpen}
            onClose={() => setIsMissingModalOpen(false)}
            missingEmployees={missingEmployees}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 mt-4">

      <Card
        className="p-8 shadow-[var(--shadow-elegant)]"
        style={{
          background:
            phase === "done"
              ? "linear-gradient(135deg, oklch(0.95 0.05 152), oklch(0.97 0.02 200))"
              : undefined,
        }}
      >
        <div className="text-xs uppercase tracking-widest text-primary mb-2 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> {user?.role_name || (user?.is_superuser ? "Super Admin" : "Executive")} mode
        </div>
        <h2 className="text-3xl font-semibold leading-tight">
          Process the full payroll
          <br />
          with one click.
        </h2>
        <p className="text-muted-foreground mt-2">
          {empCount} employees • Estimated net pay {canViewConfidential ? fmtINR(netEst) : "***"}
        </p>

        {phase === "setup" && (
          <div className="mt-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Pay Period</Label>
                <Select value={period} onValueChange={(p) => {
                  setPeriod(p);
                  if (cutoff === getLastDayOfMonth(period)) {
                    setCutoff(getLastDayOfMonth(p));
                  } else if (cutoff === `${period}-25`) {
                    setCutoff(`${p}-25`);
                  } else {
                    const day = cutoff ? cutoff.split("-")[2] || "25" : "25";
                    const maxDays = new Date(Number(p.split("-")[0]), Number(p.split("-")[1]), 0).getDate();
                    const safeDay = String(Math.min(Number(day), maxDays)).padStart(2, "0");
                    setCutoff(`${p}-${safeDay}`);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Attendance Cutoff Date</Label>
                <div className="relative flex items-center">
                  <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="payroll-cutoff-input-setup"
                    type="date"
                    value={cutoff}
                    onChange={(e) => setCutoff(e.target.value)}
                    className="pl-8 pr-28 h-10 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("payroll-cutoff-input-setup") as HTMLInputElement;
                      if (input) {
                        if (typeof input.showPicker === "function") {
                          try { input.showPicker(); } catch (_) { input.focus(); }
                        } else {
                          input.focus();
                        }
                      }
                    }}
                    className="absolute right-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    Select a Date
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Entity</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal h-10 px-3"
                    >
                      {selectedEntities.length === entities.length
                        ? `All entities (${employees.length} employees)`
                        : `${selectedEntities.length} entities selected`}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full min-w-[300px] p-2 space-y-1">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        if (selectedEntities.length === entities.length) setSelectedEntities([]);
                        else setSelectedEntities(entities.map((e: any) => String(e.id)));
                      }}
                      className="flex items-center gap-2 cursor-pointer font-medium border-b pb-2 mb-1"
                    >
                      <Checkbox
                        checked={selectedEntities.length === entities.length}
                        className="border-slate-400"
                      />
                      All entities ({employees.length} employees)
                    </DropdownMenuItem>
                    {entities.map((e: any) => (
                      <DropdownMenuItem
                        key={e.id}
                        onSelect={(ev) => {
                          ev.preventDefault();
                          setSelectedEntities((prev) =>
                            prev.includes(String(e.id))
                              ? prev.filter((id) => id !== String(e.id))
                              : [...prev, String(e.id)],
                          );
                        }}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedEntities.includes(String(e.id))}
                          className="border-slate-400"
                        />
                        {e.name} (
                        {employees.filter((emp: any) => String(emp.entity) === String(e.id)).length}
                        )
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="grid sm:grid-cols-4 gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer">
                <Checkbox checked={includeReimb} onCheckedChange={(v) => setIncludeReimb(!!v)} />
                Reimbursements
              </label>
              <label className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer">
                <Checkbox checked={includeLoans} onCheckedChange={(v) => setIncludeLoans(!!v)} />
                Loan EMIs
              </label>
              <label className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer">
                <Checkbox checked={includeBonus} onCheckedChange={(v) => setIncludeBonus(!!v)} />
                Variable Bonus
              </label>
              <label className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer">
                <Checkbox checked={includeLeaves} onCheckedChange={(v) => setIncludeLeaves(!!v)} />
                Leave Encashment
              </label>
            </div>
            <Button
              size="lg"
              className="h-14 text-base px-8 gap-2 w-full sm:w-auto"
              onClick={handleReviewAndRun}
            >
              <Rocket className="h-5 w-5" />
              Review & Run Payroll
            </Button>
          </div>
        )}
        {phase === "running" && (
          <div className="mt-6 space-y-3">
            <Progress value={pct} className="h-3" />
            <div className="text-sm text-muted-foreground">
              {pct}% complete — please don't close this tab
            </div>
          </div>
        )}
        {phase === "done" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-warning">
              <AlertCircle className="h-8 w-8" />
              <div>
                <div className="font-semibold">Submitted for Review</div>
                <div className="text-xs text-muted-foreground">Notification sent to Approvers</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setPhase("setup");
                  setLogs([]);
                  setPct(0);
                }}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Live execution log</h3>
        <div
          ref={ref}
          className="h-80 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs space-y-1"
        >
          {logs.length === 0 && (
            <div className="text-muted-foreground">Run hasn't started yet…</div>
          )}
          {logs.map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" />
              <span>{l}</span>
            </div>
          ))}
        </div>
      </Card>
      <MissingPayrollConfigModal
        isOpen={isMissingModalOpen}
        onClose={() => setIsMissingModalOpen(false)}
        missingEmployees={missingEmployees}
      />
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function WizardPanel({ canViewConfidential }: { canViewConfidential?: boolean }) {
  const { employees } = Route.useLoaderData();
  const [step, setStep] = useState(0);
  const [cutoff, setCutoff] = useState("2026-06-25");
  const [period, setPeriod] = useState("2026-06");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [missingEmployees, setMissingEmployees] = useState<MissingEmployeeItem[]>([]);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);

  // Estimations
  const filteredEmployees = employees; // wizard runs for all selected
  const empCount = filteredEmployees.length;
  const grossEst = filteredEmployees.reduce(
    (sum: number, emp: any) => sum + (emp.ctc || 0) / 12,
    0,
  );
  const dedEst = grossEst * 0.1;
  const netEst = grossEst - dedEst;

  const getWizardMissingEmployees = () => {
    const activeEmps = employees.filter((e: any) => e.status === "Active");
    const missingList: MissingEmployeeItem[] = [];
    for (const emp of activeEmps as any[]) {
      const missing: string[] = [];
      if (!emp.ctc || Number(emp.ctc) <= 0) {
        missing.push("CTC");
      }
      if (!emp.salary_structure && !emp.salaryStructure && !emp.salary_structure_name) {
        missing.push("Salary Structure");
      }
      if (missing.length > 0) {
        missingList.push({
          id: emp.id,
          code: emp.code || `EMP${emp.id}`,
          name: `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim() || emp.name || "Employee",
          department: emp.department_name || (typeof emp.department === "string" ? emp.department : "") || "General",
          designation: emp.designation_name || (typeof emp.designation === "string" ? emp.designation : "") || "N/A",
          entity: emp.entity_name || String(emp.entity || ""),
          missing,
          missing_salary_structure: missing.includes("Salary Structure"),
          missing_ctc: missing.includes("CTC"),
        });
      }
    }
    return missingList;
  };

  const handleApprove = () => {
    const missing = getWizardMissingEmployees();
    if (missing.length > 0) {
      setMissingEmployees(missing);
      setIsMissingModalOpen(true);
      setConfirmOpen(false);
      return;
    }

    setIsProcessing(true);
    payrollApi
      .createRun({
        period,
        entity: employees[0]?.entity || 1, // fallback entity
        employees: empCount,
        gross: grossEst,
        deductions: dedEst,
        net: netEst,
        status: "Disbursed",
        run_on: new Date().toISOString().split("T")[0],
      })
      .then((run: any) => {
        return payrollApi.executeRun(run.id);
      })
      .then(() => {
        setApproved(true);
        setConfirmOpen(false);
        setIsProcessing(false);
        toast.success("Payroll approved and disbursed");
      })
      .catch((e: any) => {
        setIsProcessing(false);
        const backendMissing = e.data?.missing_employees || e.response?.data?.missing_employees;
        if (backendMissing && Array.isArray(backendMissing) && backendMissing.length > 0) {
          setMissingEmployees(backendMissing);
          setIsMissingModalOpen(true);
          setConfirmOpen(false);
        } else {
          toast.error("Failed to disburse payroll: " + e.message);
        }
      });
  };

  return (
    <Card className="p-6 mt-4">
      <ol className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`p-3 rounded-md border ${i < step ? "bg-success/10 border-success/30" : i === step ? "bg-primary text-primary-foreground border-primary" : "bg-muted"}`}
          >
            <div className="text-[10px] uppercase opacity-80">Step {i + 1}</div>
            <div className="text-sm font-medium">{s}</div>
          </li>
        ))}
      </ol>

      <div className="min-h-[280px]">
        {step === 0 && (
          <div className="space-y-3 max-w-md">
            <h3 className="font-semibold">Lock attendance cutoff</h3>
            <p className="text-sm text-muted-foreground">
              No further attendance edits are allowed after the cutoff. Late submissions require
              regularization.
            </p>
            <div>
              <Label className="text-xs">Pay Period</Label>
              <Select value={period} onValueChange={(p) => {
                setPeriod(p);
                if (cutoff === getLastDayOfMonth(period)) {
                  setCutoff(getLastDayOfMonth(p));
                } else if (cutoff === `${period}-25`) {
                  setCutoff(`${p}-25`);
                } else {
                  const day = cutoff ? cutoff.split("-")[2] || "25" : "25";
                  const maxDays = new Date(Number(p.split("-")[0]), Number(p.split("-")[1]), 0).getDate();
                  const safeDay = String(Math.min(Number(day), maxDays)).padStart(2, "0");
                  setCutoff(`${p}-${safeDay}`);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["2026-04", "2026-05", "2026-06", "2026-07"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cutoff Date</Label>
              <div className="relative flex items-center">
                <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="payroll-cutoff-input-wizard"
                  type="date"
                  value={cutoff}
                  onChange={(e) => setCutoff(e.target.value)}
                  className="pl-8 pr-28 h-10 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("payroll-cutoff-input-wizard") as HTMLInputElement;
                    if (input) {
                      if (typeof input.showPicker === "function") {
                        try { input.showPicker(); } catch (_) { input.focus(); }
                      } else {
                        input.focus();
                      }
                    }
                  }}
                  className="absolute right-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                >
                  Select a Date
                </button>
              </div>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Validate inputs</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                [
                  "Master data",
                  getWizardMissingEmployees().length > 0
                    ? `${empCount - getWizardMissingEmployees().length}/${empCount} valid`
                    : `${empCount}/${empCount} valid`,
                  getWizardMissingEmployees().length > 0 ? "warning" : "success",
                ],
                ["Attendance", "100%", "success"],
                ["Variable pay", "12 pending", "warning"],
              ].map(([l, v, t]) => (
                <div
                  key={l}
                  onClick={() => {
                    if (l === "Master data" && getWizardMissingEmployees().length > 0) {
                      setMissingEmployees(getWizardMissingEmployees());
                      setIsMissingModalOpen(true);
                    }
                  }}
                  className={`p-3 rounded-md border ${t === "warning" ? "border-amber-500/40 bg-amber-500/10 cursor-pointer" : "border-success/40 bg-success/10"}`}
                >
                  <div className="text-xs text-muted-foreground">{l}</div>
                  <div className="font-semibold">{v}</div>
                  {t === "warning" ? (
                    <AlertCircle className="h-4 w-4 mt-1 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mt-1 text-success" />
                  )}
                  {l === "Master data" && getWizardMissingEmployees().length > 0 && (
                    <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-1 font-medium">
                      Click to view missing configurations
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Calculate payroll</h3>
            <p className="text-sm text-muted-foreground">
              Engine will run salary structure, attendance LOP, loan EMI, reimbursements, statutory
              deductions and TDS.
            </p>
            <Button
              onClick={() => {
                toast.success("Calculation complete");
              }}
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              Run Engine
            </Button>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Review summary — {period}</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <Stat
                label="Net Payout"
                value={canViewConfidential ? fmtINR(netEst) : "****"}
                tone="success"
              />
              <Stat
                label="Total Deductions"
                value={canViewConfidential ? fmtINR(dedEst) : "****"}
              />
              <Stat label="Employees Processed" value={String(empCount)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Cutoff locked at {cutoff}. {empCount} payslips generated and ready for approval.
            </p>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Approve & disburse</h3>
            <p className="text-sm text-muted-foreground">
              Approver review is required before disbursement.
            </p>
            {approved ? (
              <div className="p-4 rounded-md border bg-success/10 border-success/30 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-success" />
                <div>
                  <div className="font-semibold">Approved & disbursed</div>
                  <div className="text-xs text-muted-foreground">
                    Bank file NEFT_{period}.csv generated
                  </div>
                </div>
              </div>
            ) : (
              <Button onClick={() => setConfirmOpen(true)}>
                <ShieldCheck className="h-4 w-4 mr-1" />
                Approve & Disburse
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button disabled={step === STEPS.length - 1} onClick={() => setStep((s) => s + 1)}>
          Next
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm payroll approval</DialogTitle>
            <DialogDescription>
              You're approving disbursement of {fmtINR(netEst)} for {period}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <ConfirmRow label="Period" value={period} />
            <ConfirmRow label="Cutoff" value={cutoff} />
            <ConfirmRow label="Employees" value={`${empCount}`} />
            <ConfirmRow label="Net payout" value={canViewConfidential ? fmtINR(netEst) : "***"} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MissingPayrollConfigModal
        isOpen={isMissingModalOpen}
        onClose={() => setIsMissingModalOpen(false)}
        missingEmployees={missingEmployees}
      />
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="p-3 rounded-md border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${tone === "success" ? "text-success" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function ApprovalsPanel({
  pendingRuns,
  canApprove,
  canViewConfidential,
  onRefresh,
}: {
  pendingRuns: any[];
  canApprove: boolean;
  canViewConfidential: boolean;
  onRefresh?: () => void;
}) {
  const [comment, setComment] = useState("");
  const [runComments, setRunComments] = useState<Record<number, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [runErrors, setRunErrors] = useState<string[]>([]);

  const fetchPreview = async (period: string, entityId: number) => {
    setIsLoadingPreview(true);
    try {
      const response = await payrollApi.getPreview({ period, entity: String(entityId) });
      setRawResponse(response);
      const results = Array.isArray(response) ? response : response.data || [];

      const backendErrors = results.flatMap((d: any) => d.errors || []);
      setRunErrors(backendErrors);
      if (backendErrors.length > 0) {
        toast.error(`Backend calculation error: ${backendErrors[0]}`);
      }

      setPreviewData(
        results.flatMap((d: any) =>
          (d.employee_details || d.employeeDetails || []).map((emp: any) => ({
            ...emp,
            _entity: d.entity,
          })),
        ),
      );
    } catch (e) {
      toast.error("Failed to load run details");
    }
    setIsLoadingPreview(false);
  };

  const handleExpand = (run: any) => {
    if (expandedRun === run.id) {
      setExpandedRun(null);
    } else {
      setExpandedRun(run.id);
      fetchPreview(run.period, run.entity);
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const readyRuns = pendingRuns.filter((r: any) => r.status === "Maker-Submitted");
      if (readyRuns.length === 0) {
        toast.error("No runs are currently in Maker-Submitted status ready for approval.");
        setIsProcessing(false);
        return;
      }
      await Promise.all(readyRuns.map((run: any) => payrollApi.approveRun(run.id)));
      toast.success(
        "✅ All pending payrolls approved successfully! They have been moved to Finance.",
        { duration: 5000 },
      );
      if (onRefresh) onRefresh();
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error(e.message);
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!comment) {
      toast.error("Please provide a rejection comment");
      return;
    }
    setIsProcessing(true);
    try {
      await Promise.all(pendingRuns.map((run: any) => payrollApi.rejectRun(run.id, comment)));
      toast.success("❌ All pending payrolls rejected successfully.", { duration: 5000 });
      if (onRefresh) onRefresh();
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error(e.message);
      setIsProcessing(false);
    }
  };

  const handleApproveSingle = async (runId: number) => {
    setIsProcessing(true);
    try {
      await payrollApi.approveRun(runId);
      toast.success("✅ Payroll approved successfully!", { duration: 5000 });
      if (onRefresh) onRefresh();
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error(e.message);
      setIsProcessing(false);
    }
  };

  const handleRejectSingle = async (runId: number) => {
    const runComment = runComments[runId];
    if (!runComment) {
      toast.error("Please provide a rejection comment");
      return;
    }
    setIsProcessing(true);
    try {
      await payrollApi.rejectRun(runId, runComment);
      toast.success("❌ Payroll rejected successfully.", { duration: 5000 });
      if (onRefresh) onRefresh();
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error(e.message);
      setIsProcessing(false);
    }
  };

  if (pendingRuns.length === 0) {
    return (
      <Card className="p-12 text-center mt-4">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-muted-foreground">No pending approvals</h3>
        <p className="text-sm text-muted-foreground mt-2">
          All payroll runs have been processed or approved.
        </p>
      </Card>
    );
  }

  const ALL_COLUMNS = [
    { id: "name", label: "Employee Name" },
    { id: "entity", label: "Entity" },
    { id: "department", label: "Department" },
    { id: "acNo", label: "AC No" },
    { id: "presentDays", label: "Total Days present" },
    { id: "leaves", label: "Annual Leaves" },
    { id: "lopDays", label: "LOP" },
    { id: "ot", label: "OT Overtime" },
    { id: "daysPaid", label: "Payable Days" },
    ...(canViewConfidential
      ? [
          { id: "currentSalary", label: "Current Salary" },
          { id: "totalAmount", label: "Total Amount" },
          { id: "arrears", label: "Arrears" },
          { id: "deduction", label: "Deductions" },
          { id: "pf", label: "PF" },
          { id: "pt", label: "PT" },
          { id: "reimbursement", label: "Reimbursement" },
          { id: "incentive", label: "Incentive" },
          { id: "payableSalary", label: "Payable Salary" },
        ]
      : []),
  ];

  const visibleColumns = ALL_COLUMNS.map((c) => c.id);

  const sortedRuns = [...pendingRuns].sort((a, b) => {
    if (a.status === "Maker-Submitted" && b.status !== "Maker-Submitted") return -1;
    if (b.status === "Maker-Submitted" && a.status !== "Maker-Submitted") return 1;
    return 0;
  });

  return (
    <div className="space-y-4 mt-4">
      {sortedRuns.map((run: any) => (
        <Card key={run.id} className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 mb-4">
            <div>
              <h3 className="text-xl font-semibold">Payroll for {run.period}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Prepared by HR Team • {run.status === "Maker-Submitted" ? (canApprove ? "Awaiting your approval" : "Approval is pending") : run.status === "Disbursed" ? "Approval completed (Disbursed)" : run.status === "Rejected" ? "Rejected" : run.status}
              </p>

              {run.exceptions && run.exceptions.length > 0 && (
                <div className="mt-4 p-4 bg-destructive/10 border-l-4 border-destructive rounded-r-md">
                  <h4 className="text-sm font-bold text-destructive flex items-center mb-2">
                    <AlertCircle className="w-4 h-4 mr-2" /> Execution Errors Detected
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-destructive/90 space-y-1">
                    {run.exceptions.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {run.comments && run.comments.length > 0 && (
                <div className="mt-3 p-3 bg-muted/20 border border-border/50 rounded-md text-sm">
                  <div className="font-semibold text-foreground/80 mb-2">Audit Logs & History:</div>
                  <div className="max-h-24 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {run.comments.map((c: any, i: number) => (
                      <div
                        key={i}
                        className="text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0"
                      >
                        <span className="font-semibold text-foreground">
                          {c.authorName || c.author_name}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(c.timestamp).toLocaleString()}
                        </span>
                        <p
                          className={`mt-1 ${c.comment.toLowerCase().includes("reject") ? "text-destructive font-medium" : "text-muted-foreground"}`}
                        >
                          {c.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4 items-center">
              <div className="text-right mr-4">
                <div className="text-sm text-muted-foreground">Total Net Payout</div>
                <div className="text-2xl font-bold text-success">
                  {canViewConfidential ? fmtINR(run.net) : "****"}
                </div>
              </div>
              <Button variant="outline" onClick={() => handleExpand(run)}>
                {expandedRun === run.id ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" /> Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" /> View Details
                  </>
                )}
              </Button>
            </div>
          </div>

          {expandedRun === run.id && (
            <div className="mb-6 border rounded-md p-4 bg-muted/10">
              <div className="grid sm:grid-cols-4 gap-4 mb-4">
                <Stat label="Total Employees" value={String(run.employees)} />
                <Stat
                  label="Month"
                  value={`${new Date(run.period + "-01").toLocaleString("en-US", { month: "short" })} (${new Date(parseInt(run.period.split("-")[0]), parseInt(run.period.split("-")[1]), 0).getDate()} days)`}
                />
                <Stat
                  label="Total Gross"
                  value={canViewConfidential ? fmtINR(run.gross) : "****"}
                />
                <Stat
                  label="Total Deductions"
                  value={canViewConfidential ? fmtINR(run.deductions) : "****"}
                />
              </div>

              {runErrors.length > 0 && (
                <div className="mb-4 p-4 border rounded-md border-destructive/50 bg-destructive/10">
                  <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
                    <AlertCircle className="h-5 w-5" />
                    Calculation Errors Detected
                  </div>
                  <ul className="list-disc pl-5 text-sm text-destructive/90 space-y-1">
                    {runErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {isLoadingPreview ? (
                <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
                  <Rocket className="h-8 w-8 animate-pulse text-primary" />
                  Loading payroll details...
                </div>
              ) : (
                <div className="border border-border rounded-md overflow-x-auto overflow-y-auto max-h-[50vh] custom-scrollbar bg-card shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted text-muted-foreground uppercase text-[10px] whitespace-nowrap sticky top-0 z-30 shadow-sm backdrop-blur-sm">
                      <tr>
                        {ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id)).map((col) => {
                          const isFinancial = [
                            "totalAmount",
                            "deduction",
                            "payableSalary",
                            "pf",
                            "pt",
                            "reimbursement",
                            "incentive",
                          ].includes(col.id);
                          const alignClass = isFinancial
                            ? "text-right"
                            : ["presentDays", "leaves", "lopDays", "ot", "daysPaid"].includes(
                                  col.id,
                                )
                              ? "text-center"
                              : "text-left";
                          return (
                            <th
                              key={col.id}
                              className={`px-2.5 py-1.5 font-bold bg-muted border-b border-r border-border ${alignClass}`}
                            >
                              {col.label}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="whitespace-nowrap text-[12px]">
                      {previewData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={visibleColumns.length}
                            className="p-8 text-center text-muted-foreground"
                          >
                            No details found.
                          </td>
                        </tr>
                      ) : (
                        previewData.map((emp: any) => (
                          <tr
                            key={`${emp._entity}-${emp.id}`}
                            className="hover:bg-muted/40 border-b border-border transition-colors"
                          >
                            {ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id)).map((col) => {
                              const isFinancial = [
                                "currentSalary",
                                "totalAmount",
                                "arrears",
                                "deduction",
                                "payableSalary",
                                "pf",
                                "pt",
                                "reimbursement",
                                "incentive",
                              ].includes(col.id);
                              return (
                                <td
                                  key={col.id}
                                  className={`px-2.5 py-1.5 align-middle border-r border-border ${isFinancial ? "text-right" : ["presentDays", "leaves", "lopDays", "ot", "daysPaid"].includes(col.id) ? "text-center" : "text-left"}`}
                                >
                                  {isFinancial
                                    ? canViewConfidential
                                      ? fmtINR(emp[col.id] || 0)
                                      : "****"
                                    : emp[col.id] !== undefined &&
                                        emp[col.id] !== null &&
                                        emp[col.id] !== ""
                                      ? emp[col.id]
                                      : "—"}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {canApprove && run.status === "Maker-Submitted" && (
                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-end border-t border-border/50 pt-4">
                  <Input 
                    placeholder="Rejection comment (Required if rejecting)..." 
                    className="max-w-md w-full bg-background"
                    value={runComments[run.id] || ""}
                    onChange={(e) => setRunComments({...runComments, [run.id]: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => handleRejectSingle(run.id)}
                      disabled={isProcessing}
                    >
                      Reject
                    </Button>
                    <Button 
                      className="bg-success text-success-foreground hover:bg-success/90" 
                      onClick={() => handleApproveSingle(run.id)}
                      disabled={isProcessing}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}


    </div>
  );
}
