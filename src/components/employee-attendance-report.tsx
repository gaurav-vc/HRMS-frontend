import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { CalendarCheck2, CalendarX2, Clock, Timer, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { attendanceApi } from "@/api";

interface EmployeeAttendanceReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmployeeId: number | string | null;
  employees: any[];
}

export function EmployeeAttendanceReport({
  open,
  onOpenChange,
  initialEmployeeId,
  employees
}: EmployeeAttendanceReportProps) {
  const [employeeId, setEmployeeId] = useState<string>("");
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [employeeOpen, setEmployeeOpen] = useState(false);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Present' | 'Absent' | 'Late' | 'Overtime'>('All');

  useEffect(() => {
    if (initialEmployeeId && open) {
      setEmployeeId(initialEmployeeId.toString());
    }
  }, [initialEmployeeId, open]);

  useEffect(() => {
    if (open && employeeId && month && year) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await attendanceApi.getEmployeeReport(Number(employeeId), Number(year), Number(month));
          setData(result);
          setActiveFilter('All');
        } catch (err: any) {
          setError(err.message || "Failed to fetch report");
          setData(null);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [open, employeeId, month, year]);

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0 border-l bg-background">
        <div className="p-6 border-b bg-muted/30">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Monthly Attendance Report
            </SheetTitle>
            <SheetDescription>
              View detailed attendance logs and aggregated statistics.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeOpen}
                    className="w-full justify-between font-normal"
                  >
                    {employeeId
                      ? (() => {
                          const emp = employees.find((e) => e.id.toString() === employeeId);
                          return emp ? `${emp.firstName || emp.first_name} ${emp.lastName || emp.last_name} (${emp.employeeCode || emp.code})` : "Select Employee...";
                        })()
                      : "Select Employee..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full min-w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employee..." />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {employees.map((emp) => {
                          const fullName = `${emp.firstName || emp.first_name} ${emp.lastName || emp.last_name} (${emp.employeeCode || emp.code})`;
                          return (
                            <CommandItem
                              key={emp.id}
                              value={fullName}
                              onSelect={() => {
                                setEmployeeId(emp.id.toString());
                                setEmployeeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  employeeId === emp.id.toString() ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {fullName}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-[140px]">
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[100px]">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p>Generating real-time report...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              {error}
            </div>
          ) : data ? (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card 
                  className={`cursor-pointer bg-success/5 border-success/20 shadow-sm hover:shadow-md transition-all ${activeFilter === 'Present' ? 'ring-2 ring-success ring-offset-2 bg-success/10' : ''}`}
                  onClick={() => setActiveFilter(activeFilter === 'Present' ? 'All' : 'Present')}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium text-success flex items-center justify-between">
                      Present Days
                      <CalendarCheck2 className="h-4 w-4" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-3xl font-bold">{data.summary.present_days}</div>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer bg-destructive/5 border-destructive/20 shadow-sm hover:shadow-md transition-all ${activeFilter === 'Absent' ? 'ring-2 ring-destructive ring-offset-2 bg-destructive/10' : ''}`}
                  onClick={() => setActiveFilter(activeFilter === 'Absent' ? 'All' : 'Absent')}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium text-destructive flex items-center justify-between">
                      Absent Days
                      <CalendarX2 className="h-4 w-4" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-3xl font-bold">{data.summary.absent_days}</div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer bg-warning/5 border-warning/20 shadow-sm hover:shadow-md transition-all ${activeFilter === 'Late' ? 'ring-2 ring-warning ring-offset-2 bg-warning/10' : ''}`}
                  onClick={() => setActiveFilter(activeFilter === 'Late' ? 'All' : 'Late')}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium text-warning flex items-center justify-between">
                      Late Marks
                      <Clock className="h-4 w-4" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-3xl font-bold">{data.summary.late_marks}</div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer bg-info/5 border-info/20 shadow-sm hover:shadow-md transition-all ${activeFilter === 'Overtime' ? 'ring-2 ring-info ring-offset-2 bg-info/10' : ''}`}
                  onClick={() => setActiveFilter(activeFilter === 'Overtime' ? 'All' : 'Overtime')}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium text-info flex items-center justify-between">
                      Overtime (Hrs)
                      <Timer className="h-4 w-4" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-3xl font-bold">{data.summary.total_overtime_hours}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Day-by-Day Log */}
              <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                  <CalendarCheck2 className="h-5 w-5 text-primary" />
                  Daily Logs {activeFilter !== 'All' && <span className="text-sm text-muted-foreground ml-2">(Filtered by {activeFilter})</span>}
                </h3>
                {(() => {
                  const filteredRecords = data.records.filter((record: any) => {
                    if (activeFilter === 'All') return true;
                    if (activeFilter === 'Present') return record.status === 'Present' || record.status === 'Late';
                    if (activeFilter === 'Absent') return record.status === 'Absent';
                    if (activeFilter === 'Late') return record.status === 'Late';
                    if (activeFilter === 'Overtime') return (record.otHours ?? 0) > 0;
                    return true;
                  });
                  return filteredRecords.length > 0 ? (
                    <div className="space-y-3">
                      {filteredRecords.map((record: any, index: number) => {
                      const dateObj = new Date(record.date);
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                      
                      return (
                        <div key={record.id || index}>
                          <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 hover:shadow-sm transition-all ${isWeekend ? 'bg-muted/20 border-dashed' : ''}`}>
                            <div className="flex items-start sm:items-center gap-4 mb-3 sm:mb-0">
                              <div className="flex flex-col items-center justify-center bg-primary/10 text-primary w-14 h-14 rounded-lg font-semibold">
                                <span className="text-xs uppercase">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                <span className="text-xl">{dateObj.getDate()}</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={
                                    record.status === 'Present' ? 'default' :
                                    record.status === 'Absent' ? 'destructive' :
                                    'secondary'
                                  } className={
                                    record.status === 'Present' ? 'bg-success hover:bg-success/90 text-success-foreground' : 
                                    record.status === 'Late' ? 'bg-warning hover:bg-warning/90 text-warning-foreground border-warning/50' : 
                                    ''
                                  }>
                                    {record.status}
                                  </Badge>
                                  {record.otHours > 0 && (
                                    <Badge variant="outline" className="text-info border-info/50 bg-info/5">
                                      +{record.otHours}h OT
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span>In: <strong className="text-foreground">{record.firstCheckIn ? new Date(record.firstCheckIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</strong></span>
                                  <span>•</span>
                                  <span>Out: <strong className="text-foreground">{record.lastCheckOut ? new Date(record.lastCheckOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</strong></span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-left sm:text-right text-sm">
                              <div className="text-muted-foreground mb-1">Total Hours</div>
                              <div className="font-bold text-lg">{record.totalHours !== undefined && record.totalHours !== null ? record.totalHours : 0}h</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground bg-muted/20">
                    No attendance records match the selected filter.
                  </div>
                );
                })()}
              </div>
            </div>
          ) : (
             <div className="text-center p-8 text-muted-foreground">
               Select an employee to view their report.
             </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
