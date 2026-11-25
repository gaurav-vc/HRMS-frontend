import React, { useState, useRef, useTransition } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  X,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { employeesApi } from "@/api";
import type { Entity, Department, Designation, Branch, Site } from "@/types";

interface EmployeeDataUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  entities: Entity[];
  departments: Department[];
  designations: Designation[];
  branches?: Branch[];
  sites?: Site[];
}

export function EmployeeDataUploadModal({
  open,
  onOpenChange,
  onSuccess,
  entities,
  departments,
  designations,
  branches = [],
  sites = [],
}: EmployeeDataUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "errors">("all");
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setValidationResult(null);
    setRows([]);
    setFilterMode("all");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const processFile = async (uploadedFile: File) => {
    if (!uploadedFile.name.endsWith(".csv")) {
      toast.error("Please upload a valid CSV (.csv) file.");
      return;
    }

    setFile(uploadedFile);
    setIsValidating(true);
    try {
      const res = await employeesApi.validateImport(uploadedFile);
      setValidationResult(res);
      setRows(res.rows || []);
      if ((res.errorCount ?? res.error_count ?? 0) > 0) {
        toast.warning(
          `Validation complete: ${res.errorCount ?? res.error_count} record(s) contain missing mandatory fields or errors. Fill them below before uploading.`
        );
      } else {
        toast.success(`Validation passed: All ${res.totalRows ?? res.total_rows} records are valid and ready to import.`);
      }
    } catch (err: any) {
      toast.error("Validation failed: " + (err.detail || err.message || "Unknown error"));
      setValidationResult(null);
      setRows([]);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  // Re-run validation on the currently modified rows in preview
  const revalidateRows = async (rowsToValidate?: any[]) => {
    const currentRows = rowsToValidate || rows;
    if (currentRows.length === 0) return;

    setIsValidating(true);
    try {
      const payloadRows = currentRows.map((r) => r.parsedData || r.parsed_data || r);
      const res = await employeesApi.validateImport({ rows: payloadRows });
      setValidationResult(res);
      setRows(res.rows || []);
      const errCount = res.errorCount ?? res.error_count ?? 0;
      if (errCount === 0) {
        toast.success("All errors resolved! The upload is now unlocked.");
      } else {
        toast.info(`${errCount} error(s) remaining. Please correct the highlighted fields.`);
      }
    } catch (err: any) {
      toast.error("Re-validation failed: " + (err.detail || err.message));
    } finally {
      setIsValidating(false);
    }
  };

  // In-place edit for a cell
  const handleCellChange = (rowIndex: number, field: string, value: any) => {
    setRows((prevRows) => {
      return prevRows.map((row) => {
        const rIndex = row.rowIndex ?? row.row_index;
        if (rIndex === rowIndex) {
          const parsed = { ...(row.parsedData || row.parsed_data) };
          parsed[field] = value;

          // If entity changed, update entity_id and entity_name
          if (field === "entity_id" || field === "entity") {
            const foundEnt = entities.find((e) => String(e.id) === String(value) || e.name === value || e.code === value);
            if (foundEnt) {
              parsed.entity_id = foundEnt.id;
              parsed.entity_name = foundEnt.name;
            }
          }

          // If department changed, update department_id and department_name
          if (field === "department_id" || field === "department") {
            const foundDept = departments.find((d) => String(d.id) === String(value) || d.name === value || d.code === value);
            if (foundDept) {
              parsed.department_id = foundDept.id;
              parsed.department_name = foundDept.name;
              parsed.department = foundDept.name;
            }
          }

          // If designation changed, update designation_id and designation_name
          if (field === "designation_id" || field === "designation") {
            const foundDesg = designations.find((ds) => String(ds.id) === String(value) || (ds as any).title === value || ds.name === value);
            if (foundDesg) {
              parsed.designation_id = foundDesg.id;
              parsed.designation_name = (foundDesg as any).title || foundDesg.name;
              parsed.designation = (foundDesg as any).title || foundDesg.name;
            }
          }

          // If site changed, update site_id and site_name
          if (field === "site_id" || field === "site") {
            const foundSite = sites.find((s) => String(s.id) === String(value) || s.name === value || (s as any).site_code === value);
            if (foundSite) {
              parsed.site_id = foundSite.id;
              parsed.site_name = foundSite.name;
              parsed.site = foundSite.name;
            }
          }

          // If branch changed, update branch_id and branch_name
          if (field === "branch_id" || field === "branch") {
            const foundBranch = branches.find((b) => String(b.id) === String(value) || b.name === value || b.code === value);
            if (foundBranch) {
              parsed.branch_id = foundBranch.id;
              parsed.branch_name = foundBranch.name;
              parsed.branch = foundBranch.name;
            }
          }

          // Clear field error from row errors if non-empty
          const existingErrors = (row.errors || []).filter(
            (err: any) => err.field !== field && err.field !== field.toLowerCase()
          );

          return {
            ...row,
            parsedData: parsed,
            parsed_data: parsed,
            errors: existingErrors,
          };
        }
        return row;
      });
    });
  };

  const handleBulkImport = async () => {
    const errorCount = validationResult?.errorCount ?? validationResult?.error_count ?? 0;
    if (errorCount > 0) {
      toast.error("Upload is blocked: You must resolve all missing mandatory fields and errors first.");
      return;
    }

    if (rows.length === 0) {
      toast.error("No valid employee rows to import.");
      return;
    }

    setIsImporting(true);
    try {
      const payloadRows = rows.map((r) => r.parsedData || r.parsed_data || r);
      const res = await employeesApi.bulkImport({ rows: payloadRows });
      toast.success(res.message || `Successfully imported ${res.count || rows.length} employees!`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      const errMsg = err.detail || err.error || err.message || "Bulk import failed.";
      toast.error(errMsg);
      if (err.errors_summary || err.errorsSummary) {
        console.error("Bulk import errors:", err.errors_summary || err.errorsSummary);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const errorCount = validationResult?.errorCount ?? validationResult?.error_count ?? 0;
  const totalRows = validationResult?.totalRows ?? validationResult?.total_rows ?? 0;
  const validCount = validationResult?.validCount ?? validationResult?.valid_count ?? 0;
  const isUploadBlocked = errorCount > 0;

  const displayedRows = filterMode === "errors" ? rows.filter((r) => !r.isValid && !r.is_valid) : rows;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                Employee Master Data Upload
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Upload bulk employee directory with strict mandatory field enforcement and live in-place preview correction.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => employeesApi.downloadTemplate()}
              className="gap-2 text-xs"
            >
              <Download className="h-4 w-4" /> Download Sample CSV Template
            </Button>
          </div>
        </DialogHeader>

        {/* View 1: Drag & Drop Upload Zone (when no file is uploaded yet) */}
        {!file && (
          <div className="py-6 space-y-6 overflow-y-auto">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-slate-300 hover:border-blue-400 bg-slate-50/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">
                Drag and drop your employee CSV file here, or click to browse
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supported file format: Comma Separated Values (.csv, UTF-8 encoded)
              </p>
              <Button type="button" variant="outline" size="sm" className="pointer-events-none">
                Select CSV File
              </Button>
            </div>

            {/* Mandatory Guidelines Card */}
            <div className="bg-slate-50 border rounded-lg p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mandatory Master Data Requirements
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900">First Name & Last Name:</strong> Both names are mandatory to identify the employee.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900">Employee Code:</strong> Unique ID across organization. Duplicate codes are rejected.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900">Contact (Email or Phone):</strong> At least one valid contact is required for system login.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900">Gender & Date of Joining:</strong> Mandatory for compliance and records (Format: DD-MM-YYYY).
                  </div>
                </div>
                <div className="flex items-start gap-2 md:col-span-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900">Corporate Entity:</strong> Mandatory organizational entity assignment to enforce strict tenant isolation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Validation Summary & In-Place Editable Preview Table */}
        {file && (
          <div className="flex-1 flex flex-col min-h-0 py-3 space-y-4">
            {/* Status & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-slate-600" />
                <span className="font-semibold text-sm text-slate-800 truncate max-w-xs">{file.name}</span>
                <Badge variant="outline" className="text-xs bg-white">
                  Total: {totalRows}
                </Badge>
                <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  Valid: {validCount}
                </Badge>
                {errorCount > 0 ? (
                  <Badge variant="destructive" className="text-xs font-semibold">
                    Errors: {errorCount}
                  </Badge>
                ) : (
                  <Badge className="text-xs bg-emerald-600">0 Errors</Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Filter toggle */}
                <div className="flex rounded-md border bg-white p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className={`px-2.5 py-1 rounded transition-colors font-medium ${
                      filterMode === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("errors")}
                    className={`px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1 ${
                      filterMode === "errors"
                        ? "bg-rose-600 text-white"
                        : "text-rose-600 hover:bg-rose-50"
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    Errors ({errorCount})
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => revalidateRows()}
                  disabled={isValidating}
                  className="gap-1.5 text-xs bg-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`} />
                  Re-Validate
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetState}
                  className="text-xs text-muted-foreground hover:text-slate-900"
                >
                  Change File
                </Button>
              </div>
            </div>

            {/* Validation Feedback Banner */}
            {isUploadBlocked ? (
              <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-900 py-3">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <AlertTitle className="text-sm font-semibold">
                  Upload Blocked — {errorCount} row(s) contain missing mandatory fields or validation errors
                </AlertTitle>
                <AlertDescription className="text-xs text-rose-800 mt-1">
                  HR can fill in the missing values or fix errors directly in the editable preview table below. Once all mandatory fields are completed, click <strong>Re-Validate</strong> or edit to unlock the import.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900 py-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="text-sm font-semibold">Validation Passed — Ready for Import</AlertTitle>
                <AlertDescription className="text-xs text-emerald-800 mt-1">
                  All {totalRows} employee records satisfy mandatory requirements and uniqueness checks. Click <strong>Confirm & Import</strong> below to commit all records atomically.
                </AlertDescription>
              </Alert>
            )}

            {/* In-Place Editable Preview Table */}
            <div className="flex-1 border rounded-lg overflow-auto bg-white min-h-[300px]">
              <Table className="text-xs">
                <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="min-w-[140px]">First Name*</TableHead>
                    <TableHead className="min-w-[140px]">Last Name*</TableHead>
                    <TableHead className="min-w-[130px]">Code*</TableHead>
                    <TableHead className="min-w-[190px]">Email*</TableHead>
                    <TableHead className="min-w-[130px]">Phone*</TableHead>
                    <TableHead className="min-w-[110px]">Gender*</TableHead>
                    <TableHead className="min-w-[130px]">DOJ*</TableHead>
                    <TableHead className="min-w-[160px]">Entity*</TableHead>
                    <TableHead className="min-w-[140px]">Department</TableHead>
                    <TableHead className="min-w-[140px]">Designation</TableHead>
                    <TableHead className="min-w-[140px]">Site</TableHead>
                    <TableHead className="min-w-[140px]">Branch</TableHead>
                    <TableHead className="min-w-[120px]">Worker Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-10 text-muted-foreground">
                        No rows found matching current filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedRows.map((row) => {
                      const rIndex = row.rowIndex ?? row.row_index;
                      const isValid = row.isValid ?? row.is_valid;
                      const data = row.parsedData || row.parsed_data || {};
                      const rowErrors = row.errors || [];
                      const errorFields = new Set(rowErrors.map((e: any) => e.field?.toLowerCase()));

                      return (
                        <TableRow
                          key={rIndex}
                          className={!isValid ? "bg-rose-50/30 hover:bg-rose-50/50" : "hover:bg-slate-50"}
                        >
                          {/* Row Index */}
                          <TableCell className="text-center font-medium text-slate-500">{rIndex}</TableCell>

                          {/* Status Badge */}
                          <TableCell>
                            {isValid ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                                Valid
                              </Badge>
                            ) : (
                              <div className="space-y-1">
                                <Badge variant="destructive" className="text-[10px]">
                                  Error ({rowErrors.length})
                                </Badge>
                                <div className="text-[10px] text-rose-600 leading-tight">
                                  {rowErrors.map((e: any, i: number) => (
                                    <div key={i}>• {e.message}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </TableCell>

                          {/* First Name* */}
                          <TableCell>
                            <Input
                              value={data.first_name || ""}
                              onChange={(e) => handleCellChange(rIndex, "first_name", e.target.value)}
                              placeholder="First Name *"
                              className={`h-8 text-xs ${
                                errorFields.has("firstname") || errorFields.has("first_name")
                                  ? "border-rose-500 bg-rose-50/50 focus-visible:ring-rose-500"
                                  : ""
                              }`}
                            />
                          </TableCell>

                          {/* Last Name* */}
                          <TableCell>
                            <Input
                              value={data.last_name || ""}
                              onChange={(e) => handleCellChange(rIndex, "last_name", e.target.value)}
                              placeholder="Last Name *"
                              className={`h-8 text-xs ${
                                errorFields.has("lastname") || errorFields.has("last_name")
                                  ? "border-rose-500 bg-rose-50/50 focus-visible:ring-rose-500"
                                  : ""
                              }`}
                            />
                          </TableCell>

                          {/* Code* */}
                          <TableCell>
                            <Input
                              value={data.code || ""}
                              onChange={(e) => handleCellChange(rIndex, "code", e.target.value)}
                              placeholder="EMP-XXXX *"
                              className={`h-8 text-xs font-mono ${
                                errorFields.has("code")
                                  ? "border-rose-500 bg-rose-50/50 focus-visible:ring-rose-500"
                                  : ""
                              }`}
                            />
                          </TableCell>

                          {/* Email* */}
                          <TableCell>
                            <Input
                              type="email"
                              value={data.email || ""}
                              onChange={(e) => handleCellChange(rIndex, "email", e.target.value)}
                              placeholder="user@example.com"
                              className={`h-8 text-xs ${
                                errorFields.has("email")
                                  ? "border-rose-500 bg-rose-50/50 focus-visible:ring-rose-500"
                                  : ""
                              }`}
                            />
                          </TableCell>

                          {/* Phone* */}
                          <TableCell>
                            <Input
                              value={data.phone || ""}
                              onChange={(e) => handleCellChange(rIndex, "phone", e.target.value)}
                              placeholder="9876543210"
                              className={`h-8 text-xs ${
                                errorFields.has("phone")
                                  ? "border-rose-500 bg-rose-50/50 focus-visible:ring-rose-500"
                                  : ""
                              }`}
                            />
                          </TableCell>

                          {/* Gender* */}
                          <TableCell>
                            <Select
                              value={data.gender || "Male"}
                              onValueChange={(val) => handleCellChange(rIndex, "gender", val)}
                            >
                              <SelectTrigger
                                className={`h-8 text-xs ${
                                  errorFields.has("gender") ? "border-rose-500 bg-rose-50/50" : ""
                                }`}
                              >
                                <SelectValue placeholder="Gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* DOJ* */}
                          <TableCell>
                            <Input
                              type="date"
                              value={data.doj || ""}
                              onChange={(e) => handleCellChange(rIndex, "doj", e.target.value)}
                              className={`h-8 text-xs ${
                                errorFields.has("doj")
                                  ? "border-rose-500 bg-rose-50/50 focus-visible:ring-rose-500"
                                  : ""
                              }`}
                            />
                          </TableCell>

                          {/* Entity* */}
                          <TableCell>
                            <Select
                              value={String(data.entity_id || "")}
                              onValueChange={(val) => handleCellChange(rIndex, "entity_id", val)}
                            >
                              <SelectTrigger
                                className={`h-8 text-xs ${
                                  errorFields.has("entity") ? "border-rose-500 bg-rose-50/50" : ""
                                }`}
                              >
                                <SelectValue placeholder="Select Entity *">
                                  {data.entity_name || "Select Entity"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {entities.map((ent) => (
                                  <SelectItem key={ent.id} value={String(ent.id)}>
                                    {ent.name} ({ent.code || "ENT"})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Department */}
                          <TableCell>
                            <Select
                              value={String(data.department_id || "")}
                              onValueChange={(val) => {
                                const dept = departments.find((d) => String(d.id) === val);
                                handleCellChange(rIndex, "department_id", val);
                                if (dept) handleCellChange(rIndex, "department_name", dept.name);
                              }}
                            >
                              <SelectTrigger
                                className={`h-8 text-xs ${
                                  errorFields.has("department") ? "border-rose-500 bg-rose-50/50" : ""
                                }`}
                              >
                                <SelectValue placeholder="Department">
                                  {data.department_name || "Unassigned"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {departments.map((d) => (
                                  <SelectItem key={d.id} value={String(d.id)}>
                                    {d.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Designation */}
                          <TableCell>
                            <Select
                              value={String(data.designation_id || "")}
                              onValueChange={(val) => {
                                const desg = designations.find((ds) => String(ds.id) === val);
                                handleCellChange(rIndex, "designation_id", val);
                                if (desg) handleCellChange(rIndex, "designation_name", (desg as any).title || desg.name);
                              }}
                            >
                              <SelectTrigger
                                className={`h-8 text-xs ${
                                  errorFields.has("designation") ? "border-rose-500 bg-rose-50/50" : ""
                                }`}
                              >
                                <SelectValue placeholder="Designation">
                                  {data.designation_name || "Unassigned"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {designations.map((ds) => (
                                  <SelectItem key={ds.id} value={String(ds.id)}>
                                    {(ds as any).title || ds.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Site */}
                          <TableCell>
                            <Select
                              value={String(data.site_id || "")}
                              onValueChange={(val) => {
                                const st = sites.find((s) => String(s.id) === val);
                                handleCellChange(rIndex, "site_id", val);
                                if (st) {
                                  handleCellChange(rIndex, "site_name", st.name);
                                  handleCellChange(rIndex, "site", st.name);
                                }
                              }}
                            >
                              <SelectTrigger
                                className={`h-8 text-xs ${
                                  errorFields.has("site") ? "border-rose-500 bg-rose-50/50" : ""
                                }`}
                              >
                                <SelectValue placeholder="Site">
                                  {data.site_name || "Unassigned"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {sites.map((st) => (
                                  <SelectItem key={st.id} value={String(st.id)}>
                                    {st.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Branch */}
                          <TableCell>
                            <Select
                              value={String(data.branch_id || "")}
                              onValueChange={(val) => {
                                const br = branches.find((b) => String(b.id) === val);
                                handleCellChange(rIndex, "branch_id", val);
                                if (br) {
                                  handleCellChange(rIndex, "branch_name", br.name);
                                  handleCellChange(rIndex, "branch", br.name);
                                }
                              }}
                            >
                              <SelectTrigger
                                className={`h-8 text-xs ${
                                  errorFields.has("branch") ? "border-rose-500 bg-rose-50/50" : ""
                                }`}
                              >
                                <SelectValue placeholder="Branch">
                                  {data.branch_name || "Unassigned"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {branches.map((br) => (
                                  <SelectItem key={br.id} value={String(br.id)}>
                                    {br.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Worker Type */}
                          <TableCell>
                            <Select
                              value={data.worker_type || "Salaried"}
                              onValueChange={(val) => handleCellChange(rIndex, "worker_type", val)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Worker Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Salaried">Salaried (Sec 192)</SelectItem>
                                <SelectItem value="Professional">Professional (Sec 194J)</SelectItem>
                                <SelectItem value="Contractor">Contractor (Sec 194C)</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {isUploadBlocked ? (
              <span className="text-rose-600 font-medium">
                ⚠️ Upload prevented until all {errorCount} errors are fixed.
              </span>
            ) : totalRows > 0 ? (
              <span className="text-emerald-700 font-medium">
                ✓ Ready to import {totalRows} employee record(s).
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
              Cancel
            </Button>

            {file && (
              <Button
                onClick={handleBulkImport}
                disabled={isUploadBlocked || isImporting || isValidating || totalRows === 0}
                className={
                  isUploadBlocked
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : isUploadBlocked ? (
                  `Upload Blocked (${errorCount} Errors)`
                ) : (
                  `Confirm & Import (${totalRows} Employees)`
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
