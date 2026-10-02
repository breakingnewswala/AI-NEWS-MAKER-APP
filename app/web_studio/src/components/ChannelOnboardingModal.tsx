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
} from 'lucide-react';
import { ChannelProfile } from '../types';
import { LogoCropperModal } from './LogoCropperModal';
import { checkAccountUniqueness } from '../lib/userPlanManager';
import { sendTwilioOtp, verifyTwilioOtp } from '../lib/twilioService';

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
  const [fullName, setFullName] = useState<string>(initialProfile?.fullName || '');
  const [channelNameHi, setChannelNameHi] = useState<string>(
    initialProfile?.channelNameHi || ''
  );
  const [channelNameEn, setChannelNameEn] = useState<string>(
    initialProfile?.channelNameEn || ''
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

  // Social Icons to show
  const [socialIcons, setSocialIcons] = useState<{
    youtube: boolean;
    facebook: boolean;
    instagram: boolean;
    twitter: boolean;
    telegram: boolean;
    whatsapp: boolean;
  }>({
    youtube: initialProfile?.socialIcons?.youtube ?? true,
    facebook: initialProfile?.socialIcons?.facebook ?? true,
    instagram: initialProfile?.socialIcons?.instagram ?? true,
    twitter: initialProfile?.socialIcons?.twitter ?? true,
    telegram: initialProfile?.socialIcons?.telegram ?? false,
    whatsapp: initialProfile?.socialIcons?.whatsapp ?? true,
  });

  // Username: Entered by user (strictly max 15 chars)
  const [username, setUsername] = useState<string>(initialProfile?.username || '');
  const [isUsernameCustomized, setIsUsernameCustomized] = useState<boolean>(false);

  // Mobile number & visibility
  const [mobileNumber, setMobileNumber] = useState<string>(initialProfile?.mobileNumber || '');
  const [showMobileNumber, setShowMobileNumber] = useState<boolean>(
    initialProfile?.showMobileNumber ?? true
  );

  // Website address (strictly clean domain without https:// or www)
  const [websiteUrl, setWebsiteUrl] = useState<string>(
    initialProfile?.websiteUrl || ''
  );

  // Logo Cropper Modal State
  const [cropperRawImage, setCropperRawImage] = useState<string>('');
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // OTP Verification for Primary Mobile Number
  const [isMobileVerified, setIsMobileVerified] = useState<boolean>(() => {
    return Boolean(initialProfile?.mobileNumber && initialProfile?.mobileNumber.length === 10);
  });
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpFeedbackMsg, setOtpFeedbackMsg] = useState<string>('');

  const handleSendOtp = async () => {
    const clean = mobileNumber.replace(/[^0-9]/g, '').slice(-10);
    if (!clean || clean.length !== 10) {
      setErrorMsg('कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें');
      return;
    }
    setErrorMsg('');
    setIsSendingOtp(true);
    try {
      const res = await sendTwilioOtp(clean);
      if (res.success) {
        setIsOtpSent(true);
        if (res.otpCode) {
          setOtpInput(res.otpCode);
          setOtpFeedbackMsg(`OTP भेजा गया: ${res.otpCode}`);
        } else {
          setOtpFeedbackMsg(res.message || 'OTP कोड भेजा जा चुका है');
        }
      } else {
        setErrorMsg(res.error || 'OTP भेजने में विफल');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'OTP भेजने में त्रुटि');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const clean = mobileNumber.replace(/[^0-9]/g, '').slice(-10);
    if (!clean || clean.length !== 10) {
      setErrorMsg('कृपया पहले 10 अंकों का मोबाइल नंबर दर्ज करें');
      return;
    }
    if (!otpInput || otpInput.trim().length !== 6) {
      setErrorMsg('कृपया 6-अंकों का OTP कोड दर्ज करें');
      return;
    }
    setErrorMsg('');
    setIsVerifyingOtp(true);
    try {
      const res = await verifyTwilioOtp(clean, otpInput.trim());
      if (res.success && res.valid) {
        setIsMobileVerified(true);
        setIsOtpSent(false);
        setOtpFeedbackMsg('प्राइमरी नंबर सफलतापूर्वक सत्यापित हो गया!');
      } else {
        setErrorMsg(res.message || 'अमान्य OTP कोड! कृपया पुनः प्रयास करें।');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'OTP सत्यापन में त्रुटि');
    } finally {
      setIsVerifyingOtp(false);
    }
  };



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
    const finalHi = (channelNameHi || '').trim();
    const finalEn = (channelNameEn || '').trim();
    const finalUser = (username || '').replace(/^@/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    setErrorMsg('');

    if (!finalFullName) {
      setErrorMsg('कृपया अपना पूरा नाम दर्ज करें');
      return;
    }
    if (!finalHi) {
      setErrorMsg('कृपया चैनल का हिंदी नाम दर्ज करें');
      return;
    }
    if (!finalUser) {
      setErrorMsg('कृपया 15 अक्षरों तक का एक यूज़रनेम दर्ज करें');
      return;
    }
    if (finalUser.length > 15) {
      setErrorMsg('यूज़रनेम अधिकतम 15 अक्षरों का होना चाहिए');
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.replace(/[^0-9]/g, '').length !== 10) {
      setErrorMsg('कृपया वैध 10-अंकों का प्राइमरी मोबाइल नंबर दर्ज करें');
      return;
    }
    if (!isMobileVerified) {
      setErrorMsg('⚠️ कृपया आगे बढ़ने के लिए अपने प्राइमरी मोबाइल नंबर को OTP से सत्यापित करें। बिना OTP के प्राइमरी नंबर लॉक नहीं होगा।');
      return;
    }

    // Check account uniqueness and restricted brands
    const uniqCheck = checkAccountUniqueness({
      username: finalUser,
      websiteUrl: websiteUrl.trim(),
      channelName: finalHi,
      currentEmail: (initialProfile as any)?.email,
    });
    if (!uniqCheck.valid) {
      setErrorMsg(uniqCheck.error || 'यह यूज़रनेम, वेबसाइट या चैनल नाम उपयोग नहीं किया जा सकता!');
      return;
    }

    const profile: ChannelProfile = {
      fullName: finalFullName,
      channelNameHi: finalHi,
      channelNameEn: finalEn,
      channelLogoUrl: channelLogoUrl || channelLogoPngUrl || channelLogoGifUrl || '/assets/ai_news_maker_logo.png',
      channelLogoPngUrl,
      channelLogoGifUrl,
      channelLogoType,
      socialIcons,
      username: finalUser,
      mobileNumber: mobileNumber.trim(),
      showMobileNumber,
      websiteUrl: websiteUrl.trim(),
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

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-2.5 bg-red-950/80 border border-red-500/80 rounded-lg text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Full Name */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1 font-['Noto_Sans_Devanagari']">
                1. पूरा नाम (Full Name) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="उदा. राहुल शर्मा (संपादक / रिपोर्टर)"
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
                  value={channelNameEn}
                  onChange={(e) => setChannelNameEn(e.target.value)}
                  placeholder="e.g. AI News Maker"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-bold"
                />
              </div>
            </div>

            {/* 3. Channel Logo Upload with 2 Selectable Boxes (PNG Photo or GIF) */}
            <div className="bg-neutral-800/60 p-3.5 rounded-xl border border-neutral-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 font-['Noto_Sans_Devanagari'] flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>3. चैनल लोगो (Channel Logo)</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* PNG CHANNEL LOGO */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    channelLogoType === 'png'
                      ? 'bg-amber-500/10 border-amber-400 ring-1 ring-amber-400/40'
                      : 'bg-neutral-800/60 border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
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
                    <div className="w-12 h-12 rounded-lg bg-neutral-950 border border-neutral-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
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
                      <p className="text-[9.5px] text-neutral-400">स्टैंडर्ड/पारदर्शी लोगो</p>
                    </div>
                  </div>
                </div>

                {/* GIF CHANNEL LOGO */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    channelLogoType === 'gif'
                      ? 'bg-red-500/10 border-red-500 ring-1 ring-red-500/40'
                      : 'bg-neutral-800/60 border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
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
                    <div className="w-12 h-12 rounded-lg bg-neutral-950 border border-neutral-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
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
                      <p className="text-[9.5px] text-neutral-400">एनिमेटेड/लाइव लोगो</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1-Click Crop & PNG Convert Notice */}
              {channelLogoUrl && (
                <div className="pt-1 flex items-center justify-between bg-neutral-900/90 p-2 rounded-lg border border-neutral-700 text-xs">
                  <span className="text-neutral-300 text-[11px]">
                    लोगो को सही अनुपात (1:1) में क्रॉप व पारदर्शी बनाना चाहते हैं?
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenCropper}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-extrabold text-[11px] rounded transition shadow-sm shrink-0"
                  >
                    <Crop className="w-3 h-3 text-black" />
                    <span>✨ 1-क्लिक क्रॉप व PNG</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Social Media Icons to Show (Checkboxes) */}
            <div className="bg-neutral-800/40 p-3 rounded-xl border border-neutral-700/60">
              <label className="block text-xs font-bold text-neutral-300 mb-2 font-['Noto_Sans_Devanagari']">
                4. शो सोशल मीडिया आइकन (जिन आइकन्स को कार्ड के नीचे दिखाना है, उन्हें टिक करें)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {/* YouTube */}
                <button
                  type="button"
                  onClick={() => toggleSocialIcon('youtube')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition text-center cursor-pointer ${
                    socialIcons.youtube
                      ? 'bg-red-950/60 border-red-500 text-red-200'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-500 opacity-60'
                  }`}
                >
                  <span className="text-xs font-bold">YouTube</span>
                  <span className="text-[10px]">{socialIcons.youtube ? '✅ ऑन' : 'ऑफ'}</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={() => toggleSocialIcon('facebook')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition text-center cursor-pointer ${
                    socialIcons.facebook
                      ? 'bg-blue-950/60 border-blue-500 text-blue-200'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-500 opacity-60'
                  }`}
                >
                  <span className="text-xs font-bold">Facebook</span>
                  <span className="text-[10px]">{socialIcons.facebook ? '✅ ऑन' : 'ऑफ'}</span>
                </button>

                {/* Instagram */}
                <button
                  type="button"
                  onClick={() => toggleSocialIcon('instagram')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition text-center cursor-pointer ${
                    socialIcons.instagram
                      ? 'bg-pink-950/60 border-pink-500 text-pink-200'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-500 opacity-60'
                  }`}
                >
                  <span className="text-xs font-bold">Instagram</span>
                  <span className="text-[10px]">{socialIcons.instagram ? '✅ ऑन' : 'ऑफ'}</span>
                </button>

                {/* X / Twitter */}
                <button
                  type="button"
                  onClick={() => toggleSocialIcon('twitter')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition text-center cursor-pointer ${
                    socialIcons.twitter
                      ? 'bg-neutral-700 border-neutral-400 text-white'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-500 opacity-60'
                  }`}
                >
                  <span className="text-xs font-bold">X (Twitter)</span>
                  <span className="text-[10px]">{socialIcons.twitter ? '✅ ऑन' : 'ऑफ'}</span>
                </button>

                {/* Telegram */}
                <button
                  type="button"
                  onClick={() => toggleSocialIcon('telegram')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition text-center cursor-pointer ${
                    socialIcons.telegram
                      ? 'bg-sky-950/60 border-sky-500 text-sky-200'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-500 opacity-60'
                  }`}
                >
                  <span className="text-xs font-bold">Telegram</span>
                  <span className="text-[10px]">{socialIcons.telegram ? '✅ ऑन' : 'ऑफ'}</span>
                </button>

                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => toggleSocialIcon('whatsapp')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition text-center cursor-pointer ${
                    socialIcons.whatsapp
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-500 opacity-60'
                  }`}
                >
                  <span className="text-xs font-bold">WhatsApp</span>
                  <span className="text-[10px]">{socialIcons.whatsapp ? '✅ ऑन' : 'ऑफ'}</span>
                </button>
              </div>
            </div>

            {/* 5. Final Username */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-300 font-['Noto_Sans_Devanagari'] flex items-center gap-1">
                  <AtSign className="w-3.5 h-3.5 text-amber-400" />
                  <span>5. फाइनल यूज़रनेम (अधिकतम 15 अक्षर)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${username.length > 15 ? 'bg-red-950 text-red-400 border border-red-500' : 'text-neutral-400'}`}>
                    {username.length}/15 अक्षर
                  </span>
                  <span className="text-[10px] text-neutral-400 hidden sm:inline">कार्ड फुटर पर @ हैंडल दिखेगा</span>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-amber-400 font-bold text-sm">@</span>
                <input
                  type="text"
                  maxLength={15}
                  value={username}
                  onChange={(e) => {
                    setIsUsernameCustomized(true);
                    setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15));
                  }}
                  placeholder="उदा. yourname"
                  className="w-full pl-8 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            {/* 6. Primary Mobile Number + Mandatory OTP Verification */}
            <div className="bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-neutral-300 font-['Noto_Sans_Devanagari'] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>6. प्राइमरी मोबाइल नंबर (Primary Number) * - OTP सत्यापन अनिवार्य</span>
                </label>
                {isMobileVerified && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>सत्यापित (Verified) 🔒</span>
                  </span>
                )}
              </div>

              {/* Mandatory Warning */}
              <div className="p-2.5 bg-red-950/60 border border-red-500/50 rounded-lg text-red-200 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>महत्वपूर्ण: यह प्राइमरी नंबर लॉक हो जाएगा। OTP से सत्यापन अनिवार्य है।</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-xs text-neutral-400 font-bold">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    disabled={isMobileVerified}
                    onChange={(e) => {
                      setMobileNumber(e.target.value.replace(/[^0-9]/g, ''));
                      setIsMobileVerified(false);
                      setIsOtpSent(false);
                    }}
                    placeholder="10 अंकों का मोबाइल नंबर दर्ज करें"
                    className="w-full pl-11 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono disabled:opacity-75 disabled:bg-neutral-900"
                  />
                </div>

                {!isMobileVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || mobileNumber.replace(/[^0-9]/g, '').length !== 10}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-lg shadow cursor-pointer transition active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    <span>{isSendingOtp ? 'भेजा जा रहा है...' : (isOtpSent ? 'पुनः भेजें' : 'OTP प्राप्त करें')}</span>
                  </button>
                )}
              </div>

              {/* OTP Input Row */}
              {!isMobileVerified && isOtpSent && (
                <div className="p-3 bg-neutral-900/90 rounded-xl border border-amber-500/50 space-y-2">
                  <div className="text-[11px] text-amber-300 font-bold flex items-center justify-between">
                    <span>6-अंकों का OTP कोड दर्ज करें:</span>
                    {otpFeedbackMsg && <span className="text-emerald-400">{otpFeedbackMsg}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="उदा. 123456"
                      className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-center text-sm font-mono tracking-widest focus:border-amber-400 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otpInput.trim().length !== 6}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg shadow cursor-pointer transition active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      <span>{isVerifyingOtp ? 'जांच जारी...' : 'OTP सत्यापित करें'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Checkbox: Visible or Not */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={showMobileNumber}
                  onChange={(e) => setShowMobileNumber(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
                <span className="text-xs text-neutral-200 font-bold font-['Noto_Sans_Devanagari']">
                  कार्ड / ग्राफ़िक्स पर मोबाइल नंबर दिखाएं (Visible on Card)
                </span>
              </label>
            </div>

            {/* 7. Website Address (Direct without https:// or www) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-300 font-['Noto_Sans_Devanagari'] flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>7. वेबसाइट एड्रेस (बिना https:// या www. के)</span>
                </label>
                <span className="text-[10.5px] text-neutral-400">उदा. yourwebsite.com</span>
              </div>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => handleWebsiteChange(e.target.value)}
                placeholder="yourwebsite.com"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                (नोट: https:// या www लगाने की आवश्यकता नहीं है, सीधा डोमेन नाम कार्ड पर दिखेगा)
              </p>
            </div>

            {/* Submit Button: Enter App */}
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-black font-black text-sm sm:text-base rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-black" />
                <span>✨ ऐप के अंदर प्रवेश करें (Enter Studio)</span>
              </button>
            </div>
          </form>
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
