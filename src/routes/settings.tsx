import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Organisation, payroll, attendance and notification preferences" />
      <Tabs defaultValue="org">
        <TabsList><TabsTrigger value="org">Organisation</TabsTrigger><TabsTrigger value="pay">Payroll</TabsTrigger><TabsTrigger value="att">Attendance</TabsTrigger><TabsTrigger value="notif">Notifications</TabsTrigger><TabsTrigger value="roles">Roles</TabsTrigger></TabsList>

        <TabsContent value="org"><Card className="p-6 grid sm:grid-cols-2 gap-4">
          <Field label="Legal Name" defaultValue="Acme Technologies Pvt Ltd" />
          <Field label="Display Name" defaultValue="Acme" />
          <Field label="Default Currency" defaultValue="INR" />
          <Field label="Fiscal Year Start" defaultValue="April" />
          <div className="sm:col-span-2"><Button onClick={() => toast.success("Saved")}>Save Changes</Button></div>
        </Card></TabsContent>

        <TabsContent value="pay"><Card className="p-6 space-y-4">
          <Toggle label="Auto-process payroll on cutoff date" />
          <Toggle label="Round net pay to nearest ₹1" defaultChecked />
          <Toggle label="Block payroll if attendance < 95%" defaultChecked />
          <Field label="Pay Day" defaultValue="28" />
          <Field label="Bank File Format" defaultValue="HDFC NEFT" />
          <Button onClick={() => toast.success("Saved")}>Save</Button>
        </Card></TabsContent>

        <TabsContent value="att"><Card className="p-6 space-y-4">
          <Toggle label="Require GPS for all punches" defaultChecked />
          <Toggle label="Enable face verification globally" defaultChecked />
          <Toggle label="QR token rotation every 30s" defaultChecked />
          <Field label="Late mark after" defaultValue="09:30 AM" />
          <Field label="Half day threshold" defaultValue="4 hours" />
          <Button onClick={() => toast.success("Saved")}>Save</Button>
        </Card></TabsContent>

        <TabsContent value="notif"><Card className="p-6 space-y-4">
          <Toggle label="Email payslips automatically" defaultChecked />
          <Toggle label="WhatsApp approvals to managers" />
          <Toggle label="Daily attendance digest to HR" defaultChecked />
          <Button onClick={() => toast.success("Saved")}>Save</Button>
        </Card></TabsContent>

        <TabsContent value="roles"><Card className="p-6 space-y-3">
          {["Super Admin","Group HR","Entity HR","Payroll Admin","Manager","Employee"].map(r => (
            <div key={r} className="flex items-center justify-between p-3 rounded-md border"><span className="font-medium">{r}</span><Button size="sm" variant="outline" onClick={() => toast.info(`Editing ${r} permissions`)}>Configure permissions</Button></div>
          ))}
        </Card></TabsContent>
      </Tabs>
    </>
  );
}
function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input defaultValue={defaultValue} /></div>;
}
function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return <div className="flex items-center justify-between p-3 rounded-md border"><Label>{label}</Label><Switch defaultChecked={defaultChecked} /></div>;
}
