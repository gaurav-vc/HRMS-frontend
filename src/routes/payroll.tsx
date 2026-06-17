import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, Users, TrendingUp, FileSpreadsheet, ReceiptText, Sliders, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { db, fmtINR } from "@/lib/mock-data";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/payroll")({ component: PayrollOverview });

function PayrollOverview() {
  const { payrollRuns, employees, loans, reimbursements } = db();
  const last = payrollRuns[payrollRuns.length - 1];
  const data = payrollRuns.map(r => ({ name: r.period.slice(5), gross: r.gross/100000, net: r.net/100000 }));

  return (
    <>
      <PageHeader title="Payroll Overview" description="Multi-entity payroll command center"
        actions={<Link to="/payroll/run"><Button><PlayCircle className="h-4 w-4 mr-1" />Process Payroll</Button></Link>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Active Cycle" value="June 2026" icon={Wallet} tone="info" />
        <StatCard label="Employees" value={String(employees.length)} icon={Users} />
        <StatCard label="Est. Net Pay" value={fmtINR(last.net)} delta="+0.8%" icon={Wallet} tone="success" />
        <StatCard label="Pending Reimb." value={String(reimbursements.filter(r => r.status === "Pending").length)} icon={TrendingUp} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Link to="/payroll/structure"><Card className="p-5 hover:border-primary/40 transition"><Sliders className="h-6 w-6 text-primary mb-2" /><div className="font-semibold">Salary Structure</div><div className="text-xs text-muted-foreground mt-1">Define earnings, deductions and components</div></Card></Link>
        <Link to="/payroll/slips"><Card className="p-5 hover:border-primary/40 transition"><ReceiptText className="h-6 w-6 text-primary mb-2" /><div className="font-semibold">Salary Slips</div><div className="text-xs text-muted-foreground mt-1">View, download and email payslips</div></Card></Link>
        <Link to="/payroll/compliance"><Card className="p-5 hover:border-primary/40 transition"><FileSpreadsheet className="h-6 w-6 text-primary mb-2" /><div className="font-semibold">Compliance</div><div className="text-xs text-muted-foreground mt-1">PF, ESI, PT and TDS filings</div></Card></Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h3 className="font-semibold mb-3">Gross vs Net (₹ Lakhs)</h3>
          <ResponsiveContainer width="100%" height={260}><BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
            <Bar dataKey="gross" fill="var(--color-chart-2)" radius={[4,4,0,0]} />
            <Bar dataKey="net" fill="var(--color-chart-1)" radius={[4,4,0,0]} />
          </BarChart></ResponsiveContainer>
        </Card>
        <Card className="p-5"><h3 className="font-semibold mb-3">Recent Payroll Runs</h3>
          <ul className="divide-y">{payrollRuns.slice().reverse().map(r => (
            <li key={r.id} className="py-3 flex items-center justify-between">
              <div><div className="font-medium">{r.period}</div><div className="text-xs text-muted-foreground">{r.employees} employees • {fmtINR(r.net)} net</div></div>
              <Badge className={r.status === "Disbursed" ? "bg-success text-success-foreground" : r.status === "Draft" ? "bg-warning text-warning-foreground" : ""}>{r.status}</Badge>
            </li>
          ))}</ul>
        </Card>
      </div>

      <Card className="p-5 mt-6"><h3 className="font-semibold mb-3">Active Loans Snapshot</h3>
        <ul className="divide-y">{loans.slice(0, 6).map(l => (
          <li key={l.id} className="py-2 flex justify-between text-sm"><span>{l.type} • {fmtINR(l.amount)}</span><span className="text-muted-foreground">EMI {fmtINR(l.emi)} • {l.tenure}m</span></li>
        ))}</ul>
      </Card>
    </>
  );
}
