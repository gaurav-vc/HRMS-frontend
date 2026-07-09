import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ctcImportApi, API_BASE_URL } from "@/api";

export const Route = createFileRoute("/payroll/import-ctc")({
  component: ImportCTCPage,
  loader: async () => {
    try {
      const history = await ctcImportApi.getHistory();
      return { history };
    } catch {
      return { history: [] };
    }
  }
});

function ImportCTCPage() {
  const router = useRouter();
  const { history } = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
    if (e.target) e.target.value = '';
  };

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error("Invalid format", { description: "Only .csv files are supported." });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large", { description: "Max size is 20MB." });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await ctcImportApi.upload(formData);
      toast.success("Import completed", { description: `Successfully imported ${res.successful} records. Failed: ${res.failed}` });
      router.invalidate();
      setActiveTab("history");
    } catch (err: any) {
      let msg = "An error occurred during upload.";
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.detail) msg = errorData.detail;
      } catch {
        msg = err.message || msg;
      }
      toast.error("Import failed", { description: msg });
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const handleDownloadTemplate = async () => {
    try {
      let token = localStorage.getItem('access_token');
      let response = await fetch(ctcImportApi.downloadTemplate, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
          const refresh = localStorage.getItem('refresh_token');
          if (refresh) {
              const refreshRes = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refresh })
              });
              if (refreshRes.ok) {
                  const data = await refreshRes.json();
                  localStorage.setItem('access_token', data.access);
                  if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
                  token = data.access;
                  
                  // Retry original request
                  response = await fetch(ctcImportApi.downloadTemplate, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
              }
          }
      }
      
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ctc_import_template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Could not download template');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <PageHeader 
        title="Import CTC" 
        description="Bulk import employee CTC details using the approved company template. Files are validated before any records are updated." 
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="h-4 w-4" />
              CSV template
            </Button>
            <div className="relative">
               <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
               <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                 <UploadCloud className="h-4 w-4" />
                 Upload file
               </Button>
            </div>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="upload" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Upload & Preview</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
            Import history
            <span className="bg-slate-200 text-slate-700 rounded-full px-2 py-0.5 text-xs font-semibold">{history.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-0">
          <div className="bg-white border rounded-lg p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Upload file</h3>
            <p className="text-sm text-slate-500 mb-6">Drag and drop the completed template or browse to select a file.</p>
            
            <div 
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors relative cursor-pointer
                ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => dropInputRef.current?.click()}
            >
              <input type="file" accept=".csv" className="hidden" ref={dropInputRef} onChange={handleFileChange} disabled={isUploading} />
              <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-900">
                {isUploading ? 'Uploading...' : 'Drop your file here, or click to browse'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Supported: .csv · Max size 20 MB</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <div className="bg-white border rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Audit history</h3>
              <p className="text-sm text-slate-500">Every import is versioned.</p>
            </div>
            
            <DataTable
              tableId="ctc-imports"
              rows={history}
              rowKey={r => r.id}
              filename="ctc_imports_history.csv"
              columns={[
                { key: "date", header: "Import date", render: (r: any) => <div><div className="font-medium text-slate-900">{formatDate(r.import_date)}</div><div className="text-xs text-slate-500">IMP-{r.id.toString().padStart(6, '0')}</div></div> },
                { key: "by", header: "Imported by", render: (r: any) => <div className="text-slate-900 font-medium">{r.imported_by_name || 'System User'}</div> },
                { key: "records", header: "Records", accessor: (r: any) => r.records_processed },
                { key: "successful", header: "Successful", render: (r: any) => <span className="text-emerald-600 font-medium">{r.successful}</span> },
                { key: "failed", header: "Failed", render: (r: any) => <span className="text-red-600 font-medium">{r.failed}</span> },
                { key: "template", header: "Template", render: (r: any) => <Badge variant="outline">{r.file_type}</Badge> },
                { key: "duration", header: "Duration", render: (r: any) => <span className="text-slate-600">{Math.floor(r.duration_seconds/60)}m {r.duration_seconds%60}s</span> },
                { key: "status", header: "Status", render: (r: any) => (
                  <Badge variant={r.status === 'Completed' ? 'default' : r.status === 'Failed' ? 'destructive' : 'secondary'} 
                         className={r.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                    {r.status}
                  </Badge>
                )}
              ]}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
