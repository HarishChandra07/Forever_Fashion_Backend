import express from 'express';
import { getSettings, updateSettings } from '../controllers/siteSettingsController.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';

const siteSettingsRouter = express.Router();

// Public route
siteSettingsRouter.get('/', getSettings);

// Admin route
siteSettingsRouter.post(
    '/update',
    adminAuth,
    upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'aboutImage', maxCount: 1 },
        { name: 'favicon', maxCount: 1 }
    ]),
    updateSettings
);

export default siteSettingsRouter;
