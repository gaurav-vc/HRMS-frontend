import { useState, useEffect } from "react";
import { Download, CheckSquare, Square, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export interface ExportField {
  id: string;
  label: string;
  category: "Personal" | "Organization" | "Compliance & Bank" | "Payroll";
  accessor: (emp: any) => string | number;
}

export const AVAILABLE_FIELDS: ExportField[] = [
  // Personal
  { id: "code", label: "Employee Code", category: "Personal", accessor: (e) => e.code || "" },
  { id: "first_name", label: "First Name", category: "Personal", accessor: (e) => e.firstName || e.first_name || "" },
  { id: "last_name", label: "Last Name", category: "Personal", accessor: (e) => e.lastName || e.last_name || "" },
  { id: "email", label: "Email Address", category: "Personal", accessor: (e) => e.email || "" },
  { id: "phone", label: "Phone Number", category: "Personal", accessor: (e) => e.phone || "" },
  { id: "gender", label: "Gender", category: "Personal", accessor: (e) => e.gender || "" },
  { id: "dob", label: "Date of Birth", category: "Personal", accessor: (e) => e.dob || "" },

  // Organization
  { id: "entity", label: "Entity / Company", category: "Organization", accessor: (e) => e.entityName || e.entity_name || (typeof e.entity === "object" ? e.entity?.name : e.entity) || "" },
  { id: "branch", label: "Branch", category: "Organization", accessor: (e) => e.branchName || e.branch_name || (typeof e.branch === "object" ? e.branch?.name : e.branch) || "" },
  { id: "site", label: "Site / Location", category: "Organization", accessor: (e) => e.siteName || e.site_name || (typeof e.site === "object" ? e.site?.name : e.site) || "" },
  { id: "department", label: "Department", category: "Organization", accessor: (e) => e.departmentName || e.department_name || (typeof e.department === "object" ? e.department?.name : e.department) || "" },
  { id: "designation", label: "Designation", category: "Organization", accessor: (e) => e.designationName || e.designation_name || (typeof e.designation === "object" ? e.designation?.title : e.designation) || "" },
  { id: "group_category", label: "Group Category", category: "Organization", accessor: (e) => e.groupCategory || e.group_category || "General" },
  { id: "grade_category", label: "Grade Category", category: "Organization", accessor: (e) => e.gradeCategory || e.grade_category || "Unassigned" },
  { id: "manager", label: "Reporting Manager", category: "Organization", accessor: (e) => e.managerName || e.manager_name || "" },
  { id: "status", label: "Employment Status", category: "Organization", accessor: (e) => e.status || "" },
  { id: "doj", label: "Date of Joining", category: "Organization", accessor: (e) => e.doj || "" },

  // Compliance & Bank
  { id: "pan", label: "PAN Card", category: "Compliance & Bank", accessor: (e) => e.pan || "" },
  { id: "aadhaar", label: "Aadhaar Number", category: "Compliance & Bank", accessor: (e) => e.aadhaar || "" },
  { id: "uan", label: "UAN (PF)", category: "Compliance & Bank", accessor: (e) => e.uan || "" },
  { id: "esi", label: "ESI Number", category: "Compliance & Bank", accessor: (e) => e.esi || "" },
  { id: "bank_name", label: "Bank Name", category: "Compliance & Bank", accessor: (e) => e.bankName || e.bank_name || "" },
  { id: "bank_account", label: "Bank Account No.", category: "Compliance & Bank", accessor: (e) => e.bankAccount || e.bank_account || "" },
  { id: "ifsc", label: "IFSC Code", category: "Compliance & Bank", accessor: (e) => e.ifsc || "" },

  // Payroll
  { id: "ctc", label: "Annual CTC (₹)", category: "Payroll", accessor: (e) => e.ctc ?? "" },
  { id: "tax_regime", label: "Tax Regime", category: "Payroll", accessor: (e) => e.taxRegime || e.tax_regime || "New" },
];

const STORAGE_KEY = "hrms_employee_export_selected_fields";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: any[];
  filename?: string;
}

export function EmployeeExportModal({ open, onOpenChange, employees, filename = "employees_custom_export.csv" }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    // Default selected fields
    return ["code", "first_name", "last_name", "email", "phone", "department", "designation", "status", "doj"];
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
      }
    } catch {}
  }, [selectedIds]);

  const toggleField = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(AVAILABLE_FIELDS.map((f) => f.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handleExport = () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one field to export.");
      return;
    }

    const fieldsToExport = AVAILABLE_FIELDS.filter((f) => selectedIds.includes(f.id));
    const headers = fieldsToExport.map((f) => `"${f.label.replace(/"/g, '""')}"`).join(",");

    const rows = employees.map((emp) => {
      return fieldsToExport
        .map((f) => {
          let val = f.accessor(emp);
          if (val === null || val === undefined || val === "—" || val === "-") val = "";
          let str = String(val).replace(/"/g, '""');
          // Escape formulas
          if (/^[+=@-]$/.test(str.charAt(0))) {
            str = `'${str}`;
          }
          // Prevent Excel from scientific notation on long numbers (Account, Aadhaar)
          if (/^\d{8,}$/.test(str)) {
            str = `\t${str}`;
          }
          return `"${str}"`;
        })
        .join(",");
    });

    const csvContent = "\uFEFF" + headers + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${employees.length} records with ${fieldsToExport.length} selected fields!`);
    onOpenChange(false);
  };

  const categories = ["Personal", "Organization", "Compliance & Bank", "Payroll"] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Custom Field Export
          </DialogTitle>
          <DialogDescription>
            Select the exact fields you want to include in the exported CSV. Only checked fields will be downloaded.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="text-sm font-medium text-muted-foreground">
            {selectedIds.length} of {AVAILABLE_FIELDS.length} fields selected ({employees.length} records)
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={selectAll} className="text-xs h-7">
              <CheckSquare className="w-3.5 h-3.5 mr-1" /> Select All
            </Button>
            <Button size="sm" variant="outline" onClick={deselectAll} className="text-xs h-7">
              <Square className="w-3.5 h-3.5 mr-1" /> Deselect All
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 pr-2 space-y-5 py-2">
          {categories.map((cat) => {
            const fieldsInCat = AVAILABLE_FIELDS.filter((f) => f.category === cat);
            const selectedInCat = fieldsInCat.filter((f) => selectedIds.includes(f.id)).length;

            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                  <span>{cat}</span>
                  <span>{selectedInCat} / {fieldsInCat.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {fieldsInCat.map((f) => {
                    const checked = selectedIds.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer select-none transition-colors ${
                          checked
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border hover:bg-muted/50 text-foreground"
                        }`}
                        onClick={() => toggleField(f.id)}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="truncate">{f.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={selectedIds.length === 0} className="gap-2">
            <Download className="w-4 h-4" />
            Download Selected ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
