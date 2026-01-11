import categoryModel from "../models/categoryModel.js";
import subCategoryModel from "../models/subCategoryModel.js";
import { v2 as cloudinary } from "cloudinary";

// Helper to generate slug
const generateSlug = (name) => {
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

// ========== CATEGORY CONTROLLERS ==========

// Get all categories (public)
const getCategories = async (req, res) => {
    try {
        const { active } = req.query;
        let filter = {};
        if (active === 'true') filter.isActive = true;

        const categories = await categoryModel.find(filter).sort({ order: 1, name: 1 });
        res.json({ success: true, categories });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Add category (admin)
const addCategory = async (req, res) => {
    try {
        const { name, description, isActive, order } = req.body;

        if (!name) {
            return res.json({ success: false, message: "Category name is required" });
        }

        const slug = generateSlug(name);

        // Check if exists
        const exists = await categoryModel.findOne({ $or: [{ name }, { slug }] });
        if (exists) {
            return res.json({ success: false, message: "Category already exists" });
        }

        let imageUrl = '';
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' });
            imageUrl = result.secure_url;
        }

        const category = new categoryModel({
            name,
            slug,
            description: description || '',
            image: imageUrl,
            isActive: isActive !== 'false',
            order: parseInt(order) || 0
        });

        await category.save();
        res.json({ success: true, message: "Category added", category });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Update category (admin)
const updateCategory = async (req, res) => {
    try {
        const { categoryId, name, description, isActive, order } = req.body;

        const updateData = {
            name,
            slug: generateSlug(name),
            description,
            isActive: isActive === true || isActive === 'true',
            order: parseInt(order) || 0
        };

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' });
            updateData.image = result.secure_url;
        }

        const category = await categoryModel.findByIdAndUpdate(categoryId, updateData, { new: true });

        if (!category) {
            return res.json({ success: false, message: "Category not found" });
        }

        res.json({ success: true, message: "Category updated", category });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Delete category (admin)
const deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.body;

        // Check if subcategories exist
        const subCount = await subCategoryModel.countDocuments({ categoryId });
        if (subCount > 0) {
            return res.json({ success: false, message: `Cannot delete: ${subCount} subcategories exist` });
        }

        await categoryModel.findByIdAndDelete(categoryId);
        res.json({ success: true, message: "Category deleted" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// ========== SUBCATEGORY CONTROLLERS ==========

// Get subcategories (public)
const getSubCategories = async (req, res) => {
    try {
        const { categoryId, active } = req.query;
        let filter = {};

        if (categoryId) filter.categoryId = categoryId;
        if (active === 'true') filter.isActive = true;

        const subCategories = await subCategoryModel
            .find(filter)
            .populate('categoryId', 'name slug')
            .sort({ order: 1, name: 1 });

        res.json({ success: true, subCategories });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get all subcategories grouped by category (public)
const getSubCategoriesGrouped = async (req, res) => {
    try {
        const categories = await categoryModel.find({ isActive: true }).sort({ order: 1, name: 1 });
        const subCategories = await subCategoryModel.find({ isActive: true }).sort({ order: 1, name: 1 });

        const grouped = categories.map(cat => ({
            _id: cat._id,
            name: cat.name,
            slug: cat.slug,
            subCategories: subCategories.filter(sub => sub.categoryId.toString() === cat._id.toString())
        }));

        res.json({ success: true, categories: grouped });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Add subcategory (admin)
const addSubCategory = async (req, res) => {
    try {
        const { name, categoryId, description, isActive, order } = req.body;

        if (!name || !categoryId) {
            return res.json({ success: false, message: "Name and category are required" });
        }

        // Verify category exists
        const category = await categoryModel.findById(categoryId);
        if (!category) {
            return res.json({ success: false, message: "Category not found" });
        }

        const slug = generateSlug(name);

        let imageUrl = '';
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' });
            imageUrl = result.secure_url;
        }

        const subCategory = new subCategoryModel({
            name,
            slug,
            categoryId,
            description: description || '',
            image: imageUrl,
            isActive: isActive !== 'false',
            order: parseInt(order) || 0
        });

        await subCategory.save();
        res.json({ success: true, message: "Subcategory added", subCategory });
    } catch (error) {
        console.log(error);
        if (error.code === 11000) {
            return res.json({ success: false, message: "Subcategory already exists in this category" });
        }
        res.json({ success: false, message: error.message });
    }
};

// Update subcategory (admin)
const updateSubCategory = async (req, res) => {
    try {
        const { subCategoryId, name, categoryId, description, isActive, order } = req.body;

        const updateData = {
            name,
            slug: generateSlug(name),
            categoryId,
            description,
            isActive: isActive === true || isActive === 'true',
            order: parseInt(order) || 0
        };

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' });
            updateData.image = result.secure_url;
        }

        const subCategory = await subCategoryModel.findByIdAndUpdate(subCategoryId, updateData, { new: true });

        if (!subCategory) {
            return res.json({ success: false, message: "Subcategory not found" });
        }

        res.json({ success: true, message: "Subcategory updated", subCategory });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Delete subcategory (admin)
const deleteSubCategory = async (req, res) => {
    try {
        const { subCategoryId } = req.body;

        await subCategoryModel.findByIdAndDelete(subCategoryId);
        res.json({ success: true, message: "Subcategory deleted" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getSubCategories,
    getSubCategoriesGrouped,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory
};
