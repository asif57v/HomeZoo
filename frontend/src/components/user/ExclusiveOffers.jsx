import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { offerService } from '../../services/apiService';
import toast from 'react-hot-toast';

const formatSubtitle = (text) => {
    if (!text) return null;
    const regex = /(\d+%|₹\d+)/g;
    const parts = text.split(regex);
    return parts.map((part, i) => 
        regex.test(part) ? <span key={i} className="text-cyan-400 font-bold">{part}</span> : part
    );
};

const ExclusiveOffers = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                setLoading(true);
                const data = await offerService.getActive();
                setOffers(data);
            } catch (err) {
                console.error("Fetch Offers Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchOffers();
    }, []);

    if (loading) {
        return (
            <div className="py-2 pl-5">
                <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-4"></div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar">
                    {[1, 2].map(i => (
                        <div key={i} className="min-w-[340px] h-[190px] bg-gray-100 rounded-[1.5rem] animate-pulse flex items-center justify-center">
                            <Loader2 className="text-gray-200 animate-spin" size={24} />
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
        <section className="py-2 pl-5 mt-2">
            <h2 className="text-xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
                Exclusive offers for you
                <div className="bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-600">NEW</div>
            </h2>

            <div className="flex gap-4 overflow-x-auto pb-4 pr-5 snap-x no-scrollbar">
                {offers.map((offer) => (
                    <motion.div
                        key={offer._id || offer.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            navigator.clipboard.writeText(offer.code);
                            toast.success(`Code ${offer.code} copied!`);
                            navigate('/listings');
                        }}
                        className={`
                            relative 
                            min-w-[340px] md:min-w-[380px] 
                            h-[210px] 
                            rounded-[1.5rem] 
                            overflow-hidden 
                            snap-center 
                            shadow-lg shadow-blue-900/10
                            cursor-pointer
                            bg-white
                        `}
                    >
                        {/* Right side image */}
                        <div className="absolute right-0 top-0 bottom-0 w-[55%]">
                            <img
                                src={offer.image}
                                alt={offer.title}
                                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                            />
                        </div>

                        {/* Left side Blue Background overlay using SVG for curved edge */}
                        <svg 
                            className="absolute inset-0 w-full h-full drop-shadow-xl" 
                            preserveAspectRatio="none" 
                            viewBox="0 0 400 200"
                        >
                            <path d="M0,0 H300 Q260,100 240,200 H0 Z" fill="#3e34fa" />
                        </svg>

                        {/* Content Container */}
                        <div className="absolute inset-0 p-4 flex flex-col justify-start gap-2 z-10 w-[70%]">
                            {/* Title */}
                            <h3 className="text-xl md:text-[22px] font-bold text-white leading-tight pr-1">
                                {offer.title}
                            </h3>

                            {/* Badge and Subtitle */}
                            <div className="flex items-center gap-3">
                                {/* Starburst Badge */}
                                <div className="relative w-[48px] h-[48px] flex items-center justify-center shrink-0">
                                    <svg className="absolute inset-0 w-full h-full text-cyan-400 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 1.5L14.7 4.5L18.8 4.2L19.9 8.2L23.5 10L21 13.5L21.3 17.6L17.3 18.5L15.5 22.1L12 19.6L8.5 22.1L6.7 18.5L2.7 17.6L3 13.5L0.5 10L4.1 8.2L5.2 4.2L9.3 4.5L12 1.5Z" />
                                    </svg>
                                    <div className="relative flex flex-col items-center leading-[1.1] z-10 mt-[2px]">
                                        <span className="text-[12px] font-black text-[#1e1a8a]">
                                            {offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
                                        </span>
                                        <span className="text-[9px] font-black text-[#1e1a8a]">OFF</span>
                                    </div>
                                </div>
                                
                                {/* Subtitle */}
                                <div className="text-[14px] font-medium text-white/95 leading-[1.3]">
                                    {formatSubtitle(offer.subtitle)}
                                </div>
                            </div>

                            {/* Code Box */}
                            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 w-fit backdrop-blur-sm shadow-sm">
                                <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.41l9 9c.36.36.86.59 1.41.59s1.05-.22 1.41-.59l7-7c.36-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                                </svg>
                                <span className="text-[12px] font-medium text-white/90">
                                    Use Code: <span className="text-cyan-400 font-bold tracking-wide">{offer.code}</span>
                                </span>
                            </div>

                            {/* Button */}
                            <button className="px-6 py-2 bg-white text-[#1e1a8a] text-[13px] font-black rounded-xl hover:bg-gray-50 transition-colors shadow-lg w-fit">
                                {offer.btnText || "Grab Deal"}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default ExclusiveOffers;
