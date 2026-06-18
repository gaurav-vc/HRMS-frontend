import { fmtINR, empName, type Employee } from "./mock-data";

export function openPayslipPdf(emp: Employee, period: string) {
  const monthly = Math.round(emp.ctc / 12);
  const basic = Math.round(monthly * 0.4);
  const hra = Math.round(basic * 0.5);
  const conv = 1600, med = 1250;
  const special = monthly - basic - hra - conv - med;
  const pf = Math.round(basic * 0.12);
  const pt = 200;
  const tds = Math.round(monthly * 0.08);
  const total = pf + pt + tds;
  const net = monthly - total;
  const mgr = empName(emp.managerId);

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Payslip ${emp.code} ${period}</title>
<style>
  *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
  body{margin:0;padding:32px;color:#0f172a;background:#fff;}
  .doc{max-width:760px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;}
  .hdr{padding:24px;background:linear-gradient(120deg,#1e3a8a,#3b82f6);color:#fff;display:flex;justify-content:space-between;align-items:flex-start;}
  .hdr h1{margin:0;font-size:20px;}
  .hdr .meta{font-size:12px;opacity:.85;margin-top:4px;}
  .hdr .right{text-align:right;font-size:13px;}
  .body{padding:24px;}
  .emp{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;padding:16px;background:#f8fafc;border-radius:8px;font-size:13px;margin-bottom:20px;}
  .emp div span{color:#64748b;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
  .col h3{margin:0 0 8px 0;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;}
  .row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px dashed #e2e8f0;}
  .row:last-child{border:0;}
  .row .l{color:#475569;}
  .tot{margin-top:10px;padding-top:8px;border-top:2px solid #cbd5e1;display:flex;justify-content:space-between;font-weight:600;}
  .tot.earn{color:#059669;} .tot.ded{color:#dc2626;}
  .net{margin-top:24px;padding:18px 24px;background:linear-gradient(120deg,#1e3a8a,#3b82f6);color:#fff;border-radius:8px;display:flex;justify-content:space-between;align-items:center;}
  .net .lbl{font-size:13px;text-transform:uppercase;letter-spacing:.08em;opacity:.85;}
  .net .amt{font-size:26px;font-weight:700;}
  .ftr{margin-top:24px;font-size:11px;color:#94a3b8;text-align:center;}
  @media print{ body{padding:0;} .doc{border:0;border-radius:0;} .noprint{display:none;}}
  .bar{position:fixed;top:12px;right:12px;}
  .bar button{padding:8px 14px;border-radius:6px;border:0;background:#1e3a8a;color:#fff;cursor:pointer;margin-left:6px;font-size:13px;}
  .bar button.s{background:#fff;color:#1e3a8a;border:1px solid #cbd5e1;}
</style></head><body>
<div class="bar noprint"><button class="s" onclick="window.close()">Close</button><button onclick="window.print()">Download / Print PDF</button></div>
<div class="doc">
  <div class="hdr">
    <div><h1>Acme Technologies Pvt Ltd</h1><div class="meta">42 Tech Park, Bengaluru 560001 • GSTIN 27AABCA1234A1Z5</div><div class="meta">Payslip for <b>${period}</b></div></div>
    <div class="right"><div style="font-weight:600;font-size:15px;">${emp.firstName} ${emp.lastName}</div><div style="opacity:.85;">${emp.code}</div></div>
  </div>
  <div class="body">
    <div class="emp">
      <div><span>Designation:</span> ${mgr === "—" ? "—" : "Reports to " + mgr}</div>
      <div><span>Bank:</span> ${emp.bankName} • ****${emp.bankAccount.slice(-4)}</div>
      <div><span>PAN:</span> ${emp.pan}</div>
      <div><span>UAN:</span> ${emp.uan}</div>
      <div><span>Date of Joining:</span> ${emp.doj}</div>
      <div><span>Pay Period:</span> ${period}</div>
    </div>
    <div class="grid">
      <div class="col"><h3>Earnings</h3>
        <div class="row"><span class="l">Basic</span><span>${fmtINR(basic)}</span></div>
        <div class="row"><span class="l">HRA</span><span>${fmtINR(hra)}</span></div>
        <div class="row"><span class="l">Conveyance</span><span>${fmtINR(conv)}</span></div>
        <div class="row"><span class="l">Medical</span><span>${fmtINR(med)}</span></div>
        <div class="row"><span class="l">Special Allowance</span><span>${fmtINR(special)}</span></div>
        <div class="tot earn"><span>Gross Earnings</span><span>${fmtINR(monthly)}</span></div>
      </div>
      <div class="col"><h3>Deductions</h3>
        <div class="row"><span class="l">PF (Employee)</span><span>${fmtINR(pf)}</span></div>
        <div class="row"><span class="l">Professional Tax</span><span>${fmtINR(pt)}</span></div>
        <div class="row"><span class="l">TDS</span><span>${fmtINR(tds)}</span></div>
        <div class="tot ded"><span>Total Deductions</span><span>${fmtINR(total)}</span></div>
      </div>
    </div>
    <div class="net"><span class="lbl">Net Pay</span><span class="amt">${fmtINR(net)}</span></div>
    <div class="ftr">This is a system-generated payslip and does not require a signature.</div>
  </div>
</div>
</body></html>`;
  const w = window.open("", "_blank", "width=860,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
