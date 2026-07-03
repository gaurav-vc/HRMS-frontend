import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { form16Api } from "@/api";
import { UploadCloud, ArrowLeft, FileType, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/form-16/bulk")({
  component: Form16BulkUploadPage,
});

function Form16BulkUploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mappingMode, setMappingMode] = useState("filename");
  const [fy, setFy] = useState("2025-26");
  const [results, setResults] = useState<{success: number, failed: number, errors: string[]} | null>(null);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (droppedFiles.length < e.dataTransfer.files.length) {
        toast.error("Only PDF files are allowed");
      }
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("financial_year", fy);
      formData.append("mapping_mode", mappingMode);
      files.forEach(file => {
        formData.append("files", file);
      });
      
      const res = await form16Api.bulkUpload(formData);
      setResults(res);
      toast.success(`Uploaded successfully!`);
      setFiles([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/form-16/management">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <PageHeader 
          title="Bulk upload Form 16" 
          description="Drop hundreds of Form 16 PDFs — filenames like EMP0012_FORM16_2025-26.pdf are mapped automatically. Duplicates create a new version."
        />
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-8 bg-white p-8 rounded-xl border border-border/50 shadow-sm">
        
        {/* Settings Sidebar */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Mapping mode</Label>
            <Select value={mappingMode} onValueChange={setMappingMode}>
              <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="filename">Match by filename (EmpCode_...)</SelectItem>
                <SelectItem value="pan">Match by PAN in text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Default FY</Label>
            <Select value={fy} onValueChange={setFy}>
              <SelectTrigger><SelectValue placeholder="Select FY" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-26">2025-26</SelectItem>
                <SelectItem value="2024-25">2024-25</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dropzone */}
        <div className="space-y-6">
          <div 
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-border bg-background/50 hover:bg-muted/50'}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <UploadCloud className="h-8 w-8 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-lg">Click to upload or drag and drop</h3>
                <p className="text-sm text-muted-foreground">Only PDF files are supported</p>
              </div>
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                multiple 
                accept=".pdf"
                onChange={handleFileSelect}
              />
              <Button asChild variant="secondary" className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Browse files
                </label>
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Selected files ({files.length})</h4>
                <Button onClick={handleUpload} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {uploading ? "Uploading..." : `Upload ${files.length} files`}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileType className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFile(i)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-medium">Upload Complete</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                  <div className="text-2xl font-bold text-green-600">{results.success}</div>
                  <div className="text-sm text-muted-foreground">Successfully mapped & uploaded</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed to process</div>
                </div>
              </div>
              {results.errors?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-destructive">Errors:</p>
                  <ul className="text-sm text-destructive list-disc pl-5 max-h-[150px] overflow-y-auto">
                    {results.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
