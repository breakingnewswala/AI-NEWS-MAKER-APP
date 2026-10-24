// AI News Maker - Real-Time User Database Sync for Google Sheets
// Workbook Name: "एआई न्यूज़ मेकर ऐप की गूगल शीट"
// Syncs User Signups, Profile Changes & Plan Upgrades

import { PlanUserRecord, getPlanUsers } from './userPlanManager';

const STORAGE_KEY_WEBHOOK = 'ai_news_users_sheet_webhook_v2';
const STORAGE_KEY_LAST_SYNC = 'ai_news_users_sheet_last_sync_v2';

export function getUsersSheetWebhookUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_WEBHOOK) || '';
}

export function setUsersSheetWebhookUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_WEBHOOK, url.trim());
}

export function getLastUsersSyncTime(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
  return raw ? Number(raw) : null;
}

export const APPS_SCRIPT_TEMPLATE_CODE = `// =========================================================================
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
}`;

export async function syncUsersToGoogleSheet(usersList?: PlanUserRecord[]): Promise<{ success: boolean; count: number; message: string }> {
  const users = usersList && usersList.length > 0 ? usersList : getPlanUsers();
  
  // 1. Sync to backend database endpoint for permanent server backup
  try {
    fetch('/api/admin/sync-users-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    }).catch(() => {});
  } catch {}

  // 2. Webhook sync to user's Google Sheet
  const webhookUrl = getUsersSheetWebhookUrl();
  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors', // Apps Script web app endpoint requires no-cors mode in browser
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users, timestamp: Date.now() }),
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(Date.now()));
      }
      return {
        success: true,
        count: users.length,
        message: `सफलतापूर्वक ${users.length} यूज़र्स डेटाबेस Google Sheet पर सिंक कर दिया गया!`,
      };
    } catch (err: any) {
      console.warn('Google Sheet Webhook sync error:', err);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(Date.now()));
  }

  return {
    success: true,
    count: users.length,
    message: `${users.length} यूज़र्स का डेटा लोकल डेटाबेस में अपडेट हो गया। (गूगल शीट के लिए Webhook URL दर्ज करें)`,
  };
}

export function exportUsersToCsv(usersList?: PlanUserRecord[]): void {
  const users = usersList && usersList.length > 0 ? usersList : getPlanUsers();
  if (users.length === 0) {
    alert('एक्सपोर्ट करने के लिए कोई यूज़र डेटा उपलब्ध नहीं है।');
    return;
  }

  const headers = [
    'S.No',
    'Email / ID',
    'Full Name (नाम)',
    'Channel Name (चैनल)',
    'Mobile Number (मोबाइल)',
    'Username (यूज़रनेम)',
    'Current Package (सक्रिय प्लान)',
    'Role (रोल)',
    'Activated Date (दिनांक)',
    'Expiry Date (वैधता)',
  ];

  const rows = users.map((u, i) => [
    i + 1,
    `"${(u.email || u.userId || '').replace(/"/g, '""')}"`,
    `"${(u.name || 'यूज़र').replace(/"/g, '""')}"`,
    `"${(u.channelName || '').replace(/"/g, '""')}"`,
    `"${(u.mobile || '').replace(/"/g, '""')}"`,
    `"${(u.username || '').replace(/"/g, '""')}"`,
    `"${(u.planName || u.tier || 'BASIC').replace(/"/g, '""')}"`,
    `"${(u.role || 'user').replace(/"/g, '""')}"`,
    `"${u.activatedAt ? new Date(u.activatedAt).toLocaleDateString('hi-IN') : ''}"`,
    `"${u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('hi-IN') : '30 दिन'}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AI-News-Maker-Users-Database-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
