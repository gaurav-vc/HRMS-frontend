import {
  db,
  Employee,
  Branch,
  Entity,
  Department,
  Designation,
  Site,
  Attendance,
  LeaveReq,
  PayrollRun,
  SalaryComponent,
  Loan,
  Reimbursement,
  Regularization,
} from "@/lib/mock-data";
import { redirect } from "@tanstack/react-router";

// Simulated network delay
const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const API_BASE_URL = import.meta.env.PROD
  ? (typeof window !== 'undefined' && window.location.hostname.includes('vibesandbox')
      ? "https://hrms.vibesandbox.live"
      : "https://hrms.vibecopilot.ai")
  : "http://127.0.0.1:8000";

export const getMediaUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  try {
    let path = url;
    if (url.startsWith('http')) {
      path = new URL(url).pathname;
    }
    // Force the path to go through the /api/ namespace so the Sandbox proxy catches it
    if (path.startsWith('/media/')) {
      path = path.replace('/media/', '/api/media/');
    }
    return path.startsWith('/') ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/${path}`;
  } catch (e) {
    return url;
  }
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Example API services that currently use the mock-data DB but return Promises.
// You can replace the internal implementation with actual fetch/axios calls using apiClient.
const apiCall = async (url: string, method: string = "GET", body?: any, isBlob: boolean = false) => {
  let base = "/api/organisation";
  if (url.startsWith("/employees")) base = "/api";
  if (url.startsWith("/exits")) base = "/api";
  if (url.startsWith("/attendance")) base = "/api";
  if (url.startsWith("/leaves")) base = "/api";
  if (url.startsWith("/payroll")) base = "/api";
  if (url.startsWith("/auth")) base = "/api";
  if (url.startsWith("/notifications")) base = "/api";
  if (url.startsWith("/search")) base = "/api";
  if (url.startsWith("/dashboard")) base = "/api";
  if (url.startsWith("/roles")) base = "/api/organisation";
  if (url.startsWith("/org-engine")) base = "/api";
  if (url.startsWith("/offer-letters")) base = "/api";
  if (url.startsWith("/offer-templates")) base = "/api";
  if (url.startsWith("/documents")) base = "/api";
  if (url.startsWith("/leaves/config")) base = "/api"; // Config is under leaves/config
  if (url.startsWith("/organizations")) base = "/api/admin_org";
  if (url.startsWith("/invoices")) base = "/api/admin_org";
  if (url.startsWith("/api")) base = ""; // direct path

  const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = {};
  
  let fetchBody = body;
  if (body) {
    if (body instanceof FormData) {
      fetchBody = body;
    } else {
      headers["Content-Type"] = "application/json";
      fetchBody = JSON.stringify(body);
    }
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE_URL}${base}${url}`, {
    method,
    headers,
    cache: "no-store",
    body: fetchBody,
  });

  // Auto-refresh token if 401 Unauthorized
  if (res.status === 401 && !url.includes("/token")) {
    const refresh =
      typeof localStorage !== "undefined" ? localStorage.getItem("refresh_token") : null;
    if (refresh) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh }),
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (typeof localStorage !== "undefined")
              localStorage.setItem("access_token", data.access);
            if (data.refresh) {
              if (typeof localStorage !== "undefined")
                localStorage.setItem("refresh_token", data.refresh);
            }
            onRefreshed(data.access);
          } else {
            onRefreshed(""); // Empty token means failed
            if (typeof window !== "undefined") {
              localStorage.removeItem("hrms-auth");
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
            }
          }
        } catch (err) {
          onRefreshed("");
        } finally {
          isRefreshing = false;
        }
      }

      // Wait for refresh to complete
      const newToken = await new Promise<string>((resolve) => {
        subscribeTokenRefresh(resolve);
      });

      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(`${API_BASE_URL}${base}${url}`, {
          method,
          headers,
          cache: "no-store",
          body: fetchBody,
        });
      } else {
        throw redirect({ to: "/auth" });
      }
    } else {
      if (typeof window !== "undefined") {
        localStorage.removeItem("hrms-auth");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
      throw redirect({ to: "/auth" });
    }
  }

  if (!res.ok) {
    let errMsg = res.statusText;
    try {
      const errBody = await res.json();
      if (errBody && errBody.message) errMsg = errBody.message;
      else if (errBody && errBody.error) errMsg = errBody.error;
      else if (errBody && errBody.detail) errMsg = errBody.detail;
      else if (errBody) errMsg = JSON.stringify(errBody);
    } catch (e) {
      /* ignore */
    }
    throw new Error(errMsg);
  }
  if (method === "DELETE") return null;
  return isBlob ? res.blob() : res.json();
};

export const api = {
  getDashboardStats: () => apiCall("/dashboard/stats/"),
  getPayrollAttendanceReport: () => apiCall("/api/reports/payroll-attendance/"),
};

export const authApi = {
  login: async (credentials: any) => apiCall("/auth/token/", "POST", credentials),
  getMe: async () => apiCall("/auth/me/"),
  updateProfile: async (data: any) => apiCall("/auth/me/", "PATCH", data),
  logout: async (refresh: string) => apiCall("/auth/logout/", "POST", { refresh }),
  requestPasswordReset: async (email: string) =>
    apiCall("/auth/password-reset/request/", "POST", { email }),
  confirmPasswordReset: async (data: any) =>
    apiCall("/auth/password-reset/confirm/", "POST", data),
  changePassword: async (data: any) =>
    apiCall("/auth/change-password/", "POST", data),
};

export const searchApi = {
  query: async (q: string) => apiCall(`/search/?q=${encodeURIComponent(q)}`),
};

export const employeesApi = {
  getAll: async (): Promise<Employee[]> => apiCall("/employees/"),
  getById: async (id: string | number): Promise<Employee> => apiCall(`/employees/${id}/`),
  create: async (data: Partial<Employee>): Promise<Employee> =>
    apiCall("/employees/", "POST", data),
  update: async (id: string | number, data: Partial<Employee>): Promise<Employee> =>
    apiCall(`/employees/${id}/`, "PATCH", data),
  delete: async (id: string | number) => apiCall(`/employees/${id}/`, "DELETE"),
  getAuditLogs: async (id: string | number) => apiCall(`/employees/${id}/audit_logs/`),

  bulkImport: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiCall("/employees/bulk_import/", "POST", formData);
  },

  // Documents
  getDocuments: async (employeeId: string | number) =>
    apiCall(`/documents/?employee=${employeeId}`),
  uploadDocument: async (
    employeeId: string | number,
    file: File,
    documentType: string,
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("employee", String(employeeId));
    formData.append("document_type", documentType);
    formData.append("name", file.name);
    return apiCall("/documents/", "POST", formData);
  },
  deleteDocument: async (documentId: string | number) =>
    apiCall(`/documents/${documentId}/`, "DELETE"),

  // Transfers
  getTransfers: async () => apiCall("/transfers/"),
  createTransfer: async (data: any) => apiCall("/transfers/", "POST", data),
  updateTransfer: async (id: string | number, data: any) =>
    apiCall(`/transfers/${id}/`, "PATCH", data),

  // Exits
  getExits: async () => apiCall("/exits/"),
  createExit: async (data: any) => apiCall("/exits/", "POST", data),
  updateExit: async (id: string | number, data: any) => apiCall(`/exits/${id}/`, "PATCH", data),
};

export const organizationsApi = {
  getAll: async () => apiCall("/organizations/"),
  getById: async (id: string | number) => apiCall(`/organizations/${id}/`),
  create: async (data: any) => apiCall("/organizations/", "POST", data),
  update: async (id: string | number, data: any) => apiCall(`/organizations/${id}/`, "PUT", data),
  delete: async (id: string | number) => apiCall(`/organizations/${id}/`, "DELETE"),
  resendEmail: async (id: string | number) => apiCall(`/organizations/${id}/resend-email/`, "POST"),
};

export const invoicesApi = {
  getAll: async (orgId?: string) => {
    const query = orgId ? `?organization=${orgId}` : "";
    return apiCall(`/invoices/${query}`);
  },
};

export const branchesApi = {
  getAll: async (): Promise<Branch[]> => apiCall("/branches/"),
  create: async (data: Partial<Branch>): Promise<Branch> => apiCall("/branches/", "POST", data),
  update: async (id: string | number, data: Partial<Branch>): Promise<Branch> =>
    apiCall(`/branches/${id}/`, "PUT", data),
  delete: async (id: string | number): Promise<void> => apiCall(`/branches/${id}/`, "DELETE"),
};

export const entitiesApi = {
  getAll: async (): Promise<Entity[]> => apiCall("/entities/"),
  create: async (data: Partial<Entity>): Promise<Entity> => apiCall("/entities/", "POST", data),
  update: async (id: string | number, data: Partial<Entity>): Promise<Entity> =>
    apiCall(`/entities/${id}/`, "PUT", data),
  delete: async (id: string | number): Promise<void> => apiCall(`/entities/${id}/`, "DELETE"),
};

export const sitesApi = {
  getAll: async (): Promise<Site[]> => apiCall("/sites/"),
  create: async (data: Partial<Site>): Promise<Site> => apiCall("/sites/", "POST", data),
  update: async (id: string | number, data: Partial<Site>): Promise<Site> =>
    apiCall(`/sites/${id}/`, "PUT", data),
  delete: async (id: string | number): Promise<void> => apiCall(`/sites/${id}/`, "DELETE"),
};
export const orgEngineApi = {
  getTree: async (tenantId: number = 1): Promise<any> =>
    apiCall(`/org-engine/nodes/tree/?tenant_id=${tenantId}`),
  getNodeTypes: async (): Promise<any[]> => apiCall("/org-engine/node-types/"),
  getNodesByType: async (nodeType: string): Promise<any[]> =>
    apiCall(`/org-engine/nodes/?node_type=${nodeType}`),
  createNode: async (data: any): Promise<any> => apiCall("/org-engine/nodes/", "POST", data),
  updateNode: async (id: number, data: any): Promise<any> =>
    apiCall(`/org-engine/nodes/${id}/`, "PATCH", data),
  moveNode: async (id: number, newParentId: number | null): Promise<any> =>
    apiCall(`/org-engine/nodes/${id}/move/`, "POST", { new_parent_id: newParentId }),
  cloneNode: async (id: number, newParentId: number | null): Promise<any> =>
    apiCall(`/org-engine/nodes/${id}/clone/`, "POST", { new_parent_id: newParentId }),
  archiveNode: async (id: number): Promise<any> =>
    apiCall(`/org-engine/nodes/${id}/archive/`, "POST"),
  impactAnalysis: async (
    id: number,
    action: string,
    newParentId: number | null = null,
  ): Promise<any> => {
    let url = `/org-engine/nodes/${id}/impact_analysis/?action=${action}`;
    if (newParentId) url += `&new_parent_id=${newParentId}`;
    return apiCall(url);
  },
  restoreNode: async (id: number): Promise<any> =>
    apiCall(`/org-engine/nodes/${id}/restore/`, "POST"),
  bulkImport: async (nodes: any[], preview: boolean = true): Promise<any> =>
    apiCall(`/org-engine/nodes/bulk_import/?preview=${preview}`, "POST", { nodes }),
};

export const attendancePoliciesApi = {
  getAll: async (params?: string): Promise<any> =>
    apiCall(`/organisation/attendance-policies/${params || ""}`),
  create: async (data: any): Promise<any> =>
    apiCall("/organisation/attendance-policies/", "POST", data),
  update: async (id: number, data: any): Promise<any> =>
    apiCall(`/organisation/attendance-policies/${id}/`, "PATCH", data),
};

export const attendanceApi = {
  punch: async (data: any): Promise<any> => apiCall("/attendance/punch/", "POST", data),
  getLivenessChallenge: async (): Promise<any> => apiCall("/attendance/get_liveness_challenge/"),
  punchWithFace: async (data: any, faceImage: File): Promise<any> => {
    const formData = new FormData();
    formData.append("face_image", faceImage);
    for (const key in data) {
      formData.append(key, data[key]);
    }
    return apiCall("/attendance/punch/", "POST", formData);
  },
  registerFace: async (file: File, employeeId: string | number): Promise<any> => {
    const formData = new FormData();
    formData.append("face_image", file);
    formData.append("employee", employeeId.toString());
    return apiCall("/attendance/register_face/", "POST", formData);
  },
  generateQr: async (data: any): Promise<any> => apiCall("/attendance/generate_qr/", "POST", data),
  getToday: async (): Promise<any[]> => apiCall("/attendance/today/"),
  getHistory: async (): Promise<any[]> => apiCall("/attendance/history/"),
  getDashboard: async (): Promise<any> => apiCall("/attendance/dashboard/"),
  requestRegularization: async (data: any): Promise<any> =>
    apiCall("/attendance/regularization/", "POST", data),
  getRegularizations: async (): Promise<any[]> => apiCall("/attendance/regularization/"),
  approveRegularization: async (id: string | number, data: any): Promise<any> =>
    apiCall(`/attendance/regularization/${id}/`, "PATCH", data),

  // Shifts
  getShifts: async (): Promise<any[]> => apiCall("/attendance/shifts/"),
  createShift: async (data: any): Promise<any> => apiCall("/attendance/shifts/", "POST", data),
  updateShift: async (id: string | number, data: any): Promise<any> =>
    apiCall(`/attendance/shifts/${id}/`, "PUT", data),
  deleteShift: async (id: string | number): Promise<void> =>
    apiCall(`/attendance/shifts/${id}/`, "DELETE"),

  // Roster
  getWeeklyRoster: async (startDate: string, endDate: string): Promise<any> =>
    apiCall(`/attendance/roster/weekly/?start_date=${startDate}&end_date=${endDate}`),
  assignShift: async (data: {
    employee_id: number;
    date: string;
    shift_id: number | null;
  }): Promise<any> => apiCall("/attendance/roster/assign/", "POST", data),
  bulkAssign: async (data: {
    department_ids: number[];
    shift_id: number;
    start_date: string;
    end_date: string;
  }): Promise<any> => apiCall("/attendance/roster/bulk_assign/", "POST", data),
  getEmployeeReport: async (employeeId: number, year: number, month: number): Promise<any> =>
    apiCall(`/attendance/employee_report/?employee_id=${employeeId}&year=${year}&month=${month}`),
};

export const departmentsApi = {
  getAll: async (): Promise<Department[]> => apiCall("/departments/"),
  create: async (data: Partial<Department>): Promise<Department> =>
    apiCall("/departments/", "POST", data),
  update: async (id: string | number, data: Partial<Department>): Promise<Department> =>
    apiCall(`/departments/${id}/`, "PUT", data),
  delete: async (id: string | number): Promise<void> => apiCall(`/departments/${id}/`, "DELETE"),
};

export const designationsApi = {
  getAll: async (): Promise<Designation[]> => apiCall("/designations/"),
  create: async (data: Partial<Designation>): Promise<Designation> =>
    apiCall("/designations/", "POST", data),
  update: async (id: string | number, data: Partial<Designation>): Promise<Designation> =>
    apiCall(`/designations/${id}/`, "PUT", data),
  delete: async (id: string | number): Promise<void> => apiCall(`/designations/${id}/`, "DELETE"),
};

// Removed duplicate attendanceApi

export const leavesApi = {
  getAll: async (mode?: string): Promise<any[]> =>
    apiCall(`/leaves/${mode ? `?mode=${mode}` : ""}`),
  getTypes: async (): Promise<any[]> => apiCall("/leaves/types/"),
  createLeave: async (data: any): Promise<any> => apiCall("/leaves/", "POST", data),
  getLeaveBalances: async (): Promise<any[]> => apiCall("/leaves/balances/"),
  getDashboard: async (mode?: string): Promise<any> =>
    apiCall(`/leaves/dashboard/${mode ? `?mode=${mode}` : ""}`),
  approveLeave: async (id: string | number, data: any): Promise<any> =>
    apiCall(`/leaves/${id}/approve/`, "PATCH", data),
  rejectLeave: async (id: string | number, data: any): Promise<any> =>
    apiCall(`/leaves/${id}/reject/`, "PATCH", data),
};

export const payrollApi = {
  getRuns: async (): Promise<any[]> => apiCall("/payroll/runs/"),
  createRun: async (data: any): Promise<any> => apiCall("/payroll/runs/", "POST", data),
  executeRun: async (id: number, payload?: any): Promise<any> =>
    apiCall(`/payroll/runs/${id}/execute/`, "POST", payload || {}),
  approveRun: async (id: number): Promise<any> => apiCall(`/payroll/runs/${id}/approve/`, "POST"),
  rejectRun: async (id: number, comment: string): Promise<any> =>
    apiCall(`/payroll/runs/${id}/reject/`, "POST", { comment }),
  getStructures: async (): Promise<any[]> => {
    try {
      return await apiCall("/payroll/structures/");
    } catch (e: any) {
      if (e.message && (e.message.includes("Forbidden") || e.message.includes("permission"))) return [];
      throw e;
    }
  },
  createStructure: async (data: any) => apiCall("/payroll/structures/", "POST", data),
  updateStructure: async (id: number, data: any) =>
    apiCall(`/payroll/structures/${id}/`, "PATCH", data),
  deleteStructure: async (id: number) => apiCall(`/payroll/structures/${id}/`, "DELETE"),
  getComponents: async (structureId?: number) => {
    const qs = structureId ? `?structure=${structureId}` : "";
    return apiCall(`/payroll/components/${qs}`);
  },
  createSalaryComponent: async (data: any) => apiCall("/payroll/components/", "POST", data),
  updateSalaryComponent: async (id: number, data: any) => apiCall(`/payroll/components/${id}/`, "PATCH", data),
  deleteSalaryComponent: async (id: number) => apiCall(`/payroll/components/${id}/`, "DELETE"),
  getSlips: async (period?: string) => {
    const query = period ? `?period=${encodeURIComponent(period)}` : "";
    return apiCall(`/payroll/slips/${query}`);
  },
  emailSlip: async (id: number) => apiCall(`/payroll/slips/${id}/email/`, "POST"),
  emailSlipWithAttachment: async (id: number, pdfBase64: string) =>
    apiCall(`/payroll/slips/${id}/email/`, "POST", { pdf: pdfBase64 }),
  getComplianceReports: async () => apiCall("/payroll/compliance/"),
  generateReturn: async (category: string) => {
    return apiCall(`/payroll/compliance/generate_return/?category=${encodeURIComponent(category)}`, "GET", undefined, true);
  },
  getPreview: async (params: { period: string; entity?: string }) => {
    let qs = `?period=${encodeURIComponent(params.period)}&_t=${Date.now()}`;
    if (params.entity) qs += `&entity=${encodeURIComponent(params.entity)}`;
    return apiCall(`/payroll/preview/${qs}`);
  },
};

export const loansApi = {
  getAll: async (): Promise<Loan[]> => apiCall("/payroll/loans/"),
  createLoan: async (data: any): Promise<Loan> => apiCall("/payroll/loans/", "POST", data),
  updateLoan: async (id: string | number, data: any): Promise<Loan> => apiCall(`/payroll/loans/${id}/`, "PATCH", data),
};

export const reimbursementsApi = {
  getAll: async (): Promise<Reimbursement[]> => apiCall("/payroll/reimbursements/"),
  createReimbursement: async (data: any): Promise<Reimbursement> =>
    apiCall("/payroll/reimbursements/", "POST", data),
  updateReimbursement: async (id: string | number, data: any): Promise<Reimbursement> =>
    apiCall(`/payroll/reimbursements/${id}/`, "PATCH", data),
};

export const regularizationsApi = {
  getAll: async (): Promise<Regularization[]> => apiCall("/attendance/regularization/"),
};

export const rolesApi = {
  getAll: async (): Promise<any[]> => apiCall("/roles/"),
  get: async (id: string | number): Promise<any> => apiCall(`/roles/${id}/`),
  create: async (data: any): Promise<any> => apiCall("/roles/", "POST", data),
  update: async (id: string | number, data: any): Promise<any> =>
    apiCall(`/roles/${id}/`, "PATCH", data),
  delete: async (id: string | number): Promise<void> => apiCall(`/roles/${id}/`, "DELETE"),
};

export const notificationsApi = {
  getAll: async (): Promise<any[]> => apiCall("/notifications/"),
  markRead: async (id: number): Promise<any> => apiCall(`/notifications/${id}/mark_read/`, "POST"),
};

export const holidaysApi = {
  getAll: async (): Promise<any> => apiCall("/attendance/holidays/"),
  getStats: async (): Promise<any> => apiCall("/attendance/holidays/stats/"),
  create: async (data: any): Promise<any> => apiCall("/attendance/holidays/", "POST", data),
};

export const offersApi = {
  getAll: async (): Promise<any[]> => apiCall("/offer-letters/"),
  getDashboardMetrics: async (): Promise<any> => apiCall("/offer-letters/dashboard_metrics/"),
  getById: async (id: string | number): Promise<any> => apiCall(`/offer-letters/${id}/`),
  create: async (data: any): Promise<any> => apiCall("/offer-letters/", "POST", data),
  update: async (id: string | number, data: any): Promise<any> =>
    apiCall(`/offer-letters/${id}/`, "PATCH", data),
  delete: async (id: string | number): Promise<void> => apiCall(`/offer-letters/${id}/`, "DELETE"),
  previewOffer: async (data: { employee_id: number; template_id: number | string }): Promise<any> =>
    apiCall("/offer-letters/preview_email/", "POST", data),
  sendCustomOffer: async (data: { employee_id: number; template_id: number | string; html_content: string; email_body_text?: string }): Promise<any> =>
    apiCall("/offer-letters/send_custom_email/", "POST", data),
};

export const offerTemplatesApi = {
  getAll: async (): Promise<any[]> => apiCall("/offer-templates/"),
  getById: async (id: string | number): Promise<any> => apiCall(`/offer-templates/${id}/`),
  create: async (data: any): Promise<any> => {
    const formData = new FormData();
    for (const key in data) {
      if (data[key] !== null && data[key] !== undefined) {
        if (key === 'placeholders') {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
      }
    }
    return apiCall("/offer-templates/", "POST", formData);
  },
  update: async (id: string | number, data: any): Promise<any> => {
    const formData = new FormData();
    for (const key in data) {
      if (data[key] !== null && data[key] !== undefined) {
        if (key === 'placeholders') {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
      }
    }
    return apiCall(`/offer-templates/${id}/`, "PATCH", formData);
  },
  delete: async (id: string | number): Promise<void> =>
    apiCall(`/offer-templates/${id}/`, "DELETE"),
};
export const leavesConfigApi = {
  getSettings: async (): Promise<any> => apiCall("/leaves/config/"),
  updateSettings: async (data: any): Promise<any> => apiCall("/leaves/config/", "PUT", data),
};

export const form16Api = {
  getAll: async (): Promise<any[]> => apiCall("/payroll/form16/"),
  upload: async (formData: FormData): Promise<any> => {
    return apiCall("/payroll/form16/", "POST", formData);
  },
  bulkUpload: async (formData: FormData): Promise<any> => {
    return apiCall("/payroll/form16/bulk_upload/", "POST", formData);
  },
  delete: async (id: number): Promise<any> => apiCall(`/payroll/form16/${id}/`, "DELETE"),
};

export const ctcImportApi = {
  getHistory: async (): Promise<any[]> => apiCall("/payroll/import-ctc/history/"),
  upload: async (formData: FormData): Promise<any> => {
    return apiCall("/payroll/import-ctc/upload/", "POST", formData);
  },
  downloadTemplate: `${API_BASE_URL}/api/payroll/import-ctc/template/`,
};
