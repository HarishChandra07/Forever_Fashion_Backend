import express from 'express';
import {
    loginUser,
    registerUser,
    adminLogin,
    getProfile,
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    getAddresses,
    getAllUsers,
    toggleUserBlock,
    forgotPassword,
    resetPassword,
    getUserAnalytics
} from '../controllers/userController.js';
import authUser from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const userRouter = express.Router();

// Public routes
userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.post('/admin', adminLogin);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password', resetPassword);

// User routes (authenticated)
userRouter.post('/profile', authUser, getProfile);
userRouter.post('/profile/update', authUser, updateProfile);
userRouter.post('/addresses', authUser, getAddresses);
userRouter.post('/address/add', authUser, addAddress);
userRouter.post('/address/update', authUser, updateAddress);
userRouter.post('/address/delete', authUser, deleteAddress);

// Admin routes
userRouter.get('/all', adminAuth, getAllUsers);
userRouter.post('/toggle-block', adminAuth, toggleUserBlock);
userRouter.get('/analytics/:userId', adminAuth, getUserAnalytics);

export default userRouter;