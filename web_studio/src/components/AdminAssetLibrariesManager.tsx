import React, { useState, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
  Edit2,
  Plus,
  Eye,
  Power,
  ShieldCheck,
  Search,
  Sparkles,
  MapPin,
  MessageSquare,
  Palette,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AssetLibraryItem } from '../types/dynamicFrame';
import {
  fetchAssetLibraries,
  saveAssetLibraryItem,
  updateAssetLibraryItem,
  deleteAssetLibraryItem,
} from '../lib/dynamicFramesManager';
import { getAuthToken } from '../lib/apiConfig';

interface AdminAssetLibrariesManagerProps {
  onSelectAsset?: (asset: AssetLibraryItem) => void;
}

export const AdminAssetLibrariesManager: React.FC<AdminAssetLibrariesManagerProps> = ({
  onSelectAsset,
}) => {
  const [activeTab, setActiveTab] = useState<'location_badge' | 'callout_png' | 'suvichar_background'>('location_badge');
  const [items, setItems] = useState<AssetLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // New Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newFileData, setNewFileData] = useState<string>('');
  const [newFileName, setNewFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Rename modal/inline state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<AssetLibraryItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAssetLibraries(activeTab);
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    setSearchQuery('');
    setCategoryFilter('all');
    setIsUploading(false);
  }, [activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('कृपया केवल इमेज फाइल (PNG/JPG) अपलोड करें।');
      return;
    }

    if (activeTab === 'location_badge' || activeTab === 'callout_png') {
      if (!file.type.includes('png')) {
        setUploadError('लोकेशन बैज और कॉलआउट के लिए ट्रांसपेरेंट PNG फाइल अनुशंसित है।');
      }
    }

    setNewFileName(file.name);
    setNewName(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    setUploadError('');

    const reader = new FileReader();
    reader.onload = () => {
      setNewFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAsset = async () => {
    if (!newName.trim()) {
      setUploadError('कृपया एसेट का नाम दर्ज करें।');
      return;
    }
    if (!newFileData) {
      setUploadError('कृपया इमेज फाइल चुनें।');
      return;
    }

    try {
      const token = getAuthToken();
      const res = await saveAssetLibraryItem(
        {
          name: newName.trim(),
          type: activeTab,
          category: newCategory,
          url: newFileData,
          enabled: true,
        },
        token || undefined
      );

      if (res.success && res.item) {
        setItems((prev) => [res.item!, ...prev]);
        setIsUploading(false);
        setNewName('');
        setNewFileData('');
        setNewFileName('');
        showToast('✅ एसेट सफलतापूर्वक लाइब्रेरी में जोड़ा गया!');
      } else {
        setUploadError(res.error || 'एसेट अपलोड में विफल');
      }
    } catch {
      setUploadError('सर्वर से कनेक्ट करने में त्रुटि');
    }
  };

  const handleToggleEnable = async (item: AssetLibraryItem) => {
    const newStatus = !item.enabled;
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, enabled: newStatus } : it))
    );
    try {
      const token = getAuthToken();
      await updateAssetLibraryItem(item.id, { enabled: newStatus }, token || undefined);
      showToast(newStatus ? '✅ एसेट सक्रिय किया गया' : '⚠️ एसेट निष्क्रिय किया गया');
    } catch {
      showToast('⚠️ स्थिति अपडेट करने में त्रुटि');
    }
  };

  const handleSaveRename = async (id: string) => {
    if (!editingName.trim()) return;
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, name: editingName.trim() } : it))
    );
    setEditingId(null);
    try {
      const token = getAuthToken();
      await updateAssetLibraryItem(id, { name: editingName.trim() }, token || undefined);
      showToast('✅ नाम अपडेट किया गया!');
    } catch {
      showToast('⚠️ नाम अपडेट विफल');
    }
  };

  const handleDeleteItem = async (item: AssetLibraryItem) => {
    if (!window.confirm(`क्या आप "${item.name}" को लाइब्रेरी से हटाना चाहते हैं?`)) {
      return;
    }
    try {
      const token = getAuthToken();
      const res = await deleteAssetLibraryItem(item.id, token || undefined);
      if (res.success) {
        setItems((prev) => prev.filter((it) => it.id !== item.id));
        showToast('🗑️ एसेट हटा दिया गया!');
      } else {
        alert(res.error || 'एसेट हटाने में विफल');
      }
    } catch {
      alert('सर्वर त्रुटि');
    }
  };

  const filteredItems = items.filter((it) => {
    if (categoryFilter !== 'all' && it.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        it.name.toLowerCase().includes(q) ||
        (it.category && it.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Library Tab Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>सेंट्रल एसेट लाइब्रेरीज़ (Central Reusable Asset Libraries)</span>
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              री-यूज़ेबल ग्राफिक्स
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            लोकेशन बैज, फुल स्टोरी कॉलआउट और सुविचार बैकग्राउंड्स को एक ही स्थान से अपलोड, सक्षम/अक्षम और प्रबंधित करें।
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsUploading(!isUploading);
            setUploadError('');
          }}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ नया {activeTab === 'location_badge' ? 'लोकेशन बैज' : activeTab === 'callout_png' ? 'कॉलआउट PNG' : 'सुविचार बैकग्राउंड'} जोड़ें</span>
        </button>
      </div>

      {/* 3 Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('location_badge')}
          className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'location_badge'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4 text-amber-300" />
          <span>1. लोकेशन बैज PNG लाइब्रेरी</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/40">
            {items.filter((it) => it.type === 'location_badge').length || (activeTab === 'location_badge' ? items.length : 4)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('callout_png')}
          className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'callout_png'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-indigo-300" />
          <span>2. स्टोरी कॉलआउट PNG लाइब्रेरी</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/40">
            {items.filter((it) => it.type === 'callout_png').length || (activeTab === 'callout_png' ? items.length : 3)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suvichar_background')}
          className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'suvichar_background'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Palette className="w-4 h-4 text-emerald-300" />
          <span>3. सुविचार बैकग्राउंड लाइब्रेरी</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/40">
            {items.filter((it) => it.type === 'suvichar_background').length || (activeTab === 'suvichar_background' ? items.length : 4)}
          </span>
        </button>
      </div>

      {/* Upload Drawer / Card */}
      {isUploading && (
        <div className="p-4 bg-slate-950/80 border border-amber-500/40 rounded-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-xs text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              <span>नया {activeTab === 'location_badge' ? 'लोकेशन बैज' : activeTab === 'callout_png' ? 'कॉलआउट' : 'बैकग्राउंड'} अपलोड करें</span>
            </h5>
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              रद्द करें ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">एसेट का नाम *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="उदा. क्लासिक रेड लोकेशन स्ट्रिप"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>

            {activeTab === 'suvichar_background' && (
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">श्रेणी (Category)</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="morning">प्रातः वंदना (Morning)</option>
                  <option value="spiritual">आध्यात्मिक (Spiritual)</option>
                  <option value="motivation">प्रेरणादायक (Motivation)</option>
                  <option value="general">सामान्य (General)</option>
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-4 text-center cursor-pointer relative bg-slate-900/40">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <span className="text-xs font-bold text-white block">
                  {newFileName ? `चयनित: ${newFileName}` : 'PNG / JPG इमेज चुनें या ड्रैग करें'}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {activeTab === 'location_badge' || activeTab === 'callout_png'
                    ? 'पारदर्शी (Transparent) PNG सर्वोत्तम परिणाम देती है'
                    : 'उच्च गुणवत्ता HD इमेज (1080x1350 या 1080x1920)'}
                </span>
              </div>
            </div>
          </div>

          {newFileData && (
            <div className="flex items-center gap-3 p-2 bg-slate-900 rounded-lg">
              <div className="w-16 h-16 rounded bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-1">
                <img src={newFileData} alt="Preview" className="w-full h-full object-contain" />
              </div>
              <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> इमेज तैयार है
              </div>
            </div>
          )}

          {uploadError && (
            <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-300">
              {uploadError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
            >
              रद्द करें
            </button>
            <button
              type="button"
              onClick={handleCreateAsset}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer shadow"
            >
              लाइब्रेरी में जोड़ें
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">कुल एसेट्स ({filteredItems.length})</span>
          {activeTab === 'suvichar_background' && (
            <div className="flex items-center gap-1">
              {['all', 'morning', 'spiritual', 'motivation', 'general'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                    categoryFilter === c
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {c === 'all' ? 'सभी' : c === 'morning' ? 'प्रातः' : c === 'spiritual' ? 'आध्यात्मिक' : c === 'motivation' ? 'प्रेरणा' : 'सामान्य'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="नाम या श्रेणी खोजें..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filteredItems.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <div
              key={item.id}
              className={`bg-slate-950/80 border rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-all group ${
                item.enabled ? 'border-slate-800 hover:border-amber-500/50' : 'border-slate-800/40 opacity-60'
              }`}
            >
              <div>
                {/* Visual Preview Box */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="w-full h-24 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-2 relative cursor-pointer group-hover:border-amber-500/40 transition"
                  title="बड़ा प्रीव्यू देखें"
                >
                  {item.url ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className={`w-full h-full ${activeTab === 'suvichar_background' ? 'object-cover' : 'object-contain'}`}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-700" />
                  )}
                  <span className="absolute top-1 right-1 p-1 rounded bg-slate-950/80 text-slate-300 opacity-0 group-hover:opacity-100 transition">
                    <Eye className="w-3 h-3" />
                  </span>
                </div>

                {/* Name / Rename Input */}
                <div className="mt-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full bg-slate-900 border border-amber-500 rounded px-1.5 py-0.5 text-[11px] text-white font-bold"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(item.id)}
                        className="p-1 bg-amber-500 text-slate-950 rounded cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="text-[11px] font-bold text-white truncate" title={item.name}>
                        {item.name}
                      </h5>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingName(item.name);
                        }}
                        className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer shrink-0"
                        title="नाम बदलें"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  {item.category && (
                    <span className="text-[9px] font-bold text-slate-400 capitalize block mt-0.5">
                      • {item.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleToggleEnable(item)}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    item.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                  title={item.enabled ? 'सक्रिय है' : 'निष्क्रिय है'}
                >
                  <Power className="w-2.5 h-2.5" />
                  <span>{item.enabled ? 'सक्रिय' : 'बंद'}</span>
                </button>

                <div className="flex items-center gap-1">
                  {onSelectAsset && (
                    <button
                      type="button"
                      onClick={() => onSelectAsset(item)}
                      className="p-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded text-[9px] font-bold transition cursor-pointer"
                      title="चुनें"
                    >
                      चुनें
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteDeleteItem(item)}
                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition cursor-pointer"
                    title="हटाएं"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 text-xs space-y-1">
          <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-bold text-slate-300">कोई एसेट नहीं मिला</p>
          <p className="text-[10px] text-slate-500">ऊपर दिए गए बटन से नया एसेट अपलोड करें।</p>
        </div>
      )}

      {/* Full Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>{previewItem.name}</span>
              </h4>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="w-full max-h-80 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-4">
              <img
                src={previewItem.url}
                alt={previewItem.name}
                className="max-w-full max-h-72 object-contain rounded"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>प्रकार: <strong className="text-white">{previewItem.type}</strong></span>
              <span>स्थिति: <strong className={previewItem.enabled ? 'text-emerald-400' : 'text-slate-500'}>{previewItem.enabled ? 'सक्रिय' : 'निष्क्रिय'}</strong></span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
