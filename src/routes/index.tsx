import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Users, Wallet, CalendarCheck2, AlertTriangle, TrendingUp, Building2, PlayCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { db, fmtINR, empName } from "@/lib/mock-data";
import { StatCard } from "@/components/stat-card";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!user) navigate({ to: "/auth" }); }, [user, navigate]);
  if (!user) return null;

  const role = user.role;
  if (role === "employee") return <EmployeeDashboard />;
  if (role === "manager") return <ManagerDashboard />;
  if (role === "payroll_admin") return <PayrollDashboard />;
  return <ExecutiveDashboard role={role} />;
}

function ExecutiveDashboard({ role }: { role: string }) {
  const { employees, payrollRuns, leaves, attendance, entities } = db();
  const monthly = payrollRuns.map(r => ({ month: r.period.slice(5), net: r.net / 1_00_000, gross: r.gross / 1_00_000 }));
  const headcountByEntity = entities.map(e => ({ name: e.code, value: employees.filter(emp => emp.entityId === e.id).length }));
  const presentToday = attendance.filter(a => a.date === new Date().toISOString().slice(0,10) && a.status !== "Absent").length;
  const pendingLeaves = leaves.filter(l => l.status === "Pending").length;
  const lastRun = payrollRuns[payrollRuns.length - 1];

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6 text-primary-foreground relative overflow-hidden" style={{ background: "linear-gradient(120deg, oklch(0.42 0.18 262), oklch(0.55 0.16 240))" }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, oklch(0.8 0.18 195) 0, transparent 40%)" }} />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">{role === "super_admin" ? "CEO Cockpit" : "Executive Overview"}</p>
            <h2 className="text-2xl md:text-3xl font-semibold mt-1">Welcome back — June payroll is ready for approval.</h2>
            <p className="opacity-80 text-sm mt-1">{employees.length} employees across {entities.length} entities. Estimated net pay: {fmtINR(lastRun.net)}.</p>
          </div>
          <Link to="/payroll/run"><Button size="lg" variant="secondary" className="gap-2"><PlayCircle className="h-5 w-5" />Process Payroll — 1 Click<ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Headcount" value={String(employees.length)} delta="+3.2%" icon={Users} />
        <StatCard label="Present Today" value={`${presentToday}/${employees.length}`} delta="+1.4%" icon={CalendarCheck2} tone="success" />
        <StatCard label="June Net Payroll" value={fmtINR(lastRun.net)} delta="+0.8%" icon={Wallet} tone="info" />
        <StatCard label="Pending Approvals" value={String(pendingLeaves)} delta="-12%" icon={AlertTriangle} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4"><div><h3 className="font-semibold">Payroll Trend</h3><p className="text-xs text-muted-foreground">Last 3 months (₹ Lakhs)</p></div><TrendingUp className="h-4 w-4 text-primary" /></div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly}>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5}/><stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="net" stroke="var(--color-chart-1)" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <h3 className="font-semibold mb-1">Headcount by Entity</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution across legal entities</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={headcountByEntity}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Bar dataKey="value" radius={[6,6,0,0]}>{headcountByEntity.map((_, i) => <Cell key={i} fill={`var(--color-chart-${(i%5)+1})`} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Pending Leave Approvals</h3><Link to="/leave" className="text-xs text-primary">View all</Link></div>
          <div className="space-y-2">
            {leaves.filter(l => l.status === "Pending").slice(0, 5).map(l => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-md border">
                <div className="flex items-center gap-3 min-w-0"><Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{empName(l.employeeId).split(" ").map(s => s[0]).join("")}</AvatarFallback></Avatar>
                  <div className="min-w-0"><div className="text-sm font-medium truncate">{empName(l.employeeId)}</div><div className="text-xs text-muted-foreground">{l.type} • {l.days}d • {l.from}</div></div></div>
                <Badge variant="outline">{l.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Recent Payroll Runs</h3><Link to="/payroll" className="text-xs text-primary">View all</Link></div>
          <div className="space-y-2">
            {payrollRuns.slice().reverse().map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-md border">
                <div className="min-w-0"><div className="text-sm font-medium">{r.period}</div><div className="text-xs text-muted-foreground">{r.employees} employees • {fmtINR(r.net)} net</div></div>
                <Badge className={r.status === "Disbursed" ? "bg-success text-success-foreground" : r.status === "Draft" ? "bg-warning text-warning-foreground" : ""}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PayrollDashboard() {
  const { payrollRuns, employees, loans, reimbursements } = db();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Cycle" value="June 2026" icon={Wallet} tone="info" />
        <StatCard label="Employees in Cycle" value={String(employees.length)} icon={Users} />
        <StatCard label="Active Loans" value={String(loans.filter(l => l.status === "Active").length)} icon={Wallet} tone="warning" />
        <StatCard label="Reimbursements Pending" value={String(reimbursements.filter(r => r.status === "Pending").length)} icon={Wallet} />
      </div>
      <Card className="p-6 shadow-[var(--shadow-card)]">
        <h3 className="font-semibold mb-4">Payroll Cycle Status</h3>
        <ol className="grid sm:grid-cols-5 gap-3">
          {["Cutoff","Variable Inputs","Calculation","Approval","Disbursement"].map((s, i) => (
            <li key={s} className={`p-3 rounded-md border ${i < 3 ? "bg-success/10 border-success/30" : i === 3 ? "bg-warning/10 border-warning/30" : "bg-muted"}`}>
              <div className="text-xs text-muted-foreground">Step {i+1}</div>
              <div className="font-medium text-sm">{s}</div>
              <div className="text-[10px] mt-1">{i < 3 ? "Completed" : i === 3 ? "In progress" : "Pending"}</div>
            </li>
          ))}
        </ol>
        <div className="mt-4"><Link to="/payroll/run"><Button>Continue Payroll</Button></Link></div>
      </Card>
      <Card className="p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-semibold mb-3">Recent runs</h3>
        <ul className="divide-y">{payrollRuns.map(r => (
          <li key={r.id} className="py-3 flex items-center justify-between"><span>{r.period} — {fmtINR(r.net)}</span><Badge>{r.status}</Badge></li>
        ))}</ul>
      </Card>
    </div>
  );
}

function ManagerDashboard() {
  const { employees, leaves, attendance } = db();
  const myTeam = employees.slice(0, 8);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="My Team" value={String(myTeam.length)} icon={Users} />
        <StatCard label="On Leave Today" value="2" icon={CalendarCheck2} tone="warning" />
        <StatCard label="Pending Approvals" value={String(leaves.filter(l => l.status === "Pending").slice(0,5).length)} icon={AlertTriangle} tone="info" />
      </div>
      <Card className="p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-semibold mb-3">Team Roster</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{myTeam.map(e => (
          <div key={e.id} className="p-4 rounded-md border flex items-center gap-3"><Avatar><AvatarFallback className="bg-primary/10 text-primary">{e.firstName[0]}{e.lastName[0]}</AvatarFallback></Avatar>
            <div className="min-w-0"><div className="text-sm font-medium truncate">{e.firstName} {e.lastName}</div><div className="text-xs text-muted-foreground truncate">{e.code}</div></div></div>
        ))}</div>
      </Card>
      <Card className="p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-semibold mb-3">Today's Team Attendance</h3>
        <ul className="divide-y">{attendance.slice(0, 6).map(a => (
          <li key={a.id} className="py-3 flex items-center justify-between text-sm"><span>{empName(a.employeeId)}</span><span className="text-muted-foreground">{a.checkIn} • {a.status}</span></li>
        ))}</ul>
      </Card>
    </div>
  );
}

function EmployeeDashboard() {
  const { attendance, leaves, payrollRuns } = db();
  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6 text-primary-foreground" style={{ background: "linear-gradient(120deg, oklch(0.42 0.18 262), oklch(0.55 0.16 240))" }}>
        <h2 className="text-2xl font-semibold">Good morning!</h2>
        <p className="opacity-80 text-sm mt-1">Ready to mark attendance?</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/attendance/qr"><Button variant="secondary">Scan QR</Button></Link>
          <Link to="/attendance/face"><Button variant="secondary">Face Check-in</Button></Link>
          <Link to="/leave"><Button variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground/30">Apply Leave</Button></Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="This Month Present" value="18 / 22" icon={CalendarCheck2} tone="success" />
        <StatCard label="Leave Balance" value="12 days" icon={CalendarCheck2} tone="info" />
        <StatCard label="Last Net Pay" value={fmtINR(payrollRuns[payrollRuns.length-2].net / 48)} icon={Wallet} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-[var(--shadow-card)]"><h3 className="font-semibold mb-3">Recent Attendance</h3>
          <ul className="divide-y">{attendance.slice(0, 5).map(a => (<li key={a.id} className="py-2 flex justify-between text-sm"><span>{a.date}</span><span className="text-muted-foreground">{a.checkIn} → {a.checkOut}</span></li>))}</ul>
        </Card>
        <Card className="p-5 shadow-[var(--shadow-card)]"><h3 className="font-semibold mb-3">My Leave Requests</h3>
          <ul className="divide-y">{leaves.slice(0, 5).map(l => (<li key={l.id} className="py-2 flex justify-between text-sm"><span>{l.type} • {l.from}</span><Badge variant="outline">{l.status}</Badge></li>))}</ul>
        </Card>
      </div>
    </div>
  );
}
