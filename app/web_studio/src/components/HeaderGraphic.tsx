import React from 'react';

interface HeaderGraphicProps {
  customHeaderPng?: string;
  brandTagline?: string;
  brandName?: string;
  customLogoUrl?: string;
  logoScale?: number;
}

export const HeaderGraphic: React.FC<HeaderGraphicProps> = ({
  customHeaderPng,
  brandTagline,
  brandName,
  customLogoUrl,
  logoScale = 1.25,
}) => {
  // If user uploaded a custom header PNG, render it directly
  if (customHeaderPng) {
    return (
      <div className="absolute top-0 inset-x-0 z-20 pointer-events-none select-none">
        <img
          src={customHeaderPng}
          alt="News Card Header"
          className="w-full h-auto object-contain object-top drop-shadow-md block"
        />
      </div>
    );
  }

  // Check if custom brand is configured (either custom logo exists, or custom brand name exists)
  const isCustomBranded = Boolean(
    customLogoUrl ||
    (brandName && brandName.trim() !== '' && brandName.trim() !== 'योर लोगो')
  );

  return (
    <div className="absolute top-0 inset-x-0 z-20 pointer-events-none select-none flex items-start justify-between">
      {/* 1. Left: Official Brand / Channel Logo Box OR Clean 'योर लोगो' Placeholder */}
      <div className="pt-3.5 pl-3.5 sm:pt-4 sm:pl-4">
        {isCustomBranded ? (
          <div className="flex items-center gap-2 sm:gap-2.5 max-w-[260px] sm:max-w-[300px] pointer-events-auto">
            {/* Custom Logo Image (Transparent / No colored background) OR Vector Emblem */}
            {customLogoUrl ? (
              <div
                style={{
                  transform: `scale(${logoScale ?? 1.25})`,
                  transformOrigin: 'left center',
                }}
                className="relative max-h-12 sm:max-h-16 flex items-center justify-center shrink-0 transition-transform"
              >
                <img
                  src={customLogoUrl}
                  alt="Channel Logo"
                  className="max-h-12 sm:max-h-16 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                />
              </div>
            ) : (
              <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-blue-900 via-blue-700 to-blue-500 border-2 border-yellow-300 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white/95" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
            )}

            {/* Text: Custom Brand Name + Tagline */}
            <div className="flex flex-col leading-none">
              <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-black text-base sm:text-lg tracking-tight font-['Mukta']">
                {brandName}
              </span>
              {brandTagline && (
                <div className="bg-black text-white text-[8px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded tracking-tight mt-1 whitespace-nowrap font-['Noto_Sans_Devanagari']">
                  {brandTagline}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Clean Sample Placeholder: 'YOUR LOGO' */
          <div className="flex flex-col text-left leading-[0.88] select-none pointer-events-auto bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-neutral-300 shadow-sm">
            <span className="text-xl sm:text-2xl font-black text-black tracking-wider font-['Mukta',sans-serif]">
              YOUR
            </span>
            <span className="text-xl sm:text-2xl font-black text-black tracking-wider font-['Mukta',sans-serif]">
              LOGO
            </span>
          </div>
        )}
      </div>

      {/* 2. Right: Signature Curved Stripes cascading down from top-right */}
      <div className="shrink-0">
        <svg
          width="130"
          height="155"
          viewBox="0 0 130 155"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-24 sm:w-32 h-auto"
        >
          {/* Black background curve */}
          <path
            d="M130 0H20C65 24 115 65 130 155V0Z"
            fill="#050505"
          />
          {/* Yellow curve */}
          <path
            d="M130 0H38C75 22 118 60 130 135V0Z"
            fill="#FFDD00"
          />
          {/* Red curve */}
          <path
            d="M130 0H56C90 20 120 54 130 110V0Z"
            fill="#E50914"
          />
        </svg>
      </div>
    </div>
  );
};
