import React, { useEffect, useState } from 'react';
import { Crown, CreditCard, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../../services/adminService';
import useFeatureFlagsStore from '../../../store/featureFlagsStore';

const CARDS = [
  {
    key: 'subscriptionEnabled',
    updatedKey: 'subscriptionUpdatedAt',
    title: 'Subscription Management',
    description: 'Control subscription plans and subscription functionality across Hoomzo.',
    icon: Crown,
    confirmTitle: 'Disable subscriptions?',
    confirmBody:
      'Plan cards, upgrade/renew buttons and subscription purchases will be hidden and blocked in the User App and Hotel Panel. Existing subscriptions, payment history and plans are kept and are restored when you enable this again.'
  },
  {
    key: 'razorpayEnabled',
    updatedKey: 'razorpayUpdatedAt',
    title: 'Razorpay Payments',
    description: 'Control Razorpay checkout and payment initiation across Hoomzo.',
    icon: CreditCard,
    confirmTitle: 'Disable Razorpay payments?',
    confirmBody:
      'No new Razorpay orders can be created in the User App or Hotel Panel (bookings, wallet top-ups, subscriptions, hostel fees, reels). Existing transactions and pending payments are not changed.'
  }
];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Never changed';

const Toggle = ({ checked, disabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
      checked ? 'bg-emerald-500' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const PlatformFeatureControls = () => {
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [confirmCard, setConfirmCard] = useState(null);
  const setFlags = useFeatureFlagsStore((s) => s.setFlags);

  useEffect(() => {
    let mounted = true;
    adminService
      .getFeatureControls()
      .then((res) => mounted && setFeatures(res.features))
      .catch(() => toast.error('Failed to load feature controls'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const save = async (key, value) => {
    setSavingKey(key);
    try {
      // Only the toggled key is sent, so the other switch can never be changed by accident
      const res = await adminService.updateFeatureControls({ [key]: value });
      setFeatures(res.features);
      setFlags(res.features);
      toast.success(`${CARDS.find((c) => c.key === key).title} ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update. Please try again.');
    } finally {
      setSavingKey(null);
      setConfirmCard(null);
    }
  };

  const handleToggle = (card) => {
    const current = features?.[card.key];
    if (current) {
      setConfirmCard(card); // confirm before turning OFF
    } else {
      save(card.key, true);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Platform Feature Controls</h3>
        <p className="text-xs text-gray-500">Global switches applied instantly to the User App, Hotel Panel and APIs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map((card) => {
          const enabled = features?.[card.key] !== false;
          const Icon = card.icon;
          const saving = savingKey === card.key;
          return (
            <div key={card.key} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700 shrink-0">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{card.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{card.description}</p>
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="animate-spin text-gray-400" size={20} />
                ) : (
                  <div className="flex items-center gap-2">
                    {saving && <Loader2 className="animate-spin text-gray-400" size={16} />}
                    <Toggle
                      checked={enabled}
                      disabled={saving || !features}
                      onChange={() => handleToggle(card)}
                      label={card.title}
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span className="text-[11px] text-gray-400">Last updated: {formatDate(features?.[card.updatedKey])}</span>
              </div>
            </div>
          );
        })}
      </div>

      {confirmCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <h4 className="font-bold text-gray-900">{confirmCard.confirmTitle}</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{confirmCard.confirmBody}</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmCard(null)}
                disabled={!!savingKey}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => save(confirmCard.key, false)}
                disabled={!!savingKey}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {savingKey && <Loader2 className="animate-spin" size={14} />} Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformFeatureControls;
