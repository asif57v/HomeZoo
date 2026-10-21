import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    TrendingUp, 
    Calendar, 
    Clock, 
    ArrowRight, 
    Search, 
    Tag, 
    Eye, 
    X, 
    Share2, 
    BookOpen, 
    ChevronLeft, 
    Sparkles,
    Check
} from 'lucide-react';
import { propertyService } from '../../services/apiService';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Market Insights', 'Legal Guide', 'Lifestyle & Design', 'Infrastructure', 'Investment'];

const NewsPage = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchArticles();
    }, [selectedCategory]);

    const fetchArticles = async () => {
        try {
            setLoading(true);
            const params = { limit: 30 };
            if (selectedCategory !== 'All') {
                params.category = selectedCategory;
            }
            const data = await propertyService.getNewsArticles(params);
            if (data && data.articles) {
                setArticles(data.articles);
            }
        } catch (error) {
            console.error('Failed to load news articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredArticles = articles.filter(item => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.title?.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.category?.toLowerCase().includes(query)
        );
    });

    const handleShare = (article) => {
        if (navigator.share) {
            navigator.share({
                title: article.title,
                text: article.description,
                url: window.location.href
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Recent';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return 'Recent';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/70 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Hero Banner Header */}
                <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 lg:p-16 mb-12 overflow-hidden shadow-2xl border border-slate-800">
                    <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/4 -bottom-20 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

                    <div className="relative z-10 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs uppercase tracking-wider border border-blue-400/30 mb-5">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            Market Intelligence & Insights
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            Real Estate & Property <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-300">Updates</span>
                        </h1>
                        <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                            Stay up-to-date with ground reality reports, upcoming expressways, RERA compliance guidelines, and smart land investment strategies across prime hubs.
                        </p>
                    </div>

                    {/* Search & Filter Bar Inside Hero */}
                    <div className="relative z-10 mt-8 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search articles, topics or keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-inner text-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Category Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                            {CATEGORIES.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                        selectedCategory === category
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Articles Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs animate-pulse">
                                <div className="aspect-[16/10] bg-slate-200 rounded-2xl mb-4" />
                                <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                                <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                                <div className="h-4 bg-slate-200 rounded w-full mb-2" />
                                <div className="h-4 bg-slate-200 rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80">
                        <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900">No Articles Found</h3>
                        <p className="text-slate-500 text-sm mt-1">Try selecting a different category or clearing your search.</p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                            >
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredArticles.map((item) => (
                            <motion.article
                                key={item._id || item.id}
                                whileHover={{ y: -6 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setSelectedArticle(item)}
                                className="group bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_45px_-10px_rgba(15,23,42,0.12)] overflow-hidden flex flex-col justify-between cursor-pointer transition-all"
                            >
                                <div>
                                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                        <img 
                                            src={item.image} 
                                            alt={item.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                                        
                                        <span className="absolute top-4 left-4 inline-flex items-center px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-slate-900 text-xs font-black tracking-wide shadow-md border border-white/50">
                                            {item.category}
                                        </span>

                                        <span className="absolute bottom-4 right-4 text-white font-bold text-xs bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg">
                                            {item.readTime}
                                        </span>
                                    </div>

                                    <div className="p-6">
                                        <div className="flex items-center gap-2 text-xs font-extrabold text-blue-600 mb-2.5 uppercase tracking-wider">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{formatDate(item.publishedAt || item.date || item.createdAt)}</span>
                                        </div>

                                        <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                                            {item.title}
                                        </h3>

                                        <p className="mt-2.5 text-sm font-medium text-slate-600 leading-relaxed line-clamp-3">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="px-6 pb-6 pt-2 flex items-center justify-between font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors border-t border-slate-100 mt-2">
                                    <span className="underline decoration-slate-200 group-hover:decoration-blue-500 underline-offset-4 transition-all">
                                        Read Full Story
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-all">
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                )}
            </div>

            {/* Article Detail Reading Modal */}
            <AnimatePresence>
                {selectedArticle && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 my-8 flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header Bar */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs">
                                        {selectedArticle.category}
                                    </span>
                                    <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {selectedArticle.readTime}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleShare(selectedArticle)}
                                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                                        title="Share article"
                                    >
                                        {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Share2 className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => setSelectedArticle(null)}
                                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Scrollable Body */}
                            <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
                                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-md">
                                    <img
                                        src={selectedArticle.image}
                                        alt={selectedArticle.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Published on {formatDate(selectedArticle.publishedAt || selectedArticle.createdAt)}</span>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                                        {selectedArticle.title}
                                    </h2>
                                </div>

                                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-blue-950 font-medium text-sm sm:text-base leading-relaxed">
                                    {selectedArticle.description}
                                </div>

                                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-4">
                                    {selectedArticle.content ? (
                                        selectedArticle.content.split('\n\n').map((paragraph, idx) => (
                                            <p key={idx} className="text-base text-slate-700 leading-relaxed font-normal">
                                                {paragraph}
                                            </p>
                                        ))
                                    ) : (
                                        <p className="text-base text-slate-700 leading-relaxed">
                                            {selectedArticle.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-400">HomeZo Market Intelligence</span>
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                                >
                                    Close Story
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NewsPage;
