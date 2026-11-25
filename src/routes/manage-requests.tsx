import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle2,
  UserMinus,
  TrendingUp,
  ShieldCheck,
  FileText,
  CalendarCheck,
  UserX,
  Laptop,
  CreditCard,
  Building2,
  Check,
  X,
  Calculator,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { employeesApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn, fmtINR } from "@/lib/utils";
import type { EmployeeExit, FnFStatement } from "@/types";

export const Route = createFileRoute("/manage-requests")({
  component: ManageRequestsPage,
});

function ManageRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Clearance Modal State
  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);
  const [selectedExitForClearance, setSelectedExitForClearance] = useState<any>(null);
  const [clearanceDept, setClearanceDept] = useState<string>("it");
  const [clearanceRemarks, setClearanceRemarks] = useState<string>("");
  const [isSubmittingClearance, setIsSubmittingClearance] = useState(false);

  // FnF Modal State
  const [fnfModalOpen, setFnFModalOpen] = useState(false);
  const [selectedExitForFnF, setSelectedExitForFnF] = useState<any>(null);
  const [fnfData, setFnFData] = useState<FnFStatement | null>(null);
  const [isLoadingFnF, setIsLoadingFnF] = useState(false);
  const [waiveShortfall, setWaiveShortfall] = useState(false);
  const [fnfRemarks, setFnFRemarks] = useState("");
  const [isSubmittingFnF, setIsSubmittingFnF] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [exitsData, empsData] = await Promise.all([
        employeesApi.getExits(),
        employeesApi.getAll(),
      ]);
      setRequests(exitsData);

      const empMap: Record<number, any> = {};
      empsData.forEach((emp: any) => {
        empMap[emp.id] = emp;
      });
      setEmployees(empMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setLoading(true);
      await employeesApi.updateExit(id, {
        status: "Approved",
        manager_approved: true,
        hr_cleared: true,
      });
      toast.success("Request approved successfully");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve request");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setLoading(true);
      await employeesApi.updateExit(id, { status: "Rejected" });
      toast.success("Request rejected");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClearance = (req: any) => {
    setSelectedExitForClearance(req);
    setClearanceDept("it");
    setClearanceRemarks("");
    setClearanceModalOpen(true);
  };

  const handleSubmitClearance = async (dept: string, cleared: boolean) => {
    if (!selectedExitForClearance) return;
    try {
      setIsSubmittingClearance(true);
      await employeesApi.updateClearance(selectedExitForClearance.id, {
        department: dept,
        cleared,
        remarks: clearanceRemarks,
      });
      toast.success(`${dept.toUpperCase()} clearance updated.`);
      setClearanceRemarks("");
      await fetchData();
      setClearanceModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update clearance");
    } finally {
      setIsSubmittingClearance(false);
    }
  };

  const handleOpenFnF = async (req: any) => {
    setSelectedExitForFnF(req);
    setFnFModalOpen(true);
    setIsLoadingFnF(true);
    setWaiveShortfall(false);
    setFnFRemarks("");
    try {
      const res = await employeesApi.getFnFSettlement(req.id);
      setFnFData(res.preview || res.fnf_statement);
    } catch (err: any) {
      toast.error(err.message || "Failed to calculate FnF settlement");
    } finally {
      setIsLoadingFnF(false);
    }
  };

  const handleSettleFnF = async () => {
    if (!selectedExitForFnF) return;
    try {
      setIsSubmittingFnF(true);
      await employeesApi.settleFnF(selectedExitForFnF.id, {
        waive_shortfall: waiveShortfall,
        remarks: fnfRemarks,
      });
      toast.success("Full & Final settlement recorded. Employee marked Exited.");
      setFnFModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to settle FnF");
    } finally {
      setIsSubmittingFnF(false);
    }
  };

  const openRequests = requests.filter((r) => r.status === "Pending").length;
  const approvedRequests = requests.filter((r) => r.status === "Approved").length;
  const completedRequests = requests.filter((r) => r.status === "Completed" || r.status === "Deactivated").length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Separation & Clearances Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Department clearances (IT, Finance, Manager, HR), Full & Final (FnF) settlements, and LWD deactivation.
          </p>
        </div>
        <Link to="/employee-separation">
          <Button className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6">
            <FileText className="w-4 h-4 mr-2" />
            Raise a request
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Pending Clearances"
          value={openRequests}
          icon={Clock}
          onClick={() => setStatusFilter(statusFilter === "Pending" ? null : "Pending")}
          active={statusFilter === "Pending"}
        />
        <StatCard
          label="Approved / Active Exits"
          value={approvedRequests}
          icon={CheckCircle2}
          onClick={() => setStatusFilter(statusFilter === "Approved" ? null : "Approved")}
          active={statusFilter === "Approved"}
        />
        <StatCard
          label="Completed & Relieved"
          value={completedRequests}
          icon={UserMinus}
          onClick={() => setStatusFilter(statusFilter === "Completed" ? null : "Completed")}
          active={statusFilter === "Completed"}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Exit Requests & Clearances</h2>
            {statusFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter(null)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Clear filter
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900">No separation requests found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {statusFilter ? `No ${statusFilter.toLowerCase()} requests currently.` : "Submitted separation requests will appear here for review."}
                </p>
              </div>
            ) : (
              requests
                .filter(r => !statusFilter || r.status === statusFilter)
                .map((req) => {
                  const emp = employees[req.employee] || {};
                  const initials = `${(emp.firstName || emp.first_name || "E")[0] || ""}${(emp.lastName || emp.last_name || "")[0] || ""}`.toUpperCase() || "EMP";
                  const fullName = emp.id
                    ? `${emp.firstName || emp.first_name || ""} ${emp.lastName || emp.last_name || ""}`.trim()
                    : req.employee_name || `Employee #${req.employee}`;

                  return (
                    <div key={req.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-slate-100 hover:bg-slate-50/50 gap-4 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-semibold text-sm shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{fullName}</span>
                            <span className="text-xs text-slate-400 font-mono">({emp.code || req.employee_code || `EMP${req.employee}`})</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            LWD: <strong className="text-slate-700">{req.last_working_day}</strong> • Reason: {req.reason || req.exit_type}
                          </p>

                          {/* Department Clearance Indicators */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Clearances:</span>
                            <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5 py-0", req.manager_approved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                              MGR: {req.manager_approved ? "Cleared" : "Pending"}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5 py-0", req.it_cleared ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                              IT: {req.it_cleared ? "Cleared" : "Pending"}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5 py-0", req.finance_cleared ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                              FIN: {req.finance_cleared ? "Cleared" : "Pending"}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5 py-0", req.hr_cleared ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                              HR: {req.hr_cleared ? "Cleared" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenClearance(req)}
                          className="h-8 text-xs border-slate-300 hover:bg-slate-100"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-slate-600" />
                          Clearances
                        </Button>

                        {req.status !== "Completed" && req.status !== "Rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenFnF(req)}
                            className="h-8 text-xs text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                          >
                            <Calculator className="w-3.5 h-3.5 mr-1" />
                            FnF Settlement
                          </Button>
                        )}

                        {req.status === "Pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(req.id)}
                              disabled={loading}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(req.id)}
                              disabled={loading}
                              className="h-8 text-xs text-red-600 hover:bg-red-50 border-red-200"
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        <Badge
                          variant="outline"
                          className={cn(
                            "uppercase text-[10px] font-bold px-2 py-1 rounded-full border-transparent whitespace-nowrap",
                            req.status === "Pending" && "bg-blue-100 text-blue-700",
                            req.status === "Approved" && "bg-emerald-100 text-emerald-700",
                            req.status === "Completed" && "bg-slate-100 text-slate-700",
                            req.status === "Rejected" && "bg-red-100 text-red-700",
                            req.status === "Deactivated" && "bg-purple-100 text-purple-700",
                          )}
                        >
                          {req.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Department Clearance Modal */}
      <Dialog open={clearanceModalOpen} onOpenChange={setClearanceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Department Clearances</DialogTitle>
            <DialogDescription>
              Record checklist handover and sign off department clearances for {selectedExitForClearance?.employee_name || "the employee"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={clearanceDept === "it" ? "default" : "outline"}
                size="sm"
                onClick={() => setClearanceDept("it")}
                className="text-xs"
              >
                <Laptop className="w-3.5 h-3.5 mr-1.5" />
                IT Hardware & Access
              </Button>
              <Button
                variant={clearanceDept === "finance" ? "default" : "outline"}
                size="sm"
                onClick={() => setClearanceDept("finance")}
                className="text-xs"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                Finance & Dues
              </Button>
              <Button
                variant={clearanceDept === "manager" ? "default" : "outline"}
                size="sm"
                onClick={() => setClearanceDept("manager")}
                className="text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Manager Handover
              </Button>
              <Button
                variant={clearanceDept === "hr" ? "default" : "outline"}
                size="sm"
                onClick={() => setClearanceDept("hr")}
                className="text-xs"
              >
                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                HR & Exit Interview
              </Button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
              <p className="font-semibold text-slate-800 uppercase tracking-wide">
                Target: {clearanceDept.toUpperCase()} Department
              </p>
              <p className="text-slate-600">
                {clearanceDept === "it" && "Verify laptop, chargers, security tokens returned, and revoke system access."}
                {clearanceDept === "finance" && "Verify loan recoveries, outstanding salary advances, and credit cards."}
                {clearanceDept === "manager" && "Verify project handover, documentation, and client transitions."}
                {clearanceDept === "hr" && "Conduct exit interview, NDAs acknowledgment, and notice period review."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Remarks / Handover Reference</Label>
              <Input
                placeholder="e.g. Asset #LT-902 returned in good condition"
                value={clearanceRemarks}
                onChange={(e) => setClearanceRemarks(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmitClearance(clearanceDept, false)}
              disabled={isSubmittingClearance}
              className="text-xs text-red-600 hover:bg-red-50"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Revoke Clearance
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmitClearance(clearanceDept, true)}
              disabled={isSubmittingClearance}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Grant {clearanceDept.toUpperCase()} Clearance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full & Final (FnF) Settlement Modal */}
      <Dialog open={fnfModalOpen} onOpenChange={setFnFModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Full & Final (FnF) Settlement Sheet</DialogTitle>
            <DialogDescription>
              Review automated recovery and payable calculations for employee exit.
            </DialogDescription>
          </DialogHeader>

          {isLoadingFnF ? (
            <div className="py-12 text-center text-sm text-slate-500">Calculating FnF statement...</div>
          ) : fnfData ? (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border">
                <div>
                  <span className="text-slate-400">Employee:</span>
                  <p className="font-semibold text-slate-800">{fnfData.employeeName} ({fnfData.employeeCode})</p>
                </div>
                <div>
                  <span className="text-slate-400">Last Working Day:</span>
                  <p className="font-semibold text-slate-800">{fnfData.lastWorkingDay}</p>
                </div>
                <div>
                  <span className="text-slate-400">Monthly CTC:</span>
                  <p className="font-semibold text-slate-800">{fmtINR(fnfData.monthlyCtc)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Per Day Rate:</span>
                  <p className="font-semibold text-slate-800">{fmtINR(fnfData.dailyRate)}</p>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="space-y-2">
                <p className="font-semibold text-emerald-800 uppercase tracking-wide text-[11px]">Payable Earnings</p>
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span>Worked Days in Exit Month ({fnfData.workedDaysInExitMonth} days)</span>
                  <span className="font-semibold text-emerald-700">{fmtINR(fnfData.unpaidSalary)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>Total Payable:</span>
                  <span className="text-emerald-700">{fmtINR(fnfData.totalEarnings)}</span>
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="space-y-2">
                <p className="font-semibold text-red-800 uppercase tracking-wide text-[11px]">Deductible Recoveries</p>
                <div className="flex justify-between items-center py-1 border-b">
                  <span>Outstanding Loan Balance Recovery:</span>
                  <span className="font-semibold text-red-700">{fmtINR(fnfData.outstandingLoanRecovery)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b">
                  <span>Outstanding Salary Advance Recovery:</span>
                  <span className="font-semibold text-red-700">{fmtINR(fnfData.outstandingAdvanceRecovery)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b">
                  <span>
                    Notice Shortfall ({fnfData.shortfallDays} days of {fnfData.noticePeriodDays} days):
                  </span>
                  <span className="font-semibold text-red-700">
                    {waiveShortfall ? "₹0 (Waived)" : fmtINR(fnfData.shortfallDeduction)}
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>Total Deductions:</span>
                  <span className="text-red-700">
                    {fmtINR(waiveShortfall ? fnfData.outstandingLoanRecovery + fnfData.outstandingAdvanceRecovery : fnfData.totalDeductions)}
                  </span>
                </div>
              </div>

              {/* Net Settlement */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-center text-sm font-bold">
                <span className="text-blue-900">Net FnF Settlement (Payable):</span>
                <span className="text-blue-900 text-base">
                  {fmtINR(
                    waiveShortfall
                      ? fnfData.totalEarnings - (fnfData.outstandingLoanRecovery + fnfData.outstandingAdvanceRecovery)
                      : fnfData.netFnfPayable
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="waiveNotice"
                  checked={waiveShortfall}
                  onChange={(e) => setWaiveShortfall(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <label htmlFor="waiveNotice" className="text-xs text-slate-600 cursor-pointer">
                  Waive notice period shortfall deduction by management approval
                </label>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Settlement Remarks</Label>
                <Input
                  placeholder="e.g. All assets handed over; net payable processed via bank transfer"
                  value={fnfRemarks}
                  onChange={(e) => setFnFRemarks(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFnFModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSettleFnF}
              disabled={isSubmittingFnF || isLoadingFnF}
              className="text-xs bg-[#0f172a] hover:bg-[#1e293b] text-white"
            >
              Confirm Settlement & Relieve Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  onClick,
  active,
}: {
  label: string;
  value: number;
  icon: any;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-6 bg-white rounded-xl border border-slate-200 cursor-pointer transition-all hover:border-slate-300 shadow-sm",
        active && "border-slate-900 ring-1 ring-slate-900"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center">
          <Icon className="w-6 h-6 text-slate-700" />
        </div>
      </div>
    </div>
  );
}
