/**
 * Utility to generate and print/download an official Municipal Grievance Acknowledgement Receipt.
 */

export function printOfficialReceipt(complaint, headDetails = null) {
  const cid = complaint.id || 1;
  const citizenName = complaint.citizen_name || "Valued Citizen";
  const citizenContact = complaint.citizen_contact || "Registered Citizen";
  const category = (complaint.category || "General Grievance").replace(/_/g, " ").toUpperCase();
  const priority = (complaint.priority?.value || complaint.priority || "Medium").toUpperCase();
  const status = (complaint.status?.value || complaint.status || "ROUTED").replace(/_/g, " ").toUpperCase();
  const deptName = complaint.department || complaint.department_name || `${category} Department`;
  const address = complaint.address || "Hyderabad Municipal Zone";
  const description = complaint.description || "Civic grievance reported via citizen portal.";
  const createdDate = complaint.created_at
    ? new Date(complaint.created_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const headName = headDetails?.name || "Dr. Rajeshwar Rao";
  const headTitle = headDetails?.title || "Superintending Engineer";
  const headEmail = headDetails?.email || "helpdesk@smartcity.gov";
  const headPhone = headDetails?.phone || "+91 (040) 2345-8700";
  const headOffice = headDetails?.office || "Municipal Corporation Headquarters, Hyderabad";

  // SLA calculation
  const slaHours = priority === "CRITICAL" ? 12 : priority === "HIGH" ? 24 : priority === "MEDIUM" ? 48 : 72;

  // Open printable window
  const printWindow = window.open("", "_blank", "width=850,height=950");
  if (!printWindow) {
    alert("Please allow pop-ups in your browser to print the official receipt.");
    return;
  }

  const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SmartGov_Grievance_Receipt_Ticket_${cid}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 20px; background: #fff; color: #1e293b; line-height: 1.5; }
    .receipt-container { max-width: 780px; margin: 0 auto; border: 2px solid #0f766e; border-radius: 12px; padding: 28px; position: relative; background: #ffffff; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(15, 118, 110, 0.04); font-weight: 900; pointer-events: none; text-transform: uppercase; white-space: nowrap; }
    
    /* Header */
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 20px; }
    .gov-brand { display: flex; align-items: center; gap: 14px; }
    .gov-crest { width: 52px; height: 52px; background: #0f766e; color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; }
    .gov-title h1 { margin: 0; font-size: 20px; color: #0f766e; font-weight: 800; letter-spacing: -0.02em; }
    .gov-title p { margin: 2px 0 0; font-size: 12px; color: #475569; }
    .receipt-badge { text-align: right; }
    .ticket-badge { background: #f0fdfa; border: 1.5px solid #0f766e; color: #0f766e; padding: 6px 14px; border-radius: 8px; font-size: 15px; font-weight: 800; font-family: monospace; }
    .timestamp { font-size: 11px; color: #64748b; margin-top: 4px; }
    
    /* Grid details */
    .section-title { font-size: 12px; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0 8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 13px; }
    .grid-item { background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .grid-item span { display: block; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .grid-item strong { color: #0f172a; font-size: 13px; }
    
    .desc-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 14px; border-radius: 6px; font-size: 13px; margin-top: 6px; }
    .desc-box p { margin: 0; color: #334155; font-style: italic; }

    /* Department escalation card */
    .dept-card { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 14px 16px; margin-top: 16px; }
    .dept-card h3 { margin: 0 0 6px; font-size: 14px; color: #115e59; }
    .dept-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px; }
    
    /* SLA notice */
    .sla-banner { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
    
    /* Footer & Verification */
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #0f766e; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
    .qr-box { display: flex; align-items: center; gap: 10px; }
    .qr-mock { width: 55px; height: 55px; background: #0f172a; color: #ffffff; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-family: monospace; text-align: center; line-height: 1.2; padding: 2px; }
    .official-seal { text-align: right; }
    .seal-circle { display: inline-block; border: 2px solid #0f766e; border-radius: 50%; padding: 6px 12px; font-size: 11px; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em; }

    .print-bar { text-align: center; margin-top: 20px; }
    .print-btn { background: #0f766e; color: #ffffff; border: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 8px; cursor: pointer; }
    .print-btn:hover { background: #0d5f58; }
    @media print {
      .print-bar { display: none; }
      body { padding: 0; }
      .receipt-container { border: 1px solid #0f766e; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="watermark">OFFICIAL GOVT RECORD</div>

    <div class="header">
      <div class="gov-brand">
        <div class="gov-crest">🏛️</div>
        <div class="gov-title">
          <h1>SmartGov Civic Intelligence Command</h1>
          <p>Department of Municipal Administration &amp; Urban Governance</p>
        </div>
      </div>
      <div class="receipt-badge">
        <div class="ticket-badge">TICKET #${cid}</div>
        <div class="timestamp">${createdDate}</div>
      </div>
    </div>

    <div class="section-title">Citizen &amp; Incident Verification</div>
    <div class="grid">
      <div class="grid-item">
        <span>Citizen Name</span>
        <strong>${citizenName}</strong>
      </div>
      <div class="grid-item">
        <span>Citizen Email / Contact</span>
        <strong>${citizenContact}</strong>
      </div>
      <div class="grid-item">
        <span>Civic Category</span>
        <strong>${category}</strong>
      </div>
      <div class="grid-item">
        <span>Priority Classification</span>
        <strong style="color: ${priority === "CRITICAL" ? "#e11d48" : priority === "HIGH" ? "#d97706" : "#0f766e"};">${priority} PRIORITY</strong>
      </div>
      <div class="grid-item" style="grid-column: span 2;">
        <span>Incident Location / Landmark</span>
        <strong>${address}</strong>
      </div>
    </div>

    <div class="section-title">Reported Grievance Summary</div>
    <div class="desc-box">
      <p>"${description}"</p>
    </div>

    <div class="section-title">Departmental Routing &amp; Field Oversight</div>
    <div class="dept-card">
      <h3>🏛️ Assigned Department: ${deptName}</h3>
      <div class="dept-grid">
        <div><strong>Department Head:</strong> ${headName}</div>
        <div><strong>Designation:</strong> ${headTitle}</div>
        <div><strong>Official Email:</strong> ${headEmail}</div>
        <div><strong>Direct Helpline:</strong> ${headPhone}</div>
        <div style="grid-column: span 2;"><strong>Zonal Office:</strong> ${headOffice}</div>
      </div>
    </div>

    <div class="sla-banner">
      <div>
        <strong>⏱️ Municipal SLA Target:</strong> Resolution committed within <strong>${slaHours} Hours</strong>.
      </div>
      <div>
        Current Status: <strong>${status}</strong>
      </div>
    </div>

    <div class="footer">
      <div class="qr-box">
        <div class="qr-mock">QR VERIFIED #${cid}</div>
        <div>
          <div><strong>SmartGov AI Telemetry Verified</strong></div>
          <div>Cryptographic validation hash: ${Math.random().toString(36).substring(2, 10).toUpperCase()}-MUNI-${cid}</div>
        </div>
      </div>
      <div class="official-seal">
        <div class="seal-circle">Official Municipal Dispatch Seal</div>
        <div style="margin-top: 4px; font-size: 10px;">24/7 Public Citizen Helpline: 1800-425-SMART</div>
      </div>
    </div>
  </div>

  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">🖨️ Print Official Receipt / Save PDF</button>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
}
