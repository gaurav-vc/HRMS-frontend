import { fmtINR } from "./utils";
import type { LoanStatement, LoanInstallment } from "@/types";

export function openLoanStatementPdf(statement: LoanStatement, empDetails?: any) {
  const { loan, installments = [], summary } = statement;

  const empName =
    loan.employeeName ||
    (empDetails ? `${empDetails.firstName || ""} ${empDetails.lastName || ""}`.trim() : "") ||
    "Employee";

  const empCode = loan.employeeCode || empDetails?.code || empDetails?.employeeId || "—";
  const deptName = loan.departmentName || empDetails?.department?.name || empDetails?.department || "General";
  const desigTitle = loan.designationTitle || empDetails?.designation?.title || empDetails?.designation || "Executive";
  const orgName = empDetails?.entityName || empDetails?.orgName || "Lotus Developers";

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const fmt = (val: number | string | undefined | null): string => {
    const num = parseFloat(String(val ?? 0));
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const nowFormatted = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const accountNo = `LN-${String(loan.id).padStart(6, "0")}`;

  const rowsHtml = installments
    .map((inst: LoanInstallment) => {
      const isDebited = inst.status === "DEBITED";
      const isSkipped = inst.status === "SKIPPED";
      const isPending = inst.status === "PENDING";

      let statusBadge = "";
      if (isDebited) {
        statusBadge = `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#dcfce7;color:#15803d;font-weight:700;font-size:10px;">PAID / DEBITED</span>`;
      } else if (isSkipped) {
        statusBadge = `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#ede9fe;color:#6b21a8;font-weight:700;font-size:10px;">DEFERRED / MORATORIUM</span>`;
      } else {
        statusBadge = `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#fef3c7;color:#b45309;font-weight:700;font-size:10px;">SCHEDULED</span>`;
      }

      let notes = "";
      if (isSkipped) {
        const strat = inst.skipStrategy === "EXTEND_TENURE" ? "Tenure +1 Mo" : "Next Mo Catch-up";
        notes = `[${strat}] ${inst.skipReason || "Management Approved Relief"}`;
      } else if (isDebited) {
        notes = inst.debitedInRunPeriod ? `Debited in Payroll Run (${inst.debitedInRunPeriod})` : "Debited in Salary Slip";
      } else {
        notes = "Upcoming salary recovery";
      }

      const rowBg = isSkipped ? "background:#faf5ff;" : isDebited ? "background:#f0fdf4;" : "";

      return `
        <tr style="height:28px;${rowBg}border-bottom:1px solid #e2e8f0;">
          <td style="padding:6px 10px;text-align:center;font-weight:600;">#${inst.installmentNumber}</td>
          <td style="padding:6px 10px;font-weight:700;color:#0f172a;">${inst.period}</td>
          <td style="padding:6px 10px;color:#475569;">${formatDate(inst.dueDate)}</td>
          <td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:600;">₹${fmt(inst.emiAmount)}</td>
          <td style="padding:6px 10px;text-align:right;font-family:monospace;color:${isDebited ? '#15803d' : '#64748b'};font-weight:700;">
            ${isDebited ? `₹${fmt(inst.paidAmount)}` : "₹0.00"}
          </td>
          <td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700;">₹${fmt(inst.balanceAfter)}</td>
          <td style="padding:6px 10px;text-align:center;">${statusBadge}</td>
          <td style="padding:6px 10px;color:#475569;font-size:10.5px;">${notes}</td>
        </tr>
      `;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Loan Statement - ${accountNo} - ${empName}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
    }
    .statement-box {
      max-width: 960px;
      margin: auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      padding: 28px 32px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
    }
    .org-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
      margin: 0;
    }
    .doc-subtitle {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .account-meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
      line-height: 1.6;
    }
    .account-badge {
      display: inline-block;
      font-family: monospace;
      font-weight: 700;
      font-size: 13px;
      background: #f1f5f9;
      color: #0f172a;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }

    .info-grid {
      display: flex;
      width: 100%;
      gap: 16px;
      margin-bottom: 22px;
    }
    .info-card {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #f8fafc;
      padding: 12px 14px;
    }
    .info-card h4 {
      margin: 0 0 10px 0;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #334155;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      line-height: 1.5;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-val {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }

    .kpi-strip {
      display: flex;
      background: #0f172a;
      color: #ffffff;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 22px;
      justify-content: space-between;
    }
    .kpi-item {
      text-align: center;
      flex: 1;
      border-right: 1px solid #334155;
    }
    .kpi-item:last-child {
      border-right: none;
    }
    .kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 16px;
      font-weight: 800;
      font-family: monospace;
    }

    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    .ledger-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 9px 10px;
      border-bottom: 2px solid #cbd5e1;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .footer-note {
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      color: #64748b;
      font-size: 10px;
      line-height: 1.6;
    }
    .footer-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 16px;
    }
    .seal-box {
      text-align: right;
      color: #334155;
      font-weight: 600;
    }

    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .statement-box {
        border: none;
        box-shadow: none;
        padding: 10px;
        max-width: 100%;
      }
      .noprint {
        display: none !important;
      }
    }

    .bar {
      position: fixed;
      top: 14px;
      right: 14px;
      z-index: 999;
      background: rgba(15, 23, 42, 0.9);
      padding: 6px 12px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      backdrop-filter: blur(4px);
    }
    .bar button {
      padding: 7px 16px;
      border-radius: 6px;
      border: none;
      background: #3b82f6;
      color: #ffffff;
      cursor: pointer;
      margin-left: 8px;
      font-size: 12px;
      font-weight: 700;
      transition: all 0.15s ease;
    }
    .bar button:hover {
      background: #2563eb;
    }
    .bar button.btn-close {
      background: #475569;
    }
    .bar button.btn-close:hover {
      background: #334155;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    function downloadPdf() {
      const element = document.querySelector('.statement-box');
      const opt = {
        margin: [8, 8, 8, 8],
        filename: 'Loan_Statement_${empCode}_${loan.type}_${accountNo}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
    }
  </script>
</head>
<body>
  <div class="bar noprint">
    <span style="color:#e2e8f0;font-weight:600;font-size:12px;margin-right:8px;">Loan Passbook</span>
    <button onclick="downloadPdf()">Download PDF Statement</button>
    <button onclick="window.print()">Print Passbook</button>
    <button onclick="window.close()" class="btn-close">Close</button>
  </div>

  <div class="statement-box">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align:top;">
          <h1 class="org-title">${orgName}</h1>
          <div class="doc-subtitle">Employee Loan Account Statement & Passbook</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">
            Official Amortization Schedule & Automated Payroll Recovery Ledger
          </div>
        </td>
        <td class="account-meta" style="vertical-align:top;">
          <div>Account No: <span class="account-badge">${accountNo}</span></div>
          <div style="margin-top:5px;">Statement Date: <strong>${nowFormatted}</strong></div>
          <div>Status: <strong style="color:${loan.status === 'Closed' ? '#15803d' : '#2563eb'};">${loan.status.toUpperCase()}</strong></div>
        </td>
      </tr>
    </table>

    <!-- Info Grid -->
    <div class="info-grid">
      <!-- Borrower Details -->
      <div class="info-card">
        <h4>Borrower Details</h4>
        <div class="info-row">
          <span class="info-label">Employee Name:</span>
          <span class="info-val">${empName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Employee Code:</span>
          <span class="info-val" style="font-family:monospace;">${empCode}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Department:</span>
          <span class="info-val">${deptName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Designation:</span>
          <span class="info-val">${desigTitle}</span>
        </div>
      </div>

      <!-- Loan Facility Particulars -->
      <div class="info-card">
        <h4>Facility Particulars</h4>
        <div class="info-row">
          <span class="info-label">Loan Type:</span>
          <span class="info-val">${loan.type}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Sanctioned Principal:</span>
          <span class="info-val" style="font-family:monospace;">₹${fmt(summary.principal)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Monthly EMI:</span>
          <span class="info-val" style="font-family:monospace;color:#2563eb;">₹${fmt(summary.emi)} / mo</span>
        </div>
        <div class="info-row">
          <span class="info-label">Total Tenure:</span>
          <span class="info-val">${summary.tenure} Months ${summary.moratoriumCount > 0 ? `(${summary.moratoriumCount} Moratorium)` : ''}</span>
        </div>
      </div>
    </div>

    <!-- KPI Strip -->
    <div class="kpi-strip">
      <div class="kpi-item">
        <div class="kpi-label">Sanctioned Amount</div>
        <div class="kpi-value">₹${fmt(summary.principal)}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">Total Amount Repaid</div>
        <div class="kpi-value" style="color:#4ade80;">₹${fmt(summary.totalPaid)}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">Instalments Progress</div>
        <div class="kpi-value" style="color:#38bdf8;">${summary.installmentsPaid} / ${summary.tenure} Paid</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">Current Outstanding Balance</div>
        <div class="kpi-value" style="color:#fbbf24;">₹${fmt(summary.outstanding)}</div>
      </div>
    </div>

    <!-- Ledger Table -->
    <table class="ledger-table">
      <thead>
        <tr>
          <th style="width:40px;text-align:center;">#</th>
          <th style="width:90px;text-align:left;">Cycle</th>
          <th style="width:100px;text-align:left;">Due Date</th>
          <th style="width:110px;text-align:right;">EMI Amount</th>
          <th style="width:110px;text-align:right;">Amount Paid</th>
          <th style="width:120px;text-align:right;">Closing Balance</th>
          <th style="width:130px;text-align:center;">Status</th>
          <th style="text-align:left;">Transaction Reference / Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- Footer Note -->
    <div class="footer-note">
      <div><strong>Important Notes & Disclosures:</strong></div>
      <div>1. This document is an official system-generated loan passbook statement issued by ${orgName}.</div>
      <div>2. All EMI installments are recovered automatically via direct payroll salary deduction under standard company lending guidelines.</div>
      <div>3. In case of any discrepancies or if you require tenure rescheduling, please contact Human Resources & Finance.</div>
      
      <div class="footer-flex">
        <div style="font-size:9.5px;color:#94a3b8;">
          System Timestamp: ${nowFormatted} • Powered by Antigravity HRMS Engine
        </div>
        <div class="seal-box">
          <div style="border-top:1px dashed #475569;width:180px;text-align:center;padding-top:4px;font-size:10px;">
            Authorized Finance Signatory
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1020,height=960");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
