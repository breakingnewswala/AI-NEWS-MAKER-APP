import React from 'react';

export interface FooterGraphicProps {
  socialHandle?: string;
  whatsappNumber?: string;
  customFooterPng?: string;
  websiteUrl?: string;
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

export const FooterGraphic: React.FC<FooterGraphicProps> = ({
  socialHandle,
  whatsappNumber,
  customFooterPng,
  websiteUrl,
  showMobileNumber = true,
  activeSocialIcons = ['instagram', 'facebook', 'twitter', 'youtube'],
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
  const separatorColor = isLightBg ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.35)';

  const hasIcon = (name: string) => {
    if (!activeSocialIcons || activeSocialIcons.length === 0) return false;
    return activeSocialIcons.includes(name);
  };

  const cleanWebsite = websiteUrl ? websiteUrl.replace(/^(https?:\/\/)?(www\.)?/, '').trim() : '';
  const cleanPhone = showMobileNumber && whatsappNumber ? whatsappNumber.replace(/^\/+/, '').trim() : '';
  const displayHandle = socialHandle
    ? (socialHandle.startsWith('@') ? socialHandle : `@${socialHandle}`)
    : '';

  // Calculate active items count to adjust responsive font & icon sizes
  const socialPlatforms = ['youtube', 'facebook', 'instagram', 'twitter', 'telegram'];
  const visibleSocialIcons = (activeSocialIcons || []).filter((icon) => socialPlatforms.includes(icon));
  const hasSocial = Boolean(displayHandle || visibleSocialIcons.length > 0);
  const hasWeb = Boolean(cleanWebsite);
  const hasContact = Boolean(cleanPhone);
  const totalItemsCount = (hasSocial ? 1 : 0) + (hasWeb ? 1 : 0) + (hasContact ? 1 : 0);

  // Responsive styling variables
  const isCompact = totalItemsCount >= 3;
  const textSizeClass = isCompact ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-xs';
  const iconContainerSizeClass = isCompact ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4 sm:w-4.5 sm:h-4.5';
  const svgSizeClass = isCompact ? 'w-2 h-2 sm:w-2.5 sm:h-2.5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3';
  const gapClass = isCompact ? 'gap-1 sm:gap-2' : 'gap-1.5 sm:gap-2.5';
  const pyClass = isCompact ? 'py-1.5 sm:py-2' : 'py-2 sm:py-2.5';

  // Helper to determine icon style classes
  const getIconContainerStyle = (platform: 'youtube' | 'facebook' | 'instagram' | 'twitter' | 'telegram' | 'whatsapp') => {
    if (footerIconStyle === 'color') {
      switch (platform) {
        case 'youtube':
          return { backgroundColor: '#FF0000', color: '#FFFFFF' };
        case 'facebook':
          return { backgroundColor: '#1877F2', color: '#FFFFFF' };
        case 'instagram':
          return {
            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
            color: '#FFFFFF',
          };
        case 'twitter':
          return { backgroundColor: '#000000', color: '#FFFFFF' };
        case 'telegram':
          return { backgroundColor: '#24A1DE', color: '#FFFFFF' };
        case 'whatsapp':
          return { backgroundColor: '#25D366', color: '#FFFFFF' };
      }
    } else if (footerIconStyle === 'dark') {
      return { backgroundColor: '#000000', color: '#FFFFFF' };
    } else {
      // Neutral icon style
      return isLightBg
        ? { backgroundColor: '#E2E8F0', color: '#1E293B' }
        : { backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' };
    }
  };

  return (
    <div
      style={{
        backgroundColor: footerBgColor,
        color: effectiveTextColor,
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
      className={`w-full border-t border-neutral-200/50 px-1.5 sm:px-4 ${pyClass} flex items-center justify-center shadow-inner select-none overflow-hidden text-center`}
    >
      {/* Master Branding Active Blocks: Strict order ONE (Social) -> TWO (Website) -> THREE (Contact) */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-3.5 max-w-full overflow-hidden flex-nowrap sm:flex-nowrap text-center text-ellipsis">
        {/* Section 1: Social Media Icons + Handle */}
        {hasSocial && (
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0">
            {/* YouTube */}
            {hasIcon('youtube') && (
              <div
                style={getIconContainerStyle('youtube')}
                className={`${iconContainerSizeClass} rounded-full flex items-center justify-center shrink-0 shadow-xs`}
                title="YouTube"
              >
                <svg className={svgSizeClass} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 15l5-3-5-3v6z" />
                  <path d="M21.5 8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C15.6 4.8 12 4.8 12 4.8s-3.6 0-6.6.3c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S2.2 9.6 2.2 11.2v1.6c0 1.6.3 3.2.3 3.2s.2 1.4.8 2c.8.8 1.9.8 2.4.9 1.7.2 6.3.3 6.3.3s3.6 0 6.6-.3c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.3-1.6.3-3.2v-1.6c0-1.6-.3-3.2-.3-3.2z" />
                </svg>
              </div>
            )}

            {/* Facebook */}
            {hasIcon('facebook') && (
              <div
                style={getIconContainerStyle('facebook')}
                className={`${iconContainerSizeClass} rounded-full flex items-center justify-center shrink-0 shadow-xs`}
                title="Facebook"
              >
                <svg className={svgSizeClass} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </div>
            )}

            {/* Instagram */}
            {hasIcon('instagram') && (
              <div
                style={getIconContainerStyle('instagram')}
                className={`${iconContainerSizeClass} rounded-full flex items-center justify-center shrink-0 shadow-xs`}
                title="Instagram"
              >
                <svg className={svgSizeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </div>
            )}

            {/* X (Twitter) */}
            {hasIcon('twitter') && (
              <div
                style={getIconContainerStyle('twitter')}
                className={`${iconContainerSizeClass} rounded-full flex items-center justify-center shrink-0 shadow-xs`}
                title="X"
              >
                <svg className={svgSizeClass} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
            )}

            {/* Telegram */}
            {hasIcon('telegram') && (
              <div
                style={getIconContainerStyle('telegram')}
                className={`${iconContainerSizeClass} rounded-full flex items-center justify-center shrink-0 shadow-xs`}
                title="Telegram"
              >
                <svg className={svgSizeClass} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .42z" />
                </svg>
              </div>
            )}

            {/* Social Handle (No internal divider between icon and text) */}
            {displayHandle && (
              <span
                style={{ color: effectiveTextColor, fontFamily: 'Arial, Helvetica, sans-serif' }}
                className={`font-black ${textSizeClass} tracking-tight shrink-0`}
              >
                {displayHandle}
              </span>
            )}
          </div>
        )}

        {/* Partition Divider between Section 1 and Section 2 */}
        {hasSocial && hasWeb && (
          <span
            style={{ color: separatorColor }}
            className="select-none text-xs font-light opacity-60 shrink-0 px-0.5"
            aria-hidden="true"
          >
            |
          </span>
        )}

        {/* Section 2: Website (+ Icon) */}
        {hasWeb && (
          <div className="flex items-center justify-center gap-1 shrink-0">
            <svg
              style={{ color: effectiveTextColor }}
              className={svgSizeClass}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span
              style={{ color: effectiveTextColor, fontFamily: 'Arial, Helvetica, sans-serif' }}
              className={`font-extrabold ${textSizeClass} tracking-tight whitespace-nowrap`}
            >
              {cleanWebsite}
            </span>
          </div>
        )}

        {/* Partition Divider before Section 3 (if either Section 1 or Section 2 is active) */}
        {hasContact && (hasSocial || hasWeb) && (
          <span
            style={{ color: separatorColor }}
            className="select-none text-xs font-light opacity-60 shrink-0 px-0.5"
            aria-hidden="true"
          >
            |
          </span>
        )}

        {/* Section 3: WhatsApp + Contact */}
        {hasContact && (
          <div className="flex items-center justify-center gap-1 shrink-0">
            <div
              style={getIconContainerStyle('whatsapp')}
              className={`${iconContainerSizeClass} rounded-full flex items-center justify-center shrink-0 shadow-xs`}
              title="WhatsApp"
            >
              <svg className={svgSizeClass} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.36-.77-1.86c-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.13.16 1.74 2.65 4.21 3.72.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.18-.47-.3z"/>
              </svg>
            </div>
            <span
              style={{ color: effectiveTextColor, fontFamily: 'Arial, Helvetica, sans-serif' }}
              className={`font-black ${textSizeClass} tracking-tight whitespace-nowrap`}
            >
              {cleanPhone.startsWith('+') || cleanPhone.startsWith('/') ? cleanPhone : `+91 ${cleanPhone}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
