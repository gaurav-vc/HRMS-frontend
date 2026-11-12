import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Ban,
  Coins,
  Calendar,
  Building2,
  User,
  FileText,
  Trash2,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  disciplinaryMemosApi,
  disciplinaryCategoriesApi,
  employeesApi,
  sitesApi,
} from "@/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/payroll/memos")({
  component: DisciplinaryMemosPage,
});

const MEMOS_PER_PAGE = 10;

function DisciplinaryMemosPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [employees, setEmployees] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [memos, setMemos] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    pending_count: 0,
    pending_amount: 0,
    deducted_this_month_count: 0,
    deducted_this_month_amount: 0,
    total_count: 0,
  });

  // Filter & Search & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Dialog States
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<any>(null);

  // Form States for Issuing Memo
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formCategoryType, setFormCategoryType] = useState("");
  const [isCustomReason, setIsCustomReason] = useState(false);
  const [formCustomReason, setFormCustomReason] = useState("");
  const [formAmount, setFormAmount] = useState("500.00");
  const [formIncidentDate, setFormIncidentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formDescription, setFormDescription] = useState("");
  const [saveAsNewCategory, setSaveAsNewCategory] = useState(false);
  const [employeeComboboxOpen, setEmployeeComboboxOpen] = useState(false);

  // Load Sites & Categories on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload memos when site changes
  useEffect(() => {
    loadMemosAndSummary();
    setPage(1);
  }, [selectedSiteId]);

  const loadInitialData = async () => {
    try {
      const [sitesRes, categoriesRes, employeesRes] = await Promise.allSettled([
        sitesApi.getAll(),
        disciplinaryCategoriesApi.getAll(),
        employeesApi.getAll(),
      ]);

      if (sitesRes.status === "fulfilled") {
        const val: any = sitesRes.value;
        setSites(Array.isArray(val) ? val : val?.results || []);
      }
      if (categoriesRes.status === "fulfilled") {
        const val: any = categoriesRes.value;
        setCategories(Array.isArray(val) ? val : val?.results || []);
      }
      if (employeesRes.status === "fulfilled") {
        const val: any = employeesRes.value;
        setEmployees(Array.isArray(val) ? val : val?.results || []);
      }
    } catch (err: any) {
      console.error("loadInitialData error:", err);
    }
  };

  const loadMemosAndSummary = async () => {
    setLoading(true);
    try {
      let params = "";
      if (selectedSiteId && selectedSiteId !== "all") {
        params = `?site=${selectedSiteId}`;
      }

      const [memosRes, summaryRes] = await Promise.allSettled([
        disciplinaryMemosApi.getAll(params),
        disciplinaryMemosApi.getSummary(params),
      ]);

      if (memosRes.status === "fulfilled") {
        const val: any = memosRes.value;
        setMemos(Array.isArray(val) ? val : val?.results || []);
      }
      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value || {
          pending_count: 0,
          pending_amount: 0,
          deducted_this_month_count: 0,
          deducted_this_month_amount: 0,
          total_count: 0,
        });
      }
    } catch (err: any) {
      console.error("loadMemos error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered employees for the Issue modal (scoped to selected site if set)
  const scopedEmployees = useMemo(() => {
    if (selectedSiteId && selectedSiteId !== "all") {
      return employees.filter(
        (e) => String(e.site?.id || e.siteId || e.site) === String(selectedSiteId)
      );
    }
    return employees;
  }, [employees, selectedSiteId]);

  const selectedEmployeeObj = useMemo(() => {
    if (!formEmployeeId) return null;
    return scopedEmployees.find((e) => String(e.id) === String(formEmployeeId)) || null;
  }, [scopedEmployees, formEmployeeId]);

  // Open Issue Modal
  const handleOpenIssueModal = () => {
    setFormEmployeeId("");
    if (categories.length > 0) {
      const first = categories[0];
      setFormCategoryType(String(first.id));
      setIsCustomReason(false);
      setFormCustomReason("");
      setFormAmount(String(first.default_penalty_amount || "500.00"));
    } else {
      setFormCategoryType("CUSTOM");
      setIsCustomReason(true);
      setFormCustomReason("");
      setFormAmount("500.00");
    }
    setFormIncidentDate(new Date().toISOString().split("T")[0]);
    setFormDescription("");
    setSaveAsNewCategory(false);
    setIssueModalOpen(true);
  };

  // When category changes in modal
  const handleCategoryChange = (val: string) => {
    setFormCategoryType(val);
    if (val === "CUSTOM") {
      setIsCustomReason(true);
      setFormCustomReason("");
      setFormAmount("500.00");
    } else {
      setIsCustomReason(false);
      const cat = categories.find((c) => String(c.id) === String(val));
      if (cat) {
        setFormAmount(String(cat.default_penalty_amount || "500.00"));
      }
    }
  };

  // Submit Issue Memo
  const handleSubmitMemo = async () => {
    if (!formEmployeeId) {
      toast.error("Please select an employee");
      return;
    }
    const finalReason = isCustomReason
      ? formCustomReason.trim()
      : categories.find((c) => String(c.id) === String(formCategoryType))?.name || "Disciplinary Infraction";

    if (!finalReason) {
      toast.error("Please provide an infraction reason");
      return;
    }

    const parsedAmt = parseFloat(formAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      toast.error("Please enter a valid positive penalty deduction amount");
      return;
    }

    setSubmitting(true);
    try {
      let categoryId = !isCustomReason ? parseInt(formCategoryType) : null;

      // If user selected custom reason AND checked "Save this custom reason as reusable category"
      if (isCustomReason && saveAsNewCategory) {
        try {
          const newCat = await disciplinaryCategoriesApi.create({
            name: formCustomReason.trim(),
            default_penalty_amount: parsedAmt,
            description: formDescription || "Custom disciplinary infraction category",
          });
          categoryId = newCat.id;
          setCategories((prev) => [...prev, newCat]);
        } catch (catErr) {
          console.error("Failed to save new category, proceeding with memo:", catErr);
        }
      }

      await disciplinaryMemosApi.create({
        employee: parseInt(formEmployeeId),
        category: categoryId,
        is_custom_reason: isCustomReason,
        infraction_reason: finalReason,
        description: formDescription,
        amount: parsedAmt,
        incident_date: formIncidentDate,
      });

      toast.success(`Disciplinary memo raised for ₹${parsedAmt.toLocaleString("en-IN")}`);
      setIssueModalOpen(false);
      loadMemosAndSummary();
    } catch (e: any) {
      toast.error(e.message || "Failed to create disciplinary memo");
    } finally {
      setSubmitting(false);
    }
  };

  // Waive Memo
  const handleWaiveMemo = async (memo: any) => {
    if (
      !confirm(
        `Are you sure you want to waive this memo for ${
          memo.employeeName || memo.employee_name
        }? This will pardon the deduction before payroll runs.`
      )
    ) {
      return;
    }

    try {
      await disciplinaryMemosApi.waive(memo.id);
      toast.success("Disciplinary memo successfully waived / pardoned");
      loadMemosAndSummary();
    } catch (e: any) {
      toast.error(e.message || "Failed to waive memo");
    }
  };

  // Filtered Memos List
  const filteredMemos = useMemo(() => {
    return memos.filter((m) => {
      const q = searchQuery.toLowerCase();
      const empName = (m.employeeName || m.employee_name || "").toLowerCase();
      const empCode = (m.employeeCode || m.employee_code || "").toLowerCase();
      const reason = (m.infractionReason || m.infraction_reason || "").toLowerCase();
      const role = (m.roleName || m.role_name || m.designationTitle || "").toLowerCase();
      const matchesSearch =
        empName.includes(q) || empCode.includes(q) || reason.includes(q) || role.includes(q);

      const matchesStatus =
        statusFilter === "ALL" || m.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [memos, searchQuery, statusFilter]);

  // Pagination Math
  const totalRecords = filteredMemos.length;
  const totalPages = Math.ceil(totalRecords / MEMOS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedMemos = filteredMemos.slice(
    (currentPage - 1) * MEMOS_PER_PAGE,
    currentPage * MEMOS_PER_PAGE
  );

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (currentPage > 3) pages.push("ellipsis-1");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis-2");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <PageHeader
            title="Disciplinary Memos & Penalties"
            description="Manage employee disciplinary infractions, configurable salary deductions, and automated payroll integration."
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenIssueModal} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Issue Disciplinary Memo
          </Button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-amber-200/50 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center justify-between">
              <span>Pending Payroll Deductions</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              ₹ {Number(summary.pending_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            <span className="font-semibold text-amber-800 dark:text-amber-300">
              {summary.pending_count || 0} active memo(s)
            </span>{" "}
            scheduled to be deducted in upcoming payroll.
          </CardContent>
        </Card>

        <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              <span>Deducted This Month</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              ₹ {Number(summary.deducted_this_month_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">
              {summary.deducted_this_month_count || 0} memo(s)
            </span>{" "}
            processed and deducted on salary slips this month.
          </CardContent>
        </Card>

        <Card className="border-blue-200/50 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center justify-between">
              <span>Total Infractions Logged</span>
              <AlertTriangle className="w-4 h-4 text-blue-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {summary.total_count || memos.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Disciplinary memos recorded across all sites.
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-[200px]">
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Site Scope
                </Label>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites Scope</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending Deduction</SelectItem>
                    <SelectItem value="DEDUCTED">Deducted in Payroll</SelectItem>
                    <SelectItem value="WAIVED">Waived / Pardoned</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="w-full md:w-72">
              <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                Search
              </Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee, code, or reason..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disciplinary Memos Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading disciplinary memos...
          </div>
        ) : filteredMemos.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground space-y-3">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto stroke-1" />
            <p>No disciplinary memos found matching your filters.</p>
            <Button size="sm" variant="outline" onClick={handleOpenIssueModal}>
              Issue First Memo
            </Button>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Role / Dept</th>
                    <th className="px-4 py-3">Infraction Reason</th>
                    <th className="px-4 py-3">Penalty Amount</th>
                    <th className="px-4 py-3">Incident Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedMemos.map((memo) => {
                    const empName = memo.employeeName || memo.employee_name || "—";
                    const empCode = memo.employeeCode || memo.employee_code || "—";
                    const role = memo.roleName || memo.role_name || memo.designationTitle || "—";
                    const dept = memo.departmentName || memo.department_name || "—";
                    const reason = memo.infractionReason || memo.infraction_reason || "Infraction";
                    const amt = parseFloat(String(memo.amount || 0));
                    const isPending = memo.status === "PENDING";
                    const isDeducted = memo.status === "DEDUCTED";
                    const isWaived = memo.status === "WAIVED";

                    return (
                      <tr key={memo.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-xs sm:text-sm text-foreground">
                            {empName}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {empCode} {memo.siteName ? `• ${memo.siteName}` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-foreground">{role}</div>
                          <div className="text-[11px] text-muted-foreground">{dept}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-xs text-foreground flex items-center gap-1.5">
                            {reason}
                            {memo.isCustomReason || memo.is_custom_reason ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                Custom
                              </Badge>
                            ) : null}
                          </div>
                          {memo.description ? (
                            <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                              {memo.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">
                          - ₹ {amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {memo.incidentDate || memo.incident_date}
                        </td>
                        <td className="px-4 py-3">
                          {isPending ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] gap-1"
                            >
                              <Clock className="w-3 h-3" />
                              Pending Payroll Deduction
                            </Badge>
                          ) : isDeducted ? (
                            <div className="space-y-0.5">
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Deducted (Inactive)
                              </Badge>
                              {memo.payrollPeriod || memo.payroll_period ? (
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  Run: {memo.payrollPeriod || memo.payroll_period}
                                </div>
                              ) : null}
                            </div>
                          ) : isWaived ? (
                            <Badge
                              variant="outline"
                              className="bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 text-[11px] gap-1"
                            >
                              <Ban className="w-3 h-3" />
                              Waived / Pardoned
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px]">
                              {memo.status}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setSelectedMemo(memo);
                                setDetailsModalOpen(true);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Details
                            </Button>
                            {isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2 text-amber-700 hover:text-amber-800 border-amber-300 hover:bg-amber-50"
                                onClick={() => handleWaiveMemo(memo)}
                              >
                                <Ban className="w-3.5 h-3.5 mr-1" />
                                Waive
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
              <div>
                Showing{" "}
                {totalRecords === 0 ? 0 : (currentPage - 1) * MEMOS_PER_PAGE + 1} -{" "}
                {Math.min(currentPage * MEMOS_PER_PAGE, totalRecords)} of {totalRecords} records
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setPage(currentPage - 1);
                          }}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {getPageNumbers().map((p, idx) => {
                        if (typeof p === "string") {
                          return (
                            <PaginationItem key={`ellipsis-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={p === currentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(p);
                              }}
                              className="cursor-pointer"
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setPage(currentPage + 1);
                          }}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Issue Disciplinary Memo Modal */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              Issue Disciplinary Infraction Memo
            </DialogTitle>
            <DialogDescription>
              Select an employee, pick an infraction category or enter custom reasons, and configure the penalty amount to be deducted during payroll.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Searchable Employee Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Select Employee <span className="text-rose-500">*</span>
              </Label>
              <Popover open={employeeComboboxOpen} onOpenChange={setEmployeeComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeComboboxOpen}
                    className="w-full justify-between h-9 text-xs font-normal bg-background"
                  >
                    {selectedEmployeeObj ? (
                      <span className="truncate text-left">
                        <strong className="text-foreground">
                          {selectedEmployeeObj.firstName || ""} {selectedEmployeeObj.lastName || ""}
                        </strong>{" "}
                        <span className="text-muted-foreground font-mono">
                          {selectedEmployeeObj.code ? `(${selectedEmployeeObj.code})` : ""}
                        </span>
                        {selectedEmployeeObj.designationTitle || selectedEmployeeObj.roleName
                          ? ` — ${selectedEmployeeObj.designationTitle || selectedEmployeeObj.roleName}`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Search and choose employee...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[490px] p-0 shadow-lg" align="start">
                  <Command>
                    <CommandInput placeholder="Type employee name, code, or role to search..." className="h-9 text-xs" />
                    <CommandList className="max-h-60 overflow-y-auto">
                      <CommandEmpty>No employee found matching your search.</CommandEmpty>
                      <CommandGroup>
                        {scopedEmployees.map((emp) => {
                          const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name || `Employee #${emp.id}`;
                          const code = emp.code || "";
                          const desig = emp.designationTitle || emp.roleName || "";
                          const isSelected = String(formEmployeeId) === String(emp.id);

                          return (
                            <CommandItem
                              key={emp.id}
                              value={`${empName} ${code} ${desig}`}
                              onSelect={() => {
                                setFormEmployeeId(String(emp.id));
                                setEmployeeComboboxOpen(false);
                              }}
                              className="cursor-pointer text-xs flex items-center justify-between py-2 px-2.5"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Check
                                  className={cn(
                                    "h-4 w-4 shrink-0 text-primary",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="truncate">
                                  <span className="font-semibold text-foreground">{empName}</span>{" "}
                                  <span className="text-muted-foreground font-mono">{code ? `(${code})` : ""}</span>
                                  {desig ? <span className="text-muted-foreground"> — {desig}</span> : ""}
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Infraction Category Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Infraction Reason Category <span className="text-rose-500">*</span>
              </Label>
              <Select value={formCategoryType} onValueChange={handleCategoryChange}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select reason category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} (Default: ₹{parseFloat(c.default_penalty_amount || "0").toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
                  <SelectItem value="CUSTOM" className="font-semibold text-primary">
                    + Custom Disciplinary Reason
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Reason Field */}
            {isCustomReason && (
              <div className="p-3 bg-muted/40 border rounded-md space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Custom Infraction Reason / Title <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Unauthorized Absence, Insubordination, Property Damage..."
                    value={formCustomReason}
                    onChange={(e) => setFormCustomReason(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="save-category-check"
                    checked={saveAsNewCategory}
                    onCheckedChange={(c) => setSaveAsNewCategory(Boolean(c))}
                  />
                  <label
                    htmlFor="save-category-check"
                    className="text-xs text-muted-foreground font-medium cursor-pointer"
                  >
                    Save this reason as a reusable category for future memos
                  </label>
                </div>
              </div>
            )}

            {/* Penalty Deduction Amount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Penalty Deduction Amount (₹) <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Will be itemized on salary slip & deducted
                </span>
              </div>
              <Input
                type="number"
                step="10"
                min="1"
                placeholder="e.g. 500.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="text-sm font-semibold font-mono"
              />
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground">Quick set:</span>
                {["200", "300", "500", "1000", "1500"].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2 py-0"
                    onClick={() => setFormAmount(`${val}.00`)}
                  >
                    ₹{val}
                  </Button>
                ))}
              </div>
            </div>

            {/* Incident Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Date of Incident / Infraction <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={formIncidentDate}
                onChange={(e) => setFormIncidentDate(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Incident Description / Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Supervisor Remarks / Incident Description
              </Label>
              <Textarea
                placeholder="Provide detailed context, shift time, witness notes, or supervisor remarks..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Payroll Notice Info */}
            <div className="p-3 bg-muted/40 rounded-md text-xs text-muted-foreground flex items-start gap-2">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Automatic Inactivation & Payroll Deduction:</strong> When payroll for this period is approved, ₹{parseFloat(formAmount || "0").toLocaleString("en-IN")} will be deducted from this employee's salary slip under <em>"Disciplinary Memo: {isCustomReason ? formCustomReason || 'Custom Reason' : 'Infraction'}"</em> and the memo will be automatically marked inactive (deducted).
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIssueModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleSubmitMemo}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? "Issuing Memo..." : "Issue & Schedule Deduction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details View Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Disciplinary Memo Details</DialogTitle>
          </DialogHeader>

          {selectedMemo && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee:</span>
                  <span className="font-semibold text-foreground">
                    {selectedMemo.employeeName || selectedMemo.employee_name} ({selectedMemo.employeeCode || selectedMemo.employee_code})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department:</span>
                  <span>{selectedMemo.departmentName || selectedMemo.department_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role / Designation:</span>
                  <span>{selectedMemo.roleName || selectedMemo.designationTitle || "—"}</span>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Infraction Reason:</span>
                  <span className="font-semibold">{selectedMemo.infractionReason || selectedMemo.infraction_reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deduction Penalty:</span>
                  <span className="font-bold text-rose-600">
                    ₹ {parseFloat(String(selectedMemo.amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Incident Date:</span>
                  <span>{selectedMemo.incidentDate || selectedMemo.incident_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issued By:</span>
                  <span>{selectedMemo.issuerName || selectedMemo.issuer_name || "Admin"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Status:</span>
                  <Badge variant="outline">{selectedMemo.status}</Badge>
                </div>
                {selectedMemo.payrollPeriod && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deducted In Payroll Period:</span>
                    <span className="font-mono">{selectedMemo.payrollPeriod}</span>
                  </div>
                )}
              </div>

              {selectedMemo.description && (
                <div className="space-y-1 border-t pt-3">
                  <span className="text-muted-foreground font-semibold">Incident Remarks / Description:</span>
                  <p className="p-2 bg-muted/30 rounded border text-muted-foreground">
                    {selectedMemo.description}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

