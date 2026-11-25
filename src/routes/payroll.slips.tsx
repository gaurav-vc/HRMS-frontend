import { createFileRoute, useNavigate, isRedirect } from "@tanstack/react-router";
import React, { useState } from "react";
import { toast } from "sonner";
import { Download, Mail, Eye, FileDown, Trash2, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtINR } from "@/lib/utils";
import type { Employee } from "@/types";
import { openPayslipPdf } from "@/lib/payslip-pdf";
import { useAuth } from "@/lib/auth-context";

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

  const { user } = useAuth();
  const canViewConfidential = Boolean(
    user?.can_view_confidential ??
    (user?.is_ceo ||
     user?.role === "super_admin" ||
     user?.is_superuser === true ||
     user?.employee_id === "CEO001" ||
     user?.permissions?.can_view_confidential_payroll === true)
  );

  const totalPayroll = rows.reduce((acc: number, r: any) => acc + (r.gross || 0), 0);

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
          <div className="text-2xl font-bold">{canViewConfidential ? fmtINR(totalPayroll) : "xxxx"}</div>
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
            render: (r) => (canViewConfidential || r.code === user?.employee_id || r.email === user?.email ? fmtINR(r.gross) : "xxxx"),
            sortable: true,
          },
          {
            key: "ded",
            header: "Deductions",
            accessor: (r) => r.ded,
            render: (r) => (canViewConfidential || r.code === user?.employee_id || r.email === user?.email ? fmtINR(r.ded) : "xxxx"),
            sortable: true,
          },
          {
            key: "net",
            header: "Net Pay",
            accessor: (r) => r.net,
            render: (r) => (
              <span className="font-semibold text-success">
                {canViewConfidential || r.code === user?.employee_id || r.email === user?.email ? fmtINR(r.net) : "xxxx"}
              </span>
            ),
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
        <DialogContent className="max-w-4xl w-[95vw] max-h-[96vh] flex flex-col p-4 sm:p-5 overflow-hidden">
          <DialogTitle className="sr-only">Payslip</DialogTitle>
          {open && (
            <>
              {/* Quick Summary Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-muted/50 border rounded-md">
                <div>
                  <div className="font-semibold text-sm text-foreground">
                    {open.firstName} {open.lastName} ({open.code})
                  </div>
                  <div className="text-xs text-muted-foreground">{formatPeriodMonth(period)} • {open.department || "General"}</div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Gross Earned</div>
                    <div className="font-bold text-foreground">
                      {canViewConfidential || open.code === user?.employee_id || open.email === user?.email ? fmtINR(open.gross) : "xxxx"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Deductions</div>
                    <div className="font-bold text-destructive">
                      {canViewConfidential || open.code === user?.employee_id || open.email === user?.email ? fmtINR(open.ded) : "xxxx"}
                    </div>
                  </div>
                  <div className="text-right pl-3 border-l border-border">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Net Payout</div>
                    <div className="font-bold text-success text-sm">
                      {canViewConfidential || open.code === user?.employee_id || open.email === user?.email ? fmtINR(open.net) : "xxxx"}
                    </div>
                  </div>
                </div>
              </div>

              {!(canViewConfidential || open.code === user?.employee_id || open.email === user?.email) ? (
                <div className="p-8 text-center space-y-3 bg-muted/20 border rounded-lg my-4">
                  <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="font-semibold text-base">Confidential Salary Record</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Individual employee compensation and salary slips are strictly restricted to the CEO. You see 'xxxx' only.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto pr-1 mt-2">
                    <Payslip emp={open} period={period} />
                  </div>
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Payslip({ emp, period }: { emp: any; period: string }) {
  const { components = {}, actual_components = {} } = emp;

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
    ["pf", "pt", "tds", "provident", "professional", "tax", "deduction", "esi", "loan", "advance", "memo", "disciplinary", "penalty"].some((d) =>
      k.toLowerCase().includes(d),
    );

  // Standard enterprise earnings sequence
  const standardEarnings = [
    { key: "basic", label: "Basic", aliases: ["basic"] },
    { key: "hra", label: "HRA", aliases: ["hra", "house rent"] },
    { key: "conveyance", label: "Conveyance Allowance", aliases: ["conveyance", "transport"] },
    { key: "cca", label: "CCA", aliases: ["cca", "city compensatory"] },
    { key: "special", label: "Special Allowance", aliases: ["special allowance", "special"] },
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
    const lk = targetKey.toLowerCase();
    if (
      lk.includes("overtime") ||
      lk === "ot" ||
      lk.includes("bonus") ||
      lk.includes("arrear") ||
      lk.includes("reimb") ||
      lk.includes("encash")
    ) {
      return earnedVal;
    }
    const found = Object.entries(actual_components).find(
      ([k]) => k.toLowerCase() === targetKey.toLowerCase() || k.toLowerCase().includes(targetKey.toLowerCase()),
    );
    if (found && Number(found[1]) > 0) return Number(found[1]);
    const daysPaid = Number(emp.daysPaid ?? 30);
    const totalDays = Number(emp.totalDays || 30) || 30;
    if (daysPaid > 0 && earnedVal > 0) {
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
    } else if (std.key === "basic" && Number(emp.basic || 0) > 0) {
      earned = Number(emp.basic);
    } else if (std.key === "hra" && Number(emp.hra || 0) > 0) {
      earned = Number(emp.hra);
    } else if (std.key === "special" && Number(emp.special || 0) > 0) {
      earned = Number(emp.special);
    }

    const actual = findActualComp(std.key, earned);
    if (earned > 0 || actual > 0 || match !== null) {
      earningsList.push({ name: std.label, actual, earned });
    }

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
      if (earned > 0 || actual > 0) {
        earningsList.push({ name: k, actual, earned });
      }
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

  const isProfWorker = emp.isProfessionalFee || emp.workerType === "Professional" || emp.workerType === "Contractor" || String(emp.tdsSection || "").startsWith("194");

  const standardDeductions = [
    { key: "pf", label: "PF", aliases: ["pf", "provident", "epf"], directVal: emp.pf },
    { key: "pt", label: "Professional Tax", aliases: ["pt", "professional tax", "professional", "prof tax"], directVal: emp.pt },
    {
      key: "tds",
      label: isProfWorker
        ? (emp.workerType === "Contractor" ? "TDS u/s 194C (Contractor)" : "TDS u/s 194J (Professional Fees)")
        : "Income Tax (TDS)",
      aliases: ["tds", "income tax", "tax deducted", "194j", "194c"],
      directVal: emp.tds
    },
  ];

  standardDeductions.forEach((std) => {
    const match = findCompEntry(std.aliases);
    let amt: number | null = null;
    if (match && match.val > 0) {
      amt = match.val;
      processedDedKeys.add(match.key);
    } else if (Number(std.directVal) > 0) {
      amt = Number(std.directVal);
    } else if (std.key === "pf" && !isProfWorker && (emp.pf_applicable || !Object.keys(components).some(isDeduction))) {
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

  // Symmetrically align rows without adding arbitrary empty blank space
  const maxRows = Math.max(earningsList.length, deductionsList.length);
  while (earningsList.length < maxRows) {
    earningsList.push({ name: "", actual: 0, earned: 0 });
  }
  while (deductionsList.length < maxRows) {
    deductionsList.push({ name: "", amount: null });
  }

  const totalActual = Math.round(earningsList.reduce((sum, r) => sum + (r.name ? r.actual : 0), 0) * 100) / 100 || Number(emp.actual_gross || (Number(emp.ctc || 0) / 12) || emp.gross || 0);
  const totalEarned = Math.round(earningsList.reduce((sum, r) => sum + (r.name ? r.earned : 0), 0) * 100) / 100 || Number(emp.gross || 0);
  const totalDeductions = Math.round(deductionsList.reduce((sum, r) => sum + (r.amount || 0), 0) * 100) / 100 || Number(emp.ded || 0);
  const netPay = Math.max(0, Math.round((totalEarned - totalDeductions) * 100) / 100);

  const entityTitle = emp.entityName || emp.companyName || emp.organization || "Company";

  const otHours = Number(emp.ot ?? emp.overtimeHours ?? 0);
  const extraDaysFromPresent = Math.max(0, Number(emp.daysPresent || 0) - Number(emp.totalDays || 30));
  const extraDaysFromOt = otHours > 0 ? otHours / 8 : 0;
  const extraDaysVal = Number(emp.extraDays || 0);
  const otDays = extraDaysVal > 0 ? extraDaysVal : Math.max(extraDaysFromPresent, extraDaysFromOt);

  return (
    <div
      id="payslip-capture"
      className="w-full max-w-[850px] mx-auto bg-white text-black p-4 sm:p-5 font-sans text-xs border border-black shadow-none print:m-0 print:border-black print:max-w-none select-text"
      style={{ color: "#000", backgroundColor: "#fff", fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Entity Header & Title */}
      <div className="text-center pb-2.5 pt-0.5">
        <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black m-0 leading-tight">
          {entityTitle}
        </h1>
        <div className="text-xs font-semibold text-slate-800 mt-0.5">
          PAYSLIP / PROFESSIONAL FEE VOUCHER - {formatPeriodMonth(period)}
        </div>
      </div>

      {/* Top Information Box */}
      <div className="border border-black grid grid-cols-2 text-xs leading-normal">
        {/* Left Column */}
        <div className="border-r border-black p-2.5 space-y-1">
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Name :</span>
            <span className="font-bold text-slate-950">{emp.firstName} {emp.lastName}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">EmpCode :</span>
            <span className="font-bold text-slate-950">{emp.code || "N/A"}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">DOJ :</span>
            <span className="font-medium">{formatDate(emp.doj)}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Department :</span>
            <span className="font-medium">{emp.department || "General"}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Designation :</span>
            <span className="font-medium">{emp.designation || "N/A"}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Payment Nature :</span>
            <span className="font-semibold text-emerald-800">
              {isProfWorker 
                ? (emp.workerType === 'Contractor' ? 'Contractor Retainer (Section 194C)' : 'Professional Fees (Section 194J) / Retainer Payout') 
                : 'Salaried Employment (Section 192)'}
            </span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">No. of. Workingdays :</span>
            <span className="font-semibold">{emp.totalDays || 30}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Holidays :</span>
            <span className="font-semibold">{fmt(emp.holidays || emp.daysOff || 0)}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">No. of. Days Paid :</span>
            <span className="font-semibold">{fmt(emp.daysPaid ?? 30)}</span>
          </div>
        </div>

        {/* Right Column */}
        <div className="p-2.5 space-y-1">
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Location :</span>
            <span className="font-medium">{emp.location || emp.entityName || "Bangalore"}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Bank Name :</span>
            <span className="font-medium">{emp.bankName || "N/A"}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Bank Account No. :</span>
            <span className="font-medium font-mono">{emp.bankAccount || "N/A"}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">PAN NO :</span>
            <span className="font-bold font-mono text-slate-950">
              {emp.pan || (emp.tdsApplicable !== false ? 'NOT PROVIDED (20% Sec 206AA)' : 'N/A')}
            </span>
          </div>
          {emp.tdsLowerDeductionCert && (
            <div className="grid grid-cols-[140px_1fr]">
              <span className="text-slate-700">Sec 197 Cert :</span>
              <span className="font-semibold font-mono text-slate-950">{emp.tdsLowerDeductionCert}</span>
            </div>
          )}
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Half Days :</span>
            <span className="font-semibold">{fmt(emp.halfDays || 0)}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">LOP Days :</span>
            <span className="font-semibold">{fmt(emp.lopDays || 0)}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Late Penalties :</span>
            <span className="font-semibold">{fmt(emp.latePenalties || 0)}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="text-slate-700">Overtime (OT) :</span>
            <span className="font-semibold">
              {otHours > 0 ? `${fmt(otHours)} hrs (${fmt(otDays)} days)` : "0.00 hrs"}
            </span>
          </div>
        </div>
      </div>

      {/* Earnings & Deductions Table */}
      <div className="border-x border-b border-black text-xs">
        {/* Table Header */}
        <div className="grid grid-cols-2 border-b border-black font-bold bg-slate-50">
          <div className="grid grid-cols-[1fr_100px_100px] px-3 py-1.5 border-r border-black">
            <span>Earnings</span>
            <span className="text-right pr-1">Actual</span>
            <span className="text-right pr-1">Earned</span>
          </div>
          <div className="grid grid-cols-[1fr_110px] px-3 py-1.5">
            <span>Deductions</span>
            <span className="text-right pr-1">Amount</span>
          </div>
        </div>

        {/* Table Rows */}
        <div className="grid grid-cols-2">
          {/* Earnings Column */}
          <div className="border-r border-black">
            {earningsList.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_100px_100px] px-3 py-1 min-h-[22px] items-center border-b border-slate-100 last:border-b-0">
                <span className="truncate pr-2 font-normal text-slate-800">{row.name}</span>
                <span className="text-right font-mono font-medium tabular-nums text-slate-900 pr-1">{row.name ? fmt(row.actual) : ""}</span>
                <span className="text-right font-mono font-semibold tabular-nums text-slate-950 pr-1">{row.name ? fmt(row.earned) : ""}</span>
              </div>
            ))}
          </div>

          {/* Deductions Column */}
          <div>
            {deductionsList.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_110px] px-3 py-1 min-h-[22px] items-center border-b border-slate-100 last:border-b-0">
                <span className="truncate pr-2 font-normal text-slate-800">{row.name}</span>
                <span className="text-right font-mono font-semibold tabular-nums text-slate-950 pr-1">{row.name && row.amount !== null ? fmt(row.amount) : ""}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total Row */}
        <div className="grid grid-cols-2 border-t-2 border-black font-bold bg-slate-100/90 text-xs">
          <div className="grid grid-cols-[1fr_100px_100px] px-3 py-1.5 border-r border-black">
            <span>Total Earnings:</span>
            <span className="text-right font-mono tabular-nums pr-1">{fmt(totalActual)}</span>
            <span className="text-right font-mono tabular-nums pr-1 text-slate-950">{fmt(totalEarned)}</span>
          </div>
          <div className="grid grid-cols-[1fr_110px] px-3 py-1.5">
            <span>Total Deductions:</span>
            <span className="text-right font-mono tabular-nums pr-1 text-red-600">{fmt(totalDeductions)}</span>
          </div>
        </div>
      </div>

      {/* Net Pay Box */}
      <div className="border-x border-b border-black p-2.5 text-xs bg-slate-50">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-900">Net Pay for the month (Total Earnings - Total Deductions) :</span>
          <span className="font-bold text-sm font-mono tabular-nums text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{fmt(netPay)}</span>
        </div>
        <div className="font-semibold text-[11px] mt-1 text-slate-700 uppercase tracking-wide">
          {numberToWords(netPay)}
        </div>
      </div>

      {/* Remarks Box */}
      <div className="border-x border-b border-black px-3 py-1.5 min-h-[30px] text-xs">
        <div className="flex items-start">
          <span className="font-bold">Remarks :</span>
          <span className="ml-2 font-medium text-slate-800">
            {emp.remarks || (emp.loanRemarks && emp.loanRemarks.length > 0 ? emp.loanRemarks.join("; ") : "—")}
          </span>
        </div>
        {emp.loanDetails && emp.loanDetails.length > 0 && (
          <div className="mt-1 pt-1 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap gap-3">
            {emp.loanDetails.map((ld: any, idx: number) => (
              <span key={idx} className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                <strong className="text-slate-800">{ld.type} Loan:</strong> {ld.installmentsPaid} / {ld.tenure} Paid ({fmtINR(ld.outstanding)} remaining)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-1.5 text-center text-[10px] text-slate-600">
        This is a system generated payslip and does not require signature
      </div>
    </div>
  );
}
