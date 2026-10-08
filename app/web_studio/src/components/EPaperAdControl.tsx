import React from 'react';
import { Megaphone, Move, Sliders, Upload, Crop } from 'lucide-react';
import { EPaperAdSettings } from '../types';

export interface EPaperAdControlProps {
  adKey: 'ad1' | 'ad2';
  boxName: string;
  subTitle: string;
  adSettings?: EPaperAdSettings;
  whatsappNumber?: string;
  onUpdate: (updates: Partial<EPaperAdSettings>) => void;
  accentColor?: 'red' | 'amber';
}

export const EPaperAdControl: React.FC<EPaperAdControlProps> = ({
  adKey,
  boxName,
  subTitle,
  adSettings,
  whatsappNumber = '96698-02408',
  onUpdate,
  accentColor = 'red',
}) => {
  const isAd1 = adKey === 'ad1';
  const isShown = adSettings?.showAd ?? false;
  const placement = adSettings?.placement || (isAd1 ? 'auto_fill' : 'movable');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const url = uploadEvent.target?.result as string;
      if (url) {
        onUpdate({
          showAd: true,
          type: 'image',
          imageUrl: url,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const isRed = accentColor === 'red';
  const activeBtnClass = isRed
    ? 'bg-red-600 text-white shadow-md'
    : 'bg-amber-600 text-white shadow-md';
  const activeBorderClass = isRed
    ? 'bg-red-600/20 border-red-500 text-white'
    : 'bg-amber-600/20 border-amber-500 text-white';
  const peerCheckedClass = isRed ? 'peer-checked:bg-red-600' : 'peer-checked:bg-amber-600';
  const bannerBgClass = isRed
    ? 'bg-red-500/10 border-red-500/20 text-red-300'
    : 'bg-amber-500/10 border-amber-500/20 text-amber-300';
  const iconBgClass = isRed
    ? 'bg-red-600/20 text-red-500'
    : 'bg-amber-600/20 text-amber-400';

  return (
    <div className="space-y-4">
      {/* 1. Master Toggle & Banner */}
      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 ${iconBgClass} rounded-lg`}>
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">{boxName}</span>
              <span className="text-[10px] text-neutral-400">{subTitle}</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isShown}
              onChange={(e) => onUpdate({ showAd: e.target.checked })}
              className="sr-only peer"
            />
            <div
              className={`w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${peerCheckedClass}`}
            ></div>
          </label>
        </div>

        {isShown && (
          <div className={`p-2.5 ${bannerBgClass} border rounded-lg flex items-start gap-2 text-[11px]`}>
            <Move className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <strong>{isAd1 ? 'विज्ञापन 1:' : 'विज्ञापन 2:'}</strong>{' '}
              {placement === 'auto_fill'
                ? 'ऑटो-फिल मोड चालू है — यह खाली स्थान पर स्वतः फिट हो जाएगा और मुख्य खबर के ऊपर नहीं आएगा।'
                : placement === 'movable'
                ? 'मूवेबल मोड चालू है — आप लाइव प्रीव्यू पर सीधे पकड़कर ड्रैग (Move) और ↘ कोने से खींचकर रीसाइज़ कर सकते हैं।'
                : 'चयनित स्थान पर विज्ञापन प्रदर्शित हो रहा है।'}
            </div>
          </div>
        )}
      </div>

      {isShown && (
        <>
          {/* 2. Placement Mode Selector */}
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
            <label className="text-xs font-bold text-neutral-200 block">
              विज्ञापन लगाने का स्थान व तरीका (Placement Mode):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: 'auto_fill',
                  title: 'ऑटो-फिल',
                  desc: 'खाली जगह पर स्वतः सुरक्षित फिट',
                  icon: '📐',
                },
                {
                  id: 'movable',
                  title: 'मूवेबल बॉक्स',
                  desc: 'लाइव कार्ड पर ड्रैग व रीसाइज़',
                  icon: '✥',
                },
                {
                  id: 'bottom_strip',
                  title: 'बॉटम स्ट्रिप',
                  desc: 'निचली पट्टी (खबर ऊपर स्वतः बैलेंस)',
                  icon: '⬇️',
                },
                {
                  id: 'right_column',
                  title: 'दायां कॉलम',
                  desc: 'हाइलाइट्स के नीचे या दाईं तरफ',
                  icon: '➡️',
                },
              ].map((mode) => {
                const isSel = placement === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onUpdate({ placement: mode.id as any })}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSel
                        ? activeBorderClass + ' shadow-md'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-base">{mode.icon}</span>
                    <div className="text-xs font-bold mt-1 text-white leading-tight">{mode.title}</div>
                    <p className="text-[9px] text-neutral-400 mt-0.5 leading-snug">{mode.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Movable Controls & Position Sliders */}
          {placement === 'movable' && (
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-yellow-400" />
                  <span>स्थिति व साइज कंट्रोल (Sliders):</span>
                </label>
                <span className="text-[10px] text-neutral-400">या सीधे प्रीव्यू पर ड्रैग करें</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: isAd1 ? 'निचला दायां' : 'निचला दायां (2)',
                    x: 52,
                    y: isAd1 ? 60 : 68,
                    w: isAd1 ? 45 : 44,
                    h: isAd1 ? 28 : 22,
                  },
                  { label: 'निचला बायां', x: 5, y: 62, w: 45, h: 26 },
                  { label: 'मध्य दायां', x: 52, y: 35, w: 45, h: 28 },
                  { label: 'शीर्ष दायां', x: 52, y: 5, w: 45, h: 26 },
                  { label: 'निचली पट्टी', x: 5, y: 72, w: 90, h: 20 },
                ].map((pre) => (
                  <button
                    key={pre.label}
                    type="button"
                    onClick={() => onUpdate({ x: pre.x, y: pre.y, width: pre.w, height: pre.h })}
                    className="px-2 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-[10px] font-bold text-neutral-300 cursor-pointer transition-all"
                  >
                    📍 {pre.label}
                  </button>
                ))}
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span>बाएं-दाएं (X Pos):</span>
                    <span className="font-mono text-yellow-400 font-bold">
                      {Math.round(adSettings?.x ?? (isAd1 ? 50 : 52))}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={85}
                    value={adSettings?.x ?? (isAd1 ? 50 : 52)}
                    onChange={(e) => onUpdate({ x: parseFloat(e.target.value) })}
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span>ऊपर-नीचे (Y Pos):</span>
                    <span className="font-mono text-yellow-400 font-bold">
                      {Math.round(adSettings?.y ?? (isAd1 ? 60 : 68))}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={85}
                    value={adSettings?.y ?? (isAd1 ? 60 : 68)}
                    onChange={(e) => onUpdate({ y: parseFloat(e.target.value) })}
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span>चौड़ाई (Width):</span>
                    <span className="font-mono text-yellow-400 font-bold">
                      {Math.round(adSettings?.width ?? (isAd1 ? 45 : 44))}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={95}
                    value={adSettings?.width ?? (isAd1 ? 45 : 44)}
                    onChange={(e) => onUpdate({ width: parseFloat(e.target.value) })}
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span>ऊंचाई (Height):</span>
                    <span className="font-mono text-yellow-400 font-bold">
                      {Math.round(adSettings?.height ?? (isAd1 ? 25 : 22))}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    value={adSettings?.height ?? (isAd1 ? 25 : 22)}
                    onChange={(e) => onUpdate({ height: parseFloat(e.target.value) })}
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Ad Content Type: Template vs Image */}
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200">
                विज्ञापन का प्रकार (Ad Type):
              </label>
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => onUpdate({ type: 'template' })}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    adSettings?.type !== 'image'
                      ? activeBtnClass
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  तैयार टेम्पलेट
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate({ type: 'image' })}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    adSettings?.type === 'image'
                      ? activeBtnClass
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  फोटो / इमेज विज्ञापन
                </button>
              </div>
            </div>

            {/* Template Mode */}
            {adSettings?.type !== 'image' && (
              <div className="space-y-3 pt-1">
                <div>
                  <span className="text-[11px] font-bold text-neutral-300 block mb-1.5">
                    टेम्पलेट श्रेणी चुनें:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      {
                        id: 'wishes',
                        label: '🎉 शुभकामनाएं',
                        title: 'हार्दिक शुभकामनाएं',
                        sub: 'समस्त क्षेत्रवासियों को पर्व की बधाई',
                      },
                      {
                        id: 'commercial',
                        label: '📢 व्यावसायिक',
                        title: 'व्यावसायिक प्रचार हेतु',
                        sub: 'अखबार के ई-संस्करण में प्रचार करवाएं',
                      },
                      {
                        id: 'classified',
                        label: '📋 सूचना',
                        title: 'विशेष सार्वजनिक सूचना',
                        sub: 'दैनिक ई-समाचार पत्र',
                      },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          onUpdate({
                            templateType: t.id as any,
                            title: adSettings?.title || t.title,
                            subtitle: adSettings?.subtitle || t.sub,
                          })
                        }
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          (adSettings?.templateType || 'wishes') === t.id
                            ? activeBorderClass
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-750'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{t.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ad Title */}
                <div>
                  <label className="text-[11px] font-bold text-neutral-300 mb-1 block">
                    विज्ञापन मुख्य शीर्षक / स्लोगन:
                  </label>
                  <input
                    type="text"
                    value={adSettings?.title || ''}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    placeholder="उदा. हार्दिक शुभकामनाएं / व्यावसायिक प्रचार हेतु संपर्क करें"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-['Baloo_2'] font-bold"
                  />
                </div>

                {/* Ad Subtitle */}
                <div>
                  <label className="text-[11px] font-bold text-neutral-300 mb-1 block">
                    उप-विवरण (वैकल्पिक):
                  </label>
                  <input
                    type="text"
                    value={adSettings?.subtitle || ''}
                    onChange={(e) => onUpdate({ subtitle: e.target.value })}
                    placeholder="उदा. दैनिक समाचार पत्र ई-संस्करण विशेष प्रचार"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500 font-['Baloo_2']"
                  />
                </div>

                {/* Phone & Sponsor Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-300 mb-1 block">
                      📞 संपर्क फोन / व्हाट्सएप्प:
                    </label>
                    <input
                      type="text"
                      value={adSettings?.phone ?? whatsappNumber}
                      onChange={(e) => onUpdate({ phone: e.target.value })}
                      placeholder="उदा. 96698-02408"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-red-400 font-mono font-bold focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-300 mb-1 block">
                      सौजन्य / प्रायोजक (वैकल्पिक):
                    </label>
                    <input
                      type="text"
                      value={adSettings?.sponsorName || ''}
                      onChange={(e) => onUpdate({ sponsorName: e.target.value })}
                      placeholder="उदा. शुभचिंतक परिवार / अग्रवाल ट्रेडर्स"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-red-500 font-['Baloo_2']"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Image Mode */}
            {adSettings?.type === 'image' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  {adSettings?.imageUrl ? (
                    <div className="w-20 h-16 rounded-lg border border-neutral-700 overflow-hidden bg-white shrink-0">
                      <img
                        src={adSettings.imageUrl}
                        alt="Ad Preview"
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${adSettings.crop?.x ?? 50}% ${adSettings.crop?.y ?? 50}%`,
                          transform: `scale(${adSettings.crop?.zoom ?? 1})`,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-16 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-600 shrink-0">
                      <Megaphone className="w-6 h-6" />
                    </div>
                  )}

                  <label className="flex-1 py-2.5 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-neutral-700 shadow-sm">
                    <Upload className="w-4 h-4 text-red-400" />
                    <span>{adSettings?.imageUrl ? 'विज्ञापन इमेज बदलें' : 'विज्ञापन इमेज अपलोड करें'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Crop & Zoom */}
                {adSettings?.imageUrl && (
                  <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        <Crop className="w-3.5 h-3.5 text-yellow-400" />
                        <span>विज्ञापन फोटो क्रॉप व ज़ूम (Crop & Scale):</span>
                      </span>
                      <span className="font-mono text-[10px] text-yellow-400">
                        {Math.round((adSettings.crop?.zoom ?? 1) * 100)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-neutral-400 block mb-1">X स्थिति:</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={adSettings.crop?.x ?? 50}
                          onChange={(e) => {
                            const curCrop = adSettings?.crop || { x: 50, y: 50, zoom: 1 };
                            onUpdate({ crop: { ...curCrop, x: parseFloat(e.target.value) } });
                          }}
                          className="w-full accent-yellow-400 cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block mb-1">Y स्थिति:</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={adSettings.crop?.y ?? 50}
                          onChange={(e) => {
                            const curCrop = adSettings?.crop || { x: 50, y: 50, zoom: 1 };
                            onUpdate({ crop: { ...curCrop, y: parseFloat(e.target.value) } });
                          }}
                          className="w-full accent-yellow-400 cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block mb-1">ज़ूम:</span>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.05}
                          value={adSettings.crop?.zoom ?? 1}
                          onChange={(e) => {
                            const curCrop = adSettings?.crop || { x: 50, y: 50, zoom: 1 };
                            onUpdate({ crop: { ...curCrop, zoom: parseFloat(e.target.value) } });
                          }}
                          className="w-full accent-yellow-400 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
