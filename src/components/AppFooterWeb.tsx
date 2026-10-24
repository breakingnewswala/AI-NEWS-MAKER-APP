import React from 'react';
import { ShieldCheck, FileText, Trash2, HelpCircle, CreditCard, Sparkles, Film, Newspaper, Home, ExternalLink, Mail } from 'lucide-react';

interface AppFooterWebProps {
  onNavigateToTab: (tab: any) => void;
  onOpenPlans?: () => void;
}

export const AppFooterWeb: React.FC<AppFooterWebProps> = ({
  onNavigateToTab,
  onOpenPlans,
}) => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/90 text-slate-300 py-8 px-4 sm:px-6 lg:px-8 mt-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div
              onClick={() => onNavigateToTab('home')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-red-500 to-amber-400 p-[1.5px] flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                <img
                  src="/assets/ai_news_maker_logo.png"
                  alt="AI NEWS MAKER Logo"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="font-black text-sm tracking-wide text-white">
                AI News Maker
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              डिजिटल न्यूज़ चैनलों, पत्रकारों और स्वतंत्र मीडिया हेतु भारत का अत्याधुनिक AI न्यूज़ स्टूडियो।
            </p>
            <div className="text-[11px] text-slate-400 space-y-1 pt-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="text-amber-400 font-bold">स्वामित्व:</span>
                <span>Breaking News Wala</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <a href="mailto:support.ainewsmaker@gmail.com" className="hover:text-amber-300 transition-colors">
                  support.ainewsmaker@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick Navigation (Clean Labels Without Hashtags) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              स्टूडियो एवं फीचर्स (Features)
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('home')}
                  className="hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>Home (ताज़ा समाचार)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('studio')}
                  className="hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Graphic Studio (ग्राफिक स्टूडियो)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('videos')}
                  className="hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Film className="w-3.5 h-3.5 text-red-400" />
                  <span>Videos & Reels (वीडियो एंड रील्स)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('newsroom')}
                  className="hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Newspaper className="w-3.5 h-3.5 text-blue-400" />
                  <span>Newsroom (न्यूज़ रूम व ड्राफ्ट्स)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Payment Plans (Preserved & Cleanly Accessible) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              योजनाएं व रिचार्ज (Plans & Pricing)
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenPlans) onOpenPlans();
                    else onNavigateToTab('profile');
                  }}
                  className="hover:text-white flex items-center gap-2 cursor-pointer transition-colors text-amber-300 font-bold"
                >
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                  <span>Payment Plans (योजनाएं & रिचार्ज)</span>
                </button>
              </li>
              <li className="text-[11px] text-slate-400">
                • 7-Day Free Trial (बेसिक फ्री ट्रायल)
              </li>
              <li className="text-[11px] text-slate-400">
                • Advance, Professional व VIP Desk
              </li>
              <li className="text-[11px] text-slate-400">
                • प्रोमो कोड व कूपन एक्टिवेशन सपोर्ट
              </li>
            </ul>
          </div>

          {/* Legal, Privacy & Compliance (Clean Labels Without Hashtags) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              नीति एवं सुरक्षा (Legal & Compliance)
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('terms')}
                  className="hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Terms & Conditions (नियम एवं शर्तें)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('privacy')}
                  className="hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Privacy Policy (गोपनीयता नीति)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('delete-account')}
                  className="hover:text-white flex items-center gap-2 cursor-pointer transition-colors text-rose-300 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Account Deletion (खाता हटाना)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('support')}
                  className="hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>Support / Contact Us (सहायता व संपर्क)</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-900 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            © 2026 AI News Maker (Breaking News Wala). सर्वाधिकार सुरक्षित।
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="https://www.ainewsmaker.online/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <span>ainewsmaker.online</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('terms')}
              className="hover:text-slate-300 cursor-pointer"
            >
              Terms
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('privacy')}
              className="hover:text-slate-300 cursor-pointer"
            >
              Privacy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('delete-account')}
              className="hover:text-slate-300 cursor-pointer"
            >
              Account Deletion
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('support')}
              className="hover:text-slate-300 cursor-pointer"
            >
              Support
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
