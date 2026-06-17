import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtINR } from "@/lib/mock-data";

export const Route = createFileRoute("/payroll/compliance")({ component: CompliancePage });

const REPORTS = [
  { key: "PF ECR", desc: "EPFO monthly return", amount: 1840000, due: "15 Jul 2026", status: "Filed" },
  { key: "ESI Contribution", desc: "Employees' State Insurance", amount: 285000, due: "15 Jul 2026", status: "Pending" },
  { key: "Professional Tax", desc: "State-wise PT remittance", amount: 96000, due: "20 Jul 2026", status: "Filed" },
  { key: "TDS (24Q)", desc: "Quarterly TDS on salary", amount: 2280000, due: "31 Jul 2026", status: "Pending" },
  { key: "LWF", desc: "Labour Welfare Fund", amount: 24000, due: "31 Jul 2026", status: "Draft" },
  { key: "Form 16", desc: "Annual TDS certificate", amount: 0, due: "15 Jun 2026", status: "Generated" },
];

function CompliancePage() {
  return (
    <>
      <PageHeader title="Compliance Reports" description="Statutory filings and government returns" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map(r => (
          <Card key={r.key} className="p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between">
              <div><div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" /><h3 className="font-semibold">{r.key}</h3></div><p className="text-xs text-muted-foreground mt-1">{r.desc}</p></div>
              <Badge className={r.status === "Filed" || r.status === "Generated" ? "bg-success text-success-foreground" : r.status === "Pending" ? "bg-warning text-warning-foreground" : ""}>{r.status}</Badge>
            </div>
            {r.amount > 0 && <div className="mt-3"><div className="text-xs text-muted-foreground">Liability</div><div className="text-xl font-semibold">{fmtINR(r.amount)}</div></div>}
            <div className="text-xs text-muted-foreground mt-1">Due: {r.due}</div>
            <div className="flex gap-2 mt-4"><Button size="sm" variant="outline" onClick={() => toast.success(`${r.key} report downloaded`)}><Download className="h-4 w-4 mr-1" />Download</Button>{r.status !== "Filed" && r.status !== "Generated" && <Button size="sm" onClick={() => toast.success(`${r.key} filed`)}>File Now</Button>}</div>
          </Card>
        ))}
      </div>
    </>
  );
}
