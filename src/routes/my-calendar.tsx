import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/page-header';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { holidaysApi, leavesApi, attendanceApi } from '@/api';
import { useAuth } from '@/lib/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

export const Route = createFileRoute('/my-calendar')({
  component: MyCalendar,
});

function MyCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);

  const [selectedActionDate, setSelectedActionDate] = useState<Date | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [recentLeavesFilter, setRecentLeavesFilter] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<{type: 'leave' | 'reg', data: any} | null>(null);

  const fetchLeaves = () => {
    const empId = (user as any)?.employeeId || (user as any)?.employee_id;
    
    leavesApi.getAll().then((res: any) => {
      const allLeaves = Array.isArray(res) ? res : (res && Array.isArray(res.results) ? res.results : []);
      const myLeaves = allLeaves.filter((l: any) => String(l.employee_id) === String(empId) || String(l.employee) === String(empId) || String(l.employee?.id) === String(empId));
      setLeaves(myLeaves);
    }).catch(console.error);
    
    attendanceApi.getRegularizations().then((res: any) => {
      const allRegs = Array.isArray(res) ? res : (res && Array.isArray(res.results) ? res.results : []);
      const myRegs = allRegs.filter((r: any) => String(r.employee) === String(empId) || String(r.employee_id) === String(empId) || String(r.employee?.id) === String(empId));
      setRegularizations(myRegs);
    }).catch(console.error);
  };

  useEffect(() => {
    leavesApi.getTypes().then((res: any) => {
      setLeaveTypes(Array.isArray(res) ? res : (res.results || []));
    }).catch(console.error);

    holidaysApi.getAll().then((res: any) => {
      if (Array.isArray(res)) setHolidays(res);
      else if (res && Array.isArray(res.results)) setHolidays(res.results);
    }).catch(console.error);

    fetchLeaves();
  }, [user]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDay };
  };

  const { daysInMonth, firstDay } = getDaysInMonth(currentDate);
  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    if (day > 0 && day <= daysInMonth) return new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
  });

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="My Calendar" 
        description="View your holidays and approved leaves." 
      />

      <div className="border rounded-md bg-white overflow-hidden flex flex-col shadow-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">{monthName}</div>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 border-b bg-gray-50/50">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7">
          {days.map((date, i) => {
            // Helper to format date correctly considering local timezone (YYYY-MM-DD)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const dayHolidays = holidays.filter(h => h.date === dateStr);
            
            // Find leaves covering this date
            const dayLeaves = leaves.filter(l => {
              const start = (l.start_date || l.startDate || '').split('T')[0];
              const end = (l.end_date || l.endDate || '').split('T')[0];
              return dateStr >= start && dateStr <= end;
            });
            const dayRegs = regularizations.filter(r => {
              const rDate = (r.attendance_date || r.attendanceDate || r.date || '').split('T')[0];
              return rDate === dateStr;
            });

            return (
              <div 
                key={i} 
                onClick={() => setSelectedActionDate(date)}
                className={`min-h-[100px] border-r border-b p-2 cursor-pointer transition-colors hover:bg-gray-100 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/30 text-gray-400'}`}
              >
                <div className="text-xs font-medium mb-1">{date.getDate()}</div>
                <div className="space-y-1">
                  {dayHolidays.map((h, idx) => (
                    <div 
                      key={idx} 
                      className="text-[10px] truncate rounded px-1.5 py-0.5 bg-blue-50 text-blue-700 font-medium border border-blue-100"
                      title={h.name}
                    >
                      {h.name}
                    </div>
                  ))}
                  {dayLeaves.map((l: any) => (
                    <div 
                      key={l.id} 
                      className="text-[10px] p-1 bg-blue-100 text-blue-700 font-medium rounded truncate cursor-pointer hover:bg-blue-200 border border-blue-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecord({ type: 'leave', data: l });
                      }}
                    >
                      {leaveTypes.find((t: any) => t.id === l.leave_type || t.id === l.leaveType || t.id === Number(l.leave_type) || t.id === Number(l.leaveType))?.name || l.leave_type_code || l.leaveTypeCode || 'Leave'} - {l.status}
                    </div>
                  ))}
                  {dayRegs.map((r, idx) => (
                    <div 
                      key={`r-${idx}`} 
                      className={`text-[10px] truncate rounded px-1.5 py-0.5 font-medium border cursor-pointer hover:opacity-80 ${r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : r.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}
                      title={`Regularization - ${r.status}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecord({ type: 'reg', data: r });
                      }}
                    >
                      {r.status === 'Pending' && '⏳ '}
                      Regularization
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Your Recent Requests</CardTitle>
          <select 
            className="border border-input bg-transparent rounded-md text-sm px-3 py-1"
            onChange={(e) => setRecentLeavesFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Regularization">Regularization</option>
            {leaveTypes.map((t: any) => (
              <option key={t.id} value={t.code || t.name}>{t.name}</option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const combined = [
                ...leaves.map(l => ({ ...l, _type: 'leave' })),
                ...regularizations.map(r => ({ ...r, _type: 'reg' }))
              ].sort((a, b) => {
                const dateA = new Date(a.created_at || a.createdAt || a.start_date || a.startDate || a.attendance_date || a.attendanceDate || a.date || 0).getTime();
                const dateB = new Date(b.created_at || b.createdAt || b.start_date || b.startDate || b.attendance_date || b.attendanceDate || b.date || 0).getTime();
                return dateB - dateA;
              }).filter(item => {
                if (!recentLeavesFilter) return true;
                if (item._type === 'reg' && recentLeavesFilter === 'Regularization') return true;
                if (item._type === 'reg' && recentLeavesFilter !== 'Regularization') return false;
                if (item._type === 'leave' && recentLeavesFilter === 'Regularization') return false;
                const t = leaveTypes.find((lt: any) => lt.id === item.leave_type || lt.id === item.leaveType || lt.id === Number(item.leave_type) || lt.id === Number(item.leaveType));
                return (t?.code === recentLeavesFilter || t?.name === recentLeavesFilter);
              });

              if (combined.length === 0) {
                return <div className="text-sm text-muted-foreground text-center py-4">No recent requests found.</div>;
              }

              return combined.slice(0, 5).map((item: any, idx) => (
                <div key={`${item._type}-${item.id || idx}`} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {item._type === 'leave' ? (
                        leaveTypes.find((t: any) => t.id === item.leave_type || t.id === item.leaveType || t.id === Number(item.leave_type) || t.id === Number(item.leaveType))?.name || item.leave_type_code || item.leaveTypeCode || 'Leave Request'
                      ) : (
                        <span>Regularization</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item._type === 'leave' ? (
                        `${item.start_date || item.startDate} to ${item.end_date || item.endDate}`
                      ) : (
                        `Date: ${item.attendance_date || item.attendanceDate || item.date} (${(item.requested_check_in || item.requestedCheckIn || item.clock_in || '').split('T')[1]?.substring(0,5) || ''} - ${(item.requested_check_out || item.requestedCheckOut || item.clock_out || '').split('T')[1]?.substring(0,5) || ''})`
                      )}
                    </div>
                    {item.reason && <div className="text-xs mt-1 text-gray-500 truncate max-w-[200px]">{item.reason}</div>}
                  </div>
                  <Badge variant={item.status === 'Approved' ? 'default' : item.status === 'Rejected' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      <RecordDetailsModal 
        record={selectedRecord} 
        onClose={() => setSelectedRecord(null)} 
        leaveTypes={leaveTypes}
      />

      <CalendarActionModal
        isOpen={!!selectedActionDate}
        date={selectedActionDate}
        leaveTypes={leaveTypes}
        onClose={() => setSelectedActionDate(null)}
        onSuccess={() => {
          setSelectedActionDate(null);
          fetchLeaves();
        }}
        employeeId={(user as any)?.employeeId || (user as any)?.employee_id}
      />
    </div>
  );
}

function RecordDetailsModal({ record, onClose, leaveTypes }: any) {
  if (!record) return null;
  const { type, data } = record;

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{type === 'leave' ? 'Leave Details' : 'Regularization Details'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {type === 'leave' ? (
            <div className="p-3 bg-slate-50 border rounded-md">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm">
                  {leaveTypes.find((t: any) => t.id === data.leave_type || t.id === data.leaveType || t.id === Number(data.leave_type) || t.id === Number(data.leaveType))?.name || data.leave_type_code || data.leaveTypeCode || 'Leave Request'}
                </span>
                <Badge variant={data.status === 'Approved' ? 'default' : data.status === 'Rejected' ? 'destructive' : 'secondary'}>{data.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-2">{data.start_date || data.startDate} to {data.end_date || data.endDate}</div>
              <div className="text-sm bg-white p-3 rounded border shadow-sm">
                <div className="text-xs font-medium text-muted-foreground mb-1">Reason:</div>
                {data.reason || 'No reason provided'}
              </div>
              {(data.manager_comments || data.managerComments) && (
                <div className="text-xs mt-3 p-3 bg-orange-50 text-orange-800 rounded border border-orange-100">
                  <div className="font-semibold mb-1">Manager Comments:</div>
                  {data.manager_comments || data.managerComments}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border rounded-md">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm">Regularization Request</span>
                <Badge variant={data.status === 'Approved' ? 'default' : data.status === 'Rejected' ? 'destructive' : 'secondary'}>{data.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-2">Date: {data.attendance_date || data.attendanceDate || data.date}</div>
              <div className="text-xs text-muted-foreground mb-2">Requested Times: {data.requested_clock_in || data.requestedClockIn} to {data.requested_clock_out || data.requestedClockOut}</div>
              <div className="text-sm bg-white p-3 rounded border shadow-sm">
                <div className="text-xs font-medium text-muted-foreground mb-1">Reason:</div>
                {data.reason || 'No reason provided'}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalendarActionModal({ isOpen, date, leaveTypes: initialLeaveTypes, onClose, onSuccess, employeeId }: any) {
  const [activeTab, setActiveTab] = useState("leave");
  const [loading, setLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const [leaveTypes, setLeaveTypes] = useState<any[]>(initialLeaveTypes || []);

  useEffect(() => {
    if (isOpen && leaveTypes.length === 0) {
      leavesApi.getTypes().then((res: any) => {
        setLeaveTypes(Array.isArray(res) ? res : (res.results || []));
      }).catch(console.error);
    }
  }, [isOpen, leaveTypes.length]);

  // Leave Form
  const [leaveType, setLeaveType] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveDayType, setLeaveDayType] = useState("Full Day");

  // Regularize Form
  const [clockIn, setClockIn] = useState("09:00");
  const [clockOut, setClockOut] = useState("18:00");
  const [regReason, setRegReason] = useState("");

  const formattedDate = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : "";

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEndDate(formattedDate);
      setActiveTab("leave");
      setLeaveType("");
      setLeaveReason("");
      setLeaveDayType("Full Day");
      setClockIn("09:00");
      setClockOut("18:00");
      setRegReason("");
    }
  }, [isOpen, formattedDate]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setSubmissionError(null);
      if (activeTab === "leave") {
        if (!leaveType) throw new Error("Please select a leave type");
        await leavesApi.createLeave({
          employee: employeeId,
          leave_type: leaveType,
          start_date: formattedDate,
          end_date: endDate || formattedDate,
          total_days: leaveDayType === 'Full Day' ? 1 : 0.5,
          reason: leaveReason
        });
        toast.success("Leave requested successfully");
        onSuccess();
      } else if (activeTab === "regularize") {
        await attendanceApi.requestRegularization({
          employee: employeeId,
          attendance_date: formattedDate,
          requested_check_in: `${formattedDate}T${clockIn}:00Z`,
          requested_check_out: `${formattedDate}T${clockOut}:00Z`,
          reason: regReason
        });
        toast.success("Regularization requested successfully");
        onSuccess();
      }
    } catch (err: any) {
      setSubmissionError(err.message || String(err));
      toast.error("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Request - {formattedDate}</DialogTitle>
        </DialogHeader>

        {submissionError && (
          <div className="bg-red-100 border border-red-400 text-red-900 px-4 py-3 rounded relative text-sm overflow-auto max-h-48 whitespace-pre-wrap">
            <strong>Error:</strong><br/>
            {submissionError}
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leave">Request Leave</TabsTrigger>
            <TabsTrigger value="regularize">Regularize</TabsTrigger>
          </TabsList>
          
          <TabsContent value="leave" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={formattedDate} disabled />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={formattedDate} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Day Type</Label>
              <Select value={leaveDayType} onValueChange={setLeaveDayType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Day">Full Day</SelectItem>
                  <SelectItem value="First Half">First Half</SelectItem>
                  <SelectItem value="Second Half">Second Half</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Why are you taking leave?" />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading}>Submit Leave</Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="regularize" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Clock In</Label>
                <Input type="time" value={clockIn} onChange={e => setClockIn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Clock Out</Label>
                <Input type="time" value={clockOut} onChange={e => setClockOut(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={regReason} onChange={e => setRegReason(e.target.value)} placeholder="e.g. Forgot to punch in" />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading}>Request Regularization</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
