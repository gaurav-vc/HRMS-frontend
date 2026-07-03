import { fmtINR, empName, type Employee } from "./mock-data";

export function openPayslipPdf(emp: Employee | any, period: string) {
  const { gross, net, basic, hra, special, pf, pt, tds, ded } = emp;
  const ctc = emp.ctc || 0;
  
  // Safe string variables
  const bAcct = emp.bankAccount ? emp.bankAccount.slice(-4) : '0000';
  const bName = emp.bankName || 'N/A';
  
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Payslip ${emp.code} ${period}</title>
<style>
  *{box-sizing:border-box;font-family:Arial,sans-serif;}
  body{margin:0;padding:40px;color:#333;background:#fff;}
  .container{max-width:800px;margin:auto;}
  h1{margin:0 0 10px 0;font-size:24px;text-transform:uppercase;}
  h2{margin:0 0 20px 0;font-size:16px;font-weight:normal;text-transform:uppercase;}
  
  table{width:100%;border-collapse:collapse;margin-bottom:30px;font-size:13px;}
  th,td{border:1px solid #ddd;padding:10px 12px;text-align:left;}
  
  .details-table th{background-color:#20B2aa;color:#fff;font-weight:600;}
  .details-table td{color:#444;}
  
  .fin-table th{background-color:#e0e0e0;color:#555;font-weight:bold;text-transform:uppercase;}
  .fin-table td{color:#333;}
  
  .net-row td{font-weight:bold;font-size:14px;background-color:#f9f9f9;}
  
  @media print{ body{padding:0;} .noprint{display:none;}}
  .bar{position:fixed;top:12px;right:12px;}
  .bar button{padding:8px 14px;border-radius:6px;border:0;background:#1e3a8a;color:#fff;cursor:pointer;margin-left:6px;font-size:13px;}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
  function downloadPdf() {
    const element = document.querySelector('.container');
    const opt = {
      margin: 10,
      filename: 'Payslip_${emp.code}_${period}.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }
</script>
</head><body>
<div class="bar noprint"><button onclick="window.close()">Close</button><button onclick="downloadPdf()">Download PDF</button></div>
<div class="container">
  <h1>PeoplePulse</h1>
  <h2>PAYSLIP FOR ${period}</h2>
  
  <table class="details-table">
    <thead>
      <tr>
        <th width="25%">Field</th><th width="25%">Details</th>
        <th width="25%">Field</th><th width="25%">Details</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Employee Name</td><td>${emp.firstName} ${emp.lastName}</td>
        <td>Employee Code</td><td>${emp.code}</td>
      </tr>
      <tr>
        <td>Employee ID</td><td>${emp.id}</td>
        <td>Month</td><td>${period}</td>
      </tr>
      <tr>
        <td>Department</td><td>${emp.department || 'IT'}</td>
        <td>Status</td><td>Completed</td>
      </tr>
      <tr>
        <td>CTC</td><td>Rs. ${ctc.toFixed(2)}</td>
        <td>Payable Days</td><td>31</td>
      </tr>
      <tr>
        <td>Non Payable Days</td><td>0</td>
        <td>Total Days</td><td>31</td>
      </tr>
      <tr>
        <td>PF No</td><td>N/A</td>
        <td>ESI No</td><td>N/A</td>
      </tr>
      <tr>
        <td>UAN</td><td>${emp.uan || 'N/A'}</td>
        <td>PAN</td><td>${emp.pan || 'N/A'}</td>
      </tr>
      <tr>
        <td>PRAN No</td><td>N/A</td>
        <td>Bank A/C No / Name</td><td>${bAcct} / ${bName}</td>
      </tr>
    </tbody>
  </table>

  <table class="fin-table">
    <thead>
      <tr><th>Earnings</th><th>Amount</th></tr>
    </thead>
    <tbody>
      <tr><td>Basic Pay</td><td>Rs. ${(basic||0).toFixed(2)}</td></tr>
      <tr><td>HRA</td><td>Rs. ${(hra||0).toFixed(2)}</td></tr>
      <tr><td>Allowance</td><td>Rs. ${(special||0).toFixed(2)}</td></tr>
      <tr><td>Current Month SP</td><td>Rs. 0.00</td></tr>
      <tr><td>Conveyance</td><td>Rs. 0.00</td></tr>
    </tbody>
  </table>

  <table class="fin-table">
    <thead>
      <tr><th>Deductions</th><th>Amount</th></tr>
    </thead>
    <tbody>
      <tr><td>PF</td><td>Rs. ${(pf||0).toFixed(2)}</td></tr>
      <tr><td>Tax</td><td>Rs. ${(tds||0).toFixed(2)}</td></tr>
      <tr><td>Other Deductions</td><td>Rs. 0.00</td></tr>
    </tbody>
  </table>
  
  <table class="fin-table" style="margin-top:-31px;">
    <tbody>
      <tr class="net-row"><td width="50%">Net Salary</td><td width="50%">Rs. ${(net||0).toFixed(2)}</td></tr>
    </tbody>
  </table>
</div>
</body></html>`;
  const w = window.open("", "_blank", "width=860,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
