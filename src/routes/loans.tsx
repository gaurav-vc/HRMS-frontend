import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Check,
  X,
  FileText,
  CalendarClock,
  Download,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  HelpCircle,
  RefreshCw,
  Building,
  Printer,
  HeartHandshake,
  Sparkles,
  Layers,
  Gauge,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, fmtINR } from "@/lib/utils";
import { loansApi, employeesApi, salaryAdvancesApi } from "@/api";
import { useAuth, usePermissions } from "@/lib/auth-context";
import type { Loan, LoanStatement, LoanInstallment, SalaryAdvance, SalaryAdvanceInstallment, EmiReliefRequest } from "@/types";
import { openLoanStatementPdf } from "@/lib/loan-statement-pdf";
import { Banknote } from "lucide-react";

export const Route = createFileRoute("/loans")({
  ssr: false,
  loader: async () => {
    try {
      const [loans, employees, advances, reliefRequests] = await Promise.all([
        loansApi.getAll().catch(() => []),
        employeesApi.getAll().catch(() => []),
        salaryAdvancesApi.getAll().catch(() => []),
        loansApi.getReliefRequests().catch(() => []),
      ]);
      return {
        loans: loans || [],
        employees: employees || [],
        advances: advances || [],
        reliefRequests: reliefRequests || [],
      };
    } catch {
      return { loans: [], employees: [], advances: [], reliefRequests: [] };
    }
  },
  component: LoansPage,
});

function LoanAnimatedVisualTracker({
  loan,
  onRequestRelief,
  onOpenStatement,
  isMyLoan,
}: {
  loan: Loan;
  onRequestRelief: (loan: Loan) => void;
  onOpenStatement: (loan: Loan) => void;
  isMyLoan: boolean;
}) {
  const principal = Number(loan.amount) || 0;
  const outstanding = Number(loan.outstanding) || 0;
  const paid = Math.max(0, Number(loan.totalAmountPaid ?? (principal - outstanding)));
  const pct = principal > 0 ? Math.min(100, Math.max(0, Math.round((paid / principal) * 100))) : 0;
  const isClosed = loan.status === "Closed";
  const totalCount = Number(loan.tenure) || 1;
  const rawPaid = loan.installmentsPaidCount ?? (loan as any).installments_paid_count;
  const paidCount = rawPaid !== undefined && rawPaid !== null ? Number(rawPaid) : (isClosed ? totalCount : 0);
  const rawRemaining = loan.installmentsRemainingCount ?? (loan as any).installments_remaining_count;
  const remainingCount = isClosed
    ? 0
    : (rawRemaining !== undefined && rawRemaining !== null && Number(rawRemaining) > 0)
      ? Number(rawRemaining)
      : Math.max(0, totalCount - paidCount);

  // Circular gauge math (radius 54, circumference ~339.29)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  // 3D Cylinder Liquid Math (container height 130px, base at 160)
  const cylinderHeight = 130;
  const fillHeight = Math.max(pct > 0 ? 8 : 4, Math.min(cylinderHeight, (pct / 100) * cylinderHeight));
  const fillY = 160 - fillHeight;

  return (
    <Card className="border border-border/80 bg-card text-card-foreground shadow-sm mb-6 overflow-hidden">
      {/* Top Header Banner */}
      <div className="p-5 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 text-xs font-medium">
              <Sparkles className="h-3 w-3 mr-1 text-emerald-600" />
              Active Repayment Track
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {loan.type} Loan #{loan.id}
            </Badge>
            {loan.pendingReliefRequest && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 text-xs font-medium animate-pulse">
                <Clock className="h-3 w-3 mr-1 text-amber-600" />
                Relief Pending Review
              </Badge>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-foreground font-sans">
              {fmtINR(principal)}
            </h3>
            <span className="text-xs text-muted-foreground">Total Principal Amount</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-lg bg-background border border-border/70 text-right">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Monthly Deduction
            </span>
            <span className="text-sm font-bold text-foreground">{fmtINR(loan.emi)}</span>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-background border border-border/70 text-right">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Outstanding Balance
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{fmtINR(outstanding)}</span>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-background border border-border/70 text-right">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Paid Principal
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtINR(paid)}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: 3 Clean Panels */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Panel 1: Circular Amortization Meter */}
        <div className="md:col-span-4 p-4 rounded-xl border border-border/60 bg-muted/10 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-foreground/80 mb-2 flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-primary" />
            Amortization Progress
          </span>
          <div className="relative w-36 h-36 flex items-center justify-center my-1">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="text-muted/40"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="text-emerald-500"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                style={{
                  transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold tracking-tight text-foreground">{pct}%</span>
              <span className="text-[10px] font-semibold tracking-wider text-emerald-600 uppercase">
                REPAID
              </span>
              <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
                {fmtINR(paid)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-semibold text-foreground">{paidCount}</span> of{" "}
            <span className="font-semibold text-foreground">{totalCount}</span> monthly EMIs cleared
          </p>
        </div>

        {/* Panel 2: 3D Loan Recovery Cylinder */}
        <div className="md:col-span-4 p-4 rounded-xl border border-border/60 bg-muted/10 flex flex-col items-center justify-between text-center">
          <span className="text-xs font-semibold text-foreground/80 mb-1 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            3D Loan Recovery Cylinder
          </span>

          <div className="relative w-44 h-40 flex items-center justify-center my-auto">
            <svg className="w-full h-full" viewBox="0 0 160 190">
              <defs>
                <linearGradient id="cylinderLiquidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="cylinderGlassSheen" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="35%" stopColor="rgba(255,255,255,0.08)" />
                  <stop offset="80%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                </linearGradient>
              </defs>

              {/* Ticks on the right */}
              <g className="text-[9px] fill-muted-foreground font-mono">
                <line x1="115" y1="30" x2="122" y2="30" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
                <text x="126" y="33">100%</text>

                <line x1="115" y1="62.5" x2="120" y2="62.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
                <text x="126" y="65">75%</text>

                <line x1="115" y1="95" x2="122" y2="95" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
                <text x="126" y="98">50%</text>

                <line x1="115" y1="127.5" x2="120" y2="127.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
                <text x="126" y="130">25%</text>

                <line x1="115" y1="160" x2="122" y2="160" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
                <text x="126" y="163">0%</text>
              </g>

              {/* Outer Cylinder Body */}
              <rect
                x="45"
                y="30"
                width="66"
                height={cylinderHeight}
                rx="8"
                className="fill-muted/20 stroke-border/80"
                strokeWidth="2"
              />

              {/* Rising Liquid Column */}
              <rect
                x="47"
                y={fillY}
                width="62"
                height={fillHeight}
                rx="6"
                fill="url(#cylinderLiquidGrad)"
                style={{
                  transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />

              {/* Glass sheen highlight overlay */}
              <rect
                x="45"
                y="30"
                width="66"
                height={cylinderHeight}
                rx="8"
                fill="url(#cylinderGlassSheen)"
                pointerEvents="none"
              />

              {/* Liquid meniscus line */}
              {pct > 0 && pct < 100 && (
                <ellipse
                  cx="78"
                  cy={fillY}
                  rx="30"
                  ry="3.5"
                  className="fill-emerald-300/60"
                />
              )}
            </svg>
          </div>

          <div className="w-full pt-1">
            <span className="text-[11px] font-mono text-muted-foreground block">
              {fmtINR(outstanding)} to debt-free
            </span>
          </div>
        </div>

        {/* Panel 3: Loan Health & Details */}
        <div className="md:col-span-4 p-4 rounded-xl border border-border/60 bg-muted/10 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-semibold text-foreground/80 block mb-2.5">
              Loan Health & Details
            </span>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-background border border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Cleared Instalments
                </span>
                <span className="font-semibold text-foreground font-mono">{paidCount} Months</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-background border border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Pending Instalments
                </span>
                <span className="font-semibold text-foreground font-mono">{remainingCount} Months</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-background border border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-indigo-500" /> Moratoriums Granted
                </span>
                <span className="font-semibold text-foreground font-mono">{loan.moratoriumCount || 0} Skipped</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-9"
              onClick={() => onOpenStatement(loan)}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              View Passbook Statement
            </Button>

            {/* Pending Relief Alert or Action Button */}
            {loan.pendingReliefRequest ? (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                  <Clock className="h-3.5 w-3.5 animate-spin text-amber-600 shrink-0" />
                  <span>Relief Request Under Executive Review</span>
                </div>
                <p className="text-muted-foreground text-[11px] mt-1 line-clamp-1 italic">
                  "{loan.pendingReliefRequest.reason}"
                </p>
                <Badge variant="outline" className="mt-1 text-[10px] bg-amber-100/60 text-amber-800 border-amber-300">
                  Option: {loan.pendingReliefRequest.preferred_strategy_display || loan.pendingReliefRequest.preferred_strategy}
                </Badge>
              </div>
            ) : isMyLoan && loan.status === "Active" ? (
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs text-xs h-9"
                onClick={() => onRequestRelief(loan)}
              >
                <HeartHandshake className="h-3.5 w-3.5 mr-1.5" />
                Request EMI Relief (Skip Month)
              </Button>
            ) : null}
          </div>
        </div>

      </div>
    </Card>
  );
}

function LoansPage() {
  const { loans: initialLoans, employees, advances: initialAdvances, reliefRequests: initialReliefRequests } = Route.useLoaderData();
  const [rows, setRows] = useState<any[]>(initialLoans);
  const [advanceRows, setAdvanceRows] = useState<SalaryAdvance[]>(initialAdvances || []);
  const [reliefRequests, setReliefRequests] = useState<EmiReliefRequest[]>(initialReliefRequests || []);
  const [cockpit, setCockpit] = useState<any>(null);
  const { user } = useAuth();
  const { canUpdate } = usePermissions("Loans & Advances");

  // Check if executive/CEO
  const isSuperAdmin = Boolean(
    user?.is_superuser ||
    user?.role === "super_admin" ||
    user?.role_name === "Super Admin" ||
    (user as any)?.employee_profile?.role === "super_admin"
  );
  const isCeo = Boolean(
    isSuperAdmin ||
    user?.employee_id === "CEO001" ||
    user?.role === "org_admin" ||
    user?.role === "admin" ||
    user?.role === "site_admin" ||
    (user?.role_name && user.role_name.toLowerCase().includes("ceo")) ||
    (user?.email && user.email.toLowerCase().startsWith("sanjay@"))
  );

  const [activeTab, setActiveTab] = useState<string>(isCeo ? "active" : "my-loans");

  useEffect(() => {
    if (!isCeo && !activeTab.startsWith("my-")) {
      setActiveTab("my-loans");
    }
  }, [isCeo]);

  // Relief Request Dialog State (Employee)
  const [reliefModalOpen, setReliefModalOpen] = useState(false);
  const [targetLoanForRelief, setTargetLoanForRelief] = useState<Loan | null>(null);
  const [reliefForm, setReliefForm] = useState({
    preferred_strategy: "EXTEND_TENURE",
    reason: "",
  });
  const [isSubmittingRelief, setIsSubmittingRelief] = useState(false);

  // CEO Decision Dialog State (CEO)
  const [ceoDecisionModalOpen, setCeoDecisionModalOpen] = useState(false);
  const [selectedReliefForDecision, setSelectedReliefForDecision] = useState<any>(null);
  const [ceoDecisionForm, setCeoDecisionForm] = useState({
    decision: "APPROVE",
    strategy: "EXTEND_TENURE",
    remarks: "",
  });
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Resolve logged-in employee profile
  const currentEmp = employees.find(
    (e: any) =>
      String(e.id) === String(user?.employee_pk) ||
      String(e.code) === String(user?.employee_id) ||
      String(e.employeeId) === String(user?.employee_id) ||
      (user?.email && e.email?.toLowerCase() === user.email.toLowerCase())
  ) || (employees.length === 1 ? employees[0] : null);

  const defaultEmpId = currentEmp ? String(currentEmp.id) : (user?.employee_pk ? String(user.employee_pk) : "");

  // Advance Salary Dialog States
  const [openCreateAdvance, setOpenCreateAdvance] = useState(false);
  const [isSubmittingAdvance, setIsSubmittingAdvance] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    employee: defaultEmpId,
    amount: 25000,
    tenure: 1,
    start_period: "",
    reason: "",
  });

  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedAdvanceForDisburse, setSelectedAdvanceForDisburse] = useState<SalaryAdvance | null>(null);
  const [disburseForm, setDisburseForm] = useState({
    disbursement_date: new Date().toISOString().split("T")[0],
    disbursement_mode: "Bank Transfer",
    disbursement_ref: "",
    start_period: "",
  });
  const [isSubmittingDisburse, setIsSubmittingDisburse] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAdvanceForSchedule, setSelectedAdvanceForSchedule] = useState<SalaryAdvance | null>(null);

  // Creation Dialog State
  const [openCreate, setOpenCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    employee: defaultEmpId,
    type: "Personal",
    amount: 100000,
    emi: 5000,
    tenure: 20,
    reason: "",
  });

  useEffect(() => {
    if (defaultEmpId) {
      setAdvanceForm((prev) => (prev.employee ? prev : { ...prev, employee: defaultEmpId }));
      setForm((prev) => (prev.employee ? prev : { ...prev, employee: defaultEmpId }));
    }
  }, [defaultEmpId]);

  // Statement Passbook Dialog State
  const [statementOpen, setStatementOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [statementData, setStatementData] = useState<LoanStatement | null>(null);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);

  // Skip EMI Dialog State
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipLoan, setSkipLoan] = useState<Loan | null>(null);
  const [skipInstallments, setSkipInstallments] = useState<LoanInstallment[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [skipStrategy, setSkipStrategy] = useState<string>("EXTEND_TENURE"); // Default: Extend Tenure
  const [skipReason, setSkipReason] = useState<string>("");
  const [isSkipping, setIsSkipping] = useState(false);

  const fetchCockpit = async () => {
    try {
      const [data, updatedReqs] = await Promise.all([
        loansApi.getCockpitSummary(),
        loansApi.getReliefRequests().catch(() => []),
      ]);
      setCockpit(data);
      if (updatedReqs) setReliefRequests(updatedReqs);
    } catch (e) {
      // ignore
    }
  };

  const handleOpenReliefModal = (loan: Loan) => {
    setTargetLoanForRelief(loan);
    setReliefForm({
      preferred_strategy: "EXTEND_TENURE",
      reason: "",
    });
    setReliefModalOpen(true);
  };

  const handleSubmitRelief = async () => {
    if (!targetLoanForRelief) return;
    if (!reliefForm.reason.trim()) {
      toast.error("Please provide a reason for requesting EMI relief");
      return;
    }
    try {
      setIsSubmittingRelief(true);
      const res = await loansApi.requestRelief(targetLoanForRelief.id, {
        preferred_strategy: reliefForm.preferred_strategy,
        reason: reliefForm.reason,
      });
      toast.success(res.message || "EMI relief request submitted successfully.");
      setReliefModalOpen(false);
      const [updatedLoans, updatedReqs] = await Promise.all([
        loansApi.getAll(),
        loansApi.getReliefRequests().catch(() => []),
      ]);
      setRows(updatedLoans);
      setReliefRequests(updatedReqs);
      fetchCockpit();
    } catch (e: any) {
      toast.error("Failed to submit relief request: " + e.message);
    } finally {
      setIsSubmittingRelief(false);
    }
  };

  const handleOpenCeoDecisionModal = (reliefReq: any) => {
    setSelectedReliefForDecision(reliefReq);
    setCeoDecisionForm({
      decision: "APPROVE",
      strategy: reliefReq.preferredStrategy === "ADJUST_NEXT_MONTH" ? "ADJUST_NEXT_MONTH" : "EXTEND_TENURE",
      remarks: "",
    });
    setCeoDecisionModalOpen(true);
  };

  const handleSubmitCeoDecision = async (overrideDecision?: "APPROVE" | "REJECT") => {
    if (!selectedReliefForDecision) return;
    const finalDecision = overrideDecision || (ceoDecisionForm.decision as any);
    try {
      setIsSubmittingDecision(true);
      const res = await loansApi.decideRelief(selectedReliefForDecision.loan, {
        relief_id: selectedReliefForDecision.id,
        decision: finalDecision,
        strategy: ceoDecisionForm.strategy,
        remarks: ceoDecisionForm.remarks,
      });
      toast.success(res.message || "Decision recorded successfully.");
      setCeoDecisionModalOpen(false);
      const [updatedLoans, updatedReqs] = await Promise.all([
        loansApi.getAll(),
        loansApi.getReliefRequests().catch(() => []),
      ]);
      setRows(updatedLoans);
      setReliefRequests(updatedReqs);
      fetchCockpit();
    } catch (e: any) {
      toast.error("Failed to record decision: " + e.message);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  useEffect(() => {
    fetchCockpit();
  }, [rows]);

  const handleOpenCreateAdvance = () => {
    const empId =
      defaultEmpId ||
      (currentEmp ? String(currentEmp.id) : "") ||
      (user?.employee_pk ? String(user.employee_pk) : "");
    const currentPeriod = new Date().toISOString().slice(0, 7);
    setAdvanceForm({
      employee: empId,
      amount: 25000,
      tenure: 1,
      start_period: currentPeriod,
      reason: "",
    });
    setOpenCreateAdvance(true);
  };

  const handleCreateAdvance = async () => {
    const empId =
      advanceForm.employee ||
      defaultEmpId ||
      (currentEmp ? String(currentEmp.id) : "") ||
      (user?.employee_pk ? String(user.employee_pk) : "");

    if (!empId) {
      toast.error("Please select an employee");
      return;
    }
    if (!advanceForm.amount || advanceForm.amount <= 0) {
      toast.error("Please enter a valid advance amount");
      return;
    }
    try {
      setIsSubmittingAdvance(true);
      const newAdv = await salaryAdvancesApi.create({
        employee: empId,
        amount: advanceForm.amount,
        tenure: advanceForm.tenure,
        start_period: advanceForm.start_period || new Date().toISOString().slice(0, 7),
        reason: advanceForm.reason,
      });
      setAdvanceRows((prev) => [newAdv, ...prev]);
      setOpenCreateAdvance(false);
      toast.success("Salary advance request submitted successfully.");
    } catch (e: any) {
      toast.error("Failed to submit advance request: " + e.message);
    } finally {
      setIsSubmittingAdvance(false);
    }
  };

  const handleApproveAdvance = async (id: number | string) => {
    try {
      const updated = await salaryAdvancesApi.approve(id);
      setAdvanceRows((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast.success("Salary advance approved.");
    } catch (e: any) {
      toast.error("Failed to approve advance: " + e.message);
    }
  };

  const handleRejectAdvance = async (id: number | string) => {
    try {
      const updated = await salaryAdvancesApi.reject(id);
      setAdvanceRows((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast.success("Salary advance rejected.");
    } catch (e: any) {
      toast.error("Failed to reject advance: " + e.message);
    }
  };

  const handleOpenDisburseModal = (adv: SalaryAdvance) => {
    setSelectedAdvanceForDisburse(adv);
    setDisburseForm({
      disbursement_date: new Date().toISOString().split("T")[0],
      disbursement_mode: "Bank Transfer",
      disbursement_ref: "",
      start_period: adv.startPeriod || new Date().toISOString().slice(0, 7),
    });
    setDisburseModalOpen(true);
  };

  const handleDisburseAdvance = async () => {
    if (!selectedAdvanceForDisburse) return;
    try {
      setIsSubmittingDisburse(true);
      const updated = await salaryAdvancesApi.disburse(selectedAdvanceForDisburse.id, disburseForm);
      setAdvanceRows((prev) => prev.map((a) => (a.id === selectedAdvanceForDisburse.id ? updated : a)));
      toast.success("Advance disbursed and recovery schedule generated.");
      setDisburseModalOpen(false);
    } catch (e: any) {
      toast.error("Failed to disburse advance: " + e.message);
    } finally {
      setIsSubmittingDisburse(false);
    }
  };

  const empName = (id: string | number) => {
    const emp = employees.find((e: any) => e.id == id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "—";
  };

  const empCode = (id: string | number) => {
    const emp = employees.find((e: any) => e.id == id);
    return emp ? emp.code || emp.employeeId : "";
  };

  const handleCreate = async () => {
    if (!form.employee) {
      toast.error("Please select an employee");
      return;
    }
    try {
      setIsSubmitting(true);
      const newLoan = await loansApi.createLoan({
        ...form,
        employee_id: form.employee,
        outstanding: form.amount,
        status: "Pending",
      });
      setRows((prev) => [newLoan, ...prev]);
      setOpenCreate(false);
      toast.success("Loan request created successfully");
    } catch (e: any) {
      let errorMsg = e.message || "An unknown error occurred";
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed.nonFieldErrors && parsed.nonFieldErrors.length > 0) {
          errorMsg = parsed.nonFieldErrors[0];
        } else if (parsed.non_field_errors && parsed.non_field_errors.length > 0) {
          errorMsg = parsed.non_field_errors[0];
        } else {
          const firstKey = Object.keys(parsed)[0];
          if (Array.isArray(parsed[firstKey]) && parsed[firstKey].length > 0) {
            errorMsg = parsed[firstKey][0];
          } else if (typeof parsed[firstKey] === "string") {
            errorMsg = parsed[firstKey];
          }
        }
      } catch (err) {
        // Not JSON
      }
      toast.warning(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Statement Drawer
  const handleOpenStatement = async (loan: Loan) => {
    setSelectedLoan(loan);
    setStatementOpen(true);
    setIsLoadingStatement(true);
    try {
      const data = await loansApi.getStatement(loan.id);
      setStatementData(data);
    } catch (e: any) {
      toast.error("Failed to load loan statement: " + e.message);
    } finally {
      setIsLoadingStatement(false);
    }
  };

  // Open Skip EMI Modal
  const handleOpenSkipModal = async (loan: Loan) => {
    setSkipLoan(loan);
    setSkipReason("");
    setSkipStrategy("EXTEND_TENURE"); // Default to Extend Tenure
    setSkipOpen(true);
    try {
      const data = await loansApi.getStatement(loan.id);
      const pendingInsts = (data.installments || []).filter((i) => i.status === "PENDING");
      setSkipInstallments(pendingInsts);
      if (pendingInsts.length > 0) {
        setSelectedInstId(String(pendingInsts[0].id));
      } else {
        setSelectedInstId("");
      }
    } catch (e) {
      // fallback
    }
  };

  // Confirm Skip Action
  const handleConfirmSkip = async () => {
    if (!skipLoan) return;
    if (!skipReason.trim()) {
      toast.error("Please enter a mandatory reason for employee request relief.");
      return;
    }
    try {
      setIsSkipping(true);
      const res = await loansApi.skipEmi(skipLoan.id, {
        installment_id: selectedInstId ? Number(selectedInstId) : undefined,
        strategy: skipStrategy,
        reason: skipReason,
      });
      toast.success(res.message || "EMI skipped successfully.");
      setSkipOpen(false);
      // Refresh rows
      const refreshedLoans = await loansApi.getAll();
      setRows(refreshedLoans);
      if (statementOpen && selectedLoan?.id === skipLoan.id) {
        const updatedStatement = await loansApi.getStatement(skipLoan.id);
        setStatementData(updatedStatement);
      }
    } catch (e: any) {
      toast.error("Failed to skip EMI: " + e.message);
    } finally {
      setIsSkipping(false);
    }
  };

  // Filtered rows for CEO / Management
  const activeRows = rows.filter((r) => r.status === "Active" || r.status === "Pending");
  const closedRows = rows.filter((r) => r.status === "Closed");
  const moratoriumRows = rows.filter((r) => (r.moratoriumCount || 0) > 0);
  const pendingReliefCount = (reliefRequests || []).filter((r: any) => r.status === "PENDING").length;

  // Personal records for the logged-in employee
  const myLoans = (rows || []).filter(
    (r: any) =>
      currentEmp &&
      (String(r.employee) === String(currentEmp.id) ||
        String(r.employeeId) === String(currentEmp.id) ||
        String((r as any).employee_id) === String(currentEmp.id))
  );

  const myEmpId = currentEmp?.id || user?.employee_pk;
  const myAdvances = (advanceRows || []).filter((a: any) => {
    if (!myEmpId) return false;
    const advEmpId =
      typeof a.employee === "object"
        ? a.employee?.id
        : a.employee || (a as any).employee_id;
    return String(advEmpId) === String(myEmpId);
  });

  const myReliefRequests = (reliefRequests || []).filter(
    (req: any) =>
      currentEmp &&
      (String(req.employee) === String(currentEmp.id) ||
        String((req as any).employee_id) === String(currentEmp.id))
  );

  const myActiveLoan = myLoans.find((r: any) => r.status === "Active") || myLoans[0];

  // Personal metrics for Employee
  const mySanctionedTotal = myLoans.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const myOutstandingTotal = myLoans.reduce((acc, r) => acc + Number(r.outstanding || 0), 0);
  const myMonthlyEmiTotal = myLoans.filter((r) => r.status === "Active").reduce((acc, r) => acc + Number(r.emi || 0), 0);
  const myPaidPrincipalTotal = myLoans.reduce(
    (acc, r) => acc + Number(r.totalAmountPaid ?? Math.max(0, Number(r.amount || 0) - Number(r.outstanding || 0))),
    0
  );
  const myMoratoriumTotal = myLoans.reduce((acc, r) => acc + (r.moratoriumCount || 0), 0);

  const displayedRows =
    activeTab === "closed"
      ? closedRows
      : activeTab === "moratoriums"
      ? moratoriumRows
      : activeRows;

  return (
    <>
      <PageHeader
        title={isCeo ? "Loans & Advances Governance" : "My Loans & Advances"}
        description={
          isCeo
            ? "Executive portfolio oversight, employee moratorium approvals, and company EMI deduction controls"
            : "Track your personal repayment progress, view passbook statements, and request EMI relief"
        }
        actions={
          <div className="flex items-center gap-2">
            {isCeo && (
              <Button variant="outline" size="sm" onClick={() => fetchCockpit()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            )}
            <Button variant="outline" onClick={handleOpenCreateAdvance}>
              <Banknote className="h-4 w-4 mr-1.5 text-blue-600" />
              {isCeo ? "Record Salary Advance" : "Request Salary Advance"}
            </Button>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              {isCeo ? "New Employee Loan" : "Apply for Loan"}
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards: CEO Portfolio vs Employee Personal */}
      {isCeo ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Disbursed Portfolio
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {fmtINR(cockpit?.totalDisbursed ?? rows.reduce((acc, r) => acc + Number(r.amount || 0), 0))}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {cockpit?.activeLoans ?? activeRows.length} active company loans
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <CreditCard className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total EMIs Debited
                </p>
                <h3 className="text-2xl font-bold mt-1 text-success">
                  {fmtINR(cockpit?.totalDebited ?? 0)}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  {cockpit?.paidInstallmentsCount ?? 0} installments collected
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Portfolio at Risk (Outstanding)
                </p>
                <h3 className="text-2xl font-bold mt-1 text-warning">
                  {fmtINR(cockpit?.totalOutstanding ?? rows.reduce((acc, r) => acc + Number(r.outstanding || 0), 0))}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-warning" />
                  {cockpit?.pendingInstallmentsCount ?? 0} installments pending
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Active Moratoriums & Skips
                </p>
                <h3 className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                  {cockpit?.moratoriumsCount ?? 0} Deferred
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <PauseCircle className="h-3 w-3 text-indigo-500" />
                  Granted on employee request
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CalendarClock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  My Sanctioned Principal
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {fmtINR(mySanctionedTotal)}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {myLoans.length} personal loan account{myLoans.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <CreditCard className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Monthly Salary Deduction
                </p>
                <h3 className="text-2xl font-bold mt-1 text-primary">
                  {fmtINR(myMonthlyEmiTotal)}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Auto-debited from monthly payslip
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <CalendarClock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  My Balance Outstanding
                </p>
                <h3 className="text-2xl font-bold mt-1 text-warning">
                  {fmtINR(myOutstandingTotal)}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-warning" />
                  Remaining amount to clear
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Principal Cleared
                </p>
                <h3 className="text-2xl font-bold mt-1 text-success">
                  {fmtINR(myPaidPrincipalTotal)}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <PauseCircle className="h-3 w-3 text-indigo-500" />
                  {myMoratoriumTotal} moratorium month{myMoratoriumTotal === 1 ? "" : "s"} used
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Middle Section: Personal Repayment Tracker (Employee) OR Executive Alert (CEO) */}
      {!isCeo ? (
        myActiveLoan ? (
          <LoanAnimatedVisualTracker
            loan={myActiveLoan}
            onRequestRelief={handleOpenReliefModal}
            onOpenStatement={handleOpenStatement}
            isMyLoan={true}
          />
        ) : (
          <Card className="p-8 text-center border-dashed mb-6 bg-muted/10">
            <div className="max-w-md mx-auto">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-6 w-6" />
              </div>
              <h4 className="text-base font-semibold text-foreground">No Active Loan Accounts</h4>
              <p className="text-xs text-muted-foreground mt-1">
                You currently have no active personal loans. If you require financial assistance, you can apply for a company loan or request a short-term salary advance.
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button size="sm" onClick={() => setOpenCreate(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Apply for Loan
                </Button>
                <Button size="sm" variant="outline" onClick={handleOpenCreateAdvance}>
                  <Banknote className="h-4 w-4 mr-1.5 text-blue-600" /> Request Salary Advance
                </Button>
              </div>
            </div>
          </Card>
        )
      ) : (
        /* Executive Attention Banner for CEO */
        pendingReliefCount > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Executive Action Required: {pendingReliefCount} Loan EMI Relief {pendingReliefCount === 1 ? "Request" : "Requests"} Pending
                  <Badge className="bg-amber-500 text-white text-[10px]">Action Needed</Badge>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Employees facing financial or medical hardship have requested to skip their monthly loan EMI. You can approve to <strong>Extend Tenure (+1 Month)</strong> or <strong>Double EMI Next Month</strong>.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs h-9 shadow-sm"
              onClick={() => setActiveTab("relief")}
            >
              Review & Decide ({pendingReliefCount})
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        )
      )}

      {/* Tabs Layout: CEO Governance vs Employee Self-Service */}
      {!isCeo ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="my-loans" className="text-xs">
              My Loans ({myLoans.length})
            </TabsTrigger>
            <TabsTrigger value="my-advances" className="text-xs">
              My Salary Advances ({myAdvances.length})
            </TabsTrigger>
            <TabsTrigger value="my-relief" className="text-xs">
              My Relief Requests ({myReliefRequests.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid grid-cols-5 max-w-2xl">
            <TabsTrigger value="active" className="text-xs">
              All Company Loans ({activeRows.length})
            </TabsTrigger>
            <TabsTrigger value="relief" className="text-xs relative">
              Relief Requests
              {pendingReliefCount > 0 && (
                <Badge className="ml-1.5 px-1.5 py-0 h-4 bg-amber-500 text-white text-[10px]">
                  {pendingReliefCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="moratoriums" className="text-xs">
              Moratoriums & Skips ({moratoriumRows.length})
            </TabsTrigger>
            <TabsTrigger value="advances" className="text-xs">
              Salary Advances ({advanceRows.length})
            </TabsTrigger>
            <TabsTrigger value="closed" className="text-xs">
              Paid & Closed ({closedRows.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Data Tables */}
      {!isCeo ? (
        activeTab === "my-advances" ? (
          <DataTable
            rows={myAdvances}
            rowKey={(r) => r.id}
            searchKeys={[(r) => r.reason || ""]}
            filename="my_salary_advances.csv"
            columns={[
              {
                key: "amount",
                header: "Advance Amount",
                accessor: (r) => r.amount,
                render: (r) => <span className="font-semibold text-foreground">{fmtINR(r.amount)}</span>,
              },
              {
                key: "tenure",
                header: "Tenure",
                render: (r) => (
                  <Badge variant="outline" className="font-normal">
                    {r.tenure} {r.tenure === 1 ? "Month" : "Months"}
                  </Badge>
                ),
              },
              {
                key: "monthly",
                header: "Monthly Recovery",
                accessor: (r) => r.monthlyInstallment,
                render: (r) => <span className="text-foreground">{fmtINR(r.monthlyInstallment)}</span>,
              },
              {
                key: "outstanding",
                header: "Outstanding",
                accessor: (r) => r.outstanding,
                render: (r) => (
                  <span className={cn("font-medium", Number(r.outstanding) > 0 ? "text-amber-600" : "text-emerald-600")}>
                    {fmtINR(r.outstanding)}
                  </span>
                ),
              },
              {
                key: "startPeriod",
                header: "Recovery Period",
                render: (r) => (
                  <span className="text-xs font-mono text-muted-foreground">{r.startPeriod || "Immediate"}</span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (r) => {
                  let badgeClass = "bg-muted text-muted-foreground";
                  if (r.status === "Pending") badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
                  if (r.status === "Approved") badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
                  if (r.status === "Disbursed") badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
                  if (r.status === "Recovered") badgeClass = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                  if (r.status === "Rejected") badgeClass = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                  return <Badge className={badgeClass}>{r.status}</Badge>;
                },
              },
            ]}
            actions={(r) => (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelectedAdvanceForSchedule(r);
                  setScheduleModalOpen(true);
                }}
              >
                <CalendarClock className="h-3.5 w-3.5 mr-1" />
                Schedule
              </Button>
            )}
          />
        ) : activeTab === "my-relief" ? (
          <DataTable
            rows={myReliefRequests}
            rowKey={(r: any) => r.id}
            searchKeys={[(r: any) => r.reason || ""]}
            filename="my_emi_relief_requests.csv"
            columns={[
              {
                key: "loan",
                header: "Loan Account",
                render: (r: any) => (
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Loan #{r.loanId || r.loan}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Monthly EMI: {fmtINR(r.loanEmi || 0)}
                    </span>
                  </div>
                ),
              },
              {
                key: "preferred_strategy",
                header: "Requested Option",
                render: (r: any) => {
                  const opt = r.preferredStrategy || r.preferred_strategy;
                  return (
                    <Badge variant="outline" className="text-xs font-normal">
                      {opt === "EXTEND_TENURE"
                        ? "Option A: Extend Tenure (+1 Mo)"
                        : opt === "ADJUST_NEXT_MONTH"
                        ? "Option B: Double EMI Next Month"
                        : "Option C: Either / CEO Discretion"}
                    </Badge>
                  );
                },
              },
              {
                key: "reason",
                header: "Hardship Reason",
                render: (r: any) => (
                  <p className="text-xs italic text-foreground max-w-xs truncate" title={r.reason}>
                    "{r.reason}"
                  </p>
                ),
              },
              {
                key: "decision",
                header: "Executive Decision",
                render: (r: any) => (
                  <div className="text-xs">
                    {r.appliedStrategy ? (
                      <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-normal">
                        {r.appliedStrategyDisplay || r.appliedStrategy}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground italic">Under Review by CEO</span>
                    )}
                    {r.decisionRemarks && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {r.decisionRemarks}
                      </p>
                    )}
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (r: any) => {
                  if (r.status === "PENDING") {
                    return (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse font-medium">
                        Pending CEO Review
                      </Badge>
                    );
                  }
                  if (r.status === "APPROVED") {
                    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Approved</Badge>;
                  }
                  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Rejected</Badge>;
                },
              },
            ]}
          />
        ) : (
          <DataTable
            rows={myLoans}
            rowKey={(r) => r.id}
            searchKeys={[(r) => r.type]}
            filename="my_loans_register.csv"
            columns={[
              {
                key: "type",
                header: "Loan Account",
                render: (r) => (
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{r.type} Loan #{r.id}</span>
                    <span className="text-xs text-muted-foreground">Sanctioned: {fmtINR(r.amount)}</span>
                  </div>
                ),
              },
              {
                key: "emi",
                header: "Monthly Deduction",
                render: (r) => <span className="font-medium text-foreground">{fmtINR(r.emi)}</span>,
              },
              {
                key: "outstanding",
                header: "Outstanding Balance",
                render: (r) => (
                  <span className={cn("font-semibold", Number(r.outstanding) > 0 ? "text-amber-600" : "text-emerald-600")}>
                    {fmtINR(r.outstanding)}
                  </span>
                ),
              },
              {
                key: "progress",
                header: "Cleared EMIs",
                render: (r) => {
                  const isClosed = r.status === "Closed";
                  const paid = Number(
                    r.installmentsPaidCount ??
                      (r as any).installments_paid_count ??
                      (isClosed ? r.tenure : 0)
                  );
                  const total = Number(r.tenure) || 1;
                  const rawRemaining =
                    r.installmentsRemainingCount ??
                    (r as any).installments_remaining_count;
                  const remaining = isClosed
                    ? 0
                    : (rawRemaining !== undefined &&
                       rawRemaining !== null &&
                       Number(rawRemaining) > 0)
                      ? Number(rawRemaining)
                      : Math.max(0, total - paid);
                  const pct = Math.min(100, Math.round((paid / total) * 100));
                  return (
                    <div className="w-32 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-primary">{paid}/{total}</span>
                        <span className="text-muted-foreground text-[10px]">{remaining} left</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                },
              },
              {
                key: "moratorium",
                header: "Moratoriums",
                render: (r) => {
                  const count = r.moratoriumCount || 0;
                  return count > 0 ? (
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      {count} Skipped
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  );
                },
              },
              {
                key: "status",
                header: "Status",
                render: (r) => {
                  let badgeClass = "bg-muted text-muted-foreground";
                  if (r.status === "Active") badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
                  if (r.status === "Closed") badgeClass = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                  if (r.status === "Pending") badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
                  return <Badge className={badgeClass}>{r.status}</Badge>;
                },
              },
            ]}
            actions={(r) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenStatement(r)}
                  title="View Passbook Statement"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Statement
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs text-primary hover:bg-primary/10 border-primary/30 font-medium"
                  onClick={async () => {
                    try {
                      const data = await loansApi.getStatement(r.id);
                      const emp = currentEmp || employees.find((e: any) => e.id == (r.employee || r.employeeId || r.employee_id));
                      openLoanStatementPdf(data, emp);
                    } catch (e: any) {
                      toast.error("Failed to generate PDF: " + e.message);
                    }
                  }}
                  title="Download / Print PDF"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  PDF
                </Button>
                {r.status === "Active" && (
                  r.pendingReliefRequest ? (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-medium border border-amber-300">
                      <Clock className="h-3 w-3 mr-1 animate-spin" /> Relief Pending
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                      onClick={() => handleOpenReliefModal(r)}
                    >
                      <HeartHandshake className="h-3.5 w-3.5 mr-1" />
                      Request Relief
                    </Button>
                  )
                )}
              </div>
            )}
          />
        )
      ) : activeTab === "advances" ? (
        <DataTable
          rows={advanceRows}
          rowKey={(r) => r.id}
          searchKeys={[(r) => r.employeeName || empName(r.employee || (r as any).employee_id), (r) => r.reason || ""]}
          filename="salary_advances_register.csv"
          filters={[
            {
              label: "Status",
              key: "status",
              options: ["Pending", "Approved", "Disbursed", "Recovered", "Rejected"].map((s) => ({ value: s, label: s })),
              predicate: (r, v) => r.status === v,
            },
          ]}
          columns={[
            {
              key: "emp",
              header: "Employee",
              accessor: (r) => r.employeeName || empName(r.employee || (r as any).employee_id),
              render: (r) => {
                const name = r.employeeName || empName(r.employee || (r as any).employee_id);
                const code = r.employeeCode || empCode(r.employee || (r as any).employee_id);
                return (
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="text-xs text-muted-foreground">{code || `ID: ${r.employee || ""}`}</span>
                  </div>
                );
              },
            },
            {
              key: "amount",
              header: "Advance Amount",
              accessor: (r) => r.amount,
              render: (r) => <span className="font-semibold text-foreground">{fmtINR(r.amount)}</span>,
            },
            {
              key: "tenure",
              header: "Tenure",
              render: (r) => (
                <Badge variant="outline" className="font-normal">
                  {r.tenure} {r.tenure === 1 ? "Month" : "Months"}
                </Badge>
              ),
            },
            {
              key: "monthly",
              header: "Monthly Recovery",
              accessor: (r) => r.monthlyInstallment,
              render: (r) => <span className="text-foreground">{fmtINR(r.monthlyInstallment)}</span>,
            },
            {
              key: "outstanding",
              header: "Outstanding",
              accessor: (r) => r.outstanding,
              render: (r) => (
                <span className={cn("font-medium", Number(r.outstanding) > 0 ? "text-amber-600" : "text-emerald-600")}>
                  {fmtINR(r.outstanding)}
                </span>
              ),
            },
            {
              key: "startPeriod",
              header: "Recovery Period",
              render: (r) => (
                <span className="text-xs font-mono text-muted-foreground">{r.startPeriod || "Immediate"}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => {
                let badgeClass = "bg-muted text-muted-foreground";
                if (r.status === "Pending") badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
                if (r.status === "Approved") badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
                if (r.status === "Disbursed") badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
                if (r.status === "Recovered") badgeClass = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                if (r.status === "Rejected") badgeClass = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                return <Badge className={badgeClass}>{r.status}</Badge>;
              },
            },
          ]}
          actions={(r) => (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelectedAdvanceForSchedule(r);
                  setScheduleModalOpen(true);
                }}
                title="View Recovery Schedule"
              >
                <CalendarClock className="h-3.5 w-3.5 mr-1" />
                Schedule
              </Button>

              {r.status === "Pending" && canUpdate && (
                <>
                  <Button
                    size="sm"
                    className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApproveAdvance(r.id)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs text-red-600 hover:bg-red-50 border-red-200"
                    onClick={() => handleRejectAdvance(r.id)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </>
              )}

              {r.status === "Approved" && canUpdate && (
                <Button
                  size="sm"
                  className="h-8 px-2.5 text-xs bg-[#0f172a] hover:bg-[#1e293b] text-white"
                  onClick={() => handleOpenDisburseModal(r)}
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                  Disburse
                </Button>
              )}
            </div>
          )}
        />
      ) : activeTab === "relief" ? (
        <DataTable
          rows={reliefRequests}
          rowKey={(r: any) => r.id}
          searchKeys={[(r: any) => r.employeeName || empName(r.employee), (r: any) => r.reason || ""]}
          filename="emi_relief_requests.csv"
          filters={[
            {
              label: "Status",
              key: "status",
              options: ["PENDING", "APPROVED", "REJECTED"].map((s) => ({ value: s, label: s })),
              predicate: (r: any, v) => r.status === v,
            },
          ]}
          columns={[
            {
              key: "emp",
              header: "Employee",
              accessor: (r: any) => r.employeeName || empName(r.employee),
              render: (r: any) => {
                const name = r.employeeName || empName(r.employee);
                const code = r.employeeCode || empCode(r.employee);
                return (
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="text-xs text-muted-foreground">{code || `ID: ${r.employee || ""}`}</span>
                  </div>
                );
              },
            },
            {
              key: "loan",
              header: "Loan / EMI",
              render: (r: any) => (
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Loan #{r.loanId || r.loan}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    EMI: {fmtINR(r.loanEmi || 0)} / Principal: {fmtINR(r.loanAmount || 0)}
                  </span>
                </div>
              ),
            },
            {
              key: "preferred_strategy",
              header: "Requested Option",
              render: (r: any) => {
                const opt = r.preferredStrategy || r.preferred_strategy;
                return (
                  <Badge variant="outline" className="text-xs font-normal">
                    {opt === "EXTEND_TENURE"
                      ? "Option A: Extend Tenure"
                      : opt === "ADJUST_NEXT_MONTH"
                      ? "Option B: Double Next Month"
                      : "Option C: Either / Discretion"}
                  </Badge>
                );
              },
            },
            {
              key: "reason",
              header: "Hardship Reason",
              render: (r: any) => (
                <p className="text-xs italic text-foreground max-w-xs truncate" title={r.reason}>
                  "{r.reason}"
                </p>
              ),
            },
            {
              key: "applied_strategy",
              header: "Approved Strategy & Notes",
              render: (r: any) => (
                <div className="text-xs">
                  {r.appliedStrategy ? (
                    <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-normal">
                      {r.appliedStrategyDisplay || r.appliedStrategy}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground italic">Awaiting review</span>
                  )}
                  {r.decisionRemarks && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1" title={r.decisionRemarks}>
                      {r.decisionRemarks}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r: any) => {
                if (r.status === "PENDING") {
                  return (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse font-medium">
                      Pending Review
                    </Badge>
                  );
                }
                if (r.status === "APPROVED") {
                  return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Approved</Badge>;
                }
                return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Rejected</Badge>;
              },
            },
          ]}
          actions={(r: any) => (
            <div className="flex items-center justify-end gap-1.5">
              {r.status === "PENDING" && isCeo && (
                <Button
                  size="sm"
                  className="h-8 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
                  onClick={() => handleOpenCeoDecisionModal(r)}
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Review & Decide
                </Button>
              )}
            </div>
          )}
        />
      ) : (
      <DataTable
        rows={displayedRows}
        rowKey={(r) => r.id}
        searchKeys={[(r) => empName(r.employee || r.employeeId || r.employee_id), (r) => r.type]}
        filename="loans_statement_register.csv"
        filters={[
          {
            label: "Type",
            key: "type",
            options: ["Personal", "Salary Advance", "Education"].map((s) => ({
              value: s,
              label: s,
            })),
            predicate: (r, v) => r.type === v,
          },
          {
            label: "Status",
            key: "status",
            options: ["Active", "Closed", "Pending"].map((s) => ({ value: s, label: s })),
            predicate: (r, v) => r.status === v,
          },
        ]}
        columns={[
          {
            key: "emp",
            header: "Employee",
            accessor: (r) => empName(r.employee || r.employeeId || r.employee_id),
            render: (r) => {
              const name = empName(r.employee || r.employeeId || r.employee_id);
              const code = empCode(r.employee || r.employeeId || r.employee_id);
              return (
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{name}</span>
                  <span className="text-xs text-muted-foreground">{code || `ID: ${r.employee || ""}`}</span>
                </div>
              );
            },
          },
          {
            key: "type",
            header: "Type",
            render: (r) => (
              <Badge variant="outline" className="font-normal">
                {r.type}
              </Badge>
            ),
          },
          {
            key: "amount",
            header: "Principal",
            accessor: (r) => r.amount,
            render: (r) => <span className="font-semibold">{fmtINR(r.amount)}</span>,
          },
          {
            key: "emi",
            header: "Monthly EMI",
            render: (r) => <span className="text-muted-foreground font-medium">{fmtINR(r.emi)}</span>,
          },
          {
            key: "instalments",
            header: "Instalments Progress",
            render: (r) => {
              const isClosed = r.status === "Closed";
              const paid = Number(
                r.installmentsPaidCount ??
                  (r as any).installments_paid_count ??
                  (isClosed ? r.tenure : 0)
              );
              const total = Number(r.tenure) || 1;
              const rawRemaining =
                r.installmentsRemainingCount ??
                (r as any).installments_remaining_count;
              const remaining = isClosed
                ? 0
                : (rawRemaining !== undefined &&
                   rawRemaining !== null &&
                   Number(rawRemaining) > 0)
                  ? Number(rawRemaining)
                  : Math.max(0, total - paid);
              const pct = Math.min(100, Math.round((paid / total) * 100));

              return (
                <div className="w-36 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary">
                      {paid} / {total} Paid
                    </span>
                    <span className="text-muted-foreground text-[11px]">{remaining} left</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            },
          },
          {
            key: "out",
            header: "Outstanding",
            render: (r) => (
              <span className={`font-semibold ${Number(r.outstanding) > 0 ? "text-foreground" : "text-success"}`}>
                {fmtINR(r.outstanding)}
              </span>
            ),
          },
          {
            key: "moratorium",
            header: "Moratoriums",
            render: (r) => {
              const count = r.moratoriumCount || 0;
              if (count === 0) return <span className="text-xs text-muted-foreground">—</span>;
              return (
                <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200">
                  {count} skipped
                </Badge>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            render: (r) => {
              let displayStatus = r.status;
              let badgeClass = "bg-warning text-warning-foreground";

              if (r.status === "Active") {
                displayStatus = "Active";
                badgeClass = "bg-info text-info-foreground";
              } else if (r.status === "Closed") {
                if (r.outstanding === r.amount && r.amount > 0) {
                  displayStatus = "Rejected";
                  badgeClass = "bg-destructive text-destructive-foreground";
                } else {
                  displayStatus = "Closed";
                  badgeClass = "bg-success text-success-foreground";
                }
              }

              return <Badge className={badgeClass}>{displayStatus}</Badge>;
            },
          },
        ]}
        actions={(r) => {
          const currentEmpCode = user?.employee_id;
          const myEmpObj = employees.find((e: any) => e.code === currentEmpCode || e.employeeId === currentEmpCode);
          const myDbId = myEmpObj?.id;

          const loanEmpId = r.employee || r.employeeId || r.employee_id;
          const isMyLoan = Boolean(myDbId && loanEmpId && myDbId == loanEmpId);

          return (
            <div className="flex items-center justify-end gap-1.5">
              {/* Passbook / Statement Button */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleOpenStatement(r)}
                title="View Passbook Statement"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Statement
              </Button>

              {/* Direct Download / Print PDF Button */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-primary hover:bg-primary/10 border-primary/30 font-medium"
                onClick={async () => {
                  try {
                    const data = await loansApi.getStatement(r.id);
                    const emp = employees.find((e: any) => e.id == (r.employee || r.employeeId || r.employee_id));
                    openLoanStatementPdf(data, emp);
                  } catch (e: any) {
                    toast.error("Failed to generate PDF: " + e.message);
                  }
                }}
                title="Download / Print PDF Statement"
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                PDF
              </Button>

              {/* CEO / Management Skip EMI Button */}
              {isCeo && r.status === "Active" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  onClick={() => handleOpenSkipModal(r)}
                  title="Skip / Defer EMI for Employee Relief"
                >
                  <CalendarClock className="h-3.5 w-3.5 mr-1" />
                  Skip EMI
                </Button>
              )}

              {/* Employee Request EMI Relief Button */}
              {isMyLoan && r.status === "Active" && (
                r.pendingReliefRequest ? (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-medium border border-amber-300">
                    <Clock className="h-3 w-3 mr-1 animate-spin" /> Relief Pending
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 px-2.5 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-xs"
                    onClick={() => handleOpenReliefModal(r)}
                    title="Request EMI Moratorium / Skip"
                  >
                    <HeartHandshake className="h-3.5 w-3.5 mr-1" />
                    Request Relief
                  </Button>
                )
              )}

              {/* Pending Approval / Rejection (Management Only, not self) */}
              {canUpdate && !isMyLoan && r.status === "Pending" && (
                <>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-success hover:text-success border-success/30 hover:bg-success/10"
                    onClick={async () => {
                      try {
                        const updated = await loansApi.updateLoan(r.id, { status: "Active" });
                        setRows((rs) => rs.map((x) => (x.id === r.id ? updated : x)));
                        toast.success("Loan approved and schedule generated");
                      } catch (e: any) {
                        toast.error("Failed to approve: " + e.message);
                      }
                    }}
                    title="Approve Loan"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={async () => {
                      try {
                        const updated = await loansApi.updateLoan(r.id, {
                          status: "Closed",
                          outstanding: r.amount,
                        });
                        setRows((rs) => rs.map((x) => (x.id === r.id ? updated : x)));
                        toast.success("Loan rejected");
                      } catch (e: any) {
                        toast.error("Failed to reject: " + e.message);
                      }
                    }}
                    title="Reject Loan"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          );
        }}
      />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STATEMENT / PASSBOOK MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={statementOpen} onOpenChange={setStatementOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Loan Passbook & Statement
                </DialogTitle>
                <DialogDescription>
                  Complete installment repayment history, upcoming deductions, and deferred moratoriums
                </DialogDescription>
              </div>
              {selectedLoan && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    onClick={() => {
                      if (statementData) {
                        const emp = employees.find(
                          (e: any) => e.id == (statementData.loan.employee || statementData.loan.employeeId)
                        );
                        openLoanStatementPdf(statementData, emp);
                      }
                    }}
                    disabled={!statementData}
                  >
                    <Printer className="h-4 w-4 mr-1.5" />
                    Download PDF Statement
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loansApi.exportStatement(selectedLoan.id)}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Export CSV
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {isLoadingStatement ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Loading passbook statement...</p>
            </div>
          ) : statementData ? (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Header Details Card */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Borrower</p>
                  <p className="font-semibold text-sm mt-0.5">
                    {empName(statementData.loan.employee || statementData.loan.employeeId || "")}
                  </p>
                  <p className="text-muted-foreground">{empCode(statementData.loan.employee || statementData.loan.employeeId || "")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Principal & Type</p>
                  <p className="font-semibold text-sm mt-0.5">{fmtINR(statementData.summary.principal)}</p>
                  <Badge variant="outline" className="mt-1 text-[11px] font-normal">
                    {statementData.loan.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly EMI</p>
                  <p className="font-semibold text-sm mt-0.5">{fmtINR(statementData.summary.emi)}</p>
                  <p className="text-muted-foreground">{statementData.summary.tenure} total months</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Balance</p>
                  <p className="font-semibold text-sm mt-0.5 text-primary">
                    {fmtINR(statementData.summary.outstanding)}
                  </p>
                  <p className="text-success text-[11px] font-medium">
                    {statementData.summary.installmentsPaid} paid ({statementData.summary.installmentsRemaining} remaining)
                  </p>
                </div>
              </div>

              {/* Installments Ledger Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Period / Cycle</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">EMI Amount</th>
                      <th className="py-2.5 px-3">Paid Amount</th>
                      <th className="py-2.5 px-3">Balance After</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Notes / Moratorium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {statementData.installments.map((inst) => {
                      const isDebited = inst.status === "DEBITED";
                      const isSkipped = inst.status === "SKIPPED";
                      const isPending = inst.status === "PENDING";

                      return (
                        <tr
                          key={inst.id}
                          className={
                            isSkipped
                              ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                              : isDebited
                              ? "bg-success/5"
                              : "hover:bg-muted/30"
                          }
                        >
                          <td className="py-2.5 px-3 font-medium">#{inst.installmentNumber}</td>
                          <td className="py-2.5 px-3 font-semibold text-foreground">{inst.period}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{inst.dueDate}</td>
                          <td className="py-2.5 px-3 font-semibold">{fmtINR(inst.emiAmount)}</td>
                          <td className="py-2.5 px-3">
                            {isDebited ? (
                              <span className="text-success font-semibold">{fmtINR(inst.paidAmount)}</span>
                            ) : (
                              <span className="text-muted-foreground">₹0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium">{fmtINR(inst.balanceAfter)}</td>
                          <td className="py-2.5 px-3">
                            {isDebited && (
                              <Badge className="bg-success text-success-foreground text-[10px] px-2 py-0.5">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Debited
                              </Badge>
                            )}
                            {isSkipped && (
                              <Badge className="bg-indigo-600 text-white text-[10px] px-2 py-0.5">
                                <PauseCircle className="h-3 w-3 mr-1" />
                                Skipped / Deferred
                              </Badge>
                            )}
                            {isPending && (
                              <Badge variant="outline" className="text-warning border-warning/40 text-[10px] px-2 py-0.5">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                            {isSkipped && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                [{inst.skipStrategy === "EXTEND_TENURE" ? "Tenure +1 Mo" : "Next Mo Catchup"}]{" "}
                                {inst.skipReason || "Employee Request"}
                              </span>
                            )}
                            {isDebited && inst.debitedInRunPeriod && (
                              <span className="text-xs text-muted-foreground">
                                Debited in Payroll Run ({inst.debitedInRunPeriod})
                              </span>
                            )}
                            {isPending && "Scheduled for payroll cut"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No statement data found.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatementOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SKIP / DEFER EMI MODAL (EXECUTIVE / CEO ACTION) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={skipOpen} onOpenChange={setSkipOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <CalendarClock className="h-5 w-5" />
              Skip Monthly EMI / Grant Moratorium
            </DialogTitle>
            <DialogDescription>
              Temporarily remove EMI deduction from payroll on employee request. The system will automatically adjust recovery.
            </DialogDescription>
          </DialogHeader>

          {skipLoan && (
            <div className="space-y-4 py-2 text-xs">
              {/* Target Loan Summary Banner */}
              <div className="p-3.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {empName(skipLoan.employee || skipLoan.employeeId || "")}
                  </p>
                  <p className="text-muted-foreground text-xs">{skipLoan.type} Loan</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{fmtINR(skipLoan.emi)} / mo</p>
                  <p className="text-muted-foreground text-xs">{skipLoan.tenure} months tenure</p>
                </div>
              </div>

              {/* Installment to Skip Selector */}
              <div className="space-y-1.5">
                <Label>Select Installment to Skip</Label>
                <Select value={selectedInstId} onValueChange={setSelectedInstId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose cycle installment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {skipInstallments.map((inst) => (
                      <SelectItem key={inst.id} value={String(inst.id)}>
                        Installment #{inst.installmentNumber} — Cycle {inst.period} ({fmtINR(inst.emiAmount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mandatory Reason for Relief */}
              <div className="space-y-1.5">
                <Label>
                  Reason for Employee Request / Relief <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Employee medical emergency financial relief request"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  This note will be recorded in the audit trail and displayed on the employee's salary slip.
                </p>
              </div>

              {/* Recovery Strategy Selection */}
              <div className="space-y-2">
                <Label>Automated Recovery Strategy</Label>
                <div className="grid grid-cols-1 gap-2">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      skipStrategy === "EXTEND_TENURE"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setSkipStrategy("EXTEND_TENURE")}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={skipStrategy === "EXTEND_TENURE"}
                      onChange={() => setSkipStrategy("EXTEND_TENURE")}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-semibold text-foreground">
                        Extend Loan Tenure (+1 Month) <Badge variant="secondary" className="ml-1 text-[10px]">Recommended</Badge>
                      </p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Zero deduction this month. Tenure extends from {skipLoan.tenure} to {skipLoan.tenure + 1} months.
                        Regular monthly EMI remains unchanged.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      skipStrategy === "ADJUST_NEXT_MONTH"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setSkipStrategy("ADJUST_NEXT_MONTH")}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={skipStrategy === "ADJUST_NEXT_MONTH"}
                      onChange={() => setSkipStrategy("ADJUST_NEXT_MONTH")}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-semibold text-foreground">
                        Adjust in Next Month (Double EMI)
                      </p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Zero deduction this month. Next month deducts {fmtINR(skipLoan.emi * 2)}.
                        Original tenure duration is preserved.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipOpen(false)} disabled={isSkipping}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSkip} disabled={isSkipping} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSkipping ? "Applying Moratorium..." : "Confirm & Skip EMI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* NEW LOAN REQUEST MODAL (EXISTING PRESERVED) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Loan Request</DialogTitle>
            <DialogDescription>
              Submit a new employee loan or salary advance for approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              {currentEmp && (user?.role === "employee" || !canUpdate) ? (
                <div className="h-9 px-3 py-1.5 rounded-md bg-muted/60 border text-xs flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {currentEmp.firstName} {currentEmp.lastName}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {currentEmp.code || currentEmp.employeeId || `ID: ${currentEmp.id}`}
                  </Badge>
                </div>
              ) : (
                <Select
                  value={form.employee}
                  onValueChange={(v) => setForm({ ...form, employee: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e: any) => (
                      <SelectItem key={e.id} value={e.id.toString()}>
                        {e.firstName} {e.lastName} ({e.code || e.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Loan Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Salary Advance">Salary Advance</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Principal Amount</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => {
                  const amt = +e.target.value;
                  const newTenure = form.emi > 0 ? Math.ceil(amt / form.emi) : form.tenure;
                  setForm({ ...form, amount: amt, tenure: newTenure });
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Monthly EMI Amount</Label>
                <Input
                  type="number"
                  value={form.emi}
                  onChange={(e) => {
                    const emiVal = +e.target.value;
                    const newTenure = emiVal > 0 ? Math.ceil(form.amount / emiVal) : form.tenure;
                    setForm({ ...form, emi: emiVal, tenure: newTenure });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tenure (months)</Label>
                <Input
                  type="number"
                  value={form.tenure}
                  onChange={(e) => setForm({ ...form, tenure: +e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Create Loan Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* REQUEST SALARY ADVANCE MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={openCreateAdvance} onOpenChange={setOpenCreateAdvance}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Salary Advance</DialogTitle>
            <DialogDescription>
              Short-term salary advance with automated monthly payroll recovery.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Employee</Label>
              {currentEmp && (user?.role === "employee" || !canUpdate) ? (
                <div className="h-9 px-3 py-1.5 rounded-md bg-muted/60 border text-xs flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {currentEmp.firstName} {currentEmp.lastName}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {currentEmp.code || currentEmp.employeeId || `ID: ${currentEmp.id}`}
                  </Badge>
                </div>
              ) : (
                <Select
                  value={advanceForm.employee}
                  onValueChange={(val) => setAdvanceForm({ ...advanceForm, employee: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {employees.map((e: any) => (
                      <SelectItem key={e.id} value={String(e.id)} className="text-xs">
                        {e.firstName} {e.lastName} ({e.code || e.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Advance Amount (₹)</Label>
              <Input
                type="number"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({ ...advanceForm, amount: +e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Repayment Tenure</Label>
              <Select
                value={String(advanceForm.tenure)}
                onValueChange={(val) => setAdvanceForm({ ...advanceForm, tenure: parseInt(val) })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Repayment Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-xs">1 Month (Lump Sum Recovery)</SelectItem>
                  <SelectItem value="2" className="text-xs">2 Months (Split Recovery)</SelectItem>
                  <SelectItem value="3" className="text-xs">3 Months (Standard Advance)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Monthly recovery deduction: <strong>{fmtINR(advanceForm.amount / (advanceForm.tenure || 1))}</strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Start Recovery Month (YYYY-MM)</Label>
              <Input
                placeholder="e.g. 2026-12"
                value={advanceForm.start_period}
                onChange={(e) => setAdvanceForm({ ...advanceForm, start_period: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason / Purpose</Label>
              <Input
                placeholder="e.g. Medical emergency, Moving expenses"
                value={advanceForm.reason}
                onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenCreateAdvance(false)} disabled={isSubmittingAdvance}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateAdvance} disabled={isSubmittingAdvance} className="bg-[#0f172a] hover:bg-[#1e293b] text-white">
              {isSubmittingAdvance ? "Submitting..." : "Submit Advance Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DISBURSE SALARY ADVANCE MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={disburseModalOpen} onOpenChange={setDisburseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disburse Salary Advance</DialogTitle>
            <DialogDescription>
              Record disbursement details for {selectedAdvanceForDisburse?.employeeName || "the employee"}.
            </DialogDescription>
          </DialogHeader>

          {selectedAdvanceForDisburse && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg border flex justify-between">
                <div>
                  <span className="text-muted-foreground">Disbursing Principal:</span>
                  <p className="font-bold text-base text-foreground mt-0.5">{fmtINR(selectedAdvanceForDisburse.amount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly Deduction:</span>
                  <p className="font-semibold text-foreground mt-0.5">{fmtINR(selectedAdvanceForDisburse.monthlyInstallment)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Disbursement Mode</Label>
                <Select
                  value={disburseForm.disbursement_mode}
                  onValueChange={(val) => setDisburseForm({ ...disburseForm, disbursement_mode: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</SelectItem>
                    <SelectItem value="Cheque">Company Cheque</SelectItem>
                    <SelectItem value="Cash">Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Transaction / Reference Number</Label>
                <Input
                  placeholder="e.g. UTR-90218932 or Cheque #09123"
                  value={disburseForm.disbursement_ref}
                  onChange={(e) => setDisburseForm({ ...disburseForm, disbursement_ref: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Start Recovery Period (YYYY-MM)</Label>
                <Input
                  value={disburseForm.start_period}
                  onChange={(e) => setDisburseForm({ ...disburseForm, start_period: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDisburseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDisburseAdvance}
              disabled={isSubmittingDisburse}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmittingDisburse ? "Disbursing..." : "Confirm Disbursement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ADVANCE RECOVERY SCHEDULE DRAWER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advance Recovery Schedule</DialogTitle>
            <DialogDescription>
              Monthly deduction schedule tracked directly against payroll runs.
            </DialogDescription>
          </DialogHeader>

          {selectedAdvanceForSchedule && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border text-xs">
                <div>
                  <span className="text-muted-foreground">Total Advance:</span>
                  <p className="font-bold text-sm text-foreground">{fmtINR(selectedAdvanceForSchedule.amount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Outstanding Balance:</span>
                  <p className="font-bold text-sm text-amber-600">{fmtINR(selectedAdvanceForSchedule.outstanding)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tenure:</span>
                  <p className="font-bold text-sm text-foreground">{selectedAdvanceForSchedule.tenure} Months</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                    <tr>
                      <th className="p-2.5 text-left">#</th>
                      <th className="p-2.5 text-left">Period</th>
                      <th className="p-2.5 text-left">Due Date</th>
                      <th className="p-2.5 text-right">Recovery Amount</th>
                      <th className="p-2.5 text-right">Balance After</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-left">Debited In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(selectedAdvanceForSchedule.installments || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-muted-foreground">
                          No schedule generated yet. Schedule is created upon disbursement.
                        </td>
                      </tr>
                    ) : (
                      selectedAdvanceForSchedule.installments?.map((inst) => (
                        <tr key={inst.id} className="hover:bg-muted/20">
                          <td className="p-2.5 font-medium">{inst.installmentNumber}</td>
                          <td className="p-2.5 font-mono">{inst.period}</td>
                          <td className="p-2.5">{inst.dueDate}</td>
                          <td className="p-2.5 text-right font-medium">{fmtINR(inst.amount)}</td>
                          <td className="p-2.5 text-right">{fmtINR(inst.balanceAfter)}</td>
                          <td className="p-2.5 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5",
                                inst.status === "RECOVERED" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                inst.status === "PENDING" && "bg-amber-50 text-amber-700 border-amber-200",
                                inst.status === "SKIPPED" && "bg-purple-50 text-purple-700 border-purple-200"
                              )}
                            >
                              {inst.status}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-muted-foreground font-mono text-[11px]">
                            {inst.debitedInPayslipNumber || inst.debitedInRunPeriod || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setScheduleModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* EMPLOYEE EMI RELIEF REQUEST DIALOG */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={reliefModalOpen} onOpenChange={setReliefModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-indigo-500" />
              Request Loan EMI Relief (Moratorium)
            </DialogTitle>
            <DialogDescription>
              Facing financial or medical hardship this month? Request to skip your upcoming monthly EMI deduction.
            </DialogDescription>
          </DialogHeader>

          {targetLoanForRelief && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg border flex justify-between">
                <div>
                  <span className="text-muted-foreground">Monthly EMI Amount:</span>
                  <p className="font-bold text-base text-emerald-600 mt-0.5">{fmtINR(targetLoanForRelief.emi)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Outstanding Balance:</span>
                  <p className="font-bold text-base text-foreground mt-0.5">{fmtINR(targetLoanForRelief.outstanding)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Preferred Moratorium Strategy</Label>
                <Select
                  value={reliefForm.preferred_strategy}
                  onValueChange={(val) => setReliefForm({ ...reliefForm, preferred_strategy: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXTEND_TENURE">
                      Option A: Extend Tenure (+1 Month, ₹0 this month, standard EMI continues)
                    </SelectItem>
                    <SelectItem value="ADJUST_NEXT_MONTH">
                      Option B: Double EMI Next Month (₹0 this month, pay 2 EMIs next month)
                    </SelectItem>
                    <SelectItem value="EITHER">
                      Option C: Either / CEO Discretion (Accept whichever CEO approves)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  * Final relief approval and option selection is subject to executive review by the CEO.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Hardship Reason (Mandatory) *</Label>
                <Input
                  placeholder="e.g., Medical emergency / Temporary financial crunch this month..."
                  value={reliefForm.reason}
                  onChange={(e) => setReliefForm({ ...reliefForm, reason: e.target.value })}
                  className="h-10 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReliefModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitRelief}
              disabled={isSubmittingRelief}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {isSubmittingRelief ? "Submitting..." : "Submit Relief Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CEO DECISION & MORATORIUM APPROVAL DIALOG */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={ceoDecisionModalOpen} onOpenChange={setCeoDecisionModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Executive Review: Loan EMI Relief Request
            </DialogTitle>
            <DialogDescription>
              Review hardship details and approve or reject moratorium for this payroll cycle.
            </DialogDescription>
          </DialogHeader>

          {selectedReliefForDecision && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
                <div>
                  <span className="text-muted-foreground">Employee:</span>
                  <p className="font-bold text-foreground mt-0.5">
                    {selectedReliefForDecision.employeeName || empName(selectedReliefForDecision.employee)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly EMI to Skip:</span>
                  <p className="font-bold text-emerald-600 mt-0.5">
                    {fmtINR(selectedReliefForDecision.loanEmi || 0)}
                  </p>
                </div>
                <div className="col-span-2 pt-1 border-t">
                  <span className="text-muted-foreground">Hardship Reason:</span>
                  <p className="font-medium text-foreground mt-0.5 italic">
                    "{selectedReliefForDecision.reason}"
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Employee Preferred:</span>
                  <Badge variant="outline" className="ml-2 font-normal">
                    {selectedReliefForDecision.preferredStrategyDisplay || selectedReliefForDecision.preferredStrategy}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Moratorium Execution Strategy</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setCeoDecisionForm({ ...ceoDecisionForm, strategy: "EXTEND_TENURE" })}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      ceoDecisionForm.strategy === "EXTEND_TENURE"
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <span className="font-semibold block text-foreground">Option A: Extend Tenure</span>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Skip this month. Add +1 month to loan end. Standard EMI amount unchanged.
                    </span>
                  </div>

                  <div
                    onClick={() => setCeoDecisionForm({ ...ceoDecisionForm, strategy: "ADJUST_NEXT_MONTH" })}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      ceoDecisionForm.strategy === "ADJUST_NEXT_MONTH"
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <span className="font-semibold block text-foreground">Option B: Double Next Month</span>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Skip this month. Next month's EMI is doubled (2x). Total loan tenure unchanged.
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Executive Remarks / Audit Note</Label>
                <Input
                  placeholder="e.g. Approved due to hospitalization expense. Adjusted per CEO approval."
                  value={ceoDecisionForm.remarks}
                  onChange={(e) => setCeoDecisionForm({ ...ceoDecisionForm, remarks: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 border-red-200"
              onClick={() => handleSubmitCeoDecision("REJECT")}
              disabled={isSubmittingDecision}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Reject Request
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCeoDecisionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                onClick={() => handleSubmitCeoDecision("APPROVE")}
                disabled={isSubmittingDecision}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {isSubmittingDecision ? "Executing..." : "Approve & Execute Moratorium"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
