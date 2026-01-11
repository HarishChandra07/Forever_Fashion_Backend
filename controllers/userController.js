import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import { sendWelcomeEmail } from "../services/emailService.js";

// Create Token
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET);
};

// Route for user login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User doesn't exist" });
        }

        if (user.isBlocked) {
            return res.json({ success: false, message: "Your account has been blocked. Contact support." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = createToken(user._id);
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Route for user register
const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user already exists
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.json({ success: false, message: "User already exists" });
        }

        // Validate email format & strong password
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password (min 8 characters)" });
        }

        // Hash user password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword,
            phone: phone || ''
        });

        const user = await newUser.save();
        const token = createToken(user._id);

        // Send welcome email (non-blocking)
        sendWelcomeEmail(email, name).catch(err => console.log('Welcome email failed:', err.message));

        res.json({ success: true, token });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Route for admin login
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET);
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get user profile
const getProfile = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await userModel.findById(userId).select('-password');

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { userId, name, phone } = req.body;

        await userModel.findByIdAndUpdate(userId, { name, phone });

        res.json({ success: true, message: "Profile updated successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Add new address
const addAddress = async (req, res) => {
    try {
        const { userId, address } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // If this is the first address or marked as default, set it as default
        if (user.addresses.length === 0 || address.isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
            address.isDefault = true;
        }

        user.addresses.push(address);
        await user.save();

        res.json({ success: true, message: "Address added successfully", addresses: user.addresses });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Update address
const updateAddress = async (req, res) => {
    try {
        const { userId, addressId, address } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.json({ success: false, message: "Address not found" });
        }

        // If setting as default, remove default from others
        if (address.isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        user.addresses[addressIndex] = { ...user.addresses[addressIndex]._doc, ...address };
        await user.save();

        res.json({ success: true, message: "Address updated successfully", addresses: user.addresses });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Delete address
const deleteAddress = async (req, res) => {
    try {
        const { userId, addressId } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);

        // If no default address exists after deletion, set first one as default
        if (user.addresses.length > 0 && !user.addresses.some(addr => addr.isDefault)) {
            user.addresses[0].isDefault = true;
        }

        await user.save();

        res.json({ success: true, message: "Address deleted successfully", addresses: user.addresses });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get all addresses
const getAddresses = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({ success: true, addresses: user.addresses });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get all users (Admin)
const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.find({}).select('-password');
        res.json({ success: true, users });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Block/Unblock user (Admin)
const toggleUserBlock = async (req, res) => {
    try {
        const { userId, isBlocked } = req.body;

        await userModel.findByIdAndUpdate(userId, { isBlocked });

        res.json({
            success: true,
            message: isBlocked ? "User blocked successfully" : "User unblocked successfully"
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

// Request password reset (send OTP)
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            // Don't reveal if user exists for security
            return res.json({ success: true, message: "If email exists, OTP has been sent" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with expiry (10 minutes)
        otpStore.set(email, {
            otp,
            expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
        });

        // Send OTP via email
        const { transporter } = await import('../config/emailConfig.js');

        await transporter.sendMail({
            from: process.env.FROM_EMAIL || 'Forever Store <noreply@forever.com>',
            to: email,
            subject: 'Password Reset OTP - Forever',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>You have requested to reset your password. Use the OTP below:</p>
                    <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <h1 style="color: #333; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    <p style="color: #666;">This OTP is valid for 10 minutes.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        });

        res.json({ success: true, message: "OTP sent to your email" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Reset password with OTP
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Verify OTP
        const storedData = otpStore.get(email);
        if (!storedData) {
            return res.json({ success: false, message: "OTP expired or not found. Please request a new one." });
        }

        if (Date.now() > storedData.expiry) {
            otpStore.delete(email);
            return res.json({ success: false, message: "OTP expired. Please request a new one." });
        }

        if (storedData.otp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        // Validate new password
        if (newPassword.length < 8) {
            return res.json({ success: false, message: "Password must be at least 8 characters" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await userModel.findOneAndUpdate({ email }, { password: hashedPassword });

        // Clear OTP
        otpStore.delete(email);

        res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get user analytics (admin) - cart, wishlist, order stats
const getUserAnalytics = async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user with populated wishlist
        const user = await userModel.findById(userId)
            .populate('wishlist', 'name price image category')
            .select('-password');

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Parse cart data and get product details
        const cartItems = [];
        if (user.cartData && typeof user.cartData === 'object') {
            for (const productId of Object.keys(user.cartData)) {
                const product = await productModel.findById(productId).select('name price image category');
                if (product && user.cartData[productId]) {
                    const sizes = user.cartData[productId];
                    for (const size of Object.keys(sizes)) {
                        if (sizes[size] > 0) {
                            cartItems.push({
                                product: {
                                    _id: productId,
                                    name: product.name,
                                    price: product.price,
                                    image: product.image,
                                    category: product.category
                                },
                                size,
                                quantity: sizes[size]
                            });
                        }
                    }
                }
            }
        }

        // Get order statistics
        const orders = await orderModel.find({ userId });
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;

        res.json({
            success: true,
            analytics: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    createdAt: user.createdAt,
                    isBlocked: user.isBlocked,
                    addresses: user.addresses
                },
                cartItems,
                cartTotal: cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
                wishlistItems: user.wishlist || [],
                orderStats: {
                    totalOrders,
                    totalSpent,
                    deliveredOrders
                }
            }
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
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
};
