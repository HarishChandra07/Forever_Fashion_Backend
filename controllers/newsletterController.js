import newsletterModel from "../models/newsletterModel.js";

// Subscribe to newsletter
const subscribe = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        // Check if already subscribed
        const existing = await newsletterModel.findOne({ email });

        if (existing) {
            if (existing.isSubscribed) {
                return res.json({ success: false, message: "Already subscribed" });
            } else {
                // Re-subscribe
                existing.isSubscribed = true;
                existing.subscribedAt = new Date();
                existing.unsubscribedAt = undefined;
                await existing.save();
                return res.json({ success: true, message: "Successfully re-subscribed!" });
            }
        }

        // New subscription
        const subscription = new newsletterModel({ email });
        await subscription.save();

        res.json({ success: true, message: "Successfully subscribed to newsletter!" });
    } catch (error) {
        console.log(error);
        if (error.code === 11000) {
            return res.json({ success: false, message: "Email already exists" });
        }
        res.json({ success: false, message: error.message });
    }
};

// Unsubscribe from newsletter
const unsubscribe = async (req, res) => {
    try {
        const { email } = req.body;

        const subscription = await newsletterModel.findOne({ email });

        if (!subscription) {
            return res.json({ success: false, message: "Email not found" });
        }

        subscription.isSubscribed = false;
        subscription.unsubscribedAt = new Date();
        await subscription.save();

        res.json({ success: true, message: "Successfully unsubscribed" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get all subscribers (admin)
const getAllSubscribers = async (req, res) => {
    try {
        const { status } = req.query;

        let filter = {};
        if (status === 'active') {
            filter.isSubscribed = true;
        } else if (status === 'unsubscribed') {
            filter.isSubscribed = false;
        }

        const subscribers = await newsletterModel.find(filter).sort({ subscribedAt: -1 });
        const activeCount = await newsletterModel.countDocuments({ isSubscribed: true });
        const totalCount = await newsletterModel.countDocuments({});

        res.json({
            success: true,
            subscribers,
            stats: {
                total: totalCount,
                active: activeCount,
                unsubscribed: totalCount - activeCount
            }
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Delete subscriber (admin)
const deleteSubscriber = async (req, res) => {
    try {
        const { email } = req.body;

        await newsletterModel.findOneAndDelete({ email });

        res.json({ success: true, message: "Subscriber deleted" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    subscribe,
    unsubscribe,
    getAllSubscribers,
    deleteSubscriber
};
