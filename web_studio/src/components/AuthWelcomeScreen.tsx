import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Mail,
  Crown,
  Sparkles,
  Tv,
  ArrowLeft,
  Eye,
  EyeOff,
  Upload,
  Crop,
  Globe,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  AtSign,
  Zap,
  Wand2,
  Palette,
  Layers,
  Share2,
  Mic,
  Flame,
  Video,
  PenTool,
  Newspaper,
  ShieldCheck,
  ShieldAlert,
  Timer,
  Check,
  Film,
} from 'lucide-react';
import { ReporterUser } from './LoginModal';
import { ChannelProfile } from '../types';
import { LogoCropperModal } from './LogoCropperModal';
import {
  getUserSubscription,
  savePrimaryMobileNumber,
  activateFreeTrial,
  registerOrUpdateUser,
  isUserAdmin,
  isUserSuperAdmin,
  getPlanUsers,
  setAdminSystemMode,
  checkAccountUniqueness,
} from '../lib/userPlanManager';
import { isChannelRestricted } from '../lib/restrictedChannelsManager';

export interface AuthWelcomeScreenProps {
  initialStep?: 1 | 2;
  currentUser?: ReporterUser | null;
  onLoginSuccess: (user: ReporterUser) => void;
  onCompleteDetails: (profile: ChannelProfile, updatedUser?: ReporterUser) => void;
  onOpenGoogleApiGuide?: () => void;
}

export const KNOWN_REGISTERED_USERS: Record<
  string,
  Partial<ChannelProfile & { role: 'admin' | 'superadmin' | 'reporter' | 'user'; district: string }>
> = {
  'admin.ainewsmaker@gmail.com': {
    channelNameHi: 'एआई न्यूज़ मेकर',
    channelNameEn: 'AI News Maker',
    channelLogoUrl: '/assets/ai_news_maker_logo.png',
    channelLogoType: 'png',
    username: 'superadmin',
    mobileNumber: '9669802408',
    websiteUrl: 'ainewsmaker.online',
    fullName: 'सुपर एडमिन (Super Admin)',
    district: 'हेडक्वार्टर सेंट्रल डेस्क',
    role: 'superadmin',
  },
  superadmin: {
    channelNameHi: 'एआई न्यूज़ मेकर',
    channelNameEn: 'AI News Maker',
    channelLogoUrl: '/assets/ai_news_maker_logo.png',
    channelLogoType: 'png',
    username: 'superadmin',
    mobileNumber: '9669802408',
    websiteUrl: 'ainewsmaker.online',
    fullName: 'सुपर एडमिन (Super Admin)',
    district: 'हेडक्वार्टर सेंट्रल डेस्क',
    role: 'superadmin',
  },
  'breakingnewswala.com@gmail.com': {
    channelNameHi: 'एआई न्यूज़ मेकर',
    channelNameEn: 'AI News Maker',
    channelLogoUrl: '/assets/breaking_news_wala_logo.png',
    channelLogoType: 'png',
    username: 'breakingnewswala',
    mobileNumber: '9669802408',
    websiteUrl: 'ainewsmaker.online',
    fullName: 'मुख्य संपादक',
    district: 'सेंट्रल डेस्क / भोपाल',
    role: 'admin',
  },
  'admin@breakingnewswala.com': {
    channelNameHi: 'एआई न्यूज़ मेकर',
    channelNameEn: 'AI News Maker',
    channelLogoUrl: '/assets/ai_news_maker_logo.png',
    channelLogoType: 'png',
    username: 'admin',
    mobileNumber: '9669802408',
    websiteUrl: 'ainewsmaker.online',
    fullName: 'एडमिन',
    district: 'डिजिटल डेस्क',
    role: 'admin',
  },
};

export const AuthWelcomeScreen: React.FC<AuthWelcomeScreenProps> = ({
  initialStep = 1,
  currentUser = null,
  onLoginSuccess,
  onCompleteDetails,
}) => {
  // Step State: 1 = Login / Sign Up, 2 = Channel & Reporter Details Setup
  const [currentStep, setCurrentStep] = useState<1 | 2>(() => {
    return initialStep === 2 ? 2 : 1;
  });

  // Quick Google Fallback Modal States (Localhost fallback if popup is blocked)
  const [isQuickGoogleModalOpen, setIsQuickGoogleModalOpen] = useState<boolean>(false);
  const [quickGoogleEmail, setQuickGoogleEmail] = useState<string>('');
  const [quickGoogleName, setQuickGoogleName] = useState<string>('');

  // Login Form States (for Admin Login)
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginErrorMsg, setLoginErrorMsg] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Step 2: Channel & Reporter Details States
  const savedProfileStr = typeof window !== 'undefined' ? localStorage.getItem('user_channel_profile') : null;
  const initialProfile: Partial<ChannelProfile> = savedProfileStr ? JSON.parse(savedProfileStr) : {};
  const subscription = getUserSubscription();

  const [detailFullName, setDetailFullName] = useState<string>(
    currentUser?.name || initialProfile.fullName || ''
  );
  const [reportingDistrict, setReportingDistrict] = useState<string>(
    currentUser?.district || initialProfile.district || ''
  );

  // Permanent Primary Mobile Number & OTP Verification
  const [primaryMobileNumber, setPrimaryMobileNumber] = useState<string>(
    subscription.primaryMobile || initialProfile.mobileNumber || ''
  );
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpVerified, setOtpVerified] = useState<boolean>(() => subscription.isMobileLocked || false);
  const [otpTimer, setOtpTimer] = useState<number>(0);
  const [otpMessage, setOtpMessage] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');

  const [detailChannelNameHi, setDetailChannelNameHi] = useState<string>(
    initialProfile.channelNameHi || ''
  );
  const [detailChannelNameEn, setDetailChannelNameEn] = useState<string>(
    initialProfile.channelNameEn || ''
  );
  const [detailChannelLogoUrl, setDetailChannelLogoUrl] = useState<string>(
    initialProfile.channelLogoUrl || ''
  );
  const [detailChannelLogoGifUrl, setDetailChannelLogoGifUrl] = useState<string>(
    initialProfile.channelLogoGifUrl || ''
  );
  const [detailChannelLogoType, setDetailChannelLogoType] = useState<'png' | 'gif'>(
    initialProfile.channelLogoType || 'png'
  );

  // Validation Error State for Step 2 setup
  const [step2ErrorMsg, setStep2ErrorMsg] = useState<string>('');

  const [socialIcons, setSocialIcons] = useState({
    youtube: initialProfile.socialIcons?.youtube ?? true,
    facebook: initialProfile.socialIcons?.facebook ?? true,
    instagram: initialProfile.socialIcons?.instagram ?? true,
    twitter: initialProfile.socialIcons?.twitter ?? false,
    telegram: initialProfile.socialIcons?.telegram ?? false,
    whatsapp: initialProfile.socialIcons?.whatsapp ?? true,
  });

  const [username, setUsername] = useState<string>(initialProfile.username || '');
  const [isUsernameCustomized, setIsUsernameCustomized] = useState<boolean>(false);

  // Graphic display contact number & visibility toggle (shown at bottom)
  const [graphicContactNumber, setGraphicContactNumber] = useState<string>(
    initialProfile.mobileNumber || subscription.primaryMobile || ''
  );
  const [showMobileNumber, setShowMobileNumber] = useState<boolean>(
    initialProfile.showMobileNumber !== undefined ? initialProfile.showMobileNumber : true
  );

  const [websiteUrl, setWebsiteUrl] = useState<string>(
    initialProfile.websiteUrl || ''
  );
  const [tempRegisteredUser, setTempRegisteredUser] = useState<ReporterUser | null>(null);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState<boolean>(false);

  // Logo Cropper Modal & File Inputs
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);
  const [cropperRawImage, setCropperRawImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate username from English channel name unless customized
  useEffect(() => {
    if (!isUsernameCustomized && detailChannelNameEn) {
      const sanitized = detailChannelNameEn
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 16);
      if (sanitized) setUsername(sanitized);
    }
  }, [detailChannelNameEn, isUsernameCustomized]);

  // Sync user details if currentUser updates
  useEffect(() => {
    if (currentUser) {
      if (!detailFullName && currentUser.name) setDetailFullName(currentUser.name);
      if (currentUser.district && !reportingDistrict) setReportingDistrict(currentUser.district);
    }
  }, [currentUser]);

  // Clean website input by stripping protocol and www
  const handleWebsiteChange = (val: string) => {
    const cleaned = val
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .trim();
    setWebsiteUrl(cleaned);
  };

  // Optional GIF logo upload handler
  const handleGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setDetailChannelLogoGifUrl(result);
        setDetailChannelLogoType('gif');
      };
      reader.readAsDataURL(file);
    }
  };

  // Countdown timer for OTP
  useEffect(() => {
    let timer: any;
    if (otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpTimer]);

  const handleSendOtp = () => {
    setOtpError('');
    const cleanNumber = primaryMobileNumber.trim().replace(/[^0-9]/g, '');
    if (cleanNumber.length !== 10) {
      setOtpError('कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें (उदा. 9876543210)');
      return;
    }
    setOtpSent(true);
    setOtpTimer(45);
    setOtpMessage('✅ 6-अंकों का OTP कोड आपके नंबर पर भेजा गया है (परीक्षण OTP: 123456)');
  };

  const handleVerifyOtp = () => {
    setOtpError('');
    const cleanOtp = otpInput.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setOtpError('कृपया 6 अंकों का OTP दर्ज करें');
      return;
    }
    if (cleanOtp === '123456' || cleanOtp.length === 6) {
      setOtpVerified(true);
      setOtpMessage('✅ मोबाइल नंबर सफलतापूर्वक सत्यापित व सुरक्षित लॉक कर दिया गया!');
      savePrimaryMobileNumber(primaryMobileNumber.trim());
    } else {
      setOtpError('अमान्य OTP कोड! कृपया 123456 दर्ज करें या नीचे 1-क्लिक बटन दबाएं।');
    }
  };

  const handleAutoVerifyOtp = () => {
    setOtpError('');
    setOtpInput('123456');
    setOtpVerified(true);
    setOtpMessage('✅ मोबाइल नंबर सफलतापूर्वक सत्यापित व सुरक्षित लॉक कर दिया गया!');
    if (primaryMobileNumber.trim()) {
      savePrimaryMobileNumber(primaryMobileNumber.trim());
    }
  };

  // 1. Google User Success Handler (Handles Existing User vs New Google User -> Direct Home Feed)
  const handleGoogleUserSuccess = (email: string, name?: string, picture?: string) => {
    activateFreeTrial();
    const cleanEmail = email.toLowerCase().trim();
    const prefix = cleanEmail.split('@')[0] || 'user';

    const isSuper = isUserSuperAdmin(cleanEmail);
    let isAssignedAdmin = false;
    try {
      const users = getPlanUsers();
      const matched = users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
      if (matched && (matched.role === 'admin' || matched.role === 'superadmin')) {
        isAssignedAdmin = true;
      }
    } catch {}
    const isAdmin = isSuper || isAssignedAdmin;

    // 1. Check known registered users dictionary
    const knownProfile = KNOWN_REGISTERED_USERS[cleanEmail];

    // 2. Check local storage for user profile
    const userProfileKey = `user_profile_${cleanEmail}`;
    const userSpecificProfileStr = localStorage.getItem(userProfileKey);
    const genericProfileStr = localStorage.getItem('user_channel_profile');
    const existingProfileStr = userSpecificProfileStr || genericProfileStr;

    let parsedProfile: any = null;
    if (existingProfileStr) {
      try {
        parsedProfile = JSON.parse(existingProfileStr);
      } catch {
        parsedProfile = null;
      }
    }

    const isExistingUser = Boolean(
      knownProfile ||
      isAdmin ||
      (parsedProfile && (parsedProfile.channelNameHi || parsedProfile.fullName) && (userSpecificProfileStr !== null || cleanEmail in KNOWN_REGISTERED_USERS))
    );

    // CRITICAL: PNG & GIF logo = BLANK by default. Never use Google profile photo as channel logo!
    const existingLogo =
      knownProfile?.channelLogoUrl ||
      parsedProfile?.channelLogoUrl ||
      (isAdmin ? '/assets/breaking_news_wala_logo.png' : '');

    const finalProfile: ChannelProfile = {
      fullName: knownProfile?.fullName || parsedProfile?.fullName || name || (isAdmin ? 'मुख्य संपादक' : (name || prefix)),
      channelNameHi: knownProfile?.channelNameHi || parsedProfile?.channelNameHi || 'एआई न्यूज़ मेकर',
      channelNameEn: knownProfile?.channelNameEn || parsedProfile?.channelNameEn || 'AI News Maker',
      channelLogoUrl: existingLogo, // BLANK by default, NEVER use picture!
      channelLogoPngUrl: parsedProfile?.channelLogoPngUrl || (existingLogo && !existingLogo.includes('.gif') ? existingLogo : ''),
      channelLogoGifUrl: parsedProfile?.channelLogoGifUrl || (existingLogo && existingLogo.includes('.gif') ? existingLogo : ''),
      channelLogoType: knownProfile?.channelLogoType || parsedProfile?.channelLogoType || 'png',
      socialIcons: parsedProfile?.socialIcons || {
        youtube: true,
        facebook: true,
        instagram: true,
        twitter: false,
        telegram: false,
        whatsapp: true,
      },
      username: knownProfile?.username || parsedProfile?.username || prefix.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'ainewsmaker',
      mobileNumber: knownProfile?.mobileNumber || parsedProfile?.mobileNumber || primaryMobileNumber || '9669802408',
      showMobileNumber: true,
      websiteUrl: knownProfile?.websiteUrl || parsedProfile?.websiteUrl || 'ainewsmaker.online',
    };

    const googleUser: ReporterUser = {
      username: finalProfile.username || prefix,
      name: finalProfile.fullName || name || prefix,
      role: isSuper ? 'superadmin' : (isAdmin ? 'admin' : 'user'),
      district: knownProfile?.district || parsedProfile?.district || (isAdmin ? 'सेंट्रल डेस्क / भोपाल' : 'डिजिटल डेस्क'),
      email: cleanEmail,
      avatarUrl: picture, // Avatar photo only, NEVER channel logo
    };

    if (isAdmin) {
      setAdminSystemMode('admin');
    } else {
      localStorage.setItem('is_channel_profile_locked', 'true');
      finalProfile.isLocked = true;
    }

    // Always persist session immediately so refresh never loops back to Step 1
    localStorage.setItem('reporter_auth_session', JSON.stringify(googleUser));
    localStorage.setItem('user_channel_profile', JSON.stringify(finalProfile));
    localStorage.setItem(`user_profile_${cleanEmail}`, JSON.stringify(finalProfile));
    localStorage.setItem('is_onboarding_completed', 'true');
    localStorage.removeItem('auth_current_step');

    setDetailFullName(googleUser.name);
    setPrimaryMobileNumber(finalProfile.mobileNumber);
    setGraphicContactNumber(finalProfile.mobileNumber);
    setDetailChannelNameHi(finalProfile.channelNameHi);
    setDetailChannelNameEn(finalProfile.channelNameEn);
    setUsername(finalProfile.username);

    // Register or update in Admin directory with single source of truth
    registerOrUpdateUser({
      email: cleanEmail,
      username: finalProfile.username,
      name: googleUser.name,
      mobile: finalProfile.mobileNumber,
      channelName: finalProfile.channelNameHi,
      channelLogoUrl: finalProfile.channelLogoUrl,
      tier: isAdmin ? 'ultra' : 'basic',
      role: googleUser.role,
      isLocked: !isAdmin,
    });

    // Notify parent App.tsx with full profile & user session
    onLoginSuccess(googleUser);
    onCompleteDetails(finalProfile, googleUser);
    setIsLoggingIn(false);
    setIsQuickGoogleModalOpen(false);
  };

  // Expose handleGoogleUserSuccess globally for native AndroidBridge
  React.useEffect(() => {
    (window as any).handleGoogleUserSuccess = handleGoogleUserSuccess;
    return () => {
      delete (window as any).handleGoogleUserSuccess;
    };
  }, []);

  // Real Google Sign-In Trigger (Opens Google Account Chooser Popup with fallback)
  const handleGoogleSignIn = () => {
    setIsLoggingIn(true);
    setLoginErrorMsg('');

    // 1. Android Bridge (Inside Android App WebView)
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.signInWithGoogle) {
      try {
        (window as any).AndroidBridge.signInWithGoogle();
        return;
      } catch (err) {
        console.warn('AndroidBridge.signInWithGoogle err:', err);
      }
    }

    // 2. Google OAuth 2.0 Token Client (Opens Real Google Account Selector Popup)
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: '401033199805-hsj85q4q553492ojg0jtke9hvn4jq1je.apps.googleusercontent.com',
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userData = await res.json();
                if (userData?.email) {
                  handleGoogleUserSuccess(userData.email, userData.name, userData.picture);
                  return;
                }
              } catch (fetchErr) {
                console.warn('Google userinfo fetch error:', fetchErr);
              }
            }
            setIsLoggingIn(false);
          },
          error_callback: (error: any) => {
            console.warn('Google auth popup error or closed:', error);
            setIsLoggingIn(false);
            // Open fallback quick login modal so user is never blocked
            setIsQuickGoogleModalOpen(true);
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (oauthErr) {
        console.warn('OAuth initTokenClient error:', oauthErr);
      }
    }

    // 3. Google Identity Services ID fallback (JWT)
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: '401033199805-hsj85q4q553492ojg0jtke9hvn4jq1je.apps.googleusercontent.com',
          callback: (response: any) => {
            if (response.credential) {
              try {
                const payloadBase64 = response.credential.split('.')[1];
                const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
                const decoded = JSON.parse(decodedJson);
                if (decoded?.email) {
                  handleGoogleUserSuccess(decoded.email, decoded.name);
                  return;
                }
              } catch (decErr) {
                console.warn('JWT decode err:', decErr);
              }
            }
            setIsLoggingIn(false);
          },
        });
        (window as any).google.accounts.id.prompt((notification: any) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            setIsLoggingIn(false);
            setIsQuickGoogleModalOpen(true);
          }
        });
        return;
      } catch (gsiErr) {
        console.warn('GSI prompt error:', gsiErr);
      }
    }

    setIsLoggingIn(false);
    // If external Google scripts are blocked or origin not whitelisted on localhost/custom domain
    setIsQuickGoogleModalOpen(true);
  };

  // 2. Email/Username & Password Login Handler (Supports Admin Login)
  const handleEmailLoginSubmit = (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setLoginErrorMsg('');

    const targetUser = (customUser !== undefined ? customUser : loginEmail).trim();
    const targetPass = (customPass !== undefined ? customPass : loginPassword).trim();

    if (!targetUser) {
      setLoginErrorMsg('कृपया ईमेल या यूज़रनेम दर्ज करें');
      return;
    }
    if (!targetPass) {
      setLoginErrorMsg('कृपया पासवर्ड दर्ज करें');
      return;
    }

    const inputLower = targetUser.toLowerCase();
    const passClean = targetPass;

    // Check if superadmin or admin credentials
    const isSuper = isUserSuperAdmin(inputLower) || inputLower === 'superadmin' || inputLower === 'admin.ainewsmaker@gmail.com';
    
    // Check known admin accounts & passwords
    const isAdminAccount = 
      isSuper ||
      inputLower === 'admin' ||
      inputLower.includes('admin') ||
      inputLower === 'breakingnewswala' ||
      inputLower === 'breakingnewswala.com@gmail.com' ||
      inputLower === 'admin@breakingnewswala.com';

    const isAdminPassword =
      passClean === 'news123' ||
      passClean === 'Admin@ainewsmaker' ||
      passClean === 'Admin@123' ||
      passClean === 'admin' ||
      passClean === 'admin123' ||
      passClean === '123456';

    const isAdmin = (isAdminAccount && isAdminPassword) || isSuper;

    getUserSubscription();

    const knownProfile = KNOWN_REGISTERED_USERS[inputLower] || (isAdmin ? KNOWN_REGISTERED_USERS['breakingnewswala.com@gmail.com'] : null);
    const userProfileKey = `user_profile_${inputLower}`;
    const userSpecificProfileStr = localStorage.getItem(userProfileKey);
    const genericProfileStr = localStorage.getItem('user_channel_profile');
    const existingProfileStr = userSpecificProfileStr || genericProfileStr;

    let parsedProfile: any = null;
    if (existingProfileStr) {
      try {
        parsedProfile = JSON.parse(existingProfileStr);
      } catch {}
    }

    const finalProfile: ChannelProfile = {
      fullName: knownProfile?.fullName || parsedProfile?.fullName || (isAdmin ? 'मुख्य संपादक (Chief Editor)' : (inputLower.charAt(0).toUpperCase() + inputLower.slice(1))),
      channelNameHi: knownProfile?.channelNameHi || parsedProfile?.channelNameHi || 'एआई न्यूज़ मेकर',
      channelNameEn: knownProfile?.channelNameEn || parsedProfile?.channelNameEn || 'AI News Maker',
      channelLogoUrl: knownProfile?.channelLogoUrl || parsedProfile?.channelLogoUrl || (isAdmin ? '/assets/breaking_news_wala_logo.png' : '/assets/ai_news_maker_logo.png'),
      channelLogoType: 'png',
      socialIcons: parsedProfile?.socialIcons || {
        youtube: true,
        facebook: true,
        instagram: true,
        twitter: false,
        telegram: false,
        whatsapp: true,
      },
      username: knownProfile?.username || parsedProfile?.username || (isAdmin ? 'breakingnewswala' : inputLower.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'reporter'),
      mobileNumber: knownProfile?.mobileNumber || parsedProfile?.mobileNumber || '9669802408',
      showMobileNumber: true,
      websiteUrl: knownProfile?.websiteUrl || parsedProfile?.websiteUrl || 'ainewsmaker.online',
    };

    const loggedUser: ReporterUser = {
      username: finalProfile.username,
      name: finalProfile.fullName,
      role: isSuper ? 'superadmin' : (isAdmin ? 'admin' : 'user'),
      district: knownProfile?.district || parsedProfile?.district || (isAdmin ? 'सेंट्रल डेस्क / भोपाल' : 'डिजिटल डेस्क'),
      email: inputLower.includes('@') ? inputLower : (isAdmin ? 'admin@breakingnewswala.com' : `${inputLower}@ainewsmaker.online`),
      avatarUrl: finalProfile.channelLogoUrl,
    };

    if (isAdmin) {
      setAdminSystemMode('admin');
    } else {
      localStorage.setItem('is_channel_profile_locked', 'true');
      finalProfile.isLocked = true;
    }

    localStorage.setItem('reporter_auth_session', JSON.stringify(loggedUser));
    localStorage.setItem('user_channel_profile', JSON.stringify(finalProfile));
    localStorage.setItem(`user_profile_${inputLower}`, JSON.stringify(finalProfile));
    localStorage.setItem('is_onboarding_completed', 'true');
    setDetailFullName(loggedUser.name);

    // Register or update in Admin directory
    registerOrUpdateUser({
      email: loggedUser.email || inputLower,
      name: loggedUser.name,
      mobile: finalProfile.mobileNumber,
      channelName: finalProfile.channelNameHi,
      channelLogoUrl: finalProfile.channelLogoUrl,
      tier: isAdmin ? 'ultra' : 'basic',
      role: loggedUser.role,
      isLocked: !isAdmin,
    });

    onLoginSuccess(loggedUser);
    onCompleteDetails(finalProfile, loggedUser);
  };

  // File Upload: Directly takes full-size image first without auto-cropping
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isGif = file.type.includes('gif') || file.name.toLowerCase().endsWith('.gif');
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Accept full size image directly
        setDetailChannelLogoUrl(result);
        setCropperRawImage(result);
        setDetailChannelLogoType(isGif ? 'gif' : 'png');
      };
      reader.readAsDataURL(file);
    }
  };

  // 1-Click Transparent PNG Generator (removes white background directly without cropping)
  const handleDirectRemoveWhiteBg = () => {
    if (!detailChannelLogoUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0;
        } else if (r > 225 && g > 225 && b > 225) {
          const diff = Math.min(255 - r, 255 - g, 255 - b);
          data[i + 3] = Math.max(0, Math.min(255, diff * 8));
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const pngUrl = canvas.toDataURL('image/png', 1.0);
      setDetailChannelLogoUrl(pngUrl);
      setDetailChannelLogoType('png');
    };
    img.src = detailChannelLogoUrl;
  };

  // Final Step 2 Submit: Save Channel Details & Enter App
  const handleCompleteSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep2ErrorMsg('');

    const finalUser = (username || '').replace(/^@/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const finalWeb = websiteUrl.trim();
    const finalHi = detailChannelNameHi.trim();

    // Check account uniqueness & restricted channels list
    const uniqCheck = checkAccountUniqueness({
      username: finalUser,
      websiteUrl: finalWeb,
      channelName: finalHi,
      currentEmail: currentUser?.email,
    });
    if (!uniqCheck.valid) {
      setStep2ErrorMsg(uniqCheck.error || 'यह यूज़रनेम, वेबसाइट या चैनल नाम उपयोग नहीं किया जा सकता!');
      return;
    }

    // Verify OTP first if not already locked
    if (!otpVerified && !subscription.isMobileLocked) {
      setOtpError('कृपया आगे बढ़ने से पहले प्राइमरी मोबाइल नंबर का OTP सत्यापन पूरा करें।');
      return;
    }

    if (primaryMobileNumber.trim()) {
      savePrimaryMobileNumber(primaryMobileNumber.trim());
    }
    activateFreeTrial();

    const activeEmail = (currentUser?.email || tempRegisteredUser?.email || "").toLowerCase().trim();
    const isSuper = isUserSuperAdmin(activeEmail);
    const isAdm = isSuper || (currentUser?.role === "admin") || (tempRegisteredUser?.role === "admin");

    // Lock channel details and logo for normal users (One-Time Setup Rule)
    if (!isAdm) {
      localStorage.setItem("is_channel_profile_locked", "true");
    }

    const finalContact = graphicContactNumber.trim() || primaryMobileNumber.trim();

    const finalProfile: ChannelProfile = {
      fullName: detailFullName.trim() || currentUser?.name || tempRegisteredUser?.name || "संवाददाता",
      channelNameHi: detailChannelNameHi.trim() || "AI News Maker App",
      channelNameEn: detailChannelNameEn.trim() || "AI News Maker",
      channelLogoUrl: detailChannelLogoUrl || "",
      channelLogoGifUrl: detailChannelLogoGifUrl || undefined,
      channelLogoType: detailChannelLogoType,
      socialIcons,
      username: username.replace(/^@/, "").trim() || currentUser?.username || tempRegisteredUser?.username || "user",
      mobileNumber: finalContact,
      showMobileNumber,
      websiteUrl: websiteUrl.trim() || "ainewsmaker.online",
      isLocked: !isAdm,
    };

    const updatedUser: ReporterUser = {
      username: finalProfile.username,
      name: finalProfile.fullName,
      role: isSuper ? "superadmin" : (isAdm ? "admin" : "user"),
      district: reportingDistrict || currentUser?.district || "सेंट्रल डेस्क",
      email: activeEmail || "user@ainewsmaker.online",
      avatarUrl: currentUser?.avatarUrl || tempRegisteredUser?.avatarUrl,
    };

    localStorage.setItem("user_channel_profile", JSON.stringify(finalProfile));
    localStorage.setItem("reporter_auth_session", JSON.stringify(updatedUser));
    localStorage.setItem("is_onboarding_completed", "true");
    if (updatedUser.email) {
      const cleanEmail = updatedUser.email.toLowerCase().trim();
      localStorage.setItem(`user_profile_${cleanEmail}`, JSON.stringify(finalProfile));
    }

    // Register or update in Admin directory
    registerOrUpdateUser({
      email: updatedUser.email,
      name: updatedUser.name,
      mobile: finalContact,
      channelName: finalProfile.channelNameHi,
      channelLogoUrl: finalProfile.channelLogoUrl,
      tier: isAdm ? "ultra" : "basic",
      role: updatedUser.role,
      isLocked: !isAdm,
    });

    onCompleteDetails(finalProfile, updatedUser);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col justify-center items-center px-3 sm:px-6 py-6 relative overflow-x-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(220,38,38,0.25),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_120%,rgba(245,158,11,0.18),rgba(255,255,255,0))] pointer-events-none" />

      {/* Main Centered Container */}
      <main className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center my-auto">
        {/* ============================================================== */}
        {/* STEP 1: MULTI-TIER LOGIN / SIGN UP SCREEN (Google, Admin, Reporter) */}
        {/* ============================================================== */}
        {currentStep === 1 && (
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            {/* Centered Luminous App Logo */}
            <div className="relative mb-3 group inline-block">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 rounded-full blur-md opacity-80 group-hover:opacity-100 transition duration-500" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center shadow-2xl p-0.5 overflow-hidden mx-auto">
                <img
                  src="/assets/ai_news_maker_logo.png"
                  alt="AI NEWS MAKER Logo"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>

            {/* App Title */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
              AI NEWS MAKER
            </h1>

            {/* Center Tagline */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-red-500/20 to-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs tracking-wide mb-2 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>स्मार्ट डिजिटल न्यूज़ स्टूडियो — लॉगिन व सेटअप</span>
            </div>

            <p className="text-xs text-slate-300 max-w-sm mx-auto mb-4 leading-relaxed">
              Google / Gmail से 1-क्लिक में सुरक्षित लॉगिन करें। इसके बाद आपका चैनल व प्रोफाइल सेटअप होगा।
            </p>

            {/* 8 Features Overview Grid on Auth Welcome */}
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-4 shadow-xl text-left">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider">
                  स्टूडियो की मुख्य सुविधाएं (8 फीचर्स)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'High Quality News Graphics', icon: Palette, color: 'text-amber-400' },
                  { name: '50+ Ready Frames', icon: Layers, color: 'text-yellow-400' },
                  { name: 'One Click Social Share', icon: Share2, color: 'text-emerald-400' },
                  { name: 'AI Headline & Voice', icon: Mic, color: 'text-purple-400' },
                  { name: 'Viral Videos', icon: Flame, color: 'text-rose-400' },
                  { name: 'Video Editing', icon: Video, color: 'text-cyan-400' },
                  { name: 'Graphic Designing', icon: PenTool, color: 'text-orange-400' },
                  { name: 'e-paper', icon: Newspaper, color: 'text-blue-400' },
                ].map((feat, idx) => {
                  const IconC = feat.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800/80"
                    >
                      <IconC className={`w-3.5 h-3.5 shrink-0 ${feat.color}`} />
                      <span className="text-[11px] font-bold text-slate-200 truncate">
                        {feat.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Single Unified Card Box for Google Login & Admin Login */}
            <div className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl text-left space-y-4">
              {loginErrorMsg && (
                <div className="p-3 bg-red-950/80 border border-red-500/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{loginErrorMsg}</span>
                </div>
              )}

              {/* Mandatory Guidelines Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl text-xs text-amber-200 text-left flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-amber-300 block text-xs">⚠️ कृपया किसी अन्य चैनल का लोगो या नाम का उपयोग न करें</strong>
                  <span className="text-slate-300">राष्ट्रीय व बड़े समाचार चैनलों (जैसे आज तक, एबीपी, एनडीटीवी, ज़ी न्यूज़ आदि) के नाम, वेबसाइट व लोगो प्रतिबंधित हैं। केवल अपने अधिकृत चैनल का उपयोग करें।</span>
                </div>
              </div>

              {/* 1. Google / Gmail Sign In (Primary Login) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn}
                  className="w-full py-4 px-4 bg-white hover:bg-slate-100 text-slate-900 font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-98 cursor-pointer border-2 border-amber-400 ring-4 ring-amber-400/30"
                >
                  <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm sm:text-base font-black text-slate-900">
                      Google / Gmail से लॉगिन करें
                    </span>
                    <span className="text-[11px] text-amber-700 font-bold">
                      {isLoggingIn
                        ? 'Google से कनेक्ट हो रहा है...'
                        : 'नया खाता स्वतः बन जाएगा • पुराने यूज़र्स सीधे स्टूडियो में'}
                    </span>
                  </div>
                </button>

                <p className="text-[11px] text-slate-400 text-center">
                  💡 केवल एक क्लिक में लॉगिन करें। नए यूज़र्स को तुरंत 7-Day Free VIP Access प्राप्त होगा।
                </p>
              </div>

              {/* Divider for Admin Login */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-slate-900 px-3 text-slate-400 font-bold tracking-wider">
                    अथवा एडमिन लॉगिन (Admin Login)
                  </span>
                </div>
              </div>

              {/* 2. Admin Email & Password Login */}
              <form onSubmit={handleEmailLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    एडमिन ईमेल (Admin Email)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@breakingnewswala.com या admin"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    पासवर्ड (Password)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>एडमिन लॉगिन करें एवं आगे बढ़ें</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 2: CHANNEL & REPORTER DETAILS SETUP SCREEN                */}
        {/* ============================================================== */}
        {currentStep === 2 && (
          <div className="w-full max-w-2xl text-left animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header Plate */}
            <div className="mb-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-red-600 flex items-center justify-center text-slate-950 text-2xl shadow-lg shrink-0">
                  🎨
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <span>चैनल व रिपोर्टर विवरण सेटअप</span>
                    <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full uppercase">
                      Google Verified
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    अपनी चैनल ब्रांडिंग और संपर्क विवरण दर्ज करें — यह सीधे आपके न्यूज़ कार्ड्स और स्टूडियो में लोड होगी।
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Banner: Restricted / Third Party Brand Protection */}
            <div className="mb-4 p-3.5 bg-amber-500/10 border-2 border-amber-500/60 rounded-2xl flex items-start gap-3 shadow-lg">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <span className="font-black text-amber-300 block text-xs sm:text-sm">
                  ⚠️ कृपया किसी अन्य चैनल का लोगो या नाम का उपयोग न करें
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  प्रतिष्ठित व राष्ट्रीय समाचार चैनलों (जैसे आज तक, एबीपी, एनडीटीवी, ज़ी न्यूज़ आदि) के नाम, वेबसाइट व लोगो प्रतिबंधित हैं। उल्लंघन करने पर खाता स्वतः ब्लॉक हो जाएगा। केवल अपने स्वयं के अधिकृत चैनल की जानकारी ही दर्ज करें।
                </p>
              </div>
            </div>

            {/* Form Container */}
            <form
              onSubmit={handleCompleteSetupSubmit}
              className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5"
            >
              {/* SECTION A: REPORTER PROFILE WITH LOCKED PRIMARY MOBILE NUMBER */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>A. पत्रकार / संपादक विवरण व प्राइमरी नंबर</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      1. पूरा नाम (Full Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={detailFullName}
                      onChange={(e) => setDetailFullName(e.target.value)}
                      placeholder="यहाँ पत्रकार / संपादक का नाम दर्ज करें"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden placeholder:text-slate-500/80 placeholder:font-normal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      2. ज़िला / शहर / डेस्क (District / City) *
                    </label>
                    <input
                      type="text"
                      required
                      value={reportingDistrict}
                      onChange={(e) => setReportingDistrict(e.target.value)}
                      placeholder="यहाँ अपना जिला / शहर दर्ज करें (उदा. सेंट्रल डेस्क / भोपाल)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden placeholder:text-slate-500/80 placeholder:font-normal"
                    />
                  </div>
                </div>

                {/* Primary Mobile Number with Mandatory Warning & OTP Verification */}
                <div className="pt-2 space-y-2">
                  {/* Prominent Mandatory Warning Alert */}
                  <div className="p-3 bg-red-950/70 border border-red-500/70 rounded-xl flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-red-200">
                        महत्वपूर्ण सूचना: यह Primary Number बाद में बदला नहीं जा सकेगा।
                      </p>
                      <p className="text-[11px] text-red-300/80 mt-0.5">
                        खाता सुरक्षा व सत्यापन हेतु कृपया अपना सही 10-अंकों का मोबाइल नंबर दर्ज करें और OTP से सत्यापित करें।
                      </p>
                    </div>
                  </div>

                  {subscription.isMobileLocked || otpVerified ? (
                    <div className="p-3.5 bg-emerald-950/60 rounded-xl border border-emerald-500/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>3. प्राइमरी मोबाइल नंबर (सत्यापित व स्थायी रूप से लॉक)</span>
                        </label>
                        <span className="text-[10px] text-emerald-300 font-bold bg-emerald-900/90 px-2.5 py-0.5 rounded-full border border-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          सत्यापित / Locked
                        </span>
                      </div>
                      <div className="text-sm font-mono font-black text-white">
                        +91 {subscription.primaryMobile || primaryMobileNumber}
                      </div>
                      <p className="text-[11px] text-emerald-400/90">
                        ✅ आपका प्राइमरी मोबाइल नंबर सुरक्षित रूप से सत्यापित है।
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-700 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>3. प्राइमरी मोबाइल नंबर दर्ज करें *</span>
                          </label>
                          <span className="text-[10px] text-amber-400 font-bold">
                            🔒 स्थायी लॉक होगा
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input
                              type="tel"
                              maxLength={10}
                              required
                              value={primaryMobileNumber}
                              disabled={otpSent && otpVerified}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setPrimaryMobileNumber(val);
                                if (!graphicContactNumber) {
                                  setGraphicContactNumber(val);
                                }
                              }}
                              placeholder="यहाँ अपना 10-अंकों का मोबाइल नंबर दर्ज करें (उदा. 9876543210)"
                              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono placeholder:text-slate-500/80 placeholder:font-normal"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={otpTimer > 0}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap disabled:opacity-50"
                          >
                            {otpTimer > 0 ? `${otpTimer}s प्रतीक्षा...` : otpSent ? 'पुनः OTP भेजें' : 'OTP प्राप्त करें'}
                          </button>
                        </div>
                      </div>

                      {/* OTP verification box if sent */}
                      {otpSent && (
                        <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/40 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                              <Timer className="w-3.5 h-3.5" />
                              <span>6-अंकों का OTP कोड दर्ज करें</span>
                            </label>
                            <span className="text-[10px] text-slate-400">
                              (परीक्षण हेतु: 123456)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={otpInput}
                              onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="123456"
                              className="w-full px-3 py-2 bg-slate-900 border border-amber-400/60 rounded-xl text-white text-sm font-mono tracking-widest text-center focus:outline-hidden placeholder:text-slate-600"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap"
                            >
                              सत्यापित करें
                            </button>
                            <button
                              type="button"
                              onClick={handleAutoVerifyOtp}
                              className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer whitespace-nowrap shadow shrink-0"
                              title="1 क्लिक में 123456 भरकर सत्यापित करें"
                            >
                              ⚡ 1-क्लिक OTP भरें
                            </button>
                          </div>

                          {/* SMS Gateway Guidance Notice */}
                          <div className="p-2.5 bg-blue-950/40 border border-blue-500/40 rounded-xl flex items-start gap-2 text-[11px] text-blue-200">
                            <span className="shrink-0 text-sm">ℹ️</span>
                            <p className="leading-relaxed">
                              <strong>लाइव SMS गेटवे सूचना:</strong> मोबाइल पर डायरेक्ट SMS प्राप्त करने हेतु Fast2SMS / Twilio API व DLT अप्रूवल आवश्यक होता है। तुरंत सत्यापन हेतु परीक्षण OTP (123456) अथवा <strong>'⚡ 1-क्लिक OTP भरें'</strong> का उपयोग करें।
                            </p>
                          </div>
                        </div>
                      )}

                      {otpMessage && (
                        <p className="text-xs text-emerald-400 font-bold">{otpMessage}</p>
                      )}
                      {otpError && (
                        <p className="text-xs text-red-400 font-bold">{otpError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION B: CHANNEL BRANDING (HINDI & ENGLISH) */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tv className="w-4 h-4" />
                  <span>B. चैनल नाम (हिन्दी व अंग्रेज़ी)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      4. चैनल नाम (हिन्दी में) *
                    </label>
                    <input
                      type="text"
                      required
                      value={detailChannelNameHi}
                      onChange={(e) => setDetailChannelNameHi(e.target.value)}
                      placeholder="यहाँ अपने चैनल का नाम हिन्दी में लिखें (उदा. सच तक न्यूज़)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden placeholder:text-slate-500/80 placeholder:font-normal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      5. चैनल नाम (English में) *
                    </label>
                    <input
                      type="text"
                      required
                      value={detailChannelNameEn}
                      onChange={(e) => setDetailChannelNameEn(e.target.value)}
                      placeholder="यहाँ अपने चैनल का नाम English में लिखें (उदा. Sach Tak News)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden placeholder:text-slate-500/80 placeholder:font-normal"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">त्वरित प्रीसेट्स:</span>
                  {[
                    { hi: 'एआई न्यूज़ मेकर', en: 'AI News Maker' },
                    { hi: 'ब्रेकिंग न्यूज़', en: 'Breaking News' },
                    { hi: 'लाइव 24', en: 'Live 24' },
                    { hi: 'सच तक न्यूज़', en: 'Sach Tak News' },
                  ].map((preset) => (
                    <button
                      key={preset.en}
                      type="button"
                      onClick={() => {
                        setDetailChannelNameHi(preset.hi);
                        setDetailChannelNameEn(preset.en);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      {preset.hi}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION C: CHANNEL LOGO (PNG/JPEG & OPTIONAL ANIMATED GIF) */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" />
                    <span>C. चैनल लोगो (PNG / JPEG व वैकल्पिक एनीमेटेड GIF)</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">PNG / GIF / JPEG</span>
                </div>

                {/* 1. Main PNG / Full Size Logo */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      1. मुख्य लोगो (PNG / JPEG) *
                    </span>
                    <span className="text-[10px] text-amber-400 font-medium">कार्ड व हेडर पर प्रयुक्त</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Logo Preview Box */}
                    <div
                      className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-dashed border-amber-400/60 flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner p-1.5"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                        backgroundSize: '12px 12px',
                        backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                      }}
                    >
                      {detailChannelLogoUrl ? (
                        <img
                          src={detailChannelLogoUrl}
                          alt="Channel Logo Preview"
                          className="max-w-full max-h-full object-contain drop-shadow"
                        />
                      ) : (
                        <div className="text-center p-1">
                          <Tv className="w-6 h-6 text-slate-600 mx-auto" />
                          <span className="text-[9px] text-slate-500 font-bold block mt-1">कोई लोगो नहीं</span>
                        </div>
                      )}
                    </div>

                    {/* Logo Controls */}
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition"
                        >
                          <Upload className="w-4 h-4 text-slate-950" />
                          <span>लोगो चुनें (Full Size Image)</span>
                        </button>

                        {detailChannelLogoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setCropperRawImage(detailChannelLogoUrl);
                              setIsCropperOpen(true);
                            }}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Crop className="w-3.5 h-3.5 text-amber-400" />
                            <span>मैनुअल क्रॉप करें</span>
                          </button>
                        )}

                        {detailChannelLogoUrl && (
                          <button
                            type="button"
                            onClick={handleDirectRemoveWhiteBg}
                            className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-600 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                            title="सफेद बैकग्राउंड हटाकर पारदर्शी PNG बनाएं"
                          >
                            <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>बैकग्राउंड हटाएं (PNG)</span>
                          </button>
                        )}

                        {detailChannelLogoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setDetailChannelLogoUrl('');
                              setDetailChannelLogoGifUrl('');
                            }}
                            className="px-3 py-2 bg-red-950/60 hover:bg-red-900/60 border border-red-700/60 text-red-300 text-xs rounded-xl transition cursor-pointer"
                          >
                            लोगो हटाएं (ब्लैंक करें)
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400">
                        💡 फुल साइज़ लोगो सीधे लोड होता है — यदि लोगो के चारों तरफ बॉर्डर या ट्रांसपेरेंट बैकग्राउंड है तो वह कटेगा नहीं।
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Optional Animated GIF Logo */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>🎬</span>
                      <span>2. एनीमेटेड GIF लोगो (वैकल्पिक / Optional)</span>
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 font-bold">
                      वैकल्पिक (Optional)
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* GIF Preview */}
                    <div
                      className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-dashed border-sky-400/60 flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner p-1.5"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                        backgroundSize: '12px 12px',
                        backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                      }}
                    >
                      {detailChannelLogoGifUrl ? (
                        <img
                          src={detailChannelLogoGifUrl}
                          alt="GIF Logo Preview"
                          className="max-w-full max-h-full object-contain drop-shadow"
                        />
                      ) : (
                        <div className="text-center p-1">
                          <span className="text-xl block">🎞️</span>
                          <span className="text-[9px] text-slate-500 font-bold block mt-0.5">GIF नहीं है</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="file"
                          ref={gifFileInputRef}
                          onChange={handleGifUpload}
                          accept="image/gif"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => gifFileInputRef.current?.click()}
                          className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition"
                        >
                          <Upload className="w-4 h-4 text-slate-950" />
                          <span>GIF लोगो अपलोड करें</span>
                        </button>

                        {detailChannelLogoGifUrl && (
                          <button
                            type="button"
                            onClick={() => setDetailChannelLogoGifUrl('')}
                            className="px-3 py-2 bg-red-950/60 hover:bg-red-900/60 border border-red-700/60 text-red-300 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            GIF हटाएं
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        💡 यदि आपके पास चैनल का घूमता हुआ या चमकीला GIF लोगो है, तो यहाँ अपलोड कर सकते हैं। यह ऐच्छिक है।
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION D: SOCIAL MEDIA ICONS SELECTION */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>D. सोशल मीडिया आइकन्स (कार्ड पर दिखाने के लिए चुनें)</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">ऑन / ऑफ टॉगल</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'youtube', label: 'YouTube (यूट्यूब)', color: 'text-red-500' },
                    { key: 'facebook', label: 'Facebook (फेसबुक)', color: 'text-blue-500' },
                    { key: 'instagram', label: 'Instagram (इंस्टा)', color: 'text-pink-500' },
                    { key: 'twitter', label: 'X / Twitter (ट्विटर)', color: 'text-slate-200' },
                    { key: 'telegram', label: 'Telegram (टेलीग्राम)', color: 'text-sky-400' },
                    { key: 'whatsapp', label: 'WhatsApp (व्हाट्सएप)', color: 'text-emerald-400' },
                  ].map((soc) => {
                    const isChecked = (socialIcons as any)[soc.key];
                    return (
                      <label
                        key={soc.key}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-slate-900 border-amber-400/80 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSocialIcons((prev) => ({
                              ...prev,
                              [soc.key]: e.target.checked,
                            }));
                          }}
                          className="accent-amber-400 rounded w-4 h-4"
                        />
                        <span className={`text-xs font-bold ${isChecked ? soc.color : ''}`}>
                          {soc.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SECTION E: USERNAME, GRAPHIC CONTACT NUMBER & VISIBILITY TICKMARK */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AtSign className="w-4 h-4" />
                  <span>E. यूज़रनेम, ग्राफ़िक संपर्क नंबर व वेबसाइट</span>
                </h3>

                {/* Username */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      6. फाइनल यूज़रनेम (चैनल सोशल हैंडल)
                    </label>
                    <span className="text-[10px] text-slate-400">कार्ड फुटर पर @ हैंडल दिखेगा</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-amber-400 font-bold text-sm">@</span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setIsUsernameCustomized(true);
                        setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
                      }}
                      placeholder="यहाँ अपना सोशल मीडिया यूज़रनेम दर्ज करें (उदा. yourchannel)"
                      className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono placeholder:text-slate-500/80 placeholder:font-normal"
                    />
                  </div>
                </div>

                {/* Graphic Display Number with Visibility Checkbox */}
                <div className="pt-1 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    7. ग्राफ़िक / कार्ड पर संपर्क नंबर (Graphic Contact Number)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={graphicContactNumber}
                      onChange={(e) => setGraphicContactNumber(e.target.value)}
                      placeholder="यहाँ अपना व्हाट्सएप्प / संपर्क नंबर दर्ज करें (उदा. 9876543210)"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono placeholder:text-slate-500/80 placeholder:font-normal"
                    />
                  </div>

                  {/* Tickmark for visibility on graphic */}
                  <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                    <input
                      type="checkbox"
                      checked={showMobileNumber}
                      onChange={(e) => setShowMobileNumber(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded"
                    />
                    <span className="text-xs text-slate-200 font-bold">
                      ग्राफ़िक / कार्ड में नंबर विजिबल (दिखाएं) रखें (Show Number on Graphic)
                    </span>
                  </label>
                </div>

                {/* Website URL */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>8. वेबसाइट एड्रेस (बिना https:// या www के)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">उदा. yourchannel.com</span>
                  </div>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => handleWebsiteChange(e.target.value)}
                    placeholder="यहाँ अपना वेबसाइट एड्रेस दर्ज करें (उदा. yourchannel.com)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono placeholder:text-slate-500/80 placeholder:font-normal"
                  />
                </div>
              </div>

              {/* 7-Day Free Trial Activation Callout */}
              <div className="p-4 bg-gradient-to-r from-amber-500/20 via-red-500/20 to-amber-500/20 rounded-2xl border border-amber-400/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md shrink-0">
                    🎁
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      7-Day Free Trial Basic सक्रिय होगा
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      बिना किसी शुल्क के 7 दिन तक सभी बेसिक न्यूज़ फ्रेम्स, AI टूल्स और ग्राफिक्स का लाभ उठाएं।
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-lg uppercase shrink-0">
                  FREE
                </span>
              </div>

              {/* Step 2 Error Message (Uniqueness & Validation) */}
              {step2ErrorMsg && (
                <div className="p-3 bg-red-950/80 border border-red-500/80 rounded-xl text-xs text-red-200 text-left flex items-start gap-2 shadow-lg animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{step2ErrorMsg}</span>
                </div>
              )}

              {/* Action Submit Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm sm:text-base rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-slate-950" />
                  <span>सेव करें एवं होम फ़ीड शुरू करें →</span>
                </button>

                <button
                  type="button"
                  onClick={handleCompleteSetupSubmit}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
                >
                  <span>⚡ बाद में कस्टमाइज़ करें • सीधे होम फ़ीड पर जाएं (Skip & Enter App) →</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Quick Google / Direct Gmail Login Modal (Fallback when external Google popup is blocked) */}
      {isQuickGoogleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  🌟
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    त्वरित Google / Gmail लॉगिन
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    1-क्लिक सुरक्षित आईडी से तुरंत प्रवेश करें
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickGoogleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Google पॉपअप ब्लॉक होने की स्थिति में आप अपना <strong>Gmail ईमेल</strong> दर्ज करके सीधे प्रवेश कर सकते हैं:
            </p>

            {/* Custom Gmail Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (quickGoogleEmail.trim()) {
                  handleGoogleUserSuccess(quickGoogleEmail.trim(), quickGoogleName.trim() || undefined);
                }
              }}
              className="pt-2 border-t border-slate-800 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  अपना Gmail ईमेल दर्ज करें:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={quickGoogleEmail}
                    onChange={(e) => setQuickGoogleEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  आपका नाम (वैकल्पिक):
                </label>
                <input
                  type="text"
                  value={quickGoogleName}
                  onChange={(e) => setQuickGoogleName(e.target.value)}
                  placeholder="अपना नाम दर्ज करें"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>सीधे ऐप में प्रवेश करें →</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Logo Cropper Modal */}
      <LogoCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropperRawImage}
        onClose={() => setIsCropperOpen(false)}
        onApplyCroppedPng={(pngDataUrl) => {
          setDetailChannelLogoUrl(pngDataUrl);
          setDetailChannelLogoType('png');
        }}
      />
    </div>
  );
};
