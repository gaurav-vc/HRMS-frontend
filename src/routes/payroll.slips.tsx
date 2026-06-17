import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Mail, Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db, empName, fmtINR, type Employee } from "@/lib/mock-data";

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
      <DataTable rows={rows} rowKey={r => r.id} searchKeys={["firstName","lastName","code","email"]} filename="payslips.csv"
        columns={[
          { key: "emp", header: "Employee", render: r => <div><div className="font-medium">{r.firstName} {r.lastName}</div><div className="text-xs text-muted-foreground">{r.code}</div></div> },
          { key: "gross", header: "Gross", accessor: r => r.gross, render: r => fmtINR(r.gross) },
          { key: "ded", header: "Deductions", accessor: r => r.ded, render: r => fmtINR(r.ded) },
          { key: "net", header: "Net Pay", accessor: r => r.net, render: r => <span className="font-semibold text-success">{fmtINR(r.net)}</span> },
        ]}
        actions={r => <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => setOpen(r)}><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => toast.success("Payslip downloaded")}><Download className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => toast.success(`Payslip emailed to ${r.email}`)}><Mail className="h-4 w-4" /></Button>
        </div>}
      />
      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Payslip — {period}</DialogTitle></DialogHeader>
          {open && <Payslip emp={open} period={period} />}
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
    <div className="p-4 bg-card border rounded-md">
      <div className="flex justify-between items-start pb-4 border-b">
        <div><div className="font-bold text-lg">Acme Technologies Pvt Ltd</div><div className="text-xs text-muted-foreground">Payslip for {period}</div></div>
        <div className="text-right text-sm"><div>{emp.firstName} {emp.lastName}</div><div className="text-xs text-muted-foreground">{emp.code} • {empName(emp.managerId)}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div><div className="text-xs uppercase text-muted-foreground mb-2">Earnings</div>
          <Row label="Basic" v={basic} /><Row label="HRA" v={hra} /><Row label="Conveyance" v={1600} /><Row label="Medical" v={1250} /><Row label="Special Allowance" v={special} />
          <div className="border-t mt-2 pt-2 flex justify-between font-semibold text-success"><span>Gross Earnings</span><span>{fmtINR(monthly)}</span></div>
        </div>
        <div><div className="text-xs uppercase text-muted-foreground mb-2">Deductions</div>
          <Row label="PF Employee" v={pf} /><Row label="Professional Tax" v={pt} /><Row label="TDS" v={tds} />
          <div className="border-t mt-2 pt-2 flex justify-between font-semibold text-destructive"><span>Total Deductions</span><span>{fmtINR(total)}</span></div>
        </div>
      </div>
      <div className="mt-4 p-3 rounded-md bg-primary text-primary-foreground flex justify-between items-center"><span className="font-semibold">Net Pay</span><span className="text-xl font-bold">{fmtINR(net)}</span></div>
      <div className="text-[10px] text-muted-foreground mt-3 text-center">This is a system-generated payslip. No signature required.</div>
    </div>
  );
}
function Row({ label, v }: { label: string; v: number }) { return <div className="flex justify-between text-sm py-0.5"><span className="text-muted-foreground">{label}</span><span>{fmtINR(v)}</span></div>; }
