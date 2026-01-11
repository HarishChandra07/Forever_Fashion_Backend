import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    image: { type: String, default: '' }, // Legacy - kept for backward compatibility
    mobileImage: { type: String, default: '' }, // Image for mobile devices
    desktopImage: { type: String, default: '' }, // Image for tablet/laptop/PC
    link: { type: String, default: '' },
    buttonText: { type: String, default: 'Shop Now' },
    position: { type: String, enum: ['hero', 'promo', 'sidebar'], default: 'hero' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const bannerModel = mongoose.models.banner || mongoose.model("banner", bannerSchema);

export default bannerModel;
