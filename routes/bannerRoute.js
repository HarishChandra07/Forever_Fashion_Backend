import express from 'express';
import {
    getActiveBanners,
    getAllBanners,
    addBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus
} from '../controllers/bannerController.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';

const bannerRouter = express.Router();

// Public route
bannerRouter.get('/active', getActiveBanners);

// Admin routes
bannerRouter.get('/all', adminAuth, getAllBanners);
bannerRouter.post('/add', adminAuth, upload.fields([{ name: 'mobileImage', maxCount: 1 }, { name: 'desktopImage', maxCount: 1 }]), addBanner);
bannerRouter.post('/update', adminAuth, upload.fields([{ name: 'mobileImage', maxCount: 1 }, { name: 'desktopImage', maxCount: 1 }]), updateBanner);
bannerRouter.post('/delete', adminAuth, deleteBanner);
bannerRouter.post('/toggle', adminAuth, toggleBannerStatus);

export default bannerRouter;
