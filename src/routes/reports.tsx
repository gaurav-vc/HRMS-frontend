import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, FileBarChart2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

const CATS = [
  { name: "People", items: ["Headcount Snapshot","Attrition Analysis","Diversity Report","New Joiners","Exits"] },
  { name: "Attendance", items: ["Daily Attendance","Monthly Summary","Late Marks","Geofence Violations","Overtime"] },
  { name: "Payroll", items: ["Monthly Payroll Register","CTC Distribution","Cost by Department","Variable Pay","Bonus Provision"] },
  { name: "Compliance", items: ["PF ECR","ESI Return","PT State-wise","TDS 24Q","Form 16"] },
];

function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Configurable reports across HR, attendance, payroll and compliance" />
      <div className="grid gap-4 lg:grid-cols-2">
        {CATS.map(c => (
          <Card key={c.name} className="p-5"><h3 className="font-semibold mb-3 flex items-center gap-2"><FileBarChart2 className="h-4 w-4 text-primary" />{c.name}</h3>
            <ul className="divide-y">{c.items.map(i => (
              <li key={i} className="py-2.5 flex items-center justify-between">
                <span className="text-sm">{i}</span>
                <Button size="sm" variant="outline" onClick={() => toast.success(`${i} downloaded`)}><Download className="h-4 w-4 mr-1" />Export</Button>
              </li>
            ))}</ul></Card>
        ))}
      </div>
    </>
  );
}
