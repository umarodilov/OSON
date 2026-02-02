import express from "express";
import Category from "../models/Category.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET all
router.get("/", async (req, res) => {
    try {
        const cats = await Category.find().sort({ order: 1, name: 1 });
        res.json(cats);
    } catch (e) {
        res.status(500).json({ message: e.message || "Server error" });
    }
});

// POST create
router.post("/", requireAuth, async (req, res) => {
    try {
        const created = await Category.create({
            name: req.body.name,
            order: req.body.order ?? 0,
        });
        res.status(201).json(created);
    } catch (e) {
        res.status(500).json({ message: e.message || "Server error" });
    }
});

// ✅ PUT update: /api/categories/:id
router.put("/:id", requireAuth, async (req, res) => {
    try {
        const update = {};
        if (req.body.name !== undefined) update.name = String(req.body.name).trim();
        if (req.body.order !== undefined) update.order = Number(req.body.order || 0);
        if (req.body.isActive !== undefined) update.isActive = Boolean(req.body.isActive);

        const updated = await Category.findByIdAndUpdate(req.params.id, update, {
            new: true,
            runValidators: true,
        });

        if (!updated) return res.status(404).json({ message: "Category not found" });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ message: e.message || "Server error" });
    }
});

// (ихтиёрӣ) DELETE: /api/categories/:id
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const deleted = await Category.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Category not found" });
        res.json({ message: "ok" });
    } catch (e) {
        res.status(500).json({ message: e.message || "Server error" });
    }
});

export default router;
