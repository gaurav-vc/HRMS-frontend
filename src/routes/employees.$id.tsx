import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, Building2, Calendar, FileText, Landmark, MapPin, Phone, Upload, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, fmtINR, empName } from "@/lib/mock-data";

export const Route = createFileRoute("/employees/$id")({
  component: EmployeeDetail,
  loader: ({ params }) => {
    const e = db().employees.find(x => x.id === params.id);
    if (!e) throw notFound();
    return { id: params.id };
  },
  notFoundComponent: () => <div className="p-8 text-center"><p>Employee not found.</p><Link to="/employees" className="text-primary underline">Back to list</Link></div>,
});

function EmployeeDetail() {
  const { id } = Route.useLoaderData();
  const { employees, departments, designations, branches, sites, entities } = db();
  const e = employees.find(x => x.id === id)!;
  const dept = departments.find(d => d.id === e.departmentId);
  const desg = designations.find(d => d.id === e.designationId);
  const branch = branches.find(b => b.id === e.branchId);
  const site = sites.find(s => s.id === e.siteId);
  const entity = entities.find(en => en.id === e.entityId);

  return (
    <div className="space-y-6">
      <Link to="/employees" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5 mr-1" />Back to Employees</Link>

      <Card className="p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start gap-6">
          <Avatar className="h-20 w-20"><AvatarFallback className="text-2xl bg-primary/10 text-primary">{e.firstName[0]}{e.lastName[0]}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{e.firstName} {e.lastName}</h1>
              <Badge className={e.status === "Active" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>{e.status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{desg?.title} • {dept?.name} • {entity?.name}</p>
            <div className="flex flex-wrap gap-4 text-sm mt-3 text-muted-foreground">
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{e.phone}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{branch?.name}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joined {e.doj}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs uppercase text-muted-foreground">Annual CTC</div>
            <div className="text-2xl font-semibold text-primary">{fmtINR(e.ctc)}</div>
            <div className="text-xs text-muted-foreground">Code: {e.code}</div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full md:w-auto">
          <TabsTrigger value="personal"><User className="h-3.5 w-3.5 mr-1" />Personal</TabsTrigger>
          <TabsTrigger value="employment"><Briefcase className="h-3.5 w-3.5 mr-1" />Employment</TabsTrigger>
          <TabsTrigger value="bank"><Landmark className="h-3.5 w-3.5 mr-1" />Bank</TabsTrigger>
          <TabsTrigger value="statutory"><FileText className="h-3.5 w-3.5 mr-1" />Statutory</TabsTrigger>
          <TabsTrigger value="documents"><Upload className="h-3.5 w-3.5 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="manager">Manager</TabsTrigger>
          <TabsTrigger value="location"><Building2 className="h-3.5 w-3.5 mr-1" />Location</TabsTrigger>
          <TabsTrigger value="site"><MapPin className="h-3.5 w-3.5 mr-1" />Site</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="First Name" value={e.firstName} />
            <FieldRO label="Last Name" value={e.lastName} />
            <FieldRO label="Email" value={e.email} />
            <FieldRO label="Phone" value={e.phone} />
            <FieldRO label="Date of Birth" value={e.dob} />
            <FieldRO label="Gender" value={e.gender} />
            <div className="sm:col-span-2"><FieldRO label="Address" value={e.address} /></div>
          </Card>
        </TabsContent>
        <TabsContent value="employment">
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="Employee Code" value={e.code} />
            <FieldRO label="Date of Joining" value={e.doj} />
            <FieldRO label="Entity" value={entity?.name ?? "—"} />
            <FieldRO label="Department" value={dept?.name ?? "—"} />
            <FieldRO label="Designation" value={desg?.title ?? "—"} />
            <FieldRO label="Grade" value={desg?.grade ?? "—"} />
            <FieldRO label="Reporting Manager" value={empName(e.managerId)} />
            <FieldRO label="Annual CTC" value={fmtINR(e.ctc)} />
          </Card>
        </TabsContent>
        <TabsContent value="bank">
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="Bank" value={e.bankName} />
            <FieldRO label="Account Number" value={e.bankAccount} />
            <FieldRO label="IFSC" value={e.ifsc} />
          </Card>
        </TabsContent>
        <TabsContent value="statutory">
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="PAN" value={e.pan} />
            <FieldRO label="Aadhaar" value={e.aadhaar} />
            <FieldRO label="UAN (PF)" value={e.uan} />
            <FieldRO label="ESI Number" value={e.esi} />
          </Card>
        </TabsContent>
        <TabsContent value="documents">
          <Card className="p-6">
            <div className="grid sm:grid-cols-3 gap-3">
              {["Offer Letter","Aadhaar Card","PAN Card","Bank Passbook","Previous Form 16","Address Proof"].map(d => (
                <div key={d} className="p-4 rounded-md border flex items-center justify-between"><div><div className="text-sm font-medium">{d}</div><div className="text-xs text-muted-foreground">Uploaded</div></div><Button size="sm" variant="outline">View</Button></div>
              ))}
            </div>
            <Button className="mt-4"><Upload className="h-4 w-4 mr-1" />Upload Document</Button>
          </Card>
        </TabsContent>
        <TabsContent value="manager">
          <Card className="p-6 space-y-3">
            <FieldRO label="Reporting Manager" value={empName(e.managerId)} />
            <div className="space-y-1.5"><Label>Reassign Manager</Label><Input placeholder="Search by name or code…" /></div>
            <Button>Save Manager Assignment</Button>
          </Card>
        </TabsContent>
        <TabsContent value="location">
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="Entity" value={entity?.name ?? "—"} />
            <FieldRO label="Branch" value={branch?.name ?? "—"} />
            <FieldRO label="Branch City" value={`${branch?.city ?? ""}, ${branch?.state ?? ""}`} />
          </Card>
        </TabsContent>
        <TabsContent value="site">
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <FieldRO label="Site" value={site?.name ?? "—"} />
            <FieldRO label="Address" value={site?.address ?? "—"} />
            <FieldRO label="Geo-fence" value={`${site?.radius}m radius`} />
            <FieldRO label="Coordinates" value={`${site?.latitude.toFixed(4)}, ${site?.longitude.toFixed(4)}`} />
            <FieldRO label="QR Enabled" value={site?.qrEnabled ? "Yes" : "No"} />
            <FieldRO label="Face Verification" value={site?.faceEnabled ? "Yes" : "No"} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FieldRO({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div><div className="text-sm font-medium mt-0.5">{value}</div></div>;
}
