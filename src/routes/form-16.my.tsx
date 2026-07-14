import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, FileText, Download, Eye } from "lucide-react";
import { form16Api } from "@/api";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/form-16/my")({
  component: MyForm16Page,
  loader: async () => {
    // Regular employees will only get their own docs due to backend filtering
    const documents = await form16Api.getAll();
    return { documents };
  }
});

function MyForm16Page() {
  const { documents } = Route.useLoaderData();
  const { user } = useAuth();
  const u = user as any;
  const employeeName = `${u?.employeeProfile?.firstName || ""} ${u?.employeeProfile?.lastName || ""}`.trim() || u?.username;
  const empCode = u?.employeeProfile?.code || u?.employeeProfile?.employeeId || "";
  const designation = u?.employeeProfile?.designation?.title || "Employee";
  const department = u?.employeeProfile?.department?.name || "";

  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const forceDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const columns = [
    {
      key: "financialYear",
      header: "Financial Year",
      accessor: (doc: any) => doc.financialYear || doc.financial_year || "—",
    },
    {
      key: "version",
      header: "Version",
      render: (doc: any) => `v${doc.version}`
    },
    {
      key: "status",
      header: "Status",
      accessor: (doc: any) => doc.status || "—",
    }
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      <PageHeader 
        title="My Form 16" 
        description="Access your annual tax certificates. You'll only ever see documents issued to you."
      />

      <div className="bg-white rounded-xl border border-border/50 shadow-sm p-6 flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle background pattern/gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex items-center gap-4 relative z-10">
          <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
            <AvatarFallback className="text-xl bg-blue-100 text-blue-700">
              {employeeName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{employeeName}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/70">{empCode}</span>
              <span>&bull;</span>
              <span>{designation}</span>
              {department && (
                <>
                  <span>&bull;</span>
                  <span>{department}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100 relative z-10">
          <Shield className="h-4 w-4" />
          Secure view — CONFIDENTIAL watermark
        </div>
      </div>

      {documents.length > 0 ? (
        <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <DataTable 
            columns={columns} 
            rows={documents} 
            rowKey={(doc: any) => String(doc.id)}
            actions={(doc: any) => (
              <div className="flex items-center justify-end gap-2 pr-4">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setPreviewDoc(doc)}>
                  <Eye className="h-4 w-4" />
                  View
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => forceDownload(doc.file, `Form16_${doc.financialYear || doc.financial_year}.pdf`)}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            )}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border/50 shadow-sm p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-2">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight">No Form 16 available yet</h3>
          <p className="text-muted-foreground max-w-md">
            Once your Form 16 is issued by HR, it will appear here. You'll be notified by email and in-app.
          </p>
        </div>
      )}

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border bg-muted/30">
            <DialogTitle className="flex items-center justify-between">
              <span>Form 16 ({previewDoc?.financialYear || previewDoc?.financial_year})</span>
              <Button size="sm" variant="outline" className="gap-2 h-8 mr-6" onClick={() => forceDownload(previewDoc?.file, `Form16_${previewDoc?.financialYear || previewDoc?.financial_year}.pdf`)}>
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
    </div>
  );
}
