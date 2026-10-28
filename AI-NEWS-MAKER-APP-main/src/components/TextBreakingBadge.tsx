import React from 'react';
import { TextBreakingBadgeStyle } from '../types';

interface TextBreakingBadgeProps {
  style?: TextBreakingBadgeStyle;
  customTitle?: string;
  titleSize?: 'sm' | 'md' | 'lg';
  className?: string;
  scale?: number; // Scaling factor for preview
}

export const TEXT_BREAKING_OPTIONS: {
  id: TextBreakingBadgeStyle;
  name: string;
  description: string;
  previewLabel: string;
}[] = [
  {
    id: 'breaking-3d-en',
    name: '3D रेड (BREAKING NEWS)',
    description: 'अंग्रेजी 2-लाइन 3D बोल्ड रेड (ABP जैसा)',
    previewLabel: 'BREAKING NEWS',
  },
  {
    id: 'breaking-3d-hi',
    name: '3D हिंदी (ब्रेकिंग न्यूज़)',
    description: 'हिंदी 2-लाइन 3D बोल्ड रेड अक्षर',
    previewLabel: 'ब्रेकिंग न्यूज़',
  },
  {
    id: 'breaking-flat-red',
    name: 'फ्लैट मॉडर्न रेड (कम 3D)',
    description: 'साफ़ व आधुनिक, कम 3D - पढ़ने में एकदम आसान व स्पष्ट',
    previewLabel: 'BREAKING NEWS',
  },
  {
    id: 'breaking-solid-bar',
    name: 'सॉलिड टीवी बार (Solid Plate)',
    description: 'लाल सॉलिड बैकड्रॉप पर सफेद अक्षर (सुपर क्लियर)',
    previewLabel: '● BREAKING NEWS',
  },
  {
    id: 'breaking-simple-hi',
    name: 'सिंपल हिंदी बोल्ड (फ्लैट)',
    description: 'स्पष्ट पठनीय हिंदी ब्रेकिंग न्यूज़ (बिना 3D उलझन)',
    previewLabel: 'ब्रेकिंग न्यूज़',
  },
  {
    id: 'breaking-ribbon',
    name: '3D ग्लोसी रेड रिबन',
    description: 'गोल्डन किनारों वाला 3D लाल रिबन बैज',
    previewLabel: '★ BREAKING NEWS ★',
  },
  {
    id: 'breaking-gold',
    name: '⚡ बड़ी ख़बर / BIG BREAKING',
    description: 'गोल्डन और लाल रंग का चमकदार हाई-इम्पैक्ट बैज',
    previewLabel: '⚡ बड़ी ख़बर',
  },
  {
    id: 'breaking-duotone',
    name: 'रेड & ब्लैक ड्यूल-टोन',
    description: 'BREAKING लाल में और NEWS ब्लैक में',
    previewLabel: 'BREAKING NEWS',
  },
  {
    id: 'breaking-exclusive',
    name: 'एक्सक्लूसिव ब्रेकिंग',
    description: 'EXCLUSIVE बैज के साथ 3D ब्रेकिंग न्यूज़',
    previewLabel: 'EXCLUSIVE BREAKING',
  },
];

export const TextBreakingBadge: React.FC<TextBreakingBadgeProps> = ({
  style = 'breaking-3d-en',
  customTitle,
  titleSize = 'md',
  className = '',
}) => {
  // Base scale according to user preference (छोटा / मध्यम / बड़ा)
  const baseScale = titleSize === 'sm' ? 0.8 : titleSize === 'lg' ? 1.15 : 1.0;

  // Dynamic dampening if custom text is long to prevent text blowing up
  const textLen = customTitle ? customTitle.length : 12;
  const lengthFactor = textLen > 18 ? 0.72 : textLen > 14 ? 0.82 : textLen > 10 ? 0.92 : 1.0;
  const finalScale = Number((baseScale * lengthFactor).toFixed(2));
  const scaleStyle = finalScale !== 1.0 ? { transform: `scale(${finalScale})`, transformOrigin: 'top center' } : undefined;

  // New Option 1: FLAT MODERN RED (Clean, Less 3D, High Readability)
  if (style === 'breaking-flat-red') {
    const word1 = customTitle ? customTitle.split(' ')[0] : 'BREAKING';
    const word2 = customTitle ? customTitle.split(' ').slice(1).join(' ') || 'NEWS' : 'NEWS';
    return (
      <div className={`flex flex-col items-center select-none ${className}`} style={scaleStyle}>
        <div
          className="font-black uppercase tracking-wider text-center leading-none text-[#DC2626]"
          style={{
            fontSize: 'clamp(26px, 6vw, 42px)',
            fontFamily: "'Impact', 'Montserrat', 'Arial Black', sans-serif",
            letterSpacing: '0.04em',
            textShadow: '0 1px 2px rgba(220, 38, 38, 0.25)',
          }}
        >
          {word1}
        </div>
        <div
          className="font-black uppercase tracking-tight text-center leading-none mt-0.5 text-[#B91C1C]"
          style={{
            fontSize: 'clamp(42px, 9.5vw, 72px)',
            fontFamily: "'Impact', 'Montserrat', 'Arial Black', sans-serif",
            letterSpacing: '0.02em',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.18)',
          }}
        >
          {word2}
        </div>
      </div>
    );
  }

  // New Option 2: SOLID RED BAR (TV Style Plate)
  if (style === 'breaking-solid-bar') {
    const text = customTitle || 'BREAKING NEWS';
    return (
      <div className={`flex items-center justify-center select-none ${className}`} style={scaleStyle}>
        <div
          className="px-5 sm:px-7 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-[#991B1B] via-[#DC2626] to-[#991B1B] border-2 border-red-400/40 shadow-xl flex items-center gap-2.5"
        >
          <span className="w-3 h-3 rounded-full bg-white animate-pulse shrink-0" />
          <span
            className="font-black tracking-wider uppercase text-white font-['Impact','Montserrat',sans-serif] whitespace-nowrap"
            style={{
              fontSize: 'clamp(22px, 5.2vw, 38px)',
              letterSpacing: '0.06em',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
            }}
          >
            {text}
          </span>
        </div>
      </div>
    );
  }

  // New Option 3: SIMPLE HINDI BOLD (Clean Non-3D Hindi)
  if (style === 'breaking-simple-hi') {
    const word1 = customTitle ? customTitle.split(' ')[0] : 'ब्रेकिंग';
    const word2 = customTitle ? customTitle.split(' ').slice(1).join(' ') || 'न्यूज़' : 'न्यूज़';
    return (
      <div className={`flex flex-col items-center select-none ${className}`} style={scaleStyle}>
        <div
          className="font-black text-center leading-none text-[#DC2626] font-['Baloo_2']"
          style={{
            fontSize: 'clamp(30px, 7vw, 50px)',
            textShadow: '0 1px 2px rgba(220, 38, 38, 0.2)',
          }}
        >
          {word1}
        </div>
        <div
          className="font-black text-center leading-none -mt-1 text-[#991B1B] font-['Baloo_2']"
          style={{
            fontSize: 'clamp(44px, 10vw, 76px)',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
          }}
        >
          {word2}
        </div>
      </div>
    );
  }
  // Option 1: 3D BOLD RED ENGLISH (BREAKING / NEWS) - Sample Match!
  if (style === 'breaking-3d-en') {
    return (
      <div className={`flex flex-col items-center select-none ${className}`} style={scaleStyle}>
        {/* Top 3D word: BREAKING */}
        <div
          className="font-black uppercase tracking-tight text-center leading-[0.88]"
          style={{
            fontSize: 'clamp(28px, 6.5vw, 48px)',
            fontFamily: "'Impact', 'Montserrat', 'Arial Black', sans-serif",
            color: '#E01414',
            textShadow: `
              0 1px 0 #b30f0f,
              0 2px 0 #940c0c,
              0 3px 0 #780909,
              0 4px 0 #5c0707,
              0 5px 6px rgba(0, 0, 0, 0.45),
              0 8px 16px rgba(180, 0, 0, 0.35)
            `,
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
            transform: 'perspective(300px) rotateX(4deg)',
          }}
        >
          {customTitle ? customTitle.split(' ')[0] : 'BREAKING'}
        </div>

        {/* Bottom 3D word: NEWS (Bigger) */}
        <div
          className="font-black uppercase tracking-tight text-center leading-[0.88] -mt-0.5"
          style={{
            fontSize: 'clamp(44px, 10.5vw, 80px)',
            fontFamily: "'Impact', 'Montserrat', 'Arial Black', sans-serif",
            color: '#E31212',
            textShadow: `
              0 1px 0 #b80e0e,
              0 2px 0 #990c0c,
              0 3px 0 #800909,
              0 4px 0 #660707,
              0 5px 0 #4d0505,
              0 6px 1px rgba(0, 0, 0, 0.1),
              0 0 5px rgba(0, 0, 0, 0.1),
              0 1px 3px rgba(0, 0, 0, 0.3),
              0 6px 12px rgba(0, 0, 0, 0.4),
              0 10px 22px rgba(180, 0, 0, 0.4)
            `,
            filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.3))',
            transform: 'perspective(300px) rotateX(4deg)',
          }}
        >
          {customTitle
            ? customTitle.split(' ').slice(1).join(' ') || 'NEWS'
            : 'NEWS'}
        </div>
      </div>
    );
  }

  // Option 2: 3D BOLD RED HINDI (ब्रेकिंग / न्यूज़)
  if (style === 'breaking-3d-hi') {
    return (
      <div className={`flex flex-col items-center select-none ${className}`} style={scaleStyle}>
        <div
          className="font-black text-center leading-[0.9] font-['Baloo_2']"
          style={{
            fontSize: 'clamp(32px, 7.5vw, 56px)',
            color: '#E01414',
            textShadow: `
              0 1px 0 #b30f0f,
              0 2px 0 #940c0c,
              0 3px 0 #780909,
              0 4px 0 #5c0707,
              0 5px 6px rgba(0, 0, 0, 0.45)
            `,
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
          }}
        >
          {customTitle ? customTitle.split(' ')[0] : 'ब्रेकिंग'}
        </div>
        <div
          className="font-black text-center leading-[0.9] -mt-1 font-['Baloo_2']"
          style={{
            fontSize: 'clamp(46px, 11vw, 82px)',
            color: '#E31212',
            textShadow: `
              0 1px 0 #b80e0e,
              0 2px 0 #990c0c,
              0 3px 0 #800909,
              0 4px 0 #660707,
              0 5px 0 #4d0505,
              0 6px 10px rgba(0, 0, 0, 0.4)
            `,
            filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.3))',
          }}
        >
          {customTitle
            ? customTitle.split(' ').slice(1).join(' ') || 'न्यूज़'
            : 'न्यूज़'}
        </div>
      </div>
    );
  }

  // Option 3: 3D GLOSSY RED RIBBON (BREAKING NEWS)
  if (style === 'breaking-ribbon') {
    return (
      <div className={`flex items-center justify-center select-none ${className}`} style={scaleStyle}>
        <div
          className="relative px-6 sm:px-8 py-2 sm:py-2.5 rounded-lg border-2 border-yellow-400/90 shadow-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #FF1A1A 0%, #C80000 50%, #8A0000 100%)',
            boxShadow: '0 8px 20px rgba(200, 0, 0, 0.5), inset 0 2px 3px rgba(255, 255, 255, 0.5)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-yellow-300 font-bold text-base sm:text-lg">★</span>
            <span
              className="font-black tracking-wider uppercase text-white font-['Impact','Montserrat',sans-serif]"
              style={{
                fontSize: 'clamp(24px, 5.5vw, 40px)',
                letterSpacing: '0.08em',
                textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.4)',
              }}
            >
              {customTitle || 'BREAKING NEWS'}
            </span>
            <span className="text-yellow-300 font-bold text-base sm:text-lg">★</span>
          </div>
        </div>
      </div>
    );
  }

  // Option 4: ⚡ बड़ी ख़बर / BIG BREAKING (GOLDEN & RED)
  if (style === 'breaking-gold') {
    return (
      <div className={`flex flex-col items-center select-none ${className}`} style={scaleStyle}>
        <div
          className="px-5 py-1.5 rounded-full border border-yellow-400/80 shadow-lg flex items-center gap-2"
          style={{
            background: 'linear-gradient(90deg, #991B1B 0%, #B91C1C 50%, #991B1B 100%)',
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-300 animate-ping" />
          <span
            className="font-black uppercase tracking-wider text-yellow-300 font-['Baloo_2'] text-xs sm:text-sm"
          >
            ⚡ BIG BREAKING
          </span>
        </div>
        <div
          className="font-black tracking-tight text-center leading-[0.95] mt-1 font-['Baloo_2']"
          style={{
            fontSize: 'clamp(40px, 9.5vw, 72px)',
            background: 'linear-gradient(180deg, #FFDE00 0%, #E65100 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
          }}
        >
          {customTitle || 'बड़ी ख़बर'}
        </div>
      </div>
    );
  }

  // Option 5: RED & BLACK DUOTONE (BREAKING NEWS)
  if (style === 'breaking-duotone') {
    return (
      <div className={`flex flex-col items-center select-none ${className}`} style={scaleStyle}>
        <div
          className="font-black uppercase tracking-tight text-center leading-[0.88]"
          style={{
            fontSize: 'clamp(32px, 7.5vw, 54px)',
            fontFamily: "'Impact', 'Montserrat', 'Arial Black', sans-serif",
            color: '#DC2626',
            textShadow: '0 2px 4px rgba(220, 38, 38, 0.35)',
          }}
        >
          {customTitle ? customTitle.split(' ')[0] : 'BREAKING'}
        </div>
        <div
          className="font-black uppercase tracking-tight text-center leading-[0.88] -mt-1"
          style={{
            fontSize: 'clamp(48px, 11vw, 84px)',
            fontFamily: "'Impact', 'Montserrat', 'Arial Black', sans-serif",
            color: '#0F172A',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        >
          {customTitle
            ? customTitle.split(' ').slice(1).join(' ') || 'NEWS'
            : 'NEWS'}
        </div>
      </div>
    );
  }

  // Option 6: EXCLUSIVE BREAKING
  return (
    <div className={`flex flex-col items-center select-none ${className}`} style={scaleStyle}>
      <div className="bg-neutral-950 border border-neutral-700 text-yellow-400 px-3.5 py-0.5 rounded-md shadow-md mb-1 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
        <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] font-['Montserrat',sans-serif]">
          EXCLUSIVE
        </span>
      </div>
      <div
        className="font-black uppercase tracking-tight text-center leading-[0.88]"
        style={{
          fontSize: 'clamp(36px, 8.5vw, 64px)',
          fontFamily: "'Impact', 'Montserrat', 'Arial Black', sans-serif",
          color: '#E01414',
          textShadow: `
            0 1px 0 #b30f0f,
            0 2px 0 #940c0c,
            0 3px 0 #780909,
            0 4px 5px rgba(0, 0, 0, 0.4)
          `,
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
        }}
      >
        {customTitle || 'BREAKING NEWS'}
      </div>
    </div>
  );
};
