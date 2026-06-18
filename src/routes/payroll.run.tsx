import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PlayCircle, CheckCircle2, AlertCircle, Sparkles, Rocket, ArrowLeft, ArrowRight, FileCheck2, CalendarRange, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { db, fmtINR } from "@/lib/mock-data";

export const Route = createFileRoute("/payroll/run")({ component: RunPage });

const STEPS = ["Cutoff", "Validate Inputs", "Calculate", "Review", "Approve & Disburse"];

function RunPage() {
  return (
    <>
      <PageHeader title="Run Payroll — June 2026" description="One-click CEO mode or step-by-step HR wizard"
        actions={<Link to="/payroll"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>} />
      <Tabs defaultValue="oneclick">
        <TabsList><TabsTrigger value="oneclick"><Sparkles className="h-3.5 w-3.5 mr-1" />CEO One-Click</TabsTrigger><TabsTrigger value="wizard"><FileCheck2 className="h-3.5 w-3.5 mr-1" />HR Wizard</TabsTrigger></TabsList>
        <TabsContent value="oneclick"><OneClickPanel /></TabsContent>
        <TabsContent value="wizard"><WizardPanel /></TabsContent>
      </Tabs>
    </>
  );
}

function OneClickPanel() {
  const { employees, payrollRuns, entities } = db();
  const last = payrollRuns[payrollRuns.length - 1];
  const [phase, setPhase] = useState<"setup" | "confirm" | "running" | "done">("setup");
  const [pct, setPct] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState("2026-06");
  const [cutoff, setCutoff] = useState("2026-06-25");
  const [entity, setEntity] = useState<string>("__all__");
  const [includeReimb, setIncludeReimb] = useState(true);
  const [includeLoans, setIncludeLoans] = useState(true);
  const [includeBonus, setIncludeBonus] = useState(false);

  useEffect(() => {
    if (phase !== "running") return;
    const messages = [
      `Locking attendance cutoff at ${cutoff}…`, `Validating master data for ${employees.length} employees…`,
      "Applying salary structures…", "Computing earnings & deductions…",
      includeLoans ? "Processing loan EMI recoveries…" : "Skipping loan recoveries…",
      includeReimb ? "Settling approved reimbursements…" : "Skipping reimbursements…",
      includeBonus ? "Applying variable bonus pay…" : "No bonus payouts for this run…",
      "Calculating PF, ESI, PT, TDS…", `Generating ${employees.length} payslips…`,
      "Posting JV to finance…", "Preparing NEFT bank file…",
    ];
    let i = 0;
    const t = setInterval(() => {
      i++;
      setLogs(l => [...l, messages[i-1]]);
      setPct(Math.min(100, Math.round((i / messages.length) * 100)));
      if (i >= messages.length) { clearInterval(t); setPhase("done"); toast.success("Payroll processed successfully"); }
    }, 320);
    return () => clearInterval(t);
  }, [phase, cutoff, employees.length, includeBonus, includeLoans, includeReimb]);

  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [logs]);

  const empCount = entity === "__all__" ? employees.length : employees.filter(e => e.entityId === entity).length;
  const grossEst = Math.round(last.gross * (empCount / employees.length));
  const dedEst = Math.round(last.deductions * (empCount / employees.length));
  const netEst = grossEst - dedEst;

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 mt-4">
      <Card className="p-8 shadow-[var(--shadow-elegant)]" style={{ background: phase === "done" ? "linear-gradient(135deg, oklch(0.95 0.05 152), oklch(0.97 0.02 200))" : undefined }}>
        <div className="text-xs uppercase tracking-widest text-primary mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> CEO mode</div>
        <h2 className="text-3xl font-semibold leading-tight">Process the full payroll<br/>with one click.</h2>
        <p className="text-muted-foreground mt-2">{empCount} employees • Estimated net pay {fmtINR(netEst)}</p>

        {phase === "setup" && (
          <div className="mt-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Pay Period</Label>
                <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                  {["2026-04","2026-05","2026-06","2026-07"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent></Select>
              </div>
              <div><Label className="text-xs">Attendance Cutoff Date</Label>
                <div className="relative"><CalendarRange className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input type="date" value={cutoff} onChange={e => setCutoff(e.target.value)} className="pl-8" /></div>
              </div>
              <div className="sm:col-span-2"><Label className="text-xs">Entity</Label>
                <Select value={entity} onValueChange={setEntity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="__all__">All entities ({employees.length} employees)</SelectItem>
                  {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({employees.filter(emp => emp.entityId === e.id).length})</SelectItem>)}
                </SelectContent></Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer"><Checkbox checked={includeReimb} onCheckedChange={v => setIncludeReimb(!!v)} />Reimbursements</label>
              <label className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer"><Checkbox checked={includeLoans} onCheckedChange={v => setIncludeLoans(!!v)} />Loan EMIs</label>
              <label className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer"><Checkbox checked={includeBonus} onCheckedChange={v => setIncludeBonus(!!v)} />Variable Bonus</label>
            </div>
            <Button size="lg" className="h-14 text-base px-8 gap-2 w-full sm:w-auto" onClick={() => setPhase("confirm")}>
              <Rocket className="h-5 w-5" />Review & Run Payroll
            </Button>
          </div>
        )}
        {phase === "running" && (
          <div className="mt-6 space-y-3">
            <Progress value={pct} className="h-3" />
            <div className="text-sm text-muted-foreground">{pct}% complete — please don't close this tab</div>
          </div>
        )}
        {phase === "done" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-success"><CheckCircle2 className="h-8 w-8" /><div><div className="font-semibold">Payroll complete</div><div className="text-xs text-muted-foreground">Bank file generated • {empCount} payslips emailed</div></div></div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Gross" value={fmtINR(grossEst)} /><Stat label="Deductions" value={fmtINR(dedEst)} /><Stat label="Net" value={fmtINR(netEst)} tone="success" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/payroll/slips"><Button variant="outline">View Payslips</Button></Link>
              <Button variant="outline" onClick={() => toast.success(`Bank file downloaded: NEFT_${period}.csv`)}>Download Bank File</Button>
              <Button onClick={() => { setPhase("setup"); setLogs([]); setPct(0); }}>Done</Button>
            </div>
          </div>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Live execution log</h3>
        <div ref={ref} className="h-80 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs space-y-1">
          {logs.length === 0 && <div className="text-muted-foreground">Run hasn't started yet…</div>}
          {logs.map((l, i) => (
            <div key={i} className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" /><span>{l}</span></div>
          ))}
        </div>
      </Card>

      <Dialog open={phase === "confirm"} onOpenChange={o => !o && setPhase("setup")}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Final confirmation</DialogTitle>
            <DialogDescription>Please review carefully. This action cannot be undone once funds are disbursed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <ConfirmRow label="Pay period" value={period} />
            <ConfirmRow label="Attendance cutoff" value={cutoff} />
            <ConfirmRow label="Entity scope" value={entity === "__all__" ? "All entities" : entities.find(e => e.id === entity)?.name || ""} />
            <ConfirmRow label="Employees" value={`${empCount}`} />
            <ConfirmRow label="Includes" value={[includeReimb && "Reimbursements", includeLoans && "Loan EMIs", includeBonus && "Variable Bonus"].filter(Boolean).join(", ") || "Base pay only"} />
            <div className="grid grid-cols-3 gap-2 pt-3 border-t mt-3">
              <Stat label="Gross" value={fmtINR(grossEst)} />
              <Stat label="Deductions" value={fmtINR(dedEst)} />
              <Stat label="Net Payout" value={fmtINR(netEst)} tone="success" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhase("setup")}>Cancel</Button>
            <Button onClick={() => { setPhase("running"); setPct(0); setLogs([]); }} className="gap-2"><Rocket className="h-4 w-4" />Run Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm py-1.5 border-b last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function WizardPanel() {
  const [step, setStep] = useState(0);
  const [cutoff, setCutoff] = useState("2026-06-25");
  const [period, setPeriod] = useState("2026-06");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approved, setApproved] = useState(false);

  return (
    <Card className="p-6 mt-4">
      <ol className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
        {STEPS.map((s, i) => (
          <li key={s} className={`p-3 rounded-md border ${i < step ? "bg-success/10 border-success/30" : i === step ? "bg-primary text-primary-foreground border-primary" : "bg-muted"}`}>
            <div className="text-[10px] uppercase opacity-80">Step {i+1}</div><div className="text-sm font-medium">{s}</div>
          </li>
        ))}
      </ol>

      <div className="min-h-[280px]">
        {step === 0 && (
          <div className="space-y-3 max-w-md"><h3 className="font-semibold">Lock attendance cutoff</h3>
            <p className="text-sm text-muted-foreground">No further attendance edits are allowed after the cutoff. Late submissions require regularization.</p>
            <div><Label className="text-xs">Pay Period</Label>
              <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {["2026-04","2026-05","2026-06","2026-07"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent></Select>
            </div>
            <div><Label className="text-xs">Cutoff Date</Label><Input type="date" value={cutoff} onChange={e => setCutoff(e.target.value)} /></div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3"><h3 className="font-semibold">Validate inputs</h3>
            <div className="grid sm:grid-cols-3 gap-3">{[["Master data","48/48 valid","success"],["Attendance","100%","success"],["Variable pay","12 pending","warning"]].map(([l,v,t]) => (
              <div key={l} className={`p-3 rounded-md border ${t === "warning" ? "border-warning/40 bg-warning/10" : "border-success/40 bg-success/10"}`}>
                <div className="text-xs text-muted-foreground">{l}</div><div className="font-semibold">{v}</div>
                {t === "warning" ? <AlertCircle className="h-4 w-4 mt-1 text-warning-foreground" /> : <CheckCircle2 className="h-4 w-4 mt-1 text-success" />}
              </div>))}</div></div>
        )}
        {step === 2 && (
          <div className="space-y-3"><h3 className="font-semibold">Calculate payroll</h3>
            <p className="text-sm text-muted-foreground">Engine will run salary structure, attendance LOP, loan EMI, reimbursements, statutory deductions and TDS.</p>
            <Button onClick={() => { toast.success("Calculation complete"); }}><PlayCircle className="h-4 w-4 mr-1" />Run Engine</Button></div>
        )}
        {step === 3 && (
          <div className="space-y-3"><h3 className="font-semibold">Review summary — {period}</h3>
            <div className="grid sm:grid-cols-3 gap-3"><Stat label="Gross" value={fmtINR(28500000)} /><Stat label="Deductions" value={fmtINR(4200000)} /><Stat label="Net" value={fmtINR(24300000)} tone="success" /></div>
            <p className="text-xs text-muted-foreground">Cutoff locked at {cutoff}. 48 payslips generated and ready for approval.</p>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3"><h3 className="font-semibold">Approve & disburse</h3>
            <p className="text-sm text-muted-foreground">CFO/CEO approval is required before disbursement.</p>
            {approved ? (
              <div className="p-4 rounded-md border bg-success/10 border-success/30 flex items-center gap-3"><CheckCircle2 className="h-6 w-6 text-success" /><div><div className="font-semibold">Approved & disbursed</div><div className="text-xs text-muted-foreground">Bank file NEFT_{period}.csv generated</div></div></div>
            ) : (
              <Button onClick={() => setConfirmOpen(true)}><ShieldCheck className="h-4 w-4 mr-1" />Approve & Disburse</Button>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button disabled={step === STEPS.length - 1} onClick={() => setStep(s => s + 1)}>Next<ArrowRight className="h-4 w-4 ml-1" /></Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm payroll approval</DialogTitle>
            <DialogDescription>You're approving disbursement of {fmtINR(24300000)} for {period}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <ConfirmRow label="Period" value={period} />
            <ConfirmRow label="Cutoff" value={cutoff} />
            <ConfirmRow label="Employees" value="48" />
            <ConfirmRow label="Net payout" value={fmtINR(24300000)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setApproved(true); setConfirmOpen(false); toast.success("Payroll approved and disbursed"); }}>Confirm Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return <div className="p-3 rounded-md border"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-lg font-semibold ${tone === "success" ? "text-success" : ""}`}>{value}</div></div>;
}
