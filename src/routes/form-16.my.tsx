import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, FileText, Download, Eye } from "lucide-react";
import { form16Api, API_BASE_URL } from "@/api";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/form-16/my")({
  component: MyForm16Page,
  loader: async () => {
    // Regular employees will only get their own docs due to backend filtering
    const documents = await form16Api.getAll();
    return { documents };
  },
});

function MyForm16Page() {
  const { documents } = Route.useLoaderData();
  const { user } = useAuth();
  const u = user as any;
  const employeeName =
    `${u?.employeeProfile?.firstName || ""} ${u?.employeeProfile?.lastName || ""}`.trim() ||
    u?.username;
  const empCode = u?.employeeProfile?.code || u?.employeeProfile?.employeeId || "";
  const designation = u?.employeeProfile?.designation?.title || "Employee";
  const department = u?.employeeProfile?.department?.name || "";

  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const forceDownload = async (url: string, filename: string) => {
    const fullUrl = url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
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
      window.open(fullUrl, "_blank");
    }
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
      render: (doc: any) => `v${doc.version}`,
    },
    {
      key: "status",
      header: "Status",
      accessor: (doc: any) => doc.status || "—",
    },
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      <PageHeader
        title="My Form 16"
        description="Access your annual tax certificates. You'll only ever see documents issued to you."
      />

      <div className="bg-white rounded-xl border border-border/50 shadow-sm p-5 flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-lg bg-[#e1effe] text-blue-600 font-medium">
              {u?.email?.charAt(0).toLowerCase() || "u"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col -space-y-0.5">
            <span className="text-[17px] font-medium text-slate-900">{u?.email}</span>
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <span className="text-xl leading-none">&bull;</span>
              <span>{designation || "Employee"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-1.5 bg-[#f3f8ff] text-blue-600 rounded-full text-sm font-medium border border-blue-100 relative z-10">
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    forceDownload(
                      doc.file,
                      `Form16_${doc.financialYear || doc.financial_year}.${doc.file?.split(".").pop() || "pdf"}`,
                    )
                  }
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            )}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border/50 shadow-sm p-16 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center mb-2">
            <FileText className="h-6 w-6 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">No Form 16 available yet</h3>
          <p className="text-slate-500 max-w-[400px]">
            Once your Form 16 is issued by HR, it will appear here. You'll be notified by email and
            in-app.
          </p>
        </div>
      )}

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border bg-muted/30">
            <DialogTitle className="flex items-center justify-between">
              <span>Form 16 ({previewDoc?.financialYear || previewDoc?.financial_year})</span>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 h-8 mr-6"
                onClick={() =>
                  forceDownload(
                    previewDoc?.file,
                    `Form16_${previewDoc?.financialYear || previewDoc?.financial_year}.${previewDoc?.file?.split(".").pop() || "pdf"}`,
                  )
                }
              >
                <Download className="h-3.5 w-3.5" /> Download
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
