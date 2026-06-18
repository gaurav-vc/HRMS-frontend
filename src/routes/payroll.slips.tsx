import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Mail, Eye, FileDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db, empName, fmtINR, type Employee } from "@/lib/mock-data";
import { openPayslipPdf } from "@/lib/payslip-pdf";

export const Route = createFileRoute("/payroll/slips")({ component: SlipsPage });

function SlipsPage() {
  const { employees, payrollRuns } = db();
  const period = payrollRuns[payrollRuns.length - 2].period;
  const [open, setOpen] = useState<Employee | null>(null);

  const rows = employees.slice(0, 30).map(e => {
    const gross = Math.round(e.ctc / 12);
    const ded = Math.round(gross * 0.18);
    return { ...e, gross, ded, net: gross - ded };
  });

  return (
    <>
      <PageHeader title="Salary Slips" description={`Payslips for ${period}`} />
      <DataTable rows={rows} rowKey={r => r.id} tableId="payslips" searchKeys={["firstName","lastName","code","email"]} filename={`payslips-${period}.csv`}
        columns={[
          { key: "emp", header: "Employee", render: r => <div><div className="font-medium">{r.firstName} {r.lastName}</div><div className="text-xs text-muted-foreground">{r.code}</div></div> },
          { key: "bank", header: "Bank", render: r => <span className="text-xs">{r.bankName} • ****{r.bankAccount.slice(-4)}</span> },
          { key: "gross", header: "Gross", accessor: r => r.gross, render: r => fmtINR(r.gross), sortable: true },
          { key: "ded", header: "Deductions", accessor: r => r.ded, render: r => fmtINR(r.ded), sortable: true },
          { key: "net", header: "Net Pay", accessor: r => r.net, render: r => <span className="font-semibold text-success">{fmtINR(r.net)}</span>, sortable: true },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" title="Preview" onClick={() => setOpen(r)}><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Download PDF" onClick={() => openPayslipPdf(r, period)}><FileDown className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Email" onClick={() => toast.success(`Payslip emailed to ${r.email}`)}><Mail className="h-4 w-4" /></Button>
        </div>}
      />
      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Payslip — {period}</DialogTitle></DialogHeader>
          {open && <>
            <Payslip emp={open} period={period} />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => toast.success(`Emailed to ${open.email}`)}><Mail className="h-4 w-4 mr-1" />Email</Button>
              <Button onClick={() => openPayslipPdf(open, period)}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Payslip({ emp, period }: { emp: Employee; period: string }) {
  const monthly = Math.round(emp.ctc / 12);
  const basic = Math.round(monthly * 0.4);
  const hra = Math.round(basic * 0.5);
  const special = monthly - basic - hra - 2850;
  const pf = Math.round(basic * 0.12);
  const pt = 200;
  const tds = Math.round(monthly * 0.08);
  const total = pf + pt + tds;
  const net = monthly - total;
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="p-5 text-primary-foreground" style={{ background: "linear-gradient(120deg, oklch(0.42 0.18 262), oklch(0.55 0.16 240))" }}>
        <div className="flex justify-between items-start">
          <div><div className="font-bold text-lg">Acme Technologies Pvt Ltd</div><div className="text-xs opacity-80">42 Tech Park, Bengaluru • GSTIN 27AABCA1234A1Z5</div><div className="text-xs opacity-80 mt-1">Payslip for {period}</div></div>
          <div className="text-right text-sm"><div className="font-semibold">{emp.firstName} {emp.lastName}</div><div className="text-xs opacity-80">{emp.code}</div></div>
        </div>
      </div>
      <div className="p-5 grid sm:grid-cols-3 gap-3 text-xs bg-muted/40 border-b">
        <div><div className="text-muted-foreground">Bank</div><div>{emp.bankName} • ****{emp.bankAccount.slice(-4)}</div></div>
        <div><div className="text-muted-foreground">PAN</div><div>{emp.pan}</div></div>
        <div><div className="text-muted-foreground">UAN</div><div>{emp.uan}</div></div>
        <div><div className="text-muted-foreground">Date of Joining</div><div>{emp.doj}</div></div>
        <div><div className="text-muted-foreground">Manager</div><div>{empName(emp.managerId)}</div></div>
        <div><div className="text-muted-foreground">Pay Period</div><div>{period}</div></div>
      </div>
      <div className="p-5 grid grid-cols-2 gap-6">
        <div><div className="text-xs uppercase text-muted-foreground mb-2 tracking-wider">Earnings</div>
          <Row label="Basic" v={basic} /><Row label="HRA" v={hra} /><Row label="Conveyance" v={1600} /><Row label="Medical" v={1250} /><Row label="Special Allowance" v={special} />
          <div className="border-t-2 mt-2 pt-2 flex justify-between font-semibold text-success"><span>Gross Earnings</span><span>{fmtINR(monthly)}</span></div>
        </div>
        <div><div className="text-xs uppercase text-muted-foreground mb-2 tracking-wider">Deductions</div>
          <Row label="PF Employee" v={pf} /><Row label="Professional Tax" v={pt} /><Row label="TDS" v={tds} />
          <div className="border-t-2 mt-2 pt-2 flex justify-between font-semibold text-destructive"><span>Total Deductions</span><span>{fmtINR(total)}</span></div>
        </div>
      </div>
      <div className="m-5 mt-0 p-4 rounded-md text-primary-foreground flex justify-between items-center" style={{ background: "linear-gradient(120deg, oklch(0.42 0.18 262), oklch(0.55 0.16 240))" }}>
        <span className="font-semibold uppercase text-xs tracking-wider opacity-85">Net Pay</span><span className="text-2xl font-bold">{fmtINR(net)}</span>
      </div>
      <div className="text-[10px] text-muted-foreground pb-3 text-center">This is a system-generated payslip. No signature required.</div>
    </div>
  );
}
function Row({ label, v }: { label: string; v: number }) { return <div className="flex justify-between text-sm py-1 border-b border-dashed last:border-0"><span className="text-muted-foreground">{label}</span><span>{fmtINR(v)}</span></div>; }
