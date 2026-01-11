// Migration script to add variant fields to existing products
// Run this from backend directory: node scripts/migrateVariants.js

import mongoose from 'mongoose';
import 'dotenv/config';
import productModel from '../models/productModel.js';

const migrateProducts = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all products without hasVariants field
        const products = await productModel.find({ hasVariants: { $exists: false } });
        console.log(`📦 Found ${products.length} products to migrate`);

        let migratedCount = 0;

        for (const product of products) {
            // Add new variant-related fields with default values
            const updateData = {
                hasVariants: false,
                variantTypes: [],
                variants: [],
                hasBulkPricing: false,
                bulkPricing: []
            };

            await productModel.findByIdAndUpdate(product._id, updateData);
            migratedCount++;
            console.log(`  ✓ Migrated: ${product.name}`);
        }

        console.log(`\n✅ Migration complete! ${migratedCount} products updated.`);
        console.log('All existing products now have variant fields (set to disabled by default).');

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrateProducts();
