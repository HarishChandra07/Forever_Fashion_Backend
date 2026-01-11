import express from 'express';
import { listProducts, addProduct, removeProduct, singleProduct, editProduct, getProductById, updateStock, getLowStockProducts, searchProducts, searchSuggestions } from '../controllers/productController.js';
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';

const productRouter = express.Router();

// Public routes
productRouter.get('/list', listProducts);
productRouter.get('/search', searchProducts);
productRouter.get('/suggestions', searchSuggestions);
productRouter.post('/single', singleProduct);

// Admin routes
productRouter.post('/add', adminAuth, upload.fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }, { name: 'image4', maxCount: 1 }]), addProduct);
productRouter.post('/remove', adminAuth, removeProduct);
productRouter.post('/edit', adminAuth, upload.fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }, { name: 'image4', maxCount: 1 }]), editProduct);
productRouter.get('/get/:id', adminAuth, getProductById);
productRouter.post('/update-stock', adminAuth, updateStock);
productRouter.get('/low-stock', adminAuth, getLowStockProducts);

export default productRouter;
