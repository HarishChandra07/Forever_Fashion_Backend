import userModel from "../models/userModel.js";

// Add to wishlist
const addToWishlist = async (req, res) => {
    try {
        const { userId, productId } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Check if already in wishlist
        if (user.wishlist.includes(productId)) {
            return res.json({ success: false, message: "Product already in wishlist" });
        }

        user.wishlist.push(productId);
        await user.save();

        res.json({ success: true, message: "Added to wishlist", wishlist: user.wishlist });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Remove from wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const { userId, productId } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        user.wishlist = user.wishlist.filter(id => id !== productId);
        await user.save();

        res.json({ success: true, message: "Removed from wishlist", wishlist: user.wishlist });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get wishlist
const getWishlist = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({ success: true, wishlist: user.wishlist });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Toggle wishlist (add if not present, remove if present)
const toggleWishlist = async (req, res) => {
    try {
        const { userId, productId } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const index = user.wishlist.indexOf(productId);
        let message;

        if (index > -1) {
            user.wishlist.splice(index, 1);
            message = "Removed from wishlist";
        } else {
            user.wishlist.push(productId);
            message = "Added to wishlist";
        }

        await user.save();

        res.json({
            success: true,
            message,
            wishlist: user.wishlist,
            isInWishlist: index === -1
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Clear wishlist
const clearWishlist = async (req, res) => {
    try {
        const { userId } = req.body;

        await userModel.findByIdAndUpdate(userId, { wishlist: [] });

        res.json({ success: true, message: "Wishlist cleared" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    toggleWishlist,
    clearWishlist
};
