import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  Layers,
  X,
  Check,
  Eye,
  Trash2,
  Lock,
  Unlock,
  ChevronRight,
  ChevronLeft,
  Plus,
  ShieldCheck,
  Crown,
  AlertTriangle,
  Move,
  Maximize2,
  Sliders,
  Image as ImageIcon,
  Type,
  FileCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  DynamicFrameTemplate,
  DynamicAspectRatio,
  DynamicDesignCategory,
  DYNAMIC_FRAME_CATEGORIES,
  DynamicPlanTier,
  DYNAMIC_PLAN_TIERS,
  NormalizedRect,
  PhotoSlotConfig,
  TextSlotConfig,
  FrameLayer,
  HeaderConfig,
  FooterConfig,
  RibbonConfig,
} from '../types/dynamicFrame';
import {
  saveDynamicFrameToApi,
  requestAiFrameAnalysis,
  AiFrameAnalysisResult,
} from '../lib/dynamicFramesManager';
import { BUILTIN_RIBBONS } from '../lib/ribbonPresets';
import { getAuthToken } from '../lib/apiConfig';

interface DynamicFrameGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFramePublished?: (frame: DynamicFrameTemplate) => void;
  initialFrame?: DynamicFrameTemplate | null;
  currentUser?: any;
}

type WizardStage =
  | 'upload_aspect'
  | 'ai_analysis'
  | 'element_marking'
  | 'photo_slots'
  | 'text_config'
  | 'ribbon_footer'
  | 'live_preview'
  | 'metadata_publish';

export const DynamicFrameGeneratorModal: React.FC<DynamicFrameGeneratorModalProps> = ({
  isOpen,
  onClose,
  onFramePublished,
  initialFrame,
  currentUser,
}) => {
  // Wizard Stage
  const [currentStage, setCurrentStage] = useState<WizardStage>('upload_aspect');

  // Stage 1: Sample Upload & Aspect Ratio (Strictly 4:5 or 9:16)
  const [sampleImage, setSampleImage] = useState<string>(initialFrame?.sampleReferenceUrl || '');
  const [selectedRatio, setSelectedRatio] = useState<DynamicAspectRatio>(initialFrame?.aspectRatio || '4:5');
  const [sampleFileName, setSampleFileName] = useState<string>('');

  // Stage 2: AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AiFrameAnalysisResult | null>(null);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>('');

  // Stage 3: Interactive Canvas Marking
  const [layers, setLayers] = useState<FrameLayer[]>(initialFrame?.layers || []);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'draw_rect'>('select');
  const [drawingElementType, setDrawingElementType] = useState<'photo' | 'text' | 'header' | 'ribbon'>('photo');

  // Canvas drawing ref
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawRect, setCurrentDrawRect] = useState<NormalizedRect | null>(null);

  // Stage 4: Photo Slots Configuration
  const [photoSlots, setPhotoSlots] = useState<PhotoSlotConfig[]>(
    initialFrame?.photoSlots || [
      {
        id: 'slot_photo_1',
        name: 'मुख्य फोटो (Main Photo)',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 62 },
        required: true,
        cropMode: 'cover',
      },
    ]
  );

  // Stage 5: Text Elements Configuration
  const [textSlots, setTextSlots] = useState<TextSlotConfig[]>(
    initialFrame?.textSlots || [
      {
        id: 'slot_text_headline',
        name: 'मुख्य हेडलाइन (Main Headline)',
        role: 'headline',
        rect: { x: 6, y: 64, width: 88, height: 26 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 70,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'center',
        maxLines: 3,
        lineHeight: 1.25,
        backgroundColor: '#B91C1C',
      },
    ]
  );

  // Statement / Bayaanbaazi settings
  const [isStatementFrame, setIsStatementFrame] = useState<boolean>(initialFrame?.isStatementFrame || false);
  const [statementBgColor, setStatementBgColor] = useState<string>(initialFrame?.statementOptions?.solidBackgroundHex || '#C81E1E');

  // Stage 6: Header, Footer & Ribbon
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(
    initialFrame?.headerConfig || {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 5, y: 3.5, width: 22, height: 9 },
      showLocation: true,
      locationRect: { x: 5, y: 13.5, width: 28, height: 4.5 },
      locationStyle: 'pill',
    }
  );

  const [footerConfig, setFooterConfig] = useState<FooterConfig>(
    initialFrame?.footerConfig || {
      footerHeightRatio: selectedRatio === '4:5' ? 0.08 : 0.065,
      enforcePermanentFooter: true,
      footerBgColor: '#FFFFFF',
      footerTextColor: '#000000',
    }
  );

  const [ribbonConfig, setRibbonConfig] = useState<RibbonConfig>(
    initialFrame?.ribbonConfig || {
      enabled: false,
      ribbonId: 'speed-blue-red',
      customRibbonUrl: '/assets/breaking_news_ribbon.svg',
      rect: { x: 15, y: 64, width: 70, height: 8 },
      scalePct: 70,
    }
  );

  // Stage 7: Metadata & Publishing
  const [frameName, setFrameName] = useState<string>(initialFrame?.name || '');
  const [frameDescription, setFrameDescription] = useState<string>(initialFrame?.description || '');
  const [designCategory, setDesignCategory] = useState<DynamicDesignCategory>(
    initialFrame?.designCategory || (selectedRatio === '9:16' ? 'Story Frames' : 'Regular Frames')
  );
  const [allowedPlans, setAllowedPlans] = useState<DynamicPlanTier[]>(
    initialFrame?.allowedPlans || ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK']
  );
  const [publicationStatus, setPublicationStatus] = useState<'draft' | 'preview' | 'published'>('published');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Keep footer height ratio aligned with aspect ratio
  useEffect(() => {
    setFooterConfig((prev) => ({
      ...prev,
      footerHeightRatio: selectedRatio === '4:5' ? 0.08 : 0.065,
      enforcePermanentFooter: true,
    }));
    if (selectedRatio === '9:16' && designCategory === 'Regular Frames') {
      setDesignCategory('Story Frames');
    }
  }, [selectedRatio]);

  if (!isOpen) return null;

  // Handle sample file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSampleFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSampleImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run AI Analysis
  const handleRunAiAnalysis = async () => {
    if (!sampleImage) {
      alert('कृपया पहले एक सैंपल ग्राफ़िक इमेज अपलोड करें।');
      return;
    }
    setIsAnalyzing(true);
    setAnalysisStatusText('Gemini AI डिज़ाइन एनालिसिस शुरू हो रहा है...');
    try {
      const token = getAuthToken();
      const res = await requestAiFrameAnalysis(sampleImage, selectedRatio, token);
      if (res.success && res.result) {
        setAnalysisResult(res.result);
        setAnalysisStatusText('✅ AI एनालिसिस सफल! लेआउट कंपोनेंट्स डिटेक्ट हो गए हैं।');

        // Apply detected regions to configuration
        const r = res.result;
        setHeaderConfig((prev) => ({
          ...prev,
          logoRect: r.logoRect,
          locationRect: r.locationRect,
        }));

        if (r.statementDetected) {
          setIsStatementFrame(true);
          setDesignCategory('बयानबाजी');
        }

        if (r.ribbonDetected && r.ribbonRect) {
          setRibbonConfig((prev) => ({
            ...prev,
            enabled: true,
            rect: r.ribbonRect,
          }));
        }

        // Configure photo slots from recommendations
        if (r.recommendedPhotoSlots && r.recommendedPhotoSlots.length > 0) {
          setPhotoSlots(
            r.recommendedPhotoSlots.map((slot, idx) => ({
              id: `slot_photo_${idx + 1}`,
              name: slot.name,
              slotType: slot.slotType,
              rect: slot.rect,
              required: idx === 0,
              bgRemoval: slot.slotType === 'cutout',
              cropMode: 'cover',
            }))
          );
        }

        // Initialize layers
        const initialLayers: FrameLayer[] = [
          {
            id: 'layer_photo',
            name: 'फ़ोटो लेयर',
            type: 'photo',
            rect: r.recommendedPhotoSlots?.[0]?.rect || { x: 0, y: 0, width: 100, height: 60 },
            visible: true,
            locked: false,
            zIndex: 1,
          },
          {
            id: 'layer_headline',
            name: 'हेडलाइन लेयर',
            type: 'text',
            rect: r.headlineRect,
            visible: true,
            locked: false,
            zIndex: 5,
          },
          {
            id: 'layer_header',
            name: 'चैनल लोगो व लोकेशन',
            type: 'header',
            rect: r.headerRect,
            visible: true,
            locked: false,
            zIndex: 10,
          },
          {
            id: 'layer_footer',
            name: 'स्थाई फुटर (Protected AI News Maker Footer)',
            type: 'footer',
            rect: r.footerRect,
            visible: true,
            locked: true,
            zIndex: 20,
          },
        ];
        setLayers(initialLayers);
      } else {
        setAnalysisStatusText('⚠️ AI रिस्पॉन्स में त्रुटि, मानक ज्यामितीय ग्रिड लागू किया गया।');
      }
    } catch (e: any) {
      setAnalysisStatusText(`⚠️ AI एनालिसिस चेतावनी: ${e.message || 'कैलकुलेटेड लेआउट लागू हुआ'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Canvas Mouse Events for Interactive Drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'draw_rect' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    // Footer protection check: Cannot start drawing inside protected footer zone
    const footerBoundary = 100 - (footerConfig.footerHeightRatio * 100);
    if (y > footerBoundary) {
      alert('स्थाई फुटर (Bottom Footer) क्षेत्र संरक्षित है। इसके ऊपर कोई नया तत्व नहीं बनाया जा सकता।');
      return;
    }

    setIsDrawing(true);
    setDragStart({ x, y });
    setCurrentDrawRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !dragStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    let currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    // Cap drawing height above footer boundary
    const footerBoundary = 100 - (footerConfig.footerHeightRatio * 100);
    if (currentY > footerBoundary) {
      currentY = footerBoundary;
    }

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    const width = Math.abs(currentX - dragStart.x);
    const height = Math.abs(currentY - dragStart.y);

    setCurrentDrawRect({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentDrawRect) {
      setIsDrawing(false);
      return;
    }
    setIsDrawing(false);

    if (currentDrawRect.width > 3 && currentDrawRect.height > 3) {
      const newLayerId = `layer_custom_${Date.now()}`;
      const newLayer: FrameLayer = {
        id: newLayerId,
        name: `नया तत्व (${drawingElementType})`,
        type: drawingElementType,
        rect: currentDrawRect,
        visible: true,
        locked: false,
        zIndex: layers.length + 1,
      };
      setLayers([...layers, newLayer]);
      setSelectedLayerId(newLayerId);

      // If photo element was drawn, add a photo slot
      if (drawingElementType === 'photo') {
        const slotId = `slot_photo_${photoSlots.length + 1}`;
        setPhotoSlots([
          ...photoSlots,
          {
            id: slotId,
            name: `फ़ोटो स्लॉट ${photoSlots.length + 1}`,
            slotType: 'normal',
            rect: currentDrawRect,
            required: false,
            cropMode: 'cover',
          },
        ]);
      }
    }
    setCurrentDrawRect(null);
    setDragStart(null);
  };

  // Plan multi-select toggle
  const handleTogglePlan = (plan: DynamicPlanTier) => {
    if (allowedPlans.includes(plan)) {
      if (allowedPlans.length === 1) {
        alert('कम से कम एक सब्सक्रिप्शन प्लान चुनना अनिवार्य है।');
        return;
      }
      setAllowedPlans(allowedPlans.filter((p) => p !== plan));
    } else {
      setAllowedPlans([...allowedPlans, plan]);
    }
  };

  // Final Save & Publish
  const handleSaveAndPublish = async () => {
    if (!frameName.trim()) {
      alert('कृपया फ्रेम का नाम दर्ज करें।');
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    const templateData: Partial<DynamicFrameTemplate> = {
      id: initialFrame?.id,
      name: frameName.trim(),
      description: frameDescription.trim(),
      aspectRatio: selectedRatio,
      canvasWidth: 1080,
      canvasHeight: selectedRatio === '4:5' ? 1350 : 1920,
      sampleReferenceUrl: sampleImage,
      previewImageUrl: sampleImage,
      designCategory,
      allowedPlans,
      publicationStatus,
      createdBy: currentUser?.email || 'breakingnewswala.com@gmail.com',
      headerConfig,
      footerConfig: {
        ...footerConfig,
        enforcePermanentFooter: true,
      },
      photoSlots,
      textSlots,
      ribbonConfig,
      layers,
      isStatementFrame,
      statementOptions: {
        solidBackgroundHex: statementBgColor,
      },
    };

    try {
      const token = getAuthToken();
      const res = await saveDynamicFrameToApi(templateData, token);
      if (res.success && res.frame) {
        setFeedbackMsg({ type: 'success', text: `🎉 फ्रेम "${res.frame.name}" सफलतापूर्वक प्रकाशित हो गया!` });
        if (onFramePublished) onFramePublished(res.frame);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'फ़्रेम पब्लिश करने में त्रुटि।' });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message || 'नेटवर्क विफलता।' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-slate-950 shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">AI डायनामिक फ्रेम जनरेटर (Frame Generator)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                  Master Admin Only
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                सैंपल ग्राफिक अपलोड करें, AI से लेआउट मार्क करें और पुनः प्रयोज्य टेम्पलेट बनाएं।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Navigation Steps */}
        <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 font-bold">
          {[
            { id: 'upload_aspect', label: '1. सैंपल व रेशियो' },
            { id: 'ai_analysis', label: '2. AI एनालिसिस' },
            { id: 'element_marking', label: '3. कैनवास मार्किंग' },
            { id: 'photo_slots', label: '4. फोटो स्लॉट्स' },
            { id: 'text_config', label: '5. टेक्स्ट व कोट' },
            { id: 'ribbon_footer', label: '6. रिबन व फुटर' },
            { id: 'live_preview', label: '7. लाइव प्रीव्यू' },
            { id: 'metadata_publish', label: '8. प्लान व पब्लिश' },
          ].map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStage(step.id as WizardStage)}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentStage === step.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{step.label}</span>
            </button>
          ))}
        </div>

        {/* Main Workspace Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* STAGE 1: SAMPLE UPLOAD & ASPECT RATIO */}
          {currentStage === 'upload_aspect' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5" />
                    कैनवास आस्पेक्ट रेशियो चुनें (Strict Aspect Ratio)
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    केवल दो कैनवास समर्थित हैं। 1:1 स्क्वायर फॉर्मेट फ्रेम जनरेटर में पूर्णतः प्रतिबंधित है।
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRatio('4:5')}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedRatio === '4:5'
                          ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm">4:5 पोर्ट्रेट</span>
                        {selectedRatio === '4:5' && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono">1080 × 1350 px</div>
                      <div className="text-[10px] text-slate-400 mt-1">रेगुलर समाचार व फ़ोटो न्यूज़ ग्राफ़िक्स</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRatio('9:16')}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedRatio === '9:16'
                          ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm">9:16 सोशल स्टोरी</span>
                        {selectedRatio === '9:16' && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono">1080 × 1920 px</div>
                      <div className="text-[10px] text-slate-400 mt-1">इंस्टाग्राम, फेसबुक व व्हाट्सएप स्टेटस स्टोरी</div>
                    </button>
                  </div>
                </div>

                {/* Upload Sample Graphic */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    सैंपल डिज़ाइन अपलोड (Design Reference)
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    वह सैंपल न्यूज़ ग्राफ़िक या जैकेट अपलोड करें जिसे आप री-यूज़ेबल फ़्रेम में बदलना चाहते हैं (PNG, JPG, WebP)।
                  </p>

                  <label className="border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/50">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-200">सैंपल ग्राफ़िक फ़ाइल चुनें या यहाँ छोड़ें</span>
                    <span className="text-[10px] text-slate-500 mt-1">अधिकतम 10MB (PNG / JPG / WebP)</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {sampleFileName && (
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      चयनित: {sampleFileName}
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Area */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center min-h-[380px]">
                {sampleImage ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div
                      className="relative border-2 border-amber-500/60 rounded-lg overflow-hidden shadow-2xl bg-black"
                      style={{
                        width: selectedRatio === '4:5' ? '280px' : '230px',
                        height: selectedRatio === '4:5' ? '350px' : '408px',
                      }}
                    >
                      <img src={sampleImage} alt="Sample Design" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-bold">
                      सैंपल डिज़ाइन प्रीव्यू ({selectedRatio === '4:5' ? '1080×1350' : '1080×1920'})
                    </span>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 space-y-2">
                    <ImageIcon className="w-12 h-12 mx-auto text-slate-700" />
                    <p className="text-xs font-bold">कोई सैंपल इमेज लोड नहीं है</p>
                    <p className="text-[11px]">कृपया बाईं ओर से सैंपल न्यूज़ ग्राफिक अपलोड करें।</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAGE 2: AI ANALYSIS */}
          {currentStage === 'ai_analysis' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      AI सैंपल फ्रेम एनालिसिस (Automated Element Detection)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Gemini Multimodal AI विज़न तकनीक से लोगो, लोकेशन, फोटो स्लॉट, हेडलाइन और फुटर सीमाओं को स्वतः पहचानें।
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isAnalyzing || !sampleImage}
                    onClick={handleRunAiAnalysis}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{isAnalyzing ? 'एनालिसिस चल रहा है...' : 'Analyze Sample Frame'}</span>
                  </button>
                </div>

                {analysisStatusText && (
                  <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-200">
                    {analysisStatusText}
                  </div>
                )}
              </div>

              {analysisResult && (
                <div className="p-4 bg-slate-950/70 border border-emerald-500/40 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    डिटेक्ट किए गए डिज़ाइन कंपोनेंट्स
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">हेडर व लोगो क्षेत्र:</span>
                      <span className="font-bold text-white">
                        {analysisResult.logoRect.width}% × {analysisResult.logoRect.height}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">लोकेशन बैज:</span>
                      <span className="font-bold text-white">
                        {analysisResult.locationRect.width}% × {analysisResult.locationRect.height}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">हेडलाइन ज़ोन:</span>
                      <span className="font-bold text-white">
                        {analysisResult.headlineRect.width}% × {analysisResult.headlineRect.height}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">स्थाई फुटर सुरक्षा:</span>
                      <span className="font-bold text-emerald-400">संरक्षित (Protected 8%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE 3: INTERACTIVE CANVAS MARKING */}
          {currentStage === 'element_marking' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Interactive Canvas */}
              <div className="lg:col-span-2 flex flex-col items-center">
                {/* Tools bar */}
                <div className="w-full flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-xl mb-3 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTool('select')}
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                        activeTool === 'select' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Move className="w-3 h-3" />
                      <span>सेलेक्ट / मूव</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('draw_rect')}
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                        activeTool === 'draw_rect' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>नया बॉक्स खींचें</span>
                    </button>
                  </div>

                  {activeTool === 'draw_rect' && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 mr-1">प्रकार:</span>
                      {(['photo', 'text', 'header', 'ribbon'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setDrawingElementType(t)}
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            drawingElementType === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Canvas Display */}
                <div
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="relative border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl bg-slate-950 select-none cursor-crosshair"
                  style={{
                    width: selectedRatio === '4:5' ? '360px' : '290px',
                    height: selectedRatio === '4:5' ? '450px' : '515px',
                  }}
                >
                  {/* Sample Background Reference */}
                  {sampleImage && (
                    <img src={sampleImage} alt="Sample Reference" className="w-full h-full object-cover opacity-60 pointer-events-none" />
                  )}

                  {/* Rendered Existing Layers */}
                  {layers.map((layer) => {
                    const isSelected = selectedLayerId === layer.id;
                    const isFooter = layer.type === 'footer';
                    return (
                      <div
                        key={layer.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLayerId(layer.id);
                        }}
                        className={`absolute border-2 transition-all flex flex-col justify-between p-1 cursor-pointer ${
                          isFooter
                            ? 'border-emerald-500 bg-emerald-500/20 pointer-events-none'
                            : isSelected
                            ? 'border-amber-400 bg-amber-500/25 ring-2 ring-amber-300'
                            : 'border-blue-500/80 bg-blue-500/15 hover:border-blue-400'
                        }`}
                        style={{
                          left: `${layer.rect.x}%`,
                          top: `${layer.rect.y}%`,
                          width: `${layer.rect.width}%`,
                          height: `${layer.rect.height}%`,
                          zIndex: layer.zIndex,
                        }}
                      >
                        <span className="text-[9px] font-black text-white bg-slate-950/80 px-1 py-0.2 rounded w-fit truncate">
                          {layer.name}
                        </span>
                        {isFooter && (
                          <span className="text-[8px] font-bold text-emerald-300 text-center">
                            AI News Maker Protected Footer
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Realtime Active Drawing Rect */}
                  {isDrawing && currentDrawRect && (
                    <div
                      className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/20 pointer-events-none"
                      style={{
                        left: `${currentDrawRect.x}%`,
                        top: `${currentDrawRect.y}%`,
                        width: `${currentDrawRect.width}%`,
                        height: `${currentDrawRect.height}%`,
                      }}
                    />
                  )}

                  {/* Protected Footer Barrier (Permanent) */}
                  <div
                    className="absolute left-0 right-0 bottom-0 bg-emerald-950/50 border-t-2 border-emerald-500/80 flex items-center justify-center text-[9px] font-black text-emerald-300 pointer-events-none z-30"
                    style={{ height: `${footerConfig.footerHeightRatio * 100}%` }}
                  >
                    🔒 स्थाई फुटर क्षेत्र (Predefined Fixed Footer Zone)
                  </div>
                </div>
              </div>

              {/* Right Col: Layers Management */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  एलिमेंट लेयर्स (Layers Panel)
                </h4>
                <p className="text-[11px] text-slate-400">
                  तत्वों को सिलेक्ट करें, उनका क्रम बदलें या हटाएँ।
                </p>

                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {layers.map((layer) => {
                    const isSelected = selectedLayerId === layer.id;
                    const isFooter = layer.type === 'footer';
                    return (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLayerId(layer.id)}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] text-slate-500 font-mono">#{layer.zIndex}</span>
                          <span className="font-bold truncate">{layer.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isFooter ? (
                            <Lock className="w-3.5 h-3.5 text-emerald-400" title="संरक्षित फुटर" />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayers(layers.filter((l) => l.id !== layer.id));
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 rounded"
                              title="हटाएँ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: PHOTO SLOTS CONFIGURATION */}
          {currentStage === 'photo_slots' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">डायनामिक फोटो स्लॉट्स कॉन्फ़िगरेशन</h4>
                  <p className="text-xs text-slate-400">
                    इस फ्रेम के लिए आवश्यक फोटोग्राफ्स की संख्या (1, 2, 3...) व प्रकार निर्धारित करें।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `slot_photo_${photoSlots.length + 1}`;
                    setPhotoSlots([
                      ...photoSlots,
                      {
                        id: newId,
                        name: `फोटो स्लॉट ${photoSlots.length + 1}`,
                        slotType: 'normal',
                        rect: { x: 10, y: 10, width: 80, height: 40 },
                        required: false,
                        cropMode: 'cover',
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>फोटो स्लॉट जोड़ें</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photoSlots.map((slot, idx) => (
                  <div key={slot.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-amber-400">स्लॉट #{idx + 1}: {slot.name}</span>
                      {photoSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPhotoSlots(photoSlots.filter((s) => s.id !== slot.id))}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="हटाएँ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">स्लॉट का नाम</label>
                        <input
                          type="text"
                          value={slot.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhotoSlots(photoSlots.map((s) => (s.id === slot.id ? { ...s, name: val } : s)));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">फोटो प्रकार (Type)</label>
                        <select
                          value={slot.slotType}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setPhotoSlots(
                              photoSlots.map((s) =>
                                s.id === slot.id ? { ...s, slotType: val, bgRemoval: val === 'cutout' } : s
                              )
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        >
                          <option value="normal">Normal Photo (सामान्य फोटो)</option>
                          <option value="background">Background Photo (बैकग्राउंड)</option>
                          <option value="cutout">Foreground Cutout (वक्ता कटआउट)</option>
                          <option value="inset">Inset Photo (इनसेट फ़ोटो)</option>
                          <option value="supporting">Supporting Photo (सहायक फ़ोटो)</option>
                        </select>
                      </div>
                    </div>

                    {slot.slotType === 'cutout' && (
                      <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-lg text-[11px] text-red-200">
                        ⚡ इस स्लॉट में अपलोड की गई फोटो का बैकग्राउंड स्वतः रिमूव किया जाएगा (Cutout Mode On)।
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 5: TEXT & STATEMENT CONFIG */}
          {currentStage === 'text_config' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">बयानबाज़ी / कोटेशन मोड (Statement Frame)</h4>
                    <p className="text-xs text-slate-400">
                      यदि यह एक बयान आधारित फ्रेम है, तो वक्ता का नाम, पद व कोटेशन स्लॉट सक्षम करें।
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isStatementFrame}
                      onChange={(e) => setIsStatementFrame(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {isStatementFrame && (
                  <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">बैकग्राउंड सॉलिड कलर</label>
                      <input
                        type="color"
                        value={statementBgColor}
                        onChange={(e) => setStatementBgColor(e.target.value)}
                        className="w-full h-8 bg-transparent cursor-pointer rounded"
                      />
                    </div>
                    <div className="text-[11px] text-slate-300 flex items-center">
                      वक्ता का कटआउट नीचे दाईं ओर तथा बयान ऊपर प्रदर्शित होगा।
                    </div>
                  </div>
                )}
              </div>

              {/* Headline Slots */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
                  हेडलाइन टाइपोग्राफी व फॉर्मेट
                </h4>
                {textSlots.map((ts) => (
                  <div key={ts.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">अधिकतम पंक्तियाँ (Max Lines)</label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={ts.maxLines}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 3;
                          setTextSlots(textSlots.map((t) => (t.id === ts.id ? { ...t, maxLines: val } : t)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">फॉन्ट साइज (px)</label>
                      <input
                        type="number"
                        value={ts.fontSize}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 70;
                          setTextSlots(textSlots.map((t) => (t.id === ts.id ? { ...t, fontSize: val } : t)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">अलाइनमेंट</label>
                      <select
                        value={ts.alignment}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setTextSlots(textSlots.map((t) => (t.id === ts.id ? { ...t, alignment: val } : t)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value="center">सेंटर (Center)</option>
                        <option value="left">लेफ्ट (Left)</option>
                        <option value="right">राइट (Right)</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 6: RIBBON & FOOTER */}
          {currentStage === 'ribbon_footer' && (
            <div className="space-y-4">
              {/* Ribbon Selection */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">ब्रेकिंग न्यूज़ 3D रिबन (Optional Ribbon)</h4>
                    <p className="text-xs text-slate-400">
                      फ्रेम पर 3D रिबन बैज सक्षम या अक्षम करें।
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ribbonConfig.enabled}
                      onChange={(e) => setRibbonConfig({ ...ribbonConfig, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {ribbonConfig.enabled && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {BUILTIN_RIBBONS.slice(0, 8).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRibbonConfig({ ...ribbonConfig, ribbonId: r.id, customRibbonUrl: r.url })}
                        className={`p-2.5 rounded-lg border text-left flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                          ribbonConfig.ribbonId === r.id
                            ? 'bg-amber-500/20 border-amber-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <img src={r.url} alt={r.name} className="h-6 object-contain" />
                        <span className="text-[10px] font-bold truncate w-full text-center">{r.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Protected Fixed Footer Settings */}
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-xs text-emerald-300 uppercase tracking-wider">
                    स्थाई AI News Maker फुटर सुरक्षा (Permanent Predefined Footer)
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  इस फ्रेम पर AI News Maker का आधिकारिक फुटर हमेशा नीचे रहेगा (रेशियो: {selectedRatio === '4:5' ? '8.0%' : '6.5%'})। कोई भी हेडलाइन या फ़ोटो फुटर को ओवरलैप नहीं कर सकती।
                </p>
              </div>
            </div>
          )}

          {/* STAGE 7: LIVE PREVIEW */}
          {currentStage === 'live_preview' && (
            <div className="flex flex-col items-center space-y-4">
              <h4 className="font-bold text-sm text-white">प्रोडक्शन-स्टाइल लाइव प्रीव्यू ({selectedRatio})</h4>
              <div
                className="relative border-4 border-slate-700 rounded-2xl overflow-hidden shadow-2xl bg-black"
                style={{
                  width: selectedRatio === '4:5' ? '320px' : '260px',
                  height: selectedRatio === '4:5' ? '400px' : '462px',
                  backgroundColor: isStatementFrame ? statementBgColor : '#0F172A',
                }}
              >
                {/* Photo Simulation */}
                {sampleImage && (
                  <img src={sampleImage} alt="Preview" className="w-full h-full object-cover opacity-80" />
                )}

                {/* Simulated Header */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                  <div className="px-2 py-0.5 bg-red-600 text-white font-bold text-[9px] rounded">लोगो</div>
                  <div className="px-2 py-0.5 bg-yellow-400 text-black font-bold text-[9px] rounded">भोपाल</div>
                </div>

                {/* Simulated Ribbon */}
                {ribbonConfig.enabled && (
                  <div className="absolute top-[62%] left-[15%] w-[70%] z-20">
                    <img src={ribbonConfig.customRibbonUrl || '/assets/breaking_news_ribbon.svg'} alt="Ribbon" className="w-full h-auto" />
                  </div>
                )}

                {/* Simulated Headline */}
                <div
                  className="absolute text-center px-3 z-15"
                  style={{
                    bottom: `${(footerConfig.footerHeightRatio * 100) + 2}%`,
                    left: '5%',
                    right: '5%',
                  }}
                >
                  <div className="font-bold text-white text-[11px] leading-snug drop-shadow-md">
                    {isStatementFrame
                      ? '"यह निर्णय प्रदेश की जनता के हित में लिया गया है"'
                      : 'मध्य प्रदेश में ऐतिहासिक फैसला: कैबिनेट बैठक में बड़े प्रस्तावों को मिली अंतिम मंजूरी'}
                  </div>
                </div>

                {/* Fixed Footer Simulation */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-white border-t flex items-center justify-between px-3 text-[8px] font-bold text-black z-30"
                  style={{ height: `${footerConfig.footerHeightRatio * 100}%` }}
                >
                  <span>@breakingnewswala</span>
                  <span>www.ainewsmaker.online</span>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 8: METADATA & PUBLISH */}
          {currentStage === 'metadata_publish' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">फ्रेम का नाम *</label>
                <input
                  type="text"
                  value={frameName}
                  onChange={(e) => setFrameName(e.target.value)}
                  placeholder="उदा. सुपर प्राइम 4:5 रेड फ्रेम"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">विवरण (Description)</label>
                <textarea
                  value={frameDescription}
                  onChange={(e) => setFrameDescription(e.target.value)}
                  rows={2}
                  placeholder="फ्रेम की विशेषताएं लिखें..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              {/* Design Category Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">डिज़ाइन कैटेगरी (Design Category)</label>
                <select
                  value={designCategory}
                  onChange={(e) => setDesignCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold"
                >
                  {DYNAMIC_FRAME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} {cat === 'Story Frames' ? '(9:16 Dedicated)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Eligibility Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  उपलब्ध प्लान्स (Plan Eligibility - Multi-select)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  सभी यूजर्स को यह फ्रेम दिखाई देगा। केवल चयनित प्लान वाले यूजर इसका एक्सपोर्ट/डाउनलोड कर सकेंगे।
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {DYNAMIC_PLAN_TIERS.map((tier) => {
                    const isSelected = allowedPlans.includes(tier);
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => handleTogglePlan(tier)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>{tier}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Publication Status */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">पब्लिकेशन स्टेटस</label>
                <select
                  value={publicationStatus}
                  onChange={(e) => setPublicationStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                >
                  <option value="published">Published (पब्लिश्ड - यूज़र्स को तुरंत दिखेगा)</option>
                  <option value="draft">Draft (ड्राफ्ट - केवल मास्टर एडमिन)</option>
                  <option value="preview">Preview (प्रीव्यू मोड)</option>
                </select>
              </div>

              {feedbackMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    feedbackMsg.type === 'success'
                      ? 'bg-emerald-950/70 border border-emerald-500 text-emerald-200'
                      : 'bg-red-950/70 border border-red-500 text-red-200'
                  }`}
                >
                  {feedbackMsg.text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              const stages: WizardStage[] = [
                'upload_aspect',
                'ai_analysis',
                'element_marking',
                'photo_slots',
                'text_config',
                'ribbon_footer',
                'live_preview',
                'metadata_publish',
              ];
              const idx = stages.indexOf(currentStage);
              if (idx > 0) setCurrentStage(stages[idx - 1]);
            }}
            disabled={currentStage === 'upload_aspect'}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>पिछला</span>
          </button>

          {currentStage !== 'metadata_publish' ? (
            <button
              type="button"
              onClick={() => {
                const stages: WizardStage[] = [
                  'upload_aspect',
                  'ai_analysis',
                  'element_marking',
                  'photo_slots',
                  'text_config',
                  'ribbon_footer',
                  'live_preview',
                  'metadata_publish',
                ];
                const idx = stages.indexOf(currentStage);
                if (idx < stages.length - 1) setCurrentStage(stages[idx + 1]);
              }}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>अगला</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndPublish}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isSaving ? 'सेव हो रहा है...' : 'Save & Publish Frame'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
