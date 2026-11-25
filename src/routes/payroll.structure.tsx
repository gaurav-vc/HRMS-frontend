import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Files,
  Users,
  Download,
  Printer,
  FileText,
  ShieldCheck,
  Building2,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  Sliders,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtINR } from "@/lib/utils";
import { payrollApi, employeesApi } from "@/api";
import { useAuth } from "@/lib/auth-context";

// PDF export helpers using dynamic CDN script injection
const getHtmlToImage = () => {
  return new Promise((resolve, reject) => {
    if ((window as any).htmlToImage) return resolve((window as any).htmlToImage);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.js";
    script.onload = () => resolve((window as any).htmlToImage);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const getJsPdf = () => {
  return new Promise((resolve, reject) => {
    if ((window as any).jspdf) return resolve((window as any).jspdf);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve((window as any).jspdf);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const generatePdf = async (element: HTMLElement, filename: string, download: boolean) => {
  const htmlToImage: any = await getHtmlToImage();
  const jspdfModule: any = await getJsPdf();
  const { jsPDF } = jspdfModule;

  const dataUrl = await htmlToImage.toJpeg(element, {
    quality: 0.98,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

  const margin = 10;
  pdf.addImage(dataUrl, "JPEG", margin, margin, pdfWidth - margin * 2, pdfHeight - margin * 2);

  if (download) {
    pdf.save(filename);
    return "";
  } else {
    return pdf.output("datauristring");
  }
};

export const Route = createFileRoute("/payroll/structure")({
  loader: async () => {
    try {
      const res: any = await payrollApi.getStructures();
      const list = Array.isArray(res) ? res : res?.results || [];
      return { initialStructures: list };
    } catch {
      return { initialStructures: [] };
    }
  },
  component: StructurePage,
});

function StructurePage() {
  const { user } = useAuth();
  const { initialStructures } = Route.useLoaderData();
  const rawInitial = Array.isArray(initialStructures)
    ? initialStructures
    : (initialStructures as any)?.results || [];
  const [structures, setStructures] = useState<any[]>(rawInitial);
  const [activeId, setActiveId] = useState<number | null>(
    rawInitial.length > 0 ? rawInitial[0].id : null,
  );
  const [comps, setComps] = useState<any[]>([]);
  const [isLoadingComps, setIsLoadingComps] = useState(false);
  const [ctc, setCtc] = useState(600000);
  const [taxRegime, setTaxRegime] = useState("New");
  const [taxSavingDeductions, setTaxSavingDeductions] = useState("0");
  const [breakupData, setBreakupData] = useState<any>(null);
  const [isLoadingBreakup, setIsLoadingBreakup] = useState(false);

  // Employee Profile & Role state
  const [empProfile, setEmpProfile] = useState<any>(null);
  const [isLoadingEmp, setIsLoadingEmp] = useState(false);

  const isAdminOrSuper = Boolean(
    user?.role === "admin" ||
    user?.role === "org_admin" ||
    user?.role === "super_admin" ||
    user?.is_superuser === true ||
    user?.is_ceo ||
    user?.can_view_confidential ||
    user?.employee_id === "CEO001"
  );

  const [adminViewMode, setAdminViewMode] = useState<"builder" | "annexure">(
    isAdminOrSuper ? "builder" : "annexure"
  );

  // Fetch logged in employee details if available
  useEffect(() => {
    const empId = user?.employeePk || (user as any)?.employee_pk || user?.id;
    if (empId) {
      setIsLoadingEmp(true);
      employeesApi
        .getById(empId)
        .then((data: any) => {
          setEmpProfile(data);
          if (data?.salaryStructure) {
            setActiveId(data.salaryStructure);
          }
          if (data?.ctc && Number(data.ctc) > 0) {
            setCtc(Number(data.ctc));
          }
          if (data?.taxRegime) {
            setTaxRegime(data.taxRegime);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch current employee profile:", err);
        })
        .finally(() => setIsLoadingEmp(false));
    }
  }, [user]);

  // Fetch breakup calculations when structure, CTC or regime changes
  useEffect(() => {
    let active = true;
    const fetchBreakup = async () => {
      if (!activeId) return;
      try {
        setIsLoadingBreakup(true);
        const res = await payrollApi.calculateBreakup(activeId, {
          ctc,
          tax_regime: taxRegime,
          worker_type: empProfile?.workerType || (empProfile as any)?.worker_type || "Salaried",
          tds_applicable: empProfile?.tdsApplicable ?? (empProfile as any)?.tds_applicable ?? true,
          tds_rate: empProfile?.tdsRate ?? (empProfile as any)?.tds_rate,
          tds_section: empProfile?.tdsSection ?? (empProfile as any)?.tds_section,
          pan: empProfile?.pan,
          employee_id: empProfile?.id,
        });
        if (active) setBreakupData(res);
      } catch (err) {
        // Fallback gracefully
      } finally {
        if (active) setIsLoadingBreakup(false);
      }
    };
    fetchBreakup();
    return () => {
      active = false;
    };
  }, [activeId, ctc, taxRegime, comps, empProfile]);

  // Force real-time fetch to avoid stale router state
  useEffect(() => {
    payrollApi
      .getStructures()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        setStructures(list);
        setActiveId((curr) => {
          if (curr) return curr;
          if (empProfile?.salaryStructure) return empProfile.salaryStructure;
          return list.length > 0 ? list[0].id : null;
        });
      })
      .catch(console.error);
  }, [empProfile]);

  // Dialog state for new structure
  const [newStructOpen, setNewStructOpen] = useState(false);
  const [newStructName, setNewStructName] = useState("");

  // Dialog state for rename
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Dialog state for new component
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<any>({
    id: undefined,
    name: "New Component",
    type: "Earning",
    calc: "Fixed",
    value: 1000,
    prorate: true,
  });

  const activeStruct = structures.find((s) => s.id === activeId);

  useEffect(() => {
    if (activeId) {
      setIsLoadingComps(true);
      payrollApi
        .getComponents(activeId)
        .then((data: any) => {
          const list = Array.isArray(data) ? data : data?.results || [];
          setComps(list);
        })
        .catch(() => toast.error("Failed to load components"))
        .finally(() => setIsLoadingComps(false));
    } else {
      setComps([]);
    }
  }, [activeId]);

  const handleCreateStructure = async () => {
    try {
      const s = await payrollApi.createStructure({ name: newStructName, status: "Draft" });
      setStructures([...structures, s]);
      setActiveId(s.id);
      setNewStructOpen(false);
      setNewStructName("");
      toast.success("Structure created!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!activeId) return;
    try {
      await payrollApi.updateStructure(activeId, { status });
      setStructures((strs) => strs.map((s) => (s.id === activeId ? { ...s, status } : s)));
      toast.success(`Structure marked as ${status}`);
    } catch (e: any) {
      toast.error("Failed to update status: " + e.message);
    }
  };

  const handleRename = async () => {
    if (!activeId) return;
    try {
      await payrollApi.updateStructure(activeId, { name: renameValue });
      setStructures((strs) =>
        strs.map((s) => (s.id === activeId ? { ...s, name: renameValue } : s)),
      );
      setRenameOpen(false);
      toast.success("Structure renamed successfully!");
    } catch (e: any) {
      toast.error("Failed to rename: " + e.message);
    }
  };

  const handleCreateComponent = async () => {
    try {
      setIsSubmitting(true);
      if (form.id) {
        const res = await payrollApi.updateSalaryComponent(form.id, {
          name: form.name,
          type: form.type,
          calc: form.calc,
          value: form.calc === "Balancing" ? 0 : form.value,
          formula: form.formula,
          prorate: form.prorate,
        });
        setComps((c) => c.map((comp) => (comp.id === form.id ? res : comp)));
        setStructures(
          structures.map((s) =>
            s.id === activeId
              ? {
                ...s,
                components:
                  s.components?.map((comp: any) => (comp.id === form.id ? res : comp)) || [],
              }
              : s,
          ),
        );
        toast.success("Component updated!");
      } else {
        const res = await payrollApi.createSalaryComponent({
          structure: activeId,
          name: form.name,
          type: form.type,
          calc: form.calc,
          value: form.calc === "Balancing" ? 0 : form.value,
          formula: form.formula,
          prorate: form.prorate,
        });
        setComps((c) => [...c, res]);
        setStructures(
          structures.map((s) =>
            s.id === activeId
              ? { ...s, components: [...(s.components || []), res] }
              : s,
          ),
        );
        toast.success("Component created!");
      }
      setOpen(false);
      setForm({
        id: undefined,
        name: "New Component",
        type: "Earning",
        calc: "Fixed",
        value: 1000,
        formula: "",
        prorate: true,
      });
    } catch (e: any) {
      toast.error("Failed to save component: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComponent = async (id: any) => {
    try {
      await payrollApi.deleteSalaryComponent(id);
      setComps((cs) => cs.filter((x) => x.id !== id));
      toast.success("Component deleted");
    } catch (e: any) {
      toast.error("Failed to delete component: " + e.message);
    }
  };

  const handleDuplicate = async () => {
    if (!activeStruct) return;
    try {
      toast.info("Duplicating structure...");
      const newStruct = await payrollApi.createStructure({
        name: `${activeStruct.name} (Copy)`,
        status: "Draft",
      });
      setStructures([...structures, newStruct]);

      for (const comp of comps) {
        await payrollApi.createSalaryComponent({
          structure: newStruct.id,
          name: comp.name,
          type: comp.type,
          calc: comp.calc,
          value: comp.value,
          prorate: comp.prorate,
        });
      }

      setActiveId(newStruct.id);
      toast.success("Structure duplicated successfully!");
    } catch (e: any) {
      toast.error("Failed to duplicate: " + e.message);
    }
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("salary-structure-annexure-capture");
    if (!element) {
      toast.error("Salary structure annexure view not ready");
      return;
    }
    const loading = toast.loading("Generating Salary Structure Annexure PDF...");
    try {
      const empCode = empProfile?.code || (user as any)?.employee_id || "EMP";
      const filename = `Salary_Structure_Annexure_${empCode}.pdf`;
      await generatePdf(element, filename, true);
      toast.success("Salary Structure Annexure downloaded successfully!", { id: loading });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate PDF. Triggering print window...", {
        id: loading,
      });
      window.print();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const monthlyGross = Math.round(ctc / 12);

  const calcMonthlyValue = (c: any, basicMonthly: number) => {
    if (
      c.name.toLowerCase().includes("194j") ||
      (c.name.toLowerCase().includes("tds") && c.name.toLowerCase().includes("prof"))
    ) {
      const rate = c.name.includes("2%") ? 0.02 : 0.1;
      return Math.round(monthlyGross * rate);
    }
    if (
      c.name.toLowerCase().includes("194c") ||
      (c.name.toLowerCase().includes("tds") && c.name.toLowerCase().includes("contract"))
    ) {
      const rate = c.name.includes("2%") ? 0.02 : 0.01;
      return Math.round(monthlyGross * rate);
    }
    if (c.calc === "Fixed") return Number(c.value);
    if (c.calc === "% of Basic") return Math.round((basicMonthly * Number(c.value)) / 100);
    if (c.calc === "% of CTC" || c.calc === "% of Gross") {
      return Math.round((ctc * Number(c.value)) / 100 / 12);
    }
    if (c.calc === "Formula" && c.formula) {
      const matchCTC = c.formula.match(/monthly_ctc\s*\*\s*([\d.]+)/);
      if (matchCTC) return Math.round((ctc / 12) * parseFloat(matchCTC[1]));

      const matchIfElse = c.formula.match(/ifelse\([^,]+,\s*([\d.]+),\s*([\d.]+)\)/);
      if (matchIfElse) return Number(matchIfElse[2]);

      if (!isNaN(Number(c.formula))) return Number(c.formula);
    }
    return 0;
  };

  const basicComp = comps.find((c) => c.name.toLowerCase().includes("basic"));
  const basicMonthly = basicComp ? calcMonthlyValue(basicComp, 0) : Math.round((ctc * 0.4) / 12);

  let earnings = comps
    .filter((c) => c.type === "Earning")
    .map((c) => ({ c, v: calcMonthlyValue(c, basicMonthly) }));

  const employerCont = comps
    .filter((c) => c.type === "Employer")
    .map((c) => ({ c, v: calcMonthlyValue(c, basicMonthly) }));
  const totalEmployer = employerCont.reduce((s, x) => s + x.v, 0);

  const nonBalancingTotal = earnings.reduce((sum, item) => sum + item.v, 0);
  earnings = earnings.map((item) => {
    if (item.c.calc === "Balancing") {
      const availableGross = monthlyGross - totalEmployer;
      return { ...item, v: Math.max(0, availableGross - nonBalancingTotal) };
    }
    return item;
  });

  const deductions = comps
    .filter((c) => c.type === "Deduction")
    .map((c) => ({ c, v: calcMonthlyValue(c, basicMonthly) }));

  const totalEarn = earnings.reduce((s, x) => s + x.v, 0);
  const totalDed = deductions.reduce((s, x) => s + x.v, 0);
  const estimatedNet = totalEarn - totalDed;

  // Render Employee Official Salary Structure Annexure Component
  const renderAnnexureView = () => {
    const empName = empProfile
      ? `${empProfile.firstName || ""} ${empProfile.lastName || ""}`.trim()
      : `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username || "Employee";
    const empCode = empProfile?.code || (user as any)?.employee_id || "N/A";
    const designation = empProfile?.designationName || (user as any)?.designation || "Staff Member";
    const department = empProfile?.departmentName || (user as any)?.department || "General";
    const entityName =
      empProfile?.entityName ||
      (user as any)?.entity_name ||
      user?.org_name ||
      "Sri Lotus Developers And Realty Limited";
    const location = empProfile?.siteName || (user as any)?.site_name || "Corporate Office";
    const doj = empProfile?.doj || "N/A";
    const pan = empProfile?.pan || "N/A";
    const taxRegimeDisplay = `${taxRegime} Tax Regime`;

    const annualCtcValue = breakupData
      ? breakupData.calculatedCtc.annual
      : ctc;
    const monthlyCtcValue = breakupData
      ? breakupData.calculatedCtc.monthly
      : Math.round(ctc / 12);
    const grossMonthlyValue = breakupData
      ? breakupData.totalGrossEarnings.monthly
      : totalEarn || monthlyCtcValue;
    const grossAnnualValue = breakupData
      ? breakupData.totalGrossEarnings.annual
      : grossMonthlyValue * 12;
    const deductionsMonthlyValue = breakupData
      ? breakupData.totalEmployeeDeductions.monthly
      : totalDed;
    const deductionsAnnualValue = breakupData
      ? breakupData.totalEmployeeDeductions.annual
      : deductionsMonthlyValue * 12;
    const netTakeHomeMonthly = breakupData
      ? breakupData.netTakeHome.monthly
      : estimatedNet;
    const netTakeHomeAnnual = breakupData
      ? breakupData.netTakeHome.annual
      : netTakeHomeMonthly * 12;

    const earningsItems = breakupData?.earnings?.length
      ? breakupData.earnings
      : earnings.map(({ c, v }) => ({
        name: c.name,
        calculation:
          c.calc === "Fixed"
            ? "Fixed Monthly"
            : c.calc === "% of CTC"
              ? `${c.value}% of CTC`
              : c.calc === "% of Basic"
                ? `${c.value}% of Basic`
                : c.calc === "Balancing"
                  ? "Balancing Allowance"
                  : c.calc,
        monthly: v,
        annual: v * 12,
      }));

    const deductionItems = breakupData?.employeeDeductions?.length
      ? breakupData.employeeDeductions
      : deductions.map(({ c, v }) => ({
        name: c.name,
        calculation:
          c.calc === "% of Basic"
            ? `${c.value}% of Basic`
            : c.is_statutory
              ? "Statutory Regulation"
              : c.calc,
        monthly: v,
        annual: v * 12,
      }));

    const employerItems = breakupData?.employerContributions || [];

    return (
      <div className="space-y-6">
        {/* Top Action & Verification Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">
                  Official Salary Structure Annexure
                </span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 text-[11px] font-normal"
                >
                  <Lock className="h-3 w-3 mr-1 inline" /> Read-Only Document
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Authorized CTC breakup and compensation schedule for {empName} ({empCode})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-9 font-medium"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 font-medium shadow-sm"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Download Annexure (PDF)
            </Button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border border-border/70 bg-card">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Annual CTC
            </span>
            <span className="text-xl font-bold text-foreground mt-1 block">
              {fmtINR(annualCtcValue)}
            </span>
            <span className="text-[11px] text-muted-foreground">Total Cost to Company</span>
          </Card>
          <Card className="p-4 border border-border/70 bg-card">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Monthly Gross CTC
            </span>
            <span className="text-xl font-bold text-foreground mt-1 block">
              {fmtINR(grossMonthlyValue)}
            </span>
            <span className="text-[11px] text-muted-foreground">Before statutory deductions</span>
          </Card>
          <Card className="p-4 border border-border/70 bg-card">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Est. In-Hand / Month
            </span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {fmtINR(netTakeHomeMonthly)}
            </span>
            <span className="text-[11px] text-muted-foreground">Net Take-Home Pay</span>
          </Card>
          <Card className="p-4 border border-border/70 bg-card">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Statutory Deductions
            </span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              {fmtINR(deductionsMonthlyValue)}
            </span>
            <span className="text-[11px] text-muted-foreground">Monthly PF & Taxes</span>
          </Card>
        </div>

        {/* Printable Official Annexure Document Card */}
        <div
          id="salary-structure-annexure-capture"
          className="w-full max-w-[880px] mx-auto bg-white text-black p-6 sm:p-8 font-sans border border-black shadow-none select-text print:m-0 print:border-black print:max-w-none"
          style={{
            color: "#000",
            backgroundColor: "#fff",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {/* Annexure Letterhead */}
          <div className="text-center pb-4 border-b border-black">
            <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black m-0 leading-tight">
              {entityName}
            </h1>
            <div className="text-xs font-bold tracking-widest text-slate-800 uppercase mt-1">
              ANNEXURE A — SALARY STRUCTURE & COMPENSATION BREAKUP
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Strictly Private & Confidential • Official Employee Record
            </div>
          </div>

          {/* Employee Details Matrix */}
          <div className="border border-black my-4 text-xs leading-normal grid grid-cols-2">
            <div className="p-3 border-r border-black space-y-1.5">
              <div className="grid grid-cols-[130px_1fr]">
                <span className="text-slate-700">Employee Name :</span>
                <span className="font-bold text-slate-950">{empName}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr]">
                <span className="text-slate-700">Employee Code :</span>
                <span className="font-bold font-mono text-slate-950">{empCode}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr]">
                <span className="text-slate-700">Designation :</span>
                <span className="font-medium text-slate-900">{designation}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr]">
                <span className="text-slate-700">Department :</span>
                <span className="font-medium text-slate-900">{department}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr]">
                <span className="text-slate-700">Location :</span>
                <span className="font-medium text-slate-900">{location}</span>
              </div>
            </div>

            <div className="p-3 space-y-1.5">
              <div className="grid grid-cols-[130px_1fr]">
                <span className="text-slate-700">Date of Joining :</span>
                <span className="font-medium text-slate-900">{doj}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr]">
                <span className="text-slate-700">PAN NO :</span>
                <span className="font-bold font-mono text-slate-950">{pan}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr]">
                <span className="text-slate-700">Tax Regime :</span>
                <span className="font-semibold text-slate-900">{taxRegimeDisplay}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr]">
                <span className="text-slate-700">Payment Nature :</span>
                <span className="font-medium text-emerald-800">
                  {empProfile?.workerType === "Professional"
                    ? "Professional Retainer (Section 194J)"
                    : empProfile?.workerType === "Contractor"
                      ? "Contractor (Section 194C)"
                      : "Salaried Employment (Section 192)"}
                </span>
              </div>
              <div className="grid grid-cols-[130px_1fr]">
                <span className="text-slate-700">Structure Template :</span>
                <span className="font-medium text-slate-900">
                  {activeStruct?.name || "Standard Salary Structure"}
                </span>
              </div>
            </div>
          </div>

          {/* Annual CTC Banner */}
          <div className="p-2.5 mb-4 bg-slate-100 border border-black flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-900">
              Total Cost to Company (CTC)
            </span>
            <div className="space-x-3 font-mono font-bold text-slate-950">
              <span>Monthly: {fmtINR(monthlyCtcValue)}</span>
              <span>•</span>
              <span className="text-sm">Annual: {fmtINR(annualCtcValue)}</span>
            </div>
          </div>

          {/* Section A: Earnings Table */}
          <div className="mb-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center gap-1.5">
              <span>PART A: EARNINGS & ALLOWANCES</span>
            </div>
            <table className="w-full text-xs border border-black border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-black font-bold">
                  <th className="p-2 text-left border-r border-black">Salary Component</th>
                  <th className="p-2 text-left border-r border-black">Calculation Basis</th>
                  <th className="p-2 text-right border-r border-black">Monthly (₹)</th>
                  <th className="p-2 text-right">Annual (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/20">
                {earningsItems.map((item: any, idx: number) => {
                  const m = Number(item.monthly ?? item.v ?? 0);
                  const a = Number(item.annual ?? m * 12);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-medium border-r border-black">{item.name}</td>
                      <td className="p-2 text-slate-700 border-r border-black">
                        {item.calculation ||
                          (item.name.toLowerCase().includes("basic")
                            ? "60% of CTC"
                            : item.name.toLowerCase().includes("hra")
                              ? "30% of CTC"
                              : item.name.toLowerCase().includes("lta")
                                ? "5% of CTC"
                                : item.name.toLowerCase().includes("convenience")
                                  ? "5% of CTC"
                                  : "Standard Component")}
                      </td>
                      <td className="p-2 text-right font-mono font-medium border-r border-black">
                        {fmtINR(m)}
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">{fmtINR(a)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-100 border-t-2 border-black font-bold">
                  <td colSpan={2} className="p-2 border-r border-black uppercase text-slate-900">
                    Gross Salary (A)
                  </td>
                  <td className="p-2 text-right font-mono border-r border-black text-slate-950">
                    {fmtINR(grossMonthlyValue)}
                  </td>
                  <td className="p-2 text-right font-mono text-slate-950">
                    {fmtINR(grossAnnualValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section B: Deductions Table */}
          <div className="mb-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center gap-1.5">
              <span>PART B: STATUTORY & EMPLOYEE DEDUCTIONS</span>
            </div>
            <table className="w-full text-xs border border-black border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-black font-bold">
                  <th className="p-2 text-left border-r border-black">Deduction Component</th>
                  <th className="p-2 text-left border-r border-black">Statutory Basis</th>
                  <th className="p-2 text-right border-r border-black">Monthly (₹)</th>
                  <th className="p-2 text-right">Annual (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/20">
                {deductionItems.map((item: any, idx: number) => {
                  const m = Number(item.monthly ?? item.v ?? 0);
                  const a = Number(item.annual ?? m * 12);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-medium border-r border-black">{item.name}</td>
                      <td className="p-2 text-slate-700 border-r border-black">
                        {item.calculation ||
                          (item.name.toLowerCase().includes("pf") ||
                            item.name.toLowerCase().includes("provident")
                            ? "12% of Basic (EPF Act)"
                            : item.name.toLowerCase().includes("tax") ||
                              item.name.toLowerCase().includes("pt")
                              ? "Statutory State Slab"
                              : "Statutory")}
                      </td>
                      <td className="p-2 text-right font-mono font-medium border-r border-black">
                        {fmtINR(m)}
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">{fmtINR(a)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-100 border-t-2 border-black font-bold">
                  <td colSpan={2} className="p-2 border-r border-black uppercase text-slate-900">
                    Total Employee Deductions (B)
                  </td>
                  <td className="p-2 text-right font-mono border-r border-black text-slate-950">
                    {fmtINR(deductionsMonthlyValue)}
                  </td>
                  <td className="p-2 text-right font-mono text-slate-950">
                    {fmtINR(deductionsAnnualValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section C: Net Take Home Highlight */}
          <div className="p-3 mb-5 border-2 border-black bg-emerald-50/50 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold uppercase tracking-wider text-emerald-950 text-sm block">
                Estimated Net Take-Home Pay (A - B)
              </span>
              <span className="text-[11px] text-emerald-800">
                Approximate monthly in-hand compensation before variable incentives or LOP
              </span>
            </div>
            <div className="text-right font-mono font-bold text-emerald-950">
              <span className="text-base sm:text-lg block">{fmtINR(netTakeHomeMonthly)} / mo</span>
              <span className="text-xs text-emerald-800 block">
                {fmtINR(netTakeHomeAnnual)} / yr
              </span>
            </div>
          </div>

          {/* Employer Contributions (If Any) */}
          {employerItems.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5">
                PART D: EMPLOYER CONTRIBUTIONS & RETIRALS
              </div>
              <table className="w-full text-xs border border-black border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold">
                    <th className="p-2 text-left border-r border-black">Benefit / Contribution</th>
                    <th className="p-2 text-right border-r border-black">Monthly (₹)</th>
                    <th className="p-2 text-right">Annual (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/20">
                  {employerItems.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium border-r border-black">{item.name}</td>
                      <td className="p-2 text-right font-mono border-r border-black">
                        {fmtINR(item.monthly)}
                      </td>
                      <td className="p-2 text-right font-mono">{fmtINR(item.annual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes & Compliance Policy */}
          <div className="text-[10px] text-slate-700 space-y-1 pt-2 border-t border-black leading-relaxed">
            <p className="font-bold text-slate-900">Notes & Terms of Compensation:</p>
            <p>
              1. <strong>Statutory Deductions:</strong> Provident Fund (PF) and Professional Tax
              (PT) are deducted in compliance with the Employees' Provident Funds Act, 1952 and
              respective State Tax Legislation.
            </p>
            <p>
              2. <strong>TDS & Income Tax:</strong> Income Tax (TDS) is deducted monthly as per
              Section 192 of the Income Tax Act, 1961 based on chosen tax regime and verified
              declarations.
            </p>
            <p>
              3. <strong>Attendance Impact:</strong> Monthly salary payout is subject to verified
              attendance records, shift compliance, and any approved Loss of Pay (LOP) or half-day
              deductions.
            </p>
            <p>
              4. <strong>Confidentiality:</strong> This compensation structure is strictly
              confidential between the employee and the organization.
            </p>
          </div>

          {/* Signatures & Seal */}
          <div className="mt-8 pt-4 border-t border-black grid grid-cols-2 text-xs">
            <div>
              <div className="font-bold text-slate-950 mb-8">
                For {entityName}
              </div>
              <p className="border-t border-slate-400 pt-1 text-slate-600 inline-block pr-8">
                Authorized Signatory / HR Department
              </p>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-950 mb-8">
                Employee Acknowledgment
              </div>
              <p className="border-t border-slate-400 pt-1 text-slate-600 inline-block pl-8">
                Signature of Employee
              </p>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-500">
            Digitally Generated & Verified via PeoplePulse HRMS Engine • Standard Form Annexure A
          </div>
        </div>

        {/* Global Print Styling */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #salary-structure-annexure-capture,
            #salary-structure-annexure-capture * {
              visibility: visible;
            }
            #salary-structure-annexure-capture {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 10mm !important;
              border: none !important;
            }
          }
        `}</style>
      </div>
    );
  };

  // If user is Employee (Non-Admin), render Read-Only Annexure directly
  if (!isAdminOrSuper) {
    return (
      <>
        <PageHeader
          title="My Salary Structure"
          description="View your official compensation structure, monthly earnings breakup, and statutory deduction details."
        />
        {renderAnnexureView()}
      </>
    );
  }

  // Admin View: Allows toggling between Structure Builder and Annexure Preview & Download
  return (
    <>
      <PageHeader
        title="Salary Structure"
        description="Define reusable salary templates with earnings, deductions and statutory components."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/80 p-0.5 bg-muted/40 mr-2">
              <Button
                variant={adminViewMode === "builder" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAdminViewMode("builder")}
                className="text-xs h-8 px-3"
              >
                <Sliders className="h-3.5 w-3.5 mr-1.5" /> Structure Builder
              </Button>
              <Button
                variant={adminViewMode === "annexure" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAdminViewMode("annexure")}
                className="text-xs h-8 px-3"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" /> Annexure Preview & PDF
              </Button>
            </div>

            {adminViewMode === "builder" ? (
              <>
                <Button variant="outline" onClick={handleDuplicate} disabled={!activeStruct}>
                  <Files className="h-4 w-4 mr-2" /> Duplicate
                </Button>
                <Button onClick={() => setNewStructOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New Structure
                </Button>
              </>
            ) : (
              <Button
                onClick={handleDownloadPdf}
                className="bg-primary text-primary-foreground text-xs h-9 font-medium shadow-sm"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download Annexure (PDF)
              </Button>
            )}
          </div>
        }
      />

      {adminViewMode === "annexure" ? (
        renderAnnexureView()
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Left Sidebar */}
          <Card className="p-4 flex flex-col gap-3 min-h-[500px]">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Structures · {structures.length}
            </div>
            <div className="space-y-2">
              {structures.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${activeId === s.id
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-card hover:bg-muted/50 border-transparent hover:border-border"
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-sm">{s.name}</div>
                    <Badge
                      variant={s.status === "Active" ? "default" : "secondary"}
                      className={
                        s.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none"
                          : ""
                      }
                    >
                      {s.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {s.employee_count || 0}
                    </span>
                    <span>₹ -- LPA</span>
                  </div>
                </div>
              ))}
              {structures.length === 0 && (
                <div className="text-center p-6 text-sm text-muted-foreground border border-dashed rounded-xl">
                  No templates yet. Create one!
                </div>
              )}
            </div>
          </Card>

          {/* Main Content */}
          {activeStruct ? (
            <Card className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                    Editing
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">{activeStruct.name}</h2>
                  <div className="text-sm text-muted-foreground mt-1">
                    Effective from 01 Apr 2026 · INR · {activeStruct.employee_count || 0} employees
                    assigned
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRenameValue(activeStruct.name);
                      setRenameOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" /> Rename
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus("Draft")}
                    disabled={activeStruct.status === "Draft"}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    size="sm"
                    className="bg-slate-900 text-white"
                    onClick={() => handleUpdateStatus("Active")}
                    disabled={activeStruct.status === "Active"}
                  >
                    Publish
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Annual CTC
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      className="pl-7 bg-muted/30 font-medium text-lg"
                      value={ctc}
                      onChange={(e) => setCtc(+e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Tax Regime
                  </Label>
                  <Select value={taxRegime} onValueChange={setTaxRegime}>
                    <SelectTrigger className="bg-muted/30 font-medium h-10 border-input shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New Regime</SelectItem>
                      <SelectItem value="Old">Old Regime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Tax Savings
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      className="pl-7 bg-muted/30 font-medium text-lg disabled:opacity-50"
                      value={taxSavingDeductions}
                      onChange={(e) => setTaxSavingDeductions(e.target.value)}
                      disabled={taxRegime === "New"}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Monthly Gross
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      readOnly
                      className="pl-7 bg-muted/30 font-medium text-lg border-transparent"
                      value={
                        breakupData
                          ? Math.round(breakupData.totalGrossEarnings.monthly).toLocaleString("en-IN")
                          : monthlyGross.toLocaleString("en-IN")
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Estimated Net
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      readOnly
                      className="pl-7 bg-muted/30 font-medium text-lg border-transparent font-bold text-emerald-600 dark:text-emerald-400"
                      value={
                        breakupData
                          ? Math.round(breakupData.netTakeHome.monthly).toLocaleString("en-IN")
                          : estimatedNet.toLocaleString("en-IN")
                      }
                    />
                  </div>
                </div>
              </div>

              {breakupData && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800 mb-6">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Authoritative Payroll Engine Verified • CTC:{" "}
                    <strong>
                      ₹{Math.round(breakupData.calculatedCtc.annual).toLocaleString("en-IN")}
                    </strong>
                    /yr • Employer Cost:{" "}
                    <strong>
                      ₹{Math.round(breakupData.totalEmployerCost.monthly).toLocaleString("en-IN")}
                    </strong>
                    /mo
                  </span>
                </div>
              )}

              <Tabs defaultValue="earnings" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto bg-transparent space-x-6">
                  <TabsTrigger
                    value="earnings"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 text-sm data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                  >
                    Earnings
                  </TabsTrigger>
                  <TabsTrigger
                    value="deductions"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 text-sm data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                  >
                    Deductions
                  </TabsTrigger>
                  <TabsTrigger
                    value="employer"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 text-sm data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                  >
                    Employer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="earnings" className="pt-6">
                  <div className="border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-4 p-4 border-b bg-muted/30 text-xs font-semibold text-muted-foreground tracking-wider">
                      <div>COMPONENT</div>
                      <div>CALCULATION</div>
                      <div>MONTHLY</div>
                      <div>TAXABLE</div>
                      <div></div>
                    </div>
                    <div className="divide-y">
                      {earnings.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                          No earning components configured.
                        </div>
                      ) : (
                        earnings.map(({ c, v }) => (
                          <div
                            key={c.id}
                            className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-4 p-4 items-center text-sm group cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              setForm(c);
                              setOpen(true);
                            }}
                          >
                            <div className="font-medium">{c.name}</div>
                            <div className="text-muted-foreground">
                              {c.calc === "Fixed"
                                ? `Fixed · ₹ ${Number(c.value).toLocaleString("en-IN")}/mo`
                                : c.calc === "Formula"
                                  ? `Formula · ${c.formula}`
                                  : `${c.calc} · ${c.value}%`}
                            </div>
                            <div className="font-semibold">{fmtINR(v)}</div>
                            <div>
                              <Badge
                                variant="secondary"
                                className="bg-slate-100 text-slate-600 shadow-none hover:bg-slate-200"
                              >
                                {c.is_statutory ? "Statutory" : "Taxable"}
                              </Badge>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteComponent(c.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4 border-dashed"
                    onClick={() => {
                      setForm({
                        id: undefined,
                        name: "",
                        type: "Earning",
                        calc: "Fixed",
                        value: 0,
                        prorate: true,
                      });
                      setOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Component
                  </Button>
                </TabsContent>

                <TabsContent value="deductions" className="pt-6">
                  <div className="border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-4 p-4 border-b bg-muted/30 text-xs font-semibold text-muted-foreground tracking-wider">
                      <div>COMPONENT</div>
                      <div>CALCULATION</div>
                      <div>MONTHLY</div>
                      <div>TAXABLE</div>
                      <div></div>
                    </div>
                    <div className="divide-y">
                      {deductions.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                          No deduction components configured.
                        </div>
                      ) : (
                        deductions.map(({ c, v }) => (
                          <div
                            key={c.id}
                            className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-4 p-4 items-center text-sm group cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              setForm(c);
                              setOpen(true);
                            }}
                          >
                            <div className="font-medium">{c.name}</div>
                            <div className="text-muted-foreground">
                              {c.calc === "Fixed"
                                ? `Fixed · ₹ ${Number(c.value).toLocaleString("en-IN")}/mo`
                                : c.calc === "Formula"
                                  ? `Formula · ${c.formula}`
                                  : `${c.calc} · ${c.value}%`}
                            </div>
                            <div className="font-semibold text-destructive">{fmtINR(v)}</div>
                            <div>
                              <Badge
                                variant="secondary"
                                className="bg-slate-100 text-slate-600 shadow-none hover:bg-slate-200"
                              >
                                {c.is_statutory ? "Statutory" : "Pre-Tax"}
                              </Badge>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteComponent(c.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4 border-dashed"
                    onClick={() => {
                      setForm({
                        id: undefined,
                        name: "",
                        type: "Deduction",
                        calc: "Fixed",
                        value: 0,
                        prorate: false,
                      });
                      setOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Component
                  </Button>
                </TabsContent>

                <TabsContent value="employer" className="pt-6">
                  <div className="border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-4 p-4 border-b bg-muted/30 text-xs font-semibold text-muted-foreground tracking-wider">
                      <div>COMPONENT</div>
                      <div>CALCULATION</div>
                      <div>MONTHLY</div>
                      <div>TAXABLE</div>
                      <div></div>
                    </div>
                    <div className="divide-y">
                      {employerCont.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                          No employer components configured.
                        </div>
                      ) : (
                        employerCont.map(({ c, v }) => (
                          <div
                            key={c.id}
                            className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-4 p-4 items-center text-sm group cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              setForm(c);
                              setOpen(true);
                            }}
                          >
                            <div className="font-medium">{c.name}</div>
                            <div className="text-muted-foreground">
                              {c.calc === "Fixed"
                                ? `Fixed · ₹ ${Number(c.value).toLocaleString("en-IN")}/mo`
                                : c.calc === "Formula"
                                  ? `Formula · ${c.formula}`
                                  : `${c.calc} · ${c.value}%`}
                            </div>
                            <div className="font-semibold">{fmtINR(v)}</div>
                            <div>
                              <Badge
                                variant="secondary"
                                className="bg-slate-100 text-slate-600 shadow-none hover:bg-slate-200"
                              >
                                {c.is_statutory ? "Statutory" : "Pre-Tax"}
                              </Badge>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteComponent(c.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4 border-dashed"
                    onClick={() => {
                      setForm({
                        id: undefined,
                        name: "",
                        type: "Employer",
                        calc: "Fixed",
                        value: 0,
                        prorate: false,
                      });
                      setOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Component
                  </Button>
                </TabsContent>
              </Tabs>
            </Card>
          ) : (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              Select or create a salary structure template to view details.
            </Card>
          )}
        </div>
      )}

      {/* New Structure Dialog */}
      <Dialog open={newStructOpen} onOpenChange={setNewStructOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Salary Structure Template</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input
                placeholder="e.g. Standard Executive 2026"
                value={newStructName}
                onChange={(e) => setNewStructName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewStructOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStructure} disabled={!newStructName.trim()}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Structure Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Structure</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Structure Name</Label>
              <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Component Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {form.type} Component</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {form.type === "Deduction" && (
              <div className="space-y-1.5 p-3 bg-muted/20 rounded-lg border border-dashed">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Statutory / TDS Presets
                </Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setForm({
                        ...form,
                        name: "TDS u/s 194J (Professional Fees 10%)",
                        calc: "% of CTC",
                        value: 10,
                        is_statutory: true,
                        prorate: false,
                      });
                    }}
                  >
                    194J Professional (10%)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setForm({
                        ...form,
                        name: "TDS u/s 194J (Technical 2%)",
                        calc: "% of CTC",
                        value: 2,
                        is_statutory: true,
                        prorate: false,
                      });
                    }}
                  >
                    194J Technical (2%)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setForm({
                        ...form,
                        name: "TDS u/s 194C (Contractor 1%)",
                        calc: "% of CTC",
                        value: 1,
                        is_statutory: true,
                        prorate: false,
                      });
                    }}
                  >
                    194C Contractor (1%)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setForm({
                        ...form,
                        name: "Income Tax (TDS - Salaried Slabs)",
                        calc: "Formula",
                        formula: "calculate_tds()",
                        is_statutory: true,
                        prorate: false,
                      });
                    }}
                  >
                    TDS Salaried (192)
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Component Name</Label>
              <Input
                placeholder="e.g. House Rent Allowance"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Calculation Method</Label>
              <Select value={form.calc} onValueChange={(v) => setForm({ ...form, calc: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">Fixed Amount / year</SelectItem>
                  <SelectItem value="% of Basic">% of Basic</SelectItem>
                  <SelectItem value="% of CTC">% of CTC</SelectItem>
                  <SelectItem value="Formula">Custom Formula</SelectItem>
                  <SelectItem value="Balancing">Balancing (Remaining value)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.calc === "Formula" && (
              <div className="space-y-1.5">
                <Label>Formula</Label>
                <Input
                  type="text"
                  placeholder="e.g. monthly_ctc * 0.6"
                  value={form.formula || ""}
                  onChange={(e) => setForm({ ...form, formula: e.target.value })}
                />
              </div>
            )}
            {form.calc !== "Balancing" && form.calc !== "Formula" && (
              <div className="space-y-1.5">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: +e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="prorate"
                checked={form.prorate}
                onCheckedChange={(checked) => setForm({ ...form, prorate: checked === true })}
              />
              <Label htmlFor="prorate" className="text-sm font-normal">
                Prorate based on attendance
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateComponent} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Add Component"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
