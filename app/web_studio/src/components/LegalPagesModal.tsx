import React, { useState } from 'react';
import { X, Shield, FileText, CreditCard, ChevronRight, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

export type LegalPage = 'terms' | 'privacy' | 'payments';

interface LegalPagesModalProps {
  isOpen: boolean;
  initialPage?: LegalPage;
  onClose: () => void;
}

export const LegalPagesModal: React.FC<LegalPagesModalProps> = ({
  isOpen,
  initialPage = 'terms',
  onClose,
}) => {
  const [activePage, setActivePage] = useState<LegalPage>(initialPage);

  if (!isOpen) return null;

  const pages: { id: LegalPage; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'terms', label: 'Terms & Conditions', icon: <FileText className="w-4 h-4" />, color: 'text-blue-400' },
    { id: 'privacy', label: 'Privacy Policy', icon: <Shield className="w-4 h-4" />, color: 'text-green-400' },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" />, color: 'text-amber-400' },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(2, 8, 23, 0.92)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">Legal & Support</h2>
              <p className="text-[11px] text-slate-400">ainewsmaker.online</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-slate-800 bg-slate-900/60 shrink-0 overflow-x-auto">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setActivePage(page.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activePage === page.id
                  ? 'bg-slate-700 text-white shadow-md ring-1 ring-slate-600'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className={activePage === page.id ? 'text-amber-400' : page.color}>{page.icon}</span>
              <span>{page.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* ===================== TERMS & CONDITIONS ===================== */}
          {activePage === 'terms' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Terms & Conditions</h3>
                  <p className="text-[11px] text-slate-400">Last updated: October 2026 &bull; Effective for ainewsmaker.online</p>
                </div>
              </div>

              {[
                {
                  title: '1. Acceptance of Terms',
                  content: 'By accessing or using AI News Maker (ainewsmaker.online), you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our platform.',
                },
                {
                  title: '2. Description of Service',
                  content: 'AI News Maker is a smart digital news studio platform that provides tools for creating news graphics, video content, e-papers, and AI-powered news tools for journalists, media houses, and digital news channels.',
                },
                {
                  title: '4. Intellectual Property',
                  content: 'All templates, frame designs, AI tools, and platform components are the intellectual property of AI News Maker / Breaking News Wala. You are granted a limited, non-exclusive license to use these for news creation purposes only.',
                },
                {
                  title: '5. Subscription Plans',
                  content: 'AI News Maker offers multiple subscription tiers (Basic, Advanced, Professional, VIP Desk). Features vary by plan. Plans are renewed based on selected billing cycles. Downgrading or canceling a plan may restrict access to premium features.',
                },
                {
                  title: '6. Limitation of Liability',
                  content: 'AI News Maker is provided "as is" without warranties. We are not liable for any damages arising from your use of our platform, including but not limited to data loss, business interruption, or reputational harm.',
                },
                {
                  title: '7. Termination',
                  content: 'We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or misuse platform resources. No refund will be provided upon termination due to policy violations.',
                },
                {
                  title: '8. Governing Law',
                  content: 'These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Bhopal, Madhya Pradesh.',
                },
              ].map(({ title, content }) => (
                <section key={title} className="space-y-2">
                  <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5" /> {title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-5">{content}</p>
                </section>
              ))}

              <section className="space-y-2">
                <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> 3. User Responsibilities
                </h4>
                <ul className="pl-5 space-y-1.5">
                  {[
                    'You must provide accurate and truthful news content. Publishing false or misleading news is strictly prohibited.',
                    'You are solely responsible for the content you create, publish, or distribute using our platform.',
                    'You must not use our platform for any illegal, harmful, or defamatory purposes.',
                    'You must not violate any intellectual property rights of third parties.',
                    'Your account credentials are your responsibility. Do not share your login details.',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> 9. Contact
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed pl-5">
                  For queries regarding these terms, contact us at:{' '}
                  <a href="mailto:breakingnewswala.com@gmail.com" className="text-blue-400 hover:underline font-bold">
                    breakingnewswala.com@gmail.com
                  </a>
                </p>
              </section>

              <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl">
                <p className="text-[11px] text-blue-200 text-center">
                  By using AI News Maker, you acknowledge that you have read, understood, and agree to these Terms & Conditions.
                </p>
              </div>
            </div>
          )}

          {/* ===================== PRIVACY POLICY ===================== */}
          {activePage === 'privacy' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-green-600/20 border border-green-500/40 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Privacy Policy</h3>
                  <p className="text-[11px] text-slate-400">Last updated: October 2026 &bull; GDPR & IT Act Compliant</p>
                </div>
              </div>

              <div className="p-3 bg-green-950/40 border border-green-500/30 rounded-xl">
                <p className="text-[11px] text-green-200 leading-relaxed">
                  🔒 <strong>Your privacy is our priority.</strong> AI News Maker is committed to protecting your personal data and being transparent about how we collect and use information.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-xs font-black text-green-300 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> 1. Information We Collect
                </h4>
                <ul className="pl-5 space-y-1.5">
                  {[
                    'Account information: Name, email address, mobile number, and channel details you provide during registration.',
                    'Usage data: Features accessed, graphics created, templates used, and session activity for improving our service.',
                    'Device information: Browser type, OS, device type, and IP address for security and analytics.',
                    'Payment information: Processed securely through our payment partners (we do not store card details).',
                    'Channel profile: Logo, channel name, website URL uploaded by you for graphic customization.',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-black text-green-300 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> 2. How We Use Your Information
                </h4>
                <ul className="pl-5 space-y-1.5">
                  {[
                    'To provide, maintain, and improve our news creation services.',
                    'To personalize your experience and deliver relevant features.',
                    'To process payments and manage subscriptions.',
                    'To send important service updates, plan renewals, and security alerts.',
                    'To detect, prevent, and address technical issues and fraudulent activities.',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {[
                {
                  title: '3. Data Storage & Security',
                  content: 'Your data is stored on secure, encrypted servers. Channel profile data is stored locally in your browser (localStorage) and optionally synced to our cloud servers. We use industry-standard SSL encryption for all data transfers. We do not sell or share your personal data with third parties for marketing purposes.',
                },
                {
                  title: '4. Cookies & Tracking',
                  content: 'We use essential cookies for session management and authentication. We may use analytics tools (like Google Analytics) to understand usage patterns. You can manage cookie preferences through your browser settings. Disabling cookies may affect certain platform functionalities.',
                },
                {
                  title: '5. Third-Party Services',
                  content: 'We integrate with third-party services including Google (for authentication), Firebase (for cloud storage), and payment processors. These services have their own privacy policies and we encourage you to review them.',
                },
                {
                  title: '7. Children\'s Privacy',
                  content: 'AI News Maker is intended for professional journalists and media professionals aged 18 and above. We do not knowingly collect data from minors. If you believe a minor has provided us data, please contact us immediately.',
                },
                {
                  title: '8. Policy Changes',
                  content: 'We may update this policy periodically. You will be notified of significant changes via email or in-app notification. Continued use of our platform after changes constitutes acceptance of the updated policy.',
                },
              ].map(({ title, content }) => (
                <section key={title} className="space-y-2">
                  <h4 className="text-xs font-black text-green-300 uppercase tracking-wider flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5" /> {title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-5">{content}</p>
                </section>
              ))}

              <section className="space-y-2">
                <h4 className="text-xs font-black text-green-300 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> 6. Your Rights
                </h4>
                <ul className="pl-5 space-y-1.5">
                  {[
                    'Right to access: Request a copy of the data we hold about you.',
                    'Right to rectification: Correct inaccurate or incomplete data.',
                    'Right to erasure: Request deletion of your account and associated data.',
                    'Right to portability: Export your data in a structured format.',
                    'Right to object: Opt out of non-essential communications.',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-black text-green-300 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> 9. Contact Our Privacy Team
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed pl-5">
                  For privacy-related queries or data deletion requests, contact:{' '}
                  <a href="mailto:breakingnewswala.com@gmail.com" className="text-green-400 hover:underline font-bold">
                    breakingnewswala.com@gmail.com
                  </a>
                </p>
              </section>
            </div>
          )}

          {/* ===================== PAYMENTS ===================== */}
          {activePage === 'payments' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Payments & Billing</h3>
                  <p className="text-[11px] text-slate-400">Subscription plans, pricing & refund policy</p>
                </div>
              </div>

              {/* Plans Overview */}
              <section className="space-y-3">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> Subscription Plans
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      plan: 'BASIC', price: '₹299/month', color: 'border-slate-600 bg-slate-800/40',
                      badge: 'bg-slate-600 text-white',
                      features: ['Watermarked graphics', 'Basic frames', 'Home news feed', '7-day free trial'],
                    },
                    {
                      plan: 'ADVANCE', price: '₹599/month', color: 'border-blue-600/60 bg-blue-950/20',
                      badge: 'bg-blue-600 text-white',
                      features: ['1080p HD graphics', 'No watermark', 'All basic frames', 'Priority support'],
                    },
                    {
                      plan: 'PROFESSIONAL', price: '₹999/month', color: 'border-purple-600/60 bg-purple-950/20',
                      badge: 'bg-purple-600 text-white',
                      features: ['Video studio access', 'Pro frames', 'E-Paper tools', 'Cloud sync'],
                    },
                    {
                      plan: 'VIP DESK', price: '₹1,999/month', color: 'border-amber-500/60 bg-amber-950/20',
                      badge: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950',
                      features: ['4K VIP frames', 'All Pro features', 'Custom templates', 'Dedicated support'],
                    },
                  ].map(({ plan, price, color, badge, features }) => (
                    <div key={plan} className={`p-3.5 border rounded-xl ${color}`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-lg ${badge}`}>{plan}</span>
                        <span className="text-xs font-black text-white">{price}</span>
                      </div>
                      <ul className="space-y-1">
                        {features.map((f, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                            <CheckCircle className="w-3 h-3 text-amber-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> Payment Methods
                </h4>
                <div className="pl-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'UPI (PhonePe, GPay, Paytm)',
                    'Debit / Credit Cards',
                    'Net Banking',
                    'EMI (select cards)',
                    'NEFT / Bank Transfer',
                    'WhatsApp Pay',
                  ].map((method) => (
                    <div key={method} className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700">
                      <CreditCard className="w-3 h-3 text-amber-400 shrink-0" />
                      {method}
                    </div>
                  ))}
                </div>
              </section>

              {[
                {
                  title: 'Billing Cycle & Auto-Renewal',
                  content: 'Subscriptions are billed monthly or annually based on your selected plan. Plans auto-renew unless cancelled before the next billing date. You will receive a renewal reminder 3 days before the due date via SMS/Email.',
                },
                {
                  title: 'Promo Codes & Free Trial',
                  content: 'New users are eligible for a 7-day free BASIC trial upon registration. Promo codes can be redeemed in your Profile → Subscription section. Codes cannot be combined with existing active plans.',
                },
                {
                  title: 'Upgrade / Downgrade',
                  content: 'You can upgrade your plan at any time. The price difference is prorated for the remaining billing period. Downgrades take effect at the start of the next billing cycle. Access to premium features is revoked upon downgrade.',
                },
              ].map(({ title, content }) => (
                <section key={title} className="space-y-2">
                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5" /> {title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-5">{content}</p>
                </section>
              ))}

              <section className="space-y-2">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> Refund Policy
                </h4>
                <div className="pl-5 space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    We offer a <strong className="text-white">3-day refund window</strong> from the date of payment for monthly plans. Annual plans are eligible for refund within 7 days.
                  </p>
                  <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl">
                    <p className="text-[11px] text-amber-200 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Refunds are <strong>not applicable</strong> if the plan has been actively used for graphic creation, downloads, or AI tools after purchase. Refunds due to technical failures on our end are processed within 5-7 business days.
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> Payment Support
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed pl-5">
                  For billing issues, failed payments, or refund requests:{' '}
                  <a href="mailto:breakingnewswala.com@gmail.com" className="text-amber-400 hover:underline font-bold">
                    breakingnewswala.com@gmail.com
                  </a>
                  {' '}or WhatsApp:{' '}
                  <a
                    href="https://wa.me/919669802408"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:underline font-bold inline-flex items-center gap-1"
                  >
                    +91 96698 02408 <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </section>

              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-center">
                <p className="text-[11px] text-amber-200">
                  All payments are processed securely. Your financial data is never stored on our servers.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[10px] text-slate-500">
            &copy; 2026 AI News Maker &bull; ainewsmaker.online &bull; Breaking News Wala
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalPagesModal;
