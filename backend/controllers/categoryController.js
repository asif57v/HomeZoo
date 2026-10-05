import PropertyCategory from '../models/PropertyCategory.js';
import mongoose from 'mongoose';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// Get all active categories (for public use)
export const getActiveCategories = async (req, res) => {
    try {
        const categories = await PropertyCategory.find({ isActive: true })
            .sort({ order: 1 })
            .select('-__v');

        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Get all categories (with pagination + search)
export const getAllCategories = async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', status = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { displayName: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }

        if (status === 'active') filter.isActive = true;
        else if (status === 'inactive') filter.isActive = false;
        else if (status === 'popular') filter.isPopular = true;
        else if (status === 'featured') filter.isFeatured = true;

        const [categories, total] = await Promise.all([
            PropertyCategory.find(filter).sort({ order: 1 }).skip(skip).limit(parseInt(limit)),
            PropertyCategory.countDocuments(filter)
        ]);

        res.json({
            categories,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Create category
export const createCategory = async (req, res) => {
    try {
        const { name, displayName, description, icon, color, badge, tagline, isPopular, isFeatured, popularOrder, featuredOrder } = req.body;

        // Auto-generate slug
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const categoryData = {
            name,
            slug,
            displayName,
            description,
            icon,
            color,
            badge,
            tagline,
            isPopular: isPopular === true || isPopular === 'true',
            isFeatured: isFeatured === true || isFeatured === 'true',
            popularOrder: parseInt(popularOrder) || 999,
            featuredOrder: parseInt(featuredOrder) || 999,
            isDynamic: true
        };

        // Handle image upload
        if (req.file) {
            const result = await uploadToCloudinary(req.file.path, 'categories');
            categoryData.image = result.url;
        }

        const category = new PropertyCategory(categoryData);
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Admin: Update category
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Handle boolean fields from FormData
        if (updates.isPopular !== undefined) updates.isPopular = updates.isPopular === true || updates.isPopular === 'true';
        if (updates.isFeatured !== undefined) updates.isFeatured = updates.isFeatured === true || updates.isFeatured === 'true';
        if (updates.isActive !== undefined) updates.isActive = updates.isActive === true || updates.isActive === 'true';
        if (updates.popularOrder !== undefined) updates.popularOrder = parseInt(updates.popularOrder) || 999;
        if (updates.featuredOrder !== undefined) updates.featuredOrder = parseInt(updates.featuredOrder) || 999;

        // Handle image upload
        if (req.file) {
            const result = await uploadToCloudinary(req.file.path, 'categories');
            updates.image = result.url;
        }

        const category = await PropertyCategory.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Admin: Delete category
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if any properties use this category
        // Dynamic import to avoid circular dependency issues if any
        const Property = (await import('../models/Property.js')).default;
        const propertiesCount = await Property.countDocuments({ dynamicCategory: id });

        if (propertiesCount > 0) {
            return res.status(400).json({
                message: `Cannot delete. ${propertiesCount} properties are using this category.`
            });
        }

        await PropertyCategory.findByIdAndDelete(id);
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Reorder categories (tab order)
export const reorderCategories = async (req, res) => {
    try {
        const { categories } = req.body; // Array of { id, order }

        const updates = categories.map(({ id, order }) =>
            PropertyCategory.findByIdAndUpdate(id, { order })
        );

        await Promise.all(updates);
        res.json({ message: 'Categories reordered successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Toggle isActive
export const toggleCategoryActive = async (req, res) => {
    try {
        const category = await PropertyCategory.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        category.isActive = !category.isActive;
        await category.save();
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Toggle isPopular
export const toggleCategoryPopular = async (req, res) => {
    try {
        const category = await PropertyCategory.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        category.isPopular = !category.isPopular;
        await category.save();
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Toggle isFeatured
export const toggleCategoryFeatured = async (req, res) => {
    try {
        const category = await PropertyCategory.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        category.isFeatured = !category.isFeatured;
        await category.save();
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Reorder popular categories
export const reorderPopularCategories = async (req, res) => {
    try {
        const { categories } = req.body; // Array of { id, popularOrder }

        const updates = categories.map(({ id, popularOrder }) =>
            PropertyCategory.findByIdAndUpdate(id, { popularOrder })
        );

        await Promise.all(updates);
        res.json({ message: 'Popular categories reordered successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Reorder featured categories
export const reorderFeaturedCategories = async (req, res) => {
    try {
        const { categories } = req.body; // Array of { id, featuredOrder }

        const updates = categories.map(({ id, featuredOrder }) =>
            PropertyCategory.findByIdAndUpdate(id, { featuredOrder })
        );

        await Promise.all(updates);
        res.json({ message: 'Featured categories reordered successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
