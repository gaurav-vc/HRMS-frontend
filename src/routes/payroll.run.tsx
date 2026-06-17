import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PlayCircle, CheckCircle2, AlertCircle, Sparkles, Rocket, ArrowLeft, ArrowRight, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { employees, payrollRuns } = db();
  const last = payrollRuns[payrollRuns.length - 1];
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [pct, setPct] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "running") return;
    const messages = [
      "Locking attendance cutoff…", "Validating master data for 48 employees…",
      "Applying salary structures…", "Computing earnings & deductions…",
      "Processing loan EMI recoveries…", "Settling approved reimbursements…",
      "Calculating PF, ESI, PT, TDS…", "Generating 48 payslips…",
      "Posting JV to finance…", "Preparing bank transfer file…",
    ];
    let i = 0;
    const t = setInterval(() => {
      i++;
      setLogs(l => [...l, messages[i-1]]);
      setPct(Math.min(100, i * 10));
      if (i >= messages.length) { clearInterval(t); setPhase("done"); toast.success("Payroll processed successfully"); }
    }, 350);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [logs]);

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 mt-4">
      <Card className="p-8 shadow-[var(--shadow-elegant)]" style={{ background: phase === "done" ? "linear-gradient(135deg, oklch(0.95 0.05 152), oklch(0.97 0.02 200))" : undefined }}>
        <div className="text-xs uppercase tracking-widest text-primary mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> CEO mode</div>
        <h2 className="text-3xl font-semibold">Process the full June payroll<br/>with one click.</h2>
        <p className="text-muted-foreground mt-2">{employees.length} employees • Estimated net pay {fmtINR(last.net)}</p>

        {phase === "idle" && (
          <Button size="lg" className="mt-6 h-14 text-base px-8 gap-2" onClick={() => { setPhase("running"); setPct(0); setLogs([]); }}>
            <Rocket className="h-5 w-5" />Run Payroll Now
          </Button>
        )}
        {phase === "running" && (
          <div className="mt-6 space-y-3">
            <Progress value={pct} className="h-3" />
            <div className="text-sm text-muted-foreground">{pct}% complete — please don't close this tab</div>
          </div>
        )}
        {phase === "done" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-success"><CheckCircle2 className="h-8 w-8" /><div><div className="font-semibold">Payroll complete</div><div className="text-xs text-muted-foreground">Bank file generated • 48 payslips emailed</div></div></div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Gross" value={fmtINR(last.gross)} /><Stat label="Deductions" value={fmtINR(last.deductions)} /><Stat label="Net" value={fmtINR(last.net)} tone="success" />
            </div>
            <div className="flex gap-2">
              <Link to="/payroll/slips"><Button variant="outline">View Payslips</Button></Link>
              <Button variant="outline" onClick={() => toast.success("Bank file downloaded: NEFT_JUN26.csv")}>Download Bank File</Button>
              <Button onClick={() => { setPhase("idle"); setLogs([]); setPct(0); }}>Done</Button>
            </div>
          </div>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Live execution log</h3>
        <div ref={ref} className="h-80 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs space-y-1">
          {logs.length === 0 && <div className="text-muted-foreground">Click "Run Payroll Now" to start…</div>}
          {logs.map((l, i) => (
            <div key={i} className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" /><span>{l}</span></div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function WizardPanel() {
  const [step, setStep] = useState(0);
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
          <div className="space-y-3"><h3 className="font-semibold">Lock attendance cutoff for June 2026</h3>
            <p className="text-sm text-muted-foreground">Locks any further attendance edits for the period.</p>
            <ul className="text-sm space-y-1"><li>• Cutoff date: 25 Jun 2026</li><li>• Late submissions after lock require regularization</li></ul></div>
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
          <div className="space-y-3"><h3 className="font-semibold">Review summary</h3>
            <div className="grid sm:grid-cols-3 gap-3"><Stat label="Gross" value={fmtINR(28500000)} /><Stat label="Deductions" value={fmtINR(4200000)} /><Stat label="Net" value={fmtINR(24300000)} tone="success" /></div></div>
        )}
        {step === 4 && (
          <div className="space-y-3"><h3 className="font-semibold">Approve & disburse</h3>
            <p className="text-sm text-muted-foreground">CFO/CEO approval is required before disbursement.</p>
            <div className="flex gap-2"><Button onClick={() => toast.success("Approved")}>Approve</Button><Button variant="outline" onClick={() => toast.success("Bank file generated")}>Download Bank File</Button></div></div>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button disabled={step === STEPS.length - 1} onClick={() => setStep(s => s + 1)}>Next<ArrowRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return <div className="p-3 rounded-md border"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-lg font-semibold ${tone === "success" ? "text-success" : ""}`}>{value}</div></div>;
}
