import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CalendarIcon, Send, RefreshCcw, Clock, UserMinus, CheckCircle2, XCircle, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

import { useAuth } from "@/lib/auth-context";
import { employeesApi } from "@/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/employee-separation")({
  component: SeparationRequestPage,
});

function SeparationRequestPage() {
  const { user } = useAuth();
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedEmp, setSelectedEmp] = useState<string>("");
  const [reason, setReason] = useState("");
  const [lwd, setLwd] = useState<Date>();
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      const [data, empsData] = await Promise.all([
        employeesApi.getExits(),
        employeesApi.getAll()
      ]);
      setEmployees(empsData);
      setAllRequests(data);
      
      if (!selectedEmp && user?.employee_id) {
          setSelectedEmp(String(user.employee_id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedEmp) {
      setRequests(allRequests.filter((r: any) => r.employee === parseInt(selectedEmp)));
    } else {
      setRequests([]);
    }
  }, [selectedEmp, allRequests]);

  const handleReset = () => {
    if (user?.role === 'super_admin' || user?.role === 'group_hr' || user?.role === 'entity_hr') {
        setSelectedEmp("");
    }
    setReason("");
    setLwd(undefined);
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!selectedEmp) {
      toast.error("Please select an employee.");
      return;
    }
    if (!reason || !lwd) {
      toast.error("Please provide a reason and select a Last Working Day.");
      return;
    }
    
    if (requests.some(r => r.employee === parseInt(selectedEmp) && (r.status === 'Pending' || r.status === 'Approved'))) {
      toast.error("This employee already has an active separation request.");
      return;
    }

    try {
      setLoading(true);

      let mappedExitType = "Resignation";
      if (reason.startsWith("Termination")) mappedExitType = "Termination";
      else if (reason.startsWith("Absconding")) mappedExitType = "Absconding";
      else if (reason.startsWith("Retirement")) mappedExitType = "Retirement";

      const combinedReason = notes ? `${reason} - ${notes}` : reason;

      await employeesApi.createExit({
        employee: parseInt(selectedEmp),
        exit_type: mappedExitType,
        reason: combinedReason,
        last_working_day: format(lwd, 'yyyy-MM-dd'),
      });
      toast.success("Separation request submitted successfully.");
      handleReset();
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("mx-auto", requests.length > 0 ? "max-w-6xl" : "max-w-3xl")}>
      <div className="mb-6 text-left">
        <h1 className="text-sm font-semibold text-[#1a4cd2] uppercase tracking-wider mb-1">Employee Portal</h1>
        <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Separation Request</h2>
        <p className="text-slate-500 max-w-2xl leading-relaxed text-sm">
          Submit your request for offboarding. Records are preserved — accounts are smoothly deactivated on the Last Working Day.
        </p>
      </div>

      <div className={cn(requests.length > 0 ? "flex flex-col lg:flex-row gap-8 items-start" : "")}>
        
        {/* Status Box (Right on Desktop, Top on Mobile) */}
        {requests.length > 0 && (
          <div className="w-full lg:w-[420px] xl:w-[450px] shrink-0 order-1 lg:order-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-[#1a4cd2]" />
              
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className={cn(
                  "p-3 rounded-xl",
                  [...requests].sort((a, b) => b.id - a.id)[0].status === 'Pending' && "bg-amber-50",
                  [...requests].sort((a, b) => b.id - a.id)[0].status === 'Approved' && "bg-emerald-50",
                  [...requests].sort((a, b) => b.id - a.id)[0].status === 'Rejected' && "bg-rose-50",
                  [...requests].sort((a, b) => b.id - a.id)[0].status === 'Deactivated' && "bg-slate-50",
                )}>
                  {[...requests].sort((a, b) => b.id - a.id)[0].status === 'Pending' && <Clock className="w-5 h-5 text-amber-600" />}
                  {[...requests].sort((a, b) => b.id - a.id)[0].status === 'Approved' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {[...requests].sort((a, b) => b.id - a.id)[0].status === 'Rejected' && <XCircle className="w-5 h-5 text-rose-600" />}
                  {[...requests].sort((a, b) => b.id - a.id)[0].status === 'Deactivated' && <UserMinus className="w-5 h-5 text-slate-600" />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-3">
                    Request {[...requests].sort((a, b) => b.id - a.id)[0].status}
                    <Badge variant="outline" className={cn(
                      "uppercase text-[10px] font-bold px-2 py-0.5 rounded-full border-transparent",
                      [...requests].sort((a, b) => b.id - a.id)[0].status === 'Pending' && "bg-amber-100 text-amber-700",
                      [...requests].sort((a, b) => b.id - a.id)[0].status === 'Approved' && "bg-emerald-100 text-emerald-700",
                      [...requests].sort((a, b) => b.id - a.id)[0].status === 'Rejected' && "bg-rose-100 text-rose-700",
                      [...requests].sort((a, b) => b.id - a.id)[0].status === 'Deactivated' && "bg-slate-100 text-slate-700",
                    )}>
                      {[...requests].sort((a, b) => b.id - a.id)[0].status}
                    </Badge>
                  </h3>
                  <p className="text-sm text-slate-500">
                    LWD: <span className="font-medium text-slate-700">{[...requests].sort((a, b) => b.id - a.id)[0].last_working_day}</span> • {[...requests].sort((a, b) => b.id - a.id)[0].reason || [...requests].sort((a, b) => b.id - a.id)[0].exit_type}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status Timeline</p>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 
                    Submitted
                  </div>
                  <div className="w-4 border-t-2 border-dashed border-slate-200"></div>
                  {[...requests].sort((a, b) => b.id - a.id)[0].status === 'Pending' ? (
                    <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                      <Clock className="w-4 h-4"/> 
                      Awaiting HR Review
                    </div>
                  ) : [...requests].sort((a, b) => b.id - a.id)[0].status === 'Rejected' ? (
                    <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                      <XCircle className="w-4 h-4"/> 
                      Rejected
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-4 h-4"/> 
                      Approved
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Area (Left on Desktop, Bottom on Mobile) */}
        <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10 relative overflow-hidden", requests.length > 0 ? "flex-1 order-2 lg:order-1 min-w-0" : "")}>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-[#1a4cd2]" />
          
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="p-3 bg-blue-50 rounded-xl">
              <UserMinus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">New Request</h3>
              <p className="text-sm text-slate-500">Please provide the required details below.</p>
            </div>
          </div>

          <div className="space-y-4">
            {user?.role === 'super_admin' || user?.role === 'group_hr' || user?.role === 'entity_hr' ? (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={selectedEmp} onValueChange={setSelectedEmp}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.firstName || emp.first_name} {emp.lastName || emp.last_name} (ID: {emp.code || emp.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input 
                    value={
                      employees.find(e => String(e.id) === selectedEmp) 
                        ? `${employees.find(e => String(e.id) === selectedEmp)?.firstName || employees.find(e => String(e.id) === selectedEmp)?.first_name || ''} ${employees.find(e => String(e.id) === selectedEmp)?.lastName || employees.find(e => String(e.id) === selectedEmp)?.last_name || ''}`.trim() 
                        : 'Loading...'
                    } 
                    readOnly 
                    className="bg-slate-50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employee ID</Label>
                  <Input value={selectedEmp || ''} readOnly className="bg-slate-50" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="Resignation - Better Career Opportunity">Resignation - Better Career Opportunity</SelectItem>
                  <SelectItem value="Resignation - Higher Education">Resignation - Higher Education</SelectItem>
                  <SelectItem value="Resignation - Relocation">Resignation - Relocation</SelectItem>
                  <SelectItem value="Resignation - Health Reasons">Resignation - Health Reasons</SelectItem>
                  <SelectItem value="Resignation - Personal / Family Reasons">Resignation - Personal / Family Reasons</SelectItem>
                  <SelectItem value="Resignation - Career Change">Resignation - Career Change</SelectItem>
                  <SelectItem value="Resignation - Compensation Dissatisfaction">Resignation - Compensation Dissatisfaction</SelectItem>
                  <SelectItem value="Resignation - Work Environment / Culture">Resignation - Work Environment / Culture</SelectItem>
                  <SelectItem value="Retirement">Retirement</SelectItem>
                  <SelectItem value="Termination - Performance">Termination - Performance</SelectItem>
                  <SelectItem value="Termination - Disciplinary Action">Termination - Disciplinary Action</SelectItem>
                  <SelectItem value="Termination - Violation of Company Policy">Termination - Violation of Company Policy</SelectItem>
                  <SelectItem value="Termination - Restructuring / Downsizing">Termination - Restructuring / Downsizing</SelectItem>
                  <SelectItem value="End of Contract / Temporary Assignment">End of Contract / Temporary Assignment</SelectItem>
                  <SelectItem value="Absconding - Job Abandonment">Absconding - Job Abandonment</SelectItem>
                  <SelectItem value="Involuntary - Prolonged Absence">Involuntary - Prolonged Absence</SelectItem>
                  <SelectItem value="Mutual Separation Agreement">Mutual Separation Agreement</SelectItem>
                  <SelectItem value="Medical / Disability Leave (Permanent)">Medical / Disability Leave (Permanent)</SelectItem>
                  <SelectItem value="Death in Service">Death in Service</SelectItem>
                  <SelectItem value="Other">Other (Please specify in notes)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex flex-col">
              <Label>Last Working Day (LWD)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("justify-start text-left font-normal", !lwd && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {lwd ? format(lwd, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={lwd}
                    onSelect={setLwd}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Additional notes (optional)</Label>
              <Textarea 
                placeholder="Anything HR should know..." 
                className="resize-none h-24"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button onClick={handleReset} variant="outline" disabled={loading} className="px-6 h-11">
                Reset
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="px-8 bg-[#1a4cd2] hover:bg-blue-700 h-11 text-base shadow-sm">
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
