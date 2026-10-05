import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, Plus, Trash2, Edit3, Search,
  Filter, ChevronRight, Calendar, Users,
  CheckCircle, XCircle, Clock, Sparkles,
  TicketPercent, Image as ImageIcon, LayoutGrid, List,
  MapPin, Layers, X, Home
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../../services/adminService';
import { compressImage } from '../../../utils/imageCompressor';

const POPULAR_CITIES = ['Indore', 'Bhopal', 'Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Goa', 'Ujjain'];

const AdminOffers = () => {
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minBookingAmount: '',
    maxDiscount: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    usageLimit: '1000',
    userLimit: '1',
    cities: [],
    applicableCategories: [],
    firstBookingOnly: false,
    showOnHome: true,
    isActive: true
  });

  const [cityInput, setCityInput] = useState('');

  useEffect(() => {
    fetchOffers();
    fetchCategories();
  }, [statusFilter]);

  const fetchCategories = async () => {
    try {
      const data = await adminService.getAllCategories({ limit: 100 });
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await adminService.getAllOffers(params);
      setOffers(res.offers || (Array.isArray(res) ? res : []));
    } catch {
      toast.error('Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOffers();
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

  const handleEdit = (offer) => {
    setFormData({
      title: offer.title || '',
      subtitle: offer.subtitle || '',
      code: offer.code || '',
      discountType: offer.discountType || 'percentage',
      discountValue: offer.discountValue || '',
      minBookingAmount: offer.minBookingAmount || '',
      maxDiscount: offer.maxDiscount || '',
      description: offer.description || '',
      startDate: offer.startDate ? new Date(offer.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: offer.endDate ? new Date(offer.endDate).toISOString().split('T')[0] : '',
      usageLimit: offer.usageLimit || '1000',
      userLimit: offer.userLimit || '1',
      cities: offer.cities || [],
      applicableCategories: offer.applicableCategories ? offer.applicableCategories.map(c => typeof c === 'object' ? c._id : c) : [],
      firstBookingOnly: !!offer.firstBookingOnly,
      showOnHome: offer.showOnHome !== undefined ? !!offer.showOnHome : true,
      isActive: offer.isActive ?? true
    });
    setSelectedOfferId(offer._id);
    setIsEditing(true);
    setImagePreview(offer.image);
    setImageFile(null);
    setShowAddModal(true);
  };

  const handleToggleActive = async (id, currentVal) => {
    try {
      await adminService.toggleOfferActive(id);
      setOffers(prev => prev.map(o => o._id === id ? { ...o, isActive: !currentVal } : o));
      toast.success('Offer status updated');
    } catch {
      toast.error('Failed to toggle offer status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    try {
      await adminService.deleteOffer(id);
      toast.success('Offer deleted successfully');
      fetchOffers();
    } catch {
      toast.error('Failed to delete offer');
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.code.trim()) return 'Coupon code is required';
    if (formData.code.length < 3) return 'Code must be at least 3 characters';
    if (!formData.discountValue || formData.discountValue <= 0) return 'Valid discount value is required';

    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      return 'Percentage discount cannot exceed 100%';
    }

    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      return 'End date cannot be before start date';
    }

    if (formData.usageLimit < 1) return 'Overall usage limit must be at least 1';
    if (formData.userLimit < 1) return 'User limit must be at least 1';

    if (!isEditing && !imageFile) return 'Offer banner image is required';

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'cities' || key === 'applicableCategories') {
          data.append(key, JSON.stringify(formData[key]));
        } else {
          data.append(key, formData[key]);
        }
      });

      if (imageFile) {
        data.append('image', imageFile);
      }

      if (isEditing) {
        await adminService.updateOffer(selectedOfferId, data);
        toast.success('Offer updated successfully');
      } else {
        await adminService.createOffer(data);
        toast.success('Offer created successfully');
      }

      setShowAddModal(false);
      setIsEditing(false);
      setSelectedOfferId(null);
      setImageFile(null);
      setImagePreview('');
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} offer`);
    }
  };

  const getStatusBadge = (offer) => {
    if (!offer.isActive) {
      return { label: 'Paused', bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
    }
    const now = new Date();
    const start = new Date(offer.startDate);
    const end = offer.endDate ? new Date(offer.endDate) : null;

    if (start > now) {
      return { label: 'Scheduled', bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-600' };
    }
    if (end && end < now) {
      return { label: 'Expired', bg: 'bg-red-50 text-red-600', dot: 'bg-red-600' };
    }
    return { label: 'Live', bg: 'bg-green-50 text-green-700', dot: 'bg-green-600 animate-pulse' };
  };

  const toggleCategorySelection = (catId) => {
    setFormData(prev => {
      const exists = prev.applicableCategories.includes(catId);
      return {
        ...prev,
        applicableCategories: exists
          ? prev.applicableCategories.filter(id => id !== catId)
          : [...prev.applicableCategories, catId]
      };
    });
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
            <Tag className="text-blue-600" />
            Offer & Coupon Management
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Create discount codes, target cities/categories, and control home screen visibility
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
                title: '', subtitle: '', code: '', discountType: 'percentage',
                discountValue: '', minBookingAmount: '', maxDiscount: '',
                description: '', startDate: new Date().toISOString().split('T')[0],
                endDate: '', usageLimit: '1000', userLimit: '1',
                cities: [], applicableCategories: [], firstBookingOnly: false,
                showOnHome: true, isActive: true
              });
              setImagePreview('');
              setImageFile(null);
              setShowAddModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
          >
            <Plus size={16} />
            Create Offer
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Offers', value: offers.length, icon: Tag, color: 'blue' },
          { label: 'Active / Live', value: offers.filter(o => o.isActive).length, icon: CheckCircle, color: 'green' },
          { label: 'Home Carousel', value: offers.filter(o => o.showOnHome && o.isActive).length, icon: Home, color: 'purple' },
          { label: 'Redemptions', value: offers.reduce((acc, o) => acc + (o.usageCount || 0), 0), icon: Sparkles, color: 'amber' },
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search coupon code, title..."
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

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { label: 'All', value: '' },
            { label: 'Live', value: 'live' },
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Expired', value: 'expired' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' }
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
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

      {/* Offers Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-gray-500 font-bold">Loading offers...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600">
            <TicketPercent size={32} />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">No offers found</h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto mb-4">Create your first coupon code to attract more bookings.</p>
          <button onClick={() => setShowAddModal(true)} className="text-blue-600 font-bold text-xs hover:underline">
            + Create New Offer
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {offers.map((offer) => {
            const status = getStatusBadge(offer);
            return (
              <motion.div
                layout
                key={offer._id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition-all group flex flex-col"
              >
                {/* Banner Image Preview */}
                <div className="relative h-40 bg-gray-100">
                  <img src={offer.image} alt={offer.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="bg-blue-600 text-[10px] font-black px-2 py-0.5 rounded uppercase text-white mb-1 inline-block">
                          {offer.discountValue}{offer.discountType === 'percentage' ? '%' : ' FLAT'} OFF
                        </span>
                        <h3 className="text-base font-black text-white leading-tight">{offer.title}</h3>
                      </div>
                      <div className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/30 text-white font-mono font-black text-xs">
                        {offer.code}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${status.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </div>

                  {offer.showOnHome && (
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                      <Home size={11} /> Home Carousel
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 line-clamp-1">{offer.subtitle || offer.description}</p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {offer.firstBookingOnly && (
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          1st Booking Only
                        </span>
                      )}
                      {offer.cities && offer.cities.length > 0 ? (
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                          <MapPin size={10} /> {offer.cities.join(', ')}
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-[10px] font-medium px-2 py-0.5 rounded-md">
                          All Cities
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Redemptions</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-gray-800">{offer.usageCount || 0}</span>
                          <span className="text-[9px] text-gray-400">/ {offer.usageLimit}</span>
                        </div>
                        <div className="w-full h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, ((offer.usageCount || 0) / (offer.usageLimit || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Min Booking</p>
                        <span className="text-xs font-black text-gray-800">₹{offer.minBookingAmount || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => handleToggleActive(offer._id, offer.isActive)}
                        className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-colors ${
                          offer.isActive
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {offer.isActive ? 'Active' : 'Paused'}
                      </button>

                      <button
                        onClick={() => handleEdit(offer)}
                        className="flex-1 bg-gray-900 text-white py-1.5 rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit3 size={13} /> Edit
                      </button>

                      <button
                        onClick={() => handleDelete(offer._id)}
                        className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
                <th className="px-5 py-3.5">Offer</th>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Discount</th>
                <th className="px-5 py-3.5">Targeting</th>
                <th className="px-5 py-3.5">Usage</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.map(offer => {
                const status = getStatusBadge(offer);
                return (
                  <tr key={offer._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                          <img src={offer.image} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{offer.title}</p>
                          <p className="text-[10px] text-gray-400 line-clamp-1">{offer.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="bg-gray-900 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        {offer.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-bold text-gray-900">
                        {offer.discountValue}{offer.discountType === 'percentage' ? '%' : ' FLAT'}
                      </p>
                      {offer.maxDiscount && <p className="text-[10px] text-gray-400">Up to ₹{offer.maxDiscount}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-[10px] text-gray-500">
                        {offer.cities?.length ? offer.cities.join(', ') : 'All Cities'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold text-gray-800">{offer.usageCount || 0}</span>
                      <span className="text-[10px] text-gray-400"> / {offer.usageLimit}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleActive(offer._id, offer.isActive)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${status.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(offer)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit3 size={15} /></button>
                        <button onClick={() => handleDelete(offer._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
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
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh] border border-gray-100"
            >
              <div className="flex justify-between items-center p-5 border-b shrink-0 bg-gray-50/50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {isEditing ? 'Edit Promo Offer' : 'Create New Offer'}
                  </h2>
                  <p className="text-xs text-gray-500">Configure discount rules, city targeting & home carousel display</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto text-xs">
                  {/* Basic Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-600 uppercase tracking-wider mb-1">Offer Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Early Bird Special"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 uppercase tracking-wider mb-1">Coupon Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                        className="w-full px-3 py-2 border rounded-xl outline-none font-mono font-bold focus:ring-2 focus:ring-blue-500 uppercase"
                        placeholder="e.g. HOOMZO50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-600 uppercase tracking-wider mb-1">Subtitle / Punchline</label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Flat ₹500 off on your next hostel booking"
                    />
                  </div>

                  {/* Discount Config */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Discount Type</label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                        className="w-full px-2.5 py-2 border rounded-lg bg-white outline-none"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat">Flat Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">
                        {formData.discountType === 'percentage' ? 'Discount (%) *' : 'Discount (₹) *'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        className="w-full px-2.5 py-2 border rounded-lg bg-white outline-none"
                        placeholder={formData.discountType === 'percentage' ? '20' : '500'}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Max Cap (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                        className="w-full px-2.5 py-2 border rounded-lg bg-white outline-none"
                        placeholder="Optional cap"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Min Booking Amt (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minBookingAmount}
                        onChange={(e) => setFormData({ ...formData, minBookingAmount: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Total Usage Limit</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.usageLimit}
                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl outline-none"
                        placeholder="1000"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Per-User Limit</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.userLimit}
                        onChange={(e) => setFormData({ ...formData, userLimit: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl outline-none"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  {/* Dates */}
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
                        placeholder="Add city (e.g. Indore) & press Enter"
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

                  {/* Applicable Categories */}
                  {categories.length > 0 && (
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Applicable Categories (Leave empty for All)</label>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                        {categories.map(cat => {
                          const isSelected = formData.applicableCategories.includes(cat._id);
                          return (
                            <button
                              key={cat._id}
                              type="button"
                              onClick={() => toggleCategorySelection(cat._id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {cat.displayName || cat.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Image Upload */}
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Banner Image *</label>
                    <div className="flex items-center gap-4">
                      {imagePreview ? (
                        <div className="relative w-28 h-16 rounded-xl overflow-hidden border border-gray-200 shrink-0">
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
                        <div className="w-28 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 shrink-0">
                          <ImageIcon size={18} />
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
                        <p className="text-[10px] text-gray-400 mt-1">Recommended: 800x400 promo banner</p>
                      </div>
                    </div>
                  </div>

                  {/* Checkbox Toggles */}
                  <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showOnHome}
                        onChange={(e) => setFormData({ ...formData, showOnHome: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="font-bold text-gray-800">Show in User App Home Offers Carousel</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.firstBookingOnly}
                        onChange={(e) => setFormData({ ...formData, firstBookingOnly: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                      <span className="font-bold text-gray-800">First-Time Booking Only</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="font-bold text-gray-800">Active (Users can view and apply this coupon)</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 p-5 border-t bg-gray-50/70 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20"
                  >
                    {isEditing ? 'Save Offer' : 'Create Offer'}
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

export default AdminOffers;
