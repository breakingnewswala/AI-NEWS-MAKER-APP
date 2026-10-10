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
