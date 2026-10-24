import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  CreditCard,
  HelpCircle,
  Mail,
  Globe,
  ExternalLink,
  ChevronDown,
  UserX,
  Lock,
  CheckCircle,
} from 'lucide-react';

interface HelpAndPoliciesViewProps {
  isCompact?: boolean;
}

export const HelpAndPoliciesView: React.FC<HelpAndPoliciesViewProps> = ({ isCompact = false }) => {
  const [activePolicyTab, setActivePolicyTab] = useState<'privacy' | 'terms' | 'payments' | 'support'>('privacy');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const policyTabs = [
    { id: 'privacy', label: '1. प्राइवेसी पॉलिसी', icon: ShieldCheck, color: 'text-emerald-400', badge: 'डेटा सुरक्षा' },
    { id: 'terms', label: '2. नियम एवं शर्तें', icon: FileText, color: 'text-blue-400', badge: 'उपयोग शर्तें' },
    { id: 'payments', label: '3. पेमेंट्स व प्लान्स नीतियाँ', icon: CreditCard, color: 'text-amber-400', badge: 'ट्रांजेक्शन व रिफंड' },
    { id: 'support', label: '4. सहायता व संपर्क', icon: HelpCircle, color: 'text-purple-400', badge: 'हेल्पडेस्क' },
  ];

  const faqs = [
    {
      q: 'क्या मैं 7-Day Free Trial के बाद प्लान बदल सकता हूँ?',
      a: 'हाँ, आप कभी भी बेसिक, एडवांस, प्रो या वीआईपी डेस्क में अपग्रेड कर सकते हैं। प्रोमो कोड से भी अतिरिक्त वैधता रिडीम की जा सकती है।',
    },
    {
      q: 'मेरा चैनल लोगो और प्राइमरी मोबाइल नंबर कैसे सुरक्षित रहते हैं?',
      a: 'आपका प्राइमरी मोबाइल नंबर केवल अधिकृत चैनल स्वामी के लिए लॉक रहता है। चैनल लोगो क्लाउड बैकएंड और स्टूडियो ग्राफ़िक्स में सीधे सिंक होता है।',
    },
    {
      q: 'खाता हटाने (Account Deletion) की क्या प्रक्रिया है?',
      a: 'गूगल प्ले पॉलिसी के अनुरूप, यूज़र किसी भी समय अपना खाता और संपूर्ण डेटा हटाने का अनुरोध दे सकते हैं।',
    },
  ];

  return (
    <div className={`space-y-5 ${isCompact ? 'p-1' : 'p-2 sm:p-4'} text-white`}>
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/40 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              सहायता एवं नीतियाँ (Help, Support & Legal Policies)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              AI News Maker के उपयोग, डेटा प्राइवेसी, नियम एवं शर्तें व भुगतान संबंधी आधिकारिक दिशानिर्देश
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 bg-blue-950 border border-blue-500/50 text-blue-300 text-xs font-mono font-bold rounded-lg shadow-sm">
            संस्करण 1.2.0 • 2026
          </span>
        </div>
      </div>

      {/* Policy Navigation Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {policyTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePolicyTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePolicyTab(tab.id as any)}
              className={`p-3 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between gap-2 ${
                isActive
                  ? 'bg-gradient-to-br from-blue-600/30 to-indigo-900/40 border-blue-400 ring-2 ring-blue-400/40 shadow-lg'
                  : 'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${tab.color}`} />
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isActive ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.badge}
                </span>
              </div>
              <span className={`text-xs sm:text-sm font-black ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Area */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        {/* 1. PRIVACY POLICY */}
        {activePolicyTab === 'privacy' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-base font-black text-white">गोपनीयता नीति (Privacy Policy)</h4>
              </div>
              <span className="text-[11px] text-slate-400">अंतिम अद्यतन: अक्टूबर 2026</span>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong>AI News Maker</strong> («हम», «हमारा» या «ऐप») आपकी गोपनीयता का पूरा सम्मान करता है। यह नीति स्पष्ट करती है कि हमारी सेवा का उपयोग करते समय आपकी व्यक्तिगत जानकारी को कैसे एकत्र, उपयोग और सुरक्षित किया जाता है।
              </p>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>1. हम कौन सा डेटा एकत्र करते हैं:</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-2">
                  <li><strong>खाता विवरण:</strong> नाम, ईमेल, यूज़रनेम, मोबाइल नंबर और पासवर्ड।</li>
                  <li><strong>चैनल और ब्रांडिंग:</strong> चैनल का नाम, लोगो (PNG/GIF), व्हाट्सएप व सोशल मीडिया लिंक्स।</li>
                  <li><strong>न्यूज़ एवं ग्राफिक्स:</strong> आपके द्वारा जनरेट की गई हेडलाइंस, स्टोरी कार्ड्स और ई-पेपर।</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span>2. डेटा का उपयोग:</span>
                </div>
                <p className="text-xs text-slate-300">
                  आपका डेटा केवल आपके न्यूज़ चैनल के ग्राफिक्स तैयार करने, मेंबरशिप प्लान को सक्रिय रखने, और सुरक्षा सत्यापन के लिए उपयोग किया जाता है। हम आपका व्यक्तिगत डेटा किसी भी तृतीय पक्ष को नहीं बेचते।
                </p>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-400" />
                  <span>3. खाता और डेटा हटाने का अधिकार:</span>
                </div>
                <p className="text-xs text-slate-300">
                  Google Play डेवलपर नीतियों के तहत, यूज़र को अपना खाता और सभी संबंधित डेटा स्थायी रूप से मिटाने का अधिकार है। आप सीधे ऐप के अंदर या हमारे <a href="/account-deletion" className="text-blue-400 underline font-bold" target="_blank" rel="noreferrer">खाता हटाने के पेज</a> पर जाकर अनुरोध कर सकते हैं।
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. TERMS & CONDITIONS */}
        {activePolicyTab === 'terms' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h4 className="text-base font-black text-white">नियम एवं शर्तें (Terms & Conditions)</h4>
              </div>
              <span className="text-[11px] text-slate-400">लागू नियम</span>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
              <p>
                इस एप्लिकेशन या वेब स्टूडियो का उपयोग करके, आप निम्नलिखित नियमों और शर्तों से पूरी तरह सहमत होते हैं:
              </p>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-white block">1. उचित उपयोग एवं सामग्री की ज़िम्मेदारी:</span>
                <p className="text-xs text-slate-300">
                  यूज़र केवल प्रमाणित और वैध समाचार सामग्री बनाने के लिए जिम्मेदार है। भ्रामक, देशविरोधी, सांप्रदायिक सौहार्द बिगाड़ने वाली या गैरकानूनी खबरों का निर्माण पूर्णतः प्रतिबंधित है।
                </p>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-white block">2. प्रतिबंधित चैनल और सुरक्षा सूची:</span>
                <p className="text-xs text-slate-300">
                  यदि किसी चैनल नाम या डोमेन को सिस्टम सुरक्षा द्वारा प्रतिबंधित (Blacklisted) किया गया है, तो उसे तत्काल निलंबित किया जा सकता है।
                </p>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-white block">3. बौद्धिक संपदा अधिकार:</span>
                <p className="text-xs text-slate-300">
                  आपके चैनल का लोगो और ब्रांडिंग आपकी निजी संपत्ति है। ऐप द्वारा प्रदान किए गए टेम्पलेट्स, फ्रेम्स और AI टूल्स का उपयोग केवल वैध न्यूज़ प्रसारण हेतु किया जाना चाहिए।
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. PAYMENTS & PLANS POLICIES */}
        {activePolicyTab === 'payments' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h4 className="text-base font-black text-white">पेमेंट्स व प्लान्स नीतियाँ (Payments & Refund Policy)</h4>
              </div>
              <span className="text-[11px] text-slate-400">सुरक्षित भुगतान</span>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-white block">1. मेंबरशिप टियर्स और सुविधाएं:</span>
                <p className="text-xs text-slate-300">
                  • <strong>बेसिक (Basic):</strong> 7-Day Free Trial, वॉटरमार्क सहित ग्राफिक स्टूडियो।<br />
                  • <strong>एडवांस (Advance):</strong> नो वॉटरमार्क, 1080p एचडी एक्सपोर्ट।<br />
                  • <strong>प्रो (Professional):</strong> वीडियो न्यूज़ स्टूडियो अनलॉक, कस्टम हेडर/फुटर।<br />
                  • <strong>वीआईपी डेस्क (VIP Desk):</strong> 4K एक्सपोर्ट, प्राथमिकता AI और VIP न्यूज़ फ्रेम्स।
                </p>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-white block">2. प्रोमो कोड एवं एक्टिवेशन:</span>
                <p className="text-xs text-slate-300">
                  एडमिन द्वारा जारी किए गए सिंगल-यूज़ या अनलिमिटेड प्रोमो कोड्स के माध्यम से प्लान बिना किसी अतिरिक्त शुल्क के तुरंत सक्रिय किए जा सकते हैं।
                </p>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-white block">3. रिफंड नीति (Refund Policy):</span>
                <p className="text-xs text-slate-300">
                  डिजिटल सेवाओं और तत्काल एक्टिवेशन के कारण, एक बार प्लान सक्रिय होने के बाद भुगतान सामान्यतः नॉन-रिफंडेबल होता है। तकनीकी विफलता की स्थिति में सहायता टीम से 48 घंटे के भीतर संपर्क करें।
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. SUPPORT & CONTACT */}
        {activePolicyTab === 'support' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                <h4 className="text-base font-black text-white">सहायता व आधिकारिक संपर्क (Support Desk)</h4>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold">24x7 सहायता डेस्क</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Mail className="w-4 h-4" />
                  <span>आधिकारिक ईमेल (Email Support)</span>
                </div>
                <a
                  href="mailto:support.ainewsmaker@gmail.com"
                  className="text-white hover:text-amber-300 font-mono text-xs sm:text-sm font-bold block truncate"
                >
                  support.ainewsmaker@gmail.com
                </a>
                <p className="text-[11px] text-slate-400">तकनीकी समस्याओं, बिलिंग व चैनल सत्यापन के लिए लिखें</p>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                  <Globe className="w-4 h-4" />
                  <span>लाइव वेबसाइट (Official Web Portal)</span>
                </div>
                <a
                  href="https://www.ainewsmaker.online/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-blue-300 font-mono text-xs sm:text-sm font-bold flex items-center gap-1"
                >
                  <span>ainewsmaker.online</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <p className="text-[11px] text-slate-400">लाइव वेब न्यूज़ मेकर स्टूडियो व क्लाउड पोर्टल</p>
              </div>
            </div>

            {/* Quick FAQs */}
            <div className="pt-2 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">अक्सर पूछे जाने वाले प्रश्न (FAQs):</span>
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full p-3 text-left flex items-center justify-between gap-2 text-xs font-bold text-slate-200 hover:text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedFaq === idx ? 'rotate-180 text-amber-400' : ''}`} />
                  </button>
                  {expandedFaq === idx && (
                    <div className="p-3 pt-0 text-xs text-slate-400 border-t border-slate-800/60 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
