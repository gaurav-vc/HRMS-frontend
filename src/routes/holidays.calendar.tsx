import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/page-header';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { holidaysApi } from '@/api';

export const Route = createFileRoute('/holidays/calendar')({
  component: HolidayCalendar,
});

function HolidayCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [holidays, setHolidays] = useState<any[]>([]);

  useEffect(() => {
    // Fetch all holidays
    holidaysApi.getAll().then((res: any) => {
      if (Array.isArray(res)) setHolidays(res);
      else if (res && Array.isArray(res.results)) setHolidays(res.results);
    }).catch(console.error);
  }, []);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

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
    if (day > 0 && day <= daysInMonth) {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    }
    // Previous month days
    if (day <= 0) {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    }
    // Next month days
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
  });

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Holiday Calendar" 
        description="Monthly grid view across all calendars." 
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
            const dateStr = date.toISOString().split('T')[0];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const dayHolidays = holidays.filter(h => h.date === dateStr);

            return (
              <div 
                key={i} 
                className={`min-h-[100px] border-r border-b p-2 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/30 text-gray-400'}`}
              >
                <div className="text-xs font-medium mb-1">{date.getDate()}</div>
                <div className="space-y-1">
                  {dayHolidays.map((h, idx) => (
                    <div 
                      key={idx} 
                      className="text-[10px] truncate rounded px-1.5 py-0.5 bg-blue-50 text-blue-700 font-medium"
                      title={h.name}
                    >
                      {h.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">All holidays this year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {holidays.length === 0 ? (
              <div className="text-sm text-muted-foreground">No holidays found.</div>
            ) : (
              holidays.map((holiday) => (
                <div key={holiday.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">{holiday.date}</span>
                    <span className="font-semibold text-sm">{holiday.name}</span>
                    <Badge variant={holiday.holiday_type === 'National' ? 'secondary' : (holiday.holiday_type === 'Company' ? 'default' : 'secondary')} 
                           className={
                             holiday.holiday_type === 'National' ? 'bg-[#e0e7ff] text-[#4338ca] hover:bg-[#e0e7ff]/80' : 
                             holiday.holiday_type === 'Company' ? 'bg-[#c3f0ca] text-[#1c7b36] hover:bg-[#c3f0ca]/80' : 
                             'bg-[#fef0c7] text-[#b54708] hover:bg-[#fef0c7]/80'
                           }>
                      {holiday.holiday_type}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {holiday.rule_groups?.length || 0} rule group(s)
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
