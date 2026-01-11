import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'category', required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Compound unique index for name within category
subCategorySchema.index({ name: 1, categoryId: 1 }, { unique: true });

const subCategoryModel = mongoose.models.subcategory || mongoose.model("subcategory", subCategorySchema);

export default subCategoryModel;
