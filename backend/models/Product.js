import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, default: 0, min: 0 },

        // 👇 муҳим: categoryId
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
            index: true,
        },

        favorite: { type: Boolean, default: false },
        sku: { type: String, trim: true }, // ихтиёрӣ
        barcode: { type: String, trim: true } // ихтиёрӣ
    },
    { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
