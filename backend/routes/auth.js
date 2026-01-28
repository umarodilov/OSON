import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

router.post("/login", async (req, res) => {
    try {
        const { username = "", password = "" } = req.body || {};
        const u = String(username).trim().toLowerCase();

        if (!u || !password) {
            return res.status(400).json({ message: "username ва password даркор аст" });
        }

        const user = await User.findOne({ username: u });
        if (!user || !user.isActive) {
            return res.status(401).json({ message: "Логин ё парол нодуруст аст" });
        }

        const ok = await bcrypt.compare(String(password), user.passwordHash);
        if (!ok) return res.status(401).json({ message: "Логин ё парол нодуруст аст" });

        const token = jwt.sign(
            { id: user._id, role: user.role, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
            token,
            user: { id: user._id, username: user.username, name: user.name, role: user.role },
        });
    } catch (e) {
        console.error("LOGIN ERROR:", e);
        return res.status(500).json({ message: e.message || "Server error" });
    }
});

export default router;
