import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Building2, Users, Briefcase, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/superadmin-dashboard")({
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const { user } = useAuth();
  if (user?.username !== "Vibe_admin") {
    return <Navigate to="/" />;
  }

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["superadmin_dashboard_stats"],
    queryFn: () => api.getDashboardStats(),
  });

  const stats = rawData?.superAdmin || rawData?.super_admin || {
    totalRevenue: 0,
    activeSites: 0,
    totalCompany: 0,
    moduleWiseRevenue: [],
    companyWiseSite: [],
    moduleWiseSite: [],
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-[15px] text-slate-500 mt-1">Optimize revenue and track sales performance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/billing-payments" className="block outline-none">
          <Card className="shadow-sm border-slate-200 bg-white hover:shadow-md hover:border-slate-300 transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Total Revenue</CardTitle>
              <div className="p-2 bg-blue-50 rounded-md">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-800">Rs. {stats.totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/superadmin-sites" className="block outline-none">
          <Card className="shadow-sm border-slate-200 bg-white hover:shadow-md hover:border-slate-300 transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Active Sites</CardTitle>
              <div className="p-2 bg-emerald-50 rounded-md">
                <Building2 className="w-4 h-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-800">{stats.activeSites}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/organizations" className="block outline-none">
          <Card className="shadow-sm border-slate-200 bg-white hover:shadow-md hover:border-slate-300 transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Total Organizations</CardTitle>
              <div className="p-2 bg-indigo-50 rounded-md">
                <Briefcase className="w-4 h-4 text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-800">{stats.totalCompany}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm h-[400px]">
            <CardHeader>
              <CardTitle>Company Wise Site</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.companyWiseSite}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip />
                  <Legend />
                  {(stats.topOrgs || []).map((orgName: string, index: number) => {
                    const colors = ["#4f46e5", "#10b981", "#f59e0b"];
                    return (
                      <Line 
                        key={orgName}
                        type="monotone" 
                        dataKey={orgName} 
                        stroke={colors[index % colors.length]} 
                        strokeWidth={2} 
                        dot={{ r: 4 }}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm h-[400px]">
            <CardHeader>
              <CardTitle>Module Wise Site</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.moduleWiseSite}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip />
                  <Bar dataKey="site" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-900 text-white rounded-t-lg">
              <CardTitle className="text-lg">Today's Upsale</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[150px]">
               <Activity className="w-12 h-12 text-slate-200 mb-2" />
               No data found
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Module Wise Revenue</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {stats.moduleWiseRevenue.map((item: any, idx: number) => (
                  <li key={idx} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                    <span className="font-medium text-slate-700 capitalize">{item.module}</span>
                    <span className="text-slate-900 font-semibold">Rs. {item.revenue}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
