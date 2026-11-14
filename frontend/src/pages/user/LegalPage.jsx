import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Shield } from 'lucide-react';
import LegalContent, { formatUpdated } from '../../components/ui/LegalContent';
import { legalService } from '../../services/apiService';

const LegalPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const audience = searchParams.get('audience') || 'user';
    const activeTab = searchParams.get('tab') || 'terms'; // terms or privacy

    const [privacy, setPrivacy] = useState(null);
    const [terms, setTerms] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                const [privacyRes, termsRes] = await Promise.allSettled([
                    legalService.getPage(audience, 'privacy'),
                    legalService.getPage(audience, 'terms')
                ]);

                if (!isMounted) return;

                if (privacyRes.status === 'fulfilled' && privacyRes.value?.page) {
                    setPrivacy(privacyRes.value.page);
                }
                if (termsRes.status === 'fulfilled' && termsRes.value?.page) {
                    setTerms(termsRes.value.page);
                }
            } catch (e) {
                if (!isMounted) return;
                setError('Unable to load latest legal content. Showing default copy.');
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [audience]);

    // Handle scroll to section if tab is present
    useEffect(() => {
        if (!loading && (terms || privacy)) {
            const timer = setTimeout(() => {
                const element = document.getElementById(activeTab);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [loading, terms, privacy, activeTab]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Top Mobile-Friendly Header */}
            <div className="bg-gradient-to-br from-[#005CA8] via-[#005296] to-[#003e73] text-white pt-3 pb-8 sm:pt-6 sm:pb-12 px-3 sm:px-6 rounded-b-2xl sm:rounded-b-[2rem] shadow-md sticky top-0 z-20">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-full bg-white/15 active:bg-white/30 hover:bg-white/20 flex items-center justify-center transition shrink-0 shadow-sm"
                        aria-label="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/70 font-semibold block leading-tight">
                            {audience === 'partner' ? 'Partner Portal' : 'Hoomzo Stays'}
                        </span>
                        <h1 className="text-base sm:text-xl font-bold truncate text-white leading-tight capitalize">
                            {audience} Policies & Agreements
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 px-3 sm:px-6 -mt-4 sm:-mt-6 relative z-10 pb-12 max-w-2xl mx-auto w-full space-y-4">

                {error && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-2">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 text-slate-400">
                        <div className="w-8 h-8 border-3 border-[#005CA8] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-medium">Loading policies...</span>
                    </div>
                ) : (
                    <>
                        <div id="privacy" className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-100 scroll-mt-20">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Shield size={15} />
                                    </span>
                                    <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                                        {privacy?.title || 'Privacy Policy'}
                                    </span>
                                </div>
                                {formatUpdated(privacy) && (
                                    <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100 shrink-0">
                                        Updated: {formatUpdated(privacy)}
                                    </span>
                                )}
                            </div>
                            <LegalContent
                                content={privacy?.content || 'At HoomZo, we take your privacy seriously. This policy describes how we collect, use, and handle your data.'}
                            />
                        </div>

                        <div id="terms" className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-100 scroll-mt-20">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#005CA8] flex items-center justify-center shrink-0">
                                        <FileText size={15} />
                                    </span>
                                    <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                                        {terms?.title || (audience === 'partner' ? 'Partner Agreement' : 'Terms & Conditions')}
                                    </span>
                                </div>
                                {formatUpdated(terms) && (
                                    <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100 shrink-0">
                                        Updated: {formatUpdated(terms)}
                                    </span>
                                )}
                            </div>
                            <LegalContent
                                content={terms?.content || 'By using HoomZo, you agree to the latest booking, cancellation and usage terms defined by the platform.'}
                            />
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default LegalPage;
