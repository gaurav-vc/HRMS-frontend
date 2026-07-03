import { createFileRoute, Link } from '@tanstack/react-router';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Calendar, CalendarOff, CalendarCheck2, Map, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { holidaysApi } from '@/api';

export const Route = createFileRoute('/holidays/')({
  component: HolidayPlanner,
});

function HolidayPlanner() {
  const [stats, setStats] = useState({
    total_holidays: 0,
    upcoming: 0,
    optional: 0,
    restricted: 0,
    regional_festival: 0,
  });
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    holiday_type: 'National'
  });

  const fetchData = () => {
    holidaysApi.getStats().then((res: any) => {
      if (res) setStats(res);
    }).catch(console.error);

    holidaysApi.getAll().then((res: any) => {
      const today = new Date().toISOString().split('T')[0];
      const upcoming = Array.isArray(res) ? res.filter((h: any) => h.date >= today) : [];
      setHolidays(upcoming);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await holidaysApi.create(formData);
      setIsDialogOpen(false);
      setFormData({ date: '', name: '', holiday_type: 'National' });
      fetchData(); // Refresh list & stats
    } catch (err) {
      console.error(err);
      alert('Failed to create holiday');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Holiday Planner" 
          description="Rule-driven holiday applicability across entities, regions, projects, shifts, and employee groups." 
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0f4c5c] text-white hover:bg-[#0f4c5c]/90">
              + New Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Holiday</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Holiday Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Independence Day" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={formData.holiday_type} 
                  onValueChange={val => setFormData({...formData, holiday_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Restricted">Restricted</SelectItem>
                    <SelectItem value="Regional">Regional</SelectItem>
                    <SelectItem value="Festival">Festival</SelectItem>
                    <SelectItem value="Optional">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Save Holiday'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard label="TOTAL HOLIDAYS" value={(stats?.total_holidays || 0).toString()} icon={Calendar} />
        <StatCard label="UPCOMING" value={(stats?.upcoming || 0).toString()} icon={CalendarCheck2} tone="info" />
        <StatCard label="OPTIONAL" value={(stats?.optional || 0).toString()} icon={CalendarOff} tone="warning" />
        <StatCard label="RESTRICTED" value={(stats?.restricted || 0).toString()} icon={Users} tone="warning" />
        <StatCard label="REGIONAL / FESTIVAL" value={(stats?.regional_festival || 0).toString()} icon={Map} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Upcoming Holidays</CardTitle>
          <Link to="/holidays/calendar" className="text-sm text-muted-foreground hover:text-foreground flex items-center">
            Open calendar &rarr;
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mt-4">
            {holidays.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No upcoming holidays found.</div>
            ) : (
              holidays.map((holiday) => (
                <div key={holiday.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{holiday.name}</span>
                      <Badge variant={holiday.holiday_type === 'Company' ? 'default' : 'secondary'} className={holiday.holiday_type === 'Company' ? 'bg-[#c3f0ca] text-[#1c7b36] hover:bg-[#c3f0ca]/80' : 'bg-[#fef0c7] text-[#b54708] hover:bg-[#fef0c7]/80'}>
                        {holiday.holiday_type}
                      </Badge>
                      {holiday.status === 'Draft' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">DRAFT</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {holiday.rule_groups?.length || 0} rule group(s)
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {holiday.date}
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
