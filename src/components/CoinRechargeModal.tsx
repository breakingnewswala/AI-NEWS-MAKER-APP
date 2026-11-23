import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CashfreePaymentModal } from './CashfreePaymentModal';
import { PlanFeatureDetail } from '../lib/userPlanManager';
import {
  Coins,
  X,
  Sparkles,
  Zap,
  Crown,
  CheckCircle,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  RefreshCw,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export interface CoinPackage {
  id: 'starter' | 'supersaver' | 'megapro';
  name: string;
  nameHi: string;
  coins: number;
  price: number;
  badge?: string;
  badgeColor?: string;
  description: string;
  popular?: boolean;
  bestValue?: boolean;
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    nameHi: 'स्टार्टर पैक',
    coins: 1000,
    price: 99,
    description: 'शुरुआती न्यूज़मेकर्स हेतु उपयुक्त',
  },
  {
    id: 'supersaver',
    name: 'Super Saver Pack',
    nameHi: 'सुपर सेवर पैक',
    coins: 5000,
    price: 299,
    badge: '⭐ सर्वाधिक लोकप्रिय (Most Popular)',
    badgeColor: 'bg-amber-400 text-slate-950 border-amber-300',
    description: '5,000 कॉइन्स + भारी बचत (40% एक्स्ट्रा वैल्यू)',
    popular: true,
  },
  {
    id: 'megapro',
    name: 'Mega Pro Pack',
    nameHi: 'मेगा प्रो पैक',
    coins: 10000,
    price: 499,
    badge: '👑 सर्वश्रेष्ठ मूल्य (Best Value)',
    badgeColor: 'bg-gradient-to-r from-red-600 to-amber-500 text-white border-amber-300',
    description: '10,000 कॉइन्स - प्रो व डेली न्यूज़ चैनल्स हेतु',
    bestValue: true,
  },
];

interface CoinRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  currentUserId?: string;
  currentUser?: any;
  onBalanceUpdated?: (newBalance: number) => void;
}

export const CoinRechargeModal: React.FC<CoinRechargeModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  currentUserId,
  currentUser,
  onBalanceUpdated,
}) => {
  const [selectedPackId, setSelectedPackId] = useState<'starter' | 'supersaver' | 'megapro'>('supersaver');
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'packs' | 'history'>('packs');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cashfreePackPlan, setCashfreePackPlan] = useState<PlanFeatureDetail | null>(null);

  const activeEmail = (currentUserEmail || currentUser?.email || (typeof window !== 'undefined' ? localStorage.getItem('reporter_email') || localStorage.getItem('user_email') : '') || '').toLowerCase().trim();
  const activeUserId = (currentUserId || currentUser?.userId || currentUser?.uid || (typeof window !== 'undefined' ? localStorage.getItem('reporter_user_id') : '') || activeEmail).trim();

  // Load Wallet Data
  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/user/wallet?email=${encodeURIComponent(activeEmail)}&userId=${encodeURIComponent(activeUserId)}`);
      if (res.ok) {
        const data = await res.json();
        const bal = data.wallet?.coinBalance ?? 0;
        setCoinBalance(bal);
        setTotalEarned(data.wallet?.totalEarnedCoins ?? bal);
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      }
    } catch (e) {
      console.warn('Failed to load wallet data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWalletData();
      setStatusMessage(null);
    }
  }, [isOpen, activeEmail]);

  if (!isOpen) return null;

  const selectedPack = COIN_PACKAGES.find((p) => p.id === selectedPackId) || COIN_PACKAGES[1];

  // Handle Recharge Execution via Cashfree Payment Gateway
  const handleRecharge = () => {
    setStatusMessage(null);
    const coinPlan: PlanFeatureDetail = {
      id: selectedPack.id as any,
      planKey: `COIN_PACK_${selectedPack.id.toUpperCase()}` as any,
      nameHi: `${selectedPack.nameHi} (${selectedPack.coins.toLocaleString('en-IN')} कॉइन्स)`,
      nameEn: `${selectedPack.name} (${selectedPack.coins} Coins)`,
      priceDisplay: `₹${selectedPack.price}`,
      priceNum: selectedPack.price,
      durationDays: 365,
      validityLabel: 'लाइफटाइम कॉइन्स',
      period: 'इन्स्टैंट वॉलेट क्रेडिट',
      tagline: `₹${selectedPack.price} में ${selectedPack.coins.toLocaleString('en-IN')} कॉइन्स तुरंत प्राप्त करें`,
      hasWatermark: false,
      features: [
        `${selectedPack.coins.toLocaleString('en-IN')} कॉइन्स सीधे वॉलेट में`,
        'दैनिक डाउनलोड सीमा समाप्त होने पर उपयोग योग्य',
        'अतिरिक्त फ्रेम व ग्राफिक एक्सपोर्ट सुविधा',
      ],
      graphicExportResolution: '1080p',
      maxGraphicsPerDay: 99999,
      hasVideoStudio: true,
      hasAiTools: true,
      hasVipDeskFrames: true,
      isActive: true,
    };
    setCashfreePackPlan(coinPlan);
  };

  const handleCashfreePaymentSuccess = (planId: string) => {
    setCashfreePackPlan(null);
    setStatusMessage({
      type: 'success',
      text: `🎉 बधाई हो! ₹${selectedPack.price} में ${selectedPack.coins.toLocaleString('en-IN')} कॉइन आपके वॉलेट में जुड़ गए!`,
    });
    loadWalletData();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wallet_balance_updated'));
    }
    if (onBalanceUpdated) {
      onBalanceUpdated(coinBalance + selectedPack.coins);
    }
  };

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const filteredTransactions = transactions.filter((tx) => {
    const time = tx.createdAt ? (typeof tx.createdAt === 'number' ? tx.createdAt : new Date(tx.createdAt).getTime()) : Date.now();
    return !isNaN(time) && time >= thirtyDaysAgo;
  });

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative max-w-lg w-full bg-slate-900 border-2 border-amber-500/70 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md font-black text-xl">
              🪙
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>कॉइन वॉलेट व रिचार्ज</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                  Coin Wallet
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                दैनिक लिमिट समाप्त होने पर भी बिना रुके तुरंत ग्राफ़िक्स एक्सपोर्ट करें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Wallet Balance Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-500/50 flex items-center justify-between gap-3 shadow-lg">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>उपलब्ध कॉइन बैलेंस (Live Balance):</span>
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono flex items-baseline gap-1.5">
                <span>{coinBalance.toLocaleString('en-IN')}</span>
                <span className="text-xs font-bold text-amber-400/80">Coins</span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <button
                type="button"
                onClick={loadWalletData}
                disabled={isLoading}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition ml-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
                <span>रिफ्रेश</span>
              </button>
              <div className="text-[10px] text-slate-400">
                कुल अर्जित: <strong className="text-emerald-400">{totalEarned.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          {/* Daily Limit Exhaustion Policy Banner */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-amber-300 font-black">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>दैनिक डाउनलोड लिमिट समाप्त होने पर स्पेशल कॉइन रेट्स:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">स्टैंडर्ड ग्राफिक:</span>
                <span className="font-bold text-emerald-400">
                  <span className="line-through text-slate-500 mr-1">199</span>
                  99 कॉइन (50% छूट)
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">PRO / VIP Desk:</span>
                <span className="font-bold text-amber-400">
                  <span className="line-through text-slate-500 mr-1">199</span>
                  139 कॉइन (30% छूट)
                </span>
              </div>
            </div>
          </div>

          {/* Tabs: Recharge Packs vs History */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('packs')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'packs'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>रिचार्ज पैक्स (Recharge Packs)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>लेन-देन इतिहास ({transactions.length})</span>
            </button>
          </div>

          {/* Tab 1: Packages */}
          {activeTab === 'packs' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 block">
                रिचार्ज पैक चुनें (Select Coin Pack):
              </span>

              <div className="space-y-2.5">
                {COIN_PACKAGES.map((pkg) => {
                  const isSelected = selectedPackId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackId(pkg.id)}
                      className={`relative p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/40 border-amber-400 ring-2 ring-amber-400/50 shadow-xl'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      {/* Badge if available */}
                      {pkg.badge && (
                        <div className="absolute -top-2.5 right-4">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shadow-md ${pkg.badgeColor}`}>
                            {pkg.badge}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shrink-0 border ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                            : 'bg-slate-900 text-amber-400 border-slate-800'
                        }`}>
                          {pkg.id === 'megapro' ? '👑' : pkg.id === 'supersaver' ? '⚡' : '🪙'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-black text-white truncate">
                              {pkg.nameHi}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-bold">
                              ({pkg.name})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {pkg.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
                          ₹{pkg.price}
                        </div>
                        <div className="text-[11px] font-extrabold text-emerald-400">
                          +{pkg.coins.toLocaleString('en-IN')} कॉइन
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/80 border-red-500/50 text-red-200'
                }`}>
                  {statusMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Checkout / Payment Button */}
              <button
                type="button"
                onClick={handleRecharge}
                disabled={isProcessing}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>भुगतान प्रक्रिया जारी है...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      ₹{selectedPack.price} पे करें — {selectedPack.coins.toLocaleString('en-IN')} कॉइन तुरंत पाएँ
                    </span>
                  </>
                )}
              </button>

              <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>सुरक्षित भुगतान गेटवे (Cashfree PG) • 100% इन्स्टैंट वॉलेट क्रेडिट</span>
              </div>
            </div>
          )}

          {/* Tab 2: Transaction History */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 block">
                  हाल के लेन-देन (Recent Wallet Transactions):
                </span>
                <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full font-bold">
                  30 दिन रिकॉर्ड
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                (पिछले 30 दिनों का लेन-देन विवरण • 30 दिन पुराने रिकॉर्ड्स स्वतः मेमोरी से डिलीट हो जाते हैं)
              </p>

              {filteredTransactions.length === 0 ? (
                <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-1.5">
                  <div className="text-2xl">📋</div>
                  <p className="text-xs font-bold text-slate-300">पिछले 30 दिनों में कोई लेन-देन नहीं मिला</p>
                  <p className="text-[11px] text-slate-400">
                    जैसे ही आप कॉइन अर्जित करेंगे या रिचार्ज करेंगे, विवरण यहाँ दिखेगा।
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filteredTransactions.map((tx, idx) => {
                    const isCredit = tx.transactionType === 'credit' || tx.type === 'credit';
                    const amount = tx.coinAmount || tx.amount || 0;
                    return (
                      <div
                        key={tx.id || idx}
                        className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCredit
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">
                              {tx.description || (isCredit ? 'कॉइन क्रेडिट' : 'कॉइन डेबिट')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleString('hi-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }) : 'अभी'}
                            </div>
                          </div>
                        </div>

                        <div className={`font-mono font-black shrink-0 ${
                          isCredit ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {isCredit ? `+${amount}` : `-${amount}`} कॉइन
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {cashfreePackPlan && (
        <CashfreePaymentModal
          isOpen={Boolean(cashfreePackPlan)}
          plan={cashfreePackPlan}
          currentUser={currentUser || { email: activeEmail, userId: activeUserId }}
          onClose={() => setCashfreePackPlan(null)}
          onSuccess={handleCashfreePaymentSuccess}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
