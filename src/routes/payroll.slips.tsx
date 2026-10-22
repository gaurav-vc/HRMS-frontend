import { createFileRoute, useNavigate, isRedirect } from "@tanstack/react-router";
import React, { useState } from "react";
import { toast } from "sonner";
import { Download, Mail, Eye, FileDown, Trash2, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db, empName, fmtINR, type Employee } from "@/lib/mock-data";
import { openPayslipPdf } from "@/lib/payslip-pdf";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { payrollApi } from "@/api";

const getHtmlToImage = () => {
  return new Promise((resolve, reject) => {
    if ((window as any).htmlToImage) return resolve((window as any).htmlToImage);
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
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

export const Route = createFileRoute("/payroll/slips")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      period: search.period as string | undefined,
    };
  },
  loaderDeps: ({ search: { period } }) => ({ period }),
  loader: async ({ deps: { period } }) => {
    try {
      const data = await payrollApi.getSlips(period);
      return { data };
    } catch (e) {
      if (isRedirect(e)) throw e;
      console.error("Failed to load slips:", e);
      // Ensure period is a string if not provided in search params
      const p = period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      return { data: { period: p, slips: [], diagnostics: { error: "Failed to load data" } } };
    }
  },
  component: SlipsPage,
});

function SlipsPage() {
  const { data } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const period = data.period;

  const [deletedIds, setDeletedIds] = useState<Set<any>>(new Set());
  const rows = data.slips.filter((s: any) => !deletedIds.has(s.id));

  if (rows.length === 0 && data.diagnostics) {
    console.log("DIAGNOSTICS:\n" + JSON.stringify(data.diagnostics, null, 2));
  }

  const [open, setOpen] = useState<any | null>(null);

  const totalPayroll = rows.reduce((acc: number, r: any) => acc + r.gross, 0);

  const [yearStr, monthStr] = period.split("-");
  const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();

  const handlePeriodChange = (val: string) => {
    navigate({ search: { period: val } });
  };

  // Dynamically populate dropdown strictly from Payroll Runs and Payslips in the system.
  // Whenever a payroll is run for a month, that month is automatically included in the dropdown list.
  const periodOptionsSet = new Set<string>();

  // 1. Add all periods where payroll has been run or payslips exist (from backend)
  if (data?.availablePeriods && Array.isArray(data.availablePeriods)) {
    data.availablePeriods.forEach((p: string) => {
      if (p && typeof p === "string" && p.trim()) {
        periodOptionsSet.add(p.trim());
      }
    });
  }

  // 2. Also check diagnostics for any recorded payroll runs
  if (data?.diagnostics?.payroll_runs && Array.isArray(data.diagnostics.payroll_runs)) {
    data.diagnostics.payroll_runs.forEach((r: any) => {
      if (r?.period && typeof r.period === "string" && r.period.trim()) {
        periodOptionsSet.add(r.period.trim());
      }
    });
  }

  // 3. Ensure the current period is always present so the select box never renders blank
  if (period && typeof period === "string" && period.trim()) {
    periodOptionsSet.add(period.trim());
  }

  // Fallback to current month if no payroll has ever been run yet
  if (periodOptionsSet.size === 0) {
    const d = new Date();
    periodOptionsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // Sort descending so the latest run month is always at the top
  const periodOptions = Array.from(periodOptionsSet).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <PageHeader title="Salary Slips" description={`Payslips for ${period}`} />
        <div className="w-[180px]">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Total Payroll
          </div>
          <div className="text-2xl font-bold">{fmtINR(totalPayroll)}</div>
          <div className="text-xs text-muted-foreground mt-2">{rows.length} employees</div>
        </Card>
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Paid</div>
          <div className="text-2xl font-bold text-success">{rows.length}</div>
          <div className="text-xs text-muted-foreground mt-2">On schedule</div>
        </Card>
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Total Working Days
          </div>
          <div className="text-2xl font-bold">{daysInMonth}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Days in{" "}
            {new Date(parseInt(yearStr), parseInt(monthStr) - 1).toLocaleString("default", {
              month: "long",
            })}{" "}
            {yearStr}
          </div>
        </Card>
      </div>

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        tableId="payslips"
        searchKeys={["firstName", "lastName", "code", "email"]}
        filename={`payslips-${period}.csv`}
        columns={[
          {
            key: "emp",
            header: "Employee",
            render: (r) => (
              <div>
                <div className="font-medium">
                  {r.firstName} {r.lastName}
                </div>
                <div className="text-xs text-muted-foreground">{r.code}</div>
              </div>
            ),
            accessor: (r) => `${r.firstName || ""} ${r.lastName || ""}`.trim(),
          },
          {
            key: "bank",
            header: "Bank",
            render: (r) => (
              <span className="text-xs">
                {r.bankName} • ****{r.bankAccount?.slice(-4)}
              </span>
            ),
            accessor: (r) => (r.bankName ? `${r.bankName} • ****${r.bankAccount?.slice(-4)}` : "—"),
          },
          {
            key: "gross",
            header: "Gross",
            accessor: (r) => r.gross,
            render: (r) => fmtINR(r.gross),
            sortable: true,
          },
          {
            key: "ded",
            header: "Deductions",
            accessor: (r) => r.ded,
            render: (r) => fmtINR(r.ded),
            sortable: true,
          },
          {
            key: "net",
            header: "Net Pay",
            accessor: (r) => r.net,
            render: (r) => <span className="font-semibold text-success">{fmtINR(r.net)}</span>,
            sortable: true,
          },
        ]}
        actions={(r: any) => (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" title="Preview" onClick={() => setOpen(r)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="Download PDF"
              onClick={() => {
                setOpen(r);
                const loading = toast.loading("Preparing beautiful PDF...");
                setTimeout(async () => {
                  try {
                    const element = document.getElementById("payslip-capture");
                    if (!element) throw new Error("Payslip view not rendered yet");
                    toast.loading("Rendering PDF...", { id: loading });
                    await generatePdf(element, `Payslip_${period}_${r.code}.pdf`, true);
                    toast.success("PDF downloaded successfully!", { id: loading });
                  } catch (e: any) {
                    toast.error(e.message || "Failed to generate PDF", { id: loading });
                  }
                }, 800);
              }}
            >
              <FileDown className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="Email"
              onClick={() => {
                setOpen(r);
                const loading = toast.loading("Preparing beautiful PDF...");
                setTimeout(async () => {
                  try {
                    const element = document.getElementById("payslip-capture");
                    if (!element) throw new Error("Payslip view not rendered yet");
                    toast.loading("Rendering PDF...", { id: loading });
                    const pdfBase64 = await generatePdf(
                      element,
                      `Payslip_${period}_${r.code}.pdf`,
                      false,
                    );
                    toast.loading("Sending email with attached PDF...", { id: loading });
                    await payrollApi.emailSlipWithAttachment(r.id, pdfBase64);
                    toast.success(`Payslip emailed successfully!`, { id: loading });
                  } catch (e: any) {
                    toast.error(e.message || "Failed to send email", { id: loading });
                  }
                }, 800);
              }}
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              title="Delete (Locked to preserve integrity)"
              onClick={() => {
                setDeletedIds(prev => new Set(prev).add(r.id));
                toast.success("Payslip deleted locally. Backend remains locked to prevent API/workflow breaks.");
              }}
            >
              <div className="relative">
                <Trash2 className="h-4 w-4" />
                <Lock className="h-2 w-2 absolute -bottom-1 -right-1 text-slate-500 bg-white rounded-full" />
              </div>
            </Button>
          </div>
        )}
      />
      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogTitle className="sr-only">Payslip</DialogTitle>
          {open && (
            <>
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                <Payslip emp={open} period={period} />
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const element = document.getElementById("payslip-capture");
                    if (!element) throw new Error("Payslip view not rendered yet");
                    const loading = toast.loading("Rendering PDF...");
                    try {
                      const pdfBase64 = await generatePdf(
                        element,
                        `Payslip_${period}_${open.code}.pdf`,
                        false,
                      );
                      toast.loading("Sending email with attached PDF...", { id: loading });
                      await payrollApi.emailSlipWithAttachment(open.id, pdfBase64);
                      toast.success(`Payslip emailed successfully!`, { id: loading });
                    } catch (e: any) {
                      toast.error(e.message || "Failed to send email", { id: loading });
                    }
                  }}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
                <Button
                  onClick={async () => {
                    const loading = toast.loading("Generating beautiful PDF...");
                    try {
                      const element = document.getElementById("payslip-capture");
                      if (!element) throw new Error("Payslip view not rendered yet");
                      toast.loading("Rendering PDF...", { id: loading });
                      await generatePdf(element, `Payslip_${period}_${open.code}.pdf`, true);
                      toast.success("PDF downloaded successfully!", { id: loading });
                    } catch (e: any) {
                      toast.error(e.message || "Failed to generate PDF", { id: loading });
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Payslip({ emp, period }: { emp: any; period: string }) {
  const { components = {}, actual_components = {} } = emp;

  // Format month and year, e.g. "April 2025"
  const formatPeriodMonth = (periodStr: string): string => {
    if (!periodStr) return "";
    try {
      const parts = periodStr.split("-");
      if (parts.length < 2) return periodStr;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleString("en-US", { month: "long", year: "numeric" });
    } catch {
      return periodStr;
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const fmt = (val: number | string | undefined | null): string => {
    const num = parseFloat(String(val ?? 0));
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const numberToWords = (num: number): string => {
    const val = Math.round(Number(num) || 0);
    if (val <= 0) return "Zero Rupee Only";

    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    const convertTwoDigits = (n: number): string => {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      const t = tens[Math.floor(n / 10)];
      const o = ones[n % 10];
      return o ? `${t} ${o}` : t;
    };

    const convertThreeDigits = (n: number): string => {
      const h = Math.floor(n / 100);
      const rem = n % 100;
      const hStr = h > 0 ? `${ones[h]} Hundred` : "";
      const remStr = convertTwoDigits(rem);
      if (hStr && remStr) return `${hStr} ${remStr}`;
      return hStr || remStr;
    };

    let remaining = val;
    const parts: string[] = [];

    // Crores
    const crore = Math.floor(remaining / 10000000);
    if (crore > 0) {
      parts.push(`${convertThreeDigits(crore)} Crore`);
      remaining %= 10000000;
    }

    // Lakhs
    const lakh = Math.floor(remaining / 100000);
    if (lakh > 0) {
      parts.push(`${convertTwoDigits(lakh)} Lakh`);
      remaining %= 100000;
    }

    // Thousands
    const thousand = Math.floor(remaining / 1000);
    if (thousand > 0) {
      parts.push(`${convertTwoDigits(thousand)} Thousand`);
      remaining %= 1000;
    }

    // Hundreds & units
    if (remaining > 0) {
      parts.push(convertThreeDigits(remaining));
    }

    return `${parts.join(" ")} Rupee Only`;
  };

  const isDeduction = (k: string) =>
    ["pf", "pt", "tds", "provident", "professional", "tax", "deduction", "esi", "loan", "advance"].some((d) =>
      k.toLowerCase().includes(d),
    );

  // Standard enterprise earnings sequence
  const standardEarnings = [
    { key: "basic", label: "Basic", aliases: ["basic"] },
    { key: "hra", label: "HRA", aliases: ["hra", "house rent"] },
    { key: "conveyance", label: "Conveyance Allowance", aliases: ["conveyance", "transport"] },
    { key: "cca", label: "CCA", aliases: ["cca", "city compensatory"] },
    { key: "special", label: "Special Allowance", aliases: ["special", "allowance"] },
    { key: "leave encashment", label: "Leave Encashment", aliases: ["leave encashment", "encashment"] },
  ];

  const findCompEntry = (aliases: string[]) => {
    for (const [k, v] of Object.entries(components)) {
      const lower = k.toLowerCase().trim();
      if (aliases.some((a) => lower === a || lower.includes(a))) {
        return { key: k, val: Number(v || 0) };
      }
    }
    return null;
  };

  const findActualComp = (targetKey: string, earnedVal: number) => {
    const found = Object.entries(actual_components).find(
      ([k]) => k.toLowerCase() === targetKey.toLowerCase() || k.toLowerCase().includes(targetKey.toLowerCase()),
    );
    if (found && Number(found[1]) > 0) return Number(found[1]);
    const daysPaid = Number(emp.daysPaid ?? 30);
    const totalDays = Number(emp.totalDays || 30) || 30;
    if (daysPaid > 0 && daysPaid < totalDays && earnedVal > 0) {
      return Math.round((earnedVal / daysPaid) * totalDays * 100) / 100;
    }
    return earnedVal;
  };

  // Build earnings rows
  const earningsList: { name: string; actual: number; earned: number }[] = [];
  const processedKeys = new Set<string>();

  standardEarnings.forEach((std) => {
    let earned = 0;
    const match = findCompEntry(std.aliases);
    if (match) {
      earned = match.val;
      processedKeys.add(match.key);
    } else if (std.key === "basic") {
      earned = Number(emp.basic || 0);
    } else if (std.key === "hra") {
      earned = Number(emp.hra || 0);
    } else if (std.key === "special") {
      earned = Number(emp.special || 0);
    }

    const actual = findActualComp(std.key, earned);
    earningsList.push({ name: std.label, actual, earned });

    Object.keys(components).forEach((k) => {
      const lower = k.toLowerCase().trim();
      if (std.aliases.some((a) => lower === a || lower.includes(a))) {
        processedKeys.add(k);
      }
    });
  });

  // Append any extra earnings from components (e.g. LTA, Convenience, etc.)
  Object.entries(components).forEach(([k, v]) => {
    if (!isDeduction(k) && !processedKeys.has(k)) {
      processedKeys.add(k);
      const earned = Number(v || 0);
      const actual = findActualComp(k, earned);
      earningsList.push({ name: k, actual, earned });
    }
  });

  if (
    Number(emp.overtimePay || 0) > 0 &&
    !earningsList.some((e) => e.name.toLowerCase().includes("overtime") || e.name.toLowerCase().includes("ot"))
  ) {
    const otAmt = Number(emp.overtimePay);
    earningsList.push({ name: "Overtime Allowance", actual: otAmt, earned: otAmt });
  }

  // Build deductions rows
  const deductionsList: { name: string; amount: number | null }[] = [];
  const processedDedKeys = new Set<string>();

  const standardDeductions = [
    { key: "pf", label: "PF", aliases: ["pf", "provident", "epf"], directVal: emp.pf },
    { key: "pt", label: "Professional Tax", aliases: ["pt", "professional tax", "professional", "prof tax"], directVal: emp.pt },
    { key: "tds", label: "Income Tax (TDS)", aliases: ["tds", "income tax", "tax deducted"], directVal: emp.tds },
  ];

  standardDeductions.forEach((std) => {
    const match = findCompEntry(std.aliases);
    let amt: number | null = null;
    if (match && match.val > 0) {
      amt = match.val;
      processedDedKeys.add(match.key);
    } else if (Number(std.directVal) > 0) {
      amt = Number(std.directVal);
    } else if (std.key === "pf" && (emp.pf_applicable || !Object.keys(components).some(isDeduction))) {
      amt = Number(emp.pf) > 0 ? Number(emp.pf) : 1800;
    }

    Object.keys(components).forEach((k) => {
      const lower = k.toLowerCase().trim();
      if (std.aliases.some((a) => lower === a || lower.includes(a))) {
        processedDedKeys.add(k);
      }
    });

    if (amt !== null && amt > 0) {
      deductionsList.push({ name: std.label, amount: amt });
    }
  });

  // Append any extra deductions (Loans, ESI, Custom Deductions)
  Object.entries(components).forEach(([k, v]) => {
    if (isDeduction(k) && !processedDedKeys.has(k) && Number(v) > 0) {
      processedDedKeys.add(k);
      deductionsList.push({ name: k, amount: Number(v) });
    }
  });

  // Pad empty lines so the table rows align symmetrically with the vertical divider
  const maxRows = Math.max(earningsList.length, deductionsList.length, 6);
  while (earningsList.length < maxRows) {
    earningsList.push({ name: "", actual: 0, earned: 0 });
  }
  while (deductionsList.length < maxRows) {
    deductionsList.push({ name: "", amount: null });
  }

  const totalActual = earningsList.reduce((sum, r) => sum + (r.name ? r.actual : 0), 0);
  const totalEarned = earningsList.reduce((sum, r) => sum + (r.name ? r.earned : 0), 0) || Number(emp.gross || 0);
  const totalDeductions = deductionsList.reduce((sum, r) => sum + (r.amount || 0), 0) || Number(emp.ded || 0);
  const netPay = Number(emp.net || (totalEarned - totalDeductions));

  const entityTitle = emp.entityName || emp.companyName || "LOTUS DEVELOPERS";

  return (
    <div
      id="payslip-capture"
      className="w-full max-w-[900px] mx-auto bg-white text-black p-6 font-sans text-xs border border-black shadow-none print:m-0 print:border-black print:max-w-none select-text"
      style={{ color: "#000", backgroundColor: "#fff", fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Entity Header & Title */}
      <div className="text-center pb-4 pt-1">
        <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black m-0 leading-tight">
          {entityTitle}
        </h1>
        <div className="text-xs sm:text-sm font-medium text-slate-700 mt-1">
          Payslip for the month of {formatPeriodMonth(period)}
        </div>
      </div>

      {/* Top Information Box */}
      <div className="border border-black grid grid-cols-2 text-xs leading-relaxed">
        {/* Left Column */}
        <div className="border-r border-black p-3 space-y-1.5">
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">Name :</span>
            <span className="font-bold text-slate-950">{emp.firstName} {emp.lastName}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">EmpCode :</span>
            <span className="font-bold text-slate-950">{emp.code || "N/A"}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">DOJ :</span>
            <span className="font-medium">{formatDate(emp.doj)}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">Department :</span>
            <span className="font-medium">{emp.department || "Department"}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">Designation :</span>
            <span className="font-medium">{emp.designation || "Designation"}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">No. of. Workingdays :</span>
            <span className="font-semibold">{emp.totalDays || 30}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">Holidays :</span>
            <span className="font-semibold">{fmt(emp.holidays || emp.daysOff || 0)}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">No. of. Days Paid :</span>
            <span className="font-semibold">{fmt(emp.daysPaid ?? 30)}</span>
          </div>
        </div>

        {/* Right Column */}
        <div className="p-3 space-y-1.5">
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">Location :</span>
            <span className="font-medium">{emp.location || emp.entityName || "Bangalore"}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">Bank Name :</span>
            <span className="font-medium">{emp.bankName || "N/A"}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">Bank Account No. :</span>
            <span className="font-medium font-mono">{emp.bankAccount || "N/A"}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">LOP Days :</span>
            <span className="font-semibold">{fmt(emp.lopDays || 0)}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">PAN NO :</span>
            <span className="font-medium font-mono">{emp.pan || "N/A"}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="text-slate-700">Extra days (OT Days) :</span>
            <span className="font-semibold">{fmt(emp.extraDays ?? (Number(emp.overtimeHours || emp.ot || 0) / 8))}</span>
          </div>
        </div>
      </div>

      {/* Earnings & Deductions Table */}
      <div className="border-x border-b border-black text-xs">
        {/* Table Header */}
        <div className="grid grid-cols-2 border-b border-black font-bold bg-slate-50">
          <div className="grid grid-cols-[1fr_110px_110px] px-3 py-2 border-r border-black">
            <span>Earnings</span>
            <span className="text-right pr-1">Actual</span>
            <span className="text-right pr-1">Earned</span>
          </div>
          <div className="grid grid-cols-[1fr_120px] px-3 py-2">
            <span>Deductions</span>
            <span className="text-right pr-1">Amount</span>
          </div>
        </div>

        {/* Table Rows */}
        <div className="grid grid-cols-2">
          {/* Earnings Column */}
          <div className="border-r border-black">
            {earningsList.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_110px_110px] px-3 py-1.5 min-h-[26px] items-center border-b border-slate-100 last:border-b-0">
                <span className="truncate pr-2 font-normal text-slate-800">{row.name}</span>
                <span className="text-right font-mono font-medium tabular-nums text-slate-900 pr-1">{row.name ? fmt(row.actual) : ""}</span>
                <span className="text-right font-mono font-semibold tabular-nums text-slate-950 pr-1">{row.name ? fmt(row.earned) : ""}</span>
              </div>
            ))}
          </div>

          {/* Deductions Column */}
          <div>
            {deductionsList.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_120px] px-3 py-1.5 min-h-[26px] items-center border-b border-slate-100 last:border-b-0">
                <span className="truncate pr-2 font-normal text-slate-800">{row.name}</span>
                <span className="text-right font-mono font-semibold tabular-nums text-slate-950 pr-1">{row.name && row.amount !== null ? fmt(row.amount) : ""}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total Row */}
        <div className="grid grid-cols-2 border-t border-black font-bold bg-slate-50">
          <div className="grid grid-cols-[1fr_110px_110px] px-3 py-2 border-r border-black">
            <span>Total Earnings:</span>
            <span className="text-right font-mono tabular-nums pr-1">{fmt(totalActual)}</span>
            <span className="text-right font-mono tabular-nums pr-1">{fmt(totalEarned)}</span>
          </div>
          <div className="grid grid-cols-[1fr_120px] px-3 py-2">
            <span>Total Deductions:</span>
            <span className="text-right font-mono tabular-nums pr-1">{fmt(totalDeductions)}</span>
          </div>
        </div>
      </div>

      {/* Net Pay Box */}
      <div className="border-x border-b border-black p-3 text-xs bg-slate-50/50">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-800">Net Pay for the month (Total Earnings - Total Deductions) :</span>
          <span className="font-bold text-sm font-mono tabular-nums text-slate-950">{fmt(netPay)}</span>
        </div>
        <div className="font-semibold text-xs mt-1.5 text-slate-700 uppercase tracking-wide">
          {numberToWords(netPay)}
        </div>
      </div>

      {/* Remarks Box */}
      <div className="border-x border-b border-black p-3 min-h-[44px] text-xs">
        <span className="font-bold">Remarks :</span>
        <span className="ml-2 font-medium text-slate-800">{emp.remarks || ""}</span>
      </div>

      {/* Footer */}
      <div className="py-2.5 text-center text-[10px] text-black">
        This is a system generated payslip and does not require signature
      </div>
    </div>
  );
}
