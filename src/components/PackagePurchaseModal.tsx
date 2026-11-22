import React, { useState } from 'react';
import { Crown, Sparkles, CheckCircle2, X, Zap, ShieldCheck, Tag, Loader2 } from 'lucide-react';
import {
  UserSubscription,
  PlanFeatureDetail,
  PLAN_DETAILS,
  getPlansCatalog,
  sortPlansByCanonicalOrder,
  redeemPromoCode,
  setUserPlanTier,
  getUserSubscription,
} from '../lib/userPlanManager';
import { CashfreePaymentModal } from './CashfreePaymentModal';

interface PackagePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription?: UserSubscription | null;
  currentUser?: any;
  onPlanActivated?: (planId: string) => void;
}

export const PackagePurchaseModal: React.FC<PackagePurchaseModalProps> = ({
  isOpen,
  onClose,
  subscription: propSubscription,
  currentUser,
  onPlanActivated,
}) => {
  const [selectedMobileTab, setSelectedMobileTab] = useState<'all' | 'basic' | 'advanced' | 'professional' | 'vip_desk'>('all');
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false);
  const [cashfreeModalPlan, setCashfreeModalPlan] = useState<PlanFeatureDetail | null>(null);

  if (!isOpen) return null;

  const currentSub = propSubscription || getUserSubscription();
  const catalog = sortPlansByCanonicalOrder(getPlansCatalog());

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponMsg(null);

    setTimeout(() => {
      const res = redeemPromoCode(couponCode.trim(), currentUser);
      setIsApplyingCoupon(false);
      if (res.success) {
        setCouponMsg({ text: res.message, type: 'success' });
        setCouponCode('');
        if (onPlanActivated && res.tier) {
          onPlanActivated(res.tier);
        }
      } else {
        setCouponMsg({ text: res.message, type: 'error' });
      }
    }, 400);
  };

  const handleSelectPlan = (plan: PlanFeatureDetail) => {
    setCashfreeModalPlan(plan);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative my-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-950/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
              <Crown className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  प्रीमियम मेंबरशिप पैकेजेस (Membership Plans)
                </h3>
                <span className="px-2.5 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black rounded-full uppercase">
                  4 स्तर उपलब्ध
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentSub?.isTrialActive
                  ? `वर्तमान में ट्रायल पीरियड सक्रिय है (${currentSub?.daysRemaining || 7} दिन शेष) — बिना रुकावट सेवा जारी रखने हेतु पैकेज चुनें`
                  : 'अनलिमिटेड एचडी वीडियो, बिना वॉटरमार्क ग्राफ़िक्स व एडवांस्ड AI फीचर्स'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold transition cursor-pointer shrink-0 border border-slate-700"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 relative z-10 custom-scrollbar">
          {/* Trial Notice Alert Banner */}
          {currentSub?.isTrialActive && (
            <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-300 uppercase">
                    ट्रायल पीरियड (7-Day Free Trial) — {currentSub.daysRemaining} दिन शेष
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    आप <strong>7-दिवसीय फ्री ट्रायल</strong> का उपयोग कर रहे हैं (₹999/माह मूल्य के <strong>PRO फीचर्स</strong> निःशुल्क मिले हैं)। ट्रायल समाप्त होने के बाद सेवा सुचारू रखने के लिए अभी अपना पसंदीदा पैकेज चुनें।
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Filter Tabs */}
          <div className="md:hidden flex items-center justify-between gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {[
              { id: 'all', label: 'सभी' },
              { id: 'basic', label: '1. बेसिक' },
              { id: 'advanced', label: '2. एडवांस' },
              { id: 'professional', label: '3. प्रो' },
              { id: 'vip_desk', label: '4. वीआईपी' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedMobileTab(tab.id as any)}
                className={`flex-1 py-1.5 px-1 text-[11px] font-black rounded-lg transition text-center cursor-pointer ${
                  selectedMobileTab === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 4 Plan Cards Grid (2x2 on Desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {catalog
              .filter((plan) => {
                if (selectedMobileTab === 'all') return true;
                if (selectedMobileTab === 'vip_desk') return plan.id === 'vip_desk' || plan.id === 'vip';
                return plan.id === selectedMobileTab;
              })
              .map((plan) => {
                const isCurrent = currentSub?.tier === plan.id;
                const regPrice = plan.id === 'basic' ? 2999 : plan.id === 'advanced' ? 4999 : plan.id === 'professional' ? 6999 : 9999;
                const discountPct = plan.discountPercent || (plan.id === 'basic' ? 67 : plan.id === 'advanced' ? 50 : plan.id === 'professional' ? 40 : 35);
                const regPriceDisplay = plan.regularPriceDisplay || `₹${regPrice.toLocaleString('en-IN')}`;

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-4 sm:p-5 border flex flex-col justify-between transition-all duration-200 ${
                      isCurrent && !currentSub?.isTrialActive
                        ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-amber-400 shadow-xl ring-2 ring-amber-400/50'
                        : plan.id === 'vip_desk' || plan.id === 'vip'
                        ? 'bg-gradient-to-b from-amber-950/20 via-slate-950 to-slate-950 border-amber-500/50 hover:border-amber-400 shadow-lg'
                        : plan.popular
                        ? 'bg-gradient-to-b from-blue-950/20 via-slate-950 to-slate-950 border-blue-500/60 hover:border-blue-400 shadow-lg'
                        : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm sm:text-base text-white">
                          {plan.nameHi}
                        </span>
                        {plan.popular && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded-full uppercase">
                            सर्वाधिक लोकप्रिय
                          </span>
                        )}
                        {(plan.id === 'vip_desk' || plan.id === 'vip') && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-red-500 text-slate-950 text-[9px] font-black rounded-full uppercase">
                            VIP DESK
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold rounded-md">
                        {discountPct}% छूट
                      </span>
                    </div>

                    {/* Price Block */}
                    <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 mb-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-slate-500 line-through font-mono">
                          {regPriceDisplay}
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                          {plan.priceDisplay}
                        </span>
                        <span className="text-xs text-slate-400">/ {plan.period || 'माह'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        {plan.tagline}
                      </p>
                    </div>

                    {/* Key Specs */}
                    <div className="space-y-1.5 text-[11px] border-t border-slate-800/80 pt-2 mb-3">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>मास्टर ब्रांडिंग:</span>
                        <span className={plan.id === 'basic' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {plan.id === 'basic' ? 'अनिवार्य' : '✅ कस्टम लोगो व नाम'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>एक्सपोर्ट क्वालिटी:</span>
                        <span className="text-white font-bold">
                          {plan.graphicExportResolution || (plan.id === 'basic' ? '720p HD' : plan.id === 'advanced' ? '1080p Full HD' : '1080p Ultra HD')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>दैनिक डाउनलोड सीमा:</span>
                        <span className="text-amber-300 font-mono font-bold">
                          {plan.dailyDownloadLimit ? `${plan.dailyDownloadLimit} कार्ड्स/दिन` : plan.id === 'basic' ? '5/दिन' : plan.id === 'advanced' ? '30/दिन' : '100/दिन'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>वीडियो व रील एक्सेस:</span>
                        <span className={plan.id === 'basic' ? 'text-slate-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {plan.id === 'basic' ? 'ट्रायल केवल' : '✅ फुल एक्सेस'}
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-1 text-[11px] text-slate-300 mb-4 flex-1">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 leading-snug">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action CTA Button */}
                    <div>
                      {isCurrent && !currentSub?.isTrialActive && !currentSub?.isTrialExpired ? (
                        <div className="w-full py-2.5 bg-slate-800 text-amber-300 text-center font-black text-xs rounded-xl border border-amber-400/40">
                          ✓ वर्तमान सक्रिय प्लान
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectPlan(plan)}
                          className={`w-full py-2.5 font-black text-xs sm:text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                            plan.id === 'basic'
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600'
                              : plan.id === 'advanced'
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                              : plan.id === 'professional'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                              : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black'
                          }`}
                        >
                          <Zap className="w-4 h-4" />
                          <span>🚀 अभी अपग्रेड करें ({plan.priceDisplay})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Coupon Code Redemption Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-white block">
                  प्रोमो / कूपन कोड है? (Promo Code Redemption)
                </span>
                <span className="text-[11px] text-slate-400">
                  यदि आपके पास डिस्काउंट या फ्री एक्टिवेशन कूपन है, तो यहाँ दर्ज करें
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="उदा. PRO999 या VIP2026"
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white uppercase focus:border-amber-400 focus:outline-hidden w-full sm:w-44"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={isApplyingCoupon || !couponCode.trim()}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1"
              >
                {isApplyingCoupon ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>रिडीम करें</span>
                )}
              </button>
            </div>
          </div>

          {couponMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                couponMsg.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300'
                  : 'bg-red-950/80 border border-red-500/60 text-red-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{couponMsg.text}</span>
            </div>
          )}

          {/* Secure Guarantee */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% सुरक्षित भुगतान | Instant Activation | Razorpay व Cashfree UPI / कार्ड सपोर्ट</span>
          </div>
        </div>
      </div>

      {/* Cashfree Payment Gateway Modal */}
      {cashfreeModalPlan && (
        <CashfreePaymentModal
          isOpen={Boolean(cashfreeModalPlan)}
          plan={cashfreeModalPlan}
          currentUser={currentUser}
          onClose={() => setCashfreeModalPlan(null)}
          onSuccess={(planId) => {
            setCashfreeModalPlan(null);
            setUserPlanTier(planId as any);
            if (onPlanActivated) onPlanActivated(planId);
            onClose();
          }}
        />
      )}
    </div>
  );
};
