import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Megaphone,
  Plus,
  Paperclip,
  Download,
  Calendar,
  User,
  Building,
  Users,
  CheckCircle2,
  Trash2,
  AlertCircle,
  FileText,
  FileImage,
  File,
  X,
  Search,
  ShieldAlert,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isSuperAdminUser } from "@/lib/mock-data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { announcementsApi, departmentsApi, employeesApi, rolesApi, getMediaUrl } from "@/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/announcements")({
  component: AnnouncementsPage,
  loader: async () => {
    try {
      const [announcementsData, departmentsData, employeesData, rolesData] = await Promise.all([
        announcementsApi.getAll().catch(() => []),
        departmentsApi.getAll().catch(() => []),
        employeesApi.getAll().catch(() => []),
        rolesApi.getAll().catch(() => []),
      ]);
      const announcements = Array.isArray(announcementsData)
        ? announcementsData
        : (announcementsData as any)?.results || [];
      const departments = Array.isArray(departmentsData)
        ? departmentsData
        : (departmentsData as any)?.results || [];
      const employees = Array.isArray(employeesData)
        ? employeesData
        : (employeesData as any)?.results || [];
      const roles = Array.isArray(rolesData) ? rolesData : (rolesData as any)?.results || [];
      return { announcements, departments, employees, roles };
    } catch {
      return { announcements: [], departments: [], employees: [], roles: [] };
    }
  },
});

function AnnouncementsPage() {
  const router = useRouter();
  const { announcements: initialAnnouncements, departments, employees, roles } = Route.useLoaderData();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>(initialAnnouncements);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"Normal" | "Important" | "Urgent">("Normal");
  const [audienceType, setAudienceType] = useState<"EVERYONE" | "ROLE" | "DEPARTMENT" | "INDIVIDUAL">("EVERYONE");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedEmps, setSelectedEmps] = useState<string[]>([]);
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAnnouncements(initialAnnouncements);
  }, [initialAnnouncements]);

  const filteredEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    if (!empSearchQuery.trim()) return employees;
    const q = empSearchQuery.toLowerCase();
    return employees.filter((e: any) => {
      const name = `${e.firstName || e.first_name || ""} ${e.lastName || e.last_name || ""}`.toLowerCase();
      const code = String(e.code || "").toLowerCase();
      const dept = String(e.department_name || "").toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [employees, empSearchQuery]);

  const canPublish = useMemo(() => {
    if (!user) return false;
    if (user.is_superuser) return true;

    // ONLY roles that have access to all data of the entity can add announcements
    if (user.has_all_entity_access || user.permissions?.has_all_entity_access) {
      return true;
    }
    const scope = String(
      user.access_scope ||
      (user as any).accessScope ||
      user.permissions?.access_scope ||
      user.dynamic_role?.access_scope ||
      ""
    ).trim().toLowerCase();

    return ["corporate", "region", "all", "all entities", "global"].includes(scope);
  }, [user]);

  const handleReset = () => {
    setTitle("");
    setContent("");
    setPriority("Normal");
    setAudienceType("EVERYONE");
    setSelectedRoles([]);
    setSelectedDepts([]);
    setSelectedEmps([]);
    setEmpSearchQuery("");
    setEmpDropdownOpen(false);
    setAttachmentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter an announcement title.");
      return;
    }
    if (!content.trim()) {
      toast.error("Please enter announcement details.");
      return;
    }
    if (audienceType === "ROLE" && selectedRoles.length === 0) {
      toast.error("Please select at least one target role.");
      return;
    }
    if (audienceType === "DEPARTMENT" && selectedDepts.length === 0) {
      toast.error("Please select at least one target department.");
      return;
    }
    if (audienceType === "INDIVIDUAL" && selectedEmps.length === 0) {
      toast.error("Please select at least one employee.");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("priority", priority);
      formData.append("audience_type", audienceType);

      if (audienceType === "ROLE") {
        selectedRoles.forEach((rId) => formData.append("target_roles", rId));
      } else if (audienceType === "DEPARTMENT") {
        selectedDepts.forEach((dId) => formData.append("target_departments", dId));
      } else if (audienceType === "INDIVIDUAL") {
        selectedEmps.forEach((eId) => formData.append("target_employees", eId));
      }

      if (attachmentFile) {
        formData.append("attachment", attachmentFile);
        formData.append("attachment_name", attachmentFile.name);
      }

      await announcementsApi.create(formData);
      toast.success("Announcement published and notifications sent!");
      setOpen(false);
      handleReset();
      try {
        const fresh = await announcementsApi.getAll();
        setAnnouncements(Array.isArray(fresh) ? fresh : (fresh as any)?.results || []);
      } catch (e) {}
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await announcementsApi.delete(id);
      toast.success("Announcement deleted.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete announcement.");
    }
  };

  const handleMarkRead = async (id: string | number) => {
    try {
      await announcementsApi.markRead(id);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
      );
      toast.success("Marked as read");
    } catch (err: any) {
      console.error(err);
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch =
      a.title?.toLowerCase().includes(filterQuery.toLowerCase()) ||
      a.content?.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || a.priority?.toLowerCase() === priorityFilter.toLowerCase();
    return matchesSearch && matchesPriority;
  });

  const getFileIcon = (filename: string) => {
    const ext = filename?.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return <FileImage className="w-4 h-4 text-emerald-500" />;
    if (["pdf"].includes(ext)) return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-blue-500" />;
  };

  const isSiteRestricted = useMemo(() => {
    if (!user) return false;
    if (canPublish) return false;
    if (user.has_all_entity_access || user.permissions?.has_all_entity_access) return false;
    const scope = String(
      user.access_scope ||
      (user as any).accessScope ||
      user.permissions?.access_scope ||
      user.dynamic_role?.access_scope ||
      ""
    ).trim().toLowerCase();
    if (["corporate", "region", "all", "all entities", "global"].includes(scope)) return false;
    if (user.site_modules && Array.isArray(user.site_modules) && user.site_modules.length > 0) {
      return !user.site_modules.includes("Announcements");
    }
    return false;
  }, [user, canPublish]);

  if (isSiteRestricted) {
    return (
      <div className="flex flex-col h-full bg-slate-50/50 p-6">
        <PageHeader
          title="Announcements"
          description="Company-wide announcements, departmental notices, and updates"
        />
        <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl border border-border shadow-sm text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Module Access Restricted</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The <strong>Announcements</strong> module has not been enabled for your assigned site (
            <span className="font-semibold text-foreground">{user?.site_name || "Current Site"}</span>).
          </p>
          <p className="text-xs text-muted-foreground">
            Site administrators can configure module access boundaries under Super Admin &rarr; Sites.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 space-y-6">
      <PageHeader
        title="Announcements"
        description="Company-wide announcements, departmental notices, and updates with attachments"
        actions={
          canPublish ? (
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Announcement
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search announcements..."
            className="pl-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="important">Important</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Announcements</h3>
            <p className="text-xs text-slate-500 mt-1">There are no announcements currently matching your filter.</p>
          </Card>
        ) : (
          filteredAnnouncements.map((a) => (
            <Card
              key={a.id}
              className={`p-5 transition-shadow hover:shadow-md ${
                a.priority === "Urgent"
                  ? "border-l-4 border-l-red-500"
                  : a.priority === "Important"
                  ? "border-l-4 border-l-amber-500"
                  : "border-l-4 border-l-blue-500"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3 mb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        a.priority === "Urgent"
                          ? "bg-red-500 text-white"
                          : a.priority === "Important"
                          ? "bg-amber-500 text-white"
                          : "bg-blue-600 text-white"
                      }
                    >
                      {a.priority}
                    </Badge>
                    <h2 className="text-lg font-semibold text-slate-900">{a.title}</h2>
                  {(() => {
                    const isRead = Boolean(a.isRead ?? a.is_read);
                    return isRead ? (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> Read
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                        New
                      </Badge>
                    );
                  })()}
                  </div>
                  {(() => {
                    const author = a.authorName || a.author_name || a.author || "Organization Notice";
                    const rawDate = a.createdAt || a.created_at;
                    const parsedDate = rawDate ? new Date(rawDate) : null;
                    const dateDisplay = parsedDate && !isNaN(parsedDate.getTime())
                      ? parsedDate.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Recently published";
                    const audience = a.audienceType || a.audience_type;
                    const roleNames = a.roleNames || a.role_names || [];
                    const deptNames = a.departmentNames || a.department_names || [];
                    const empNames = a.targetEmployeeNames || a.target_employee_names || [];

                    return (
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateDisplay}
                        </span>
                        <span className="flex items-center gap-1">
                          {audience === "EVERYONE" && <Users className="w-3.5 h-3.5 text-blue-600" />}
                          {audience === "ROLE" && <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />}
                          {audience === "DEPARTMENT" && <Building className="w-3.5 h-3.5 text-purple-600" />}
                          {audience === "INDIVIDUAL" && <User className="w-3.5 h-3.5 text-emerald-600" />}
                          {audience === "EVERYONE"
                            ? "Audience: Everyone"
                            : audience === "ROLE"
                            ? `Role: ${roleNames.join(", ") || "Selected"}`
                            : audience === "DEPARTMENT"
                            ? `Department: ${deptNames.join(", ") || "Selected"}`
                            : `Targeted: ${empNames.length || 1} Employee(s)`}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  {!(a.isRead ?? a.is_read) && (
                    <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => handleMarkRead(a.id)}>
                      Mark Read
                    </Button>
                  )}
                  {canPublish && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-4">
                {a.content}
              </div>

              {Boolean(a.attachmentUrl || a.attachment) && (
                <div className="pt-2 border-t">
                  {(() => {
                    const fileUrl = a.attachmentUrl || a.attachment;
                    const fileName = a.attachmentName || a.attachment_name || (typeof fileUrl === 'string' ? fileUrl.split('/').pop() : 'Attached Document');
                    return (
                      <div className="inline-flex items-center gap-3 p-2.5 rounded-lg border bg-slate-50 text-xs">
                        {getFileIcon(fileName)}
                        <span className="font-medium text-slate-800 truncate max-w-[260px]">
                          {fileName}
                        </span>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 ml-2" asChild>
                          <a href={getMediaUrl(fileUrl)} target="_blank" rel="noopener noreferrer" download>
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </a>
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Creation Modal */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) handleReset();
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <Megaphone className="w-5 h-5 text-primary" />
              Publish Announcement
            </DialogTitle>
            <DialogDescription>
              Broadcast an announcement with optional attachment. Target Everyone, Departments, or Specific Employees.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto pr-1 space-y-4 py-2 flex-1">
            <div className="space-y-1.5">
              <Label>Announcement Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Townhall / Office Holiday Notice"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Important">Important</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Target Audience *</Label>
                <Select value={audienceType} onValueChange={(v: any) => setAudienceType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EVERYONE">Everyone in Organization</SelectItem>
                    <SelectItem value="ROLE">Specific Role(s)</SelectItem>
                    <SelectItem value="DEPARTMENT">Specific Department(s)</SelectItem>
                    <SelectItem value="INDIVIDUAL">Particular Employee(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {audienceType === "ROLE" && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                <Label className="text-xs font-semibold">Select Role(s):</Label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {roles.map((r: any) => (
                    <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(String(r.id))}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRoles([...selectedRoles, String(r.id)]);
                          else setSelectedRoles(selectedRoles.filter((id) => id !== String(r.id)));
                        }}
                        className="rounded border-input text-primary h-3.5 w-3.5"
                      />
                      <span className="truncate">{r.name} ({r.code})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {audienceType === "DEPARTMENT" && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                <Label className="text-xs font-semibold">Select Department(s):</Label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {departments.map((d: any) => (
                    <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedDepts.includes(String(d.id))}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedDepts([...selectedDepts, String(d.id)]);
                          else setSelectedDepts(selectedDepts.filter((id) => id !== String(d.id)));
                        }}
                        className="rounded border-input text-primary h-3.5 w-3.5"
                      />
                      <span className="truncate">{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {audienceType === "INDIVIDUAL" && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Select Employee(s):</Label>
                  {selectedEmps.length > 0 && (
                    <span className="text-[11px] font-medium text-primary">
                      {selectedEmps.length} selected
                    </span>
                  )}
                </div>

                <Popover open={empDropdownOpen} onOpenChange={setEmpDropdownOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-accent/40 transition-colors"
                    >
                      <span className="truncate text-slate-700 dark:text-slate-200">
                        {selectedEmps.length === 0
                          ? "Click to search and select employees..."
                          : `${selectedEmps.length} employee(s) chosen`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-2 shadow-lg" align="start">
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Type employee name or code to search..."
                          value={empSearchQuery}
                          onChange={(e) => setEmpSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs"
                          autoFocus
                        />
                        {empSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setEmpSearchQuery("")}
                            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="max-h-52 overflow-y-auto divide-y divide-border/40">
                        {filteredEmployees.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground">
                            No employees found matching &quot;{empSearchQuery}&quot;
                          </div>
                        ) : (
                          filteredEmployees.map((e: any) => {
                            const isSelected = selectedEmps.includes(String(e.id));
                            const name = `${e.firstName || e.first_name || ""} ${e.lastName || e.last_name || ""}`.trim();
                            return (
                              <div
                                key={e.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedEmps(selectedEmps.filter((id) => id !== String(e.id)));
                                  } else {
                                    setSelectedEmps([...selectedEmps, String(e.id)]);
                                  }
                                }}
                                className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs transition-colors hover:bg-accent ${
                                  isSelected ? "bg-accent/70 font-medium" : ""
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                      isSelected
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground/40 bg-background"
                                    }`}
                                  >
                                    {isSelected && <Check className="h-3 w-3" />}
                                  </div>
                                  <div className="truncate">
                                    <span className="font-medium text-foreground">{name}</span>
                                    <span className="ml-1.5 text-muted-foreground">({e.code})</span>
                                  </div>
                                </div>
                                {e.department_name && (
                                  <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                                    {e.department_name}
                                  </Badge>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {selectedEmps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                    {selectedEmps.map((id) => {
                      const empObj = employees.find((x: any) => String(x.id) === String(id));
                      const name = empObj
                        ? `${empObj.firstName || empObj.first_name || ""} ${empObj.lastName || empObj.last_name || ""}`.trim()
                        : `Employee #${id}`;
                      const code = empObj?.code ? ` (${empObj.code})` : "";
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="text-[11px] gap-1 pl-2 pr-1 py-0.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                        >
                          <span className="truncate max-w-[180px]">{name}{code}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedEmps(selectedEmps.filter((empId) => empId !== id))}
                            className="hover:text-destructive p-0.5 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-destructive underline px-1 py-0.5"
                      onClick={() => setSelectedEmps([])}
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Announcement Message *</Label>
              <Textarea
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write full announcement details here..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Attachment (Optional)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setAttachmentFile(f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs gap-1.5"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {attachmentFile ? "Change File" : "Upload File"}
                </Button>
                {attachmentFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                    <span className="font-medium text-foreground truncate max-w-[240px]">{attachmentFile.name}</span>
                    <span>({Math.round(attachmentFile.size / 1024)} KB)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Supported: PDF, Word, Excel, PNG, JPG (up to 25MB). File will be attached to email & app.
              </p>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting} className="gap-2">
              <Megaphone className="w-4 h-4" />
              {isSubmitting ? "Publishing & Emailing..." : "Publish & Broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
