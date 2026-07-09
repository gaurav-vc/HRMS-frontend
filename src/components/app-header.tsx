import { Link, useRouterState, useRouter, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronRight, LogOut, Search, CheckCircle2, User, Building, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useTransition } from "react";
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
import { notificationsApi, searchApi } from "@/api";

const LABELS: Record<string, string> = {
  "": "Dashboard", entities: "Entities", branches: "Branches", sites: "Sites", departments: "Departments",
  designations: "Designations", employees: "Employees", attendance: "Attendance", qr: "QR Check-in",
  face: "Face Verification", gps: "GPS Capture", regularize: "Regularization", leave: "Leave",
  payroll: "Payroll", structure: "Salary Structure", run: "Run Payroll", slips: "Salary Slips",
  compliance: "Compliance", loans: "Loans & Advances", reimbursements: "Reimbursements",
  reports: "Reports", settings: "Settings",
};

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await searchApi.query(query);
          if (Array.isArray(res)) setResults(res);
        } catch (err) {
          console.error("Search error", err);
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative hidden lg:block w-64" ref={containerRef}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input 
        placeholder="Search employees, sites…" 
        className="pl-8 h-9 bg-muted/50 border-muted focus-visible:bg-background" 
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => { if (query.trim().length >= 2) setIsOpen(true); }}
      />
      {isPending && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />}
      
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.length === 0 && !isPending ? (
            <div className="p-3 text-sm text-center text-muted-foreground">No results found</div>
          ) : (
            <div className="py-1">
              {results.map((r) => (
                <div 
                  key={`${r.type}-${r.id}`}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                    // TanStack router navigation
                    if (r.url.includes("?")) {
                      const [path, searchStr] = r.url.split("?");
                      const searchObj = Object.fromEntries(new URLSearchParams(searchStr));
                      navigate({ to: path, search: searchObj as any });
                    } else {
                      navigate({ to: r.url });
                    }
                  }}
                >
                  <div className="bg-primary/10 p-1.5 rounded-full shrink-0">
                    {r.type === 'employee' ? <User className="h-4 w-4 text-primary" /> : <Building className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  
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
            {notifs.map(n => {
              // The backend uses CamelCaseJSONRenderer, so keys are camelCased!
              const relatedEmployeeId = n.relatedEmployeeId || n.related_employee_id;
              const relatedRunId = n.relatedRunId || n.related_run_id;
              
              const isEmp = !!relatedEmployeeId;
              const isRun = !!relatedRunId;
              
              if (!isEmp && !isRun) {
                return (
                  <DropdownMenuItem key={n.id} className="p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer flex-col items-start" onSelect={() => markRead(n.id)}>
                    <div className="flex justify-between items-start w-full">
                      <div className="font-medium text-sm">{n.title}</div>
                      <Button variant="ghost" size="icon" className="h-5 w-5 -mt-1" onClick={(e) => { e.stopPropagation(); markRead(n.id); }}><CheckCircle2 className="h-3 w-3" /></Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2 w-full">{n.message}</div>
                  </DropdownMenuItem>
                );
              }

              return (
                <div key={n.id} className="p-3 border-b last:border-0 hover:bg-muted/50 flex flex-col items-start w-full relative group">
                  <div className="flex justify-between items-start w-full">
                    <div className="font-medium text-sm">{n.title}</div>
                    <Button variant="ghost" size="icon" className="h-5 w-5 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n.id); }}><CheckCircle2 className="h-3 w-3" /></Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2 w-full">{n.message}</div>
                  
                  {isEmp ? (
                      <div className="flex gap-4 mt-3 w-full">
                        <span 
                          className="text-xs text-primary font-medium cursor-pointer hover:underline" 
                          onClick={(e) => {
                            e.preventDefault();
                            navigate({ to: "/employees", search: { edit: relatedEmployeeId, tab: "personal" } as any });
                            markRead(n.id);
                          }}
                        >
                          View Employee Details →
                        </span>
                        {(user?.role === 'super_admin' || user?.permissions?.can_add_ctc === true) && (
                          <span 
                            className="text-xs text-blue-600 font-medium cursor-pointer hover:underline" 
                            onClick={(e) => {
                              e.preventDefault();
                              navigate({ to: "/employees", search: { edit: relatedEmployeeId, tab: "compensation" } as any });
                              markRead(n.id);
                            }}
                          >
                            Add CTC Details →
                          </span>
                        )}
                      </div>
                    ) : (
                      <span 
                        className="text-xs text-primary font-medium mt-2 block w-full cursor-pointer hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate({ to: "/payroll/run" });
                          markRead(n.id);
                        }}
                      >
                        View Payroll Run →
                      </span>
                    )}
                  </div>
                );
              })}
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
      <GlobalSearch />
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
