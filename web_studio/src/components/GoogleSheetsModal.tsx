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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getSheetsAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sheets list state
  const [spreadsheets, setSpreadsheets] = useState<Array<{ id: string; name: string; webViewLink?: string }>>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');

  // Status & Confirmation state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'export' | 'import'; sheetName: string } | null>(null);

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

  const triggerExportConfirm = () => {
    if (!selectedSheetId) {
      setStatusMessage({ type: 'error', text: 'कृपया एक Google Sheet चुनें या नई बनाएं' });
      return;
    }
    const sheetObj = spreadsheets.find((s) => s.id === selectedSheetId);
    setConfirmDialog({
      type: 'export',
      sheetName: sheetObj ? sheetObj.name : 'चुनी गई Google Sheet',
    });
  };

  const triggerImportConfirm = () => {
    if (!selectedSheetId) {
      setStatusMessage({ type: 'error', text: 'कृपया एक Google Sheet चुनें' });
      return;
    }
    const sheetObj = spreadsheets.find((s) => s.id === selectedSheetId);
    setConfirmDialog({
      type: 'import',
      sheetName: sheetObj ? sheetObj.name : 'चुनी गई Google Sheet',
    });
  };

  const executeExport = async () => {
    if (!token || !selectedSheetId) return;
    setConfirmDialog(null);
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

  const executeImport = async () => {
    if (!token || !selectedSheetId) return;
    setConfirmDialog(null);
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
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900/40 via-[#1e293b] to-[#0f172a] border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Google Sheets लाइव न्यूज़ रूम सिंक
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  Google Workspace
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Google Sheets से सीधे समाचार पढ़ें या समाचार पत्र डेटाबेस में एक्सपोर्ट करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
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

          {/* Authentication Section */}
          {!currentUser || !token ? (
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Google Workspace कनेक्ट करें</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Google Drive और Google Sheets का उपयोग करने के लिए अपने गूगल खाते से साइन इन करें। अनुमति प्राप्त होने पर ही डेटा अपडेट किया जाएगा।
                </p>
              </div>

              {authError && (
                <div className="p-2.5 bg-red-950/40 border border-red-800/50 text-red-300 text-xs rounded-lg">
                  {authError}
                </div>
              )}

              {/* Official GSI Material Button */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="group relative inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white text-slate-800 font-semibold rounded-lg shadow-md hover:bg-slate-100 transition-all border border-slate-300 disabled:opacity-50 cursor-pointer"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>{isAuthenticating ? 'कनेक्ट हो रहा है...' : 'Google खाते से साइन इन करें'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* User Bar */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-emerald-500/50" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      {currentUser.email?.charAt(0).toUpperCase() || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-white text-xs">{currentUser.displayName || currentUser.email}</div>
                    <div className="text-[11px] text-emerald-400">Google Workspace कनेक्टेड</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-xs bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  लॉगआउट
                </button>
              </div>

              {/* Sheet Selection Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                    गूगल ड्राइव से Google Sheet चुनें:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => token && loadDriveSheets(token)}
                      disabled={isLoadingSheets}
                      className="p-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                      title="शीट सूची रीफ्रेश करें"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={handleCreateNewSheet}
                      disabled={isLoadingSheets}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      नई Google Sheet बनाएं
                    </button>
                  </div>
                </div>

                {isLoadingSheets ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800 animate-pulse">
                    Google Drive से आपकी स्प्रेडशीट फ़ाइलें खोजी जा रही हैं...
                  </div>
                ) : spreadsheets.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800 space-y-2">
                    <p>गूगल ड्राइव में कोई स्प्रेडशीट फ़ाइल नहीं मिली।</p>
                    <button
                      onClick={handleCreateNewSheet}
                      className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> नई AI News Maker Sheet बनाएं
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedSheetId}
                    onChange={(e) => setSelectedSheetId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3 outline-none focus:border-emerald-500"
                  >
                    {spreadsheets.map((sheet) => (
                      <option key={sheet.id} value={sheet.id}>
                        📊 {sheet.name} (ID: {sheet.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Action Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Export Card */}
                <div className="p-4 bg-slate-900/80 border border-emerald-500/20 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                      <Upload className="w-4 h-4" />
                      न्यूज़ फ़ीड ➔ Google Sheets एक्सपोर्ट
                    </div>
                    <p className="text-xs text-slate-400">
                      वर्तमान एप डेटाबेस में मौजूद {currentPosts.length} समाचारों को चुनी गई Google Sheet में रिकॉर्ड जोड़ें।
                    </p>
                  </div>

                  <button
                    onClick={triggerExportConfirm}
                    disabled={isExporting || !selectedSheetId}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isExporting ? 'एक्सपोर्ट हो रहा है...' : 'Google Sheet में एक्सपोर्ट करें'}
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-4 bg-slate-900/80 border border-blue-500/20 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs mb-1">
                      <Download className="w-4 h-4" />
                      Google Sheets ➔ न्यूज़ रूम इम्पोर्ट
                    </div>
                    <p className="text-xs text-slate-400">
                      चुनी गई Google Sheet से समाचार रिकॉर्ड पढ़कर लाइव न्यूज़ रूम फ़ीड में सिंक करें।
                    </p>
                  </div>

                  <button
                    onClick={triggerImportConfirm}
                    disabled={isImporting || !selectedSheetId}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isImporting ? 'इम्पोर्ट हो रहा है...' : 'Google Sheet से इम्पोर्ट करें'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Confirmation Dialog (Mandatory for destructive/mutating ops) */}
          {confirmDialog && (
            <div className="p-4 bg-amber-950/80 border border-amber-500/60 rounded-xl space-y-3 text-amber-200">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {confirmDialog.type === 'export' ? 'Google Sheet अपडेट पुष्टि:' : 'न्यूज़ डेटाबेस इम्पोर्ट पुष्टि:'}
              </div>
              <p className="text-xs text-amber-100/90">
                {confirmDialog.type === 'export'
                  ? `क्या आप निश्चित हैं कि आप "${confirmDialog.sheetName}" में ${currentPosts.length} समाचार पंक्तियां (Rows) जोड़ना चाहते हैं?`
                  : `क्या आप निश्चित हैं कि आप "${confirmDialog.sheetName}" से समाचार डेटा आयात करके लाइव न्यूज़ रूम में जोड़ना चाहते हैं?`}
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  रद्द करें
                </button>
                <button
                  onClick={confirmDialog.type === 'export' ? executeExport : executeImport}
                  className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg"
                >
                  हाँ, जारी रखें
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>AI News Maker Workspace API Integration</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            बंद करें
          </button>
        </div>
      </div>
    </div>
  );
};
