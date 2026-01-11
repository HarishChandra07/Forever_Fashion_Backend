import express from 'express';
import {
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getSubCategories,
    getSubCategoriesGrouped,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory
} from '../controllers/categoryController.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';

const categoryRouter = express.Router();

// Public routes
categoryRouter.get('/list', getCategories);
categoryRouter.get('/subcategories', getSubCategories);
categoryRouter.get('/grouped', getSubCategoriesGrouped);

// Admin routes - Categories
categoryRouter.post('/add', adminAuth, upload.single('image'), addCategory);
categoryRouter.post('/update', adminAuth, upload.single('image'), updateCategory);
categoryRouter.post('/delete', adminAuth, deleteCategory);

// Admin routes - Subcategories
categoryRouter.post('/subcategory/add', adminAuth, upload.single('image'), addSubCategory);
categoryRouter.post('/subcategory/update', adminAuth, upload.single('image'), updateSubCategory);
categoryRouter.post('/subcategory/delete', adminAuth, deleteSubCategory);

export default categoryRouter;
