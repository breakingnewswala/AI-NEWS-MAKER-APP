import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  Download,
  Upload,
  Plus,
  Search,
  ExternalLink,
  Check,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Link as LinkIcon,
  Globe,
  Database,
} from 'lucide-react';
import {
  googleSignInSheets,
  logoutSheets,
  getSheetsAccessToken,
  initSheetsAuth,
  searchSpreadsheetsInDrive,
  createNewsSpreadsheet,
  exportPostsToGoogleSheet,
  readPostsFromGoogleSheet,
  fetchGoogleSheetDirectly,
  SheetNewsItem,
} from '../lib/googleSheetsService';
import { User } from 'firebase/auth';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPosts?: SheetNewsItem[];
  onImportPosts?: (importedPosts: SheetNewsItem[]) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  currentPosts = [],
  onImportPosts,
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'oauth' | 'export'>('direct');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getSheetsAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Direct Sheet URL state
  const [directSheetUrl, setDirectSheetUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('ai_news_admin_sheet_url') || '';
    } catch {
      return '';
    }
  });

  // Sheets list state for OAuth
  const [spreadsheets, setSpreadsheets] = useState<Array<{ id: string; name: string; webViewLink?: string }>>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');

  // Status & Confirmation state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = initSheetsAuth(
      (user, tok) => {
        setCurrentUser(user);
        setToken(tok);
        if (tok) loadDriveSheets(tok);
      },
      () => {
        setCurrentUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadDriveSheets = async (accessToken: string) => {
    setIsLoadingSheets(true);
    setAuthError(null);
    try {
      const files = await searchSpreadsheetsInDrive(accessToken);
      setSpreadsheets(files);
      if (files.length > 0 && !selectedSheetId) {
        setSelectedSheetId(files[0].id);
      }
    } catch (err: any) {
      setAuthError(err.message || 'गूगल ड्राइव से शीट्स लोड करने में विफल');
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignInSheets();
      if (res) {
        setCurrentUser(res.user);
        setToken(res.accessToken);
        await loadDriveSheets(res.accessToken);
        setStatusMessage({ type: 'success', text: 'गूगल अकाउंट सफलतापूर्वक कनेक्ट हो गया!' });
      }
    } catch (err: any) {
      setAuthError(err.message || 'गूगल साइन इन विफल रहा');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await logoutSheets();
    setCurrentUser(null);
    setToken(null);
    setSpreadsheets([]);
    setSelectedSheetId('');
    setStatusMessage({ type: 'info', text: 'लॉगआउट कर दिया गया' });
  };

  // Direct Sync Handler (Fastest, works 100% reliably with link-shared sheets)
  const handleDirectSync = async () => {
    if (!directSheetUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'कृपया एक Google Sheet URL या ID दर्ज करें' });
      return;
    }
    setIsImporting(true);
    setStatusMessage(null);
    try {
      const items = await fetchGoogleSheetDirectly(directSheetUrl.trim());
      if (items.length === 0) {
        setStatusMessage({ type: 'info', text: 'Google Sheet में कोई समाचार रिकॉर्ड नहीं मिला' });
      } else {
        try {
          localStorage.setItem('ai_news_admin_sheet_url', directSheetUrl.trim());
        } catch {}
        if (onImportPosts) {
          onImportPosts(items);
        }
        setStatusMessage({
          type: 'success',
          text: `सफलतापूर्वक Google Sheet से ${items.length} समाचार फ़ीड में सिंक हो गए!`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Google Sheet सिंक विफल रहा' });
    } finally {
      setIsImporting(false);
    }
  };

  // Export current news database as CSV file
  const handleDownloadCsv = () => {
    if (currentPosts.length === 0) {
      setStatusMessage({ type: 'info', text: 'एक्सपोर्ट करने के लिए कोई समाचार उपलब्ध नहीं है' });
      return;
    }

    const headers = ['ID', 'Title', 'Summary', 'Category', 'Source', 'District', 'Date', 'ImageUrl', 'FullContent'];
    const rows = currentPosts.map((p) => [
      `"${(p.id || '').replace(/"/g, '""')}"`,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.summary || '').replace(/"/g, '""')}"`,
      `"${(p.categoryName || p.category || 'ताज़ा समाचार').replace(/"/g, '""')}"`,
      `"${(p.sourceChannel || 'AI News Maker').replace(/"/g, '""')}"`,
      `"${(p.district || p.location || '').replace(/"/g, '""')}"`,
      `"${(p.publishedTime || '').replace(/"/g, '""')}"`,
      `"${(p.imageUrl || '').replace(/"/g, '""')}"`,
      `"${(p.fullContent || p.summary || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI-News-Maker-Database-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatusMessage({ type: 'success', text: 'सफलतापूर्वक CSV डेटाबेस डाउनलोड हो गया!' });
  };

  const handleCreateNewSheet = async () => {
    if (!token) return;
    setIsLoadingSheets(true);
    try {
      const { spreadsheetId, spreadsheetUrl } = await createNewsSpreadsheet(token);
      setStatusMessage({
        type: 'success',
        text: `नई Google Sheet बनाई गई! (${spreadsheetUrl})`,
      });
      await loadDriveSheets(token);
      setSelectedSheetId(spreadsheetId);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'शीट बनाने में त्रुटि हुई' });
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const executeOAuthExport = async () => {
    if (!token || !selectedSheetId) return;
    setIsExporting(true);
    setStatusMessage(null);

    try {
      await exportPostsToGoogleSheet(token, selectedSheetId, currentPosts);
      setStatusMessage({
        type: 'success',
        text: `सफलतापूर्वक ${currentPosts.length} समाचार Google Sheet में एक्सपोर्ट किए गए!`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'एक्सपोर्ट विफल रहा' });
    } finally {
      setIsExporting(false);
    }
  };

  const executeOAuthImport = async () => {
    if (!token || !selectedSheetId) return;
    setIsImporting(true);
    setStatusMessage(null);

    try {
      const imported = await readPostsFromGoogleSheet(token, selectedSheetId);
      if (imported.length === 0) {
        setStatusMessage({ type: 'info', text: 'चयनित गूगल शीट में कोई समाचार रिकॉर्ड नहीं मिला' });
      } else {
        if (onImportPosts) {
          onImportPosts(imported);
        }
        setStatusMessage({
          type: 'success',
          text: `सफलतापूर्वक Google Sheet से ${imported.length} समाचार इम्पोर्ट किए गए!`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'इम्पोर्ट विफल रहा' });
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-[#1e293b] to-[#0f172a] border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Google Sheets लाइव न्यूज़ रूम सिंक
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 font-semibold">
                  Admin Only
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Google Sheets से सीधे समाचार पढ़ें, लाइव सिंक करें या डेटाबेस बैकअप लें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('direct')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'direct'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            डायरेक्ट Sheet URL सिंक (अनुशंसित)
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            CSV एक्सपोर्ट व डाउनलोड
          </button>
          <button
            onClick={() => setActiveTab('oauth')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Google Drive लॉगिन
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm">
          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-red-950/40 border-red-500/50 text-red-200'
                  : 'bg-blue-950/40 border-blue-500/50 text-blue-200'
              }`}
            >
              {statusMessage.type === 'success' && <Check className="w-5 h-5 shrink-0 text-emerald-400" />}
              {statusMessage.type === 'error' && <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />}
              <span className="text-xs font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: Direct Google Sheet URL Sync */}
          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <Database className="w-4 h-4 text-emerald-400" />
                  डायरेक्ट Google Sheet से लाइव खबरें आयात करें
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  अपनी Google Sheet का लिंक यहाँ पेस्ट करें। सुनिश्चित करें कि शीट शेयरिंग सेटिंग्स में <strong>"Anyone with the link can view" (लिंक वाला कोई भी देख सकता है)</strong> चुना हुआ है।
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Google Sheet URL या Sheet ID:
                </label>
                <input
                  type="text"
                  placeholder="उदा. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  value={directSheetUrl}
                  onChange={(e) => setDirectSheetUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 block">
                  कॉलम क्रम: A: ID, B: शीर्षक (Title), C: सारांश (Summary), D: श्रेणी (Category), E: चैनल नाम, F: ज़िला/स्थान, G: दिनांक, H: इमेज लिंक
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleDirectSync}
                  disabled={isImporting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
                  {isImporting ? 'लाइव सिंक हो रहा है...' : 'अभी शीट से लाइव सिंक करें'}
                </button>

                {directSheetUrl && (
                  <a
                    href={directSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    शीट खोलें <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Export CSV / Sheet */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  वर्तमान समाचार डेटाबेस CSV फाइल डाउनलोड करें
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ऐप में उपलब्ध कुल {currentPosts.length} समाचारों को एक्सेल (Excel) व Google Sheets संगत CSV फाइल के रूप में अपने कंप्यूटर/फोन पर सेव करें।
                </p>
              </div>

              <button
                onClick={handleDownloadCsv}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                सभी समाचारों की CSV फाइल डाउनलोड करें ({currentPosts.length} खबरें)
              </button>
            </div>
          )}

          {/* TAB 3: Google Drive OAuth */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              {!currentUser || !token ? (
                <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Google Workspace कनेक्ट करें</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      अपने Google Drive में नई शीट बनाने या सीधे एक्सपोर्ट करने के लिए अपने गूगल खाते से साइन इन करें।
                    </p>
                  </div>

                  {authError && (
                    <div className="p-2.5 bg-red-950/40 border border-red-800/50 text-red-300 text-xs rounded-lg">
                      {authError}
                    </div>
                  )}

                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={handleSignIn}
                      disabled={isAuthenticating}
                      className="group relative inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white text-slate-800 font-semibold rounded-lg shadow-md hover:bg-slate-100 transition-all border border-slate-300 disabled:opacity-50 cursor-pointer text-xs"
                    >
                      <span>{isAuthenticating ? 'कनेक्ट हो रहा है...' : 'Google खाते से साइन इन करें'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        {currentUser.email?.charAt(0).toUpperCase() || 'G'}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">{currentUser.displayName || currentUser.email}</div>
                        <div className="text-[11px] text-emerald-400">Google Workspace कनेक्टेड</div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-2.5 py-1 text-xs bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      लॉगआउट
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">गूगल ड्राइव शीट चुनें:</label>
                    <button
                      onClick={handleCreateNewSheet}
                      disabled={isLoadingSheets}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> नई Sheet बनाएं
                    </button>
                  </div>

                  {spreadsheets.length > 0 && (
                    <select
                      value={selectedSheetId}
                      onChange={(e) => setSelectedSheetId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3 outline-none"
                    >
                      {spreadsheets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={executeOAuthImport}
                      disabled={isImporting || !selectedSheetId}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isImporting ? 'इम्पोर्ट हो रहा है...' : 'शीट से इम्पोर्ट करें'}
                    </button>
                    <button
                      onClick={executeOAuthExport}
                      disabled={isExporting || !selectedSheetId}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isExporting ? 'एक्सपोर्ट हो रहा है...' : 'शीट में एक्सपोर्ट करें'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
