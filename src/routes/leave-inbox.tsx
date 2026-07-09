import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { leavesApi } from "@/api";

export const Route = createFileRoute("/leave-inbox")({ 
  loader: async () => {
    const [inboxRaw, typesRaw] = await Promise.all([
      leavesApi.getAll('inbox'),
      leavesApi.getTypes(),
    ]);
    const inboxLeaves = Array.isArray(inboxRaw) ? inboxRaw : (inboxRaw as any)?.results || [];
    const types = Array.isArray(typesRaw) ? typesRaw : (typesRaw as any)?.results || [];
    return { inboxLeaves, types };
  },
  component: LeaveInboxPage 
});

function LeaveInboxPage() {
  const { inboxLeaves, types } = Route.useLoaderData();
  const router = useRouter();

  const act = async (id: string | number, s: "Approved" | "Rejected") => { 
    try {
      if (s === "Approved") await leavesApi.approveLeave(id, { manager_comments: "Approved by manager" });
      else await leavesApi.rejectLeave(id, { manager_comments: "Rejected by manager" });
      toast.success(`Leave ${s.toLowerCase()}`); 
      router.invalidate();
    } catch(err: any) {
      toast.error(err.message || `Failed to ${s.toLowerCase()} leave`);
    }
  };

  const inboxMapped = inboxLeaves.map((r: any) => ({
    ...r,
    from: r.startDate || r.start_date,
    to: r.endDate || r.end_date,
    days: r.totalDays || r.total_days,
    type: r.leaveTypeCode || r.leave_type_code,
    empName: r.employeeName || r.employee_name
  }));

  const columns = [
    { key: "empName", header: "Employee", accessor: (r: any) => r.empName },
    { key: "type", header: "Type", render: (r: any) => <Badge variant="outline">{r.type}</Badge> },
    { key: "from", header: "From", accessor: (r: any) => r.from, sortable: true },
    { key: "to", header: "To", accessor: (r: any) => r.to },
    { key: "days", header: "Days", accessor: (r: any) => r.days },
    { key: "reason", header: "Reason", accessor: (r: any) => r.reason },
    { key: "status", header: "Status", render: (r: any) => <Badge className={r.status === "Approved" ? "bg-success text-success-foreground" : r.status === "Rejected" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}>{r.status}</Badge> },
  ];

  return (
    <>
      <PageHeader 
        title="Leave Inbox" 
        description="Review and manage leave approvals for your team." 
      />
      
      <div className="bg-white border rounded-lg shadow-sm mt-6">
        <DataTable rows={inboxMapped} rowKey={(r: any) => r.id} searchKeys={[(r: any) => r.empName, "reason"]} filename="leave_inbox.csv"
          filters={[
            { label: "Status", key: "status", options: ["Pending","Approved","Rejected"].map(s => ({ value: s, label: s })), predicate: (r: any, v: any) => r.status === v },
            { label: "Type", key: "type", options: types.map((t: any) => ({ value: t.code, label: t.name })), predicate: (r: any, v: any) => r.type === v },
          ]}
          columns={columns}
          actions={(r: any) => r.status === "Pending" ? <div className="flex justify-end gap-3 font-medium">
            <button className="text-emerald-600 hover:text-emerald-700" onClick={() => act(r.id, "Approved")}>Approve</button>
            <button className="text-red-600 hover:text-red-700" onClick={() => act(r.id, "Rejected")}>Reject</button>
          </div> : <span className="text-xs text-muted-foreground">—</span>}
        />
      </div>
    </>
  );
}
