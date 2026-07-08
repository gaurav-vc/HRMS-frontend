// Mock data store for the HRMS prototype. All data is in-memory, seeded once.
export type Role = "super_admin" | "group_hr" | "entity_hr" | "payroll_admin" | "manager" | "employee";

export const ROLES: { value: Role; label: string }[] = [
  { value: "super_admin", label: "Super Admin / CEO" },
  { value: "group_hr", label: "Group HR" },
  { value: "entity_hr", label: "Entity HR" },
  { value: "payroll_admin", label: "Payroll Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

export interface Entity { id: string; name: string; code: string; country: string; currency: string; gstin: string; status: "Active" | "Inactive"; }
export interface Branch { id: string; entity: string | number; name: string; code: string; city: string; state: string; head: string; }
export interface Site { id: string; branch: string | number; name: string; address: string; latitude: number; longitude: number; radius: number; qrEnabled: boolean; faceEnabled: boolean; }
export interface Department { id: string; entity: string | number; name: string; code: string; head: string; }
export interface Designation { id: string; department: string | number; title: string; grade: string; }
export interface Employee {
  id: string; code: string; firstName: string; lastName: string; email: string; phone: string;
  entity: string | number; branch: string | number; site: string | number; department: string | number; designation: string | number;
  manager?: string | number; doj: string; dob: string; gender: "Male" | "Female" | "Other"; status: "Active" | "On Leave" | "Inactive" | "Draft";
  pan: string; aadhaar: string; uan: string; esi: string; bankName: string; bankAccount: string; ifsc: string;
  address: string; ctc: number; avatar?: string; salaryStructure?: string | number | null; employeeType?: string;
  bonusApplicable?: boolean; bonusType?: string; bonusValue?: number; bonusMonths?: number; pfApplicable?: boolean;
  taxRegime?: string; taxSavingDeductions?: number | string;
}
export interface Attendance {
  id: string; employeeId: string; date: string; checkIn: string; checkOut?: string;
  location: string; distanceM: number; qrStatus: "Verified" | "Failed" | "N/A"; faceScore: number;
  status: "Present" | "Absent" | "Half Day" | "WFH" | "Late";
}
export interface LeaveReq { id: string; employeeId: string; type: "Annual Leave" | "LOP"; subType?: "Sick" | "Casual" | "Other"; from: string; to: string; days: number; reason: string; status: "Pending" | "Approved" | "Rejected"; }
export interface PayrollRun { id: string; period: string; entityId: string; employees: number; gross: number; deductions: number; net: number; status: "Draft" | "Processing" | "Approved" | "Disbursed"; runOn: string; }
export interface SalaryComponent { id: string; name: string; type: "Earning" | "Deduction"; calc: "Fixed" | "% of Basic" | "% of CTC"; value: number; }
export interface Loan { id: string; employeeId: string; type: "Personal" | "Salary Advance" | "Education"; amount: number; emi: number; tenure: number; outstanding: number; status: "Active" | "Closed" | "Pending"; }
export interface Reimbursement { id: string; employeeId: string; category: "Travel" | "Meals" | "Internet" | "Medical"; amount: number; date: string; status: "Pending" | "Approved" | "Rejected" | "Paid"; receipt: string; }
export interface Regularization { id: string; employeeId: string; date: string; reason: string; requestedIn: string; requestedOut: string; status: "Pending" | "Approved" | "Rejected"; }

const FIRST = ["Aarav","Vihaan","Aditya","Arjun","Sai","Reyansh","Krishna","Ishaan","Rohan","Karan","Priya","Ananya","Diya","Saanvi","Aadhya","Myra","Kavya","Pari","Anika","Riya","Aman","Neha","Rahul","Sneha","Ravi","Pooja","Vikram","Meera","Akash","Tara"];
const LAST = ["Sharma","Verma","Patel","Reddy","Iyer","Singh","Mehta","Gupta","Khan","Joshi","Kapoor","Nair","Pillai","Shetty","Bose"];
const CITIES = [["Mumbai","MH"],["Bengaluru","KA"],["Hyderabad","TS"],["Pune","MH"],["Chennai","TN"],["Delhi","DL"],["Gurugram","HR"],["Noida","UP"]];
const DEPTS = ["Engineering","Finance","People Ops","Sales","Marketing","Operations","Customer Success","Legal","IT","Design"];
const DESIGS = ["Associate","Senior Associate","Lead","Manager","Senior Manager","Director","VP","Specialist","Analyst","Architect"];

const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const id = (p: string, n: number) => `${p}-${String(n).padStart(4, "0")}`;

function seed() {
  const entities: Entity[] = [
    { id: "ent-01", name: "Acme Technologies Pvt Ltd", code: "ACME-IN", country: "India", currency: "INR", gstin: "27AABCA1234A1Z5", status: "Active" },
    { id: "ent-02", name: "Acme Industries LLC", code: "ACME-US", country: "USA", currency: "USD", gstin: "—", status: "Active" },
    { id: "ent-03", name: "Acme Logistics Ltd", code: "ACME-LOG", country: "India", currency: "INR", gstin: "29AABCA1234B1Z2", status: "Active" },
  ];
  const branches: Branch[] = CITIES.map(([city, st], i) => ({
    id: id("br", i + 1), entity: entities[i % 3].id, name: `${city} Branch`, code: `BR-${city.slice(0,3).toUpperCase()}`,
    city, state: st, head: `${rand(FIRST)} ${rand(LAST)}`,
  }));
  const sites: Site[] = branches.flatMap((b, i) => ([
    { id: id("site", i*2+1), branch: b.id, name: `${b.city} HQ`, address: `${randInt(1,500)} Tech Park, ${b.city}`, latitude: 12.9 + i*0.3, longitude: 77.5 + i*0.4, radius: 150, qrEnabled: true, faceEnabled: true },
    { id: id("site", i*2+2), branch: b.id, name: `${b.city} Annexe`, address: `${randInt(1,500)} Business Bay, ${b.city}`, latitude: 12.9 + i*0.3 + 0.01, longitude: 77.5 + i*0.4 + 0.01, radius: 100, qrEnabled: true, faceEnabled: false },
  ]));
  const departments: Department[] = DEPTS.map((d, i) => ({ id: id("dept", i+1), entity: entities[i % 3].id, name: d, code: d.slice(0,3).toUpperCase(), head: `${rand(FIRST)} ${rand(LAST)}` }));
  const designations: Designation[] = departments.flatMap((d, i) => DESIGS.slice(0, 4).map((t, j) => ({ id: id("desg", i*4+j+1), department: d.id, title: t, grade: `G${j+3}` })));

  const employees: Employee[] = Array.from({ length: 48 }).map((_, i) => {
    const f = rand(FIRST), l = rand(LAST);
    const dept = rand(departments);
    const desg = rand(designations.filter(x => x.department === dept.id));
    const br = rand(branches.filter(b => b.entity === dept.entity)) ?? branches[0];
    const site = rand(sites.filter(s => s.branch === br.id)) ?? sites[0];
    return {
      id: id("emp", i+1), code: `EMP${1000+i}`, firstName: f, lastName: l,
      email: `${f.toLowerCase()}.${l.toLowerCase()}@acme.com`, phone: `+91 9${randInt(100000000, 999999999)}`,
      entity: String(dept.entity), branch: br.id, site: site.id, department: dept.id, designation: desg.id,
      manager: i > 5 ? id("emp", randInt(1, 5)) : undefined,
      doj: `202${randInt(0,4)}-${String(randInt(1,12)).padStart(2,"0")}-${String(randInt(1,28)).padStart(2,"0")}`,
      dob: `19${randInt(80,99)}-${String(randInt(1,12)).padStart(2,"0")}-${String(randInt(1,28)).padStart(2,"0")}`,
      gender: rand(["Male","Female","Other"] as const), status: rand(["Active","Active","Active","On Leave"] as const),
      pan: `ABCDE${randInt(1000,9999)}F`, aadhaar: `${randInt(1000,9999)} ${randInt(1000,9999)} ${randInt(1000,9999)}`,
      uan: `${randInt(100000000000,999999999999)}`, esi: `${randInt(1000000000,9999999999)}`,
      bankName: rand(["HDFC Bank","ICICI Bank","Axis Bank","SBI","Kotak"]), bankAccount: `${randInt(10000000000,99999999999)}`,
      ifsc: `HDFC000${randInt(1000,9999)}`,
      address: `${randInt(1,500)}, ${br.city}, ${br.state}, India`,
      ctc: randInt(4, 60) * 100000,
    };
  });

  const today = new Date();
  const attendance: Attendance[] = [];
  employees.slice(0, 20).forEach(emp => {
    for (let d = 0; d < 14; d++) {
      const date = new Date(today); date.setDate(today.getDate() - d);
      const site = sites.find(s => s.id === emp.site)!;
      attendance.push({
        id: id("att", attendance.length + 1), employeeId: emp.id,
        date: date.toISOString().slice(0,10),
        checkIn: `09:${String(randInt(0,59)).padStart(2,"0")}`,
        checkOut: `18:${String(randInt(0,59)).padStart(2,"0")}`,
        location: site.name, distanceM: randInt(5, 180),
        qrStatus: rand(["Verified","Verified","Verified","Failed"] as const),
        faceScore: randInt(82, 99),
        status: rand(["Present","Present","Present","WFH","Late"] as const),
      });
    }
  });

  const leaves: LeaveReq[] = Array.from({ length: 18 }).map((_, i) => {
    const emp = rand(employees);
    const from = new Date(); from.setDate(from.getDate() + randInt(-10, 20));
    const to = new Date(from); to.setDate(from.getDate() + randInt(0, 4));
    return { id: id("lv", i+1), employeeId: emp.id, type: rand(["Annual Leave","LOP"] as const), subType: rand(["Casual","Sick","Other"] as const),
      from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10),
      days: Math.max(1, Math.ceil((+to - +from)/86400000)+1),
      reason: rand(["Personal work","Family function","Not feeling well","Vacation","Doctor visit"]),
      status: rand(["Pending","Approved","Approved","Rejected"] as const) };
  });

  const payrollRuns: PayrollRun[] = ["2026-04","2026-05","2026-06"].map((p, i) => ({
    id: id("pr", i+1), period: p, entityId: entities[0].id, employees: employees.length,
    gross: 28500000 + i*100000, deductions: 4200000, net: 24300000 + i*100000,
    status: i === 2 ? "Draft" : "Disbursed", runOn: `${p}-28`,
  }));

  const salaryComponents: SalaryComponent[] = [
    { id: "sc-1", name: "Basic", type: "Earning", calc: "% of CTC", value: 40 },
    { id: "sc-2", name: "HRA", type: "Earning", calc: "% of Basic", value: 50 },
    { id: "sc-3", name: "Special Allowance", type: "Earning", calc: "Fixed", value: 15000 },
    { id: "sc-4", name: "Conveyance", type: "Earning", calc: "Fixed", value: 1600 },
    { id: "sc-5", name: "Medical", type: "Earning", calc: "Fixed", value: 1250 },
    { id: "sc-6", name: "PF Employee", type: "Deduction", calc: "% of Basic", value: 12 },
    { id: "sc-7", name: "Professional Tax", type: "Deduction", calc: "Fixed", value: 200 },
    { id: "sc-8", name: "Income Tax", type: "Deduction", calc: "% of CTC", value: 8 },
  ];

  const loans: Loan[] = Array.from({ length: 10 }).map((_, i) => {
    const emp = rand(employees);
    const amount = randInt(50000, 500000);
    return { id: id("ln", i+1), employeeId: emp.id, type: rand(["Personal","Salary Advance","Education"] as const),
      amount, emi: Math.round(amount / randInt(12, 36)), tenure: randInt(12, 36),
      outstanding: Math.round(amount * Math.random()), status: rand(["Active","Active","Closed","Pending"] as const) };
  });

  const reimbursements: Reimbursement[] = Array.from({ length: 14 }).map((_, i) => {
    const emp = rand(employees);
    return { id: id("rb", i+1), employeeId: emp.id, category: rand(["Travel","Meals","Internet","Medical"] as const),
      amount: randInt(500, 25000), date: `2026-06-${String(randInt(1,17)).padStart(2,"0")}`,
      status: rand(["Pending","Approved","Paid","Rejected"] as const), receipt: `RCPT-${1000+i}.pdf` };
  });

  const regularizations: Regularization[] = Array.from({ length: 8 }).map((_, i) => {
    const emp = rand(employees);
    return { id: id("rg", i+1), employeeId: emp.id, date: `2026-06-${String(randInt(1,15)).padStart(2,"0")}`,
      reason: rand(["Forgot to check-in","System issue","Client meeting offsite","On-call duty"]),
      requestedIn: `09:${String(randInt(0,59)).padStart(2,"0")}`, requestedOut: `18:${String(randInt(0,59)).padStart(2,"0")}`,
      status: rand(["Pending","Approved","Rejected"] as const) };
  });

  return { entities, branches, sites, departments, designations, employees, attendance, leaves, payrollRuns, salaryComponents, loans, reimbursements, regularizations };
}

// Stable seed using a fixed Math.random surrogate would be nicer, but for prototype this is fine.
let _db: ReturnType<typeof seed> | null = null;
export function db() {
  if (!_db) _db = seed();
  return _db;
}

export function fmtINR(n: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n); }
export function empName(empId?: string) { const e = db().employees.find(x => x.id === empId); return e ? `${e.firstName} ${e.lastName}` : "—"; }
