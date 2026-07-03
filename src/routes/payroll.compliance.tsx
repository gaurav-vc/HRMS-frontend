import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Calendar, ShieldCheck, ArrowUpRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtINR } from "@/lib/mock-data";

import { payrollApi } from "@/api";

export const Route = createFileRoute("/payroll/compliance")({ 
  loader: async () => {
    const reports = await payrollApi.getComplianceReports();
    return { reports };
  },
  component: CompliancePage 
});

const TABS = ["Provident Fund", "ESI", "Professional Tax", "TDS"];
const REGISTRATIONS: Record<string, string> = {
  "Provident Fund": "DLCPM00123456",
  "ESI": "53000123450000123",
  "Professional Tax": "PT-2938475920",
  "TDS": "BLRA12345E"
};

function CompliancePage() {
  const { reports } = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState("Provident Fund");

  const filtered = reports.filter((r: any) => r.category === activeTab);
  
  const pending = filtered.filter((r: any) => r.status !== "Filed");
  const filed = filtered.filter((r: any) => r.status === "Filed");

  const currentLiability = pending.reduce((acc: number, r: any) => acc + Number(r.amount), 0);
  
  // Basic mock calculations for UI metrics
  const nextDue = pending.length > 0 ? new Date(Math.min(...pending.map((r: any) => new Date(r.due).getTime()))) : null;
  const daysRemaining = nextDue ? Math.ceil((nextDue.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;
  
  const lastFiled = filed.length > 0 ? [...filed].sort((a: any, b: any) => new Date(b.filed_on).getTime() - new Date(a.filed_on).getTime())[0] : null;

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">STATUTORY FILINGS</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Compliance</h1>
          <p className="text-sm text-slate-500 mt-1">Track PF, ESI, Professional Tax and TDS liabilities, generate returns and download challans.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-700 bg-white shadow-sm border-slate-200">
            <Calendar className="h-4 w-4 mr-2" /> Calendar
          </Button>
          <Button className="bg-[#0b1b3d] text-white hover:bg-[#0b1b3d]/90 shadow-sm">
            <ShieldCheck className="h-4 w-4 mr-2" /> Generate Return
          </Button>
        </div>
      </div>

      {/* Compliance Score Banner */}
      <Card className="bg-[#f0fdf4] border-[#bbf7d0] p-4 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-[#dcfce7] p-2.5 rounded-xl">
            <ShieldCheck className="h-6 w-6 text-[#166534]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-slate-800">Compliance score • 98%</span>
              <Badge className="bg-[#dcfce7] text-[#166534] hover:bg-[#dcfce7] shadow-none border-0 text-xs">Healthy</Badge>
            </div>
            <p className="text-sm text-[#166534]">All filings up to October are submitted. Next critical due date is 15 Dec (PF & ESI).</p>
          </div>
        </div>
        <Button variant="ghost" className="text-[#166534] hover:text-[#14532d] hover:bg-[#dcfce7] text-sm font-medium">
          View timeline <ArrowUpRight className="h-4 w-4 ml-1" />
        </Button>
      </Card>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent h-auto p-0 space-x-2">
            {TABS.map(t => (
              <TabsTrigger 
                key={t} 
                value={t}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${activeTab === t 
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 data-[state=active]:bg-white data-[state=active]:shadow-sm"}`}
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Metrics Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 shadow-sm border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">CURRENT LIABILITY</div>
          <div className="text-3xl font-bold text-slate-900">{fmtINR(currentLiability)}</div>
          <div className="text-xs text-slate-500 mt-2">November cycle</div>
        </Card>

        <Card className="p-6 shadow-sm border-[#fde68a] bg-[#fefce8]">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> DUE
          </div>
          <div className="text-3xl font-bold text-amber-900">
            {nextDue ? nextDue.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'None'}
          </div>
          <div className="text-xs text-amber-700 mt-2">{daysRemaining > 0 ? `${daysRemaining} days remaining` : 'On track'}</div>
        </Card>

        <Card className="p-6 shadow-sm border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">LAST FILED</div>
          <div className="text-3xl font-bold text-slate-900">{lastFiled ? lastFiled.period : '—'}</div>
          <div className="text-xs text-[#16a34a] mt-2">{lastFiled ? `On time · ${new Date(lastFiled.filed_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'No history'}</div>
        </Card>

        <Card className="p-6 shadow-sm border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">REGISTRATION</div>
          <div className="text-lg font-bold text-slate-900 mt-2 tracking-wide">{REGISTRATIONS[activeTab]}</div>
          <div className="text-xs text-blue-600 font-medium mt-3 cursor-pointer hover:underline">Edit details</div>
        </Card>
      </div>

      {/* Filing History Table */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
          <div>
            <h3 className="font-semibold text-lg text-slate-900">Filing history</h3>
            <p className="text-sm text-slate-500 mt-1">Last 12 months of {activeTab} filings</p>
          </div>
          <Button variant="outline" size="sm" className="bg-white border-slate-200 shadow-sm text-slate-700">Export CSV</Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">PERIOD</th>
                <th className="px-6 py-4">AMOUNT</th>
                <th className="px-6 py-4">CHALLAN / RECEIPT</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4">FILED ON</th>
                <th className="px-6 py-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No compliance history found for {activeTab}.
                  </td>
                </tr>
              ) : (
                [...filtered].sort((a: any, b: any) => new Date(b.due).getTime() - new Date(a.due).getTime()).map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{r.period}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{fmtINR(r.amount)}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{r.challan_number || '—'}</td>
                    <td className="px-6 py-4">
                      <Badge className={
                        r.status === "Filed" ? "bg-[#dcfce7] text-[#166534] hover:bg-[#dcfce7] shadow-none border-0" : 
                        r.status === "Pending" ? "bg-[#fef3c7] text-[#92400e] hover:bg-[#fef3c7] shadow-none border-0" : 
                        "bg-slate-100 text-slate-700 hover:bg-slate-100 shadow-none border-0"
                      }>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{r.filed_on ? new Date(r.filed_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" onClick={() => toast.success(`Downloaded ${r.period} challan`)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
