import { fmtINR, empName, type Employee } from "./mock-data";

export function openPayslipPdf(emp: Employee | any, period: string) {
  const { gross, net, basic, hra, special, pf, pt, tds, ded, components = {}, actual_components = {} } = emp;

  const formatPeriodMonth = (periodStr: string): string => {
    if (!periodStr) return "";
    try {
      const parts = periodStr.split("-");
      if (parts.length < 2) return periodStr;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleString("en-US", { month: "long", year: "numeric" });
    } catch {
      return periodStr;
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

  const numberToWords = (num: number): string => {
    const val = Math.round(Number(num) || 0);
    if (val <= 0) return "Zero Rupee Only";

    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    const convertTwoDigits = (n: number): string => {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      const t = tens[Math.floor(n / 10)];
      const o = ones[n % 10];
      return o ? `${t} ${o}` : t;
    };

    const convertThreeDigits = (n: number): string => {
      const h = Math.floor(n / 100);
      const rem = n % 100;
      const hStr = h > 0 ? `${ones[h]} Hundred` : "";
      const remStr = convertTwoDigits(rem);
      if (hStr && remStr) return `${hStr} ${remStr}`;
      return hStr || remStr;
    };

    let remaining = val;
    const parts: string[] = [];

    // Crores
    const crore = Math.floor(remaining / 10000000);
    if (crore > 0) {
      parts.push(`${convertThreeDigits(crore)} Crore`);
      remaining %= 10000000;
    }

    // Lakhs
    const lakh = Math.floor(remaining / 100000);
    if (lakh > 0) {
      parts.push(`${convertTwoDigits(lakh)} Lakh`);
      remaining %= 100000;
    }

    // Thousands
    const thousand = Math.floor(remaining / 1000);
    if (thousand > 0) {
      parts.push(`${convertTwoDigits(thousand)} Thousand`);
      remaining %= 1000;
    }

    // Hundreds & units
    if (remaining > 0) {
      parts.push(convertThreeDigits(remaining));
    }

    return `${parts.join(" ")} Rupee Only`;
  };

  const isDeduction = (k: string) =>
    ["pf", "pt", "tds", "provident", "professional", "tax", "deduction", "esi", "loan", "advance"].some((d) =>
      k.toLowerCase().includes(d),
    );

  const standardEarnings = [
    { key: "basic", label: "Basic", aliases: ["basic"] },
    { key: "hra", label: "HRA", aliases: ["hra", "house rent"] },
    { key: "conveyance", label: "Conveyance Allowance", aliases: ["conveyance", "transport"] },
    { key: "cca", label: "CCA", aliases: ["cca", "city compensatory"] },
    { key: "special", label: "Special Allowance", aliases: ["special", "allowance"] },
    { key: "leave encashment", label: "Leave Encashment", aliases: ["leave encashment", "encashment"] },
  ];

  const findCompEntry = (aliases: string[]) => {
    for (const [k, v] of Object.entries(components)) {
      const lower = k.toLowerCase().trim();
      if (aliases.some((a) => lower === a || lower.includes(a))) {
        return { key: k, val: Number(v || 0) };
      }
    }
    return null;
  };

  const findActualComp = (targetKey: string, earnedVal: number) => {
    const found = Object.entries(actual_components).find(
      ([k]) => k.toLowerCase() === targetKey.toLowerCase() || k.toLowerCase().includes(targetKey.toLowerCase()),
    );
    if (found && Number(found[1]) > 0) return Number(found[1]);
    const daysPaid = Number(emp.daysPaid ?? 30);
    const totalDays = Number(emp.totalDays || 30) || 30;
    if (daysPaid > 0 && daysPaid < totalDays && earnedVal > 0) {
      return Math.round((earnedVal / daysPaid) * totalDays * 100) / 100;
    }
    return earnedVal;
  };

  const earningsList: { name: string; actual: number; earned: number }[] = [];
  const processedKeys = new Set<string>();

  standardEarnings.forEach((std) => {
    let earned = 0;
    const match = findCompEntry(std.aliases);
    if (match) {
      earned = match.val;
      processedKeys.add(match.key);
    } else if (std.key === "basic") {
      earned = Number(emp.basic || 0);
    } else if (std.key === "hra") {
      earned = Number(emp.hra || 0);
    } else if (std.key === "special") {
      earned = Number(emp.special || 0);
    }

    const actual = findActualComp(std.key, earned);
    earningsList.push({ name: std.label, actual, earned });

    Object.keys(components).forEach((k) => {
      const lower = k.toLowerCase().trim();
      if (std.aliases.some((a) => lower === a || lower.includes(a))) {
        processedKeys.add(k);
      }
    });
  });

  Object.entries(components).forEach(([k, v]) => {
    if (!isDeduction(k) && !processedKeys.has(k)) {
      processedKeys.add(k);
      const earned = Number(v || 0);
      const actual = findActualComp(k, earned);
      earningsList.push({ name: k, actual, earned });
    }
  });

  if (
    Number(emp.overtimePay || 0) > 0 &&
    !earningsList.some((e) => e.name.toLowerCase().includes("overtime") || e.name.toLowerCase().includes("ot"))
  ) {
    const otAmt = Number(emp.overtimePay);
    earningsList.push({ name: "Overtime Allowance", actual: otAmt, earned: otAmt });
  }

  const deductionsList: { name: string; amount: number | null }[] = [];
  const processedDedKeys = new Set<string>();

  const standardDeductions = [
    { key: "pf", label: "PF", aliases: ["pf", "provident", "epf"], directVal: emp.pf },
    { key: "pt", label: "Professional Tax", aliases: ["pt", "professional tax", "professional", "prof tax"], directVal: emp.pt },
    { key: "tds", label: "Income Tax (TDS)", aliases: ["tds", "income tax", "tax deducted"], directVal: emp.tds },
  ];

  standardDeductions.forEach((std) => {
    const match = findCompEntry(std.aliases);
    let amt: number | null = null;
    if (match && match.val > 0) {
      amt = match.val;
      processedDedKeys.add(match.key);
    } else if (Number(std.directVal) > 0) {
      amt = Number(std.directVal);
    } else if (std.key === "pf" && (emp.pf_applicable || !Object.keys(components).some(isDeduction))) {
      amt = Number(emp.pf) > 0 ? Number(emp.pf) : 1800;
    }

    Object.keys(components).forEach((k) => {
      const lower = k.toLowerCase().trim();
      if (std.aliases.some((a) => lower === a || lower.includes(a))) {
        processedDedKeys.add(k);
      }
    });

    if (amt !== null && amt > 0) {
      deductionsList.push({ name: std.label, amount: amt });
    }
  });

  Object.entries(components).forEach(([k, v]) => {
    if (isDeduction(k) && !processedDedKeys.has(k) && Number(v) > 0) {
      processedDedKeys.add(k);
      deductionsList.push({ name: k, amount: Number(v) });
    }
  });

  const maxRows = Math.max(earningsList.length, deductionsList.length, 6);
  while (earningsList.length < maxRows) {
    earningsList.push({ name: "", actual: 0, earned: 0 });
  }
  while (deductionsList.length < maxRows) {
    deductionsList.push({ name: "", amount: null });
  }

  const totalActual = earningsList.reduce((sum, r) => sum + (r.name ? r.actual : 0), 0);
  const totalEarned = earningsList.reduce((sum, r) => sum + (r.name ? r.earned : 0), 0) || Number(emp.gross || 0);
  const totalDeductions = deductionsList.reduce((sum, r) => sum + (r.amount || 0), 0) || Number(emp.ded || 0);
  const netPay = Number(emp.net || (totalEarned - totalDeductions));

  const entityTitle = emp.entityName || emp.companyName || "LOTUS DEVELOPERS";

  const earningsRowsHtml = earningsList.map(r => `
    <tr style="height:22px;">
      <td style="padding:4px 10px;border-bottom:none;">${r.name}</td>
      <td style="padding:4px 10px;text-align:right;border-bottom:none;font-family:monospace;">${r.name ? fmt(r.actual) : ''}</td>
      <td style="padding:4px 10px;text-align:right;border-bottom:none;font-family:monospace;">${r.name ? fmt(r.earned) : ''}</td>
    </tr>
  `).join("");

  const deductionsRowsHtml = deductionsList.map(r => `
    <tr style="height:22px;">
      <td style="padding:4px 10px;border-bottom:none;">${r.name}</td>
      <td style="padding:4px 10px;text-align:right;border-bottom:none;font-family:monospace;">${r.name && r.amount !== null ? fmt(r.amount) : ''}</td>
    </tr>
  `).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Payslip ${emp.code} ${period}</title>
<style>
  *{box-sizing:border-box;}
  body{margin:0;padding:24px;color:#000;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:11px;}
  .payslip-box{max-width:850px;margin:auto;border:1px solid #000;}
  .header-container{text-align:center;padding:12px 10px 8px 10px;}
  .entity-title{font-size:18px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0;}
  .period-subtitle{font-size:12px;font-weight:normal;margin-top:4px;}
  
  .meta-table{width:100%;border-collapse:collapse;border-top:1px solid #000;border-bottom:1px solid #000;}
  .meta-col{width:50%;vertical-align:top;padding:10px 12px;}
  .meta-row{display:flex;margin-bottom:4px;line-height:1.5;}
  .meta-label{width:145px;color:#000;}
  .meta-val{font-weight:bold;color:#000;}
  
  .table-container{display:flex;width:100%;border-bottom:1px solid #000;}
  .earn-side{width:50%;border-right:1px solid #000;}
  .ded-side{width:50%;}
  .inner-table{width:100%;border-collapse:collapse;}
  .inner-table th{border-bottom:1px solid #000;padding:6px 10px;font-size:11px;font-weight:bold;}
  .total-row{border-top:1px solid #000;font-weight:bold;}
  
  .net-box{padding:10px 12px;border-bottom:1px solid #000;}
  .net-flex{display:flex;justify-content:space-between;align-items:center;}
  .remarks-box{padding:10px 12px;min-height:44px;border-bottom:1px solid #000;}
  .footer-text{text-align:center;padding:10px;font-size:10px;color:#333;}
  
  @media print{ body{padding:0;} .noprint{display:none;} }
  .bar{position:fixed;top:12px;right:12px;z-index:999;}
  .bar button{padding:8px 16px;border-radius:4px;border:1px solid #333;background:#0f172a;color:#fff;cursor:pointer;margin-left:6px;font-size:12px;font-weight:600;}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
  function downloadPdf() {
    const element = document.querySelector('.payslip-box');
    const opt = {
      margin: 8,
      filename: 'Payslip_${emp.code}_${period}.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }
</script>
</head><body>
<div class="bar noprint">
  <button onclick="window.print()">Print</button>
  <button onclick="downloadPdf()">Download PDF</button>
  <button onclick="window.close()" style="background:#555;">Close</button>
</div>

<div class="payslip-box">
  <div class="header-container">
    <h1 class="entity-title">${entityTitle}</h1>
    <div class="period-subtitle">Payslip for the month of ${formatPeriodMonth(period)}</div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="meta-col" style="border-right:1px solid #000;">
        <div class="meta-row"><span class="meta-label">Name :</span><span class="meta-val">${emp.firstName} ${emp.lastName}</span></div>
        <div class="meta-row"><span class="meta-label">EmpCode :</span><span class="meta-val">${emp.code || 'N/A'}</span></div>
        <div class="meta-row"><span class="meta-label">DOJ :</span><span>${formatDate(emp.doj)}</span></div>
        <div class="meta-row"><span class="meta-label">Department :</span><span>${emp.department || 'Department'}</span></div>
        <div class="meta-row"><span class="meta-label">Designation :</span><span>${emp.designation || 'Designation'}</span></div>
        <div class="meta-row"><span class="meta-label">No. of. Workingdays :</span><span>${emp.totalDays || 30}</span></div>
        <div class="meta-row"><span class="meta-label">Holidays :</span><span>${fmt(emp.holidays || emp.daysOff || 0)}</span></div>
        <div class="meta-row"><span class="meta-label">No. of. Days Paid :</span><span>${fmt(emp.daysPaid ?? 30)}</span></div>
      </td>
      <td class="meta-col">
        <div class="meta-row"><span class="meta-label">Location :</span><span>${emp.location || emp.entityName || 'Bangalore'}</span></div>
        <div class="meta-row"><span class="meta-label">Bank Name :</span><span>${emp.bankName || 'N/A'}</span></div>
        <div class="meta-row"><span class="meta-label">Bank Account No. :</span><span>${emp.bankAccount || 'N/A'}</span></div>
        <div class="meta-row"><span class="meta-label">LOP Days :</span><span>${fmt(emp.lopDays || 0)}</span></div>
        <div class="meta-row"><span class="meta-label">PAN NO :</span><span>${emp.pan || 'N/A'}</span></div>
        <div class="meta-row"><span class="meta-label">Extra days (OT Days) :</span><span>${fmt(emp.extraDays ?? (Number(emp.overtimeHours || emp.ot || 0) / 8))}</span></div>
      </td>
    </tr>
  </table>

  <div class="table-container">
    <div class="earn-side">
      <table class="inner-table">
        <thead>
          <tr>
            <th style="text-align:left;">Earnings</th>
            <th style="text-align:right;width:85px;">Actual</th>
            <th style="text-align:right;width:85px;">Earned</th>
          </tr>
        </thead>
        <tbody>
          ${earningsRowsHtml}
          <tr class="total-row">
            <td style="padding:6px 10px;">Total Earnings:</td>
            <td style="padding:6px 10px;text-align:right;font-family:monospace;">${fmt(totalActual)}</td>
            <td style="padding:6px 10px;text-align:right;font-family:monospace;">${fmt(totalEarned)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="ded-side">
      <table class="inner-table">
        <thead>
          <tr>
            <th style="text-align:left;">Deductions</th>
            <th style="text-align:right;width:95px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${deductionsRowsHtml}
          <tr class="total-row">
            <td style="padding:6px 10px;">Total Deductions:</td>
            <td style="padding:6px 10px;text-align:right;font-family:monospace;">${fmt(totalDeductions)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="net-box">
    <div class="net-flex">
      <span>Net Pay for the month ( Total Earnings - Total Deductions) :</span>
      <span style="font-weight:bold;font-family:monospace;font-size:12px;">${fmt(netPay)}</span>
    </div>
    <div style="margin-top:4px;font-weight:500;">
      ${numberToWords(netPay)}
    </div>
  </div>

  <div class="remarks-box">
    <b>Remarks :</b> <span style="margin-left:4px;">${emp.remarks || ''}</span>
  </div>

  <div class="footer-text">
    This is a system generated payslip and does not require signature
  </div>
</div>
</body></html>`;

  const w = window.open("", "_blank", "width=890,height=920");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
