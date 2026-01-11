import bannerModel from "../models/bannerModel.js";
import { v2 as cloudinary } from "cloudinary";

// Get active banners (public)
const getActiveBanners = async (req, res) => {
    try {
        const { position } = req.query;
        const now = new Date();

        let filter = {
            isActive: true,
            $or: [
                { startDate: { $exists: false } },
                { startDate: { $lte: now } }
            ]
        };

        // Filter by position if specified
        if (position) {
            filter.position = position;
        }

        const banners = await bannerModel
            .find(filter)
            .sort({ order: 1, createdAt: -1 });

        // Filter out expired banners
        const activeBanners = banners.filter(banner => {
            if (!banner.endDate) return true;
            return new Date(banner.endDate) >= now;
        });

        res.json({ success: true, banners: activeBanners });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get all banners (admin)
const getAllBanners = async (req, res) => {
    try {
        const banners = await bannerModel.find({}).sort({ order: 1, createdAt: -1 });
        res.json({ success: true, banners });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Add banner (admin)
const addBanner = async (req, res) => {
    try {
        const { title, subtitle, link, buttonText, position, isActive, order, startDate, endDate } = req.body;

        // Upload images to cloudinary
        const mobileFile = req.files?.mobileImage?.[0];
        const desktopFile = req.files?.desktopImage?.[0];

        if (!mobileFile && !desktopFile) {
            return res.json({ success: false, message: "At least one banner image is required" });
        }

        let mobileImageUrl = '';
        let desktopImageUrl = '';

        if (mobileFile) {
            const mobileResult = await cloudinary.uploader.upload(mobileFile.path, { resource_type: 'image' });
            mobileImageUrl = mobileResult.secure_url;
        }

        if (desktopFile) {
            const desktopResult = await cloudinary.uploader.upload(desktopFile.path, { resource_type: 'image' });
            desktopImageUrl = desktopResult.secure_url;
        }

        const bannerData = {
            title,
            subtitle: subtitle || '',
            mobileImage: mobileImageUrl,
            desktopImage: desktopImageUrl,
            image: desktopImageUrl || mobileImageUrl, // Fallback for legacy
            link: link || '',
            buttonText: buttonText || 'Shop Now',
            position: position || 'hero',
            isActive: isActive !== 'false',
            order: parseInt(order) || 0,
            startDate: startDate || undefined,
            endDate: endDate || undefined
        };

        const banner = new bannerModel(bannerData);
        await banner.save();

        res.json({ success: true, message: "Banner added successfully", banner });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Update banner (admin)
const updateBanner = async (req, res) => {
    try {
        const { bannerId, title, subtitle, link, buttonText, position, isActive, order, startDate, endDate } = req.body;

        const updateData = {
            title,
            subtitle,
            link,
            buttonText,
            position,
            isActive: isActive === true || isActive === 'true',
            order: parseInt(order) || 0,
            startDate: startDate || undefined,
            endDate: endDate || undefined
        };

        // Handle new mobile image upload
        if (req.files?.mobileImage?.[0]) {
            const mobileResult = await cloudinary.uploader.upload(req.files.mobileImage[0].path, { resource_type: 'image' });
            updateData.mobileImage = mobileResult.secure_url;
        }

        // Handle new desktop image upload
        if (req.files?.desktopImage?.[0]) {
            const desktopResult = await cloudinary.uploader.upload(req.files.desktopImage[0].path, { resource_type: 'image' });
            updateData.desktopImage = desktopResult.secure_url;
            updateData.image = desktopResult.secure_url; // Legacy fallback
        }

        const banner = await bannerModel.findByIdAndUpdate(bannerId, updateData, { new: true });

        if (!banner) {
            return res.json({ success: false, message: "Banner not found" });
        }

        res.json({ success: true, message: "Banner updated", banner });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Delete banner (admin)
const deleteBanner = async (req, res) => {
    try {
        const { bannerId } = req.body;

        await bannerModel.findByIdAndDelete(bannerId);

        res.json({ success: true, message: "Banner deleted" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Toggle banner status (admin)
const toggleBannerStatus = async (req, res) => {
    try {
        const { bannerId } = req.body;

        const banner = await bannerModel.findById(bannerId);
        if (!banner) {
            return res.json({ success: false, message: "Banner not found" });
        }

        banner.isActive = !banner.isActive;
        await banner.save();

        res.json({ success: true, message: banner.isActive ? "Banner activated" : "Banner deactivated", banner });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    getActiveBanners,
    getAllBanners,
    addBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus
};
