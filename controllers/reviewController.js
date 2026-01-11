import reviewModel from "../models/reviewModel.js";
import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";

// Add a review - Only users who purchased the product can write reviews
const addReview = async (req, res) => {
    try {
        const { userId, productId, rating, title, comment } = req.body;

        // Check if user has purchased this product (REQUIRED)
        const userOrders = await orderModel.find({
            userId,
            status: 'Delivered',
            'items._id': productId
        });

        // Also check with productId field (some orders may use this)
        const userOrdersAlt = await orderModel.find({
            userId,
            status: 'Delivered',
            'items.productId': productId
        });

        const hasPurchased = userOrders.length > 0 || userOrdersAlt.length > 0;

        if (!hasPurchased) {
            return res.json({
                success: false,
                message: "You can only review products you have purchased and received"
            });
        }

        // Check if user already reviewed this product
        const existingReview = await reviewModel.findOne({ productId, userId });
        if (existingReview) {
            return res.json({ success: false, message: "You have already reviewed this product" });
        }

        // Get user name
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const review = new reviewModel({
            productId,
            userId,
            userName: user.name,
            rating,
            title: title || '',
            comment,
            isVerifiedPurchase: true // Always true since we require purchase
        });

        await review.save();

        // Update product rating
        await updateProductRating(productId);

        res.json({ success: true, message: "Review added successfully", review });
    } catch (error) {
        console.log(error);
        if (error.code === 11000) {
            return res.json({ success: false, message: "You have already reviewed this product" });
        }
        res.json({ success: false, message: error.message });
    }
};

// Get reviews for a product
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10, sort = 'recent' } = req.query;

        let sortOption = { createdAt: -1 };
        if (sort === 'helpful') {
            sortOption = { helpfulCount: -1, createdAt: -1 };
        } else if (sort === 'rating-high') {
            sortOption = { rating: -1, createdAt: -1 };
        } else if (sort === 'rating-low') {
            sortOption = { rating: 1, createdAt: -1 };
        }

        const reviews = await reviewModel
            .find({ productId, isApproved: true })
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalReviews = await reviewModel.countDocuments({ productId, isApproved: true });

        // Get rating distribution
        const ratingDistribution = await reviewModel.aggregate([
            { $match: { productId, isApproved: true } },
            { $group: { _id: '$rating', count: { $sum: 1 } } },
            { $sort: { _id: -1 } }
        ]);

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratingDistribution.forEach(item => {
            distribution[item._id] = item.count;
        });

        res.json({
            success: true,
            reviews,
            totalReviews,
            totalPages: Math.ceil(totalReviews / limit),
            currentPage: parseInt(page),
            distribution
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Update a review
const updateReview = async (req, res) => {
    try {
        const { userId, reviewId, rating, title, comment } = req.body;

        const review = await reviewModel.findById(reviewId);
        if (!review) {
            return res.json({ success: false, message: "Review not found" });
        }

        if (review.userId !== userId) {
            return res.json({ success: false, message: "Not authorized to update this review" });
        }

        review.rating = rating;
        review.title = title || '';
        review.comment = comment;
        await review.save();

        // Update product rating
        await updateProductRating(review.productId);

        res.json({ success: true, message: "Review updated successfully", review });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Delete a review
const deleteReview = async (req, res) => {
    try {
        const { userId, reviewId } = req.body;

        const review = await reviewModel.findById(reviewId);
        if (!review) {
            return res.json({ success: false, message: "Review not found" });
        }

        if (review.userId !== userId) {
            return res.json({ success: false, message: "Not authorized to delete this review" });
        }

        const productId = review.productId;
        await reviewModel.findByIdAndDelete(reviewId);

        // Update product rating
        await updateProductRating(productId);

        res.json({ success: true, message: "Review deleted successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Mark review as helpful
const markHelpful = async (req, res) => {
    try {
        const { reviewId } = req.body;

        await reviewModel.findByIdAndUpdate(reviewId, { $inc: { helpfulCount: 1 } });

        res.json({ success: true, message: "Marked as helpful" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get user's reviews
const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.body;

        const reviews = await reviewModel.find({ userId }).sort({ createdAt: -1 });

        res.json({ success: true, reviews });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Admin: Get all reviews (for moderation)
const getAllReviews = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;

        let filter = {};
        if (status === 'pending') {
            filter.isApproved = false;
        } else if (status === 'approved') {
            filter.isApproved = true;
        }

        const reviews = await reviewModel
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await reviewModel.countDocuments(filter);

        res.json({
            success: true,
            reviews,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Admin: Approve/Reject review
const moderateReview = async (req, res) => {
    try {
        const { reviewId, isApproved } = req.body;

        const review = await reviewModel.findByIdAndUpdate(
            reviewId,
            { isApproved },
            { new: true }
        );

        if (!review) {
            return res.json({ success: false, message: "Review not found" });
        }

        // Update product rating if approved status changed
        await updateProductRating(review.productId);

        res.json({
            success: true,
            message: isApproved ? "Review approved" : "Review rejected",
            review
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Admin: Delete review
const adminDeleteReview = async (req, res) => {
    try {
        const { reviewId } = req.body;

        const review = await reviewModel.findById(reviewId);
        if (!review) {
            return res.json({ success: false, message: "Review not found" });
        }

        const productId = review.productId;
        await reviewModel.findByIdAndDelete(reviewId);

        // Update product rating
        await updateProductRating(productId);

        res.json({ success: true, message: "Review deleted" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Helper: Update product average rating
const updateProductRating = async (productId) => {
    try {
        const result = await reviewModel.aggregate([
            { $match: { productId, isApproved: true } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    numReviews: { $sum: 1 }
                }
            }
        ]);

        if (result.length > 0) {
            await productModel.findByIdAndUpdate(productId, {
                rating: Math.round(result[0].avgRating * 10) / 10,
                numReviews: result[0].numReviews
            });
        } else {
            await productModel.findByIdAndUpdate(productId, {
                rating: 0,
                numReviews: 0
            });
        }
    } catch (error) {
        console.log('Error updating product rating:', error);
    }
};

// Check if user can write a review (has purchased the product)
const canReview = async (req, res) => {
    try {
        const { userId, productId } = req.body;

        // Check if user has purchased this product
        const userOrders = await orderModel.find({
            userId,
            status: 'Delivered',
            'items._id': productId
        });

        // Also check with productId field
        const userOrdersAlt = await orderModel.find({
            userId,
            status: 'Delivered',
            'items.productId': productId
        });

        const hasPurchased = userOrders.length > 0 || userOrdersAlt.length > 0;

        // Check if user already reviewed this product
        const existingReview = await reviewModel.findOne({ productId, userId });
        const hasReviewed = !!existingReview;

        res.json({
            success: true,
            canReview: hasPurchased && !hasReviewed,
            hasPurchased,
            hasReviewed,
            message: !hasPurchased
                ? "Purchase this product to write a review"
                : hasReviewed
                    ? "You have already reviewed this product"
                    : "You can write a review"
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
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
};
