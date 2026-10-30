import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Crown,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  Zap,
  Info,
  Server,
  Layers,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';

interface FreeKeyItem {
  id: string;
  label: string;
  maskedKey: string;
  addedAt: number;
  status: 'active' | 'disabled';
  inCooldown: boolean;
  cooldownSecondsRemaining: number;
  successCount: number;
  errorCount: number;
  lastTestedAt?: number | null;
  lastLatencyMs?: number | null;
  lastHealthStatus?: 'healthy' | 'quota_exceeded' | 'invalid' | 'error' | null;
  lastError?: string | null;
  provider?: string;
  model?: string;
}

interface PaidKeyInfo {
  configured: boolean;
  maskedKey: string | null;
  label: string;
  status: string;
  updatedAt: number | null;
  lastTestedAt?: number | null;
  lastLatencyMs?: number | null;
  lastHealthStatus?: string | null;
  lastError?: string | null;
  provider?: string;
  model?: string;
}

interface ApiKeysManagerData {
  success: boolean;
  freeKeys: FreeKeyItem[];
  paidKey: PaidKeyInfo;
  vipRoutingEnabled: boolean;
  stats: {
    totalFree: number;
    activeFree: number;
    inCooldown: number;
    fallbackEnvKeyConfigured: boolean;
  };
}

export const AdminApiKeysManager: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const [data, setData] = useState<ApiKeysManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Free Key form
  const [newFreeKey, setNewFreeKey] = useState('');
  const [newFreeLabel, setNewFreeLabel] = useState('');
  const [addingFreeKey, setAddingFreeKey] = useState(false);

  // Paid Key form
  const [paidKeyInput, setPaidKeyInput] = useState('');
  const [paidKeyLabel, setPaidKeyLabel] = useState('');
  const [vipRoutingToggle, setVipRoutingToggle] = useState(true);
  const [savingPaidKey, setSavingPaidKey] = useState(false);

  // Test Key state
  const [testKeyInput, setTestKeyInput] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const adminEmail = currentUser?.email || 'breakingnewswala.com@gmail.com';

  const fetchKeysData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        headers: {
          'x-admin-email': adminEmail,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
          setVipRoutingToggle(json.vipRoutingEnabled);
        }
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKeysData();
    // Auto refresh every 30s to update cooldown timers
    const timer = setInterval(() => {
      fetchKeysData(true);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleAddFreeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFreeKey.trim()) {
      showToast('⚠️ कृपया मान्य Gemini API Key दर्ज करें');
      return;
    }
    setAddingFreeKey(true);
    try {
      const res = await fetch('/api/admin/api-keys/free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({
          apiKey: newFreeKey.trim(),
          label: newFreeLabel.trim() || undefined,
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast(resData.message || '✅ फ्री API की जोड़ी गई!');
        setNewFreeKey('');
        setNewFreeLabel('');
        fetchKeysData(true);
      } else {
        showToast(`❌ ${resData.error || 'की जोड़ने में विफलता'}`);
      }
    } catch (err: any) {
      showToast(`❌ नेटवर्क त्रुटि: ${err.message}`);
    } finally {
      setAddingFreeKey(false);
    }
  };

  const handleDeleteFreeKey = async (id: string, label: string) => {
    if (!confirm(`क्या आप निश्चित रूप से "${label}" को फ्री पूल से हटाना चाहते हैं?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/api-keys/free/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-email': adminEmail,
        },
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast('🗑️ फ्री API की सफलतापूर्वक हटा दी गई');
        fetchKeysData(true);
      } else {
        showToast(`❌ ${resData.error || 'हटाने में विफलता'}`);
      }
    } catch (err: any) {
      showToast(`❌ त्रुटि: ${err.message}`);
    }
  };

  const handleSavePaidKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaidKey(true);
    try {
      const res = await fetch('/api/admin/api-keys/paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({
          apiKey: paidKeyInput.trim() || undefined,
          label: paidKeyLabel.trim() || undefined,
          vipRoutingEnabled: vipRoutingToggle,
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast(resData.message || '✅ पेड VIP API Key सेटिंग्स अपडेट हो गईं!');
        setPaidKeyInput('');
        fetchKeysData(true);
      } else {
        showToast(`❌ ${resData.error || 'सेव करने में विफलता'}`);
      }
    } catch (err: any) {
      showToast(`❌ नेटवर्क त्रुटि: ${err.message}`);
    } finally {
      setSavingPaidKey(false);
    }
  };

  const handleDeletePaidKey = async () => {
    if (!confirm('क्या आप पेड VIP Key को हटाना चाहते हैं? इसके बाद VIP कॉल्स फ्री पूल से प्रोसेस होंगी।')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/api-keys/paid', {
        method: 'DELETE',
        headers: {
          'x-admin-email': adminEmail,
        },
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast('🗑️ पेड VIP Key हटा दी गई');
        fetchKeysData(true);
      } else {
        showToast(`❌ ${resData.error || 'हटाने में विफलता'}`);
      }
    } catch (err: any) {
      showToast(`❌ त्रुटि: ${err.message}`);
    }
  };

  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  const handleTestSavedKey = async (keyId: string, type: 'free' | 'paid') => {
    setTestingKeyId(keyId);
    try {
      const res = await fetch('/api/admin/api-keys/test-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({ keyId, type }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast(resData.message || '✅ API की सक्रिय है!');
      } else {
        showToast(resData.error || '❌ API की स्वास्थ्य परीक्षण विफल रहा');
      }
      await fetchKeysData(true);
    } catch (err: any) {
      showToast(`❌ परीक्षण त्रुटि: ${err.message}`);
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleTestKeyDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testKeyInput.trim()) {
      showToast('⚠️ टेस्ट करने के लिए API Key दर्ज करें');
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/api-keys/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({
          apiKey: testKeyInput.trim(),
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setTestResult({
          success: true,
          message: resData.message || '✅ API Key सक्रिय है!',
        });
      } else {
        setTestResult({
          success: false,
          message: resData.error || '❌ टेस्ट विफल रहा',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `❌ टेस्ट त्रुटि: ${err.message}`,
      });
    } finally {
      setTestingKey(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm">API की मैनेजर लोड हो रहा है...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
            <span>फ्री कीज़ पूल</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            {data?.stats?.totalFree ?? 0}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">कुल रजिस्टर्ड फ्री कीज़</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
            <span>सक्रिय कीज़</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {data?.stats?.activeFree ?? 0}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">कॉल प्रोसेस करने को तैयार</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-yellow-400 font-bold mb-1">
            <span>कूलडाउन कीज़</span>
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-yellow-400">
            {data?.stats?.inCooldown ?? 0}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">429 के बाद रेस्ट मोड</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-purple-400 font-bold mb-1">
            <span>VIP पेड की</span>
            <Crown className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-300 truncate mt-1">
            {data?.paidKey?.configured ? '🟢 सक्रिय (Active)' : '⚪ सेट नहीं'}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">डेडिकेटेड VIP चैनल</p>
        </div>
      </div>

      {/* Explanatory Info Banner */}
      <div className="p-4 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-700/40 rounded-2xl text-xs space-y-2 text-slate-300">
        <div className="flex items-center gap-2 text-indigo-300 font-black text-sm">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>स्मार्ट मल्टी-की रोटेशन एवं ऑटो-फेलओवर इंजन (Zero Cost Scaling)</span>
        </div>
        <p className="leading-relaxed">
          • <strong className="text-white">फ्री कीज़ पूल:</strong> सामान्य और फ्री यूज़र्स जब खबर जनरेट करेंगे, तो बैकएंड आपके द्वारा जोड़ी गई सभी फ्री कीज़ में राउंड-रॉबिन करेगा। यदि किसी एक की पर Google का 429 कोटा आता है, तो सिस्टम बिना यूजर को रोके स्वतः अगली फ्री की पर स्विच कर जाएगा।
        </p>
        <p className="leading-relaxed">
          • <strong className="text-purple-300">VIP पेड की:</strong> VIP DESK या Pro प्लान वाले उपयोगकर्ताओं की रिक्वेस्ट सीधे आपकी सुरक्षित Google Cloud Pay-As-You-Go Key से बिना किसी कतार के अल्ट्रा-फास्ट प्रोसेस होगी।
        </p>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: फ्री एपीआई कीज़ पूल (Free API Keys Pool) */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                <Layers className="w-4 h-4" />
              </span>
              <span>1. फ्री एपीआई कीज़ पूल (Free API Keys Pool)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Google AI Studio के अलग-अलग खातों से फ्री API Keys जोड़ें। Google प्रत्येक खाते पर 15 RPM और दैनिक कोटा बिल्कुल फ्री देता है।
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchKeysData(true)}
            disabled={refreshing}
            className="self-start sm:self-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>रिफ्रेश</span>
          </button>
        </div>

        {/* Add Free Key Form */}
        <form onSubmit={handleAddFreeKey} className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-3">
          <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>पूल में नई फ्री Gemini API Key जोड़ें</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Google Gemini API Key *
              </label>
              <input
                type="password"
                required
                value={newFreeKey}
                onChange={(e) => setNewFreeKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                खाते का नाम / लेबल
              </label>
              <input
                type="text"
                value={newFreeLabel}
                onChange={(e) => setNewFreeLabel(e.target.value)}
                placeholder="उदा: Google Account 1 (Rahul)"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              * की को जोड़ने से पहले Google के साथ सत्यापित किया जाता है।
            </span>
            <button
              type="submit"
              disabled={addingFreeKey}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition flex items-center gap-2 disabled:opacity-50"
            >
              {addingFreeKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>फ्री की जोड़ें</span>
            </button>
          </div>
        </form>

        {/* Free Keys List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>पूल में मौजूद कीज़ ({data?.freeKeys?.length || 0})</span>
            <span className="text-[11px] text-slate-500">रोटेशन: सक्रिय पूल में राउंड-रॉबिन</span>
          </div>

          {!data?.freeKeys || data.freeKeys.length === 0 ? (
            <div className="p-6 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
              <Key className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-bold">
                अभी तक कोई फ्री की नहीं जोड़ी गई है।
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                ऊपर दिए गए फॉर्म से अपने Google AI Studio अकाउंट्स की फ्री कीज़ जोड़ें। जब तक यहाँ कीज़ नहीं होंगी, ऐप डिफ़ॉल्ट एनवायरनमेंट की (Fallback Key) का उपयोग करेगा।
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.freeKeys.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-xs shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white truncate">{item.label}</span>
                        <code className="text-[11px] bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-mono border border-slate-800">
                          {item.maskedKey}
                        </code>
                        {/* Status Badge */}
                        {item.inCooldown ? (
                          <span className="px-2 py-0.5 bg-yellow-950 border border-yellow-700 text-yellow-300 rounded text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-yellow-400 animate-spin" />
                            <span>कूलडाउन ({item.cooldownSecondsRemaining}s)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            <span>सक्रिय (Ready)</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                        <span>प्रदाता: {item.provider || 'गूगल जेमिनी (Google Gemini)'}</span>
                        <span>मॉडल: {item.model || 'gemini-3.8-flash'}</span>
                        <span className="text-emerald-400 font-mono">✅ {item.successCount} सफल</span>
                        {item.errorCount > 0 && (
                          <span className="text-red-400 font-mono">❌ {item.errorCount} एरर / 429</span>
                        )}
                        {item.lastTestedAt && (
                          <span className="text-blue-300 font-medium">
                            जाँचा गया: {new Date(item.lastTestedAt).toLocaleTimeString('hi-IN')} ({item.lastLatencyMs}ms)
                          </span>
                        )}
                        {item.lastError && (
                          <span className="text-red-400 font-medium">({item.lastError})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={testingKeyId === item.id}
                      onClick={() => handleTestSavedKey(item.id, 'free')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition cursor-pointer flex items-center gap-1.5 font-bold text-[11px] disabled:opacity-50"
                      title="इस API Key का Google से कनेक्शन व स्वास्थ्य परीक्षण करें"
                    >
                      {testingKeyId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>हेल्थ टेस्ट</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFreeKey(item.id, item.label)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                      title="पूल से हटाएं"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: पेड एपीआई की (VIP Dedicated Key) */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
                <Crown className="w-4 h-4" />
              </span>
              <span>2. पेड एपीआई की (VIP Dedicated Key)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Google Cloud Pay-As-You-Go (बिलिंग अकाउंट) वाली की। यह केवल VIP DESK / Pro प्लान यूज़र्स के लिए आरक्षित रहेगी।
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePaidKey} className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-950/30 border border-purple-800/40 p-3 rounded-xl">
            <div className="space-y-0.5">
              <div className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>VIP Dedicated Routing Switch</span>
              </div>
              <p className="text-[11px] text-slate-400">
                सक्रिय होने पर VIP DESK व Pro यूज़र्स की सारी कॉल्स केवल इसी पेड की से प्रोसेस होंगी।
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={vipRoutingToggle}
                onChange={(e) => setVipRoutingToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Google Cloud Paid / VIP Gemini API Key
              </label>
              <input
                type="password"
                value={paidKeyInput}
                onChange={(e) => setPaidKeyInput(e.target.value)}
                placeholder={data?.paidKey?.configured ? `वर्तमान की: ${data.paidKey.maskedKey} (बदलने के लिए नई की दर्ज करें)` : 'AIzaSy...'}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                की लेबल / विवरण
              </label>
              <input
                type="text"
                value={paidKeyLabel}
                onChange={(e) => setPaidKeyLabel(e.target.value)}
                placeholder={data?.paidKey?.label || 'BreakingNewsWala GCP Paid'}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Current Status Box */}
          {data?.paidKey?.configured && (
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300 font-bold">वर्तमान पेड की:</span>
                  <code className="text-purple-300 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{data.paidKey.maskedKey}</code>
                  <span className="text-[10px] text-slate-500">
                    (अपडेट: {data.paidKey.updatedAt ? new Date(data.paidKey.updatedAt).toLocaleDateString('hi-IN') : 'सत्यापित'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={testingKeyId === 'paid'}
                    onClick={() => handleTestSavedKey('paid', 'paid')}
                    className="px-2.5 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="पेड VIP API Key का कनेक्शन टेस्ट करें"
                  >
                    {testingKeyId === 'paid' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-purple-300" />}
                    <span>हेल्थ टेस्ट</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeletePaidKey}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg text-xs font-bold transition cursor-pointer"
                    title="पेड की हटाएं"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-3 flex-wrap pt-1 border-t border-slate-800/60">
                <span>प्रदाता: {data.paidKey.provider || 'गूगल जेमिनी (Google Gemini)'}</span>
                <span>मॉडल: {data.paidKey.model || 'gemini-3.8-flash'}</span>
                {data.paidKey.lastTestedAt && (
                  <span className="text-purple-300 font-medium">
                    जाँचा गया: {new Date(data.paidKey.lastTestedAt).toLocaleTimeString('hi-IN')} ({data.paidKey.lastLatencyMs}ms)
                  </span>
                )}
                {data.paidKey.lastError && (
                  <span className="text-red-400 font-medium">({data.paidKey.lastError})</span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPaidKey}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition flex items-center gap-2 disabled:opacity-50"
            >
              {savingPaidKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
              <span>पेड VIP सेटिंग्स सेव करें</span>
            </button>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: लाइव कनेक्शन टेस्ट टूल (Live Test Tool) */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <Zap className="w-4 h-4" />
            </span>
            <span>3. लाइव API की कनेक्शन टेस्ट टूल (Instant Validator)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            किसी भी Gemini API Key को पूल में जोड़ने से पहले या बाद में तुरंत टेस्ट करें कि वह Google से कनेक्ट हो रही है या नहीं।
          </p>
        </div>

        <form onSubmit={handleTestKeyDirectly} className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            required
            value={testKeyInput}
            onChange={(e) => setTestKeyInput(e.target.value)}
            placeholder="जांचने के लिए Gemini API Key दर्ज करें (AIzaSy...)"
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white font-mono outline-none"
          />
          <button
            type="submit"
            disabled={testingKey}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {testingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            <span>लाइव पिंग टेस्ट करें</span>
          </button>
        </form>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
              testResult.success
                ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                : 'bg-red-950/80 border-red-600/60 text-red-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{testResult.message}</span>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-amber-500/50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMsg}
        </div>
      )}
    </div>
  );
};
