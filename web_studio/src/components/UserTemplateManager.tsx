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
  Search,
  CheckCircle2,
  X,
  Power,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Film,
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
import { AdminVideoTemplateControl } from './AdminVideoTemplateControl';
import {
  getUserSubscription,
  isUserAdmin,
  getPlanUsers,
  assignCustomHeaderFooterToUser,
  getAssignedCustomHeaderFooter,
  PlanUserRecord,
} from '../lib/userPlanManager';

interface UserTemplateManagerProps {
  currentUser?: any;
  isAdmin?: boolean;
  defaultTab?: 'frames' | 'templates' | 'admin' | 'custom_hf';
  onOpenStudioWithTemplate?: (templateId: string) => void;
  onClose?: () => void;
}

export const UserTemplateManager: React.FC<UserTemplateManagerProps> = ({
  currentUser,
  isAdmin = false,
  defaultTab,
  onOpenStudioWithTemplate,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'frames' | 'templates' | 'admin' | 'custom_hf'>(
    defaultTab || (isAdmin ? 'admin' : 'frames')
  );
  const [frames, setFrames] = useState<CustomFrameItem[]>([]);
  const [userTemplates, setUserTemplates] = useState<UserCustomTemplate[]>([]);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);

  // Custom Header & Footer Approval State (Part L)
  const [planUsers, setPlanUsers] = useState<PlanUserRecord[]>(() => (typeof window !== 'undefined' ? getPlanUsers() : []));
  const [assignUserEmail, setAssignUserEmail] = useState('');
  const [assignHeaderUrl, setAssignHeaderUrl] = useState('');
  const [assignFooterUrl, setAssignFooterUrl] = useState('');
  const [assignCustomActive, setAssignCustomActive] = useState(true);
  const [assignCustomMsg, setAssignCustomMsg] = useState('');
  const [hfSearch, setHfSearch] = useState('');
  const [previewUserHF, setPreviewUserHF] = useState<{
    user: PlanUserRecord;
    headerUrl: string;
    footerUrl: string;
    active: boolean;
  } | null>(null);

  // Admin Section Accordion States (Part 15) - Collapsed by default
  const [isGraphicsExpanded, setIsGraphicsExpanded] = useState(false);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [isApprovalExpanded, setIsApprovalExpanded] = useState(false);

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

  const handleSelectUserForCustomHF = (email: string) => {
    setAssignUserEmail(email);
    if (!email) {
      setAssignHeaderUrl('');
      setAssignFooterUrl('');
      setAssignCustomActive(true);
      return;
    }
    const current = getAssignedCustomHeaderFooter(email);
    if (current) {
      setAssignHeaderUrl(current.headerUrl || '');
      setAssignFooterUrl(current.footerUrl || '');
      setAssignCustomActive(current.active !== false);
    } else {
      let profileHF: any = null;
      try {
        const pStr = localStorage.getItem(`user_profile_${email.toLowerCase().trim()}`);
        if (pStr) profileHF = JSON.parse(pStr);
      } catch {}
      setAssignHeaderUrl(profileHF?.customHeaderPng || '');
      setAssignFooterUrl(profileHF?.customFooterPng || '');
      setAssignCustomActive(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'header' | 'footer') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (target === 'header') setAssignHeaderUrl(dataUrl);
      else if (target === 'footer') setAssignFooterUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAssignCustomHeaderFooter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserEmail.trim()) {
      setAssignCustomMsg('❌ कृपया सूची से यूज़र चुनें!');
      return;
    }
    const success = assignCustomHeaderFooterToUser(assignUserEmail.trim(), {
      headerUrl: assignHeaderUrl.trim(),
      footerUrl: assignFooterUrl.trim(),
      active: assignCustomActive,
    });
    if (success) {
      setPlanUsers(getPlanUsers());
      setAssignCustomMsg(`✅ ${assignUserEmail.trim()} के लिए Custom Header/Footer सफलतापूर्वक असाइन व अपडेट हो गया!`);
      setTimeout(() => setAssignCustomMsg(''), 5000);
    } else {
      setAssignCustomMsg('❌ यूज़र रिकॉर्ड नहीं मिला!');
    }
  };

  const handleApproveCustomHF = (email: string, headerUrl: string, footerUrl: string) => {
    const success = assignCustomHeaderFooterToUser(email, {
      headerUrl,
      footerUrl,
      active: true,
    });
    if (success) {
      setPlanUsers(getPlanUsers());
      showToast(`✅ ${email} का कस्टम हेडर/फुटर स्वीकृत (Approved) हो गया!`);
      if (previewUserHF && previewUserHF.user.email === email) {
        setPreviewUserHF({ ...previewUserHF, active: true });
      }
    }
  };

  const handleRejectCustomHF = (email: string) => {
    const success = assignCustomHeaderFooterToUser(email, {
      headerUrl: '',
      footerUrl: '',
      active: false,
    });
    if (success) {
      setPlanUsers(getPlanUsers());
      showToast(`❌ ${email} का कस्टम हेडर/फुटर अस्वीकृत (Rejected) कर दिया गया`);
      if (previewUserHF && previewUserHF.user.email === email) {
        setPreviewUserHF(null);
      }
    }
  };

  const sub = getUserSubscription();
  const isVipOrPro = isAdmin || sub.tier === 'professional' || sub.tier === 'ultra';

  return (
    <div className={`w-full ${isAdmin ? 'space-y-6 text-slate-100' : 'bg-[#0a0f1d] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100'}`}>
      {/* Header - Only shown for non-admin custom template manager */}
      {!isAdmin && (
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
                  {sub.planName || 'PRO / VIP'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                अपनी बनाई हुई कस्टम फ्रेम्स व टेम्पलेट्स प्रबंधित करें, नए बनाएं या लागू करें
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
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="mx-4 mt-3 p-3 bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* User Tabs (non-admin only) */}
      {!isAdmin && (
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
            मेरे कस्टम्स ({frames.length})
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
            मेरे टेम्पलेट्स ({userTemplates.length})
          </button>
        </div>
      )}

      {/* Content */}
      <div className={isAdmin ? 'space-y-6 w-full' : 'p-4 sm:p-6 space-y-6 flex-1'}>
        {/* USER TEMPLATES & FRAMES (Part 16: non-admins only) */}
        {!isAdmin && (
          <>
            {!isVipOrPro && (
              <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 text-amber-200 text-xs">
                <div className="flex items-center gap-2.5">
                  <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    कस्टम 4:5 फ्रेम्स व टेम्पलेट्स बनाने की सुविधा केवल <strong>PRO</strong> व <strong>VIP DESK</strong> यूज़र्स के लिए उपलब्ध है। (वर्तमान प्लान: {sub.planName || 'BASIC'})
                  </span>
                </div>
              </div>
            )}

            {/* TAB 1: CUSTOM 4:5 FRAMES */}
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
                {frames.map((cf, index) => {
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
                          <h5 className="text-xs font-bold text-white truncate">फ्रेम #{index + 1}: {cf.name}</h5>
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
              {userTemplates.map((t, index) => (
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
                      <h5 className="text-xs font-bold text-white">फ्रेम #{index + 1}: {t.name}</h5>
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
        </>
      )}

      {/* ========================================================================= */}
      {/* ADMIN TEMPLATE MANAGER: 3 EXPAND/COLLAPSE SECTIONS (PART 15)              */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="space-y-6 animate-in fade-in">
          {/* Phase 5: Mobile Single-Row 3 Controls + Details Section Below */}
          <div className="md:hidden space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsGraphicsExpanded(!isGraphicsExpanded);
                  setIsVideoExpanded(false);
                  setIsApprovalExpanded(false);
                }}
                className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition shadow-xs cursor-pointer ${
                  isGraphicsExpanded
                    ? 'bg-purple-600 text-white border-purple-400 font-black shadow-md'
                    : 'bg-slate-900 text-purple-300 border-purple-500/30'
                }`}
              >
                <Layout className="w-4 h-4" />
                <span className="text-[11px] font-bold leading-tight">ग्राफिक टेम्पलेट</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVideoExpanded(!isVideoExpanded);
                  setIsGraphicsExpanded(false);
                  setIsApprovalExpanded(false);
                }}
                className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition shadow-xs cursor-pointer ${
                  isVideoExpanded
                    ? 'bg-amber-600 text-white border-amber-400 font-black shadow-md'
                    : 'bg-slate-900 text-amber-300 border-amber-500/30'
                }`}
              >
                <Film className="w-4 h-4" />
                <span className="text-[11px] font-bold leading-tight">वीडियो टेम्पलेट</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsApprovalExpanded(!isApprovalExpanded);
                  setIsGraphicsExpanded(false);
                  setIsVideoExpanded(false);
                }}
                className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition shadow-xs cursor-pointer ${
                  isApprovalExpanded
                    ? 'bg-indigo-600 text-white border-indigo-400 font-black shadow-md'
                    : 'bg-slate-900 text-indigo-300 border-indigo-500/30'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="text-[11px] font-bold leading-tight">ऐड अप्रूवल</span>
              </button>
            </div>

            {/* Additional Details (Pro, VIP Desk, 9:16) placed in separate section below */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-b border-slate-800/80 pb-1.5">
                <span>एक्सेस व फॉर्मेट विवरण:</span>
                <span className="text-amber-400 font-bold">PRO & VIP DESK</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div className="text-purple-300">• 8 ग्राफिक श्रेणियां</div>
                <div className="text-amber-300">• 9:16, 1:1, 4:5 वीडियो</div>
                <div className="text-indigo-300">• कस्टम हेडर/फुटर</div>
                <div className="text-emerald-300">• VIP Desk अप्रूवल</div>
              </div>
            </div>
          </div>

          {/* Desktop 3-Section Collapsible Layout */}
          <div className="hidden md:block space-y-6">
          {/* 15.1 SECTION 1: Graphics Template Control */}
          <div id="admin-graphics-section" className="border border-purple-500/30 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl">
            <button
              type="button"
              onClick={() => setIsGraphicsExpanded(!isGraphicsExpanded)}
              className="w-full p-4 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 flex items-center justify-between text-left hover:bg-slate-800/80 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-600/30 border border-purple-500/50 text-purple-300">
                  <Layout className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">A. Graphic Template Control</h4>
                    <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 font-bold rounded-full border border-purple-500/40">
                      8 श्रेणियाँ • टियर एक्सेस
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Regular, Package, Super Breaking, Text Breaking, बयानबाज़ी, Special, Bonus, Custom फ्रेम्स व प्लान एक्सेस
                  </p>
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                {isGraphicsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>
            {isGraphicsExpanded && (
              <div className="p-4 sm:p-6 border-t border-purple-500/20 bg-slate-950/40 animate-in fade-in">
                <AdminTemplatePlanManager isAdmin={true} onOpenStudioWithTemplate={onOpenStudioWithTemplate} />
              </div>
            )}
          </div>

          {/* 15.2 SECTION B: Video Template Control */}
          <div id="admin-video-section" className="border border-amber-500/30 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl">
            <button
              type="button"
              onClick={() => setIsVideoExpanded(!isVideoExpanded)}
              className="w-full p-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-yellow-950/80 flex items-center justify-between text-left hover:bg-slate-800/80 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-600/30 border border-amber-500/50 text-amber-300">
                  <Film className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">B. Video Template Control</h4>
                    <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 font-bold rounded-full border border-amber-500/40">
                      9:16, 1:1, 4:3, 4:5 • कॉइन व टियर
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    वीडियो फ्रेम अनुपात, हेडलाइन लाइन्स (2/3), Full/Core विज़िबिलिटी व टियर पात्रता कॉन्फ़िगर करें
                  </p>
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                {isVideoExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>
            {isVideoExpanded && (
              <div className="p-4 sm:p-6 border-t border-amber-500/20 bg-slate-950/40 animate-in fade-in">
                <AdminVideoTemplateControl />
              </div>
            )}
          </div>

          {/* 15.3 SECTION C: Custom Ad Reporter Approval */}
          <div id="custom-hf-approval-section" className="border border-indigo-500/30 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl">
            <button
              type="button"
              onClick={() => setIsApprovalExpanded(!isApprovalExpanded)}
              className="w-full p-4 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 flex items-center justify-between text-left hover:bg-slate-800/80 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-300">
                  <Layers className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">C. Custom Ad Reporter Approval</h4>
                    <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 font-bold rounded-full border border-indigo-500/40">
                      PRO & VIP DESK अप्रूवल
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    यूज़र्स द्वारा सबमिट किए गए ग्राफिक्स व वीडियो कस्टम हेडर/फुटर की समीक्षा व अप्रूवल
                  </p>
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                {isApprovalExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>
            {isApprovalExpanded && (
              <div className="p-4 sm:p-6 border-t border-indigo-500/20 bg-slate-950/40 animate-in fade-in space-y-6">
            {/* Header info card */}
            <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/40 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/30">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">
                    कस्टम हेडर व फुटर अप्रूवल व असाइनमेंट (Custom Header & Footer Manager)
                  </h4>
                  <p className="text-xs text-purple-200 mt-0.5">
                    PRO व VIP DESK यूज़र्स के कस्टम हेडर एवं फुटर ग्राफिक्स की समीक्षा करें, लाइव 4:5 कार्ड प्रीव्यू देखें व एक क्लिक में अप्रूव/रिजेक्ट करें।
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-purple-900/80 text-purple-300 border border-purple-500/40 text-[11px] font-black rounded-lg shrink-0">
                PRO & VIP DESK EXCLUSIVE
              </span>
            </div>

            {/* Direct Assignment Form Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <h5 className="text-sm font-black text-white">यूज़र को नया कस्टम हेडर / फुटर असाइन करें</h5>
                </div>
                <span className="text-xs text-slate-400 font-mono">कुल यूज़र्स: {planUsers.length}</span>
              </div>

              {assignCustomMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{assignCustomMsg}</span>
                </div>
              )}

              <form onSubmit={handleAssignCustomHeaderFooter} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* User Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                      <span>1. यूज़र चुनें (Select User) *</span>
                    </label>
                    <select
                      value={assignUserEmail}
                      onChange={(e) => handleSelectUserForCustomHF(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer font-bold"
                      required
                    >
                      <option value="">-- यूज़र चुनें --</option>
                      <optgroup label="पात्र यूज़र्स (PRO & VIP DESK)">
                        {planUsers
                          .filter((u) => u.tier === 'professional' || u.tier === 'ultra' || u.role === 'admin')
                          .map((u, idx) => (
                            <option key={`${u.email}-${idx}`} value={u.email}>
                              ⭐ {u.name ? `${u.name} (${u.email})` : u.email} — [{u.tier ? u.tier.toUpperCase() : 'PRO'}]
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="अन्य यूज़र्स">
                        {planUsers
                          .filter((u) => u.tier !== 'professional' && u.tier !== 'ultra' && u.role !== 'admin')
                          .map((u, idx) => (
                            <option key={`${u.email}-${idx}`} value={u.email}>
                              {u.name ? `${u.name} (${u.email})` : u.email}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Header Image */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                      <span>2. Custom Header (PNG)</span>
                      {assignHeaderUrl && (
                        <button
                          type="button"
                          onClick={() => setAssignHeaderUrl('')}
                          className="text-[10px] text-red-400 hover:underline cursor-pointer"
                        >
                          हटाएँ
                        </button>
                      )}
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={assignHeaderUrl}
                        onChange={(e) => setAssignHeaderUrl(e.target.value)}
                        placeholder="Header URL या अपलोड करें..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition">
                          <Upload className="w-3.5 h-3.5 text-purple-400" />
                          <span>हेडर अपलोड</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) => handleFileUpload(e, 'header')}
                            className="hidden"
                          />
                        </label>
                        {assignHeaderUrl && (
                          <div className="w-10 h-7 rounded border border-purple-500/50 overflow-hidden bg-slate-950 shrink-0">
                            <img src={assignHeaderUrl} alt="Header" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Image */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                      <span>3. Custom Footer (PNG)</span>
                      {assignFooterUrl && (
                        <button
                          type="button"
                          onClick={() => setAssignFooterUrl('')}
                          className="text-[10px] text-red-400 hover:underline cursor-pointer"
                        >
                          हटाएँ
                        </button>
                      )}
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={assignFooterUrl}
                        onChange={(e) => setAssignFooterUrl(e.target.value)}
                        placeholder="Footer URL या अपलोड करें..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition">
                          <Upload className="w-3.5 h-3.5 text-purple-400" />
                          <span>फुटर अपलोड</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) => handleFileUpload(e, 'footer')}
                            className="hidden"
                          />
                        </label>
                        {assignFooterUrl && (
                          <div className="w-10 h-7 rounded border border-purple-500/50 overflow-hidden bg-slate-950 shrink-0">
                            <img src={assignFooterUrl} alt="Footer" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">स्थिति:</span>
                    <button
                      type="button"
                      onClick={() => setAssignCustomActive(!assignCustomActive)}
                      className={`px-3 py-1 rounded-xl text-xs font-black border transition flex items-center gap-1.5 cursor-pointer ${
                        assignCustomActive
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Power className={`w-3 h-3 ${assignCustomActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{assignCustomActive ? 'Active (सक्रिय)' : 'Inactive (निष्क्रिय)'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {assignHeaderUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const matched = planUsers.find((u) => u.email === assignUserEmail) || { email: assignUserEmail, name: 'यूज़र' };
                          setPreviewUserHF({
                            user: matched as any,
                            headerUrl: assignHeaderUrl,
                            footerUrl: assignFooterUrl,
                            active: assignCustomActive,
                          });
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>लाइव प्रिव्यू देखें</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>कस्टम हेडर/फुटर सेव करें</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Review List & Approvals Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h5 className="text-base font-black text-white">कस्टम हेडर / फुटर समीक्षा एवं अनुमोदन सूची</h5>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hfSearch}
                    onChange={(e) => setHfSearch(e.target.value)}
                    placeholder="यूज़र नाम या ईमेल खोजें..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Table of Users with Custom HF */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">यूज़र विवरण</th>
                      <th className="p-3">प्लान टियर</th>
                      <th className="p-3 text-center">हेडर इमेज</th>
                      <th className="p-3 text-center">फुटर इमेज</th>
                      <th className="p-3 text-center">स्थिति</th>
                      <th className="p-3 text-right">कार्रवाई (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {(() => {
                      const list = planUsers
                        .map((u) => {
                          const assigned = getAssignedCustomHeaderFooter(u.email);
                          let profileHF: any = null;
                          try {
                            const pStr = localStorage.getItem(`user_profile_${u.email.toLowerCase().trim()}`);
                            if (pStr) profileHF = JSON.parse(pStr);
                          } catch {}
                          const headerUrl = assigned?.headerUrl || profileHF?.customHeaderPng || '';
                          const footerUrl = assigned?.footerUrl || profileHF?.customFooterPng || '';
                          const hasHF = !!(headerUrl || footerUrl);
                          const active = assigned ? assigned.active !== false : hasHF;
                          const isPending = hasHF && !assigned;
                          return {
                            user: u,
                            headerUrl,
                            footerUrl,
                            hasHF,
                            active,
                            isPending,
                          };
                        })
                        .filter((item) => {
                          if (!hfSearch.trim()) return item.hasHF || item.user.tier === 'ultra' || item.user.tier === 'professional';
                          const q = hfSearch.toLowerCase();
                          return (
                            (item.user.name || '').toLowerCase().includes(q) ||
                            (item.user.email || '').toLowerCase().includes(q) ||
                            (item.user.username || '').toLowerCase().includes(q)
                          );
                        });

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                              कोई कस्टम हेडर / फुटर रिकॉर्ड नहीं मिला। ऊपर दिए गए फॉर्म से किसी भी यूज़र को असाइन करें।
                            </td>
                          </tr>
                        );
                      }

                      return list.map((item, idx) => (
                        <tr key={`${item.user.email}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-white text-xs">{item.user.name || 'यूज़र'}</div>
                            {item.user.username && (
                              <div className="text-[11px] font-mono text-amber-300">
                                {item.user.username.startsWith('@') ? item.user.username : `@${item.user.username}`}
                              </div>
                            )}
                            <div className="text-[10px] font-mono text-slate-400">{item.user.email}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              item.user.tier === 'ultra' ? 'bg-purple-950 text-purple-300 border border-purple-500' :
                              item.user.tier === 'professional' ? 'bg-amber-950 text-amber-300 border border-amber-500' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {item.user.tier ? item.user.tier.toUpperCase() : 'BASIC'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {item.headerUrl ? (
                              <div
                                onClick={() => setPreviewUserHF(item)}
                                className="w-14 h-8 mx-auto rounded border border-purple-500/40 bg-slate-950 p-0.5 overflow-hidden cursor-pointer hover:scale-105 transition"
                                title="क्लिक करके बड़ा प्रिव्यू देखें"
                              >
                                <img src={item.headerUrl} alt="Header" className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {item.footerUrl ? (
                              <div
                                onClick={() => setPreviewUserHF(item)}
                                className="w-14 h-8 mx-auto rounded border border-purple-500/40 bg-slate-950 p-0.5 overflow-hidden cursor-pointer hover:scale-105 transition"
                                title="क्लिक करके बड़ा प्रिव्यू देखें"
                              >
                                <img src={item.footerUrl} alt="Footer" className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {item.isPending ? (
                              <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500 rounded text-[10px] font-bold">
                                ⏳ लंबित (Pending)
                              </span>
                            ) : item.active ? (
                              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500 rounded text-[10px] font-bold">
                                ✓ सक्रिय (Active)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[10px]">
                                ✕ निष्क्रिय (Inactive)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.hasHF && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewUserHF(item)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition"
                                  title="4:5 कार्ड फ्रेम में लाइव प्रिव्यू देखें"
                                >
                                  <Eye className="w-3 h-3 text-blue-400" />
                                  <span>प्रिव्यू</span>
                                </button>
                              )}
                              {item.hasHF && !item.active && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveCustomHF(item.user.email, item.headerUrl, item.footerUrl)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded-lg shadow flex items-center gap-1 cursor-pointer transition active:scale-95"
                                  title="हेडर/फुटर स्वीकृत करें"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>स्वीकृत (Approve)</span>
                                </button>
                              )}
                              {item.hasHF && item.active && (
                                <button
                                  type="button"
                                  onClick={() => handleRejectCustomHF(item.user.email)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-[11px] font-bold rounded-lg border border-slate-700 cursor-pointer transition"
                                  title="अस्वीकृत या निष्क्रिय करें"
                                >
                                  <X className="w-3 h-3" />
                                  <span>अस्वीकृत</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleSelectUserForCustomHF(item.user.email)}
                                className="px-2 py-1 bg-purple-950/60 hover:bg-purple-900 text-purple-300 text-[11px] font-bold rounded-lg border border-purple-500/40 cursor-pointer transition"
                                title="एडिट फॉर्म में लोड करें"
                              >
                                एडिट
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Frame Live Preview Modal */}
            {previewUserHF && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border-2 border-purple-500/60 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-purple-400" />
                      <div>
                        <h4 className="text-sm font-black text-white">4:5 कार्ड लाइव फ्रेम प्रिव्यू</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{previewUserHF.user.email}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewUserHF(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 4:5 Aspect Ratio Card Mockup */}
                  <div className="relative aspect-[4/5] w-full max-w-[280px] mx-auto rounded-xl overflow-hidden border-2 border-amber-500/40 shadow-2xl flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
                    {/* Top Custom Header */}
                    <div className="w-full bg-slate-950/80 border-b border-slate-800 flex items-center justify-center min-h-[44px]">
                      {previewUserHF.headerUrl ? (
                        <img src={previewUserHF.headerUrl} alt="Header" className="w-full h-12 object-contain" />
                      ) : (
                        <div className="text-[10px] font-bold text-slate-500 py-2">[डिफ़ॉल्ट हेडर]</div>
                      )}
                    </div>

                    {/* Middle Sample News Content */}
                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-center text-center">
                      <div className="inline-block mx-auto px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase">
                        ब्रेकिंग न्यूज़
                      </div>
                      <h4 className="text-xs font-black text-white leading-tight">
                        {previewUserHF.user.name || 'चैनल'} का कस्टम डिज़ाइन कार्ड प्रिव्यू
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-2">
                        कस्टम हेडर व फुटर ग्राफ़िक्स न्यूज़ कार्ड पर इस प्रकार प्रदर्शित होंगे।
                      </p>
                    </div>

                    {/* Bottom Custom Footer */}
                    <div className="w-full bg-slate-950/80 border-t border-slate-800 flex items-center justify-center min-h-[44px]">
                      {previewUserHF.footerUrl ? (
                        <img src={previewUserHF.footerUrl} alt="Footer" className="w-full h-12 object-contain" />
                      ) : (
                        <div className="text-[10px] font-bold text-slate-500 py-2">[डिफ़ॉल्ट फुटर]</div>
                      )}
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPreviewUserHF(null)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      बंद करें
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRejectCustomHF(previewUserHF.user.email)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/80 text-rose-300 border border-slate-700 text-xs font-bold rounded-xl cursor-pointer transition"
                      >
                        अस्वीकृत (Reject)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveCustomHF(previewUserHF.user.email, previewUserHF.headerUrl, previewUserHF.footerUrl)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-1 cursor-pointer transition active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>स्वीकृत करें (Approve)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
