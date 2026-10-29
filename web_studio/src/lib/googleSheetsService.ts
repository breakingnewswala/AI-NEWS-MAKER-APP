/**
 * Google Sheets & Drive API Integration for AI News Maker
 * Supports reading news spreadsheets, exporting news feeds to Sheets, and searching Sheets in Drive.
 */

import { auth } from './firebaseConfig';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initialize Auth State listener and cache access token in memory
 */
export const initSheetsAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Perform Google Sign In with requested Google Sheets & Drive scopes
 */
export const googleSignInSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    GOOGLE_SHEETS_SCOPES.forEach((scope) => provider.addScope(scope));

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sheets Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getSheetsAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutSheets = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface SheetNewsItem {
  id?: string;
  title: string;
  summary: string;
  category?: string;
  categoryName?: string;
  sourceChannel?: string;
  sourceUrl?: string;
  publishedTime?: string;
  imageUrl?: string;
  breaking?: boolean;
  district?: string;
  location?: string;
  fullContent?: string;
}

/**
 * Search user's Google Drive for existing spreadsheets
 */
export async function searchSpreadsheetsInDrive(accessToken: string): Promise<Array<{ id: string; name: string; webViewLink?: string }>> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=20`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {

    const errText = await response.text();
    throw new Error(`Google Drive API Search Failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Create a new Google Spreadsheet for AI News Maker news database
 */
export async function createNewsSpreadsheet(accessToken: string, title = 'AI News Maker - Live Newsroom Database'): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const body = {
    properties: { title },
    sheets: [
      {
        properties: { title: 'News Database' },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: 'ID' } },
                  { userEnteredValue: { stringValue: 'Title / Headline' } },
                  { userEnteredValue: { stringValue: 'Summary' } },
                  { userEnteredValue: { stringValue: 'Category' } },
                  { userEnteredValue: { stringValue: 'Source Channel' } },
                  { userEnteredValue: { stringValue: 'District / Location' } },
                  { userEnteredValue: { stringValue: 'Published Date' } },
                  { userEnteredValue: { stringValue: 'Image URL' } },
                  { userEnteredValue: { stringValue: 'Full Content' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Sheets API Create Failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

/**
 * Export news posts array to a Google Sheet
 */
export async function exportPostsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  newsPosts: SheetNewsItem[]
): Promise<boolean> {
  const range = 'News Database!A2:I';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const values = newsPosts.map((post) => [
    post.id || `post-${Date.now()}`,
    post.title || '',
    post.summary || '',
    post.categoryName || post.category || 'ताज़ा समाचार',
    post.sourceChannel || 'AI News Maker',
    post.district || post.location || 'सेंट्रल डेस्क',
    post.publishedTime || new Date().toLocaleString('hi-IN'),
    post.imageUrl || '',
    post.fullContent || post.summary || '',
  ]);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Sheets Export Failed: ${response.status} ${errText}`);
  }

  return true;
}

/**
 * Read news records from a Google Sheet
 */
export async function readPostsFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<SheetNewsItem[]> {
  const range = 'A2:I500';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Sheets Read Failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];

  return rows
    .filter((row) => row.length > 1 && row[1]?.trim())
    .map((row, index) => ({
      id: row[0]?.trim() || `sheet-post-${Date.now()}-${index}`,
      title: row[1]?.trim() || 'समाचार हेडलाइन',
      summary: row[2]?.trim() || '',
      categoryName: row[3]?.trim() || 'गूगल शीट्स',
      category: 'sheets',
      sourceChannel: row[4]?.trim() || 'Google Sheets Sync',
      district: row[5]?.trim() || '',
      location: row[5]?.trim() || '',
      publishedTime: row[6]?.trim() || 'अभी-अभी (Sheets)',
      imageUrl: row[7]?.trim() || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80',
      fullContent: row[8]?.trim() || row[2]?.trim() || row[1]?.trim() || '',
      breaking: true,
    }));
}

/**
 * Extract Spreadsheet ID from Google Sheet URL or return raw ID
 */
export function extractSpreadsheetId(urlOrId: string): string {
  if (!urlOrId) return '';
  const clean = urlOrId.trim();
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(clean)) return clean;
  return clean;
}

/**
 * Fetch Google Sheet data directly using Google Visualization API
 * Works reliably with ANY Google Sheet shared with "Anyone with link" WITHOUT requiring OAuth popup!
 */
export async function fetchGoogleSheetDirectly(urlOrId: string): Promise<SheetNewsItem[]> {
  const sheetId = extractSpreadsheetId(urlOrId);
  if (!sheetId) throw new Error('कृपया वैध Google Sheet URL या ID दर्ज करें');

  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const response = await fetch(gvizUrl);
  if (!response.ok) {
    throw new Error(`Google Sheet लोड करने में समस्या (${response.status})। कृपया सुनिश्चित करें कि शीट "Anyone with link can view" पर सेट है।`);
  }

  const text = await response.text();
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
  if (!jsonMatch || !jsonMatch[1]) {
    throw new Error('Google Sheet का डेटा पार्स नहीं हो सका। कृपया लिंक की जांच करें।');
  }

  const data = JSON.parse(jsonMatch[1]);
  const table = data.table;
  if (!table || !Array.isArray(table.rows)) {
    return [];
  }

  const items: SheetNewsItem[] = [];
  table.rows.forEach((rowObj: any, index: number) => {
    const c = rowObj.c || [];
    const val = (idx: number) => (c[idx] && c[idx].v !== null && c[idx].v !== undefined ? String(c[idx].v).trim() : '');

    const col0 = val(0);
    const col1 = val(1);
    if (index === 0 && (col0.toLowerCase() === 'id' || col1.toLowerCase().includes('title') || col1.toLowerCase().includes('headline'))) {
      return;
    }

    const title = col1 || col0;
    if (!title) return;

    items.push({
      id: col0 || `sheet-${Date.now()}-${index}`,
      title,
      summary: val(2) || title,
      categoryName: val(3) || 'गूगल शीट्स',
      category: 'sheets',
      sourceChannel: val(4) || 'Google Sheet Live',
      district: val(5) || '',
      location: val(5) || '',
      publishedTime: val(6) || 'अभी-अभी (Sheets)',
      imageUrl: val(7) || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80',
      fullContent: val(8) || val(2) || title,
      breaking: true,
    });
  });

  return items;
}
