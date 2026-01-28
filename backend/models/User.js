import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        name: { type: String, default: "" },
        username: { type: String, required: true, unique: true, trim: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["admin", "user"], default: "user" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model("User", UserSchema);
