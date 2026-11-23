import{ai as c}from"./index-BNHf2_n3.js";import"./vendor-react-CycvGi9z.js";import"./vendor-firebase-Cfg4JUUg.js";import"./vendor-Bg_btqvK.js";import"./vendor-icons-e5R4nYzy.js";import"./vendor-canvas-5Cw11iw4.js";const l="ai_news_users_sheet_webhook_v2",o="ai_news_users_sheet_last_sync_v2";function g(){return typeof window>"u"?"":localStorage.getItem(l)||""}function N(t){typeof window>"u"||localStorage.setItem(l,t.trim())}function v(){if(typeof window>"u")return null;const t=localStorage.getItem(o);return t?Number(t):null}const A=`// =========================================================================
// AI News Maker App - Google Sheet Realtime Users Database Script
// =========================================================================
// 1. Google Sheet खोलें -> Extensions -> Apps Script
// 2. नीचे दिया गया कोड पेस्ट करें -> Save करें
// 3. Deploy -> New Deployment -> Web app चुनें
//    - Execute as: Me
//    - Who has access: Anyone (हर कोई)
// 4. प्राप्त Web App URL को AI News Maker के Admin Panel में दर्ज करें।

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // Set Sheet Name
    try {
      if (sheet.getName() !== "AI News Maker Users") {
        sheet.setName("AI News Maker Users");
      }
    } catch(err) {}

    // Initialize Headers if Sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "S.No",
        "Email / ID",
        "Full Name (नाम)",
        "Channel Name (चैनल)",
        "Mobile Number (मोबाइल)",
        "Username (यूज़रनेम)",
        "Current Package (सक्रिय प्लान)",
        "Status (स्थिति)",
        "Activation Date (दिनांक)",
        "Expiry Date (वैधता)",
        "Last Synced (अंतिम सिंक)"
      ]);
      sheet.getRange(1, 1, 1, 11)
        .setFontWeight("bold")
        .setBackground("#0f172a")
        .setFontColor("#ffffff");
    }

    var data = JSON.parse(e.postData.contents);
    var users = Array.isArray(data.users) ? data.users : (data.email ? [data] : []);

    if (users.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "No users to update" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var existingValues = sheet.getDataRange().getValues();
    var emailRowMap = {};
    for (var i = 1; i < existingValues.length; i++) {
      var email = String(existingValues[i][1]).toLowerCase().trim();
      if (email) emailRowMap[email] = i + 1;
    }

    for (var j = 0; j < users.length; j++) {
      var u = users[j];
      var uEmail = String(u.email || u.userId || '').toLowerCase().trim();
      if (!uEmail) continue;

      var rowData = [
        j + 1,
        u.email || u.userId || '',
        u.name || u.fullName || 'यूज़र',
        u.channelName || '',
        u.mobile || '',
        u.username || '',
        u.planName || u.tier || 'BASIC',
        u.status || 'Active',
        u.activatedAt ? new Date(u.activatedAt).toLocaleDateString("hi-IN") : '',
        u.expiresAt ? new Date(u.expiresAt).toLocaleDateString("hi-IN") : '30 दिन',
        new Date().toLocaleString("hi-IN")
      ];

      if (emailRowMap[uEmail]) {
        var targetRow = emailRowMap[uEmail];
        sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
        emailRowMap[uEmail] = sheet.getLastRow();
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, count: users.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;async function D(t){const a=t&&t.length>0?t:c();try{fetch("/api/admin/sync-users-sheet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({users:a})}).catch(()=>{})}catch{}const r=g();if(r&&r.startsWith("http"))try{return await fetch(r,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({users:a,timestamp:Date.now()})}),typeof window<"u"&&localStorage.setItem(o,String(Date.now())),{success:!0,count:a.length,message:`सफलतापूर्वक ${a.length} यूज़र्स डेटाबेस Google Sheet पर सिंक कर दिया गया!`}}catch(s){console.warn("Google Sheet Webhook sync error:",s)}return typeof window<"u"&&localStorage.setItem(o,String(Date.now())),{success:!0,count:a.length,message:`${a.length} यूज़र्स का डेटा लोकल डेटाबेस में अपडेट हो गया। (गूगल शीट के लिए Webhook URL दर्ज करें)`}}function b(t){const a=t&&t.length>0?t:c();if(a.length===0){alert("एक्सपोर्ट करने के लिए कोई यूज़र डेटा उपलब्ध नहीं है।");return}const r=["S.No","Email / ID","Full Name (नाम)","Channel Name (चैनल)","Mobile Number (मोबाइल)","Username (यूज़रनेम)","Current Package (सक्रिय प्लान)","Role (रोल)","Activated Date (दिनांक)","Expiry Date (वैधता)"],s=a.map((e,p)=>[p+1,`"${(e.email||e.userId||"").replace(/"/g,'""')}"`,`"${(e.name||"यूज़र").replace(/"/g,'""')}"`,`"${(e.channelName||"").replace(/"/g,'""')}"`,`"${(e.mobile||"").replace(/"/g,'""')}"`,`"${(e.username||"").replace(/"/g,'""')}"`,`"${(e.planName||e.tier||"BASIC").replace(/"/g,'""')}"`,`"${(e.role||"user").replace(/"/g,'""')}"`,`"${e.activatedAt?new Date(e.activatedAt).toLocaleDateString("hi-IN"):""}"`,`"${e.expiresAt?new Date(e.expiresAt).toLocaleDateString("hi-IN"):"30 दिन"}"`]),u="\uFEFF"+[r.join(","),...s.map(e=>e.join(","))].join(`
`),m=new Blob([u],{type:"text/csv;charset=utf-8;"}),i=URL.createObjectURL(m),n=document.createElement("a");n.href=i,n.download=`AI-News-Maker-Users-Database-${new Date().toISOString().slice(0,10)}.csv`,document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(i)}export{A as APPS_SCRIPT_TEMPLATE_CODE,b as exportUsersToCsv,v as getLastUsersSyncTime,g as getUsersSheetWebhookUrl,N as setUsersSheetWebhookUrl,D as syncUsersToGoogleSheet};
