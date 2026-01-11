import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import couponRouter from './routes/couponRoute.js';
import dashboardRouter from './routes/dashboardRoute.js';
import reviewRouter from './routes/reviewRoute.js';
import wishlistRouter from './routes/wishlistRoute.js';
import bannerRouter from './routes/bannerRoute.js';
import newsletterRouter from './routes/newsletterRoute.js';
import categoryRouter from './routes/categoryRoute.js';
import siteSettingsRouter from './routes/siteSettingsRoute.js';

// App Config
const app = express();
const port = process.env.PORT || 4000;

// Connect to Database & Cloudinary
connectDB();
connectCloudinary();

// Middlewares
app.use(express.json());
app.use(cors());

// API Endpoints
app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/coupon', couponRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/review', reviewRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/banner', bannerRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/category', categoryRouter);
app.use('/api/settings', siteSettingsRouter);

// Root endpoint
app.get('/', (req, res) => {
    res.send("API Working");
});

// Start Server
app.listen(port, () => console.log('Server started on PORT: ' + port));
