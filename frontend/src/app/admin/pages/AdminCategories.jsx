import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, GripVertical, X, Save, AlertCircle,
  Search, Filter, Star, Sparkles, Eye, EyeOff, Image as ImageIcon,
  Check, ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import adminService from '../../../services/adminService';
import { compressImage } from '../../../utils/imageCompressor';
import * as LucideIcons from 'lucide-react';

// Icon Picker Component
const IconPicker = ({ value, onChange }) => {
  const [search, setSearch] = useState('');

  const commonIcons = [
    'Building2', 'Home', 'Palmtree', 'Hotel', 'Building', 'BedDouble',
    'Tent', 'Castle', 'Warehouse', 'Mountain', 'Trees', 'Waves',
    'MapPin', 'Compass', 'Key', 'Shield', 'Flame', 'Zap', 'Coffee',
    'Car', 'Tv', 'Wifi', 'Briefcase', 'GraduationCap'
  ];

  const filteredIcons = commonIcons.filter(icon =>
    icon.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Icon</label>
        <input
          type="text"
          placeholder="Search icon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs px-2 py-1 border rounded-md w-32 outline-none focus:border-amber-500"
        />
      </div>
      <div className="flex flex-wrap gap-2 p-2.5 bg-gray-50 border rounded-xl max-h-36 overflow-y-auto">
        {filteredIcons.map((iconName) => {
          const Icon = LucideIcons[iconName];
          if (!Icon) return null;
          return (
            <button
              key={iconName}
              type="button"
              onClick={() => onChange(iconName)}
              title={iconName}
              className={`p-2 rounded-lg transition-all ${
                value === iconName
                  ? 'bg-amber-600 text-white shadow-md scale-105'
                  : 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-100'
              }`}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 flex items-center gap-1.5">
        <span>Selected:</span>
        <span className="font-bold text-amber-700">{value}</span>
      </div>
    </div>
  );
};

// Category Modal for Add/Edit
const CategoryModal = ({ category, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    tagline: '',
    description: '',
    icon: 'Building2',
    color: '#0284c7',
    badge: '',
    isPopular: false,
    popularOrder: 0,
    isFeatured: false,
    featuredOrder: 0,
    isActive: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        displayName: category.displayName || '',
        tagline: category.tagline || '',
        description: category.description || '',
        icon: category.icon || 'Building2',
        color: category.color || '#0284c7',
        badge: category.badge || '',
        isPopular: !!category.isPopular,
        popularOrder: category.popularOrder ?? 0,
        isFeatured: !!category.isFeatured,
        featuredOrder: category.featuredOrder ?? 0,
        isActive: category.isActive !== undefined ? category.isActive : true
      });
      setImagePreview(category.image || category.bgImage || '');
    }
  }, [category]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setLoading(true);
    try {
      let payload;
      if (imageFile) {
        payload = new FormData();
        Object.keys(formData).forEach((key) => {
          payload.append(key, formData[key]);
        });
        payload.append('image', imageFile);
      } else {
        payload = { ...formData };
      }

      if (category) {
        await adminService.updateCategory(category._id, payload);
        toast.success('Category updated successfully');
      } else {
        await adminService.createCategory(payload);
        toast.success('Category created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
        <div className="flex justify-between items-center p-5 border-b shrink-0 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {category ? 'Edit Category' : 'Create New Category'}
            </h2>
            <p className="text-xs text-gray-500">Configure category details, popular chip & featured card status</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Internal Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. PG / Co-Living"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. PG & Co-Living"
                />
              </div>
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                Tagline (shown on Featured Cards)
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g. Find student & working professional stays"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                rows="2"
                placeholder="Short description of this category..."
              />
            </div>

            {/* Icon Picker */}
            <IconPicker
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
            />

            {/* Color & Badge */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Color Theme</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-9 w-9 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Badge Text</label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Popular, New"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                Category Image (shown on Popular tiles & Featured cards)
              </label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(''); setImageFile(null); }}
                      className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 text-red-500 hover:text-red-700 shadow"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 shrink-0">
                    <ImageIcon size={20} />
                    <span className="text-[10px]">No image</span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Recommended: 800x600 landscape, subject centered. Popular = small image tile, Featured = card with tagline.</p>
                </div>
              </div>
            </div>

            {/* Popular & Featured Controls */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Home Screen Placements</div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Popular Settings */}
                <div className="p-3 bg-white rounded-xl border border-gray-200/70">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                      <Star size={13} className="text-amber-500 fill-amber-500" /> Popular Chip
                    </span>
                  </label>
                  {formData.isPopular && (
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Display Order</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.popularOrder}
                        onChange={(e) => setFormData({ ...formData, popularOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Featured Settings */}
                <div className="p-3 bg-white rounded-xl border border-gray-200/70">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                      <Sparkles size={13} className="text-purple-500" /> Featured Card
                    </span>
                  </label>
                  {formData.isFeatured && (
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Display Order</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.featuredOrder}
                        onChange={(e) => setFormData({ ...formData, featuredOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border rounded-lg focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Is Active Switch */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <label className="text-sm font-bold text-gray-800">Active Status</label>
                <p className="text-xs text-gray-400">Controls visibility in the user app</p>
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
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={15} />
                  {category ? 'Save Changes' : 'Create Category'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, [statusFilter]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const data = await adminService.getAllCategories(params);
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch (error) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCategories();
  };

  const handleToggleActive = async (id, currentVal) => {
    try {
      await adminService.toggleCategoryActive(id);
      setCategories(prev =>
        prev.map(c => c._id === id ? { ...c, isActive: !currentVal } : c)
      );
      toast.success('Active status updated');
    } catch (error) {
      toast.error('Failed to toggle active status');
    }
  };

  const handleTogglePopular = async (id, currentVal) => {
    try {
      await adminService.toggleCategoryPopular(id);
      setCategories(prev =>
        prev.map(c => c._id === id ? { ...c, isPopular: !currentVal } : c)
      );
      toast.success('Popular status updated');
    } catch (error) {
      toast.error('Failed to toggle popular status');
    }
  };

  const handleToggleFeatured = async (id, currentVal) => {
    try {
      await adminService.toggleCategoryFeatured(id);
      setCategories(prev =>
        prev.map(c => c._id === id ? { ...c, isFeatured: !currentVal } : c)
      );
      toast.success('Featured status updated');
    } catch (error) {
      toast.error('Failed to toggle featured status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category? This cannot be undone.')) return;
    try {
      await adminService.deleteCategory(id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            Property Categories
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Manage categories, popular chips & featured cards on the user home screen
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCategory(null);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all self-start md:self-auto"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search category name, slug..."
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
            { label: 'Popular', value: 'popular' },
            { label: 'Featured', value: 'featured' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' }
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === pill.value
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-gray-400 font-medium">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-base font-bold text-gray-700">No categories found</p>
            <p className="text-xs text-gray-400 mt-1">Try changing filters or create your first category</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Image & Tagline</th>
                  <th className="px-5 py-3.5 text-center">Popular Chip</th>
                  <th className="px-5 py-3.5 text-center">Featured Card</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => {
                  const Icon = LucideIcons[cat.icon] || LucideIcons.Building2;
                  const catImg = cat.image || cat.bgImage;

                  return (
                    <tr key={cat._id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Name & Icon */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                            style={{ backgroundColor: cat.color || '#0284c7' }}
                          >
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                              {cat.displayName || cat.name}
                              {cat.badge && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                                  {cat.badge}
                                </span>
                              )}
                            </div>
                            <code className="text-[11px] font-mono text-gray-400">/{cat.slug}</code>
                          </div>
                        </div>
                      </td>

                      {/* Image & Tagline */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex items-center gap-2.5">
                          {catImg ? (
                            <img
                              src={catImg}
                              alt={cat.name}
                              className="w-14 h-9 object-cover rounded-lg border border-gray-200 shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="w-14 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 shrink-0">
                              None
                            </div>
                          )}
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {cat.tagline || <span className="text-gray-300 italic">No tagline</span>}
                          </p>
                        </div>
                      </td>

                      {/* Popular Toggle */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <button
                            onClick={() => handleTogglePopular(cat._id, cat.isPopular)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-all ${
                              cat.isPopular
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            <Star size={11} className={cat.isPopular ? 'fill-amber-600 text-amber-600' : ''} />
                            {cat.isPopular ? 'Popular' : 'Off'}
                          </button>
                          {cat.isPopular && (
                            <span className="text-[10px] font-mono text-gray-400">Order: {cat.popularOrder ?? 0}</span>
                          )}
                        </div>
                      </td>

                      {/* Featured Toggle */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <button
                            onClick={() => handleToggleFeatured(cat._id, cat.isFeatured)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-all ${
                              cat.isFeatured
                                ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            <Sparkles size={11} className={cat.isFeatured ? 'text-purple-600' : ''} />
                            {cat.isFeatured ? 'Featured' : 'Off'}
                          </button>
                          {cat.isFeatured && (
                            <span className="text-[10px] font-mono text-gray-400">Order: {cat.featuredOrder ?? 0}</span>
                          )}
                        </div>
                      </td>

                      {/* Active Status */}
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(cat._id, cat.isActive)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-all ${
                            cat.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cat.isActive ? 'bg-green-600' : 'bg-red-600'}`} />
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setShowModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchCategories();
          }}
        />
      )}
    </div>
  );
};

export default AdminCategories;
