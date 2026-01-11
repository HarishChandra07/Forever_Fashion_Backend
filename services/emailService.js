import transporter from '../config/emailConfig.js';

const fromEmail = process.env.FROM_EMAIL || 'noreply@forever.com';

// Send welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
    try {
        const mailOptions = {
            from: `"Forever Store" <${fromEmail}>`,
            to: userEmail,
            subject: 'Welcome to Forever! 🎉',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .header h1 { color: white; margin: 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to Forever!</h1>
                        </div>
                        <div class="content">
                            <h2>Hi ${userName}! 👋</h2>
                            <p>Thank you for joining Forever! We're excited to have you as part of our community.</p>
                            <p>Get ready to explore our amazing collection of products at unbeatable prices.</p>
                            <p>Here's what you can do now:</p>
                            <ul>
                                <li>✨ Browse our latest collection</li>
                                <li>💰 Check out exclusive deals</li>
                                <li>🎁 Save items to your wishlist</li>
                            </ul>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Start Shopping</a>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Forever. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Welcome email sent to:', userEmail);
    } catch (error) {
        console.log('Error sending welcome email:', error);
    }
};

// Send order confirmation email
const sendOrderConfirmation = async (userEmail, userName, order) => {
    try {
        const itemsList = order.items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <img src="${item.image?.[0] || ''}" width="50" style="border-radius: 5px;" />
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.size}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">x${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">₹${item.price}</td>
            </tr>
        `).join('');

        const mailOptions = {
            from: `"Forever Store" <${fromEmail}>`,
            to: userEmail,
            subject: `Order Confirmed! #${order.invoiceNumber || order._id}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #22c55e; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .header h1 { color: white; margin: 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        .total-row { font-weight: bold; font-size: 18px; }
                        .address-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Order Confirmed!</h1>
                        </div>
                        <div class="content">
                            <h2>Thank you, ${userName}!</h2>
                            <p>Your order has been confirmed and will be processed shortly.</p>
                            
                            <p><strong>Order ID:</strong> ${order.invoiceNumber || order._id}</p>
                            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                            
                            <h3>Order Items</h3>
                            <table class="order-table">
                                <thead>
                                    <tr style="background: #eee;">
                                        <th style="padding: 10px;">Image</th>
                                        <th style="padding: 10px;">Product</th>
                                        <th style="padding: 10px;">Size</th>
                                        <th style="padding: 10px;">Qty</th>
                                        <th style="padding: 10px;">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsList}
                                </tbody>
                            </table>
                            
                            <p class="total-row">Total Amount: ₹${order.amount}</p>
                            
                            <div class="address-box">
                                <h4>Delivery Address</h4>
                                <p>
                                    ${order.address.firstName} ${order.address.lastName}<br>
                                    ${order.address.street}<br>
                                    ${order.address.city}, ${order.address.state} ${order.address.zipcode}<br>
                                    ${order.address.country}<br>
                                    Phone: ${order.address.phone}
                                </p>
                            </div>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Forever. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Order confirmation email sent to:', userEmail);
    } catch (error) {
        console.log('Error sending order confirmation email:', error);
    }
};

// Send order status update email
const sendOrderStatusUpdate = async (userEmail, userName, order, newStatus) => {
    try {
        const statusColors = {
            'Order Placed': '#3b82f6',
            'Packing': '#f59e0b',
            'Shipped': '#8b5cf6',
            'Out for delivery': '#06b6d4',
            'Delivered': '#22c55e',
            'Cancelled': '#ef4444'
        };

        const statusEmojis = {
            'Order Placed': '📦',
            'Packing': '📋',
            'Shipped': '🚚',
            'Out for delivery': '🛵',
            'Delivered': '✅',
            'Cancelled': '❌'
        };

        const mailOptions = {
            from: `"Forever Store" <${fromEmail}>`,
            to: userEmail,
            subject: `Order Update: ${newStatus} ${statusEmojis[newStatus] || '📦'}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: ${statusColors[newStatus] || '#667eea'}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .header h1 { color: white; margin: 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .status-badge { display: inline-block; padding: 10px 20px; background: ${statusColors[newStatus] || '#667eea'}; color: white; border-radius: 20px; font-weight: bold; }
                        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${statusEmojis[newStatus] || '📦'} Order Update</h1>
                        </div>
                        <div class="content">
                            <h2>Hi ${userName}!</h2>
                            <p>Your order status has been updated:</p>
                            
                            <p style="text-align: center; margin: 30px 0;">
                                <span class="status-badge">${newStatus}</span>
                            </p>
                            
                            <p><strong>Order ID:</strong> ${order.invoiceNumber || order._id}</p>
                            
                            ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
                            
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders" class="button">View Order Details</a>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Forever. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Order status update email sent to:', userEmail);
    } catch (error) {
        console.log('Error sending order status email:', error);
    }
};

export { sendWelcomeEmail, sendOrderConfirmation, sendOrderStatusUpdate };
