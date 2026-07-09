import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { toast } from "sonner";
import { Download, Mail, Eye, FileDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db, empName, fmtINR, type Employee } from "@/lib/mock-data";
import { openPayslipPdf } from "@/lib/payslip-pdf";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { payrollApi } from "@/api";

const getHtmlToImage = () => {
  return new Promise((resolve, reject) => {
    if ((window as any).htmlToImage) return resolve((window as any).htmlToImage);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
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
    backgroundColor: '#ffffff'
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

  const margin = 10;
  pdf.addImage(dataUrl, 'JPEG', margin, margin, pdfWidth - (margin * 2), pdfHeight - (margin * 2));

  if (download) {
    pdf.save(filename);
    return '';
  } else {
    return pdf.output('datauristring');
  }
};

export const Route = createFileRoute("/payroll/slips")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      period: search.period as string | undefined,
    }
  },
  loaderDeps: ({ search: { period } }) => ({ period }),
  loader: async ({ deps: { period } }) => {
    const data = await payrollApi.getSlips(period);
    return { data };
  },
  component: SlipsPage
});

function SlipsPage() {
  const { data } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const period = data.period;
  const rows = data.slips.map((s: any) => {
    return s;
  });

  if (rows.length === 0 && data.diagnostics) {
    console.log("DIAGNOSTICS:\n" + JSON.stringify(data.diagnostics, null, 2));
  }

  const [open, setOpen] = useState<any | null>(null);

  const totalPayroll = rows.reduce((acc: number, r: any) => acc + r.gross, 0);
  
  const [yearStr, monthStr] = period.split('-');
  const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();

  const handlePeriodChange = (val: string) => {
    navigate({ search: { period: val } });
  };

  // Generate last 12 months for dropdown
  const periodOptions = [];
  let d = new Date();
  for (let i = 0; i < 12; i++) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    periodOptions.push(`${y}-${m}`);
    d.setMonth(d.getMonth() - 1);
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <PageHeader title="Salary Slips" description={`Payslips for ${period}`} />
        <div className="w-[180px]">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger><SelectValue placeholder="Select Month" /></SelectTrigger>
            <SelectContent>
              {periodOptions.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total Payroll</div>
          <div className="text-2xl font-bold">{fmtINR(totalPayroll)}</div>
          <div className="text-xs text-muted-foreground mt-2">{rows.length} employees</div>
        </Card>
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Paid</div>
          <div className="text-2xl font-bold text-success">{rows.length}</div>
          <div className="text-xs text-muted-foreground mt-2">On schedule</div>
        </Card>
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total Working Days</div>
          <div className="text-2xl font-bold">{daysInMonth}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Days in {new Date(parseInt(yearStr), parseInt(monthStr) - 1).toLocaleString('default', { month: 'long' })} {yearStr}
          </div>
        </Card>
      </div>

      <DataTable rows={rows} rowKey={r => r.id} tableId="payslips" searchKeys={["firstName", "lastName", "code", "email"]} filename={`payslips-${period}.csv`}
        columns={[
          { key: "emp", header: "Employee", render: r => <div><div className="font-medium">{r.firstName} {r.lastName}</div><div className="text-xs text-muted-foreground">{r.code}</div></div>, accessor: r => `${r.firstName || ''} ${r.lastName || ''}`.trim() },
          { key: "bank", header: "Bank", render: r => <span className="text-xs">{r.bankName} • ****{r.bankAccount?.slice(-4)}</span>, accessor: r => r.bankName ? `${r.bankName} • ****${r.bankAccount?.slice(-4)}` : "—" },
          { key: "gross", header: "Gross", accessor: r => r.gross, render: r => fmtINR(r.gross), sortable: true },
          { key: "ded", header: "Deductions", accessor: r => r.ded, render: r => fmtINR(r.ded), sortable: true },
          { key: "net", header: "Net Pay", accessor: r => r.net, render: r => <span className="font-semibold text-success">{fmtINR(r.net)}</span>, sortable: true },
        ]}
        actions={(r: any) => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" title="Preview" onClick={() => setOpen(r)}><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Download PDF" onClick={() => {
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
          }}><FileDown className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Email" onClick={() => {
            setOpen(r);
            const loading = toast.loading("Preparing beautiful PDF...");
            setTimeout(async () => {
              try {
                const element = document.getElementById("payslip-capture");
                if (!element) throw new Error("Payslip view not rendered yet");
                toast.loading("Rendering PDF...", { id: loading });
                const pdfBase64 = await generatePdf(element, `Payslip_${period}_${r.code}.pdf`, false);
                toast.loading("Sending email with attached PDF...", { id: loading });
                await payrollApi.emailSlipWithAttachment(r.id, pdfBase64);
                toast.success(`Payslip emailed successfully!`, { id: loading });
              } catch (e: any) {
                toast.error(e.message || "Failed to send email", { id: loading });
              }
            }, 800);
          }}><Mail className="h-4 w-4" /></Button>
        </div>}
      />
      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogTitle className="sr-only">Payslip</DialogTitle>
          {open && <>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
              <Payslip emp={open} period={period} />
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={async () => {
                const element = document.getElementById("payslip-capture");
                if (!element) throw new Error("Payslip view not rendered yet");
                const loading = toast.loading("Rendering PDF...");
                try {
                  const pdfBase64 = await generatePdf(element, `Payslip_${period}_${open.code}.pdf`, false);
                  toast.loading("Sending email with attached PDF...", { id: loading });
                  await payrollApi.emailSlipWithAttachment(open.id, pdfBase64);
                  toast.success(`Payslip emailed successfully!`, { id: loading });
                } catch (e: any) {
                  toast.error(e.message || "Failed to send email", { id: loading });
                }
              }}><Mail className="h-4 w-4 mr-1" />Email</Button>
              <Button onClick={async () => {
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
              }}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Payslip({ emp, period }: { emp: any; period: string }) {
  const { gross, net, pf, pt, tds, ded, components } = emp;

  // Exclude deductions to only show earnings
  const isDeduction = (k: string) => ['pf', 'pt', 'tds', 'provident', 'professional', 'tax', 'deduction'].some(d => k.toLowerCase().includes(d));

  const earningsEntries = Object.entries(components || {}).filter(([k]) => !isDeduction(k));
  const deductionEntries = Object.entries(components || {}).filter(([k]) => isDeduction(k));

  // Capitalize properly
  const formatName = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    let numStr = num.toString().replace(/[\, ]/g, '');
    if (numStr !== parseFloat(numStr).toString()) return 'not a number';
    let x = numStr.indexOf('.');
    if (x === -1) x = numStr.length;
    if (x > 15) return 'too big';
    let n = numStr.split('');
    let str = '';
    let sk = 0;
    for (let i = 0; i < x; i++) {
      if ((x - i) % 3 === 2) {
        if (n[i] === '1') {
          str += a[Number(n[i] + n[i + 1])] + ' ';
          i++;
          sk = 1;
        } else if (n[i] !== '0') {
          str += b[Number(n[i])] + ' ';
          sk = 1;
        }
      } else if (n[i] !== '0') {
        str += a[Number(n[i])] + ' ';
        if ((x - i) % 3 === 0) str += 'Hundred ';
        sk = 1;
      }
      if ((x - i) % 3 === 1) {
        if (sk) str += (x - i - 1 === 3 ? 'Thousand ' : (x - i - 1 === 5 ? 'Lakh ' : (x - i - 1 === 7 ? 'Crore ' : '')));
        sk = 0;
      }
    }
    return str.trim() + " Only";
  };

  return (
    <div id="payslip-capture" className="rounded-xl border border-border/60 overflow-hidden bg-white text-slate-900 shadow-sm mx-auto">
      {/* Header Section */}
      <div className="px-6 pt-4 pb-4 border-b border-border/40 bg-slate-50/50">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1">
              {emp.entityName || "Unknown Entity"}
            </h1>
            <div className="text-xs text-slate-500">42 Tech Park, Bengaluru • GSTIN 27AABCA1234A1Z5</div>
          </div>
          <div className="text-right mt-2">
            <div className="text-sm font-semibold text-primary uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full inline-block shadow-sm">Payslip for {period}</div>
          </div>
        </div>

        {/* Employee Summary Card inside Header */}
        <div className="grid sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-border/40 shadow-sm">
          <div>
            <div className="font-bold text-lg">{emp.firstName} {emp.lastName}</div>
            <div className="text-sm font-medium text-slate-600 mb-1">{emp.designation || 'Software Engineer'} • {emp.department || 'Engineering'}</div>
            <div className="text-xs text-slate-500">Employee ID: <span className="font-semibold text-slate-700">{emp.code}</span></div>
          </div>
          <div className="flex sm:justify-end items-center gap-6 text-sm">
            <div className="text-right">
              <div className="text-slate-500 text-xs uppercase mb-0.5">Date of Joining</div>
              <div className="font-medium">{emp.doj || '01-Apr-2023'}</div>
            </div>
            <div className="w-px h-8 bg-border/60"></div>
            <div className="text-right">
              <div className="text-slate-500 text-xs uppercase mb-0.5">UAN Number</div>
              <div className="font-medium">{emp.uan || '100456789012'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance & Basic Info Grid */}
      <div className="p-4 px-6 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/30 border-b border-border/40 text-sm">
        <div className="space-y-5">
          <div className="flex items-center"><span className="text-slate-500 w-28 text-[13px]">Days Paid</span><span className="font-bold text-slate-800 text-[13px]">{emp.daysPaid ?? 0}</span></div>
          <div className="flex items-center"><span className="text-slate-500 w-28 text-[13px]">Days Present</span><span className="font-bold text-slate-800 text-[13px]">{emp.daysPresent ?? 0}</span></div>
          <div className="flex items-center"><span className="text-slate-500 w-28 text-[13px]">Paid Leaves</span><span className="font-bold text-slate-800 text-[13px]">{emp.paidLeaves ?? 0}</span></div>
        </div>
        <div className="space-y-5">
          <div className="flex items-center"><span className="text-slate-500 w-28 text-[13px]">Weekly Off</span><span className="font-bold text-slate-800 text-[13px]">{emp.daysOff ?? 0}</span></div>
          <div className="flex items-center"><span className="text-slate-500 w-28 text-[13px]">LWP / Absent</span><span className="font-bold text-slate-800 text-[13px]">{emp.daysAbsent ?? 0}</span></div>
          <div className="flex items-center"><span className="text-slate-500 w-28 text-[13px]">Overtime Hrs</span><span className="font-bold text-slate-800 text-[13px]">{emp.overtimeHours ?? 0}</span></div>
        </div>
        <div className="space-y-5">
          <div className="flex items-center"><span className="text-slate-500 w-24 text-[13px]">Bank Name</span><span className="font-bold text-slate-800 text-[13px]">{emp.bankName || 'HDFC Bank'}</span></div>
          <div className="flex items-center"><span className="text-slate-500 w-24 text-[13px]">Account No</span><span className="font-bold text-slate-800 text-[13px]">****{(emp.bankAccount || '0000').slice(-4)}</span></div>
        </div>
        <div className="space-y-5">
          <div className="flex items-center"><span className="text-slate-500 w-20 text-[13px]">PAN</span><span className="font-bold text-slate-800 text-[13px]">{emp.pan || 'ABCDE1234F'}</span></div>
          <div className="flex items-center"><span className="text-slate-500 w-20 text-[13px]">Manager</span><span className="font-bold text-slate-800 text-[13px]">{emp.managerName || 'Jane Doe'}</span></div>
        </div>
      </div>
      <div className="p-4 px-6 grid grid-cols-2 gap-6 relative">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border"></div>
        <div><div className="font-bold border-b pb-2 mb-2">Earnings & Reimbursements</div>
          {earningsEntries.map(([k, v]) => <Row key={k} label={formatName(k)} v={v as number} />)}
          {earningsEntries.length === 0 && <Row label="Basic" v={emp.basic} />}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <div className="font-bold text-slate-800 border-b pb-2 mb-2 uppercase text-xs tracking-wider">Statutory Deductions</div>
            {deductionEntries.length > 0 ? deductionEntries.map(([k, v]) => <Row key={k} label={formatName(k)} v={v as number} />) : (
              <>
                <Row label="PF Employee" v={pf} />
                <Row label="Professional Tax" v={pt} />
                <Row label="Income Tax (TDS)" v={tds || 0} />
              </>
            )}
            {deductionEntries.length > 0 && !deductionEntries.some(([k]) => k.toLowerCase().includes('tax') || k.toLowerCase().includes('tds')) && (
               <Row label="Income Tax" v={tds || 0} />
            )}
          </div>
          
          {emp.daysAbsent > 0 && (
            <div className="bg-red-50/40 border border-red-100/60 rounded-md p-3 pb-2">
              <div className="font-bold text-red-800 border-b border-red-200/50 pb-2 mb-2 uppercase text-xs tracking-wider flex items-center justify-between">
                <span>Administrative Penalties</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-sm">Adjusted</span>
              </div>
              
              {emp.lopDays ? (
                <div className="flex justify-between text-sm py-1 font-medium text-red-900">
                  <span>Loss of Pay ({emp.lopDays} days)</span>
                  <span>- {fmtINR(emp.gross && emp.daysPaid ? Math.round(((emp.gross / emp.daysPaid) * emp.lopDays)) : 0)}</span>
                </div>
              ) : null}
              
              {emp.lateMarks ? (
                <div className="flex justify-between text-sm py-1 font-medium text-red-900">
                  <span>Late Marks Penalty ({emp.lateMarks} marks)</span>
                  <span>- {fmtINR(emp.gross && emp.daysPaid ? Math.round(((emp.gross / emp.daysPaid) * ((emp.daysAbsent || 0) - (emp.lopDays || 0)))) : 0)}</span>
                </div>
              ) : null}

              {!emp.lopDays && !emp.lateMarks && (
                <div className="flex justify-between text-sm py-1 font-medium text-red-900">
                  <span>Loss of Pay / Absences ({emp.daysAbsent} days)</span>
                  <span>- {fmtINR(emp.gross && emp.daysPaid ? Math.round(((emp.gross / emp.daysPaid) * emp.daysAbsent)) : 0)}</span>
                </div>
              )}
              
              <div className="text-[11px] text-red-600/80 mt-1 pt-1 border-t border-red-100/50">Calculated dynamically based on attendance. This amount has already been pre-deducted from the gross earnings above.</div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 border-y-2 border-black font-bold p-2 px-5">
        <div className="flex justify-between"><span>Total Earnings</span><span>{fmtINR(gross)}</span></div>
        <div className="flex justify-between"><span>Total Deductions</span><span>{fmtINR(ded)}</span></div>
      </div>
      <div className="flex justify-end p-2 px-5 font-bold border-b-2 border-black">
        <div className="flex justify-between w-1/2 pl-3"><span>Net Pay</span><span>{fmtINR(net)}</span></div>
      </div>
      <div className="p-3 px-5 border-b-2 border-black font-semibold text-sm">
        Rupees: {numberToWords(Math.round(net))}
      </div>
      <div className="p-3 px-5 font-semibold text-sm">
        Amount credited to {emp.bankName || 'Bank'} Saving Account No ****{(emp.bankAccount || '0000').slice(-4)}
      </div>
      <div className="p-5 border-t border-dashed grid sm:grid-cols-2 gap-8 items-end">
        <div />
        <div className="flex flex-col items-end justify-end">
          <div className="border-b-2 border-black w-48 mb-2"></div>
          <div className="text-sm font-bold">Authorized Signatory</div>
          <div className="text-xs text-muted-foreground">HRMS PeoplePulse</div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground pb-3 pt-2 text-center border-t bg-muted/5">This is a system-generated payslip.</div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) { return <div className="flex justify-between text-sm py-1 border-b border-dashed last:border-0"><span className="text-muted-foreground">{label}</span><span>{fmtINR(v)}</span></div>; }
