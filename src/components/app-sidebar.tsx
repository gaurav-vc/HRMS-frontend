import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, GitBranch, MapPin, Users2, Briefcase, UserSquare2,
  CalendarCheck2, QrCode, ScanFace, Navigation, ClipboardList, CalendarDays,
  Wallet, Sliders, PlayCircle, ReceiptText, FileSpreadsheet, HandCoins, BadgeDollarSign,
  Settings, FileBarChart2, Clock, CalendarRange, Network, Palmtree, Calendar,
  FileText, LayoutTemplate
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/mock-data";

interface Item { title: string; url: string; icon: React.ComponentType<{ className?: string }>; }
interface Group { label: string; items: Item[]; }

const NAV: Group[] = [
  { label: "Overview", items: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
  ]},
  { label: "Organisation", items: [
    { title: "Entities", url: "/entities", icon: Building2 },
    { title: "Branches", url: "/branches", icon: GitBranch },
    { title: "Sites", url: "/sites", icon: MapPin },
    { title: "Departments", url: "/departments", icon: Users2 },
    { title: "Designations", url: "/designations", icon: Briefcase },
  ]},
  { label: "People", items: [
    { title: "Employees", url: "/employees", icon: UserSquare2 },
    { title: "My Calendar", url: "/my-calendar", icon: CalendarDays },
    { title: "Offer Letters", url: "/offer-letters", icon: FileText },
    { title: "Offer Templates", url: "/offer-templates", icon: LayoutTemplate },
  ]},
  { label: "Attendance", items: [
    { title: "Attendance", url: "/attendance", icon: CalendarCheck2 },
    { title: "Shift Definitions", url: "/attendance/shifts", icon: Clock },
    { title: "Weekly Roster", url: "/attendance/roster", icon: CalendarRange },
    { title: "QR Check-in", url: "/attendance/qr", icon: QrCode },
    { title: "Face Verification", url: "/attendance/face", icon: ScanFace },
    { title: "GPS Capture", url: "/attendance/gps", icon: Navigation },
    { title: "Regularization", url: "/attendance/regularize", icon: ClipboardList },
  ]},
  { label: "Leave", items: [
    { title: "Leave Requests", url: "/leave", icon: CalendarDays },
  ]},
  { label: "Holiday Planner", items: [
    { title: "Holiday Planner", url: "/holidays", icon: Palmtree },
    { title: "Calendar", url: "/holidays/calendar", icon: Calendar },
  ]},
  { label: "Payroll", items: [
    { title: "Payroll Overview", url: "/payroll", icon: Wallet },
    { title: "Salary Structure", url: "/payroll/structure", icon: Sliders },
    { title: "Run Payroll", url: "/payroll/run", icon: PlayCircle },
    { title: "Salary Slips", url: "/payroll/slips", icon: ReceiptText },
    { title: "Compliance", url: "/payroll/compliance", icon: FileSpreadsheet },
    { title: "Loans & Advances", url: "/loans", icon: HandCoins },
    { title: "Reimbursements", url: "/reimbursements", icon: BadgeDollarSign },
  ]},
  { label: "FORM 16", items: [
    { title: "Form 16 Management", url: "/form-16/management", icon: FileText },
    { title: "My Form 16", url: "/form-16/my", icon: FileText },
  ]},
  { label: "Insights", items: [
    { title: "Organization Tree", url: "/insights/org-tree", icon: Network },
    { title: "Reports", url: "/reports", icon: FileBarChart2 },
    { title: "Settings", url: "/settings", icon: Settings },
  ]}
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { user } = useAuth();
  const role = user?.role ?? "employee";

  const can = (it: Item) => {
    // 1. If the user is Super Admin, they see everything
    if (role === "super_admin") return true;
    
    // 2. Strict check: only show if explicitly granted view permission
    if (user?.permissions && user.permissions[it.title]) {
      const v = user.permissions[it.title].view;
      return v === true || v === 'self' || v === 'selected_entities';
    }
    
    // Default to hide if no explicit permission is found
    return false;
  };
  const isActive = (url: string) => url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary grid place-items-center text-sidebar-primary-foreground font-bold">P</div>
          {!collapsed && <div className="leading-tight"><div className="text-sm font-semibold text-sidebar-foreground">PeoplePulse</div><div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">HRMS & Payroll</div></div>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {NAV.map(group => {
          const items = group.items.filter(can);
          if (!items.length) return null;
          return (
            <SidebarGroup key={group.label}>
              {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map(item => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
