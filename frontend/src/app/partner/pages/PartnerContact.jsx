import React, { useRef, useState, useEffect } from 'react';
import { Mail, Phone, Send, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../../../services/apiService';

const PartnerContact = () => {
  const contentRef = useRef(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    gsap.fromTo(
      contentRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !subject || !message) {
      setError('Please fill all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      await legalService.submitContact('partner', {
        name,
        email,
        phone,
        subject,
        message
      });
      setSuccess('Your message has been sent to the HoomZo team.');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (e) {
      setError(e?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28 sm:pb-24">
      <PartnerHeader title="Contact Partner Support" subtitle="Reach the HoomZo team" />

      <main ref={contentRef} className="max-w-2xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 space-y-3 sm:space-y-4">
        {/* Contact info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <a
            href="mailto:hoomzohub@gmail.com"
            className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs border border-gray-100 flex items-center gap-3 hover:border-gray-200 transition-colors active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-[#005CA8]/10 flex items-center justify-center text-[#005CA8] shrink-0">
              <Mail size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email Support</p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">hoomzohub@gmail.com</p>
            </div>
          </a>
          <a
            href="tel:6232314147"
            className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs border border-gray-100 flex items-center gap-3 hover:border-gray-200 transition-colors active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-[#005CA8]/10 flex items-center justify-center text-[#005CA8] shrink-0">
              <Phone size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">Call Support</p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">+91 6232314147</p>
            </div>
          </a>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2.5 font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-4 py-2.5 font-medium">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-gray-100 space-y-3.5 sm:space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#005CA8]/60 focus:border-[#005CA8] transition-all bg-gray-50/50 focus:bg-white"
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#005CA8]/60 focus:border-[#005CA8] transition-all bg-gray-50/50 focus:bg-white"
                placeholder="you@hotel.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#005CA8]/60 focus:border-[#005CA8] transition-all bg-gray-50/50 focus:bg-white"
                placeholder="+91"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#005CA8]/60 focus:border-[#005CA8] transition-all bg-gray-50/50 focus:bg-white"
                placeholder="Billing, onboarding, payouts..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Message *</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#005CA8]/60 focus:border-[#005CA8] resize-none transition-all bg-gray-50/50 focus:bg-white"
              placeholder="Share context so we can assist you faster."
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 mt-2 bg-[#005CA8] hover:bg-[#004b8a] text-white py-3 rounded-xl text-xs sm:text-sm font-black active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-all shadow-md cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Send to Support</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default PartnerContact;

