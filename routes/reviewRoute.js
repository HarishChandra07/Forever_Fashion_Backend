import express from 'express';
import {
    addReview,
    getProductReviews,
    updateReview,
    deleteReview,
    markHelpful,
    getUserReviews,
    getAllReviews,
    moderateReview,
    adminDeleteReview,
    canReview
} from '../controllers/reviewController.js';
import authUser from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const reviewRouter = express.Router();

// Public routes
reviewRouter.get('/product/:productId', getProductReviews);

// User routes (authenticated)
reviewRouter.post('/can-review', authUser, canReview);
reviewRouter.post('/add', authUser, addReview);
reviewRouter.post('/update', authUser, updateReview);
reviewRouter.post('/delete', authUser, deleteReview);
reviewRouter.post('/helpful', authUser, markHelpful);
reviewRouter.post('/user', authUser, getUserReviews);

// Admin routes
reviewRouter.get('/admin/list', adminAuth, getAllReviews);
reviewRouter.post('/admin/moderate', adminAuth, moderateReview);
reviewRouter.post('/admin/delete', adminAuth, adminDeleteReview);

export default reviewRouter;
