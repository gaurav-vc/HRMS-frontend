import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Check, X, ShieldAlert, ArrowLeft, CalendarDays } from "lucide-react";
import { leavesApi } from "@/api";

export const Route = createFileRoute("/leave-inbox")({
  ssr: false,
  errorComponent: ({ error }: { error: any }) => (
    <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
      <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-600 mb-2">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Leave Inbox Notice</h2>
      <p className="text-sm text-muted-foreground">
        {error?.message || "You do not have administrative approval access or no team members are assigned to report to you."}
      </p>
      <div className="pt-4 flex items-center justify-center gap-3">
        <Link to="/leave">
          <Button variant="default" className="gap-2">
            <CalendarDays className="h-4 w-4" /> Go to My Leave Requests
          </Button>
        </Link>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  ),
  loader: async () => {
    try {
      const [inboxRaw, typesRaw] = await Promise.all([
        leavesApi.getAll("inbox").catch(() => []),
        leavesApi.getTypes().catch(() => []),
      ]);
      const inboxLeaves = Array.isArray(inboxRaw) ? inboxRaw : (inboxRaw as any)?.results || [];
      const types = Array.isArray(typesRaw) ? typesRaw : (typesRaw as any)?.results || [];
      return { inboxLeaves, types };
    } catch {
      return { inboxLeaves: [], types: [] };
    }
  },
  component: LeaveInboxPage,
});

function LeaveInboxPage() {
  const { inboxLeaves, types } = Route.useLoaderData();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const counts = {
    pending: inboxLeaves.filter((r: any) => r.status === "Pending").length,
    approved: inboxLeaves.filter((r: any) => r.status === "Approved").length,
    rejected: inboxLeaves.filter((r: any) => r.status === "Rejected").length,
  };

  const act = async (id: string | number, s: "Approved" | "Rejected") => {
    try {
      if (s === "Approved")
        await leavesApi.approveLeave(id, { manager_comments: "Approved by manager" });
      else await leavesApi.rejectLeave(id, { manager_comments: "Rejected by manager" });
      toast.success(`Leave ${s.toLowerCase()}`);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${s.toLowerCase()} leave`);
    }
  };

  const inboxMapped = inboxLeaves
    .filter(
      (r: any) => !statusFilter || String(r.status).toLowerCase() === statusFilter.toLowerCase(),
    )
    .map((r: any) => ({
      ...r,
      from: r.startDate || r.start_date,
      to: r.endDate || r.end_date,
      days: r.totalDays || r.total_days,
      type: r.leaveTypeCode || r.leave_type_code,
      empName: r.employeeName || r.employee_name,
    }));

  const columns = [
    { key: "empName", header: "Employee", accessor: (r: any) => r.empName },
    {
      key: "type",
      header: "Type",
      render: (r: any) => {
        const isLop = r.type === "LOP" || r.leaveTypeCode === "LOP" || String(r.leaveTypeName || "").toLowerCase().includes("loss of pay");
        return (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={isLop ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400 font-semibold" : ""}
            >
              {r.type}
            </Badge>
            {isLop && (
              <span className="text-[10px] text-amber-600 font-medium bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200">
                Unpaid (Salary Cut)
              </span>
            )}
          </div>
        );
      },
    },
    { key: "from", header: "From", accessor: (r: any) => r.from, sortable: true },
    { key: "to", header: "To", accessor: (r: any) => r.to },
    { key: "days", header: "Days", accessor: (r: any) => r.days },
    { key: "reason", header: "Reason", accessor: (r: any) => r.reason },
    {
      key: "status",
      header: "Status",
      render: (r: any) => (
        <Badge
          className={
            r.status === "Approved"
              ? "bg-success text-success-foreground"
              : r.status === "Rejected"
                ? "bg-destructive text-destructive-foreground"
                : "bg-warning text-warning-foreground"
          }
        >
          {r.status}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Leave Inbox"
        description="Review and manage leave approvals for your team."
      />

      {inboxLeaves.length === 0 && (
        <div className="mt-4 p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <MessageSquare className="h-4 w-4 text-primary shrink-0" />
            <span>
              You do not have any pending leave approval requests from reportees. Only leave applications submitted by team members who report to you appear in this inbox.
            </span>
          </div>
          <Link to="/leave">
            <Button variant="outline" size="sm" className="text-xs h-8 shrink-0">
              Go to My Leave Requests
            </Button>
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <div
          onClick={() => setStatusFilter(statusFilter === "Pending" ? null : "Pending")}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard
            label="Pending Review"
            value={String(counts.pending)}
            tone="warning"
            icon={MessageSquare}
          />
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === "Approved" ? null : "Approved")}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard label="Approved" value={String(counts.approved)} tone="success" icon={Check} />
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === "Rejected" ? null : "Rejected")}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard label="Rejected" value={String(counts.rejected)} tone="info" icon={X} />
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm mt-6">
        <DataTable
          rows={inboxMapped}
          rowKey={(r: any) => r.id}
          searchKeys={[(r: any) => r.empName, "reason"]}
          filename="leave_inbox.csv"
          filters={[
            {
              label: "Status",
              key: "status",
              options: ["Pending", "Approved", "Rejected"].map((s) => ({ value: s, label: s })),
              predicate: (r: any, v: any) =>
                String(r.status).toLowerCase() === String(v).toLowerCase(),
            },
            {
              label: "Type",
              key: "type",
              options: types.map((t: any) => ({ value: t.code, label: t.name })),
              predicate: (r: any, v: any) =>
                String(r.type).toLowerCase() === String(v).toLowerCase(),
            },
          ]}
          columns={columns}
          actions={(r: any) =>
            String(r.status).toLowerCase() === "pending" ? (
              <div className="flex justify-end gap-3 font-medium">
                <button
                  className="text-emerald-600 hover:text-emerald-700"
                  onClick={() => act(r.id, "Approved")}
                >
                  Approve
                </button>
                <button
                  className="text-red-600 hover:text-red-700"
                  onClick={() => act(r.id, "Rejected")}
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="flex justify-end text-sm text-muted-foreground italic">No action</div>
            )
          }
        />
      </div>
    </>
  );
}
