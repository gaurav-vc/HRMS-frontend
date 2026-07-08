import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, Fragment } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, ChevronDown, Check, Info } from "lucide-react";
import { rolesApi, employeesApi, departmentsApi, orgEngineApi, entitiesApi, sitesApi, attendancePoliciesApi, leavesConfigApi } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Organisation, payroll, attendance, notifications, and user roles" />
      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organisation</TabsTrigger>
          <TabsTrigger value="pay">Payroll</TabsTrigger>
          <TabsTrigger value="att">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="notif">Notifications</TabsTrigger>
          <TabsTrigger value="roles">Roles & Users</TabsTrigger>
          <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <Card className="p-6 grid sm:grid-cols-2 gap-4">
            <Field label="Legal Name" defaultValue="Acme Technologies Pvt Ltd" />
            <Field label="Display Name" defaultValue="Acme" />
            <Field label="Default Currency" defaultValue="INR" />
            <Field label="Fiscal Year Start" defaultValue="April" />
            <div className="sm:col-span-2"><Button onClick={() => toast.success("Saved")}>Save Changes</Button></div>
          </Card>
        </TabsContent>

        <TabsContent value="pay">
          <Card className="p-6 space-y-4">
            <Toggle label="Auto-process payroll on cutoff date" />
            <Toggle label="Round net pay to nearest ₹1" defaultChecked />
            <Toggle label="Block payroll if attendance < 95%" defaultChecked />
            <Field label="Pay Day" defaultValue="28" />
            <Field label="Bank File Format" defaultValue="HDFC NEFT" />
            <Button onClick={() => toast.success("Saved")}>Save</Button>
          </Card>
        </TabsContent>

        <TabsContent value="att">
          <Card className="p-6 mt-4 border shadow-sm rounded-lg">
             <AttendanceSettingsTab />
          </Card>
        </TabsContent>

        <TabsContent value="leaves">
          <Card className="p-6 mt-4 border shadow-sm rounded-lg">
             <LeaveSettingsTab />
          </Card>
        </TabsContent>

        <TabsContent value="notif">
          <Card className="p-6 space-y-4">
            <Toggle label="Email payslips automatically" defaultChecked />
            <Toggle label="WhatsApp approvals to managers" />
            <Toggle label="Daily attendance digest to HR" defaultChecked />
            <Button onClick={() => toast.success("Saved")}>Save</Button>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card className="p-6 mt-4">
             <UsersAndRolesTab />
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card className="p-6 mt-4 border shadow-sm rounded-lg">
             <RolePermissionsTab />
          </Card>
        </TabsContent>

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

// ---------------------------------------------------------------------------------
// USERS & ROLES COMPONENTS
// ---------------------------------------------------------------------------------

function UsersAndRolesTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [nodeTypes, setNodeTypes] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("roles");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [r, e, d, nt] = await Promise.all([
        rolesApi.getAll(),
        employeesApi.getAll(),
        departmentsApi.getAll(),
        orgEngineApi.getNodeTypes()
      ]);
      setRoles(r);
      setEmployees(e);
      setDepartments(d);
      setNodeTypes(nt);
    } catch (e) {
      toast.error("Failed to load setup data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openRoleModal = (role: any = null) => {
    setEditingRole(role);
    setRoleModalOpen(true);
  };

  const deleteRole = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this role? This will also remove it from the Organization Tree.")) return;
    try {
      await rolesApi.delete(id);
      toast.success("Role deleted");
      fetchAll();
    } catch (e) {
      toast.error("Failed to delete role");
    }
  };

  const openUserModal = (user: any = null) => {
    setEditingUser(user);
    setUserModalOpen(true);
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user? This will also remove them from the Organization Tree.")) return;
    try {
      await employeesApi.delete(id);
      toast.success("User deleted");
      fetchAll();
    } catch (e) {
      toast.error("Failed to delete user");
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 bg-background" />
        </div>
        {activeTab === "roles" && (
          <>
            <Button onClick={() => openRoleModal(null)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Add Role
            </Button>
            <Dialog open={roleModalOpen} onOpenChange={(open) => {
              if (!open) setEditingRole(null);
              setRoleModalOpen(open);
            }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingRole ? "Edit Role" : "New Role"}</DialogTitle>
                  <DialogDescription>Fields are linked to keep your hierarchy consistent.</DialogDescription>
                </DialogHeader>
                <RoleForm departments={departments} roles={roles} nodeTypes={nodeTypes} initialData={editingRole} onClose={() => { setRoleModalOpen(false); setEditingRole(null); fetchAll(); }} />
              </DialogContent>
            </Dialog>
          </>
        )}
        {activeTab === "users" && (
          <>
            <Button onClick={() => openUserModal(null)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Add User
            </Button>
            <Dialog open={userModalOpen} onOpenChange={(open) => {
              if (!open) setEditingUser(null);
              setUserModalOpen(open);
            }}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Edit User" : "New User"}</DialogTitle>
                  <DialogDescription>Fields are linked to keep your hierarchy consistent.</DialogDescription>
                </DialogHeader>
                <UserForm departments={departments} roles={roles} nodeTypes={nodeTypes} initialData={editingUser} onClose={() => { setUserModalOpen(false); setEditingUser(null); fetchAll(); }} />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-6">
          <TabsTrigger value="roles" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none bg-transparent px-0 pb-3 pt-2">
            Roles <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/10">{roles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none bg-transparent px-0 pb-3 pt-2">
            Users <Badge variant="secondary" className="ml-2">{employees.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <Card className="border shadow-sm rounded-lg overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_120px] gap-4 py-3 px-4 border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
              <div>Role</div>
              <div>Department</div>
              <div>Level</div>
              <div>Reporting</div>
              <div>Access Scope</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y">
              {roles.map(r => (
                <div key={r.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_120px] gap-4 py-2 px-4 items-center hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{r.code}</div>
                  </div>
                  <div className="text-sm truncate min-w-0">{r.departmentName || "N/A"}</div>
                  <div className="text-sm font-medium truncate min-w-0">{r.hierarchyLevel || "-"}</div>
                  <div className="text-sm truncate min-w-0">{r.reportingToName || "-"}</div>
                  <div className="min-w-0">
                    <span className="inline-flex items-center whitespace-nowrap text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">{r.accessScope || 'Self'}</span>
                  </div>
                  <div className="flex items-center min-w-0">
                    <Badge variant="outline" className={`whitespace-nowrap ${r.status === "Active" ? "border-success/40 text-success bg-success/5" : ""}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${r.status === "Active" ? "bg-success" : "bg-muted-foreground"}`} />
                      {r.status}
                    </Badge>
                  </div>
                  <div className="text-right flex justify-end gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Preview">
                        <span className="text-base">👁</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openRoleModal(r)} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Edit">
                        <span className="text-base">✎</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRole(r.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete">
                        <span className="text-base">🗑</span>
                      </Button>
                  </div>
                </div>
              ))}
              {roles.length === 0 && !loading && (
                <div className="p-8 text-center text-muted-foreground text-sm">No roles configured.</div>
              )}
            </div>
            <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
              <div>Showing {roles.length} records</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
           <Card className="border shadow-sm rounded-lg overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_120px] gap-4 py-3 px-4 border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
              <div>User</div>
              <div>Employee ID</div>
              <div>Department</div>
              <div>Role</div>
              <div>Status</div>
              <div>MFA</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y">
              {employees.map(e => (
                <div key={e.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_120px] gap-4 py-2 px-4 items-center hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{e.firstName} {e.lastName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{e.email}</div>
                  </div>
                  <div className="text-sm font-mono text-muted-foreground truncate min-w-0">{e.code}</div>
                  <div className="text-sm truncate min-w-0">{e.departmentName || "N/A"}</div>
                  <div className="text-sm truncate min-w-0">{e.dynamicRoleName || e.roleName || "-"}</div>
                  <div className="min-w-0 flex items-center">
                    <Badge variant="outline" className={`whitespace-nowrap ${e.status === "Active" ? "border-success/40 text-success bg-success/5" : ""}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${e.status === "Active" ? "bg-success" : "bg-muted-foreground"}`} />
                      {e.status}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                     <Switch checked={e.mfaEnabled} disabled />
                  </div>
                  <div className="text-right flex justify-end gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Preview">
                        <span className="text-base">👁</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openUserModal(e)} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Edit">
                        <span className="text-base">✎</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteUser(e.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete">
                        <span className="text-base">🗑</span>
                      </Button>
                  </div>
                </div>
              ))}
              {employees.length === 0 && !loading && (
                <div className="p-8 text-center text-muted-foreground text-sm">No users configured.</div>
              )}
            </div>
            <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
              <div>Showing {employees.length} records</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RoleForm({ departments, roles, nodeTypes, initialData, onClose }: { departments: any[], roles: any[], nodeTypes: any[], initialData?: any, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState(initialData ? {
    name: initialData.name || "", 
    code: initialData.code || "", 
    department: initialData.department ? String(initialData.department) : "", 
    accessScope: initialData.accessScope || "Self", 
    dashboardType: initialData.dashboardType || "Employee",
    hierarchyLevel: initialData.hierarchyLevel || "", 
    reportingTo: initialData.reportingTo ? String(initialData.reportingTo) : "",
    canManageUsers: initialData.canManageUsers || false, 
    canApprove: initialData.canApprove || false, 
    crossDepartmentAccess: initialData.crossDepartmentAccess || false,
    permissions: initialData.permissions || {},
    allowedEntities: initialData.permissions?.allowed_entities || []
  } : {
    name: "", code: "", department: "", accessScope: "Self", dashboardType: "Employee",
    hierarchyLevel: "", reportingTo: "",
    canManageUsers: false, canApprove: false, crossDepartmentAccess: false,
    permissions: {}, allowedEntities: []
  });

  const standardLevels = Array.from({length: 15}, (_, i) => `L${i+1}`);
  const customDbLevels = Array.from(new Set(roles.map((r: any) => r.hierarchyLevel).filter(Boolean)))
    .filter((lvl: any) => !standardLevels.includes(lvl))
    .sort((a: any, b: any) => String(a).localeCompare(String(b), undefined, {numeric: true}));

  const [isCustomLevel, setIsCustomLevel] = useState(
    initialData?.hierarchyLevel ? !standardLevels.includes(initialData.hierarchyLevel) && !customDbLevels.includes(initialData.hierarchyLevel) : false
  );

  const [entities, setEntities] = useState<any[]>([]);
  useEffect(() => {
    entitiesApi.getAll().then(setEntities).catch(() => {});
  }, []);

  const submit = async () => {
    try {
      setLoading(true);
      const payload: any = { ...form };
      ['department', 'reportingTo', 'hierarchyLevel'].forEach(key => {
        if (payload[key] === "") payload[key] = null;
      });
      
      payload.permissions = { ...payload.permissions };
      if (payload.accessScope === 'Custom') {
        payload.permissions.allowed_entities = payload.allowedEntities;
      } else {
        delete payload.permissions.allowed_entities;
      }
      delete payload.allowedEntities;

      if (initialData && initialData.id) {
        await rolesApi.update(initialData.id, payload);
        toast.success("Role updated successfully!");
      } else {
        await rolesApi.create(payload);
        toast.success("Role created and synced to Org Tree");
      }

      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to save role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role Configuration</div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Role Name <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. Site Manager" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Role Code <span className="text-destructive">*</span></Label>
          <Input placeholder="SITE_MGR" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <select 
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.department} 
            onChange={e => setForm({...form, department: e.target.value})}
          >
            <option value="">Select...</option>
            {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Hierarchy Level</Label>
          <Select 
            value={isCustomLevel ? "Custom" : (form.hierarchyLevel || undefined)}
            onValueChange={(v) => {
              if (v === "Custom") {
                setIsCustomLevel(true);
                setForm({...form, hierarchyLevel: ""});
              } else {
                setIsCustomLevel(false);
                setForm({...form, hierarchyLevel: v});
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Level..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {standardLevels.map((lvl: string) => (
                <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
              ))}
              {customDbLevels.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20 mt-1">Custom Database Levels</div>
                  {customDbLevels.map((lvl: any) => (
                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                  ))}
                </>
              )}
              <div className="h-px bg-border my-1" />
              <SelectItem value="Custom">Custom (Add New)...</SelectItem>
            </SelectContent>
          </Select>
          {isCustomLevel && (
            <Input 
              placeholder="Enter custom level (e.g. C-Suite)" 
              value={form.hierarchyLevel} 
              onChange={e => setForm({...form, hierarchyLevel: e.target.value})}
              className="mt-2"
              autoFocus
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>Reporting To</Label>
          <select 
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.reportingTo} 
            onChange={e => setForm({...form, reportingTo: e.target.value})}
          >
            <option value="">Select...</option>
            {roles.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
          </select>
        </div>
        <div className="space-y-2 col-span-2 pt-2 pb-2">
          <Label className="text-sm font-semibold">Can View Data <span className="text-destructive">*</span></Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-10 px-3 bg-muted/20 border-border/60 hover:bg-muted/40 font-normal">
                <span className="truncate text-sm">
                  {form.accessScope === 'Self'
                    ? "Self data only"
                    : form.accessScope === 'Corporate' 
                      ? "All data of the entities" 
                      : form.allowedEntities.length > 0 
                        ? `${form.allowedEntities.length} entities selected` 
                        : "Select entities..."}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 shadow-lg border-border/50" align="start">
              <div className="flex flex-col">
                <div className="p-2 border-b border-border/50 bg-muted/10 space-y-1">
                  <label className="flex items-center gap-3 p-2 hover:bg-background rounded-md cursor-pointer group transition-colors">
                    <input 
                      type="radio" 
                      className="accent-primary w-4 h-4 cursor-pointer"
                      checked={form.accessScope === 'Self'} 
                      onChange={() => setForm({...form, accessScope: 'Self', allowedEntities: []})} 
                    />
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">Self data only</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-background rounded-md cursor-pointer group transition-colors">
                    <input 
                      type="radio" 
                      className="accent-primary w-4 h-4 cursor-pointer"
                      checked={form.accessScope === 'Corporate'} 
                      onChange={() => setForm({...form, accessScope: 'Corporate', allowedEntities: []})} 
                    />
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">All data of the entities</span>
                  </label>
                </div>
                <div className="p-3">
                  <div className="px-2 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Choose Entities</div>
                  <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {entities.map(ent => (
                      <label key={ent.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-md cursor-pointer group transition-colors">
                        <input 
                          type="checkbox" 
                          className="accent-primary rounded w-4 h-4 cursor-pointer" 
                          checked={form.accessScope === 'Custom' && form.allowedEntities.includes(ent.id)}
                          onChange={(e) => {
                            let newEntities = [...form.allowedEntities];
                            if (e.target.checked) newEntities.push(ent.id);
                            else newEntities = newEntities.filter((id: number) => id !== ent.id);
                            
                            setForm({
                              ...form, 
                              accessScope: newEntities.length > 0 ? 'Custom' : 'Corporate', 
                              allowedEntities: newEntities
                            });
                          }}
                        />
                        <span className="text-sm font-medium opacity-90 group-hover:opacity-100">{ent.name}</span>
                      </label>
                    ))}
                    {entities.length === 0 && <div className="text-xs text-muted-foreground italic px-2 py-4 text-center">Loading entities...</div>}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Dashboard Type</Label>
          <select 
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.dashboardType} 
            onChange={e => setForm({...form, dashboardType: e.target.value})}
          >
            <option value="">Select...</option>
            <option value="Executive">Executive</option>
            <option value="Manager">Manager</option>
            <option value="Employee">Employee</option>
          </select>
        </div>
        <div className="space-y-2 flex flex-col justify-center pt-6">
          <div className="flex items-center justify-between max-w-[200px]">
            <Label>Can Manage Users</Label>
            <Switch checked={form.canManageUsers} onCheckedChange={v => setForm({...form, canManageUsers: v})} className="data-[state=checked]:bg-primary" />
          </div>
        </div>
        <div className="space-y-2 flex flex-col justify-center">
          <div className="flex items-center justify-between max-w-[200px]">
            <Label>Can Approve</Label>
            <Switch checked={form.canApprove} onCheckedChange={v => setForm({...form, canApprove: v})} className="data-[state=checked]:bg-primary" />
          </div>
        </div>
        <div className="space-y-2 flex flex-col justify-center">
          <div className="flex items-center justify-between max-w-[200px]">
            <Label>Cross-Department Access</Label>
            <Switch checked={form.crossDepartmentAccess} onCheckedChange={v => setForm({...form, crossDepartmentAccess: v})} className="data-[state=checked]:bg-primary" />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Role</Button>
      </div>
    </div>
  );
}

function UserForm({ departments, roles, nodeTypes, initialData, onClose }: { departments: any[], roles: any[], nodeTypes: any[], initialData?: any, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialData ? {
    firstName: initialData.firstName || "", 
    lastName: initialData.lastName || "", 
    code: initialData.code || "", 
    email: initialData.email || "", 
    phone: initialData.phone || "",
    department: initialData.department ? String(initialData.department) : "", 
    designation: initialData.designation ? String(initialData.designation) : "", 
    dynamicRole: initialData.dynamicRole ? String(initialData.dynamicRole) : "", 
    entity: initialData.entity ? String(initialData.entity) : "", 
    branch: initialData.branch ? String(initialData.branch) : "", 
    site: initialData.site ? String(initialData.site) : "",
    mfaEnabled: initialData.mfaEnabled || false, 
    status: initialData.status || "Active", 
    password: "Password123!" // Ignored on edit typically, or leave as default
  } : {
    firstName: "", lastName: "", code: "", email: "", phone: "",
    department: "", designation: "", dynamicRole: "", entity: "", branch: "", site: "",
    mfaEnabled: false, status: "Active" as "Active" | "Inactive", password: "Password123!"
  });

  const submit = async () => {
    try {
      setLoading(true);
      
      const payload: any = { ...form };
      ['department', 'designation', 'dynamicRole', 'entity', 'branch', 'site', 'phone'].forEach(key => {
        if (payload[key] === "") payload[key] = null;
      });

      if (initialData && initialData.id) {
        await employeesApi.update(initialData.id, payload);
        toast.success("User updated successfully!");
      } else {
        await employeesApi.create(payload);
        toast.success("User created and synced to Org Tree");
      }

      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Information</div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>First Name <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. Aarav" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Last Name <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. Mehta" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Employee ID <span className="text-destructive">*</span></Label>
          <Input placeholder="EMP001" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Email <span className="text-destructive">*</span></Label>
          <Input placeholder="user@logicon.io" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Mobile</Label>
          <Input placeholder="+91 98100 00000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        </div>
      </div>

      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4">Organizational Assignment</div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Department <span className="text-destructive">*</span></Label>
          <select 
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.department} 
            onChange={e => setForm({...form, department: e.target.value})}
          >
            <option value="">Select...</option>
            {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Role <span className="text-destructive">*</span></Label>
          <select 
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.dynamicRole} 
            onChange={e => setForm({...form, dynamicRole: e.target.value})}
          >
            <option value="" disabled>Select role</option>
            {roles.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select 
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.status} 
            onChange={e => setForm({...form, status: e.target.value as "Active" | "Inactive"})}
          >
            <option value="" disabled>Select...</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="space-y-2 flex flex-col justify-center pt-6">
          <div className="flex items-center justify-between max-w-[200px]">
            <Label>MFA Enabled</Label>
            <Switch checked={form.mfaEnabled} onCheckedChange={v => setForm({...form, mfaEnabled: v})} className="data-[state=checked]:bg-primary" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur py-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save User</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------
// ROLE PERMISSIONS COMPONENT
// ---------------------------------------------------------------------------------

const MODULES = [
  { group: "Overview", items: ["Dashboard"] },
  { group: "Organisation", items: ["Entities", "Branches", "Sites", "Departments", "Designations"] },
  { group: "People", items: ["Employees", "My Calendar", "Offer Letters", "Offer Templates"] },
  { group: "Attendance", items: ["Attendance", "Shift Definitions", "Weekly Roster", "QR Check-in", "Face Verification", "GPS Capture", "Regularization"] },
  { group: "Leave", items: ["Leave Requests"] },
  { group: "Holiday Planner", items: ["Holiday Planner", "Calendar"] },
  { group: "Payroll", items: ["Payroll Overview", "Salary Structure", "Run Payroll", "Salary Slips", "Compliance", "Loans & Advances", "Reimbursements"] },
  { group: "Insights", items: ["Organization Tree", "Reports", "Settings"] },
];

function RolePermissionsTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [permissions, setPermissions] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    rolesApi.getAll().then(res => {
      setRoles(res);
      if (res.length > 0) setSelectedRole(String(res[0].id));
    });
    entitiesApi.getAll().then(res => setEntities(res));
  }, []);

  useEffect(() => {
    if (!selectedRole) return;
    const role = roles.find(r => String(r.id) === selectedRole);
    if (role) {
      setPermissions(role.permissions || {});
    }
  }, [selectedRole, roles]);

  const handlePermissionChange = (moduleName: string, action: string, value: any) => {
    setPermissions((prev: any) => ({
      ...prev,
      [moduleName]: {
        ...(prev[moduleName] || { create: false, view: false, update: false, delete: false }),
        [action]: value
      }
    }));
  };

  const handleToggle = (moduleName: string, action: string, checked: boolean) => {
    handlePermissionChange(moduleName, action, checked);
  };

  const handleSpecialToggle = (key: string, value: boolean | string) => {
    setPermissions((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      await rolesApi.update(selectedRole, { permissions });
      toast.success("Permissions updated successfully");
      // Update local state roles
      setRoles(roles.map(r => String(r.id) === selectedRole ? { ...r, permissions } : r));
    } catch (e: any) {
      toast.error(e.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (roles.length === 0) {
    return <div className="text-center text-muted-foreground p-8">No roles found. Please create a role first.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">Permission Matrix</h2>
          <p className="text-sm text-muted-foreground">Configure detailed access rights for each module.</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map(r => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={savePermissions} disabled={saving || !selectedRole} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Save Permissions
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="px-6 py-3 font-medium text-muted-foreground">Module</th>
              <th className="px-6 py-3 font-medium text-muted-foreground text-center">View</th>
              <th className="px-6 py-3 font-medium text-muted-foreground text-center">Create</th>
              <th className="px-6 py-3 font-medium text-muted-foreground text-center">Update</th>
              <th className="px-6 py-3 font-medium text-muted-foreground text-center">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {MODULES.map((group, gIdx) => (
              <Fragment key={gIdx}>
                <tr className="bg-muted/10">
                  <td colSpan={5} className="px-6 py-2 font-semibold text-xs uppercase tracking-wider text-primary bg-primary/5">
                    {group.group}
                  </td>
                </tr>
                {group.items.map(mod => {
                  const modsPerms = permissions[mod] || { view: false, create: false, update: false, delete: false };
                  return (
                    <tr key={mod} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium">
                        <div>{mod}</div>
                        {mod === "Dashboard" && (
                          <div className="mt-2">
                            <Select 
                              value={permissions.dashboard_type || "employee"} 
                              onValueChange={(val) => handleSpecialToggle('dashboard_type', val)}
                            >
                              <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                                <SelectValue placeholder="Select dashboard" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="executive">Executive / CEO</SelectItem>
                                <SelectItem value="payroll_admin">Payroll Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="employee">Employee</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <input type="checkbox" checked={modsPerms.view} onChange={e => handleToggle(mod, 'view', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <input type="checkbox" checked={modsPerms.create} onChange={e => handleToggle(mod, 'create', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <input type="checkbox" checked={modsPerms.update} onChange={e => handleToggle(mod, 'update', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <input type="checkbox" checked={modsPerms.delete} onChange={e => handleToggle(mod, 'delete', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded-md p-6 bg-muted/10 space-y-4">
        <h3 className="text-sm font-semibold">Special Workflow Permissions</h3>
        <p className="text-xs text-muted-foreground mb-4">These permissions drive the automated payroll and approval workflows.</p>
        
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Run Payroll</Label>
              <div className="text-xs text-muted-foreground">Calculate salaries and view masked previews.</div>
            </div>
            <Switch checked={!!permissions.can_run_payroll} onCheckedChange={v => handleSpecialToggle('can_run_payroll', v)} />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">View Confidential Payroll</Label>
              <div className="text-xs text-muted-foreground">See raw gross, net, and deduction amounts.</div>
            </div>
            <Switch checked={!!permissions.can_view_confidential_payroll} onCheckedChange={v => handleSpecialToggle('can_view_confidential_payroll', v)} />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Approve Payroll (CEO)</Label>
              <div className="text-xs text-muted-foreground">Receive review notifications and accept/reject.</div>
            </div>
            <Switch checked={!!permissions.can_approve_payroll} onCheckedChange={v => handleSpecialToggle('can_approve_payroll', v)} />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Release Salary (Finance)</Label>
              <div className="text-xs text-muted-foreground">Get notified to disburse funds once approved.</div>
            </div>
            <Switch checked={!!permissions.can_release_salary} onCheckedChange={v => handleSpecialToggle('can_release_salary', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceSettingsTab() {
  const [entities, setEntities] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [scope, setScope] = useState<string>("global");
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [policyId, setPolicyId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    max_late_minutes: 15,
    half_day_hours: 4.00,
    full_day_hours: 8.00,
    ot_applicable_after_hours: 2.0,
    require_face: true,
    require_qr: true,
    require_gps: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdownError, setDropdownError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([entitiesApi.getAll(), sitesApi.getAll(), employeesApi.getAll()])
      .then(([ents, sts, emps]) => {
        setEntities(Array.isArray(ents) ? ents : ((ents as any).results || []));
        setSites(Array.isArray(sts) ? sts : ((sts as any).results || []));
        setEmployees(Array.isArray(emps) ? emps : ((emps as any).results || []));
      })
      .catch(err => {
        setDropdownError(err.message || String(err));
      });
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [scope, selectedId, selectedEmployeeId]);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      let params = '';
      if (selectedEmployeeId) {
        params = `?employee=${selectedEmployeeId}`;
      } else if (scope === 'entity' && selectedId) {
        params = `?organization=${selectedId}`;
      } else if (scope === 'site' && selectedId) {
        params = `?site=${selectedId}`;
      } else if (scope !== 'global') {
        setLoading(false);
        return;
      }
      
      const res = await attendancePoliciesApi.getAll(params);
      
      // If we got results, use the first one
      if (Array.isArray(res) && res.length > 0) {
        const p = res[0];
        setPolicyId(p.id);
        setFormData({
          max_late_minutes: p.max_late_minutes,
          half_day_hours: parseFloat(p.half_day_hours),
          full_day_hours: parseFloat(p.full_day_hours),
          ot_applicable_after_hours: parseFloat(p.ot_applicable_after_hours || 2.0),
          require_face: p.require_face,
          require_qr: p.require_qr,
          require_gps: p.require_gps,
        });
      } else if (res && res.results && res.results.length > 0) {
        const p = res.results[0];
        setPolicyId(p.id);
        setFormData({
          max_late_minutes: p.max_late_minutes,
          half_day_hours: parseFloat(p.half_day_hours),
          full_day_hours: parseFloat(p.full_day_hours),
          ot_applicable_after_hours: parseFloat(p.ot_applicable_after_hours || 2.0),
          require_face: p.require_face,
          require_qr: p.require_qr,
          require_gps: p.require_gps,
        });
      } else {
        // No policy found for this scope, reset to defaults
        setPolicyId(null);
        setFormData({
          max_late_minutes: 15,
          half_day_hours: 4.00,
          full_day_hours: 8.00,
          ot_applicable_after_hours: 2.0,
          require_face: true,
          require_qr: true,
          require_gps: true,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...formData };
      if (selectedEmployeeId) {
        payload.employee = selectedEmployeeId;
      } else {
        if (scope === 'entity' && selectedId) payload.organization = selectedId;
        if (scope === 'site' && selectedId) payload.site = selectedId;
      }
      
      if (policyId) {
        await attendancePoliciesApi.update(policyId, payload);
        toast.success("Attendance Policy updated!");
      } else {
        const res = await attendancePoliciesApi.create(payload);
        setPolicyId(res.id);
        toast.success("Attendance Policy created!");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 pb-6 border-b">
        <div>
          <h3 className="text-lg font-medium">Configurable Attendance Policies</h3>
          <p className="text-sm text-muted-foreground">Manage attendance rules globally or override them per entity/site.</p>
        </div>
        
        {dropdownError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
            <strong>Error loading dropdowns:</strong> {dropdownError}
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label>Policy Scope</Label>
            <Select value={scope} onValueChange={(v) => { setScope(v); setSelectedId(""); setSelectedEmployeeId(""); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (Default)</SelectItem>
                <SelectItem value="entity">Specific Entity</SelectItem>
                <SelectItem value="site">Specific Site</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {scope === 'entity' && (
            <div className="space-y-1">
              <Label>Select Entity</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {scope === 'site' && (
            <div className="space-y-1">
              <Label>Select Site</Label>
              <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); setSelectedEmployeeId(""); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {(scope === 'entity' || scope === 'site') && selectedId && (
            <div className="space-y-1">
              <Label>Select Employee (Optional)</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Employees (Default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Employees (Default)</SelectItem>
                  {employees
                    .filter(e => scope === 'entity' ? e.entity == selectedId : e.site == selectedId)
                    .map(e => (
                      <SelectItem key={e.id} value={e.id.toString()}>
                        {e.firstName || e.first_name} {e.lastName || e.last_name} ({e.code || e.id})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading policy...</div>
      ) : (scope !== 'global' && !selectedId) ? (
        <div className="py-8 text-center text-muted-foreground">Please select an {scope} to configure its policy.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Time Rules</h4>
              
              <div className="space-y-2">
                <Label>Max Late Minutes Allowed</Label>
                <Input 
                  type="number" 
                  value={formData.max_late_minutes} 
                  onChange={e => setFormData({...formData, max_late_minutes: parseInt(e.target.value) || 0})}
                />
                <p className="text-xs text-muted-foreground">Grace period before a punch is marked as late.</p>
              </div>
              
              <div className="space-y-2">
                <Label>Half Day Threshold (Hours)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={formData.half_day_hours} 
                  onChange={e => setFormData({...formData, half_day_hours: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Full Day Threshold (Hours)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={formData.full_day_hours} 
                  onChange={e => setFormData({...formData, full_day_hours: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>OT Applies After (Hours)</Label>
                <Input 
                  type="number" 
                  step="0.5"
                  value={formData.ot_applicable_after_hours} 
                  onChange={e => setFormData({...formData, ot_applicable_after_hours: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Verification Requirements</h4>
              
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="space-y-0.5">
                  <Label>Require GPS</Label>
                  <div className="text-xs text-muted-foreground">Ensure employee is within geofence radius.</div>
                </div>
                <Switch checked={formData.require_gps} onCheckedChange={v => setFormData({...formData, require_gps: v})} />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="space-y-0.5">
                  <Label>Require QR Scan</Label>
                  <div className="text-xs text-muted-foreground">Employee must scan the site's cryptographic QR.</div>
                </div>
                <Switch checked={formData.require_qr} onCheckedChange={v => setFormData({...formData, require_qr: v})} />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="space-y-0.5">
                  <Label>Require Face Verification</Label>
                  <div className="text-xs text-muted-foreground">Mandate liveness & biometric match on check-in.</div>
                </div>
                <Switch checked={formData.require_face} onCheckedChange={v => setFormData({...formData, require_face: v})} />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (policyId ? 'Update Policy' : 'Create Policy')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------
// LEAVES COMPONENTS
// ---------------------------------------------------------------------------------

function LeaveSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tenured_years_threshold: 5,
    tenured_annual_leaves: 15,
    standard_annual_leaves: 12,
    max_consecutive_leaves: 3,
    exception_month: 3
  });

  const months = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" }
  ];

  useEffect(() => {
    leavesConfigApi.getSettings()
      .then(res => {
        setForm({
          tenured_years_threshold: res.tenured_years_threshold || 5,
          tenured_annual_leaves: Number(res.tenured_annual_leaves) || 15,
          standard_annual_leaves: Number(res.standard_annual_leaves) || 12,
          max_consecutive_leaves: res.max_consecutive_leaves || 3,
          exception_month: res.exception_month || 3
        });
      })
      .catch(() => toast.error("Failed to load leave settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    leavesConfigApi.updateSettings(form)
      .then(res => {
        toast.success("Leave policy updated successfully!");
        setForm({
          tenured_years_threshold: res.tenured_years_threshold || 5,
          tenured_annual_leaves: Number(res.tenured_annual_leaves) || 15,
          standard_annual_leaves: Number(res.standard_annual_leaves) || 12,
          max_consecutive_leaves: res.max_consecutive_leaves || 3,
          exception_month: res.exception_month || 3
        });
      })
      .catch(() => toast.error("Failed to update leave settings"))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading configurations...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold">Configurable Leave Policies</h3>
        <p className="text-sm text-muted-foreground">Manage global rules for employee leaves, tenure perks, and restrictions.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
            <h4 className="font-semibold flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600"/> Base Entitlements</h4>
            <div className="space-y-2">
              <Label>Standard Annual Leaves (Days)</Label>
              <Input 
                type="number" 
                value={form.standard_annual_leaves} 
                onChange={e => setForm({...form, standard_annual_leaves: Number(e.target.value)})} 
              />
              <p className="text-xs text-muted-foreground">Accrual rate: {(form.standard_annual_leaves / 12).toFixed(2)} leaves per month</p>
            </div>
          </div>

          <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 space-y-4">
            <h4 className="font-semibold text-primary flex items-center gap-2">🏆 Tenured Employee Perks</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tenure Threshold (Years)</Label>
                <Input 
                  type="number" 
                  value={form.tenured_years_threshold} 
                  onChange={e => setForm({...form, tenured_years_threshold: Number(e.target.value)})} 
                />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Automatically applied starting the month following the completion of this anniversary.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tenured Annual Leaves (Days)</Label>
                <Input 
                  type="number" 
                  value={form.tenured_annual_leaves} 
                  onChange={e => setForm({...form, tenured_annual_leaves: Number(e.target.value)})} 
                />
                <p className="text-xs text-muted-foreground">Accrual rate: {(form.tenured_annual_leaves / 12).toFixed(2)} leaves per month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
            <h4 className="font-semibold text-orange-800 flex items-center gap-2"><Info className="h-4 w-4" /> Consecutive Leave Restrictions</h4>
            <div className="space-y-2">
              <Label>Max Consecutive Paid Leaves</Label>
              <Input 
                type="number" 
                value={form.max_consecutive_leaves} 
                onChange={e => setForm({...form, max_consecutive_leaves: Number(e.target.value)})} 
              />
              <p className="text-[11px] text-muted-foreground leading-tight">
                If an employee requests more consecutive days than this limit, the remainder is automatically treated as Unpaid Leave and triggers a salary deduction.
              </p>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
            <h4 className="font-semibold flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Exception Month</h4>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Select a month where the consecutive limit is lifted, allowing employees to avail all their accumulated leaves at once.
            </p>
            <div className="space-y-2">
              <Label>Select Month</Label>
              <Select 
                value={form.exception_month.toString()} 
                onValueChange={v => setForm({...form, exception_month: Number(v)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
