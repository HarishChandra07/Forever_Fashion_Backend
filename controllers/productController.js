import { v2 as cloudinary } from "cloudinary";
import productModel from "../models/productModel.js";

// Add product
const addProduct = async (req, res) => {
    try {
        const {
            name, description, price, comparePrice, category, subCategory,
            sizes, bestseller, featured, stock, sku, weight, tags,
            hasVariants, variantTypes, variants,
            hasBulkPricing, bulkPricing
        } = req.body;

        const image1 = req.files.image1 && req.files.image1[0];
        const image2 = req.files.image2 && req.files.image2[0];
        const image3 = req.files.image3 && req.files.image3[0];
        const image4 = req.files.image4 && req.files.image4[0];

        const images = [image1, image2, image3, image4].filter((item) => item !== undefined);

        let imagesUrl = await Promise.all(
            images.map(async (item) => {
                let result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
                return result.secure_url;
            })
        );

        // Parse variants if provided
        let parsedVariants = [];
        let basePrice = Number(price);

        const hasVariantsFlag = hasVariants === "true" || hasVariants === true;

        if (hasVariantsFlag && variants) {
            parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
            // Set base price to lowest variant price for listing display
            if (parsedVariants.length > 0) {
                const variantPrices = parsedVariants.map(v => Number(v.price));
                basePrice = Math.min(...variantPrices);
            }
        }

        // Parse bulk pricing if provided
        let parsedBulkPricing = [];
        const hasBulkPricingFlag = hasBulkPricing === "true" || hasBulkPricing === true;
        if (hasBulkPricingFlag && bulkPricing) {
            parsedBulkPricing = typeof bulkPricing === 'string' ? JSON.parse(bulkPricing) : bulkPricing;
        }

        const productData = {
            name,
            description,
            category,
            price: basePrice,
            comparePrice: Number(comparePrice) || 0,
            subCategory,
            bestseller: bestseller === "true" || bestseller === true ? true : false,
            featured: featured === "true" || featured === true ? true : false,
            sizes: sizes ? (typeof sizes === 'string' ? JSON.parse(sizes) : sizes) : [],
            image: imagesUrl,
            stock: Number(stock) || 100,
            sku: sku || '',
            weight: Number(weight) || 0,
            tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
            // Variants
            hasVariants: hasVariantsFlag,
            variantTypes: variantTypes ? (typeof variantTypes === 'string' ? JSON.parse(variantTypes) : variantTypes) : [],
            variants: parsedVariants,
            // Bulk pricing
            hasBulkPricing: hasBulkPricingFlag,
            bulkPricing: parsedBulkPricing,
            date: Date.now()
        };

        const product = new productModel(productData);
        await product.save();

        res.json({ success: true, message: "Product Added" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};


// List all products (simple)
const listProducts = async (req, res) => {
    try {
        const products = await productModel.find({});
        res.json({ success: true, products });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Advanced search with filters, sorting, and pagination
const searchProducts = async (req, res) => {
    try {
        const {
            search = '',
            category,
            subCategory,
            minPrice,
            maxPrice,
            sort = 'relevant',
            page = 1,
            limit = 12,
            inStock
        } = req.query;

        // Build filter
        let filter = {};

        // Text search
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Category filter
        if (category) {
            const categories = category.split(',');
            filter.category = { $in: categories };
        }

        // Sub-category filter
        if (subCategory) {
            const subCategories = subCategory.split(',');
            filter.subCategory = { $in: subCategories };
        }

        // Price range filter
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        // In stock filter
        if (inStock === 'true') {
            filter.stock = { $gt: 0 };
        }

        // Build sort
        let sortOption = {};
        switch (sort) {
            case 'price-low':
                sortOption = { price: 1 };
                break;
            case 'price-high':
                sortOption = { price: -1 };
                break;
            case 'rating':
                sortOption = { rating: -1, numReviews: -1 };
                break;
            case 'newest':
                sortOption = { date: -1 };
                break;
            case 'bestseller':
                sortOption = { bestseller: -1, date: -1 };
                break;
            default:
                sortOption = { date: -1 };
        }

        // Pagination
        const skip = (Number(page) - 1) * Number(limit);

        // Execute query
        const products = await productModel
            .find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(Number(limit));

        const total = await productModel.countDocuments(filter);

        // Get available filters (for filter UI)
        const allProducts = await productModel.find({});
        const categories = [...new Set(allProducts.map(p => p.category))];
        const subCategories = [...new Set(allProducts.map(p => p.subCategory))];
        const priceRange = {
            min: Math.min(...allProducts.map(p => p.price)),
            max: Math.max(...allProducts.map(p => p.price))
        };

        res.json({
            success: true,
            products,
            total,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            filters: {
                categories,
                subCategories,
                priceRange
            }
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Search suggestions (autocomplete)
const searchSuggestions = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({ success: true, suggestions: [] });
        }

        const products = await productModel
            .find({ name: { $regex: q, $options: 'i' } })
            .select('name category')
            .limit(8);

        const suggestions = products.map(p => ({
            name: p.name,
            category: p.category
        }));

        res.json({ success: true, suggestions });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Remove product
const removeProduct = async (req, res) => {
    try {
        await productModel.findByIdAndDelete(req.body.id);
        res.json({ success: true, message: "Product Removed" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Single product info
const singleProduct = async (req, res) => {
    try {
        const { productId } = req.body;
        const product = await productModel.findById(productId);
        res.json({ success: true, product });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Edit product
const editProduct = async (req, res) => {
    try {
        const {
            productId, name, description, price, comparePrice, category, subCategory,
            sizes, bestseller, featured, stock, sku, weight, tags,
            existingImages, imagesToRemove,
            hasVariants, variantTypes, variants,
            hasBulkPricing, bulkPricing
        } = req.body;

        // Parse variants if provided
        let parsedVariants = [];
        let basePrice = Number(price);

        const hasVariantsFlag = hasVariants === "true" || hasVariants === true;

        if (hasVariantsFlag && variants) {
            parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
            // Set base price to lowest variant price for listing display
            if (parsedVariants.length > 0) {
                const variantPrices = parsedVariants.map(v => Number(v.price));
                basePrice = Math.min(...variantPrices);
            }
        }

        // Parse bulk pricing if provided
        let parsedBulkPricing = [];
        const hasBulkPricingFlag = hasBulkPricing === "true" || hasBulkPricing === true;
        if (hasBulkPricingFlag && bulkPricing) {
            parsedBulkPricing = typeof bulkPricing === 'string' ? JSON.parse(bulkPricing) : bulkPricing;
        }

        const updateData = {
            name,
            description,
            category,
            price: basePrice,
            comparePrice: Number(comparePrice) || 0,
            subCategory,
            bestseller: bestseller === "true" || bestseller === true ? true : false,
            featured: featured === "true" || featured === true ? true : false,
            sizes: typeof sizes === 'string' ? JSON.parse(sizes) : (sizes || []),
            stock: Number(stock),
            sku: sku || '',
            weight: Number(weight) || 0,
            tags: typeof tags === 'string' ? JSON.parse(tags) : (tags || []),
            // Variants
            hasVariants: hasVariantsFlag,
            variantTypes: variantTypes ? (typeof variantTypes === 'string' ? JSON.parse(variantTypes) : variantTypes) : [],
            variants: parsedVariants,
            // Bulk pricing
            hasBulkPricing: hasBulkPricingFlag,
            bulkPricing: parsedBulkPricing
        };

        // Parse existing images (images user wants to keep)
        let keptImages = [];
        if (existingImages) {
            keptImages = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
        }

        // Handle new images if uploaded
        let newImageUrls = [];
        if (req.files && Object.keys(req.files).length > 0) {
            const image1 = req.files.image1 && req.files.image1[0];
            const image2 = req.files.image2 && req.files.image2[0];
            const image3 = req.files.image3 && req.files.image3[0];
            const image4 = req.files.image4 && req.files.image4[0];

            const images = [image1, image2, image3, image4].filter((item) => item !== undefined);

            if (images.length > 0) {
                newImageUrls = await Promise.all(
                    images.map(async (item) => {
                        let result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
                        return result.secure_url;
                    })
                );
            }
        }

        // Combine kept existing images with new uploads
        // If new images are uploaded, they replace/add to existing ones
        if (newImageUrls.length > 0) {
            // Add new images to existing kept images
            updateData.image = [...keptImages, ...newImageUrls];
        } else if (existingImages !== undefined) {
            // No new images, but existing images array was passed (some might have been removed)
            updateData.image = keptImages;
        }
        // If neither new images nor existingImages passed, don't update the image field

        await productModel.findByIdAndUpdate(productId, updateData);

        res.json({ success: true, message: "Product Updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};


// Get product by ID (for edit page)
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productModel.findById(id);

        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, product });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Update stock
const updateStock = async (req, res) => {
    try {
        const { productId, stock } = req.body;

        await productModel.findByIdAndUpdate(productId, { stock: Number(stock) });

        res.json({ success: true, message: "Stock updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get low stock products
const getLowStockProducts = async (req, res) => {
    try {
        const products = await productModel.find({ stock: { $lt: 10 } });
        res.json({ success: true, products });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    listProducts,
    addProduct,
    removeProduct,
    singleProduct,
    editProduct,
    getProductById,
    updateStock,
    getLowStockProducts,
    searchProducts,
    searchSuggestions
};
