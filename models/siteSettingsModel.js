import mongoose from "mongoose";

const siteSettingsSchema = new mongoose.Schema({
    // General Settings
    logo: { type: String, default: '' },
    logoAlt: { type: String, default: 'Logo' },
    siteName: { type: String, default: 'Forever' },
    favicon: { type: String, default: '' },

    // Marquee/Announcement Bar
    marqueeEnabled: { type: Boolean, default: true },
    marqueeMotion: { type: Boolean, default: true },
    marqueeText: { type: String, default: '🎉 Get 20% OFF on your first order! Use code: WELCOME20 | Free shipping on orders above ₹999 🚚' },

    // Footer Settings
    footerText: { type: String, default: '© 2024 Forever. All rights reserved.' },
    footerDescription: { type: String, default: 'Elevate your style with Forever Fashion—your go-to destination for trendy men\'s, women\'s, and kids\' wear. We bring you the latest fashion, unmatched quality, and timeless elegance, all in one place.' },
    footerLinks: [{
        title: { type: String },
        url: { type: String }
    }],
    socialLinks: [{
        platform: { type: String }, // facebook, instagram, twitter, youtube
        url: { type: String }
    }],

    // About Page
    aboutTitle: { type: String, default: 'About Us' },
    aboutContent: { type: String, default: '' },
    aboutImage: { type: String, default: '' },

    // Contact Page
    contactTitle: { type: String, default: 'Contact Us' },
    contactAddress: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    contactMapUrl: { type: String, default: '' },
    contactWorkingHours: { type: String, default: '' },

    // Policies (optional dynamic pages)
    privacyPolicy: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' },
    returnPolicy: { type: String, default: '' },

    updatedAt: { type: Date, default: Date.now }
});

const siteSettingsModel = mongoose.models.siteSettings || mongoose.model("siteSettings", siteSettingsSchema);

export default siteSettingsModel;
