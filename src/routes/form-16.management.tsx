import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { form16Api, departmentsApi, entitiesApi, branchesApi, employeesApi, designationsApi, sitesApi, API_BASE_URL } from "@/api";
import { Upload, UploadCloud, Search, Download, Eye } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/form-16/management")({
  component: Form16ManagementPage,
  loader: async () => {
    const [documents, departments, entities, branches, employees, designations, sites] = await Promise.all([
      form16Api.getAll(),
      departmentsApi.getAll(),
      entitiesApi.getAll(),
      branchesApi.getAll(),
      employeesApi.getAll(),
      designationsApi.getAll(),
      sitesApi.getAll(),
    ]);
    return { documents, departments, entities, branches, employees, designations, sites };
  }
});

function Form16ManagementPage() {
  const router = useRouter();
  const { documents, departments, entities, branches, employees, designations, sites } = Route.useLoaderData();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fyFilter, setFyFilter] = useState("2025-26");
  const [deptFilter, setDeptFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUploadEmp, setSelectedUploadEmp] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const forceDownload = async (url: string, filename: string) => {
    const fullUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;
    try {
      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error("Failed to download file");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(fullUrl, '_blank');
    }
  };

  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUploadEmp) return;
    
    toast.info("Uploading Form 16...");
    try {
      const formData = new FormData();
      formData.append("employee", String(selectedUploadEmp));
      formData.append("financial_year", fyFilter);
      formData.append("file", file);
      
      await form16Api.upload(formData);
      toast.success("Successfully uploaded Form 16!");
      router.invalidate();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedUploadEmp(null);
  };

  const handleModalUpload = async () => {
    if (!uploadFile || !selectedUploadEmp) {
      toast.error("Please select an employee and a file");
      return;
    }
    toast.info("Uploading Form 16...");
    try {
      const formData = new FormData();
      formData.append("employee", String(selectedUploadEmp));
      formData.append("financial_year", fyFilter);
      formData.append("file", uploadFile);
      
      await form16Api.upload(formData);
      toast.success("Successfully uploaded Form 16!");
      setUploadOpen(false);
      setUploadFile(null);
      setSelectedUploadEmp(null);
      router.invalidate();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    }
  };

  const rows = employees.map((emp: any) => {
    const doc = documents.find(d => String(d.employee) === String(emp.id) && (d.financial_year === fyFilter || d.financialYear === fyFilter));
    const branch = branches.find(b => String(b.id) === String(emp.branch));
    const site = sites.find(s => String(s.id) === String(emp.site));
    return {
      id: emp.id,
      employee_name: `${emp.first_name || emp.firstName} ${emp.last_name || emp.lastName}`.trim(),
      employee_code: emp.employee_id || emp.code,
      department_id: String(emp.department || "all"),
      department_name: departments.find(d => String(d.id) === String(emp.department))?.name || "—",
      designation_title: designations.find(d => String(d.id) === String(emp.designation))?.title || "—",
      branch_id: String(emp.branch || "all"),
      branch_name: branch?.name || site?.name || "—",
      entity_id: String(branch?.entity || emp.entity || "all"),
      status: doc?.status || "Pending",
      version: doc?.version || 0,
      file: doc?.file,
      uploaded_by_name: doc?.uploaded_by_name || doc?.uploadedByName,
      uploaded_at: doc?.uploaded_at || doc?.uploadedAt,
    };
  });

  const filteredDocs = rows.filter(row => {
    const matchesSearch = row.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          row.employee_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || row.status?.toLowerCase() === statusFilter.toLowerCase();
    const matchesDept = deptFilter === "all" || row.department_id === deptFilter;
    const matchesEntity = entityFilter === "all" || row.entity_id === entityFilter;
    const matchesBranch = branchFilter === "all" || row.branch_id === branchFilter;
    return matchesSearch && matchesStatus && matchesDept && matchesEntity && matchesBranch;
  });

  const columns = [
    {
      key: "employee",
      header: "Employee",
      accessor: (doc: any) => `${doc.employee_name} (${doc.employee_code})`,
      render: (row: any) => {
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{row.employee_name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{row.employee_name}</span>
              <span className="text-xs text-muted-foreground">{row.employee_code}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: "department_name",
      header: "Department",
      accessor: (doc: any) => doc.department_name || "—",
    },
    {
      key: "designation_title",
      header: "Designation",
      accessor: (doc: any) => doc.designation_title || "—",
    },
    {
      key: "branch_name",
      header: "Branch",
      accessor: (doc: any) => doc.branch_name || "—",
    },
    {
      key: "status",
      header: "Status",
      accessor: (doc: any) => doc.status,
      render: (doc: any) => {
        const status = doc.status;
        return (
          <Badge variant={status === "Distributed" ? "default" : status === "Failed" ? "destructive" : "secondary"}>
            {status}
          </Badge>
        );
      }
    },
    {
      key: "version",
      header: "Version",
      accessor: (doc: any) => doc.version,
      render: (doc: any) => `v${doc.version}`
    },
    {
      key: "uploaded_by_name",
      header: "Uploaded by",
      accessor: (doc: any) => doc.uploaded_by_name || "—",
      render: (doc: any) => doc.uploaded_by_name || "—"
    },
    {
      key: "uploaded_at",
      header: "Uploaded on",
      accessor: (doc: any) => doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM dd, yyyy') : "—",
      render: (doc: any) => doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM dd, yyyy') : "—"
    }
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Form 16 Management" 
          description="Upload, distribute, and audit employee Form 16 documents."
        />
        <div className="flex items-center gap-3">
          <Link to="/form-16/bulk">
            <Button variant="outline" className="gap-2">
              <UploadCloud className="h-4 w-4" />
              Bulk upload
            </Button>
          </Link>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload Form 16
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search name, code, email, PAN, designation..." 
            className="pl-9 bg-background/50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={fyFilter} onValueChange={setFyFilter}>
          <SelectTrigger className="w-[130px] bg-background/50"><SelectValue placeholder="FY" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            <SelectItem value="2025-26">2025-26</SelectItem>
            <SelectItem value="2024-25">2024-25</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[150px] bg-background/50"><SelectValue placeholder="Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[130px] bg-background/50"><SelectValue placeholder="Entities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entities.map((e: any) => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[130px] bg-background/50"><SelectValue placeholder="Branches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((b: any) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] bg-background/50"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="distributed">Distributed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden relative">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf"
          onChange={handleSingleUpload}
        />
        <DataTable 
          columns={columns} 
          rows={filteredDocs} 
          rowKey={(doc: any) => String(doc.id)}
          actions={(row: any) => (
            <div className="flex items-center justify-end gap-1 pr-4">
              {row.file ? (
                <>
                  <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(row)} title="View Document">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => forceDownload(row.file, `Form16_${fyFilter}_${row.employee_code}.pdf`)} title="Download">
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => {
                  setSelectedUploadEmp(row.id);
                  if (fileInputRef.current) fileInputRef.current.click();
                }}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              )}
            </div>
          )}
        />
      </div>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border bg-muted/30">
            <DialogTitle className="flex items-center justify-between">
              <span>{previewDoc?.employee_name} - Form 16 ({fyFilter})</span>
              <Button size="sm" variant="outline" className="gap-2 h-8 mr-6" onClick={() => forceDownload(previewDoc?.file, `Form16_${fyFilter}_${previewDoc?.employee_code}.pdf`)}>
                <Download className="h-3.5 w-3.5" /> Download PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted/10">
            {previewDoc?.file && (
              <iframe 
                src={previewDoc.file} 
                className="w-full h-full border-0" 
                title="Form 16 Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Form 16</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employee</label>
              <Select value={selectedUploadEmp ? String(selectedUploadEmp) : undefined} onValueChange={v => setSelectedUploadEmp(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.firstName || e.first_name} {e.lastName || e.last_name} ({e.code || e.employee_id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Financial Year</label>
              <Select value={fyFilter} onValueChange={setFyFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Form 16 PDF</label>
              <Input type="file" accept=".pdf" onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setUploadFile(e.target.files[0]);
                }
              }} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setUploadOpen(false); setUploadFile(null); setSelectedUploadEmp(null); }}>Cancel</Button>
            <Button onClick={handleModalUpload} disabled={!uploadFile || !selectedUploadEmp}>Upload</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
