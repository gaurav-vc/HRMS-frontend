import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, CheckCircle2, Files, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtINR } from "@/lib/mock-data";
import { payrollApi } from "@/api";

export const Route = createFileRoute("/payroll/structure")({
  loader: async () => {
    const structures = await payrollApi.getStructures();
    return { initialStructures: structures };
  },
  component: StructurePage
});

function StructurePage() {
  const { initialStructures } = Route.useLoaderData();
  const [structures, setStructures] = useState<any[]>(initialStructures);
  const [activeId, setActiveId] = useState<number | null>(structures.length > 0 ? structures[0].id : null);
  const [comps, setComps] = useState<any[]>([]);
  const [isLoadingComps, setIsLoadingComps] = useState(false);
  const [ctc, setCtc] = useState(2400000);
  const [taxRegime, setTaxRegime] = useState("New");
  const [taxSavingDeductions, setTaxSavingDeductions] = useState("0");

  // Force a real-time fetch to bypass any router caching
  useEffect(() => {
    payrollApi.getStructures().then(data => {
      setStructures(data);
    }).catch(console.error);
  }, []);

  // Dialog state for new structure
  const [newStructOpen, setNewStructOpen] = useState(false);
  const [newStructName, setNewStructName] = useState("");

  // Dialog state for rename
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Dialog state for new component
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "New Component",
    type: "Earning",
    calc: "Fixed",
    value: 1000,
    prorate: true
  });

  const activeStruct = structures.find(s => s.id === activeId);

  useEffect(() => {
    if (activeId) {
      setIsLoadingComps(true);
      payrollApi.getComponents(activeId)
        .then(data => setComps(data))
        .catch(e => toast.error("Failed to load components"))
        .finally(() => setIsLoadingComps(false));
    } else {
      setComps([]);
    }
  }, [activeId]);

  const handleCreateStructure = async () => {
    try {
      const s = await payrollApi.createStructure({ name: newStructName, status: 'Draft' });
      setStructures([...structures, s]);
      setActiveId(s.id);
      setNewStructOpen(false);
      setNewStructName("");
      toast.success("Structure created!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!activeId) return;
    try {
      const updated = await payrollApi.updateStructure(activeId, { status });
      setStructures(strs => strs.map(s => s.id === activeId ? { ...s, status } : s));
      toast.success(`Structure marked as ${status}`);
    } catch (e: any) {
      toast.error("Failed to update status: " + e.message);
    }
  };

  const handleRename = async () => {
    if (!activeId) return;
    try {
      await payrollApi.updateStructure(activeId, { name: renameValue });
      setStructures(strs => strs.map(s => s.id === activeId ? { ...s, name: renameValue } : s));
      setRenameOpen(false);
      toast.success("Structure renamed successfully!");
    } catch (e: any) {
      toast.error("Failed to rename: " + e.message);
    }
  };

  const handleCreateComponent = async () => {
    try {
      setIsSubmitting(true);
      const res = await payrollApi.createSalaryComponent({
        structure: activeId,
        name: form.name,
        type: form.type,
        calc: form.calc,
        value: form.calc === 'Balancing' ? 0 : form.value,
        prorate: form.prorate
      });
      setComps(c => [...c, res]);
      setStructures(structures.map(s => s.id === activeId ? { ...s, components: [...(s.components || []), res] } : s));
      setOpen(false);
      setForm({ name: "New Component", type: "Earning", calc: "Fixed", value: 1000, prorate: true });
    } catch (e: any) {
      toast.error("Failed to add component: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComponent = async (id: any) => {
    try {
      await payrollApi.deleteSalaryComponent(id);
      setComps(cs => cs.filter(x => x.id !== id));
      toast.success("Component deleted");
    } catch (e: any) {
      toast.error("Failed to delete component: " + e.message);
    }
  };

  const monthlyGross = Math.round(ctc / 12);

  const calcMonthlyValue = (c: any, basicMonthly: number) => {
    if (c.name.toLowerCase().includes("income tax")) {
      const grossAnnual = ctc;
      let tax = 0;
      if (taxRegime === "Old") {
        const standardDeductionOld = 50000;
        const totalDeductions = (parseFloat(taxSavingDeductions) || 0) + standardDeductionOld;
        const oldTaxable = Math.max(0, grossAnnual - totalDeductions);
        
        const oldSlabs = [
          { limit: 250000, rate: 0.0 }, { limit: 500000, rate: 0.05 }, 
          { limit: 1000000, rate: 0.20 }, { limit: Infinity, rate: 0.30 }
        ];
        
        let remainingOld = oldTaxable;
        let prevLimit = 0;
        for (const slab of oldSlabs) {
          if (remainingOld <= 0) break;
          const taxableInSlab = Math.min(remainingOld, slab.limit - prevLimit);
          tax += taxableInSlab * slab.rate;
          remainingOld -= taxableInSlab;
          prevLimit = slab.limit;
        }
        
        // 87A rebate for Old Regime (up to 5L)
        if (oldTaxable <= 500000) {
          tax = Math.max(0, tax - 12500);
        }
      } else {
        const standardDeductionNew = 75000;
        const newTaxable = Math.max(0, grossAnnual - standardDeductionNew);
        const newSlabs = [
          { limit: 400000, rate: 0.0 }, { limit: 800000, rate: 0.05 }, { limit: 1200000, rate: 0.10 },
          { limit: 1600000, rate: 0.15 }, { limit: 2000000, rate: 0.20 }, { limit: 2400000, rate: 0.25 },
          { limit: 10000000, rate: 0.30 }, { limit: Infinity, rate: 0.45 }
        ];
        
        let remainingNew = newTaxable;
        let prevLimit = 0;
        for (const slab of newSlabs) {
          if (remainingNew <= 0) break;
          const taxableInSlab = Math.min(remainingNew, slab.limit - prevLimit);
          tax += taxableInSlab * slab.rate;
          remainingNew -= taxableInSlab;
          prevLimit = slab.limit;
        }
        
        // 87A rebate for New Regime (up to 12L taxable, which implies CTC around 12.75L)
        if (newTaxable <= 1200000) {
          tax = 0;
        }
      }
      
      // Health & Education Cess (4%)
      tax = Math.round(tax * 1.04);
      return Math.round(tax / 12);
    }
    if (c.calc === "Fixed") return Number(c.value);
    if (c.calc === "% of Basic") return Math.round((basicMonthly * Number(c.value)) / 100);
    if (c.calc === "% of CTC" || c.calc === "% of Gross") {
      return Math.round((ctc * Number(c.value)) / 100 / 12);
    }
    if (c.calc === "Formula" && c.formula) {
      const matchCTC = c.formula.match(/monthly_ctc\s*\*\s*([\d.]+)/);
      if (matchCTC) return Math.round((ctc / 12) * parseFloat(matchCTC[1]));
      if (!isNaN(Number(c.formula))) return Number(c.formula);
    }
    return 0;
  };

  // Find basic component to feed into "% of Basic" calculations
  const basicComp = comps.find(c => c.name.toLowerCase().includes("basic"));
  const basicMonthly = basicComp ? calcMonthlyValue(basicComp, 0) : Math.round((ctc * 0.4) / 12);

  let earnings = comps.filter(c => c.type === "Earning").map(c => ({ c, v: calcMonthlyValue(c, basicMonthly) }));

  // Handle Balancing
  const nonBalancingTotal = earnings.reduce((sum, item) => sum + item.v, 0);
  earnings = earnings.map(item => {
    if (item.c.calc === "Balancing") {
      return { ...item, v: Math.max(0, monthlyGross - nonBalancingTotal) };
    }
    return item;
  });

  const deductions = comps.filter(c => c.type === "Deduction").map(c => ({ c, v: calcMonthlyValue(c, basicMonthly) }));

  const totalEarn = earnings.reduce((s, x) => s + x.v, 0);
  const totalDed = deductions.reduce((s, x) => s + x.v, 0);
  const estimatedNet = totalEarn - totalDed;

  return (
    <>
      <PageHeader
        title="Salary Structure"
        description="Define reusable salary templates with earnings, deductions and statutory components."
        actions={
          <div className="flex gap-2">
            <Button variant="outline"><Files className="h-4 w-4 mr-2" /> Duplicate</Button>
            <Button onClick={() => setNewStructOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Structure</Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Left Sidebar */}
        <Card className="p-4 flex flex-col gap-3 min-h-[500px]">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Structures · {structures.length}
          </div>
          <div className="space-y-2">
            {structures.map(s => (
              <div
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${activeId === s.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card hover:bg-muted/50 border-transparent hover:border-border'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm">{s.name}</div>
                  <Badge variant={s.status === 'Active' ? 'default' : 'secondary'} className={s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none' : ''}>
                    {s.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {s.employee_count || 0}</span>
                  <span>₹ -- LPA</span>
                </div>
              </div>
            ))}
            {structures.length === 0 && (
              <div className="text-center p-6 text-sm text-muted-foreground border border-dashed rounded-xl">
                No templates yet. Create one!
              </div>
            )}
          </div>
        </Card>

        {/* Main Content */}
        {activeStruct ? (
          <Card className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Editing</div>
                <h2 className="text-2xl font-bold tracking-tight">{activeStruct.name}</h2>
                <div className="text-sm text-muted-foreground mt-1">Effective from 01 Apr 2026 · INR · {activeStruct.employee_count || 0} employees assigned</div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setRenameValue(activeStruct.name); setRenameOpen(true); }}><Edit2 className="h-4 w-4 mr-2" /> Rename</Button>
                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('Draft')} disabled={activeStruct.status === 'Draft'}>Save as Draft</Button>
                <Button size="sm" className="bg-slate-900" onClick={() => handleUpdateStatus('Active')} disabled={activeStruct.status === 'Active'}>Publish</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Annual CTC</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input type="number" className="pl-7 bg-muted/30 font-medium text-lg" value={ctc} onChange={e => setCtc(+e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tax Regime</Label>
                <Select value={taxRegime} onValueChange={setTaxRegime}>
                  <SelectTrigger className="bg-muted/30 font-medium h-10 border-input shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New Regime</SelectItem>
                    <SelectItem value="Old">Old Regime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tax Savings</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7 bg-muted/30 font-medium text-lg disabled:opacity-50" 
                    value={taxSavingDeductions} 
                    onChange={e => setTaxSavingDeductions(e.target.value)} 
                    disabled={taxRegime === 'New'} 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Monthly Gross</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input readOnly className="pl-7 bg-muted/30 font-medium text-lg border-transparent" value={monthlyGross.toLocaleString('en-IN')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Estimated Net</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input readOnly className="pl-7 bg-muted/30 font-medium text-lg border-transparent" value={estimatedNet.toLocaleString('en-IN')} />
                </div>
              </div>
            </div>

            <Tabs defaultValue="earnings" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto bg-transparent space-x-6">
                <TabsTrigger value="earnings" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 text-sm data-[state=active]:shadow-none data-[state=active]:bg-transparent">Earnings</TabsTrigger>
                <TabsTrigger value="deductions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 text-sm data-[state=active]:shadow-none data-[state=active]:bg-transparent">Deductions</TabsTrigger>
                <TabsTrigger value="employer" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 text-sm data-[state=active]:shadow-none data-[state=active]:bg-transparent">Employer</TabsTrigger>
              </TabsList>

              <TabsContent value="earnings" className="pt-6">
                <div className="border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-4 p-4 border-b bg-muted/30 text-xs font-semibold text-muted-foreground tracking-wider">
                    <div>COMPONENT</div>
                    <div>CALCULATION</div>
                    <div>MONTHLY</div>
                    <div>TAXABLE</div>
                    <div></div>
                  </div>
                  <div className="divide-y">
                    {earnings.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">No earning components configured.</div>
                    ) : earnings.map(({ c, v }) => (
                      <div key={c.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-4 p-4 items-center text-sm group">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-muted-foreground">{c.calc === 'Fixed' ? `Fixed · ₹ ${Number(c.value).toLocaleString('en-IN')}/mo` : c.calc === 'Formula' ? `Formula · ${c.formula}` : `${c.calc} · ${c.value}%`}</div>
                        <div className="font-semibold">{fmtINR(v)}</div>
                        <div><Badge variant="secondary" className="bg-slate-100 text-slate-600 shadow-none hover:bg-slate-200">Taxable</Badge></div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteComponent(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t bg-muted/10 flex justify-between items-center">
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => { setForm({ ...form, type: 'Earning' }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add component</Button>
                    <div className="flex items-center text-xs text-emerald-600 font-medium"><CheckCircle2 className="h-3 w-3 mr-1" /> Balances to {fmtINR(monthlyGross)} / mo</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="deductions" className="pt-6">
                <div className="border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-4 p-4 border-b bg-muted/30 text-xs font-semibold text-muted-foreground tracking-wider">
                    <div>COMPONENT</div>
                    <div>CALCULATION</div>
                    <div>MONTHLY</div>
                    <div>TAXABLE</div>
                    <div></div>
                  </div>
                  <div className="divide-y">
                    {deductions.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">No deduction components configured.</div>
                    ) : deductions.map(({ c, v }) => (
                      <div key={c.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_50px] gap-4 p-4 items-center text-sm group">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-muted-foreground">{c.calc === 'Fixed' ? `Fixed · ₹ ${Number(c.value).toLocaleString('en-IN')}/mo` : c.calc === 'Formula' ? `Formula · ${c.formula}` : `${c.calc} · ${c.value}%`}</div>
                        <div className="font-semibold text-destructive">-{fmtINR(v)}</div>
                        <div><Badge variant="secondary" className="bg-slate-100 text-slate-600 shadow-none hover:bg-slate-200">Pre-Tax</Badge></div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteComponent(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t bg-muted/10 flex justify-start items-center">
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => { setForm({ ...form, type: 'Deduction' }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add component</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="employer" className="pt-6">
                <div className="p-8 text-center text-muted-foreground text-sm border border-dashed rounded-xl">Employer contributions (PF, ESI) are configured automatically based on compliance settings.</div>
              </TabsContent>
            </Tabs>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-[500px] border border-dashed rounded-xl text-muted-foreground">
            Select or create a template from the sidebar to start configuring.
          </div>
        )}
      </div>

      {/* New Structure Dialog */}
      <Dialog open={newStructOpen} onOpenChange={setNewStructOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Salary Template</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input placeholder="e.g. Engineering L4" value={newStructName} onChange={e => setNewStructName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewStructOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateStructure} disabled={!newStructName.trim()}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Structure Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Structure</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Structure Name</Label>
              <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Component Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add {form.type} Component</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Component Name</Label>
              <Input placeholder="e.g. House Rent Allowance" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Calculation Method</Label>
              <Select value={form.calc} onValueChange={v => setForm({ ...form, calc: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">Fixed Amount / year</SelectItem>
                  <SelectItem value="% of Basic">% of Basic</SelectItem>
                  <SelectItem value="% of CTC">% of CTC</SelectItem>
                  <SelectItem value="Balancing">Balancing (Remaining value)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.calc !== "Balancing" && (
              <div className="space-y-1.5">
                <Label>Value</Label>
                <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: +e.target.value })} />
              </div>
            )}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="prorate" checked={form.prorate} onCheckedChange={(checked) => setForm({ ...form, prorate: checked === true })} />
              <Label htmlFor="prorate" className="text-sm font-normal">Prorate based on attendance</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreateComponent} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Add Component"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
