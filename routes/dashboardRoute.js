import express from 'express';
import {
    getDashboardStats,
    getRecentOrders,
    getTopProducts,
    getSalesChart,
    getOrderStatusDistribution,
    getPaymentAnalytics
} from '../controllers/dashboardController.js';
import adminAuth from '../middleware/adminAuth.js';

const dashboardRouter = express.Router();

dashboardRouter.get('/stats', adminAuth, getDashboardStats);
dashboardRouter.get('/recent-orders', adminAuth, getRecentOrders);
dashboardRouter.get('/top-products', adminAuth, getTopProducts);
dashboardRouter.get('/sales-chart', adminAuth, getSalesChart);
dashboardRouter.get('/order-status', adminAuth, getOrderStatusDistribution);
dashboardRouter.get('/payment-analytics', adminAuth, getPaymentAnalytics);

export default dashboardRouter;
