import React from 'react';

interface RedArrowGraphicProps {
  className?: string;
  customArrowPng?: string;
}

/**
 * Professional Breaking News Curved Red Pointer Arrow:
 * Smooth curved shaft from bottom-left swooping upward-right,
 * sharp symmetrical arrowhead wings, bold white sticker border,
 * deep black shadow, rich vibrant red body, and sleek 3D spine highlight.
 */
export const RedArrowGraphic: React.FC<RedArrowGraphicProps> = ({
  className = 'w-16 h-16',
  customArrowPng,
}) => {
  if (customArrowPng) {
    return (
      <img
        src={customArrowPng}
        alt="Pointing Arrow"
        className={`${className} object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] filter`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 400 400"
      className={`${className} drop-shadow-[0_14px_28px_rgba(0,0,0,0.95)] filter`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="arrowBodyRed" x1="10%" y1="90%" x2="80%" y2="20%">
          <stop offset="0%" stopColor="#C00000" />
          <stop offset="45%" stopColor="#E50914" />
          <stop offset="100%" stopColor="#FF1E26" />
        </linearGradient>

        <linearGradient id="arrowSpineGloss" x1="10%" y1="90%" x2="60%" y2="30%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* 1. Heavy Black Base / Drop Shadow Silhouette */}
      <path
        d="M 320 60 L 196 106 L 236 110 Q 120 160 70 310 L 104 344 Q 170 220 270 144 L 274 184 Z"
        fill="#000000"
        stroke="#000000"
        strokeWidth="22"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 2. Bold White Border (Crisp News Thumbnail Sticker Pop) */}
      <path
        d="M 320 60 L 196 106 L 236 110 Q 120 160 70 310 L 104 344 Q 170 220 270 144 L 274 184 Z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="12"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 3. Deep Red Inner Body */}
      <path
        d="M 320 60 L 196 106 L 236 110 Q 120 160 70 310 L 104 344 Q 170 220 270 144 L 274 184 Z"
        fill="url(#arrowBodyRed)"
        stroke="#990000"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* 4. Glossy Highlight on Curved Outer Spine */}
      <path
        d="M 85 300 Q 128 170 230 118"
        stroke="url(#arrowSpineGloss)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* 5. Central Ridge Highlight on Arrowhead */}
      <line
        x1="240"
        y1="125"
        x2="312"
        y2="66"
        stroke="rgba(255, 255, 255, 0.85)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* 6. Wing Tip Accent */}
      <line
        x1="202"
        y1="108"
        x2="236"
        y2="110"
        stroke="rgba(255, 255, 255, 0.6)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

