import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { offerService } from '../../services/apiService';
import { Sparkles, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const ExclusiveOffers = ({ offers: propOffers, loading: propLoading, city = '' }) => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState(propOffers || []);
  const [loading, setLoading] = useState(propLoading !== undefined ? propLoading : !propOffers);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (propOffers) {
      setOffers(propOffers);
      setLoading(propLoading || false);
    }
  }, [propOffers, propLoading]);

  useEffect(() => {
    if (!propOffers) {
      const fetchOffers = async () => {
        try {
          setLoading(true);
          const data = await offerService.getActive({ city });
          setOffers(data);
        } catch (err) {
          console.error('Fetch Offers Error:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchOffers();
    }
  }, [propOffers, city]);

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Coupon code ${code} copied!`);
      setTimeout(() => setCopiedCode(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="px-4 md:px-0">
        <div className="h-6 w-44 bg-gray-200/70 rounded-md animate-pulse mb-3" />
        <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="min-w-[260px] sm:min-w-[320px] h-20 md:h-24 bg-white rounded-2xl animate-pulse p-3.5 flex items-center gap-3.5"
            >
              <div className="w-16 h-14 bg-gray-100 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-3/4 bg-gray-100 rounded" />
                <div className="h-2.5 w-1/2 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || (offers.length === 0 && !loading)) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between px-4 md:px-0 mb-2 md:mb-4">
        <h2 className="text-[17px] sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Sparkles size={18} className="text-emerald-600" />
          Offers for you
        </h2>
      </div>

      <div className="flex gap-2.5 md:gap-4 overflow-x-auto pb-1 px-4 md:px-0 scroll-pl-4 md:scroll-pl-0 snap-x no-scrollbar">
        {offers.map((offer) => (
          <motion.div
            key={offer._id || offer.id}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/search')}
            className="
              min-w-[260px] sm:min-w-[300px] md:min-w-[340px]
              bg-white
              rounded-2xl
              p-3 md:p-4
              flex items-center gap-3.5 md:gap-4
              cursor-pointer
              transition-all duration-200
              shrink-0 snap-start group
            "
          >
            {/* Left side Image/Logo Box */}
            <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={offer.image}
                alt={offer.title}
                className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>

            {/* Right side Details */}
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm md:text-base font-black text-gray-900 leading-tight truncate">
                {offer.title}
              </h3>
              {offer.subtitle && (
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate mt-0.5">
                  {offer.subtitle}
                </p>
              )}
              {offer.code && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleCopyCode(e, offer.code)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2 py-0.5 rounded-lg transition-colors"
                  >
                    {copiedCode === offer.code ? (
                      <>
                        <Check size={11} className="text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span className="font-mono tracking-wider">{offer.code}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ExclusiveOffers;
