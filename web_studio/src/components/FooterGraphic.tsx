import React from 'react';
import { getSocialIconSrc } from '../lib/socialIconsData';

export interface FooterGraphicProps {
  channelName?: string;
  socialHandle?: string;
  whatsappNumber?: string;
  customFooterPng?: string;
  websiteUrl?: string;
  showWebsite?: boolean;
  showMobileNumber?: boolean;
  activeSocialIcons?: string[];
  footerBgColor?: string;
  footerTextColor?: string;
  footerIconStyle?: 'color' | 'dark' | 'neutral';
  showMasterBranding?: boolean;
}

function getLuminance(hexColor: string): number {
  const cleanHex = (hexColor || '#FFFFFF').replace('#', '').trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return 1.0;
}

// Icon asset file paths matching uploaded images
const ICON_PATHS: Record<string, string> = {
  facebook: '/assets/icons/facebook.png',
  instagram: '/assets/icons/instagram.png',
  twitter: '/assets/icons/twitter.png',
  x: '/assets/icons/x.png',
  youtube: '/assets/icons/youtube.png',
  linkedin: '/assets/icons/linkedin.png',
  whatsapp: '/assets/icons/whatsapp.png',
  website: '/assets/icons/website.png',
};

export const FooterGraphic: React.FC<FooterGraphicProps> = ({
  socialHandle,
  whatsappNumber,
  customFooterPng,
  websiteUrl,
  showWebsite = true,
  showMobileNumber = true,
  activeSocialIcons = [],
  footerBgColor = '#FFFFFF',
  footerTextColor,
  footerIconStyle = 'color',
  showMasterBranding = true,
}) => {
  // If user provided custom Footer.png file, render it directly
  if (customFooterPng) {
    return (
      <div className="w-full bg-white select-none overflow-hidden">
        <img
          src={customFooterPng}
          alt="News Card Footer"
          className="w-full h-auto object-contain block"
        />
      </div>
    );
  }

  // If Master Branding is disabled and no custom footer PNG, hide footer completely
  if (showMasterBranding === false) {
    return null;
  }

  // Calculate Contrast & Colors
  const luminance = getLuminance(footerBgColor);
  const isLightBg = luminance >= 0.5;
  const effectiveTextColor = footerTextColor && footerTextColor.trim() !== ''
    ? footerTextColor
    : (isLightBg ? '#0F172A' : '#FFFFFF');
  const separatorColor = isLightBg ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.45)';

  // 1. Social Username: From user profile only, no hardcoded '@AINewsMaker' default
  const rawHandle = (socialHandle || '').trim();
  const displayHandle = rawHandle
    ? (rawHandle.startsWith('@') || rawHandle.startsWith('/') ? rawHandle : `@${rawHandle}`)
    : '';

  // Social platforms: Facebook and Instagram are MANDATORY & locked (always included); YouTube, Twitter/X, LinkedIn optional
  const socialIconsList: string[] = [];
  if (activeSocialIcons.includes('youtube')) socialIconsList.push('youtube');
  // Facebook & Instagram are ALWAYS active and locked
  socialIconsList.push('facebook');
  socialIconsList.push('instagram');
  if (activeSocialIcons.includes('twitter') || activeSocialIcons.includes('x')) {
    socialIconsList.push(activeSocialIcons.includes('x') ? 'x' : 'twitter');
  }
  if (activeSocialIcons.includes('linkedin')) socialIconsList.push('linkedin');

  // 2. Website Element (Element 2) - Only if provided & enabled, no defaults
  const cleanWebsite = (websiteUrl || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
  const isWebsiteActive = Boolean(showWebsite !== false && cleanWebsite);

  // 3. WhatsApp Element (Element 3) - Only if provided & enabled, no defaults
  const rawPhone = (whatsappNumber || '').trim().replace(/^\/+/, '');
  const cleanPhone = showMobileNumber !== false && rawPhone ? rawPhone : '';
  const isWhatsappActive = Boolean(showMobileNumber !== false && cleanPhone);

  // Format phone display
  const displayPhone = cleanPhone
    ? (cleanPhone.startsWith('+') ? cleanPhone : `+91 ${cleanPhone}`)
    : '';

  // Determine active elements count for dynamic centering and adaptive sizing
  const activeElements: ('social' | 'website' | 'whatsapp')[] = ['social'];
  if (isWebsiteActive) activeElements.push('website');
  if (isWhatsappActive) activeElements.push('whatsapp');

  const totalActive = activeElements.length;
  const isMulti = totalActive >= 2;

  // Responsive larger typography & uncropped icon sizes (Task 2 & User Request: icon and text further enlarged)
  const textSizeClass = totalActive >= 3
    ? 'text-[13.5px] sm:text-[15px]'
    : isMulti
    ? 'text-[14.5px] sm:text-[16px]'
    : 'text-[15.5px] sm:text-[17.5px]';

  const iconSizeClass = totalActive >= 3
    ? 'w-5 h-5 sm:w-5.5 sm:h-5.5'
    : isMulti
    ? 'w-5.5 h-5.5 sm:w-6 sm:h-6'
    : 'w-6 h-6 sm:w-6.5 sm:h-6.5';

  const pyClass = isMulti ? 'py-2 sm:py-2.5' : 'py-2.5 sm:py-3';
  const gapClass = totalActive >= 3 ? 'gap-2.5 sm:gap-4' : 'gap-3.5 sm:gap-5.5';

  return (
    <div
      style={{
        backgroundColor: footerBgColor,
        color: effectiveTextColor,
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
      className={`w-full border-t border-neutral-300/40 px-2 sm:px-4 ${pyClass} flex items-center justify-center select-none overflow-hidden text-center`}
    >
      {/* Dynamic Center Aligned Elements Row: Up to 3 elements, centered */}
      <div className={`flex items-center justify-center ${gapClass} max-w-full overflow-hidden flex-nowrap text-center`}>
        {/* ELEMENT 1: Social Media Icons + Username (No circular crop, original shape preserved) */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
          {/* Social Icons list: Original files, object-contain, natural shape */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {socialIconsList.map((platform) => (
              <img
                key={platform}
                src={getSocialIconSrc(platform)}
                alt={platform}
                className={`${iconSizeClass} object-contain shrink-0`}
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = ICON_PATHS[platform] || `/assets/icons/${platform}.png`;
                }}
              />
            ))}
          </div>

          {/* Social Username (only if present in user profile) */}
          {displayHandle && (
            <span
              style={{ color: effectiveTextColor, fontFamily: 'Arial, Helvetica, sans-serif' }}
              className={`font-black ${textSizeClass} tracking-tight whitespace-nowrap`}
            >
              {displayHandle}
            </span>
          )}
        </div>

        {/* Partition Divider 1 (between Social and Website, OR Social and WhatsApp if Website is hidden) */}
        {(isWebsiteActive || isWhatsappActive) && (
          <span
            style={{ color: separatorColor }}
            className="select-none text-xs sm:text-sm font-light opacity-50 shrink-0 px-0.5"
            aria-hidden="true"
          >
            |
          </span>
        )}

        {/* ELEMENT 2: Website Icon + Website Address (if enabled & provided) */}
        {isWebsiteActive && (
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
            <img
              src={getSocialIconSrc('website')}
              alt="Website"
              className={`${iconSizeClass} object-contain shrink-0`}
              loading="eager"
              onError={(e) => {
                const target = e.currentTarget;
                target.src = ICON_PATHS.website || '/assets/icons/website.png';
              }}
            />
            <span
              style={{ color: effectiveTextColor, fontFamily: 'Arial, Helvetica, sans-serif' }}
              className={`font-black ${textSizeClass} tracking-tight whitespace-nowrap`}
            >
              {cleanWebsite}
            </span>
          </div>
        )}

        {/* Partition Divider 2 (between Website and WhatsApp if both are active) */}
        {isWebsiteActive && isWhatsappActive && (
          <span
            style={{ color: separatorColor }}
            className="select-none text-xs sm:text-sm font-light opacity-50 shrink-0 px-0.5"
            aria-hidden="true"
          >
            |
          </span>
        )}

        {/* ELEMENT 3: WhatsApp Icon + WhatsApp Number (if enabled & provided) */}
        {isWhatsappActive && (
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
            <img
              src={getSocialIconSrc('whatsapp')}
              alt="WhatsApp"
              className={`${iconSizeClass} object-contain shrink-0`}
              loading="eager"
              onError={(e) => {
                const target = e.currentTarget;
                target.src = ICON_PATHS.whatsapp || '/assets/icons/whatsapp.png';
              }}
            />
            <span
              style={{ color: effectiveTextColor, fontFamily: 'Arial, Helvetica, sans-serif' }}
              className={`font-black ${textSizeClass} tracking-tight whitespace-nowrap`}
            >
              {displayPhone}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
