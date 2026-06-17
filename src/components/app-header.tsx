import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronRight, LogOut, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, roleLabel } from "@/lib/auth-context";
import { ROLES, type Role } from "@/lib/mock-data";

const LABELS: Record<string, string> = {
  "": "Dashboard", entities: "Entities", branches: "Branches", sites: "Sites", departments: "Departments",
  designations: "Designations", employees: "Employees", attendance: "Attendance", qr: "QR Check-in",
  face: "Face Verification", gps: "GPS Capture", regularize: "Regularization", leave: "Leave",
  payroll: "Payroll", structure: "Salary Structure", run: "Run Payroll", slips: "Salary Slips",
  compliance: "Compliance", loans: "Loans & Advances", reimbursements: "Reimbursements",
  reports: "Reports", settings: "Settings",
};

export function AppHeader() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { user, logout, setRole } = useAuth();
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = [{ href: "/", label: "Home" }, ...parts.map((p, i) => ({ href: "/" + parts.slice(0, i + 1).join("/"), label: LABELS[p] ?? p }))];

  return (
    <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur border-b flex items-center gap-3 px-3">
      <SidebarTrigger />
      <nav className="hidden md:flex items-center text-sm text-muted-foreground min-w-0">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 mx-1 shrink-0" />}
            {i === crumbs.length - 1 ? <span className="truncate text-foreground font-medium">{c.label}</span> : <Link to={c.href} className="truncate hover:text-foreground">{c.label}</Link>}
          </span>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="relative hidden lg:block w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search employees, sites…" className="pl-8 h-9" />
      </div>
      <Select value={user?.role} onValueChange={(v) => setRole(v as Role)}>
        <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
      </Select>
      <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 px-2 gap-2">
            <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{user?.name.split(" ").map(s => s[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
            <div className="hidden md:block text-left leading-tight"><div className="text-xs font-medium">{user?.name}</div><div className="text-[10px] text-muted-foreground">{roleLabel(user?.role ?? "employee")}</div></div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>My Payslips</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}><LogOut className="h-4 w-4 mr-2" />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
