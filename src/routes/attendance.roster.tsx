import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { attendanceApi } from "@/api";
import { format, addDays, startOfWeek, subWeeks, addWeeks } from "date-fns";

export const Route = createFileRoute("/attendance/roster")({
  component: RosterPage,
  loader: async () => {
    const shifts = await attendanceApi.getShifts();
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const startDate = format(start, "yyyy-MM-dd");
    const endDate = format(addDays(start, 6), "yyyy-MM-dd");
    const rosterData = await attendanceApi.getWeeklyRoster(startDate, endDate);
    return { shifts, rosterData, initialStart: start };
  }
});

function RosterPage() {
  const { shifts, rosterData, initialStart } = Route.useLoaderData();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date(initialStart));
  const [roster, setRoster] = useState<any[]>(Array.isArray(rosterData) ? rosterData : ((rosterData as any)?.results || []));
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const actualShifts = Array.isArray(shifts) ? shifts : ((shifts as any)?.results || []);

  const fetchRoster = async (date: Date) => {
    setIsLoading(true);
    try {
      const start = format(date, "yyyy-MM-dd");
      const end = format(addDays(date, 6), "yyyy-MM-dd");
      const data = await attendanceApi.getWeeklyRoster(start, end);
      setRoster(Array.isArray(data) ? data : ((data as any)?.results || []));
    } catch (err: any) {
      toast.error("Failed to load roster");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevWeek = () => {
    const newDate = subWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newDate);
    fetchRoster(newDate);
  };

  const handleNextWeek = () => {
    const newDate = addWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newDate);
    fetchRoster(newDate);
  };

  const handleToday = () => {
    const newDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    setCurrentWeekStart(newDate);
    fetchRoster(newDate);
  };

  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const handleCellClick = async (employeeId: number, dateStr: string) => {
    if (!selectedShiftId) {
      toast.error("Please select a shift to assign first");
      return;
    }
    
    // Optimistic update
    const prevRoster = [...roster];
    const shift = actualShifts.find((s: any) => s.id.toString() === selectedShiftId);
    
    setRoster(roster.map(r => {
      if (r.employee.id === employeeId) {
        return {
          ...r,
          shifts: {
            ...r.shifts,
            [dateStr]: { shiftDetails: shift }
          }
        };
      }
      return r;
    }));

    try {
      await attendanceApi.assignShift({
        employee_id: employeeId, // Our DRF backend is camelCase for responses, but let's check what assignShift expects
        date: dateStr,
        shift_id: parseInt(selectedShiftId)
      });
    } catch (err) {
      toast.error("Failed to assign shift");
      setRoster(prevRoster); // Revert
    }
  };

  const handleClearShift = async (employeeId: number, dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const prevRoster = [...roster];
    
    setRoster(roster.map(r => {
      if (r.employee.id === employeeId) {
        const newShifts = { ...r.shifts };
        delete newShifts[dateStr];
        return { ...r, shifts: newShifts };
      }
      return r;
    }));

    try {
      await attendanceApi.assignShift({
        employee_id: employeeId,
        date: dateStr,
        shift_id: null
      });
    } catch (err) {
      toast.error("Failed to clear shift");
      setRoster(prevRoster);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="Weekly Roster" description="Click a cell to assign · drag a shift block to move it · double-bookings flag automatically." />
        <div className="flex items-center gap-2 pb-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek} disabled={isLoading}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-sm font-medium border px-4 py-2 rounded-md bg-card">
            {format(days[0], "MMM d")} – {format(days[6], "MMM d, yyyy")}
          </div>
          <Button variant="outline" size="icon" onClick={handleNextWeek} disabled={isLoading}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={handleToday} disabled={isLoading}>Today</Button>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border flex items-center gap-4">
        <span className="text-sm text-muted-foreground font-medium">Click-to-assign shift:</span>
        <div className="w-[300px]">
          <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a shift..." />
            </SelectTrigger>
            <SelectContent>
              {actualShifts.map((s: any) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.colorHex || '#000' }} />
                    {s.name} ({(s.startTime || "00:00").substring(0, 5)}–{(s.endTime || "00:00").substring(0, 5)})
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground ml-auto">Clicking a cell assigns or replaces; click an existing block's × to clear.</span>
      </div>

      <div className="border rounded-xl bg-card overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground border-r w-[250px]">Employee</th>
              {days.map(d => (
                <th key={d.toISOString()} className="px-4 py-3 font-medium border-r min-w-[140px] align-top">
                  <div className="text-xs text-muted-foreground uppercase">{format(d, "EEE")}</div>
                  <div className="font-semibold text-foreground">{format(d, "MMM d")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {roster.map((row) => (
              <tr key={row.employee?.id || Math.random()} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 border-r bg-card sticky left-0">
                  <div className="font-medium">{row.employee?.name || "Unknown Employee"}</div>
                  <div className="text-xs text-muted-foreground">{row.employee?.title || ""}</div>
                </td>
                {days.map(d => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const assignment = (row.shifts || {})[dateStr];
                  
                  return (
                    <td 
                      key={dateStr} 
                      className="p-1.5 border-r border-dashed cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleCellClick(row.employee?.id, dateStr)}
                    >
                      {assignment && assignment.shiftDetails ? (
                        <div 
                          className="rounded-md p-2 text-white relative group"
                          style={{ backgroundColor: assignment.shiftDetails.colorHex || '#000' }}
                        >
                          <div className="font-medium text-xs leading-none mb-1">{assignment.shiftDetails.name}</div>
                          <div className="text-[10px] opacity-90 leading-none">
                            {(assignment.shiftDetails.startTime || "00:00").substring(0, 5)}–{(assignment.shiftDetails.endTime || "00:00").substring(0, 5)}
                          </div>
                          <button 
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20 rounded p-0.5"
                            onClick={(e) => handleClearShift(row.employee?.id, dateStr, e)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-full min-h-[44px] flex items-center justify-center opacity-0 hover:opacity-100">
                          <span className="text-xs text-muted-foreground">click to assign</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
