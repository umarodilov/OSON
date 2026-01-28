import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, unique: true },
        // ихтиёрӣ: барои сорти тез
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.model("Category", CategorySchema);
