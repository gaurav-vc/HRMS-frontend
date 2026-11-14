import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, Fragment, useMemo, useRef } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, ChevronDown, Check, Info, Send, Wallet, Coins, Trash2, Edit, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isSuperAdminUser } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  rolesApi,
  employeesApi,
  departmentsApi,
  orgEngineApi,
  entitiesApi,
  sitesApi,
  API_BASE_URL,
  getMediaUrl,
  attendancePoliciesApi,
  leavesConfigApi,
  punctualitySlabsApi,
  walletPoliciesApi,
  employeeWalletsApi,
  designationsApi,
} from "@/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Organisation, payroll, attendance, notifications, and user roles"
      />
      <Tabs defaultValue="att">
        <TabsList>
          {/* Dummy Payroll tab commented out
          <TabsTrigger value="pay">Payroll</TabsTrigger>
          */}
          <TabsTrigger value="att">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="wallets">Employee Wallets</TabsTrigger>
          <TabsTrigger value="roles">Roles & Users</TabsTrigger>
          <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

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

        <TabsContent value="wallets">
          <Card className="p-6 mt-4 border shadow-sm rounded-lg">
            <WalletSettingsTab />
          </Card>
        </TabsContent>

        {/* Dummy Notifications tab commented out
        <TabsContent value="notif">
          <Card className="p-6 space-y-4">
            <Toggle label="Email payslips automatically" defaultChecked />
            <Toggle label="WhatsApp approvals to managers" />
            <Toggle label="Daily attendance digest to HR" defaultChecked />
            <Button onClick={() => toast.success("Saved")}>Save</Button>
          </Card>
        </TabsContent>
        */}

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

        <TabsContent value="branding">
          <Card className="p-6 mt-4 border shadow-sm rounded-lg">
            <BrandingTab />
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} />
    </div>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md border">
      <Label>{label}</Label>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

// ---------------------------------------------------------------------------------
// USERS & ROLES COMPONENTS
// ---------------------------------------------------------------------------------

function UsersAndRolesTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [nodeTypes, setNodeTypes] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("roles");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [viewingRole, setViewingRole] = useState<any>(null);
  const [viewRoleModalOpen, setViewRoleModalOpen] = useState(false);

  // New States for user selection and pagination
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const [sendingEmails, setSendingEmails] = useState(false);

  const navigate = useNavigate();

  const openViewRoleModal = async (id: number) => {
    try {
      const roleData = await rolesApi.get(id);
      setViewingRole(roleData);
      setViewRoleModalOpen(true);
    } catch (e) {
      toast.error("Failed to load role details from backend");
    }
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [r, e, d, nt, s] = await Promise.all([
        rolesApi.getAll().catch(() => []),
        employeesApi.getAll().catch(() => []),
        departmentsApi.getAll().catch(() => []),
        orgEngineApi.getNodeTypes().catch(() => []),
        sitesApi.getAll().catch(() => []),
      ]);
      setRoles(Array.isArray(r) ? r : (r as any).results || []);
      setEmployees(Array.isArray(e) ? e : (e as any).results || []);
      setDepartments(Array.isArray(d) ? d : (d as any).results || []);
      setNodeTypes(Array.isArray(nt) ? nt : (nt as any).results || []);
      setSites(Array.isArray(s) ? s : (s as any).results || []);
    } catch (e: any) {
      if (e?.response?.status !== 403) {
        toast.error("Failed to load setup data");
      }
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
    if (
      !window.confirm(
        "Are you sure you want to delete this role? This will also remove it from the Organization Tree.",
      )
    )
      return;
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

  const handleSendEmails = async () => {
    if (selectedUsers.length === 0) return;
    try {
      setSendingEmails(true);
      const res = await fetch(`${API_BASE_URL}/api/employees/trigger_onboarding_emails/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ employee_ids: selectedUsers }),
      });
      if (!res.ok) throw new Error("Failed to send emails");
      const data = await res.json();
      toast.success(`Successfully sent ${data.sent_count} login emails!`);
      setSelectedUsers([]);
    } catch (e: any) {
      toast.error(e.message || "Failed to trigger emails.");
    } finally {
      setSendingEmails(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This will also remove them from the Organization Tree.",
      )
    )
      return;
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
          <Input
            placeholder="Search..."
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {activeTab === "roles" && (
          <>
            <Button
              onClick={() => openRoleModal(null)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="h-4 w-4" /> Add Role
            </Button>
            <Dialog
              open={roleModalOpen}
              onOpenChange={(open) => {
                if (!open) setEditingRole(null);
                setRoleModalOpen(open);
              }}
            >
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pr-4">
                <DialogHeader>
                  <DialogTitle>{editingRole ? "Edit Role" : "New Role"}</DialogTitle>
                  <DialogDescription>
                    Fields are linked to keep your hierarchy consistent.
                  </DialogDescription>
                </DialogHeader>
                <RoleForm
                  departments={departments}
                  roles={roles}
                  nodeTypes={nodeTypes}
                  initialData={editingRole}
                  onClose={() => {
                    setRoleModalOpen(false);
                    setEditingRole(null);
                    fetchAll();
                  }}
                />
              </DialogContent>
            </Dialog>
            <Dialog
              open={viewRoleModalOpen}
              onOpenChange={(open) => {
                if (!open) setViewingRole(null);
                setViewRoleModalOpen(open);
              }}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>View Role Details</DialogTitle>
                </DialogHeader>
                {viewingRole ? (
                  <div className="space-y-4 text-sm mt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-semibold text-muted-foreground">Role Name</div>
                      <div>{viewingRole.name}</div>

                      <div className="font-semibold text-muted-foreground">Role Code</div>
                      <div>{viewingRole.code || "-"}</div>

                      <div className="font-semibold text-muted-foreground">Department</div>
                      <div>{viewingRole.departmentName || "N/A"}</div>

                      <div className="font-semibold text-muted-foreground">Hierarchy Level</div>
                      <div>{viewingRole.hierarchyLevel || "-"}</div>

                      <div className="font-semibold text-muted-foreground">Reporting To</div>
                      <div>{viewingRole.reportingToName || "-"}</div>

                      <div className="font-semibold text-muted-foreground">Access Scope</div>
                      <div>
                        <span className="inline-flex items-center whitespace-nowrap text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                          {viewingRole.accessScope || "Self"}
                        </span>
                      </div>

                      <div className="font-semibold text-muted-foreground">Status</div>
                      <div>
                        <Badge
                          variant="outline"
                          className={`${viewingRole.status === "Active" ? "border-success/40 text-success bg-success/5" : ""}`}
                        >
                          {viewingRole.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading role data from backend...
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
        {activeTab === "users" && (
          <div className="flex gap-2 items-center">
            {selectedUsers.length > 0 && (
              <Button
                onClick={handleSendEmails}
                disabled={sendingEmails}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {sendingEmails ? "Sending..." : `Send Login Email (${selectedUsers.length})`}
              </Button>
            )}
            <Button
              onClick={() => openUserModal(null)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </div>
        )}
        {activeTab === "users" && (
          <>
            <Dialog
              open={userModalOpen}
              onOpenChange={(open) => {
                if (!open) setEditingUser(null);
                setUserModalOpen(open);
              }}
            >
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto pr-4">
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Edit User" : "New User"}</DialogTitle>
                  <DialogDescription>
                    Fields are linked to keep your hierarchy consistent.
                  </DialogDescription>
                </DialogHeader>
                <UserForm
                  departments={departments}
                  roles={roles}
                  nodeTypes={nodeTypes}
                  employees={employees}
                  sites={sites}
                  initialData={editingUser}
                  onClose={() => {
                    setUserModalOpen(false);
                    setEditingUser(null);
                    fetchAll();
                  }}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-6">
          <TabsTrigger
            value="roles"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none bg-transparent px-0 pb-3 pt-2"
          >
            Roles{" "}
            <Badge
              variant="secondary"
              className="ml-2 bg-primary/10 text-primary hover:bg-primary/10"
            >
              {roles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none bg-transparent px-0 pb-3 pt-2"
          >
            Users{" "}
            <Badge variant="secondary" className="ml-2">
              {employees.length}
            </Badge>
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
              {roles
                .filter(
                  (r) =>
                    (r.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (r.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (r.departmentName || "").toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_120px] gap-4 py-2 px-4 items-center hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{r.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{r.code}</div>
                    </div>
                    <div className="text-sm truncate min-w-0">{r.departmentName || "N/A"}</div>
                    <div className="text-sm font-medium truncate min-w-0">
                      {r.hierarchyLevel || "-"}
                    </div>
                    <div className="text-sm truncate min-w-0">{r.reportingToName || "-"}</div>
                    <div className="min-w-0">
                      <span className="inline-flex items-center whitespace-nowrap text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        {r.accessScope || "Self"}
                      </span>
                    </div>
                    <div className="flex items-center min-w-0">
                      <Badge
                        variant="outline"
                        className={`whitespace-nowrap ${r.status === "Active" ? "border-success/40 text-success bg-success/5" : ""}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${r.status === "Active" ? "bg-success" : "bg-muted-foreground"}`}
                        />
                        {r.status}
                      </Badge>
                    </div>
                    <div className="text-right flex justify-end gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewRoleModal(r.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Preview"
                      >
                        <span className="text-base">👁</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openRoleModal(r)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Edit"
                      >
                        <span className="text-base">✎</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRole(r.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <span className="text-base">🗑</span>
                      </Button>
                    </div>
                  </div>
                ))}
              {roles.length === 0 && !loading && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No roles configured.
                </div>
              )}
            </div>
            <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
              <div>
                Showing{" "}
                {
                  roles.filter(
                    (r) =>
                      (r.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (r.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (r.departmentName || "").toLowerCase().includes(searchQuery.toLowerCase()),
                  ).length
                }{" "}
                records
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card className="border shadow-sm rounded-lg overflow-hidden">
            <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_120px] gap-4 py-3 px-4 border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase items-center">
              <div>
                <Checkbox
                  checked={
                    employees.length > 0 &&
                    selectedUsers.length === employees.length
                  }
                  onCheckedChange={(c) => {
                    if (c) setSelectedUsers(employees.map(e => e.id));
                    else setSelectedUsers([]);
                  }}
                />
              </div>
              <div>User</div>
              <div>Employee ID</div>
              <div>Department</div>
              <div>Role</div>
              <div>Status</div>
              <div>MFA</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y">
              {employees
                .filter(
                  (e) =>
                    ((e.firstName || "") + " " + (e.lastName || ""))
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    (e.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (e.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (e.departmentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (e.dynamicRoleName || e.roleName || "")
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                )
                .slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE)
                .map((e) => (
                  <div
                    key={e.id}
                    className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_120px] gap-4 py-2 px-4 items-center hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <Checkbox
                        checked={selectedUsers.includes(e.id)}
                        onCheckedChange={(c) => {
                          if (c) setSelectedUsers([...selectedUsers, e.id]);
                          else setSelectedUsers(selectedUsers.filter(id => id !== e.id));
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {e.firstName} {e.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{e.email}</div>
                    </div>
                    <div className="text-sm font-mono text-muted-foreground truncate min-w-0">
                      {e.code}
                    </div>
                    <div className="text-sm truncate min-w-0">{e.departmentName || "N/A"}</div>
                    <div className="text-sm truncate min-w-0">
                      {e.dynamicRoleName || e.roleName || "-"}
                    </div>
                    <div className="min-w-0 flex items-center">
                      <Badge
                        variant="outline"
                        className={`whitespace-nowrap ${e.status === "Active" ? "border-success/40 text-success bg-success/5" : ""}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${e.status === "Active" ? "bg-success" : "bg-muted-foreground"}`}
                        />
                        {e.status}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <Switch checked={e.mfaEnabled} disabled />
                    </div>
                    <div className="text-right flex justify-end gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate({ to: `/employees/${e.id}` })}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Preview"
                      >
                        <span className="text-base">👁</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openUserModal(e)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Edit"
                      >
                        <span className="text-base">✎</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteUser(e.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <span className="text-base">🗑</span>
                      </Button>
                    </div>
                  </div>
                ))}
              {employees.length === 0 && !loading && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No users configured.
                </div>
              )}
            </div>
            <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
              <div>
                {(() => {
                  const filtered = employees.filter(
                    (e) =>
                      ((e.firstName || "") + " " + (e.lastName || ""))
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      (e.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (e.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (e.departmentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (e.dynamicRoleName || e.roleName || "")
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                  );
                  const total = filtered.length;
                  const start = total === 0 ? 0 : (userPage - 1) * USERS_PER_PAGE + 1;
                  const end = Math.min(userPage * USERS_PER_PAGE, total);
                  return `Showing ${start}-${end} of ${total} records`;
                })()}
              </div>
              <div className="flex gap-2">
                {(() => {
                  const filtered = employees.filter(
                    (e) =>
                      ((e.firstName || "") + " " + (e.lastName || ""))
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      (e.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (e.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (e.departmentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (e.dynamicRoleName || e.roleName || "")
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                  );
                  const totalPages = Math.ceil(filtered.length / USERS_PER_PAGE);
                  if (totalPages <= 1) return null;
                  return (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => { e.preventDefault(); if (userPage > 1) setUserPage(userPage - 1); }}
                            className={userPage <= 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              isActive={page === userPage}
                              onClick={(e) => { e.preventDefault(); setUserPage(page); }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => { e.preventDefault(); if (userPage < totalPages) setUserPage(userPage + 1); }}
                            className={userPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  );
                })()}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RoleForm({
  departments,
  roles,
  nodeTypes,
  initialData,
  onClose,
}: {
  departments: any[];
  roles: any[];
  nodeTypes: any[];
  initialData?: any;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState(
    initialData
      ? {
        name: initialData.name || "",
        code: initialData.code || "",
        department: initialData.department ? String(initialData.department) : "",
        reportingTo: initialData?.reporting_to?.id || initialData?.reporting_to || initialData?.reportingTo || "",
        hierarchyLevel: initialData?.hierarchy_level || initialData?.hierarchyLevel || "",
        permissions: initialData?.permissions || {},
        accessScope: initialData?.access_scope || (initialData?.permissions?.allowed_entities ? "Custom" : "Corporate"),
        allowedEntities: initialData?.permissions?.allowed_entities || [],
        dashboardType: initialData?.dashboard_type
          ? (String(initialData.dashboard_type).charAt(0).toUpperCase() + String(initialData.dashboard_type).slice(1).toLowerCase())
          : (initialData?.permissions?.dashboard_type
            ? (String(initialData.permissions.dashboard_type).charAt(0).toUpperCase() + String(initialData.permissions.dashboard_type).slice(1).toLowerCase())
            : "Employee"),
        canManageUsers: initialData?.can_manage_users ?? initialData?.canManageUsers ?? false,
        canApprove: initialData?.can_approve ?? initialData?.canApprove ?? false,
        crossDepartmentAccess: initialData?.cross_department_access ?? initialData?.crossDepartmentAccess ?? false,
      }
      : {
        name: "",
        code: "",
        department: "",
        accessScope: "Self",
        dashboardType: "Employee",
        hierarchyLevel: "",
        reportingTo: "",
        canManageUsers: false,
        canApprove: false,
        crossDepartmentAccess: false,
        permissions: {},
        allowedEntities: [],
      },
  );

  const standardLevels = Array.from({ length: 15 }, (_, i) => `L${i + 1}`);
  const customDbLevels = Array.from(
    new Set(roles.map((r: any) => r.hierarchyLevel).filter(Boolean)),
  )
    .filter((lvl: any) => !standardLevels.includes(lvl))
    .sort((a: any, b: any) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  const [isCustomLevel, setIsCustomLevel] = useState(
    initialData?.hierarchyLevel
      ? !standardLevels.includes(initialData.hierarchyLevel) &&
      !customDbLevels.includes(initialData.hierarchyLevel)
      : false,
  );

  const [entities, setEntities] = useState<any[]>([]);
  useEffect(() => {
    entitiesApi
      .getAll()
      .then(setEntities)
      .catch(() => { });
  }, []);

  const submit = async () => {
    try {
      setLoading(true);
      const payload: any = { ...form };
      ["department", "reportingTo", "hierarchyLevel"].forEach((key) => {
        if (payload[key] === "") payload[key] = null;
      });

      payload.permissions = { ...payload.permissions };
      if (payload.accessScope === "Custom") {
        payload.permissions.allowed_entities = payload.allowedEntities;
      } else {
        delete payload.permissions.allowed_entities;
      }
      delete payload.allowedEntities;

      // Map camelCase to snake_case for backend and synchronize dashboard_type in permissions
      payload.dashboard_type = payload.dashboardType ? String(payload.dashboardType).toLowerCase() : "employee";
      payload.permissions.dashboard_type = payload.dashboard_type;
      payload.can_manage_users = payload.canManageUsers;
      payload.can_approve = Boolean(form.canApprove);
      payload.cross_department_access = payload.crossDepartmentAccess;
      payload.access_scope = payload.accessScope;
      payload.reporting_to = payload.reportingTo;
      payload.hierarchy_level = payload.hierarchyLevel;

      delete payload.dashboardType;
      delete payload.canManageUsers;
      delete payload.crossDepartmentAccess;
      delete payload.accessScope;
      delete payload.reportingTo;
      delete payload.hierarchyLevel;

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
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Role Configuration
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>
            Role Name <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="e.g. Site Manager"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>
            Role Code <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="SITE_MGR"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <select
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          >
            <option value="">Select...</option>
            {departments.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Hierarchy Level</Label>
          <Select
            value={isCustomLevel ? "Custom" : form.hierarchyLevel || undefined}
            onValueChange={(v) => {
              if (v === "Custom") {
                setIsCustomLevel(true);
                setForm({ ...form, hierarchyLevel: "" });
              } else {
                setIsCustomLevel(false);
                setForm({ ...form, hierarchyLevel: v });
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Level..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {standardLevels.map((lvl: string) => (
                <SelectItem key={lvl} value={lvl}>
                  {lvl}
                </SelectItem>
              ))}
              {customDbLevels.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20 mt-1">
                    Custom Database Levels
                  </div>
                  {customDbLevels.map((lvl: any) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
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
              onChange={(e) => setForm({ ...form, hierarchyLevel: e.target.value })}
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
            onChange={(e) => setForm({ ...form, reportingTo: e.target.value })}
          >
            <option value="">Select...</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 col-span-2 pt-2 pb-2">
          <Label className="text-sm font-semibold">
            Can View Data <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between h-10 px-3 bg-muted/20 border-border/60 hover:bg-muted/40 font-normal"
              >
                <span className="truncate text-sm">
                  {form.accessScope === "Self"
                    ? "Self data only"
                    : form.accessScope === "Location"
                      ? "Data for their assigned location/site"
                      : form.accessScope === "Corporate"
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
                      checked={form.accessScope === "Self"}
                      onChange={() =>
                        setForm({ ...form, accessScope: "Self", allowedEntities: [] })
                      }
                    />
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">
                      Self data only
                    </span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-background rounded-md cursor-pointer group transition-colors">
                    <input
                      type="radio"
                      className="accent-primary w-4 h-4 cursor-pointer"
                      checked={form.accessScope === "Location"}
                      onChange={() =>
                        setForm({ ...form, accessScope: "Location", allowedEntities: [] })
                      }
                    />
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">
                      Their assigned Location / Site
                    </span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-background rounded-md cursor-pointer group transition-colors">
                    <input
                      type="radio"
                      className="accent-primary w-4 h-4 cursor-pointer"
                      checked={form.accessScope === "Corporate"}
                      onChange={() =>
                        setForm({ ...form, accessScope: "Corporate", allowedEntities: [] })
                      }
                    />
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">
                      All data of the entities
                    </span>
                  </label>
                </div>
                <div className="p-3">
                  <div className="px-2 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Choose Entities
                  </div>
                  <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {entities.map((ent) => (
                      <label
                        key={ent.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-md cursor-pointer group transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="accent-primary rounded w-4 h-4 cursor-pointer"
                          checked={
                            form.accessScope === "Custom" && form.allowedEntities.includes(ent.id)
                          }
                          onChange={(e) => {
                            let newEntities = [...form.allowedEntities];
                            if (e.target.checked) newEntities.push(ent.id);
                            else newEntities = newEntities.filter((id: number) => id !== ent.id);

                            setForm({
                              ...form,
                              accessScope: newEntities.length > 0 ? "Custom" : "Corporate",
                              allowedEntities: newEntities,
                            });
                          }}
                        />
                        <span className="text-sm font-medium opacity-90 group-hover:opacity-100">
                          {ent.name}
                        </span>
                      </label>
                    ))}
                    {entities.length === 0 && (
                      <div className="text-xs text-muted-foreground italic px-2 py-4 text-center">
                        Loading entities...
                      </div>
                    )}
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
            onChange={(e) => setForm({ ...form, dashboardType: e.target.value })}
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
            <Switch
              checked={form.canManageUsers}
              onCheckedChange={(v) => setForm({ ...form, canManageUsers: v })}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
        <div className="space-y-2 flex flex-col justify-center">
          <div className="flex items-center justify-between max-w-[200px]">
            <Label>Can Approve</Label>
            <Switch
              checked={form.canApprove}
              onCheckedChange={(v) => setForm({ ...form, canApprove: v })}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
        <div className="space-y-2 flex flex-col justify-center">
          <div className="flex items-center justify-between max-w-[200px]">
            <Label>Cross-Department Access</Label>
            <Switch
              checked={form.crossDepartmentAccess}
              onCheckedChange={(v) => setForm({ ...form, crossDepartmentAccess: v })}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Save Role
        </Button>
      </div>
    </div>
  );
}

function UserForm({
  departments,
  roles,
  nodeTypes,
  employees,
  sites,
  initialData,
  onClose,
}: {
  departments: any[];
  roles: any[];
  nodeTypes: any[];
  employees: any[];
  sites: any[];
  initialData?: any;
  onClose: () => void;
}) {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(
    initialData
      ? {
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
        password: "Password123!", // Ignored on edit typically, or leave as default
      }
      : {
        firstName: "",
        lastName: "",
        code: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        dynamicRole: "",
        entity: "",
        branch: "",
        site: "",
        manager: "",
        mfaEnabled: false,
        status: "Active" as "Active" | "Inactive",
        password: "Password123!",
      },
  );

  const submit = async () => {
    try {
      if (!form.firstName?.trim() || !form.lastName?.trim()) {
        toast.error("First Name and Last Name are required");
        return;
      }
      if (!form.email?.trim() && !form.phone?.trim()) {
        toast.error("Either Email or Mobile number is required to register an employee");
        return;
      }

      setLoading(true);
      const payload: any = { ...form };
      payload.first_name = payload.firstName;
      payload.last_name = payload.lastName;
      payload.mfa_enabled = payload.mfaEnabled;
      payload.dynamic_role = payload.dynamicRole;
      payload.send_credentials = false;

      delete payload.firstName;
      delete payload.lastName;
      delete payload.mfaEnabled;
      delete payload.dynamicRole;

      if (!payload.email || !payload.email.trim()) {
        payload.email = null;
      }

      [
        "department",
        "designation",
        "dynamic_role",
        "entity",
        "branch",
        "site",
        "phone",
        "manager",
      ].forEach((key) => {
        if (payload[key] === "") payload[key] = null;
      });

      if (initialData && initialData.id) {
        await employeesApi.update(initialData.id, payload);
        toast.success("User updated successfully!");
        if (refreshUser) {
          try {
            await refreshUser();
          } catch { }
        }
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
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Personal Information
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="e.g. Aarav"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="e.g. Mehta"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>
            Employee ID <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="EMP001"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>
            Email{" "}
            {form.phone ? (
              <span className="text-muted-foreground text-xs font-normal">(Optional if Mobile provided)</span>
            ) : (
              <span className="text-destructive">*</span>
            )}
          </Label>
          <Input
            placeholder="user@logicon.io"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>
            Mobile{" "}
            {form.email ? (
              <span className="text-muted-foreground text-xs font-normal">(Optional if Email provided)</span>
            ) : (
              <span className="text-destructive">*</span>
            )}
          </Label>
          <Input
            placeholder="+91 98100 00000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="col-span-2 bg-muted/40 p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-primary" />
              Credentials Delivery
            </p>
            <p className="text-muted-foreground mt-0.5">
              Login credentials are not sent automatically on save. You can dispatch them at any time by selecting the user's checkbox and clicking &quot;Send Login Email&quot; in the Users list.
            </p>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            Manual Dispatch
          </span>
        </div>
      </div>

      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4">
        Organizational Assignment
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>
            Department <span className="text-destructive">*</span>
          </Label>
          <select
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          >
            <option value="">Select...</option>
            {departments.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>
            Role <span className="text-destructive">*</span>
          </Label>
          <select
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.dynamicRole}
            onChange={(e) => setForm({ ...form, dynamicRole: e.target.value })}
          >
            <option value="" disabled>
              Select role
            </option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Reporting Manager</Label>
          <select
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.manager || ""}
            onChange={(e) => setForm({ ...form, manager: e.target.value })}
          >
            <option value="">None</option>
            {employees.map((emp) => (
              <option key={emp.id} value={String(emp.id)}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Site</Label>
          <select
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.site || ""}
            onChange={(e) => setForm({ ...form, site: e.target.value })}
          >
            <option value="">None</option>
            {sites.map((site) => (
              <option key={site.id} value={String(site.id)}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as "Active" | "Inactive" })}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {form.status === "Active"
              ? "Active: User can log in to web/mobile and mark attendance."
              : "Inactive: Account is deactivated. User cannot log in and is excluded from kiosk attendance."}
          </p>
        </div>
        <div className="space-y-2 flex flex-col justify-center pt-6">
          <div className="flex items-center justify-between max-w-[200px]">
            <Label>MFA Enabled</Label>
            <Switch
              checked={form.mfaEnabled}
              onCheckedChange={(v) => setForm({ ...form, mfaEnabled: v })}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur py-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Save User
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------
// ROLE PERMISSIONS COMPONENT
// ---------------------------------------------------------------------------------

const MODULES = [
  { group: "Overview", items: ["Dashboard"] },
  {
    group: "Organisation",
    items: ["Entities", "Branches", "Sub Sites", "Departments", "Designations", "Roles & Users"],
  },
  {
    group: "People",
    items: [
      "Employees",
      "Announcements",
      "My Calendar",
      "Offer Letters",
      "Offer Templates",
      "Separation Request",
      "Manage Exits",
      "Documents",
    ],
  },
  {
    group: "Attendance",
    items: [
      "Attendance",
      "Shift Definitions",
      "Weekly Roster",
      "QR Check-in",
      "Face Verification",
      "GPS Capture",
      "Regularization",
    ],
  },
  { group: "Leave", items: ["Leave Requests", "Inbox", "Leave Policies", "Leave Balances"] },
  { group: "Holiday Planner", items: ["Holiday Planner", "Calendar"] },
  {
    group: "Payroll",
    items: [
      "Payroll Overview",
      "Salary Structure",
      "Import CTC",
      "Run Payroll",
      "Salary Slips",
      "Compliance",
      "Loans & Advances",
      "Reimbursements",
      "Disciplinary Memos",
    ],
  },
  { group: "FORM 16", items: ["Form 16 Management", "My Form 16", "Bulk Form 16"] },
  { group: "Insights", items: ["Organization Tree", "Reports", "Settings"] },
];

function TriStateCheckbox({
  checked,
  indeterminate,
  onChange,
  title,
  className = "",
  id,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      checked={checked}
      title={title}
      onChange={(e) => onChange(e.target.checked)}
      className={cn(
        "w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer transition-all",
        className
      )}
    />
  );
}

function RolePermissionsTab() {
  const { user, refreshUser } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [permissions, setPermissions] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    rolesApi
      .getAll()
      .then((res) => {
        setRoles(res);
        if (res.length > 0) setSelectedRole(String(res[0].id));
      })
      .catch(() => { });
    entitiesApi.getAll().then((res) => setEntities(res)).catch(() => { });
  }, []);

  useEffect(() => {
    if (!selectedRole) return;
    const role = roles.find((r) => String(r.id) === selectedRole);
    if (role) {
      const p = { ...(role.permissions || {}) };
      if (p["Sites"] && !p["Sub Sites"]) {
        p["Sub Sites"] = p["Sites"];
      }
      if (role.dashboard_type && !p.dashboard_type) {
        p.dashboard_type = String(role.dashboard_type).toLowerCase();
      }
      setPermissions(p);
    }
  }, [selectedRole, roles]);

  // Dynamically restrict available modules to the site's assigned modules
  const availableModules = useMemo(() => {
    if (!user?.site_modules || !Array.isArray(user.site_modules) || isSuperAdminUser(user)) {
      return MODULES;
    }
    const siteMods = user.site_modules;
    return MODULES.map((group) => {
      const allowedItems = group.items.filter((item) => {
        if (siteMods.includes(item)) return true;
        if ((item === "Sub Sites" || item === "Sites") && (siteMods.includes("Sub Sites") || siteMods.includes("Sites"))) {
          return true;
        }
        return false;
      });
      return {
        group: group.group,
        items: allowedItems,
      };
    }).filter((g) => g.items.length > 0);
  }, [user]);

  const allModuleNames = useMemo(() => availableModules.flatMap((g) => g.items), [availableModules]);

  // Filter modules based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return availableModules;
    const q = searchQuery.toLowerCase().trim();
    return availableModules.map((group) => {
      const groupMatches = group.group.toLowerCase().includes(q);
      const matchingItems = group.items.filter((item) => item.toLowerCase().includes(q));
      return {
        group: group.group,
        items: groupMatches ? group.items : matchingItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [searchQuery, availableModules]);

  // Master Select All calculations
  const totalMasterCount = useMemo(() => {
    let count = 0;
    for (const mod of allModuleNames) {
      const p = permissions[mod];
      if (p) {
        if (p.view) count++;
        if (p.create) count++;
        if (p.update) count++;
        if (p.delete) count++;
      }
    }
    return count;
  }, [permissions, allModuleNames]);

  const maxMasterCount = allModuleNames.length * 4;
  const isMasterChecked = totalMasterCount === maxMasterCount && maxMasterCount > 0;
  const isMasterIndeterminate = totalMasterCount > 0 && !isMasterChecked;

  // Master Toggle: selects or clears all 4 CRUD actions for all modules
  const handleMasterToggle = (checked: boolean) => {
    setPermissions((prev: any) => {
      const next = { ...prev };
      allModuleNames.forEach((mod) => {
        next[mod] = {
          view: checked,
          create: checked,
          update: checked,
          delete: checked,
        };
      });
      return next;
    });
  };

  // Quick Action: Read-Only for all modules
  const handleReadOnlyAll = () => {
    setPermissions((prev: any) => {
      const next = { ...prev };
      allModuleNames.forEach((mod) => {
        next[mod] = {
          view: true,
          create: false,
          update: false,
          delete: false,
        };
      });
      return next;
    });
  };

  // Column Select All states and handler
  const getColumnState = (action: "view" | "create" | "update" | "delete") => {
    let count = 0;
    for (const mod of allModuleNames) {
      if (permissions[mod]?.[action]) count++;
    }
    const isChecked = count === allModuleNames.length && allModuleNames.length > 0;
    const isIndeterminate = count > 0 && !isChecked;
    return { isChecked, isIndeterminate, count };
  };

  const handleColumnToggle = (action: string, checked: boolean) => {
    setPermissions((prev: any) => {
      const next = { ...prev };
      allModuleNames.forEach((mod) => {
        const current = next[mod] || {
          view: false,
          create: false,
          update: false,
          delete: false,
        };
        const updatedMod = { ...current, [action]: checked };
        if (checked) {
          if (action !== "view") {
            updatedMod.view = true;
          }
        } else {
          if (action === "view") {
            updatedMod.create = false;
            updatedMod.update = false;
            updatedMod.delete = false;
          }
        }
        next[mod] = updatedMod;
      });
      return next;
    });
  };

  // Group Select All states and handler
  const getGroupState = (items: string[]) => {
    let count = 0;
    for (const mod of items) {
      const p = permissions[mod];
      if (p) {
        if (p.view) count++;
        if (p.create) count++;
        if (p.update) count++;
        if (p.delete) count++;
      }
    }
    const max = items.length * 4;
    const isChecked = count === max && max > 0;
    const isIndeterminate = count > 0 && !isChecked;
    return { isChecked, isIndeterminate, count, max };
  };

  const handleGroupToggle = (items: string[], checked: boolean) => {
    setPermissions((prev: any) => {
      const next = { ...prev };
      items.forEach((mod) => {
        next[mod] = {
          view: checked,
          create: checked,
          update: checked,
          delete: checked,
        };
      });
      return next;
    });
  };

  // Row-level Select All for an individual module
  const getModuleState = (mod: string) => {
    const p = permissions[mod] || {
      view: false,
      create: false,
      update: false,
      delete: false,
    };
    let count = 0;
    if (p.view) count++;
    if (p.create) count++;
    if (p.update) count++;
    if (p.delete) count++;
    const isChecked = count === 4;
    const isIndeterminate = count > 0 && !isChecked;
    return { isChecked, isIndeterminate, count, perms: p };
  };

  const handleModuleAllToggle = (mod: string, checked: boolean) => {
    setPermissions((prev: any) => ({
      ...prev,
      [mod]: {
        view: checked,
        create: checked,
        update: checked,
        delete: checked,
      },
    }));
  };

  // Individual action toggle (preserving dependent logic)
  const handleToggle = (moduleName: string, action: string, checked: boolean) => {
    setPermissions((prev: any) => {
      const current = prev[moduleName] || {
        create: false,
        view: false,
        update: false,
        delete: false,
      };
      const next = { ...current, [action]: checked };

      if (checked) {
        // If enabling any action, 'view' must also be enabled
        if (action === "create" || action === "update" || action === "delete") {
          next.view = true;
        }
      } else {
        // If disabling 'view', all other actions must be disabled
        if (action === "view") {
          next.create = false;
          next.update = false;
          next.delete = false;
        }
      }

      return {
        ...prev,
        [moduleName]: next,
      };
    });
  };

  const handleSpecialToggle = (key: string, value: boolean | string) => {
    setPermissions((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      const finalPerms = { ...permissions };
      if (finalPerms["Sub Sites"]) {
        finalPerms["Sites"] = finalPerms["Sub Sites"];
      }
      if (finalPerms.can_run_payroll) {
        finalPerms["Run Payroll"] = { ...(finalPerms["Run Payroll"] || {}), view: true, create: true };
      }
      if (finalPerms.can_approve_payroll) {
        finalPerms["Run Payroll"] = { ...(finalPerms["Run Payroll"] || {}), view: true, update: true };
      }
      const dashTypeVal = finalPerms.dashboard_type ? String(finalPerms.dashboard_type).toLowerCase() : undefined;
      await rolesApi.update(selectedRole, {
        permissions: finalPerms,
        dashboard_type: dashTypeVal,
        can_approve: Boolean(finalPerms.can_approve_payroll || finalPerms.can_approve),
      });
      toast.success("Permissions updated successfully");
      // Update local state roles
      setRoles(roles.map((r) => (String(r.id) === selectedRole ? { ...r, permissions: finalPerms, dashboard_type: dashTypeVal, can_approve: Boolean(finalPerms.can_approve_payroll || finalPerms.can_approve) } : r)));
      if (refreshUser) {
        await refreshUser();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const viewColState = getColumnState("view");
  const createColState = getColumnState("create");
  const updateColState = getColumnState("update");
  const deleteColState = getColumnState("delete");

  if (roles.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No roles found. Please create a role first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">Permission Matrix</h2>
          <p className="text-sm text-muted-foreground">
            Configure detailed access rights for each module.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={savePermissions}
            disabled={saving || !selectedRole}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            {saving ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/20 border rounded-lg">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleMasterToggle(true)}
            className="text-xs h-8 font-medium cursor-pointer"
          >
            Select All Modules
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReadOnlyAll}
            className="text-xs h-8 font-medium cursor-pointer"
          >
            Read-Only All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleMasterToggle(false)}
            className="text-xs h-8 text-muted-foreground hover:text-destructive cursor-pointer"
          >
            Clear All
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="border rounded-md overflow-hidden bg-background shadow-xs">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-3 font-medium text-muted-foreground w-2/5">
                <div className="flex items-center gap-2.5">
                  <TriStateCheckbox
                    id="master-select-all"
                    checked={isMasterChecked}
                    indeterminate={isMasterIndeterminate}
                    onChange={handleMasterToggle}
                    title="Select / Deselect all modules"
                  />
                  <label htmlFor="master-select-all" className="cursor-pointer select-none font-semibold text-foreground">
                    Module
                  </label>
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select All</span>
                  <span className="text-[10px] text-muted-foreground/75 font-normal">(Individual Module)</span>
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <TriStateCheckbox
                    id="col-view"
                    checked={viewColState.isChecked}
                    indeterminate={viewColState.isIndeterminate}
                    onChange={(checked) => handleColumnToggle("view", checked)}
                    title="Toggle View for all modules"
                  />
                  <label htmlFor="col-view" className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider">
                    View
                  </label>
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <TriStateCheckbox
                    id="col-create"
                    checked={createColState.isChecked}
                    indeterminate={createColState.isIndeterminate}
                    onChange={(checked) => handleColumnToggle("create", checked)}
                    title="Toggle Create for all modules"
                  />
                  <label htmlFor="col-create" className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider">
                    Create
                  </label>
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <TriStateCheckbox
                    id="col-update"
                    checked={updateColState.isChecked}
                    indeterminate={updateColState.isIndeterminate}
                    onChange={(checked) => handleColumnToggle("update", checked)}
                    title="Toggle Update for all modules"
                  />
                  <label htmlFor="col-update" className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider">
                    Update
                  </label>
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <TriStateCheckbox
                    id="col-delete"
                    checked={deleteColState.isChecked}
                    indeterminate={deleteColState.isIndeterminate}
                    onChange={(checked) => handleColumnToggle("delete", checked)}
                    title="Toggle Delete for all modules"
                  />
                  <label htmlFor="col-delete" className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider">
                    Delete
                  </label>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredModules.map((group, gIdx) => {
              const groupState = getGroupState(group.items);
              return (
                <Fragment key={gIdx}>
                  <tr className="bg-muted/20 border-t border-b border-muted">
                    <td colSpan={2} className="px-6 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <TriStateCheckbox
                          id={`group-${group.group}`}
                          checked={groupState.isChecked}
                          indeterminate={groupState.isIndeterminate}
                          onChange={(checked) => handleGroupToggle(group.items, checked)}
                          title={`Select / Deselect all in ${group.group}`}
                        />
                        <label
                          htmlFor={`group-${group.group}`}
                          className="font-bold text-xs uppercase tracking-wider text-primary cursor-pointer select-none flex items-center gap-2"
                        >
                          <span>{group.group}</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal bg-background/80">
                            {group.items.length} {group.items.length === 1 ? "module" : "modules"}
                          </Badge>
                        </label>
                      </div>
                    </td>
                    <td colSpan={4} className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleGroupToggle(group.items, !groupState.isChecked)}
                        className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer mr-2"
                      >
                        {groupState.isChecked ? "Deselect Group" : "Select Group"}
                      </button>
                    </td>
                  </tr>
                  {group.items.map((mod) => {
                    const modState = getModuleState(mod);
                    const modsPerms = modState.perms;
                    return (
                      <tr key={mod} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 font-medium">
                          <div className="text-sm text-foreground">{mod}</div>
                          {mod === "Dashboard" && (
                            <div className="mt-2">
                              <Select
                                value={permissions.dashboard_type || "employee"}
                                onValueChange={(val) => handleSpecialToggle("dashboard_type", val)}
                              >
                                <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                                  <SelectValue placeholder="Select dashboard" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="executive">Executive</SelectItem>
                                  <SelectItem value="payroll_admin">Payroll Admin</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="employee">Employee</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </td>
                        {/* Individual module Select All */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <TriStateCheckbox
                              id={`row-all-${mod}`}
                              checked={modState.isChecked}
                              indeterminate={modState.isIndeterminate}
                              onChange={(checked) => handleModuleAllToggle(mod, checked)}
                              title={`Toggle all permissions for ${mod}`}
                              className="accent-primary"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={modsPerms.view}
                            onChange={(e) => handleToggle(mod, "view", e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={modsPerms.create}
                            onChange={(e) => handleToggle(mod, "create", e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={modsPerms.update}
                            onChange={(e) => handleToggle(mod, "update", e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={modsPerms.delete}
                            onChange={(e) => handleToggle(mod, "delete", e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border rounded-md p-6 bg-muted/10 space-y-4">
        <h3 className="text-sm font-semibold">Special Workflow Permissions</h3>
        <p className="text-xs text-muted-foreground mb-4">
          These permissions drive the automated payroll and approval workflows.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Run Payroll</Label>
              <div className="text-xs text-muted-foreground">
                Calculate salaries and view masked previews.
              </div>
            </div>
            <Switch
              checked={!!permissions.can_run_payroll}
              onCheckedChange={(v) => handleSpecialToggle("can_run_payroll", v)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">View Confidential Payroll</Label>
              <div className="text-xs text-muted-foreground">
                See raw gross, net, and deduction amounts.
              </div>
            </div>
            <Switch
              checked={!!permissions.can_view_confidential_payroll}
              onCheckedChange={(v) => handleSpecialToggle("can_view_confidential_payroll", v)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Approve Payroll</Label>
              <div className="text-xs text-muted-foreground">
                Receive review notifications and accept/reject.
              </div>
            </div>
            <Switch
              checked={!!permissions.can_approve_payroll}
              onCheckedChange={(v) => handleSpecialToggle("can_approve_payroll", v)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Release Salary (Finance)</Label>
              <div className="text-xs text-muted-foreground">
                Get notified to disburse funds once approved.
              </div>
            </div>
            <Switch
              checked={!!permissions.can_release_salary}
              onCheckedChange={(v) => handleSpecialToggle("can_release_salary", v)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Add Compensation</Label>
              <div className="text-xs text-muted-foreground">
                Exclusive permission to add CTC, Bonus, and PF for new employees.
              </div>
            </div>
            <Switch
              checked={!!permissions.can_add_ctc}
              onCheckedChange={(v) => handleSpecialToggle("can_add_ctc", v)}
            />
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

  const [formData, setFormData] = useState<{
    maxLateMinutes: number;
    halfDayHours: number;
    fullDayHours: number;
    otApplicableAfterHours: number;
    requireFace: boolean;
    requireQr: boolean;
    requireGps: boolean;
    wfhEmployees: string[];
  }>({
    maxLateMinutes: 15,
    halfDayHours: 4.0,
    fullDayHours: 8.0,
    otApplicableAfterHours: 2.0,
    requireFace: true,
    requireQr: true,
    requireGps: true,
    wfhEmployees: [],
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdownError, setDropdownError] = useState<string | null>(null);
  const [wfhEntityFilter, setWfhEntityFilter] = useState<string>("");

  useEffect(() => {
    Promise.all([entitiesApi.getAll(), sitesApi.getAll(), employeesApi.getAll()])
      .then(([ents, sts, emps]) => {
        setEntities(Array.isArray(ents) ? ents : (ents as any).results || []);
        setSites(Array.isArray(sts) ? sts : (sts as any).results || []);
        setEmployees(Array.isArray(emps) ? emps : (emps as any).results || []);
      })
      .catch((err) => {
        setDropdownError(err.message || String(err));
      });
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [scope, selectedId, selectedEmployeeId]);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      let params = "";
      if (selectedEmployeeId) {
        params = `?employee=${selectedEmployeeId}`;
      } else if (scope === "entity" && selectedId) {
        params = `?organization=${selectedId}`;
      } else if (scope === "site" && selectedId) {
        params = `?site=${selectedId}`;
      } else if (scope === "global") {
        params = `?is_global=true`;
      } else {
        setLoading(false);
        return;
      }

      const res = await attendancePoliciesApi.getAll(params);
      const list = Array.isArray(res) ? res : (res as any)?.results || [];

      // If we got results, use the first matching one
      if (list.length > 0) {
        const p = list[0];
        setPolicyId(p.id);
        setFormData({
          maxLateMinutes: p.maxLateMinutes ?? p.max_late_minutes ?? 15,
          halfDayHours: parseFloat(p.halfDayHours ?? p.half_day_hours ?? 4.0),
          fullDayHours: parseFloat(p.fullDayHours ?? p.full_day_hours ?? 8.0),
          otApplicableAfterHours: parseFloat(
            (p.otApplicableAfterHours ?? p.ot_applicable_after_hours) || 2.0,
          ),
          requireFace: p.requireFace ?? p.require_face ?? true,
          requireQr: p.requireQr ?? p.require_qr ?? true,
          requireGps: p.requireGps ?? p.require_gps ?? true,
          wfhEmployees: (p.wfhEmployees ?? p.wfh_employees ?? []).map((x: any) =>
            String(typeof x === "object" && x !== null ? x.id : x),
          ),
        });
      } else {
        // No policy found for this scope, reset to defaults
        setPolicyId(null);
        setFormData({
          maxLateMinutes: 15,
          halfDayHours: 4.0,
          fullDayHours: 8.0,
          otApplicableAfterHours: 2.0,
          requireFace: true,
          requireQr: true,
          requireGps: true,
          wfhEmployees: [],
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
      const payload: any = {
        max_late_minutes: formData.maxLateMinutes,
        half_day_hours: formData.halfDayHours,
        full_day_hours: formData.fullDayHours,
        ot_applicable_after_hours: formData.otApplicableAfterHours,
        require_face: formData.requireFace,
        require_qr: formData.requireQr,
        require_gps: formData.requireGps,
        wfh_employees: formData.wfhEmployees.map(Number),
        wfhEmployees: formData.wfhEmployees.map(Number),
      };
      if (selectedEmployeeId) {
        payload.employee = selectedEmployeeId;
      } else {
        if (scope === "entity" && selectedId) payload.organization = selectedId;
        if (scope === "site" && selectedId) payload.site = selectedId;
      }

      if (policyId) {
        const res = await attendancePoliciesApi.update(policyId, payload);
        if (res && res.id) setPolicyId(res.id);
        toast.success("Attendance Policy updated!");
        await fetchPolicy();
      } else {
        const res = await attendancePoliciesApi.create(payload);
        if (res && res.id) setPolicyId(res.id);
        toast.success("Attendance Policy saved!");
        await fetchPolicy();
      }
    } catch (e: any) {
      console.error(e);
      let errMsg = "Failed to save policy";
      if (e?.message) errMsg = e.message;
      else if (typeof e === "object") {
        const firstKey = Object.keys(e)[0];
        if (firstKey && Array.isArray(e[firstKey])) {
          errMsg = `${firstKey}: ${e[firstKey][0]}`;
        }
      }
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 pb-6 border-b">
        <div>
          <h3 className="text-lg font-medium">Configurable Attendance Policies</h3>
          <p className="text-sm text-muted-foreground">
            Manage attendance rules globally or override them per entity/site.
          </p>
        </div>

        {dropdownError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
            <strong>Error loading dropdowns:</strong> {dropdownError}
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label>Policy Scope</Label>
            <Select
              value={scope}
              onValueChange={(v) => {
                setScope(v);
                setSelectedId("");
                setSelectedEmployeeId("");
              }}
            >
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

          {scope === "entity" && (
            <div className="space-y-1">
              <Label>Select Entity</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === "site" && (
            <div className="space-y-1">
              <Label>Select Site</Label>
              <Select
                value={selectedId}
                onValueChange={(v) => {
                  setSelectedId(v);
                  setSelectedEmployeeId("");
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(scope === "entity" || scope === "site") && selectedId && (
            <div className="space-y-1">
              <Label>Select Employee (Optional)</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Employees (Default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Employees (Default)</SelectItem>
                  {employees
                    .filter((e) =>
                      scope === "entity" ? e.entity == selectedId : e.site == selectedId,
                    )
                    .map((e) => (
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
      ) : scope !== "global" && !selectedId ? (
        <div className="py-8 text-center text-muted-foreground">
          Please select an {scope} to configure its policy.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 border rounded-md bg-muted/10 space-y-4">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Remote Punch</Label>
              <p className="text-sm text-muted-foreground">
                Explicitly select which employees can bypass the geofence restriction under this policy.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Filter by Entity (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal" role="combobox">
                    {wfhEntityFilter === "all" || !wfhEntityFilter
                      ? "All Entities"
                      : entities.find(e => String(e.id) === wfhEntityFilter)?.name || "All Entities"}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search entity..." />
                    <CommandList>
                      <CommandEmpty>No entity found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all entities"
                          onSelect={() => setWfhEntityFilter("all")}
                        >
                          <Check className={cn("mr-2 h-4 w-4", wfhEntityFilter === "all" || !wfhEntityFilter ? "opacity-100" : "opacity-0")} />
                          All Entities
                        </CommandItem>
                        {entities.map((ent) => (
                          <CommandItem
                            key={ent.id}
                            value={ent.name}
                            onSelect={() => setWfhEntityFilter(String(ent.id))}
                          >
                            <Check className={cn("mr-2 h-4 w-4", wfhEntityFilter === String(ent.id) ? "opacity-100" : "opacity-0")} />
                            {ent.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal text-muted-foreground" role="combobox">
                    Select Employee(s)...
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employees by name or code..." />
                    <CommandList>
                      <CommandEmpty>No employees found.</CommandEmpty>
                      <CommandGroup>
                        {employees
                          .filter((emp) => {
                            if (!wfhEntityFilter || wfhEntityFilter === "all") return true;
                            // Check all possible ways the entity ID might be exposed in the frontend object
                            const empEntityId = emp.entity?.id || emp.entity || emp.organization?.id || emp.organization || emp.entity_id;
                            return String(empEntityId) === String(wfhEntityFilter);
                          })
                          .map((emp) => {
                            const empId = String(emp.id);
                            const isSelected = formData.wfhEmployees.includes(empId);
                            const fullName = `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim();
                            return (
                              <CommandItem
                                key={empId}
                                value={`${fullName} ${emp.code || ""}`}
                                onSelect={() => {
                                  if (isSelected) {
                                    setFormData({
                                      ...formData,
                                      wfhEmployees: formData.wfhEmployees.filter((id) => id !== empId),
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      wfhEmployees: [...formData.wfhEmployees, empId],
                                    });
                                  }
                                }}
                              >
                                <div className="flex items-center space-x-2 w-full">
                                  <Checkbox checked={isSelected} className="pointer-events-none" />
                                  <span className="flex-1 font-medium">{fullName} <span className="text-muted-foreground font-normal ml-1">({emp.code || "No Code"})</span></span>
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                    <div className="p-2 border-t bg-muted/20 flex justify-end">
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Selection"}
                      </Button>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>

              {formData.wfhEmployees.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.wfhEmployees.map((empId) => {
                    const emp = employees.find((e) => String(e.id) === String(empId));
                    const fullName = emp
                      ? `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim() || emp.code || `Employee #${empId}`
                      : `Employee #${empId}`;
                    return (
                      <Badge key={empId} variant="secondary" className="px-3 py-1 flex items-center space-x-1 text-sm bg-background border shadow-sm">
                        <span>{fullName}</span>
                        <X
                          className="h-3.5 w-3.5 ml-1 cursor-pointer hover:text-destructive transition-colors"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              wfhEmployees: formData.wfhEmployees.filter((id) => String(id) !== String(empId)),
                            });
                          }}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Time Rules
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Max Late Minutes Allowed</Label>
                <Input
                  type="number"
                  value={formData.maxLateMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, maxLateMinutes: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Grace period before a punch is marked as late.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Half Day Threshold (Hours)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.halfDayHours}
                  onChange={(e) =>
                    setFormData({ ...formData, halfDayHours: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Full Day Threshold (Hours)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.fullDayHours}
                  onChange={(e) =>
                    setFormData({ ...formData, fullDayHours: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>OT Applies After (Hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.otApplicableAfterHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      otApplicableAfterHours: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Site-Isolated Punctuality & Late Deduction Slabs */}
          <div className="pt-6 border-t">
            <PunctualitySlabsSection
              policyId={policyId}
              scope={scope}
              selectedId={selectedId}
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : policyId ? "Update Policy" : "Create Policy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------
// PUNCTUALITY SLABS COMPONENT
// ---------------------------------------------------------------------------------

function PunctualitySlabsSection({
  policyId,
  scope,
  selectedId,
}: {
  policyId: number | null;
  scope: string;
  selectedId: string;
}) {
  const [slabs, setSlabs] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlab, setEditingSlab] = useState<any>(null);

  const [name, setName] = useState("");
  const [comparisonType, setComparisonType] = useState("AFTER_MANDATORY_PRIOR");
  const [minutesThreshold, setMinutesThreshold] = useState<number>(15);
  const [deductionType, setDeductionType] = useState("FIXED_AMOUNT");
  const [deductionValue, setDeductionValue] = useState<string>("100.00");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedDesignationIds, setSelectedDesignationIds] = useState<number[]>([]);
  const [order, setOrder] = useState<number>(1);
  const [savingSlab, setSavingSlab] = useState(false);

  // Dynamically fetch roles & designations for this specific site
  const fetchAvailableRoles = async () => {
    setLoadingRoles(true);
    try {
      const siteParam =
        scope === "site" && selectedId
          ? `?site=${selectedId}`
          : policyId
          ? `?policy=${policyId}`
          : "";
      const res = await punctualitySlabsApi.getAvailableRoles(siteParam);
      setAvailableRoles(Array.isArray(res) ? res : res?.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchAvailableRoles();
  }, [selectedId, scope, policyId]);

  const fetchSlabs = async () => {
    if (!policyId) {
      setSlabs([]);
      return;
    }
    setLoading(true);
    try {
      const res = await punctualitySlabsApi.getAll(`?policy=${policyId}`);
      setSlabs(Array.isArray(res) ? res : res?.results || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load punctuality slabs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlabs();
  }, [policyId]);

  const handleOpenModal = (slab?: any) => {
    fetchAvailableRoles();
    if (slab) {
      setEditingSlab(slab);
      setName(slab.name || "");
      setComparisonType(slab.comparison_type || "AFTER_MANDATORY_PRIOR");
      setMinutesThreshold(slab.minutes_threshold || 0);
      setDeductionType(slab.deduction_type || "FIXED_AMOUNT");
      setDeductionValue(slab.deduction_value ? String(slab.deduction_value) : "0.00");
      setSelectedRoleIds(slab.applicable_role_ids || slab.applicableRoleIds || []);
      setSelectedDesignationIds(slab.applicable_designation_ids || slab.applicableDesignationIds || []);
      setOrder(slab.order || 1);
    } else {
      setEditingSlab(null);
      setName("");
      setComparisonType("AFTER_MANDATORY_PRIOR");
      setMinutesThreshold(15);
      setDeductionType("FIXED_AMOUNT");
      setDeductionValue("100.00");
      setSelectedRoleIds([]);
      setSelectedDesignationIds([]);
      setOrder(slabs.length + 1);
    }
    setModalOpen(true);
  };

  const handleSaveSlab = async () => {
    if (!policyId) {
      toast.error("Please save the policy first before configuring slabs");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter a slab name");
      return;
    }
    setSavingSlab(true);
    try {
      const payload = {
        policy: policyId,
        name: name.trim(),
        comparison_type: comparisonType,
        minutes_threshold: Number(minutesThreshold) || 0,
        deduction_type: deductionType,
        deduction_value: parseFloat(deductionValue) || 0,
        applicable_role_ids: selectedRoleIds,
        applicable_designation_ids: selectedDesignationIds,
        order: Number(order) || 1,
      };

      if (editingSlab) {
        await punctualitySlabsApi.update(editingSlab.id, payload);
        toast.success("Punctuality slab updated successfully");
      } else {
        await punctualitySlabsApi.create(payload);
        toast.success("Punctuality slab created successfully");
      }
      setModalOpen(false);
      fetchSlabs();
    } catch (e: any) {
      toast.error(e.message || "Failed to save punctuality slab");
    } finally {
      setSavingSlab(false);
    }
  };

  const handleDeleteSlab = async (id: number) => {
    if (!confirm("Are you sure you want to delete this punctuality slab?")) return;
    try {
      await punctualitySlabsApi.delete(id);
      toast.success("Slab deleted");
      fetchSlabs();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slab");
    }
  };

  const getConditionLabel = (slab: any) => {
    if (slab.comparison_type === "AFTER_MANDATORY_PRIOR") {
      return `> ${slab.minutes_threshold}m Prior to Shift Start`;
    } else if (slab.comparison_type === "AFTER_SHIFT_START") {
      return `> Exact Shift Start Time`;
    } else if (slab.comparison_type === "AFTER_GRACE_MINUTES") {
      return `> ${slab.minutes_threshold}m After Shift Start`;
    }
    return slab.comparison_type;
  };

  const getDeductionLabel = (slab: any) => {
    if (slab.deduction_type === "HALF_DAY") {
      return "Half Day Salary Cut";
    } else if (slab.deduction_type === "FIXED_AMOUNT") {
      return `₹ ${parseFloat(String(slab.deduction_value || "0")).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    } else if (slab.deduction_type === "PERCENTAGE") {
      return `${slab.deduction_value}% Daily Wage`;
    }
    return slab.deduction_value;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Punctuality Rules & Late Deductions
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure site-isolated tiered reporting windows (e.g. 15m prior arrival), penalty amounts, and half-day thresholds.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenModal()}
          disabled={!policyId}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Slab
        </Button>
      </div>

      {!policyId ? (
        <div className="p-4 bg-muted/40 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Please create or update the attendance policy above first to enable punctuality slab configuration.</span>
        </div>
      ) : loading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Loading slabs...</div>
      ) : slabs.length === 0 ? (
        <div className="p-6 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
          No punctuality slabs configured for this policy. Standard grace periods apply.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Slab Name</th>
                <th className="px-4 py-3">Applicable Roles</th>
                <th className="px-4 py-3">Trigger Condition</th>
                <th className="px-4 py-3">Deduction</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {slabs.map((slab) => {
                const rolesList = slab.applicable_roles_details || slab.applicableRolesDetails || [];
                const desigsList = slab.applicable_designations_details || slab.applicableDesignationsDetails || [];
                const hasSpecific = rolesList.length > 0 || desigsList.length > 0;

                return (
                  <tr key={slab.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">#{slab.order}</td>
                    <td className="px-4 py-3 font-medium">{slab.name}</td>
                    <td className="px-4 py-3">
                      {hasSpecific ? (
                        <div className="flex flex-wrap gap-1">
                          {rolesList.map((r: any) => (
                            <Badge key={`role-${r.id}`} variant="secondary" className="text-[11px] font-normal">
                              {r.name || r.title}
                            </Badge>
                          ))}
                          {desigsList.map((d: any) => (
                            <Badge key={`desig-${d.id}`} variant="outline" className="text-[11px] font-normal">
                              {d.title || d.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[11px] font-normal">
                          All Site Roles
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{getConditionLabel(slab)}</td>
                    <td className="px-4 py-3 font-medium text-amber-600 dark:text-amber-400">
                      {getDeductionLabel(slab)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenModal(slab)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteSlab(slab.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Slab Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingSlab ? "Edit Punctuality Slab" : "Add Punctuality Slab"}</DialogTitle>
            <DialogDescription>
              Configure the reporting window, trigger rule, and deduction amount for this site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Slab Name</Label>
              <Input
                placeholder="e.g. 15m Prior Reporting (Trainers)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Trigger Condition</Label>
                <Select value={comparisonType} onValueChange={setComparisonType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AFTER_MANDATORY_PRIOR">After Prior Mark (Before Shift)</SelectItem>
                    <SelectItem value="AFTER_SHIFT_START">After Exact Shift Start</SelectItem>
                    <SelectItem value="AFTER_GRACE_MINUTES">After Grace Period (Post Shift)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Minutes Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={minutesThreshold}
                  onChange={(e) => setMinutesThreshold(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Deduction Type</Label>
                <Select value={deductionType} onValueChange={setDeductionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED_AMOUNT">Fixed Amount (₹)</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day Salary Cut</SelectItem>
                    <SelectItem value="PERCENTAGE">% of Daily Wage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{deductionType === "HALF_DAY" ? "Factor" : deductionType === "PERCENTAGE" ? "Percentage (%)" : "Amount (₹)"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deductionValue}
                  onChange={(e) => setDeductionValue(e.target.value)}
                  placeholder={deductionType === "HALF_DAY" ? "0.5" : "100.00"}
                  disabled={deductionType === "HALF_DAY"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Priority Order</Label>
              <Input
                type="number"
                min="1"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Applicable Roles for this Site</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedRoleIds.length === 0 && selectedDesignationIds.length === 0
                    ? "Applies to all roles in this site"
                    : `${selectedRoleIds.length + selectedDesignationIds.length} selected`}
                </span>
              </Label>
              <p className="text-[11px] text-muted-foreground -mt-1">
                {scope === "site"
                  ? "Showing active roles and designations dynamically available for this site"
                  : "Select roles or designations subject to this punctuality rule"}
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 bg-muted/20">
                {loadingRoles ? (
                  <div className="text-xs text-muted-foreground p-2">Loading site roles...</div>
                ) : availableRoles.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">No roles found for this site. Rule will apply to all employees.</div>
                ) : (
                  availableRoles.map((item: any) => {
                    const isRole = item.type === "ROLE";
                    const isChecked = isRole
                      ? selectedRoleIds.includes(item.id)
                      : selectedDesignationIds.includes(item.id);

                    return (
                      <label
                        key={`${item.type}-${item.id}`}
                        className="flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-muted p-1.5 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (isRole) {
                                setSelectedRoleIds((prev) =>
                                  checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                                );
                              } else {
                                setSelectedDesignationIds((prev) =>
                                  checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                                );
                              }
                            }}
                          />
                          <span className="font-medium">{item.title}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-normal py-0 h-4">
                          {item.category || item.type}
                        </Badge>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlab} disabled={savingSlab}>
              {savingSlab ? "Saving..." : editingSlab ? "Update Slab" : "Create Slab"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------------
// EMPLOYEE WALLETS COMPONENT
// ---------------------------------------------------------------------------------

function WalletSettingsTab() {
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<any>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [walletPage, setWalletPage] = useState(1);
  const WALLETS_PER_PAGE = 10;

  // Policy Form State
  const [isEnabled, setIsEnabled] = useState(true);
  const [deductionBasis, setDeductionBasis] = useState("GROSS");
  const [deductionRate, setDeductionRate] = useState("10.00");
  const [targetCeiling, setTargetCeiling] = useState("30000.00");

  // Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState("MANUAL_ADJUSTMENT");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [customCeilingInput, setCustomCeilingInput] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    sitesApi.getAll().then((sts: any) => {
      const list = Array.isArray(sts) ? sts : sts?.results || [];
      setSites(list);
      if (list.length > 0) {
        setSelectedSiteId(String(list[0].id));
      }
    }).catch(console.error);
  }, []);

  const loadData = async () => {
    if (!selectedSiteId) return;
    setLoading(true);
    try {
      const [policyRes, walletsRes] = await Promise.all([
        walletPoliciesApi.getAll(`?site=${selectedSiteId}`),
        employeeWalletsApi.getAll(`?site=${selectedSiteId}`),
      ]);

      const policyList = Array.isArray(policyRes) ? policyRes : policyRes?.results || [];
      if (policyList.length > 0) {
        const p = policyList[0];
        setPolicy(p);
        setIsEnabled(p.is_enabled ?? p.isEnabled ?? true);
        setDeductionBasis(p.deduction_basis || p.deductionBasis || "GROSS");
        setDeductionRate(String(p.deduction_rate ?? p.deductionRate ?? "10.00"));
        setTargetCeiling(String(p.target_ceiling ?? p.targetCeiling ?? "30000.00"));
      } else {
        setPolicy(null);
        setIsEnabled(false);
        setDeductionBasis("GROSS");
        setDeductionRate("10.00");
        setTargetCeiling("30000.00");
      }

      const walletList = Array.isArray(walletsRes) ? walletsRes : walletsRes?.results || [];
      setWallets(walletList);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load wallet configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setWalletPage(1);
  }, [selectedSiteId]);

  const handleSavePolicy = async () => {
    if (!selectedSiteId) return;
    setSavingPolicy(true);
    try {
      const payload = {
        site: parseInt(selectedSiteId),
        is_enabled: isEnabled,
        deduction_basis: deductionBasis,
        deduction_rate: parseFloat(deductionRate) || 0,
        target_ceiling: parseFloat(targetCeiling) || 0,
      };

      if (policy && policy.id) {
        await walletPoliciesApi.update(policy.id, payload);
        toast.success("Wallet policy updated successfully");
      } else {
        const created = await walletPoliciesApi.create(payload);
        setPolicy(created);
        toast.success("Wallet policy created successfully");
      }
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to save wallet policy");
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleToggleEmployee = async (wallet: any) => {
    const currentActive = Boolean(wallet.isActive ?? wallet.is_active);
    try {
      const updated = await employeeWalletsApi.update(wallet.id, {
        is_active: !currentActive,
      });
      const newActive = updated.isActive ?? updated.is_active ?? !currentActive;
      setWallets((prev) =>
        prev.map((w) => (w.id === wallet.id ? { ...w, is_active: newActive, isActive: newActive } : w))
      );
      const empName = wallet.employeeName || wallet.employee_name || "Employee";
      toast.success(`Deduction ${newActive ? "enabled" : "paused"} for ${empName}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update employee wallet status");
    }
  };

  const handleOpenAdjustModal = (wallet: any) => {
    setSelectedWallet(wallet);
    setAdjustAmount("");
    setAdjustType("MANUAL_ADJUSTMENT");
    setAdjustNotes("");
    setCustomCeilingInput(
      wallet.customTargetCeiling || wallet.custom_target_ceiling
        ? String(wallet.customTargetCeiling || wallet.custom_target_ceiling)
        : ""
    );
    setAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedWallet) return;
    setAdjusting(true);
    try {
      // 1. Update Custom Ceiling if changed
      const rawCeiling = customCeilingInput.trim();
      const parsedCeiling = rawCeiling !== "" ? parseFloat(rawCeiling) : null;
      if (rawCeiling !== "" && (isNaN(parsedCeiling!) || parsedCeiling! < 0)) {
        toast.error("Please enter a valid positive ceiling limit");
        setAdjusting(false);
        return;
      }
      const currentCustomCeiling = selectedWallet.customTargetCeiling ?? selectedWallet.custom_target_ceiling ?? null;
      if (parsedCeiling !== currentCustomCeiling) {
        await employeeWalletsApi.update(selectedWallet.id, {
          custom_target_ceiling: parsedCeiling,
        });
      }

      // 2. Process Balance Adjustment if amount entered or RESET selected
      const curBal = parseFloat(String(selectedWallet.currentBalance ?? selectedWallet.current_balance ?? "0"));
      if (adjustType === "RESET") {
        if (curBal > 0) {
          await employeeWalletsApi.adjustBalance(selectedWallet.id, {
            amount: -curBal,
            transaction_type: "MANUAL_ADJUSTMENT",
            notes: adjustNotes || "Reset balance to ₹0.00",
          });
        }
      } else if (adjustAmount.trim() !== "") {
        const amt = parseFloat(adjustAmount);
        if (isNaN(amt) || amt === 0) {
          toast.error("Please enter a valid non-zero adjustment amount");
          setAdjusting(false);
          return;
        }
        await employeeWalletsApi.adjustBalance(selectedWallet.id, {
          amount: amt,
          transaction_type: adjustType,
          notes: adjustNotes || "Manual adjustment from settings",
        });
      }

      toast.success("Employee wallet updated successfully");
      setAdjustModalOpen(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update wallet");
    } finally {
      setAdjusting(false);
    }
  };

  const filteredWallets = wallets.filter((w) => {
    const q = searchQuery.toLowerCase();
    const name = (w.employeeName || w.employee_name || "").toLowerCase();
    const code = (w.employeeCode || w.employee_code || "").toLowerCase();
    const role = (w.roleName || w.role_name || w.designationTitle || w.designation_title || "").toLowerCase();
    const dept = (w.departmentName || w.department_name || "").toLowerCase();
    return name.includes(q) || code.includes(q) || role.includes(q) || dept.includes(q);
  });

  const totalRecords = filteredWallets.length;
  const totalPages = Math.ceil(totalRecords / WALLETS_PER_PAGE) || 1;
  const currentPage = Math.min(walletPage, totalPages);
  const paginatedWallets = filteredWallets.slice(
    (currentPage - 1) * WALLETS_PER_PAGE,
    currentPage * WALLETS_PER_PAGE
  );

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (currentPage > 3) {
      pages.push("ellipsis-1");
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push("ellipsis-2");
    }
    pages.push(totalPages);
    return pages;
  };

  const selectedSite = sites.find((s) => String(s.id) === String(selectedSiteId));

  return (
    <div className="space-y-6">
      {/* Header and Scope Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Employee Wallet & Security Deposit Settings
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure automated security deposit deductions, monthly ceiling caps, and employee-level toggles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold whitespace-nowrap">Site Scope:</Label>
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Policy Card */}
      <div className="p-5 border rounded-lg bg-card space-y-5">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-0.5">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              Site Policy: {selectedSite ? selectedSite.name : "Selected Site"}
            </h4>
            <p className="text-xs text-muted-foreground">
              When enabled, a percentage or fixed amount will be deducted monthly and held in employee security deposit wallets.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="master-wallet-toggle" className="text-xs font-medium cursor-pointer">
              {isEnabled ? "Deposit Policy Active" : "Deposit Policy Disabled"}
            </Label>
            <Switch
              id="master-wallet-toggle"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Deduction Method / Phasing</Label>
            <Select value={deductionBasis} onValueChange={setDeductionBasis}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIXED">Fixed Monthly Amount (₹) — Phased Monthly</SelectItem>
                <SelectItem value="GROSS">Percentage of Gross Salary (%) — Phased Monthly</SelectItem>
                <SelectItem value="BASIC">Percentage of Basic Salary (%) — Phased Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {deductionBasis === "FIXED" ? "Phase Deduction: Monthly Amount (₹)" : "Phase Deduction: Monthly Rate (%)"}
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={deductionRate}
              onChange={(e) => setDeductionRate(e.target.value)}
              placeholder={deductionBasis === "FIXED" ? "e.g. 3000.00" : "e.g. 10.00"}
            />
            <p className="text-[11px] text-muted-foreground">
              {deductionBasis === "FIXED"
                ? "Deducted each month during payroll until ceiling is reached."
                : "Percentage of salary deducted each month until ceiling is reached."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Maximum Target Ceiling Limit (₹)</Label>
            <Input
              type="number"
              step="1000"
              min="0"
              value={targetCeiling}
              onChange={(e) => setTargetCeiling(e.target.value)}
              placeholder="e.g. 30000.00"
            />
            <p className="text-[11px] text-muted-foreground">
              Total accumulation limit. Once reached, deductions stop completely (₹0.00).
            </p>
          </div>
        </div>

        <div className="p-3 bg-muted/40 rounded-md text-xs text-muted-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong>Phased Accumulation & Automatic Cessation:</strong> Each month when payroll runs, {deductionBasis === "FIXED" ? `₹${parseFloat(deductionRate || "0").toLocaleString("en-IN")}` : `${deductionRate}%`} will be deducted in phases and stored in the employee's wallet. Once the total balance reaches ₹{parseFloat(targetCeiling || "0").toLocaleString("en-IN")}, deductions completely stop and payslips will show ₹0.00 security deposit.
          </span>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSavePolicy} disabled={savingPolicy} size="sm">
            {savingPolicy ? "Saving Policy..." : "Save Policy Configuration"}
          </Button>
        </div>
      </div>

      {/* Employee Wallets List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-sm">Employee Wallets & Balances</h4>
            <p className="text-xs text-muted-foreground">
              Live balances and individual deposit deduction toggles for this site.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search employee or code..."
              className="pl-8 text-xs h-9"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setWalletPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading employee wallets...</div>
        ) : filteredWallets.length === 0 ? (
          <div className="p-8 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
            No employees found for this site.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Role / Dept</th>
                  <th className="px-4 py-3">Current Balance</th>
                  <th className="px-4 py-3">Ceiling Limit</th>
                  <th className="px-4 py-3">Accumulation Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Deduction Toggle</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedWallets.map((wallet) => {
                  const empName = wallet.employeeName || wallet.employee_name || "—";
                  const empCode = wallet.employeeCode || wallet.employee_code || "—";
                  const empRole = wallet.roleName || wallet.role_name || wallet.designationTitle || wallet.designation_title || "—";
                  const empDept = wallet.departmentName || wallet.department_name || "—";
                  const bal = parseFloat(String(wallet.currentBalance ?? wallet.current_balance ?? "0"));
                  const ceiling = parseFloat(String(wallet.effectiveCeiling ?? wallet.effective_ceiling ?? targetCeiling ?? "30000"));
                  const progress = Math.min(100, Math.round((bal / (ceiling || 1)) * 100));
                  const isCapMet = bal >= ceiling;
                  const isActive = Boolean(wallet.isActive ?? wallet.is_active);

                  return (
                    <tr key={wallet.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs sm:text-sm">{empName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{empCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-foreground">{empRole}</div>
                        <div className="text-[11px] text-muted-foreground">{empDept}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹ {bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-foreground">₹ {ceiling.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                        {wallet.customTargetCeiling || wallet.custom_target_ceiling ? (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">(Custom Cap)</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">(Site Default)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                isCapMet ? "bg-emerald-500" : "bg-primary"
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground w-9 text-right">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {!isEnabled ? (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30 text-[11px]">
                            Site Policy Disabled
                          </Badge>
                        ) : isCapMet ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px]">
                            Wallet Full (Deduction Stopped)
                          </Badge>
                        ) : !isActive ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px]">
                            Employee Toggle Off
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-[11px]">
                            Active (Accumulating)
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => handleToggleEmployee(wallet)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => handleOpenAdjustModal(wallet)}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Bar */}
            <div className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
              <div>
                Showing {totalRecords === 0 ? 0 : (currentPage - 1) * WALLETS_PER_PAGE + 1} - {Math.min(currentPage * WALLETS_PER_PAGE, totalRecords)} of {totalRecords} records
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setWalletPage(currentPage - 1);
                          }}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {getPageNumbers().map((p, idx) => {
                        if (typeof p === "string") {
                          return (
                            <PaginationItem key={`ellipsis-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={p === currentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                setWalletPage(p);
                              }}
                              className="cursor-pointer"
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setWalletPage(currentPage + 1);
                          }}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Adjust Balance Modal */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Adjust Employee Wallet & Ceiling</DialogTitle>
            <DialogDescription>
              Configure custom ceiling limits, record credits, refund debits, or reset balance for{" "}
              <strong>{selectedWallet?.employeeName || selectedWallet?.employee_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-md text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-semibold text-emerald-600">
                  ₹ {parseFloat(String(selectedWallet?.currentBalance ?? selectedWallet?.current_balance ?? "0")).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective Ceiling:</span>
                <span>₹ {parseFloat(String(selectedWallet?.effectiveCeiling ?? selectedWallet?.effective_ceiling ?? targetCeiling ?? "0")).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Custom Ceiling Override Field */}
            <div className="space-y-1.5 pt-2 border-t">
              <Label className="text-xs font-semibold">Custom Ceiling Limit for this Employee (₹)</Label>
              <Input
                type="number"
                step="500"
                min="0"
                placeholder={`Leave blank to inherit site limit (₹${parseFloat(targetCeiling || "0").toLocaleString("en-IN")})`}
                value={customCeilingInput}
                onChange={(e) => setCustomCeilingInput(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Set a custom accumulation limit for this employee. Leave empty to use the site default limit.
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <Label className="text-xs font-semibold">Balance Adjustment</Label>
              <Select value={adjustType} onValueChange={setAdjustType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL_ADJUSTMENT">Manual Credit (+)</SelectItem>
                  <SelectItem value="REFUND">Security Deposit Refund Debit (-)</SelectItem>
                  <SelectItem value="RESET">Reset Balance to ₹0.00</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {adjustType !== "RESET" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={adjustType === "REFUND" ? "e.g. -5000.00" : "e.g. 5000.00"}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  {adjustType === "REFUND"
                    ? "Enter a negative number (e.g. -5000) or positive number to deduct."
                    : "Enter amount to credit to the wallet."}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reason / Audit Notes</Label>
              <Input
                placeholder="e.g. Approved adjustment / reset"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdjustment} disabled={adjusting}>
              {adjusting ? "Processing..." : "Confirm Adjustment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
    exception_month: 3,
    is_saturday_working: false,
    require_full_attendance_for_al: true,
  });

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  useEffect(() => {
    leavesConfigApi
      .getSettings()
      .then((res) => {
        setForm({
          tenured_years_threshold: res.tenuredYearsThreshold ?? res.tenured_years_threshold ?? 5,
          tenured_annual_leaves: Number(res.tenuredAnnualLeaves ?? res.tenured_annual_leaves) || 15,
          standard_annual_leaves: Number(res.standardAnnualLeaves ?? res.standard_annual_leaves) || 12,
          max_consecutive_leaves: res.maxConsecutiveLeaves ?? res.max_consecutive_leaves ?? 3,
          exception_month: res.exceptionMonth ?? res.exception_month ?? 3,
          is_saturday_working: res.isSaturdayWorking === true || res.is_saturday_working === true || res.isSaturdayWorking === "true" || res.is_saturday_working === "true" || res.isSaturdayWorking === "True" || res.is_saturday_working === "True",
          require_full_attendance_for_al: res.requireFullAttendanceForAl === true || res.require_full_attendance_for_al === true || res.requireFullAttendanceForAl === "true" || res.require_full_attendance_for_al === "true" || res.requireFullAttendanceForAl === "True" || res.require_full_attendance_for_al === "True" || (res.requireFullAttendanceForAl === undefined && res.require_full_attendance_for_al === undefined),
        });
      })
      .catch(() => toast.error("Failed to load leave settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    leavesConfigApi
      .updateSettings(form)
      .then((res) => {
        toast.success("Leave policy updated successfully!");
        setForm({
          tenured_years_threshold: res.tenuredYearsThreshold ?? res.tenured_years_threshold ?? 5,
          tenured_annual_leaves: Number(res.tenuredAnnualLeaves ?? res.tenured_annual_leaves) || 15,
          standard_annual_leaves: Number(res.standardAnnualLeaves ?? res.standard_annual_leaves) || 12,
          max_consecutive_leaves: res.maxConsecutiveLeaves ?? res.max_consecutive_leaves ?? 3,
          exception_month: res.exceptionMonth ?? res.exception_month ?? 3,
          is_saturday_working: res.isSaturdayWorking === true || res.is_saturday_working === true || res.isSaturdayWorking === "true" || res.is_saturday_working === "true" || res.isSaturdayWorking === "True" || res.is_saturday_working === "True",
          require_full_attendance_for_al: res.requireFullAttendanceForAl === true || res.require_full_attendance_for_al === true || res.requireFullAttendanceForAl === "true" || res.require_full_attendance_for_al === "true" || res.requireFullAttendanceForAl === "True" || res.require_full_attendance_for_al === "True" || (res.requireFullAttendanceForAl === undefined && res.require_full_attendance_for_al === undefined),
        });
      })
      .catch(() => toast.error("Failed to update leave settings"))
      .finally(() => setSaving(false));
  };

  if (loading)
    return <div className="p-8 text-center text-muted-foreground">Loading configurations...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold">Configurable Leave Policies</h3>
        <p className="text-sm text-muted-foreground">
          Manage global rules for employee leaves, tenure perks, and restrictions.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" /> Base Entitlements
            </h4>
            <div className="space-y-2">
              <Label>Standard Annual Leaves (Days)</Label>
              <Input
                type="number"
                value={form.standard_annual_leaves}
                onChange={(e) =>
                  setForm({ ...form, standard_annual_leaves: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Accrual rate: {(form.standard_annual_leaves / 12).toFixed(2)} leaves per month
              </p>
            </div>
            <div className="pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_saturday_working"
                  checked={form.is_saturday_working}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, is_saturday_working: checked })
                  }
                />
                <Label htmlFor="is_saturday_working" className="cursor-pointer">Saturday is a Working Day</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-11">
                If checked, Saturdays will be counted as normal working days when calculating leave durations.
              </p>
            </div>
            <div className="pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="require_full_attendance_for_al"
                  checked={form.require_full_attendance_for_al}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, require_full_attendance_for_al: checked })
                  }
                />
                <Label htmlFor="require_full_attendance_for_al" className="cursor-pointer">Require Full Attendance for AL</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-11">
                If unchecked, employees can earn their monthly Annual Leave even if they had intentional absences.
              </p>
            </div>
          </div>

          <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 space-y-4">
            <h4 className="font-semibold text-primary flex items-center gap-2">
              🏆 Tenured Employee Perks
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tenure Threshold (Years)</Label>
                <Input
                  type="number"
                  value={form.tenured_years_threshold}
                  onChange={(e) =>
                    setForm({ ...form, tenured_years_threshold: Number(e.target.value) })
                  }
                />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Automatically applied starting the month following the completion of this
                  anniversary.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tenured Annual Leaves (Days)</Label>
                <Input
                  type="number"
                  value={form.tenured_annual_leaves}
                  onChange={(e) =>
                    setForm({ ...form, tenured_annual_leaves: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Accrual rate: {(form.tenured_annual_leaves / 12).toFixed(2)} leaves per month
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
            <h4 className="font-semibold text-orange-800 flex items-center gap-2">
              <Info className="h-4 w-4" /> Consecutive Leave Restrictions
            </h4>
            <div className="space-y-2">
              <Label>Max Consecutive Paid Leaves</Label>
              <Input
                type="number"
                value={form.max_consecutive_leaves}
                onChange={(e) =>
                  setForm({ ...form, max_consecutive_leaves: Number(e.target.value) })
                }
              />
              <p className="text-[11px] text-muted-foreground leading-tight">
                If an employee requests more consecutive days than this limit, the remainder is
                automatically treated as Unpaid Leave and triggers a salary deduction.
              </p>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" /> Exception Month
            </h4>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Select a month where the consecutive limit is lifted, allowing employees to avail all
              their accumulated leaves at once.
            </p>
            <div className="space-y-2">
              <Label>Select Month</Label>
              <Select
                value={form.exception_month.toString()}
                onValueChange={(v) => setForm({ ...form, exception_month: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}

function BrandingTab() {
  const { user } = useAuth();
  const [site, setSite] = useState<any>(null);
  const [brandingText, setBrandingText] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    sitesApi.getAll().then((sites: any) => {
      const allSites = Array.isArray(sites) ? sites : (sites as any)?.results || [];
      if (allSites.length > 0) {
        // Exclude sub-sites; target the main site created in Super Admin sites (is_sub_site is false)
        const nonSubSites = allSites.filter((s: any) => !s.is_sub_site && !s.isSubSite);
        const candidates = nonSubSites.length > 0 ? nonSubSites : allSites;

        const mainSite =
          candidates.find(
            (s: any) =>
              (s.modules && s.modules.length > 0) ||
              s.productType ||
              s.product_type ||
              s.activateDate ||
              s.activate_date
          ) ||
          candidates.find(
            (s: any) =>
              (user.site_name && s.name && s.name.toLowerCase() === user.site_name.toLowerCase()) ||
              (s.contactEmail && s.contactEmail.toLowerCase() === user.email?.toLowerCase()) ||
              (s.contact_email && s.contact_email.toLowerCase() === user.email?.toLowerCase())
          ) ||
          [...candidates].sort((a: any, b: any) => (a.id || 0) - (b.id || 0))[0] ||
          allSites[0];

        if (mainSite) {
          setSite(mainSite);
          setBrandingText(mainSite.branding_text || mainSite.brandingText || user.branding_text || "");
          const logo = mainSite.logo || user.logo_url;
          if (logo) {
            setPreview(getMediaUrl(logo));
          }
        }
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!site) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("branding_text", brandingText);
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;

      const res = await fetch(`${API_BASE_URL}/api/organisation/sites/${site.id}/`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to update branding");
      const data = await res.json();
      toast.success("Branding updated successfully!");
      if (data.logo) {
        setPreview(getMediaUrl(data.logo));
      }

      // Reload to update sidebar logo
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-500">Loading your site settings...</div>;
  if (!site) return <div className="text-slate-500">No main site available to configure branding for your account.</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-slate-900">Site Branding</h3>
          {site?.name && (
            <Badge variant="outline" className="text-xs font-normal">
              Main Site: {site.name}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500">
          Personalize your main site's logo and title. These changes will reflect across your site's emails, sidebar, and dashboard.
        </p>
      </div>
      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label>Site Title</Label>
          <Input
            value={brandingText}
            onChange={(e) => setBrandingText(e.target.value)}
            placeholder="e.g. PeoplePulse HRMS"
          />
        </div>
        <div className="space-y-2">
          <Label>Logo</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setLogoFile(e.target.files[0]);
                setPreview(URL.createObjectURL(e.target.files[0]));
              }
            }}
          />
          {preview && (
            <div className="mt-4 p-4 border rounded bg-slate-50 flex items-center justify-center min-h-[100px]">
              <img
                src={preview}
                alt="Logo"
                className="max-h-24 object-contain"
              />
            </div>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#1a4cd2] hover:bg-[#1641b4] text-white"
        >
          {saving ? "Saving..." : "Save Branding"}
        </Button>
      </div>
    </div>
  );
}
