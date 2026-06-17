import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, fmtINR, type SalaryComponent } from "@/lib/mock-data";

export const Route = createFileRoute("/payroll/structure")({ component: StructurePage });

function StructurePage() {
  const [comps, setComps] = useState<SalaryComponent[]>(db().salaryComponents);
  const [ctc, setCtc] = useState(1200000);

  const calcValue = (c: SalaryComponent, basic: number) => {
    if (c.calc === "Fixed") return c.value;
    if (c.calc === "% of Basic") return Math.round((basic * c.value) / 100);
    return Math.round((ctc * c.value) / 100);
  };
  const basic = Math.round(ctc * 0.4);
  const earnings = comps.filter(c => c.type === "Earning").map(c => ({ c, v: calcValue(c, basic) }));
  const deductions = comps.filter(c => c.type === "Deduction").map(c => ({ c, v: calcValue(c, basic) }));
  const totalEarn = earnings.reduce((s, x) => s + x.v, 0);
  const totalDed = deductions.reduce((s, x) => s + x.v, 0);
  const net = totalEarn - totalDed;

  const add = () => setComps(c => [...c, { id: `sc-${Date.now()}`, name: "New Component", type: "Earning", calc: "Fixed", value: 0 }]);

  return (
    <>
      <PageHeader title="Salary Structure Builder" description="Define how compensation is calculated for any CTC" />
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Components</h3>
            <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" />Add Component</Button>
          </div>
          <div className="space-y-2">
            {comps.map((c, i) => (
              <div key={c.id} className="grid grid-cols-[1.4fr_1fr_1fr_100px_auto] gap-2 items-center p-2 rounded border bg-muted/20">
                <Input value={c.name} onChange={e => setComps(cs => cs.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} />
                <Select value={c.type} onValueChange={(v: "Earning"|"Deduction") => setComps(cs => cs.map(x => x.id === c.id ? { ...x, type: v } : x))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Earning">Earning</SelectItem><SelectItem value="Deduction">Deduction</SelectItem></SelectContent>
                </Select>
                <Select value={c.calc} onValueChange={(v: SalaryComponent["calc"]) => setComps(cs => cs.map(x => x.id === c.id ? { ...x, calc: v } : x))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Fixed">Fixed</SelectItem><SelectItem value="% of Basic">% of Basic</SelectItem><SelectItem value="% of CTC">% of CTC</SelectItem></SelectContent>
                </Select>
                <Input type="number" value={c.value} onChange={e => setComps(cs => cs.map(x => x.id === c.id ? { ...x, value: +e.target.value } : x))} />
                <Button size="icon" variant="ghost" onClick={() => setComps(cs => cs.filter(x => x.id !== c.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
          <div className="mt-4"><Button onClick={() => toast.success("Salary structure saved")}>Save Structure</Button></div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-3">Live Preview</h3>
          <div className="space-y-1.5 mb-4">
            <Label>Annual CTC</Label>
            <Input type="number" value={ctc} onChange={e => setCtc(+e.target.value)} />
          </div>
          <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Earnings</div>
          <ul className="divide-y text-sm mb-3">{earnings.map(({ c, v }) => (<li key={c.id} className="py-1.5 flex justify-between"><span>{c.name}</span><span>{fmtINR(v)}</span></li>))}<li className="py-1.5 flex justify-between font-semibold"><span>Total</span><span className="text-success">{fmtINR(totalEarn)}</span></li></ul>
          <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Deductions</div>
          <ul className="divide-y text-sm mb-3">{deductions.map(({ c, v }) => (<li key={c.id} className="py-1.5 flex justify-between"><span>{c.name}</span><span>{fmtINR(v)}</span></li>))}<li className="py-1.5 flex justify-between font-semibold"><span>Total</span><span className="text-destructive">{fmtINR(totalDed)}</span></li></ul>
          <div className="p-3 rounded-md bg-primary text-primary-foreground flex justify-between items-center">
            <span className="text-sm">Net Monthly</span>
            <span className="text-xl font-bold">{fmtINR(net/12)}</span>
          </div>
          <Badge variant="outline" className="mt-3">Basic auto = 40% CTC</Badge>
        </Card>
      </div>
    </>
  );
}
