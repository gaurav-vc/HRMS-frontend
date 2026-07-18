import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, CalendarCheck2, CalendarDays, Wallet, Menu, Network, MapPin, CreditCard } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";

export function MobileNav() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { toggleSidebar } = useSidebar();
  const { user } = useAuth();

  const isSuperAdminMode = user?.username === "Vibe_admin" || 
    ((user?.role === "super_admin" || user?.is_superuser) && (pathname.startsWith("/superadmin") || pathname.startsWith("/organizations") || pathname.startsWith("/billing")));

  const navItems = isSuperAdminMode ? [
    { title: "Dashboard", url: "/superadmin-dashboard", icon: LayoutDashboard },
    { title: "Orgs", url: "/organizations", icon: Network },
    { title: "Sites", url: "/superadmin-sites", icon: MapPin },
    { title: "Billing", url: "/billing-payments", icon: CreditCard },
  ] : [
    { title: "Home", url: "/", icon: LayoutDashboard },
    { title: "Attendance", url: "/attendance", icon: CalendarCheck2 },
    { title: "Leave", url: "/leave", icon: CalendarDays },
    { title: "Payroll", url: "/payroll", icon: Wallet },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border flex items-center justify-around h-16 pb-safe">
      {navItems.map((item) => {
        const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
        return (
          <Link
            key={item.url}
            to={item.url}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <item.icon className={`h-5 w-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
            <span className="text-[10px] font-medium">{item.title}</span>
          </Link>
        );
      })}
      
      {/* Menu Button to trigger sidebar sheet */}
      <button
        onClick={() => toggleSidebar()}
        className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground hover:text-primary transition-colors"
      >
        <Menu className="h-5 w-5" />
        <span className="text-[10px] font-medium">Menu</span>
      </button>
    </div>
  );
}
