import { createFileRoute, Link, Navigate, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { organizationsApi } from "@/api";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/billing-payments")({
  component: BillingPaymentsPage,
});

function BillingPaymentsPage() {
  const { user } = useAuth();
  const matchRoute = useMatchRoute();
  
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => organizationsApi.getAll(),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const isDetail = matchRoute({ to: '/billing-payments/$orgId', fuzzy: true });

  if (user?.username !== "Vibe_admin") {
    return <Navigate to="/" />;
  }

  if (isDetail) {
    return <Outlet />;
  }

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading billing data...</div>;

  const organizations = rawData || [];
  
  const filteredRows = organizations.filter((org: any) => 
    (org.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.company_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-[#f9fafb] min-h-screen">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Billing & Payments</h1>
        <p className="text-[15px] text-slate-500 mt-1">Manage subscriptions, invoices and organization billing</p>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search organization billing..." 
            className="pl-9 w-full md:w-[400px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <DataTable
          rows={filteredRows}
          rowKey={(r: any) => r.id}
          columns={[
            { 
              key: "name", 
              header: "Organization Name", 
              render: (r: any) => (
                <div>
                  <div className="font-semibold text-slate-900">{r.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                  </div>
                </div>
              ) 
            },
            { 
              key: "company", 
              header: "Company", 
              render: (r: any) => <span className="text-muted-foreground">{r.companyName || "—"}</span> 
            },
            { 
              key: "plan", 
              header: "Current Plan", 
              render: (r: any) => <span>{r.solutionType || "Standard Plan"}</span> 
            },
            { 
              key: "amount", 
              header: "Billing Amount", 
              render: (r: any) => <span>${Number(r.rateOfBilling || 0).toFixed(2)}</span> 
            },
            { 
              key: "next_date", 
              header: "Next Billing Date", 
              render: (r: any) => <span className="text-muted-foreground">{r.billingDate || "—"}</span> 
            },
            { 
              key: "due", 
              header: "Current Due", 
              render: (r: any) => <span>${Number(r.currentDue || 0).toFixed(2)}</span> 
            },
            { 
              key: "status", 
              header: "Status", 
              render: (r: any) => (
                <Badge variant="outline" className={r.paymentStatus === 'Paid' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-orange-600 border-orange-200 bg-orange-50'}>
                  {r.paymentStatus || 'Paid'}
                </Badge>
              )
            },
          ]}
          actions={(r: any) => (
            <div className="flex gap-2 justify-end">
                <Link to="/billing-payments/$orgId" params={{ orgId: r.id.toString() }} className="text-[#1a4cd2] text-sm font-medium hover:underline hover:text-[#1641b4] px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors">
                  View
                </Link>
            </div>
          )}
        />
      </div>
    </div>
  );
}
