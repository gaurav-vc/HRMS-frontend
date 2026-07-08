import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Building2, Users, Briefcase, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
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

  const stats = rawData?.super_admin || {
    totalRevenue: 0,
    activeSites: 0,
    totalUsers: 0,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Rs. {stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-orange-100 bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Sites</CardTitle>
            <div className="p-2 bg-orange-100 rounded-full">
              <Building2 className="w-4 h-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.activeSites}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-green-100 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
            <div className="p-2 bg-green-100 rounded-full">
              <Users className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-purple-100 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Company</CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
              <Briefcase className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalCompany}</div>
          </CardContent>
        </Card>
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
                  <Line type="monotone" dataKey="acmeCorp" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="test" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="tcs" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
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
