import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config();

async function upsertUser({ username, password, role, name }) {
    const u = username.trim().toLowerCase();
    const existing = await User.findOne({ username: u });
    const passwordHash = await bcrypt.hash(password, 10);

    if (existing) {
        existing.passwordHash = passwordHash;
        existing.role = role;
        existing.name = name || existing.name;
        existing.isActive = true;
        await existing.save();
        console.log("Updated:", u, role);
        return;
    }

    await User.create({ username: u, passwordHash, role, name, isActive: true });
    console.log("Created:", u, role);
}

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    await upsertUser({ username: "admin", password: "Admin12345", role: "admin", name: "Admin" });
    await upsertUser({ username: "user", password: "User12345", role: "user", name: "User" });
    await mongoose.disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
