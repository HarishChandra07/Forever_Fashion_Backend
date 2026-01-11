import express from 'express';
import {
    subscribe,
    unsubscribe,
    getAllSubscribers,
    deleteSubscriber
} from '../controllers/newsletterController.js';
import adminAuth from '../middleware/adminAuth.js';

const newsletterRouter = express.Router();

// Public routes
newsletterRouter.post('/subscribe', subscribe);
newsletterRouter.post('/unsubscribe', unsubscribe);

// Admin routes
newsletterRouter.get('/subscribers', adminAuth, getAllSubscribers);
newsletterRouter.post('/delete', adminAuth, deleteSubscriber);

export default newsletterRouter;
