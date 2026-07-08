import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronRight, LogOut, Search, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
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
import { notificationsApi } from "@/api";

const LABELS: Record<string, string> = {
  "": "Dashboard", entities: "Entities", branches: "Branches", sites: "Sites", departments: "Departments",
  designations: "Designations", employees: "Employees", attendance: "Attendance", qr: "QR Check-in",
  face: "Face Verification", gps: "GPS Capture", regularize: "Regularization", leave: "Leave",
  payroll: "Payroll", structure: "Salary Structure", run: "Run Payroll", slips: "Salary Slips",
  compliance: "Compliance", loans: "Loans & Advances", reimbursements: "Reimbursements",
  reports: "Reports", settings: "Settings",
};

function NotificationBell() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    notificationsApi.getAll()
      .then(data => {
        if(Array.isArray(data)) setNotifs(data);
      })
      .catch(() => {});
  }, [user]);

  const markRead = (id: number) => {
    notificationsApi.markRead(id)
      .then(() => setNotifs(n => n.filter(x => x.id !== id)))
      .catch(() => {});
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {notifs.length > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications ({notifs.length})</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifs.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifs.map(n => (
              <div key={n.id} className="p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="font-medium text-sm">{n.title}</div>
                  <Button variant="ghost" size="icon" className="h-5 w-5 -mt-1" onClick={() => markRead(n.id)}><CheckCircle2 className="h-3 w-3" /></Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</div>
                {n.related_run_id && (
                  <Link to="/payroll/run" className="text-xs text-primary mt-2 block" onClick={() => markRead(n.id)}>View Payroll Run →</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
      <NotificationBell />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 px-2 gap-2">
            <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{user?.name.split(" ").map(s => s[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
            <div className="hidden md:block text-left leading-tight"><div className="text-xs font-medium">{user?.name}</div><div className="text-[10px] text-muted-foreground">{user?.role_name || roleLabel(user?.role ?? "employee")}</div></div>
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
