import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Plus, Trash2, Edit3, Search,
  Filter, CheckCircle, Clock, MapPin, ExternalLink,
  Layers, X, LayoutGrid, List, ArrowUpRight, Sparkles,
  Calendar, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../../services/adminService';
import { compressImage } from '../../../utils/imageCompressor';

const PLACEMENTS = [
  { value: 'HOME_TOP', label: 'Home Top Carousel (Hero)', badge: 'bg-blue-50 text-blue-700' },
  { value: 'HOME_MIDDLE', label: 'Home Middle Section', badge: 'bg-purple-50 text-purple-700' },
  { value: 'CATEGORY_PAGE', label: 'Category / Listing Page', badge: 'bg-emerald-50 text-emerald-700' },
];

const LINK_TYPES = [
  { value: 'NONE', label: 'None (Info Banner only)' },
  { value: 'CATEGORY', label: 'Specific Category' },
  { value: 'OFFER', label: 'Specific Offer / Promo' },
  { value: 'PROPERTY', label: 'Property Details' },
  { value: 'EXTERNAL_URL', label: 'External Website URL' },
];

const POPULAR_CITIES = ['Indore', 'Bhopal', 'Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Goa', 'Ujjain'];

const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [placementFilter, setPlacementFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBannerId, setSelectedBannerId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    sectionHeading: '',
    sectionSubtitle: '',
    placement: 'HOME_TOP',
    linkType: 'NONE',
    linkValue: '',
    cities: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    priority: 0,
    isActive: true
  });

  const [cityInput, setCityInput] = useState('');

  useEffect(() => {
    fetchBanners();
    fetchCategories();
  }, [statusFilter, placementFilter]);

  const fetchCategories = async () => {
    try {
      const data = await adminService.getAllCategories({ limit: 100 });
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (placementFilter) params.placement = placementFilter;

      const res = await adminService.getAllBanners(params);
      setBanners(res.banners || (Array.isArray(res) ? res : []));
    } catch {
      toast.error('Failed to fetch banners');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBanners();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImage(file, 1600, 1600, 0.82);
      setImageFile(compressed);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(compressed);
    }
  };

  const handleEdit = (banner) => {
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      sectionHeading: banner.sectionHeading || '',
      sectionSubtitle: banner.sectionSubtitle || '',
      placement: banner.placement || 'HOME_TOP',
      linkType: banner.linkType || 'NONE',
      linkValue: banner.linkValue || '',
      cities: banner.cities || [],
      startDate: banner.startDate ? new Date(banner.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: banner.endDate ? new Date(banner.endDate).toISOString().split('T')[0] : '',
      priority: banner.priority ?? 0,
      isActive: banner.isActive ?? true
    });
    setSelectedBannerId(banner._id);
    setIsEditing(true);
    setImagePreview(banner.image);
    setImageFile(null);
    setShowModal(true);
  };

  const handleToggleActive = async (id, currentVal) => {
    try {
      await adminService.toggleBannerActive(id);
      setBanners(prev => prev.map(b => b._id === id ? { ...b, isActive: !currentVal } : b));
      toast.success('Banner status updated');
    } catch {
      toast.error('Failed to toggle banner status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promotional banner?')) return;
    try {
      await adminService.deleteBanner(id);
      toast.success('Banner deleted successfully');
      fetchBanners();
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Banner title is required');
      return;
    }

    if (!isEditing && !imageFile) {
      toast.error('Banner image is required');
      return;
    }

    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date cannot be before start date');
      return;
    }

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'cities') {
          data.append(key, JSON.stringify(formData[key]));
        } else {
          data.append(key, formData[key]);
        }
      });

      if (imageFile) {
        data.append('image', imageFile);
      }

      if (isEditing) {
        await adminService.updateBanner(selectedBannerId, data);
        toast.success('Banner updated successfully');
      } else {
        await adminService.createBanner(data);
        toast.success('Banner created successfully');
      }

      setShowModal(false);
      setIsEditing(false);
      setSelectedBannerId(null);
      setImageFile(null);
      setImagePreview('');
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} banner`);
    }
  };

  const getStatusBadge = (banner) => {
    if (!banner.isActive) {
      return { label: 'Inactive', bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
    }
    const now = new Date();
    const start = new Date(banner.startDate);
    const end = banner.endDate ? new Date(banner.endDate) : null;

    if (start > now) {
      return { label: 'Scheduled', bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-600' };
    }
    if (end && end < now) {
      return { label: 'Expired', bg: 'bg-red-50 text-red-600', dot: 'bg-red-600' };
    }
    return { label: 'Live', bg: 'bg-green-50 text-green-700', dot: 'bg-green-600 animate-pulse' };
  };

  const addCity = (city) => {
    const trimmed = city.trim();
    if (!trimmed) return;
    if (!formData.cities.includes(trimmed)) {
      setFormData(prev => ({ ...prev, cities: [...prev.cities, trimmed] }));
    }
    setCityInput('');
  };

  const removeCity = (city) => {
    setFormData(prev => ({ ...prev, cities: prev.cities.filter(c => c !== city) }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ImageIcon className="text-blue-600" />
            Banner Management
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Manage promotional banners for Top Carousel, Middle Section, and Category pages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-400 hover:text-gray-700'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-400 hover:text-gray-700'}`}
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={() => {
              setIsEditing(false);
              setFormData({
                title: '', subtitle: '', sectionHeading: '', sectionSubtitle: '', placement: 'HOME_TOP', linkType: 'NONE',
                linkValue: '', cities: [], startDate: new Date().toISOString().split('T')[0],
                endDate: '', priority: 0, isActive: true
              });
              setImagePreview('');
              setImageFile(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
          >
            <Plus size={16} />
            Create Banner
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Banners', value: banners.length, icon: ImageIcon, color: 'blue' },
          { label: 'Top Carousel', value: banners.filter(b => b.placement === 'HOME_TOP').length, icon: Sparkles, color: 'purple' },
          { label: 'Middle Section', value: banners.filter(b => b.placement === 'HOME_MIDDLE').length, icon: Layers, color: 'amber' },
          { label: 'Live Active', value: banners.filter(b => b.isActive).length, icon: CheckCircle, color: 'green' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center shrink-0`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
              <p className="text-lg font-black text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Placement Selectors */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search banner title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Placement filter */}
          <select
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none"
          >
            <option value="">All Placements</option>
            <option value="HOME_TOP">Home Top (Hero)</option>
            <option value="HOME_MIDDLE">Home Middle</option>
            <option value="CATEGORY_PAGE">Category Page</option>
          </select>

          {/* Status filter pills */}
          <div className="flex items-center gap-1">
            {[
              { label: 'All', value: '' },
              { label: 'Live', value: 'live' },
              { label: 'Scheduled', value: 'scheduled' },
              { label: 'Expired', value: 'expired' }
            ].map((pill) => (
              <button
                key={pill.value}
                onClick={() => setStatusFilter(pill.value)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === pill.value
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banners Grid / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-gray-500 font-bold">Loading banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600">
            <ImageIcon size={32} />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">No promotional banners found</h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto mb-4">Create your first banner to highlight deals, categories, or updates.</p>
          <button onClick={() => setShowModal(true)} className="text-blue-600 font-bold text-xs hover:underline">
            + Create New Banner
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {banners.map((banner) => {
            const status = getStatusBadge(banner);
            const placementObj = PLACEMENTS.find(p => p.value === banner.placement) || PLACEMENTS[0];

            return (
              <motion.div
                layout
                key={banner._id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition-all group flex flex-col"
              >
                <div className="relative h-44 bg-gray-100">
                  <img src={banner.image} alt={banner.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-0.5">
                      Priority: {banner.priority ?? 0}
                    </span>
                    <h3 className="text-base font-black text-white leading-tight">{banner.title}</h3>
                    {banner.subtitle && <p className="text-xs text-gray-200 line-clamp-1 mt-0.5">{banner.subtitle}</p>}
                  </div>

                  {/* Badges */}
                  <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${status.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </div>

                  <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold ${placementObj.badge} shadow-xs`}>
                    {banner.placement}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  {/* Targeting info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-medium">Link Action:</span>
                      <span className="font-bold text-gray-800 flex items-center gap-1">
                        {banner.linkType !== 'NONE' ? (
                          <>
                            <ArrowUpRight size={13} className="text-blue-600" />
                            {banner.linkType}: {banner.linkValue || 'Active'}
                          </>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-medium">Target Cities:</span>
                      <span className="font-bold text-gray-800 text-right">
                        {banner.cities && banner.cities.length > 0 ? (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                            {banner.cities.join(', ')}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">All Cities</span>
                        )}
                      </span>
                    </div>

                    {banner.startDate && (
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>Schedule:</span>
                        <span>
                          {new Date(banner.startDate).toLocaleDateString()}
                          {banner.endDate ? ` → ${new Date(banner.endDate).toLocaleDateString()}` : ' (Ongoing)'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleToggleActive(banner._id, banner.isActive)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-colors ${
                        banner.isActive
                          ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </button>

                    <button
                      onClick={() => handleEdit(banner)}
                      className="flex-1 bg-gray-900 text-white py-1.5 rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit3 size={13} /> Edit
                    </button>

                    <button
                      onClick={() => handleDelete(banner._id)}
                      className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">Banner</th>
                <th className="px-5 py-3.5">Placement</th>
                <th className="px-5 py-3.5">Link Action</th>
                <th className="px-5 py-3.5">Cities</th>
                <th className="px-5 py-3.5 text-center">Priority</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {banners.map(banner => {
                const status = getStatusBadge(banner);
                return (
                  <tr key={banner._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-9 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                          <img src={banner.image} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{banner.title}</p>
                          <p className="text-[10px] text-gray-400 line-clamp-1">{banner.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {banner.placement}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">
                      {banner.linkType !== 'NONE' ? `${banner.linkType}: ${banner.linkValue}` : 'None'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">
                      {banner.cities?.length ? banner.cities.join(', ') : 'All Cities'}
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs font-mono font-bold text-gray-700">
                      {banner.priority ?? 0}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleActive(banner._id, banner.isActive)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${status.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(banner)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit3 size={15} /></button>
                        <button onClick={() => handleDelete(banner._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh] border border-gray-100"
            >
              <div className="flex justify-between items-center p-5 border-b shrink-0 bg-gray-50/50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {isEditing ? 'Edit Promotional Banner' : 'Create New Banner'}
                  </h2>
                  <p className="text-xs text-gray-500">Configure placement, link redirection & city targeting</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto text-xs">
                  {/* Title & Subtitle */}
                  <div>
                    <label className="block font-bold text-gray-600 uppercase tracking-wider mb-1">Banner Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Monsoon Deals: Get 30% Off"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-600 uppercase tracking-wider mb-1">Subtitle / Description</label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Handpicked verified PG & Villa stays for students"
                    />
                  </div>

                  {/* Section heading shown above the banner on the Home page */}
                  <div className="p-3 bg-blue-50/50 rounded-xl space-y-3 border border-blue-100">
                    <div>
                      <label className="block font-bold text-gray-700 uppercase tracking-wider">Section Heading (Optional)</label>
                      <p className="text-[10px] text-gray-400">Shown above the banner on the Home page, like "Pay Hostel Fees". Leave empty to hide.</p>
                    </div>
                    <input
                      type="text"
                      maxLength={80}
                      value={formData.sectionHeading}
                      onChange={(e) => setFormData({ ...formData, sectionHeading: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="e.g. 🎉 Festive Offers"
                    />
                    <input
                      type="text"
                      maxLength={140}
                      value={formData.sectionSubtitle}
                      onChange={(e) => setFormData({ ...formData, sectionSubtitle: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Heading subtitle (optional)"
                    />
                  </div>

                  {/* Placement & Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase tracking-wider mb-1">Placement *</label>
                      <select
                        value={formData.placement}
                        onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white outline-none font-bold text-gray-800"
                      >
                        <option value="HOME_TOP">Home Top (Hero Carousel)</option>
                        <option value="HOME_MIDDLE">Home Middle Section</option>
                        <option value="CATEGORY_PAGE">Category / Listing Page</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-600 uppercase tracking-wider mb-1">Priority Order</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border rounded-xl outline-none"
                        placeholder="0 (Lower shows first)"
                      />
                    </div>
                  </div>

                  {/* Link Redirection */}
                  <div className="p-3 bg-gray-50 rounded-xl space-y-3 border border-gray-100">
                    <label className="block font-bold text-gray-700 uppercase tracking-wider">Tap / Click Action</label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-500 mb-1">Action Type</label>
                        <select
                          value={formData.linkType}
                          onChange={(e) => setFormData({ ...formData, linkType: e.target.value, linkValue: '' })}
                          className="w-full px-2.5 py-1.5 border rounded-lg bg-white outline-none"
                        >
                          {LINK_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-500 mb-1">Target Value</label>
                        {formData.linkType === 'CATEGORY' ? (
                          <select
                            value={formData.linkValue}
                            onChange={(e) => setFormData({ ...formData, linkValue: e.target.value })}
                            className="w-full px-2.5 py-1.5 border rounded-lg bg-white outline-none"
                          >
                            <option value="">Select category...</option>
                            {categories.map(c => (
                              <option key={c.slug || c._id} value={c.slug || c._id}>
                                {c.displayName || c.name} ({c.slug})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            disabled={formData.linkType === 'NONE'}
                            value={formData.linkValue}
                            onChange={(e) => setFormData({ ...formData, linkValue: e.target.value })}
                            className="w-full px-2.5 py-1.5 border rounded-lg bg-white outline-none disabled:bg-gray-100 disabled:text-gray-400"
                            placeholder={
                              formData.linkType === 'OFFER' ? 'e.g. HOOMZO50' :
                              formData.linkType === 'PROPERTY' ? 'Property ID' :
                              formData.linkType === 'EXTERNAL_URL' ? 'https://example.com' : 'No link'
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Schedule Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">End Date (Optional)</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  {/* City Targeting */}
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Target Cities (Leave empty for All Cities)</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {formData.cities.map(c => (
                        <span key={c} className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                          {c}
                          <button type="button" onClick={() => removeCity(c)} className="hover:text-red-500">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCity(cityInput); } }}
                        placeholder="Add city & press Enter"
                        className="flex-1 px-3 py-1.5 border rounded-xl outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addCity(cityInput)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-[10px] text-gray-400 mr-1">Quick add:</span>
                      {POPULAR_CITIES.filter(c => !formData.cities.includes(c)).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => addCity(c)}
                          className="text-[10px] text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 px-1.5 py-0.5 rounded"
                        >
                          + {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Banner Image */}
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Banner Image *</label>
                    <div className="flex items-center gap-4">
                      {imagePreview ? (
                        <div className="relative w-32 h-18 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setImagePreview(''); setImageFile(null); }}
                            className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 text-red-500 hover:text-red-700 shadow-xs"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-32 h-18 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 shrink-0">
                          <ImageIcon size={20} />
                          <span className="text-[9px]">Select image</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Recommended: 1200x500 for Top Carousel, 1000x350 for Middle</p>
                      </div>
                    </div>
                  </div>

                  {/* Active Switch */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div>
                      <label className="font-bold text-gray-800">Active Status</label>
                      <p className="text-[10px] text-gray-400">Controls banner visibility in user app</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex gap-3 p-5 border-t bg-gray-50/70 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20"
                  >
                    {isEditing ? 'Save Banner' : 'Create Banner'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBanners;
