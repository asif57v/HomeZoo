import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Phone, Mail, ChevronRight, Clock, Loader2, Shield, FileText } from 'lucide-react';
import LegalContent from '../../components/ui/LegalContent';
import { faqService, legalService } from '../../services/apiService';

const TONES = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100'
};
const contactBtn = (c) => `flex flex-col items-center justify-center gap-2 p-4 rounded-xl border active:scale-95 transition-transform ${TONES[c]}`;
const iconWrap = (c) => `w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm ${c}`;

const SupportPage = () => {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState(null);
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [support, setSupport] = useState(null);

    useEffect(() => {
        const fetchFaqs = async () => {
            try {
                const data = await faqService.getFaqs('user');
                setFaqs(data);
            } catch (error) {
                console.error('Failed to fetch FAQs');
            } finally {
                setLoading(false);
            }
        };
        fetchFaqs();
        legalService.getPage('user', 'support').then((res) => setSupport(res.page)).catch(() => {});
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-surface text-white p-6 pb-12 rounded-b-[30px] shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold">Help & Support</h1>
                </div>
                <h2 className="text-2xl font-black">How can we help you?</h2>
                <p className="text-sm text-white/70">{support?.title && support.title !== 'Help & Support' ? support.title : 'Find answers or contact our support team.'}</p>
            </div>

            <div className="px-5 -mt-8 relative z-10 space-y-6 pb-20">

                {/* Contact Options */}
                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 border border-white">
                    <h3 className="font-bold text-surface text-sm mb-4">Contact Us</h3>
                    {support?.content && <LegalContent content={support.content} className="mb-4" />}
                    <div className="grid grid-cols-2 gap-3">
                        {support?.supportWhatsapp ? (
                            <a href={`https://wa.me/${support.supportWhatsapp.replace(/D/g, '')}`} target="_blank" rel="noreferrer" className={contactBtn('blue')}>
                                <span className={iconWrap('text-blue-600')}><MessageSquare size={20} /></span>
                                <span className="text-xs font-bold text-blue-700">WhatsApp Chat</span>
                            </a>
                        ) : (
                            <button onClick={() => navigate('/contact')} className={contactBtn('blue')}>
                                <span className={iconWrap('text-blue-600')}><MessageSquare size={20} /></span>
                                <span className="text-xs font-bold text-blue-700">Send a Message</span>
                            </button>
                        )}
                        {support?.supportPhone ? (
                            <a href={`tel:${support.supportPhone}`} className={contactBtn('green')}>
                                <span className={iconWrap('text-green-600')}><Phone size={20} /></span>
                                <span className="text-xs font-bold text-green-700">Call Support</span>
                            </a>
                        ) : (
                            <button onClick={() => navigate('/contact')} className={contactBtn('green')}>
                                <span className={iconWrap('text-green-600')}><Phone size={20} /></span>
                                <span className="text-xs font-bold text-green-700">Contact Us</span>
                            </button>
                        )}
                    </div>
                    {support?.supportEmail && (
                        <a href={`mailto:${support.supportEmail}`} className="mt-3 flex items-center gap-2 text-xs font-bold text-surface">
                            <Mail size={14} /> {support.supportEmail}
                        </a>
                    )}
                    {support?.supportHours && (
                        <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={14} /> {support.supportHours}
                        </p>
                    )}
                </div>

                {/* FAQs */}
                <div>
                    <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-3 ml-1">Frequently Asked Questions</h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="animate-spin text-gray-400" />
                            </div>
                        ) : faqs.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs">No FAQs available.</div>
                        ) : (
                            faqs.map((faq, i) => (
                                <div key={faq._id || i} className="group">
                                    <button
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                    >
                                        <span className="text-sm font-bold text-surface pr-4">{faq.question}</span>
                                        <ChevronRight size={16} className={`text-gray-400 transition-transform duration-300 ${openFaq === i ? 'rotate-90' : ''}`} />
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <p className="text-xs text-gray-500 p-4 pt-0 leading-relaxed">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigate('/terms')} className="flex items-center justify-center gap-2 bg-white border border-gray-100 rounded-xl py-3 text-xs font-bold text-surface shadow-sm">
                        <FileText size={14} /> Terms & Conditions
                    </button>
                    <button onClick={() => navigate('/privacy')} className="flex items-center justify-center gap-2 bg-white border border-gray-100 rounded-xl py-3 text-xs font-bold text-surface shadow-sm">
                        <Shield size={14} /> Privacy Policy
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SupportPage;
