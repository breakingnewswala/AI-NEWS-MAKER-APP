import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Check,
  Eye,
  Crown,
  Layers,
  Image as ImageIcon,
  Palette,
  RotateCcw,
  AlertTriangle,
  Upload,
  Layout,
  ExternalLink,
} from 'lucide-react';
import {
  getCustomFrames,
  saveCustomFrame,
  deleteCustomFrame,
  setActiveCustomFrameId,
  getActiveCustomFrameId,
  CustomFrameItem,
} from '../lib/customFramesManager';
import {
  getUserCustomTemplates,
  saveUserCustomTemplate,
  deleteUserCustomTemplate,
  UserCustomTemplate,
} from '../lib/userTemplatesManager';
import { AdminTemplatePlanManager } from './AdminTemplatePlanManager';
import { getUserSubscription, isUserAdmin } from '../lib/userPlanManager';

interface UserTemplateManagerProps {
  currentUser?: any;
  isAdmin?: boolean;
  onOpenStudioWithTemplate?: (templateId: string) => void;
  onClose?: () => void;
}

export const UserTemplateManager: React.FC<UserTemplateManagerProps> = ({
  currentUser,
  isAdmin = false,
  onOpenStudioWithTemplate,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'frames' | 'templates' | 'admin'>('frames');
  const [frames, setFrames] = useState<CustomFrameItem[]>([]);
  const [userTemplates, setUserTemplates] = useState<UserCustomTemplate[]>([]);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);

  // New Frame Creation State
  const [isAddingFrame, setIsAddingFrame] = useState(false);
  const [newFrameName, setNewFrameName] = useState('');
  const [newFrameAsset, setNewFrameAsset] = useState('');
  const [frameError, setFrameError] = useState('');

  // New Template Creation State
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBase, setNewTemplateBase] = useState('graphic_001');
  const [newTemplateLines, setNewTemplateLines] = useState(3);
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshData = () => {
    const email = currentUser?.email;
    setFrames(getCustomFrames(email));
    setUserTemplates(getUserCustomTemplates(email));
    setActiveFrameId(getActiveCustomFrameId());
  };

  useEffect(() => {
    refreshData();

    const handleFramesUpdate = () => refreshData();
    const handleTemplatesUpdate = () => refreshData();

    window.addEventListener('ai_news_custom_frames_updated', handleFramesUpdate);
    window.addEventListener('ai_news_user_templates_updated', handleTemplatesUpdate);

    return () => {
      window.removeEventListener('ai_news_custom_frames_updated', handleFramesUpdate);
      window.removeEventListener('ai_news_user_templates_updated', handleTemplatesUpdate);
    };
  }, [currentUser?.email]);

  // Frame Upload Handler
  const handleFrameFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFrameError('');
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const res = uploadEvent.target?.result as string;
      if (res) {
        setNewFrameAsset(res);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFrame = () => {
    if (!newFrameAsset) {
      setFrameError('कृपया 4:5 कस्टम फ्रेम इमेज फाइल (PNG) चुनें');
      return;
    }
    const name = newFrameName.trim() || 'कस्टम 4:5 फ्रेम';
    saveCustomFrame({
      userId: currentUser?.email || 'user',
      name,
      assetUrl: newFrameAsset,
    });
    setNewFrameName('');
    setNewFrameAsset('');
    setIsAddingFrame(false);
    refreshData();
    showToast(`✅ "${name}" कस्टम फ्रेम सफलतापूर्वक बनाई गई!`);
  };

  const handleDeleteFrame = (id: string, name: string) => {
    if (window.confirm(`क्या आप "${name}" कस्टम फ्रेम को डिलीट करना चाहते हैं?`)) {
      deleteCustomFrame(id);
      refreshData();
      showToast(`🗑️ "${name}" फ्रेम हटा दी गई`);
    }
  };

  const handleToggleActivateFrame = (id: string, name: string) => {
    const isCurrentlyActive = activeFrameId === id;
    const nextId = isCurrentlyActive ? null : id;
    setActiveCustomFrameId(nextId);
    setActiveFrameId(nextId);
    refreshData();
    showToast(isCurrentlyActive ? 'डिफ़ॉल्ट फ्रेम लागू की गई' : `✅ "${name}" फ्रेम सक्रिय की गई!`);
  };

  // Template Handlers
  const handleSaveTemplate = () => {
    const name = newTemplateName.trim() || 'कस्टम टेम्पलेट';
    saveUserCustomTemplate(
      {
        name,
        baseTemplateId: newTemplateBase,
        aspectRatio: '4:5',
        headlineMaxLines: newTemplateLines,
        description: newTemplateDesc || 'कस्टम डिज़ाइन टेम्पलेट',
        previewUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&q=80',
      },
      currentUser?.email
    );
    setNewTemplateName('');
    setNewTemplateDesc('');
    setIsAddingTemplate(false);
    refreshData();
    showToast(`✅ नया टेम्पलेट "${name}" सफलतापूर्वक बनाया गया!`);
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (window.confirm(`क्या आप "${name}" टेम्पलेट को डिलीट करना चाहते हैं?`)) {
      deleteUserCustomTemplate(id);
      refreshData();
      showToast(`🗑️ "${name}" टेम्पलेट हटा दिया गया`);
    }
  };

  const sub = getUserSubscription();
  const isVipOrPro = isAdmin || sub.tier === 'professional' || sub.tier === 'ultra';

  return (
    <div className="w-full bg-[#0a0f1d] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md">
            <Palette className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                टेम्प्लेट व कस्टम फ्रेम्स मैनेजर
              </h3>
              <span className="px-2 py-0.5 text-[10px] bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 rounded-full font-black flex items-center gap-1 shadow-sm">
                <Crown className="w-3 h-3 fill-current" />
                {isAdmin ? 'ADMIN' : sub.planName || 'PRO / VIP'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              अपनी बनाई हुई कस्टम फ्रेम्स व टेम्पलेट्स प्रबंधित करें, नए बनाएं या डिलीट करें
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="mx-4 mt-3 p-3 bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 px-4 pt-2 gap-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('frames')}
          className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'frames'
              ? 'border-purple-400 text-purple-300 font-black'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          मेरे कस्टम 4:5 फ्रेम्स ({frames.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'templates'
              ? 'border-purple-400 text-purple-300 font-black'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          मेरे टेम्प्लेट्स ({userTemplates.length})
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? 'border-red-400 text-red-300 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            एडमिन टियर एक्सेस कंट्रोल
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-6 flex-1">
        {/* ========================================================================= */}
        {/* TAB 1: CUSTOM 4:5 FRAMES                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'frames' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-950/20 p-3.5 rounded-xl border border-purple-500/20">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  कस्टम 4:5 फ्रेम्स लाइब्रेरी
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  अपनी बनाई या अपलोड की हुई फ्रेम्स देखें, हटाएं या सीधे स्टूडियो में लागू करें
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingFrame(!isAddingFrame)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition shadow-md"
              >
                <Plus className="w-4 h-4" />
                + नई कस्टम फ्रेम जोड़ें
              </button>
            </div>

            {/* Upload New Frame Drawer */}
            {isAddingFrame && (
              <div className="p-4 bg-slate-900 border border-purple-500/40 rounded-xl space-y-3 animate-in fade-in">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-purple-400" />
                  नई कस्टम 4:5 फ्रेम अपलोड करें
                </h5>

                {frameError && (
                  <div className="p-2 bg-red-950/50 border border-red-500 text-red-300 text-xs rounded-lg">
                    {frameError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      फ्रेम का नाम:
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. VIP ब्यूरो 4:5 फ्रेम"
                      value={newFrameName}
                      onChange={(e) => setNewFrameName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      4:5 ट्रांसपेरेंट PNG इमेज चुनें:
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFrameFileUpload}
                      className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-600 cursor-pointer"
                    />
                  </div>
                </div>

                {newFrameAsset && (
                  <div className="flex items-center gap-3 p-2 bg-slate-800/80 rounded-lg">
                    <img src={newFrameAsset} alt="Preview" className="w-12 h-15 object-contain bg-slate-950 rounded border border-purple-500/30" />
                    <span className="text-xs text-emerald-400">✓ इमेज तैयार है</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveFrame}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    सेव व लाइब्रेरी में जोड़ें
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingFrame(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer"
                  >
                    रद्द करें
                  </button>
                </div>
              </div>
            )}

            {/* List of Custom Frames */}
            {frames.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
                <ImageIcon className="w-8 h-8 text-purple-400 mx-auto opacity-50" />
                <p className="text-xs text-slate-400">आपने अभी तक कोई कस्टम फ्रेम नहीं बनाई है।</p>
                <button
                  type="button"
                  onClick={() => setIsAddingFrame(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + पहली कस्टम फ्रेम बनाएं
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {frames.map((cf) => {
                  const isActive = activeFrameId === cf.id;
                  return (
                    <div
                      key={cf.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                        isActive
                          ? 'border-purple-500 bg-purple-950/30 ring-1 ring-purple-500/50'
                          : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="w-full h-36 bg-slate-950 rounded-lg flex items-center justify-center overflow-hidden border border-slate-800 relative">
                          {cf.assetUrl ? (
                            <img src={cf.assetUrl} alt={cf.name} className="w-full h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-slate-600" />
                          )}
                          {isActive && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-neutral-950 text-[10px] font-black rounded-full shadow">
                              सक्रिय
                            </span>
                          )}
                        </div>

                        <div>
                          <h5 className="text-xs font-bold text-white truncate">{cf.name}</h5>
                          <span className="text-[10px] text-purple-300">रेशियो: 4:5 पोर्ट्रेट</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80 mt-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActivateFrame(cf.id, cf.name)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                            isActive
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isActive ? '✓ सक्रिय है' : 'लागू करें'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteFrame(cf.id, cf.name)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg cursor-pointer transition"
                          title="फ्रेम डिलीट करें"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY TEMPLATES (PRO & VIP)                                           */}
        {/* ========================================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-500/20">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layout className="w-4 h-4 text-indigo-400" />
                  मेरे कस्टमाइज्ड टेम्प्लेट्स
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  यहाँ आपके बनाए गए टेम्प्लेट दिखेंगे। आप उन्हें डिलीट भी कर सकते हैं और स्टूडियो में पुनः बना सकते हैं।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingTemplate(!isAddingTemplate)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition shadow-md"
              >
                <Plus className="w-4 h-4" />
                + नया टेम्पलेट बनाएं
              </button>
            </div>

            {/* Create New Template Drawer */}
            {isAddingTemplate && (
              <div className="p-4 bg-slate-900 border border-indigo-500/40 rounded-xl space-y-3 animate-in fade-in">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  नया टेम्पलेट सेटअप करें
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      टेम्पलेट का नाम:
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. दैनिक खास न्यूज़"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      बेस लेआउट स्टाइल:
                    </label>
                    <select
                      value={newTemplateBase}
                      onChange={(e) => setNewTemplateBase(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 outline-none focus:border-indigo-500"
                    >
                      <option value="graphic_001">Graphic 1 (क्लीन 4:5 फोटो न्यूज़)</option>
                      <option value="graphic_002">Graphic 2 (सुपर ब्रेकिंग न्यूज़)</option>
                      <option value="graphic_003">Graphic 3 (टेक्स्ट ब्रेकिंग कार्ड)</option>
                      <option value="graphic_004">Graphic 4 (VIP डेस्क विशेष 4K)</option>
                      <option value="graphic_morning">Morning Jacket (सुविचार व एस्थेटिक)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      हेडलाइन लाइन काउंट:
                    </label>
                    <select
                      value={newTemplateLines}
                      onChange={(e) => setNewTemplateLines(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 outline-none focus:border-indigo-500"
                    >
                      <option value={2}>2 लाइन्स हेडलाइन</option>
                      <option value={3}>3 लाइन्स हेडलाइन</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    विवरण / टैगलाइन (वैकल्पिक):
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. मुख्य प्राइम टाइम बुलेटिन हेतु"
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    सेव करें
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingTemplate(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer"
                  >
                    रद्द करें
                  </button>
                </div>
              </div>
            )}

            {/* List of User Templates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {userTemplates.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded">
                        4:5 पोर्ट्रेट • {t.headlineMaxLines} Lines
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString('hi-IN')}
                      </span>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-white">{t.name}</h5>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {t.description || 'कस्टम न्यूज़ कार्ड टेम्पलेट'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenStudioWithTemplate) {
                          onOpenStudioWithTemplate(t.baseTemplateId || 'graphic_001');
                        }
                      }}
                      className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      पुनः बनाएं (Studio)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(t.id, t.name)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg cursor-pointer transition"
                      title="टेम्पलेट डिलीट करें"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ADMIN ACCESS CONTROL (ADMIN ONLY)                                  */}
        {/* ========================================================================= */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-3">
            <AdminTemplatePlanManager isAdmin={true} onOpenStudioWithTemplate={onOpenStudioWithTemplate} />
          </div>
        )}
      </div>
    </div>
  );
};
