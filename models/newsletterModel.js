import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    isSubscribed: { type: Boolean, default: true },
    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: { type: Date }
});

const newsletterModel = mongoose.models.newsletter || mongoose.model("newsletter", newsletterSchema);

export default newsletterModel;
