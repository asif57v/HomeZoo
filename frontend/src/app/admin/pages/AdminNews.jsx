import React, { useState, useEffect } from 'react';
import {
    Newspaper,
    Plus,
    Search,
    Edit3,
    Trash2,
    Eye,
    TrendingUp,
    CheckCircle,
    XCircle,
    Calendar,
    Clock,
    Upload,
    X,
    ExternalLink,
    Filter,
    FileText,
    Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../../services/adminService';

const CATEGORIES = [
    'Market Insights',
    'Legal Guide',
    'Investment & Corridors',
    'Lifestyle & Design',
    'Infrastructure & Masterplans'
];

const AdminNews = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [currentArticle, setCurrentArticle] = useState(null);
    const [previewArticle, setPreviewArticle] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form fields
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        content: '',
        category: 'Market Insights',
        readTime: '5 min read',
        image: '',
        isPublished: true,
        priority: 0
    });
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    useEffect(() => {
        fetchArticles();
    }, [search, selectedCategory, statusFilter, page]);

    const fetchArticles = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 12,
                search: search.trim() || undefined,
                category: selectedCategory !== 'All' ? selectedCategory : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined
            };
            const data = await adminService.getAllNews(params);
            if (data.success) {
                setArticles(data.articles || []);
                setPagination(data.pagination || { total: 0, pages: 1 });
            }
        } catch (error) {
            console.error('Failed to fetch articles:', error);
            toast.error('Failed to load news articles');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setCurrentArticle(null);
        setFormData({
            title: '',
            description: '',
            content: '',
            category: 'Market Insights',
            readTime: '5 min read',
            image: '',
            isPublished: true,
            priority: 0
        });
        setSelectedImageFile(null);
        setImagePreview('');
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (article) => {
        setCurrentArticle(article);
        setFormData({
            title: article.title || '',
            description: article.description || '',
            content: article.content || '',
            category: article.category || 'Market Insights',
            readTime: article.readTime || '5 min read',
            image: article.image || '',
            isPublished: article.isPublished !== undefined ? article.isPublished : true,
            priority: article.priority || 0
        });
        setSelectedImageFile(null);
        setImagePreview(article.image || '');
        setIsModalOpen(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim()) {
            toast.error('Please fill in title and description');
            return;
        }

        if (!selectedImageFile && !formData.image) {
            toast.error('Please upload a cover image or provide an image URL');
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading(currentArticle ? 'Updating article...' : 'Creating article...');

        try {
            const dataToSend = new FormData();
            dataToSend.append('title', formData.title.trim());
            dataToSend.append('description', formData.description.trim());
            dataToSend.append('content', formData.content.trim());
            dataToSend.append('category', formData.category);
            dataToSend.append('readTime', formData.readTime);
            dataToSend.append('isPublished', formData.isPublished);
            dataToSend.append('priority', formData.priority);

            if (selectedImageFile) {
                dataToSend.append('image', selectedImageFile);
            } else if (formData.image) {
                dataToSend.append('image', formData.image);
            }

            if (currentArticle) {
                await adminService.updateNews(currentArticle._id, dataToSend);
                toast.success('Article updated successfully!', { id: toastId });
            } else {
                await adminService.createNews(dataToSend);
                toast.success('Article published successfully!', { id: toastId });
            }

            setIsModalOpen(false);
            fetchArticles();
        } catch (error) {
            console.error('Submit error:', error);
            toast.error(error.response?.data?.message || 'Failed to save article', { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTogglePublish = async (article) => {
        try {
            const res = await adminService.toggleNewsPublish(article._id);
            if (res.success) {
                toast.success(res.message);
                setArticles(articles.map(a => a._id === article._id ? { ...a, isPublished: !a.isPublished } : a));
            }
        } catch (error) {
            toast.error('Failed to change publish status');
        }
    };

    const handleDelete = async (articleId) => {
        if (!window.confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
            return;
        }

        try {
            await adminService.deleteNews(articleId);
            toast.success('Article deleted successfully');
            fetchArticles();
        } catch (error) {
            toast.error('Failed to delete article');
        }
    };

    // Calculate quick metrics
    const totalCount = pagination.total;
    const publishedCount = articles.filter(a => a.isPublished).length;
    const totalViews = articles.reduce((acc, curr) => acc + (curr.views || 0), 0);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold mb-1 shadow-sm">
                        <Newspaper size={13} className="text-amber-400" /> Content & Market Intelligence
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        News & Property Updates
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Publish and manage real estate market insights, legal guides, and corridor updates for the home screen.
                    </p>
                </div>

                <button
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
                >
                    <Plus size={18} />
                    <span>Create New Article</span>
                </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Articles</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live on App</span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{publishedCount}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Readers</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{totalViews}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categories</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{CATEGORIES.length}</p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search articles by title or keyword..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                </div>

                {/* Category Pills / Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    <span className="text-xs font-bold text-slate-400 shrink-0">Category:</span>
                    {['All', ...CATEGORIES.slice(0, 3)].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                selectedCategory === cat
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Status Toggle */}
                <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50 shrink-0">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            statusFilter === 'all' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setStatusFilter('published')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            statusFilter === 'published' ? 'bg-white shadow-2xs text-emerald-700' : 'text-slate-500'
                        }`}
                    >
                        Published
                    </button>
                    <button
                        onClick={() => setStatusFilter('draft')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            statusFilter === 'draft' ? 'bg-white shadow-2xs text-amber-700' : 'text-slate-500'
                        }`}
                    >
                        Drafts
                    </button>
                </div>
            </div>

            {/* Articles Table / Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                        <p className="text-xs font-bold text-slate-400">Loading articles...</p>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                        <Newspaper size={40} className="mx-auto text-slate-300" />
                        <h3 className="text-base font-black text-slate-800">No articles found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {search ? 'Try clearing your search query or filters.' : 'Create your first market update article to feature it dynamically on the home screen.'}
                        </p>
                        <button
                            onClick={handleOpenCreateModal}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
                        >
                            <Plus size={15} /> Add Article
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-extrabold uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-4">Article</th>
                                    <th className="px-5 py-4">Category</th>
                                    <th className="px-5 py-4">Read Time</th>
                                    <th className="px-5 py-4">Views</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {articles.map((article) => (
                                    <tr key={article._id} className="hover:bg-slate-50/70 transition-colors">
                                        {/* Thumbnail & Title */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3 max-w-md">
                                                <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                                    <img
                                                        src={article.image}
                                                        alt={article.title}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80';
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-900 leading-snug line-clamp-1">
                                                        {article.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                                        {article.description}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 font-medium mt-0.5 inline-block">
                                                        Published {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-IN', {
                                                            day: 'numeric', month: 'short', year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Category */}
                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                                {article.category}
                                            </span>
                                        </td>

                                        {/* Read Time */}
                                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock size={12} className="text-slate-400" />
                                                {article.readTime || '5 min read'}
                                            </span>
                                        </td>

                                        {/* Views */}
                                        <td className="px-5 py-4 text-xs font-bold text-slate-700">
                                            {article.views || 0}
                                        </td>

                                        {/* Status Toggle */}
                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() => handleTogglePublish(article)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                                                    article.isPublished
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                                }`}
                                            >
                                                {article.isPublished ? (
                                                    <>
                                                        <CheckCircle size={12} /> Published
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle size={12} /> Draft
                                                    </>
                                                )}
                                            </button>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        setPreviewArticle(article);
                                                        setIsPreviewOpen(true);
                                                    }}
                                                    title="Preview Article"
                                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEditModal(article)}
                                                    title="Edit Article"
                                                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(article._id)}
                                                    title="Delete Article"
                                                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between py-3 text-xs font-bold text-slate-500">
                    <span>Showing page {page} of {pagination.pages}</span>
                    <div className="flex gap-1.5">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50 cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= pagination.pages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50 cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* CREATE / EDIT ARTICLE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    {currentArticle ? 'Edit Article' : 'Publish New Article'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Articles are featured directly under the "News & Property Updates" section on the home screen.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                                    Article Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Why Residential Plots Are Overperforming Urban Apartments in 2026"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            {/* Category & Read Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                                        Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                                        Read Time Estimate
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 5 min read"
                                        value={formData.readTime}
                                        onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                            </div>

                            {/* Short Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                                    Short Summary / Hook <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="A concise 2-sentence teaser displayed on the card thumbnail..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            {/* Cover Image Upload & Preview */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                                    Cover Image <span className="text-red-500">*</span>
                                </label>
                                
                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                    {/* Image Preview Box */}
                                    <div className="w-full sm:w-44 h-28 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center shrink-0 relative group">
                                        {imagePreview ? (
                                            <img
                                                src={imagePreview}
                                                alt="Cover preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-400">
                                                <Upload size={22} />
                                                <span className="text-[10px] font-bold mt-1">Upload Photo</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>

                                    {/* Image URL fallback */}
                                    <div className="flex-1 w-full space-y-2">
                                        <p className="text-xs text-slate-500">
                                            Upload a high-resolution landscape photo or paste an image URL below:
                                        </p>
                                        <input
                                            type="url"
                                            placeholder="https://images.unsplash.com/..."
                                            value={formData.image}
                                            onChange={(e) => {
                                                setFormData({ ...formData, image: e.target.value });
                                                if (!selectedImageFile) setImagePreview(e.target.value);
                                            }}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Full Article Content */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                                    Full Article Body Content
                                </label>
                                <textarea
                                    rows={6}
                                    placeholder="Write or paste the full article paragraphs here..."
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans"
                                />
                            </div>

                            {/* Publication Status Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Publish Immediately</h4>
                                    <p className="text-xs text-slate-500">Visible to all users on the home screen right away</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isPublished}
                                        onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                                </label>
                            </div>

                            {/* Submit buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>{currentArticle ? 'Update Article' : 'Publish Article'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ARTICLE PREVIEW MODAL */}
            {isPreviewOpen && previewArticle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header Image */}
                        <div className="relative aspect-[16/9] w-full bg-slate-900">
                            <img
                                src={previewArticle.image}
                                alt={previewArticle.title}
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                            <div className="absolute bottom-4 left-4">
                                <span className="px-3 py-1 rounded-full text-xs font-black bg-white text-slate-900 shadow-md">
                                    {previewArticle.category}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 md:p-8 space-y-4">
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                <span className="flex items-center gap-1">
                                    <Calendar size={13} />
                                    {new Date(previewArticle.publishedAt || previewArticle.createdAt).toLocaleDateString('en-IN', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    })}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Clock size={13} />
                                    {previewArticle.readTime}
                                </span>
                            </div>

                            <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                {previewArticle.title}
                            </h2>

                            <p className="text-sm font-semibold text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                {previewArticle.description}
                            </p>

                            <div className="text-sm text-slate-700 leading-relaxed space-y-3 pt-2">
                                <p>{previewArticle.content || previewArticle.description}</p>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setIsPreviewOpen(false)}
                                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm cursor-pointer"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNews;
