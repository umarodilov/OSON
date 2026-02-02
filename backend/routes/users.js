import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// ✅ Танҳо admin иҷозат (ихтиёрӣ, аммо тавсия)
function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
    }
    next();
}

// ✅ GET /api/users  (list)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select("-passwordHash")
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (e) {
        console.error("USERS GET ERROR:", e);
        res.status(500).json({ message: e.message || "Server error" });
    }
});

// ✅ POST /api/users (create)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
    try {
        const name = String(req.body?.name || "").trim();
        const username = String(req.body?.username || "").trim().toLowerCase();
        const role = req.body?.role === "admin" ? "admin" : "user";
        const isActive = req.body?.isActive !== false;
        const password = String(req.body?.password || "");

        if (!username) return res.status(400).json({ message: "username лозим аст" });
        if (!password) return res.status(400).json({ message: "password лозим аст" });

        const exists = await User.findOne({ username });
        if (exists) return res.status(400).json({ message: "username аллакай ҳаст" });

        const passwordHash = await bcrypt.hash(password, 10);

        const created = await User.create({
            name,
            username,
            passwordHash,
            role,
            isActive,
        });

        const safe = created.toObject();
        delete safe.passwordHash;
        res.status(201).json(safe);
    } catch (e) {
        console.error("USER CREATE ERROR:", e);
        res.status(500).json({ message: e.message || "Server error" });
    }
});

// ✅ PUT /api/users/:id (update: name/username/role/isActive) + optional password
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        const update = {};

        if (req.body?.name !== undefined) update.name = String(req.body.name || "").trim();

        if (req.body?.username !== undefined) {
            const username = String(req.body.username || "").trim().toLowerCase();
            if (!username) return res.status(400).json({ message: "username лозим аст" });

            // unique check
            const exists = await User.findOne({ username, _id: { $ne: req.params.id } });
            if (exists) return res.status(400).json({ message: "username аллакай ҳаст" });

            update.username = username;
        }

        if (req.body?.role !== undefined) {
            update.role = req.body.role === "admin" ? "admin" : "user";
        }

        if (req.body?.isActive !== undefined) {
            update.isActive = Boolean(req.body.isActive);
        }

        // Агар payload.password омада бошад — паролро ҳам иваз мекунад (ихтиёрӣ)
        if (req.body?.password) {
            update.passwordHash = await bcrypt.hash(String(req.body.password), 10);
        }

        const updated = await User.findByIdAndUpdate(req.params.id, update, {
            new: true,
            runValidators: true,
        }).select("-passwordHash");

        if (!updated) return res.status(404).json({ message: "User not found" });
        res.json(updated);
    } catch (e) {
        console.error("USER UPDATE ERROR:", e);
        res.status(500).json({ message: e.message || "Server error" });
    }
});

// ✅ POST /api/users/:id/reset-password
router.post("/:id/reset-password", requireAuth, requireAdmin, async (req, res) => {
    try {
        const password = String(req.body?.password || "");
        if (!password) return res.status(400).json({ message: "password лозим аст" });

        const passwordHash = await bcrypt.hash(password, 10);

        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { passwordHash },
            { new: true }
        ).select("-passwordHash");

        if (!updated) return res.status(404).json({ message: "User not found" });
        res.json({ message: "ok" });
    } catch (e) {
        console.error("RESET PASSWORD ERROR:", e);
        res.status(500).json({ message: e.message || "Server error" });
    }
});

export default router;
