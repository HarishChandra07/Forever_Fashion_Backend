import siteSettingsModel from "../models/siteSettingsModel.js";
import { v2 as cloudinary } from "cloudinary";

// Get site settings (public)
const getSettings = async (req, res) => {
    try {
        let settings = await siteSettingsModel.findOne();

        // Create default settings if not exists
        if (!settings) {
            settings = new siteSettingsModel({});
            await settings.save();
        }

        res.json({ success: true, settings });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Update site settings (admin)
const updateSettings = async (req, res) => {
    try {
        const {
            siteName, logoAlt, marqueeEnabled, marqueeMotion, marqueeText,
            footerText, footerDescription, footerLinks, socialLinks,
            aboutTitle, aboutContent, contactTitle, contactAddress,
            contactPhone, contactEmail, contactMapUrl, contactWorkingHours,
            privacyPolicy, termsAndConditions, returnPolicy
        } = req.body;

        let settings = await siteSettingsModel.findOne();
        if (!settings) {
            settings = new siteSettingsModel({});
        }

        // Update text fields
        if (siteName !== undefined) settings.siteName = siteName;
        if (logoAlt !== undefined) settings.logoAlt = logoAlt;
        if (footerText !== undefined) settings.footerText = footerText;
        if (footerDescription !== undefined) settings.footerDescription = footerDescription;
        if (aboutTitle !== undefined) settings.aboutTitle = aboutTitle;
        if (aboutContent !== undefined) settings.aboutContent = aboutContent;
        if (contactTitle !== undefined) settings.contactTitle = contactTitle;
        if (contactAddress !== undefined) settings.contactAddress = contactAddress;
        if (contactPhone !== undefined) settings.contactPhone = contactPhone;
        if (contactEmail !== undefined) settings.contactEmail = contactEmail;
        if (contactMapUrl !== undefined) settings.contactMapUrl = contactMapUrl;
        if (contactWorkingHours !== undefined) settings.contactWorkingHours = contactWorkingHours;
        if (privacyPolicy !== undefined) settings.privacyPolicy = privacyPolicy;
        if (termsAndConditions !== undefined) settings.termsAndConditions = termsAndConditions;
        if (returnPolicy !== undefined) settings.returnPolicy = returnPolicy;
        if (marqueeText !== undefined) settings.marqueeText = marqueeText;

        // Handle boolean fields (sent as 'true'/'false' strings)
        if (marqueeEnabled !== undefined) {
            settings.marqueeEnabled = marqueeEnabled === 'true' || marqueeEnabled === true;
        }
        if (marqueeMotion !== undefined) {
            settings.marqueeMotion = marqueeMotion === 'true' || marqueeMotion === true;
        }

        // Parse JSON arrays if provided as strings
        if (footerLinks) {
            settings.footerLinks = typeof footerLinks === 'string' ? JSON.parse(footerLinks) : footerLinks;
        }
        if (socialLinks) {
            settings.socialLinks = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
        }

        // Handle logo upload
        if (req.files?.logo?.[0]) {
            const logoResult = await cloudinary.uploader.upload(req.files.logo[0].path, { resource_type: 'image' });
            settings.logo = logoResult.secure_url;
        }

        // Handle about image upload
        if (req.files?.aboutImage?.[0]) {
            const aboutResult = await cloudinary.uploader.upload(req.files.aboutImage[0].path, { resource_type: 'image' });
            settings.aboutImage = aboutResult.secure_url;
        }

        // Handle favicon upload
        if (req.files?.favicon?.[0]) {
            const faviconResult = await cloudinary.uploader.upload(req.files.favicon[0].path, { resource_type: 'image' });
            settings.favicon = faviconResult.secure_url;
        }

        settings.updatedAt = Date.now();
        await settings.save();

        res.json({ success: true, message: "Settings updated successfully", settings });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export { getSettings, updateSettings };
