import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import PDFDocument from 'pdfkit';
import { sendOrderConfirmation, sendOrderStatusUpdate } from '../services/emailService.js';

// Global variables
const currency = 'inr';
const deliveryCharge = 10;

// Lazy gateway initialization (to avoid errors when env vars not set)
let stripe = null;
let razorpayInstance = null;

const getStripe = () => {
    if (!stripe && process.env.STRIPE_SECRET_KEY) {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
};

const getRazorpay = () => {
    if (!razorpayInstance && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayInstance;
};

// Generate invoice number
const generateInvoiceNumber = () => {
    const prefix = 'INV';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
};

// Helper to send order confirmation
const sendConfirmation = async (order, userEmail) => {
    try {
        const customerName = `${order.address.firstName} ${order.address.lastName}`;
        await sendOrderConfirmation(userEmail, customerName, order);
    } catch (error) {
        console.log('Email sending failed:', error.message);
    }
};

// Helper to deduct stock for ordered items
const deductStock = async (items) => {
    try {
        const productModel = (await import('../models/productModel.js')).default;

        for (const item of items) {
            const productId = item._id || item.productId;
            const quantity = item.quantity || 1;

            await productModel.findByIdAndUpdate(
                productId,
                { $inc: { stock: -quantity } }
            );
        }
        console.log('Stock deducted for', items.length, 'items');
    } catch (error) {
        console.log('Stock deduction error:', error.message);
    }
};

// Placing orders using COD Method
const placeOrder = async (req, res) => {
    try {
        const { userId, items, amount, address, couponCode, discountAmount } = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "COD",
            payment: false,
            paymentStatus: 'cod_pending',
            date: Date.now(),
            couponCode: couponCode || '',
            discountAmount: discountAmount || 0,
            deliveryFee: deliveryCharge,
            invoiceNumber: generateInvoiceNumber(),
            statusHistory: [{ status: 'Order Placed', date: new Date(), note: 'COD order placed' }]
        };

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        // Deduct stock for ordered items
        await deductStock(items);

        // Clear cart
        await userModel.findByIdAndUpdate(userId, { cartData: {} });

        // Send confirmation email
        sendConfirmation(newOrder, address.email);

        res.json({ success: true, message: "Order Placed" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Placing orders using Stripe Method
const placeOrderStripe = async (req, res) => {
    try {
        const { userId, items, amount, address, couponCode, discountAmount } = req.body;
        const { origin } = req.headers;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Stripe",
            payment: false,
            date: Date.now(),
            couponCode: couponCode || '',
            discountAmount: discountAmount || 0,
            deliveryFee: deliveryCharge,
            invoiceNumber: generateInvoiceNumber(),
            statusHistory: [{ status: 'Order Placed', date: new Date(), note: 'Awaiting payment' }]
        };

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        const line_items = items.map((item) => ({
            price_data: {
                currency: currency,
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }));

        line_items.push({
            price_data: {
                currency: currency,
                product_data: {
                    name: 'Delivery Charges'
                },
                unit_amount: deliveryCharge * 100
            },
            quantity: 1
        });

        const session = await getStripe().checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment',
        });

        res.json({ success: true, session_url: session.url });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Verify Stripe
const verifyStripe = async (req, res) => {
    try {
        const { orderId, success, userId } = req.body;

        if (success === "true") {
            const order = await orderModel.findByIdAndUpdate(orderId, { payment: true }, { new: true });
            await userModel.findByIdAndUpdate(userId, { cartData: {} });

            // Deduct stock for ordered items
            if (order) await deductStock(order.items);

            // Send confirmation email
            if (order) sendConfirmation(order, order.address.email);

            res.json({ success: true });
        } else {
            await orderModel.findByIdAndDelete(orderId);
            res.json({ success: false });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req, res) => {
    try {
        const { userId, items, amount, address, couponCode, discountAmount } = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Razorpay",
            payment: false,
            paymentStatus: 'pending',
            date: Date.now(),
            couponCode: couponCode || '',
            discountAmount: discountAmount || 0,
            deliveryFee: deliveryCharge,
            invoiceNumber: generateInvoiceNumber(),
            statusHistory: [{ status: 'Order Placed', date: new Date(), note: 'Awaiting payment' }]
        };

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        const options = {
            amount: amount * 100,
            currency: currency.toUpperCase(),
            receipt: newOrder._id.toString()
        };

        getRazorpay().orders.create(options, async (error, order) => {
            if (error) {
                console.log(error);
                // Update order with failed status
                await orderModel.findByIdAndUpdate(newOrder._id, {
                    paymentStatus: 'failed',
                    'paymentDetails.failedReason': error.message || 'Order creation failed',
                    'paymentDetails.failedAt': new Date()
                });
                return res.json({ success: false, message: error });
            }
            // Update order with razorpay order ID
            await orderModel.findByIdAndUpdate(newOrder._id, {
                'paymentDetails.razorpayOrderId': order.id,
                'paymentDetails.attempts': order.attempts
            });
            res.json({ success: true, order });
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Verify Razorpay
const verifyRazorpay = async (req, res) => {
    try {
        const { userId, razorpay_order_id } = req.body;

        const orderInfo = await getRazorpay().orders.fetch(razorpay_order_id);

        if (orderInfo.status === 'paid') {
            const order = await orderModel.findByIdAndUpdate(orderInfo.receipt, {
                payment: true,
                paymentStatus: 'paid',
                'paymentDetails.razorpayPaymentId': orderInfo.id,
                'paymentDetails.paidAt': new Date()
            }, { new: true });
            await userModel.findByIdAndUpdate(userId, { cartData: {} });

            // Deduct stock for ordered items
            if (order) await deductStock(order.items);

            // Send confirmation email
            if (order) sendConfirmation(order, order.address.email);

            res.json({ success: true, message: "Payment Successful" });
        } else {
            // Update as failed
            await orderModel.findByIdAndUpdate(orderInfo.receipt, {
                paymentStatus: 'failed',
                'paymentDetails.failedReason': 'Payment not completed',
                'paymentDetails.failedAt': new Date()
            });
            res.json({ success: false, message: "Payment Failed" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// All Orders data for Admin Panel
const allOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({}).sort({ date: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// User Order Data For Frontend
const userOrders = async (req, res) => {
    try {
        const { userId } = req.body;

        const orders = await orderModel.find({ userId }).sort({ date: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Update order status from Admin Panel
const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        // Add to status history
        order.statusHistory.push({
            status,
            date: new Date(),
            note: `Status updated to ${status}`
        });
        order.status = status;

        await order.save();

        // Send status update email
        try {
            const customerName = `${order.address.firstName} ${order.address.lastName}`;
            await sendOrderStatusUpdate(order.address.email, customerName, order, status);
        } catch (emailError) {
            console.log('Status email failed:', emailError.message);
        }

        res.json({ success: true, message: 'Status Updated' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get single order by ID
const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Cancel order
const cancelOrder = async (req, res) => {
    try {
        const { orderId, userId } = req.body;

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        // Check if order belongs to user
        if (order.userId !== userId) {
            return res.json({ success: false, message: "Not authorized" });
        }

        // Can only cancel if not shipped
        if (['Shipped', 'Out for delivery', 'Delivered'].includes(order.status)) {
            return res.json({ success: false, message: "Cannot cancel order after shipping" });
        }

        order.status = 'Cancelled';
        order.statusHistory.push({
            status: 'Cancelled',
            date: new Date(),
            note: 'Order cancelled by customer'
        });

        await order.save();

        // Send cancellation email
        try {
            const customerName = `${order.address.firstName} ${order.address.lastName}`;
            await sendOrderStatusUpdate(order.address.email, customerName, order, 'Cancelled');
        } catch (emailError) {
            console.log('Cancellation email failed:', emailError.message);
        }

        res.json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Generate Invoice PDF
const generateInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.invoiceNumber}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(24).text('INVOICE', { align: 'center' });
        doc.moveDown();

        // Invoice details
        doc.fontSize(10);
        doc.text(`Invoice Number: ${order.invoiceNumber}`, { align: 'right' });
        doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, { align: 'right' });
        doc.text(`Status: ${order.status}`, { align: 'right' });
        doc.moveDown();

        // Shipping address
        doc.fontSize(12).text('Ship To:', { underline: true });
        doc.fontSize(10);
        doc.text(`${order.address.firstName} ${order.address.lastName}`);
        doc.text(order.address.street);
        doc.text(`${order.address.city}, ${order.address.state} ${order.address.zipcode}`);
        doc.text(order.address.country);
        doc.text(`Phone: ${order.address.phone}`);
        doc.moveDown();

        // Items table
        doc.fontSize(12).text('Order Items:', { underline: true });
        doc.moveDown(0.5);

        // Table header
        const tableTop = doc.y;
        doc.fontSize(10);
        doc.text('Item', 50, tableTop);
        doc.text('Size', 280, tableTop);
        doc.text('Qty', 330, tableTop);
        doc.text('Price', 380, tableTop);
        doc.text('Total', 450, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table rows
        let y = tableTop + 25;
        order.items.forEach((item) => {
            doc.text(item.name.substring(0, 35), 50, y);
            doc.text(item.size, 280, y);
            doc.text(item.quantity.toString(), 330, y);
            doc.text(`₹${item.price}`, 380, y);
            doc.text(`₹${item.price * item.quantity}`, 450, y);
            y += 20;
        });

        doc.moveTo(50, y).lineTo(550, y).stroke();

        // Totals
        y += 20;
        const subtotal = order.amount + (order.discountAmount || 0) - (order.deliveryFee || 10);
        doc.text('Subtotal:', 380, y);
        doc.text(`₹${subtotal}`, 450, y);

        if (order.discountAmount > 0) {
            y += 15;
            doc.text(`Discount (${order.couponCode}):`, 350, y);
            doc.text(`-₹${order.discountAmount}`, 450, y);
        }

        y += 15;
        doc.text('Delivery:', 380, y);
        doc.text(`₹${order.deliveryFee || 10}`, 450, y);

        y += 20;
        doc.fontSize(12).text('Total:', 380, y, { underline: true });
        doc.text(`₹${order.amount}`, 450, y);

        // Payment info
        doc.moveDown(3);
        doc.fontSize(10);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Payment Status: ${order.payment ? 'Paid' : 'Pending'}`);

        // Footer
        doc.moveDown(2);
        doc.fontSize(8).text('Thank you for shopping with Forever!', { align: 'center' });
        doc.text('For any queries, contact support@forever.com', { align: 'center' });

        doc.end();
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Mark COD payment as collected (Admin)
const markCODCollected = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        if (order.paymentMethod !== 'COD') {
            return res.json({ success: false, message: "This is not a COD order" });
        }

        if (order.paymentStatus === 'cod_collected') {
            return res.json({ success: false, message: "Payment already collected" });
        }

        order.paymentStatus = 'cod_collected';
        order.payment = true;
        order.paymentDetails = {
            ...order.paymentDetails,
            paidAt: new Date()
        };
        order.statusHistory.push({
            status: 'Payment Collected',
            date: new Date(),
            note: 'COD payment collected'
        });

        await order.save();

        res.json({ success: true, message: "COD payment marked as collected" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    verifyRazorpay,
    verifyStripe,
    placeOrder,
    placeOrderStripe,
    placeOrderRazorpay,
    allOrders,
    userOrders,
    updateStatus,
    getOrderById,
    cancelOrder,
    generateInvoice,
    markCODCollected

};
