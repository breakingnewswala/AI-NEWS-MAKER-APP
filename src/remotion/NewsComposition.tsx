import React from 'react';
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { NewsCompositionProps } from './types';

export const NewsComposition: React.FC<NewsCompositionProps> = ({
  headline,
  subHeadline,
  tickerText,
  category = "ब्रेकिंग न्यूज़",
  channelName = "AI NEWS 24",
  reporterName = "विशेष संवाददाता",
  location = "नई दिल्ली",
  accentColor = "#dc2626",
  secondaryColor = "#0f172a",
  textColor = "#ffffff",
  tickerBgColor = "#fbbf24",
  tickerTextColor = "#0f172a",
  logoUrl,
  mainImageUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Entrance spring animation for Lower-Third
  const lowerThirdEntrance = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 0.8,
    },
  });

  // Slide-in for Breaking Badge
  const badgeEntrance = spring({
    frame: frame - 5,
    fps,
    config: {
      damping: 14,
      stiffness: 120,
    },
  });

  // Background subtle zoom (Ken Burns effect)
  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateRight: 'clamp',
  });

  // News Ticker Horizontal Offset (continuous scrolling loop)
  // Shift 4 pixels per frame
  const tickerSpeed = 3.5;
  const tickerOffset = (frame * tickerSpeed) % (width + 1200);

  // Pulse animation for LIVE indicator
  const livePulse = Math.sin(frame / 6) > 0 ? 1 : 0.4;

  const isVertical = height > width;

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#020617',
        color: textColor,
        fontFamily: "'Segoe UI', Roboto, 'Noto Sans Devanagari', sans-serif",
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Main Background / Image layer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {mainImageUrl ? (
          <img
            src={mainImageUrl}
            alt="News Visual"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${bgScale})`,
              transformOrigin: 'center center',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `radial-gradient(circle at 60% 40%, #1e293b 0%, #0f172a 60%, #020617 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Studio Grid Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.15,
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            {/* Central Studio Glow Graphic */}
            <div
              style={{
                width: isVertical ? '80%' : '50%',
                height: isVertical ? '40%' : '55%',
                borderRadius: '24px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(30, 41, 59, 0.6) 100%)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div
                style={{
                  fontSize: isVertical ? 22 : 28,
                  fontWeight: 800,
                  color: '#f87171',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                ● LIVE NEWSROOM
              </div>
              <div
                style={{
                  fontSize: isVertical ? 16 : 20,
                  color: '#94a3b8',
                  textAlign: 'center',
                }}
              >
                AI News Maker • Realtime Broadcast Studio
              </div>
            </div>
          </div>
        )}

        {/* Cinematic Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 35%, transparent 60%, rgba(0,0,0,0.85) 100%)',
          }}
        />
      </div>

      {/* 2. Top Header Bar: Channel Name & Live Badge */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? 30 : 25,
          left: isVertical ? 24 : 35,
          right: isVertical ? 24 : 35,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        {/* Channel Logo & Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            padding: '8px 18px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              style={{ width: 28, height: 28, borderRadius: '50%' }}
            />
          ) : (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 12,
                color: '#ffffff',
              }}
            >
              N
            </div>
          )}
          <span style={{ fontWeight: 800, fontSize: isVertical ? 14 : 16, letterSpacing: '1px' }}>
            {channelName}
          </span>
        </div>

        {/* Location & LIVE Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {location && (
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.85)',
                backdropFilter: 'blur(8px)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: 13,
                fontWeight: 600,
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              📍 {location}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#b91c1c',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '1px',
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.6)',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                opacity: livePulse,
              }}
            />
            LIVE
          </div>
        </div>
      </div>

      {/* 3. Lower Third Section */}
      <div
        style={{
          position: 'absolute',
          bottom: isVertical ? 65 : 55,
          left: isVertical ? 20 : 35,
          right: isVertical ? 20 : 35,
          zIndex: 10,
          transform: `translateY(${interpolate(lowerThirdEntrance, [0, 1], [60, 0])}px)`,
          opacity: lowerThirdEntrance,
        }}
      >
        {/* Category / Breaking Ribbon */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: accentColor,
            color: '#ffffff',
            padding: '6px 18px',
            fontWeight: 900,
            fontSize: isVertical ? 13 : 15,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            clipPath: 'polygon(0 0, 100% 0, 94% 100%, 0% 100%)',
            paddingRight: 28,
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
            transform: `scale(${Math.max(0, badgeEntrance)})`,
            transformOrigin: 'left bottom',
          }}
        >
          <span>🔥</span> {category}
        </div>

        {/* Main Headline Card */}
        <div
          style={{
            backgroundColor: secondaryColor,
            borderLeft: `6px solid ${accentColor}`,
            padding: isVertical ? '14px 16px' : '16px 24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            marginTop: 4,
          }}
        >
          <div
            style={{
              fontSize: isVertical ? 20 : 26,
              fontWeight: 800,
              lineHeight: 1.3,
              color: textColor,
              textShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }}
          >
            {headline}
          </div>
          {subHeadline && (
            <div
              style={{
                marginTop: 6,
                fontSize: isVertical ? 13 : 15,
                fontWeight: 500,
                color: '#cbd5e1',
                lineHeight: 1.4,
              }}
            >
              {subHeadline}
            </div>
          )}
          {reporterName && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                fontWeight: 600,
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🎙️</span> रिपोर्टर: {reporterName}
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom News Ticker (Continuous Infinite Scroll) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: isVertical ? 48 : 42,
          backgroundColor: tickerBgColor,
          color: tickerTextColor,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          zIndex: 20,
          boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Fixed "UPDATE" Label on Left */}
        <div
          style={{
            backgroundColor: '#0f172a',
            color: '#fbbf24',
            height: '100%',
            padding: '0 18px',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: '1px',
            zIndex: 25,
            boxShadow: '4px 0 10px rgba(0,0,0,0.3)',
            flexShrink: 0,
          }}
        >
          ताज़ा समाचार
        </div>

        {/* Scrolling text track */}
        <div
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            transform: `translateX(${width - tickerOffset}px)`,
            willChange: 'transform',
          }}
        >
          <span
            style={{
              fontSize: isVertical ? 15 : 17,
              fontWeight: 800,
              letterSpacing: '0.5px',
              paddingRight: 100,
            }}
          >
            {tickerText} • {tickerText}
          </span>
        </div>
      </div>
    </div>
  );
};
