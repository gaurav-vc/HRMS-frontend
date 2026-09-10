import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Plus, CalendarIcon, AlertCircle } from "lucide-react";
import { format, differenceInDays, parseISO, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { leavesApi, employeesApi, holidaysApi } from "@/api";

export const Route = createFileRoute("/leave")({
  loader: async () => {
    const [leavesRaw, typesRaw, balancesRaw, employeesRaw, holidaysRaw, configRaw] = await Promise.all([
      leavesApi.getAll("my_leaves"),
      leavesApi.getTypes(),
      leavesApi.getLeaveBalances(),
      employeesApi.getAll(),
      holidaysApi.getAll(),
      leavesApi.getConfig().catch(() => ({ is_saturday_working: false }))
    ]);
    const leaves = Array.isArray(leavesRaw) ? leavesRaw : (leavesRaw as any)?.results || [];
    const types = Array.isArray(typesRaw) ? typesRaw : (typesRaw as any)?.results || [];
    const balances = Array.isArray(balancesRaw) ? balancesRaw : (balancesRaw as any)?.results || [];
    const employees = Array.isArray(employeesRaw)
      ? employeesRaw
      : (employeesRaw as any)?.results || [];
    const holidays = Array.isArray(holidaysRaw) ? holidaysRaw : (holidaysRaw as any)?.results || [];
    const config = configRaw || { is_saturday_working: false };
    return { leaves, types, balances, employees, holidays, config };
  },
  component: LeavePage,
});

function LeavePage() {
  const { leaves, types, balances, employees, holidays, config } = Route.useLoaderData();
  const router = useRouter();
  
  const isSatWorking = config.isSaturdayWorking === true || config.is_saturday_working === true || config.isSaturdayWorking === "true" || config.is_saturday_working === "true" || config.isSaturdayWorking === "True" || config.is_saturday_working === "True";
  
  const [createOpen, setCreateOpen] = useState(false);
  const [balancesOpen, setBalancesOpen] = useState(false);
  const [form, setForm] = useState({
    employee: "",
    leave_type: "",
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    total_days: "",
    reason: "",
  });

  const calculateDays = (start?: Date, end?: Date) => {
    if (!start || !end || start > end) return "";
    let days = 0;
    let curr = new Date(start);
    const holidayDates = holidays.map((h: any) => h.date);
    
    while (curr <= end) {
      const day = curr.getDay();
      const isWorkingDay = day !== 0 && (day !== 6 || isSatWorking);
      const dateStr = format(curr, "yyyy-MM-dd");
      
      if (isWorkingDay && !holidayDates.includes(dateStr)) {
        days++;
      }
      curr.setDate(curr.getDate() + 1);
    }
    return days.toString();
  };

  const handleDateChange = (field: "start_date" | "end_date", date?: Date) => {
    const newForm = { ...form, [field]: date };
    if (newForm.start_date && newForm.end_date) {
      newForm.total_days = calculateDays(newForm.start_date, newForm.end_date);
    }
    setForm(newForm);
  };

  const isHolidayOrDisabled = (date: Date) => {
    const day = date.getDay();
    if (day === 0) return true; // Sunday
    if (day === 6 && !isSatWorking) return true; // Saturday if off
    const dateStr = format(date, "yyyy-MM-dd");
    return holidays.some((h: any) => h.date === dateStr);
  };

  const submitNew = async () => {
    if (!form.employee || !form.leave_type || !form.start_date || !form.end_date) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      await leavesApi.createLeave({
        ...form,
        start_date: format(form.start_date, "yyyy-MM-dd"),
        end_date: format(form.end_date, "yyyy-MM-dd"),
        total_days: form.total_days
      });
      toast.success("Leave requested successfully");
      setCreateOpen(false);
      setForm({
        employee: "",
        leave_type: "",
        start_date: undefined,
        end_date: undefined,
        total_days: "",
        reason: "",
      });
      router.invalidate();
    } catch (err: any) {
      toast.error("Failed to submit leave. It may overlap or exceed balance.");
    }
  };

  const mappedLeaves = leaves.map((r: any) => ({
    ...r,
    from: r.startDate || r.start_date,
    to: r.endDate || r.end_date,
    days: r.totalDays || r.total_days,
    type: r.leaveTypeCode || r.leave_type_code,
    empName: r.employeeName || r.employee_name,
  }));

  return (
    <>
      <PageHeader
        title="My Leave Requests"
        description="Track your requested leaves and their approval status."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBalancesOpen(true)}>
              View Balances
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Apply for leave
            </Button>
          </div>
        }
      />

      <div className="bg-white border rounded-lg shadow-sm mt-6">
        <DataTable
          rows={mappedLeaves}
          rowKey={(r: any) => r.id}
          searchKeys={[(r: any) => r.empName, "reason"]}
          filename="my_leaves.csv"
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
          columns={[
            { key: "empName", header: "Employee", accessor: (r: any) => r.empName },
            {
              key: "type",
              header: "Type",
              render: (r: any) => <Badge variant="outline">{r.type}</Badge>,
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
          ]}
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Submit a new leave request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <Select
                value={form.employee}
                onValueChange={(v) => setForm({ ...form, employee: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type</Label>
              <Select
                value={form.leave_type}
                onValueChange={(v) => setForm({ ...form, leave_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {holidays.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-md flex gap-2 items-start text-sm text-blue-800">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold mb-1">Upcoming Holidays</div>
                  <ul className="list-disc pl-4 space-y-1">
                    {holidays.slice(0, 3).map((h: any) => (
                      <li key={h.id}>{h.name} ({format(parseISO(h.date), "MMM d, yyyy")})</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.start_date ? format(form.start_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.start_date}
                      onSelect={(date) => handleDateChange("start_date", date)}
                      disabled={isHolidayOrDisabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !form.end_date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.end_date ? format(form.end_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.end_date}
                      onSelect={(date) => handleDateChange("end_date", date)}
                      disabled={(date) => isHolidayOrDisabled(date) || (form.start_date ? date < form.start_date : false)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label>Total Days (Override for half-days)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.total_days}
                  onChange={(e) => setForm({ ...form, total_days: e.target.value })}
                  placeholder="Leave blank to auto-calculate"
                />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Medical, vacation, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNew}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={balancesOpen} onOpenChange={setBalancesOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Leave Balances</DialogTitle>
            <DialogDescription>Current leave allocation and utilization.</DialogDescription>
          </DialogHeader>

          <DataTable
            rows={balances}
            rowKey={(r: any) => r.id}
            searchKeys={[(r: any) => r.employeeName]}
            filename="balances.csv"
            columns={[
              {
                key: "employeeName",
                header: "Employee",
                accessor: (r: any) => r.employeeName || r.employee_name || "—",
              },
              {
                key: "leaveTypeCode",
                header: "Leave Type",
                accessor: (r: any) => r.leaveTypeCode || r.leave_type_code || "—",
              },
              {
                key: "allocatedDays",
                header: "Allocated",
                accessor: (r: any) => r.allocatedDays || r.allocated_days || 0,
              },
              {
                key: "usedDays",
                header: "Used",
                accessor: (r: any) => r.usedDays || r.used_days || 0,
              },
              {
                key: "remainingDays",
                header: "Remaining",
                accessor: (r: any) => r.remainingDays || r.remaining_days || 0,
              },
              {
                key: "status",
                header: "Status",
                accessor: (r: any) => {
                  const allocated = Number(r.allocatedDays || r.allocated_days) || 0;
                  const rem = Number(r.remainingDays || r.remaining_days) || 0;
                  if (allocated === 0) return "Not Applicable";
                  return rem < 2 ? "Low Balance" : "Healthy";
                },
                render: (r: any) => {
                  const allocated = Number(r.allocatedDays || r.allocated_days) || 0;
                  const rem = Number(r.remainingDays || r.remaining_days) || 0;
                  
                  if (allocated === 0) {
                    return <Badge variant="secondary" className="bg-slate-100 text-slate-500">Not Applicable</Badge>;
                  }
                  
                  return (
                    <Badge variant={rem < 2 ? "destructive" : "outline"}>
                      {rem < 2 ? "Low Balance" : "Healthy"}
                    </Badge>
                  );
                },
              },
            ]}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
