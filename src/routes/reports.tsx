import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileBarChart2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { employeesApi, attendanceApi, payrollApi } from "@/api";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

const CATS = [
  { name: "People", items: ["Headcount Snapshot","Attrition Analysis","Diversity Report","New Joiners","Exits"] },
  { name: "Attendance", items: ["Daily Attendance","Monthly Summary","Late Marks","Geofence Violations","Overtime"] },
  { name: "Payroll", items: ["Monthly Payroll Register","CTC Distribution","Cost by Department","Variable Pay","Bonus Provision"] },
  { name: "Compliance", items: ["PF ECR","ESI Return","PT State-wise","TDS 24Q","Form 16"] },
];

function downloadCSV(filename: string, rows: object[]) {
  if (!rows || !rows.length) {
    toast.error("No data found for this report.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map(row => headers.map(header => {
      let cell = (row as any)[header] === null || (row as any)[header] === undefined ? '' : String((row as any)[header]);
      cell = cell.replace(/"/g, '""');
      if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
      return cell;
    }).join(","))
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (reportName: string) => {
    try {
      setDownloading(reportName);
      let data: any[] = [];
      
      if (reportName === "Headcount Snapshot") {
        const emps = await employeesApi.getAll();
        data = emps.map(e => ({
          "Employee ID": e.code,
          "First Name": e.firstName,
          "Last Name": e.lastName,
          "Email": e.email,
          "Status": e.status,
          "Date of Joining": e.doj || '',
          "Gender": e.gender,
          "Location": e.address || '',
        }));
      } else if (reportName === "Daily Attendance" || reportName === "Late Marks" || reportName === "Geofence Violations") {
        const hist = await attendanceApi.getHistory();
        data = hist.map(h => ({
          "Employee ID": h.employeeId,
          "Date": h.date,
          "Check In": h.checkIn,
          "Check Out": h.checkOut || '',
          "Status": h.status,
          "Location": h.location,
          "Geofence Verification": h.qrStatus,
        }));
        if (reportName === "Late Marks") data = data.filter(d => d.Status === "Late");
        if (reportName === "Geofence Violations") data = data.filter(d => d["Geofence Verification"] === "Failed");
      } else if (reportName === "Monthly Payroll Register") {
        const slips = await payrollApi.getSlips("2026-04"); // Defaulting to an active period for demo
        data = slips.map((s: any) => ({
          "Employee Name": `${s.firstName} ${s.lastName}`,
          "Employee ID": s.code,
          "Gross Pay": s.gross,
          "Net Pay": s.net,
          "PF Deduction": s.pf,
          "PT Deduction": s.pt,
          "TDS": s.tds,
        }));
      } else {
        toast.error(`The "${reportName}" report is currently under development and not yet available.`);
        setDownloading(null);
        return;
      }
      
      downloadCSV(reportName.replace(/\s+/g, '_').toLowerCase(), data);
      toast.success(`${reportName} downloaded successfully!`);
    } catch (err: any) {
      toast.error(`Failed to export ${reportName}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <PageHeader title="Reports" description="Configurable reports across HR, attendance, payroll and compliance" />
      <div className="grid gap-4 lg:grid-cols-2">
        {CATS.map(c => (
          <Card key={c.name} className="p-5"><h3 className="font-semibold mb-3 flex items-center gap-2"><FileBarChart2 className="h-4 w-4 text-primary" />{c.name}</h3>
            <ul className="divide-y">{c.items.map(i => (
              <li key={i} className="py-2.5 flex items-center justify-between">
                <span className="text-sm">{i}</span>
                <Button size="sm" variant="outline" disabled={downloading === i} onClick={() => handleExport(i)}>
                  <Download className="h-4 w-4 mr-1" />
                  {downloading === i ? "Exporting..." : "Export"}
                </Button>
              </li>
            ))}</ul></Card>
        ))}
      </div>
    </>
  );
}
