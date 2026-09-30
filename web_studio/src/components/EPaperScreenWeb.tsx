import React, { useState } from 'react';
import {
  Newspaper,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Sparkles,
  Share2,
  ZoomIn,
  MapPin,
  ExternalLink,
  Phone,
} from 'lucide-react';
import { INITIAL_EPAPER_DATA } from '../data/newsFeedData';

interface EPaperScreenWebProps {
  onOpenStudioWithEPaper: () => void;
}

export const EPaperScreenWeb: React.FC<EPaperScreenWebProps> = ({
  onOpenStudioWithEPaper,
}) => {
  const [selectedEdition, setSelectedEdition] = useState<string>('राष्ट्रीय (National)');
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const editions = [
    'राष्ट्रीय (National)',
    'दिल्ली एनसीआर',
    'मुंबई',
    'लखनऊ',
    'भोपाल / मध्य प्रदेश',
    'जयपुर / राजस्थान',
  ];

  const epaper = INITIAL_EPAPER_DATA;
  const currentPage = epaper.pages[activePageIndex] || epaper.pages[0];

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Non-blocking trigger without popup alert
    const link = document.createElement('a');
    link.href = (currentPage as any).pdfUrl || '#';
    link.target = '_blank';
    link.download = `epaper-${selectedEdition}-${currentPage.pageNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Top Controls Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3.5 sticky top-14 z-20 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl text-slate-950 font-bold shadow-md">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                दैनिक ई-पेपर (डिजिटल संस्करण)
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>{epaper.dateStr}</span>
                <span>•</span>
                <span className="text-amber-300 font-medium">पेज {currentPage.pageNumber} of {epaper.pages.length}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Edition Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <select
                value={selectedEdition}
                onChange={(e) => setSelectedEdition(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {editions.map((ed) => (
                  <option key={ed} value={ed} className="bg-slate-900 text-white">
                    {ed}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Page Selector */}
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
              <button
                onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                disabled={activePageIndex === 0}
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-40 rounded"
                title="पिछला पेज"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold px-2 text-amber-300">
                पेज {activePageIndex + 1}
              </span>
              <button
                onClick={() => setActivePageIndex((prev) => Math.min(epaper.pages.length - 1, prev + 1))}
                disabled={activePageIndex === epaper.pages.length - 1}
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-40 rounded"
                title="अगला पेज"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Print & Download */}
            <button
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              title="प्रिंट करें"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Studio E-Paper Jacket CTA */}
            <button
              onClick={onOpenStudioWithEPaper}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              ई-पेपर जैकेट बनाएं
            </button>
          </div>
        </div>
      </div>

      {/* Main Newspaper Paper Sheet Layout */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-[#faf8f5] text-slate-900 rounded-xl shadow-2xl border-4 border-slate-300 p-6 sm:p-10 font-serif space-y-6">
          {/* Newspaper Masthead */}
          <div className="border-b-4 border-slate-900 pb-3 text-center space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-sans uppercase font-bold text-slate-700 tracking-wider border-b border-slate-400 pb-1">
              <span>वर्ष 12 • अंक 248 • पंजीयन सं.: MP/2026/AI-NEWS</span>
              <span>{selectedEdition}</span>
              <span>मूल्य: ₹ 5.00 (डिजिटल ई-संस्करण निःशुल्क)</span>
            </div>

            <div className="py-2">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-950 font-serif">
                दैनिक AI न्यूज़ मेकर
              </h1>
              <p className="text-xs sm:text-sm font-sans tracking-widest text-red-700 font-bold uppercase mt-1">
                ★ सत्य • निष्पक्षता • डिजिटल पत्रकारिता का नया युग ★
              </p>
            </div>

            <div className="flex items-center justify-between text-xs font-sans font-semibold border-t-2 border-slate-900 pt-1.5 px-2 bg-slate-100 rounded">
              <span>दिनांक: {epaper.dateStr}</span>
              <span className="font-bold text-red-800">{currentPage.title}</span>
              <span>www.ainewsmaker.online</span>
            </div>
          </div>

          {/* Lead Story & Columns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Lead Story (Left 8 Cols) */}
            <div className="lg:col-span-8 space-y-4 pr-0 lg:pr-4 border-b lg:border-b-0 lg:border-r border-slate-300 pb-6 lg:pb-0">
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-0.5 bg-red-700 text-white text-[11px] font-sans font-bold uppercase rounded">
                  विशेष संपादकीय लीड रिपोर्ट
                </span>
                <h2 className="text-2xl sm:text-3xl font-black leading-tight text-slate-950">
                  {currentPage.leadStory.headline}
                </h2>
                <p className="text-sm font-sans font-medium text-slate-700 italic border-l-4 border-red-700 pl-3 py-0.5">
                  {currentPage.leadStory.summary}
                </p>
              </div>

              {currentPage.leadStory.imageUrl && (
                <div className="my-3 rounded-lg overflow-hidden border border-slate-300 max-h-72">
                  <img
                    src={currentPage.leadStory.imageUrl}
                    alt="Lead news"
                    className="w-full h-full object-cover grayscale contrast-125"
                  />
                  <div className="bg-slate-200 text-slate-700 text-[11px] font-sans p-1.5 text-center font-medium">
                    विशेष तस्वीर: संसद परिसर में नए डिजिटल मीडिया प्रारूप पर चर्चा के दौरान का दृश्य
                  </div>
                </div>
              )}

              {/* Multi-column body text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-800 leading-relaxed text-justify">
                {currentPage.leadStory.columnContent.map((col, idx) => (
                  <p key={idx} className="first-letter:text-3xl first-letter:font-black first-letter:mr-1 first-letter:float-left">
                    {col}
                  </p>
                ))}
              </div>
            </div>

            {/* Sidebar Stories & Classified (Right 4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="border-b-2 border-red-700 pb-1 font-sans font-black text-xs uppercase tracking-wider text-red-700">
                संक्षिप्त सुर्खियां एवं अन्य खबरें
              </div>

              <div className="space-y-4 divide-y divide-slate-300">
                {currentPage.secondaryStories.map((sec, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-slate-950 leading-snug hover:text-red-700 cursor-pointer">
                      • {sec.headline}
                    </h3>
                    <p className="text-xs font-sans text-slate-600 leading-normal">
                      {sec.brief}
                    </p>
                  </div>
                ))}
              </div>

              {/* Classified / Advertisement Box */}
              {currentPage.adBox && (
                <div className="border-2 border-dashed border-red-800 bg-amber-50/70 p-4 rounded-lg text-center space-y-2 font-sans mt-4">
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                    — वर्गीकृत विज्ञापन —
                  </span>
                  <h4 className="text-xs font-black text-slate-900">
                    {currentPage.adBox.title}
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    {currentPage.adBox.text}
                  </p>
                  <div className="pt-2">
                    <a
                      href={`tel:${currentPage.adBox.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-700 text-white text-xs font-bold rounded-md shadow"
                    >
                      <Phone className="w-3 h-3" />
                      {currentPage.adBox.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Newspaper Footer */}
          <div className="border-t-2 border-slate-900 pt-3 flex flex-wrap items-center justify-between text-[11px] font-sans text-slate-600">
            <span>मुद्रक एवं प्रकाशक: AI News Maker नेटवर्क, नई दिल्ली</span>
            <span>पेज संख्या: {currentPage.pageNumber} / {epaper.pages.length}</span>
            <span>संपादक: मुख्य संपादक • ईमेल: breakingnewswala.com@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};
