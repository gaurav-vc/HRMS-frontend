// Clean Enterprise TypeScript Domain Definitions for HRMS
// Decoupled from legacy mock-data store

export type Role =
  | "super_admin"
  | "org_admin"
  | "group_hr"
  | "entity_hr"
  | "site_hr"
  | "site_admin"
  | "payroll_admin"
  | "manager"
  | "employee"
  | (string & {});

export const ROLES: { value: Role; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "group_hr", label: "Group HR" },
  { value: "entity_hr", label: "Entity HR" },
  { value: "payroll_admin", label: "Payroll Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

export const isSuperAdminUser = (u: any): boolean => {
  if (!u) return false;
  return Boolean(
    u.is_superuser === true ||
    u.is_superuser === "true" ||
    u.is_superuser === 1 ||
    u.role === "super_admin" ||
    u.role_name === "Super Admin" ||
    (typeof u.username === "string" && u.username.toLowerCase().includes("super"))
  );
};

export const coerceBooleanPermission = (val: any): boolean => {
  if (val === true || val === 1) return true;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "t";
  }
  return false;
};


export interface Entity {
  id: string;
  name: string;
  code: string;
  country: string;
  currency: string;
  gstin: string;
  status: "Active" | "Inactive";
}

export interface Branch {
  id: string;
  entity: string | number;
  name: string;
  code: string;
  city: string;
  state: string;
  head: string;
}

export interface Site {
  id: string;
  branch: string | number;
  organization?: string | number;
  entity?: string | number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  qrEnabled: boolean;
  faceEnabled: boolean;
  contactEmail?: string;
  contact_email?: string;
  branding_text?: string;
  brandingText?: string;
  logo?: string;
  kioskEnabled?: boolean;
  kiosk_enabled?: boolean;
  kioskSimilarityThreshold?: number;
  kiosk_similarity_threshold?: number;
  kioskCooldownSeconds?: number;
  kiosk_cooldown_seconds?: number;
  kioskAutoPunch?: boolean;
  kiosk_auto_punch?: boolean;
  kioskToken?: string;
  kiosk_token?: string;
  kioskPin?: string;
  kiosk_pin?: string;
}

export interface Department {
  id: string;
  entity: string | number;
  name: string;
  code: string;
  head: string;
}

export interface Designation {
  id: string;
  department: string | number;
  title: string;
  grade: string;
}

export interface Employee {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  photo?: string;
  photoUrl?: string;
  photo_url?: string;
  entity: string | number;
  branch: string | number;
  site: string | number;
  department: string | number;
  designation: string | number;
  manager?: string | number;
  doj: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  status: "Active" | "On Leave" | "Inactive" | "Draft";
  pan: string;
  aadhaar: string;
  uan: string;
  esi: string;
  bankName: string;
  bankAccount: string;
  ifsc: string;
  address: string;
  ctc: number;
  avatar?: string;
  salaryStructure?: string | number | null;
  salary_structure?: string | number | null;
  first_name?: string;
  last_name?: string;
  name?: string;
  department_name?: string;
  designation_name?: string;
  entity_name?: string;
  employeeType?: string;
  bonusApplicable?: boolean;
  bonusType?: string;
  bonusValue?: number;
  bonusMonths?: number;
  pfApplicable?: boolean;
  taxRegime?: string;
  taxSavingDeductions?: number | string;
  groupCategory?: string;
  group_category?: string;
  gradeCategory?: string;
  grade_category?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  entity?: string | number;
  organization?: string | number;
  date: string;
  checkIn: string;
  checkOut?: string;
  location: string;
  distanceM: number;
  qrStatus: "Verified" | "Failed" | "N/A";
  faceScore: number;
  status: "Present" | "Absent" | "Half Day" | "WFH" | "Late";
}

export interface LeaveReq {
  id: string;
  employeeId: string;
  entity?: string | number;
  organization?: string | number;
  type: "Annual Leave" | "LOP";
  subType?: "Sick" | "Casual" | "Other";
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
}

export interface PayrollRun {
  id: string;
  period: string;
  entityId: string;
  employees: number;
  gross: number;
  deductions: number;
  net: number;
  status: "Draft" | "Processing" | "Approved" | "Disbursed";
  runOn: string;
}

export interface SalaryComponent {
  id: string;
  name: string;
  type: "Earning" | "Deduction";
  calc: "Fixed" | "% of Basic" | "% of CTC";
  value: number;
}

export interface Loan {
  id: string;
  employeeId: string;
  type: "Personal" | "Salary Advance" | "Education";
  amount: number;
  emi: number;
  tenure: number;
  outstanding: number;
  status: "Active" | "Closed" | "Pending";
}

export interface Reimbursement {
  id: string;
  employeeId: string;
  category: "Travel" | "Meals" | "Internet" | "Medical";
  amount: number;
  date: string;
  status: "Pending" | "Approved" | "Rejected" | "Paid";
  receipt: string;
}

export interface Regularization {
  id: string;
  employeeId: string;
  date: string;
  reason: string;
  requestedIn: string;
  requestedOut: string;
  status: "Pending" | "Approved" | "Rejected";
}

