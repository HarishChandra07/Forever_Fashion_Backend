import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: { type: Array, required: true },
    amount: { type: Number, required: true },
    address: { type: Object, required: true },
    status: { type: String, required: true, default: 'Order Placed' },
    paymentMethod: { type: String, required: true },
    payment: { type: Boolean, required: true, default: false },
    date: { type: Number, required: true },

    // Payment tracking
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded', 'cod_pending', 'cod_collected'],
        default: 'pending'
    },
    paymentDetails: {
        razorpayOrderId: { type: String, default: '' },
        razorpayPaymentId: { type: String, default: '' },
        failedReason: { type: String, default: '' },
        paidAt: { type: Date },
        failedAt: { type: Date },
        attempts: { type: Number, default: 0 }
    },

    // Additional fields for enhanced features
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    deliveryFee: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    trackingNumber: { type: String, default: '' },
    estimatedDelivery: { type: Date },
    statusHistory: [{
        status: { type: String },
        date: { type: Date, default: Date.now },
        note: { type: String }
    }],
    invoiceNumber: { type: String, unique: true, sparse: true }
}, { timestamps: true });

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
