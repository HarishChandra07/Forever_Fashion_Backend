import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        // Total orders
        const totalOrders = await orderModel.countDocuments();

        // Total revenue
        const revenueResult = await orderModel.aggregate([
            { $match: { payment: true } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        // Total products
        const totalProducts = await productModel.countDocuments();

        // Total users
        const totalUsers = await userModel.countDocuments();

        // Pending orders
        const pendingOrders = await orderModel.countDocuments({
            status: { $in: ['Order Placed', 'Packing'] }
        });

        // Today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = await orderModel.countDocuments({
            date: { $gte: today.getTime() }
        });

        // Today's revenue
        const todayRevenueResult = await orderModel.aggregate([
            { $match: { payment: true, date: { $gte: today.getTime() } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const todayRevenue = todayRevenueResult[0]?.total || 0;

        res.json({
            success: true,
            stats: {
                totalOrders,
                totalRevenue,
                totalProducts,
                totalUsers,
                pendingOrders,
                todayOrders,
                todayRevenue
            }
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get recent orders
const getRecentOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({})
            .sort({ date: -1 })
            .limit(10);

        res.json({ success: true, orders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get top selling products
const getTopProducts = async (req, res) => {
    try {
        const topProducts = await orderModel.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items._id",
                    name: { $first: "$items.name" },
                    image: { $first: "$items.image" },
                    totalSold: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        res.json({ success: true, products: topProducts });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get sales chart data (last 7 days)
const getSalesChart = async (req, res) => {
    try {
        const days = 7;
        const chartData = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const result = await orderModel.aggregate([
                {
                    $match: {
                        payment: true,
                        date: {
                            $gte: date.getTime(),
                            $lt: nextDate.getTime()
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ]);

            chartData.push({
                date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                revenue: result[0]?.total || 0,
                orders: result[0]?.count || 0
            });
        }

        res.json({ success: true, chartData });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get order status distribution
const getOrderStatusDistribution = async (req, res) => {
    try {
        const statusData = await orderModel.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        res.json({ success: true, statusData });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get payment analytics
const getPaymentAnalytics = async (req, res) => {
    try {
        // Payment status counts
        const paymentStats = await orderModel.aggregate([
            { $group: { _id: "$paymentStatus", count: { $sum: 1 }, amount: { $sum: "$amount" } } }
        ]);

        // Convert to object for easier access
        const stats = {};
        paymentStats.forEach(item => {
            stats[item._id || 'unknown'] = { count: item.count, amount: item.amount };
        });

        // Failed payments in last 24h
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const recentFailed = await orderModel.find({
            paymentStatus: 'failed',
            createdAt: { $gte: yesterday }
        }).select('_id amount paymentDetails.failedReason createdAt').sort({ createdAt: -1 }).limit(10);

        // Pending payments (initiated but not completed) older than 30 min
        const thirtyMinAgo = new Date();
        thirtyMinAgo.setMinutes(thirtyMinAgo.getMinutes() - 30);
        const abandoned = await orderModel.countDocuments({
            paymentStatus: 'pending',
            paymentMethod: { $ne: 'COD' },
            createdAt: { $lt: thirtyMinAgo }
        });

        // Abandoned cart users (users with cart items, no order in 24h)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const usersWithCarts = await userModel.find({
            cartData: { $exists: true, $ne: {} }
        }).select('_id name email cartData').lean();

        // Check which have orders in last 24h
        const abandonedCarts = [];
        for (const user of usersWithCarts) {
            // Check if cart is not empty
            const cartKeys = Object.keys(user.cartData || {});
            if (cartKeys.length === 0) continue;

            const hasRecentOrder = await orderModel.findOne({
                userId: user._id.toString(),
                createdAt: { $gte: oneDayAgo }
            });

            if (!hasRecentOrder) {
                abandonedCarts.push({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    cartItemCount: cartKeys.length
                });
            }
        }

        res.json({
            success: true,
            analytics: {
                paid: stats.paid || { count: 0, amount: 0 },
                pending: stats.pending || { count: 0, amount: 0 },
                failed: stats.failed || { count: 0, amount: 0 },
                cod_pending: stats.cod_pending || { count: 0, amount: 0 },
                cod_collected: stats.cod_collected || { count: 0, amount: 0 },
                refunded: stats.refunded || { count: 0, amount: 0 },
                abandonedCheckouts: abandoned,
                recentFailedPayments: recentFailed,
                abandonedCarts: abandonedCarts.slice(0, 20)
            }
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    getDashboardStats,
    getRecentOrders,
    getTopProducts,
    getSalesChart,
    getOrderStatusDistribution,
    getPaymentAnalytics
};
