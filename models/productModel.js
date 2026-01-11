import mongoose from "mongoose";

// Variant schema for individual product variants (size/color combinations)
const variantSchema = new mongoose.Schema({
    attributes: {
        size: { type: String },
        color: { type: String }
    },
    price: { type: Number, required: true },
    comparePrice: { type: Number, default: 0 },
    stock: { type: Number, default: 100 },
    sku: { type: String, default: '' },
    weight: { type: Number, default: 0 }, // in grams
    images: { type: Array, default: [] }, // optional variant-specific images
    isActive: { type: Boolean, default: true }
});

// Bulk pricing schema for quantity discounts
const bulkPricingSchema = new mongoose.Schema({
    minQuantity: { type: Number, required: true }, // e.g., 3
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    discountValue: { type: Number, required: true } // e.g., 10 for 10% off or 50 for ₹50 off
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    // Base price - for listing display (lowest variant price or single price)
    price: { type: Number, required: true },
    comparePrice: { type: Number, default: 0 }, // Original price for showing discount
    image: { type: Array, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, required: true },

    // Legacy sizes field (for backward compatibility with products without variants)
    sizes: { type: Array, default: [] },

    // Variants system
    hasVariants: { type: Boolean, default: false },
    variantTypes: { type: Array, default: [] }, // ["size"] or ["size", "color"]
    variants: [variantSchema],

    // Bulk pricing discounts
    hasBulkPricing: { type: Boolean, default: false },
    bulkPricing: [bulkPricingSchema],

    bestseller: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },

    // Stock - used for products without variants
    stock: { type: Number, default: 100 },
    sku: { type: String, default: '' },
    weight: { type: Number, default: 0 }, // in grams

    tags: { type: Array, default: [] },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    date: { type: Number, required: true }
}, { timestamps: true });

// Helper method to get price range for variant products
productSchema.methods.getPriceRange = function () {
    if (!this.hasVariants || this.variants.length === 0) {
        return { min: this.price, max: this.price };
    }
    const prices = this.variants.filter(v => v.isActive).map(v => v.price);
    return {
        min: Math.min(...prices),
        max: Math.max(...prices)
    };
};

// Helper method to get total stock across all variants
productSchema.methods.getTotalStock = function () {
    if (!this.hasVariants || this.variants.length === 0) {
        return this.stock;
    }
    return this.variants.filter(v => v.isActive).reduce((sum, v) => sum + v.stock, 0);
};

// Helper method to find a specific variant
productSchema.methods.findVariant = function (size, color = null) {
    if (!this.hasVariants) return null;
    return this.variants.find(v => {
        const sizeMatch = v.attributes.size === size;
        const colorMatch = color ? v.attributes.color === color : true;
        return sizeMatch && colorMatch && v.isActive;
    });
};

// Helper to calculate bulk discount
productSchema.methods.getBulkDiscount = function (quantity) {
    if (!this.hasBulkPricing || this.bulkPricing.length === 0) {
        return null;
    }
    // Find the highest applicable tier
    const applicableTiers = this.bulkPricing
        .filter(tier => quantity >= tier.minQuantity)
        .sort((a, b) => b.minQuantity - a.minQuantity);

    return applicableTiers.length > 0 ? applicableTiers[0] : null;
};

const productModel = mongoose.models.product || mongoose.model("product", productSchema);

export default productModel;
