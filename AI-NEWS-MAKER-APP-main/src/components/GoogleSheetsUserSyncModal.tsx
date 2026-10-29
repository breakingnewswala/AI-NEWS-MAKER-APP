import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  Download,
  Copy,
  Check,
  RefreshCw,
  Users,
  Code,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Link as LinkIcon,
  Database,
} from 'lucide-react';
import {
  getUsersSheetWebhookUrl,
  setUsersSheetWebhookUrl,
  getLastUsersSyncTime,
  syncUsersToGoogleSheet,
  exportUsersToCsv,
  APPS_SCRIPT_TEMPLATE_CODE,
} from '../lib/googleSheetsUserSync';
import { getPlanUsers, PlanUserRecord } from '../lib/userPlanManager';

interface GoogleSheetsUserSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsUserSyncModal: React.FC<GoogleSheetsUserSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'script' | 'users'>('sync');
  const [webhookUrl, setWebhookUrlState] = useState<string>(() => getUsersSheetWebhookUrl());
  const [usersList, setUsersList] = useState<PlanUserRecord[]>(() => getPlanUsers());
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => getLastUsersSyncTime());

  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUsersList(getPlanUsers());
      setWebhookUrlState(getUsersSheetWebhookUrl());
      setLastSyncTime(getLastUsersSyncTime());
    }
  }, [isOpen]);

  const handleSaveWebhook = (url: string) => {
    setWebhookUrlState(url);
    setUsersSheetWebhookUrl(url);
  };

  const handleRunSync = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const res = await syncUsersToGoogleSheet(usersList);
      setLastSyncTime(Date.now());
      setStatusMessage({
        type: 'success',
        text: res.message,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'सिंक के दौरान त्रुटि हुई',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0a0f1d] border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-[#0a0f1d] border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                "एआई न्यूज़ मेकर ऐप की गूगल शीट" (यूज़र डेटाबेस ऑटो-सिंक)
              </h3>
              <p className="text-xs text-slate-400">
                साइन अप, लॉगिन व प्लान पैकेज चेंजेस का डेटा सीधे आपकी Google Sheet में रियल टाइम सिंक होगा
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

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            गूगल शीट सिंक सेटिंग्स
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            रजिस्टर्ड यूज़र्स ({usersList.length})
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Apps Script कोड (1-Click)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-200'
              }`}
            >
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: SYNC SETTINGS */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <Database className="w-4 h-4 text-emerald-400" />
                  "एआई न्यूज़ मेकर ऐप की गूगल शीट" रियल टाइम सिंक
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  जब भी कोई नया यूज़र साइन अप करेगा या अपने पैकेज/प्लांस में बदलाव करेगा, उसका डेटा स्वतः आपकी Google Sheet पर सिंक हो जाएगा।
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Google Apps Script Webhook URL (गूगल शीट यूआरएल):
                </label>
                <input
                  type="text"
                  placeholder="उदा. https://script.google.com/macros/s/AKfycb.../exec"
                  value={webhookUrl}
                  onChange={(e) => handleSaveWebhook(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3 outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-400 block">
                  (यदि आपके पास Webhook URL नहीं है, तो 'Apps Script कोड' टैब से 1 मिनट में अपनी Google Sheet में कोड जोड़ें)
                </span>
              </div>

              {lastSyncTime && (
                <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span>✓ अंतिम सिंक:</span>
                  <span>{new Date(lastSyncTime).toLocaleString('hi-IN')}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-between">
                <button
                  type="button"
                  onClick={handleRunSync}
                  disabled={isSyncing}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'सिंक हो रहा है...' : 'अभी सभी यूज़र्स गूगल शीट में सिंक करें'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportUsersToCsv(usersList)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>गूगल शीट संगत CSV डाउनलोड करें ({usersList.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTERED USERS DATABASE */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  कुल रजिस्टर्ड यूज़र्स: {usersList.length}
                </span>
                <button
                  type="button"
                  onClick={() => exportUsersToCsv(usersList)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> CSV एक्सपोर्ट
                </button>
              </div>

              {usersList.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400">
                  कोई रजिस्टर्ड यूज़र रिकॉर्ड उपलब्ध नहीं है।
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl bg-slate-900/80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-2.5">यूज़र / ईमेल</th>
                        <th className="p-2.5">चैनल नाम</th>
                        <th className="p-2.5">मोबाइल</th>
                        <th className="p-2.5">पैकेज / प्लान</th>
                        <th className="p-2.5">दिनांक</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {usersList.map((u, i) => (
                        <tr key={u.email || i} className="hover:bg-slate-850">
                          <td className="p-2.5 font-medium">
                            <div className="text-white font-bold">{u.name || 'यूज़र'}</div>
                            <div className="text-[10px] text-slate-400">{u.email || u.userId}</div>
                          </td>
                          <td className="p-2.5 text-slate-300">{u.channelName || '—'}</td>
                          <td className="p-2.5 font-mono text-[11px] text-emerald-300">{u.mobile || '—'}</td>
                          <td className="p-2.5 font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              u.tier === 'ultra' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              u.tier === 'professional' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                              u.tier === 'advanced' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {u.planName || u.tier || 'BASIC'}
                            </span>
                          </td>
                          <td className="p-2.5 text-[10px] text-slate-400">
                            {u.activatedAt ? new Date(u.activatedAt).toLocaleDateString('hi-IN') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: APPS SCRIPT CODE */}
          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-emerald-400" />
                  Google Apps Script कोड (अपनी Google Sheet में जोड़ें)
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'कॉपी हो गया!' : '1-Click कोड कॉपी करें'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <p>1. अपनी <strong>Google Sheet</strong> खोलें और उसका नाम बदलें: <strong>"एआई न्यूज़ मेकर ऐप की गूगल शीट"</strong></p>
                <p>2. मेन्यू में <strong>Extensions -&gt; Apps Script</strong> पर क्लिक करें।</p>
                <p>3. ऊपर दिया कोड पेस्ट करें और <strong>Deploy -&gt; New deployment -&gt; Web app</strong> चुनें (Who has access: Anyone)</p>
                <p>4. प्राप्त <strong>Web App URL</strong> को टैब 1 ('गूगल शीट सिंक सेटिंग्स') में सेव करें।</p>
              </div>

              <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-56 leading-relaxed">
                {APPS_SCRIPT_TEMPLATE_CODE}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
