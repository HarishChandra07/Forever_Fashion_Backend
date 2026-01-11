import couponModel from "../models/couponModel.js";

// Create coupon (Admin)
const createCoupon = async (req, res) => {
    try {
        const { code, type, value, minOrderAmount, maxDiscount, maxUses, expiryDate, description } = req.body;

        // Check if coupon code already exists
        const exists = await couponModel.findOne({ code: code.toUpperCase() });
        if (exists) {
            return res.json({ success: false, message: "Coupon code already exists" });
        }

        const coupon = new couponModel({
            code: code.toUpperCase(),
            type,
            value,
            minOrderAmount: minOrderAmount || 0,
            maxDiscount: maxDiscount || 0,
            maxUses: maxUses || 0,
            expiryDate: new Date(expiryDate),
            description: description || ''
        });

        await coupon.save();
        res.json({ success: true, message: "Coupon created successfully", coupon });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get all coupons (Admin)
const getAllCoupons = async (req, res) => {
    try {
        const coupons = await couponModel.find({}).sort({ createdAt: -1 });
        res.json({ success: true, coupons });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Update coupon (Admin)
const updateCoupon = async (req, res) => {
    try {
        const { couponId, ...updateData } = req.body;

        if (updateData.code) {
            updateData.code = updateData.code.toUpperCase();
        }
        if (updateData.expiryDate) {
            updateData.expiryDate = new Date(updateData.expiryDate);
        }

        await couponModel.findByIdAndUpdate(couponId, updateData);
        res.json({ success: true, message: "Coupon updated successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Delete coupon (Admin)
const deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;
        await couponModel.findByIdAndDelete(couponId);
        res.json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Toggle coupon status (Admin)
const toggleCouponStatus = async (req, res) => {
    try {
        const { couponId, isActive } = req.body;
        await couponModel.findByIdAndUpdate(couponId, { isActive });
        res.json({ success: true, message: `Coupon ${isActive ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Validate coupon (User)
const validateCoupon = async (req, res) => {
    try {
        const { code, orderAmount } = req.body;

        const coupon = await couponModel.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid coupon code" });
        }

        if (!coupon.isActive) {
            return res.json({ success: false, message: "This coupon is no longer active" });
        }

        if (new Date() > coupon.expiryDate) {
            return res.json({ success: false, message: "This coupon has expired" });
        }

        if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
            return res.json({ success: false, message: "This coupon has reached its usage limit" });
        }

        if (orderAmount < coupon.minOrderAmount) {
            return res.json({
                success: false,
                message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
            });
        }

        // Calculate discount
        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = (orderAmount * coupon.value) / 100;
            if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
            }
        } else {
            discount = coupon.value;
        }

        // Make sure discount doesn't exceed order amount
        if (discount > orderAmount) {
            discount = orderAmount;
        }

        res.json({
            success: true,
            message: "Coupon applied successfully",
            discount: Math.round(discount),
            coupon: {
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                description: coupon.description
            }
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Apply coupon (increment usage count)
const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;

        await couponModel.findOneAndUpdate(
            { code: code.toUpperCase() },
            { $inc: { usedCount: 1 } }
        );

        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    createCoupon,
    getAllCoupons,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
    validateCoupon,
    applyCoupon
};
