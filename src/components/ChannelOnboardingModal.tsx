import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  Crop,
  CheckCircle2,
  Globe,
  Phone,
  User,
  Tv,
  Check,
  Image as ImageIcon,
  Film,
  AlertCircle,
  Eye,
  EyeOff,
  AtSign,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { ChannelProfile } from '../types';
import { LogoCropperModal } from './LogoCropperModal';
import { checkAccountUniqueness } from '../lib/userPlanManager';
import { getAllIndianStates, getDistrictsForState, inferStateFromDistrict } from '../data/indianStatesDistricts';

interface ChannelOnboardingModalProps {
  isOpen: boolean;
  initialProfile?: Partial<ChannelProfile>;
  userName?: string;
  onSaveProfile: (profile: ChannelProfile) => void;
  onClose?: () => void;
  isClosable?: boolean;
}

export const ChannelOnboardingModal: React.FC<ChannelOnboardingModalProps> = ({
  isOpen,
  initialProfile,
  userName = '',
  onSaveProfile,
  onClose,
  isClosable = false,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState<string>(initialProfile?.fullName || userName || '');
  const [channelNameHi, setChannelNameHi] = useState<string>(
    initialProfile?.channelNameHi || 'एआई न्यूज़ मेकर'
  );
  const [channelNameEn, setChannelNameEn] = useState<string>(
    initialProfile?.channelNameEn || 'AI News Maker'
  );
  const [userState, setUserState] = useState<string>(
    initialProfile?.state || inferStateFromDistrict(initialProfile?.district || '') || 'मध्य प्रदेश'
  );
  const [district, setDistrict] = useState<string>(
    initialProfile?.district || ''
  );
  const [city, setCity] = useState<string>(
    initialProfile?.city || ''
  );
  const [channelLogoUrl, setChannelLogoUrl] = useState<string>(
    initialProfile?.channelLogoUrl || ''
  );
  const [channelLogoPngUrl, setChannelLogoPngUrl] = useState<string>(
    initialProfile?.channelLogoPngUrl || (initialProfile?.channelLogoType !== 'gif' ? initialProfile?.channelLogoUrl || '' : '')
  );
  const [channelLogoGifUrl, setChannelLogoGifUrl] = useState<string>(
    initialProfile?.channelLogoGifUrl || (initialProfile?.channelLogoType === 'gif' ? initialProfile?.channelLogoUrl || '' : '')
  );
  const [channelLogoType, setChannelLogoType] = useState<'png' | 'gif'>(
    initialProfile?.channelLogoType || 'png'
  );

  // Social Icons to show (Strictly 5 platforms: YouTube, Facebook, Instagram, X, LinkedIn)
  const [socialIcons, setSocialIcons] = useState<{
    youtube: boolean;
    facebook: boolean;
    instagram: boolean;
    twitter: boolean;
    linkedin: boolean;
  }>({
    youtube: initialProfile?.socialIcons?.youtube ?? true,
    facebook: initialProfile?.socialIcons?.facebook ?? true,
    instagram: initialProfile?.socialIcons?.instagram ?? true,
    twitter: initialProfile?.socialIcons?.twitter ?? false,
    linkedin: initialProfile?.socialIcons?.linkedin ?? false,
  });

  // Username: Auto initialized from English channel name
  const [username, setUsername] = useState<string>(
    initialProfile?.username || ''
  );
  const [isUsernameCustomized, setIsUsernameCustomized] = useState<boolean>(false);

  // Mobile number & visibility
  const [mobileNumber, setMobileNumber] = useState<string>(
    initialProfile?.mobileNumber || ''
  );
  const [showMobileNumber, setShowMobileNumber] = useState<boolean>(
    initialProfile?.showMobileNumber ?? true
  );

  // Website address & visibility
  const [websiteUrl, setWebsiteUrl] = useState<string>(
    initialProfile?.websiteUrl || ''
  );
  const [showWebsite, setShowWebsite] = useState<boolean>(
    initialProfile?.showWebsite ?? true
  );

  // Logo Cropper Modal State
  const [cropperRawImage, setCropperRawImage] = useState<string>('');
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Auto-sync username from English Channel name unless customized
  useEffect(() => {
    if (!isUsernameCustomized && channelNameEn) {
      const generated = channelNameEn
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
      if (generated) {
        setUsername(generated);
      }
    }
  }, [channelNameEn, isUsernameCustomized]);

  if (!isOpen) return null;

  // Clean website input automatically
  const handleWebsiteChange = (val: string) => {
    let clean = val.trim();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/i, '');
    clean = clean.replace(/\/+$/, ''); // remove trailing slashes
    setWebsiteUrl(clean);
  };

  // Handle PNG Logo file selection
  const handlePngUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setChannelLogoPngUrl(result);
      setChannelLogoUrl(result);
      setChannelLogoType('png');
      if (file.type.includes('jpeg') || file.type.includes('jpg')) {
        setCropperRawImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle GIF Logo file selection (Preserves existing PNG!)
  const handleGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setChannelLogoGifUrl(result);
      setChannelLogoUrl(result);
      setChannelLogoType('gif');
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = handlePngUpload;

  const handleSwitchLogoType = (type: 'png' | 'gif') => {
    setChannelLogoType(type);
    if (type === 'gif') {
      if (channelLogoGifUrl) setChannelLogoUrl(channelLogoGifUrl);
    } else {
      if (channelLogoPngUrl) setChannelLogoUrl(channelLogoPngUrl);
    }
  };

  const handleOpenCropper = () => {
    if (channelLogoUrl) {
      setCropperRawImage(channelLogoUrl);
      setIsCropperOpen(true);
    }
  };

  const toggleSocialIcon = (key: keyof typeof socialIcons) => {
    setSocialIcons((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    const finalFullName = (fullName || userName || '').trim();
    const finalHi = channelNameHi.trim();
    const finalEn = channelNameEn.trim();
    const finalUser = (username || finalEn || finalHi).replace(/^@/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    setErrorMsg('');

    if (!finalHi && !finalFullName) {
      setErrorMsg('कृपया अपना नाम एवं चैनल का नाम दर्ज करें।');
      return;
    }

    // Check account uniqueness and restricted brands
    if (finalUser) {
      const uniqCheck = checkAccountUniqueness({
        username: finalUser,
        websiteUrl: websiteUrl.trim(),
        channelName: finalHi,
        currentEmail: (initialProfile as any)?.email,
        mobileNumber: mobileNumber.trim(),
      });
      if (!uniqCheck.valid) {
        setErrorMsg(uniqCheck.error || 'यह यूज़रनेम, वेबसाइट या चैनल नाम उपयोग नहीं किया जा सकता!');
        return;
      }
    }

    const profile: ChannelProfile = {
      fullName: finalFullName,
      channelNameHi: finalHi,
      channelNameEn: finalEn,
      state: userState,
      district: district.trim(),
      city: city.trim(),
      channelLogoUrl: channelLogoUrl || channelLogoPngUrl || channelLogoGifUrl || '',
      channelLogoPngUrl,
      channelLogoGifUrl,
      channelLogoType,
      socialIcons,
      username: finalUser,
      mobileNumber: mobileNumber.trim(),
      showMobileNumber,
      websiteUrl: websiteUrl.trim(),
      showWebsite,
    };

    try {
      localStorage.setItem('user_channel_profile', JSON.stringify(profile));
      localStorage.setItem('app_channel_name', profile.channelNameHi);
      localStorage.setItem('app_channel_name_en', profile.channelNameEn);
      localStorage.setItem('is_onboarding_completed', 'true');
    } catch (err) {
      console.warn('localStorage save failed', err);
    }

    onSaveProfile(profile);
  };

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 p-4 sm:p-5 border-b border-neutral-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-red-600 flex items-center justify-center shadow-lg text-black font-black">
                <Tv className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="text-white font-extrabold text-base sm:text-lg font-['Baloo_2'] leading-tight">
                  चैनल व प्रोफ़ाइल सेटअप
                </h2>
                <p className="text-xs text-neutral-400 font-['Noto_Sans_Devanagari']">
                  अपनी चैनल ब्रांडिंग दर्ज करें, यह सीधे आपके न्यूज़ कार्ड्स में लोड होगी
                </p>
              </div>
            </div>
            {isClosable && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition"
              >
                ✕
              </button>
            )}
          </div>

          {/* Warning Banner: Restricted / Third Party Brand Protection */}
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 block text-xs">⚠️ कृपया किसी अन्य चैनल का लोगो या नाम का उपयोग न करें</strong>
              <span className="text-[11px] text-neutral-300">राष्ट्रीय व प्रतिष्ठित समाचार चैनलों (उदा. आज तक, एबीपी, एनडीटीवी आदि) के नाम, वेबसाइट व लोगो प्रतिबंधित हैं। केवल अपने अधिकृत चैनल का उपयोग करें।</span>
            </div>
          </div>

          {/* 2-Step Progress Indicator */}
          <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => { setErrorMsg(''); setStep(1); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  step === 1 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  step === 1 ? 'bg-amber-400 text-black' : 'bg-emerald-500 text-white'
                }`}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <span>1. प्रोफाइल व चैनल</span>
              </button>
              <div className="w-4 sm:w-8 h-0.5 bg-neutral-700" />
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                step === 2 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' : 'text-neutral-500'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  step === 2 ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                }`}>
                  2
                </div>
                <span>2. ब्रांडिंग व सोशल</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
              {step === 1 ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}
            </span>
          </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-2.5 bg-red-950/80 border border-red-500/80 rounded-lg text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {step === 1 ? (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1 font-['Noto_Sans_Devanagari']">
                    1. पूरा नाम (Full Name) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="उदा. राहुल शर्मा"
                      className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 2. Channel Name (Hindi & English) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1 font-['Noto_Sans_Devanagari']">
                      2. चैनल नाम (हिन्दी में) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={channelNameHi}
                      onChange={(e) => setChannelNameHi(e.target.value)}
                      placeholder="उदा. एआई न्यूज़ मेकर"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-['Baloo_2'] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1 font-['Noto_Sans_Devanagari']">
                      चैनल नाम (English में) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={channelNameEn}
                      onChange={(e) => setChannelNameEn(e.target.value)}
                      placeholder="e.g. AI News Maker"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-bold"
                    />
                  </div>
                </div>

                {/* 3. State & District Cascading Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1 font-['Noto_Sans_Devanagari']">
                      3. राज्य / केंद्र शासित प्रदेश <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={userState}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserState(val);
                        setDistrict('');
                      }}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">-- राज्य चुनें --</option>
                      {getAllIndianStates().map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1 font-['Noto_Sans_Devanagari']">
                      ज़िला / ब्यूरो क्षेत्र <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      disabled={!userState}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden disabled:opacity-50 cursor-pointer"
                    >
                      {!userState && <option value="">पहले राज्य चुनें</option>}
                      {userState && (
                        <>
                          <option value="">-- ज़िला चुनें --</option>
                          {getDistrictsForState(userState).map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                          {district && !getDistrictsForState(userState).includes(district) && (
                            <option value={district}>{district} (कस्टम)</option>
                          )}
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* 4. City Name & Mobile Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1 font-['Noto_Sans_Devanagari']">
                      4. शहर का नाम स्वयं लिखें <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="उदा. इंदौर, भोपाल, लखनऊ"
                        className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1 font-['Noto_Sans_Devanagari']">
                      5. मोबाइल नंबर (संपर्क / WhatsApp) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-अंकों का मोबाइल नंबर"
                        className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 1 Next Button */}
                <div className="pt-2 sticky bottom-0 bg-neutral-900/95 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      if (!fullName.trim()) {
                        setErrorMsg('कृपया अपना पूरा नाम दर्ज करें।');
                        return;
                      }
                      if (!channelNameHi.trim() || !channelNameEn.trim()) {
                        setErrorMsg('कृपया चैनल का नाम (हिन्दी व English) दर्ज करें।');
                        return;
                      }
                      if (!userState.trim()) {
                        setErrorMsg('कृपया अपना राज्य चुनें।');
                        return;
                      }
                      if (!district.trim()) {
                        setErrorMsg('कृपया अपना ज़िला चुनें।');
                        return;
                      }
                      if (!city.trim()) {
                        setErrorMsg('कृपया अपने शहर का नाम दर्ज करें।');
                        return;
                      }
                      const cleanPhone = mobileNumber.replace(/\D/g, '');
                      if (!cleanPhone || cleanPhone.length !== 10) {
                        setErrorMsg('कृपया 10-अंकों का वैध मोबाइल नंबर दर्ज करें।');
                        return;
                      }
                      setStep(2);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-black font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
                  >
                    <span>आगे बढ़ें (चरण 2: ब्रांडिंग व सोशल मीडिया) →</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* 3. Channel Logo Upload with 2 Selectable Boxes (PNG Photo or GIF) */}
                <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 font-['Noto_Sans_Devanagari'] flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>चैनल लोगो (Channel Logo - एक बार सेटअप)</span>
                    </label>
                    {channelLogoUrl && (
                      <button
                        type="button"
                        onClick={handleOpenCropper}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[11px] font-bold border border-amber-400/40 transition"
                      >
                        <Crop className="w-3 h-3" />
                        <span>क्रॉप / PNG कनवर्ट करें</span>
                      </button>
                    )}
                  </div>

                  {/* Upload Inputs & Dual Previews: PNG & GIF */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* PNG CHANNEL LOGO */}
                    <div
                      className={`p-2.5 rounded-xl border transition-all ${
                        channelLogoType === 'png'
                          ? 'bg-amber-500/10 border-amber-400 ring-1 ring-amber-400/40'
                          : 'bg-neutral-800/60 border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                          <span>📦</span>
                          <span>PNG CHANNEL LOGO</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSwitchLogoType('png')}
                          className={`text-[10px] font-black px-2 py-0.5 rounded cursor-pointer transition ${
                            channelLogoType === 'png'
                              ? 'bg-amber-400 text-black font-extrabold'
                              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                          }`}
                        >
                          {channelLogoType === 'png' ? '✓ सक्रिय' : 'चुनें'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-lg bg-neutral-950 border border-neutral-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {channelLogoPngUrl || (channelLogoType === 'png' && channelLogoUrl) ? (
                            <img
                              src={channelLogoPngUrl || channelLogoUrl}
                              alt="PNG Logo"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-neutral-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold rounded-lg cursor-pointer transition">
                            <Upload className="w-3 h-3" />
                            <span>PNG अपलोड</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={handlePngUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[9px] text-neutral-400">पारदर्शी/अधिकारिक लोगो</p>
                        </div>
                      </div>
                    </div>

                    {/* GIF CHANNEL LOGO */}
                    <div
                      className={`p-2.5 rounded-xl border transition-all ${
                        channelLogoType === 'gif'
                          ? 'bg-red-500/10 border-red-500 ring-1 ring-red-500/40'
                          : 'bg-neutral-800/60 border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-red-300 flex items-center gap-1">
                          <span>🎬</span>
                          <span>GIF CHANNEL LOGO</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSwitchLogoType('gif')}
                          className={`text-[10px] font-black px-2 py-0.5 rounded cursor-pointer transition ${
                            channelLogoType === 'gif'
                              ? 'bg-red-500 text-white font-extrabold'
                              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                          }`}
                        >
                          {channelLogoType === 'gif' ? '✓ सक्रिय' : 'चुनें'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-lg bg-neutral-950 border border-neutral-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {channelLogoGifUrl || (channelLogoType === 'gif' && channelLogoUrl) ? (
                            <img
                              src={channelLogoGifUrl || channelLogoUrl}
                              alt="GIF Logo"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Film className="w-5 h-5 text-neutral-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/40 text-xs font-bold rounded-lg cursor-pointer transition">
                            <Upload className="w-3 h-3" />
                            <span>GIF अपलोड</span>
                            <input
                              type="file"
                              accept="image/gif"
                              onChange={handleGifUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[9px] text-neutral-400">एनिमेटेड लाइव लोगो</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Social Media Icons to Show */}
                <div className="bg-neutral-800/40 p-3 rounded-xl border border-neutral-700/60">
                  <label className="block text-xs font-bold text-neutral-300 mb-2 font-['Noto_Sans_Devanagari']">
                    सोशल मीडिया आइकन (कार्ड पर दिखाने हेतु चुनें):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {[
                      { key: 'youtube', label: 'YouTube', color: 'red' },
                      { key: 'facebook', label: 'Facebook', color: 'blue' },
                      { key: 'instagram', label: 'Instagram', color: 'pink' },
                      { key: 'twitter', label: 'X (Twitter)', color: 'neutral' },
                      { key: 'linkedin', label: 'LinkedIn', color: 'sky' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleSocialIcon(item.key)}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition text-center cursor-pointer ${
                          socialIcons[item.key]
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-500 opacity-60'
                        }`}
                      >
                        <span className="text-xs font-bold">{item.label}</span>
                        <span className="text-[9px]">{socialIcons[item.key] ? '✅ ऑन' : 'ऑफ'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Final Username */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-300 font-['Noto_Sans_Devanagari'] flex items-center gap-1">
                      <AtSign className="w-3.5 h-3.5 text-amber-400" />
                      <span>यूज़रनेम (@ हैंडल):</span>
                    </label>
                    <span className="text-[10px] text-neutral-400">कार्ड फुटर पर दिखेगा</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-amber-400 font-bold text-sm">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setIsUsernameCustomized(true);
                        setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
                      }}
                      placeholder="ainewsmaker"
                      className="w-full pl-8 pr-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* 6. Visibility toggles: Contact Number & Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-neutral-800/40 p-2.5 rounded-xl border border-neutral-700/60">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showMobileNumber}
                        onChange={(e) => setShowMobileNumber(e.target.checked)}
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                      />
                      <span className="text-xs text-neutral-200 font-bold font-['Noto_Sans_Devanagari']">
                        कार्ड पर मोबाइल नंबर दिखाएं
                      </span>
                    </label>
                  </div>
                  <div className="bg-neutral-800/40 p-2.5 rounded-xl border border-neutral-700/60">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showWebsite}
                        onChange={(e) => setShowWebsite(e.target.checked)}
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                      />
                      <span className="text-xs text-neutral-200 font-bold font-['Noto_Sans_Devanagari']">
                        कार्ड पर वेबसाइट लिंक दिखाएं
                      </span>
                    </label>
                  </div>
                </div>

                {/* Website Address input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-300 font-['Noto_Sans_Devanagari'] flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>वेबसाइट एड्रेस (बिना https:// या www के):</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => handleWebsiteChange(e.target.value)}
                    placeholder="ainewsmaker.online"
                    className="w-full px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono"
                  />
                </div>

                {/* Action Buttons: Back + Save */}
                <div className="pt-2 sticky bottom-0 bg-neutral-900/95 py-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setErrorMsg(''); setStep(1); }}
                    className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl border border-neutral-700 transition cursor-pointer shrink-0"
                  >
                    ← पिछला चरण
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit(e);
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-black font-black text-xs sm:text-sm rounded-xl shadow-xl flex items-center justify-center gap-1.5 transition-all transform active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>✓ सेव करें एवं होम फ़ीड शुरू करें</span>
                  </button>
                </div>
              </div>
            )}</form>
        </div>
      </div>

      {/* 1-Click Cropper & PNG Converter Modal */}
      <LogoCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropperRawImage}
        onClose={() => setIsCropperOpen(false)}
        onApplyCroppedPng={(croppedPng) => {
          setChannelLogoUrl(croppedPng);
          setChannelLogoType('png');
        }}
      />
    </>
  );
};
