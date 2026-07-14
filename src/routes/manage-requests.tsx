import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Clock, CheckCircle2, UserMinus, TrendingUp, ShieldCheck, FileText, CalendarCheck, UserX } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { employeesApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manage-requests")({
  component: ManageRequestsPage,
});

function ManageRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [exitsData, empsData] = await Promise.all([
        employeesApi.getExits(),
        employeesApi.getAll()
      ]);
      setRequests(exitsData);
      
      const empMap: Record<number, any> = {};
      empsData.forEach((emp: any) => {
        empMap[emp.id] = emp;
      });
      setEmployees(empMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setLoading(true);
      await employeesApi.updateExit(id, { status: 'Approved', manager_approved: true, hr_cleared: true });
      toast.success("Request approved successfully");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve request");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setLoading(true);
      await employeesApi.updateExit(id, { status: 'Rejected' });
      toast.success("Request rejected");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const openRequests = requests.filter(r => r.status === 'Pending').length;
  const approvedRequests = requests.filter(r => r.status === 'Approved').length;
  const deactivatedRequests = requests.filter(r => r.status === 'Deactivated').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-sm font-semibold text-[#1a4cd2] uppercase tracking-wider mb-1">Employee Portal</h1>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Manage Requests</h2>
          <p className="text-slate-500">
            Manage separation requests, approvals, and last working day!
          </p>
        </div>
        <Link to="/employee-separation">
          <Button className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6">
            <FileText className="w-4 h-4 mr-2" />
            Raise a request
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          label="OPEN REQUESTS" 
          value={openRequests.toString()} 
          icon={<Clock className="w-5 h-5 text-slate-600" />} 
        />
        <StatCard 
          label="APPROVED" 
          value={approvedRequests.toString()} 
          icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />} 
        />
        <StatCard 
          label="DEACTIVATED" 
          value={deactivatedRequests.toString()} 
          icon={<UserMinus className="w-5 h-5 text-slate-600" />} 
        />
      </div>

      <div className="grid grid-cols-1 gap-8 items-start">
        {/* Left List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg text-slate-900">Recent activities</h3>
            <Button variant="ghost" className="text-sm text-slate-500">View all &rarr;</Button>
          </div>

          <div className="space-y-6">
            {requests.length === 0 ? (
              <div className="m-auto text-center py-12 bg-slate-50 border border-dashed rounded-xl w-full">
                <Clock className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-slate-900 mb-2">No requests yet</h4>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">Submitted separation requests will appear here for HR review.</p>
              </div>
            ) : (
              requests.map(req => {
                const emp = employees[req.employee];
                const initials = emp ? `${emp.firstName?.[0] || emp.first_name?.[0] || ''}${emp.lastName?.[0] || emp.last_name?.[0] || ''}`.toUpperCase() : '??';
                const fullName = emp ? `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() : `Employee #${req.employee}`;
                
                let activityText = "";
                if (req.status === 'Pending') activityText = "raised a separation request";
                if (req.status === 'Approved') activityText = "was approved by HR";
                if (req.status === 'Deactivated') activityText = "reached last working day";
                if (req.status === 'Rejected') activityText = "request was rejected";

                return (
                  <div key={req.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-semibold text-sm">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm text-slate-900">
                          <span className="font-semibold">{fullName}</span> {activityText}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          LWD: {req.last_working_day} • Reason: {req.reason || req.exit_type}
                        </p>
                        {req.status === 'Pending' && (user?.role === 'super_admin' || user?.role === 'group_hr' || user?.role === 'entity_hr') && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => handleApprove(req.id)} disabled={loading} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(req.id)} disabled={loading} className="h-7 text-xs text-red-600 hover:bg-red-50">Reject</Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      "uppercase text-[10px] font-bold px-2 py-0.5 rounded-full border-transparent whitespace-nowrap",
                      req.status === 'Pending' && "bg-blue-100 text-blue-700",
                      req.status === 'Approved' && "bg-emerald-100 text-emerald-700",
                      req.status === 'Rejected' && "bg-red-100 text-red-700",
                      req.status === 'Deactivated' && "bg-slate-100 text-slate-700",
                    )}>
                      {req.status}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="p-2 bg-slate-50 rounded-full">
          {icon}
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-4xl font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}
