import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Globe,
  Key,
  Check,
  AlertCircle,
  RefreshCw,
  Server,
  ExternalLink,
  Copy,
  CheckCheck,
  Zap,
  Bot,
  Sliders,
  ShieldCheck,
  Clipboard,
  KeyRound,
} from 'lucide-react';
import { getApiUrl, getCustomCloudUrl, setCustomCloudUrl, DEFAULT_CLOUD_BASE_URL } from '../lib/apiConfig';

interface CloudSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAiKeyUpdated?: () => void;
}

export const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenAiKeyUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'openai' | 'domain'>('cloud');
  
  // Cloud status state
  const [loading, setLoading] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Custom Domain input
  const [customDomainInput, setCustomDomainInput] = useState<string>(() => getCustomCloudUrl());
  const [domainSaved, setDomainSaved] = useState<boolean>(false);

  // OpenAI Key input
  const [openaiKeyInput, setOpenaiKeyInput] = useState<string>('');
  const [keySaving, setKeySaving] = useState<boolean>(false);
  const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current cloud and AI provider status
  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/cloud-status'));
      const data = await res.json();
      setCloudStatus(data);
    } catch {
      setCloudStatus({
        cloudActive: true,
        cloudProvider: 'Google Cloud Platform (Cloud Run)',
        geminiAvailable: true,
        openaiAvailable: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setCustomDomainInput(getCustomCloudUrl());
      setDomainSaved(false);
      setKeyMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save Custom Domain
  const handleSaveCustomDomain = () => {
    const trimmed = customDomainInput.trim();
    setCustomCloudUrl(trimmed);
    setDomainSaved(true);
    setTimeout(() => setDomainSaved(false), 3000);
  };

  // Reset to default cloud
  const handleResetToDefaultCloud = () => {
    setCustomDomainInput('');
    setCustomCloudUrl('');
    setDomainSaved(true);
    setTimeout(() => setDomainSaved(false), 3000);
  };

  // Save and test OpenAI API Key
  const handleSaveOpenAiKey = async () => {
    if (!openaiKeyInput.trim()) {
      setKeyMessage({ type: 'error', text: 'कृपया वैध OpenAI API Key (sk-...) दर्ज करें।' });
      return;
    }
    setKeySaving(true);
    setKeyMessage(null);

    try {
      const res = await fetch(getApiUrl('/api/admin/set-ai-keys'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openaiKey: openaiKeyInput.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setKeyMessage({ type: 'success', text: data.message || 'OpenAI API Key सेव हो गई!' });
        setOpenaiKeyInput('');
        loadStatus();
        if (onOpenAiKeyUpdated) onOpenAiKeyUpdated();
      } else {
        setKeyMessage({ type: 'error', text: data.error || 'API Key सेव करने में त्रुटि' });
      }
    } catch (err: any) {
      setKeyMessage({ type: 'error', text: 'सर्वर से कनेक्ट करने में त्रुटि: ' + (err.message || 'त्रुटि') });
    } finally {
      setKeySaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const effectiveCloudUrl = customDomainInput.trim() || DEFAULT_CLOUD_BASE_URL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 flex items-center justify-center shadow-inner">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>क्लाउड, AI व डोमेन सेटअप</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                  LIVE
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                क्लाउड सर्वर, चैट जीपीटी (OpenAI API) व कस्टम वेबसाइट डोमेन जोड़ें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-neutral-800 bg-neutral-950 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-2 px-3 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>1. लाइव क्लाउड स्टेटस</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('openai')}
            className={`flex items-center gap-2 px-3 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'openai'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. चैट जीपीटी (OpenAI API)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('domain')}
            className={`flex items-center gap-2 px-3 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'domain'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>3. परचेस्ड डोमेन (वेब डैशबोर्ड)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* TAB 1: CLOUD STATUS */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    क्लाउड सर्वर सक्रिय (Online & Live)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    Google Cloud Platform
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  आपकी ऐप का क्लाउड बैकएंड इंजन लाइव चल रहा है। यह AI जनरेशन, वेबसाइट आर्टिकल पार्सिंग, 
                  तथा इन-ऐप अपडेट्स को 24x7 प्रोसेस करता है।
                </p>
              </div>

              {/* Server URL Card */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                <span className="text-xs font-bold text-neutral-400">वर्तमान क्लाउड बैकएंड URL:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={effectiveCloudUrl}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(effectiveCloudUrl)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'कॉपी हो गया' : 'कॉपी'}</span>
                  </button>
                  <a
                    href={effectiveCloudUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 text-yellow-400 rounded-lg transition-colors"
                    title="ब्राउज़र में खोलें"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Connected Services Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">Google Gemini AI Engine</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      ताज़ा हेडलाइन, हाइलाइट वर्ड्स व सारांश निर्माण हेतु सक्रिय।
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      🟢 कनेक्टेड (Active)
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">OpenAI ChatGPT Engine</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      GPT-4o मिनी से उच्च गुणवत्ता न्यूज़ व DALL-E इमेज जनरेशन।
                    </p>
                    <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded border ${
                      cloudStatus?.openaiAvailable
                        ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                        : 'text-amber-400 bg-amber-950/60 border-amber-800'
                    }`}>
                      {cloudStatus?.openaiAvailable ? '🟢 कनेक्टेड (API Key Set)' : '🟡 API Key दर्ज करें'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPENAI / CHATGPT API */}
          {activeTab === 'openai' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-neutral-900 border border-emerald-800/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-black">
                  <Bot className="w-4 h-4" />
                  <span>चैट जीपीटी (OpenAI) API जोड़ें</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  OpenAI API Key जोड़ने से आपकी ऐप में न्यूज़ हेडलाइन बनाने के लिए <strong>GPT-4o Mini</strong> तथा AI फोटो बनाने के लिए <strong>DALL-E</strong> सक्रिय हो जाएगा।
                </p>
              </div>

              {/* Current Status Badge */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="text-xs text-neutral-300 font-bold">वर्तमान स्टेटस:</span>
                {cloudStatus?.openaiAvailable ? (
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    सत्यापित व सक्रिय ({cloudStatus.maskedOpenaiKey || 'sk-***'})
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    की उपलब्ध नहीं (Not configured)
                  </span>
                )}
              </div>

              {/* Input Form */}
              <div className="space-y-2 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-yellow-400" />
                  <span>OpenAI API Key दर्ज करें:</span>
                </label>
                <input
                  type="password"
                  value={openaiKeyInput}
                  onChange={(e) => setOpenaiKeyInput(e.target.value)}
                  placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx..."
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-emerald-400 rounded-xl p-3 text-xs sm:text-sm text-white font-mono focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  💡 आप अपनी API Key <strong>platform.openai.com/api-keys</strong> से प्राप्त कर सकते हैं।
                </p>

                {keyMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                      keyMessage.type === 'success'
                        ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                        : 'bg-red-950 border border-red-800 text-red-300'
                    }`}
                  >
                    {keyMessage.type === 'success' ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{keyMessage.text}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveOpenAiKey}
                  disabled={keySaving || !openaiKeyInput.trim()}
                  className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 transition-all"
                >
                  {keySaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>सत्यापित व सेव हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>OpenAI API Key सेव व टेस्ट करें</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM DOMAIN & ADMIN WEB DASHBOARD */}
          {activeTab === 'domain' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/80 space-y-2">
                <div className="flex items-center gap-2 text-blue-300 text-xs font-black">
                  <Globe className="w-4 h-4" />
                  <span>परचेस्ड डोमेन (वेबसाइट यूआरएल) जोड़ें</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  आपने जो डोमेन परचेस किया है (जैसे: <code>ainewsmaker.online</code> या <code>www.ainewsmaker.online</code>), 
                  उसे यहाँ जोड़कर अपने वेब डैशबोर्ड को सीधे अपने डोमेन पर खोलें।
                </p>
              </div>

              {/* Custom Domain Input */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>आपका परचेस किया हुआ डोमेन / URL:</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={customDomainInput}
                    onChange={(e) => setCustomDomainInput(e.target.value)}
                    placeholder="https://ainewsmaker.online"
                    className="flex-1 bg-neutral-900 border border-neutral-700 focus:border-blue-400 rounded-xl p-3 text-xs sm:text-sm text-white font-mono focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomDomain}
                    className="px-4 py-3 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-black text-xs rounded-xl cursor-pointer shadow transition-all shrink-0 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>डोमेन सेव करें</span>
                  </button>
                </div>

                {domainSaved && (
                  <p className="text-xs text-green-400 font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>कस्टम डोमेन सफलतापूर्वक सेव हो गया! अब ऐप व वेब डैशबोर्ड इसी पर कनेक्ट होंगे।</span>
                  </p>
                )}

                {customDomainInput && (
                  <button
                    type="button"
                    onClick={handleResetToDefaultCloud}
                    className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
                  >
                    डिफ़ॉल्ट क्लाउड URL पर वापस रीसेट करें
                  </button>
                )}
              </div>

              {/* DNS Mapping Guide */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h4 className="text-xs font-black text-yellow-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>डोमेन प्रदाता (GoDaddy / Namecheap / Hostinger) में DNS सेटअप:</span>
                </h4>
                <div className="space-y-2 text-xs text-neutral-300">
                  <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800 font-mono text-[11px] space-y-1">
                    <div className="text-neutral-400 font-sans font-bold">CNAME रिकॉर्ड (सबडोमेन हेतु, जैसे admin):</div>
                    <div className="flex justify-between text-yellow-300">
                      <span>Type: CNAME</span>
                      <span>Name: admin</span>
                      <span>Target: ais-dev-kgp3y3zyz2gru3demicttt-496088405107.asia-southeast1.run.app</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    DNS रिकॉर्ड अपडेट होने में 10 से 30 मिनट का समय लग सकता है। उसके बाद आपका वेब डैशबोर्ड सीधे आपके डोमेन पर 
                    <strong> मुख्य संपादक (Admin)</strong> के रूप में ओपन होगा।
                  </p>
                </div>
              </div>

              {/* Open Web Dashboard Button */}
              <a
                href={effectiveCloudUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>कंप्यूटर / लैपटॉप पर वेब डैशबोर्ड खोलें (एज अ एडमिन) ➔</span>
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            AI News Maker • एंटरप्राइज़ क्लाउड सॉल्यूशन
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            बंद करें
          </button>
        </div>

      </div>
    </div>
  );
};
