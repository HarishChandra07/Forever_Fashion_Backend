import express from 'express';
import {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    toggleWishlist,
    clearWishlist
} from '../controllers/wishlistController.js';
import authUser from '../middleware/auth.js';

const wishlistRouter = express.Router();

wishlistRouter.post('/get', authUser, getWishlist);
wishlistRouter.post('/add', authUser, addToWishlist);
wishlistRouter.post('/remove', authUser, removeFromWishlist);
wishlistRouter.post('/toggle', authUser, toggleWishlist);
wishlistRouter.post('/clear', authUser, clearWishlist);

export default wishlistRouter;
