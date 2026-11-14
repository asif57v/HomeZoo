import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import LegalContent, { formatUpdated } from '../../components/ui/LegalContent';
import { legalService } from '../../services/apiService';

const PrivacyPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const audience = searchParams.get('audience') || 'user';

  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await legalService.getPage(audience, 'privacy');
        if (isMounted && res.success) {
          setPageData(res.page);
        }
      } catch (e) {
        if (isMounted) setError('Unable to load Privacy Policy.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [audience]);

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
            <h1 className="text-base sm:text-xl font-bold truncate text-white leading-tight">
              {audience === 'partner' ? 'Partner Privacy' : 'Privacy Policy'}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="flex-1 px-3 sm:px-6 -mt-4 sm:-mt-6 relative z-10 pb-12 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-100">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#005CA8] flex items-center justify-center shrink-0">
                <Shield size={15} />
              </span>
              <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                {pageData?.title || (audience === 'partner' ? 'Partner Privacy Policy' : 'Privacy Policy')}
              </span>
            </div>
            {formatUpdated(pageData) && (
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100 shrink-0">
                Updated: {formatUpdated(pageData)}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-[#005CA8] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium">Loading document...</span>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500 font-semibold text-xs sm:text-sm mb-3">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs font-bold bg-[#005CA8] text-white px-4 py-2 rounded-xl"
              >
                Retry
              </button>
            </div>
          ) : (
            <LegalContent content={pageData?.content || 'Latest policy not available.'} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
